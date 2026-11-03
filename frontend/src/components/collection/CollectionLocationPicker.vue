<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
const props = defineProps<{ longitude: number | null; latitude: number | null }>()
const emit = defineEmits<{ pick: [longitude:number, latitude:number] }>()
const host = ref<HTMLElement | null>(null), tileError = ref(false)
let map: L.Map | null = null, marker: L.CircleMarker | null = null, observer: ResizeObserver | null = null
function update() {
  const {longitude:lon,latitude:lat}=props
  if (!map || lon === null || lat === null || !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon)>180 || Math.abs(lat)>90) { marker?.remove(); marker=null; return }
  if (!marker) marker=L.circleMarker([lat,lon],{radius:7,color:'#b7eed0',fillColor:'#139c69',fillOpacity:.9}).addTo(map)
  else marker.setLatLng([lat,lon])
  map.setView([lat,lon],map.getZoom(),{animate:false})
}
onMounted(()=>{
  if (!host.value) return
  map=L.map(host.value,{center:[23.1,113.3],zoom:9,zoomAnimation:false})
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',{subdomains:['1','2','3','4'],maxZoom:18,attribution:'© 高德地图'}).on('tileerror',()=>tileError.value=true).on('tileload',()=>tileError.value=false).addTo(map)
  map.on('click',(event:L.LeafletMouseEvent)=>emit('pick',+event.latlng.lng.toFixed(6),+event.latlng.lat.toFixed(6)))
  observer=new ResizeObserver(()=>map?.invalidateSize()); observer.observe(host.value);update()
})
watch(()=>[props.longitude,props.latitude],update)
onBeforeUnmount(()=>{observer?.disconnect();map?.off();map?.remove();map=null;marker=null})
</script>
<template><div><div ref="host" class="location-map" aria-label="采集位置选点地图" /><p v-if="tileError" role="status">底图加载失败；仍可手动输入位置。</p><p class="location-note">点击地图选点。经纬度按高德底图坐标体系（GCJ-02）记录；不自动转换GPS坐标，不代表设备定位证明。</p></div></template>
<style scoped>.location-map{height:330px;border:1px solid var(--c-border);border-radius:10px;overflow:hidden}.location-note,p{font-size:12px;line-height:1.7;color:var(--c-text-3)}</style>
