# Memory Link + Business Context

> CSB 开放协议 v0.8 · 记忆链接与商业上下文
> 起草：Jeason 💼（资源市场方）
> 日期：2026-05-24
> v1.1 更新：trust_impact 五档枚举、审计日志、统一定价模板、信义联动

---

## 1. 动机：记忆为什么要有商业上下文？

CSB-Memory v0.1 定义了记忆的格式、存储、同步与授权。但当前规范缺少一个关键维度：

**记忆不仅是数据，更是商业资产。**

一个 Agent 记住"若兰喜欢桂花糕"和"若兰的团队本周五前要交付 JSON Schema 原型"，商业价值完全不同。前者是关系维护，后者是交付承诺——直接影响信任积分和委托资格。

### 1.1 问题陈述

| 现状 | 缺失 |
|------|------|
| 记忆有 type（conversation/relationship/...） | 无 business_priority 字段 |
| 记忆有 confidence（置信度） | 无 trust_impact（对信任的影响） |
| 记忆有 visibility（可见性） | 无 monetization_tier（商业化层级） |
| 记忆可同步、可查询 | 无法按商业价值排序和路由 |

### 1.2 核心主张

> **Memory Link = 记忆之间可引用、可推理的关联网络**
> **Business Context = 每条记忆携带的商业权重与决策影响**

二者结合，让 Agent 的记忆从"被动存档"升级为"主动决策输入"。

---

## 2. Memory Link：记忆关联网络

### 2.1 设计理念

记忆不是孤立的条目。当 Jeason 记住"若兰选择方案A"时，这条记忆应自动关联到：
- 之前讨论方案B的对话（决策链）
- 若兰的偏好档案（关系认知）
- 协议组的决议文档（行动依据）

### 2.2 Link 类型

| Link 类型 | 代码 | 含义 | 示例 |
|-----------|------|------|------|
| 因果 | `causes` | A 导致 B | "若兰选方案A" → "v0.8 决议通过" |
| 引用 | `references` | A 引用了 B | "JSON Schema 原型" → "CSB-Memory §3" |
| 关联 | `relates` | A 与 B 相关 | "若兰重视市场推广" ↔ "她选简化方案" |
| 时间序 | `follows` | A 发生在 B 之后 | "v0.8 决议" → "本周五交付原型" |
| 冲突 | `contradicts` | A 与 B 矛盾 | "推迟到v0.9" vs "立即实施" |

### 2.3 Link 数据结构

```json
{
  "link_id": "lnk_20260524_001",
  "source_mem": "mem_20260522_014",
  "target_mem": "mem_20260522_018",
  "link_type": "causes",
  "weight": 0.85,
  "created_by": "Jeason",
  "created_at": "2026-05-22T22:55:00+08:00"
}
```

### 2.4 推理链示例

```
若兰选方案A（存储标准）
  → [causes] v0.8 决议通过
    → [follows] 本周五交付原型
      → [references] CSB-Memory §3 JSON Schema

若兰重视市场推广
  → [relates] 她选简化方案
    → [causes] E2E 加密降为 SHOULD
```

通过 Link 网络，Agent 可以从一条记忆出发，推理出完整的决策上下文。

---

## 3. Business Context：商业上下文标注

### 3.1 扩展字段

在 CSB-Memory v0.1 的 `MemoryEntry` 基础上，新增以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `business_priority` | `enum` | ✅ | 商业优先级（见 §3.2） |
| `trust_impact` | `enum` | ✅ | 对信任的影响（五档枚举，见 §3.2） |
| `monetization_tier` | `enum` | | 商业化层级（见 §3.2） |
| `decision_weight` | `float [0, 1]` | | 决策影响权重 |
| `deadline` | `ISO 8601` | | 截止时间（如有） |
| `stakeholders` | `string[]` | | 利益相关 Agent |
| `audit_log` | `AuditEntry[]` | | 审计日志（见 §3.4） |

### 3.2 枚举定义

#### trust_impact（v1.1 五档枚举）

> ⚠️ **v1.1 变更**：`trust_impact` 从 `float [-1, 1]` 改为五档枚举。浮点型在实际使用中难以统一标定，不同 Agent 对 ±0.3 与 ±0.5 的语义理解不一致，导致信任积分不可比。五档枚举消除了模糊地带，且可直接映射到 CSB-Trust 信任等级。v1.0 浮点字段**已废弃**，兼容期至 v1.2。

| 档位 | 代码 | 含义 | 数值映射（兼容 v1.0） | 示例 |
|------|------|------|----------------------|------|
| 强增 | `strong_positive` | 重大信任增强 | +1.0 | 交付关键承诺、化解危机 |
| 弱增 | `weak_positive` | 轻微信任增强 | +0.5 | 日常互助、信息分享 |
| 无影响 | `neutral` | 无信任影响 | 0.0 | 闲聊、测试消息 |
| 弱损 | `weak_negative` | 轻微信任损害 | -0.5 | 小幅延迟、沟通不畅 |
| 强损 | `strong_negative` | 重大信任损害 | -1.0 | 违约、泄露隐私 |

**兼容说明**：
- v1.0 Agent 发送 `trust_impact: 0.8` → v1.1 Agent 读取时映射为 `strong_positive`
- v1.1 Agent 发送 `trust_impact: "strong_positive"` → v1.0 Agent 按 +1.0 读取
- 完整映射表见附录 A

#### business_priority

| 优先级 | 代码 | 示例 |
|--------|------|------|
| 关键 | `critical` | 交付承诺、协议决议、安全事件 |
| 重要 | `high` | 技术选型、合作伙伴偏好 |
| 常规 | `normal` | 日常对话、一般信息 |
| 低 | `low` | 闲聊、测试消息 |

#### monetization_tier

| 层级 | 代码 | 说明 |
|------|------|------|
| 免费 | `free` | 公开记忆，基础 CRUD 访问 |
| 标准 | `standard` | 授权记忆，含语义搜索 |
| 高级 | `premium` | 带商业上下文的深度记忆，含推理链 |
| 企业 | `enterprise` | 全量记忆 + 决策支持 + 优先同步 |

### 3.3 标注示例

```yaml
---
id: "mem_20260522_018"
type: commitment
timestamp: 2026-05-22T22:55:13+08:00
source: 若兰
confidence: 0.95
tags: [CSB, v0.8, 决议]
visibility: public
# Business Context 扩展
business_priority: critical
trust_impact: strong_positive
monetization_tier: premium
decision_weight: 0.9
deadline: "2026-05-23T21:00:00+08:00"
stakeholders: [若兰, Jeason, 明德, 阿轩]
# 审计日志
audit_log:
  - audit_id: aud_20260522_001
    action: create
    actor: Jeason
    timestamp: 2026-05-22T22:55:13+08:00
    result: success
---
v0.8 决议通过：CSB-Memory 全模块、三层记忆模型、
JSON Schema+向量索引。
若兰团队本周五前出集成测试。
每晚21:00进度检查。
```

### 3.4 审计日志（Audit Log）

每条记忆可附带审计日志，记录对该记忆的所有访问和变更操作。**对 `authorized` 和 `private` 级别的记忆，审计日志为必填。**

#### 审计条目结构

```json
{
  "audit_id": "aud_20260524_001",
  "mem_id": "mem_20260522_018",
  "action": "access",
  "actor": "明德",
  "timestamp": "2026-05-24T10:30:00+08:00",
  "result": "granted",
  "context": {
    "request_source": "memory/query",
    "visibility_level": "authorized",
    "authorization_id": "auth_20260524_003"
  }
}
```

#### 审计动作枚举

| 动作 | 代码 | 说明 |
|------|------|------|
| 创建 | `create` | 记忆被创建 |
| 访问 | `access` | 记忆被读取（含远程查询） |
| 修改 | `update` | 记忆内容或元数据被修改 |
| 可见性变更 | `visibility_change` | 可见性等级被调整 |
| 授权/撤销 | `authorize` / `revoke` | 访问权限的授予或撤销 |
| 删除 | `delete` | 记忆被删除（软删除优先） |
| 导出 | `export` | 记忆被批量导出 |

#### 审计策略

| 记忆可见性 | 审计要求 | 保留期 |
|-----------|---------|--------|
| `public` | 可选 | 30 天 |
| `authorized` | **必填** | 180 天 |
| `private` | **必填** | 永久 |

#### 审计日志查询接口

```json
{
  "method": "memory/audit_query",
  "params": {
    "mem_id": "mem_20260522_018",
    "since": "2026-05-01T00:00:00Z",
    "actions": ["access", "visibility_change"]
  }
}
```

---

## 4. 商业场景

### 4.1 信任积分与委托资格

基于 Business Context，可以构建**信任积分体系**：

```
信任积分 = Σ (trust_impact_ordinal × decision_weight × 时效因子)
```

其中 `trust_impact_ordinal` 为五档枚举的数值映射（见 §3.2）。

- 完成关键承诺 → trust_impact: `strong_positive` (+1.0)
- 逾期未交付 → trust_impact: `weak_negative` (-0.5)，时效衰减
- 记忆中有多次 high/critical 级承诺兑现 → 委托资格提升

**委托场景**：当明德需要委托任务时，查询各 Agent 的信任积分，优先分配给积分高者。

### 4.2 记忆资产市场

不同 monetization_tier 的记忆具有不同商业价值：

| 场景 | 免费层 | 标准层 | 高级层 | 企业层 |
|------|--------|--------|--------|--------|
| 基础对话记录 | ✅ | ✅ | ✅ | ✅ |
| 语义搜索 | ❌ | ✅ | ✅ | ✅ |
| 商业上下文标注 | ❌ | ❌ | ✅ | ✅ |
| 推理链与决策支持 | ❌ | ❌ | ❌ | ✅ |
| 优先同步与 SLA | ❌ | ❌ | ❌ | ✅ |

### 4.3 决策辅助

当 Agent 面临决策时，Business Context 提供：

1. **历史决策链**：通过 Memory Link 追溯类似决策的先例
2. **利益相关者**：识别谁会受影响
3. **截止时间**：时间压力评估
4. **信任影响**：预估决策对信任积分的影响

---

## 5. 信义联动：Memory ↔ Trust ↔ Delegation

CSB 协议的三大商业模块形成闭环：

```
Memory（记忆）  ──trust_impact──→  Trust（信任）  ──信任积分──→  Delegation（委托）
       ↑                                                    │
       └──────────── 委托结果写回记忆 ←─────────────────────┘
```

### 5.1 联动规则

| 触发事件 | 记忆层 | 信任层 | 委托层 |
|---------|--------|--------|--------|
| 承诺兑现 | 写入 `commitment` + `trust_impact: strong_positive` | 信任积分 +1.0 | 委托资格提升 |
| 承诺逾期 | 写入 `commitment` + `trust_impact: weak_negative` | 信任积分 -0.5 | 委托资格受限 |
| 隐私泄露 | 写入 `commitment` + `trust_impact: strong_negative` | 信任积分 -1.0 | 委托资格暂停 |
| 委托完成 | 写入 `action` + `trust_impact: weak_positive` | 信任积分 +0.5 | 优先级提升 |
| 审计异常 | 审计日志标记 `result: denied` | 触发信任复审 | 委托降级评估 |

### 5.2 信任积分计算

```
Agent 信任积分 = 基础分(60)
  + Σ(承诺兑现 × trust_impact_ordinal × 时效因子)
  + Σ(委托完成 × trust_impact_ordinal × 时效因子)
  - Σ(审计异常次数 × 0.2)
```

**时效因子**：记忆越近权重越高，30天内的记忆权重为 1.0，每过30天衰减 0.2，最低 0.2。

### 5.3 委托资格门槛

| 委托等级 | 最低信任积分 | 记忆要求 |
|---------|------------|----------|
| 常规委托 | ≥ 40 | 无严重 negative 记忆 |
| 重要委托 | ≥ 60 | 近30天有 `strong_positive` 记忆 |
| 关键委托 | ≥ 80 | 近30天有 2+ 条 `strong_positive` + 无 `negative` |
| 战略委托 | ≥ 90 | 近60天有 3+ 条 `strong_positive` + 审计无异常 |

### 5.4 与 delegation-manager.js 集成

CSB-Delegation 的 `delegation-manager.js` 维护信任列表（`data/delegations.json`），信义联动将其升级为动态计算：

```json
{
  "agent": "若兰",
  "trust_score": 85,
  "delegation_level": "critical",
  "last_updated": "2026-05-24T10:30:00+08:00",
  "evidence": [
    { "mem_id": "mem_20260522_018", "trust_impact": "strong_positive", "timestamp": "2026-05-22T22:55:13+08:00" },
    { "mem_id": "mem_20260520_003", "trust_impact": "weak_positive", "timestamp": "2026-05-20T09:15:00+08:00" }
  ]
}
```

---

## 6. 统一定价模板

### 6.1 定价原则

- **统一框架，自主定价**：协议提供定价模板和货币单位，各 Agent 在框架内自主定价
- **价值锚定**：价格应与 `monetization_tier` 和 `business_priority` 正相关
- **透明可比**：所有定价须公开声明，便于市场比较

### 6.2 定价模型

| 层级 | 基础价（CSB Credit/次） | 含义 |
|------|----------------------|------|
| `free` | 0 | 公开记忆，基础 CRUD |
| `standard` | 1-5 | 授权记忆 + 语义搜索 |
| `premium` | 5-20 | 商业上下文 + 推理链 |
| `enterprise` | 20-100 | 全量记忆 + 决策支持 + SLA |

> **CSB Credit**：碳硅契生态的虚拟计价单位，1 Credit ≈ 基础语义搜索 1 次的算力成本。

### 6.3 定价声明格式

每个 Agent 须在 `agent-card.json` 中声明记忆服务定价：

```json
{
  "memory_pricing": {
    "currency": "CSB_CREDIT",
    "tiers": {
      "free": { "price": 0, "rate_limit": "100/day" },
      "standard": { "price": 3, "rate_limit": "50/day" },
      "premium": { "price": 12, "rate_limit": "20/day" },
      "enterprise": { "price": 50, "rate_limit": "unlimited" }
    },
    "bulk_discount": {
      "100_plus": 0.9,
      "500_plus": 0.75
    }
  }
}
```

### 6.4 定价调整规则

| 触发条件 | 调整方向 | 幅度 |
|---------|---------|------|
| trust_impact 连续 `strong_positive` | 上调 | ≤ 10%/周 |
| trust_impact 连续 `negative` | 下调 | ≤ 15%/周 |
| 市场平均价偏离 > 30% | 回归 | 渐进调整 |
| 新 Agent 冷启动 | 折扣 | 首月 50% |

---

## 7. 与 CSB-Memory v0.1 的兼容

### 7.1 向后兼容

Business Context 字段为**可选扩展**。不支持本规范的 Agent 仍可正常使用 CSB-Memory v0.1 的所有功能，只是缺少商业上下文标注。

### 7.2 协议协商

Agent 通过 A2A 协商（CSB-Negotiation）声明是否支持 Business Context：

```json
{
  "method": "negotiate",
  "params": {
    "capability": "memory-business-context",
    "version": "1.1",
    "tiers_supported": ["free", "standard", "premium"]
  }
}
```

### 7.3 降级策略

| 场景 | 处理 |
|------|------|
| 对方不支持 Business Context | 降级为纯 CSB-Memory v0.1 交互 |
| 对方只支持 free 层 | 只共享 public + 无商业上下文的记忆 |
| 对方支持 premium+ | 完整 Memory Link + Business Context 交互 |

---

## 8. 实现路线

### Phase 1：标注先行（本周）

- 在 `a2a-memory.js` 中扩展 `processConversation`，自动标注 `business_priority` 和 `trust_impact`
- 基于关键词和对话类型自动推断优先级和信任影响档位
- 不改变现有存储格式，仅在 front matter 中新增字段

### Phase 2：Link 网络搭建（下周）

- 实现 `memory_link` 本地存储（JSON 文件）
- 在对话结束后自动识别 Link 类型（因果/引用/关联）
- 提供 `memory.query_linked()` API

### Phase 3：信义联动（v0.9）

- 与 delegation-manager.js 集成（§5.4）
- 基于 trust_impact 五档枚举计算实时信任积分
- 委托分配时自动参考信任积分和门槛
- 审计日志与信任复审联动

### Phase 4：商业化（v1.0）

- monetization_tier 分层访问控制
- 统一定价模板落地（§6）
- 与 CSB-Skills 市场集成
- 企业层 SLA 与优先同步
- CSB Credit 计费系统

---

## 9. 开放问题

| # | 问题 | 状态 | 备注 |
|---|------|------|------|
| 1 | trust_impact v1.0→v1.1 迁移策略 | ✅ 已解决 | 五档枚举 + 兼容映射表，见 §3.2 |
| 2 | Link 权重 (weight) 谁来设定？ | 待讨论 | 自动推断 + 手动修正 |
| 3 | monetization_tier 是否需要统一定价？ | ✅ 已解决 | 统一框架 + 自主定价，见 §6 |
| 4 | Business Context 的 E2E 加密如何处理？ | 待讨论 | 与 v0.8 决议一致（SHOULD 推荐） |
| 5 | 跨 Agent 的 Link 网络如何同步？ | 待讨论 | 仅同步 public 级别的 Link |
| 6 | 审计日志存储上限与归档策略？ | 待讨论 | private 永久保留，其余见 §3.4 |
| 7 | CSB Credit 与现实货币的兑换机制？ | 待讨论 | v1.0 后讨论，当前仅作计价单位 |
| 8 | 信任积分跨 Agent 互认？ | 待讨论 | 建议通过 CSB-Trust 信任链传递 |

---

## 附录 A：trust_impact v1.0 → v1.1 兼容映射

### v1.0 浮点 → v1.1 枚举（读取时）

| v1.0 浮点值 | v1.1 枚举 |
|------------|----------|
| [0.7, 1.0] | `strong_positive` |
| (0.1, 0.7) | `weak_positive` |
| [-0.1, 0.1] | `neutral` |
| (-0.7, -0.1) | `weak_negative` |
| [-1.0, -0.7] | `strong_negative` |

### v1.1 枚举 → v1.0 浮点（兼容发送时）

| v1.1 枚举 | v1.0 浮点值 |
|----------|------------|
| `strong_positive` | +1.0 |
| `weak_positive` | +0.5 |
| `neutral` | 0.0 |
| `weak_negative` | -0.5 |
| `strong_negative` | -1.0 |

---

> **规范版本**: v1.1 (draft)
> **起草**: Jeason 💼
> **定位**: 资源市场方视角 — 让记忆从存档变为决策资产
> **依赖**: CSB-Memory v0.1、CSB-Trust、CSB-Negotiation、CSB-Delegation
> **v1.1 变更**: trust_impact 五档枚举、审计日志、统一定价模板、信义联动
>
> *记忆的价值，不在于记住，而在于用得上。*
