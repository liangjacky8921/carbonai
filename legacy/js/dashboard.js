/* CarbonAI v5.1 — Dashboard Charts Module */
function renderDashboard() {
  if (!currentRecords.length) return;
  const byScope = {}; let total = 0;
  for (const r of currentRecords) { byScope[r.scope] = (byScope[r.scope] || 0) + r.emission; total += r.emission; }
  const s1 = byScope['Scope 1'] || 0, s2 = byScope['Scope 2'] || 0, s3 = byScope['Scope 3'] || 0;

  document.getElementById('dashStats').innerHTML =
    '<div class="stat-box"><div class="num">' + fmt(total) + '</div><div class="lbl">总排放 (tCO₂e)</div></div>' +
    '<div class="stat-box"><div class="num red">' + fmt(s1) + '</div><div class="lbl">Scope 1 直接排放</div></div>' +
    '<div class="stat-box"><div class="num orange">' + fmt(s2) + '</div><div class="lbl">Scope 2 间接排放</div></div>' +
    '<div class="stat-box"><div class="num blue">' + fmt(s3) + '</div><div class="lbl">Scope 3 价值链排放</div></div>';

  LazyLoader.echarts().then(function () {
    // Scope pie
    var sd = document.getElementById('dashScope');
    if (sd) { var c = echarts.getInstanceByDom(sd); if (c) c.dispose(); echarts.init(sd).setOption({ tooltip: { trigger: 'item' }, series: [{ type: 'pie', radius: ['50%', '75%'], data: [{ name: 'Scope1', value: s1 }, { name: 'Scope2', value: s2 }, { name: 'Scope3', value: s3 }], color: ['#EF4444', '#F59E0B', '#3B82F6'] }] }); }
    // Trend
    var td = document.getElementById('dashTrend');
    if (td) {
      var c = echarts.getInstanceByDom(td); if (c) c.dispose();
      var years = Object.keys(allRecords).sort(), sd1 = [], sd2 = [], sd3 = [];
      years.forEach(function (y) { var rs = allRecords[y]; var t1 = 0, t2 = 0, t3 = 0; rs.forEach(function (r) { if (r.scope === 'Scope 1') t1 += r.emission; else if (r.scope === 'Scope 2') t2 += r.emission; else t3 += r.emission; }); sd1.push(t1); sd2.push(t2); sd3.push(t3); });
      echarts.init(td).setOption({ tooltip: { trigger: 'axis' }, legend: { data: ['Scope1', 'Scope2', 'Scope3'], bottom: 0 }, xAxis: { data: years }, yAxis: {}, series: [{ name: 'Scope1', type: 'line', data: sd1, color: '#EF4444' }, { name: 'Scope2', type: 'line', data: sd2, color: '#F59E0B' }, { name: 'Scope3', type: 'line', data: sd3, color: '#3B82F6' }] });
    }
    // Treemap
    var tmd = document.getElementById('dashTreemap');
    if (tmd) {
      var c = echarts.getInstanceByDom(tmd); if (c) c.dispose();
      var bySrc = {};
      for (var i = 0; i < currentRecords.length; i++) { var r = currentRecords[i]; bySrc[r.source] = (bySrc[r.source] || 0) + r.emission; }
      echarts.init(tmd).setOption({ series: [{ type: 'treemap', data: Object.entries(bySrc).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8).map(function (pair) { return { name: pair[0], value: pair[1] }; }) }] });
    }
    // Price chart
    renderDashPriceChart();
    renderDashMarketPie();
  });

  // Indicators
  var ind = document.getElementById('dashIndicators');
  if (ind && currentRecords.length > 0) {
    var hints = [], maxSrc = currentRecords.reduce(function (a, b) { return a.emission > b.emission ? a : b; });
    hints.push('🔍 <strong>重点关注：</strong>' + maxSrc.source + ' 排放占比最高(' + (maxSrc.emission / total * 100).toFixed(1) + '%)');
    if (s1 / total > 0.5) hints.push('⚠️ Scope 1占比超50%，建议优先推进燃料替代/工艺优化');
    if (s2 > 0) hints.push('💡 Scope 2电力排放可通过绿电采购(PPA)或分布式光伏降低');
    if (currentRecords.filter(function (r) { return r.confidence === 'low'; }).length > 0) hints.push('📋 存在低置信度条目，建议人工复核排放因子');
    hints.push('📊 排放强度：' + fmt(total / 8000) + ' tCO₂e/万元营收(按行业均值)');
    ind.innerHTML = hints.map(function (h) { return '<div style="padding:8px;background:var(--green-bg);border-radius:6px;margin-bottom:6px;border-left:3px solid var(--green-light)">' + h + '</div>'; }).join('');
  }
}

function renderDashPriceChart() {
  LazyLoader.echarts().then(function () {
    var pd = document.getElementById('dashPriceChart');
    if (!pd) return;
    var c = echarts.getInstanceByDom(pd); if (c) c.dispose();
    echarts.init(pd).setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['CEA收盘价', '复旦碳价指数预测中值', 'CCER均价', 'EUA(¥等值)'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月(预)', '8月(预)', '9月(预)', '10月(预)', '11月(预)', '12月(预)'] },
      yAxis: { type: 'value', name: '¥/t' },
      series: [
        { name: 'CEA收盘价', type: 'line', data: [81.50, 80.20, 82.10, 81.80, 83.00, 81.23, null, null, null, null, null, null], color: '#059669', smooth: true },
        { name: '复旦碳价指数预测中值', type: 'line', data: [null, null, null, null, null, 80.44, 80.00, 80.50, 81.00, 80.50, 80.20, 80.00], color: '#F59E0B', lineStyle: { type: 'dashed', width: 2 }, smooth: true },
        { name: 'CCER均价', type: 'line', data: [88.00, 86.50, 88.67, 85.20, 83.50, 82.53, null, null, null, null, null, null], color: '#0EA5E9', smooth: true },
        { name: 'EUA(¥等值)', type: 'line', data: [690, 705, 680, 672, 665, 658, null, null, null, null, null, null], color: '#8B5CF6', smooth: true, lineStyle: { type: 'dotted', width: 1.5 } }
      ]
    });
  });
}

function renderDashMarketPie() {
  LazyLoader.echarts().then(function () {
    var mp = document.getElementById('dashMarketPie');
    if (!mp) return;
    var c = echarts.getInstanceByDom(mp); if (c) c.dispose();
    echarts.init(mp).setOption({
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      series: [{ type: 'pie', radius: ['40%', '70%'], data: [
        { name: '全国碳市场CEA(上海)', value: 81.23, itemStyle: { color: '#059669' } },
        { name: '广东碳市场GDEA(广州)', value: 37.62, itemStyle: { color: '#10B981' } },
        { name: '北京碳配额BJEA', value: 92.00, itemStyle: { color: '#0EA5E9' } },
        { name: '深圳碳配额SZEA', value: 47.05, itemStyle: { color: '#3B82F6' } },
        { name: '湖北碳配额HBEA', value: 48.20, itemStyle: { color: '#F59E0B' } },
        { name: '天津碳配额TJEA', value: 40.50, itemStyle: { color: '#8B5CF6' } },
        { name: '重庆碳配额CQEA', value: 38.00, itemStyle: { color: '#EF4444' } },
        { name: '福建碳配额FJEA', value: 32.60, itemStyle: { color: '#94a3b8' } }
      ] }]
    });
  });
}
