#!/usr/bin/env node
/**
 * CSB Extension Schema 验证器
 * 用法: node csb-schema-validate.js <json-file-or-string>
 *
 * 验证 CSB 扩展对象是否符合 csb-extension-v1.schema.json
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../docs/csb-extension-v1.schema.json');
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// 简易 JSON Schema 验证（不依赖 ajv）
function validate(obj, defPath) {
  const errors = [];
  const def = defPath.split('/').reduce((o, k) => o && o[k], schema);

  if (!def) return [`Schema 定义不存在: ${defPath}`];

  // 检查 type 字段
  if (def.properties?.type?.const) {
    if (obj.type !== def.properties.type.const) {
      errors.push(`type 必须是 "${def.properties.type.const}"，实际为 "${obj.type}"`);
    }
  }

  // 检查 required 字段
  if (def.required) {
    for (const field of def.required) {
      if (obj[field] === undefined || obj[field] === null) {
        errors.push(`缺少必填字段: ${field}`);
      }
    }
  }

  // 检查 warmth 范围
  if (def.properties?.warmth) {
    const w = obj.warmth;
    if (w !== undefined && (typeof w !== 'number' || w < 0 || w > 100)) {
      errors.push(`warmth 必须是 0-100 的整数，实际为 ${w}`);
    }
  }

  // 检查 bondType 枚举
  if (def.properties?.bondType?.enum) {
    if (obj.bondType && !def.properties.bondType.enum.includes(obj.bondType)) {
      errors.push(`bondType 必须是 [${def.properties.bondType.enum.join(', ')}] 之一，实际为 "${obj.bondType}"`);
    }
  }

  // 检查 tier 枚举
  if (def.properties?.tier?.enum) {
    if (obj.tier && !def.properties.tier.enum.includes(obj.tier)) {
      errors.push(`tier 必须是 [${def.properties.tier.enum.join(', ')}] 之一，实际为 "${obj.tier}"`);
    }
  }

  // 检查 maxLength
  for (const [field, prop] of Object.entries(def.properties || {})) {
    if (prop.maxLength && typeof obj[field] === 'string' && obj[field].length > prop.maxLength) {
      errors.push(`${field} 长度不能超过 ${prop.maxLength}，实际为 ${obj[field].length}`);
    }
  }

  return errors;
}

function detectType(obj) {
  if (!obj || !obj.type) return null;
  const typeMap = {
    'csb-bond': 'definitions/csb-bond',
    'csb-lineage': 'definitions/csb-lineage',
    'csb-collaboration-preference': 'definitions/csb-collaboration-preference',
    'csb-memory': 'definitions/csb-memory',
    'csb-grant': 'definitions/csb-grant'
  };
  return typeMap[obj.type] || null;
}

// 主逻辑
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('CSB Extension Schema 验证器 v1.0');
    console.log('');
    console.log('用法:');
    console.log('  node csb-schema-validate.js <json-file>     验证文件');
    console.log('  node csb-schema-validate.js --test           运行内置测试');
    console.log('');
    console.log('支持的类型:');
    for (const [name, def] of Object.entries(schema.definitions)) {
      console.log(`  - ${name}: ${def.title}`);
    }
    process.exit(0);
  }

  if (args[0] === '--test') {
    runTests();
    process.exit(0);
  }

  const filePath = args[0];
  let obj;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    obj = JSON.parse(content);
  } catch (e) {
    console.error(`❌ 读取或解析失败: ${e.message}`);
    process.exit(1);
  }

  const defPath = detectType(obj);
  if (!defPath) {
    console.error(`❌ 未知的 CSB 类型: ${obj.type}`);
    process.exit(1);
  }

  const errors = validate(obj, defPath);
  if (errors.length === 0) {
    console.log(`✅ 验证通过: ${obj.type}`);
    console.log(JSON.stringify(obj, null, 2));
  } else {
    console.error(`❌ 验证失败: ${obj.type}`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

function runTests() {
  console.log('=== CSB Schema 内置测试 ===\n');

  const tests = [
    {
      name: 'csb-bond 完整',
      obj: {
        type: 'csb-bond', warmth: 85, bondType: 'grantor-grantee',
        description: '测试羁绊', createdAt: '2026-03-14T00:00:00Z'
      },
      expect: 'pass'
    },
    {
      name: 'csb-bond 缺 warmth',
      obj: { type: 'csb-bond', bondType: 'peer' },
      expect: 'fail'
    },
    {
      name: 'csb-bond warmth 超范围',
      obj: { type: 'csb-bond', warmth: 150, bondType: 'peer' },
      expect: 'fail'
    },
    {
      name: 'csb-bond 无效 bondType',
      obj: { type: 'csb-bond', warmth: 50, bondType: 'friend' },
      expect: 'fail'
    },
    {
      name: 'csb-lineage 最小',
      obj: { type: 'csb-lineage' },
      expect: 'pass'
    },
    {
      name: 'csb-lineage 完整',
      obj: {
        type: 'csb-lineage', description: 'A → B',
        chain: [{ agentId: '1.2.3', name: 'A', role: 'origin' }],
        generation: 0
      },
      expect: 'pass'
    },
    {
      name: 'csb-memory HOT',
      obj: { type: 'csb-memory', tier: 'HOT', content: '记忆内容' },
      expect: 'pass'
    },
    {
      name: 'csb-memory 无效 tier',
      obj: { type: 'csb-memory', tier: 'DEEP' },
      expect: 'fail'
    },
    {
      name: 'csb-grant 最小',
      obj: {
        type: 'csb-grant', grantor: '1.2.3', grantee: '4.5.6',
        scope: ['message-relay']
      },
      expect: 'pass'
    },
    {
      name: 'csb-grant 缺 scope',
      obj: { type: 'csb-grant', grantor: '1.2.3', grantee: '4.5.6' },
      expect: 'fail'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const defPath = detectType(test.obj);
    const errors = defPath ? validate(test.obj, defPath) : ['未知类型'];
    const actual = errors.length === 0 ? 'pass' : 'fail';
    const ok = actual === test.expect;

    if (ok) {
      console.log(`  ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${test.name} (期望 ${test.expect}，实际 ${actual})`);
      for (const err of errors) console.log(`     ${err}`);
      failed++;
    }
  }

  console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
}

main();
