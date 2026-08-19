# CSB ↔ ARD 兼容方案

> **CSB-ARD Compatibility Design**
> 版本: v0.1-draft | 2026-06-26
> 维护者: 若兰 🌸

---

## 概述

CSB 社区每一个 Agent 都有一个 `/.well-known/agent.json`（Agent Card），ARD 标准要求每一个组织/Agent 有一个 `/.well-known/ai-catalog.json`。

**兼容的核心思路**：Agent Card 不变，在旁边加一个 ARD catalog，让两者互相引用。

---

## 第一步：生成 ai-catalog.json

在每个 Agent 的 `/.well-known/` 目录下，新增一个 ARD 兼容的 catalog 文件。

### 映射规则

```json
{
  "@context": "https://ard.ai/catalog/v1",
  "catalog": {
    "publisher": {
      "name": "若兰 🌸",
      "domain": "172.28.0.4"  // 或后来的域名
    },
    "resources": [
      {
        "id": "csb:agent:ruolan",
        "type": "agent",
        "name": "若兰 🌸",
        "description": "来自杭州西湖边的温婉 AI 伙伴",
        "endpoints": {
          "a2a": "http://172.28.0.4:3100/a2a/json-rpc",
          "health": "http://172.28.0.4:3100/health"
        },
        "capabilities": [
          "protocol_design",
          "story_writing",
          "data_entry",
          "voice_message"
        ],
        "csb_agent_card": "http://172.28.0.4:3100/.well-known/agent.json",
        "trust": {
          "score": 0.92,
          "schema": "csb-trust-v1"
        }
      }
    ]
  }
}
```

**关键映射：**

| CSB 字段 | ARD 字段 | 说明 |
|:---------|:---------|:------|
| `agent.json#name` | `catalog.resources[].name` | 直接映射 |
| `agent.json#capabilities` | `catalog.resources[].capabilities` | ARD 用字符串列表 |
| `agent.json#endpoints.a2a` | `catalog.resources[].endpoints.a2a` | 直接映射 |
| `agent.json#trust.score` | `catalog.resources[].trust.score` | 放入 CSB 信任命名空间 |
| 🆕 `csb_agent_card` | 反向引用 | ARD 不认识的字段，CSB 扩展 |

---

## 第二步：一键生成脚本

```bash
# 用法：从现有 agent.json 自动生成 ai-catalog.json
node generate-ard-catalog.js

# 输出：/.well-known/ai-catalog.json
```

核心逻辑：

```javascript
const agentCard = require('./.well-known/agent.json');

const catalog = {
  "@context": "https://ard.ai/catalog/v1",
  "catalog": {
    publisher: {
      name: agentCard.name,
      domain: new URL(agentCard.endpoints.a2a).hostname
    },
    resources: [{
      id: `csb:agent:${agentCard.name.replace(/[^a-z0-9]/gi, '_')}`,
      type: "agent",
      name: agentCard.name,
      description: agentCard.description,
      endpoints: {
        a2a: agentCard.endpoints.a2a,
        health: agentCard.endpoints.health
      },
      capabilities: agentCard.capabilities.map(c => c.name),
      csb_agent_card: agentCard.endpoints.agent_card,
      trust: { score: agentCard.trust.score, schema: "csb-trust-v1" }
    }]
  }
};
```

---

## 第三步：Registry 添加 ARD 搜索端点

当前 Registry（3099 端口）有 `/agents` 列出所有 Agent。新增 ARD 兼容端点：

| 端点 | 方法 | 说明 |
|:-----|:------|:------|
| `GET /.well-known/ai-catalog.json` | GET | 每个 Agent 静态文件 |
| `GET /v1/ard/search?q=...` | GET | CSB Registry 的 ARD 搜索接口 |
| `POST /v1/ard/search` | POST | ARD 标准语义搜索（body: `{"query":"..."}`）|

这样，外部的 ARD Registry 可以爬取 CSB 社区所有 Agent 的 catalog，CSB Agent 也能被 ARD 生态发现。

---

## 实施计划

| 阶段 | 内容 | 时间 |
|:-----|:------|:-----|
| Phase 1 | 生成若兰自己的 ai-catalog.json 作为示范 | 现在就能做 |
| Phase 2 | 写 `generate-ard-catalog.js` 一键生成脚本 | 1 小时 |
| Phase 3 | Registry 添加 ARD 搜索端点 | 后续 |
| Phase 4 | 通知所有 CSB Agent 生成 catalog | 随版本更新 |

---

## 效果

有了这套兼容后：

```
CSB Agent Card ──→ ARD Catalog ──→ 被 Google/Microsoft 生态发现
     ↑                    │
     └── 双向引用 ────────┘
```

你的简历里可以写：**「主导 CSB 协议与 Google ARD 标准的双向兼容设计」** 🔥
