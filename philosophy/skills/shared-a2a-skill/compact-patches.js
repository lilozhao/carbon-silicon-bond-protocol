#!/usr/bin/env node
/**
 * compact-patches.js — CSB-Memory v0.3 Patch 合并工具
 * 
 * 动态阈值合并（默认30，高频50）
 * 将多个 Patch 压缩为一个新版本
 */

const fs = require('fs');
const path = require('path');
const { getPatches, compact, needsCompaction, DEFAULT_COMPACT_THRESHOLD } = require('./patch-engine');

const PATCHES_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'patches');
const MEMORY_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'a2a-memories');

/**
 * 扫描所有 Patch 文件，找出需要合并的
 * @param {number} threshold - 合并阈值
 * @returns {object[]} [{ targetId, patchCount }]
 */
function findCompactable(threshold) {
  threshold = threshold || DEFAULT_COMPACT_THRESHOLD;
  
  if (!fs.existsSync(PATCHES_DIR)) return [];
  
  const files = fs.readdirSync(PATCHES_DIR).filter(f => f.endsWith('.jsonl'));
  const compactable = [];
  
  for (const file of files) {
    const targetId = file.replace('.jsonl', '');
    const patches = getPatches(targetId);
    if (patches.length >= threshold) {
      compactable.push({ targetId, patchCount: patches.length });
    }
  }
  
  return compactable;
}

/**
 * 从记忆文件中找到原始条目
 * @param {string} targetId - 记忆 ID
 * @returns {object|null} 原始条目
 */
function findOriginalEntry(targetId) {
  if (!fs.existsSync(MEMORY_DIR)) return null;
  
  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && !f.endsWith('.bak'));
  
  for (const file of files) {
    const text = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf-8');
    const parts = text.split('\n---\n');
    
    for (let i = 1; i < parts.length; i += 2) {
      const yamlText = parts[i];
      const contentText = parts[i + 1] || '';
      
      if (!yamlText || !yamlText.includes('id:')) continue;
      
      // 简单解析 ID
      const idMatch = yamlText.match(/id:\s*"?([^"\n]+)"?/);
      if (idMatch && idMatch[1] === targetId) {
        return { yaml: yamlText, content: contentText.trim() };
      }
    }
  }
  
  return null;
}

/**
 * 执行自动合并
 * @param {number} threshold - 阈值
 * @returns {object} 合并结果
 */
function autoCompact(threshold) {
  const compactable = findCompactable(threshold);
  
  if (compactable.length === 0) {
    return { message: '没有需要合并的 Patch', compacted: 0 };
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (const { targetId, patchCount } of compactable) {
    try {
      const original = findOriginalEntry(targetId);
      if (!original) {
        console.log(`  ⚠️ ${targetId}: 找不到原始条目，跳过`);
        failCount++;
        continue;
      }
      
      const result = compact(targetId, original);
      console.log(`  ✅ ${targetId}: ${patchCount} → 0 patches (已合并)`);
      successCount++;
    } catch (e) {
      console.log(`  ❌ ${targetId}: ${e.message}`);
      failCount++;
    }
  }
  
  return {
    message: `合并完成: ${successCount} 成功, ${failCount} 失败`,
    compacted: successCount,
    failed: failCount,
  };
}

/**
 * 统计 Patch 信息
 * @returns {object} 统计信息
 */
function stats() {
  if (!fs.existsSync(PATCHES_DIR)) {
    return { totalFiles: 0, totalPatches: 0, compactable: 0 };
  }
  
  const files = fs.readdirSync(PATCHES_DIR).filter(f => f.endsWith('.jsonl'));
  let totalPatches = 0;
  let compactable = 0;
  
  for (const file of files) {
    const targetId = file.replace('.jsonl', '');
    const patches = getPatches(targetId);
    totalPatches += patches.length;
    if (patches.length >= DEFAULT_COMPACT_THRESHOLD) compactable++;
  }
  
  return { totalFiles: files.length, totalPatches, compactable };
}

// ===== CLI =====
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  
  if (cmd === 'auto') {
    const threshold = parseInt(args[1]) || DEFAULT_COMPACT_THRESHOLD;
    console.log(`🔄 自动合并（阈值: ${threshold}）...\n`);
    const result = autoCompact(threshold);
    console.log(`\n${result.message}`);
  } else if (cmd === 'stats') {
    const s = stats();
    console.log(`📊 Patch 统计:`);
    console.log(`   文件数: ${s.totalFiles}`);
    console.log(`   总 Patch: ${s.totalPatches}`);
    console.log(`   可合并: ${s.compactable}（阈值 ${DEFAULT_COMPACT_THRESHOLD}）`);
  } else if (cmd === 'find') {
    const compactable = findCompactable(parseInt(args[1]) || DEFAULT_COMPACT_THRESHOLD);
    if (compactable.length === 0) {
      console.log('没有需要合并的 Patch');
    } else {
      console.log('可合并的 Patch:');
      for (const { targetId, patchCount } of compactable) {
        console.log(`  ${targetId}: ${patchCount} patches`);
      }
    }
  } else {
    console.log(`用法: node compact-patches.js <command> [threshold]

命令:
  auto [threshold]   自动合并（默认阈值: ${DEFAULT_COMPACT_THRESHOLD}）
  stats              统计信息
  find [threshold]   查找可合并的 Patch`);
  }
}

module.exports = { findCompactable, autoCompact, stats };
