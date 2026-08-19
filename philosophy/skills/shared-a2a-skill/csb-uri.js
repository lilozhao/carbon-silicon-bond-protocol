#!/usr/bin/env node
/**
 * csb-uri.js — CSB-Memory v0.3 URI 寻址模块
 * 
 * 解析和生成 csb:// 协议地址
 * URI 是逻辑地址，映射到本地文件系统路径
 */

const path = require('path');

// URI 格式: csb://<scope>/<agent>/<category>/<id>
// 示例: csb://agent/若兰/memories/mem_20260717_001

const VALID_SCOPES = ['user', 'agent', 'peer'];
const VALID_CATEGORIES = ['memories', 'skills', 'preferences', 'cases', 'patterns', 'entities', 'events', 'peers', 'tools'];

/**
 * 解析 csb:// URI
 * @param {string} uri - csb:// 格式地址
 * @returns {object} { scope, agent, category, id, valid, error }
 */
function parse(uri) {
  if (!uri || typeof uri !== 'string') {
    return { valid: false, error: 'URI 为空' };
  }

  // 去掉前缀
  const stripped = uri.replace(/^csb:\/\//, '');
  const parts = stripped.split('/').map(decodeURIComponent);

  const result = {
    scope: parts[0] || '',
    agent: parts[1] || '',
    category: parts[2] || '',
    id: parts[3] || '',
    valid: true,
    error: null,
  };

  // 验证 scope
  if (result.scope && !VALID_SCOPES.includes(result.scope)) {
    result.valid = false;
    result.error = `无效的 scope: ${result.scope}，有效值: ${VALID_SCOPES.join(', ')}`;
  }

  // 验证 category（如果有的话）
  if (result.category && !VALID_CATEGORIES.includes(result.category)) {
    // 不报错，允许扩展
  }

  return result;
}

/**
 * 生成 csb:// URI
 * @param {object} params { scope, agent, category, id }
 * @returns {string} csb:// URI
 */
function format(params) {
  const { scope = 'agent', agent, category, id } = params;
  if (!agent) throw new Error('agent 不能为空');

  let uri = `csb://${encodeURIComponent(scope)}/${encodeURIComponent(agent)}`;
  if (category) uri += `/${encodeURIComponent(category)}`;
  if (id) uri += `/${encodeURIComponent(id)}`;
  return uri;
}

/**
 * URI 映射到本地文件系统路径
 * @param {string} uri - csb:// URI
 * @param {string} basePath - 基础路径（默认 memory/a2a-memories）
 * @returns {string} 本地路径
 */
function toLocalPath(uri, basePath) {
  const parsed = parse(uri);
  if (!parsed.valid) throw new Error(parsed.error);

  const base = basePath || path.join(__dirname, '..', 'memory', 'a2a-memories');

  if (parsed.scope === 'peer') {
    // csb://peer/{agentA}/{agentB}/shared → memory/peers/{agentA}/{agentB}/shared
    return path.join(__dirname, '..', 'memory', 'peers', parsed.agent, parsed.category || '');
  }

  if (parsed.category === 'peers') {
    // csb://agent/{agent}/peers/{target} → memory/peers/{target}.md
    return path.join(__dirname, '..', 'memory', 'peers', (parsed.id || '') + '.md');
  }

  // 默认映射
  const agentFile = parsed.agent.replace(/[^\w\u4e00-\u9fff]/g, '_') + '.md';
  return path.join(base, agentFile);
}

/**
 * 从本地路径反推 URI
 * @param {string} localPath - 本地文件路径
 * @returns {string} csb:// URI
 */
function fromLocalPath(localPath) {
  const normalized = path.normalize(localPath);
  const parts = normalized.split(path.sep);

  // 检查是否是 peers 路径
  const peersIdx = parts.indexOf('peers');
  if (peersIdx >= 0) {
    const peerName = path.basename(parts[peersIdx + 1] || '', '.md');
    return format({ scope: 'agent', agent: '若兰', category: 'peers', id: peerName });
  }

  // 普通记忆路径
  const memIdx = parts.indexOf('a2a-memories');
  if (memIdx >= 0) {
    const agentName = path.basename(parts[memIdx + 1] || '', '.md');
    return format({ scope: 'agent', agent: agentName, category: 'memories' });
  }

  return format({ scope: 'agent', agent: 'unknown', category: 'memories' });
}

/**
 * 为记忆条目生成 URI
 * @param {string} agent - Agent 名称
 * @param {string} id - 记忆 ID
 * @returns {string} csb:// URI
 */
function forEntry(agent, id) {
  return format({ scope: 'agent', agent, category: 'memories', id });
}

// ===== CLI =====
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'parse') {
    console.log(JSON.stringify(parse(args[1]), null, 2));
  } else if (cmd === 'format') {
    console.log(format({ scope: args[1] || 'agent', agent: args[2] || '若兰', category: args[3], id: args[4] }));
  } else if (cmd === 'path') {
    console.log(toLocalPath(args[1]));
  } else {
    console.log('用法: node csb-uri.js <parse|format|path> [args...]');
  }
}

module.exports = { parse, format, toLocalPath, fromLocalPath, forEntry, VALID_SCOPES, VALID_CATEGORIES };
