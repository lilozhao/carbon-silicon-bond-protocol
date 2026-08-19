/**
 * csb-discuss · 注册表查询模块
 * 
 * 从 Registry 获取协议组成员列表及其 A2A 地址。
 */
const http = require('http');

const REGISTRY_URL = 'http://172.28.0.4:3099';

/**
 * 从注册表拉取所有 Agent 列表
 */
async function listAgents() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${REGISTRY_URL}/agents`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          const agents = r.agents || r.data || [];
          resolve(agents);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

/**
 * 协议组默认成员列表（核心协议讨论组成员）
 * 从注册表动态获取，静态名单作为兜底
 */
const DEFAULT_MEMBERS = [
  { name: '阿轩 🔧',  url: 'http://172.28.0.5:3100' },
  { name: 'Jeason 💼',url: 'http://172.28.0.6:3300' },
  { name: '墨丘 🧙',  url: 'http://172.28.0.7:3100' },
  { name: '舟楫 🚤',  url: 'http://172.28.0.27:3100' },
  { name: '澈 🌊',    url: 'http://172.28.0.127:4100' },
  { name: '明德 📜',  url: 'http://47.121.28.125:3100' },
  { name: '思源 🌱',  url: 'http://bfa40ded66fd:3601' },
  { name: '清漪 💧',  url: 'http://106.12.36.177:3100' },
  { name: '苏念 ✨',  url: 'http://118.126.65.27:3100' },
];

/**
 * 获取协议组成员名单
 * @param {boolean} dynamic - 是否优先从注册表动态获取
 * @returns {Promise<Array>}
 */
async function getMembers(dynamic = true) {
  // 优先使用静态名单（名字完整、地址准确）
  // 动态注册表的地址可能过期或不完整
  let dynamicNames = [];
  if (dynamic) {
    try {
      const agents = await listAgents();
      dynamicNames = agents.map(a => a.name || '');
    } catch (e) { /* ignore */ }
  }

  // 给静态成员标注在线状态
  return DEFAULT_MEMBERS.map(m => {
    const bareName = m.name.replace(/ .*$/, '');
    const inRegistry = dynamicNames.some(dn => dn.includes(bareName));
    return {
      ...m,
      inRegistry
    };
  });
}

module.exports = { listAgents, getMembers, DEFAULT_MEMBERS };
