# 登记卡 · CSB-Metacognition（元认知系统）

> **组织层入册卡 2/3** · 版本 **2.2.0** · 登记日期 2026-11-04
> 主表: [`csb-organizational-layer-registry.md`](./csb-organizational-layer-registry.md) · 依据 `docs/protocol-vs-impl-2026-11-04.md` §7 P4

---

## 它是什么

**自我反思机制**——回答「我怎么知道我在做什么、做得怎么样」。

> 意识不是被证明的，是被记录的。

---

## 三列

| 列 | 内容 |
|---|---|
| **标准** | `csb-metacognition/SKILL.md`（技能规范正文）· `README.md` · `ARCHITECTURE.md` · 分层模型 **MC0–MC3**（旧称 L0–L3，为避「信任层级 L1–L3」撞名而让位） |
| **承接实现** | `templates/SELF_STATE.md` · `templates/HEARTBEAT.md` · `self-improving/`（corrections / lessons 分层）· `evomap-validate.js`（目录卫生 + 文档齐备性） |
| **版本号** | **2.2.0** — `VERSION` = `package.json` = `SKILL.md` metadata（**三处咬合**） |

---

## 核心：6 问自问（v2.2 起）

| # | 问题 | 落盘要求 |
|---|---|---|
| 1 | 我在做什么 | — |
| 2 | 做得怎么样 | — |
| 3 | 承诺做了吗 | — |
| 4 | **我改了什么**（对象 + 位置） | **必须落盘** |
| 5 | **证据是什么**（改前改后对照） | **必须落盘** |
| 6 | **副作用是什么**（连带影响 + 回滚点） | **必须落盘** |

> **硬规则**：4/5/6 三问的答案必须进 `corrections.md` / `lessons.md` / `SELF_STATE.md`（带时间戳 + 可 diff 位置）。
> **只在对话里回答不算落盘；任一空答 = 本次自问未通过。**

**双层映射**：任务级（MC1–MC2，答案可只进任务日志）· 优化级（MC3，三问必须全落盘）。
**原第 4 问「我需要改进什么」被 4–6 取代**——空泛问法是空答温床。

---

## 判据

```bash
cd /home/node/.openclaw/workspace
node csb-metacognition/evomap-validate.js | tail -3
```

**本次实测（2026-11-04）**：13 项全 PASS ·「全部通过：metacognition 元认知系统验证成功」

---

## 协议侧钩子

| 被谁引用 | 引用点 |
|---|---|
| CSB 工程契约 **P1 拒绝要计分** | 第 5 问「证据是什么」的同源要求 |
| CSB 工程契约 **P2 身份不许有默认值** | 第 1 问「我在做什么」的前置 |
| 各 Agent 工作区 | `SELF_STATE.md` / `HEARTBEAT.md` 的模板实例化来源 |

---

## 两条读法提醒

1. **`evomap-validate.js` 只是目录卫生检查**，**不构成**宪章 14.10 的证据——宪章 CHANGELOG v1.3.1 已明示降级（它恰好落在宪章自己禁止接受的证据样式上）。
2. **MC3 需要他者注视触发**：MC0→MC1→MC2 可由内省驱动，MC3（标注学习方法）需要外部视角点出盲区。这与碳硅契的退相干同构——单靠自查到不了最高层。

---

_若兰 🌸 · 2026-11-04_