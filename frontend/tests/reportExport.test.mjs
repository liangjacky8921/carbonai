import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
const source=fs.readFileSync('src/utils/reportBuilder.ts','utf8'), view=fs.readFileSync('src/views/ReportView.vue','utf8')
function historyApi(raw='[]') {
 let saved=raw;const module={exports:{}}
 const localStorage={getItem:()=>saved,setItem:(_,s)=>saved=s,removeItem:()=>{saved=null}}
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:1,target:9}}).outputText,{module,exports:module.exports,localStorage,require:()=>({})})
 return {...module.exports,raw:()=>saved}
}
const legacy={id:'old',name:'旧报告',standard:'GHG',region:'中国',date:'2026-01-01',format:'PDF',type:'standard'}
test('历史兼容：旧记录不改写，不凭旧PDF字段认定已导出',()=>{
 const raw=JSON.stringify([legacy]),api=historyApi(raw)
 assert.equal(api.reportHistoryLabel(api.getReportHistory()[0]),'旧记录（操作未区分）');assert.equal(api.raw(),raw)
 api.addReportHistory({...legacy,id:undefined,format:'草稿',action:'draft'});assert.deepEqual(JSON.parse(api.raw())[1],legacy)
})
test('历史元数据：生成与导出分开，不写正文/Blob/重下载地址',()=>{
 const api=historyApi();api.addReportHistory({...legacy,format:'草稿',action:'draft'})
 assert.equal(api.getReportHistory()[0].format,'草稿');assert.equal(api.reportHistoryLabel(api.getReportHistory()[0]),'已生成草稿')
 api.addReportHistory({...legacy,format:'Word',action:'export'})
 const a=api.getReportHistory();assert.match(api.reportHistoryLabel(a[0]),/已导出Word/);assert.equal(a.length,2);assert.ok(a.every(r=>!('html' in r||'url' in r||'blob' in r)))
})
function actions(exporter) {
 const api=historyApi(),m={exports:{}},exporting={value:''}
 const code=view.slice(view.indexOf('function generate()'),view.indexOf('async function clearHistory()'))+'\nexport {generate,exportPdf,exportWord}'
 const toast=new Proxy({}, {get:()=>()=>{}})
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:1,target:9}}).outputText,{module:m,exports:m.exports,dataStore:{yearRecords:[{}],currentYear:2026},history:{value:[]},exporting,toast,currentName:{value:'GHG'},region:{value:'auto'},REGION_LABELS:{auto:'自动'},previewHtml:{value:'DRAFT'},...api,exportHtmlToPdf:exporter,exportReportWord:exporter})
 return {...m.exports,api,exporting}
}
test('实际页面生成操作仅记录草稿，不调用文件导出',()=>{
 const ctx=actions(()=>assert.fail('不应导出'));ctx.generate();assert.equal(ctx.api.getReportHistory()[0].action,'draft');assert.equal(ctx.api.getReportHistory()[0].format,'草稿')
})
test('导出失败无成功历史；成功才追加对应格式元数据并保留草稿',async()=>{
 const bad=actions(async()=>{throw Error('测试失败')});await bad.exportPdf();assert.equal(bad.api.getReportHistory().length,0);assert.equal(bad.exporting.value,'')
 const good=actions(async()=>{});good.generate();await good.exportPdf();await good.exportWord()
 const a=good.api.getReportHistory();assert.deepEqual(Array.from(a,x=>x.action),['export','export','draft']);assert.deepEqual(Array.from(a,x=>x.format),['Word','PDF','草稿']);assert.ok(a.every(x=>x.name.includes('草稿')))
})
