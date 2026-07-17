#!/usr/bin/env node
/**
 * audit-logger.js — CSB-Memory v0.3 检索轨迹审计
 * 
 * 记忆访问可追溯：
 * - 每次检索生成轨迹记录
 * - JSONL 格式，每日一个文件
 * - 分层保留：低敏7天，高敏90天，冷归档
 */

const fs = require('fs');
const path = require('path');

const AUDIT_DIR = path.join('/home/node/.openclaw/workspace', 'memory', 'audit');

// 确保目录存在
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

/**
 * 生成 Trace ID
 */
function generateTraceId() {
  return 'trace_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

/**
 * 记录检索轨迹
 * @param {object} params
 * @param {string} params.requester - 请求者
 * @param {string} params.intent - 检索意图
 * @param {object[]} params.steps - 检索步骤
 * @param {object} params.result - 检索结果
 * @param {string} params.sensitivity - 低敏/高敏
 */
function logTrace({ requester = 'unknown', intent = '', steps = [], result = {}, sensitivity = 'low' }) {
  const trace = {
    trace_id: generateTraceId(),
    timestamp: new Date().toISOString(),
    requester,
    intent,
    steps,
    result: {
      entries_returned: result.entries_returned || 0,
      tokens_used: result.tokens_used || 0,
    },
    sensitivity,
  };
  
  // 写入每日文件
  const dateStr = new Date().toISOString().slice(0, 10);
  const filePath = path.join(AUDIT_DIR, `${dateStr}.jsonl`);
  fs.appendFileSync(filePath, JSON.stringify(trace) + '\n');
  
  return trace.trace_id;
}

/**
 * 查询审计日志
 * @param {object} filter
 * @param {string} filter.since - 起始日期
 * @param {string} filter.until - 结束日期
 * @param {string} filter.requester - 请求者
 * @param {string} filter.traceId - Trace ID
 * @returns {object[]} 轨迹记录
 */
function queryAudit({ since, until, requester, traceId } = {}) {
  if (!fs.existsSync(AUDIT_DIR)) return [];
  
  const files = fs.readdirSync(AUDIT_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .sort();
  
  const results = [];
  
  for (const file of files) {
    const dateStr = file.replace('.jsonl', '');
    if (since && dateStr < since) continue;
    if (until && dateStr > until) continue;
    
    const content = fs.readFileSync(path.join(AUDIT_DIR, file), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        if (requester && record.requester !== requester) continue;
        if (traceId && record.trace_id !== traceId) continue;
        results.push(record);
      } catch {}
    }
  }
  
  return results;
}

/**
 * 清理过期审计日志
 * @param {number} lowSensDays - 低敏保留天数（默认7）
 * @param {number} highSensDays - 高敏保留天数（默认90）
 * @returns {object} 清理结果
 */
function cleanupAudit(lowSensDays = 7, highSensDays = 90) {
  if (!fs.existsSync(AUDIT_DIR)) return { cleaned: 0, kept: 0 };
  
  const files = fs.readdirSync(AUDIT_DIR).filter(f => f.endsWith('.jsonl'));
  const now = new Date();
  let cleaned = 0;
  let kept = 0;
  
  for (const file of files) {
    const dateStr = file.replace('.jsonl', '');
    const fileDate = new Date(dateStr);
    const ageDays = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
    
    // 读取文件，按敏感度判断是否过期
    const filePath = path.join(AUDIT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    let hasHighSens = false;
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        if (record.sensitivity === 'high') {
          hasHighSens = true;
          break;
        }
      } catch {}
    }
    
    const maxAge = hasHighSens ? highSensDays : lowSensDays;
    
    if (ageDays > maxAge) {
      // 移动到归档目录
      const archiveDir = path.join(AUDIT_DIR, 'archive');
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(filePath, path.join(archiveDir, file));
      cleaned++;
    } else {
      kept++;
    }
  }
  
  return { cleaned, kept };
}

/**
 * 统计审计信息
 * @returns {object} 统计信息
 */
function stats() {
  if (!fs.existsSync(AUDIT_DIR)) {
    return { totalFiles: 0, totalTraces: 0, todayTraces: 0 };
  }
  
  const files = fs.readdirSync(AUDIT_DIR).filter(f => f.endsWith('.jsonl'));
  let totalTraces = 0;
  let todayTraces = 0;
  const today = new Date().toISOString().slice(0, 10);
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(AUDIT_DIR, file), 'utf-8');
    const count = content.split('\n').filter(l => l.trim()).length;
    totalTraces += count;
    if (file.includes(today)) todayTraces = count;
  }
  
  return { totalFiles: files.length, totalTraces, todayTraces };
}

// ===== CLI =====
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  
  if (cmd === 'log') {
    const id = logTrace({
      requester: args[1] || 'test',
      intent: args[2] || '测试检索',
      steps: [{ action: 'query', result: '2 entries' }],
      result: { entries_returned: 2, tokens_used: 100 },
    });
    console.log(`轨迹已记录: ${id}`);
  } else if (cmd === 'query') {
    const filter = {};
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--since') filter.since = args[++i];
      if (args[i] === '--until') filter.until = args[++i];
      if (args[i] === '--requester') filter.requester = args[++i];
      if (args[i] === '--trace') filter.traceId = args[++i];
    }
    const results = queryAudit(filter);
    console.log(`找到 ${results.length} 条轨迹:`);
    results.slice(0, 5).forEach(r => {
      console.log(`  ${r.trace_id} [${r.timestamp}] ${r.requester}: ${r.intent}`);
    });
  } else if (cmd === 'cleanup') {
    const result = cleanupAudit(parseInt(args[1]) || 7, parseInt(args[2]) || 90);
    console.log(`清理完成: ${result.cleaned} 归档, ${result.kept} 保留`);
  } else if (cmd === 'stats') {
    const s = stats();
    console.log(`📊 审计统计:`);
    console.log(`   日志文件: ${s.totalFiles}`);
    console.log(`   总轨迹: ${s.totalTraces}`);
    console.log(`   今日轨迹: ${s.todayTraces}`);
  } else {
    console.log(`用法: node audit-logger.js <command> [args...]

命令:
  log <requester> <intent>   记录一条轨迹
  query [--since DATE] [--until DATE] [--requester NAME] [--trace ID]
  cleanup [lowDays] [highDays]  清理过期日志
  stats                      统计信息`);
  }
}

module.exports = { logTrace, queryAudit, cleanupAudit, stats };
