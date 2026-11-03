// Synthetic geometry and Mock SSE only; no devices, accounts or network.
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { ref, computed, nextTick } from 'vue'
import * as safety from '../src/utils/gisSafety.ts'
const ring=(x=113,y=22,w=.01)=>[[x,y],[x+w,y],[x+w,y+w],[x,y+w],[x,y]]
const outer=ring(),hole=ring(113.002,22.002,.002),island=ring(113.03)
const geo=(coordinates=[outer],type='Polygon')=>({type,coordinates})
const cfg={realtime_enabled:true,sse_url:'http://mock.invalid/stream',critical_threshold:80,warning_threshold:50,critical_cooldown_ms:600000,warning_cooldown_ms:300000,max_retries:3,demo_point_lat:22.75,demo_point_lon:113.85}
const packet=(extra={})=>({point_id:'synthetic-A',timestamp:new Date().toISOString(),co2e_rate:90,data_source:'simulated',...extra})
function setup(name, random = .5){
 let mount,unmount;const timers=[],sources=[],charts=[],maps=[],polygons=[],rects=[],markers=[],heatLayers=[],toasts=[],writes=[]
 const chain=()=>({layers:[],on(){return this},off(){return this},addTo(m){m.addLayer?.(this);return this},addLayer(x){this.layers.push(x);return this},clearLayers(){this.layers=[]},hasLayer(x){return this.layers.includes(x)},remove(){},setStyle(x){Object.assign(this.style,x);return this},bindPopup(x){this.popup=x;return this},bindTooltip(){return this},getBounds(){return {pad:()=>({})}},bringToFront(){}})
 const map=()=>{const m={removed:false,addLayer(){},removeLayer(){},setView(){},fitBounds(){},on(){},off(){},remove(){this.removed=true},invalidateSize(){},getZoom:()=>10,getBounds:()=>({getWest:()=>113,getSouth:()=>22,getEast:()=>114,getNorth:()=>23})};maps.push(m);return m}
 const L={map,tileLayer:chain,layerGroup:chain,polygon:(points)=>{const p={...chain(),points};polygons.push(p);return p},rectangle:(points,style)=>{const p={...chain(),points,style};rects.push(p);return p},circleMarker:(points,style)=>{const m={...chain(),points,style};markers.push(m);return m},heatLayer:(points,options)=>{const l={...chain(),points,options};heatLayers.push(l);return l},latLngBounds:()=>({pad:()=>({})})}
 const math=Object.create(Math);math.random=()=>random
 const dataStore={source:{boundary:'sample',points:'sample'},points:[],loadSampleData:async()=>{},loadSampleBoundary:async()=>({features:[{geometry:geo()}]}),setUserBoundary:g=>writes.push(g)}
 const mod={exports:{}};const env={module:mod,exports:mod.exports,ref,computed,nextTick,watch:()=>{},onMounted:f=>mount=f,onBeforeUnmount:f=>unmount=f,useElementResize:()=>{},useDataStore:()=>dataStore,useToast:()=>({success:x=>toasts.push(x),warning:x=>toasts.push(x),info:x=>toasts.push(x),error:x=>toasts.push(x)}),useConfirmAction:()=>({confirmAction:async()=>true}),Math:math,Date,Number,Map,Set,AbortController,MONITORING_CONFIG:cfg,...safety,L,GRID_REGIONS:{sz_gm:{name:'Mock区域',lat:22.75,lon:113.95,zoom:13}},GBA_CITIES:[],CHART_TOOLTIP:{},CHART_AXIS:{},setTimeout:(f,ms)=>{timers.push({f,ms,cleared:false});return timers.length},clearTimeout:id=>timers[id-1].cleared=true,EventSource:class{constructor(){sources.push(this)}close(){this.closed=true}emit(p){this.onmessage?.({data:JSON.stringify(p)})}},echarts:{init:()=>{const c={options:[],setOption(o){this.options.push(o)},resize(){},dispose(){this.disposed=true}};charts.push(c);return c}},parsePointsFile:async()=>[]}
 const source=fs.readFileSync(`src/views/${name}.vue`,'utf8').split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm,'')
 const exports=name==='GisView'?'mapEl,processGeometry,onBoundaryFile,gisResult,dataError,initRealtime,streamState,streamSource,lastReceivedAt,heatRadius,heatBlur,renderHeatmap,clearLayers':'mapEl,histEl,statEl,refresh,initRealtimeStream,yellowThreshold,redThreshold,timeWindow,alerts,generatedAt,appliedThresholds,appliedWindow,appliedRegion'
 vm.runInNewContext(ts.transpileModule(source+`\nexport {${exports}}`,{compilerOptions:{module:1,target:9}}).outputText,env)
 const s=mod.exports;s.mapEl.value={};return {s,timers,sources,charts,maps,polygons,rects,markers,heatLayers,dataStore,toasts,writes,mount:()=>mount(),unmount:()=>unmount()}
}
test('Polygon、反向环、孔洞及多岛：完整嵌套与球面面积相加/扣除',()=>{
 const a=safety.prepareForestGeometry(geo()),h=safety.prepareForestGeometry(geo([hole])).areaHa
 assert.ok(a.areaHa>114&&a.areaHa<115)
 assert.ok(Math.abs(a.areaHa-safety.prepareForestGeometry(geo([[...outer].reverse()])).areaHa)<1e-6)
 const withHole=safety.prepareForestGeometry(geo([outer,hole]));assert.ok(Math.abs(withHole.areaHa-(a.areaHa-h))<1e-8);assert.equal(withHole.latlngs[0].length,2)
 const multi=safety.prepareForestGeometry(geo([[outer,hole],[island]],'MultiPolygon'));assert.equal(multi.latlngs.length,2);assert.equal(multi.latlngs[0].length,2);assert.ok(multi.areaHa>withHole.areaHa)
})
test('空环/空多面/非法范围/NaN/Infinity/字符串/未闭合/重复/共线均拒绝',()=>{
 for(const input of [geo([]),geo([], 'MultiPolygon'),geo([[]]),geo([ring(181)]),geo([ring(113,91)]),geo([[[NaN,22],...outer.slice(1)]]),geo([[[Infinity,22],...outer.slice(1)]]),geo([[['113',22],...outer.slice(1)]]),geo([outer.slice(0,-1)]),geo([Array(4).fill([113,22])]),geo([[[113,22],[114,23],[115,24],[113,22]]])])assert.throws(()=>safety.prepareForestGeometry(input))
})
test('实际GIS调用：多面孔洞绘制一致，结果有限；无效上传不覆盖缓存且清旧结果',async()=>{
 const h=setup('GisView');const g=geo([[outer,hole],[island]],'MultiPolygon');await h.s.onBoundaryFile({name:'mock.geojson',text:async()=>JSON.stringify(g)})
 assert.equal(h.writes.length,1);assert.equal(h.polygons.at(-1).points.length,2);assert.equal(h.polygons.at(-1).points[0].length,2)
 for(const k of ['areaHa','ndvi','agb','co2e'])assert.ok(Number.isFinite(Number(h.s.gisResult.value[k])))
 await h.s.onBoundaryFile({name:'bad.geojson',text:async()=>JSON.stringify(geo([[]]))});assert.equal(h.writes.length,1);assert.equal(h.s.gisResult.value,null);assert.ok(h.s.dataError.value)
 h.unmount()
})
test('热力像素16直接传radius、blur5/15/30保持；模板无m误标',()=>{
 const text=fs.readFileSync('src/views/GisView.vue','utf8');assert.match(text,/radius: heatRadius.value, blur: heatBlur.value/);assert.match(text,/heatRadius }}px/);assert.doesNotMatch(text,/heatRadius }}m/)
 const h=setup('GisView');h.dataStore.points=[{name:'Mock',lat:22,lon:113,emission:1,industry:'synthetic'}];assert.equal(h.s.heatRadius.value,16);for(const blur of [5,15,30]){h.s.heatBlur.value=blur;h.s.renderHeatmap();assert.equal(h.heatLayers.at(-1).options.blur,blur);assert.equal(h.heatLayers.at(-1).options.radius,16)}h.unmount()
})
test('SSE类型及时间：0和有限正数接受，异常值/字段/过期与未来包拒绝',()=>{
 assert.equal(safety.parseMonitoringPacket(packet({co2e_rate:0})).rate,0)
 for(const rate of [-1,NaN,Infinity,'90',null,{},true])assert.equal(safety.parseMonitoringPacket(packet({co2e_rate:rate})),null)
 for(const extra of [{point_id:''},{point_id:9},{timestamp:'bad'},{timestamp:new Date(Date.now()-360000).toISOString()},{timestamp:new Date(Date.now()+120000).toISOString()},{data_source:9},{operating_status:9}])assert.equal(safety.parseMonitoringPacket(packet(extra)),null)
 assert.match(safety.monitoringSource('simulated'),/模拟/);assert.match(safety.monitoringSource(null),/未知/);assert.match(safety.monitoringSource('declared'),/已声明.*未认证/)
})
test('GIS实际SSE：0更新、半径上限40、非法包不替换、来源与断线状态',()=>{
 const h=setup('GisView');h.s.renderHeatmap();h.s.initRealtime();const es=h.sources[0];es.onopen();let t=Date.now()-3000
 es.emit(packet({timestamp:new Date(t).toISOString()}));es.emit(packet({co2e_rate:0,timestamp:new Date(t+1000).toISOString()}));assert.ok(h.s.lastReceivedAt.value);assert.equal(h.markers.at(-1).style.radius,10)
 es.emit(packet({co2e_rate:1e300,timestamp:new Date(t+2000).toISOString(),data_source:null}));assert.match(h.s.streamSource.value,/未知/);assert.equal(h.markers.at(-1).style.radius,40)
 es.emit(packet({co2e_rate:Infinity}));assert.equal(h.markers.at(-1).style.radius,40);es.onerror();es.onerror();es.onerror();assert.equal(h.s.streamState.value,'已断开');assert.ok(es.closed);assert.equal(es.onmessage,null);h.unmount()
})
test('GIS离页：延迟启动/尺寸timer取消，已有连接和handler清理，禁止再次创建',async()=>{
 for(const existing of [false,true]){const h=setup('GisView');await h.mount();if(existing)h.s.initRealtime();h.unmount();for(const t of h.timers){assert.ok(t.cleared);t.f()}h.s.initRealtime();assert.equal(h.sources.length,existing?1:0);assert.ok(h.sources.every(x=>x.closed&&x.onmessage===null));assert.ok(h.maps.every(m=>m.removed))}
})
test('阈值：相等/交叉/空/非有限拒绝；正常黄色红色边界严格互斥',()=>{
 for(const pair of [[6,6],[20,2],[null,12],[6,undefined],[NaN,12],[6,Infinity],[0,12],['6',12]])assert.equal(safety.validGridThresholds(...pair),false)
 assert.ok(safety.validGridThresholds(6,12));assert.equal(safety.gridLevel(6,6,12),'normal');assert.equal(safety.gridLevel(12,6,12),'yellow');assert.equal(safety.gridLevel(12.01,6,12),'red')
})
test('实际网格：441格统计总和一致，0落入分布；无效阈值不应用不改现有格网',()=>{
 const h=setup('GridView');h.s.histEl.value={};h.s.statEl.value={};h.s.refresh();assert.equal(h.rects.length,441)
 for(const window of ['realtime','1h','24h','7d']){h.s.timeWindow.value=window;h.s.refresh();for(const c of h.charts){const data=c.options.at(-1).series[0].data;const total=data.reduce((s,d)=>s+(typeof d==='number'?d:d.value),0);assert.equal(total,441)}}
 const count=h.rects.length;const window=h.s.appliedWindow.value;h.s.yellowThreshold.value=20;h.s.redThreshold.value=2;h.s.timeWindow.value='realtime';h.s.refresh();assert.equal(h.s.appliedWindow.value,window);assert.equal(h.rects.length,count);assert.equal(h.s.appliedThresholds.value.yellow,6);assert.match(h.toasts.at(-1),/未应用/);h.unmount()
 const zero=setup('GridView',0);zero.s.histEl.value={};zero.s.statEl.value={};zero.s.refresh();assert.equal(zero.charts[0].options[0].series[0].data[0],441);zero.unmount()
})
test('网格SSE：模拟/未知保留，重复/乱序/过期拒绝，冷却及单调事件ID',()=>{
 const h=setup('GridView');h.s.initRealtimeStream();const es=h.sources[0];const t=Date.now()-3000
 es.emit(packet({timestamp:new Date(t).toISOString()}));const first=h.s.alerts.value[0];assert.equal(first.dataSource,'simulated');es.emit(packet({timestamp:new Date(t).toISOString()}));es.emit(packet({timestamp:new Date(t-1000).toISOString()}));assert.equal(h.s.alerts.value.length,1)
 es.emit(packet({co2e_rate:90,timestamp:new Date(t+1000).toISOString()}));assert.equal(h.s.alerts.value.length,1)
 es.emit(packet({point_id:'synthetic-B',data_source:null,timestamp:new Date(t+1000).toISOString()}));assert.equal(h.s.alerts.value[0].dataSource,null);assert.ok(h.s.alerts.value[0].id>first.id)
 es.emit(packet({co2e_rate:'Infinity'}));es.emit(packet({timestamp:new Date(Date.now()-360000).toISOString()}));assert.equal(h.s.alerts.value.length,2);h.unmount()
})
test('网格离页：800/300ms清理，连接close、handler清空，旧callback不追加事件',()=>{
 for(const existing of [false,true]){const h=setup('GridView');h.mount();if(existing)h.s.initRealtimeStream();const cb=h.sources[0]?.onmessage;h.unmount();h.timers.forEach(t=>{assert.ok(t.cleared);t.f()});cb?.({data:JSON.stringify(packet())});assert.equal(h.s.alerts.value.filter(a=>a.source==='realtime').length,0);assert.equal(h.sources.length,existing?1:0);assert.ok(h.sources.every(x=>x.closed&&x.onmessage===null))}
})
test('有界包去重：同点时间递增、重置和256点容量，不承诺无限历史去重',()=>{
 const guard=safety.createPacketGuard();assert.equal(guard.accept('A',100),true);assert.equal(guard.accept('A',100),false);assert.equal(guard.accept('A',99),false);assert.equal(guard.accept('A',101),true);guard.clear();assert.equal(guard.accept('A',100),true);for(let i=0;i<256;i++)guard.accept('Mock-'+i,100);assert.equal(guard.accept('A',100),true)
})

test('GIS和网格仅关闭CSS缩放过渡，保留地图与SSE业务',()=>{
 for(const name of ['GisView','GridView']){const text=fs.readFileSync(`src/views/${name}.vue`,'utf8');assert.match(text,/L\.map\(mapEl.value, \{[^\n]*zoomAnimation: false/);assert.match(text,/setView\(/);assert.match(text,/EventSource/)}
})
