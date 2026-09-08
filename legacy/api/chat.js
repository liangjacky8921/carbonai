// Vercel Serverless Function — AI Chat Proxy
// Secrets are in Vercel env vars ONLY — never in frontend source.

function isAllowed(origin, referer, host) {
  if (!host) return false;
  var ownDomains = ['carbontool.cn', 'localhost', '127.0.0.1'];
  var isOwnHost = false;
  for (var i = 0; i < ownDomains.length; i++) {
    if (host.indexOf(ownDomains[i]) !== -1) { isOwnHost = true; break; }
  }
  if (!isOwnHost) return false;
  // Must have either Origin or Referer from our domain (blocks direct API scraping)
  var source = origin || referer || '';
  if (!source) return false;
  for (var j = 0; j < ownDomains.length; j++) {
    if (source.indexOf(ownDomains[j]) !== -1) return true;
  }
  return false;
}

export default async function handler(req, res) {
  // === Security: Origin check ===
  var origin = req.headers.origin || '';
  var referer = req.headers.referer || '';
  var host = req.headers.host || '';
  if (!isAllowed(origin, referer, host)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin || 'https://www.carbontool.cn');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var API_URL = process.env.API_URL;
  var API_KEY = process.env.API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'Server key not configured' });
  if (!API_URL) return res.status(500).json({ error: 'Server URL not configured' });

  if (API_URL.indexOf('/v1/messages') === -1) {
    API_URL = API_URL.replace(/\/$/, '') + '/v1/messages';
  }

  try {
    var body = req.body;
    var model = body.model || 'deepseek-chat';
    var maxTokens = body.max_tokens || 4096;

    var messages = body.messages || [];
    var systemContent = '';
    var chatMessages = [];
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].role === 'system') {
        systemContent += (systemContent ? '\n\n' : '') + messages[i].content;
      } else {
        chatMessages.push(messages[i]);
      }
    }

    var reqBody = { model: model, max_tokens: maxTokens, messages: chatMessages };
    if (systemContent) reqBody.system = systemContent;

    var resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(reqBody),
    });

    var text = await resp.text();
    var data;
    try { data = JSON.parse(text); } catch (e) { data = null; }

    if (!resp.ok) {
      var errMsg = (data && data.error && data.error.message)
        ? data.error.message
        : (text.substring(0, 300) || ('API error ' + resp.status));
      return res.status(resp.status).json({ error: errMsg });
    }

    if (!data) return res.status(502).json({ error: 'Empty response from upstream' });

    var replyText = '';
    if (Array.isArray(data.content)) {
      replyText = data.content.map(function(b) { return b.text || ''; }).join('');
    } else if (typeof data.content === 'string') {
      replyText = data.content;
    }
    if (!replyText && data.choices && data.choices[0] && data.choices[0].message) {
      replyText = data.choices[0].message.content;
    }

    return res.status(200).json({
      choices: [{ message: { role: 'assistant', content: replyText } }],
      usage: data.usage || {},
    });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Proxy error' });
  }
}
