/* CarbonAI v5.1 — Carbon Accounting Module */

const EMISSION_FACTORS = [
  { kw: '烟煤', kw2: '煤', kw3: 'coal', factor: 1.9003, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 1', source: '国家发改委气候司' },
  { kw: '无烟煤', factor: 2.5300, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 1', source: '国家发改委气候司' },
  { kw: '柴油', kw2: 'diesel', factor: 3.1605, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 1', source: 'IPCC 2006' },
  { kw: '汽油', kw2: 'gasoline', factor: 2.9251, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 1', source: 'IPCC 2006' },
  { kw: '天然气', kw2: 'natural gas', factor: 21.840, unit: '万m³', factorUnit: 'tCO₂/万m³', scope: 'Scope 1', source: 'IPCC 2006' },
  { kw: '电力', kw2: '外购电力', kw3: 'electricity', factor: 0.5703, unit: 'MWh', factorUnit: 'tCO₂/MWh', scope: 'Scope 2', source: '中国电网2023(南方)' },
  { kw: '热力', kw2: '蒸汽', factor: 0.1100, unit: 'GJ', factorUnit: 'tCO₂/GJ', scope: 'Scope 2', source: 'GB/T 32151' },
  { kw: '飞行', kw2: '航空', kw3: 'flight', factor: 0.1150, unit: '人·km', factorUnit: 'tCO₂/人·km', scope: 'Scope 3', source: 'ICAO' },
  { kw: '公路货运', kw2: '卡车', factor: 0.0780, unit: '吨·km', factorUnit: 'tCO₂/吨·km', scope: 'Scope 3', source: 'GLEC 3.0' },
];

function matchFactor(name) {
  const n = String(name).toLowerCase().replace(/[\s\-]/g, '');
  for (const f of EMISSION_FACTORS) {
    for (const k of ['kw', 'kw2', 'kw3', 'kw4']) {
      if (f[k] && n.includes(String(f[k]).toLowerCase().replace(/[\s\-]/g, ''))) return f;
    }
  }
  return { factor: 1.0, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 3', source: '默认排放因子' };
}

let aiPreviewRecords = [];

async function handleFile(file) {
  if (!file) return;
  showToast(lang === 'en' ? 'Uploading to server...' : '正在上传到服务器...', 'info');

  // 优先尝试后端 API 上传
  if (typeof apiUploadCarbon === 'function' && typeof API_CONFIG !== 'undefined' && !API_CONFIG.offlineMode) {
    try {
      var result = await apiUploadCarbon(file);
      showToast('✅ 服务器已接收 ' + result.data.records_created + ' 条记录', 'success');
      // 刷新 dashboard 数据
      if (typeof apiGetDashboard === 'function') {
        apiGetDashboard().then(function (dashData) {
          if (dashData && dashData.data && dashData.data.recent_records) {
            var apiRecords = dashData.data.recent_records.map(function (r) {
              return {
                source: r.source_name, scope: r.scope, activity: r.amount, unit: r.unit,
                factor: 0, factorUnit: '', emission: r.amount, year: currentYear,
                factorSource: 'API 后端', confidence: 'high'
              };
            });
            aiPreviewRecords = apiRecords;
            showAIPreview(apiRecords, '排放源');
          } else {
            showToast('数据已上传，暂无明细预览', 'info');
          }
        }).catch(function () {
          showToast('上传成功，请切换到大屏查看数据', 'success');
        });
      }
      return;
    } catch (e) {
      console.warn('[Upload] API 上传失败，回退本地解析:', e.message);
      // API 失败 → 回退本地解析
    }
  }

  // 回退：本地解析（原有逻辑）
  try {
    await LazyLoader.sheetjs();
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    let ws = null;
    for (const name of wb.SheetNames) { ws = wb.Sheets[name]; break; }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let hi = -1, ni = -1, vi = -1, ui = -1, yi = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const r = rows[i];
      for (let j = 0; j < r.length; j++) {
        const c = String(r[j]).trim();
        if (c.includes('排放源') || c.includes('source')) ni = j;
        if (c.includes('活动数据') || c.includes('activity') || c.includes('用量')) vi = j;
        if (c.includes('单位') || c.includes('unit')) ui = j;
        if (c.includes('年份') || c.includes('year')) yi = j;
        if (c.includes('排放源') || c.includes('source') || ni === j) hi = i;
      }
    }
    if (ni < 0 || vi < 0) {
      showToast(lang === 'en' ? 'Cannot identify columns - check Excel format' : '未识别到排放源/活动数据列，请检查Excel格式', 'error');
      return;
    }
    const records = [];
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i];
      const srcName = String(r[ni] || '').trim();
      const rawVal = parseFloat(r[vi]) || 0;
      if (!srcName || rawVal <= 0) continue;
      const matched = matchFactor(srcName);
      const unit = ui >= 0 ? (r[ui] || matched.unit) : matched.unit;
      const year = yi >= 0 ? (r[yi] || currentYear) : currentYear;
      records.push({
        source: matched.kw || srcName, scope: matched.scope, activity: rawVal, unit: unit,
        factor: matched.factor, factorUnit: matched.factorUnit, emission: rawVal * matched.factor / 1000,
        year: year, factorSource: matched.source, confidence: matched.source === '默认排放因子' ? 'low' : 'high'
      });
    }
    if (records.length === 0) {
      showToast(lang === 'en' ? 'No valid data rows found' : '未解析到有效数据行', 'error');
      return;
    }
    aiPreviewRecords = records;
    showAIPreview(records, rows[hi] ? rows[hi][ni] : '排放源');
  } catch (e) {
    showToast((lang === 'en' ? 'Parse failed: ' : '解析失败: ') + e.message, 'error');
  }
}

function showAIPreview(records, colName) {
  const zh = lang === 'zh';
  const overlay = document.createElement('div');
  overlay.className = 'ai-preview-overlay';
  overlay.id = 'aiPreviewOverlay';
  const total = records.reduce(function (s, r) { return s + r.emission; }, 0);
  const lowConf = records.filter(function (r) { return r.confidence === 'low'; }).length;
  let rowsHTML = '';
  records.forEach(function (r, i) {
    const confidenceLabel = r.confidence === 'high' ? (zh ? '高置信' : 'High') : (zh ? '需确认' : 'Review');
    const badgeClass = r.confidence === 'high' ? 'match' : 'warn';
    const rowClass = r.confidence === 'low' ? 'flagged' : '';
    rowsHTML += '<tr class="ai-row ' + rowClass + '"><td>' + (i + 1) + '</td><td><strong>' + r.source + '</strong></td><td>' + fmt(r.activity) + '</td><td>' + r.unit + '</td><td>' + r.factor + '</td><td style="font-size:10px;color:var(--text3)">' + r.factorSource + '</td><td>' + r.scope + '</td><td style="font-weight:600">' + fmt(r.emission) + '</td><td><span class="ai-badge ' + badgeClass + '">' + confidenceLabel + '</span></td></tr>';
  });
  overlay.innerHTML = '<div class="ai-preview-content"><div class="ai-preview-header"><div><h4 style="font-size:14px;color:var(--text)">🤖 ' + (zh ? 'AI 智能识别结果 · 请确认后导入' : 'AI Smart Recognition · Please confirm') + '</h4><span style="font-size:11px;color:var(--text2)">' + (zh ? '识别到 ' : 'Found ') + records.length + (zh ? ' 条排放记录，' : ' emission records, ') + fmt(total) + (zh ? ' tCO₂e，' : ' tCO₂e, ') + (lowConf > 0 ? (zh ? '其中 <span style="color:#d97706">' + lowConf + ' 条</span> 置信度较低需人工确认' : '<span style="color:#059669">all matched</span>') : '<span style="color:#059669">全部匹配成功</span>') + '</span></div><button onclick="document.getElementById(\'aiPreviewOverlay\').remove()" style="border:none;background:transparent;cursor:pointer;font-size:20px;color:var(--text3)">&times;</button></div><div class="ai-preview-body"><div class="table-wrap" style="margin-bottom:12px"><table style="font-size:11px"><thead><tr><th>#</th><th>' + (zh ? '排放源' : 'Source') + '</th><th>' + (zh ? '活动数据' : 'Activity') + '</th><th>' + (zh ? '单位' : 'Unit') + '</th><th>' + (zh ? '排放因子' : 'Factor') + '</th><th>' + (zh ? '因子来源' : 'Source') + '</th><th>Scope</th><th>tCO₂e</th><th>' + (zh ? '置信度' : 'Confidence') + '</th></tr></thead><tbody>' + rowsHTML + '</tbody></table></div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-secondary" onclick="document.getElementById(\'aiPreviewOverlay\').remove()">' + (zh ? '取消' : 'Cancel') + '</button><div style="background:#f0fdf4;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:11px;color:#166534;border:1px solid #bbf7d0;line-height:1.7"><strong>' + (zh ? '核查合规说明' : 'Audit Compliance Note') + '</strong><br>' + (zh ? '排放因子来源包括国家发改委气候司、IPCC 2006/2019、Ecoinvent 3.9、中国电网2023、GLEC 3.0/ISO 14083框架，满足核查机构DQR要求。' : 'Factors sourced from NDRC, IPCC, Ecoinvent 3.9, China Grid 2023, GLEC 3.0/ISO 14083. Meets DQR requirements.') + '</div><button class="btn btn-primary" onclick="confirmAIImport()">✅ ' + (zh ? '确认导入' : 'Confirm Import') + '</button></div></div></div>';
  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function confirmAIImport() {
  const records = aiPreviewRecords;
  currentRecords = records;
  currentYear = records[0].year || currentYear;
  allRecords[currentYear] = records;
  document.getElementById('globalYear').value = currentYear;
  document.getElementById('aiPreviewOverlay').remove();
  renderResults(records);
  setTimeout(function () { renderDashboard(); }, 300);
  autoSave();
  showToast('✅ ' + t('toast.imported') + records.length + t('toast.records') + ' · ' + fmt(currentTotal) + ' tCO₂e', 'success');
}

function renderResults(records) {
  document.getElementById('results').classList.remove('hidden');
  const yr = records[0].year || currentYear;
  const byScope = {};
  let total = 0;
  for (const r of records) { byScope[r.scope] = (byScope[r.scope] || 0) + r.emission; total += r.emission; }
  currentTotal = total; currentYear = yr;
  let html = '<h4>核算结果明细 (' + yr + '年)</h4><table><thead><tr><th>排放源</th><th>Scope</th><th>活动数据</th><th>单位</th><th>排放因子</th><th>因子来源</th><th>tCO₂e</th><th>占比</th></tr></thead><tbody>';
  for (const r of records.sort(function (a, b) { return b.emission - a.emission; })) {
    const pct = total > 0 ? (r.emission / total * 100).toFixed(1) : 0;
    const cls = 'tag tag-' + (r.scope === 'Scope 1' ? 's1' : r.scope === 'Scope 2' ? 's2' : 's3');
    html += '<tr><td>' + r.source + '</td><td><span class="' + cls + '">' + r.scope + '</span></td><td>' + fmt(r.activity) + '</td><td>' + r.unit + '</td><td>' + r.factor + '</td><td style="font-size:10px;color:var(--text3)">' + (r.factorSource || '') + '</td><td style="font-weight:600">' + fmt(r.emission) + '</td><td>' + pct + '%</td></tr>';
  }
  html += '<tr style="font-weight:700;background:#f0fdf4"><td colspan="6">合计</td><td style="color:var(--green)">' + fmt(total) + '</td><td>100%</td></tr></tbody></table>';
  document.getElementById('results').innerHTML = html;
}

function loadDemoData() {
  const demo = [
    { source: '烟煤', scope: 'Scope 1', activity: 500, unit: '吨', factor: 1.9003, factorUnit: 'tCO₂/t', emission: 950.15, year: 2026, factorSource: '国家发改委气候司', confidence: 'high' },
    { source: '柴油', scope: 'Scope 1', activity: 200, unit: '吨', factor: 3.1605, factorUnit: 'tCO₂/t', emission: 632.1, year: 2026, factorSource: 'IPCC 2006', confidence: 'high' },
    { source: '电力', scope: 'Scope 2', activity: 8000, unit: 'MWh', factor: 0.5703, factorUnit: 'tCO₂/MWh', emission: 4562.4, year: 2026, factorSource: '中国电网2023(南方)', confidence: 'high' },
    { source: '飞行', scope: 'Scope 3', activity: 50000, unit: '人·km', factor: 0.115, factorUnit: 'tCO₂/人·km', emission: 5750, year: 2026, factorSource: 'ICAO', confidence: 'high' },
    { source: '公路货运', scope: 'Scope 3', activity: 300000, unit: '吨·km', factor: 0.078, factorUnit: 'tCO₂/吨·km', emission: 23400, year: 2026, factorSource: 'GLEC 3.0', confidence: 'low' },
    { source: '天然气', scope: 'Scope 1', activity: 50, unit: '万m³', factor: 21.840, factorUnit: 'tCO₂/万m³', emission: 1092, year: 2026, factorSource: 'IPCC 2006', confidence: 'high' }
  ];
  aiPreviewRecords = demo;
  showAIPreview(demo, '排放源');
}

function exportCSV() {
  if (!currentRecords.length) { showToast('⚠️ ' + t('toast.upload_first'), 'error'); return; }
  let csv = '排放源,Scope,活动数据,单位,排放因子,因子单位,排放量(tCO₂e),占比\n';
  for (const r of currentRecords.sort(function (a, b) { return b.emission - a.emission; })) {
    csv += '"' + r.source + '","' + r.scope + '",' + r.activity + ',"' + r.unit + '",' + r.factor + ',"' + r.factorUnit + '",' + r.emission.toFixed(2) + ',' + (r.emission / currentTotal * 100).toFixed(1) + '%\n';
  }
  const b = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u; a.download = (lang === 'en' ? 'Carbon_Data_' : '碳排放数据_') + currentYear + '.csv'; a.click(); URL.revokeObjectURL(u);
  showToast('✅ ' + t('toast.csv_done'), 'success');
}

function exportPDF() {
  if (!currentRecords.length) { showToast('⚠️ ' + t('toast.upload_first'), 'error'); return; }
  LazyLoader.html2pdf().then(function () {
    if (typeof html2pdf === 'undefined') { showToast('❌ PDF库未加载，请刷新页面重试', 'error'); return; }
    var reportDate = new Date().toLocaleDateString('zh-CN');
    var totalFmt = fmt(currentTotal);
    var byScope = {};
    currentRecords.forEach(function (r) { byScope[r.scope] = (byScope[r.scope] || 0) + r.emission; });
    var s1 = byScope['Scope 1'] || 0, s2 = byScope['Scope 2'] || 0, s3 = byScope['Scope 3'] || 0;
    var rowsHtml = currentRecords.sort(function (a, b) { return b.emission - a.emission; }).map(function (r) {
      var pct = currentTotal > 0 ? (r.emission / currentTotal * 100).toFixed(1) : 0;
      return '<tr><td style="padding:6px 8px;border:1px solid #cbd5e1">' + r.source + '</td><td style="padding:6px 8px;border:1px solid #cbd5e1">' + r.scope + '</td><td style="padding:6px 8px;border:1px solid #cbd5e1">' + fmt(r.activity) + ' ' + r.unit + '</td><td style="padding:6px 8px;border:1px solid #cbd5e1">' + r.factor + '</td><td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:600">' + fmt(r.emission) + '</td><td style="padding:6px 8px;border:1px solid #cbd5e1">' + pct + '%</td></tr>';
    }).join('');
    var el = document.createElement('div');
    el.style.cssText = 'width:794px;padding:40px;background:#fff;font-family:sans-serif;font-size:12px;line-height:1.8;color:#1e293b';
    el.innerHTML = '<div style="text-align:center;padding:40px 0;border-bottom:3px solid #059669;margin-bottom:20px"><h1 style="color:#059669;font-size:24px">' + (lang === 'en' ? 'Carbon Emission Accounting Report' : '碳排放核算报告') + '</h1><p style="color:#64748b">' + (lang === 'en' ? 'Date: ' : '报告日期：') + reportDate + ' | ' + (lang === 'en' ? 'Data Year: ' : '数据年份：') + currentYear + '</p></div><h3 style="color:#059669;border-bottom:2px solid #059669;padding-bottom:4px;margin-bottom:10px">' + (lang === 'en' ? 'Emission Summary' : '排放汇总') + '</h3><div style="display:flex;gap:16px;margin:12px 0"><div style="background:#ecfdf5;padding:16px 24px;border-radius:8px;text-align:center;flex:1"><div style="font-size:20px;font-weight:800;color:#059669">' + totalFmt + '</div><div style="font-size:10px;color:#64748b">' + (lang === 'en' ? 'Total' : '总排放') + ' (tCO₂e)</div></div><div style="background:#fef2f2;padding:16px 24px;border-radius:8px;text-align:center;flex:1"><div style="font-size:18px;font-weight:800;color:#dc2626">' + fmt(s1) + '</div><div style="font-size:10px;color:#64748b">Scope 1</div></div><div style="background:#fffbeb;padding:16px 24px;border-radius:8px;text-align:center;flex:1"><div style="font-size:18px;font-weight:800;color:#d97706">' + fmt(s2) + '</div><div style="font-size:10px;color:#64748b">Scope 2</div></div><div style="background:#eff6ff;padding:16px 24px;border-radius:8px;text-align:center;flex:1"><div style="font-size:18px;font-weight:800;color:#2563eb">' + fmt(s3) + '</div><div style="font-size:10px;color:#64748b">Scope 3</div></div></div><h3 style="color:#059669;border-bottom:2px solid #059669;padding-bottom:4px;margin:20px 0 10px">' + (lang === 'en' ? 'Emission Details' : '排放明细') + '</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#059669;color:#fff"><th style="padding:6px 8px">' + (lang === 'en' ? 'Source' : '排放源') + '</th><th>Scope</th><th>' + (lang === 'en' ? 'Activity' : '活动数据') + '</th><th>' + (lang === 'en' ? 'Factor' : '排放因子') + '</th><th>tCO₂e</th><th>' + (lang === 'en' ? 'Share' : '占比') + '</th></tr></thead><tbody>' + rowsHtml + '</tbody></table><div style="text-align:center;font-size:9px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:6px">CarbonAI v5.1 · ' + (lang === 'en' ? 'AI-generated report for reference' : '本报告由AI辅助生成，仅供参考') + '</div>';
    document.body.appendChild(el);
    showToast(t('toast.pdf_gen'), 'info');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          html2pdf().set({
            margin: [10, 10, 10, 10],
            filename: (lang === 'en' ? 'Carbon_Audit_Report_' : '碳排放核算报告_') + currentYear + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          }).from(el).save().then(function () {
            el.remove(); showToast(t('toast.pdf_done'), 'success');
          }).catch(function (e) {
            el.remove(); showToast(t('toast.pdf_failed') + e.message, 'error');
          });
        });
      });
    });
  }).catch(function () { showToast('❌ PDF库加载失败', 'error'); });
}

function clearData() {
  currentRecords = []; currentTotal = 0; allRecords = {};
  localStorage.removeItem('carbonai_data');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('dashStats').innerHTML = '<div class="stat-box" style="grid-column:1/-1;padding:35px;text-align:center"><div style="font-size:42px;margin-bottom:8px">📊</div><div style="font-weight:600;color:var(--text)">' + t('dashboard.nodata') + '</div></div>';
  showToast(t('toast.data_cleared'), 'info');
}
