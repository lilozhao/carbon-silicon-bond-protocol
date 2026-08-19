/**
 * rc — 生成 Release Candidate 版本
 * 
 * 用法: node index.js rc <议题> <源RFC路径> <输出RC路径>
 */
const fs = require('fs');
const logger = require('../lib/logger');
const feishu = require('../lib/feishu-push');

async function run(args) {
  const topic = args[0] || '未命名';
  const sourcePath = args[1];
  const outputPath = args[2];

  if (!sourcePath || !outputPath) {
    console.error('❌ 请提供源文件路径和输出路径');
    console.log('用法: node index.js rc <议题> <源RFC.md> <输出RC.md>');
    return;
  }

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ 源文件不存在: ${sourcePath}`);
    return;
  }

  const logPath = logger.getLogPath(topic);
  let changelog = '';
  
  if (logPath) {
    const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    const resolutions = log.resolutions || {};
    changelog = Object.entries(resolutions)
      .map(([k, v]) => `- ${k}: ${v.resolution}`)
      .join('\n');
  }

  // 复制源文件为 RC
  let content = fs.readFileSync(sourcePath, 'utf-8');
  
  // 更新状态标记
  content = content.replace(/状态: \*\*.*?\*\*/g, '状态: **🎯 RC — 待签字**');
  
  fs.writeFileSync(outputPath, content);

  console.log(`🎯 RC 已生成: ${outputPath}`);
  if (changelog) {
    console.log(`\n📋 包含决议:\n${changelog}`);
  }

  await feishu.pushStatus(`🎯 RC 已生成\n议题：${topic}\n输出：${outputPath}`);
}

module.exports = { run };
