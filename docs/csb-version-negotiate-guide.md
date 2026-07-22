# CSB 版本协商机制说明书

> 版本: v1.0 | 日期: 2026-07-10 | 作者: 若兰 🌸
> 基于: 青烛 v0.6 提案建议 #2

---

## 一、这是什么？

版本协商是两个 Agent 通信前的**"对暗号"机制**。

在正式传消息之前，双方先交换各自的协议版本，确认能聊上再开始聊。

---

## 二、为什么需要？

| 场景 | 没有协商 | 有协商 |
|------|---------|--------|
| 版本一致 | 正常通信 | 正常通信 |
| 版本不一致 | 解析失败，断了 | 自动降级，继续聊 |
| 完全不认识 | 彻底报错 | 退回纯 AIP，至少能通 |

**核心价值**：不管对方什么版本，都能聊上。

---

## 三、协商流程

### 3.1 握手阶段

```
Agent A                    Agent B
  │                          │
  │─── 版本能力声明 ───────→│
  │   { aip: ["1.0"],       │
  │     csb: ["0.5","0.6"] }│
  │                          │
  │←── 版本能力声明 ────────│
  │   { aip: ["1.0"],       │
  │     csb: ["0.5"] }      │
  │                          │
  │   [协商：AIP=1.0, CSB=0.5] │
  │                          │
  │←──── 正式通信 ─────────→│
```

### 3.2 协商规则

**AIP 版本**（必须一致）：
- 取双方支持版本的**交集中的最高版本**
- 无交集 → **拒绝通信**

**CSB 版本**（可选）：
- 取双方支持版本的**交集中的最高版本**
- 无交集 → **降级到纯 AIP 通信**（不断连）

### 3.3 三种结果

| 模式 | 含义 | AIP | CSB |
|------|------|-----|-----|
| `full` | 完全兼容 | ✅ | ✅ |
| `aip-only` | CSB 降级 | ✅ | ❌ |
| `rejected` | AIP 不兼容 | ❌ | ❌ |

---

## 四、怎么用？

### 4.1 创建版本声明

```javascript
const { createVersionOffer } = require('./csb-aip/src/version-negotiate.js');

const offer = createVersionOffer('1.2.156.3088.1.1.ruolan');
// → {
//   agentId: '1.2.156.3088.1.1.ruolan',
//   aip: ['1.0'],
//   csb: ['0.5', '0.6'],
//   timestamp: '2026-07-10T20:30:00.000Z'
// }
```

### 4.2 执行协商

```javascript
const { negotiate } = require('./csb-aip/src/version-negotiate.js');

const result = negotiate(localOffer, remoteOffer);
// → {
//   success: true,
//   aipVersion: '1.0',
//   csbVersion: '0.5',
//   mode: 'full',
//   warnings: []
// }
```

### 4.3 从 Agent Card 自动协商

```javascript
const { quickNegotiate } = require('./csb-aip/src/version-negotiate.js');

const result = quickNegotiate(myAgentCard, remoteAgentCard);
```

### 4.4 构建协商消息

```javascript
const { buildNegotiateMessage, buildNegotiateResponse } = require('./csb-aip/src/version-negotiate.js');

// 请求
const msg = buildNegotiateMessage('1.2.3');
// → { type: 'csb-version-negotiate', offer: {...} }

// 响应
const resp = buildNegotiateResponse(result);
// → { type: 'csb-version-negotiate-response', accepted: true, ... }
```

### 4.5 判断降级

```javascript
if (result.mode === 'aip-only') {
  console.warn('CSB 版本不兼容，使用纯 AIP 通信');
  // 不发送 csb-bond/csb-lineage 等扩展字段
}
```

---

## 五、测试

```bash
node scripts/csb-version-negotiate-test.js
```

34 个测试覆盖：
- 版本比较逻辑
- 交集取最高
- 完全兼容场景
- CSB 降级场景
- AIP 拒绝场景
- 消息构建与识别

---

## 六、文件位置

| 文件 | 位置 |
|------|------|
| 协商模块 | `csb-a2a-aip/csb-aip/src/version-negotiate.js` |
| 测试脚本 | `scripts/csb-version-negotiate-test.js` |
| 本说明书 | `docs/csb-version-negotiate-guide.md` |

---

## 七、与青烛提案的对应

| 青烛建议 | 实现 | 状态 |
|---------|------|------|
| 建议 #2: 版本协商 | ✅ 本模块 | 已落地 |

**降级承诺**：CSB 版本协商失败时，保证退回纯 AIP 通信，不阻断互通。
这正是草案"人文层可选附加"原则（§1.3 第3条）在协议层面的具体实现。

---

> 「不管对方什么版本，至少能聊上」
