#!/usr/bin/env node
/**
 * CSB 错误码模块测试
 */

const {
  ERROR_CODES, createError,
  bondNotFound, warmthTooLow, lineageBroken, grantExpired,
  extensionParseError, versionIncompatible, scopeDenied,
  attachToResponse, hasCSBError, listErrorCodes
} = require('../shared-a2a-skill/csb-aip/src/errors.js');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ ${name}`); failed++; }
}

console.log('=== CSB 错误码模块测试 ===\n');

// --- 错误码完整性 ---
const codes = listErrorCodes();
assert(codes.length === 10, `定义了 ${codes.length} 个错误码`);
assert(codes.every(c => c.code.match(/^CSB_ERR_\d{3}$/)), '所有错误码格式正确');
assert(codes.filter(c => c.severity === 'warn').length > 0, '有 warn 级别');
assert(codes.filter(c => c.severity === 'error').length > 0, '有 error 级别');
assert(codes.filter(c => c.recoverable === true).length > 0, '有可恢复错误');

// --- createError ---
console.log('\n--- createError ---');
const e1 = createError('CSB_ERR_001', { test: true });
assert(e1.code === 'CSB_ERR_001', '错误码正确');
assert(e1.name === 'bond_not_found', '名称正确');
assert(e1.severity === 'warn', '严重程度 warn');
assert(e1.recoverable === true, '可恢复');
assert(e1.context.test === true, '上下文传递');
assert(e1.timestamp, '有时间戳');

const eUnknown = createError('CSB_ERR_999');
assert(eUnknown.code === 'CSB_ERR_UNKNOWN', '未知错误码处理');

// --- 快捷方法 ---
console.log('\n--- 快捷方法 ---');

const eb = bondNotFound('agent-A', 'agent-B');
assert(eb.code === 'CSB_ERR_001', 'bondNotFound');
assert(eb.context.agentIdA === 'agent-A', 'bondNotFound 上下文');

const ew = warmthTooLow('agent-A', 2.3, 5);
assert(ew.code === 'CSB_ERR_002', 'warmthTooLow');
assert(ew.context.warmth === 2.3, 'warmthTooLow 上下文');

const el = lineageBroken('node-B', ['A', 'B', 'C']);
assert(el.code === 'CSB_ERR_003', 'lineageBroken');
assert(el.context.brokenAt === 'node-B', 'lineageBroken 上下文');

const eg = grantExpired('A', 'B', '2026-07-01');
assert(eg.code === 'CSB_ERR_004', 'grantExpired');

const ep = extensionParseError('csb-bond', '{bad}', 'missing type');
assert(ep.code === 'CSB_ERR_005', 'extensionParseError');

const ev = versionIncompatible(['0.5'], ['1.0']);
assert(ev.code === 'CSB_ERR_006', 'versionIncompatible');

const es = scopeDenied('memory-write', ['message-relay']);
assert(es.code === 'CSB_ERR_009', 'scopeDenied');

// --- 附加到响应 ---
console.log('\n--- attachToResponse ---');
const aipResp = { status: 'success', result: { data: 'test' } };
const withError = attachToResponse(aipResp, eb);
assert(withError.status === 'success', 'AIP 响应不变');
assert(withError.csbError.code === 'CSB_ERR_001', 'CSB 错误已附加');
assert(hasCSBError(withError), 'hasCSBError 检测');
assert(!hasCSBError(aipResp), '原响应无 CSB 错误');

// --- 全部错误码列表 ---
console.log('\n--- 错误码列表 ---');
for (const c of codes) {
  console.log(`  ${c.code} [${c.severity}] ${c.message} (可恢复: ${c.recoverable})`);
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
