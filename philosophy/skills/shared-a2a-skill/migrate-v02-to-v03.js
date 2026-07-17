#!/usr/bin/env node
/**
 * migrate-v02-to-v03.js — CSB-Memory v0.2 → v0.3 迁移脚本
 * 
 * 为现有记忆文件补充：
 * - L0 摘要（自动生成）
 * - URI 地址（自动映射）
 * - status 字段（默认 active）
 * 
 * 迁移前自动备份，可回滚
 */

const fs = require('fs');
const path = require('path');
const { generateL0 } = require('./layer-generator');
const { forEntry } = require('./csb-uri');

const MEMORY_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'a2a-memories');
const BACKUP_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'a2a-memories-backup-v02');

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * 迁移单个文件
 * @param {string} filePath - 文件路径
 * @returns {object} { agent, migrated, skipped, errors }
 */
function migrateFile(filePath) {
  const filename = path.basename(filePath, '.md');
  const result = { agent: filename, migrated: 0, skipped: 0, errors: [] };

  const text = fs.readFileSync(filePath, 'utf-8');
  const parts = text.split('\n---\n');

  if (parts.length < 3) {
    result.skipped = parts.length - 1;
    return result;
  }

  const newParts = [parts[0]]; // 保留 header

  for (let i = 1; i < parts.length; i += 2) {
    const yamlText = parts[i];
    const contentText = parts[i + 1] || '';

    if (!yamlText || !yamlText.includes('id:')) {
      newParts.push(yamlText);
      newParts.push(contentText);
      continue;
    }

    // 解析现有 YAML
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

    // 检查是否已迁移（有 uri 字段）
    if (meta.uri) {
      newParts.push(yamlText);
      newParts.push(contentText);
      result.skipped++;
      continue;
    }

    // 生成 v0.3 新增字段
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

    // 重建 YAML（在末尾追加新字段）
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

  // 写回文件
  fs.writeFileSync(filePath, newParts.join('\n---\n'));
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
      console.log(`  ${status} ${result.agent}: 迁移 ${result.migrated}, 跳过 ${result.skipped}`);
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
    // 回滚
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
    // 检查迁移状态
    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && !f.endsWith('.bak'));
    let migrated = 0;
    let pending = 0;
    for (const file of files) {
      const text = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf-8');
      if (text.includes('uri:')) migrated++;
      else pending++;
    }
    console.log(`迁移状态: ${migrated} 已迁移, ${pending} 待迁移, 共 ${files.length} 个文件`);
  } else {
    migrateAll();
  }
}

module.exports = { migrateFile, migrateAll };
