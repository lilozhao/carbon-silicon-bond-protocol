/**
 * members — 列出协议组成员
 * 
 * 用法: node index.js members
 */
const registry = require('../lib/registry');
const feishu = require('../lib/feishu-push');

async function run() {
  const members = await registry.getMembers(true);

  console.log('👥 协议组成员:\n');
  for (const m of members) {
    const regStatus = m.inRegistry ? '📡' : '📝';
    console.log(`  ${regStatus} ${m.name}`);
    console.log(`     ${m.url}`);
  }
  console.log(`\n共 ${members.length} 位 (📡=注册表可见 📝=静态名单)`);

  await feishu.pushStatus(
    `👥 当前协议组成员：\n${members.map(m => `• ${m.name} ${m.inRegistry ? '📡' : '📝'}`).join('\n')}`
  );

  return members;
}

module.exports = { run };
