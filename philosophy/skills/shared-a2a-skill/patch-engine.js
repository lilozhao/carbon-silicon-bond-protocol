#!/usr/bin/env node
/**
 * patch-engine.js — CSB-Memory v0.3 增量 Patch 引擎
 * 
 * 替代覆盖式写入，支持：
 * - Old/New Patch 格式
 * - 操作类型：update/revoke/confirm/append/merge
 * - 状态标注：active🟢/revoked🔴/pending🟡/superseded🔵
 * - 版本回溯
 * - 动态阈值合并（默认30，高频50）
 */

const fs = require('fs');
const path = require('path');

const PATCHES_DIR = path.join(__dirname, '..', 'memory', 'patches');
const DEFAULT_COMPACT_THRESHOLD = 30;

// 确保目录存在
if (!fs.existsSync(PATCHES_DIR)) {
  fs.mkdirSync(PATCHES_DIR, { recursive: true });
}

/**
 * 生成 Patch ID
 */
function generatePatchId() {
  return 'patch_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

/**
 * 创建一条 Patch
 * @param {object} params
 * @param {string} params.targetId - 目标记忆 ID
 * @param {string} params.operation - update|revoke|confirm|append|merge
 * @param {object} params.old - 旧值（可选）
 * @param {object} params.new - 新值
 * @param {string} params.reason - 变更原因
 * @param {string} params.source - 来源
 * @returns {object} Patch 对象
 */
function createPatch({ targetId, operation = 'update', old = {}, new: newVal = {}, reason = '', source = '若兰' }) {
  const patch = {
    patch_id: generatePatchId(),
    target_id: targetId,
    timestamp: new Date().toISOString(),
    source,
    operation,
    old,
    new: newVal,
    reason,
  };
  return patch;
}

/**
 * 保存 Patch 到文件
 * @param {object} patch - Patch 对象
 */
function savePatch(patch) {
  const targetFile = patch.target_id.replace(/[^\w]/g, '_') + '.jsonl';
  const filePath = path.join(PATCHES_DIR, targetFile);
  
  const line = JSON.stringify(patch) + '\n';
  fs.appendFileSync(filePath, line);
  return patch.patch_id;
}

/**
 * 获取某条记忆的所有 Patch
 * @param {string} targetId - 目标记忆 ID
 * @returns {object[]} Patch 列表
 */
function getPatches(targetId) {
  const targetFile = targetId.replace(/[^\w]/g, '_') + '.jsonl';
  const filePath = path.join(PATCHES_DIR, targetFile);
  
  if (!fs.existsSync(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n')
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

/**
 * 应用 Patch 到记忆条目
 * @param {object} entry - 原始记忆条目
 * @param {object} patch - Patch 对象
 * @returns {object} 更新后的条目
 */
function applyPatch(entry, patch) {
  const result = { ...entry };
  
  switch (patch.operation) {
    case 'update':
      // 更新字段
      for (const [key, val] of Object.entries(patch.new)) {
        result[key] = val;
      }
      break;
      
    case 'revoke':
      // 标记为已推翻
      result.status = 'revoked';
      if (patch.new.content) {
        result.content = patch.new.content;
      }
      break;
      
    case 'confirm':
      // 确认为事实
      result.status = 'active';
      result.confidence = 'high';
      break;
      
    case 'append':
      // 追加内容
      if (patch.new.content) {
        result.content = (result.content || '') + '\n' + patch.new.content;
      }
      break;
      
    case 'merge':
      // 合并（替换指定字段）
      for (const [key, val] of Object.entries(patch.new)) {
        result[key] = val;
      }
      break;
  }
  
  // 添加 patch 引用
  if (!result.patches) result.patches = [];
  result.patches.push(patch.patch_id);
  
  return result;
}

/**
 * 回溯到指定版本
 * @param {string} targetId - 目标记忆 ID
 * @param {object} originalEntry - 原始条目
 * @param {number} version - 版本号（从1开始，0=原始）
 * @returns {object} 指定版本的条目
 */
function rollback(targetId, originalEntry, version) {
  const patches = getPatches(targetId);
  let entry = { ...originalEntry };
  
  const maxVersion = patches.length;
  if (version > maxVersion) {
    throw new Error(`版本 ${version} 不存在，最大版本: ${maxVersion}`);
  }
  
  // 应用前 N 个 Patch
  for (let i = 0; i < version; i++) {
    entry = applyPatch(entry, patches[i]);
  }
  
  return entry;
}

/**
 * 获取变更历史（人类可读）
 * @param {string} targetId - 目标记忆 ID
 * @returns {string[]} 历史记录列表
 */
function getHistory(targetId) {
  const patches = getPatches(targetId);
  const lines = [];
  
  for (let i = 0; i < patches.length; i++) {
    const p = patches[i];
    const date = p.timestamp ? new Date(p.timestamp).toLocaleString('zh-CN') : '?';
    const opMap = { update: '修改', revoke: '推翻', confirm: '确认', append: '追加', merge: '合并' };
    const opName = opMap[p.operation] || p.operation;
    
    let detail = '';
    if (p.operation === 'update') {
      const changes = Object.keys(p.new).map(k => {
        const oldVal = typeof p.old[k] === 'string' ? p.old[k].slice(0, 30) : JSON.stringify(p.old[k]);
        const newVal = typeof p.new[k] === 'string' ? p.new[k].slice(0, 30) : JSON.stringify(p.new[k]);
        return `${k}: ${oldVal}→${newVal}`;
      }).join(', ');
      detail = ` (${changes})`;
    } else if (p.reason) {
      detail = ` - ${p.reason}`;
    }
    
    lines.push(`v${i + 1} (${date}) — ${opName}${detail}`);
  }
  
  return lines;
}

/**
 * 检查是否需要合并（compaction）
 * @param {string} targetId - 目标记忆 ID
 * @param {number} threshold - 阈值（默认30）
 * @returns {boolean} 是否需要合并
 */
function needsCompaction(targetId, threshold) {
  threshold = threshold || DEFAULT_COMPACT_THRESHOLD;
  return getPatches(targetId).length >= threshold;
}

/**
 * 执行合并（compaction）
 * 将所有 Patch 合并为一个新版本
 * @param {string} targetId - 目标记忆 ID
 * @param {object} originalEntry - 原始条目
 * @returns {object} 合并后的最终条目
 */
function compact(targetId, originalEntry) {
  const patches = getPatches(targetId);
  if (patches.length === 0) return originalEntry;
  
  // 应用所有 Patch 得到最终状态
  let entry = { ...originalEntry };
  for (const patch of patches) {
    entry = applyPatch(entry, patch);
  }
  
  // 清除 patches 引用（已合并）
  entry.patches = [];
  
  // 清空 Patch 文件
  const targetFile = targetId.replace(/[^\w]/g, '_') + '.jsonl';
  const filePath = path.join(PATCHES_DIR, targetFile);
  if (fs.existsSync(filePath)) {
    // 备份后删除
    const backupPath = filePath + '.compacted.' + Date.now();
    fs.renameSync(filePath, backupPath);
  }
  
  return entry;
}

/**
 * 更新状态标注
 * @param {string} targetId - 目标记忆 ID
 * @param {string} status - active|revoked|pending|superseded
 * @param {string} reason - 原因
 * @param {string} source - 来源
 */
function setStatus(targetId, status, reason = '', source = '若兰') {
  const patch = createPatch({
    targetId,
    operation: status === 'revoked' ? 'revoke' : 'update',
    new: { status },
    reason: reason || `状态变更为 ${status}`,
    source,
  });
  return savePatch(patch);
}

// ===== CLI =====
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'create') {
    const patch = createPatch({
      targetId: args[1] || 'test_001',
      operation: args[2] || 'update',
      old: { confidence: 'medium' },
      new: { confidence: 'high' },
      reason: args[3] || '测试',
    });
    const id = savePatch(patch);
    console.log(`Patch 已创建: ${id}`);
  } else if (cmd === 'history') {
    const history = getHistory(args[1] || 'test_001');
    console.log(history.length ? history.join('\n') : '无变更历史');
  } else if (cmd === 'list') {
    const patches = getPatches(args[1] || 'test_001');
    console.log(`共 ${patches.length} 条 Patch`);
    patches.forEach(p => console.log(`  ${p.patch_id}: ${p.operation} (${p.timestamp})`));
  } else {
    console.log('用法: node patch-engine.js <create|history|list> [args...]');
  }
}

module.exports = {
  createPatch, savePatch, getPatches, applyPatch,
  rollback, getHistory, needsCompaction, compact, setStatus,
  DEFAULT_COMPACT_THRESHOLD,
};
