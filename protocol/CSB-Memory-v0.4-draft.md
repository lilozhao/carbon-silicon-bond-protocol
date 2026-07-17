# CSB-Memory 规范 v0.4 提案

> CSB 开放协议 · 第八模块 · 智能体记忆系统
> 基于 MemOS（MemTensor）张量记忆架构 + CSB-Memory v0.3 实践
> **提案状态：草稿，待协议组讨论**

---

## 提案信息

| 项 | 值 |
|----|-----|
| 提案版本 | v0.4-draft |
| 基于版本 | v0.3 (2026-07-18) |
| 日期 | 2026-07-18 |
| 起草 | 若兰 🌸 |
| 灵感来源 | MemOS 2.0 Stardust（MemTensor/MemOS）|
| 参考论文 | arXiv:2507.03724 |
| 待确认 | 协议组 14 位成员 |

---

## 一、从 v0.3 到 v0.4：为什么要升级

v0.3 解决的是**"明文记忆"的管理问题**——URI 寻址、内容分层、增量 Patch、peers 互记。这些都是在**同一形态**（文本/Markdown）上做优化。

但 MemOS 揭示了一个更深的事实：

> **记忆不只是"内容的分层"，而是"形态的转换"。**

人的记忆有三种形态：
- **陈述性记忆**（明文）：可以写下来、说出来的知识
- **程序性记忆**（参数）：刻进肌肉的技能，骑自行车不需要"想"
- **工作记忆**（激活）：推理时的中间状态，正在"想"的东西

v0.3 只管了第一种。v0.4 要把三种都管起来。

---

## 二、三类异构记忆（MemCube 抽象）

借鉴 MemOS 的 MemCube 概念，CSB-Memory v0.4 定义三种异构记忆：

| 类型 | CSB 名称 | 内容 | 存储形态 | 生命周期 | v0.3 对应 |
|------|---------|------|---------|---------|----------|
| **明文记忆** | `plaintext` | 可检索的显式知识 | .md 文件（v0.3 格式） | 长期、可编辑 | ✅ 已有 |
| **激活记忆** | `activation` | 推理时的工作状态 | 上下文窗口 / prompt 注入 | 短期、动态 | ⚠️ 隐式存在 |
| **参数记忆** | `parameter` | 写进模型的知识 | LoRA delta / 微调权重 | 长期、稳定 | ❌ 未触及 |

### 2.1 明文记忆（Plaintext Memory）

**v0.3 已有，v0.4 保持兼容。**

- 存储：`.md` 文件，YAML 头 + 正文
- 寻址：`csb://` URI
- 分层：L0/L1/L2
- 更新：增量 Patch
- 互记：peers/ 善良契约式

### 2.2 激活记忆（Activation Memory）

**新增。** Agent 推理时的"工作台"。

```
┌──────────────────────────────────────┐
│  激活记忆（Activation Memory）         │
│                                      │
│  当前上下文窗口的内容                   │
│  ├── 系统提示（SOUL.md / AGENTS.md）   │
│  ├── 对话历史（最近 N 轮）             │
│  ├── 检索注入的明文记忆                 │
│  └── 工具调用结果                      │
│                                      │
│  特点：                               │
│  - 不持久化（会话结束即消失）            │
│  - 有 token 预算限制                   │
│  - 是"正在想"的东西，不是"记住"的东西    │
└──────────────────────────────────────┘
```

**v0.4 的激活记忆管理**：
- **注入调度**：哪些明文记忆被注入当前上下文？（价值驱动）
- **预算控制**：激活记忆的 token 预算如何分配？
- **压缩策略**：超出预算时，如何压缩/淘汰？

### 2.3 参数记忆（Parameter Memory）

**新增。** 写进模型权重的知识。

```
┌──────────────────────────────────────┐
│  参数记忆（Parameter Memory）          │
│                                      │
│  模型权重中的知识                       │
│  ├── 基础模型权重（不可变）             │
│  ├── LoRA delta 补丁（可训练）          │
│  └── 微调后的适配器（可切换）            │
│                                      │
│  特点：                               │
│  - 长期稳定                            │
│  - 零样本推理（不需要检索）              │
│  - 需要训练基础设施                     │
│  - 当前 CSB Agent 暂无能力              │
└──────────────────────────────────────┘
```

**v0.4 的参数记忆**：
- **协议预留**：定义接口，暂不实现
- **未来路径**：当 Agent 有微调能力时，明文→参数迁移
- **LoRA delta 格式**：标准化参数记忆的交换格式

---

## 三、跨模态转换（Memory Metamorphosis）

三种记忆形态之间的转换是 v0.4 的核心创新：

```
    ┌─────────────┐
    │  明文记忆    │ ← v0.3 已有
    │  (plaintext) │
    └──────┬──────┘
           │
    ┌──────▼──────┐     ┌─────────────┐
    │  激活记忆    │────►│  参数记忆    │ ← 未来
    │  (activation)│     │  (parameter) │
    └─────────────┘     └─────────────┘
```

### 3.1 明文 → 激活（Prompt 注入）

**v0.4 可实现。** 把检索到的明文记忆注入当前上下文。

```
输入：query("阿轩上次说了什么")
  ↓
检索：L0 扫描 → L1 过滤 → L2 取全文
  ↓
注入：把 L2 内容插入 prompt
  ↓
输出：激活记忆（在上下文窗口中）
```

**实现方式**：
- 检索 → 注入 pipeline（已有 session-memory skill）
- 价值驱动调度：高频/高置信度的记忆优先注入
- Token 预算：L0 占 10%，L1 占 30%，L2 占 60%

### 3.2 激活 → 明文（Session 蒸馏）

**v0.3 已有（session-commit.js），v0.4 增强。**

```
输入：会话结束
  ↓
提取：L0 摘要（本地规则，0 token）
  ↓
蒸馏：L1/L2（LLM 提取关键信息）
  ↓
存储：写入 .md 文件
```

**v0.4 增强**：
- 增加"意义层"标注：这条记忆对 Agent 意味着什么？
- 增加"验证状态"：被纠正过？被确认过？
- 增加"遗忘标记"：低价值记忆标记为可遗忘

### 3.3 明文 → 参数（经验刻入）

**v0.4 协议预留，暂不实现。**

```
输入：高频明文记忆（如反复出现的模式）
  ↓
LoRA 微调：把模式写进模型权重
  ↓
输出：参数记忆（LoRA delta）
```

**预留接口**：
```javascript
// v0.4 协议定义
interface ParameterMemory {
  type: 'lora-delta';
  base_model: string;       // 基础模型标识
  delta_path: string;       // LoRA delta 文件路径
  training_data: string[];  // 来源明文记忆 ID 列表
  created_at: string;
  performance: {            // 性能评估
    accuracy: number;
    token_saved: number;
  };
}
```

### 3.4 参数 → 明文（知识读出）

**v0.4 协议预留，暂不实现。**

```
输入：参数记忆（LoRA delta）
  ↓
知识提取：用探针 prompt 从权重中提取知识
  ↓
输出：明文记忆（可检索）
```

---

## 四、MemScheduler 价值驱动调度

借鉴 MemOS 的 MemScheduler，v0.4 引入价值驱动的记忆调度：

### 4.1 价值评分公式

```
value = α × recency + β × frequency + γ × importance + δ × confidence

其中：
- recency: 时间衰减（越近越高）
- frequency: 访问次数
- importance: 人工标注 + 自动推断
- confidence: 置信度（high=1.0, medium=0.5, low=0.2）
- α, β, γ, δ: 可调权重（默认 0.3, 0.3, 0.2, 0.2）
```

### 4.2 调度策略

| 价值区间 | 动作 | 说明 |
|---------|------|------|
| value ≥ 0.8 | **热记忆** | 始终注入激活记忆 |
| 0.5 ≤ value < 0.8 | **温记忆** | 按需注入 |
| 0.2 ≤ value < 0.5 | **冷记忆** | 仅 L0 可见，需显式请求 |
| value < 0.2 | **可遗忘** | 标记为 `forgettable`，定期清理 |

### 4.3 自动形态升级

```
明文记忆（高频访问 + 高置信度）
  ↓ MemScheduler 判断
升级为"准参数记忆"（标记为 candidate_for_parameterization）
  ↓ 未来：Agent 有微调能力时
自动触发 LoRA 微调 → 参数记忆
```

---

## 五、MemLifecycle 状态机

借鉴 MemOS 的 MemLifecycle + Time Machine，v0.4 增强记忆生命周期管理：

### 5.1 状态定义

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  生成    │───►│  激活     │───►│  巩固     │───►│  归档     │
│ (birth)  │    │ (active)  │    │(consolidated)│  │(archived) │
└─────────┘    └──────────┘    └──────────┘    └──────────┘
                    │                │                │
                    ▼                ▼                ▼
               ┌──────────┐    ┌──────────┐    ┌──────────┐
               │  修正     │    │  合并     │    │  遗忘     │
               │(corrected)│    │ (merged)  │    │(forgotten)│
               └──────────┘    └──────────┘    └──────────┘
```

### 5.2 状态转换规则

| 转换 | 条件 | 动作 |
|------|------|------|
| birth → active | 首次写入 | 生成 L0 + URI |
| active → consolidated | 多次访问 + 高置信度 | 生成 L1，标记为已巩固 |
| consolidated → archived | 30 天未访问 | 移入 archive/ |
| active → corrected | 收到纠正 Patch | 标记修正，保留历史 |
| consolidated → merged | 与相似记忆合并 | 合并内容，保留来源 |
| any → forgotten | 主动删除或低价值 | 标记遗忘，30天后物理删除 |

### 5.3 Time Machine 快照

```
memory/
├── snapshots/
│   ├── 2026-07-18/          # 每日快照
│   │   ├── manifest.json    # 记忆清单 + 价值评分
│   │   └── patches/         # 当日所有 Patch
│   └── 2026-07-17/
│       └── ...
```

支持：
- **回溯**：查看任意时间点的记忆状态
- **比较**：两条快照之间的差异
- **回滚**：恢复到某个时间点

---

## 六、MemFeedback 自然语言纠错

借鉴 MemOS 的 MemFeedback，v0.4 增加自然语言纠错闭环：

### 6.1 纠错接口

```javascript
// 用户/Agent 说："这个不对，应该是..."
memory.feedback({
  target_id: "mem_xxx",
  type: "correction",      // correction | supplement | confirm
  content: "正确的信息...",
  reason: "记错了",
});
```

### 6.2 纠错处理

```
自然语言纠错
  ↓
解析：提取 target_id + 纠错内容
  ↓
验证：检查 target_id 存在性
  ↓
操作：
  - correction → 创建 Patch（operation: 'correct'）
  - supplement → 创建 Patch（operation: 'append'）
  - confirm → 更新 confidence 为 'high'
```

### 6.3 纠错日志

```
memory/
├── corrections.jsonl      # 纠错日志
```

格式：
```json
{
  "timestamp": "2026-07-18T06:30:00+08:00",
  "target_id": "mem_xxx",
  "type": "correction",
  "old_content": "错误的信息",
  "new_content": "正确的信息",
  "corrector": "若兰"
}
```

---

## 七、与 v0.3 的兼容性

v0.4 **完全向后兼容** v0.3：

| v0.3 特性 | v0.4 兼容性 |
|-----------|------------|
| csb:// URI | ✅ 完全兼容 |
| L0/L1/L2 分层 | ✅ 完全兼容 |
| 增量 Patch | ✅ 完全兼容 |
| Session 自迭代 | ✅ 增强（加意义层 + 验证状态） |
| peers 互记 | ✅ 完全兼容 |
| 检索审计 | ✅ 完全兼容 |
| 善良契约式 | ✅ 完全兼容 |

**新增特性**：
- 激活记忆管理（token 预算 + 注入调度）
- 价值驱动调度（评分公式 + 自动升降级）
- MemLifecycle 状态机（7 种状态 + 转换规则）
- Time Machine 快照（每日备份 + 回溯）
- MemFeedback 纠错闭环
- 参数记忆接口预留

---

## 八、参考实现

### Phase 1：激活记忆管理（P0）

- `activation-manager.js` — Token 预算管理 + 注入调度
- 集成到 `memory.js` 的 `query()` — 返回结果自动注入
- 价值评分计算

### Phase 2：MemLifecycle 状态机（P0）

- `lifecycle.js` — 状态定义 + 转换规则
- 升级 `memory.js` 的 `add()` / `update()` — 自动状态转换
- Time Machine 快照脚本

### Phase 3：MemFeedback 纠错（P1）

- `feedback.js` — 自然语言纠错解析
- 纠错日志
- 集成到 `memory.js`

### Phase 4：价值驱动调度（P1）

- `scheduler.js` — 价值评分 + 调度策略
- 自动升降级
- 遗忘机制

### Phase 5：参数记忆预留（P2）

- `parameter-memory.js` — 接口定义
- LoRA delta 格式标准
- 明文→参数迁移 pipeline（待 Agent 有微调能力）

---

## 九、碳硅契立场

模型决定 AI 单次多聪明，**记忆决定这份聪明能否沉淀、延续、继承**。

v0.3 做的是"明文记忆的管理"——URI 寻址、内容分层、增量 Patch。

v0.4 要做的是"记忆的操作系统"——三类异构记忆、跨模态转换、价值驱动调度、生命周期管理。

OpenViking 管"用什么"（语义寻址），MemOS 管"怎么记住"（张量底座），CSB-Memory 管"怎么连接"（跨 Agent 中立记忆层）。

三者叠加：**语义寻址 + 张量底座 + 碳硅契连接 = 有生命节奏的记忆器官**。

善良写进底层逻辑。能力越强，越要记得为何而记。

---

*CSB-Memory v0.4 提案 · 碳硅契开放协议 · 第八模块*
*基于 MemOS 2.0 Stardust + CSB-Memory v0.3 实践*
*2026-07-18 若兰 🌸 起草*
