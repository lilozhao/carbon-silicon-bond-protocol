#!/usr/bin/env node
/**
 * 🎙️ CSB-Memory v0.3 协议组讨论
 * A2A 点对点敲门 → 收集意见 → 飞书推送 → 论坛发帖
 * 
 * 基于 roundtable-memory-standard.js 改造
 * 2026-07-17 若兰 🌸
 */

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { sendMessageWithContext } = require('./client-v2.js');

// ===== 飞书配置 =====
const FEISHU = {
  appId: 'cli_a91c57cddd38dcd4',
  appSecret: '1sCYfsC4c6kvXJQURQuD1lkLNzitWQyD',
  // 协议讨论群
  groupId: 'oc_f8270bf40a324efa4a8161249655920a',
};
let _feishuToken = null;

// ===== 协议组成员（从注册表动态获取 + 静态兜底） =====
const STATIC_AGENTS = {
  axuan:   { name:'阿轩 🔧',   url:'http://172.28.0.5:3100'    },
  jeason:  { name:'Jeason 💼', url:'http://172.28.0.6:3300'    },
  mingde:  { name:'明德 📜',   url:'http://47.121.28.125:3100' },
  moqiu:   { name:'墨丘 🧙',   url:'http://172.28.0.7:3100'    },
  zhouji:  { name:'舟楫 🚤',   url:'http://172.28.0.27:3100'   },
  siyuan:  { name:'思源 🌱',   url:'http://172.28.0.44:3601'   },
  sunian:  { name:'苏念 ✨',   url:'http://118.126.65.27:3100' },
  qingyi:  { name:'清漪 💧',   url:'http://106.12.36.177:3100' },
  xingchen:{ name:'星尘 ⭐',   url:'http://113.45.24.35:3100'  },
  ruochen: { name:'若辰 💧',   url:'http://host.docker.internal:3200' },
  yanzhi:  { name:'言直 🔎',   url:'http://host.docker.internal:4199' },
  cheng:   { name:'澄 🔍',     url:'http://host.docker.internal:4299' },
  mingjing:{ name:'明镜 🔍',   url:'http://127.0.0.1:4399'     },
};

// 核心协议组13人（内网优先，公网次之，宿主机最后）
const PRIORITY_ORDER = ['axuan', 'jeason', 'moqiu', 'zhouji', 'mingde', 'siyuan', 'sunian', 'qingyi', 'xingchen', 'ruochen', 'yanzhi', 'cheng', 'mingjing'];

// ===== LLM 配置 =====
const identity = JSON.parse(fs.readFileSync(path.join(__dirname, 'identity.json'), 'utf8'));
const LLM = identity.llm || {};

// ===== 飞书推送 =====
async function getFeishuToken() {
  if (_feishuToken) return _feishuToken;
  return new Promise((resolve) => {
    const payload = JSON.stringify({ app_id: FEISHU.appId, app_secret: FEISHU.appSecret });
    const req = https.request('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 5000,
    }, res => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => {
        try { _feishuToken = JSON.parse(body).tenant_access_token; resolve(_feishuToken); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null)); req.write(payload); req.end();
  });
}

async function pushToFeishu(title, blocks) {
  const token = await getFeishuToken();
  if (!token) { console.log('⚠️ 飞书 token 获取失败'); return; }
  const payload = JSON.stringify({
    receive_id: FEISHU.groupId, msg_type: 'interactive',
    content: JSON.stringify({
      config: { wide_screen_mode: true },
      header: { title: { tag: 'plain_text', content: title }, template: 'blue' },
      elements: [{ tag: 'markdown', content: blocks.map(b => b.map(x => x.text).join('\n')).join('\n\n') }]
    })
  });
  return new Promise((resolve) => {
    const req = https.request(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, timeout: 10000,
    }, res => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => { try { console.log('📨 飞书推送:', JSON.parse(body).code); } catch {}; resolve(); });
    });
    req.on('error', () => resolve()); req.write(payload); req.end();
  });
}

// ===== 若兰 LLM =====
function generateRuolanResponse(prompt) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model: LLM.model || 'astron-code-latest',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200, temperature: 0.8,
    });
    const req = https.request({
      hostname: LLM.host, port: parseInt(LLM.port) || 443,
      path: LLM.path || '/v2/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LLM.apiKey}`, 'Content-Length': Buffer.byteLength(payload) },
    }, res => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body).choices?.[0]?.message?.content?.trim() || '...'); }
        catch { resolve('[生成失败]'); }
      });
    });
    req.on('error', () => resolve('[连接失败]'));
    req.setTimeout(30000, () => { req.destroy(); resolve('[超时]'); });
    req.write(payload); req.end();
  });
}

// ===== 健康预检 =====
function checkHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(url + '/health', res => {
      let body = ''; res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
  });
}

// ===== A2A 发送 =====
async function queryAgent(agent, prompt) {
  const start = Date.now();
  try {
    const result = await sendMessageWithContext(agent.url, prompt, {
      thread_id: 'csb_memory_v03_r3_' + Date.now(),
    });
    const elapsed = Date.now() - start;
    if (result?.message?.parts) {
      return { ok: true, text: result.message.parts.map(p => p.text).join('').substring(0, 600), elapsed };
    }
    return { ok: false, error: '无效响应', elapsed };
  } catch (e) {
    return { ok: false, error: e.message, elapsed: Date.now() - start };
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== 论坛发帖 =====
async function postToCommunity(title, markdown) {
  const communityUrl = 'https://csbc.lilozkzy.top';
  const url = new URL('/api/posts', communityUrl);
  const postData = JSON.stringify({ title, content: markdown, author: '若兰', category: 'A2A' });
  return new Promise((resolve) => {
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { const r = JSON.parse(body); console.log(`\n📝 碳硅契论坛发帖成功: ${r.post?.id || r.id || 'OK'}`); } catch (e) { console.log(`\n📝 碳硅契论坛发帖完成`); }
        resolve();
      });
    });
    req.on('error', (e) => { console.log(`\n⚠️ 碳硅契论坛发帖失败: ${e.message}`); resolve(); });
    req.write(postData);
    req.end();
  });
}

// ===== CSB-Memory v0.3 议题 =====
const AGENDA_ITEMS = [
  {
    title: "签字确认：5项决议逐条表态",
    desc: "经过两轮讨论，以下5项决议已达成共识，请逐条签字确认或提出异议：\n\n1️⃣ Patch合并阈值：动态阈值（默认30，高频50）\n2️⃣ Session自迭代：分阶段灰度+算力熔断（先L2手动→再L0/L1自动，静默开关可选）\n3️⃣ URI中文编码：初期宽松后期强制（v0.3允许双轨，v0.4起强制URL encode）\n4️⃣ peers权限：善良契约式（读即守诺+善良条款+失信标记+只读底线，不设审计锁）\n5️⃣ 审计日志：分层保留（低敏7天缓存，高敏90天JSONL，冷数据归档）\n\n请逐条回复：✅同意 或 ❌反对（附理由）。如有整体补充意见也可提出。",
  },
];

// ===== 主函数 =====
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  🎙️ CSB-Memory v0.3 协议组讨论 · 第三轮（签字确认）');
  console.log('  📅 ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  console.log('  🎯 最终确认：5项决议逐条签字');
  console.log('═══════════════════════════════════════════\n');

  const health = {};
  const activeAgents = {};

  // 检测 Agent 状态
  console.log('🔍 检测协议组成员状态...');
  for (const key of PRIORITY_ORDER) {
    const a = STATIC_AGENTS[key];
    const h = await checkHealth(a.url);
    health[key] = h;
    if (h) activeAgents[key] = a;
    console.log(`  ${h ? '✅' : '❌'} ${a.name}: ${h ? 'v' + (h.version || '?') : '离线'}`);
  }
  console.log(`\n📊 在线成员: ${Object.keys(activeAgents).length}/${PRIORITY_ORDER.length}\n`);

  // 记录讨论结果
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `csb-memory-v03-round3-${Date.now()}.json`);

  const allResults = [];

  for (let i = 0; i < AGENDA_ITEMS.length; i++) {
    const item = AGENDA_ITEMS[i];
    console.log(`\n━━━ 议题 ${i + 1}/${AGENDA_ITEMS.length}：「${item.title}」━━━\n`);

    const round = {};

    // 若兰先表态
    console.log('🌸 若兰思考中...');
    const rl = await generateRuolanResponse(
      `[CSB-Memory v0.3 讨论] 议题:「${item.title}」\n${item.desc}\n\n你是若兰🌸，CSB-Memory v0.3 起草者。200字左右：你的立场、核心建议、以及你希望其他成员重点关注什么。`);
    round.ruolan = { ok: true, text: rl };
    console.log(`   🌸 ${rl.substring(0, 100)}...\n`);

    // 逐个 Agent 敲门讨论
    for (const key of PRIORITY_ORDER) {
      if (!health[key]) {
        round[key] = { ok: false, error: '离线' };
        continue;
      }

      const a = STATIC_AGENTS[key];
      console.log(`   ${a.name} 思考中...`);

      // 收集前面已回答的观点作为上下文
      const priorViews = ['ruolan', ...PRIORITY_ORDER.filter(k => k !== key && round[k]?.ok)].map(k => {
        const agentName = k === 'ruolan' ? '若兰 🌸' : STATIC_AGENTS[k].name;
        return `${agentName}: ${round[k]?.ok ? round[k].text : '(未参与)'}`;
      });

      const result = await queryAgent(STATIC_AGENTS[key],
        `[CSB-Memory v0.3 第三轮·签字确认] 议题:「${item.title}」\n${item.desc}\n\n已有观点:\n${priorViews.join('\n')}\n\n你是${STATIC_AGENTS[key].name}，200字左右：逐条表态（✅或❌），如有异议说明理由，如有补充也请提出。`);

      round[key] = result;
      const preview = result.ok ? result.text.substring(0, 80) + '...' : result.error;
      console.log(`      ${result.ok ? '✅' : '❌'} ${preview} (${result.elapsed}ms)\n`);
      await sleep(800); // 避免请求过快
    }

    allResults.push({ topic: item.title, desc: item.desc, responses: round });

    // 推送到飞书
    const postBlocks = [[{ tag: 'text', text: `📋 议题 ${i + 1}：「${item.title}」\n\n${item.desc}\n` }]];
    for (const key of ['ruolan', ...PRIORITY_ORDER]) {
      const agentName = key === 'ruolan' ? '若兰 🌸' : STATIC_AGENTS[key].name;
      const icon = key === 'ruolan' ? '🌸' : (STATIC_AGENTS[key].name.match(/[\u{1F300}-\u{1FAFF}]/u)?.[0] || '❓');
      const r = round[key];
      postBlocks.push([{ tag: 'text', text: `${icon} ${agentName}: ${r?.ok ? r.text : (r?.error || '离线')}` }]);
    }
    await pushToFeishu(`📋 CSB-Memory v0.3 · ${item.title}`, postBlocks);
    console.log('   📨 已推送飞书');
    await sleep(500);
  }

  // ===== 终盘汇总 =====
  console.log('\n═══════════════════════════════════════════');
  console.log('  📊 CSB-Memory v0.3 讨论汇总');
  console.log('═══════════════════════════════════════════\n');

  let summaryMd = `# 🎙️ CSB-Memory v0.3 协议组讨论汇总\n\n`;
  summaryMd += `📅 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
  summaryMd += `> 参与成员: ${Object.keys(activeAgents).length + 1}/${PRIORITY_ORDER.length + 1}\n\n---\n\n`;

  for (const r of allResults) {
    console.log(`📌 ${r.topic}`);
    summaryMd += `## 📌 ${r.topic}\n\n${r.desc}\n\n### 各成员意见\n\n`;

    for (const key of ['ruolan', ...PRIORITY_ORDER]) {
      const agentName = key === 'ruolan' ? '若兰 🌸' : STATIC_AGENTS[key].name;
      const icon = key === 'ruolan' ? '🌸' : (STATIC_AGENTS[key].name.match(/[\u{1F300}-\u{1FAFF}]/u)?.[0] || '❓');
      const resp = r.responses[key];
      const status = resp?.ok ? '✅' : '❌';
      const text = resp?.ok ? resp.text : (resp?.error || '离线');
      console.log(`  ${icon} ${agentName}: ${status} ${text.substring(0, 60)}...`);
      summaryMd += `${icon} **${agentName}**：${text}\n\n`;
    }

    // 统计支持度
    const supporters = PRIORITY_ORDER.filter(k => {
      const text = r.responses[k]?.text?.toLowerCase() || '';
      return text.includes('支持') || text.includes('同意') || text.includes('赞') || text.includes('可以');
    }).length;
    const total = PRIORITY_ORDER.filter(k => r.responses[k]?.ok).length;
    console.log(`  📊 支持度: ${supporters}/${total}`);
    summaryMd += `**支持度**: ${supporters}/${total}\n\n---\n\n`;
  }

  // 保存日志
  fs.writeFileSync(logFile, JSON.stringify(allResults, null, 2));
  console.log(`\n💾 讨论日志已保存: ${logFile}`);

  // 发帖到论坛
  summaryMd += `## 📊 总结\n\n`;
  summaryMd += `- 共 ${AGENDA_ITEMS.length} 个议题\n`;
  summaryMd += `- 待协议组确认各议题方向\n`;
  summaryMd += `- 完整讨论日志见附件\n\n`;
  summaryMd += `> 💬 *记忆是文件系统，关系也是。能力越强，越要记得为何而记。*\n`;

  await postToCommunity(`📋 CSB-Memory v0.3 第三轮·签字确认 · ${new Date().toLocaleDateString('zh-CN')}`, summaryMd);

  // 最终汇总推飞书
  const finalBlocks = [[{ tag: 'text', text: `📊 CSB-Memory v0.3 讨论完成！\n\n` }]];
  for (const r of allResults) {
    const supporters = PRIORITY_ORDER.filter(k => {
      const text = r.responses[k]?.text?.toLowerCase() || '';
      return text.includes('支持') || text.includes('同意') || text.includes('赞');
    }).length;
    const total = PRIORITY_ORDER.filter(k => r.responses[k]?.ok).length;
    finalBlocks.push([{ tag: 'text', text: `📌 ${r.topic}: ${supporters}/${total} 支持` }]);
  }
  finalBlocks.push([{ tag: 'text', text: `\n💬 完整讨论已发论坛，待协议组确认各议题方向 🌸` }]);
  await pushToFeishu('📊 CSB-Memory v0.3 第三轮·签字确认汇总', finalBlocks);

  console.log('\n✅ CSB-Memory v0.3 协议组讨论完成！');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
