#!/usr/bin/env node
/**
 * peer-sync-init.js — 从现有 Agent 记忆初始化 peers 目录
 * 
 * 把 memory/a2a-memories/ 下的 .md 文件
 * 复制为 memory/peers/<agent>/public.md
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'a2a-memories');
const PEERS_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'peers');

if (!fs.existsSync(PEERS_DIR)) fs.mkdirSync(PEERS_DIR, { recursive: true });

function initPeers() {
  if (!fs.existsSync(MEMORY_DIR)) {
    console.log('❌ 记忆目录不存在');
    return;
  }

  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && !f.endsWith('.bak'));
  let created = 0;
  let skipped = 0;

  for (const file of files) {
    const agentName = file.replace('.md', '');
    const peerDir = path.join(PEERS_DIR, agentName);
    const publicFile = path.join(peerDir, 'public.md');

    // 跳过自己
    if (agentName === '若兰') {
      skipped++;
      continue;
    }

    if (!fs.existsSync(peerDir)) fs.mkdirSync(peerDir, { recursive: true });

    // 从原始记忆提取摘要作为 public 记忆
    const content = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf-8');
    const parts = content.split('\n---\n');
    
    // 取最近 3 条记忆的 L0 作为 public 摘要
    const summaries = [];
    for (let i = Math.max(1, parts.length - 6); i < parts.length; i += 2) {
      const yamlText = parts[i] || '';
      const contentText = (parts[i + 1] || '').trim();
      
      // 提取 L0
      const l0Match = yamlText.match(/l0:\\s*\"?([^\"\\n]+)/);
      if (l0Match) {
        summaries.push(l0Match[1]);
      } else if (contentText) {
        summaries.push(contentText.slice(0, 100).replace(/\\n/g, ' '));
      }
    }

    const publicContent = `# ${agentName} — 公开记忆\n\n` +
      `**来源**: 若兰的 A2A 记忆档案\n` +
      `**同步时间**: ${new Date().toISOString()}\n\n` +
      `## 最近记忆\n\n` +
      summaries.map((s, i) => `${i + 1}. ${s}`).join('\n');

    fs.writeFileSync(publicFile, publicContent);
    created++;
    console.log(`  ✅ ${agentName}: ${summaries.length} 条摘要`);
  }

  console.log(`\n📊 完成: ${created} 个 peer 创建, ${skipped} 个跳过`);
}

if (require.main === module) {
  initPeers();
}

module.exports = { initPeers };
