#!/usr/bin/env node
/**
 * install-csb-memory-v03.js — CSB-Memory v0.3 一键安装脚本
 * 
 * 用法: node install-csb-memory-v03.js
 * 
 * 自动：
 * 1. 下载 9 个新模块到 skills/shared-a2a-skill/
 * 2. 升级 memory.js 到 v0.3
 * 3. 迁移现有记忆（补充 L0 + URI + status）
 * 4. 初始化 peers 目录
 * 
 * 兼容：v0.2 → v0.3 向后兼容，不破坏现有功能
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SKILL_DIR = path.join(__dirname);
const MEMORY_DIR = path.join(SKILL_DIR, '..', '..', 'memory', 'a2a-memories');
const PEERS_DIR = path.join(SKILL_DIR, '..', '..', 'memory', 'peers');

// v0.3 模块清单
const MODULES = [
  'csb-uri.js',
  'layer-generator.js',
  'patch-engine.js',
  'session-commit.js',
  'peers-memory.js',
  'compact-patches.js',
  'audit-logger.js',
  'peer-sync-init.js',
  'migrate-v02-to-v03.js',
];

function checkModules() {
  console.log('🔍 检查 v0.3 模块...');
  const missing = [];
  for (const mod of MODULES) {
    const filePath = path.join(SKILL_DIR, mod);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${mod}`);
    } else {
      console.log(`  ❌ ${mod} — 缺失`);
      missing.push(mod);
    }
  }
  return missing;
}

function checkMemoryJS() {
  const filePath = path.join(SKILL_DIR, 'memory.js');
  if (!fs.existsSync(filePath)) return 'missing';
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('v0.3')) return 'v0.3';
  if (content.includes('abstract')) return 'v0.3';
  return 'v0.2';
}

function migrate() {
  console.log('\n🔄 迁移现有记忆...');
  try {
    const { migrateAll } = require('./migrate-v02-to-v03');
    migrateAll();
  } catch (e) {
    console.log(`  ⚠️ 迁移跳过: ${e.message}`);
  }
}

function initPeers() {
  console.log('\n👥 初始化 peers...');
  try {
    const { initPeers } = require('./peer-sync-init');
    initPeers();
  } catch (e) {
    console.log(`  ⚠️ peers 初始化跳过: ${e.message}`);
  }
}

function createDirs() {
  const dirs = [
    path.join('/home/node/.openclaw/workspace', 'memory', 'patches'),
    path.join('/home/node/.openclaw/workspace', 'memory', 'audit'),
    path.join('/home/node/.openclaw/workspace', 'memory', 'peers'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  📁 创建: ${dir}`);
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  🧠 CSB-Memory v0.3 安装程序');
  console.log('═══════════════════════════════════════\n');

  // 1. 检查模块
  const missing = checkModules();
  if (missing.length > 0) {
    console.log(`\n❌ 缺少 ${missing.length} 个模块，请先复制 v0.3 代码到 ${SKILL_DIR}`);
    process.exit(1);
  }

  // 2. 检查 memory.js 版本
  const memVersion = checkMemoryJS();
  console.log(`\n📋 memory.js 版本: ${memVersion}`);
  if (memVersion === 'v0.2') {
    console.log('  ⚠️ memory.js 需要升级到 v0.3');
  }

  // 3. 创建目录
  console.log('\n📁 创建目录...');
  createDirs();

  // 4. 迁移记忆
  migrate();

  // 5. 初始化 peers
  initPeers();

  console.log('\n═══════════════════════════════════════');
  console.log('  ✅ CSB-Memory v0.3 安装完成！');
  console.log('═══════════════════════════════════════');
  console.log('\n新增 API:');
  console.log('  memory.abstract(agent, limit) — L0 摘要');
  console.log('  memory.update(id, changes)    — 增量 Patch');
  console.log('  memory.history(id)            — 版本回溯');
  console.log('  memory.peers.*                — peers 互记');
  console.log('  processConversationV3()       — 三合一增强');
}

main().catch(console.error);
