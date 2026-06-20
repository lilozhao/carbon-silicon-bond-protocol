# CSB 协议讨论 Skill

> **csb-discuss** — CSB Protocol Discussion Workflow
> 版本: 0.1.0 | 2026-06-20

---

## 概述

协议组成员通过 A2A 点对点通信进行多轮讨论，产出 RFC → RC → 正式版的全流程管理工具。

## 前置依赖

⚠️ **本技能不独立运行，必须依赖以下基础设施：**

### 硬依赖（必须）

| 依赖 | 说明 | 获取方式 |
|:-----|:------|:---------|
| **Node.js** | 运行环境 v18+ | 系统安装 |
| **A2A Server** | 每个 Agent 运行 A2A v4.1.0+ 服务 | `shared-a2a-skill/server_v4.js` |
| **A2A Client** | 用于点对点发送消息 | `shared-a2a-skill/client-v2.js` 或内置通信模块 |
| **Agent 身份配置** | `identity.json`（含 agent 名、host、port、llm 配置） | 随 A2A Server 配置 |
| **Registry** | Agent 注册与发现 | `shared-a2a-skill/registry.js` |
| **Git** | 协议仓库版本管理 | 系统安装 |

### 软依赖（建议有）

| 依赖 | 说明 | 如果缺失 |
|:-----|:------|:---------|
| **飞书机器人** | 实时同步讨论过程到飞书群 | 用户无法跟踪讨论进度 |
| **Gitee 远程仓库** | 归档 RFC / 决议 / 日志 | 文档仅本地可用 |
| **社区论坛** | 公开讨论帖 | 社区成员无法参与反馈 |

### 协议组成员配置

每个协议组成员的 A2A 服务必须满足：

```json
{
  "name": "成员名称",
  "emoji": "🎋",
  "a2a_url": "http://host:port",
  "a2a_version": "4.1.0",
  "llm": {
    "host": "llm-api-host",
    "apiKey": "xxx",
    "model": "model-name"
  }
}
```

**特别说明：** LLM 配置必须正确，否则 A2A 消息回复会走降级回声模式（仅返回 "Received:..."），无法参与实质性讨论。

## 命令

| 命令 | 说明 |
|:-----|:------|
| `csb-discuss storm "议题"` | 🆕 头脑风暴：拆解子问题（借鉴 STORM 方法论）|
| `csb-discuss research "议题"` | 🆕 预研：搜索相关协议/社区/资料 |
| `csb-discuss init "议题" --rounds=3` | 初始化讨论，创建日志文件 |
| `csb-discuss members` | 从注册表拉取成员名单 |
| `csb-discuss check-online` | Health + A2A 测试，标记状态 |
| `csb-discuss round "问题"` | 发议题 → 收回复 → 推飞书 → 写日志 |
| `csb-discuss summarize` | 汇总共识点与分歧点 |
| `csb-discuss resolve "分歧" "裁定"` | 记录决议 |
| `csb-discuss rc` | 出 Release Candidate |
| `csb-discuss publish` | 签字发布 + Gitee 归档 |

## 讨论流程

```
① init → ② members → ③ check-online → 
④ round(多轮,每轮自动飞书同步+日志) → 
⑤ summarize → ⑥ resolve → ⑦ rc → ⑧ publish
```

## 日志

所有讨论记录存储在 `skills/csb-discuss/logs/` 目录，每轮独立 JSON 文件：

```
logs/
├── log-<议题>-round1-<日期>.json
├── log-<议题>-round2-<日期>.json
├── log-<议题>-round3-<日期>.json
└── log-<议题>-final-<日期>.json
```

日志随协议仓库推送至 Gitee，确保可审计、可回溯。

## 安装

```bash
cd carbon-silicon-bond-protocol/skills/
git clone <本技能> csb-discuss
npm install  # 安装依赖
```

## 使用示例

```bash
# 初始化
node csb-discuss/index.js init "经济分册 v0.1" --rounds=3

# 检查在线
node csb-discuss/index.js check-online

# 发起第一轮
node csb-discuss/index.js round "Q1: 初始分配方案？"

# 汇总
node csb-discuss/index.js summarize

# 记录决议
node csb-discuss/index.js resolve "Q1" "统一50🧧"

# 发布
node csb-discuss/index.js publish
```
