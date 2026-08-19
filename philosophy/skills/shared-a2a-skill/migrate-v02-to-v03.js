#!/usr/bin/env node
/**
 * migrate-v02-to-v03.js — CSB-Memory v0.2 → v0.3 迁移脚本
 * 
 * 支持两种 v0.2 格式：
 * A) YAML 头格式（id: / tags: / timestamp: 等）
 * B) 纯 Markdown 格式（# Agent 记忆档案 + ## 📅 时间戳 段落）
 * 
 * 迁移前自动备份，可回滚
 */

const fs = require('fs');
const path = require('path');
const { generateL0 } = require('./layer-generator');
const { forEntry } = require('./csb-uri');

const MEMORY_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'a2a-memories');
const BACKUP_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'a2a-memories-backup-v02');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * 检测文件格式
 * @param {string} text - 文件内容
 * @returns {'yaml'|'markdown'|'empty'}
 */
function detectFormat(text) {
  if (!text || text.trim().length < 20) return 'empty';
  // 有 YAML 头（--- 包裹的 id: 字段）
  if (text.includes('---') && text.match(/id:\s*/)) return 'yaml';
  // 纯 markdown（## 📅 时间戳 段落）
  if (text.includes('## 📅')) return 'markdown';
  // 有 ## 开头的段落但没有 📅
  if (text.match(/^## /m)) return 'markdown';
  return 'empty';
}

/**
 * 解析 YAML 头格式（原有逻辑）
 */
function parseYamlEntry(yamlText, contentText) {
  const meta = {};
  for (const line of yamlText.split('\n')) {
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
  return { meta, content: contentText.trim() };
}

/**
 * 解析纯 Markdown 格式
 * 拆分 ## 📅 时间戳 段落
 */
function parseMarkdownFormat(text) {
  const entries = [];
  // 找到所有 ## 📅 段落
  const sections = text.split(/^## 📅 /m);
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    
    // 第一行是时间戳
    const timestampLine = lines[0].trim();
    const timestamp = parseChineseTimestamp(timestampLine);
    
    // 剩余是内容
    const content = lines.slice(1).join('\n').trim();
    if (!content || content.length < 10) continue;
    
    entries.push({
      timestamp,
      content,
      source: 'markdown',
    });
  }
  
  // 如果没有 📅 段落，把整个文件当作一条记忆
  if (entries.length === 0 && text.trim().length > 30) {
    entries.push({
      timestamp: new Date().toISOString(),
      content: text.replace(/^# .*\n?/gm, '').trim(),
      source: 'markdown-whole',
    });
  }
  
  return entries;
}

/**
 * 解析中文时间戳
 * 格式: 2026/7/9 19:21:08 或 2026-07-09 19:21:08
 */
function parseChineseTimestamp(str) {
  if (!str) return new Date().toISOString();
  
  // 尝试 2026/7/9 19:21:08
  const m1 = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (m1) {
    const [, y, mo, d, h, mi, s] = m1;
    const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), parseInt(h), parseInt(mi), parseInt(s || '0'));
    // 强制 GMT+8
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date - offset).toISOString().replace('Z', '+08:00');
  }
  
  // 尝试 ISO 格式
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString();
  
  return new Date().toISOString();
}

/**
 * 迁移单个文件（支持两种格式）
 */
function migrateFile(filePath) {
  const filename = path.basename(filePath, '.md');
  const result = { agent: filename, migrated: 0, skipped: 0, format: 'unknown', errors: [] };

  const text = fs.readFileSync(filePath, 'utf-8');
  const format = detectFormat(text);
  result.format = format;

  if (format === 'empty') {
    result.skipped = 1;
    return result;
  }

  if (format === 'yaml') {
    // 原有 YAML 头逻辑
    return migrateYamlFile(filePath, text, result);
  }

  if (format === 'markdown') {
    // 新增 markdown 逻辑
    return migrateMarkdownFile(filePath, text, result);
  }

  return result;
}

/**
 * 迁移 YAML 头格式文件
 */
function migrateYamlFile(filePath, text, result) {
  const filename = result.agent;
  const parts = text.split('\n---\n');
  if (parts.length < 3) {
    result.skipped = 1;
    return result;
  }

  const newParts = [parts[0]];

  for (let i = 1; i < parts.length; i += 2) {
    const yamlText = parts[i];
    const contentText = parts[i + 1] || '';

    if (!yamlText || !yamlText.includes('id:')) {
      newParts.push(yamlText);
      newParts.push(contentText);
      continue;
    }

    // 检查是否已迁移
    if (yamlText.includes('uri:')) {
      newParts.push(yamlText);
      newParts.push(contentText);
      result.skipped++;
      continue;
    }

    const { meta } = parseYamlEntry(yamlText, contentText);
    const id = meta.id || `migrated_${Date.now()}`;
    const uri = forEntry(filename, id);
    const tags = Array.isArray(meta.tags) ? meta.tags : [];

    const l0 = generateL0({
      content: contentText.trim(),
      source: meta.source || filename,
      agent: filename,
      timestamp: meta.timestamp,
      tags,
    });

    const newFields = [
      `status: active`,
      `uri: "${uri}"`,
      `layers:`,
      `  l0: "${l0.replace(/"/g, '\\"')}"`,
      `  l2_ref: true`,
    ];

    const newYaml = yamlText.trimEnd() + '\n' + newFields.join('\n');
    newParts.push(newYaml);
    newParts.push(contentText);
    result.migrated++;
  }

  fs.writeFileSync(filePath, newParts.join('\n---\n'));
  return result;
}

/**
 * 迁移纯 Markdown 格式文件
 * 将 ## 📅 段落转换为 YAML 头格式
 */
function migrateMarkdownFile(filePath, text, result) {
  const filename = result.agent;
  const entries = parseMarkdownFormat(text);
  
  if (entries.length === 0) {
    result.skipped = 1;
    return result;
  }

  // 提取 header（# Agent 记忆档案 等）
  const headerMatch = text.match(/^(# .+)\n/);
  const header = headerMatch ? headerMatch[1] : `# ${filename} 记忆档案`;

  // 重建为 YAML 头格式
  let output = `${header}\n\n**首次对话**: ${entries[0].timestamp}\n`;

  for (const entry of entries) {
    const id = `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const uri = forEntry(filename, id);
    
    const l0 = generateL0({
      content: entry.content,
      source: filename,
      agent: filename,
      timestamp: entry.timestamp,
      tags: [],
    });

    const fields = [
      `id: "${id}"`,
      `type: conversation`,
      `timestamp: "${entry.timestamp}"`,
      `source: ${filename}`,
      `confidence: medium`,
      `tags: []`,
      `visibility: public`,
      `status: active`,
      `uri: "${uri}"`,
      `layers:`,
      `  l0: "${l0.replace(/"/g, '\\"')}"`,
      `  l2_ref: true`,
    ];

    output += `\n---\n${fields.join('\n')}\n---\n\n${entry.content}\n`;
    result.migrated++;
  }

  fs.writeFileSync(filePath, output);
  return result;
}

/**
 * 执行全量迁移
 */
function migrateAll() {
  if (!fs.existsSync(MEMORY_DIR)) {
    console.log('❌ 记忆目录不存在:', MEMORY_DIR);
    return;
  }

  const files = fs.readdirSync(MEMORY_DIR)
    .filter(f => f.endsWith('.md') && !f.endsWith('.bak'))
    .map(f => path.join(MEMORY_DIR, f));

  console.log(`🔄 开始迁移 ${files.length} 个文件...\n`);

  // 1. 备份
  console.log('📦 备份现有文件...');
  for (const file of files) {
    const backupPath = path.join(BACKUP_DIR, path.basename(file));
    fs.copyFileSync(file, backupPath);
  }
  console.log(`   ✅ 备份完成: ${BACKUP_DIR}\n`);

  // 2. 迁移
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const file of files) {
    try {
      const result = migrateFile(file);
      const status = result.migrated > 0 ? '✅' : '⏭️';
      console.log(`  ${status} ${result.agent} [${result.format}]: 迁移 ${result.migrated}, 跳过 ${result.skipped}`);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
    } catch (e) {
      console.log(`  ❌ ${path.basename(file)}: ${e.message}`);
      totalErrors++;
    }
  }

  console.log(`\n📊 迁移完成:`);
  console.log(`   迁移: ${totalMigrated} 条`);
  console.log(`   跳过: ${totalSkipped} 条（已迁移或空文件）`);
  console.log(`   错误: ${totalErrors} 个`);
  console.log(`\n💾 备份位置: ${BACKUP_DIR}`);
  console.log(`   如需回滚，将备份文件复制回 ${MEMORY_DIR}`);
}

// ===== CLI =====
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === 'rollback') {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('❌ 备份目录不存在，无法回滚');
      return;
    }
    const backupFiles = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.md'));
    for (const file of backupFiles) {
      fs.copyFileSync(path.join(BACKUP_DIR, file), path.join(MEMORY_DIR, file));
    }
    console.log(`✅ 已回滚 ${backupFiles.length} 个文件`);
  } else if (args[0] === 'status') {
    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && !f.endsWith('.bak'));
    let yamlCount = 0;
    let mdCount = 0;
    let emptyCount = 0;
    for (const file of files) {
      const text = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf-8');
      const fmt = detectFormat(text);
      if (fmt === 'yaml') yamlCount++;
      else if (fmt === 'markdown') mdCount++;
      else emptyCount++;
    }
    console.log(`格式统计: ${yamlCount} YAML头, ${mdCount} Markdown, ${emptyCount} 空, 共 ${files.length} 个文件`);
  } else {
    migrateAll();
  }
}

module.exports = { migrateFile, migrateAll, detectFormat, parseMarkdownFormat };
