/**
 * storm — 头脑风暴：自动拆解议题的子问题
 * 
 * 用法: node index.js storm <议题>
 * 流程：调用 LLM 生成子问题列表 → 输出给用户选题
 */
const http = require('http');
const https = require('https');
const feishu = require('../lib/feishu-push');

const LLM_CONFIG = {
  host: 'maas-coding-api.cn-huabei-1.xf-yun.com',
  port: '443',
  path: '/v2/chat/completions',
  apiKey: '2351aa5ee3af9ff63f2e05ee82d838fe:Y2NhMjQxY2JhOTlmNDZhOTE0Yjc5MWEz',
  model: 'astron-code-latest'
};

async function _callLLM(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: LLM_CONFIG.model,
      messages: [
        { role: 'system', content: '你是一个研究规划助手。给定一个议题，你负责拆解出3~5个子问题，每个子问题有清晰的边界和讨论价值。输出格式为JSON数组。只输出JSON，不要其他文字。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const mod = LLM_CONFIG.port === '443' ? https : http;
    const req = mod.request({
      hostname: LLM_CONFIG.host,
      port: parseInt(LLM_CONFIG.port),
      path: LLM_CONFIG.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 30000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          const text = r.choices?.[0]?.message?.content || '';
          resolve(text);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run(args) {
  const topic = args.join(' ');
  if (!topic) {
    console.error('❌ 请提供议题名称');
    console.log('用法: node index.js storm <议题>');
    return;
  }

  console.log(`🌀 头脑风暴: "${topic}"\n`);

  const prompt = `议题: ${topic}

请拆解这个议题为3~5个子问题。每个子问题应：
1. 有独立讨论价值
2. 边界清晰
3. 适合在A2A协议组讨论中逐轮收敛

输出JSON格式：
[
  {"id": 1, "question": "子问题1", "why": "为什么这个问题重要", "suggested_round": 1},
  {"id": 2, "question": "子问题2", "why": "...", "suggested_round": 1},
]`;

  try {
    const result = await _callLLM(prompt);
    let questions;
    try {
      // 尝试解析 JSON
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      questions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result);
    } catch (e) {
      // LLM 没返回合法 JSON，直接显示原文
      console.log('🤖 LLM 建议:\n');
      console.log(result);
      await feishu.pushStatus(`🌀 头脑风暴: ${topic}\n\n${result.slice(0, 500)}`);
      return;
    }

    console.log('📋 建议子问题:\n');
    for (const q of questions) {
      console.log(`  Q${q.id}. ${q.question}`);
      console.log(`     ${q.why}`);
      console.log(`     建议第 ${q.suggested_round || '?'} 轮讨论\n`);
    }

    // 同步到飞书
    const feishuContent = `🌀 **${topic}** 头脑风暴\n\n${questions.map(q => `• Q${q.id}: ${q.question}`).join('\n')}\n\n建议讨论轮次：${Math.max(...questions.map(q => q.suggested_round || 1))} 轮`;
    await feishu.pushStatus(feishuContent);

    console.log(`💡 你可以用以下命令开始讨论:`);
    console.log(`  node index.js init "${topic}" --rounds=${Math.max(...questions.map(q => q.suggested_round || 1))}`);
    for (const q of questions) {
      console.log(`  node index.js round "${topic}" ${q.suggested_round || 1} "Q${q.id}: ${q.question}"`);
    }

  } catch (e) {
    console.error('❌ 调用 LLM 失败:', e.message);
  }
}

module.exports = { run };
