import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import * as vue from 'vue'
const sample = JSON.parse(fs.readFileSync('public/sample-data/product-bom.json', 'utf8'))
const view = fs.readFileSync('src/views/PcfView.vue', 'utf8')
const storeCode = fs.readFileSync('src/stores/data.ts', 'utf8')
const reportCode = fs.readFileSync('src/utils/reportBuilder.ts', 'utf8')
function evaluate(code, require, extra = {}) {
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports, require, console, ...extra })
  return module.exports
}
function harness(legacy = null) {
  const storage = new Map(legacy === null ? [] : [['carbonai_user_pcf', legacy]])
  const localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) }
  let ok = true, payload = structuredClone(sample)
  const fetch = async () => ({ ok, json: async () => payload })
  const store = evaluate(storeCode, id => id === 'vue' ? vue : id === 'pinia' ? { defineStore: (_, setup) => () => vue.reactive(setup()) } : {}, { localStorage, fetch }).useDataStore()
  const stops = [], exports = [], history = []
  const script = view.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const api = evaluate(script + '\nexport { loadDemo, calcPcf, clearResult, exportPcf, stageData, productName, unit, standard, hasResult, total, bomRows, loadError };', id => {
    if (id === 'vue') return { ...vue, watch: (...args) => { const stop = vue.watch(...args); stops.push(stop); return stop }, onMounted() {}, onBeforeUnmount() {} }
    if (id.includes('/stores/data')) return { useDataStore: () => store }
    if (id.includes('useToast')) return { useToast: () => ({ success() {}, info() {}, error() {} }) }
    if (id.includes('useElementResize')) return { useElementResize() {} }
    if (id.includes('reportBuilder')) return { buildPcfHtml: d => JSON.stringify(d), exportHtmlToPdf: async (html, filename) => exports.push({ html, filename }), exportReportWord: async (title, subtitle, html, filename) => exports.push({ title, subtitle, html, filename }), addReportHistory: r => history.push(r) }
    return {}
  })
  return { api, store, storage, exports, history, fail: () => { ok = false }, invalid: () => { payload = { ...sample, _meta: { dataType: 'USER' } } }, dispose: () => { api.clearResult(); stops.forEach(f => f()) } }
}
test('固定示例67.8，BOM/PCF/顶栏来源一致，不写用户缓存且重复计算确定', async () => {
  const h = harness(); await h.api.loadDemo()
  assert.equal(h.store.source.bom, 'sample'); assert.equal(h.store.source.pcf, 'sample')
  assert.equal(h.api.total.value, 67.8); assert.equal(h.api.unit.value, '件')
  assert.ok(h.api.bomRows.value.length); assert.equal(h.storage.has('carbonai_user_pcf'), false)
  const first = JSON.stringify(h.api.stageData.value)
  await h.api.calcPcf(); assert.equal(JSON.stringify(h.api.stageData.value), first)
  assert.equal(Object.values(h.store.source).includes('user'), false); h.dispose()
})
test('用户BOM不混入示例；历史PCF原文保留、禁止覆盖，不认定用户结果', async () => {
  const raw = '{"productName":"旧记录","stages":{"raw":999}}', h = harness(raw)
  h.store.setUserBom({ product: { name: '用户产品' }, bom: [] }); await h.api.loadDemo()
  assert.equal(h.api.productName.value, sample.product.name); assert.equal(h.store.source.bom, 'sample')
  assert.equal(h.storage.get('carbonai_user_pcf'), raw); assert.equal(h.store.userPcf, null)
  assert.equal(h.store.historicalPcfCache, raw); assert.throws(() => h.store.setUserPcf({}), /不能覆盖/)
  assert.match(h.storage.get('carbonai_user_bom'), /用户产品/)
  h.store.resetAllToSample(); assert.equal(h.api.productName.value, ''); assert.equal(h.api.hasResult.value, false)
  assert.equal(h.storage.get('carbonai_user_pcf'), raw); h.dispose()
})
test('全局重置与加载失败清除旧结果和错误状态，来源无效不计算', async () => {
  const h = harness(); await h.api.loadDemo()
  h.store.source.pcf = 'user'; h.store.userPcf = { stale: true }; h.store.resetAllToSample()
  assert.equal(h.store.source.pcf, 'sample'); assert.equal(h.store.userPcf, null); assert.equal(h.api.hasResult.value, false)
  await h.api.loadDemo(); h.fail(); await h.api.loadDemo()
  assert.equal(h.api.hasResult.value, false); assert.ok(h.api.loadError.value)
  h.store.resetAllToSample(); assert.equal(h.api.loadError.value, ''); h.dispose()
  const bad = harness(); bad.invalid(); await bad.api.loadDemo()
  assert.equal(bad.api.hasResult.value, false); assert.match(bad.api.loadError.value, /无效/); bad.dispose()
})
test('单位锁定件；标准仅展示，PDF/Word调用与历史保持DEMO身份', async () => {
  assert.match(view, /<el-select v-model="unit" disabled/)
  assert.doesNotMatch(view, /value="kg"|value="t"|Math\.random\(|setUserPcf\(/)
  assert.match(view, /暂不支持 kg \/ t 换算/)
  const h = harness(); await h.api.loadDemo(); const total = h.api.total.value
  h.api.standard.value = '欧盟 PEF'; assert.equal(h.api.total.value, total)
  await h.api.exportPcf('pdf'); await h.api.exportPcf('word')
  assert.ok(h.exports.every(r => r.filename.startsWith('演示资料_')))
  assert.match(h.exports[1].subtitle, /非合规依据/)
  assert.ok(h.history.every(r => r.name.includes('DEMO ONLY') && r.standard.includes('非合规依据'))); h.dispose()
})
test('报告正文完整声明，标准不作为核算依据', () => {
  const r = evaluate(reportCode, () => ({ fmt: n => String(n) }))
  const html = r.buildPcfHtml({ productName: '示例产品', unit: '件', standard: 'ISO 14067:2018', stages: [] })
  assert.ok(html.includes(r.PCF_DEMO_DISCLAIMER)); assert.match(html, /DEMO ONLY/)
  assert.match(html, /非合规依据/); assert.doesNotMatch(html, /in accordance with|核算依据/)
})
