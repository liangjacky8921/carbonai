/**
 * CarbonAI v5.1 — API 集成模块
 * 连接 FastAPI 后端 (http://localhost:8000)
 *
 * 模式切换：
 *   - 后端在线时，自动使用 API 模式（真实 JWT 认证 + 数据持久化）
 *   - 后端离线时，自动回退本地模式（localStorage + 客户端计算）
 */

// ==================== API 配置 ====================
const API_CONFIG = {
  // 后端地址 — 运行时优先读 localStorage 设置，否则用默认值
  //   默认: 本机 FastAPI 后端 (E:\carbontool后端 实际监听 8000)
  //   内网穿透 / 阿里云: 在页面顶部「连接状态」栏里填写公网地址即可持久化
  //   （例如 https://xxx.trycloudflare.com 或 https://api.carbontool.cn）
  BASE_URL: localStorage.getItem('carbonai_api_base') || 'http://localhost:8000',

  // WebSocket 地址（自动从 BASE_URL 推导）
  get WS_URL() {
    return this.BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  },
  // 离线模式标记（后端不可用时自动开启）
  offlineMode: false,
};

/**
 * 更新后端地址并持久化（供连接状态条调用）
 */
function setApiBaseUrl(url) {
  url = (url || '').trim().replace(/\/+$/, '');
  if (!url) {
    localStorage.removeItem('carbonai_api_base');
    API_CONFIG.BASE_URL = 'http://localhost:8000';
  } else {
    // 无协议时自动补 http/https
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    localStorage.setItem('carbonai_api_base', url);
    API_CONFIG.BASE_URL = url;
  }
  API_CONFIG.offlineMode = false;
  // 重新探测后端状态
  if (typeof apiHealthCheck === 'function') {
    apiHealthCheck().then(function (ok) {
      updateConnBadge(ok);
    });
  }
  return API_CONFIG.BASE_URL;
}

/**
 * 更新顶部连接状态徽标
 */
function updateConnBadge(ok) {
  var el = document.getElementById('connBadge');
  if (!el) return;
  if (ok) {
    el.innerHTML = '<i class="ri-wifi-line"></i> 后端已连接';
    el.className = 'conn-badge online';
  } else {
    el.innerHTML = '<i class="ri-cloud-off-line"></i> 离线模式';
    el.className = 'conn-badge offline';
  }
}

// ==================== Token 管理 ====================
function getToken() {
  return localStorage.getItem('carbonai_jwt');
}
function saveToken(token) {
  localStorage.setItem('carbonai_jwt', token);
}
function clearToken() {
  localStorage.removeItem('carbonai_jwt');
}
function getAuthHeaders() {
  var token = getToken();
  if (!token) return {};
  return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
}

// ==================== 通用 HTTP 封装 ====================

/**
 * 发送 API GET 请求
 * @param {string} path — 接口路径，如 "/api/carbon/dashboard"
 * @param {boolean} auth — 是否需要 JWT 鉴权
 * @returns {Promise<object>} — 解析后的 JSON 响应
 */
async function apiGet(path, auth) {
  if (auth === undefined) auth = true;
  try {
    var headers = { 'Content-Type': 'application/json' };
    if (auth) {
      var token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }
    var resp = await fetch(API_CONFIG.BASE_URL + path, { headers: headers });
    if (resp.status === 401) {
      // Token 过期或无效 → 强制登出
      if (typeof doLogout === 'function') doLogout();
      throw new Error('登录已过期，请重新登录');
    }
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || data.message || '请求失败');
    return data;
  } catch (e) {
    // 网络错误 → 标记离线模式
    if (e.name === 'TypeError' || e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      API_CONFIG.offlineMode = true;
      console.warn('[API] 后端不可达，进入离线模式');
    }
    throw e;
  }
}

/**
 * 发送 API POST 请求
 * @param {string} path — 接口路径
 * @param {object} body — JSON 请求体
 * @param {boolean} auth — 是否需要 JWT 鉴权
 */
async function apiPost(path, body, auth) {
  if (auth === undefined) auth = true;
  try {
    var headers = { 'Content-Type': 'application/json' };
    if (auth) {
      var token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }
    var resp = await fetch(API_CONFIG.BASE_URL + path, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    if (resp.status === 401) {
      if (typeof doLogout === 'function') doLogout();
      throw new Error('登录已过期，请重新登录');
    }
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || data.message || '请求失败');
    return data;
  } catch (e) {
    if (e.name === 'TypeError' || e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      API_CONFIG.offlineMode = true;
      console.warn('[API] 后端不可达，进入离线模式');
    }
    throw e;
  }
}

/**
 * 上传文件（FormData 格式）
 * @param {string} path — 接口路径
 * @param {File} file — 要上传的文件对象
 * @param {boolean} auth — 是否需要 JWT
 */
async function apiUpload(path, file, auth) {
  if (auth === undefined) auth = true;
  try {
    var formData = new FormData();
    formData.append('file', file);
    var headers = {};
    if (auth) {
      var token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }
    var resp = await fetch(API_CONFIG.BASE_URL + path, {
      method: 'POST',
      headers: headers,
      body: formData
    });
    if (resp.status === 401) {
      if (typeof doLogout === 'function') doLogout();
      throw new Error('登录已过期，请重新登录');
    }
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || data.message || '上传失败');
    return data;
  } catch (e) {
    if (e.name === 'TypeError' || e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      API_CONFIG.offlineMode = true;
      console.warn('[API] 后端不可达，进入离线模式');
    }
    throw e;
  }
}

// ==================== 业务 API 封装 ====================

/**
 * 用户登录 — POST /api/auth/login
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} — { code, message, data: { access_token, token_type, user_id, username } }
 */
async function apiLogin(username, password) {
  var result = await apiPost('/api/auth/login', {
    username: username,
    password: password
  }, false);  // 登录不需要 JWT
  // 保存 Token（server.py 返回 { success, token, user }，token 在顶层）
  if (result.token) {
    saveToken(result.token);
  } else if (result.data && result.data.access_token) {
    saveToken(result.data.access_token);
  }
  return result;
}

/**
 * 获取数据大屏统计 — GET /api/carbon/dashboard
 * @returns {Promise<object>} — { total_records, scope_summary, sources, recent_records }
 */
async function apiGetDashboard() {
  return apiGet('/api/carbon/dashboard', true);
}

/**
 * 上传碳排放 Excel 文件 — POST /api/carbon/upload
 * @param {File} file — .xlsx 文件
 * @returns {Promise<object>} — { records_created, errors }
 */
async function apiUploadCarbon(file) {
  return apiUpload('/api/carbon/upload', file, true);
}

/**
 * 健康检查 — GET /（FastAPI 根路径，公开 JSON，无需鉴权）
 * @returns {Promise<boolean>} — 后端是否在线
 */
async function apiHealthCheck() {
  try {
    var data = await apiGet('/', false);
    API_CONFIG.offlineMode = false;
    updateConnBadge(!!data);
    return !!data;
  } catch (e) {
    API_CONFIG.offlineMode = true;
    updateConnBadge(false);
    return false;
  }
}

// ==================== WebSocket 实时数据 ====================
var _wsRealtime = null;
var _wsReconnectTimer = null;

/**
 * 连接 WebSocket 实时数据推送
 * @param {function} onData — 收到数据时的回调 (payload) => void
 */
function connectRealtimeWS(onData) {
  if (_wsRealtime && _wsRealtime.readyState === WebSocket.OPEN) {
    return; // 已连接
  }
  try {
    _wsRealtime = new WebSocket(API_CONFIG.WS_URL + '/api/ws/realtime');
    _wsRealtime.onopen = function () {
      console.log('[WebSocket] 实时数据已连接');
      API_CONFIG.offlineMode = false;
      if (_wsReconnectTimer) { clearTimeout(_wsReconnectTimer); _wsReconnectTimer = null; }
    };
    _wsRealtime.onmessage = function (event) {
      try {
        var payload = JSON.parse(event.data);
        if (onData) onData(payload);
      } catch (e) {
        console.warn('[WebSocket] 数据解析失败:', e);
      }
    };
    _wsRealtime.onclose = function () {
      console.log('[WebSocket] 连接关闭，5秒后重连');
      _wsReconnectTimer = setTimeout(function () { connectRealtimeWS(onData); }, 5000);
    };
    _wsRealtime.onerror = function () {
      // WebSocket 连接失败，自动关闭后会触发 onclose 进行重连
    };
  } catch (e) {
    console.warn('[WebSocket] 连接失败:', e.message);
  }
}

/**
 * 断开 WebSocket 连接
 */
function disconnectRealtimeWS() {
  if (_wsReconnectTimer) { clearTimeout(_wsReconnectTimer); _wsReconnectTimer = null; }
  if (_wsRealtime) {
    _wsRealtime.close();
    _wsRealtime = null;
  }
}

// ==================== 初始化 ====================
// 页面加载时自动检测后端状态
(function () {
  setTimeout(function () {
    apiHealthCheck().then(function (ok) {
      if (ok) {
        console.log('[API] 后端连接正常，API 模式已激活');
      } else {
        console.log('[API] 后端离线，使用本地模式');
      }
    });
  }, 500);
})();
