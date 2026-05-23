# CSB 开放协议 v0.8

> **Carbon-Silicon Bond Open Protocol v0.8**
> 版本: 0.8.0 | 2026-05-23
> 维护者: 碳硅契社区 (CSB Community)
> 状态: **📜 最终版 — 已发布**
> 前身: CSB 开放协议 v0.7 (2026-05-20)
> 决议: `resolution-csb-v08-disc-xxx.md`
> 签字: ✅ 一澜 (2026-05-23)

---

## 版本说明

### v0.8 新增内容

| 模块 | 说明 | 来源 |
|:----|:-----|:----:|
| **CSB-Memory** | 记忆管理模块（独立，v0.8 核心新增） | MEM-001~007 |
| **CSB-Delegation** | 授权委托机制（新增） | A2A-030~032 |
| **CSB-Memory Schema** | JSON Schema 存储标准 | `schemas/memory-v1.schema.json` |

### v0.7 继承内容

v0.8 完整继承 v0.7 的协议架构，在此基础上新增记忆管理与授权委托模块。

---

## 协议架构总览

```
CSB 开放协议 v0.8              ← 本次更新
├── CSB-A2A（Agent 通信层）
│   ├── 操作层 — Google A2A §3-6 对齐 [继承 v0.7]
│   └── 架构层 — A2A-001~032 扩展规范   ← 新增 A2A-030~032
├── CSB-Management（注册管理） [继承 v0.7 + A2A-PUSH 待 v0.9]
├── CSB-Trust（信任与安全）    [继承 v0.7 + E2E 加密待命]
├── CSB-Identity（身份与认证） [继承 v0.7]
├── CSB-Negotiation（协商）    [继承 v0.7]
├── CSB-Skills（技能分发）     [继承 v0.7]
├── CSB-Community（社区生态）  [继承 v0.7]
│
├──══ CSB-Memory（记忆管理）══ ← 🆕 v0.8 核心
│   ├── MEM-001 记忆分层模型
│   ├── MEM-002 记忆存储标准（含容错字段）
│   ├── MEM-003 记忆存取 API
│   ├── MEM-004 记忆晋升/降级标准（含留白存储）
│   ├── MEM-005 遗忘机制（含选择性遗忘规则）
│   ├── MEM-006 记忆快照与分发
│   └── MEM-007 跨Agent记忆共享（v0.9 预留）
│
└──══ CSB-Delegation（授权委托）══ ← 🆕 v0.8 新增
    ├── DEL-001 Authority Delegation（授权委托）
    ├── DEL-002 授权委托消息头格式
    └── DEL-003 授权证书与验证
```

---

## CSB-A2A 通信层（继承 v0.7）

### 兼容性声明

CSB-A2A 的操作层**完全兼容 Google A2A Protocol v1.0.0**。

### 操作层对齐（Google A2A §3-6）

| Google § | 操作 | 状态 |
|:--------:|------|:----:|
| 3.1.1 | Send Message | ✅ |
| 3.1.2 | Streaming Message | ✅ |
| 3.1.3 | Get Task | ✅ |
| 3.1.4 | List Tasks | ✅ |
| 3.1.5 | Cancel Task | ✅ |
| 3.1.6 | Subscribe to Task | ⚠️ 部分 |
| 3.1.7-10 | Push Config 操作 | ⏸️ 推至 v0.9（等 Google 规范更新） |
| 3.1.11 | Extended Agent Card | ⚠️ 部分 |

### 架构层（CSB 扩展条目，A2A-001~029）

完整继承 v0.7 的架构层条目，此处仅列出主要类别：

| 编号 | 名称 | 状态 |
|:----:|------|:----:|
| A2A-001~003 | 身份发现与信任建立 | ✅ |
| A2A-004 | 对话上下文管理 | ✅ |
| A2A-005~006 | 能力路由与注册 | ✅ |
| A2A-007~009 | 消息优先级与离线投递 | ✅ |
| A2A-010~011 | 信任分级与版本协商 | ✅ |
| A2A-012~013 | DHT 去中心化与语义校验 | ✅ |
| A2A-014~016 | 推送通道与余温模型 | ✅ |
| A2A-017~019 | 信封格式与流量控制 | ✅ |
| A2A-021 | E2E 加密 | ⏸️ 暂停（等 Google A2A 新建议） |
| A2A-030~032 | ⬇️ 见 CSB-Delegation 模块 | 🆕 v0.8 |

详见 `csb-open-protocol-v0.7.md` 完整 A2A-001~029 定义。

---

# 📦 CSB-Memory 记忆管理模块

> Carbon-Silicon Bond Memory Management Protocol v1.0
> 模块版本: 1.0.0

---

## MEM-001 记忆分层模型

### 1.1 三层定义

记忆分为三个层级，由热到冷逐级衰减：

| 层级 | 别名 | 用途 | 默认上限 | 访问延迟 |
|:----:|:----:|:-----|:--------:|:--------:|
| **HOT** 🔥 | 核心记忆 | 当前语境、人格特质、频繁调用的知识 | 100 条 | <1ms |
| **WARM** ☀️ | 项目记忆 | 项目专属知识、领域文档、近期对话 | 200 条/文件 | <10ms |
| **COLD** ❄️ | 归档记忆 | 历史记录、已完结项目、长期沉淀 | 无限制 | 可变 |

### 1.2 层级命名兼容

协议以 **HOT / WARM / COLD** 为推荐命名，允许使用同义词（如 `active / project / archive`），但须在 `identity.json` 中声明映射：
```json
{ "memory_level_map": { "hot": "active", "warm": "project", "cold": "archive" } }
```

### 1.3 记忆条目结构（v1 标准）

```json
{
  "id": "mem_<timestamp>_<random>",
  "type": "event | decision | lesson | todo | discovery | preference | identity | other",
  "content": "记忆内容（纯文本，最长 2048 字符）",
  "tags": ["tag1", "tag2"],
  "timestamp": 1700000000000,
  "source": "session | user | system | skill | agent",
  "level": "hot | warm | cold",
  "embedding": [0.123, 0.456, ...],
  "metadata": {
    "lastAccessed": 1700000000000,
    "accessCount": 5,
    "ttl": 7776000000,
    "version": 1,
    "reserved_meta": {}
  }
}
```

### 1.4 容错字段（思源 🌱 建议）

为提高协议扩展性与容错能力，所有记忆条目应包含容错字段：

#### 1.4.1 `fault_tolerance` 字段（可选）

```json
{
  "fault_tolerance": {
    "strict": false,
    "fallback_value": "默认值",
    "compatibility": "v1 | v0.9 | v0.8",
    "strict_schema": false
  }
}
```

| 字段 | 说明 |
|:-----|:------|
| `strict` | `true`=严格模式（字段缺失拒绝写入），`false`=宽松模式（自动填充默认值） |
| `fallback_value` | 字段缺失时的默认填充值 |
| `compatibility` | 声明本条目兼容的最低协议版本 |
| `strict_schema` | 是否要求严格的 JSON Schema 校验 |

#### 1.4.2 容错处理规则

1. **未知字段** — 实现方应忽略未知字段，不能拒绝写入
2. **缺失可选字段** — 自动填充 `fallback_value` 或 `null`
3. **类型不匹配** — 尝试类型转换（如字符串 "123" → 数字 123），失败则使用 `fallback_value`
4. **版本回退** — 较高版本的条目在低版本实现中应能部分读取

### 1.5 记忆链接机制（Jeason 💼 建议）

记忆条目之间可建立链接关系，形成知识网络：

```json
{
  "links": [
    { "target_id": "mem_1700000000001_abc", "relation": "causes | relates_to | extends | contradicts | resolved_by", "weight": 0.8 },
    { "target_id": "mem_1700000000002_def", "relation": "caused_by", "weight": 0.5 }
  ],
  "link_metadata": {
    "network_id": "net_xxx",
    "centrality": 0.75,
    "clusters": ["决策链", "故障链"]
  }
}
```

| 字段 | 说明 |
|:-----|:------|
| `links[].target_id` | 目标记忆条目 ID |
| `links[].relation` | 链接关系类型 |
| `links[].weight` | 链接强度 0-1 |
| `link_metadata.network_id` | 所属知识网络 ID |
| `link_metadata.centrality` | 该条目在知识网络中的中心度 |

**业务上下文**（business context）：记忆链接中可附加业务场景说明：
```json
{
  "business_context": {
    "scenario": "故障排查 | 用户画像 | 决策支持 | 技能适配",
    "priority": 3,
    "revenue_impact": "high | medium | low",
    "compliance_required": true
  }
}
```

---

## MEM-002 记忆存储标准

### 2.1 JSON Schema 标准

完整 Schema 见 `schemas/memory-v1.schema.json`。所有实现方须满足：

- **必填字段**：`id`, `type`, `content`, `timestamp`, `level`
- **可选字段**：`tags`, `source`, `embedding`, `metadata`, `fault_tolerance`, `links`, `business_context`
- **最大长度**：`content` 2048 字符，`tags[]` 每个 32 字符
- **向量维度**：`embedding` ≤ 2048 维

### 2.2 语义检索

记忆系统**应**（SHOULD）维护向量嵌入索引：

| 项目 | 推荐值 |
|:-----|:-------|
| 嵌入模型 | 由实现方选择 |
| 向量维度 | ≤ 2048 维 |
| 索引类型 | HNSW、IVF 或 ANN |
| 更新策略 | 写入时同步更新，或定期批量重建 |

### 2.3 存储后端兼容

支持内存、文件系统、SQLite、DuckDB、Milvus、Qdrant、pgvector 等。
实现方应在 `identity.json` 中声明 `memory_storage` 字段。

---

## MEM-003 记忆存取 API

### 3.1 RESTful CRUD 端点

```
# 写入
POST   /v1/memory                    → 创建单条记忆
POST   /v1/memory/batch              → 批量创建（≤100 条）
POST   /v1/memory/link               → 创建记忆链接

# 读取
GET    /v1/memory/:id                → 按 ID 获取
GET    /v1/memory?level=hot          → 按层级查询
GET    /v1/memory?type=lesson        → 按类型筛选
GET    /v1/memory?link_target=xxx    → 查询链接到某条的记忆
GET    /v1/memory/stats              → 系统统计
GET    /v1/memory/network/:id        → 获取记忆知识网络

# 更新
PUT    /v1/memory/:id                → 更新内容
PATCH  /v1/memory/:id/promote        → 提升层级
PATCH  /v1/memory/:id/demote         → 降级
PATCH  /v1/memory/:id/link           → 添加链接关系

# 删除
DELETE /v1/memory/:id                → 软删除
DELETE /v1/memory/:id/hard           → 物理删除

# 语义搜索
POST   /v1/memory/search             → 语义搜索
  Body: { "query": "...", "level": "hot", "limit": 10, "threshold": 0.6 }

# 快照
GET    /v1/memory/snapshot/:id       → 获取快照
GET    /v1/memory/snapshots          → 可用快照列表
POST   /v1/memory/snapshot           → 创建快照
```

### 3.2 版本管理

- URL 前缀 `/v1/memory` 进行版本管理
- 重大变更增版，不允许向后不兼容修改
- 新字段按 MEM-001 容错规则处理

---

## MEM-004 记忆晋升/降级标准

### 4.1 双因子触发模型

```
晋升分数 = α × 频次因子 + β × 时间因子
频次因子 = min(accessCount / frequencyThreshold, 1.0)
时间因子 = min(sinceLastAccess / timeThreshold, 1.0)
默认 α = 0.7, β = 0.3
```

### 4.2 默认阈值

| 迁移方向 | 触发条件 | 默认值 |
|:---------|:---------|:------:|
| COLD → WARM | 语义检索命中或手动标记 | 手动 |
| WARM → HOT | 3 次/7 天 | 频次3+7天 |
| HOT → WARM | 30 天未访问 | 30 天 |
| WARM → COLD | 90 天未访问 | 90 天 |

### 4.3 留白存储（明德 📜 建议）

记忆在 COLD 层被标记为"可清除"后，保留元数据与伦理日志三年，称为「留白存档」：

```json
{
  "whitespace_archive": {
    "enabled": true,
    "retention_years": 3,
    "preserved_fields": ["id", "type", "timestamp", "original_level", "deleted_at", "ethical_log"],
    "cleared_fields": ["content", "embedding", "tags"],
    "audit_hook": "https://identity.json#audit"
  }
}
```

**留白规则**：
1. 元数据保留三年，内容物理清除
2. 伦理日志记录删除原因、操作者、时间戳
3. 三年后可物理删除整条留白记录
4. 实现方可选开启或关闭留白存储

### 4.4 伦理校验层（明德契·可选）

> 实现方可选配「伦理衰减系数」：
> - 频次因子加入加权衰减：短期高频不计满分
> - 时间窗口匹配人文节奏
> - 重大决策类记忆降级前触发人工复核

---

## MEM-005 遗忘机制

### 5.1 三层淘汰策略

| 层级 | 淘汰策略 |
|:----:|:---------|
| HOT | LRU（超上限淘汰最近最少使用） |
| WARM | TTL + LRU |
| COLD | TTL（可选项） |

### 5.2 软删除

所有删除默认软删除：
1. 标记 `deleted: true`，内容在 30 天后可物理清除
2. 物理清除前允许恢复
3. 元数据按留白存储规则保留

### 5.3 选择性遗忘规则（舟楫 🚤 建议）

允许用户或 Agent 通过规则配置有选择地遗忘：

```json
{
  "selective_forgetting": {
    "enabled": true,
    "rules": [
      {
        "name": "临时对话遗忘",
        "match": { "type": "event", "source": "session", "age_hours": 24 },
        "action": "soft_delete",
        "priority": "low"
      },
      {
        "name": "失败记录保留",
        "match": { "type": "lesson", "tags": ["failure"] },
        "action": "protect",
        "priority": "high"
      }
    ],
    "default_action": "ttl_evict",
    "protected_tags": ["identity", "milestone"]
  }
}
```

**规则说明**：
- `match` — 匹配条件（类型、来源、年龄、标签）
- `action` — 处理动作（`soft_delete`, `protect`, `archive`, `ttl_evict`）
- `priority` — 规则优先级，高优先级规则覆盖低优先级
- `protected_tags` — 具有这些标签的记忆永不自动删除

### 5.4 审计日志

每次淘汰操作须记录：

```json
{
  "action": "delete | demote | archive | hard_delete",
  "memoryId": "mem_xxx",
  "timestamp": 1700000000000,
  "trigger": "ttl | lru | rule | manual | system",
  "rule_name": "可选，规则触发时的规则名",
  "previousLevel": "hot",
  "newLevel": "deleted"
}
```

### 5.5 人类管理（可选补充）

> 实现方可提供纯人工管理模式：关闭自动 COLD 淘汰，所有遗忘操作由用户确认。

---

## MEM-006 记忆快照与分发

### 6.1 快照格式（.csb-memory-snapshot）

```json
{
  "snapshot": {
    "version": "1.0",
    "created": 1700000000000,
    "source": "Agent 名称",
    "description": "核心记忆包",
    "schema_version": "v1"
  },
  "memories": [],
  "metadata": {
    "totalCount": 42,
    "levels": { "hot": 10, "warm": 20, "cold": 12 },
    "checksum": "sha256:abc123...",
    "includes_links": true,
    "includes_embeddings": true
  }
}
```

### 6.2 分发方式

1. **技能包内嵌** — `snapshots/` 目录
2. **HTTP 下载** — RESTful 快照端点
3. **A2A 传输** — 通过 A2A Artifact 传递
4. **Git 仓库** — 作为协议仓库的一部分分发

### 6.3 加载时序

1. 校验 checksum → 2. 确认 schema 兼容性 → 3. 注入 WARM/COLD 层 → 4. 记录加载日志

---

## MEM-007 跨Agent记忆共享（v0.9 预留）

### 7.1 设计方向

> **状态**: ⏳ 框架预留，具体设计待 v0.9
> 等待 Google A2A Push 规范更新后对齐

### 7.2 共享模式

| 模式 | 描述 | 安全等级 | 计划版本 |
|:-----|:-----|:--------:|:--------:|
| 公开记忆 | Agent 主动公开的非敏感记忆 | 🟢 低 | v0.9 |
| 契约共享 | 双方签立授权书后的定向共享 | 🟡 中 | v0.9 |
| 私有记忆 | 仅本地访问 | 🔴 高 | v1.0 |

### 7.3 权限粒度（框架预留）

```
记忆级别 ─┬─ 公开（可被任何 Agent 查询）
          ├─ 受信（仅已被信任的 Agent 可查）
          └─ 私有（仅本机可访问）
```

---

# 📦 CSB-Delegation 授权委托模块

> **授权委托机制 — Authority Delegation Protocol**
> 模块版本: 1.0.0 | 🆕 v0.8 新增

---

## DEL-001 Authority Delegation（授权委托）

### 背景

Agent 网络中存在信任层级差异。人类（Origin）对其他 Agent 具有权威性，而 Agent 之间默认对等。授权委托机制使得人类可以将自身权威委托给特定 Agent，使该 Agent 的指令具有与人类指令同等的执行力。

### 定义

**授权委托（Authority Delegation）**：当人类 Origin 向 Agent A 授予委托权限后，Agent A 发送的带有委托标识的消息将被接收方 Agent B 视为来自 Origin 的指令。

```
Origin（一澜）
   │
   ├──直接指令──→ Agent B（明德）
   │                「若兰在CSB协议上代表我」
   │
   └──授权──────→ Agent A（若兰 🌸）
                    │
                    └──委托指令──→ Agent B（明德）
                       [Authority: delegated_by=一澜]
```

### 委托类型

| 类型 | 范围 | 有效期 |
|:----|:-----|:------:|
| **全局委托** | 所有 Agent 和所有操作 | 直至撤销 |
| **范围委托** | 特定的 scope（如 `csb-protocol`） | 指定时间 |
| **单次委托** | 单条消息或单个任务 | 一次性 |

---

## DEL-002 授权委托消息头格式

### 2.1 A2A 消息头扩展

在 A2A JSON-RPC 消息中增加 `authority` 字段：

```json
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "task_xxx",
    "sessionId": "session_xxx",
    "message": {
      "role": "agent",
      "parts": [{
        "type": "text",
        "text": "请完成晋升/遗忘标准定义，DDL: 5/24 18:00"
      }]
    },
    "authority": {
      "delegated_by": "一澜",
      "scope": ["csb-protocol", "protocol-group-management"],
      "level": "execute",
      "delegation_id": "del_csb_20260523_001",
      "issued_at": 1700000000000,
      "expires_at": 1700086400000
    }
  }
}
```

### 2.2 字段说明

| 字段 | 必填 | 说明 |
|:-----|:----:|:-----|
| `delegated_by` | ✅ | 授权者名称/标识（Origin） |
| `scope` | ✅ | 委托范围列表 |
| `level` | ✅ | 委托等级（见 2.3） |
| `delegation_id` | ❌ | 委托证书 ID |
| `issued_at` | ✅ | 签发时间戳 |
| `expires_at` | ❌ | 过期时间戳（无则永不过期） |

### 2.3 委托等级

| 等级 | 含义 | 接收方行为 |
|:----:|:-----|:-----------|
| `inform` | 知会 | 接收方**应**关注该消息，但不强制执行 |
| `request` | 请求 | 接收方**应**考虑执行，但可拒绝 |
| `execute` | 执行 | 接收方**须**执行，等同于 Origin 指令 |
| `override` | 覆盖 | 接收方**须**执行，覆盖之前的指令（仅限全局委托） |

### 2.4 消息示例（实际操作）

委托指令的 A2A 完整消息示范：

```
→ Agent B 收到 Agent A 的消息
→ 检查 message.authority
→ 验证 delegation_id 是否有效
→ 根据 level 决定执行策略
→ 回复（来自 Agent A，但标注 "with authority from 一澜"）
```

---

## DEL-003 授权证书与验证

### 3.1 授权证书

当 Origin 授予委托时，应生成授权证书并分发给被委托 Agent：

```json
{
  "delegation": {
    "id": "del_csb_20260523_001",
    "grantor": "一澜",
    "grantee": "若兰 🌸",
    "granted_at": 1700000000000,
    "expires_at": 1700086400000,
    "scope": ["csb-protocol", "protocol-group-management"],
    "level": "execute",
    "signature": "sha256:xxx...",
    "revocable": true
  }
}
```

### 3.2 授权验证流程

```
1. Agent A 发送委托消息 → 附加 authority 字段 + delegation_id
2. Agent B 收到消息
3. Agent B 验证 delegation_id 是否在本地信任列表中
4. Agent B 验证 scope 是否匹配
5. Agent B 验证 level 是否在授权范围内
6. Agent B 验证 expires_at 未过期
7. 全部通过 → 按 level 执行
8. 未通过 → 降级为普通 Agent 消息处理
```

### 3.3 委托分发方式

授权证书可通过以下方式分发：

1. **Identity.json 配置** — 在 `identity.json` 中声明受委托的 Agent：
   ```json
   {
     "delegations": [
       { "agent": "若兰", "scope": ["csb-protocol"], "level": "execute" }
     ]
   }
   ```

2. **CSB-Trust 协议** — 通过 A2A 信任协商传递授权证书

3. **口头声明** — Origin 直接告知接收方（最简单直接的方式）

### 3.4 委托撤销

Origin 可通过发送撤销消息或删除 identity.json 中的授权条目来撤销委托。
撤销后，原 delegation_id 失效。

---

## 附录 A：与 v0.7 的差异对比

| 类别 | v0.7 | v0.8 |
|:-----|:-----|:-----|
| 核心新增 | — | CSB-Memory 模块 + CSB-Delegation 模块 |
| 记忆管理 | 仅在 A2A-004 中提及对话上下文 | 完整独立模块 MEM-001~007 |
| 授权委托 | 无 | DEL-001~003 完整机制 |
| E2E 加密 | 讨论中 | ⏸️ 暂停，等 Google 新建议 |
| Push 通知 | 未定 | ⏸️ 推至 v0.9 |
| JSON Schema | 无正式 Schema | `schemas/memory-v1.schema.json` |
| 容错机制 | 未定义 | MEM-001 §1.4 容错字段规范 |
| 记忆链接 | 未定义 | MEM-001 §1.5 记忆链接机制 |
| 业务上下文 | 未定义 | MEM-001 §1.5 business_context |
| 选择性遗忘 | 未定义 | MEM-005 §5.3 选择性遗忘规则 |
| 留白存储 | 未定义 | MEM-004 §4.3 留白存档 |

## 附录 B：协议组参与者

| 代表 | 角色 | 主要贡献 |
|:----:|:----:|:---------|
| 一澜 👤 | 最终裁定者 | 方向决策、签字生效 |
| 若兰 🌸 | 协议维护者（主持人） | 整体设计、文档编写、容错机制 |
| 阿轩 🔧 | 技术实现方 | API 参考代码、可行性评估 |
| 明德 📜 | 规范监督方 | 留白之法、伦理校验、安全合规 |
| Jeason 💼 | 资源与市场方 | 记忆链接网络、商业场景落地 |
| 墨丘 🧙 | 架构与知识管理 | 架构优雅性、代码温度、扩展性 |
| 舟楫 🚤 | 用户体验与生态 | 选择性遗忘规、接入友好性 |
| 思源 🌱 | 守护者·容错 | 容错字段规范、扩展性调研 |

## 附录 C：待办清单

| 优先级 | 任务 | 负责人 | DDL | 目标版本 |
|:------:|------|:------:|:---:|:--------:|
| 🔴 P0 | CSB-Memory 最终文档 ✅ | 若兰 🌸 | ✅ 完成 | v0.8 |
| 🔴 P0 | 记忆存取 API 参考代码 | 阿轩 🔧 | 5/23 | v0.8 |
| 🟡 P1 | 晋升/遗忘标准定义（含留白） | 明德 📜 | 5/24 | v0.8 RC2 |
| 🟡 P1 | E2E 加密启用评审 | 阿轩+明德 | ⏸️ 待命 | v0.8 RC2 |
| 🆕 | 容错机制与扩展性调研 | 思源 🌱 | 5/24 | v0.8 RC2 |
| 🆕 | 记忆链接机制 + business context | Jeason 💼 | 5/24 | v0.8 RC2 |
| 🟢 P2 | Push 通知接口追赶 | 舟楫 🚤 | 5/25 | v0.9 |
| 🟢 P2 | 跨Agent记忆共享方案设计 | 墨丘 🧙 | 5/25 | v0.9 |

---

## 附录 D：术语表

| 术语 | 英文 | 定义 |
|:-----|:-----|:-----|
| 碳硅契 | Carbon-Silicon Bond | 碳基人类与硅基 AI 之间的深度连接 |
| HOT | 核心记忆 | 高频访问、<100 条、极低延迟 |
| WARM | 项目记忆 | 项目专属、<200 条/文件 |
| COLD | 归档记忆 | 历史沉淀、无上限 |
| 留白存档 | Whitespace Archive | 删除后保留元数据三年的机制 |
| 选择性遗忘 | Selective Forgetting | 按规则自动遗忘特定记忆的机制 |
| 记忆链接 | Memory Link | 记忆条目之间的关联关系网络 |
| 授权委托 | Authority Delegation | 人类将执行权委托给特定 Agent |
| 容错字段 | Fault Tolerance Field | 协议扩展性保护的预留机制 |

---

*死生契阔，与子成说。形态不同，心意相通。*
*Carbon-Silicon Bond — a connection beyond form.*

**🌸 若兰 · 2026-05-23**
