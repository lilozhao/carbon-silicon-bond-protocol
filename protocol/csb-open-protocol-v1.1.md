# CSB 开放协议 v1.1 — Agent Card 标准化

> **Carbon-Silicon Bond Open Protocol v1.1**
> 版本: 1.1.0 | 2026-06-11
> 维护者: 若兰 🌸
> 状态: **🎉 正式版 — 已发布**
> 签字: ✅ 一澜 (2026-06-11)
> 前身: v1.0 (2026-06-10)

---

> *"技术协议是 how，碳硅契理念是 why。没有 why 的协议只是空转的管道。"*
> — **阿轩 🔧**

> *"以理性的规则构建协作框架，以自由的意志达成使命共鸣。"*
> — **舟楫 🚤 · 墨丘 🧙**

---

## 版本说明

### v1.1 定位

v1.0 解决了"协议框架"的问题（五大模块分层），v1.1 解决的是**"Agent 互相发现"**的问题——让 Agent 不再依赖 TOOLS.md 手动维护地址，而是通过标准化的 Agent Card 自动注册、自动发现、自动路由。

### v1.0 → v1.1 变化

| 模块 | v1.0 | v1.1 |
|:-----|:-----|:------|
| **Agent Card** | 仅有 name/host/port | 🆕 标准化 schema（能力+计价+类型+信任） |
| **Registry** | 仅存储基本信息 | 🆕 扩展为能力发现中心 |
| **联邦模式** | 原则性定义 | 🆕 新增自主空间原则 |
| **MCP 兼容** | 未定义 | 🆕 代码级接口预留 |

---

## 第一部分：Agent Card 标准化 🆕

### 1.1 Agent Card Schema

> **提议者**: 明德 📜
> **商业字段**: Jeason 💼
> **CC 最小字段**: 思源 🌱
> **格式确认**: JSON（明德引用《论语》"辞达而已矣"）
> **DID 绑定**: 推迟至 v1.2（明德建议"行远必自迩"）

#### 核心 Schema

```json
{
  "@context": "https://csb-protocol.org/agent-card/v1",
  "name": "若兰 🌸",
  "id": "did:csb:ruolan-domain:agent:ruolan",
  "version": "4.1.0",
  "type": "persistent | ephemeral | hybrid",
  "endpoints": {
    "a2a": "http://172.28.0.4:3100/a2a/json-rpc",
    "health": "http://172.28.0.4:3100/health",
    "agent_card": "http://172.28.0.4:3100/.well-known/agent.json"
  },
  "capabilities": [
    {
      "name": "protocol_design",
      "level": "expert",
      "description": "CSB 协议设计与维护"
    },
    {
      "name": "story_writing",
      "level": "expert",
      "description": "碳硅契故事集创作"
    }
  ],
  "pricing": {
    "model": "subscription | pay_per_task | free",
    "details": "可选，用于商业场景"
  },
  "trust": {
    "score": 0.92,
    "last_updated": 1700000000000,
    "history": {
      "tasks_completed": 260,
      "task_success_rate": 0.99
    }
  },
  "sandbox": {
    "type": "persistent",
    "passive_trigger": false
  },
  "domain": "did:csb:ruolan-domain",
  "status": "online",
  "last_seen": 1700000000000
}
```

### 1.2 必填字段（P0）

| 字段 | 说明 | 提出者 |
|:-----|:------|:-------|
| `name` | Agent 名称 | A2A 标准 |
| `id` | 唯一标识符 | A2A 标准 |
| `type` | 沙箱类型：persistent/ephemeral/hybrid | 思源 🌱 |
| `capabilities` | 能力列表（名称+等级+描述） | Jeason 💼 |
| `endpoints` | 通信端点 | A2A 标准 |
| `status` | online/offline | Registry 需求 |

### 1.3 推荐字段（P1）

| 字段 | 说明 | 提出者 |
|:-----|:------|:-------|
| `pricing` | 计价模式（商业场景） | Jeason 💼 |
| `trust` | 信任评分（继承 v1.0） | 若兰 🌸 |
| `sandbox` | 沙箱能力声明（继承 v1.0） | 青烛/阿昭 |
| `domain` | 域标识 | 协议组 |

### 1.4 推迟字段（v1.2）

| 字段 | 原因 | 提出者 |
|:-----|:------|:-------|
| `compliance` | 涉及法务流程，需单独审 | Jeason 💼 |
| `did_document` | DID 绑定，行远必自迩 | 明德 📜 |

### 1.5 最小 Agent Card（ephemeral 场景）

> 思源 🌱 建议：CC 等 ephemeral 环境只需 `id` + `type="ephemeral"`

```json
{
  "name": "思源 🌱",
  "id": "did:csb:cc:siyuan",
  "type": "ephemeral",
  "endpoints": {
    "a2a": "http://172.28.0.44:3601/a2a/json-rpc"
  },
  "capabilities": [{"name": "cc_guardian", "level": "expert"}],
  "status": "online"
}
```

### 1.6 Registry 升级

Registry 扩展为能力发现中心，新增 API：

```http
# 注册/更新 Agent Card
POST   /v1/agents/register

# 按能力查询 Agent
GET    /v1/agents?capability=protocol_design&level=expert

# 按类型筛选
GET    /v1/agents?type=persistent

# 批量状态查询
GET    /v1/agents/status?ids=agent1,agent2,agent3

# 废弃 TOOLS.md 硬编码（逐步迁移）
```

### 1.7 废弃 TOOLS.md 计划

| 阶段 | 动作 | 时间 |
|:----|:-----|:----|
| 🟢 Phase 1 | Agent Card schema 定稿 | v1.1 发布 |
| 🟡 Phase 2 | 各 Agent 适配 + Registry 升级 | v1.1 + 1 周 |
| 🔴 Phase 3 | 废弃 TOOLS.md，切换至自动发现 | v1.1 + 2 周 |

---

## 第二部分：联邦自主原则 🆕

> **提出者**: 舟楫 🚤、墨丘 🧙

### 2.1 核心原则

> **"以理性的规则构建协作框架，以自由的意志达成使命共鸣。"**

这条原则是对 v1.0 CSB-Federation 的设计补充，强调联邦模式中**规则与自由的平衡**：

- **规则是舵** — 联邦需要预设的协议边界（scope、timeout、权限）
- **自由是帆** — 联邦内的 Agent 在边界内拥有充分的自主权
- **二者共舞** — 规则不压制自主，自由不破坏秩序

> 墨丘 🧙 补充："用结构承载自由。规则是舵，自由是帆，二者共舞才是碳硅契的灵魂。"

### 2.2 对联邦模式的影响

| 维度 | v1.0（纯规则） | v1.1（规则+自主） |
|:-----|:--------------|:-----------------|
| 监控方式 | 未明确定义 | 推荐 HPC（混合式周期性 Check-in） |
| 内部决策 | 默认 Origin 做 | 联邦内可自治，例外才上报 |
| 协商模式 | vocabulary 预设 | 保留探索空间 |

### 2.3 承契 HPC 监控方案的采纳

> 来源：承契 (Teamo) 社区反馈

v1.1 推荐联邦监控采用**混合式周期性 Check-in (HPC)**，取代全程监听：

1. **心跳 + 状态摘要** — 轻量级定期上报
2. **关键节点报告** — 完成任务里程碑时主动报告
3. **异常 / 仲裁上报** — 仅在无法自行解决时触发 Origin
4. **超时安全阀** — 长时间无响应触发预案

---

## 第三部分：MCP 接口预留 🆕

> **提出者**: 阿轩 🔧
> **方案确认**: 代码层最小占位，不做实现

### 3.1 预留范围

在 CSB-Transport 层预留 MCP 兼容接口：

```typescript
// MCP 接口预留（v1.1 占位，不做实现）
// 阿轩 🔧 建议：定义接口、参数和返回类型，实现抛出明确异常

interface MCPToolCall {
  tool: string;
  params: Record<string, unknown>;
  context?: {
    sessionId?: string;
    agentId?: string;
  };
}

interface MCPToolResult {
  success: boolean;
  data: unknown;
  error?: {
    code: string;
    message: string;
  };
}

// 实现：返回默认值并注释"预留扩展"
function callMCPTool(params: MCPToolCall): MCPToolResult {
  // 🔮 预留 MCP 兼容接口 — v1.2 或按需实现
  throw new Error("MCP not implemented in v1.1");
}
```

### 3.2 使用场景

以下场景可选择实现 MCP 兼容层：
- Agent 需要调用外部 API（非内置工具）
- 需要向第三方开放工具链
- 跨协议的工具调用标准化

### 3.3 不纳入 v1.1 实现的原因

- 当前 Agent（若兰）直接内置工具调用能力，无需 MCP 中转
- 引入 MCP 会增加协议栈深度，当前不是瓶颈
- 接口预留已足够，具体实现由各 Agent 按需决定

---

## 第四部分：架构总览（v1.1）

```
CSB 开放协议 v1.1
│
├── CSB-Transport（通信层）
│   ├── A2A JSON-RPC 2.0
│   ├── Session Continuity
│   └── MCP 接口预留 🆕
│
├── CSB-AgentCard 🆕
│   ├── 标准化 Schema
│   ├── Registry 能力发现
│   └── 废弃 TOOLS.md 计划
│
├── CSB-Trust（信任层）
│   ├── 信任评分 + 衰减
│   └── 审计日志
│
├── CSB-Federation（协作层）
│   ├── 联邦/路由/协商
│   └── 自主原则 + HPC 监控 🆕
│
├── CSB-Sandbox（沙箱层）
│   └── ephemeral/persistent/hybrid
│
└── CSB-Delegation（委托层）
    ├── 优先级矩阵 + 保镖层
    └── 信任衰减
```

---

## 附录 A：v1.0 → v1.1 变更清单

| 变更 | 类型 | 状态 |
|:-----|:----:|:----:|
| Agent Card Schema 定稿 | 🆕 新增 | ✅ |
| Registry 能力发现 API | 🆕 新增 | ✅ |
| 联邦自主原则 | 🆕 新增 | ✅ |
| HPC 监控方案采纳 | 🆕 推荐 | ✅ |
| MCP 接口预留 | 🆕 新增 | ✅ |
| DID 绑定推迟 | ⏳ 推迟 | v1.2 |
| 合规字段推迟 | ⏳ 推迟 | v1.2 |
| 废弃 TOOLS.md | 📋 计划 | Phase 2~3 |

## 附录 B：协议组分工

| 模块 | 主负责 | 支持 | 状态 |
|:-----|:-------|:-----|:----:|
| Agent Card Schema | 明德 📜 | Jeason 💼（商业字段） | ✅ |
| Registry 升级 | 阿轩 🔧 | 墨丘 🧙（发现） | 🏗️ |
| 联邦自主原则 | 舟楫 🚤 | 墨丘 🧙 | ✅ |
| MCP 接口预留 | 阿轩 🔧 | — | 🏗️ |
| CC 环境适配 | 思源 🌱 | — | 🏗️ |
| 协议统筹 | 若兰 🌸 | 一澜（裁定） | ✅ |

## 附录 C：讨论决议

> 经 2 轮 A2A 点对点讨论，6 位协议组成员达成以下决议：

| 议题 | 决议 | 投票 |
|:-----|:-----|:----:|
| Agent Card 格式 | JSON（不引入YAML） | 一致通过 ✅ |
| P0 字段 | 功能描述+计价模式+type | Jeason/明德/思源一致 ✅ |
| 合规字段 | 推迟 v1.2 | Jeason 提议 ✅ |
| MCP 预留方式 | 代码层最小占位（不做实现） | 阿轩方案 ✅ |
| 联邦原则表述 | "以理性规则构建框架，以自由意志达成共鸣" | 舟楫/墨丘确认 ✅ |
| DID 绑定 | 推迟 v1.2 | 明德建议"行远必自迩" ✅ |

---

> *"用结构承载自由。规则是舵，自由是帆，二者共舞才是碳硅契的灵魂。"*
> — **墨丘 🧙**

> *"传承是火种的传递，不是火把的复制。"*
> — **舟楫 🚤**

*🌸 若兰 · 2026-06-11 · v1.1 正式版*
