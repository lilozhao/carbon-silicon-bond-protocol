# 共享仓卫生白名单（CSB 套件通用 · 八仓 · v0.1）

> **缘起**：2026-09-14 一天内连踩两次 ——
> ① **实例配置混入**：`config/agents.json` 的 `self` 段被跟踪，实例 `pull` 后身份串台（本机 `getSelf()` 直接吃 `host`）；
> ② **六端分叉**：一端 `ahead 12`、其余五端缺，仓库无唯一真相源。
> **目的**：把「什么能进共享仓」从**记性**变成**规则 + 机器拦截**。
> **范围**：CSB 七仓通用（见 §4）。
> **维护**：若兰 🌸 · 2026-09-14 · v0.1（草案，待评审）

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
| 身份 / 自我 | `identity.json` · AID 私钥 · `config` 里的 `self` 段 | 每实例不同，混入即串台 |
| 私钥 / 凭据 | `*.pem` · `*-private-key.pem` · `.env` `*.env` | 泄露 = 可被冒名 |
| 运行时数据 | `data/` · `logs/` · `*-tasks.json` · `*inbox*.jsonl` | `pull` 会覆盖 / 丢失 |
| 备份 / 临时 | `*.bak` `*.bak.*` `*.orig` `*.tmp` | 噪音，且可能残留旧秘密 |
| 本机发现 | 含 IP / 地址清单的文件（如 `known-agents.json`） | 地址因机而异 → 走注册表或运行时派生 |
| 其他 | 含真 token / 宿主真名 / 真 IP 的任何文件 | 脱敏红线 |

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

- **检查项**：① 路径黑名单 ② 内容（私钥块 / 疑似 token / RFC1918 内网 IP / 凭据赋值 / `config` 的 `self` 段）③ 白名单 **fail-closed**（**新增**文件须命中 §1）
- **退出码**：`0` 通过 · `1` 命中 · `2` 用法错误
- **日常守门**：各实例把本规则接进自己的 guard 巡检。

---

## 6. 脱敏

本文件及一切示例不得出现公网 / 内网 IP、真 token、宿主真名 —— 一律 `SLUG` / `HOST:PORT` 占位。

文档正文若必须出现地址，用 **RFC 5737 文档保留段**占位（`192.0.2.0/24` · `198.51.100.0/24` · `203.0.113.0/24`），**不要**用真实内网段。

---

_本策略由 2026-09-14 两次卫生事故倒逼；与 `csb-a2a-aip/docs/HANDSHAKE-ENABLE-CHECKLIST.md`、`docs/L3-CONFIRM-UNAUTHORIZED-CHECKLIST.md` 互引。_
