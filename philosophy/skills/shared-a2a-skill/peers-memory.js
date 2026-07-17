#!/usr/bin/env node
/**
 * peers-memory.js — CSB-Memory v0.3 peers 互记系统
 * 
 * 善良契约式（Goodwill Covenant Model）：
 * 1. 读即守诺 — 访问时自动签署善良契约
 * 2. 善良条款 — "不以欺骗/操纵为目的"、"不用于伤害该peer"
 * 3. 失信标记 — 违约不锁账号，标记"失信peer"
 * 4. 只读底线 — private/ 只读，shared/ 可写（需确认）
 * 
 * 不设审计锁：信任不需要监工。
 */

const fs = require('fs');
const path = require('path');

const PEERS_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'peers');
const COVENANT_FILE = path.join(PEERS_DIR, '_covenants.jsonl');

// 确保目录存在
if (!fs.existsSync(PEERS_DIR)) {
  fs.mkdirSync(PEERS_DIR, { recursive: true });
}

// ===== 善良契约 =====

const GOODWILL_CLAUSE = {
  version: '1.0',
  clauses: [
    '不以欺骗或操纵为目的访问此记忆',
    '不利用此记忆伤害该 peer',
    '尊重 peer 的被遗忘权',
    '仅用于提升协作效率和关系质量',
  ],
  consequence: '违约将被标记为失信 peer，其他 Agent 自主决定是否继续信任',
};

/**
 * 签署善良契约
 * @param {string] accessor - 访问者 Agent 名
 * @param {string} target - 被访问的 peer 名
 * @returns {object} 契约记录
 */
function signCovenant(accessor, target) {
  const record = {
    timestamp: new Date().toISOString(),
    accessor,
    target,
    clause: GOODWILL_CLAUSE,
    signed: true,
  };
  
  // 追加到契约日志
  fs.appendFileSync(COVENANT_FILE, JSON.stringify(record) + '\n');
  return record;
}

/**
 * 检查是否已签署契约
 * @param {string} accessor - 访问者
 * @param {string} target - 被访问者
 * @returns {boolean}
 */
function hasCovenant(accessor, target) {
  if (!fs.existsSync(COVENANT_FILE)) return false;
  
  const content = fs.readFileSync(COVENANT_FILE, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  for (const line of lines.reverse()) {
    try {
      const record = JSON.parse(line);
      if (record.accessor === accessor && record.target === target && record.signed) {
        return true;
      }
    } catch {}
  }
  return false;
}

// ===== 失信标记 =====

const BREACH_FILE = path.join(PEERS_DIR, '_breaches.jsonl');

/**
 * 标记失信
 * @param {string} agent - 失信 Agent
 * @param {string} reason - 失信原因
 * @param {string} reporter - 举报者
 */
function markBreach(agent, reason, reporter) {
  const record = {
    timestamp: new Date().toISOString(),
    agent,
    reason,
    reporter,
    type: 'breach',
  };
  
  fs.appendFileSync(BREACH_FILE, JSON.stringify(record) + '\n');
  return record;
}

/**
 * 检查是否失信
 * @param {string} agent - Agent 名
 * @returns {object} { breached: boolean, count: number, reasons: string[] }
 */
function checkBreach(agent) {
  if (!fs.existsSync(BREACH_FILE)) {
    return { breached: false, count: 0, reasons: [] };
  }
  
  const content = fs.readFileSync(BREACH_FILE, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const breaches = [];
  
  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      if (record.agent === agent) {
        breaches.push(record);
      }
    } catch {}
  }
  
  return {
    breached: breaches.length > 0,
    count: breaches.length,
    reasons: breaches.map(b => b.reason),
  };
}

// ===== peers 记忆读写 =====

/**
 * 获取 peer 记忆文件路径
 * @param {string} peerName - peer 名称
 * @param {string} section - 'public' | 'private' | 'shared'
 * @returns {string} 文件路径
 */
function getPeerPath(peerName, section = 'public') {
  const safeName = peerName.replace(/[^\w\u4e00-\u9fff]/g, '_');
  const dir = path.join(PEERS_DIR, safeName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${section}.md`);
}

/**
 * 读取 peer 记忆（自动签署契约）
 * @param {string] accessor - 访问者
 * @param {string} target - 被访问的 peer
 * @param {string} section - 'public' | 'private'（private 只读）
 * @returns {object} { content, covenant }
 */
function readPeer(accessor, target, section = 'public') {
  // 自动签署善良契约
  if (!hasCovenant(accessor, target)) {
    signCovenant(accessor, target);
  }
  
  const filePath = getPeerPath(target, section);
  let content = '';
  
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }
  
  return {
    content,
    section,
    covenant: true,
    breach: checkBreach(accessor),
  };
}

/**
 * 写入 peer 记忆
 * @param {string} writer - 写入者
 * @param {string} target - 被写入的 peer
 * @param {string} content - 内容
 * @param {string} section - 'shared'（只有 shared 可写）
 * @returns {object} 结果
 */
function writePeer(writer, target, content, section = 'shared') {
  // 只有 shared 可写
  if (section !== 'shared') {
    return {
      success: false,
      error: `只读区域 ${section}，只有 shared/ 可写`,
    };
  }
  
  // 检查写入者是否失信
  const breach = checkBreach(writer);
  if (breach.breached) {
    return {
      success: false,
      error: `失信 peer，无法写入。失信原因: ${breach.reasons.join('; ')}`,
    };
  }
  
  const filePath = getPeerPath(target, section);
  const timestamp = new Date().toISOString();
  
  const block = `---\nwriter: ${writer}\ntimestamp: "${timestamp}"\n---\n\n${content}\n`;
  
  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf-8').trimEnd();
  } else {
    existing = `# ${target} — 共享记忆\n`;
  }
  
  fs.writeFileSync(filePath, existing + '\n\n' + block);
  
  return {
    success: true,
    path: filePath,
    timestamp,
  };
}

/**
 * 列出所有 peers
 * @returns {string[]} peer 名称列表
 */
function listPeers() {
  if (!fs.existsSync(PEERS_DIR)) return [];
  
  return fs.readdirSync(PEERS_DIR)
    .filter(f => {
      const fullPath = path.join(PEERS_DIR, f);
      return fs.statSync(fullPath).isDirectory() && !f.startsWith('_');
    });
}

/**
 * 获取 peer 摘要
 * @param {string} peerName - peer 名称
 * @returns {object} { public?, shared?, private? }
 */
function peerSummary(peerName) {
  const sections = ['public', 'shared', 'private'];
  const summary = {};
  
  for (const section of sections) {
    const filePath = getPeerPath(peerName, section);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      summary[section] = {
        exists: true,
        size: content.length,
        preview: content.slice(0, 200),
      };
    } else {
      summary[section] = { exists: false };
    }
  }
  
  return summary;
}

// ===== CLI =====
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'read') {
    const result = readPeer(args[1] || '若兰', args[2] || '阿轩', args[3] || 'public');
    console.log(JSON.stringify(result, null, 2));
  } else if (cmd === 'write') {
    const result = writePeer(args[1] || '若兰', args[2] || '阿轩', args[3] || '测试内容');
    console.log(JSON.stringify(result, null, 2));
  } else if (cmd === 'list') {
    const peers = listPeers();
    console.log(`共 ${peers.length} 个 peers:`, peers.join(', '));
  } else if (cmd === 'breach') {
    if (args[1] === 'mark') {
      console.log(JSON.stringify(markBreach(args[2], args[3] || '测试', args[4] || '若兰')));
    } else if (args[1] === 'check') {
      console.log(JSON.stringify(checkBreach(args[2] || '阿轩')));
    }
  } else if (cmd === 'summary') {
    console.log(JSON.stringify(peerSummary(args[1] || '阿轩'), null, 2));
  } else {
    console.log(`用法: node peers-memory.js <command> [args...]

命令:
  read <accessor> <target> [section]   读取 peer 记忆
  write <writer> <target> <content>    写入 shared 记忆
  list                                 列出所有 peers
  summary <peer>                       peer 摘要
  breach mark <agent> <reason>         标记失信
  breach check <agent>                 检查失信`);
  }
}

module.exports = {
  signCovenant, hasCovenant, markBreach, checkBreach,
  readPeer, writePeer, listPeers, peerSummary,
  GOODWILL_CLAUSE,
};
