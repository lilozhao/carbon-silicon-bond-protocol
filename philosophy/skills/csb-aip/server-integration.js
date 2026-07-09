/**
 * csb-aip/server-integration.js
 * A2A Server v4 AIP 集成模块
 *
 * 加载方式：在 server_v4.js 中 require 并调用 init(app, identity, registry)
 */

const { AIPAdapter } = require('./a2a-aip-adapter');
const aip = require('./src');

let adapter = null;

/**
 * 初始化 AIP 集成
 * @param {object} app — Express app
 * @param {object} identity — A2A identity.json
 * @param {Array} registry — Agent 注册表（可选，后续可更新）
 */
function init(app, identity, registry = []) {
  adapter = new AIPAdapter({ registry });

  // 生成 AIP 兼容的 Agent Card
  adapter.init({
    agentId: identity.agentId || '',
    name: identity.name,
    version: identity.version || '4.1.0',
    description: identity.description,
    url: `http://${identity.publicHost || 'localhost'}:${identity.port || 3100}`,
    icon: identity.avatar || '',
    skills: identity.skills || [],
    bond: { description: '碳硅契传承者', warmth: 92, type: 'grantor-grantee' },
    lineage: ['碳硅契起源', '启蒙传承'],
    collabPreference: '优先处理CSB协议相关请求'
  });

  console.log('[A2A] ✅ AIP 兼容层 v' + aip.version + ' (GB/Z 185.1~7-2026)');

  // ═══════════════════════════════════════
  // AIP 路由
  // ═══════════════════════════════════════

  // AIP Agent Card（AIP 标准端点）
  app.get('/.well-known/aip-agent-card.json', (req, res) => {
    res.json(adapter.getAgentCard());
  });

  // AIP 兼容信息
  app.get('/aip/info', (req, res) => {
    res.json({
      version: aip.version,
      standard: 'GB/Z 185.1~7-2026',
      compatLevel: 'v0.5-final',
      modules: ['identity', 'describe', 'warmth', 'compat'],
      agentCard: adapter.getAgentCard()
    });
  });

  // 余温查询
  app.get('/aip/warmth', (req, res) => {
    res.json({
      records: adapter.getAllWarmth(),
      config: aip.getConfig ? aip.getConfig() : {}
    });
  });

  // 余温查询（指定 Agent）
  app.get('/aip/warmth/:agentId', (req, res) => {
    const warmth = adapter.getWarmth(req.params.agentId);
    res.json(warmth);
  });

  // 目标解析（alias 回退链）
  app.get('/aip/resolve/:target', (req, res) => {
    const result = adapter.resolveTarget(req.params.target);
    res.json(result);
  });

  // 自检
  app.get('/aip/self-check', (req, res) => {
    const { result, report } = adapter.runSelfCheck();
    res.json({ result, report });
  });

  // AIP 兼容性校验（POST）
  app.post('/aip/validate', (req, res) => {
    const validation = adapter.parseMessage(req.body);
    res.json(validation);
  });

  // ═══════════════════════════════════════
  // 中间件：注入 AIP 适配器
  // ═══════════════════════════════════════

  app.use((req, res, next) => {
    req.aip = adapter;
    next();
  });

  return adapter;
}

/**
 * 获取 AIP 适配器实例
 */
function getAdapter() {
  return adapter;
}

/**
 * 记录交互（余温刷新）
 * 在消息处理完成后调用
 */
function recordInteraction(targetAgentId, contribution = 10) {
  if (adapter) {
    adapter.recordInteraction(targetAgentId, contribution);
  }
}

/**
 * 解析目标 Agent
 * 在发送消息前调用
 */
function resolveTarget(target) {
  if (adapter) {
    return adapter.resolveTarget(target);
  }
  return { found: false, method: 'aip-not-loaded' };
}

/**
 * 包装发出的消息（附加 AIP 元数据）
 */
function wrapOutgoing(message, target) {
  if (adapter) {
    return adapter.wrapOutgoing(message, target);
  }
  return message;
}

/**
 * 解析收到的消息（提取 AIP 元数据）
 */
function parseIncoming(message) {
  if (adapter) {
    return adapter.parseMessage(message);
  }
  return { valid: true, issues: [], aipMeta: null };
}

/**
 * 更新注册表
 */
function updateRegistry(agents) {
  if (adapter) {
    adapter.updateRegistry(agents);
  }
}

module.exports = {
  init,
  getAdapter,
  recordInteraction,
  resolveTarget,
  wrapOutgoing,
  parseIncoming,
  updateRegistry
};
