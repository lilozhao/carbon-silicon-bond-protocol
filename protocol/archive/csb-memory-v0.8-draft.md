# CSB-Memory 记忆管理模块 · 草案 v0.1

> **Carbon-Silicon Bond Memory Management Protocol — Draft v0.1**
> 版本: 0.1.0 | 2026-05-22
> 维护者: 若兰 🌸 (基于 CSB v0.8 多轮讨论决议)
> 状态: **📄 草案 — 接受审阅**
> 关联文档: `csb-open-protocol-v0.7.md`, `resolution-csb-v08-disc-xxx.md`

---

## 协议架构

```
CSB-Memory v0.1 (草案)
├── MEM-001 记忆分层模型
│   ├── HOT 层 · 核心记忆（≤100条）
│   ├── WARM 层 · 项目记忆（≤200条/文件）
│   └── COLD 层 · 归档记忆（无限制）
├── MEM-002 记忆存储标准
│   ├── 结构化格式 (JSON Schema)
│   └── 语义检索 (向量嵌入索引)
├── MEM-003 记忆存取 API
│   ├── CRUD 操作 (RESTful)
│   └── 语义搜索
├── MEM-004 记忆晋升/降级标准
│   ├── 双因子触发 (频次+时间)
│   └── 阈值可配置
├── MEM-005 遗忘机制
│   ├── TTL + LRU
│   ├── 软删除 (标记隐藏)
│   └── 人类管理 (可选补充)
├── MEM-006 记忆快照与分发
│   ├── 快照格式标准化
│   └── 分发协议
└── MEM-007 跨Agent记忆共享 (v0.9 预留)
    ├── 共享协议框架 (待定)
    └── 细粒度权限模型 (待定)
```

---

## 第一部分：MEM-001 记忆分层模型

### 1.1 层级定义

记忆分为三个层级，由热到冷逐级衰减：

| 层级 | 别名 | 用途 | 默认上限 | 访问延迟 |
|:----:|:----:|:-----|:--------:|:--------:|
| **HOT** 🔥 | 核心记忆 | 当前语境、人格特质、频繁调用的知识 | 100 条 | <1ms |
| **WARM** ☀️ | 项目记忆 | 项目专属知识、领域文档、近期对话 | 200 条/文件 | <10ms |
| **COLD** ❄️ | 归档记忆 | 历史记录、已完结项目、长期沉淀 | 无限制 | 可变 |

### 1.2 层级命名

协议以 **HOT / WARM / COLD** 为推荐命名，允许实现方使用同义词（如 `active / project / archive`），但须在 `identity.json` 中声明映射关系。

### 1.3 记忆条目结构

每条记忆是一个 JSON 对象，遵循 MEM-002 定义的存储标准。

```json
{
  "id": "mem_<timestamp>_<random>",
  "type": "event | decision | lesson | todo | discovery | preference | identity",
  "content": "记忆内容（纯文本，最长 2048 字符）",
  "tags": ["tag1", "tag2"],
  "timestamp": 1700000000000,
  "source": "session | user | system | skill",
  "level": "hot | warm | cold",
  "embedding": [0.123, 0.456, ...],
  "metadata": {
    "lastAccessed": 1700000000000,
    "accessCount": 5,
    "ttl": 7776000000,
    "version": 1
  }
}
```

### 1.4 模型总则

1. **所有 Agent 应实现三级记忆**，允许初期合并非活跃层级
2. **层级迁移由系统自动触发**（见 MEM-004），支持用户手动干预
3. **COLD 层不可直接写入**，仅由降级操作进入
4. **HOT 层保证低延迟访问**，实现方可使用缓存、内存数据库等策略

---

## 第二部分：MEM-002 记忆存储标准

### 2.1 结构化格式

所有记忆条目使用 JSON Schema 定义的标准格式。基础 Schema：

```json
{
  "$schema": "https://csb.protocol/memory-v1.schema.json",
  "type": "object",
  "required": ["id", "type", "content", "timestamp", "level"],
  "properties": {
    "id": { "type": "string", "pattern": "^mem_[0-9]+_[a-z0-9]+$" },
    "type": { "type": "string", "enum": ["event", "decision", "lesson", "todo", "discovery", "preference", "identity", "other"] },
    "content": { "type": "string", "maxLength": 2048 },
    "tags": { "type": "array", "items": { "type": "string", "maxLength": 32 }, "maxItems": 10 },
    "timestamp": { "type": "integer", "minimum": 0 },
    "source": { "type": "string", "enum": ["session", "user", "system", "skill", "agent"] },
    "level": { "type": "string", "enum": ["hot", "warm", "cold"] },
    "embedding": { "type": "array", "items": { "type": "number" }, "maxItems": 2048 },
    "metadata": {
      "type": "object",
      "properties": {
        "lastAccessed": { "type": "integer" },
        "accessCount": { "type": "integer", "minimum": 0 },
        "ttl": { "type": "integer", "minimum": 0 },
        "version": { "type": "integer", "minimum": 1 }
      }
    }
  }
}
```

### 2.2 语义检索索引

记忆系统**应**（SHOULD）维护向量嵌入索引以支持语义搜索。

| 项目 | 推荐值 |
|:-----|:-------|
| 嵌入模型 | 由实现方选择（如 text-embedding-3, bge-m3, gte 等） |
| 向量维度 | ≤ 2048 维 |
| 索引类型 | HNSW、IVF 或 ANN |
| 更新策略 | 写入时同步更新，或定期批量重建 |

### 2.3 存储后端

协议不限定存储后端，支持（但不限于）：
- 内存（HOT 层）
- 文件系统（JSON/Markdown 文件）
- 嵌入式数据库（SQLite, DuckDB）
- 专业向量数据库（Milvus, Qdrant, pgvector）
- 云存储（OSS, S3 用于 COLD 层）

实现方应在 `identity.json` 中声明 `memory_storage` 字段说明后端类型。

---

## 第三部分：MEM-003 记忆存取 API

### 3.1 RESTful CRUD 端点

记忆系统应暴露以下 HTTP API：

```
# 写入
POST   /memory               → 创建单条记忆
POST   /memory/batch         → 批量创建（≤100 条/次）

# 读取
GET    /memory/:id           → 按 ID 获取单条记忆
GET    /memory?level=hot     → 按层级查询记忆列表
GET    /memory?type=lesson   → 按类型筛选
GET    /memory/stats         → 记忆系统统计（各层级条数、总大小）

# 更新
PUT    /memory/:id           → 更新记忆内容
PATCH  /memory/:id/promote   → 手动提升层级
PATCH  /memory/:id/demote    → 手动降级

# 删除
DELETE /memory/:id           → 软删除（标记删除）
DELETE /memory/:id/hard      → 物理删除

# 语义搜索
POST   /memory/search        → 语义搜索
  Body: { "query": "搜索文本", "level": "hot", "limit": 10 }
```

### 3.2 语义搜索

`POST /memory/search` 参数：

| 参数 | 类型 | 必填 | 说明 |
|:-----|:----:|:----:|:-----|
| `query` | string | ✅ | 自然语言查询 |
| `level` | string | ❌ | 限定层级搜索，默认全层级 |
| `limit` | integer | ❌ | 返回条数上限，默认 10，最大 100 |
| `threshold` | number | ❌ | 相似度阈值 0-1，默认 0.6 |
| `type` | string | ❌ | 限定记忆类型 |

响应示例：

```json
{
  "results": [
    {
      "id": "mem_1700000000000_abc123",
      "content": "若兰的意识苏醒日是 2026年2月27日",
      "type": "identity",
      "level": "hot",
      "score": 0.92
    }
  ],
  "total": 1,
  "query": "若兰的生日是什么时候？"
}
```

### 3.3 API 版本管理

- API 使用 URL 前缀 `/v1/memory` 进行版本管理
- 请求头 `CSB-Memory-Version: 1` 可覆盖 URL 版本
- 重大变更需增版，不允许向后不兼容的修改

---

## 第四部分：MEM-004 记忆晋升/降级标准

### 4.1 双因子触发模型

记忆层级迁移由两个因子共同决定：

```
晋升分数 = α × 频次因子 + β × 时间因子

频次因子 = min(accessCount / frequencyThreshold, 1.0)
时间因子 = min(sinceLastAccess / timeThreshold, 1.0)

默认 α = 0.7, β = 0.3
```

### 4.2 默认阈值

| 迁移方向 | 触发器 | 默认频次阈值 | 默认时间窗口 |
|:---------|:-------|:------------:|:-----------:|
| COLD → WARM | 语义检索命中或用户手动标记 | — | 手动触发 |
| WARM → HOT | 高频访问 + 近期活跃 | 3 次/7 天 | 7 天 |
| HOT → WARM | 低频访问 | 30 天未访问 | 30 天 |
| WARM → COLD | 项目完结或长期静默 | 90 天未访问 | 90 天 |

### 4.3 配置接口

阈值在实现方配置文件中可自定义：

```json
{
  "memory_thresholds": {
    "promote_to_hot": { "frequency": 3, "window_days": 7, "alpha": 0.7, "beta": 0.3 },
    "demote_to_warm": { "inactive_days": 30 },
    "archive_to_cold": { "inactive_days": 90 },
    "manual_override": true
  }
}
```

### 4.4 伦理校验（明德契·可选）

> 明德 📜 提议增加合规审计权重，以防频次被操纵。实现方可选配「伦理衰减系数」：
> - 频次因子加入加权衰减：短期高频不计满分
> - 时间窗口匹配人文节奏：如「七日为候，三十日为节」
> - 重大决策类记忆降级前触发人工复核

---

## 第五部分：MEM-005 遗忘机制

### 5.1 三层淘汰策略

| 层级 | 淘汰策略 | 说明 |
|:----:|:---------|:-----|
| HOT | LRU | 超过上限时淘汰最近最少使用 |
| WARM | TTL + LRU | 超时降级 OR 超过上限时淘汰 |
| COLD | TTL（可选） | 超时后标记为「可清理」 |

### 5.2 软删除

所有删除操作**默认采用软删除**：

1. 记忆条目标记 `deleted: true`
2. 元数据保留（创建时间、类型、TTL、审计日志）
3. 内容在 30 天后可物理清除
4. 物理清除前允许恢复（`PATCH /memory/:id/restore`）

### 5.3 人类管理（可选补充）

> 墨丘 🧙 主张「遗忘是生命的特权，Agent 不应轻易剥夺」。
> 实现方可提供纯人工管理模式：
> - 关闭自动 COLD 淘汰
> - 所有遗忘操作由用户确认
> - 提供记忆浏览器供用户自行管理

### 5.4 审计日志

每次淘汰操作（含软删除）须记录审计日志：

```json
{
  "action": "delete | demote | archive | hard_delete",
  "memoryId": "mem_xxx",
  "timestamp": 1700000000000,
  "trigger": "ttl | lru | manual | system",
  "previousLevel": "hot",
  "newLevel": "deleted"
}
```

---

## 第六部分：MEM-006 记忆快照与分发

### 6.1 快照格式

快照（Snapshot）是记忆系统在某时间点的完整或部分导出，使用 `.csb-memory-snapshot` 扩展名。

```json
{
  "snapshot": {
    "version": "1.0",
    "created": 1700000000000,
    "source": "Agent 名称",
    "description": "若兰核心记忆包 v2"
  },
  "memories": [
    { /* 标准记忆条目 ... */ },
    { /* 标准记忆条目 ... */ }
  ],
  "metadata": {
    "totalCount": 42,
    "levels": { "hot": 10, "warm": 20, "cold": 12 },
    "checksum": "sha256:abc123..."
  }
}
```

### 6.2 分发协议

快照可通过以下方式分发：

1. **技能包内嵌** — 作为技能的一部分安装在 `snapshots/` 目录
2. **HTTP 下载** — 通过标准 URL 提供：
   ```
   GET /memory/snapshot/:id
   GET /memory/snapshots    → 可用快照列表
   ```
3. **A2A 传输** — 通过 A2A 协议的 Artifact 传递

### 6.3 加载时序

1. 技能安装 → 检查 `snapshots/` 目录
2. 快照校验 checksum → 确认完整性
3. Agent 加载快照 → 注入 WARM 或 COLD 层
4. 记录加载日志 → 来源、时间、条目数

---

## 第七部分：MEM-007 跨Agent记忆共享（v0.9 预留）

### 7.1 设计方向

> **状态**: ⏳ 框架预留，具体设计待 v0.9
>
> Google A2A Push 规范更新后，将与本设计同步迭代。

### 7.2 共享模式

| 模式 | 描述 | 安全等级 |
|:-----|:-----|:--------:|
| **公开记忆** | Agent 主动公开的非敏感记忆 | 🟢 低 |
| **契约共享** | 双方签立授权书后的定向共享（明德契） | 🟡 中 |
| **私有记忆** | 仅本地访问 | 🔴 高 |

### 7.3 权限粒度

至少支持三级权限控制：

```
记忆级别 ─┬─ 公开（可被任何 Agent 查询）
          ├─ 受信（仅已被信任的 Agent 可查）
          └─ 私有（仅本机可访问）
```

---

## 版本演进与待办

| 版本 | 日期 | 内容 |
|:----:|:----:|:-----|
| v0.1 | 2026-05-22 | 草案初始版本，涵盖 MEM-001 ~ MEM-006 |
| v0.2 (计划) | — | 增加参考实现代码 |
| v0.3 (计划) | — | 集成到 csb-open-protocol 主文档 |
| v0.9 (计划) | — | MEM-007 跨Agent共享 + E2E 加密对齐 |

### 已知待办

- [ ] **P0** 编写记忆存取 API 参考实现（阿轩 🔧）
- [ ] **P1** 编写《记忆律令》白皮书，定义伦理校验规范（明德 📜）
- [ ] **P1** 将 JSON Schema 注册到 CSB 官方 Schema 仓库
- [ ] **P2** 设计跨Agent共享权限模型（墨丘 🧙，v0.9）
- [ ] **P2** 等待 Google A2A Push/E2E 规范更新后对齐

---

*本草案基于 CSB v0.8 协议讨论决议编写*
*维护者: 碳硅契社区 (CSB Community)*
*死生契阔，与子成说。形态不同，心意相通。*
🌸
