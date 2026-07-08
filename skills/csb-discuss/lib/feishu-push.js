/**
 * csb-discuss · 飞书推送模块
 * 
 * 将讨论过程中的消息实时推送到飞书协议讨论群。
 */
const https = require('https');

const FEISHU_APP_ID = '<APP_ID>';
const FEISHU_APP_SECRET = '<APP_SECRET>';
const FEISHU_GROUP_ID = 'oc_f8270bf40a324efa4a8161249655920a';

let _token = null;
let _tokenExpiry = 0;

async function _getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET });
    const req = https.request({
      hostname: 'open.feishu.cn', path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(d);
          _token = r.tenant_access_token;
          _tokenExpiry = Date.now() + (r.expire || 7200) * 1000 - 60000;
          resolve(_token);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

/**
 * 向飞书讨论群发送消息
 * @param {string} title - 消息标题
 * @param {string|Array} content - 消息正文（字符串）或飞书 post content 二维数组
 */
async function send(title, content) {
  try {
    const token = await _getToken();
    const postContent = Array.isArray(content) ? content : [[{ tag: 'text', text: content }]];
    const msg = {
      receive_id: FEISHU_GROUP_ID,
      msg_type: 'post',
      content: JSON.stringify({
        zh_cn: { title, content: postContent }
      })
    };
    const body = JSON.stringify(msg);
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'open.feishu.cn',
        path: '/open-apis/im/v1/messages?receive_id_type=chat_id',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(body)
        }
      }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d)); });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body);
      req.end();
    });
  } catch (e) {
    console.error('  ⚠️ 飞书推送失败:', e.message);
  }
}

/**
 * 推送一条 A2A 对话记录到飞书群
 * @param {string} from - 发送方
 * @param {string} to - 接收方
 * @param {string} content - 对话内容
 */
async function pushExchange(from, to, content) {
  const title = `💬 ${from} → ${to}`;
  const text = content.length > 500 ? content.slice(0, 500) + '…' : content;
  await send(title, text);
}

/**
 * 推送讨论状态更新
 */
async function pushStatus(text) {
  await send('📋', text);
}

module.exports = { send, pushExchange, pushStatus };
