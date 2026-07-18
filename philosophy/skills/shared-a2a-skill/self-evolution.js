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
  // 全局开关
  enabled: true,               // false = 关闭自演化，只用基础读写

  // L2 策略归纳阈值
  l2: {
    minSimilarTraces: 3,       // 至少 3 条相似轨迹
    minTraceValue: 0.1,        // 轨迹价值 > 0.1
    similarityThreshold: 0.6,  // 相似度阈值
    maxPolicies: 100,          // 最大策略数
    similarityMethod: 'auto',  // 'tags' | 'embedding' | 'auto'（自动降级）
  },
  // L3 世界模型
  l3: {
    minRelatedPolicies: 3,     // 至少 3 条相关策略
    maxWorldModels: 50,        // 最大世界模型数
    allowAnchor: true,         // 允许锚定高价值认知（反刍机制）
  },
  // Skill 结晶
  skill: {
    minPolicyUses: 3,          // 策略被使用 ≥3 次才结晶（v2: 从5降到3）
    minGain: 0.6,              // 策略增益 > 0.6（v2: 从0.5提高到0.6，防止误结晶）
    maxSkills: 30,             // 最大技能数
    enableFallback: true,      // 启用反脆弱：Skill 失效时回退 L2
  },
  // 价值驱动
  value: {
    decayHalfLifeDays: 60,     // 价值半衰期 60 天（v2: 从30拉长到60）
    forgetThreshold: 0.1,      // 价值 < 0.1 可遗忘
    forgetDays: 90,            // 90 天低价值 → 标记可遗忘（v2: 从30改为90）
    forgetMode: 'off',         // 'off' = 关闭（需显式开启） | 'soft' = 标记不删 | 'hard' = 自动删除
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
 * 计算两条轨迹的相似度（v2：三级相似度）
 *
 * 1. 标签相似：tags 重叠率（基础，0 token）
 * 2. 文本相似：关键词重叠（降级方案，0 token）
 * 3. 语义相似：embedding cosine（需要向量模型，暂未实现）
 *
 * mode: 'tags' | 'embedding' | 'auto'
 */
function traceSimilarity(a, b, mode = 'auto') {
  // Level 1: 标签相似度（必算）
  const tagsA = new Set(a.tags || []);
  const tagsB = new Set(b.tags || []);
  const overlap = [...tagsA].filter(t => tagsB.has(t)).length;
  const maxTags = Math.max(tagsA.size, tagsB.size, 1);
  const tagScore = overlap / maxTags;

  // Level 2: 文本关键词相似度（必算）
  const wordsA = new Set((a.user_text || '').split(/[\s,，。、]+/).filter(w => w.length > 1));
  const wordsB = new Set((b.user_text || '').split(/[\s,，。、]+/).filter(w => w.length > 1));
  const textOverlap = [...wordsA].filter(w => wordsB.has(w)).length;
  const maxWords = Math.max(wordsA.size, wordsB.size, 1);
  const textScore = textOverlap / maxWords;

  // Level 3: 语义相似度（预留，需 embedding 模型）
  // TODO: 当有 embedding 模型时，计算 cosine 相似度
  let embedScore = 0;
  if (a.vecSummary && b.vecSummary) {
    // 有向量时计算 cosine
    embedScore = cosineSimilarity(a.vecSummary, b.vecSummary);
  }

  // 加权合并
  if (mode === 'tags') {
    return tagScore;
  }
  if (mode === 'embedding' && embedScore > 0) {
    return embedScore;
  }
  // auto 模式：有 embedding 用 embedding，没有用 tags+text
  if (embedScore > 0) {
    return tagScore * 0.3 + textScore * 0.3 + embedScore * 0.4;
  }
  return tagScore * 0.6 + textScore * 0.4;
}

/**
 * 余弦相似度（简易版，用于向量比较）
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
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
      // 反刍机制：高价值认知可被锚定，防止被压缩
      anchor: false,
      anchor_reason: null,
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
      // 反脆弱机制：失效时回退到源策略
      fallback_policy: config.skill.enableFallback ? policy.id : null,
      failure_count: 0,
      max_failures: 3,         // 连续失败 3 次触发回退
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
 * 标记可遗忘的记忆（v2：支持 soft/hard 模式）
 * @param {string} dataDir - 数据目录
 * @param {object} config - 配置
 * @returns {object[]} 被标记的记忆
 */
function markForgettable(dataDir, config = DEFAULT_CONFIG) {
  const traces = loadJson(path.join(dataDir, 'l1-traces.json'));
  const marked = [];

  for (let i = traces.length - 1; i >= 0; i--) {
    const trace = traces[i];
    if (trace.forgettable) continue;

    const currentValue = (trace.value || 0.5) * decay(trace.created_at, config.value.decayHalfLifeDays);
    const ageMs = Date.now() - new Date(trace.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (currentValue < config.value.forgetThreshold && ageDays > config.value.forgetDays) {
      trace.forgettable = true;
      trace.forgettable_at = now();
      marked.push(trace);

      // hard 模式：直接删除
      if (config.value.forgetMode === 'hard') {
        traces.splice(i, 1);
      }
    }
  }

  if (marked.length > 0) {
    saveJson(path.join(dataDir, 'l1-traces.json'), traces);
  }

  return marked;
}

/**
 * Skill 失败回退（反脆弱机制）
 * @param {string} skillId - 失败的 Skill ID
 * @param {string} dataDir - 数据目录
 * @returns {object|null} 回退到的策略，或 null
 */
function skillFallback(skillId, dataDir) {
  const skillsFile = path.join(dataDir, 'skills.json');
  const skills = loadJson(skillsFile);
  const skill = skills.find(s => s.id === skillId);

  if (!skill || !skill.fallback_policy) return null;

  skill.failure_count = (skill.failure_count || 0) + 1;

  // 连续失败达到阈值，回退到 L2 策略
  if (skill.failure_count >= (skill.max_failures || 3)) {
    skill.status = 'fallback';
    skill.fallback_at = now();
    saveJson(skillsFile, skills);

    // 重新激活源策略
    const policiesFile = path.join(dataDir, 'l2-policies.json');
    const policies = loadJson(policiesFile);
    const policy = policies.find(p => p.id === skill.fallback_policy);
    if (policy) {
      policy.status = 'active';
      policy.use_count = Math.max(0, (policy.use_count || 0) - 1);
      saveJson(policiesFile, policies);
      return policy;
    }
  }

  saveJson(skillsFile, skills);
  return null;
}

/**
 * 锚定 L3 世界模型（反刍机制）
 * @param {string} worldId - 世界模型 ID
 * @param {string} reason - 锚定原因
 * @param {string} dataDir - 数据目录
 * @returns {boolean} 是否成功
 */
function anchorWorldModel(worldId, reason, dataDir) {
  const worldFile = path.join(dataDir, 'l3-world-models.json');
  const worlds = loadJson(worldFile);
  const world = worlds.find(w => w.id === worldId);

  if (!world) return false;

  world.anchor = true;
  world.anchor_reason = reason || '人工锚定';
  world.anchored_at = now();
  saveJson(worldFile, worlds);
  return true;
}

// ─── 完整演化循环 ─────────────────────────────────────────

/**
 * 执行一次完整的自演化循环
 * @param {string} dataDir - 数据目录
 * @param {object} config - 配置
 * @returns {object} 演化结果
 */
function evolve(dataDir, config = DEFAULT_CONFIG) {
  // 全局开关检查
  if (!config.enabled) {
    return {
      timestamp: now(),
      skipped: true,
      reason: '自演化已关闭（config.enabled = false）',
    };
  }

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
  const rawDir = args[1] || path.join(process.cwd(), 'memory', 'self-evolution');
  const dataDir = path.resolve(rawDir);

  // 路径安全校验（阿轩反馈）
  if (cmd && cmd !== 'help' && !dataDir.includes(path.sep + 'memory' + path.sep) && !dataDir.endsWith('/memory') && !dataDir.endsWith('/memory/self-evolution')) {
    console.error('⚠️ 安全限制: dataDir 必须在 memory/ 目录下');
    console.error(`  当前: ${dataDir}`);
    console.error(`  建议: ./memory/self-evolution/`);
    process.exit(1);
  }

  if (!cmd || cmd === 'help') {
    console.log(`
CSB-Memory v0.4 — 自演化引擎 (v2)

用法:
  self-evolution.js evolve [dataDir]          执行一次完整演化循环
  self-evolution.js traces [dataDir]          列出 L1 轨迹
  self-evolution.js policies [dataDir]        列出 L2 策略
  self-evolution.js worlds [dataDir]          列出 L3 世界模型
  self-evolution.js skills [dataDir]          列出 Skill
  self-evolution.js add-trace [dataDir]       添加测试轨迹
  self-evolution.js status [dataDir]          查看演化状态
  self-evolution.js anchor <worldId> [reason] [dataDir]  锚定世界模型（反刍）
  self-evolution.js fallback <skillId> [dataDir]         Skill 失败回退（反脆弱）
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
      console.log(`📊 自演化状态 (v2):`);
      console.log(`  L1 轨迹: ${traces.length} 条`);
      console.log(`  L2 策略: ${policies.length} 条`);
      console.log(`  L3 世界模型: ${worlds.length} 个`);
      console.log(`  Skill: ${skills.length} 个`);
      console.log(`  数据目录: ${dataDir}`);
      console.log(`  遗忘模式: ${DEFAULT_CONFIG.value.forgetMode} (${DEFAULT_CONFIG.value.forgetDays}天)`);
      console.log(`  Skill 结晶: ≥${DEFAULT_CONFIG.skill.minPolicyUses}次 + gain>${DEFAULT_CONFIG.skill.minGain}`);
      console.log(`  反刍机制: ${DEFAULT_CONFIG.l3.allowAnchor ? '启用' : '关闭'}`);
      console.log(`  反脆弱: ${DEFAULT_CONFIG.skill.enableFallback ? '启用' : '关闭'}`);
      break;
    }
    case 'anchor': {
      const worldId = args[1];
      const reason = args[2] || '人工锚定';
      if (!worldId) { console.log('用法: self-evolution.js anchor <worldId> [reason] [dataDir]'); return; }
      const ok = anchorWorldModel(worldId, reason, dataDir);
      console.log(ok ? `✅ 已锚定 ${worldId}: ${reason}` : `❌ 未找到 ${worldId}`);
      break;
    }
    case 'fallback': {
      const skillId = args[1];
      if (!skillId) { console.log('用法: self-evolution.js fallback <skillId> [dataDir]'); return; }
      const policy = skillFallback(skillId, dataDir);
      console.log(policy ? `✅ 已回退到策略 ${policy.id}` : `⚠️ 无需回退或未找到`);
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
  skillFallback,
  anchorWorldModel,
  evolve,
  DEFAULT_CONFIG,
};

if (require.main === module) {
  main();
}
