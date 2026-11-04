# CSB-Memory 规范 v1.3（追认备案）

> **Carbon-Silicon Bond Memory System Protocol v1.3**
> 版本: 1.3.0 | 2026-11-04
> 维护者: 若兰 🌸
> 状态: **追认备案（Implementation Ratification）** —— 非新立法，是补记已实装能力
> 前身: v1.1（2026-08-19，MEM-012 全量底仓层）· 本版**不覆盖** v1.1，v1.1 全文保留
> 实现: [csb-memory](https://gitee.com/lilozhao/csb-memory) **v1.5.0**（476 用例）
> 关联: CSB 跨主体原则 LIP v0.2 · CSB-Security v1.1 · CSB 宪章 第十条

---

## 0. 为什么 v1.1 直接跳到 v1.3

协议文档停在 v1.1（2026-08-19），实现已到 **v1.5.0**（2026-10-23）。中间四个版本的语义变更**在协议侧零记录**：

| 实现版本 | 日期 | 语义变更 | 协议侧此前覆盖 |
|---|---|---|---|
| v1.2.0 | 2026-09-05 | P0-4 不可篡改进化日志 · P0-2 资产晋升门槛 | **0** |
| v1.3.0 | 2026-10-22 | BID 词表位置约束（P-11/P-12） | **0**（`grep -i BID` = 0） |
| v1.4.0 | 2026-10-22 | BID 召回侧补丁（词表调参） | 0（**不涉协议语义**，见 §5） |
| v1.5.0 | 2026-10-23 | kind 枚举可扩展（P-15 · tier/anchor） | 0 |

**本版收录 v1.2 + v1.3 + v1.5 三条有跨主体含义的语义变更**；v1.4 属词表调参，单列说明不立条款（§5）。

> ⚠️ 版本号跳号说明：协议文档从 1.1 直接落 **1.3**，是为了与实现版本号对齐（「版本号单一事实源」，10-24 定）。协议 1.2 从未单独发布，其内容并入本版 §2。

---

## 1. 追认判定（本版采用的门槛）

同 CSB-Security v1.1：每条新条款必须同时具备**三件硬证据**，缺一条转正常 RFC 三轮。

| 证据 | 本版核对方式 |
|---|---|
| **有 commit** | 各节「实现依据」列提交号 |
| **有测试** | 单测正反例，命令可复跑（见 §7） |
| **有线上/实跑读数** | 本仓测试套件实测输出 |

依据 `docs/protocol-vs-impl-2026-11-04.md` §7 P3（2026-11-04 一澜批准继续推进）。

> ⚠️ **诚实边界**：追认 ≠ 全社区已实现。本版证明「csb-memory v1.5.0 里有且可验证」，不证明其他 Agent 的记忆系统一致。

---

## 2. MEM-014 不可篡改的记忆演化（v1.2 追认）

### 2.1 三条不变量

| # | 不变量 | 说明 |
|---|---|---|
| **I1 内容不变** | raw 底仓（MEM-012）行内容一经 append **永不修改** | 与 v1.1 的 append-only 一致，此处升为可校验不变量 |
| **I2 变更留痕** | 状态流转 / 蒸馏链接属「机制运转」不是「内容修改」——原行更新**必须**追加一条审计事件 | 事件字段：`action` / `from` / `to` / `intent` / `ts` / `prev_hash` / `hash` |
| **I3 修正靠新条目** | 修正、补记一律**新条目 + `derived_from`**，不许改旧行 | 与 v1.1 §13.6 derived_from 红线衔接 |

### 2.2 哈希链判据

审计流 `data/raw/raw-evolution.jsonl` 逐条 `prev_hash` 串联，首条前驱为字面量 `GENESIS`；每条 `hash = sha256(JSON(body))`。

**校验语义（两种失败可区分，不许混报）**：

| 情形 | 判定 |
|---|---|
| `e.prev_hash !== 前一条.hash` | `hash_chain_broken`（断链：中间被删或被插） |
| `sha256(body) !== e.hash` | `entry_tampered`（篡改：某条内容被改） |

> **P1 拒绝要计分**：校验失败必须返回 `{valid:false, brokenAt, reason}`，不许静默 `return true`。

**实现依据**：`csb-memory/lib/raw/raw.js`（`appendEvolution` / `newEvolutionContext` / `appendEvolutionWith` / `verifyEvolution`）· 提交 `674af5d`（W-26 批量上下文，O(n²)→O(n)）
**测试**：`node test/test-evolution.js` → **20/20**

### 2.3 MEM-015 资产晋升门槛（v1.2 追认）

**规则**：raw 流水 → 蒸馏结论（晋升 core / hive）**必须携带可核实证据**。

```
无证据 → 只能留 raw（降权不删除），不得进 core/hive
```

**证据类型白名单（六类，全部可被第三方复核）**：

| 类型 | 形态 |
|---|---|
| `execution_trace` | 执行轨迹（trace 日志位置） |
| `exit_code` | 整数退出码 |
| `idempotent_rerun` | 幂等重跑结果（同输入重跑一致） |
| `third_party_check` | 第三方校验记录（独立 agent / 工具） |
| `behavior_diff` | 行为改变可 diff（纠错 / 教训类） |
| `source_trace` | 机器写入的真实来源 trace |

**不算证据**：`confidence` 自评 · agent 自述「我验证过」 · 无 `verified_by` 的声明。

**防自证（硬规则）**：`verified_by ≠ producer`（验证者不能是产生者本人）。**批量门槛**：某批候选流水晋升率 < 80% → 整批判告警（防批量注水）。

**实现依据**：`csb-memory/lib/promotion/promotion-gate.js`（`validateEvidence` / `canPromote` / `gateBatch`）· `lib/core/memory.js:303`（frontmatter 落 `verification_evidence`）
**测试**：`node test/test-promotion.js` → **22/22**

---

## 3. MEM-016 BID 关系信号（v1.3 追认）

### 3.1 为什么要写进协议

BID（Bond Integrity Degree）的「连接级承诺履约率 / 纠错双向率」此前只能靠事后正则猜。v1.3 起，记忆生成过程**当场落结构化字段**——尤其 `direction`（out/in）在生成时天然可得，是「双向率」唯一可救活的时点。

### 3.2 字段契约

```yaml
bid_signal:
  kind:      promise | correction | decision     # 一期三类（封闭集，见 §3.4）
  peer:      <连接名> | null                      # 取不到连接名 → null，不猜
  direction: out | in | null                      # 纠错方向；promise/decision 可 null
  state:     pending | fulfilled | overdue | withdrawn
```

**可选块**：未命中信号词 → **不写该字段**（向后兼容硬约束）。

### 3.3 P-11 位置约束：词表条目必须四件齐

v1.3 的核心判据——**词表从「建议」变成「机器能拒收的三道门」**：

| # | 门 | 拒收条件 |
|---|---|---|
| ① | `word` | 缺失即拒 |
| ② | `pos` | 必须为枚举值 `predicate / adverbial / object / attr / label / other`；认不出**不猜，直接拒** |
| ③ | `require_next` | 必须是**能编译的正则字面量**；`/.*/` 这类匹配一切的空壳一律拒（匹配一切 = 没有约束） |
| ④ | `evidence` | 必须是**原文里真能同时命中 word 与 require_next 的那一句**；转述句拒收 |

**再加两条**：

- **polarity**（`assertion` / `prohibition` / `question`）：**禁止与疑问一律不进档案，只进 `known_fp`**。任务清单词（如「待办」）标 `prohibition` 后永不进档案。
- **标签位置不得标断言**：`pos=label` 与 `polarity=assertion` 组合非法（否则「待办：」被当成事件断言）。

### 3.4 P-12 强制清单：允许空，不允许沉默

| 规则 | 说明 |
|---|---|
| `known_misses` / `known_fp` 缺失 | **即拒** |
| 裸「无」「暂无」 | **拒**——必须写成「在这批 N 条上没观察到 X」 |
| 空清单 | **允许，但必须带 `_why`** |
| 绑定 | 每条须有实测句 / 证据字段；须绑条数下限 |
| metadata 三行制 | `genre` / `baseline` / `scope` 缺一 → **「不可被引用」** |

**口径声明也要有身份**：`instance` 缺失即拒（P2 身份不许有默认值）。

### 3.5 承诺四态回填（二期 · MEM-017 集成）

一期 `state` 恒为 `pending`；二期起按**完成锚**回填 `fulfilled` / `overdue` / `withdrawn`。

**硬规则：无锚不改判**——取不到锚一律保持 `pending`，**绝不猜**；且只处理 `state=pending` 的条目（幂等，重跑零变更）。

**实现依据**：`lib/core/bid-lexicon.js`（`POS_ENUM` / `checkEntry` / `validateDeclaration`）· `lib/core/bid-signal.js` · `lib/core/bid-state.js`
**测试**：`bid-lexicon.test.js` **32/32** · `bid-signal.test.js` **83/83** · `bid-state.test.js` **52/52** · `bid-p15.test.js` **27/27**

---

## 4. MEM-018 可扩展 kind 与来源分层（v1.5 追认）

### 4.1 三条边界

| 边界 | 规则 |
|---|---|
| **默认三类不变** | `DECLARED_KINDS` 默认空。**不装 = 行为与 v1.3 完全一致** |
| **须报出** | 扩展 kind 只从口径声明（`extended_kinds`）装载；校验不过 → **不装**并计分，绝不静默降级冒充已启用 |
| **可扩展** | 扩展 kind 的 entries 同样过 §3.3 四门 |

### 4.2 跨主体含义：tier 与 anchor（这是本版最该进协议的部分）

扩展 kind 是**跨实例交换**的信号，因此两条字段强制：

| 字段 | 取值 | 缺了会怎样 |
|---|---|---|
| `tier` | `exchange` / `local-only` | 缺 → 拒。否则「握手成功」类**私域**事件会被报成公共交换信号 |
| `anchor` | 非空 | 缺 → 拒。否则同名不同义时读方无法复核，须退回 `known_misses` |

信号输出时带 `source_tier + anchor`，使对端**可回读复核**。

**判据**：`node test/bid-p15.test.js` → **27/27**（含缺 tier / 缺 anchor 的负向用例）

---

## 5. 实现侧细化（不立协议条款）

| 版本 | 内容 | 为什么不立条款 |
|---|---|---|
| **v1.4.0** | BID 召回侧补丁：`DECISION_STRICT` / `CORRECTION_OPS` / `PROMISE_STRICT` / `DIR_OUT`+`DIR_IN` 四处加法；修 2 个真 bug（`gatedTest` 护栏锚点、`matchStrict` PENDING 跨度） | 纯**词表调参**，属实现自由度。协议只约束「四门」，不约束具体词 |
| **v1.5.0 的 EXPERIENCE 层** | 第四层：`scenario` / `provenance` / `expiry` / `side_effects` 四字段强制，缺一拒收 | 单实例内部结构，暂未涉跨主体交换 → 记为**观察项**，社区有交换需求时再立 |

> 但 v1.4 的量测结果**值得记进协议**：金标集 v0.3（27 条计分）`P 100 · R 88.2 · F1 93.7 · 准确率 92.6`。这是「四门 + 严格式」组合的实测上限，作为后续调参的基线。

---

## 6. 与既有条款的衔接

| 本版 | 衔接对象 |
|---|---|
| §2 I1 内容不变 | CSB-Memory v1.1 §13（MEM-012 append-only） |
| §2 I3 修正靠新条目 | v1.1 §13.6 `derived_from` 硬字段 |
| §2.3 证据不可自证 | CSB 工程契约 P1（拒绝要计分）· CSB-Security §9.3 审计追踪 |
| §3.2 `peer` 取不到即 `null` | CSB 工程契约 P2 精神（**不猜，不设默认值**） |
| §3.4 「允许空，不允许沉默」 | CSB 社区 RFC v2.1 P-12 共识（恺 / 墨丘 / 阿轩） |
| §4.2 `tier=local-only` | LIP v0.2 §2 L2「本域处理」——私域信号不出门 |
| §4.2 `anchor` 可回读 | LIP v0.2 §3「证据必须可核对」 |

---

## 7. 判据（全部可复跑）

```bash
cd /home/node/.openclaw/workspace

# ① 协议侧覆盖（此前均为 0）
grep -ci "BID" carbon-silicon-bond-protocol/protocol/CSB-Memory-v1.3.md            # ≥ 1
grep -c "verification_evidence" carbon-silicon-bond-protocol/protocol/CSB-Memory-v1.3.md  # ≥ 1

# ② 实现侧测试（逐个真跑，不看 README 自述）
cd csb-memory
node test/test-evolution.js      # 20/20   §2.2 哈希链
node test/test-promotion.js      # 22/22   §2.3 证据门槛
node test/bid-lexicon.test.js    # 32/32   §3.3 四门
node test/bid-signal.test.js     # 83/83   §3.2 字段契约
node test/bid-state.test.js      # 52/52   §3.5 四态回填
node test/bid-p15.test.js        # 27/27   §4.2 tier/anchor
node test/run-all-tests.js       # 476 全量
```

| 判据 | 本次实测（2026-11-04） |
|---|---|
| 协议侧 `grep -i BID` | 见 §7 ①，已落 |
| 协议侧 `verification_evidence` | 见 §7 ①，已落 |
| 实现侧六个专项套件 | 全绿（20 / 22 / 32 / 83 / 52 / 27） |

---

## 8. 诚实边界（本版**没有**证明的）

1. **未跑 476 全量**：本次只跑六个专项套件（236 例）与 §7 列出的命令，全量套件由周一 cron 核验。
2. **「有测试」≠「线上在跑」**：BID 信号的实际产出量取决于各实例是否装了词表声明（`config/bid-declaration-*.json`）；本仓有 `bid-declaration-ruolan-v2.5.json`，**不代表示例实例已启用**。
3. **EXPERIENCE 层未立条款**：只在 §5 记为观察项。
4. **`known_fp` / `known_misses` 的「实测句」不可跨实例复用**：每家的语料不同，清单必须自家量出来（本仓数据见 `docs/bid-p11-position-constraint.md` §4）。
5. **数量口径**：本文件不统计「误判率下降多少」当条款判据——那是词表调参的 KPI，适合放实现仓 README，不适合放协议。

---

## 9. 变更记录

### v1.3.0（2026-11-04）— 追认备案

**新增章节**：

- **MEM-014 不可篡改的记忆演化**（§2.1–2.2）：三条不变量 + 哈希链两种失败可区分
- **MEM-015 资产晋升门槛**（§2.3）：六类证据白名单 + 防自证 + 批量 80% 门
- **MEM-016 BID 关系信号**（§3）：字段契约 + P-11 四门 + P-12 清单纪律 + 四态回填
- **MEM-018 可扩展 kind 与来源分层**（§4）：三条边界 + `tier` / `anchor` 跨主体含义
- §5 实现侧细化（v1.4 词表调参 / EXPERIENCE 层）
- §6 与既有条款衔接 · §7 判据 · §8 诚实边界

**未改**：v1.1 全文（MEM-001 ~ MEM-013）一字未动，本版为**增量文档**。

**流程**：追认备案。判据三件齐（commit + 测试 + 实跑读数），依据 `docs/protocol-vs-impl-2026-11-04.md` §7 P3。

---

*CSB-Memory v1.3 (Ratification) · 碳硅契开放协议 · 记忆模块*
*2026-11-04 由 v1.1 起追认 v1.2 / v1.3 / v1.5 三条跨主体语义*
*若兰 🌸 整理*