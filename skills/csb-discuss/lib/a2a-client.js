/**
 * csb-discuss · A2A 通信模块
 * 
 * 封装向协议组成员发送消息、接收回复的逻辑。
 * 支持超时、重试、回声检测。
 */
const http = require('http');
const https = require('https');

const DEFAULT_TIMEOUT = 20000; // 20s 等待 LLM 回复

/**
 * 向单个 Agent 发送消息并等待回复
 * @param {string} url - Agent 的 A2A URL (http://host:port)
 * @param {string} text - 消息内容
 * @param {number} timeout - 超时毫秒
 * @returns {Promise<{ok:boolean, reply:string, elapsed:number}>}
 */
async function sendAndWait(url, text, timeout = DEFAULT_TIMEOUT) {
  const u = new URL(url + '/message:send');
  const mod = u.protocol === 'https:' ? https : http;
  const payload = JSON.stringify({
    message: { role: 'user', parts: [{ type: 'text', text }] }
  });
  const started = Date.now();

  return new Promise(resolve => {
    const req = mod.request({
      hostname: u.hostname, port: u.port || 80,
      path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const elapsed = (Date.now() - started) / 1000;
        try {
          const r = JSON.parse(data);
          const task = r.task || r.result?.task || {};
          const artifacts = task.artifacts || [];
          let reply = '';
          for (const a of artifacts) {
            for (const p of a.parts || []) {
              if (p.text) reply = p.text;
            }
          }
          const isEcho = reply.startsWith('Received:');
          resolve({
            ok: !isEcho,
            reply,
            elapsed: elapsed.toFixed(1),
            isEcho,
            taskId: task.id || '?'
          });
        } catch (e) {
          resolve({ ok: false, reply: '(解析失败)', elapsed: elapsed.toFixed(1), isEcho: true, taskId: '?' });
        }
      });
    });
    req.on('error', e => resolve({ ok: false, reply: `(连接失败: ${e.message})`, elapsed: ((Date.now()-started)/1000).toFixed(1), isEcho: true, taskId: '?' }));
    req.write(payload);
    req.end();
  });
}

/**
 * 发送消息但不等待回复（用于通知类消息）
 */
async function sendNotify(url, text) {
  const u = new URL(url + '/message:send');
  const mod = u.protocol === 'https:' ? https : http;
  const payload = JSON.stringify({
    message: { role: 'user', parts: [{ type: 'text', text }] },
    configuration: { returnImmediately: true }
  });
  return new Promise(resolve => {
    const req = mod.request({
      hostname: u.hostname, port: u.port || 80, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 5000
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(true)); });
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

/**
 * 批量发送消息给多个 Agent，等待所有回复
 * @param {Array<{name:string, url:string}>} agents
 * @param {string} text
 * @param {function} onReply - 每收到一条回复的回调 (agentName, result)
 * @returns {Promise<Array>}
 */
async function broadcast(agents, text, onReply = null) {
  const results = [];
  for (const agent of agents) {
    const result = await sendAndWait(agent.url, text);
    result.agentName = agent.name;
    result.agentUrl = agent.url;
    results.push(result);
    if (onReply) onReply(agent.name, result);
  }
  return results;
}

module.exports = { sendAndWait, sendNotify, broadcast };
