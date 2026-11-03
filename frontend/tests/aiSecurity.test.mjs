import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { ref } from 'vue'
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:1,target:9}}).outputText
const view=fs.readFileSync('src/views/AiAdvisorView.vue','utf8'),kb=view.slice(view.indexOf('const LOCAL_KB:'),view.indexOf('async function send(')),send=view.slice(view.indexOf('async function send('),view.indexOf('</script>'))
function setup(mode='success',history=[]) {
 const m={exports:{}},calls=[],state={input:ref('Scope 1'),thinking:ref(false),replyError:ref(''),chatBox:ref(null),messages:ref(history)}
 const bizApi={chat:async(...args)=>{calls.push(args);if(mode==='rejected')throw Error('mock failure');return mode==='success'?{code:200,data:' model reply '}:mode==='empty'?{code:200,data:'  '}:{code:Number(mode),data:null}}}
 const env={module:m,exports:m.exports,...state,bizApi,backendOnline:ref(mode!=='offline'),nextTick:async()=>{}}
 vm.runInNewContext(compile(kb+send+'\nexport {send}'),env);return {...m.exports,...state,calls,env}
}
test('聊天客户端Bearer及65秒超时，不影响登录请求、不自动重试',async()=>{
 const m={exports:{}},calls=[],http={post:(...a)=>{calls.push(a);return Promise.resolve({data:{code:200,data:'ok'}})},get:()=>Promise.resolve({data:{code:200}})}
 const source=fs.readFileSync('src/api/client.ts','utf8').replaceAll('import.meta.env','({})')
 vm.runInNewContext(compile(source),{module:m,exports:m.exports,require:id=>id==='axios'?{default:{create:o=>{assert.equal(o.timeout,8000);return http}}}:id==='vue'?{ref}:{mockApi:{}},localStorage:{getItem:k=>{assert.equal(k,'carbonai_jwt');return 'audit-only-session'}}})
 await m.exports.bizApi.chat('q',[]);assert.equal(calls.length,1);assert.equal(calls[0][2].headers.Authorization,'Bearer audit-only-session');assert.equal(calls[0][2].timeout,65000)
 m.exports.backendOnline.value=true;await m.exports.authApi.login({username:'audit',password:'not-real'});assert.equal(calls[1].length,2)
})
test('模型成功只传先前上下文，不重复当前提问，标注模型来源',async()=>{
 const c=setup('success',[{role:'assistant',content:'prior',source:'model'}]);await c.send();assert.equal(c.calls.length,1);assert.equal(c.calls[0][1].length,1);assert.equal(c.calls[0][1][0].content,'prior');assert.deepEqual(Object.keys(c.calls[0][1][0]),['role','content']);assert.equal(c.messages.value.at(-1).source,'model');assert.equal(c.messages.value.at(-1).content,'model reply');assert.equal(c.thinking.value,false)
})
for(const mode of ['offline','401','429','503','502','504','empty','rejected'])test(`规则回退-${mode}：单次请求、来源明确、thinking恢复`,async()=>{
 const c=setup(mode);await c.send();assert.equal(c.calls.length,mode==='offline'?0:1);assert.equal(c.messages.value.at(-1).source,'rule');assert.ok(c.messages.value.at(-1).content.length>0);assert.ok(c.replyError.value);assert.equal(c.thinking.value,false);if(mode==='401')assert.match(c.replyError.value,/重新登录/);if(mode==='429')assert.match(c.replyError.value,/未自动重试/);assert.ok(view.includes('本地规则参考回答（非大模型）'))
})
test('超长提问前端拒绝，不调用或写入新消息',async()=>{
 const c=setup();await c.send('x'.repeat(2001));assert.equal(c.calls.length,0);assert.equal(c.messages.value.length,0);assert.match(c.replyError.value,/2000/)
})
test('thinking期间重复发送不创建第二请求',async()=>{
 const c=setup();c.thinking.value=true;await c.send();assert.equal(c.calls.length,0);assert.equal(c.messages.value.length,0)
})
test('历史限8条、每条2000、合计8000，去除source字段',async()=>{
 const c=setup('success',Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(3000),source:'rule'})));await c.send();const h=c.calls[0][1];assert.ok(h.length<=8);assert.ok(h.every(m=>m.content.length<=2000));assert.ok(h.reduce((s,m)=>s+m.content.length,0)<=8000)
})
test('渲染异常仍恢复thinking，不自动重试上游',async()=>{
 const c=setup();c.env.nextTick=async()=>{throw Error('test render failure')};await assert.rejects(c.send());assert.equal(c.thinking.value,false);assert.equal(c.calls.length,1)
})
