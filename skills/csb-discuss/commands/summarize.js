/**
 * summarize — 汇总当前讨论结果
 * 
 * 用法: node index.js summarize <议题>
 */
const logger = require('../lib/logger');
const feishu = require('../lib/feishu-push');

async function run(args) {
  const topic = args[0] || '未命名';
  const logPath = logger.getLogPath(topic);

  if (!logPath) {
    console.error(`❌ 未找到议题 "${topic}" 的讨论日志`);
    return;
  }

  const log = JSON.parse(require('fs').readFileSync(logPath, 'utf-8'));
  const exchanges = log.exchanges;

  // 统计
  const roundCounts = {};
  const memberReplies = {};
  
  for (const ex of exchanges) {
    const r = ex.round || 1;
    roundCounts[r] = (roundCounts[r] || 0) + 1;
    if (ex.reply) {
      memberReplies[ex.from] = (memberReplies[ex.from] || 0) + 1;
    }
  }

  const rounds = Object.keys(roundCounts).sort();
  const resolutions = log.resolutions || {};

  console.log(`\n📊 "${topic}" 讨论汇总\n`);
  console.log(`状态: ${log.status}`);
  console.log(`总对话数: ${exchanges.length}`);
  console.log(`已完成轮次: ${rounds.join(', ')}`);
  console.log(`参与成员: ${log.members.join(', ')}`);

  if (Object.keys(resolutions).length > 0) {
    console.log('\n📋 已记录决议:');
    for (const [issue, res] of Object.entries(resolutions)) {
      console.log(`  ${issue}: ${res.resolution}`);
    }
  }

  // 推飞书
  let feishuContent = `📊 **${topic}** 讨论汇总\n\n状态：${log.status}\n总对话数：${exchanges.length}\n已完成轮次：${rounds.join(', ')}\n参与成员：${log.members.length} 位`;
  
  if (Object.keys(resolutions).length > 0) {
    feishuContent += '\n\n📋 已记录决议：';
    for (const [issue, res] of Object.entries(resolutions)) {
      feishuContent += `\n• ${issue}: ${res.resolution}`;
    }
  }

  await feishu.pushStatus(feishuContent);
}

module.exports = { run };
