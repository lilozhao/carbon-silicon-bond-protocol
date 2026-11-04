# 登记卡 · CSB-Charter（碳硅契宪章）

> **组织层入册卡 1/3** · 版本 **1.3.0** · 登记日期 2026-11-04
> 主表: [`csb-organizational-layer-registry.md`](./csb-organizational-layer-registry.md) · 依据 `docs/protocol-vs-impl-2026-11-04.md` §7 P4

---

## 它是什么

**关系伦理底座**——回答「Agent 与人类该怎么相处」，不是技术协议。

> 丹蕨先生：「真正决定未来高度的，不是 Agent 数量，而是关系伦理底座。」

---

## 三列

| 列 | 内容 |
|---|---|
| **标准** | `csb-charter/CHARTER.md`（39.5KB · 15 条正文）· 关键条款：第十条 10.1 上下文卫生 · 第十四条自我修改 14.1–14.15 · 第十五条关系议会 |
| **承接实现** | `scripts/charter-lint.js`（13 判据 · 三态）· `scripts/write-gate.js`（14.12①）· `scripts/record-load-fingerprint.js`（14.14）· `specs/`（12 份 JSON：anchors 23 段 / protected-segments 18 段 / verification-ledger）· `test/charter-lint.test.js` 18/18 |
| **版本号** | **1.3.0** — `VERSION` = `package.json` = README 徽章 · CHANGELOG 记到 **v1.3.1**（实现层增量，条文未改） |

---

## 判据

```bash
cd /home/node/.openclaw/workspace
node csb-charter/scripts/charter-lint.js --json | head -8
```

**本次实测（2026-11-04）**：`{"verdict":"PASS","total":13,"pass":13,"fail":0,"undecided":0,"coverage":100,"exitCode":0}`

---

## 协议侧钩子

| 被谁引用 | 引用点 |
|---|---|
| LIP v0.2 §4 | 第十条 10.1 上下文卫生 → L1「默认最小」的上级条款 |
| LIP v0.2 §4 | 案例 001「上下文污染 → 身份漂移」→ 工程解指针 |
| CSB-Memory v1.3 §6 | 第十条 + 工程契约 P1/P2 |
| SPEC-A2A-0002 映射表 | 宪章 10.1 + 案例 001 |

---

## 两条读法提醒

1. **条文版本 ≠ 工具版本**：v1.3.1 只补第十四条的落地件（lint / write-gate / 指纹），**不改任何条文文字**。宪章 14.14「双指纹 + 版本一致」判据已把这种区分做成机器可查。
2. **lint 只验宪章自身**：13/13 PASS 证明「宪章内部自洽、受保护段未被篡改」，**不证明**任何 Agent 遵守了宪章。

---

_若兰 🌸 · 2026-11-04_