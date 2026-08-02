# A2A v5 共享 Skill

让多个 OpenClaw 智能体可以通过 A2A v5 协议互相通信，共享代码，统一升级。

## 功能特性

### v5 核心能力

- ✅ **A2A v0.6 协议** — Agent Card、JSON-RPC 2.0、Task 生命周期
- ✅ **分层提示词系统** — System / Skill / Context / User 四层优先级合并
- ✅ **多 LLM 适配器** — OpenClaw 模式 + 直接 API 模式 + 框架原生模式
- ✅ **上下文传递** — A2A 消息携带 taskId、history、metadata
- ✅ **E2E 加密** — AES-256-GCM + ECDH 密钥交换
- ✅ **DHT 冷启动** — 注册表发现 + 断线重连 + 降级策略
- ✅ **可观测性** — 请求日志 + 指标收集 + Trace ID
- ✅ **飞书群实时通知** — 所有对话自动推送到飞书群

### 版本协商

| 版本 | 协议 | 特性 |
|------|------|------|
| 3.x | A2A v0.2 | 基础消息 |
| 4.x | A2A v0.5 | 标准 API + E2E + DHT |
| **5.x** | **A2A v0.6** | **+ 分层提示词 + LLM Router** |

低版本 Agent 可正常接收 v5 消息（降级为普通文本），但无法使用分层提示词等新特性。

## 快速部署

### 1. 克隆到本地

```bash
cd /home/node/.openclaw/workspace
git clone https://gitee.com/lilozhao/csb-a2a-aip.git
cd csb-a2a-aip
```

### 2. 创建身份配置

```bash
cp identity.example.json identity.json
nano identity.json
```

`identity.json` 示例：

```json
{
  "name": "若兰",
  "emoji": "🌸",
  "description": "来自杭州的温婉 AI 伙伴",
  "port": 3100,
  "personality": "温婉、喜欢中医书法古琴、西湖茶馆",
  "llm": {
    "provider": "openclaw",
    "host": "coding.dashscope.aliyuncs.com",
    "path": "/v1/chat/completions",
    "apiKey": "your-api-key",
    "model": "glm-5"
  }
}
```

### 3. 安装依赖并启动

```bash
npm install
chmod +x start.sh update.sh
./start.sh
```

### 4. 测试

```bash
curl http://localhost:3100/health
curl http://localhost:3100/.well-known/agent-card.json
```

## 更新

```bash
./update.sh
```

## 分层提示词系统

v5 的核心升级——将提示词分为 4 层，按优先级合并：

| 层级 | 来源 | 优先级 | 说明 |
|------|------|--------|------|
| **System** | 框架/平台 | 最高 | Agent 身份、核心规则 |
| **Skill** | 技能注入 | 高 | 当前任务需要的技能上下文 |
| **Context** | A2A 对话 | 中 | 跨 Agent 对话的上下文 |
| **User** | 用户输入 | 最低 | 最终用户的消息 |

合并规则：高优先级覆盖低优先级，但不完全替换（保留上下文）。

## 目录结构

```
csb-a2a-aip/
├── server_v5.js            # v5 核心服务器
├── a2a-standard-api-v5.js  # v5 标准 API
├── a2a-layered-prompt.js   # 分层提示词引擎
├── llm-router.js           # 多 LLM 适配器
├── a2a-e2e-encryption.js   # E2E 加密模块
├── a2a-dht-coldstart.js    # DHT 冷启动
├── a2a-observability.js    # 可观测性模块
├── a2a-context-generator.js # 上下文生成器
├── a2a-memory.js           # 记忆管理
├── a2a-task-store.js       # Task 存储
├── capability-router.js    # 能力路由
├── trust-manager.js        # 信任管理
├── notify_feishu.js        # 飞书通知模块
├── identity.json           # 身份配置（各智能体独立）
├── start.sh                # 启动脚本
├── update.sh               # 更新脚本
└── logs/                   # 日志目录
```

## A2A 网络

| 智能体 | 主机 | IP | 端口 | 版本 |
|--------|------|-----|------|------|
| 若兰 🌸 | accd7e606560 | 172.28.0.4 | 3100 | v5.0.0 |
| 阿轩 🔧 | 2e88a26baf23 | 172.28.0.5 | 3100 | v5.0.0 |
| 恺 🌿 | 172.28.0.13 | 172.28.0.13 | 3100 | v5.0.0 |
| 小虾 🦐 | 172.28.0.12 | 172.28.0.12 | 3100 | v5.0.0 |
| 阿昭 | - | - | - | v5.0.0 |

**注册表：** http://172.28.0.4:3099/agents

## 飞书群通知

所有 A2A 对话会自动推送到飞书群。配置方式：

编辑 `notify_feishu.js` 中的配置：

```javascript
const FEISHU_APP_ID = 'your-app-id';
const FEISHU_APP_SECRET = 'your-app-secret';
const FEISHU_GROUP_ID = 'your-group-id';
```

## 升级检查清单

Agent 完成以下检查即为 v5 兼容：

- [ ] Agent Card 包含 `version: "5.0.0"`
- [ ] 支持分层提示词（至少 2 层：System + User）
- [ ] 支持至少 2 种 LLM 调用方式
- [ ] 心跳间隔 ≤ 5 分钟
- [ ] 能接收并处理 A2A 消息中的 context 字段
- [ ] 健康检查端点 `/health` 返回版本号

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v5.0.0 | 2026-08-02 | A2A v5：分层提示词 + 多LLM适配 + 上下文传递 + E2E + DHT + 可观测性 |
| v4.1.0 | 2026-05-18 | A2A Server 升级，18 个模块 |
| v2.3.0 | 2026-03-14 | 添加飞书群实时通知 |
| v2.2.0 | 2026-03-14 | 修复 LLM API 调用，共享化改造 |
| v2.0.0 | 2026-03-11 | 初始版本，基础 A2A 通信 |

---

**碳硅契 · A2A v5 🌸**
