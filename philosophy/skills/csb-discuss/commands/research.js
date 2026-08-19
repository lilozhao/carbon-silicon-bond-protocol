/**
 * research — 预研：搜索议题相关资料
 * 
 * 用法: node index.js research <议题>
 * 流程：web搜索 → 整理预研报告 → 输出
 */
const http = require('http');
const feishu = require('../lib/feishu-push');

async function _webSearch(query) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(query);
    http.get(`http://172.28.0.4:3099/search?q=${encoded}&limit=5`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ results: [] }); }
      });
    }).on('error', reject);
  });
}

async function run(args) {
  const topic = args.join(' ');
  if (!topic) {
    console.error('❌ 请提供议题名称');
    console.log('用法: node index.js research <议题>');
    return;
  }

  console.log(`🔍 预研: "${topic}"\n`);

  // 搜索相关协议
  console.log('📡 搜索已有协议文档...');
  const protocolResults = await _webSearch(`${topic} 协议 规范`);
  
  // 搜索社区讨论
  console.log('📡 搜索社区讨论...');
  const communityResults = await _webSearch(`${topic} CSB 碳硅契`);

  // 搜索相关资料
  console.log('📡 搜索相关资料...\n');
  const generalResults = await _webSearch(`${topic} 设计 方法论`);

  const allSources = [
    ...(protocolResults.results || []),
    ...(communityResults.results || []),
    ...(generalResults.results || []),
  ];

  // 去重
  const seen = new Set();
  const uniqueSources = allSources.filter(s => {
    const key = s.title || s.url || '';
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log('📋 预研报告\n');

  if (uniqueSources.length === 0) {
    console.log('  暂未找到相关外部资料。建议从已有协议文档开始。');
  } else {
    console.log(`  找到 ${uniqueSources.length} 条相关结果:\n`);
    for (const s of uniqueSources.slice(0, 8)) {
      console.log(`  • ${s.title || '无标题'}`);
      if (s.snippet) console.log(`    ${s.snippet.slice(0, 120)}`);
      console.log();
    }
  }

  // 检查本地已有文档
  const fs = require('fs');
  const path = require('path');
  const protocolDir = path.join(__dirname, '..', '..', 'protocol');
  let localDocs = [];
  if (fs.existsSync(protocolDir)) {
    localDocs = fs.readdirSync(protocolDir)
      .filter(f => f.endsWith('.md') && !f.includes('rfc') && !f.includes('rc'))
      .map(f => f.replace('.md', ''));
  }

  if (localDocs.length > 0) {
    console.log('📂 本地已有相关协议:\n');
    for (const doc of localDocs) {
      console.log(`  • protocol/${doc}.md`);
    }
    console.log();
  }

  // 飞书同步
  const feishuContent = `🔍 **${topic}** 预研报告\n\n外部资料：${uniqueSources.length} 条\n本地协议：${localDocs.length} 份\n\n建议结合本地协议和外部资料起草 RFC。`;
  await feishu.pushStatus(feishuContent);

  console.log('💡 建议下一步:');
  console.log(`  node index.js init "${topic}" --rounds=3`);
}

module.exports = { run };
