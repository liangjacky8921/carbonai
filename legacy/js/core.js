/* CarbonAI v5.1 — Core Module: State, I18N, Utils, Tabs, Login, Init */

// ==================== GLOBAL STATE ====================
let currentRecords = [], currentTotal = 0, currentYear = 2026;
let allRecords = {};

// ==================== I18N ====================
let lang = localStorage.getItem('carbonai_lang') || 'zh';
const I18N = {
  'tab.dashboard':['数据大屏','Dashboard'],
  'tab.accounting':['碳核算','Accounting'],
  'tab.history':['历史对比','History'],
  'tab.gis':['GIS遥感','GIS Remote'],
  'tab.trajectory':['轨迹核算','Trajectory'],
  'tab.grid':['网格监测','Grid Monitor'],
  'tab.factorlib':['因子库溯源','Factor Library'],
  'tab.soil':['土壤高光谱SOC','Soil Spectral SOC'],
  'tab.sewage':['污水厂运维','Sewage Plant'],
  'tab.asset':['碳资产','Carbon Asset'],
  'tab.pcf':['产品碳足迹','Product CF'],
  'tab.report':['合规报告','Compliance'],
  'tab.ai':['AI顾问','AI Advisor'],
  'tab.tools':['工具箱','Tools'],
  'tab.news':['资讯','News'],
  'tab.hkex':['HKEX导入导出','HKEX Import/Export'],
  'login.btn':['登录','Login'],
  'login.title':['登录 CarbonAI','Login CarbonAI'],
  'login.email':['邮箱','Email'],
  'login.password':['密码','Password'],
  'login.demo':['演示账号','Demo Account'],
  'login.hint':['演示模式：点击演示账号或直接登录','Demo mode: Click Demo Account or Login directly'],
  'login.logout':['退出','Logout'],
  'dashboard.title':['数据大屏','Dashboard'],
  'dashboard.year':['数据年份','Data Year'],
  'dashboard.nodata':['请先在"碳核算"页面上传Excel数据','Please upload Excel data in Accounting tab'],
  'dashboard.hint':['支持.xlsx/.xls格式，自动识别排放源与排放因子','Supports .xlsx/.xls, auto-detects emission sources & factors'],
  'accounting.title':['碳排放核算','Carbon Accounting'],
  'accounting.upload':['点击上传碳排放数据 (Excel .xlsx/.xls)','Click to upload carbon data (Excel .xlsx/.xls)'],
  'accounting.hint':['文件格式：排放源 | 活动数据 | 单位 | Scope | 年份（可选）','Format: Source | Activity | Unit | Scope | Year (optional)'],
  'accounting.demo':['加载演示数据','Load Demo'],
  'accounting.export':['导出CSV','Export CSV'],
  'accounting.pdf':['导出报告PDF','Export PDF'],
  'accounting.clear':['清空数据','Clear Data'],
  'toast.demo_loaded':['已加载演示数据','Demo data loaded'],
  'toast.csv_done':['CSV已导出','CSV exported'],
  'toast.data_cleared':['数据已清空','Data cleared'],
  'toast.no_data':['请先上传数据','Please upload data first'],
  'toast.pdf_gen':['正在生成PDF报告...','Generating PDF report...'],
  'toast.pdf_done':['PDF报告已下载','PDF report downloaded'],
  'toast.upload_first':['请先上传数据','Please upload data first'],
  'toast.imported':['已导入 ','Imported '],
  'toast.records':[' 条记录',' records'],
  'toast.pdf_failed':['PDF生成失败: ','PDF generation failed: '],
  'toast.welcome':['欢迎，','Welcome, '],
  'toast.switched_lang':['已切换为中文','Switched to English'],
  'toast.prices_refreshed':['碳价数据已刷新','Carbon prices refreshed'],
  'header.guest':['访客用户','Guest User'],
  'dark.on':['深色模式已开启','Dark mode on'],
  'dark.off':['浅色模式已开启','Light mode on'],
};

function t(key) {
  const v = I18N[key];
  if (!v) return key;
  return lang === 'en' ? (v[1] || key) : (v[0] || key);
}

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const btn = document.getElementById('langBtn');
  if (btn) btn.textContent = lang === 'zh' ? 'EN' : '中';
}

function toggleLang() {
  lang = lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('carbonai_lang', lang);
  applyLanguage();
  if (typeof updateAIState === 'function') updateAIState();
  if (currentRecords.length > 0) {
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof autoPreviewReport === 'function') autoPreviewReport();
  }
  showToast(lang === 'en' ? 'Switched to English' : '已切换为中文', 'info');
}

// ==================== UTILS ====================
function fmt(v) { return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtInt(v) { return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 0 }); }

function showToast(msg, type) {
  type = type || 'info';
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const tEl = document.createElement('div');
  tEl.className = 'toast ' + type;
  tEl.innerHTML = msg;
  tEl.onclick = function () { tEl.classList.add('removing'); setTimeout(function () { tEl.remove(); }, 300); };
  c.appendChild(tEl);
  setTimeout(function () {
    if (tEl.parentNode) { tEl.classList.add('removing'); setTimeout(function () { tEl.remove(); }, 300); }
  }, 4000);
}

// ==================== DARK MODE ====================
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('carbonai_dark', isDark ? '1' : '0');
  localStorage.setItem('carbonai_theme_override', '1');
  showToast(isDark ? t('dark.on') : t('dark.off'), 'info');
}

function applySystemTheme() {
  if (localStorage.getItem('carbonai_theme_override')) return;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

// ==================== TABS ====================
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
  const btn = document.querySelector('[data-tab="' + tabName + '"]');
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
  const panel = document.getElementById('panel-' + tabName);
  if (panel) panel.classList.add('active');
  // Trigger lazy-load for specific tabs
  setTimeout(function () {
    if (tabName === 'gis' && typeof initGISMap === 'function') initGISMap();
    if (tabName === 'trajectory' && typeof initTrajMap === 'function') initTrajMap();
    if (tabName === 'grid' && typeof initGridMap === 'function') initGridMap();
    if (tabName === 'asset' && typeof renderAssetCharts === 'function') renderAssetCharts();
    if (tabName === 'news' && typeof loadNewsToPanel === 'function') loadNewsToPanel();
    if (tabName === 'history' && typeof renderHistory === 'function') renderHistory();
    if (tabName === 'soil' && typeof initSoilPanel === 'function') initSoilPanel();
    if (tabName === 'sewage' && typeof initSewagePanel === 'function') initSewagePanel();
  }, 150);
}

// ==================== LOGIN ====================
let isLoggedIn = false;
let currentUserEmail = '';

function showLogin() {
  const overlay = document.createElement('div');
  overlay.id = 'loginOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = '<div style="background:var(--card);border-radius:var(--radius);width:400px;max-width:90vw;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:fadeIn .3s ease"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h3 style="font-size:16px;color:var(--text)">' + t('login.title') + '</h3><button onclick="document.getElementById(\'loginOverlay\').remove()" style="border:none;background:transparent;cursor:pointer;font-size:18px;color:var(--text3)">&times;</button></div><div class="form-group"><label>用户名</label><input type="text" id="loginEmail" placeholder="admin" value="admin"></div><div class="form-group"><label>' + t('login.password') + '</label><input type="password" id="loginPass" placeholder="········" value="123456"></div><div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn-primary" onclick="doLogin()" style="flex:1">' + t('login.btn') + '</button><button class="btn btn-secondary" onclick="document.getElementById(\'loginEmail\').value=\'admin@carbontool.cn\';document.getElementById(\'loginPass\').value=\'demo123\';doLogin();" style="flex:1">' + t('login.demo') + '</button></div><p style="font-size:10px;color:var(--text3);text-align:center;margin-top:12px">默认账号 admin / 123456 — '+(typeof API_CONFIG!=='undefined'&&API_CONFIG.offlineMode?'离线模式':'已连接后端')+'</p></div>';
  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function doLogin() {
  var emailEl = document.getElementById('loginEmail');
  var passEl = document.getElementById('loginPass');
  var username = emailEl ? emailEl.value.trim() : '';
  var password = passEl ? passEl.value.trim() : '';
  if (!username) { showToast(lang === 'en' ? 'Please enter username' : '请输入用户名', 'error'); return; }

  // 尝试调用后端 API 登录
  if (typeof apiLogin === 'function' && !API_CONFIG.offlineMode) {
    apiLogin(username, password || '123456').then(function (result) {
      // API 登录成功（server.py 返回 { token, user }，用户名在 user 顶层）
      var uname = (result.user && result.user.username) || (result.data && result.data.username) || username;
      _onLoginSuccess(uname, true);
    }).catch(function (err) {
      console.warn('[Login] API 登录失败，尝试离线登录:', err.message);
      _onLoginSuccess(username, false);
    });
  } else {
    // 离线模式：任何账号密码均可登录
    _onLoginSuccess(username, false);
  }
}

function _onLoginSuccess(username, apiAuth) {
  var overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.remove();
  isLoggedIn = true;
  currentUserEmail = username;
  localStorage.setItem('carbonai_logged_in', '1');
  localStorage.setItem('carbonai_user_email', username);
  var headerBtn = document.getElementById('headerLoginBtn');
  if (headerBtn) headerBtn.innerHTML = '<span data-i18n="login.logout">退出</span> ' + username;
  if (typeof updateAIState === 'function') updateAIState();
  showToast((lang === 'en' ? 'Welcome, ' : '欢迎，') + username + (apiAuth ? ' [API]' : ' [离线]'), 'success');

  // 连接 WebSocket 实时数据
  if (typeof connectRealtimeWS === 'function') {
    connectRealtimeWS(_onRealtimeData);
  }
}

function doLogout() {
  isLoggedIn = false;
  currentUserEmail = '';
  localStorage.removeItem('carbonai_logged_in');
  localStorage.removeItem('carbonai_user_email');
  var headerBtn = document.getElementById('headerLoginBtn');
  if (headerBtn) headerBtn.innerHTML = '<span data-i18n="login.btn">登录</span>';
  // 清除 JWT Token
  if (typeof clearToken === 'function') clearToken();
  // 断开 WebSocket
  if (typeof disconnectRealtimeWS === 'function') disconnectRealtimeWS();
  if (typeof updateAIState === 'function') updateAIState();
  if (typeof clearChatHistory === 'function') clearChatHistory();
  showToast(t('login.logout'), 'info');
}

// ==================== SAVE / LOAD ====================
function onGlobalYearChange() {
  currentYear = parseInt(document.getElementById('globalYear').value);
  if (allRecords[currentYear] && allRecords[currentYear].length > 0) {
    currentRecords = allRecords[currentYear];
    if (typeof renderResults === 'function') renderResults(currentRecords);
    setTimeout(function () { if (typeof renderDashboard === 'function') renderDashboard(); }, 300);
  } else {
    currentRecords = []; currentTotal = 0;
    const resultsEl = document.getElementById('results');
    if (resultsEl) resultsEl.classList.add('hidden');
    const dashStats = document.getElementById('dashStats');
    if (dashStats) dashStats.innerHTML = '<div class="stat-box" style="grid-column:1/-1;padding:35px;text-align:center"><div style="font-size:36px;margin-bottom:8px">📭</div><div style="font-weight:600;color:var(--text)">' + currentYear + '年暂无数据</div><div style="font-size:11px;color:var(--text2);margin-top:4px">请上传该年份的Excel数据</div></div>';
  }
}

function autoSave() {
  if (Object.keys(allRecords).length > 0 || currentRecords.length > 0) {
    if (currentRecords.length > 0) allRecords[currentYear] = currentRecords;
    localStorage.setItem('carbonai_data', JSON.stringify({ allRecords: allRecords, year: currentYear, updated: new Date().toISOString() }));
  }
}

// ==================== 历史对比渲染 ====================
function renderHistory() {
  var years = Object.keys(allRecords).sort();
  var bar = document.getElementById('historyBar');
  var scopeEl = document.getElementById('historyScope');
  var tbl = document.getElementById('historyTable');
  if (!years.length) {
    if (tbl) tbl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3)">暂无多年数据，请先在「碳核算」页面上传不同年份的 Excel</div>';
    return;
  }
  var totals = [], s1 = [], s2 = [], s3 = [];
  years.forEach(function (y) {
    var rs = allRecords[y] || [];
    var t = 0, a = 0, b = 0, c = 0;
    rs.forEach(function (r) {
      t += r.emission;
      if (r.scope === 'Scope 1') a += r.emission;
      else if (r.scope === 'Scope 2') b += r.emission;
      else c += r.emission;
    });
    totals.push(+t.toFixed(2)); s1.push(+a.toFixed(2)); s2.push(+b.toFixed(2)); s3.push(+c.toFixed(2));
  });
  LazyLoader.echarts().then(function () {
    if (bar) {
      var c = echarts.getInstanceByDom(bar); if (c) c.dispose();
      echarts.init(bar).setOption({
        backgroundColor: 'transparent', tooltip: { trigger: 'axis' },
        grid: { left: 50, right: 20, top: 30, bottom: 30 },
        xAxis: { type: 'category', data: years, axisLabel: { color: 'var(--text2)' }, axisLine: { lineStyle: { color: 'var(--border)' } } },
        yAxis: { type: 'value', axisLabel: { color: 'var(--text2)' }, splitLine: { lineStyle: { color: 'var(--border)' } } },
        series: [{ name: '总排放', type: 'bar', data: totals, itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40 }]
      });
    }
    if (scopeEl) {
      var c2 = echarts.getInstanceByDom(scopeEl); if (c2) c2.dispose();
      echarts.init(scopeEl).setOption({
        backgroundColor: 'transparent', tooltip: { trigger: 'axis' },
        legend: { data: ['Scope1', 'Scope2', 'Scope3'], top: 0, textStyle: { color: 'var(--text2)' } },
        grid: { left: 50, right: 20, top: 40, bottom: 30 },
        xAxis: { type: 'category', data: years, axisLabel: { color: 'var(--text2)' }, axisLine: { lineStyle: { color: 'var(--border)' } } },
        yAxis: { type: 'value', axisLabel: { color: 'var(--text2)' }, splitLine: { lineStyle: { color: 'var(--border)' } } },
        series: [
          { name: 'Scope1', type: 'line', smooth: true, data: s1, color: '#EF4444' },
          { name: 'Scope2', type: 'line', smooth: true, data: s2, color: '#F59E0B' },
          { name: 'Scope3', type: 'line', smooth: true, data: s3, color: '#3B82F6' }
        ]
      });
    }
  });
  if (tbl) {
    var rows = '<table style="font-size:11px;width:100%"><thead><tr><th>年份</th><th>总排放 (tCO₂e)</th><th>Scope1</th><th>Scope2</th><th>Scope3</th><th>记录数</th></tr></thead><tbody>';
    years.forEach(function (y, i) {
      rows += '<tr><td><strong>' + y + '</strong></td><td>' + fmt(totals[i]) + '</td><td>' + fmt(s1[i]) + '</td><td>' + fmt(s2[i]) + '</td><td>' + fmt(s3[i]) + '</td><td>' + (allRecords[y] || []).length + '</td></tr>';
    });
    rows += '</tbody></table>';
    tbl.innerHTML = rows;
  }
}

// ==================== 后端连接配置 ====================
function toggleConnConfig() {
  var el = document.getElementById('connConfig');
  if (!el) return;
  el.classList.toggle('hidden');
  if (!el.classList.contains('hidden')) {
    var input = document.getElementById('apiBaseInput');
    if (input) input.value = (typeof API_CONFIG !== 'undefined') ? API_CONFIG.BASE_URL : '';
  }
}
function applyConnConfig() {
  var input = document.getElementById('apiBaseInput');
  if (!input) return;
  var url = input.value.trim();
  if (!url) { showToast('请输入后端地址，或点击「重置」恢复默认', 'warn'); return; }
  if (typeof setApiBaseUrl === 'function') {
    var final = setApiBaseUrl(url);
    showToast('后端地址已设为 ' + final, 'success');
  }
  toggleConnConfig();
}
function resetConnConfig() {
  if (typeof setApiBaseUrl === 'function') setApiBaseUrl('');
  showToast('已恢复默认后端地址 localhost:8000', 'info');
  var input = document.getElementById('apiBaseInput');
  if (input) input.value = 'http://localhost:8000';
  toggleConnConfig();
}

function loadAutoSave() {
  const saved = localStorage.getItem('carbonai_data');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.allRecords && Object.keys(data.allRecords).length > 0) {
        allRecords = data.allRecords;
        currentYear = data.year || 2026;
        document.getElementById('globalYear').value = currentYear;
        if (allRecords[currentYear]) {
          if (typeof renderResults === 'function') renderResults(allRecords[currentYear]);
          setTimeout(function () { if (typeof renderDashboard === 'function') renderDashboard(); }, 300);
        }
      }
    } catch (e) { /* ignore corrupt data */ }
  }
}


// ==================== WEBSOCKET REALTIME CALLBACK ====================
/**
 * Handle realtime data from backend WebSocket
 * Data format: { type: 'market' | 'grid_alert', timestamp, data: {...} }
 */
var _latestRealtimeData = {};
function _onRealtimeData(payload) {
  _latestRealtimeData[payload.type] = payload;
  // Update carbon price ticker
  if (payload.type === 'market' && payload.data) {
    var tickerEl = document.getElementById('tickerContent');
    if (tickerEl && payload.data.cea_price) {
      var existing = tickerEl.innerHTML;
      var dir = payload.data.change_pct > 0 ? '+' : '';
      var arrow = payload.data.change_pct > 0 ? '\u25B2' : '\u25BC';
      var newItem = '<span>' + arrow + ' CEA ' + payload.data.cea_price + ' (' + dir + payload.data.change_pct + '%)'
        + ' | ' + payload.data.active_company + '</span> ';
      if (existing.indexOf('CEA ' + payload.data.cea_price) < 0) {
        tickerEl.innerHTML = newItem + existing;
      }
    }
  }
  // Update grid alerts
  if (payload.type === 'grid_alert' && payload.data) {
    var alertEl = document.getElementById('gridAlerts');
    if (alertEl && payload.data.alert_level && payload.data.alert_level !== '\u7EFF\u8272') {
      var severity = payload.data.alert_level === '\u7EA2\u8272' ? 'danger' : 'warn';
      var div = document.createElement('div');
      div.className = 'timeline-item ' + severity;
      div.innerHTML = '<strong>' + payload.data.timestamp + '</strong> \u2014 ' + payload.data.message + ' (' + payload.data.co2_concentration + ' ppm)';
      alertEl.insertBefore(div, alertEl.firstChild);
    }
  }
}
console.log('[CarbonAI] Realtime callback registered via API bridge');
// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function () {
  // Theme
  if (localStorage.getItem('carbonai_dark') === '1') {
    document.body.classList.add('dark');
  } else if (!localStorage.getItem('carbonai_theme_override')) {
    applySystemTheme();
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySystemTheme);

  // Restore login state
  if (localStorage.getItem('carbonai_logged_in') === '1') {
    isLoggedIn = true;
    currentUserEmail = localStorage.getItem('carbonai_user_email') || 'user@carbontool.cn';
    const headerBtn = document.getElementById('headerLoginBtn');
    if (headerBtn) headerBtn.innerHTML = '<span data-i18n="login.logout">退出</span> ' + currentUserEmail.split('@')[0];
  }

  // Tab click handlers
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(this.dataset.tab);
    });
  });

  // Lazy load GIS tabs
  const gisBtn = document.querySelector('[data-tab="gis"]');
  if (gisBtn) {
    gisBtn.addEventListener('click', function () {
      LazyLoader.leaflet().then(function () {
        if (typeof initGISMap === 'function') initGISMap();
      }).catch(function () {
        showToast('地图库加载失败，请刷新页面重试', 'error');
      });
    });
  }
  const trajBtn = document.querySelector('[data-tab="trajectory"]');
  if (trajBtn) {
    trajBtn.addEventListener('click', function () {
      LazyLoader.leaflet().then(function () {
        if (typeof initTrajMap === 'function') initTrajMap();
      });
    });
  }
  const gridBtn = document.querySelector('[data-tab="grid"]');
  if (gridBtn) {
    gridBtn.addEventListener('click', function () {
      LazyLoader.leaflet().then(function () {
        if (typeof initGridMap === 'function') initGridMap();
      });
    });
  }

  // Preload RemixIcon CSS
  LazyLoader.preloadCSS();

  // Init
  applyLanguage();
  loadAutoSave();
  if (typeof filterFactors === 'function') filterFactors();
  if (typeof renderFactorCharts === 'function') renderFactorCharts();
  if (typeof renderAssetCharts === 'function') renderAssetCharts();
  if (typeof startRealtimeEngine === 'function') startRealtimeEngine();
  if (typeof initChat === 'function') initChat();

  // Handle orientation change for maps
  window.addEventListener('orientationchange', function () {
    setTimeout(function () {
      if (typeof gisMapObj !== 'undefined' && gisMapObj) gisMapObj.invalidateSize();
      if (typeof trajMapObj !== 'undefined' && trajMapObj) trajMapObj.invalidateSize();
      if (typeof gridMapObj !== 'undefined' && gridMapObj) gridMapObj.invalidateSize();
    }, 300);
  });

  var _resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function () {
      if (typeof gisMapObj !== 'undefined' && gisMapObj) gisMapObj.invalidateSize();
      if (typeof trajMapObj !== 'undefined' && trajMapObj) trajMapObj.invalidateSize();
      if (typeof gridMapObj !== 'undefined' && gridMapObj) gridMapObj.invalidateSize();
    }, 400);
  });
});

console.log('CarbonAI v5.1 · 模块化前端 · 按需加载 · 实时数据 · HKEX合规导出 已就绪');
