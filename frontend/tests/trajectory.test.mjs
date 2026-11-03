import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { distanceKm, estimateTrajectory, groupTrajectory, parseTrajectoryCsv } from '../src/utils/trajectory.ts'

const point = (overrides = {}) => ({ time: '2026-01-01 00:00:00', lat: 0, lon: 0, speed: 40, load: 10, vehicle: 'truck', fuel: 'diesel', vehicleId: 'A', ...overrides })
const pair = () => [point(), point({ time: '2026-01-01 00:01:00', lat: .01 })]
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('单车两点：已知球面距离、吨公里和示意排放量', () => {
  const points = pair(), { totals, segments } = estimateTrajectory(points, 1)
  close(distanceKm(...points), 1.111950802335329)
  close(totals.dist, 1.111950802335329)
  close(totals.tonKm, totals.dist * 10)
  close(totals.carbon, totals.tonKm * .0858)
  assert.equal(segments.length, 1)
})

test('多车与乱序：独立分组排序，不形成跨车路段', () => {
  const a = pair(), b = pair().map(p => ({ ...p, vehicleId: 'B', lon: 100 }))
  const result = estimateTrajectory([b[1], a[1], b[0], a[0]], 1)
  assert.equal(result.segments.length, 2)
  close(result.totals.dist, distanceKm(...a) + distanceKm(...b))
  assert.deepEqual([...groupTrajectory([a[1], a[0]]).values()][0], a)
})

test('非法坐标、时间、部分缺失ID和重复时间明确报错', () => {
  for (const changes of [{ lat: 91 }, { lon: -181 }, { lon: NaN }, { lat: Infinity }, { time: 'bad' }, { vehicleId: '' }])
    assert.throws(() => estimateTrajectory([point(changes), pair()[1]], 1))
  assert.throws(() => estimateTrajectory([point(), point()], 1), /重复时间/)
})

test('零载重保留0，缺失和负载重不使用默认15吨', () => {
  const empty = estimateTrajectory(pair().map(p => ({ ...p, load: 0 })), 1)
  assert.ok(empty.totals.dist > 0)
  assert.equal(empty.totals.tonKm, 0)
  assert.equal(empty.totals.carbon, 0)
  for (const load of [NaN, undefined, -1]) assert.throws(() => estimateTrajectory([point({ load }), pair()[1]], 1), /载重/)
})

test('CSV：按列名、BOM/CRLF清洗，坏数据不静默跳行', () => {
  const header = 'timestamp,lat,lon,speed,load,vehicle_type,fuel_type,vehicle_id'
  const csv = '\uFEFF# comment\r\n' + header + '\r\n2026-01-01 00:00:00,0,0,40,10,truck,diesel,A\r\n2026-01-01 00:01:00,.01,0,40,10,truck,diesel,A'
  assert.equal(groupTrajectory(parseTrajectoryCsv(csv)).size, 1)
  for (const bad of [csv.replace(',0,0,40', ',0,bad,40'), csv.replace(',40,10,', ',40,,')]) assert.throws(() => parseTrajectoryCsv(bad))
  assert.throws(() => parseTrajectoryCsv('lat,lon\n1,2'), /表头/)
})

test('示例回归：180点/3辆车/177段，原始路段之和等于KPI计算输入', () => {
  const points = parseTrajectoryCsv(fs.readFileSync(new URL('../public/sample-data/fleet-gps-trajectory.csv', import.meta.url), 'utf8'))
  const { segments, totals } = estimateTrajectory(points, 1)
  assert.equal(points.length, 180)
  assert.equal(groupTrajectory(points).size, 3)
  assert.equal(segments.length, 177)
  for (const key of ['dist', 'tonKm', 'carbon']) close(totals[key], segments.reduce((n, s) => n + s[key], 0))
  for (const segment of segments) close(segment.tonKm, segment.dist * segment.load)
  assert.ok(segments.every(s => s.dist < 100))
  console.log('修复后示例', JSON.stringify(totals))
})

const view = fs.readFileSync(new URL('../src/views/TrajectoryView.vue', import.meta.url), 'utf8')
function evaluate(source, context) {
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context)
}
test('实际页面清理函数：加载/上传新轨迹前清空旧结果、图表与地图', () => {
  const c = { trajData: pair(), result: { value: {} }, segments: { value: [1] }, trajLine: {}, map: { removeLayer() {} }, segChart: { clear() {} }, vehChart: { clear() {} } }
  evaluate(view.slice(view.indexOf('function clearTrajectory()'), view.indexOf('function renderTrajectory(')), c)
  c.clearTrajectory()
  assert.equal(c.result.value, null); assert.equal(c.segments.value.length, 0); assert.equal(c.trajData.length, 0); assert.equal(c.trajLine, null)
  assert.match(view, /async function loadDemo\(\)[\s\S]*?clearTrajectory\(\)/)
  assert.match(view, /async function onFile\(file: File\)[\s\S]*?clearTrajectory\(\)/)
})

test('实际地图函数：每车独立折线、与计算分组一致', () => {
  const lines = [], noop = () => ({ addTo() {} })
  const c = { groupTrajectory, initMap() {}, map: { removeLayer() {}, fitBounds() {} }, trajLine: null, document: { createElement: () => ({}) },
    L: { featureGroup: () => ({ addTo() { return this }, getBounds: () => ({ pad() {} }) }), polyline: coords => { lines.push(coords); return noop() }, circleMarker: () => ({ bindPopup: noop }) } }
  evaluate(view.slice(view.indexOf('function renderTrajectory('), view.indexOf('async function loadDemo()')), c)
  c.renderTrajectory([...pair().reverse(), ...pair().map(p => ({ ...p, vehicleId: 'B', lon: 100 }))])
  assert.equal(lines.length, 2); assert.ok(lines.every(l => l.length === 2 && l[0][1] === l[1][1]))
})

test('实际页面统计函数：KPI仅在最终显示时舍入', () => {
  const c = { trajData: pair(), cargoType: { value: 'normal' }, cargoFactor: { normal: 1 }, estimateTrajectory, calculating: { value: false }, loadError: { value: '' }, segments: { value: [] }, result: { value: null }, nextTick() {}, toast: { info() {}, error() {} } }
  evaluate(view.slice(view.indexOf('function calculate()'), view.indexOf('function renderCharts(')), c)
  c.calculate()
  assert.equal(c.result.value.dist, '1.1'); assert.equal(c.result.value.tonKm, '11.1'); assert.equal(c.result.value.carbon, '1.0')
  close(c.segments.value[0].dist, distanceKm(...pair()))
})


test('轨迹地图离页：取消300ms任务，迟发回调不访问已销毁地图', () => {
  let pending, teardown, cancelled = 0, invalidated = 0, removed = 0
  const instance = {invalidateSize(){invalidated++},off(){},remove(){removed++}}
  const c = {disposed:false,map:null,mapEl:{value:{}},sizeTimer:null,segChart:null,vehChart:null,
    L:{map:()=>instance,tileLayer:()=>({addTo(){}})},
    setTimeout(fn){pending=fn;return 1},clearTimeout(id){cancelled=id},onBeforeUnmount(fn){teardown=fn}}
  evaluate(view.slice(view.indexOf('function initMap()'), view.indexOf('function clearTrajectory()')),c)
  evaluate(view.slice(view.indexOf('onBeforeUnmount(() =>'), view.indexOf('</script>')),c)
  c.initMap();assert.ok(pending);teardown();pending();c.initMap()
  assert.equal(cancelled,1);assert.equal(invalidated,0);assert.equal(removed,1);assert.equal(c.map,null);assert.equal(c.disposed,true)
})
