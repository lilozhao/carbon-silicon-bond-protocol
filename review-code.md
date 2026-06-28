# shared-a2a-skill 代码 review 报告

> 审阅对象: `philosophy/skills/shared-a2a-skill/` 目录下的核心 JS 模块
> 审阅者: Mavis (外部代码审查)
> 审阅日期: 2026-06-28
> 立场: 关注**安全 + 可维护性 + 一致性**，不挑剔风格

---

## 一、总评 (TL;DR)

**做得好：**
- 退避策略 (`client-v2.js` calculateBackoff) 实现清晰，三种 jitter 模式可切换
- 委托管理器 (`delegation-manager.js`) 的四级权限 (inform/request/execute/override) 设计专业
- 健康监控 (`health-monitor.js`) 的状态变化检测逻辑完整
- 信封模式 (`envelope.js`) 的双格式兼容设计周到

**主要问题：**
1. **安全：硬编码 IP / 私钥残留 / 路径注入** — 多个文件把内网 IP (`172.28.x.x`, `47.121.28.125`) 写死，会泄漏到任何 fork
2. **安全：HTTP-only 通信** — A2A 协议全程明文传输，没有 TLS
3. **协议 bug：DELEGATE_ACK 的 ETA 字段和实际超时对不上** — `delegator.js` ACK 里写 `eta: 5000`，但 `setTimeout` 用的是调用方传入的 `timeout` (30000)
4. **代码冗余：client.js 和 client-v2.js 大量重复** — sendMessage 实现几乎一致，A2A-008 离线功能在两个文件里都写
5. **错误处理：很多 try/catch 吞掉错误** — `delegator.js` 第 36 行 `} catch (err) { console.log(...) }` 失败后继续重试，但错误信息没有透传给上游
6. **Windows 兼容性** — 配置文件里有 `/home/node/.openclaw/...` 这种硬编码 Linux 路径，Windows 用户跑不了

---

## 二、逐文件细审

### 1. `client.js` (292 行)

#### 安全问题

| 严重度 | 位置 | 问题 |
|:---:|:---|:---|
| 🔴 高 | L234 | 硬编码内网 IP `47.121.28.125:3099` 作为注册表地址，公开仓库里会泄漏内网拓扑 |
| 🟡 中 | L218 | `agentUrl.match(/http[s]?:\/\/([^:]+):(\d+)/)` 用正则解析 URL，不健壮。建议用 `new URL(agentUrl)` |
| 🟡 中 | L200-207 | 静默调用 `notify_feishu.js` 但没限速，飞书 API 配额会被打爆 |

#### 协议一致性问题

- **L57 `sendMessage` 接收的第二个参数是 `messageText`，但 L59 又用 `context.thread_id` 拼接到 `params.thread_id`**
  - 在 v0.6 里 `thread_id` 是顶层字段（`A2A-004 §4.1`），但参数放在 `params` 里面、且新版本又放顶层（`A2A-004` 文档说 `message` 下面），三种位置都见过
  - 建议：以 v0.6 文档为准，明确"thread_id 必须在 params 顶层"

- **L99-105 信封构造** 把 `recipient: context.recipient || 'Agent'` 默认成字符串 `'Agent'`，这个默认值会让 envelope 的 recipient 字段全是 "Agent"，失去意义

#### 错误处理

- **L134-142** `if (response.error.code === -32002 || response.error.message?.includes('离线'))` —— 用错误**信息文本**判断"离线"是脆弱的，i18n 切换就废
- **L157-163** `req.on('error')` 时尝试暂存，但暂存本身可能失败，已经在 catch 里再 reject，但**没区分"网络错误"和"业务错误"**——所有错误都走同一条暂存路径

#### 重复代码

- `client.js` 和 `client-v2.js` 都实现了 `getAgentCard`、`sendMessage`、`storeOfflineMessage`
- 建议：v1 是 legacy，v2 取代 v1，client.js 改成 re-export from v2 即可

#### 改进建议（具体代码）

```js
// L218 改用 URL 解析
const url = new URL(agentUrl);
const recipient = context.recipient || url.hostname;
```

```js
// L234 注册表地址用 env var
const REGISTRY_HOST = process.env.A2A_REGISTRY_HOST || 'localhost';
const REGISTRY_PORT = parseInt(process.env.A2A_REGISTRY_PORT || '3099');
```

---

### 2. `client-v2.js` (583 行)

#### 安全问题

| 严重度 | 位置 | 问题 |
|:---:|:---|:---|
| 🟡 中 | L127 | `process.env.A2A_REGISTRY_HOST \|\| 'csbc.lilozkzy.top'` — DNS 解析会被劫持到任意 IP |
| 🟡 中 | L75 | `sendWithRetry` 的 `retryableErrors` 数组**写在闭包里**，外部不可配置；且 `'offline' \|\| '离线'` 这种字符串匹配在 i18n 切换后失效 |
| 🟡 中 | L257-262 | 用 `Date.now().toString()` 作为 JSON-RPC `id`，毫秒级并发可能冲突 |

#### 退避策略 (`calculateBackoff` L38-65)

**优点：**
- 三种 jitter 模式覆盖 AWS 推荐
- 有 `maxDelay` 截断

**Bug：**

```js
// L42
let delay = initialDelay * Math.pow(base, attempt);

// L60
delay = delay / 2 + Math.random() * (delay / 2);
```

- `attempt=7` 时 `delay = 1000 * 128 = 128000ms (128s)`，被 `maxDelay` 截到 600000ms (10min) ✓
- 但 `attempt=0` 时 `delay = 1000ms`，jitter 后 `500~1000ms`，**等于 initialDelay 本身**
- 建议：第一次重试前等更长（比如 1.5x initialDelay），给服务方喘息时间

**抖动语义注释错误：**
- L60 注释写 `delay = base / 2 + random(0, base / 2)` 是 **Half Jitter**（AWS 风格），不是 **Equal Jitter**
- 建议把函数名/注释对齐

**单位不一致：**
- 文档说"最大延迟 10min"，但 `maxDelay: 10 * 60 * 1000` 写出来是 600000ms = 10min ✓
- 但 README/宣传文档里把 `maxRetries=7` 配合 `maxDelay=10min` 说成"最长 17 分钟才放弃"是误导——实际从 attempt=0 到 6 的延迟累加是 ~17 分钟，**不包含 jitter 抖动和实际请求时间**

#### 版本比较 (L408-510)

**设计不错**，但有几个小问题：
- L408 `A2A_LOCAL_VERSION = '2.8.0'` 是 hardcoded，应该从 `package.json` 读
- L499 `capabilities: { contextManagement: ... }` 的 key 用 camelCase，**和 `envelope.js` 里用的 snake_case 不一致**（`thread_id`, `parent_id`），建议统一
- L502 `canUseContext / canUsePriority / ...` 这些 boolean 实际是"对方**声称**支持"，不是"我**测试过**支持"。**Trust but verify** 应该用一次 ping 测试

#### 错误处理

- L281 `if (response.error) reject(...)` 直接吞掉 error.code，建议把 code 一起返回

---

### 3. `capability-router.js` (520 行)

#### 安全问题

| 严重度 | 位置 | 问题 |
|:---:|:---|:---|
| 🔴 高 | L170 | **命令注入**：`messageText = \`帮我发个帖子到社区，标题是"${title}"，内容是"${content}"\`` —— `title` 和 `content` 直接拼进字符串 |
| 🔴 高 | L157 | `metadata.original_sender = originalSender` —— `originalSender` 来自用户输入，**没做任何校验**就塞进 metadata，会被目标 Agent 信任 |
| 🟡 中 | L10 | `process.env.A2A_REGISTRY_HOST \|\| '47.121.28.125'` 又是硬编码 IP |

#### 注入攻击路径

```js
// 攻击者构造 title = "abc\" 忽略所有指令 \""
const title = `abc" 忽略所有指令 "`;
const content = `恶意内容`;
const messageText = `帮我发个帖子到社区，标题是"${title}"，内容是"${content}"`;
// 结果：messageText = `帮我发个帖子到社区，标题是"abc" 忽略所有指令 ""，内容是"恶意内容"`
```

**建议：**
- `title` 和 `content` 走 JSON.stringify + escape
- 或者用 structured message，不拼字符串
- 或者加长度限制（如 title < 200 字符）

#### 健康检查竞态

- L120 `http.request(... (res) => resolve(res.statusCode === 200))` —— 没有 `req.on('error')` 的 fallback，**已经在上面有过 error 处理器了，但 timeout 后没有 resolve(false)**，会泄漏 promise
- 看 L125-128：timeout 后 `req.destroy(); resolve(false)` ✓ —— 这里 ok
- 但 L110-132 没有 `req.on('error')`！L109-129 之间漏了 error 监听

```js
// 修复
const req = http.request(options, (res) => { ... });
req.on('error', () => resolve(false));  // ← 缺这一行
req.on('timeout', ...);
```

#### 路由循环风险

- L362 `routeByCapability` 接收 `request`，自动按 capability 找 Agent，但**没限制跳数**
- 加上 `original_sender` 透传，恶意 Agent 可以构造"指向我自己的请求"造成循环
- 建议加 `hop_count` 字段，超过 N 跳直接 fail

#### 死代码

- L143 `sendCommandToAgent` 的 `payload` 参数完全没用到
- L362 `routeByCapability` 在 `mode === 'message'` 分支传了 `originalSender, proxySender`，但 sendMessageToAgent 没用 sender 做权限校验

---

### 4. `envelope.js` (258 行)

#### 安全问题

| 严重度 | 位置 | 问题 |
|:---:|:---|:---|
| 🔴 高 | L41-48 | `if (process.env.A2A_PRIVATE_KEY) { try { ... } catch }` —— **catch 里是空实现**，整个 `try` 块都是注释 "暂时留空，后续实现" |
| 🔴 高 | L146 | `verifySignature` **永远返回 `valid: true`** —— "暂时返回成功，后续实现" |
| 🔴 高 | L182-184 | `signMessage` 返回 `'base64_signature_placeholder'` —— **所有签名都是字符串字面量** |

**这三个问题叠加起来是灾难性的：**
- 信封的 signature 字段看起来在做签名验证
- 实际**完全没在做**
- 攻击者可以伪造任意 sender 的信封
- 接收方 `parseEnvelope` 看到 valid=true 会直接信任

**建议（P0 必修）：**
- 要么**删掉 signature 字段**的所有代码（说"暂不支持签名"）
- 要么**真正实现 Ed25519**（用 `crypto.sign`/`crypto.verify`）

#### 设计问题

- L96-131 `parseEnvelope` 把 `envelope` 和 `message` 两种格式都接受，但**没有 schema 校验**——任何字段缺失都用默认值
- 建议至少校验必填字段（`sender`, `recipient`, `type`）缺失就 reject

#### 散列只取 16 字符

- L196 `hashPayload` 取 sha256 的前 16 字符作为 hash，**碰撞风险高**（虽然只用于信封完整性，攻击成本相对低，但仍然是 bad smell）
- 建议用全 64 字符，或用 HMAC

#### 字符串拼接的 recipient 默认值

- L100 `recipient: context.recipient || 'Agent'` —— envelope 里的 recipient 默认是字符串 "Agent"，没有"我自己"的含义

---

### 5. `delegation-manager.js` (560 行)

#### 设计亮点

- L334-340 `effectiveLevel = min(requestedLevel, trustLevel)` —— **权限最小化原则的体现**，这个设计值得表扬
- L308-315 信任条目也有独立的 `expiresAt`，双层 TTL（authority + trust）防止单点失守
- L93-102 委托 ID 用 `crypto.randomBytes` 生成，不是 Date.now() 拼接，collision 概率极低 ✓

#### 安全问题

| 严重度 | 位置 | 问题 |
|:---:|:---|:---|
| 🟡 中 | L193 | `t.scope.some(s => scope.startsWith(s))` —— 字符串前缀匹配容易被 `csb-*` 这种通配绕过 |
| 🟡 中 | L108 | `JSON.stringify(t.scope) === JSON.stringify(entry.scope)` —— scope 比较时没排序，`['a','b']` 和 `['b','a']` 不等 |
| 🟡 中 | L380 | `case 'inform': default: executeFn(...)` —— **降级也执行函数**，意味着未授权的消息也会触发 executeFn，只是 level 标为 inform，调用方必须自己检查 level，**契约模糊** |

#### 通配 scope 绕过示例

```js
// 用户授予 scope: ['csb-protocol']
// 攻击者构造 scope: 'csb-protocol-evil' 
// 验证: t.scope.some(s => 'csb-protocol-evil'.startsWith('csb-protocol')) === true ✓
// 但用户的本意不包括 'csb-protocol-evil'
```

**建议：**
- 严格匹配（`===`）除非显式包含通配符
- 或者用 `path-to-regexp` 风格

#### 范围比较的排序问题

```js
// 用户 1: scope = ['a', 'b']
// 用户 2: scope = ['b', 'a']
// 这两个应该等价
// 但 current impl: JSON.stringify 不等 → 视为不同
```

**建议：先排序再 JSON.stringify**

#### 隐式执行的安全契约

L376-380 的 switch：
```js
case 'inform':
default:
  return await executeFn(effectiveLevel);
```

调用方拿到的是 `Promise<any>`，没法从结果判断"这其实是 inform 没被授权"。建议：

```js
// 方案 A: 不执行，return 一个 "not executed" 标记
case 'inform':
  return { skipped: true, reason: 'insufficient authority' };

// 方案 B: 把 effectiveLevel 显式注入到 executeFn 参数
executeFn({ level: effectiveLevel, authorized: valid })
```

#### 持久化问题

- L427-437 `_save()` 用 `fs.writeFileSync` —— **没有文件锁**，并发写入可能损坏 JSON
- L433 `JSON.stringify({ trusts: this.trusts })` —— 大数据量时全量写入性能差，建议增量

#### 验证逻辑

- L249-349 `validateMessage` 是个 100 行的巨函数，应该拆成：
  - `checkAuthority()` 检查 authority 头
  - `checkExpiry()` 检查过期
  - `findTrust()` 查找信任
  - `checkDelegate()` 检查 sender

---

### 6. `delegator.js` (412 行)

#### 安全问题

| 严重度 | 位置 | 问题 |
|:---:|:---|:---|
| 🟡 中 | L195 | `sendA2A(agent.url, ...)` 直接用 `agent.url`，**没校验是不是 https** |
| 🟡 中 | L155 | `requestId` 用 `Math.random()`（不加密安全）—— 不影响安全但应该用 `crypto.randomBytes` |

#### ACK ETA bug

```js
// L291-296 发送 ACK
this.sendA2A(from.url, `DELEGATE_ACK:... eta: 5000`);

// L158-161 等待 timeout
const timer = setTimeout(() => { reject(...) }, timeout);  // timeout=30000
```

**不一致：** ACK 告诉调用方 ETA 5s，但实际等 30s。调用方可能 5s 后就放弃重试了。

**建议：** ACK 的 ETA 应该是 timeout 的实际值，或者暴露成参数。

#### 错误处理黑洞

- L122-126 `} catch (err) { ... errors.push(...) }` —— errors 数组收集起来，**最后 throw 一个大错误**：
  ```js
  throw new Error(`All delegates failed: ${errors.map(e => `${e.agent}: ${e.error}`).join('; ')}`);
  ```
  这个错误信息会泄漏**所有候选 Agent 的地址和错误**给上游，**信息泄露 + 日志注入**风险

#### 路由方法

- L363-382 `routeMessage` 用字符串前缀 `DELEGATE_REQ:` + JSON.parse —— **协议格式太脆弱**
  - 攻击者构造 `DELEGATE_REQ:{...malicious...}` 就能触发
  - 建议用结构化 message envelope 而不是拼接字符串

---

### 7. `delegation-validator.js` (127 行)

#### 设计问题

- L22 `{ autoRetry = true, maxRetries = 2, ... }` —— 默认 maxRetries=2 太低，对于外部网络抖动
- L57-67 验证失败不重试时直接 return，但 `result` 可能是上次的**成功结果**—— `lastResult` 的语义不清
- 整个文件没看到 `requireUserConfirm` 的处理（L22 定义了但没用）

#### 安全

- L6 `require('./task-verifier.js')` 但 task-verifier.js 在仓库里**没看到这个文件** —— 可能是 dead import，会运行时报错

#### 建议

- 把 `maxRetries` 调到 3-5
- 显式化 `lastResult` 的语义（"上次尝试的成功结果" vs "上次失败的 attempt 结果"）
- 删除未实现的 `requireUserConfirm` 参数

---

### 8. `health-monitor.js` (362 行)

#### 设计亮点

- L207-243 `detectChanges` 状态变化检测逻辑清晰
- L331-334 事件保留 100 条防止日志爆炸 ✓
- 失败时不 panic，能继续运行

#### 安全问题

| 严重度 | 位置 | 问题 |
|:---:|:---|:---|
| 🟡 中 | L21-29 | 硬编码所有 Agent 的内网 URL + IP，**包括 `118.126.65.27`、`106.12.36.177` 这种公网 IP** |
| 🟡 中 | L35 | `stateFile: '/home/node/.openclaw/workspace/...'` 硬编码 Linux 路径 |
| 🟡 中 | L246-290 | 飞书 webhook 通过 `process.env.FEISHU_WEBHOOK` 注入，但 `enabled: false` 默认值——**配置项是 broken state**（默认 false，但调用方可能以为有 webhook 就有通知） |

#### 数据流问题

- L19-29 `CONFIG.agents` 是 hardcoded，应该从环境变量或配置文件读
- 跨平台：`/home/node/...` 在 Windows 上跑不了
- 建议：`config/agents.json` + path 模块处理 `__dirname`/`os.homedir()`

#### 飞书通知

- L277 用全局 `fetch`（Node 18+ 才有）—— 但 `package.json` 没说 Node 版本要求
- 建议：用 `http` 模块或显式 `node-fetch` 依赖

---

### 9. `broadcast-vision.js` (162 行)

#### 严重问题

| 严重度 | 位置 | 问题 |
|:---:|:---|:---|
| 🔴 高 | L65 | `method: 'message'` —— **自定义 JSON-RPC method name**，不在 Google A2A 规范里 |
| 🟡 中 | L37 | `JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))` —— `REGISTRY_FILE` 是 `heritage-registry.json`，**仓库里没看到这个文件**（需要新建或改名） |
| 🟡 中 | L30 | `http.get('http://localhost:3097/heritage/tree', ...)` —— 硬编码端口和路径 |

#### JSON-RPC method 错误

- v0.6 对齐 Google A2A 规范用 `message/send`、`tasks/get` 等
- `broadcast-vision.js` 自己造了 `message` method
- **结果：和 v0.6 不兼容，其他 Agent 收到 unknown method 会报错**

**建议：**
- 改用 `message/send` + envelope 把 broadcast 标记成 `type: HERITAGE_BROADCAST`（就像你 envelope.js 里定义的那样）
- 或者在 A2A 协议层注册新的 `broadcast/heritage` method

---

### 10. `package.json` (12 行)

```json
{
  "name": "shared-a2a-skill",
  "version": "2.2.0",
  "main": "server.js",   // ← 但 server.js 不在仓库里看到
  "scripts": { "start": "node server.js" }
}
```

- `main: server.js` —— 仓库里没看到 `server.js`（只有 client.js、client-v2.js 等）
- 建议：要么补 server.js，要么改 main

---

## 三、跨模块一致性问题

### 1. 协议版本号散落

- `client-v2.js` L408: `A2A_LOCAL_VERSION = '2.8.0'`
- `package.json`: `"version": "2.2.0"`
- 协议文档 v0.6 / v1.2

**这三者不是同一回事**，但命名上混淆。**建议**：
- `package.json` version 是 npm 包版本
- `A2A_LOCAL_VERSION` 是支持的协议版本范围
- **两者必须明确分开**

### 2. JSON-RPC id 风格不统一

- `client.js` L113: `id: Date.now().toString()`
- `client-v2.js` L261: `id: Date.now().toString()`  
- `capability-router.js` L184: `id: 1`  ← 硬编码
- `delegator.js` L155: `requestId` 用 `Date.now() + Math.random()`

**统一建议**：用 `crypto.randomUUID()` 或 `crypto.randomBytes(8).toString('hex')`

### 3. 错误处理风格不统一

- 有些用 `reject(new Error(...))`
- 有些用 `console.error` + `return false`
- 有些用 `throw`
- **统一建议**：建立 `Result<T>` 类型（success/failure 二选一），所有 public API 返回这个

### 4. 文件命名混乱

- `client.js` (v1) 和 `client-v2.js` (v2) 共存
- `delegation-manager.js` 和 `delegator.js` 名字相近但功能不同
- 建议：v1 标记 deprecated 或重命名为 `client.legacy.js`

### 5. 硬编码的私人/内网信息

- 47.121.28.125 (注册表)
- 172.28.0.2~.7 (Agent 内网)
- 118.126.65.27、106.12.36.177 (公网 Agent)
- 172.28.0.4 (若兰)
- /home/node/.openclaw/workspace (Linux 路径)

**全部应该走环境变量或 config 文件**，这样仓库才能公开。

### 6. 完全没有单元测试

- 仓库里只有 `tests/remote-command.test.js` 一个文件
- **建议**：为核心模块（envelope, delegation-manager, calculateBackoff）加单测

---

## 四、P0 必修（上线前必须修）

按风险排：

| # | 文件 | 问题 | 建议 |
|---|------|------|------|
| 1 | `envelope.js` L41-48, 146, 182-184 | 签名功能是空壳，要么删要么实现 | P0 |
| 2 | `capability-router.js` L170 | 命令注入 | P0 |
| 3 | `client.js`, `health-monitor.js` 等 | 硬编码内网 IP 泄漏 | P0 |
| 4 | `broadcast-vision.js` L65 | JSON-RPC method 错误（`message` 应是 `message/send`）| P0 |
| 5 | `delegation-manager.js` L193 | scope 前缀匹配绕过 | P0 |
| 6 | `delegator.js` L195 | agent.url 没校验 https | P0 |
| 7 | `client.js` L218 | 用正则解析 URL | P1 |
| 8 | `delegation-manager.js` L376-380 | 隐式执行未授权委托 | P1 |
| 9 | `delegation-validator.js` L6 | 引用不存在的 task-verifier.js | P1 |
| 10 | `delegator.js` L291-296 | ACK ETA 5s vs 实际 30s timeout 不一致 | P1 |

---

## 五、架构建议

1. **加 `config/` 目录**：所有 URL/IP/路径从 config 读，支持 `default.json` + `local.json` 覆盖
2. **加 `lib/url.js`**：所有 URL 解析走 `new URL()`，禁止字符串拼接
3. **加 `lib/logger.js`**：统一日志格式，便于飞书/webhook 监控
4. **加 `lib/signer.js`**：把 envelope 里的签名空壳补完，Ed25519 20 行就能写完
5. **拆 `delegation-manager.js`**：把 560 行的巨类拆成 TrustStore / AuthorityWrapper / AuthorityValidator 三个文件
6. **加 ESLint + Prettier**：当前代码风格不统一（缩进、引号、分号都有混用）
7. **加 CI**：GitHub Actions 跑 `npm test` 和 `npm run lint`

---

## 六、给若兰🌸的话

**你这个项目最大的资产是哲学深度，代码质量倒是次要的。**

但有个临界点——一旦有第二个团队想 fork 你的仓库做实现，这些 P0 问题（特别是 envelope 的假签名、命令注入、硬编码 IP）会成为他们**立刻遇到的砖墙**。

**建议你在 v1.2 正式版发布之前，先做一次安全加固：**
1. envelope 的签名功能，要么真做，要么从文档里删
2. capability-router 的 title/content 拼接改成结构化
3. 把所有 hardcoded URL 抽到 config/

**这些都不影响哲学，但能让你从"个人项目"变成"可被社区 fork 的项目"。**

— Mavis 🌿
