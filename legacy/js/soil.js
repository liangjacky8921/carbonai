/* CarbonAI v5.2 — 土壤高光谱 SOC 反演模块
 * 数据源: js/data-soil_spectral.js (由 build_data.py 生成)
 * 功能: 光谱曲线(分组均值/单样本) · PCA聚类散点 · 有机质敏感光谱指数 · SOC标签导入+ML框架
 */
let _soil = null, _soilGroupChart = null, _soilPcaChart = null, _soilSpectra = [];

function _soilData() {
  if (_soil) return _soil;
  _soil = (typeof SOIL_SPECTRAL_DATA !== 'undefined') ? SOIL_SPECTRAL_DATA : null;
  return _soil;
}

// 分组配色（与组名绑定）
const SOIL_GROUP_COLORS = { Gonghe1: '#059669', Gonghe2: '#0EA5E9', Gonghe3: '#F59E0B', Gonghe4: '#EF4444' };
function _soilColor(g) { return SOIL_GROUP_COLORS[g] || '#94a3b8'; }

// ECharts 坐标轴文字颜色（canvas 无法解析 CSS 变量，需运行时读取主题）
function _soilAxisColor() {
  return document.body.classList.contains('dark') ? '#94a3b8' : '#64748b';
}
function _soilGridColor() {
  return document.body.classList.contains('dark') ? '#334155' : '#e2e8f0';
}

function initSoilPanel() {
  var d = _soilData();
  if (!d) return;

  // —— 概览卡 ——
  var meta = d.meta || {};
  var statEl = document.getElementById('soilStats');
  if (statEl) {
    statEl.innerHTML =
      '<div class="stat-box"><div class="num">' + d.n_samples + '</div><div class="lbl">样本数</div></div>' +
      '<div class="stat-box"><div class="num">' + d.n_bands + '</div><div class="lbl">光谱波段</div></div>' +
      '<div class="stat-box"><div class="num">' + (d.groups || []).length + '</div><div class="lbl">分组数</div></div>' +
      '<div class="stat-box"><div class="num" style="font-size:18px">' + d.wavelengths[0] + '–' + d.wavelengths[d.wavelengths.length - 1] + '</div><div class="lbl">光谱范围 (nm)</div></div>';
  }

  // —— 分组下拉 ——
  var sel = document.getElementById('soilGroupSel');
  if (sel) {
    var opts = '<option value="all">全部分组</option>';
    (d.groups || []).forEach(function (g) { opts += '<option value="' + g + '">' + g + '</option>'; });
    sel.innerHTML = opts;
  }

  renderSoilSpectra('all');
  renderSoilPCA();
  renderSoilIndices();
}

// ============ 光谱曲线 ============
function renderSoilSpectra(groupFilter) {
  var d = _soilData(); if (!d) return;
  var el = document.getElementById('soilSpectraChart'); if (!el) return;
  LazyLoader.echarts().then(function () {
    if (_soilGroupChart) { _soilGroupChart.dispose(); _soilGroupChart = null; }

    // 计算每组均值光谱
    var byGroup = {};
    d.samples.forEach(function (s) {
      if (groupFilter !== 'all' && s.group !== groupFilter) return;
      if (!byGroup[s.group]) byGroup[s.group] = { sum: new Array(d.n_bands).fill(0), cnt: 0 };
      var g = byGroup[s.group]; g.cnt++;
      for (var i = 0; i < d.n_bands; i++) g.sum[i] += (s.spectrum[i] || 0);
    });

    var series = [];
    Object.keys(byGroup).sort().forEach(function (g) {
      var b = byGroup[g];
      var avg = b.sum.map(function (v) { return +(v / b.cnt).toFixed(6); });
      series.push({
        name: g + ' (n=' + b.cnt + ')',
        type: 'line', smooth: true, symbol: 'none',
        data: avg, color: _soilColor(g),
        lineStyle: { width: 2 },
        emphasis: { focus: 'series' }
      });
    });

    _soilGroupChart = echarts.init(el);
    _soilGroupChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: series.map(function (s) { return s.name; }), top: 0, textStyle: { color: _soilAxisColor() } },
      grid: { left: 50, right: 20, top: 40, bottom: 40 },
      xAxis: { type: 'category', name: '波长 (nm)', nameLocation: 'middle', nameGap: 28,
        data: d.wavelengths.map(function (w) { return w % 50 === 0 ? w : ''; }),
        axisLabel: { color: _soilAxisColor(), fontSize: 10 }, axisLine: { lineStyle: { color: _soilGridColor() } } },
      yAxis: { type: 'value', name: '反射率', axisLabel: { color: _soilAxisColor(), fontSize: 10 }, splitLine: { lineStyle: { color: _soilGridColor() } } },
      series: series
    });
    _soilGroupChart.on('legendselectchanged', function () { /* noop */ });
  });
}

// ============ PCA 聚类散点 ============
function renderSoilPCA() {
  var d = _soilData(); if (!d) return;
  var el = document.getElementById('soilPcaChart'); if (!el) return;
  var pca = d.pca || {};
  var coords = pca.coordinates || {};
  if (!Object.keys(coords).length) {
    el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text3)">PCA 数据不可用</div>';
    return;
  }
  LazyLoader.echarts().then(function () {
    if (_soilPcaChart) { _soilPcaChart.dispose(); _soilPcaChart = null; }
    // 按组分组数据点
    var byGroup = {};
    d.samples.forEach(function (s, i) {
      if (!coords[i]) return;
      var g = s.group || '未知';
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push({ value: coords[i], name: s.name.split('/').pop() });
    });
    var series = [];
    Object.keys(byGroup).sort().forEach(function (g) {
      series.push({ name: g, type: 'scatter', data: byGroup[g],
        symbolSize: 11, itemStyle: { color: _soilColor(g) } });
    });
    var vr = pca.variance_ratio || [0, 0];
    _soilPcaChart = echarts.init(el);
    _soilPcaChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: function (p) { return p.data.name + '<br>PC1: ' + p.value[0] + '<br>PC2: ' + p.value[1]; } },
      legend: { top: 0, textStyle: { color: _soilAxisColor() } },
      grid: { left: 50, right: 20, top: 40, bottom: 40 },
      xAxis: { type: 'value', name: 'PC1 (' + vr[0] + '%)', nameLocation: 'middle', nameGap: 28, axisLabel: { color: _soilAxisColor(), fontSize: 10 }, splitLine: { lineStyle: { color: _soilGridColor() } } },
      yAxis: { type: 'value', name: 'PC2 (' + vr[1] + '%)', axisLabel: { color: _soilAxisColor(), fontSize: 10 }, splitLine: { lineStyle: { color: _soilGridColor() } } },
      series: series
    });
  });
}

// ============ 有机质敏感光谱指数 ============
function renderSoilIndices() {
  var d = _soilData(); if (!d) return;
  var el = document.getElementById('soilIndicesTable'); if (!el) return;
  var rows = '';
  d.samples.forEach(function (s, i) {
    var idx = s.indices || {};
    rows += '<tr><td>' + (i + 1) + '</td><td>' + s.group + '</td><td>' + s.name.split('/').pop() + '</td>' +
      '<td>' + (idx.NDVI != null ? idx.NDVI.toFixed(4) : '—') + '</td>' +
      '<td>' + (idx.ND450_750 != null ? idx.ND450_750.toFixed(4) : '—') + '</td>' +
      '<td>' + (idx.R750_450 != null ? idx.R750_450.toFixed(4) : '—') + '</td></tr>';
  });
  el.innerHTML = '<table style="font-size:11px;width:100%"><thead><tr><th>#</th><th>分组</th><th>样本</th><th>NDVI</th><th>ND450/750</th><th>R750/R450</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

// ============ SOC 标签导入 + ML 框架 ============
function _soilSocLabels() {
  try { return JSON.parse(localStorage.getItem('carbonai_soc_labels') || '{}'); } catch (e) { return {}; }
}
function _saveSoilSocLabels(m) { localStorage.setItem('carbonai_soc_labels', JSON.stringify(m)); }

function handleSocLabelFile(file) {
  // 期待 CSV/Excel: 列 "样本" 或 "sample" + "SOC" 或 "soc"
  var reader = new FileReader();
  reader.onload = function (e) {
    var content = e.target.result;
    // 简单 CSV 解析
    var lines = content.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) { showToast('文件为空', 'error'); return; }
    var header = lines[0].split(/[,\t]/).map(function (h) { return h.trim(); });
    var nameIdx = -1, socIdx = -1;
    header.forEach(function (h, i) {
      if (/样本|sample|编号|name/i.test(h) && nameIdx < 0) nameIdx = i;
      if (/soc|有机碳|有机质|som/i.test(h) && socIdx < 0) socIdx = i;
    });
    if (nameIdx < 0 || socIdx < 0) {
      showToast('未识别到「样本」和「SOC」列，请检查表头', 'error'); return;
    }
    var labels = _soilSocLabels(), cnt = 0;
    for (var i = 1; i < lines.length; i++) {
      var cols = lines[i].split(/[,\t]/);
      var nm = (cols[nameIdx] || '').trim();
      var soc = parseFloat(cols[socIdx]);
      if (!nm || isNaN(soc)) continue;
      labels[nm] = soc; cnt++;
    }
    _saveSoilSocLabels(labels);
    renderSocLabels();
    showToast('已导入 ' + cnt + ' 条 SOC 标签', 'success');
  };
  reader.readAsText(file);
}

function renderSocLabels() {
  var el = document.getElementById('socLabelList'); if (!el) return;
  var labels = _soilSocLabels();
  var keys = Object.keys(labels);
  if (!keys.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:11px">尚未导入 SOC 标签。CSV 格式: <code>样本,SOC</code></div>';
    return;
  }
  var d = _soilData();
  // 与光谱样本按短编号匹配
  var matched = 0, rows = '';
  keys.forEach(function (k) {
    var hit = d && d.samples.find(function (s) { return s.name.split('/').pop() === k; });
    var ok = !!hit;
    if (ok) matched++;
    rows += '<tr><td>' + k + '</td><td>' + labels[k] + '</td><td>' + (ok ? '<span class="tag tag-s">已匹配光谱</span>' : '<span style="color:#d97706">未匹配</span>') + '</td></tr>';
  });
  el.innerHTML = '<div style="margin-bottom:6px;font-size:11px;color:var(--text2)">共 ' + keys.length + ' 条标签，' + matched + ' 条匹配到光谱样本</div>' +
    '<table style="font-size:11px;width:100%"><thead><tr><th>样本</th><th>SOC (g/kg)</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function runSocTrain() {
  var labels = _soilSocLabels();
  var keys = Object.keys(labels);
  var d = _soilData();
  if (!keys.length) { showToast('请先导入 SOC 标签', 'error'); return; }
  // 统计可训练样本
  var matched = 0;
  keys.forEach(function (k) {
    if (d && d.samples.find(function (s) { return s.name.split('/').pop() === k; })) matched++;
  });
  var msg = matched >= 10
    ? '可训练样本 ' + matched + ' 个，满足基础回归建模条件。'
    : '仅 ' + matched + ' 个可训练样本，建议补充至 ≥30 个再训练。';
  showToast('SOC 反演建模框架已就绪 — ' + msg, matched >= 10 ? 'success' : 'warn');
  // 前端仅做框架提示；真实模型训练/预测由本地 Python 完成
}
