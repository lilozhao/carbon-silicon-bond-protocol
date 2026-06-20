/**
 * publish — 签字发布
 * 
 * 用法: node index.js publish <议题> <RC路径> <正式版路径>
 */
const fs = require('fs');
const { execSync } = require('child_process');
const logger = require('../lib/logger');
const feishu = require('../lib/feishu-push');

async function run(args) {
  const topic = args[0] || '未命名';
  const rcPath = args[1];
  const finalPath = args[2];

  if (!rcPath || !finalPath) {
    console.error('❌ 请提供 RC 路径和正式版路径');
    console.log('用法: node index.js publish <议题> <RC.md> <正式版.md>');
    return;
  }

  if (!fs.existsSync(rcPath)) {
    console.error(`❌ RC 文件不存在: ${rcPath}`);
    return;
  }

  // 复制 RC → 正式版
  let content = fs.readFileSync(rcPath, 'utf-8');
  content = content.replace(/状态: \*\*🎯 RC — 待签字\*\*/g, '状态: **🎉 正式版 — 已发布**');
  content = content.replace(/签字: ⏳ 待.*/g, `签字: ✅ 一澜 (${new Date().toISOString().slice(0, 10)})`);
  
  fs.writeFileSync(finalPath, content);

  // Gitee 推送
  const repoDir = require('path').join(__dirname, '..', '..', '..');
  try {
    execSync(`cd "${repoDir}" && git add "${finalPath}" && git commit -m "🎉 ${topic} 正式发布" --author="Ruolan <ruolan@ebatom.com>" && git push origin main`, {
      timeout: 15000, encoding: 'utf-8'
    });
    console.log('✅ Gitee 推送成功');
  } catch (e) {
    console.log('⚠️ Gitee 推送失败:', e.message.slice(0, 100));
  }

  // 更新日志
  const logPath = logger.getLogPath(topic);
  if (logPath) logger.setStatus(logPath, 'published');

  const now = new Date().toISOString().slice(0, 10);
  console.log(`\n🎉 ${topic} 正式发布`);
  console.log(`签字: 一澜 (${now})`);
  console.log(`文件: ${finalPath}`);

  await feishu.pushStatus(`🎉 **${topic}** 正式发布\n签字：一澜 (${now})`);
}

module.exports = { run };
