/**
 * resolve — 记录决议
 * 
 * 用法: node index.js resolve <议题> <分歧点> <裁定结果>
 */
const logger = require('../lib/logger');
const feishu = require('../lib/feishu-push');

async function run(args) {
  const topic = args[0] || '未命名';
  const issue = args[1] || '未指定议题';
  const resolution = args.slice(2).join(' ');

  if (!resolution) {
    console.error('❌ 请提供裁定结果');
    return;
  }

  const logPath = logger.getLogPath(topic);

  if (logPath) {
    logger.addResolution(logPath, issue, resolution);
  }

  console.log(`📋 决议已记录:`);
  console.log(`  议题: ${issue}`);
  console.log(`  裁定: ${resolution}`);

  await feishu.pushStatus(`📋 决议\n• ${issue}: ${resolution}`);
}

module.exports = { run };
