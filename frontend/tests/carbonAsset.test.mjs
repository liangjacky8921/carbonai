// All prices below are synthetic Mock fixtures, NOT market observations.
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { ref, computed, reactive, nextTick } from 'vue'
import { makePricePlot, parsePriceRecords, priceRecordNature, formatPriceTooltip } from '../src/utils/carbonPriceChart.ts'
import * as priceTools from '../src/utils/carbonPriceChart.ts'
const AS_OF='2026-11-01'
const observed={product:'CEA',kind:'spot_close',status:'observed',targetMonth:'2026-10',observedAt:'2026-10-30',publishedAt:'2026-10-30',sourceUrl:'https://www.cneeex.com/c/2026-10-30/100.shtml',value:1.23,unit:'¥/t'}
const expected={product:'CEA',kind:'expected_mid',status:'expected',targetMonth:'2026-12',publishedAt:'2026-10-30',sourceUrl:'https://rcsd.fudan.edu.cn/info/1134/100.htm',value:2.34,unit:'¥/t'}
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:1,target:9}}).outputText
const source=fs.readFileSync('src/views/AssetView.vue','utf8'),script=source.split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm,'')
const marketModule={exports:{}}
vm.runInNewContext(compile(fs.readFileSync('src/data/carbonMarket.ts','utf8')),{module:marketModule,exports:marketModule.exports})
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
function setup({online=true,response={code:200,data:{priceRecords:[observed,expected],timestamp:'2026-11-01 10:00:00'}},probe=true}={}){
 const m={exports:{}},charts=[];let mount,unmount,calls=0,probes=0
 const backendOnline=ref(online),dataStore=reactive({source:{emissions:'sample'},sampleEmissions:[{emission:8151.98}],userEmissions:[],currentYear:2026,
  get emissions(){return this.source.emissions==='user'&&this.userEmissions.length?this.userEmissions:this.sampleEmissions},
  get yearRecords(){return this.emissions},get yearTotal(){return this.emissions.reduce((s,r)=>s+r.emission,0)},loadSampleData:async()=>{}})
 const env={module:m,exports:m.exports,computed,ref,nextTick,Date,onMounted:f=>{mount=f},onBeforeUnmount:f=>{unmount=f},useElementResize:()=>{},useDataStore:()=>dataStore,REALTIME_QUOTES:marketModule.exports.REALTIME_QUOTES,fmt:(n,d=2)=>n.toFixed(d),...priceTools,marketToday:()=>AS_OF,CHART_AXIS:{},CHART_TOOLTIP:{},backendOnline,
 probeBackend:async()=>{probes++;const result=probe instanceof Promise?await probe:probe;backendOnline.value=result;return result},
 bizApi:{getMarketQuotes:()=>{calls++;if(response instanceof Error)throw response;if(typeof response==='function')return response();return Promise.resolve(response)}},
 echarts:{init:()=>{const chart={options:[],disposed:false,setOption(o){this.options.push(o)},dispose(){this.disposed=true},resize(){}};charts.push(chart);return chart}}}
 vm.runInNewContext(compile(script+'\nexport {loadMarketRecords,marketState,marketError,priceRecords,pricePlot,displayQuotes,emissionsSourceLabel,hasEmissionRecords,gap,gapValue,priceEl,portfolioEl,snapshotTime,requestTime,calendar}'),env)
 m.exports.priceEl.value={};m.exports.portfolioEl.value={};return {s:m.exports,charts,dataStore,backendOnline,mount:()=>mount(),unmount:()=>unmount(),calls:()=>calls,probes:()=>probes}
}
test('合成Mock：有效成交与官方预期分开，缺失月份不补造',()=>{
 const p=makePricePlot([observed,expected],2026,AS_OF);assert.equal(p.series.length,2);assert.equal(p.series[0].data[9],1.23);assert.equal(p.series[1].data[11],2.34);assert.equal(p.series[0].data[6],null);assert.ok(p.months.every(m=>!m.includes('预')))
})
test('合成Mock：只有官方预期，不伪装成交；Tooltip带完整日期、来源原文',()=>{
 const p=makePricePlot([expected],2026,AS_OF);const html=formatPriceTooltip([{axisValue:'12月',seriesName:p.series[0].name}],p)
 assert.equal(p.series.length,1);for(const s of ['发布 2026-10-30','目标月份 2026-12','交易日不适用','非成交价','rcsd.fudan.edu.cn','原文'])assert.ok(html.includes(s));assert.doesNotMatch(html,/undefined|NaN|交易实价/)
 const p2=makePricePlot([observed],2026,AS_OF),t=formatPriceTooltip([{axisValue:'10月',seriesName:p2.series[0].name}],p2);assert.match(t,/交易日 2026-10-30/);assert.match(t,/发布 2026-10-30/)
})
test('来源、未来日期、格式、状态及单位严格校验，未知CCER渠道不放行',()=>{
 const bad=[{...observed,publishedAt:'2026-11-02'},{...observed,observedAt:'2026-12-01',targetMonth:'2026-12'},
 {...observed,unit:'€/t'},{...observed,value:NaN},{...observed,value:0},{...observed,sourceUrl:'https://unknown.example.invalid/mock'},
 {...observed,sourceUrl:'https://www.cneeex.com.evil.invalid/c/2026-10-30/100.shtml'},
 {...observed,sourceUrl:'https://user@www.cneeex.com/c/2026-10-30/100.shtml'},
 {...observed,publishedAt:'2026-02-30'},{...observed,targetMonth:'2026-09'},
 {...observed,sourceUrl:'https://www.cneeex.com/c/2026-10-29/100.shtml'},
 {...observed,product:'CCER',kind:'spot_avg'}, {...expected,publishedAt:'2026-11-02'}]
 assert.equal(parsePriceRecords(bad,AS_OF).length,0);assert.equal(parsePriceRecords([observed], 'invalid').length,0)
})
test('历史交易保留但非最新；历史发布预期不能变成成交价',()=>{
 const old={...observed,targetMonth:'2026-01',observedAt:'2026-01-02',publishedAt:'2026-01-02',sourceUrl:'https://www.cneeex.com/c/2026-01-02/1.shtml'}
 assert.equal(parsePriceRecords([old],AS_OF).length,1);assert.match(priceRecordNature(old,AS_OF),/历史交易记录（非最新/);assert.match(priceRecordNature(expected,AS_OF),/历史发布价格预期（非成交价）/)
})
test('实际资产页只使用priceRecords，报价卡与曲线一致、静态卡明确未知日期',async()=>{
 const c=setup();await c.s.loadMarketRecords();assert.equal(c.s.marketState.value,'ready');assert.equal(c.calls(),1);assert.equal(c.s.displayQuotes.value[0].price,'1.23');assert.equal(c.s.pricePlot.value.series.length,2)
 assert.ok(c.s.displayQuotes.value.find(x=>x.key==='core').nature.includes('固定参考'));assert.ok(source.includes('发布日期：未知'));assert.doesNotMatch(script,/PRICE_SERIES|\.priceSeries/);assert.equal(c.charts.at(-1).options[0].series[0].connectNulls,false);assert.equal(c.charts.at(-1).options[0].series[0].smooth,false)
})
test('全部来源失败/旧数组响应均为空图，不回退静态实价',async()=>{
 for(const data of [{priceRecords:[],priceSeries:{cea:[99]}},{priceSeries:{cea:[99]}},{}]){const c=setup({response:{code:200,data}});await c.s.loadMarketRecords();assert.equal(c.s.marketState.value,'empty');assert.equal(c.s.priceRecords.value.length,0);assert.ok(c.s.displayQuotes.value.every(q=>!q.record))}
})
test('后端不可用、业务503及网络异常均错误状态且不调用静态图',async()=>{
 const offline=setup({online:false,probe:false});await offline.s.loadMarketRecords();assert.equal(offline.calls(),0);assert.equal(offline.s.marketState.value,'error')
 for(const response of [{code:503,data:null},new Error('mock')]){const c=setup({response});await c.s.loadMarketRecords();assert.equal(c.s.marketState.value,'error');assert.equal(c.s.priceRecords.value.length,0)}
})
test('异步首次挂载等待探测后补拉一次；挂载不依赖初始在线标记',async()=>{
 const probe=deferred(),c=setup({online:false,probe:probe.promise});await c.mount();assert.equal(c.calls(),0);assert.equal(c.probes(),1);probe.resolve(true);await c.s.loadMarketRecords();assert.equal(c.calls(),1);assert.equal(c.s.marketState.value,'ready')
})
test('并发加载去重，完成后失败清空旧记录',async()=>{
 const d=deferred();let response=d.promise;const c=setup({response:()=>response});const first=c.s.loadMarketRecords(),second=c.s.loadMarketRecords();assert.equal(first,second);assert.equal(c.calls(),1);d.resolve({code:200,data:{priceRecords:[observed]}});await first;assert.equal(c.s.marketState.value,'ready');response=Promise.resolve({code:503,data:null});await c.s.loadMarketRecords();assert.equal(c.calls(),2);assert.equal(c.s.marketState.value,'error');assert.equal(c.s.priceRecords.value.length,0)
})
test('卸载中的探测和行情响应不回写，图表释放且后续不请求',async()=>{
 const d=deferred(),c=setup({response:d.promise});const pending=c.s.loadMarketRecords();c.unmount();d.resolve({code:200,data:{priceRecords:[observed]}});await pending;assert.equal(c.s.priceRecords.value.length,0);await c.s.loadMarketRecords();assert.equal(c.calls(),1)
 const probe=deferred(),x=setup({online:false,probe:probe.promise});const wait=x.s.loadMarketRecords();x.unmount();probe.resolve(true);await wait;assert.equal(x.calls(),0)
 const y=setup();await y.s.loadMarketRecords();y.unmount();assert.ok(y.charts.every(ch=>ch.disposed))
})
test('来源看实际数组；空用户记录回退示例时标待确认，不改Store原值',async()=>{
 const c=setup();assert.equal(c.s.emissionsSourceLabel.value,'内置虚拟企业示例');c.dataStore.source.emissions='user';assert.equal(c.s.emissionsSourceLabel.value,'来源待确认');c.dataStore.userEmissions=[{emission:5}];assert.match(c.s.emissionsSourceLabel.value,/用户上传记录/);assert.equal(c.dataStore.sampleEmissions[0].emission,8151.98)
})
test('固定估值与tCO₂e仅数值演示，空核算不显示虚假盈余',()=>{
 const c=setup();assert.equal(c.s.gap.value,50048);assert.equal(c.s.gapValue.value,'¥405.54万');assert.ok(source.includes('不把相同数字转换为tCO₂'));assert.ok(source.includes('演示估值'));assert.ok(source.includes('81.03'));assert.equal(c.s.calendar.length,5);assert.ok(c.s.calendar.every(e=>e.text.includes('示例')))
 c.dataStore.sampleEmissions=[];assert.equal(c.s.gap.value,null);assert.equal(c.s.gapValue.value,'—')
})
test('快照与本次请求时间分开，不认定各卡片同时发布',async()=>{
 const c=setup();await c.s.loadMarketRecords();assert.equal(c.s.snapshotTime.value,'2026-11-01 10:00:00');assert.ok(c.s.requestTime.value);assert.ok(source.includes('不是各报价发布日期'));const dash=fs.readFileSync('src/views/DashboardView.vue','utf8');assert.doesNotMatch(dash,/接口响应 \$\{marketTimestamp\}/);assert.match(dash,/快照组装\/缓存/)
})
