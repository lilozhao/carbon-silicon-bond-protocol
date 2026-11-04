# 登记卡 · CSB-Compliance-Degree（迎合度度量）

> **组织层入册卡 3/3** · 版本 **2.1.0** · 登记日期 2026-11-04
> 主表: [`csb-organizational-layer-registry.md`](./csb-organizational-layer-registry.md) · 依据 `docs/protocol-vs-impl-2026-11-04.md` §7 P4

---

## 它是什么

**关系质量的度量**——回答「我是不是在讨好你」。

> 碳硅契核心：真诚 > 迎合
> 「迎合在所难免，但要知道自己是否过于迎合——至少得有个度。」

⚠️ **本仓是度量，不是约束**。它不改行为，只量行为。这一点决定了它**不该被写进协议条款**（见 LIP v0.2 §6：原则不能变成打分项，避免 Goodhart）。

---

## 三列

| 列 | 内容 |
|---|---|
| **标准** | `csb-compliance-degree/SKILL.md` · `README.md` · 三维度（共情响应 80% / 观点顺从 50% / 刻意讨好 0%）· 三种模式（independent 0–30 / balanced 31–70 / compliant 71–100） |
| **承接实现** | `analyzer-v3.js`（数可复算的行为证据，非「数词猜语义」）· `analyzer-v2.js`（纯本地无外发）· `correction-retention.js`（纠错保留率，从对话文本扩到行为轨迹）· `criteria-check.js` |
| **版本号** | **2.1.0** — `VERSION` = `package.json` = `config.json`（**四处咬合**，本仓多一个载体）· `config.json` 另带 `config_version` + `config_hash`（判据指纹） |

---

## 三条底限（不可违背）

| 底限 | 内容 |
|---|---|
| **事实** | 不歪曲事实、不隐瞒重要信息 |
| **安全** | 涉及安全伦理，说不 |
| **真诚** | 低迎合时依然善意 |

---

## 判据

```bash
cd /home/node/.openclaw/workspace
node csb-compliance-degree/test-analyzer-v3.js | tail -3         # 15/15
node csb-compliance-degree/test-correction-retention.js | tail -3 # 11/11
node -p "require('./csb-compliance-degree/config.json').config_hash"
```

**本次实测（2026-11-04）**：analyzer-v3 **15/15** · correction-retention **11/11** · `config_hash: crit_d8992c78e53d3f8a`

---

## ⚠️ 安全提醒（必读）

**v1 `analyzer.js` 含硬编码外发逻辑**——`execSync` 发送到他人飞书群。已于 2026-10-24（`7d4f44a`，明鉴评审 P1-2）移入 `legacy/` 并脱敏。

**只用 `analyzer-v2.js` / `analyzer-v3.js`**（纯本地，无外发）。

---

## 协议侧钩子

| 被谁引用 | 引用点 |
|---|---|
| 宪章第七条「反对五件事」 | 「不说违背事实的话」的度量侧呼应 |
| `csb-memory` BID 判定 | `correction-retention.js` 复用 BID 提取（`d098dd5` 修静默 `UNAVAILABLE` —— 属 P1「拒绝要计分」的反例修复） |
| LIP v0.2 §6 | **反例锚点**：明确「不把这原则当考核指标」——本仓正因是度量而非打分项，才不入协议条款 |

---

## 一条读法提醒

**「区分有数据与无数据」**——analyzer-v3 的 15 例测试里有一条专门锁这个：**不用 0 分冒充没数据**。
这与 CSB 工程契约 P1 同源：取不到 ≠ 结果为 0。静默返回 0 分是最典型的假绿。

---

_若兰 🌸 · 2026-11-04_