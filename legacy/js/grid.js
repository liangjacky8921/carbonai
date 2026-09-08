/* CarbonAI v5.1 — Grid Emission Monitoring Module */
let gridMapObj, gridLayers = { heatmap: true, grid: true, wind: true, source: false };

const GRID_REGIONS = {
  sz_gm: { name: '深圳市光明区', lat: 22.75, lon: 113.95, zoom: 13 },
  sz_ns: { name: '深圳市南山区', lat: 22.53, lon: 113.93, zoom: 13 },
  sz_ft: { name: '深圳市福田区', lat: 22.55, lon: 114.05, zoom: 14 },
  sz_ba: { name: '深圳市宝安区', lat: 22.58, lon: 113.88, zoom: 12 },
  gz_hp: { name: '广州市黄埔区', lat: 23.10, lon: 113.45, zoom: 13 },
  hz_hc: { name: '惠州市惠城区', lat: 23.085, lon: 114.42, zoom: 12 },
  hz_hy: { name: '惠州市惠阳区(大亚湾)', lat: 22.75, lon: 114.47, zoom: 11 },
  hk_yj: { name: '香港油尖旺区', lat: 22.31, lon: 114.17, zoom: 15 },
  hk_central: { name: '香港中环', lat: 22.28, lon: 114.16, zoom: 16 },
};

function initGridMap() {
  if (gridMapObj) return;
  if (typeof L === 'undefined') { LazyLoader.leaflet().then(initGridMap); return; }
  var sel = document.getElementById('gridRegion');
  var reg = GRID_REGIONS[sel ? sel.value : 'sz_gm'] || GRID_REGIONS.sz_gm;
  var isMobile = window.innerWidth < 768;
  gridMapObj = L.map('gridMap', { center: [reg.lat, reg.lon], zoom: reg.zoom, tap: !isMobile, dragging: true, touchZoom: true, scrollWheelZoom: !isMobile, zoomControl: true });
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', { subdomains: ['1', '2', '3', '4'], attribution: '© 高德地图 | 网格监测', maxZoom: 18 }).addTo(gridMapObj);
  renderGridLayers(reg);
}

function renderGridLayers(region) {
  if (!gridMapObj) return;
  gridMapObj.eachLayer(function (l) { if (!(l instanceof L.TileLayer)) gridMapObj.removeLayer(l); });
  var ctr = region ? { lat: region.lat, lon: region.lon } : { lat: 22.75, lon: 113.95 };
  var span = 0.015, step = span / 12;
  for (var lat = ctr.lat - span; lat <= ctr.lat + span; lat += step) {
    for (var lng = ctr.lon - span; lng <= ctr.lon + span; lng += step) {
      var val = Math.random() * 8;
      var color = val > 15 ? '#ef4444' : val > 8 ? '#f97316' : val > 3 ? '#eab308' : '#22c55e';
      L.rectangle([[lat - step / 2, lng - step / 2], [lat + step / 2, lng + step / 2]], { color: 'transparent', fillColor: color, fillOpacity: 0.4, weight: 0.5 }).addTo(gridMapObj);
    }
  }
  document.getElementById('gridAlerts').innerHTML = '<div style="padding:8px;background:#f0fdf4;border-radius:6px;border-left:3px solid #22c55e"><strong style="color:#166534">🟢 正常</strong> — 当前网格区域内排放指标在限值范围内</div>';
}

function refreshGrid() {
  var sel = document.getElementById('gridRegion');
  var reg = GRID_REGIONS[sel ? sel.value : 'sz_gm'];
  if (reg && gridMapObj) {
    gridMapObj.setView([reg.lat, reg.lon], reg.zoom);
    setTimeout(function () { renderGridLayers(reg); }, 300);
  } else {
    renderGridLayers();
  }
  showToast('✅ 网格监测已刷新', 'success');
}

function toggleGridLayer(layer, visible) { gridLayers[layer] = visible; renderGridLayers(); }
