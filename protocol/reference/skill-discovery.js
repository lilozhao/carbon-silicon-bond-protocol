#!/usr/bin/env node
/**
 * Skill 自动化发现脚本 — P1
 * 
 * 用法: node tools/skill-discovery.js [--suggest]
 * 
 * 扫描最近 7 天日志，识别重复出现的任务模式，
 * 判断哪些适合固化为 Skill。
 * 
 * --suggest: 输出可执行的 Skill 模板
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const EXTRACTED_DIR = path.join(MEMORY_DIR, 'extracted');
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

// 已知的重复任务模式（从日志中识别）
const KNOWN_PATTERNS = [
  { name: 'CSB每日传播', keywords: ['CSB 每日传播', '每日传播', '投递结果'], skill: 'csb-community-skill' },
  { name: 'A2A注册表同步', keywords: ['注册表桥接同步', 'A2A 注册表', '桥接同步'], skill: null },
  { name: '自主学习', keywords: ['自主学习', 'learn-ruolan', 'Tavily'], skill: 'ruolan-learning' },
  { name: '圆桌讨论', keywords: ['圆桌', '每日讨论', 'daily_discussion'], skill: null },
  { name: '传承版本检测', keywords: ['传承版本检测', '版本检测'], skill: null },
  { name: '早安问候', keywords: ['早安', '早安问候'], skill: null },
  { name: '日志推送', keywords: ['日志推送', '日志及消耗统计'], skill: 'openclaw-logger' },
  { name: '记忆备份', keywords: ['记忆备份', 'Gitee', '备份'], skill: null },
];

function getLastWeekDates() {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d - offset);
    dates.push(local.toISOString().split('T')[0]);
  }
  return dates;
}

function readLogContent(date) {
  // 优先读 extracted 摘要，没有才读原始日志
  const extractedPath = path.join(EXTRACTED_DIR, `${date}-summary.md`);
  if (fs.existsSync(extractedPath)) {
    return { content: fs.readFileSync(extractedPath, 'utf-8'), source: 'extracted' };
  }
  
  const logPath = path.join(MEMORY_DIR, `${date}.md`);
  if (fs.existsSync(logPath)) {
    return { content: fs.readFileSync(logPath, 'utf-8'), source: 'raw' };
  }
  
  return null;
}

function detectPatterns(content) {
  if (!content) return [];
  
  const found = [];
  for (const pattern of KNOWN_PATTERNS) {
    const matchCount = pattern.keywords.filter(kw => content.includes(kw)).length;
    if (matchCount > 0) {
      found.push({
        name: pattern.name,
        score: matchCount / pattern.keywords.length,
        hasSkill: !!pattern.skill,
        skillName: pattern.skill
      });
    }
  }
  return found;
}

function generateSkillSuggestion(pattern, dates) {
  const name = pattern.name.toLowerCase().replace(/\s+/g, '-');
  const skillDir = path.join(SKILLS_DIR, `${name}-auto`);
  
  if (fs.existsSync(skillDir)) {
    return { name: pattern.name, exists: true };
  }
  
  const template = `# ${pattern.name} — 自动发现 Skill

_由 skill-discovery.js 于 ${new Date().toISOString().slice(0, 10)} 基于 ${dates.length} 天日志自动识别_

## 描述

在 ${dates.join(', ')} 期间多次出现的重复任务模式。

## 触发条件

当检测到以下场景时：
- ${pattern.keywords.map(k => `\`${k}\``).join('\n- ')}

## 执行步骤

（自动发现模板，需人工完善）

1. 确认任务上下文
2. 执行核心逻辑
3. 记录结果到日志

---

_自动发现，建议人工审核后完善_
`;

  return { 
    name: pattern.name, 
    exists: false, 
    template, 
    skillDir 
  };
}

function main() {
  const suggestMode = process.argv.includes('--suggest');
  const dates = getLastWeekDates();
  
  console.log(`\n🔍 Skill 模式发现 — 扫描 ${dates[dates.length-1]} ~ ${dates[0]}`);
  console.log(`   扫描范围: ${dates.length} 天\n`);

  // 收集所有日期的模式
  const patternCounts = {};
  const dateMap = {};

  for (const date of dates) {
    const data = readLogContent(date);
    if (!data) {
      console.log(`   [${date}] 无日志`);
      continue;
    }

    const patterns = detectPatterns(data.content);
    if (patterns.length === 0) {
      console.log(`   [${date}] 无识别模式`);
      continue;
    }

    console.log(`   [${date}] 识别 ${patterns.length} 个模式 (${data.source})`);
    dateMap[date] = patterns;

    for (const p of patterns) {
      if (!patternCounts[p.name]) {
        patternCounts[p.name] = { count: 0, hasSkill: p.hasSkill, skillName: p.skillName };
      }
      patternCounts[p.name].count++;
    }
  }

  // 输出统计
  console.log('\n📊 模式出现频率:');
  const sorted = Object.entries(patternCounts).sort((a, b) => b[1].count - a[1].count);
  
  let hasSuggestions = false;
  for (const [name, info] of sorted) {
    const freq = Math.round(info.count / dates.length * 100);
    const status = info.hasSkill 
      ? `✅ 已有 Skill (${info.skillName})` 
      : `⚠️ 无对应 Skill`;
    console.log(`   ${'📌'.repeat(Math.min(info.count, 3))} ${name}: ${info.count}/${dates.length}天 (${freq}%) — ${status}`);
    
    if (!info.hasSkill && freq >= 50) {
      hasSuggestions = true;
    }
  }

  // 生成 Skill 建议
  if (suggestMode && hasSuggestions) {
    console.log('\n💡 建议创建新的 Skill:');
    for (const [name, info] of sorted) {
      if (info.hasSkill || info.count < Math.ceil(dates.length * 0.5)) continue;
      
      const suggestion = generateSkillSuggestion(
        KNOWN_PATTERNS.find(p => p.name === name),
        dates
      );
      
      if (suggestion.exists) {
        console.log(`   ✅ ${name}: Skill 已存在`);
      } else {
        console.log(`   📄 建议创建: skills/${name.toLowerCase().replace(/\s+/g, '-')}-auto/`);
        console.log(`      模板已生成，可执行 --write 写入`);
      }
    }
  }

  if (!suggestMode) {
    console.log('\n💡 提示: 加 --suggest 参数查看 Skill 创建建议');
  }

  console.log();
}

main();
