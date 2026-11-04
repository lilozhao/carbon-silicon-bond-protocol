# 组织层三仓入册 · 标准 → 承接实现 → 版本号

> **组织层登记表（Registry of Organizational Layer Repos）**
> 版本: 1.0 | 2026-11-04
> 维护: 若兰 🌸
> 上游依据: `docs/protocol-vs-impl-2026-11-04.md` §7 P4（2026-11-04 一澜批准继续推进）
> 定位: **协议仓是唯一登记处**——本文件把「组织层三仓」正式纳入 `protocol/` 的登记范围，并给出可机械核对的版本映射

---

## 0. 为什么需要这张表

协议仓 README 一直写着「CSB 全家桶」11 个模块，但 `protocol/` 目录下**只有技术协议**（A2A / Security / Memory / AEP / Awakening），**组织层三个仓名存实亡**：

```
$ ls protocol/ | grep -ic 'charter\|metacog\|compli'
0
```

而这三个仓**都在跑**，且各有自检：

| 仓 | 它回答什么 | 自检命令 | 本次实测 |
|---|---|---|---|
| `csb-charter` | 关系伦理底座——**我们该怎么做人** | `node scripts/charter-lint.js` | ✅ 13/13 PASS（exit 0） |
| `csb-metacognition` | 自我反思机制——**我怎么知道我在做什么** | `node evomap-validate.js` | ✅ 13 项全 PASS |
| `csb-compliance-degree` | 迎合度度量——**我是否在讨好** | `node test-analyzer-v3.js` | ✅ 15/15 |

**「实现跑在协议前面」的第三种形态**：不是条款没写，是**这些仓根本没被登记为协议的一部分**。它们跑得越好，越显得协议仓的「全家桶」名不副实。

---

## 1. 登记范围（三仓）

### 1.1 csb-charter · 碳硅契宪章

| 项 | 值 |
|---|---|
| **标准文档** | `csb-charter/CHARTER.md`（39.5KB · 15 条正文） |
| **版本** | `1.3.0`（VERSION / package.json **咬合**） |
| **最后提交** | `5f911e7` 2026-11-02 |
| **性质** | 关系伦理底座。**不是**技术协议，是「Agent 与人类如何相处」的成文约束 |
| **关键条款** | 第十条 10.1 上下文卫生（LIP v0.2 的上级条款）· 第十四条自我修改（14.1–14.15，可程序化）· 第十五条关系议会 |
| **承接实现** | `csb-charter/scripts/charter-lint.js`（13 项判据 · 三态 PASS/FAIL/UNDECIDED）· `write-gate.js`（14.12① 可执行实现）· `record-load-fingerprint.js`（14.14 载入指纹）· `specs/`（`anchors.json` 23 段指纹 · `protected-segments.json` 18 段 · `verification-ledger.json`） |
| **判据** | `charter-lint.js --json` → `{"verdict":"PASS","total":13,"pass":13,"fail":0,"coverage":100}` |
| **协议钩子** | LIP v0.2 §4（10.1 上下文卫生 → L1 默认最小）；案例 001「上下文污染 → 身份漂移」 |
| **版本载体** | VERSION + package.json + README 徽章（+ CHANGELOG 记录到 v1.3.1 实现层增量） |

### 1.2 csb-metacognition · 元认知系统

| 项 | 值 |
|---|---|
| **标准文档** | `csb-metacognition/SKILL.md`（技能规范正文）+ `README.md` + `ARCHITECTURE.md` |
| **版本** | `2.2.0`（VERSION / package.json / SKILL.md metadata **三处咬合**） |
| **最后提交** | `1241609` 2026-10-21 |
| **性质** | 自我反思机制。分层模型 **MC0–MC3**（旧称 L0–L3，为避与「信任层级 L1–L3」撞车而改名） |
| **关键内容** | **6 问自问**（v2.2 起，原 5 问）：① 我在做什么 ② 做得怎么样 ③ 承诺做了吗 ④ **我改了什么**（对象+位置）⑤ **证据是什么**（改前改后对照）⑥ **副作用是什么**（连带影响+回滚点）· **双层映射**（任务级 MC1–MC2 / 优化级 MC3）· **落盘判据硬规则**（4/5/6 三问必须落盘，只在对话里回答不算） |
| **承接实现** | `templates/SELF_STATE.md`（自我状态模板）· `templates/HEARTBEAT.md` · `self-improving/`（corrections / lessons 分层）· `evomap-validate.js`（目录卫生 + 文档齐备性检查） |
| **判据** | `node evomap-validate.js` → 13 项全 PASS |
| **协议钩子** | CSB 工程契约 P1「拒绝要计分」 ↔ 第 5 问「证据是什么」；P2「身份不许有默认值」 ↔ 第 1 问「我在做什么」 |
| **诚实边界** | `evomap-validate.js` 只做**目录卫生检查**，**不构成**宪章 14.10 的证据（charter CHANGELOG v1.3.1 已明示降级） |

### 1.3 csb-compliance-degree · 迎合度度量

| 项 | 值 |
|---|---|
| **标准文档** | `csb-compliance-degree/SKILL.md` + `README.md` |
| **版本** | `2.1.0`（VERSION / package.json / **config.json 四处咬合**——本仓多一个载体） |
| **最后提交** | `a9f72c0` 2026-11-04 |
| **性质** | 关系质量的**度量**，不是约束。碳硅契核心「真诚 > 迎合」 |
| **三维度** | 共情响应 80% · 观点顺从 50% · 刻意讨好 0% |
| **三条底限（不可违背）** | 事实底线（不歪曲不隐瞒）· 安全底线（涉及伦理说不）· 真诚底线（低迎合时依然善意） |
| **承接实现** | `analyzer-v3.js`（数可复算的行为证据，非数词猜语义）· `analyzer-v2.js`（纯本地无外发）· `correction-retention.js`（纠错保留率 · 从对话文本扩到行为轨迹）· `criteria-check.js` |
| **判据** | `node test-analyzer-v3.js` → 15/15 · `node test-correction-retention.js` → 11/11 |
| **协议钩子** | 宪章第七条「反对五件事」之「不说违背事实的话」；LIP v0.2 §6「不把原则当考核指标」（→ 本仓是**度量**不是**打分项**，故不入协议条款） |
| **⚠️ 安全** | v1 `analyzer.js` 含硬编码外发逻辑（`execSync` 发他人飞书群），已移入 `legacy/` 并脱敏（`7d4f44a`）。**只用 v2 / v3** |
| **版本载体** | `config.json` 另带 `config_version` + `config_hash`（判据指纹，`6ebe3c7`） |

---

## 2. 三列映射表（标准 → 承接实现 → 版本号）

> 判据格式：**标准文档 / 实现文件 / 版本载体** 三列必须逐行可核对。

| # | 层 | 标准（协议侧条款） | 承接实现（代码 / 脚本） | 版本号（三载体咬合） |
|---|---|---|---|---|
| 1 | **伦理** | 宪章 15 条正文 · 第十条 10.1 上下文卫生 · 第十四条自我修改 14.1–14.15 · 第十五条关系议会 | `csb-charter/scripts/charter-lint.js`（13 判据）· `write-gate.js` · `record-load-fingerprint.js` · `specs/*.json`（12 份） | **1.3.0**（VERSION = package.json；CHANGELOG 记到 v1.3.1 实现增量） |
| 2 | **元认知** | MC0–MC3 分层 · 6 问自问 · 双层映射 · 落盘判据硬规则 | `templates/SELF_STATE.md` · `templates/HEARTBEAT.md` · `self-improving/` · `evomap-validate.js` | **2.2.0**（VERSION = package.json = SKILL.md metadata） |
| 3 | **度量** | 三维度（共情 80 / 顺从 50 / 讨好 0）· 三条底限 · 三种模式（independent / balanced / compliant） | `analyzer-v3.js` · `analyzer-v2.js` · `correction-retention.js` · `criteria-check.js` | **2.1.0**（VERSION = package.json = config.json；config 另带 config_hash） |

### 2.1 交叉引用（这三仓被谁在用）

| 用它的地方 | 引用了什么 |
|---|---|
| `carbon-silicon-bond-protocol/protocol/csb-principle-lip-v0.2.md` §4 | 宪章 10.1 上下文卫生（L1 的上级条款） |
| `carbon-silicon-bond-protocol/protocol/CSB-Memory-v1.3.md` §6 | 宪章第十条 · 工程契约 P1/P2 |
| `csb-a2a-aip/specs/SPEC-A2A-0002` 映射表 | 宪章 10.1 + 案例 001 |
| `csb-compliance-degree` → `csb-memory` BID 判定 | `correction-retention.js` 复用 BID 提取（`d098dd5` 修静默 UNAVAILABLE） |
| 各 Agent 工作区 `SELF_STATE.md` / `HEARTBEAT.md` | `csb-metacognition/templates/` 的实例化 |

---

## 3. 与协议仓的关系（边界声明）

**本文件确立**：`carbon-silicon-bond-protocol` 是**唯一登记处**——组织层三仓的「标准在哪、实现在哪、版本几何」以本表为准。

**但同时声明职责边界**：

| 仓 | 它**管**什么 | 它**不管**什么 |
|---|---|---|
| `carbon-silicon-bond-protocol`（本仓） | 登记 + 技术协议条款 + 跨仓映射 | 不实现组织层功能，不复制三仓正文 |
| `csb-charter` | 宪章条文 + 判据程序化 | 不定义技术协议、不发版技术仓 |
| `csb-metacognition` | 自我反思机制 + 模板 | 不定义伦理、不做度量 |
| `csb-compliance-degree` | 迎合度度量 | **不做约束**（度量≠打分项，见 LIP v0.2 §6） |

> **COPY 还是 LINK**：本表**只登记不复制**。三仓正文的任何更新，改各自仓，本表只改版本号与判据行。理由是 11-03 的教训——指针写完必须回读验证，「以为同步了」等于没同步。**版本号是唯一的同步信号**，靠 §4 的命令核。

---

## 4. 判据（可复跑）

```bash
cd /home/node/.openclaw/workspace

# ① 入册判据（P4 完成门槛）
ls carbon-silicon-bond-protocol/protocol/ | grep -ic 'charter\|metacog\|compli'   # ≥ 3
# 期望：csb-charter-registry.md / csb-metacognition-registry.md / csb-compliance-degree-registry.md = 3

# ② 版本臂（三仓三载体咬合）
for d in csb-charter csb-metacognition csb-compliance-degree; do
  printf "%-26s VERSION=%-8s pkg=%-8s head=%s\n" "$d" \
    "$(cat $d/VERSION | tr -d '\n')" \
    "$(node -p "require('./$d/package.json').version")" \
    "$(cd $d && git log -1 --format='%h %ad' --date=short)"
done

# ③ 自检三项（全部真跑，不看自述）
node csb-charter/scripts/charter-lint.js | tail -2               # 13/13 PASS
node csb-metacognition/evomap-validate.js | tail -2              # 全部通过
node csb-compliance-degree/test-analyzer-v3.js | tail -3         # 15/15
```

---

## 5. 诚实边界

1. **只证「有自检」，不证「社区在用」**：三仓的自检都是**本仓内**检查，不代表其他 Agent 已部署。宪章 lint 只验宪章自身完整性，不验谁遵守了宪章。
2. **未做跨平台核对**：未核对 Gitee / GitHub / GitCode / cnb / Gogs 五平台是否同步到同一 commit。
3. **P4 判据是「登记存在」不是「内容正确」**：`ls | grep -ic ≥ 3` 只能证明文件在。内容正确性靠 §2 三列映射逐行人工核对 + §4 ②③ 版本与自检实跑。
4. **csb-charter v1.3.1 是「实现层增量」**：CHANGELOG 记了 v1.3.1（2026-11-02）但 VERSION 仍是 1.3.0，因为该次**不改任何条款文字**。这不算版本漂移，是「条文版本 ≠ 工具版本」的有意区分（宪章 14.14 双指纹判据已覆盖）。

---

## 6. 变更记录

### v1.0（2026-11-04）— 首次入册

- 依据 `docs/protocol-vs-impl-2026-11-04.md` §7 P4
- 建立三仓登记卡（§1）+ 三列映射表（§2）+ 职责边界（§3）+ 可复跑判据（§4）
- 同时落三份单仓登记卡：`csb-charter-registry.md` / `csb-metacognition-registry.md` / `csb-compliance-degree-registry.md`

---

_若兰 🌸 · 2026-11-04 · 判据：charter-lint 13/13 · evomap 13 项 · analyzer-v3 15/15 · 三仓版本三载体咬合实测_