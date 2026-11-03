import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as vue from 'vue'
import * as XLSX from 'xlsx'
import * as units from '../src/utils/accountingUnits.ts'
const factor = {unit:'MWh',factor:.5703,factorUnit:'tCO₂/MWh',source:'中国电网2023(南方)'}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`)
function harness(legacy='[{"year":2026,"source":"历史","emission":999,"scope":"Scope 2"}]') {
 const storage=new Map([['carbonai_user_emissions',legacy]])
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
 const module={exports:{}}
 const code=ts.transpileModule(fs.readFileSync('src/stores/data.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>id==='vue'?vue:id==='pinia'?{defineStore:(_,setup)=>()=>vue.reactive(setup())}:id==='xlsx'?XLSX:id.includes('accountingUnits')?units:{},localStorage,console})
 return {api:module.exports,storage,store:module.exports.useDataStore(),legacy}
}
const csv=(rows)=>new File(['排放源,活动数据,单位,年份,月份,部门\n'+rows.join('\n')],'synthetic-mock.csv',{type:'text/csv'})
test('电力等价单位与未舍入小数：1000/1和500/0.5一致',()=>{
 for(const [value,unit,expected] of [[1000,'kWh',.5703],[1,'MWh',.5703],[500,'kWh',.28515],[.5,'MWh',.28515],[1,' kWh ',.0005703]]) {
 const r=units.calculateUnitChecked(value,unit,factor);close(r.emission,expected);assert.equal(r.confidence,'low');assert.equal(r.emissionUnit,'tCO₂')
 }
})
test('质量、体积、热量仅使用明确比例；不改因子',()=>{
 const cases=[['吨','tCO₂/t',3.1605,1000,'kg',3.1605],['吨','tCO₂/t',3.1605,1,'t',3.1605],['万m³','tCO₂/万m³',21.84,10000,'m3',21.84],['万m³','tCO₂/万m³',21.84,1,'万m³',21.84],['GJ','tCO₂/GJ',.11,1,'GJ',.11]]
 for(const [unit,factorUnit,f,value,original,expected] of cases)close(units.calculateUnitChecked(value,original,{unit,factorUnit,factor:f}).emission,expected)
})
test('未知、空白、错误大小写、质量体积不互换、非有限及歧义因子拒算',()=>{
 for(const u of ['', ' ', 'KWH','kwh','mWh','吨','L','MJ']) assert.throws(()=>units.calculateUnitChecked(1000,u,factor))
 for(const a of [NaN,Infinity,-1,0]) assert.throws(()=>units.calculateUnitChecked(a,'kWh',factor))
 assert.throws(()=>units.calculateUnitChecked(1,'L',{unit:'吨',factor:3.1605,factorUnit:'tCO₂/t'}))
 assert.throws(()=>units.calculateUnitChecked(1,'吨',{unit:'万m³',factor:21.84,factorUnit:'tCO₂/万m³'}))
 assert.throws(()=>units.calculateUnitChecked(1,'kWh',{...factor,factorUnit:'kgCO₂e/kWh'}))
 assert.throws(()=>units.calculateUnitChecked(1,'吨·km',{unit:'吨·km',factor:.078,factorUnit:'tCO₂/吨·km'}),/kg\/t/)
 assert.throws(()=>units.calculateUnitChecked(1,'MWh',{...factor,source:'默认排放因子'}))
})
test('真实CSV解析、Scope/年度汇总与原始字段保护，失败不写历史缓存',async()=>{
 const h=harness(), rows=await h.api.parseEmissionFile(csv(['电力,1000,kWh,2026,1,A','电力,1,MWh,2026,2,A','电力,500,kWh,2025,1,A','电力,0.5,MWh,2025,2,A','柴油,1000,kg,2026,3,B']))
 close(rows[0].emission,rows[1].emission);close(rows[2].emission,rows[3].emission)
 assert.equal(rows[0].activity,1000);assert.equal(rows[0].unit,'kWh');assert.equal(rows[0].factor,.5703)
 assert.ok(rows.every(units.isUnitCheckedRecord));assert.equal(h.storage.get('carbonai_user_emissions'),h.legacy)
 for(const row of ['电力,1000,,2026','电力,1000,KWH,2026','未知,1,吨,2026','航空,1,人·km,2026','柴油,1,L,2026']) await assert.rejects(()=>h.api.parseEmissionFile(csv([row])))
 assert.equal(h.storage.get('carbonai_user_emissions'),h.legacy)
 h.store.setUserEmissions(rows);close(h.store.yearTotal,.5703*2+3.1605);close(h.store.scopeSummary['Scope 2'],1.1406);close(h.store.scopeSummary['Scope 1'],3.1605)
 h.store.currentYear=2025;close(h.store.yearTotal,.5703)
})
test('服务端元数据验证与历史/混合口径不迁移；不同因子不强行相等',()=>{
 const r={activity:1000,unit:'kWh',factor:.6,factorSource:'合成Mock因子',...units.calculateUnitChecked(1000,'kWh',{...factor,factor:.6})}
 assert.ok(units.isUnitCheckedRecord(r));assert.equal(r.emission,.6)
 assert.equal(units.isUnitCheckedRecord({...r,emission:600}),false)
 assert.equal(units.isUnitCheckedRecord({...r,confidence:'high'}),false)
 assert.equal(units.accountingUnitSummary([r]).unit,'tCO₂')
 const old={emission:99};const before=JSON.stringify(old);assert.match(units.accountingUnitSummary([old]).note,/未重算/)
 assert.match(units.accountingUnitSummary([old,r]).unit,/待核实/);assert.equal(JSON.stringify(old),before)
})

test('下游报告仅作单位展示兼容：新CO₂来源、分母和边界不冒充完整GHG；旧记录原样',async()=>{
 const h=harness();const rows=await h.api.parseEmissionFile(csv(['电力,1000,kWh,2026,1,A']))
 const module={exports:{}}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/reportBuilder.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:id=>id.includes('accountingUnits')?units:id.includes('format')?{fmt:(n,d=2)=>Number(n).toFixed(d)}:{STANDARD_NAMES:{'cn-sse':'测试模板'}}})
 const html=module.exports.buildStandardReportHtml('cn-sse',rows,2026,'user')
 assert.match(html,/tCO₂\/MWh/);assert.match(html,/不能认定为完整温室气体CO₂e/);assert.match(html,/因子声明CO₂合计/);assert.match(html,/0\.57/)
 const old=rows.map(({accountingVersion,normalizedActivity,normalizedUnit,factorUnit,unitCheck,emissionUnit,basisStatus,...r})=>r)
 const legacy=module.exports.buildStandardReportHtml('cn-sse',old,2026,'unknown')
 assert.match(legacy,/tCO₂e/);assert.doesNotMatch(legacy,/明细保留原始活动量/)
})
