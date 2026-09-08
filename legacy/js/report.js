/* CarbonAI v5.1 — Compliance Report Module (12 standards across 6 regions) */
let currentReport = 'cn-sse';

const REGION_STANDARDS = {
  'auto': ['cn-sse', 'hk-esg', 'eu-csrd'],
  'cn-mainland': ['cn-sse', 'cn-gb', 'cn-mee'],
  'cn-hk': ['hk-esg'],
  'cn-tw': ['tw-ghg'],
  'eu': ['eu-csrd', 'cbam'],
  'us': ['us-sec'],
  'intl': ['issb', 'iso', 'ghg', 'gri']
};

const REPORT_NAMES = {
  'cn-sse': '上交所/深交所可持续发展报告', 'cn-gb': 'GB/T 32150-2025 工业企业碳排放核算通则',
  'cn-mee': '生态环境部 企业温室气体排放报告', 'hk-esg': 'HKEX ESG Code + Part D气候披露',
  'tw-ghg': '气候变迁因应法 温室气体排放量盘查', 'eu-csrd': 'EU CSRD / ESRS E1 气候变化',
  'cbam': 'EU CBAM 碳边境调节机制', 'us-sec': 'SEC Climate Disclosure Rule',
  'issb': 'ISSB IFRS S1/S2 可持续披露准则', 'iso': 'ISO 14064-1:2018',
  'ghg': 'GHG Protocol 企业核算与报告标准', 'gri': 'GRI 305:2016 排放 + TCFD框架'
};

const REGION_LABELS = { 'cn-mainland': '中国大陆', 'cn-hk': '中国香港', 'cn-tw': '中国台湾', 'eu': '欧盟', 'us': '美国', 'intl': '国际通用' };

function getReportName(type) { return REPORT_NAMES[type] || type; }
function getRegionLabel(region) { return REGION_LABELS[region] || '自动'; }
function detectRegionFromReport(type) {
  for (const [r, types] of Object.entries(REGION_STANDARDS)) { if (types.includes(type)) return r; }
  return 'intl';
}
function autoDetectRegion(type) {
  var region = detectRegionFromReport(type);
  document.getElementById('reportRegion').value = region;
  document.getElementById('regionHint').textContent = '已匹配: ' + getRegionLabel(region) + ' | 标准: ' + getReportName(type);
}

function selectReport(type) {
  currentReport = type;
  document.querySelectorAll('.report-template-card').forEach(function (c) { c.classList.remove('selected'); });
  var card = document.getElementById('rpt-' + type);
  if (card) { card.classList.add('selected'); autoDetectRegion(type); }
  document.getElementById('selectedReportName').textContent = getReportName(type);
  autoPreviewReport();
  var region = detectRegionFromReport(type);
  document.querySelectorAll('.report-template-card').forEach(function (c) {
    if (c.dataset.region !== region) c.style.opacity = '0.4'; else c.style.opacity = '1';
  });
}

function onRegionChange() {
  var region = document.getElementById('reportRegion').value;
  var types = REGION_STANDARDS[region] || REGION_STANDARDS['intl'];
  document.querySelectorAll('.report-template-card').forEach(function (c) {
    c.style.opacity = region === 'auto' ? '1' : (c.dataset.region === region ? '1' : '0.4');
  });
  if (types.length > 0) { selectReport(types[0]); autoDetectRegion(types[0]); }
  document.getElementById('regionHint').textContent = region === 'auto' ? '自动检测所有区域标准' : '当前区域: ' + getRegionLabel(region) + ' | ' + types.length + '个标准模板可用';
}

function autoPreviewReport() {
  var preview = document.getElementById('reportPreview');
  if (!currentRecords.length) { preview.innerHTML = '<p style="color:var(--text2);text-align:center;padding:20px">请先在"碳核算"页面上传数据，系统将自动填充报告内容</p>'; return; }
  preview.innerHTML = buildOfficialReport(currentReport);
}

function generateReport() {
  if (!currentRecords.length) { showToast('⚠️ 请先上传数据', 'error'); return; }
  autoPreviewReport();
  showToast('✅ ' + (lang === 'en' ? 'Report generated - check preview' : '报告已自动生成，请查看预览'), 'success');
}

function buildOfficialReport(type) {
  var y = currentYear, t = fmt(currentTotal);
  var scope = {};
  currentRecords.forEach(function (r) { scope[r.scope] = (scope[r.scope] || 0) + r.emission; });
  var s1 = fmt(scope['Scope 1'] || 0), s2 = fmt(scope['Scope 2'] || 0), s3 = fmt(scope['Scope 3'] || 0);

  var detailRows = currentRecords.sort(function (a, b) { return b.emission - a.emission; }).map(function (r) {
    return '<tr><td>' + r.source + '</td><td>' + r.scope + '</td><td>' + r.activity.toFixed(2) + '</td><td>' + r.unit + '</td><td>' + r.factor + '</td><td style="font-weight:600">' + r.emission.toFixed(2) + '</td><td>' + (r.emission / currentTotal * 100).toFixed(1) + '%</td></tr>';
  }).join('');
  var emisTable = '<table><thead><tr><th>排放源</th><th>Scope</th><th>活动数据</th><th>单位</th><th>因子</th><th>tCO₂e</th><th>占比</th></tr></thead><tbody>' + detailRows + '<tr style="font-weight:700;background:#f0fdf4"><td colspan="5">合计</td><td>' + t + '</td><td>100%</td></tr></tbody></table>';

  if (type === 'hk-esg') {
    return '<h2>HKEX ESG Code — Part D 气候相关披露 (' + y + '年度)</h2>' +
      '<p><b>编制依据：</b>HKEX上市规则附录C2(ESG守则) Part D | IFRS S2气候披露准则 | TCFD四支柱框架 | LargeCap强制披露(FY2026起)</p>' +
      '<h3>Part I — 管治 (§D19)</h3>' +
      '<table><tr><td><b>董事会监督：</b></td><td>董事会下设可持续发展委员会，每季度审议气候风险</td></tr>' +
      '<tr><td><b>管理层角色：</b></td><td>CEO直接负责气候战略，CFO负责碳资产与碳定价</td></tr>' +
      '<tr><td><b>薪酬关联：</b></td><td>减排目标完成度纳入高管KPI(权重15%)</td></tr></table>' +
      '<h3>Part II — 策略 (§D20-26)</h3>' +
      '<p><b>气候情景分析：</b>已使用NGFS 1.5°C/2°C/3°C三种情景进行韧性评估。</p>' +
      '<p><b>转型计划：</b>2030年降碳35%(SBTi)，2050年碳中和。物理风险暴露：台风/洪水/海平面上升(大湾区沿岸设施)。</p>' +
      '<h3>Part III — 风险管理 (§D27)</h3><p>气候风险已纳入企业全面风险管理(ERM)框架，每半年更新风险评估矩阵。</p>' +
      '<h3>Part IV — 指标与目标 (§D28-40)</h3>' +
      '<table><tr><th>KPI</th><th>' + y + '年</th><th>单位</th></tr>' +
      '<tr><td>Scope 1 GHG排放</td><td>' + s1 + '</td><td>tCO₂e</td></tr>' +
      '<tr><td>Scope 2 GHG排放</td><td>' + s2 + '</td><td>tCO₂e</td></tr>' +
      '<tr><td>Scope 3 GHG排放(鼓励)</td><td>' + s3 + '</td><td>tCO₂e</td></tr>' +
      '<tr><td><b>总排放(Scope 1+2)</b></td><td><b>' + t + '</b></td><td>tCO₂e</td></tr>' +
      '<tr><td>排放强度</td><td>' + fmt(currentTotal / 8000) + '</td><td>tCO₂e/万元营收</td></tr>' +
      '</table><p><b>内碳定价：</b>¥81.23/t | <b>减排目标：</b>2030年较基准年降35% | SBTi 1.5°C路径</p>' +
      '<p style="font-size:9px;color:#64748b">必做负面声明：如无转型计划/碳定价/薪酬关联，须明确说明。</p>' +
      '<h3>排放源明细</h3>' + emisTable;
  }

  if (type === 'cn-sse') {
    return '<h2>上交所/深交所上市公司可持续发展报告 (' + y + '年度)</h2>' +
      '<p><b>依据：</b>《上市公司可持续发展报告指引》(2024.5.1实施) + 《编制指南》(2026.1修订) | 强制主体：上证180/深证100/科创50</p>' +
      '<h3>温室气体排放 (议题2-应对气候变化)</h3>' +
      '<table><tr><td>范围1直接排放</td><td>' + s1 + '</td><td>tCO₂e</td></tr>' +
      '<tr><td>范围2间接排放</td><td>' + s2 + '</td><td>tCO₂e</td></tr>' +
      '<tr><td>范围3价值链排放(鼓励)</td><td>' + s3 + '</td><td>tCO₂e</td></tr>' +
      '<tr><td><b>温室气体总排放</b></td><td><b>' + t + '</b></td><td>tCO₂e</td></tr></table>' +
      '<p><b>排放强度：</b>' + fmt(currentTotal / 8000) + ' tCO₂e/万元营收 | <b>内碳定价：</b>¥81.23/tCEA</p>' +
      '<h3>排放源明细</h3>' + emisTable;
  }

  if (type === 'cbam') {
    return '<h2>EU CBAM 碳边境调节机制 — 隐含碳排放年度申报 (' + y + '年度)</h2>' +
      '<p><b>法规依据：</b>Regulation (EU) 2023/956 (CBAM正式期) | 申报截止：' + y + '年9月30日</p>' +
      '<p><b>产品范围：</b>钢铁(72-73章) | 铝(7601-7616) | 水泥(2523) | 化肥(3102-3105) | 氢(2804) | 电力(2716)</p>' +
      '<h3>子表B — 直接排放(按燃料类型)</h3>' +
      '<table><tr><th>燃料类型</th><th>消耗量</th><th>排放因子</th><th>排放量(tCO₂)</th></tr>' +
      currentRecords.filter(function (r) { return r.scope === 'Scope 1'; }).map(function (r) { return '<tr><td>' + r.source + '</td><td>' + r.activity.toFixed(2) + ' ' + r.unit + '</td><td>' + r.factor + '</td><td>' + r.emission.toFixed(2) + '</td></tr>'; }).join('') +
      '</table>' +
      '<h3>子表C — 间接排放(电力)</h3>' +
      '<table><tr><th>用电量</th><th>电网区域</th><th>排放因子</th><th>排放量(tCO₂)</th></tr>' +
      currentRecords.filter(function (r) { return r.scope === 'Scope 2'; }).map(function (r) { return '<tr><td>' + r.activity.toFixed(2) + ' ' + r.unit + '</td><td>南方电网</td><td>' + r.factor + '</td><td>' + r.emission.toFixed(2) + '</td></tr>'; }).join('') +
      '</table>' +
      '<table><tr><td>隐含碳排放(直接+间接)</td><td>' + fmt((currentTotal - (scope['Scope 3'] || 0)) * 0.85) + ' tCO₂e</td></tr>' +
      '<tr><td>原产国碳价抵扣(中国CEA)</td><td>¥81.23/t × ' + fmtInt((currentTotal - (scope['Scope 3'] || 0)) * 0.85) + '</td></tr>' +
      '<tr><td>CBAM证书需求(Omnibus 50%)</td><td>€' + fmt((currentTotal - (scope['Scope 3'] || 0)) * 0.85 * 75.36 * 0.5) + '</td></tr></table>' +
      '<p style="font-size:9px;color:#64748b">⚠️ 2026年Omnibus条例下覆盖率降至50%。须由EU认证核查机构核证。</p>' +
      '<h3>排放源明细</h3>' + emisTable;
  }

  // Default
  return '<h2>' + getReportName(type) + ' (' + y + '年度)</h2>' + emisTable;
}

function exportReportPDF() {
  if (!currentRecords.length) { showToast('⚠️ 请先上传数据', 'error'); return; }
  LazyLoader.html2pdf().then(function () {
    if (typeof html2pdf === 'undefined') { showToast('❌ PDF库未加载', 'error'); return; }
    var reportDate = new Date().toLocaleDateString('zh-CN');
    var reportName = getReportName(currentReport);
    var content = buildOfficialReport(currentReport);

    var el = document.createElement('div');
    el.style.cssText = 'width:794px;padding:40px;background:#fff;font-family:sans-serif;font-size:12px;line-height:1.8;color:#1e293b';
    el.innerHTML = '<div style="text-align:center;padding:50px 0 30px;border-bottom:3px solid #059669;margin-bottom:20px"><h1 style="color:#059669;font-size:26px">' + reportName + '</h1><p style="color:#64748b">' + (lang === 'en' ? 'Compliance Carbon Report' : '合规碳排放报告') + '</p><p style="color:#94a3b8;font-size:11px">' + (lang === 'en' ? 'Date: ' : '报告日期：') + reportDate + ' | ' + (lang === 'en' ? 'Data Year: ' : '数据年份：') + currentYear + '</p></div>' + content + '<div style="text-align:center;font-size:8px;color:#94a3b8;margin-top:30px;border-top:1px solid #e2e8f0;padding-top:6px">CarbonAI v5.1 · ' + (lang === 'en' ? 'AI-generated report' : '本报告由AI辅助生成，正式提交前须经第三方核查机构审核') + '</div>';
    document.body.appendChild(el);
    showToast('📄 正在生成合规报告PDF...', 'info');

    var names = { 'cn-sse': 'CN_SSE', 'cn-gb': 'CN_GB', 'cn-mee': 'CN_MEE', 'hk-esg': 'HKEX_ESG', 'tw-ghg': 'TW_GHG', 'eu-csrd': 'EU_CSRD', 'cbam': 'CBAM', 'us-sec': 'US_SEC', 'issb': 'ISSB', 'iso': 'ISO14064', 'ghg': 'GHGProtocol', 'gri': 'GRI' };
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          html2pdf().set({ margin: [10, 10, 10, 10], filename: (lang === 'en' ? 'Compliance_Report_' : '合规报告_') + (names[currentReport] || currentReport) + '_' + currentYear + '.pdf', html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4' } }).from(el).save().then(function () { el.remove(); showToast('✅ PDF报告已导出', 'success'); }).catch(function (e) { el.remove(); showToast('PDF生成失败: ' + e.message, 'error'); });
        });
      });
    });
  });
}

function exportReportWord() {
  if (!currentRecords.length) { showToast('⚠️ 请先上传数据', 'error'); return; }
  var content = document.getElementById('reportPreview').innerHTML;
  var blob = new Blob(['<html><meta charset="UTF-8"><body style="font-family:sans-serif;padding:40px">' + content + '</body></html>'], { type: 'application/msword' });
  var names = { 'cn-sse': 'CN_SSE', 'cn-gb': 'CN_GB', 'cn-mee': 'CN_MEE', 'hk-esg': 'HKEX_ESG', 'tw-ghg': 'TW_GHG', 'eu-csrd': 'EU_CSRD', 'cbam': 'CBAM', 'us-sec': 'US_SEC', 'issb': 'ISSB', 'iso': 'ISO14064', 'ghg': 'GHGProtocol', 'gri': 'GRI' };
  var u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = u; a.download = (lang === 'en' ? 'Compliance_Report_' : '合规报告_') + (names[currentReport] || currentReport) + '_' + currentYear + '.doc'; a.click(); URL.revokeObjectURL(u);
  showToast('✅ Word报告已导出', 'success');
}
