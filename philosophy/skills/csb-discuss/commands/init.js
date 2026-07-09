/**
 * init — 初始化讨论
 * 
 * 用法: node index.js init <议题名> --rounds=3
 */
const logger = require('../lib/logger');
const registry = require('../lib/registry');
const feishu = require('../lib/feishu-push');

async function run(args) {
  const topic = args[0] || '未命名议题';
  const roundsIdx = args.indexOf('--rounds');
  const rounds = roundsIdx >= 0 ? parseInt(args[roundsIdx + 1]) || 3 : 3;

  // 获取成员
  const members = await registry.getMembers();
  const memberList = members.map(m => m.name);

  // 创建日志
  const logPath = logger.createLog(topic, rounds, memberList);
  
  const summary = [
    `议题: ${topic}`,
    `总轮数: ${rounds}`,
    `成员: ${memberList.join(', ')}`,
    `日志: ${logPath}`,
  ].join('\n');

  console.log('📋 讨论初始化完成\n');
  console.log(summary);

  // 飞书推送
  await feishu.pushStatus(
    `📋 **${topic}** 讨论初始化\n\n${summary}`
  );

  return { topic, rounds, members, logPath };
}

module.exports = { run };
