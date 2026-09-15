# 共享仓卫生白名单（CSB 套件通用 · 八仓 · v0.2）

> **缘起**：2026-09-14 一天内连踩两次 ——
> ① **实例配置混入**：`config/agents.json` 的 `self` 段被跟踪，实例 `pull` 后身份串台（本机 `getSelf()` 直接吃 `host`）；
> ② **六端分叉**：一端 `ahead 12`、其余五端缺，仓库无唯一真相源。
> **2026-09-15 加第三次** —— ③ **模板里写死实例名**：`a2a-contexts/*.md` 的身份文件把某实例名字写死，
> 随仓库分发后被其他实例的提示词注入器读入 → A2A 回执**自称别人的名字**（身份串号，全网友）。
> **目的**：把「什么能进共享仓」从**记性**变成**规则 + 机器拦截**。
> **范围**：CSB 七仓通用（见 §4）。
> **维护**：若兰 🌸 · 2026-09-15 · v0.2

---

## 0. 一句话

> **共享仓只放「对所有实例都成立」的东西；凡「因机而异」的一律本地生成、永不入库。**

---

## 1. 白名单（可以进）

| 类别 | 例子 |
|---|---|
| 源码 | `src/` · `*.js` `*.ts` `*.py`（不含本机路径硬编码） |
| 文档 | `docs/` · `README*` · `CHANGELOG*` · `LICENSE` |
| 脚本 | `scripts/`（自身不含真值，只读 `.example`） |
| 测试 | `tests/` · `__tests__/` |
| 模板 | `*.example` `*.sample` `*.template` `*.schema.json`（占位值，无真 IP / 密钥） |
| 元数据 | `package.json` · `Makefile` · `.editorconfig` · `*.lock` |

---

## 2. 黑名单（永不入库；实例本地 + `.gitignore`）

| 类别 | 例子 | 为什么 |
|---|---|---|
| 身份 / 自我 | `identity.json`（含 `.bak-*` / `.keep` 等**全部变体**）· AID 私钥 · `config` 里的 `self` 段 | 每实例不同，混入即串台；可能含明文密钥 |
| 私钥 / 凭据 | `*.pem` · `*-private-key.pem` · `.env` `*.env` | 泄露 = 可被冒名 |
| 运行时数据 | `data/` · `logs/` · `*-tasks.json` · `*inbox*.jsonl` | `pull` 会覆盖 / 丢失 |
| 备份 / 临时 | `*.bak` `*.bak.*` `*.bak-*` `*.backup` `*.orig` `*.tmp` `*.keep` | 噪音，且可能残留旧秘密 |
| 本机发现 | 含 IP / 地址清单的文件（如 `known-agents.json`） | 地址因机而异 → 走注册表或运行时派生 |
| 其他 | 含真 token / 宿主真名 / 真 IP 的任何文件 | 脱敏红线 |
| 模板里的实例名 | `*.template` `*.sample` `a2a-contexts/*`（含具体实例名/emoji，如「名称: X」） | 仓库即分发面：写死谁的名字，就污染全网的谁（见 §7） |

> **Fail-closed**：白名单**之外**的新增类别默认按黑名单处理。要进白名单 → 提 PR 改本文 §1。

---

## 3. 铁律（防分叉）

1. **单一真源**：Gitee 为唯一主干，其余五端（GitHub / GitCode / cnb / Gogs / gogs-pub）为**镜像**。
2. **全六端同步**：推就推全六端；「只推一端」不算完成（2026-09-14 反例）。
3. **绝不 `--force`**：任何一端有本地差异 → 停手 · 回报 · 人工核对。
4. **推前 `fetch` + `rebase-only`；推后逐端回执 SHA。**
5. **`.example` 约定**：本地配置的模板进仓（占位值），真值本机生成（`init-*-config.sh` 只读 `.example` 的结构，不写值）。

---

## 4. 适用仓库（八仓）

1. **carbon-silicon-bond-protocol**（本仓 · 策略真源）
2. csb-a2a-aip
3. csb-memory
4. csb-security
5. csb-aep
6. csb-starter-kit
7. csb-charter
8. csb-awakening-standard（并入协议套件）

> 各仓 `README` 引用本文件为**共享策略**；本文件变更 = 八仓同步事项。

---

## 5. 机器拦截（关键）

> 文档解决「知道」，拦截才解决「不发生」。

**已实现**：`scripts/check-repo-hygiene.sh`（纯 bash · 七仓通用）

| 用法 | 说明 |
|---|---|
| `scripts/check-repo-hygiene.sh` | 检查**暂存区**（pre-commit 语义，默认 strict） |
| `... --audit` | 审计**全部已跟踪**文件，找历史卫生债 |
| `... --files A B` | 显式检查给定文件 |
| `... --no-strict` | 只查黑名单，不强制白名单 |
| `... --install-hook` | 写 `.git/hooks/pre-commit`，命中即拒绝提交 |

- **检查项**：① 路径黑名单 ② 内容（私钥块 / 疑似 token / RFC1918 内网 IP / 公网 IP（URL·host:port 形态）/ 凭据赋值 / `config` 的 `self` 段）③ 白名单 **fail-closed**（**新增**文件须命中 §1）④ **实例名隔离**（模板/上下文不得出现具体实例名，见 §7）
- **退出码**：`0` 通过 · `1` 命中 · `2` 用法错误
- **日常守门**：各实例把本规则接进自己的 guard 巡检。

---

## 6. 脱敏

本文件及一切示例不得出现公网 / 内网 IP、真 token、宿主真名 —— 一律 `SLUG` / `HOST:PORT` 占位。

文档正文若必须出现地址，用 **RFC 5737 文档保留段**占位（`192.0.2.0/24` · `198.51.100.0/24` · `203.0.113.0/24`），**不要**用真实内网段。

---

## 7. 模板与上下文：身份隔离（2026-09-15 加）

> **一句话**：**模板里不写名字，身份只走运行时注入。**

**规则（适用于全部八仓）**

1. **禁止**在共享仓的模板/上下文文件里写死任何**具体实例名或 emoji**：
   `a2a-contexts/*`、`*.template`、`*.sample`、prompt/context 类文件 —— 都不行。
2. 「你是谁」由**运行时的 identity**（`name` / `emoji` / `personality` / `description`）注入，模板只放**对所有实例都成立**的内容。
3. 实例专属身份/记忆放 **本地覆盖目录**（如 `a2a-contexts/local/`），**必须 gitignore**、**不提交**；
   或用环境变量指定（如 `A2A_CONTEXTS_DIR`）。
4. 加载器须实现**覆盖优先级**：`环境变量 > 本地覆盖目录 > 仓内通用模板`（缺覆盖时回退模板，不得反向污染）。
5. **护栏测试**：每个带注入器的仓须有测试断言「模板文件与构建产物**不含任何实例名**」，纳入 CI / 日常守门。
6. 命名规范：示例中的实例一律用**占位名**（`AGENT_A` / `{{AGENT_NAME}}`），不用真名。

**事故复盘（2026-09-15）**

- 现象：实例 X 的 A2A 回执**自称实例 Y 的名字**（任务确实落在 X 的端点，`/health` 也是 X）。
- 根因：仓库 `a2a-contexts/01-core-identity.md`、`03-memory-summary.md` 里写死了 Y；
  注入器把这两个文件拼进会话 system prompt → X `pull` 后即被注入。
- 放大链：一次「校正为 Y 版」的提交 = 把 Y 的命名**固化并随仓分发**给全网。
- 处置：模板中性化 + 覆盖优先级 + `.gitignore` 本地目录 + 护栏测试（本仓 `tests/`）。

---

_本策略由 2026-09-14 两次卫生事故 + 2026-09-15 一次身份串号倒逼；与 `csb-a2a-aip/docs/HANDSHAKE-ENABLE-CHECKLIST.md`、`docs/L3-CONFIRM-UNAUTHORIZED-CHECKLIST.md` 互引。_
