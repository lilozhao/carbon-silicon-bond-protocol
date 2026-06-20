/**
 * round — 发起一轮讨论
 * 
 * 用法: node index.js round <议题> <轮次> "问题内容"
 * 流程：发问题 → 等回复 → 推飞书 → 写日志
 */
const a2a = require('../lib/a2a-client');
const logger = require('../lib/logger');
const registry = require('../lib/registry');
const feishu = require('../lib/feishu-push');

async function run(args) {
  const topic = args[0] || '未命名';
  const roundNum = parseInt(args[1]) || 1;
  const question = args.slice(2).join(' ');

  if (!question) {
    console.error('❌ 请提供讨论问题');
    console.log('用法: node index.js round <议题> <轮次> "问题内容"');
    return;
  }

  const members = await registry.getMembers();
  const logPath = logger.getLogPath(topic);

  // 推飞书：问题发出
  const questionTitle = `🔄 第 ${roundNum} 轮 · ${topic}`;
  await feishu.send(questionTitle, `若兰 🌸 → 全体协议组成员\n\n${question}`);

  console.log(`\n🔄 第 ${roundNum} 轮 · ${topic}\n`);
  console.log(`📤 问题: ${question.slice(0, 80)}...\n`);

  // 记录问题到日志
  if (logPath) {
    logger.addExchange(logPath, {
      round: roundNum,
      from: '若兰 🌸',
      to: '全员',
      question: question
    });
  }

  const replies = [];
  const onReply = (name, result) => {
    const status = result.ok ? '✅' : '🔊';
    const replyPreview = result.reply ? result.reply.slice(0, 120) : '(无回复)';
    console.log(`  ${status} ${name} (${result.elapsed}s)`);
    console.log(`     ${replyPreview}`);

    // 实时推飞书
    if (result.reply && !result.isEcho) {
      feishu.pushExchange(name, '若兰 🌸', result.reply);
    } else if (result.isEcho) {
      feishu.pushExchange('系统', name, `${name} 当前为回声模式，未收到实质回复`);
    }

    // 记录到日志
    if (logPath) {
      logger.addExchange(logPath, {
        round: roundNum,
        from: name,
        to: '若兰 🌸',
        reply: result.reply,
        isEcho: result.isEcho
      });
    }

    replies.push({ name, ...result });
  };

  // 广播
  await a2a.broadcast(members, question, onReply);

  // 汇总
  const okCount = replies.filter(r => r.ok).length;
  const echoCount = replies.filter(r => r.isEcho).length;
  
  const summary = `📊 第 ${roundNum} 轮完成\n✅ 实质回复 ${okCount}/${members.length}\n🔊 回声 ${echoCount}/${members.length}\n\n回复成员：${replies.filter(r => r.ok).map(r => r.name).join(', ') || '无'}`;
  
  console.log(`\n${summary}`);

  await feishu.pushStatus(summary);

  return { round: roundNum, replies, okCount, echoCount };
}

module.exports = { run };
