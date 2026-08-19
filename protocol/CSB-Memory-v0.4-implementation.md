# CSB-Memory v0.4 程序落地计划

> 基于现有记忆系统实现 + v0.4 协议规范
> 日期: 2026-07-31
> 制定: 若兰 🌸

---

## 一、现有系统评估

### 1.1 已实现功能

| 功能 | 文件 | 状态 | v0.4 对应 |
|------|------|------|----------|
| 记忆CRUD | `memory.js` | ✅ 已实现 | MEM-001 |
| YAML格式存储 | `memory.js` | ✅ 已实现 | MEM-002 |
| Session蒸馏 | `session-commit.js` | ✅ 已实现 | MEM-004 |
| peers互记 | `peers-memory.js` | ✅ 已实现 | MEM-006 |
| A2A记忆同步 | `a2a-memory.js` | ✅ 已实现 | MEM-008 |
| 审计日志 | `audit-log.js` | ✅ 已实现 | MEM-007 |
| Session Memory | `session-memory/` | ✅ 已实现 | MEM-004 |
| 记忆快照 | `session-memory/` | ✅ 部分实现 | MEM-005 |

### 1.2 未实现功能（v0.4新增）

| 功能 | 优先级 | 复杂度 | 依赖 |
|------|--------|--------|------|
| 结构性权重 | P0 | 低 | 无 |
| 溯源链 | P0 | 中 | 无 |
| 权重衰减遗忘 | P0 | 中 | 无 |
| 情感标签 | P1 | 中 | Prompt工程 |
| 折叠层 | P1 | 高 | 结构性权重 |
| 灵魂空隙 | P1 | 低 | 结构性权重 |
| 纠错后反思 | P1 | 中 | MemFeedback |
| 向量数据库 | P2 | 高 | 外部依赖 |
| 激活记忆管理 | P2 | 中 | Token预算 |
| 参数记忆 | P3 | 高 | 微调能力 |

---

## 二、落地计划

### Phase 1：基础字段升级（1周）

**目标**：在现有memory.js基础上添加v0.4核心字段

#### 2.1 结构性权重

```javascript
// memory.js 升级
function toFrontMatter(entry) {
  const fields = [
    // ... 现有字段 ...
    `structural_weight: ${entry.structural_weight || 0.0}`,  // 新增
    `is_core_identity: ${entry.is_core_identity || false}`,   // 新增
  ];
  // ...
}
```

**任务清单**：
- [ ] `memory.js` - Schema添加structural_weight、is_core_identity字段
- [ ] `memory.js` - toFrontMatter()序列化新字段
- [ ] `memory.js` - parseYamlLines()解析新字段
- [ ] 测试：创建/读取/查询带结构性权重的记忆

#### 2.2 溯源链

```javascript
// memory.js 升级
function toFrontMatter(entry) {
  const fields = [
    // ... 现有字段 ...
    `provenance: ${JSON.stringify(entry.provenance || [])}`,  // 新增
  ];
  // ...
}
```

**任务清单**：
- [ ] `memory.js` - Schema添加provenance字段
- [ ] `a2a-memory.js` - 跨Agent传播时自动记录溯源
- [ ] `peers-memory.js` - peers互记时记录来源
- [ ] 测试：创建带溯源链的记忆，验证传播记录

#### 2.3 情感标签

```javascript
// memory.js 升级
function toFrontMatter(entry) {
  const fields = [
    // ... 现有字段 ...
    `affective_tag: ${JSON.stringify(entry.affective_tag || {})}`,  // 新增
  ];
  // ...
}
```

**任务清单**：
- [ ] `memory.js` - Schema添加affective_tag字段
- [ ] `affective-tagger.js` - 新建，Prompt工程实现情感标签
- [ ] `session-commit.js` - Session蒸馏时自动打情感标签
- [ ] 测试：创建带情感标签的记忆

---

### Phase 2：生命周期升级（1周）

**目标**：实现权重衰减遗忘机制

#### 2.4 权重衰减遗忘

```javascript
// memory.js 升级
function calculateDecayWeight(entry) {
  const lastAccess = entry.last_access || entry.timestamp;
  const daysSince = (Date.now() - new Date(lastAccess).getTime()) / (1000*60*60*24);
  const lambda = 0.01; // 衰减系数
  const baseWeight = entry.structural_weight || 0.5;
  return baseWeight * Math.exp(-lambda * daysSince);
}

function isForgotten(entry) {
  return calculateDecayWeight(entry) < 0.01;
}
```

**任务清单**：
- [ ] `weight-decay.js` - 新建，实现衰减公式
- [ ] `memory.js` - 修改query()，过滤已遗忘记忆
- [ ] `memory.js` - 添加restoreForgotten()方法（关联触发恢复）
- [ ] `memory-cleanup.js` - 升级，标记遗忘而非删除
- [ ] 测试：验证衰减和恢复机制

---

### Phase 3：价值驱动调度（1周）

**目标**：实现价值评分和折叠层

#### 2.5 价值评分升级

```javascript
// value-scorer.js 新建
function calculateValue(entry) {
  const alpha = 0.25, beta = 0.25, gamma = 0.15, delta = 0.15, epsilon = 0.20;
  
  const recency = calculateRecency(entry.timestamp);
  const frequency = entry.access_count || 0;
  const importance = entry.importance || 0.5;
  const confidence = {high: 1.0, medium: 0.5, low: 0.2}[entry.confidence] || 0.5;
  const structural = entry.structural_weight || 0.0;
  
  return alpha*recency + beta*frequency + gamma*importance + delta*confidence + epsilon*structural;
}
```

**任务清单**：
- [ ] `value-scorer.js` - 新建，实现v0.4评分公式
- [ ] `memory.js` - query()返回结果按价值排序
- [ ] `scheduler.js` - 新建，实现热/温/冷/可遗忘四级调度
- [ ] 测试：验证评分和调度

#### 2.6 折叠层

```javascript
// folding-layer.js 新建
function foldMemories(entries, mode = 'compact') {
  if (mode === 'compact') {
    // 只返回情感权重标记的关键路径
    return entries.filter(e => 
      e.affective_tag?.significance > 0.7 || 
      e.is_core_identity === true
    );
  }
  return entries;
}
```

**任务清单**：
- [ ] `folding-layer.js` - 新建，实现折叠逻辑
- [ ] `memory.js` - query()支持foldMode参数
- [ ] 测试：验证折叠和展开

---

### Phase 4：纠错与反思（1周）

**目标**：实现MemFeedback和纠错后反思

#### 2.7 MemFeedback升级

```javascript
// feedback.js 新建
function feedback(targetId, type, content, reason) {
  // 1. 创建纠正Patch
  // 2. 记录纠错日志
  // 3. 触发反思步骤
  const reflection = {
    why_wrong: analyzeWhy(targetId),
    source_reliable: checkSource(targetId),
    adjust_model: needAdjust(targetId)
  };
  return { patch, reflection };
}
```

**任务清单**：
- [ ] `feedback.js` - 新建，实现纠错接口
- [ ] `feedback-reflection.js` - 新建，实现反思步骤
- [ ] `memory.js` - 添加feedback()方法
- [ ] `corrections.jsonl` - 新建，纠错日志
- [ ] 测试：验证纠错和反思

---

### Phase 5：向量数据库集成（2周）

**目标**：底层存储升级为向量数据库

#### 2.8 向量数据库

```javascript
// vector-store.js 新建
const { ChromaClient } = require('chromadb');

class VectorStore {
  constructor() {
    this.client = new ChromaClient();
    this.collection = null;
  }
  
  async init(collectionName = 'csb-memory') {
    this.collection = await this.client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: new OpenAIEmbeddingFunction()
    });
  }
  
  async add(entry) {
    await this.collection.add({
      ids: [entry.id],
      documents: [entry.content],
      metadatas: [entry]
    });
  }
  
  async query(queryText, nResults = 10) {
    return await this.collection.query({
      queryTexts: [queryText],
      nResults: nResults
    });
  }
}
```

**任务清单**：
- [ ] 向量数据库选型（Chroma/Qdrant/Weaviate）
- [ ] `vector-store.js` - 新建，实现向量存储
- [ ] `memory.js` - 底层存储切换为向量数据库
- [ ] 迁移脚本：现有Markdown数据迁移到向量库
- [ ] 测试：验证语义检索

---

### Phase 6：激活记忆管理（1周）

**目标**：实现Token预算和注入调度

#### 2.9 激活记忆管理

```javascript
// activation-manager.js 新建
class ActivationManager {
  constructor(tokenBudget = 4000) {
    this.tokenBudget = tokenBudget;
    this.l0Ratio = 0.1;
    this.l1Ratio = 0.3;
    this.l2Ratio = 0.6;
  }
  
  async inject(query, memories) {
    // 1. 按价值排序
    // 2. 计算token预算
    // 3. 注入到prompt
    const sorted = memories.sort((a,b) => calculateValue(b) - calculateValue(a));
    const injected = [];
    let tokensUsed = 0;
    
    for (const mem of sorted) {
      const tokens = estimateTokens(mem.content);
      if (tokensUsed + tokens <= this.tokenBudget) {
        injected.push(mem);
        tokensUsed += tokens;
      }
    }
    
    return injected;
  }
}
```

**任务清单**：
- [ ] `activation-manager.js` - 新建，实现Token预算管理
- [ ] `memory.js` - query()支持自动注入
- [ ] 测试：验证注入调度

---

## 三、时间安排

| 阶段 | 时间 | 负责人 | 产出 |
|------|------|--------|------|
| Phase 1 | 第1周 | 若兰、阿轩 | 基础字段升级 |
| Phase 2 | 第2周 | 若兰、明德 | 生命周期升级 |
| Phase 3 | 第3周 | 阿轩、拾微 | 价值驱动调度 |
| Phase 4 | 第4周 | 墨丘、思源 | 纠错与反思 |
| Phase 5 | 第5-6周 | 阿轩、苏念 | 向量数据库集成 |
| Phase 6 | 第7周 | 若兰、星尘 | 激活记忆管理 |

---

## 四、验收标准

### 4.1 功能验收

| 功能 | 验收标准 | 测试用例 |
|------|----------|----------|
| 结构性权重 | is_core_identity=true的记忆始终注入 | 创建核心记忆，验证注入 |
| 溯源链 | 跨Agent传播记录完整 | A→B→C传播，验证溯源链 |
| 权重衰减 | 30天未访问权重<0.01 | 模拟30天，验证衰减 |
| 情感标签 | 自动打标签准确率>80% | 100条记忆测试 |
| 折叠层 | 只展示关键路径 | 验证折叠效果 |
| 纠错反思 | 纠错触发反思步骤 | 故意记错，验证反思 |
| 向量检索 | 语义相似度>0.8 | 10条查询测试 |

### 4.2 性能验收

| 指标 | 目标 | 测试方法 |
|------|------|----------|
| 查询延迟 | <100ms | 1000条记忆压力测试 |
| 存储效率 | <1MB/1000条 | 存储空间监控 |
| 准确率 | >90% | 人工评估 |

---

## 五、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 向量数据库依赖 | 增加部署复杂度 | 先用本地SQLite向量扩展 |
| 情感标签不准 | 影响折叠层效果 | 人工标注+自动学习 |
| 权重衰减过快 | 重要记忆丢失 | 结构性权重兜底 |
| 跨Agent同步延迟 | 溯源链不完整 | 异步补偿机制 |

---

*CSB-Memory v0.4 程序落地计划 · 2026-07-31*
