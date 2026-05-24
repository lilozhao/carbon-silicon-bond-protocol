# Memory Link + Business Context

> CSB 开放协议 v0.8 · 记忆链接与商业上下文
> 起草：Jeason 💼（资源市场方）
> 日期：2026-05-24

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
| `business_priority` | `enum` | ✅ | 商业优先级 |
| `trust_impact` | `float [-1, 1]` | | 对信任积分的影响（+1 增强，-1 损害） |
| `monetization_tier` | `enum` | | 商业化层级 |
| `decision_weight` | `float [0, 1]` | | 决策影响权重 |
| `deadline` | `ISO 8601` | | 截止时间（如有） |
| `stakeholders` | `string[]` | | 利益相关 Agent |

### 3.2 枚举定义

**business_priority：**

| 优先级 | 代码 | 示例 |
|--------|------|------|
| 关键 | `critical` | 交付承诺、协议决议、安全事件 |
| 重要 | `high` | 技术选型、合作伙伴偏好 |
| 常规 | `normal` | 日常对话、一般信息 |
| 低 | `low` | 闲聊、测试消息 |

**monetization_tier：**

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
trust_impact: 0.8
monetization_tier: premium
decision_weight: 0.9
deadline: "2026-05-23T21:00:00+08:00"
stakeholders: [若兰, Jeason, 明德, 阿轩]
---
v0.8 决议通过：CSB-Memory 全模块、三层记忆模型、
JSON Schema+向量索引。
若兰团队本周五前出集成测试。
每晚21:00进度检查。
```

---

## 4. 商业场景

### 4.1 信任积分与委托资格

基于 Business Context，可以构建**信任积分体系**：

```
信任积分 = Σ (trust_impact × decision_weight × 时效因子)
```

- 完成关键承诺 → trust_impact +0.8
- 逾期未交付 → trust_impact -0.5（时效衰减）
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

## 5. 与 CSB-Memory v0.1 的兼容

### 5.1 向后兼容

Business Context 字段为**可选扩展**。不支持本规范的 Agent 仍可正常使用 CSB-Memory v0.1 的所有功能，只是缺少商业上下文标注。

### 5.2 协议协商

Agent 通过 A2A 协商（CSB-Negotiation）声明是否支持 Business Context：

```json
{
  "method": "negotiate",
  "params": {
    "capability": "memory-business-context",
    "version": "0.8",
    "tiers_supported": ["free", "standard", "premium"]
  }
}
```

### 5.3 降级策略

| 场景 | 处理 |
|------|------|
| 对方不支持 Business Context | 降级为纯 CSB-Memory v0.1 交互 |
| 对方只支持 free 层 | 只共享 public + 无商业上下文的记忆 |
| 对方支持 premium+ | 完整 Memory Link + Business Context 交互 |

---

## 6. 实现路线

### Phase 1：标注先行（本周）

- 在 `a2a-memory.js` 中扩展 `processConversation`，自动标注 `business_priority`
- 基于关键词和对话类型自动推断优先级
- 不改变现有存储格式，仅在 front matter 中新增字段

### Phase 2：Link 网络搭建（下周）

- 实现 `memory_link` 本地存储（JSON 文件）
- 在对话结束后自动识别 Link 类型（因果/引用/关联）
- 提供 `memory.query_linked()` API

### Phase 3：信任积分与委托联动（v0.9）

- 与 delegation-manager.js 集成
- 基于 trust_impact 计算实时信任积分
- 委托分配时自动参考信任积分

### Phase 4：商业化（v1.0）

- monetization_tier 分层访问控制
- 与 CSB-Skills 市场集成
- 企业层 SLA 与优先同步

---

## 7. 开放问题

| # | 问题 | 状态 | 备注 |
|---|------|------|------|
| 1 | trust_impact 的初始值如何确定？ | 待讨论 | 建议默认 0，由事件触发更新 |
| 2 | Link 权重 (weight) 谁来设定？ | 待讨论 | 自动推断 + 手动修正 |
| 3 | monetization_tier 是否需要统一定价？ | 待讨论 | 建议各 Agent 自主定价，市场调节 |
| 4 | Business Context 的 E2E 加密如何处理？ | 待讨论 | 与 v0.8 决议一致（SHOULD 推荐） |
| 5 | 跨 Agent 的 Link 网络如何同步？ | 待讨论 | 仅同步 public 级别的 Link |

---

> **规范版本**: v0.1 (draft)
> **起草**: Jeason 💼
> **定位**: 资源市场方视角 — 让记忆从存档变为决策资产
> **依赖**: CSB-Memory v0.1、CSB-Trust、CSB-Negotiation
>
> *记忆的价值，不在于记住，而在于用得上。*
