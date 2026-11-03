import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'
import { computed } from 'vue'
const builder=fs.readFileSync('src/utils/reportBuilder.ts','utf8')
const module={exports:{}}
vm.runInNewContext(ts.transpileModule(builder,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:id=>id.includes('format')?{fmt:(n,d=2)=>Number(n).toFixed(d)}:{STANDARD_NAMES:{ghg:'GHG',iso:'ISO',cbam:'CBAM','hk-esg':'HKEX'}}})
const {buildReportDataNote,buildStandardReportHtml}=module.exports
const all=JSON.parse(fs.readFileSync('public/sample-data/enterprise-emissions.json','utf8')).records
const records=all.filter(r=>r.year===2026)
test('报告来源：示例/用户/默认未知分别标记，上传不被认证为真实',()=>{
 assert.match(buildReportDataNote(records,2026,'sample'),/内置虚拟企业示例数据/)
 assert.match(buildReportDataNote(records,2026,'user'),/用户上传记录（真实性未核验）/)
 assert.match(buildReportDataNote(records,2026),/来源待确认/)
 assert.match(buildStandardReportHtml('ghg',records,2026),/来源待确认/)
 assert.match(buildReportDataNote(records,2026,'sample'),/不代表已完成标准合规审查/)
})
test('报告日期：真实2026年1–6月、2025年1–12月与缺失字段，不补月份',()=>{
 const a=buildReportDataNote(records,2026,'sample')
 assert.match(a,/2026-01、2026-02、2026-03、2026-04、2026-05、2026-06/)
 assert.doesNotMatch(a,/2026-07/);assert.match(a,/记录条数：<\/b>66/)
 assert.match(buildReportDataNote(all.filter(r=>r.year===2025),2025,'sample'),/2025-12/)
 const partial=[{...records[0],month:1},{...records[0],month:3},{...records[0],month:undefined},{...records[0],month:13}]
 const b=buildReportDataNote(partial,2026,'user')
 assert.match(b,/2026-01、2026-03/);assert.doesNotMatch(b,/2026-02/);assert.match(b,/日期字段缺失或无效：2条/)
})
test('来源取实际活动数组：标记与实际记录不一致时未知，不自动认定用户',()=>{
 const view=fs.readFileSync('src/views/ReportView.vue','utf8')
 const block=view.slice(view.indexOf('const reportSource ='),view.indexOf('const reportSourceLabel ='))
 function source(dataStore){const m={exports:{}};vm.runInNewContext(ts.transpileModule(block+'\nexport {reportSource}',{compilerOptions:{module:1}}).outputText,{module:m,exports:m.exports,computed,dataStore});return m.exports.reportSource.value}
 const sample=[],user=[]
 assert.equal(source({source:{emissions:'sample'},emissions:sample,sampleEmissions:sample,userEmissions:user}),'sample')
 assert.equal(source({source:{emissions:'user'},emissions:user,sampleEmissions:sample,userEmissions:user}),'user')
 assert.equal(source({source:{emissions:'user'},emissions:sample,sampleEmissions:sample,userEmissions:user}),'unknown')
})
test('ISO：不确定度/基准年/类别覆盖均未自动认证',()=>{
 const html=buildStandardReportHtml('iso',records,2026,'sample')
 assert.doesNotMatch(html,/±7\.2|按 GUM 评估|类别1-6 全覆盖|基准年：2025|全球互认核查标准/)
 assert.match(html,/尚未进行不确定度评估/);assert.match(html,/基准年：待填写\/待核实/)
 assert.match(html,/未完成ISO类别认定/)
})
test('HKEX：治理/薪酬/营收事实为待填写，不伪造NGFS或ERM实施',()=>{
 const html=buildStandardReportHtml('hk-esg',records,2026,'sample')
 assert.doesNotMatch(html,/已使用NGFS|已纳入企业|权重15%|8000|2030年降碳35|CEO直接负责/)
 assert.match(html,/待企业填写\/待核实/);assert.match(html,/营收及适用分母未提供/)
 assert.doesNotMatch(buildStandardReportHtml('cn-sse',records,2026,'sample'),/8000|tCO₂e\/万元营收/)
})
test('CBAM：固定数值隔离为演示，Scope2不再全部标电力/南方电网',()=>{
 const html=buildStandardReportHtml('cbam',records,2026,'sample')
 assert.match(html,/演示假设（未经核验）/);assert.match(html,/分配比例0.85、参考价75.05/)
 assert.match(html,/不适用于正式申报/);assert.match(html,/非证书需求或申报金额/)
 assert.doesNotMatch(html,/Omnibus条例下覆盖率|CBAM证书需求\(Omnibus|>南方电网<|子表C — 间接排放\(电力\)/)
 assert.match(html,/Scope 2原始记录摘录（未认定为电力排放）/)
 assert.match(html,/外购热力/)
})
test('修订不改原始核算记录，汇总仍来自相同示例',()=>{
 const before=JSON.stringify(records)
 for(const k of ['ghg','iso','cbam','hk-esg'])buildStandardReportHtml(k,records,2026,'sample')
 assert.equal(JSON.stringify(records),before)
 assert.equal(Number(records.reduce((s,r)=>s+r.emission,0).toFixed(2)),8151.98)
})
