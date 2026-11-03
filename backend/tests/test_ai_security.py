"""AI-only security regression; requires the isolated runner, never real credentials/upstream."""
import os
import unittest
if os.getenv('CARBONAI_ISOLATED_TESTS') != '1':
    raise unittest.SkipTest('Run with the isolated AI security test runner; no production configuration allowed')
import asyncio
import io
import json
import threading
import time
import tempfile
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError, HTTPError
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from app.db import Base, User
from app.routers import auth, business as ai


class AiSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password_hash = auth._hash_password('AuditOnly1')
        cls.app = FastAPI()
        cls.app.include_router(auth.router)
        cls.app.include_router(ai.router)

    def setUp(self):
        # 每个测试独立文件；并发Session分别签出连接，不共享StaticPool单连接。
        self.temp_db = tempfile.TemporaryDirectory(prefix='carbonai-ai-security-')
        self.addCleanup(self.temp_db.cleanup)
        db_path = Path(self.temp_db.name) / 'audit.sqlite'
        self.engine = create_engine('sqlite:///' + db_path.as_posix(),
                                    connect_args={'check_same_thread': False},
                                    poolclass=QueuePool, pool_size=5, max_overflow=5)
        def close_database():
            try:
                self.assertEqual(self.engine.pool.checkedout(), 0, '测试结束时仍有数据库连接未归还')
            finally:
                self.engine.dispose()
        # addCleanup按逆序执行：先还原patch，再检查/释放连接池，最后删除本轮临时目录。
        self.addCleanup(close_database)
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine)
        with self.factory() as db:
            for uid in (1, 2, 3):
                db.add(User(id=uid, username=f'audit{uid}', email=f'audit{uid}@example.invalid', password_hash=self.password_hash))
            db.commit()
        self.session = patch.object(auth, 'SessionLocal', self.factory)
        self.session.start(); self.addCleanup(self.session.stop)
        self.env = patch.dict(os.environ, {'AI_DEPLOYMENT_MODE':'single-process','AI_SINGLE_PROCESS_CONFIRMED':'true','AI_INSTANCE_COUNT':'1','WEB_CONCURRENCY':'1','UVICORN_WORKERS':'1'})
        self.env.start(); self.addCleanup(self.env.stop)
        with ai._AI_LOCK:
            ai._AI_STATE.update(day='', daily={}, total=0, times=[], users={}, active=set(), duplicates={})
        auth._RATE.clear()
        self.tokens = {u:auth._issue_token(u) for u in (1, 2, 3, 999)}
        self.calls = []
        self.mock = patch('urllib.request.urlopen', side_effect=self.reply).start()
        self.addCleanup(patch.stopall)
        self.uid = 1

    def reply(self, req, timeout):
        self.calls.append(json.loads(req.data))
        return io.BytesIO(json.dumps({'choices':[{'message':{'content':'mock answer'}}]}).encode())

    async def request(self, payload=None, token='valid', raw=None, chunks=None, headers=None, path='/api/ai/chat', method='POST', counter=None):
        data=json.dumps(payload if payload is not None else {'message':'test question','history':[]}).encode() if raw is None else raw
        pieces=list(chunks) if chunks is not None else [data]
        sent=[]
        async def receive():
            if counter is not None:counter.append(1)
            if pieces:return {'type':'http.request','body':pieces.pop(0),'more_body':bool(pieces)}
            return {'type':'http.disconnect'}
        async def send(item):sent.append(item)
        hs=[(b'content-type',b'application/json')]
        if token is not None:
            value=self.tokens[self.uid] if token=='valid' else token
            hs.append((b'authorization',('Bearer '+value).encode()))
        if headers:hs=[h for h in hs if h[0].decode() not in headers]+[(k.encode(),v.encode()) for k,v in headers.items()]
        scope={'type':'http','asgi':{'version':'3.0'},'http_version':'1.1','scheme':'http','method':method,'path':path,'raw_path':path.encode(),'query_string':b'','root_path':'','headers':hs,'client':('127.0.0.1',1234),'server':('audit.local',80)}
        await self.app(scope,receive,send)
        status=next(x['status'] for x in sent if x['type']=='http.response.start')
        result=json.loads(b''.join(x.get('body',b'') for x in sent if x['type']=='http.response.body'))
        return status,result

    def send(self, **kw):return asyncio.run(self.request(**kw))
    def rejected(self, status, **kw):
        before=len(self.calls);s,b=self.send(**kw);self.assertEqual(s,status,b);self.assertEqual(b['code'],status);self.assertEqual(len(self.calls),before)

    def test_missing_tampered_expired_and_nonexistent_user_no_upstream(self):
        expired=auth._sign({'uid':1,'exp':int(time.time())-100})
        for token in (None,'bad',self.tokens[1]+'changed',expired,self.tokens[999],auth._sign({'uid':True,'exp':int(time.time())+100})):
            with self.subTest(tokenType='synthetic'):
                counter=[];self.rejected(401,token=token,counter=counter);self.assertEqual(counter,[])

    def test_login_user_info_logout_compatibility(self):
        s,b=self.send(payload={'username':'audit1','password':'AuditOnly1'},path='/api/auth/login',token=None)
        self.assertEqual((s,b['code']),(200,200));token=b['data']['token']
        s,b=self.send(path='/api/auth/user-info',method='GET',token=token);self.assertEqual(b['data']['id'],1)
        self.assertEqual(self.send(path='/api/auth/logout',token=token)[0],200)
        self.assertEqual(auth._parse_token(token),1)  # Existing logout does not revoke tokens.
        self.assertEqual(self.send(token=token)[0],200)
        _, bad = self.send(payload={'username':'audit1','password':'wrong-test-password'},path='/api/auth/login',token=None)
        self.assertEqual(bad['code'],400)
        _, bad = self.send(path='/api/auth/user-info',method='GET',token='bad')
        self.assertEqual(bad['code'],401)  # Preserve the existing user-info response contract.

    def test_normal_authenticated_request_and_no_duplicate_question(self):
        s,b=self.send(payload={'message':'same','history':[{'role':'assistant','content':'previous'},{'role':'user','content':'same'}]})
        self.assertEqual((s,b['data']),(200,'mock answer'))
        self.assertEqual([m['content'] for m in self.calls[0]['messages']].count('same'),1)
        self.assertEqual(self.calls[0]['max_tokens'],1500)

    def test_request_body_limits_declared_and_streaming(self):
        self.rejected(413,headers={'content-length':str(ai.AI_MAX_BODY_BYTES+1)})
        self.rejected(413,chunks=[b' '*17000,b' '*17000])
        self.rejected(415,headers={'content-encoding':'gzip'})
        self.rejected(415,headers={'content-type':'text/plain'})
        self.rejected(422,raw=b'not-json')

    def test_body_boundary_without_unbounded_json_parse(self):
        raw=b'{"message":"boundary"}'
        with patch.object(ai,'AI_MAX_BODY_BYTES',len(raw)):
            self.assertEqual(self.send(raw=raw)[0],200)
        with patch.object(ai,'AI_MAX_BODY_BYTES',len(raw)-1):self.rejected(413,raw=raw)

    def test_question_history_and_role_type_limits(self):
        cases=[{'message':'x'*2001},{'message':17},{'message':'   '},{'message':'q','extra':'not allowed'},
               {'message':'q','history':[{'role':'user','content':'x'}]*9},
               {'message':'q','history':[{'role':'system','content':'x'}]},
               {'message':'q','history':[{'role':'user','content':42}]},
               {'message':'q','history':[{'role':'user','content':'x'*2001}]},
               {'message':'q','history':[{'role':'user','content':'x'*2000}]*5},
               {'message':'q','history':[{'role':'assistant','content':'   '}]}]
        for payload in cases:
            with self.subTest(caseFields=list(payload)):self.rejected(422,payload=payload)
        self.assertEqual(self.send(payload={'message':'q'*2000,'history':[{'role':'user','content':'x'*2000}]*4})[0],200)

    def test_duplicate_retry_and_per_user_frequency(self):
        self.assertEqual(self.send()[0],200);self.rejected(429)
        self.assertEqual(self.send(payload={'message':'second'})[0],200)
        self.assertEqual(self.send(payload={'message':'third'})[0],200)
        self.rejected(429,payload={'message':'fourth'})
        self.uid=2;self.assertEqual(self.send()[0],200)

    def test_global_frequency_and_user_daily_and_global_daily(self):
        with patch.object(ai,'AI_GLOBAL_RPM',1):
            self.assertEqual(self.send()[0],200);self.uid=2;self.rejected(429)
        with ai._AI_LOCK:ai._AI_STATE.update(times=[],users={},duplicates={})
        self.uid=1
        with patch.object(ai,'AI_USER_DAILY_CALLS',1):self.rejected(429,payload={'message':'new question'})
        self.uid=2
        with patch.object(ai,'AI_GLOBAL_DAILY_CALLS',1):self.rejected(429)

    def test_atomic_quota_race_and_concurrency(self):
        async def run():
            with patch.object(ai,'AI_GLOBAL_DAILY_CALLS',1):
                vals=await asyncio.gather(*(self.request(token=self.tokens[i],payload={'message':str(i)}) for i in (1,2,3)))
                self.assertEqual(sorted(s for s,b in vals),[200,429,429]);self.assertEqual(len(self.calls),1)
        asyncio.run(run())

    def test_max_concurrency_and_same_user_inflight(self):
        started=threading.Event();release=threading.Event()
        def slow(req,timeout):started.set();release.wait(3);return self.reply(req,timeout)
        async def run():
            with patch('urllib.request.urlopen',side_effect=slow),patch.object(ai,'AI_MAX_CONCURRENT',1):
                first=asyncio.create_task(self.request())
                while not started.is_set():await asyncio.sleep(.005)
                self.assertEqual((await self.request(token=self.tokens[2]))[0],429)
                self.assertEqual((await self.request(payload={'message':'different'}))[0],429)
                release.set();self.assertEqual((await first)[0],200)
                self.assertFalse(ai._AI_STATE['active'])
        asyncio.run(run());self.assertEqual(len(self.calls),1)

    def test_cancelled_client_does_not_release_running_call(self):
        started=threading.Event();release=threading.Event()
        def slow(req,timeout):started.set();release.wait(3);return self.reply(req,timeout)
        async def run():
            with patch('urllib.request.urlopen',side_effect=slow):
                task=asyncio.create_task(self.request())
                while not started.is_set():await asyncio.sleep(.005)
                task.cancel()
                try:await task
                except asyncio.CancelledError:pass
                self.assertIn(1,ai._AI_STATE['active'])
                self.assertEqual((await self.request(payload={'message':'another'}))[0],429)
                release.set()
                for _ in range(200):
                    if not ai._AI_STATE['active']:break
                    await asyncio.sleep(.005)
                self.assertFalse(ai._AI_STATE['active'])
        asyncio.run(run());self.assertEqual(len(self.calls),1)

    def test_utc_daily_and_minute_reset(self):
        self.assertEqual(self.send()[0],200)
        with ai._AI_LOCK:
            ai._AI_STATE.update(day='old-day',total=100,daily={1:20},times=[time.monotonic()-61],users={1:[time.monotonic()-61]},duplicates={})
        self.assertEqual(self.send()[0],200);self.assertEqual(ai._AI_STATE['daily'][1],1)

    def test_default_closed_multiworker_and_bad_limits(self):
        with patch.dict(os.environ,{},clear=True):self.rejected(503)
        for params in ({'AI_DEPLOYMENT_MODE':'disabled'},{'AI_SINGLE_PROCESS_CONFIRMED':'false'},
                       {'WEB_CONCURRENCY':'2'},{'UVICORN_WORKERS':'2'},{'AI_INSTANCE_COUNT':'2'},
                       {'AI_DEPLOYMENT_MODE':'shared'}):
            with patch.dict(os.environ,params):self.rejected(503)
        with patch.object(ai,'AI_API_KEY',''):self.rejected(503)
        with patch.object(ai,'AI_GLOBAL_DAILY_CALLS',0):self.rejected(503)
        for val in ['0','-1','invalid']:
            with patch.dict(os.environ,{'AUDIT_LIMIT':val}):self.assertEqual(ai._ai_int('AUDIT_LIMIT',3,10),0)
        with patch.dict(os.environ,{'AUDIT_LIMIT':'999'}):self.assertEqual(ai._ai_int('AUDIT_LIMIT',3,10),10)

    def test_upstream_failures_are_sanitized_without_retries(self):
        for error,status in [(TimeoutError('SENSITIVE_TEST'),504),(URLError(TimeoutError('SENSITIVE_TEST')),504),
                             (URLError('SENSITIVE_TEST'),502),(HTTPError('https://private.invalid',401,'SENSITIVE_TEST',{},None),502),
                             (RuntimeError('SENSITIVE_TEST'),502)]:
            with ai._AI_LOCK:ai._AI_STATE.update(times=[],users={},duplicates={})
            with patch('urllib.request.urlopen',side_effect=error) as mock:
                s,b=self.send();self.assertEqual(s,status);self.assertEqual(mock.call_count,1)
                self.assertNotIn('SENSITIVE_TEST',json.dumps(b));self.assertNotIn('private.invalid',json.dumps(b));self.assertNotIn('AUDIT_ONLY',json.dumps(b))
            self.assertFalse(ai._AI_STATE['active'])

    def test_response_bytes_empty_and_invalid_json(self):
        for raw in [b'not-json',b'{"choices":[]}',b'{"choices":[{"message":{"content":"  "}}]}',b'x'*(ai.AI_MAX_RESPONSE_BYTES+1)]:
            with ai._AI_LOCK:ai._AI_STATE.update(times=[],users={},duplicates={})
            with patch('urllib.request.urlopen',return_value=io.BytesIO(raw)) as mock:
                s,b=self.send();self.assertEqual(s,502);self.assertEqual(mock.call_count,1)
        content=json.dumps({'choices':[{'message':{'content':'ok'}}]}).encode()
        with ai._AI_LOCK:ai._AI_STATE.update(times=[],users={},duplicates={})
        with patch.object(ai,'AI_MAX_RESPONSE_BYTES',len(content)),patch('urllib.request.urlopen',return_value=io.BytesIO(content)):
            self.assertEqual(self.send()[0],200)

    def test_failed_attempt_consumes_daily_quota(self):
        with patch.object(ai,'AI_USER_DAILY_CALLS',1),patch('urllib.request.urlopen',side_effect=TimeoutError()):
            self.assertEqual(self.send()[0],504)
            self.rejected(429,payload={'message':'different retry'})

    def test_body_timeout_no_upstream(self):
        async def timeout(_):raise TimeoutError()
        with patch.object(ai,'_read_ai_body',side_effect=timeout):self.rejected(408)

    def test_other_public_routes_unchanged(self):
        self.assertEqual(self.send(path='/api/factors',method='GET',token=None)[0],200)
        self.assertEqual(self.calls,[])

    def test_response_reads_stop_at_limit_plus_one(self):
        class Tracked(io.BytesIO):
            consumed = 0
            def read1(inner, size=-1):
                data = super().read1(size)
                inner.consumed += len(data)
                return data
        stream = Tracked(b'x' * (ai.AI_MAX_RESPONSE_BYTES * 2))
        with patch('urllib.request.urlopen',return_value=stream):
            self.assertEqual(self.send()[0],502)
        self.assertEqual(stream.consumed,ai.AI_MAX_RESPONSE_BYTES+1)

    def test_cancelled_upstream_failure_not_logged_as_unhandled(self):
        started=threading.Event();release=threading.Event()
        def fail(req,timeout):
            started.set();release.wait(3)
            raise RuntimeError('SENSITIVE_TEST_INTERNAL')
        async def run():
            loop=asyncio.get_running_loop();unhandled=[]
            loop.set_exception_handler(lambda _,context:unhandled.append(context))
            with patch('urllib.request.urlopen',side_effect=fail):
                task=asyncio.create_task(self.request())
                while not started.is_set():await asyncio.sleep(.005)
                task.cancel()
                try:await task
                except asyncio.CancelledError:pass
                release.set()
                for _ in range(200):
                    if not ai._AI_STATE['active']:break
                    await asyncio.sleep(.005)
                await asyncio.sleep(.01)
                self.assertFalse(ai._AI_STATE['active']);self.assertEqual(unhandled,[])
        asyncio.run(run())
