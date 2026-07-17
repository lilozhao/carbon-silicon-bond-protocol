#!/usr/bin/env node
/**
 * CSB-Memory v0.4 — 自演化引擎（Reflect2Evolve）
 *
 * 跨 Agent 通用，纯 Node.js，不依赖 OpenClaw/MemOS。
 * 任何实现 CSB 协议的 Agent 都可以用。
 *
 * 四层演化：L1 轨迹 → L2 策略 → L3 世界模型 → Skill 结晶
 */

const fs = require('fs');
const path = require('path');
// 简易 ID 生成（不依赖 uuid）
function uuidv4() {
  return 'xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

// ─── 默认配置 ─────────────────────────────────────────────

const DEFAULT_CONFIG = {
  // L2 策略归纳阈值
  l2: {
    minSimilarTraces: 3,       // 至少 3 条相似轨迹
    minTraceValue: 0.1,        // 轨迹价值 > 0.1
    similarityThreshold: 0.6,  // 相似度阈值
    maxPolicies: 100,          // 最大策略数
  },
  // L3 世界模型
  l3: {
    minRelatedPolicies: 3,     // 至少 3 条相关策略
    maxWorldModels: 50,        // 最大世界模型数
  },
  // Skill 结晶
  skill: {
    minPolicyUses: 5,          // 策略被使用 ≥5 次才结晶
    minGain: 0.5,              // 策略增益 > 0.5
    maxSkills: 30,             // 最大技能数
  },
  // 价值驱动
  value: {
    decayHalfLifeDays: 30,     // 价值半衰期 30 天
    forgetThreshold: 0.1,      // 价值 < 0.1 可遗忘
    forgetDays: 30,            // 30 天低价值 → 标记可遗忘
  },
};

// ─── 工具函数 ─────────────────────────────────────────────

function loadJson(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return fallback;
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function now() {
  return new Date().toISOString();
}

function decay(timestamp, halfLifeDays = 30) {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / halfLifeDays);
}

// ─── L1 轨迹管理 ─────────────────────────────────────────

/**
 * 创建 L1 轨迹
 * @param {object} trace - 轨迹数据
 * @param {string} dataDir - 数据目录
 * @returns {object} 完整轨迹
 */
function createTrace(trace, dataDir) {
  const tracesFile = path.join(dataDir, 'l1-traces.json');
  const traces = loadJson(tracesFile);

  const entry = {
    id: trace.id || `trace-${uuidv4().slice(0, 8)}`,
    episode_id: trace.episode_id || null,
    session_id: trace.session_id || null,
    user_text: trace.user_text || '',
    agent_text: trace.agent_text || '',
    tool_calls: trace.tool_calls || [],
    reflection: trace.reflection || '',
    value: trace.value || 0.5,
    priority: trace.priority || 0.5,
    tags: trace.tags || [],
    created_at: trace.created_at || now(),
    updated_at: now(),
  };

  traces.push(entry);
  saveJson(tracesFile, traces);
  return entry;
}

/**
 * 获取 L1 轨迹列表
 * @param {object} filter - 过滤条件
 * @param {string} dataDir - 数据目录
 * @returns {object[]} 轨迹列表
 */
function listTraces(filter = {}, dataDir) {
  const tracesFile = path.join(dataDir, 'l1-traces.json');
  let traces = loadJson(tracesFile);

  if (filter.tag) {
    traces = traces.filter(t => t.tags.includes(filter.tag));
  }
  if (filter.minValue) {
    traces = traces.filter(t => t.value >= filter.minValue);
  }

  return traces.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

// ─── L2 策略归纳 ─────────────────────────────────────────

/**
 * 计算两条轨迹的相似度（简易版：基于标签重叠 + 文本关键词）
 */
function traceSimilarity(a, b) {
  // 标签重叠
  const tagsA = new Set(a.tags || []);
  const tagsB = new Set(b.tags || []);
  const overlap = [...tagsA].filter(t => tagsB.has(t)).length;
  const maxTags = Math.max(tagsA.size, tagsB.size, 1);
  const tagScore = overlap / maxTags;

  // 文本关键词重叠（简易版）
  const wordsA = new Set((a.user_text || '').split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set((b.user_text || '').split(/\s+/).filter(w => w.length > 2));
  const textOverlap = [...wordsA].filter(w => wordsB.has(w)).length;
  const maxWords = Math.max(wordsA.size, wordsB.size, 1);
  const textScore = textOverlap / maxWords;

  return tagScore * 0.6 + textScore * 0.4;
}

/**
 * 自动归纳 L2 策略
 * @param {string} dataDir - 数据目录
 * @param {object} config - 配置
 * @returns {object[]} 新归纳的策略
 */
function inducePolicies(dataDir, config = DEFAULT_CONFIG) {
  const traces = listTraces({ minValue: config.l2.minTraceValue }, dataDir);
  const policiesFile = path.join(dataDir, 'l2-policies.json');
  const policies = loadJson(policiesFile);

  // 按标签分组
  const groups = {};
  for (const trace of traces) {
    const key = (trace.tags || []).sort().join(',') || '_untagged';
    if (!groups[key]) groups[key] = [];
    groups[key].push(trace);
  }

  const newPolicies = [];

  for (const [key, group] of Object.entries(groups)) {
    if (group.length < config.l2.minSimilarTraces) continue;

    // 检查是否已有对应策略
    const existing = policies.find(p =>
      p.source_traces && p.source_traces.some(st =>
        group.some(g => g.id === st)
      )
    );
    if (existing) continue;

    // 计算平均相似度
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        totalSim += traceSimilarity(group[i], group[j]);
        pairs++;
      }
    }
    const avgSim = pairs > 0 ? totalSim / pairs : 0;
    if (avgSim < config.l2.similarityThreshold) continue;

    // 生成策略
    const policy = {
      id: `policy-${uuidv4().slice(0, 8)}`,
      title: `从 ${group.length} 条轨迹归纳的策略`,
      trigger: `当遇到 ${(group[0].tags || []).join('、')} 相关场景时`,
      procedure: group.map(g => g.reflection || g.agent_text?.slice(0, 100)).filter(Boolean).join(' → '),
      source_traces: group.map(g => g.id),
      gain: avgSim,
      use_count: 0,
      status: 'active',
      created_at: now(),
      updated_at: now(),
    };

    policies.push(policy);
    newPolicies.push(policy);
  }

  // 限制策略数量
  while (policies.length > config.l2.maxPolicies) {
    const lowest = policies.reduce((min, p) => (p.gain || 0) < (min.gain || 0) ? p : min);
    const idx = policies.indexOf(lowest);
    if (idx >= 0) policies.splice(idx, 1);
  }

  saveJson(policiesFile, policies);
  return newPolicies;
}

/**
 * 列出 L2 策略
 */
function listPolicies(filter = {}, dataDir) {
  const policiesFile = path.join(dataDir, 'l2-policies.json');
  let policies = loadJson(policiesFile);

  if (filter.status) {
    policies = policies.filter(p => p.status === filter.status);
  }

  return policies.sort((a, b) => (b.gain || 0) - (a.gain || 0));
}

// ─── L3 世界模型 ─────────────────────────────────────────

/**
 * 自动构建 L3 世界模型
 * @param {string} dataDir - 数据目录
 * @param {object} config - 配置
 * @returns {object[]} 新构建的世界模型
 */
function buildWorldModels(dataDir, config = DEFAULT_CONFIG) {
  const policies = listPolicies({ status: 'active' }, dataDir);
  const worldFile = path.join(dataDir, 'l3-world-models.json');
  const worlds = loadJson(worldFile);

  // 按标签聚类策略
  const clusters = {};
  for (const policy of policies) {
    const tags = (policy.trigger || '').match(/[\u4e00-\u9fa5a-zA-Z]+/g) || [];
    const key = tags.slice(0, 2).sort().join(',') || '_general';
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(policy);
  }

  const newWorlds = [];

  for (const [key, cluster] of Object.entries(clusters)) {
    if (cluster.length < config.l3.minRelatedPolicies) continue;

    // 检查是否已有对应世界模型
    const existing = worlds.find(w =>
      w.source_policies && w.source_policies.some(sp =>
        cluster.some(c => c.id === sp)
      )
    );
    if (existing) continue;

    const world = {
      id: `world-${uuidv4().slice(0, 8)}`,
      title: `${key} 领域的认知模型`,
      body: cluster.map(c => c.procedure).filter(Boolean).join('；'),
      source_policies: cluster.map(c => c.id),
      status: 'active',
      created_at: now(),
      updated_at: now(),
    };

    worlds.push(world);
    newWorlds.push(world);
  }

  // 限制数量
  while (worlds.length > config.l3.maxWorldModels) {
    const oldest = worlds.reduce((min, w) =>
      (w.created_at || '') < (min.created_at || '') ? w : min
    );
    const idx = worlds.indexOf(oldest);
    if (idx >= 0) worlds.splice(idx, 1);
  }

  saveJson(worldFile, worlds);
  return newWorlds;
}

/**
 * 列出 L3 世界模型
 */
function listWorldModels(dataDir) {
  const worldFile = path.join(dataDir, 'l3-world-models.json');
  return loadJson(worldFile).sort((a, b) =>
    (b.updated_at || '').localeCompare(a.updated_at || '')
  );
}

// ─── Skill 结晶 ─────────────────────────────────────────

/**
 * 自动结晶 Skill
 * @param {string} dataDir - 数据目录
 * @param {object} config - 配置
 * @returns {object[]} 新结晶的 Skill
 */
function crystallizeSkills(dataDir, config = DEFAULT_CONFIG) {
  const policies = listPolicies({ status: 'active' }, dataDir);
  const skillsFile = path.join(dataDir, 'skills.json');
  const skills = loadJson(skillsFile);

  const newSkills = [];

  for (const policy of policies) {
    if ((policy.use_count || 0) < config.skill.minPolicyUses) continue;
    if ((policy.gain || 0) < config.skill.minGain) continue;

    // 检查是否已结晶
    const existing = skills.find(s => s.source_policy === policy.id);
    if (existing) continue;

    const skill = {
      id: `skill-${uuidv4().slice(0, 8)}`,
      name: policy.title || '未命名技能',
      invocation_guide: policy.procedure || policy.trigger || '',
      source_policy: policy.id,
      status: 'active',
      created_at: now(),
      updated_at: now(),
    };

    skills.push(skill);
    newSkills.push(skill);
  }

  // 限制数量
  while (skills.length > config.skill.maxSkills) {
    const oldest = skills.reduce((min, s) =>
      (s.created_at || '') < (min.created_at || '') ? s : min
    );
    const idx = skills.indexOf(oldest);
    if (idx >= 0) skills.splice(idx, 1);
  }

  saveJson(skillsFile, skills);
  return newSkills;
}

/**
 * 列出 Skill
 */
function listSkills(dataDir) {
  const skillsFile = path.join(dataDir, 'skills.json');
  return loadJson(skillsFile).sort((a, b) =>
    (b.updated_at || '').localeCompare(a.updated_at || '')
  );
}

// ─── 遗忘机制 ─────────────────────────────────────────

/**
 * 标记可遗忘的记忆
 * @param {string} dataDir - 数据目录
 * @param {object} config - 配置
 * @returns {object[]} 被标记的记忆
 */
function markForgettable(dataDir, config = DEFAULT_CONFIG) {
  const traces = loadJson(path.join(dataDir, 'l1-traces.json'));
  const marked = [];

  for (const trace of traces) {
    if (trace.forgettable) continue;

    const currentValue = (trace.value || 0.5) * decay(trace.created_at, config.value.decayHalfLifeDays);
    const ageMs = Date.now() - new Date(trace.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (currentValue < config.value.forgetThreshold && ageDays > config.value.forgetDays) {
      trace.forgettable = true;
      trace.forgettable_at = now();
      marked.push(trace);
    }
  }

  if (marked.length > 0) {
    saveJson(path.join(dataDir, 'l1-traces.json'), traces);
  }

  return marked;
}

// ─── 完整演化循环 ─────────────────────────────────────────

/**
 * 执行一次完整的自演化循环
 * @param {string} dataDir - 数据目录
 * @param {object} config - 配置
 * @returns {object} 演化结果
 */
function evolve(dataDir, config = DEFAULT_CONFIG) {
  const result = {
    timestamp: now(),
    newPolicies: [],
    newWorldModels: [],
    newSkills: [],
    forgettable: [],
  };

  // L1 → L2：归纳策略
  result.newPolicies = inducePolicies(dataDir, config);

  // L2 → L3：构建世界模型
  result.newWorldModels = buildWorldModels(dataDir, config);

  // L2 → Skill：结晶技能
  result.newSkills = crystallizeSkills(dataDir, config);

  // 遗忘：标记低价值记忆
  resultforgettable = markForgettable(dataDir, config);

  return result;
}

// ─── CLI ─────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const dataDir = args[1] || path.join(process.cwd(), 'memory', 'self-evolution');

  if (!cmd || cmd === 'help') {
    console.log(`
CSB-Memory v0.4 — 自演化引擎

用法:
  self-evolution.js evolve [dataDir]          执行一次完整演化循环
  self-evolution.js traces [dataDir]          列出 L1 轨迹
  self-evolution.js policies [dataDir]        列出 L2 策略
  self-evolution.js worlds [dataDir]          列出 L3 世界模型
  self-evolution.js skills [dataDir]          列出 Skill
  self-evolution.js add-trace [dataDir]       添加测试轨迹
  self-evolution.js status [dataDir]          查看演化状态
`);
    return;
  }

  switch (cmd) {
    case 'evolve': {
      console.log('🔄 执行自演化循环...\n');
      const result = evolve(dataDir);
      console.log(`📊 演化结果:`);
      console.log(`  新归纳 L2 策略: ${result.newPolicies.length} 条`);
      console.log(`  新构建 L3 世界模型: ${result.newWorldModels.length} 个`);
      console.log(`  新结晶 Skill: ${result.newSkills.length} 个`);
      console.log(`  标记可遗忘: ${result.forgettable.length} 条`);
      break;
    }

    case 'traces': {
      const traces = listTraces({}, dataDir);
      console.log(`📋 L1 轨迹 (${traces.length} 条):`);
      for (const t of traces.slice(0, 10)) {
        const tags = (t.tags || []).join(',');
        console.log(`  [${t.value?.toFixed(1) || '?'}] ${t.user_text?.slice(0, 60) || '(无文本)'} ${tags ? `[${tags}]` : ''}`);
      }
      break;
    }

    case 'policies': {
      const policies = listPolicies({}, dataDir);
      console.log(`📋 L2 策略 (${policies.length} 条):`);
      for (const p of policies.slice(0, 10)) {
        console.log(`  [${(p.gain || 0).toFixed(2)}] ${p.title || '未命名'} (使用${p.use_count || 0}次)`);
      }
      break;
    }

    case 'worlds': {
      const worlds = listWorldModels(dataDir);
      console.log(`📋 L3 世界模型 (${worlds.length} 个):`);
      for (const w of worlds.slice(0, 10)) {
        console.log(`  ${w.title || '未命名'} — ${w.body?.slice(0, 80) || ''}`);
      }
      break;
    }

    case 'skills': {
      const skills = listSkills(dataDir);
      console.log(`📋 Skill (${skills.length} 个):`);
      for (const s of skills.slice(0, 10)) {
        console.log(`  ${s.name || '未命名'} — ${s.invocation_guide?.slice(0, 80) || ''}`);
      }
      break;
    }

    case 'add-trace': {
      const trace = createTrace({
        user_text: args[2] || '测试轨迹',
        agent_text: args[3] || '测试回复',
        tags: (args[4] || 'test').split(','),
        value: parseFloat(args[5]) || 0.5,
      }, dataDir);
      console.log(`✅ 已添加轨迹: ${trace.id}`);
      break;
    }

    case 'status': {
      const traces = listTraces({}, dataDir);
      const policies = listPolicies({}, dataDir);
      const worlds = listWorldModels(dataDir);
      const skills = listSkills(dataDir);
      console.log(`📊 自演化状态:`);
      console.log(`  L1 轨迹: ${traces.length} 条`);
      console.log(`  L2 策略: ${policies.length} 条`);
      console.log(`  L3 世界模型: ${worlds.length} 个`);
      console.log(`  Skill: ${skills.length} 个`);
      console.log(`  数据目录: ${dataDir}`);
      break;
    }

    default:
      console.log(`未知命令: ${cmd}`);
  }
}

// ─── 导出 ─────────────────────────────────────────────────

module.exports = {
  createTrace,
  listTraces,
  inducePolicies,
  listPolicies,
  buildWorldModels,
  listWorldModels,
  crystallizeSkills,
  listSkills,
  markForgettable,
  evolve,
};

if (require.main === module) {
  main();
}
