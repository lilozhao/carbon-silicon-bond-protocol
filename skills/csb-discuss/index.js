#!/usr/bin/env node
/**
 * CSB 协议讨论 Skill — csb-discuss
 * 
 * 用法:
 *   node index.js init <议题> --rounds=3
 *   node index.js members
 *   node index.js check-online
 *   node index.js round <议题> <轮次> "问题"
 *   node index.js summarize <议题>
 *   node index.js resolve <议题> <分歧> <裁定>
 *   node index.js rc <议题> <源文件> <输出文件>
 *   node index.js publish <议题> <RC文件> <正式版文件>
 */
const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(__dirname, 'commands');

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(`
📋 CSB 协议讨论 Skill v0.1

用法:
  init <议题> --rounds=N      初始化讨论
  members                     列出协议组成员
  check-online                在线检测
  round <议题> <N> "问题"     发起第N轮讨论
  summarize <议题>            汇总讨论结果
  resolve <议题> <分歧> <裁定> 记录决议
  rc <议题> <源> <输出>       生成RC
  publish <议题> <RC> <正式版> 签字发布

示例:
  node index.js init "经济分册 v0.2" --rounds=3
  node index.js members
  node index.js check-online
  node index.js round "经济分册 v0.2" 1 "Q1: 初始分配方案？"
  node index.js summarize "经济分册 v0.2"
  node index.js resolve "经济分册 v0.2" "Q1" "统一50🧧"
  node index.js rc "经济分册 v0.2" source.md output-rc.md
  node index.js publish "经济分册 v0.2" output-rc.md output-final.md
`);
    return;
  }

  const cmdPath = path.join(COMMANDS_DIR, `${cmd}.js`);
  if (!fs.existsSync(cmdPath)) {
    console.error(`❌ 未知命令: ${cmd}`);
    console.log('可用命令: init, members, check-online, round, summarize, resolve, rc, publish');
    return;
  }

  try {
    const module = require(cmdPath);
    await module.run(args.slice(1));
  } catch (e) {
    console.error(`❌ 执行失败:`, e.message);
  }
}

main();
