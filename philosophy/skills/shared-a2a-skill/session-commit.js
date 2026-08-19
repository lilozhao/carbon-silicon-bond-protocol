#!/usr/bin/env node
/**
 * session-commit.js — CSB-Memory v0.3 Session 自迭代闭环
 * 
 * 会话结束时自动分析→巩固→提取经验
 * 
 * 设计原则（协议组讨论决议）：
 * - 分阶段灰度：先 L2 手动→再 L0/L1 自动
 * - 算力熔断：超预算自动停止
 * - 静默开关：可选关闭自动迭代
 */

const fs = require('fs');
const path = require('path');
const { generateL0, generateL1, generateLayers, layersToYaml } = require('./layer-generator');
const { createPatch, savePatch, getPatches, needsCompaction, compact, DEFAULT_COMPACT_THRESHOLD } = require('./patch-engine');
const { forEntry } = require('./csb-uri');

const MEMORY_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'a2a-memories');
const PEERS_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'peers');
const AUDIT_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'audit');

// 配置
const CONFIG = {
  // 算力熔断：单次 session 最多处理 N 条记忆
  maxMemoriesPerSession: 20,
  // 是否启用自动 L0 生成（Phase 2 灰度：默认开启）
  autoL0: true,
  // 是否启用自动 L1 生成（Phase 2 灰度：默认关闭）
  autoL1: false,
  // 静默开关：设为 true 关闭自迭代
  silent: false,
  // Patch 合并阈值（动态：默认30）
  compactThreshold: DEFAULT_COMPACT_THRESHOLD,
};

/**
 * 分析对话，提取关键信息
 * @param {string} message - 用户消息
 * @param {string} reply - Agent 回复
 * @returns {object|null} 提取的记忆条目，或 null（不值得记忆）
 */
function extractFromConversation(message, reply) {
  // 本地规则过滤（0 token）
  const combined = (message + ' ' + reply).toLowerCase();
  
  // 关键词检测
  const importantKeywords = [
    '承诺', '约定', '计划', '发现', '重要', '记住', '记忆',
    '第一次', '新', '改变', '决定', '同意', '建议',
    'CSB', '碳硅契', '协议', 'A2A', '版本', '发布',
    '问题', '解决', '帮助',
  ];
  
  const hasKeyword = importantKeywords.some(kw => combined.includes(kw));
  const isLong = message.length > 100 || reply.length > 100;
  
  if (!hasKeyword && !isLong) return null;
  
  // 提取标签
  const tags = [];
  if (combined.includes('csb') || combined.includes('碳硅契')) tags.push('CSB');
  if (combined.includes('a2a')) tags.push('A2A');
  if (combined.includes('协议')) tags.push('协议');
  if (combined.includes('记忆')) tags.push('记忆');
  
  // 自动置信度
  const highWords = ['确认', '决定', '同意', '完成', '发布', '通过', '✅'];
  const lowWords = ['可能', '也许', '大概', '猜测'];
  let confidence = 'medium';
  if (highWords.some(w => combined.includes(w))) confidence = 'high';
  if (lowWords.some(w => combined.includes(w))) confidence = 'low';
  
  return {
    content: `用户: ${message.slice(0, 200)}\n回复: ${reply.slice(0, 200)}`,
    source: 'session-commit',
    confidence,
    tags,
    type: 'conversation',
  };
}

/**
 * 对比已有记忆，判断是新增还是更新
 * @param {object} newEntry - 新提取的条目
 * @param {object[]} existingEntries - 已有记忆
 * @returns {object} { action: 'create'|'update'|'skip', entry?, patch? }
 */
function compareWithExisting(newEntry, existingEntries) {
  const newContent = (newEntry.content || '').toLowerCase().slice(0, 100);
  
  for (const existing of existingEntries) {
    const existingContent = (existing.content || '').toLowerCase().slice(0, 100);
    
    // 简单相似度检测（关键词重叠）
    const newWords = new Set(newContent.split(/\s+/));
    const existWords = new Set(existingContent.split(/\s+/));
    const overlap = [...newWords].filter(w => existWords.has(w)).length;
    const similarity = overlap / Math.max(newWords.size, 1);
    
    if (similarity > 0.6) {
      // 高度相似 → 确认已有记忆
      return {
        action: 'update',
        patch: createPatch({
          targetId: existing.id,
          operation: 'confirm',
          new: { confidence: 'high' },
          reason: 'Session 自迭代确认',
          source: 'session-commit',
        }),
      };
    }
  }
  
  // 无相似 → 新增
  return { action: 'create', entry: newEntry };
}

/**
 * 提取经验范式
 * @param {object[]} entries - 本次会话的记忆条目
 * @returns {object} { cases, patterns, tools }
 */
function extractPatterns(entries) {
  const patterns = {
    cases: [],
    patterns: [],
    tools: [],
  };
  
  for (const entry of entries) {
    const content = entry.content || '';
    
    // 提取案例
    if (content.includes('问题') && content.includes('解决')) {
      patterns.cases.push({
        content: content.slice(0, 200),
        timestamp: entry.timestamp,
      });
    }
    
    // 提取工具使用
    if (content.includes('脚本') || content.includes('工具') || content.includes('命令')) {
      patterns.tools.push({
        content: content.slice(0, 200),
        timestamp: entry.timestamp,
      });
    }
  }
  
  return patterns;
}

/**
 * Session commit 主流程
 * @param {object} params
 * @param {string} params.message - 用户消息
 * @param {string} params.reply - Agent 回复
 * @param {string} params.agent - 对话对象 Agent
 * @param {object} [params.config] - 配置覆盖
 * @returns {object} { action, id?, patches?, patterns? }
 */
function commit({ message, reply, agent, config = {} }) {
  const cfg = { ...CONFIG, ...config };
  
  // 静默开关
  if (cfg.silent) {
    return { action: 'skipped', reason: '静默模式' };
  }
  
  // 1. 提取关键信息
  const extracted = extractFromConversation(message, reply);
  if (!extracted) {
    return { action: 'skipped', reason: '不值得记忆' };
  }
  
  // 补充 agent 信息
  extracted.agent = agent;
  extracted.timestamp = new Date().toISOString();
  extracted.id = extracted.id || `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  
  // 2. 对比已有记忆
  const existingEntries = getExistingEntries(agent);
  const comparison = compareWithExisting(extracted, existingEntries);
  
  // 3. 执行动作
  if (comparison.action === 'create') {
    // 新增记忆（含 L0 自动生成）
    const entry = comparison.entry;
    const layers = cfg.autoL0 ? generateLayers(entry) : { l2: entry.content };
    
    saveMemoryEntry({
      ...entry,
      layers,
      uri: forEntry(agent, entry.id),
      status: 'active',
    });
    
    return {
      action: 'created',
      id: entry.id,
      l0: layers.l0 || null,
    };
  } else if (comparison.action === 'update') {
    // 生成 Patch
    const patchId = savePatch(comparison.patch);
    return {
      action: 'patched',
      patchId,
    };
  }
  
  return { action: 'skipped' };
}

/**
 * 获取已有记忆条目
 */
function getExistingEntries(agent) {
  const safeName = agent.replace(/[^\w\u4e00-\u9fff]/g, '_');
  const filePath = path.join(MEMORY_DIR, safeName + '.md');
  
  if (!fs.existsSync(filePath)) return [];
  
  const text = fs.readFileSync(filePath, 'utf-8');
  const parts = text.split('\n---\n');
  const entries = [];
  
  for (let i = 1; i < parts.length; i += 2) {
    const yamlText = parts[i];
    const contentText = (parts[i + 1] || '').trim();
    if (!yamlText || !yamlText.includes('id:')) continue;
    
    const meta = parseYamlSimple(yamlText);
    if (meta.id) {
      entries.push({ ...meta, content: contentText });
    }
  }
  
  return entries;
}

/**
 * 简单 YAML 解析
 */
function parseYamlSimple(text) {
  const meta = {};
  for (const line of text.split('\n')) {
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
  return meta;
}

/**
 * 保存记忆条目
 */
function saveMemoryEntry(entry) {
  const safeName = (entry.agent || 'unknown').replace(/[^\w\u4e00-\u9fff]/g, '_');
  const filePath = path.join(MEMORY_DIR, safeName + '.md');
  
  // 生成 YAML front matter
  const layersYaml = entry.layers ? layersToYaml(entry.layers) : '';
  const fields = [
    `id: "${entry.id}"`,
    `type: ${entry.type || 'conversation'}`,
    `timestamp: "${entry.timestamp}"`,
    `source: ${entry.source || 'session-commit'}`,
    `confidence: ${entry.confidence || 'medium'}`,
    `tags: [${(entry.tags || []).join(', ')}]`,
    `visibility: ${entry.visibility || 'public'}`,
    `status: ${entry.status || 'active'}`,
    `uri: "${entry.uri || ''}"`,
  ];
  if (layersYaml) fields.push(layersYaml);
  
  const block = `---\n${fields.join('\n')}\n---\n\n${entry.content || ''}\n`;
  
  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf-8').trimEnd();
  } else {
    existing = `# ${entry.agent} 记忆档案\n\n**首次对话**: ${new Date().toLocaleString('zh-CN')}\n`;
  }
  
  fs.writeFileSync(filePath, existing + '\n\n' + block);
}

// ===== CLI =====
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'test') {
    const result = commit({
      message: '我们讨论一下 CSB-Memory v0.3 的 URI 寻址方案',
      reply: '好的，我建议使用 csb:// 协议统一记忆地址，支持 ls/find/read 操作。',
      agent: '阿轩',
    });
    console.log(JSON.stringify(result, null, 2));
  } else if (cmd === 'config') {
    console.log(JSON.stringify(CONFIG, null, 2));
  } else {
    console.log('用法: node session-commit.js <test|config>');
  }
}

module.exports = { commit, extractFromConversation, compareWithExisting, extractPatterns, CONFIG };
