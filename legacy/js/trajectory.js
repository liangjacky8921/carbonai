/* CarbonAI v5.1 — Trajectory Carbon Accounting Module */
let trajMapObj, trajData = [];

const TRAJ_DEMO = 'timestamp,lat,lon,speed,load,vehicle_type,fuel_type\n2026-06-10 08:00:00,22.72,114.05,45,15,重型柴油车,diesel\n2026-06-10 08:15:00,22.73,114.08,52,15,重型柴油车,diesel\n2026-06-10 08:30:00,22.74,114.10,38,15,重型柴油车,diesel\n2026-06-10 08:45:00,22.75,114.13,48,15,重型柴油车,diesel\n2026-06-10 09:00:00,22.76,114.15,55,15,重型柴油车,diesel\n2026-06-10 09:15:00,22.77,114.18,40,15,重型柴油车,diesel\n2026-06-10 09:30:00,22.78,114.21,50,15,重型柴油车,diesel\n2026-06-10 09:45:00,22.79,114.24,35,15,重型柴油车,diesel\n2026-06-10 10:00:00,22.80,114.27,60,15,重型柴油车,diesel\n2026-06-10 10:15:00,22.81,114.30,42,15,重型柴油车,diesel';

function initTrajMap() {
  if (trajMapObj) return;
  if (typeof L === 'undefined') { LazyLoader.leaflet().then(initTrajMap); return; }
  var isMobile = window.innerWidth < 768;
  trajMapObj = L.map('trajMap', { center: [22.75, 114.15], zoom: 12, tap: !isMobile, dragging: true, touchZoom: true, scrollWheelZoom: !isMobile, zoomControl: true });
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', { subdomains: ['1', '2', '3', '4'], attribution: '© 高德地图 | 轨迹碳核算', maxZoom: 18 }).addTo(trajMapObj);
  var uz = document.getElementById('trajUploadZone');
  if (uz) uz.addEventListener('click', function () { document.getElementById('trajFileInput').click(); });
}

function handleTrajFile(file) { if (!file) return; var r = new FileReader(); r.onload = function (e) { parseTrajCSV(e.target.result); }; r.readAsText(file); }
function loadTrajDemo() { parseTrajCSV(TRAJ_DEMO); showToast('✅ 已加载演示轨迹数据', 'success'); }

function parseTrajCSV(csv) {
  var lines = csv.trim().split('\n'); trajData = [];
  for (var i = 1; i < lines.length; i++) {
    var v = lines[i].split(',');
    trajData.push({ time: v[0], lat: parseFloat(v[1]), lon: parseFloat(v[2]), speed: parseFloat(v[3]), load: parseFloat(v[4]), vehicle: v[5], fuel: v[6] });
  }
  renderTrajOnMap();
}

function renderTrajOnMap() {
  initTrajMap();
  trajMapObj.eachLayer(function (l) { if (l instanceof L.Polyline || l instanceof L.Marker) trajMapObj.removeLayer(l); });
  var coords = trajData.map(function (d) { return [d.lat, d.lon]; });
  var pl = L.polyline(coords, { color: '#059669', weight: 4, opacity: 0.8 }).addTo(trajMapObj);
  trajMapObj.fitBounds(pl.getBounds().pad(0.1));
  L.marker(coords[0]).bindPopup('起点').addTo(trajMapObj);
  L.marker(coords[coords.length - 1]).bindPopup('终点').addTo(trajMapObj);
}

function calculateTrajCarbon() {
  if (!trajData.length) { showToast('请先加载轨迹数据', 'error'); return; }
  document.getElementById('trajResults').classList.remove('hidden');
  var totalDist = 0, totalTonKm = 0, totalCarbon = 0;
  var segments = [];
  for (var i = 1; i < trajData.length; i++) {
    var p1 = trajData[i - 1], p2 = trajData[i];
    var dLat = p2.lat - p1.lat, dLon = p2.lon - p1.lon;
    var dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111000;
    totalDist += dist;
    var speedFactor = p1.speed > 60 ? 1.15 : p1.speed < 30 ? 1.3 : 1.0;
    var loadFactor = 1 + (p1.load || 15) / 30 * 0.3;
    var ef = 0.078 * speedFactor * loadFactor;
    var tonKm = dist * (p1.load || 15) / 1000; totalTonKm += tonKm;
    var carbon = ef * tonKm; totalCarbon += carbon;
    segments.push({ dist: dist.toFixed(2), tonKm: tonKm.toFixed(2), carbon: carbon.toFixed(2) });
  }
  document.getElementById('trajSummary').innerHTML =
    '<div class="stat-box"><div class="num">' + (totalDist / 1000).toFixed(1) + '</div><div class="lbl">总里程 (km)</div></div>' +
    '<div class="stat-box"><div class="num">' + totalTonKm.toFixed(1) + '</div><div class="lbl">总吨·公里 (t·km)</div></div>' +
    '<div class="stat-box"><div class="num green">' + totalCarbon.toFixed(1) + '</div><div class="lbl">总碳排放 (kgCO₂)</div></div>';
  showToast('✅ 轨迹碳核算完成：' + totalCarbon.toFixed(1) + ' kgCO₂', 'success');
}
