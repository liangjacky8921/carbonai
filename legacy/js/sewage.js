/* CarbonAI v5.2 — 污水厂运行维护数据模块
 * 数据源: js/data-sewage.js (由 build_data.py 生成)
 * 功能: 处理水量趋势 · 水质进/出去除率 · 污泥与能耗
 */
let _sewage = null, _swCharts = {};

function _sewageData() {
  if (_sewage) return _sewage;
  _sewage = (typeof SEWAGE_DATA !== 'undefined') ? SEWAGE_DATA : null;
  return _sewage;
}

// ECharts 坐标轴/网格颜色（canvas 无法解析 CSS 变量，需运行时读取主题）
function _swAxisColor() {
  return document.body.classList.contains('dark') ? '#94a3b8' : '#64748b';
}
function _swGridColor() {
  return document.body.classList.contains('dark') ? '#334155' : '#e2e8f0';
}

function initSewagePanel() {
  var d = _sewageData(); if (!d) return;

  // —— 概览卡 ——
  var statEl = document.getElementById('sewageStats');
  if (statEl) {
    var months = d.months || [];
    var totalWater = months.reduce(function (s, m) { return s + (m.water || 0); }, 0);
    var avgCodRem = _avg(months.map(function (m) { return m.cod_removal; }));
    var avgNhRem = _avg(months.map(function (m) { return m.nh_removal; }));
    var avgTpRem = _avg(months.map(function (m) { return m.tp_removal; }));
    statEl.innerHTML =
      '<div class="stat-box"><div class="num">' + (months.length) + '</div><div class="lbl">监测月份</div></div>' +
      '<div class="stat-box"><div class="num">' + fmtInt(totalWater) + '</div><div class="lbl">累计处理水量 (吨)</div></div>' +
      '<div class="stat-box"><div class="num" style="color:#059669">' + (avgCodRem != null ? avgCodRem.toFixed(1) + '%' : '—') + '</div><div class="lbl">COD 平均去除率</div></div>' +
      '<div class="stat-box"><div class="num" style="color:#0EA5E9">' + (avgNhRem != null ? avgNhRem.toFixed(1) + '%' : '—') + '</div><div class="lbl">氨氮平均去除率</div></div>';
  }

  renderSewageWater();
  renderSewageQuality();
  renderSewageSludge();
}

function _avg(arr) {
  var v = arr.filter(function (x) { return x != null; });
  return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
}

function _ymLabels(months) { return months.map(function (m) { return m.ym; }); }

// ============ 处理水量 ============
function renderSewageWater() {
  var d = _sewageData(); if (!d) return;
  var el = document.getElementById('sewageWaterChart'); if (!el) return;
  var months = d.months;
  LazyLoader.echarts().then(function () {
    if (_swCharts.water) { _swCharts.water.dispose(); }
    _swCharts.water = echarts.init(el);
    _swCharts.water.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 20, top: 30, bottom: 60 },
      xAxis: { type: 'category', data: _ymLabels(months), axisLabel: { color: _swAxisColor(), fontSize: 9, rotate: 45 }, axisLine: { lineStyle: { color: _swGridColor() } } },
      yAxis: { type: 'value', name: '吨', axisLabel: { color: _swAxisColor(), fontSize: 10 }, splitLine: { lineStyle: { color: _swGridColor() } } },
      series: [{ name: '月处理水量', type: 'bar', data: months.map(function (m) { return m.water; }),
        itemStyle: { color: '#10B981', borderRadius: [3, 3, 0, 0] }, barMaxWidth: 18 }]
    });
  });
}

// ============ 水质进/出 + 去除率 ============
function renderSewageQuality() {
  var d = _sewageData(); if (!d) return;
  var months = d.months;
  var labels = _ymLabels(months);

  function seriesFor(key) { return months.map(function (m) { return m[key]; }); }

  // 进/出水对比折线
  var c1 = document.getElementById('sewageCodChart');
  if (c1) LazyLoader.echarts().then(function () {
    if (_swCharts.cod) _swCharts.cod.dispose();
    _swCharts.cod = echarts.init(c1);
    _swCharts.cod.setOption({
      backgroundColor: 'transparent', tooltip: { trigger: 'axis' },
      legend: { data: ['进水 COD', '出水 COD'], top: 0, textStyle: { color: _swAxisColor() } },
      grid: { left: 50, right: 20, top: 40, bottom: 60 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: _swAxisColor(), fontSize: 9, rotate: 45 }, axisLine: { lineStyle: { color: _swGridColor() } } },
      yAxis: { type: 'value', name: 'mg/L', axisLabel: { color: _swAxisColor(), fontSize: 10 }, splitLine: { lineStyle: { color: _swGridColor() } } },
      series: [
        { name: '进水 COD', type: 'line', smooth: true, symbol: 'none', data: seriesFor('cod_in'), lineStyle: { width: 2, color: '#F59E0B' } },
        { name: '出水 COD', type: 'line', smooth: true, symbol: 'none', data: seriesFor('cod_out'), lineStyle: { width: 2, color: '#10B981' } }
      ]
    });
  });

  // 去除率柱状图
  var c2 = document.getElementById('sewageRemovalChart');
  if (c2) LazyLoader.echarts().then(function () {
    if (_swCharts.removal) _swCharts.removal.dispose();
    _swCharts.removal = echarts.init(c2);
    _swCharts.removal.setOption({
      backgroundColor: 'transparent', tooltip: { trigger: 'axis' },
      legend: { data: ['COD 去除率', '氨氮去除率', '总磷去除率'], top: 0, textStyle: { color: _swAxisColor(), fontSize: 9 } },
      grid: { left: 50, right: 20, top: 40, bottom: 60 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: _swAxisColor(), fontSize: 9, rotate: 45 }, axisLine: { lineStyle: { color: _swGridColor() } } },
      yAxis: { type: 'value', name: '%', max: 100, axisLabel: { color: _swAxisColor(), fontSize: 10 }, splitLine: { lineStyle: { color: _swGridColor() } } },
      series: [
        { name: 'COD 去除率', type: 'line', smooth: true, symbol: 'none', data: seriesFor('cod_removal'), lineStyle: { width: 2, color: '#059669' }, areaStyle: { opacity: 0.08 } },
        { name: '氨氮去除率', type: 'line', smooth: true, symbol: 'none', data: seriesFor('nh_removal'), lineStyle: { width: 2, color: '#0EA5E9' } },
        { name: '总磷去除率', type: 'line', smooth: true, symbol: 'none', data: seriesFor('tp_removal'), lineStyle: { width: 2, color: '#F59E0B' } }
      ]
    });
  });
}

// ============ 污泥与能耗 ============
function renderSewageSludge() {
  var d = _sewageData(); if (!d) return;
  var months = d.months;
  var el = document.getElementById('sewageSludgeChart'); if (!el) return;
  LazyLoader.echarts().then(function () {
    if (_swCharts.sludge) _swCharts.sludge.dispose();
    _swCharts.sludge = echarts.init(el);
    _swCharts.sludge.setOption({
      backgroundColor: 'transparent', tooltip: { trigger: 'axis' },
      legend: { data: ['污泥产生量', '用电量'], top: 0, textStyle: { color: _swAxisColor() } },
      grid: { left: 50, right: 50, top: 40, bottom: 60 },
      xAxis: { type: 'category', data: _ymLabels(months), axisLabel: { color: _swAxisColor(), fontSize: 9, rotate: 45 }, axisLine: { lineStyle: { color: _swGridColor() } } },
      yAxis: [
        { type: 'value', name: '污泥 (吨)', axisLabel: { color: _swAxisColor(), fontSize: 10 }, splitLine: { lineStyle: { color: _swGridColor() } } },
        { type: 'value', name: '用电 (kWh)', axisLabel: { color: _swAxisColor(), fontSize: 10 }, splitLine: { show: false } }
      ],
      series: [
        { name: '污泥产生量', type: 'bar', data: months.map(function (m) { return m.sludge; }), itemStyle: { color: '#94a3b8', borderRadius: [3, 3, 0, 0] }, barMaxWidth: 16 },
        { name: '用电量', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none', data: months.map(function (m) { return m.elec; }), lineStyle: { width: 2, color: '#8B5CF6' } }
      ]
    });
  });
}
