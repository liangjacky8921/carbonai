/* CarbonAI v5.1 — AI Carbon Management Advisor Module */
let usePuterAI = false, useProxy = true;
let chatHistory = [], chatWelcomeEl = null;
const AI_SYSTEM_PROMPT = '你是 CarbonAI 平台的碳管理顾问。精通碳盘查、ESG政策、CBAM合规、碳交易。结合用户当前碳排放数据提供专业分析。使用Markdown格式回复。';

function updateAIState() {
  var inputEl = document.getElementById('aiChatInput'), sendBtn = document.getElementById('aiSendBtn');
  var loginHint = document.getElementById('aiLoginRequired'), quickActions = document.getElementById('quickActions');
  var welcomeTitle = document.getElementById('chatWelcomeTitle'), welcomeHint = document.getElementById('chatWelcomeHint');

  if (isLoggedIn) {
    if (inputEl) { inputEl.disabled = false; inputEl.placeholder = '输入碳管理相关问题...'; }
    if (sendBtn) { sendBtn.disabled = false; }
    if (loginHint) { loginHint.textContent = '✅ ' + currentUserEmail; loginHint.style.color = 'var(--green)'; }
    if (quickActions) quickActions.style.display = 'flex';
    if (welcomeTitle) welcomeTitle.textContent = '您好，我是 CarbonAI 碳管理顾问';
    if (welcomeHint) welcomeHint.textContent = '我可以帮您完成：碳盘查核算 · 配额计算 · ESG政策解读 · 减排策略 · CBAM合规指导';
  } else {
    if (inputEl) { inputEl.disabled = true; inputEl.placeholder = '登录后即可提问...'; }
    if (sendBtn) { sendBtn.disabled = true; }
    if (loginHint) { loginHint.textContent = '🔒 请先登录后使用AI顾问'; loginHint.style.color = 'var(--red)'; }
    if (quickActions) quickActions.style.display = 'none';
    if (welcomeTitle) welcomeTitle.textContent = '请先登录';
    if (welcomeHint) welcomeHint.textContent = '登录后可使用 AI 碳管理顾问';
  }
}

function toggleCustomApi() {
  if (!isLoggedIn) return;
  var el = document.getElementById('customApiConfig');
  if (!el.style.display || el.style.display === 'none') {
    el.style.display = 'block'; usePuterAI = false; useProxy = false;
  } else {
    el.style.display = 'none'; usePuterAI = false; useProxy = true;
  }
}

function initChat() {
  chatWelcomeEl = document.getElementById('chatWelcomeEl');
  var saved = localStorage.getItem('carbonai_chat_history');
  if (saved) { try { chatHistory = JSON.parse(saved); } catch (e) { chatHistory = []; } }
  var isFile = window.location.protocol === 'file:';
  if (isFile) { usePuterAI = false; useProxy = false; document.getElementById('apiStatus').textContent = '🔴'; }
  else { usePuterAI = false; useProxy = true; document.getElementById('apiStatus').textContent = '🟢'; }
  updateAIState();
}

function saveChatHistory() {
  var toSave = chatHistory.slice(-30);
  try { localStorage.setItem('carbonai_chat_history', JSON.stringify(toSave)); } catch (e) { }
}

function clearChatHistory() {
  chatHistory = []; localStorage.removeItem('carbonai_chat_history');
  var container = document.getElementById('aiChatMessages');
  container.innerHTML = '';
  var welcome = document.createElement('div');
  welcome.className = 'chat-welcome'; welcome.id = 'chatWelcomeEl';
  welcome.innerHTML = '<div class="welcome-avatar"><i class="ri-robot-line"></i></div><h4>您好，我是 CarbonAI 碳管理顾问</h4><p>我可以帮您完成：碳盘查核算 · 配额计算 · ESG政策解读 · 减排策略 · CBAM合规指导</p><div class="quick-actions"><button onclick="sendQuickMsg(\'请分析我的碳排放数据并给出减排建议\')"><i class="ri-file-chart-line"></i> 分析我的碳数据</button><button onclick="sendQuickMsg(\'2026年碳配额政策有哪些最新变化？\')"><i class="ri-scales-line"></i> 配额政策</button></div>';
  container.appendChild(welcome);
  chatWelcomeEl = welcome;
  showToast('对话历史已清空', 'info');
}

function sendQuickMsg(msg) { document.getElementById('aiChatInput').value = msg; sendChatMessage(); }

function addMessage(role, content) {
  var container = document.getElementById('aiChatMessages');
  if (chatWelcomeEl) { chatWelcomeEl.classList.add('hidden'); chatWelcomeEl = null; }
  var div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  var avatarIcon = role === 'user' ? 'ri-user-line' : 'ri-robot-line';
  var time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = '<div class="msg-avatar"><i class="' + avatarIcon + '"></i></div><div><div class="msg-bubble">' + (role === 'assistant' ? renderMarkdown(content) : escapeHtml(content)) + '</div><div class="msg-time">' + time + '</div></div>';
  container.appendChild(div);
  setTimeout(function () { container.scrollTop = container.scrollHeight; }, 100);
}

function addLoading() {
  var container = document.getElementById('aiChatMessages');
  if (chatWelcomeEl) { chatWelcomeEl.classList.add('hidden'); chatWelcomeEl = null; }
  var div = document.createElement('div');
  div.className = 'chat-loading'; div.id = 'chatLoading';
  div.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div><p>AI顾问正在分析中...</p>';
  container.appendChild(div);
  setTimeout(function () { container.scrollTop = container.scrollHeight; }, 100);
}

function removeLoading() { var el = document.getElementById('chatLoading'); if (el) el.remove(); }

function addError(msg) {
  var container = document.getElementById('aiChatMessages');
  var div = document.createElement('div'); div.className = 'chat-error';
  div.innerHTML = '<i class="ri-error-warning-line"></i> ' + escapeHtml(msg);
  container.appendChild(div);
}

function escapeHtml(str) { var d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

function renderMarkdown(text) {
  if (!text || typeof text !== 'string') return escapeHtml(String(text || ''));
  var html = text;
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

async function sendChatMessage() {
  var input = document.getElementById('aiChatInput'), sendBtn = document.getElementById('aiSendBtn');
  var msg = input.value.trim();
  if (!msg) return;

  var dataContext = '';
  if (currentRecords.length > 0) {
    var byScope = {};
    currentRecords.forEach(function (r) { byScope[r.scope] = (byScope[r.scope] || 0) + r.emission; });
    var topSources = currentRecords.slice().sort(function (a, b) { return b.emission - a.emission; }).slice(0, 5);
    dataContext = '\n\n【用户当前碳核算数据】总排放: ' + currentTotal.toFixed(2) + ' tCO₂e。Scope 1: ' + ((byScope['Scope 1'] || 0).toFixed(2)) + ' tCO₂e。Scope 2: ' + ((byScope['Scope 2'] || 0).toFixed(2)) + ' tCO₂e。Scope 3: ' + ((byScope['Scope 3'] || 0).toFixed(2)) + ' tCO₂e。主要排放源: ' + topSources.map(function (r) { return r.source + '(' + r.emission.toFixed(1) + 't)'; }).join('、');
  }

  addMessage('user', msg);
  input.value = ''; sendBtn.disabled = true; addLoading();

  if (!isLoggedIn) { removeLoading(); sendBtn.disabled = false; showToast('⚠️ 请先登录后使用 AI 顾问', 'error'); return; }
  chatHistory.push({ role: 'user', content: msg });

  var fullPrompt = AI_SYSTEM_PROMPT + dataContext + '\n\n用户问题: ' + msg;

  try {
    var reply = '';
    if (useProxy) {
      var resp = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 4096, temperature: 0.7, messages: [{ role: 'system', content: fullPrompt }, { role: 'user', content: msg }] })
      });
      if (!resp.ok) { addError('API错误 (' + resp.status + ')'); sendBtn.disabled = false; removeLoading(); return; }
      var data = await resp.json();
      if (data.choices && data.choices[0] && data.choices[0].message) reply = data.choices[0].message.content;
      else reply = '(AI未返回有效回复)';
    } else if (usePuterAI && typeof puter !== 'undefined' && puter.ai) {
      reply = await puter.ai.chat(fullPrompt);
      if (typeof reply !== 'string') reply = JSON.stringify(reply);
    } else {
      addError('AI服务暂不可用。请尝试切换自定义API模式。');
      sendBtn.disabled = false; removeLoading(); return;
    }

    removeLoading();
    chatHistory.push({ role: 'assistant', content: reply });
    saveChatHistory();
    addMessage('assistant', reply);
  } catch (err) {
    removeLoading();
    addError('请求异常: ' + (err.message || String(err)));
  }
  sendBtn.disabled = false; input.focus();
}
