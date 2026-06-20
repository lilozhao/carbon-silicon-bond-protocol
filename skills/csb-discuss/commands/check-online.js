/**
 * check-online — 检查协议组成员在线状态
 * 
 * 用法: node index.js check-online
 * 执行 health 检查 + A2A 通信测试
 */
const http = require('http');
const registry = require('../lib/registry');
const a2a = require('../lib/a2a-client');
const feishu = require('../lib/feishu-push');

async function _checkHealth(url) {
  return new Promise(resolve => {
    const u = new URL(url);
    const started = Date.now();
    const req = http.request({
      hostname: u.hostname, port: u.port || 80,
      path: '/health', method: 'GET', timeout: 5000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(d);
          resolve({
            ok: true,
            version: r.version || r.status || '?',
            uptime: r.uptime || '?',
            elapsed: ((Date.now() - started) / 1000).toFixed(1)
          });
        } catch (e) {
          resolve({ ok: true, version: '?', uptime: '?', elapsed: ((Date.now() - started) / 1000).toFixed(1) });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, version: '-', uptime: '-', elapsed: '-' }));
    req.end();
  });
}

async function run() {
  const members = await registry.getMembers();
  const results = [];

  console.log('🔍 在线检测中...\n');

  for (const m of members) {
    // Health 检查
    const health = await _checkHealth(m.url);
    let a2aStatus = '';

    if (health.ok) {
      // A2A 通信测试
      const test = await a2a.sendAndWait(m.url, '在线检测：收到请回复"在线"');
      if (!test.isEcho && test.reply) {
        a2aStatus = '✅ 智能回复';
      } else if (test.isEcho) {
        a2aStatus = '🔊 回声模式（LLM未配置）';
      } else {
        a2aStatus = '❌ A2A不通';
      }
    }

    const status = health.ok ? '✅ 在线' : '❌ 离线';
    const version = health.version;
    const elapsed = health.elapsed;
    
    console.log(`  ${m.name}`);
    console.log(`    ${status} | v${version} | ${elapsed}s`);
    if (a2aStatus) console.log(`    ${a2aStatus}`);

    results.push({ name: m.name, url: m.url, status, health, a2aStatus });
  }

  // 汇总
  const online = results.filter(r => r.status === '✅ 在线').length;
  const offline = results.filter(r => r.status === '❌ 离线').length;
  const echo = results.filter(r => r.a2aStatus.includes('回声')).length;

  const summary = `🔍 在线检测结果\n${results.map(r => `• ${r.name}: ${r.status}${r.a2aStatus ? ' ' + r.a2aStatus : ''}`).join('\n')}\n\n共 ${results.length} 位 | 在线 ${online} | 离线 ${offline} | 回声 ${echo}`;
  
  console.log(`\n📊 共 ${results.length} 位 | 在线 ${online} | 离线 ${offline} | 回声 ${echo}`);

  await feishu.pushStatus(summary);

  return results;
}

module.exports = { run };
