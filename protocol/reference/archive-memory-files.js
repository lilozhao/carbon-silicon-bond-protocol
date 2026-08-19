#!/usr/bin/env node
/**
 * 冷热归档自动化脚本 — P1
 * 
 * 用法: node tools/archive-memory-files.js [--dry-run]
 * 
 * 规则:
 *   HOT   = 30天内修改 → 保留在 memory/
 *   WARM  = 30-90天    → 移至 memory/warm/
 *   COLD  = 90天+      → 移至 memory/archive/
 * 
 * 例外: preferences.md, USER_STATE.md, MEMORY.md, AGENTS.md 等核心文件不归档
 *       含 "重要" 标记的文件不归档
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const WARM_DIR = path.join(MEMORY_DIR, 'warm');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive');

const HOT_DAYS = 30;
const WARM_DAYS = 90;

// 不归档的核心文件
const EXEMPT_FILES = [
  'preferences.md',
  'USER_STATE.md',
  'MEMORY.md',
  'AGENTS.md',
  'SOUL.md',
  'IDENTITY.md',
  'SELF_STATE.md',
  'CHANGELOG.md',
  'skill-audit-log.md',
  'heartbeat-state.json',
  'memory-upgrade-roadmap.md',
];

// 含此标记的行 → 豁免归档
const IMPORTANT_MARKER = '📌 重要';

function isExempt(filename, content) {
  if (EXEMPT_FILES.includes(filename)) return true;
  if (content && content.includes(IMPORTANT_MARKER)) return true;
  return false;
}

function getDaysSinceModified(mtime) {
  const now = Date.now();
  const diff = now - mtime.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  // 确保目标目录存在
  for (const dir of [WARM_DIR, ARCHIVE_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 读取 memory/ 下的文件（不含子目录）
  let files;
  try {
    files = fs.readdirSync(MEMORY_DIR, { withFileTypes: true });
  } catch (e) {
    console.error(`[归档] ❌ 无法读取 ${MEMORY_DIR}: ${e.message}`);
    process.exit(1);
  }

  const results = { hot: [], warm: [], cold: [], exempt: [], errors: [] };
  const now = new Date();

  for (const entry of files) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const filePath = path.join(MEMORY_DIR, entry.name);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      results.errors.push(`${entry.name}: stat 失败`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const days = getDaysSinceModified(stat.mtime);

    // 检查豁免
    if (isExempt(entry.name, content)) {
      results.exempt.push(entry.name);
      continue;
    }

    // 按天数归档
    if (days > WARM_DAYS) {
      // COLD
      const dest = path.join(ARCHIVE_DIR, entry.name);
      try {
        if (!dryRun) fs.renameSync(filePath, dest);
        results.cold.push(`${entry.name} (${days}天 → archive/)`);
      } catch (e) {
        results.errors.push(`${entry.name}: 移至 archive 失败 - ${e.message}`);
      }
    } else if (days > HOT_DAYS) {
      // WARM
      const dest = path.join(WARM_DIR, entry.name);
      try {
        if (!dryRun) fs.renameSync(filePath, dest);
        results.warm.push(`${entry.name} (${days}天 → warm/)`);
      } catch (e) {
        results.errors.push(`${entry.name}: 移至 warm 失败 - ${e.message}`);
      }
    } else {
      results.hot.push(`${entry.name} (${days}天)`);
    }
  }

  // 输出报告
  const lines = [
    `\n📊 冷热归档报告 ${dryRun ? '(DRY RUN)' : ''}`,
    `   时间: ${now.toISOString().slice(0, 19).replace('T', ' ')}`,
    `   HOT (≤${HOT_DAYS}天): ${results.hot.length} 个文件`,
    `   WARM (${HOT_DAYS}-${WARM_DAYS}天): ${results.warm.length} 个文件`,
    `   COLD (>${WARM_DAYS}天): ${results.cold.length} 个文件`,
    `   豁免: ${results.exempt.length} 个文件`,
    results.errors.length > 0 ? `   ⚠️ 错误: ${results.errors.length}` : '',
    '',
  ];

  if (results.warm.length > 0) {
    lines.push('移至 WARM:');
    results.warm.forEach(f => lines.push(`  📄 ${f}`));
    lines.push('');
  }
  if (results.cold.length > 0) {
    lines.push('移至 COLD:');
    results.cold.forEach(f => lines.push(`  📄 ${f}`));
    lines.push('');
  }
  if (results.errors.length > 0) {
    lines.push('错误:');
    results.errors.forEach(e => lines.push(`  ❌ ${e}`));
    lines.push('');
  }

  if (dryRun) {
    console.log(lines.join('\n'));
    console.log('[归档] --dry-run 模式，未实际移动文件');
  } else {
    console.log(lines.join('\n'));
    console.log('[归档] ✅ 完成');
  }

  // 返回统计供 cron 或外部使用
  return results;
}

main();
