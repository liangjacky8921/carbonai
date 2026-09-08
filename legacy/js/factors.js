/* CarbonAI v5.1 — Emission Factor Library Module */
const FACTOR_DB = [
  { id: 1, name: '电网排放因子-南方', value: 0.5703, unit: 'kgCO₂/kWh', source: '中国电网2023', year: 2023, region: '南方电网', dqr: 5, geo: '广东、广西、云南、贵州、海南', methodology: '区域电网平均排放因子法', scope: 'Scope 2', category: '电力' },
  { id: 2, name: '电网排放因子-华东', value: 0.5890, unit: 'kgCO₂/kWh', source: '中国电网2023', year: 2023, region: '华东电网', dqr: 5, geo: '上海、江苏、浙江、安徽、福建' },
  { id: 3, name: '电网排放因子-华北', value: 0.7410, unit: 'kgCO₂/kWh', source: '中国电网2023', year: 2023, region: '华北电网', dqr: 5, geo: '北京、天津、河北、山西、山东、蒙西' },
  { id: 4, name: '电网排放因子-华中', value: 0.5250, unit: 'kgCO₂/kWh', source: '中国电网2023', year: 2023, region: '华中电网', dqr: 4, geo: '河南、湖北、湖南、江西' },
  { id: 5, name: '电网排放因子-西北', value: 0.6120, unit: 'kgCO₂/kWh', source: '中国电网2023', year: 2023, region: '西北电网', dqr: 4, geo: '陕西、甘肃、青海、宁夏、新疆' },
  { id: 6, name: '电网排放因子-东北', value: 0.7760, unit: 'kgCO₂/kWh', source: '中国电网2023', year: 2023, region: '东北电网', dqr: 4, geo: '辽宁、吉林、黑龙江、蒙东' },
  { id: 7, name: '烟煤排放因子', value: 1.9003, unit: 'tCO₂/t', source: '国家发改委气候司', year: 2015, region: '全国', dqr: 4, geo: '全国通用' },
  { id: 8, name: '无烟煤排放因子', value: 2.5300, unit: 'tCO₂/t', source: '国家发改委气候司', year: 2015, region: '全国', dqr: 4 },
  { id: 9, name: '柴油排放因子', value: 3.1605, unit: 'tCO₂/t', source: 'IPCC 2006', year: 2006, region: '全球', dqr: 5 },
  { id: 10, name: '汽油排放因子', value: 2.9251, unit: 'tCO₂/t', source: 'IPCC 2006', year: 2006, region: '全球', dqr: 5 },
  { id: 11, name: '天然气排放因子', value: 21.840, unit: 'tCO₂/万m³', source: 'IPCC 2006', year: 2006, region: '全球', dqr: 5 },
  { id: 12, name: '货运-重型柴油车', value: 0.078, unit: 'kgCO₂/t·km', source: 'Ecoinvent 3.9', year: 2022, region: '中国/全球', dqr: 4 },
  { id: 13, name: '货运-轻型货车', value: 0.156, unit: 'kgCO₂/t·km', source: 'Ecoinvent 3.9', year: 2022, region: '中国/全球', dqr: 4 },
  { id: 14, name: '航空-短途(<1500km)', value: 0.115, unit: 'kgCO₂/人·km', source: 'ICAO', year: 2021, region: '全球', dqr: 4 },
  { id: 15, name: '航空-长途(>1500km)', value: 0.092, unit: 'kgCO₂/人·km', source: 'ICAO', year: 2021, region: '全球', dqr: 4 },
  { id: 16, name: '热力(蒸汽)', value: 0.110, unit: 'tCO₂/GJ', source: 'GB/T 32151', year: 2015, region: '全国', dqr: 3 },
  { id: 17, name: '水泥-熟料生产', value: 0.525, unit: 'tCO₂/t熟料', source: 'IPCC 2019 Refinement', year: 2019, region: '全球', dqr: 5 },
  { id: 18, name: '钢铁-高炉转炉', value: 1.680, unit: 'tCO₂/t粗钢', source: 'Ecoinvent 3.9', year: 2022, region: '中国/全球', dqr: 4 },
  { id: 19, name: '冷链货运-冷藏车', value: 0.132, unit: 'kgCO₂/t·km', source: 'Ecoinvent 3.9', year: 2022, region: '中国/全球', dqr: 3 },
  { id: 20, name: '电力-全国平均', value: 0.5703, unit: 'kgCO₂/kWh', source: '生态环境部2024', year: 2024, region: '全国', dqr: 4, geo: '全国（建议优先使用区域电网因子）' },
];

function filterFactors() {
  var search = document.getElementById('factorSearch').value.toLowerCase();
  var src = document.getElementById('factorSource').value;
  var reg = document.getElementById('factorRegion').value;
  var filtered = FACTOR_DB.filter(function (f) {
    if (search && !f.name.toLowerCase().includes(search) && !f.category.toLowerCase().includes(search) && !f.geo.toLowerCase().includes(search)) return false;
    if (src !== 'all' && !f.source.toLowerCase().includes(src.replace(/_/g, ' '))) return false;
    if (reg !== 'all') { var rm = { south: '南方', north: '华北', east: '华东', central: '华中', northwest: '西北', northeast: '东北' }; if (!f.region.includes(rm[reg] || '')) return false; }
    return true;
  });
  renderFactorTable(filtered);
}

function renderFactorTable(factors) {
  var html = '<table><thead><tr><th>排放因子名称</th><th>数值</th><th>单位</th><th>来源</th><th>年份</th><th>适用地区</th><th>DQR</th></tr></thead><tbody>';
  factors.forEach(function (f) {
    var dqrs = '★'.repeat(f.dqr) + '☆'.repeat(5 - f.dqr);
    html += '<tr><td><strong>' + f.name + '</strong></td><td style="font-weight:600;color:var(--green)">' + f.value + '</td><td>' + f.unit + '</td><td><span style="background:var(--green-bg);padding:2px 6px;border-radius:4px;font-size:10px;color:var(--green)">' + f.source + '</span></td><td>' + f.year + '</td><td style="font-size:10px">' + f.geo + '</td><td style="color:#eab308">' + dqrs + '</td></tr>';
  });
  html += '</tbody></table>';
  if (factors.length === 0) html = '<p style="text-align:center;padding:40px;color:var(--text2)">未找到匹配的排放因子</p>';
  document.getElementById('factorTable').innerHTML = html;
  document.getElementById('factorStats').innerHTML =
    '<div class="stat-box"><div class="num">' + FACTOR_DB.length + '</div><div class="lbl">收录因子总数</div></div>' +
    '<div class="stat-box"><div class="num blue">' + new Set(FACTOR_DB.map(function (f) { return f.source; })).size + '</div><div class="lbl">来源数据库</div></div>' +
    '<div class="stat-box"><div class="num green">' + FACTOR_DB.filter(function (f) { return f.dqr >= 4; }).length + '</div><div class="lbl">高DQR因子 (≥4★)</div></div>' +
    '<div class="stat-box"><div class="num orange">' + new Set(FACTOR_DB.map(function (f) { return f.region; })).size + '</div><div class="lbl">覆盖区域</div></div>';
}

function exportFactorsCSV() {
  var csv = '排放因子名称,数值,单位,来源,发布年份,适用地区,DQR\n';
  FACTOR_DB.forEach(function (f) { csv += '"' + f.name + '",' + f.value + ',"' + f.unit + '","' + f.source + '",' + f.year + ',"' + f.region + '",' + f.dqr + '\n'; });
  var b = new Blob([csv], { type: 'text/csv;charset=utf-8' }), u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = (lang === 'en' ? 'Emission_Factor_DB_' : '排放因子库_') + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); URL.revokeObjectURL(u);
  showToast('✅ 因子表已导出（含溯源）', 'success');
}

function compareFactors() {
  document.getElementById('factorComparePanel').classList.remove('hidden');
  var gf = FACTOR_DB.filter(function (f) { return f.region.includes('电网'); });
  var base = gf.find(function (f) { return f.region === '南方电网'; });
  var html = '<table><thead><tr><th>区域电网</th><th>排放因子 (kgCO₂/kWh)</th><th>差异(vs南方)</th><th>DQR</th></tr></thead><tbody>';
  gf.forEach(function (f) {
    var diff = base ? ((f.value - base.value) / base.value * 100).toFixed(1) : '-';
    var color = diff > 0 ? '#dc2626' : '#059669';
    html += '<tr><td><strong>' + f.region + '</strong></td><td style="font-weight:600">' + f.value + '</td><td style="color:' + color + ';font-weight:600">' + (diff > 0 ? '+' + diff : diff) + '%</td><td>' + '★'.repeat(f.dqr) + '</td></tr>';
  });
  html += '</tbody></table><p style="font-size:11px;color:var(--text2);margin-top:8px">⚠️ 核查机构DQR空间化要求：不同区域电网排放因子差异显著（南方0.5703 vs 东北0.7760，差异+36.1%）。须使用企业所在区域准确因子。</p>';
  document.getElementById('factorCompareContent').innerHTML = html;
  document.getElementById('factorComparePanel').scrollIntoView({ behavior: 'smooth' });
}

function renderFactorCharts() {
  LazyLoader.chartjs().then(function () {
    var gf = FACTOR_DB.filter(function (f) { return f.region.includes('电网'); });
    var ctx1 = document.getElementById('gridFactorChart');
    if (ctx1) new Chart(ctx1.getContext('2d'), { type: 'bar', data: { labels: gf.map(function (f) { return f.region; }), datasets: [{ label: 'kgCO₂/kWh', data: gf.map(function (f) { return f.value; }), backgroundColor: ['#059669', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444'] }] } });
    var bySrc = {}; FACTOR_DB.forEach(function (f) { bySrc[f.source] = (bySrc[f.source] || 0) + 1; });
    var ctx2 = document.getElementById('factorSourceChart');
    if (ctx2) new Chart(ctx2.getContext('2d'), { type: 'doughnut', data: { labels: Object.keys(bySrc), datasets: [{ data: Object.values(bySrc), backgroundColor: ['#059669', '#10B981', '#0EA5E9', '#F59E0B', '#8B5CF6', '#EF4444'] }] } });
  });
}
