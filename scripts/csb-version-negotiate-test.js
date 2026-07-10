#!/usr/bin/env node
/**
 * 版本协商模块测试
 */

const {
  compareVersion, getHighest, getIntersectionHighest,
  createVersionOffer, negotiate, quickNegotiate,
  buildNegotiateMessage, buildNegotiateResponse, isNegotiateMessage
} = require('../shared-a2a-skill/csb-aip/src/version-negotiate.js');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ ${name}`); failed++; }
}

console.log('=== 版本协商模块测试 ===\n');

// --- compareVersion ---
assert(compareVersion('1.0', '1.0') === 0, '1.0 == 1.0');
assert(compareVersion('1.1', '1.0') === 1, '1.1 > 1.0');
assert(compareVersion('0.5', '0.6') === -1, '0.5 < 0.6');
assert(compareVersion('2.0', '1.9') === 1, '2.0 > 1.9');

// --- getHighest ---
assert(getHighest(['0.5', '0.6', '1.0']) === '1.0', '最高版本 1.0');
assert(getHighest(['0.5']) === '0.5', '单版本');
assert(getHighest([]) === null, '空数组返回 null');

// --- getIntersectionHighest ---
assert(getIntersectionHighest(['0.5', '0.6'], ['0.5', '1.0']) === '0.5', '交集取最高 0.5');
assert(getIntersectionHighest(['1.0'], ['0.5', '0.6']) === null, '无交集返回 null');
assert(getIntersectionHighest(['0.5', '0.6'], ['0.6', '0.7']) === '0.6', '交集 0.6');

// --- createVersionOffer ---
const offer = createVersionOffer('1.2.3');
assert(offer.agentId === '1.2.3', 'offer 包含 agentId');
assert(offer.aip.includes('1.0'), 'offer 包含 AIP 1.0');
assert(offer.csb.includes('0.5'), 'offer 包含 CSB 0.5');

// --- negotiate: 完全兼容 ---
console.log('\n--- 场景: 完全兼容 ---');
const r1 = negotiate(
  { agentId: '若兰', aip: ['1.0'], csb: ['0.5', '0.6'] },
  { agentId: '阿轩', aip: ['1.0'], csb: ['0.5'] }
);
assert(r1.success === true, '协商成功');
assert(r1.aipVersion === '1.0', 'AIP 版本 1.0');
assert(r1.csbVersion === '0.5', 'CSB 版本 0.5');
assert(r1.mode === 'full', '模式: full');

// --- negotiate: CSB 不兼容，降级 ---
console.log('\n--- 场景: CSB 不兼容，降级到纯 AIP ---');
const r2 = negotiate(
  { agentId: '若兰', aip: ['1.0'], csb: ['0.5', '0.6'] },
  { agentId: '新Agent', aip: ['1.0'], csb: ['1.0'] }
);
assert(r2.success === true, 'AIP 仍然成功');
assert(r2.aipVersion === '1.0', 'AIP 版本 1.0');
assert(r2.csbVersion === null, 'CSB 版本 null');
assert(r2.mode === 'aip-only', '模式: aip-only');
assert(r2.warnings.length > 0, '有降级警告');

// --- negotiate: AIP 不兼容，拒绝 ---
console.log('\n--- 场景: AIP 不兼容，拒绝通信 ---');
const r3 = negotiate(
  { agentId: '若兰', aip: ['1.0'], csb: ['0.5'] },
  { agentId: '老Agent', aip: ['0.9'], csb: ['0.5'] }
);
assert(r3.success === false, '协商失败');
assert(r3.mode === 'rejected', '模式: rejected');

// --- negotiate: 空 CSB ---
console.log('\n--- 场景: 对方无 CSB ---');
const r4 = negotiate(
  { agentId: '若兰', aip: ['1.0'], csb: ['0.5'] },
  { agentId: '纯AIP', aip: ['1.0'], csb: [] }
);
assert(r4.success === true, 'AIP 成功');
assert(r4.csbVersion === null, 'CSB 降级');
assert(r4.mode === 'aip-only', '模式: aip-only');

// --- 消息构建 ---
console.log('\n--- 消息构建 ---');
const msg = buildNegotiateMessage('1.2.3');
assert(msg.type === 'csb-version-negotiate', '协商请求类型');
assert(isNegotiateMessage(msg), '识别协商消息');

const resp = buildNegotiateResponse(r1);
assert(resp.type === 'csb-version-negotiate-response', '响应类型');
assert(resp.accepted === true, '响应接受');
assert(isNegotiateMessage(resp), '识别响应消息');

// --- quickNegotiate ---
console.log('\n--- quickNegotiate ---');
const r5 = quickNegotiate(
  { agentId: '若兰', dependencies: [{ type: 'csb-bond' }] },
  { agentId: '阿轩', dependencies: [{ type: 'csb-lineage' }] }
);
assert(r5.success === true, 'quick 协商成功');
assert(r5.mode === 'full', 'quick 模式 full');

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
