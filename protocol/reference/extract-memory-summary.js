#!/usr/bin/env node
/**
 * 日志关键信息提取工具 — P1
 * 
 * 用法: node tools/extract-memory-summary.js [日期]
 * 日期格式: YYYY-MM-DD，省略则用今天
 * 
 * 功能: 扫描当日日志，提取实体、事件、决策、状态变化
 * 输出: 写入 memory/extracted/{date}-summary.md
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const EXTRACTED_DIR = path.join(MEMORY_DIR, 'extracted');
const TOOLS_PATH = path.join(__dirname, '..', 'TOOLS.md');

// 从 TOOLS.md 提取已知实体（智能体名称）
function loadKnownEntities() {
  const entities = { agents: [], projects: [], locations: [] };
  try {
    const tools = fs.readFileSync(TOOLS_PATH, 'utf-8');
    // 提取 A2A 智能体列表
    const a2aMatch = tools.match(/\| \*\*(\S+)\*\*/g);
    if (a2aMatch) {
      a2aMatch.forEach(m => {
        const name = m.replace(/\| \*\*|\*\*/g, '').trim();
        const emojiMatch = tools.match(new RegExp(`\\| \\*\\*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*[^\\n]*\\| [^\\n]*\\| [^\\n]*\\| ([^\\n]+)`));
        if (name) entities.agents.push(name);
      });
    }
  } catch (e) {
    // TOOLS.md 不可用时静默处理
  }
  return entities;
}

// 模式识别：时间戳行
const TIME_PATTERN = /^##?\s*(\d{1,2}:\d{2})/;
const FULL_TIME_PATTERN = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})|(\d{2}:\d{2})/;

// 决策关键词
const DECISION_KEYWORDS = /决定|确认|同意|采纳|选定|✅\s*完成|通过|批准|确定|承诺|约定/;

// 待办/行动项
const ACTION_KEYWORDS = /待办|TODO|需要做|下一步|要做的|[⏰🔄📋]\s/;

// 事件描述
const EVENT_PATTERN = /(创建|更新|修复|添加|删除|部署|启动|停止|重启|推送|发送|完成|上线|下线|迁移|升级|合并|发布)/;

// 用户状态变化
const STATE_KEYWORDS = /情绪|状态|感觉|心情|疲劳|精力|睡眠|醒了|睡了|累了|精神/;

function extractDate(dateStr) {
  if (dateStr) return dateStr;
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now - offset);
  return local.toISOString().split('T')[0];
}

function extractContent(date) {
  const filePath = path.join(MEMORY_DIR, `${date}.md`);
  if (!fs.existsSync(filePath)) {
    console.log(`[提取] 未找到日志: ${date}.md`);
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function analyze(content, date, entities) {
  const lines = content.split('\n');
  const result = {
    date,
    sections: [],
    events: [],
    decisions: [],
    actionItems: [],
    stateChanges: [],
    mentionedAgents: [],
    summary: ''
  };

  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 捕获章节标题
    const sectionMatch = trimmed.match(/^##?\s+(.+)/);
    if (sectionMatch && !sectionMatch[1].match(/^\d/)) {
      currentSection = sectionMatch[1];
      result.sections.push(currentSection);
      continue;
    }

    // 检测决策
    if (DECISION_KEYWORDS.test(trimmed)) {
      result.decisions.push(trimmed.replace(/^-\s*/, ''));
    }

    // 检测行动项
    if (ACTION_KEYWORDS.test(trimmed)) {
      result.actionItems.push(trimmed.replace(/^-\s*/, ''));
    }

    // 检测事件
    if (EVENT_PATTERN.test(trimmed) && !DECISION_KEYWORDS.test(trimmed)) {
      result.events.push({
        section: currentSection,
        text: trimmed.replace(/^-\s*/, '')
      });
    }

    // 检测状态变化
    if (STATE_KEYWORDS.test(trimmed)) {
      result.stateChanges.push(trimmed.replace(/^-\s*/, ''));
    }

    // 检测提及的 Agent
    for (const agent of entities.agents) {
      if (trimmed.includes(agent) && !result.mentionedAgents.includes(agent)) {
        result.mentionedAgents.push(agent);
      }
    }
  }

  // 生成摘要
  const parts = [];
  if (result.decisions.length > 0) {
    parts.push(`决策(${result.decisions.length})`);
  }
  if (result.events.length > 0) {
    parts.push(`事件(${result.events.length})`);
  }
  if (result.actionItems.length > 0) {
    parts.push(`待办(${result.actionItems.length})`);
  }
  if (result.mentionedAgents.length > 0) {
    parts.push(`提及(${result.mentionedAgents.length}个Agent)`);
  }

  result.summary = parts.join(' | ');
  return result;
}

function writeOutput(result) {
  const outputPath = path.join(EXTRACTED_DIR, `${result.date}-summary.md`);
  
  // 检查是否已存在（避免重复覆盖已有手动修改）
  let existing = '';
  if (fs.existsSync(outputPath)) {
    existing = fs.readFileSync(outputPath, 'utf-8');
    // 如果已有今天的提取文件且内容非空，检查是否已包含结构化数据
    if (existing.includes('## 结构化摘要')) {
      console.log(`[提取] ${result.date}-summary.md 已有结构化摘要，跳过`);
      return;
    }
  }

  const output = [
    `# ${result.date} 日志结构摘要`,
    ``,
    `**概览**: ${result.summary}`,
    ``,
    `## 决策记录`,
    result.decisions.length > 0 
      ? result.decisions.map(d => `- ${d}`).join('\n')
      : '- 无明确决策',
    ``,
    `## 关键事件`,
    result.events.length > 0
      ? result.events.map(e => `- [${e.section}] ${e.text}`).join('\n')
      : '- 无明确事件',
    ``,
    `## 待办事项`,
    result.actionItems.length > 0
      ? result.actionItems.map(a => `- ${a}`).join('\n')
      : '- 无待办',
    ``,
    `## 状态变化`,
    result.stateChanges.length > 0
      ? result.stateChanges.map(s => `- ${s}`).join('\n')
      : '- 无状态变化记录',
    ``,
    `## 提及智能体`,
    result.mentionedAgents.length > 0
      ? result.mentionedAgents.map(a => `- ${a}`).join('\n')
      : '- 无',
    ``,
    `## 章节`,
    result.sections.map(s => `- ${s}`).join('\n'),
    ``,
    `---`,
    `_自动提取于 ${new Date().toISOString().slice(0, 16).replace('T', ' ')}_`,
    ''
  ].join('\n');

  fs.writeFileSync(outputPath, output);
  console.log(`[提取] ✅ ${result.date}-summary.md 已生成`);
  console.log(`[提取] ${result.summary}`);
}

// 主流程
function main() {
  const date = extractDate(process.argv[2]);
  const entities = loadKnownEntities();
  const content = extractContent(date);
  
  if (!content) {
    process.exit(1);
  }

  const result = analyze(content, date, entities);
  writeOutput(result);
}

main();
