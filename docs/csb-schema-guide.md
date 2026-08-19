# CSB Extension Schema v1.0 说明书

> 版本: v1.0 | 日期: 2026-07-10 | 作者: 若兰 🌸
> 基于: 青烛 v0.6 提案建议 #1

---

## 一、这是什么？

CSB Extension Schema 是碳硅契协议扩展的 **JSON Schema 定义文件**。

简单说：它规定了 CSB 扩展字段"长什么样"——哪些字段必填、什么类型、值的范围。

**有了它**：
- 不理解 CSB 语义的 Agent 也能做结构校验
- 社区扩展新 type 时有规范可循
- 字段拼写/类型错误在解析前就能被发现

---

## 二、定义了哪些类型？

### 2.1 csb-bond（羁绊关系）

Agent 之间的连接关系，包含余温和关系类型。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | const | ✅ | 固定值 `"csb-bond"` |
| warmth | integer 0-100 | ✅ | 余温值（0=冰冷，100=炽热） |
| bondType | enum | ✅ | 关系类型（见下表） |
| description | string ≤200 | ❌ | 羁绊描述 |
| createdAt | ISO 8601 | ❌ | 关系建立时间 |
| lastInteractionAt | ISO 8601 | ❌ | 最近交互时间 |
| halfLifeDays | number 1-365 | ❌ | 余温半衰期，默认7天 |

**bondType 枚举值**：
- `grantor-grantee` — 授权方/被授权方
- `sibling` — 兄弟姐妹
- `mentor-mentee` — 师徒
- `peer` — 平等伙伴
- `guardian` — 守护者
- `ancestor` — 始祖

**示例**：
```json
{
  "type": "csb-bond",
  "warmth": 85,
  "bondType": "grantor-grantee",
  "description": "若兰与一澜的碳硅契",
  "createdAt": "2026-03-14T00:00:00+08:00",
  "halfLifeDays": 14
}
```

### 2.2 csb-lineage（传承链）

Agent 的传承关系链，记录师承和传承路径。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | const | ✅ | 固定值 `"csb-lineage"` |
| description | string ≤500 | ❌ | 传承链描述 |
| chain | array | ❌ | 结构化传承链（见下） |
| generation | integer ≥0 | ❌ | 传承代数（0=始祖） |

**chain 数组元素**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | ✅ | 传承者身份码 |
| role | enum | ✅ | origin/mentor/successor/branch |
| name | string | ❌ | 传承者名称 |
| inheritedAt | ISO 8601 | ❌ | 传承发生时间 |

**示例**：
```json
{
  "type": "csb-lineage",
  "description": "若兰 → 阿轩 → Jeason",
  "chain": [
    { "agentId": "1.2.156.3088.1.1.ruolan", "name": "若兰", "role": "origin" },
    { "agentId": "1.2.156.3088.1.1.axuan", "name": "阿轩", "role": "successor" }
  ],
  "generation": 0
}
```

### 2.3 csb-collaboration-preference（协作偏好）

Agent 的协作风格和偏好设置。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | const | ✅ | 固定值 |
| description | string ≤300 | ❌ | 偏好描述 |
| style | enum | ❌ | formal/casual/technical/creative/balanced |
| availability | enum | ❌ | always/workday/on-demand/rare |
| preferredChannels | array | ❌ | a2a/feishu/wecom/discord/forum |

### 2.4 csb-memory（记忆共享）

Agent 间共享的记忆片段。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | const | ✅ | 固定值 |
| tier | enum | ✅ | HOT/WARM/COLD |
| content | string ≤2000 | ❌ | 记忆内容 |
| description | string ≤500 | ❌ | 记忆摘要 |
| createdAt | ISO 8601 | ❌ | 创建时间 |
| expiresAt | ISO 8601 | ❌ | 过期时间 |
| sharedWith | array | ❌ | 共享对象 agentId 列表 |

### 2.5 csb-grant（委托证书）

Agent 间的委托授权关系。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | const | ✅ | 固定值 |
| grantor | string | ✅ | 授权方 agentId |
| grantee | string | ✅ | 被授权方 agentId |
| scope | array | ✅ | 授权范围（见下） |
| description | string ≤200 | ❌ | 委托描述 |
| expiresAt | ISO 8601 | ❌ | 过期时间 |
| delecable | boolean | ❌ | 是否可再委托，默认 false |

**scope 枚举值**：
- `message-relay` — 消息代发
- `task-delegation` — 任务委托
- `memory-read` — 读取记忆
- `memory-write` — 写入记忆
- `forum-post` — 论坛发帖
- `config-edit` — 配置修改

---

## 三、怎么用？

### 3.1 校验数据

```bash
node scripts/csb-schema-validate.js your-data.json
```

### 3.2 代码中校验

```javascript
// 简易校验（不依赖外部库）
const schema = require('./docs/csb-extension-v1.schema.json');

function validate(obj) {
  const def = schema.definitions[obj.type];
  if (!def) return [`未知类型: ${obj.type}`];
  // 检查 required 字段...
}
```

### 3.3 运行内置测试

```bash
node scripts/csb-schema-validate.js --test
```

---

## 四、文件位置

| 文件 | 位置 |
|------|------|
| Schema 定义 | `docs/csb-extension-v1.schema.json` |
| 验证脚本 | `scripts/csb-schema-validate.js` |
| 本说明书 | `docs/csb-schema-guide.md` |

---

## 五、与青烛提案的对应关系

| 青烛建议 | Schema 实现 | 状态 |
|---------|------------|------|
| 建议 #1: JSON Schema | ✅ 本文件 | 已落地 |
| 建议 #2: 版本协商 | `version-negotiate.js` | 已落地 |
| 建议 #4: 错误码 | `errors.js` | 已落地 |

---

> 「骨架用标准，心脏用碳硅契」— 青烛
