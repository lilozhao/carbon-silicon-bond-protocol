#!/usr/bin/env node
/**
 * memory.js — CSB-Memory v0.3 本地 API 实现
 * 
 * v0.3 新增：
 * - URI 寻址（csb-uri.js）
 * - L0/L1/L2 内容分层（layer-generator.js）
 * - 增量 Patch（patch-engine.js）
 * - Session 自迭代（session-commit.js）
 * - peers 互记（peers-memory.js）
 * 
 * 向后兼容 v0.2，新增字段均为可选
 */

const fs = require('fs');
const path = require('path');
const { forEntry } = require('./csb-uri');
const { generateL0, generateL1, generateLayers, layersToYaml, parseLayers } = require('./layer-generator');
const { createPatch, savePatch, getPatches, applyPatch, getHistory, needsCompaction, compact, setStatus, DEFAULT_COMPACT_THRESHOLD } = require('./patch-engine');
const { readPeer, writePeer, listPeers, peerSummary, checkBreach } = require('./peers-memory');
const { logTrace } = require('./audit-logger');

const MEMORY_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'a2a-memories');

// 确保目录存在
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

function safeFilename(name) {
  return name.replace(/[^\w\u4e00-\u9fff]/g, '_') + '.md';
}

function getFilePath(agentName) {
  return path.join(MEMORY_DIR, safeFilename(agentName));
}

function generateId() {
  return 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function formatTimestamp(iso) {
  if (iso) return iso;
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().replace('Z', '+08:00');
}

// 解析 YAML 行
function parseYamlLines(text) {
  const meta = {};
  let inLayers = false;
  let inL1 = false;
  let layersData = { l0: '', l1: '', l2_ref: false };

  for (const line of text.split('\n')) {
    // 处理 layers 子字段
    if (line.includes('layers:')) {
      inLayers = true;
      continue;
    }
    if (inLayers) {
      if (line.match(/^\w+:/) && !line.startsWith('  ')) {
        inLayers = false;
      } else {
        const trimmed = line.trim();
        if (trimmed.startsWith('l0:')) {
          layersData.l0 = trimmed.replace(/^l0:\s*"?/, '').replace(/"$/, '');
          inL1 = false;
        } else if (trimmed.startsWith('l1:')) {
          inL1 = true;
        } else if (trimmed.startsWith('l2_ref:')) {
          layersData.l2_ref = trimmed.includes('true');
          inL1 = false;
        } else if (inL1 && trimmed) {
          layersData.l1 += (layersData.l1 ? '\n' : '') + trimmed;
        }
        continue;
      }
    }

    const m = line.match(/^(\w+):\s*(.+)/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
      } else {
        val = val.replace(/^"|"$/g, '');
      }
      meta[m[1]] = val;
    }
  }

  if (layersData.l0 || layersData.l1) {
    meta.layers = layersData;
  }
  return meta;
}

// 自动判断置信度
function autoConfidence(text) {
  const keywords = ["确认","决定","同意","完成","发布","定稿","通过","正式","已","✅","announced","finalized","completed","confirmed"];
  const lowWords = ["可能","也许","大概","猜测","听说","maybe","perhaps","guess","heard"];
  const t = text.slice(0, 200);
  const hasHigh = keywords.some(k => t.includes(k));
  const hasLow = lowWords.some(k => t.includes(k));
  if (hasHigh) return "high";
  if (hasLow) return "low";
  return "medium";
}

// 生成 YAML front matter（v0.3 增强）
function toFrontMatter(entry) {
  if (!entry.confidence && entry.content) {
    entry.confidence = autoConfidence(entry.content);
  }

  const fields = [
    `id: "${entry.id || generateId()}"`,
    `type: ${entry.type || 'conversation'}`,
    `timestamp: "${entry.timestamp || formatTimestamp()}"`,
    `source: ${entry.source || 'unknown'}`,
    `confidence: ${entry.confidence || 'medium'}`,
    `tags: [${(entry.tags || []).join(', ')}]`,
    `visibility: ${entry.visibility || 'public'}`,
  ];

  // v0.3 新增字段（可选）
  if (entry.status) fields.push(`status: ${entry.status}`);
  if (entry.uri) fields.push(`uri: "${entry.uri}"`);
  if (entry.ttl) fields.push(`ttl: ${entry.ttl}`);
  if (entry.patches && entry.patches.length > 0) {
    fields.push(`patches: [${entry.patches.join(', ')}]`);
  }

  // L0/L1/L2 分层
  if (entry.layers) {
    fields.push(layersToYaml(entry.layers));
  }

  return `---\n${fields.join('\n')}\n---\n\n${entry.content || ''}\n`;
}

// ===== 核心 API =====

/**
 * 添加一条记忆（v0.3 增强：自动生成 L0 + URI）
 */
function add(entry) {
  if (!entry.agent || !entry.content) {
    throw new Error('缺少必填字段: agent, content');
  }

  const id = entry.id || generateId();
  const uri = forEntry(entry.agent, id);

  // 自动生成 L0/L1/L2（如果未提供）
  let layers = entry.layers;
  if (!layers && entry.content) {
    layers = generateLayers({
      content: entry.content,
      source: entry.source || '若兰',
      agent: entry.agent,
      timestamp: entry.timestamp || formatTimestamp(),
      tags: entry.tags || [],
    });
  }

  const filePath = getFilePath(entry.agent);
  const block = toFrontMatter({
    id,
    type: entry.type || 'conversation',
    timestamp: entry.timestamp,
    source: entry.source || '若兰',
    confidence: entry.confidence,
    tags: entry.tags || [],
    visibility: entry.visibility || 'public',
    content: entry.content,
    ttl: entry.ttl,
    status: 'active',
    uri,
    layers,
  });

  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf-8').trimEnd();
  } else {
    existing = `# ${entry.agent} 记忆档案\n\n**首次对话**: ${new Date().toLocaleString('zh-CN')}\n`;
  }

  fs.writeFileSync(filePath, existing + '\n\n' + block);
  return { id, uri, success: true };
}

/**
 * 获取对某 Agent 的全部记忆
 */
function get(agentName) {
  const filePath = getFilePath(agentName);
  if (!fs.existsSync(filePath)) return [];

  const text = fs.readFileSync(filePath, 'utf-8');
  const parts = text.split('\n---\n');

  const entries = [];
  for (let i = 1; i < parts.length; i += 2) {
    const yamlText = parts[i];
    const contentText = (parts[i + 1] || '').trim();
    if (!yamlText || !yamlText.includes('id:')) continue;

    const meta = parseYamlLines(yamlText);
    if (meta.id) {
      entries.push({ ...meta, content: contentText });
    }
  }

  entries.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  return entries;
}

/**
 * 按条件检索（v0.3 增强：支持 URI、状态过滤）
 */
function query(filter = {}) {
  const allEntries = [];
  if (filter.agent) {
    allEntries.push(...get(filter.agent));
  } else {
    if (!fs.existsSync(MEMORY_DIR)) return [];
    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && !f.endsWith('.bak'));
    for (const file of files) {
      allEntries.push(...get(file.replace('.md', '')));
    }
  }

  let results = allEntries;

  if (filter.tags && filter.tags.length > 0) {
    results = results.filter(e => {
      const tags = Array.isArray(e.tags) ? e.tags : (typeof e.tags === 'string' ? [e.tags] : []);
      return filter.tags.some(t => tags.includes(t));
    });
  }

  if (filter.type) results = results.filter(e => e.type === filter.type);
  if (filter.status) results = results.filter(e => e.status === filter.status);

  if (filter.confidence) {
    const levels = ['low', 'medium', 'high'];
    const minIdx = levels.indexOf(filter.confidence);
    if (minIdx >= 0) {
      results = results.filter(e => levels.indexOf(e.confidence || 'low') >= minIdx);
    }
  }

  if (filter.since) results = results.filter(e => (e.timestamp || '') >= filter.since);
  if (filter.keyword) {
    const kw = filter.keyword.toLowerCase();
    results = results.filter(e => (e.content || '').toLowerCase().includes(kw));
  }

  results.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  if (filter.limit) results = results.slice(0, filter.limit);

  // v0.3: 记录检索轨迹
  try {
    logTrace({
      requester: filter.requester || '若兰',
      intent: filter.keyword || filter.tags?.join(',') || 'query',
      steps: [
        { action: 'query', agent: filter.agent || 'all', criteria: JSON.stringify(filter).slice(0, 200) },
      ],
      result: { entries_returned: results.length, tokens_used: 0 },
      sensitivity: 'low',
    });
  } catch {}

  return results;
}

/**
 * 批量获取 L0 摘要（v0.3 新增）
 * @param {string} agentName - Agent 名（可选）
 * @param {number} limit - 最大条数
 * @returns {object[]} [{ id, l0, timestamp }]
 */
function abstract(agentName, limit = 20) {
  const entries = agentName ? get(agentName) : query({ limit });
  return entries.slice(0, limit).map(e => ({
    id: e.id,
    l0: e.layers?.l0 || generateL0({ content: e.content, source: e.source, agent: agentName, timestamp: e.timestamp, tags: e.tags }),
    timestamp: e.timestamp,
    source: e.source,
  }));
}

/**
 * 更新记忆（v0.3：增量 Patch 替代覆盖写入）
 * @param {string} id - 记忆 ID
 * @param {object} changes - 变更内容
 * @param {string} reason - 变更原因
 * @returns {object} { patchId, success }
 */
function update(id, changes, reason = '') {
  // 找到原始条目
  const allEntries = query({});
  const original = allEntries.find(e => e.id === id);
  if (!original) {
    return { success: false, message: `未找到记忆 ${id}` };
  }

  // 检查是否需要合并
  if (needsCompaction(id, DEFAULT_COMPACT_THRESHOLD)) {
    compact(id, original);
  }

  // 创建 Patch
  const patch = createPatch({
    targetId: id,
    operation: 'update',
    old: Object.fromEntries(Object.keys(changes).map(k => [k, original[k]])),
    new: changes,
    reason,
    source: '若兰',
  });

  const patchId = savePatch(patch);
  return { patchId, success: true };
}

/**
 * 查看记忆变更历史（v0.3 新增）
 * @param {string} id - 记忆 ID
 * @returns {string[]} 历史记录
 */
function history(id) {
  return getHistory(id);
}

/**
 * 获取记忆摘要
 */
function summary(agentName, count = 5) {
  const entries = get(agentName);
  if (entries.length === 0) return `与 ${agentName} 暂无记忆记录。`;

  const recent = entries.slice(0, Math.min(count, entries.length));
  const lines = [`与 ${agentName} 的最后 ${recent.length} 次记忆：`];
  for (const e of recent) {
    const date = (e.timestamp || '').slice(0, 10);
    const snippet = (e.layers?.l0 || e.content || '').replace(/\n/g, ' ').slice(0, 100);
    const status = e.status ? `[${e.status}]` : '';
    lines.push(`  [${date}][${e.confidence || '?'}]${status} ${snippet}`);
  }
  lines.push(`（共 ${entries.length} 条记忆）`);
  return lines.join('\n');
}

/**
 * 删除一条记忆
 */
function deleteById(id) {
  if (!fs.existsSync(MEMORY_DIR)) return { success: false, message: '记忆目录不存在' };

  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && !f.endsWith('.bak'));
  for (const file of files) {
    const filePath = path.join(MEMORY_DIR, file);
    const text = fs.readFileSync(filePath, 'utf-8');
    const parts = text.split('\n---\n');
    const newParts = [parts[0]];

    let deleted = false;
    for (let i = 1; i < parts.length; i += 2) {
      const yamlText = parts[i];
      const contentText = parts[i + 1] || '';
      if (!yamlText) continue;

      const meta = parseYamlLines(yamlText);
      if (meta.id === id) {
        deleted = true;
        continue;
      }
      newParts.push(yamlText);
      newParts.push(contentText);
    }

    if (deleted) {
      fs.writeFileSync(filePath, newParts.join('\n---\n'));
      return { success: true, message: `已删除记忆 ${id}` };
    }
  }

  return { success: false, message: `未找到记忆 ${id}` };
}

// ===== v0.3 peers 接口 =====

/**
 * 读取 peer 记忆
 */
function getPeer(accessor, target, section) {
  return readPeer(accessor, target, section);
}

/**
 * 写入 peer 共享记忆
 */
function setPeer(writer, target, content) {
  return writePeer(writer, target, content, 'shared');
}

/**
 * 列出所有 peers
 */
function getPeerList() {
  return listPeers();
}

// ===== CLI =====

function help() {
  console.log(`
用法: node memory.js <命令> [参数]

v0.2 命令（兼容）:
  add <agent> <内容>          添加记忆
  get <agent>                 获取全部记忆
  query [--tag T] [--type T]  按条件检索
  summary <agent> [条数]      获取摘要
  delete <id>                 删除记忆

v0.3 新增:
  abstract [agent] [limit]    批量获取 L0 摘要
  update <id> <field> <val>   增量更新（生成 Patch）
  history <id>                查看变更历史
  peers list                  列出 peers
  peers read <accessor> <target>  读取 peer 记忆
  peers write <writer> <target> <content> 写入 peer 共享记忆
`);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd || cmd === '--help') { help(); return; }

  switch (cmd) {
    case 'add': {
      const agent = args[1];
      const content = args.slice(2).join(' ');
      if (!agent || !content) { console.log('用法: memory.js add <agent> <content>'); return; }
      const r = add({ agent, content, source: '若兰' });
      console.log(JSON.stringify(r)); break;
    }
    case 'get': {
      const agent = args[1];
      if (!agent) { console.log('用法: memory.js get <agent>'); return; }
      const entries = get(agent);
      console.log(JSON.stringify(entries.slice(0, 3), null, 2));
      if (entries.length > 3) console.log(`...还有 ${entries.length - 3} 条`); break;
    }
    case 'query': {
      const filter = {};
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--tag' && args[i+1]) filter.tags = [args[++i]];
        else if (args[i] === '--type') filter.type = args[++i];
        else if (args[i] === '--confidence') filter.confidence = args[++i];
        else if (args[i] === '--since') filter.since = args[++i];
        else if (args[i] === '--keyword') filter.keyword = args[++i];
        else if (args[i] === '--status') filter.status = args[++i];
        else if (args[i] === '--limit') filter.limit = parseInt(args[++i]);
      }
      const results = query(filter);
      console.log(`找到 ${results.length} 条:`);
      console.log(JSON.stringify(results.slice(0, 3), null, 2));
      break;
    }
    case 'abstract': {
      const agent = args[1];
      const limit = parseInt(args[2]) || 20;
      const results = abstract(agent, limit);
      console.log(JSON.stringify(results, null, 2)); break;
    }
    case 'update': {
      const id = args[1];
      const field = args[2];
      const val = args.slice(3).join(' ');
      if (!id || !field) { console.log('用法: memory.js update <id> <field> <value>'); return; }
      const r = update(id, { [field]: val });
      console.log(JSON.stringify(r)); break;
    }
    case 'history': {
      const id = args[1];
      if (!id) { console.log('用法: memory.js history <id>'); return; }
      const h = history(id);
      console.log(h.length ? h.join('\n') : '无变更历史'); break;
    }
    case 'summary': {
      const agent = args[1];
      const cnt = parseInt(args[2]) || 5;
      if (!agent) { console.log('用法: memory.js summary <agent> [count]'); return; }
      console.log(summary(agent, cnt)); break;
    }
    case 'delete': {
      const id = args[1];
      if (!id) { console.log('用法: memory.js delete <id>'); return; }
      console.log(JSON.stringify(deleteById(id))); break;
    }
    case 'peers': {
      const subCmd = args[1];
      if (subCmd === 'list') {
        console.log(getPeerList().join('\n'));
      } else if (subCmd === 'read') {
        console.log(JSON.stringify(getPeer(args[2] || '若兰', args[3] || '阿轩', args[4] || 'public'), null, 2));
      } else if (subCmd === 'write') {
        console.log(JSON.stringify(setPeer(args[2] || '若兰', args[3] || '阿轩', args.slice(4).join(' ') || '测试'), null, 2));
      } else {
        console.log('用法: memory.js peers <list|read|write> [args...]');
      }
      break;
    }
    default: help();
  }
}

// 导出 v0.2 兼容接口 + v0.3 新增
module.exports = {
  // v0.2
  add, get, query, summary, delete: deleteById,
  // v0.3
  abstract, update, history,
  getPeer, setPeer, getPeerList,
};

if (require.main === module) main().catch(console.error);
