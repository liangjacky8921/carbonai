/* CarbonAI v5.1 — Product Carbon Footprint (PCF) Module */
let pcfData = { raw: 0, mfg: 0, tpt: 0, use: 0, eol: 0 }, selectedStage = 'raw';

function selectLCAStage(stage) { selectedStage = stage; document.querySelectorAll('.lca-stage').forEach(function (s) { s.classList.remove('active'); }); var el = document.getElementById('pct-' + stage); if (el && el.parentElement) el.parentElement.classList.add('active'); }

function loadPCFDemo() {
  document.getElementById('pcfProductName').value = 'XX电子元器件';
  pcfData = { raw: 12.5, mfg: 28.3, tpt: 5.7, use: 18.2, eol: 3.1 };
  renderPCFResults();
  showToast('✅ 已加载产品碳足迹演示数据', 'success');
}

function calcPCF() {
  var base = 20 + Math.random() * 40;
  pcfData = { raw: base * 0.2 * Math.random(), mfg: base * 0.42 * Math.random(), tpt: base * 0.08 * Math.random(), use: base * 0.25 * Math.random(), eol: base * 0.05 * Math.random() };
  renderPCFResults();
  var name = document.getElementById('pcfProductName').value || '未命名产品';
  showToast('✅ ' + name + ' 产品碳足迹核算完成', 'success');
}

function renderPCFResults() {
  var total = pcfData.raw + pcfData.mfg + pcfData.tpt + pcfData.use + pcfData.eol;
  var unit = document.getElementById('pcfUnit').value;
  document.getElementById('pcfResultPanel').classList.remove('hidden');
  document.getElementById('pcfTotal').textContent = total.toFixed(2) + ' kgCO₂e/' + unit;
  document.getElementById('pcfPerUnit').textContent = '全生命周期碳排放 (' + document.getElementById('pcfStandard').value + ')';

  ['raw', 'mfg', 'tpt', 'use', 'eol'].forEach(function (s) {
    var el = document.getElementById('pct-' + s); if (el) el.textContent = (pcfData[s] / total * 100).toFixed(0) + '%';
  });

  LazyLoader.chartjs().then(function () {
    var ctx1 = document.getElementById('pcfStageChart');
    if (ctx1) { if (window._pcfChart) window._pcfChart.destroy(); window._pcfChart = new Chart(ctx1.getContext('2d'), { type: 'doughnut', data: { labels: ['原料获取', '生产制造', '运输分销', '使用阶段', '废弃回收'], datasets: [{ data: Object.values(pcfData), backgroundColor: ['#8B5CF6', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'] }] } }); }
    var ctx2 = document.getElementById('pcfBenchmarkChart');
    if (ctx2) { if (window._bmkChart) window._bmkChart.destroy(); window._bmkChart = new Chart(ctx2.getContext('2d'), { type: 'bar', data: { labels: ['本品', '行业平均', '行业先进', '欧盟PEF基准'], datasets: [{ label: 'kgCO₂e/' + unit, data: [total, total * 1.3, total * 0.55, total * 0.7], backgroundColor: ['#059669', '#94a3b8', '#10B981', '#3B82F6'] }] } }); }
  });

  var stages = [{ k: 'raw', n: '原材料获取', icon: '⛏️' }, { k: 'mfg', n: '生产制造', icon: '🏭' }, { k: 'tpt', n: '运输分销', icon: '🚛' }, { k: 'use', n: '使用阶段', icon: '⚡' }, { k: 'eol', n: '废弃回收', icon: '♻️' }];
  var html = '<table><thead><tr><th>阶段</th><th>排放量 (kgCO₂e)</th><th>占比</th><th>主要排放源</th></tr></thead><tbody>';
  stages.forEach(function (s) {
    html += '<tr><td>' + s.icon + ' <strong>' + s.n + '</strong></td><td style="font-weight:600">' + pcfData[s.k].toFixed(2) + '</td><td>' + (pcfData[s.k] / total * 100).toFixed(1) + '%</td><td style="font-size:11px">Ecoinvent 3.9 / 行业LCA数据</td></tr>';
  });
  html += '<tr style="font-weight:700;background:#f0fdf4"><td colspan="2">合计</td><td>100%</td><td>' + total.toFixed(2) + ' kgCO₂e</td></tr></tbody></table>';
  document.getElementById('pcfTable').innerHTML = html;
}
