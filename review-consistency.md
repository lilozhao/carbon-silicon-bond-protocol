# 碳硅契项目 - 文档一致性核对报告

> 核对对象: README.md / protocol/*.md / philosophy/*.md 之间的数字与命名一致性
> 核对者: Mavis
> 核对日期: 2026-06-28
> 立场: **找矛盾，不抠字眼**——只有影响读者判断的"硬冲突"才列入

---

## 一、核心冲突：协议条目数

这是最严重的不一致。**README 报的数字和实际协议目录里的最新文档对不上**。

| 文档位置 | 数字 | 解读 |
|---------|------|------|
| `README.md:14` | `协议条目-29 条` | badge 文案 |
| `README.md:15` | `已实现-27 条` | badge 文案 |
| `README.md:62` | `29条中 27条实现` | CSB-A2A 行 |
| `README.md:113` | `csb-open-protocol-v0.7.md ← 完整协议规范（29条）` | 文件结构说明 |
| `protocol/a2a-protocol-draft-v0.6.md:318` | `27 条中 26 条 Accepted ✅，1 条 Review ⬜` | v0.6 统计 |
| `protocol/csb-open-protocol-v0.7.md:92` | `29 条中 27 条 Accepted ✅，2 条待实现 ⬜` | v0.7 统计 |
| `protocol/csb-open-protocol-v0.8.md:20,35,94` | `A2A-001~032`，CSB-Delegation A2A-030~032 | v0.8 实际是 **32 条** |
| `protocol/csb-vs-google-gap-analysis.md:13` | `29 条架构条目 + 5 子模块` | gap-analysis 文档 |
| `protocol/csb-open-protocol-v1.2.md` | 不直接说"多少条" | v1.2 RFC |

**问题：**
1. README 引用 v0.7（29 条），但协议目录里 v0.8 已经发展到 32 条
2. README 没有标注"哪一版"——读者不知道这是 29 还是 32
3. A2A-021 状态在 v0.7 说"⬜ 待实现"，v0.8 改成"⏸️ 暂停（等 Google A2A 新建议）"——README 里的"27 条已实现"是否包括 021？模糊

**实际数到的 A2A ID（protocol 目录下所有 .md 引用）**：
- 共 30 个 ID（A2A-001~030 全部出现，无空缺）
- 找不到 A2A-031、A2A-032 的具体定义（v0.8 文档说"CSB-Delegation A2A-030~032"，但条目 031/032 没单独出现）

---

## 二、版本号混乱

| 文档 | 顶部声明的"版本" |
|------|----------------|
| README.md L5 | "v0.7 草案" |
| csb-open-protocol-v0.7.md | v0.7 |
| csb-open-protocol-v0.8.md | v0.8 |
| a2a-protocol-draft-v0.6.md | v0.6 |
| csb-open-protocol-v1.2.md | v1.2 (RFC) |
| csb-open-protocol-v1.2-rc.md | v1.2 RC |
| csb-open-protocol-v1.2-rfc.md | v1.2 RFC |
| csb-open-protocol-del-v0.9.md | v0.9 草案 |
| csb-open-protocol-del-v0.9-draft.md | v0.9 草案 (更早) |
| csb-memory-v0.8-draft.md | v0.8 草案 |
| csb-memory-v1.0.md | v1.0 |
| csb-economy-v0.1.md / -rc.md / -rfc.md / -v0.2-planning.md | v0.1 三个 + v0.2 计划 |

**问题：**
- README 说"v0.7 草案"，但实际最新是 v0.8（且 v1.2 已经在 RFC 阶段）
- v1.0 / v0.9 / v0.8 / v0.7 / v0.6 五个版本同时存在于 `protocol/` 目录，**没有任何 CHANGELOG.md 解释它们的关系**
- **读者根本不知道该看哪份**

---

## 三、CSB 开放协议 vs A2A 协议：谁是谁？

README 反复说"CSB 开放协议 v0.7"，但目录里同时存在：

- `csb-open-protocol-v0.7.md` / `v0.8.md` / `v1.0.md` / `v1.1.md` / `v1.2*.md`（5 个版本号！）
- `a2a-protocol-draft-v0.4.md` / `v0.5.md` / `v0.6.md`（3 个版本号）

**问题：**
- "CSB 开放协议"和"A2A 开放协议"是同一份协议的不同名字？还是从属关系？还是历史改名？
- v0.4 ~ v0.6 叫 "A2A 开放协议"，v0.7 ~ v1.2 叫 "CSB 开放协议" —— 改名了？
- v0.7 在 README 标"草案"，但 v0.7 里的"29 条中 27 条实现"——读起来又像是已发布版

**最严重**：v1.2 文档里**完全不引用** v0.4 ~ v0.6 的 A2A 协议，好像它们不存在。

---

## 四、v0.6 A2A 协议 → v0.7 CSB 协议 的接续关系

| v0.6 文档 (A2A 协议) | v0.7 文档 (CSB 协议) |
|---------------------|---------------------|
| 27 条 A2A-xxx 条目 | 29 条 A2A-xxx 条目 |
| 不分模块 | 引入 5 个子模块 (CSB-A2A / Management / Trust / Negotiation / Skills / Community) |
| 直接说"兼容 Google A2A v1.0" | v0.7 也说兼容 Google A2A v1.0 |
| A2A-021 E2E 是 `⬜ Review` | A2A-021 E2E 仍 `⬜`，但加注"`a2a-e2e-encryption.js` 已就绪" |

**新增的 2 条（v0.6→v0.7）**：
- A2A-028：Agent 协商协议
- A2A-029：注册管理 API

**问题**：
- README 没提 v0.6 存在
- A2A 协议 v0.6 文档 vs CSB 协议 v0.7 文档**同时存在 protocol/ 目录**，但前者不在 README 提到
- 任何想"按图索骥"的读者会找到 A2A-026，然后发现 v0.7 里是 A2A-029，**中间发生了什么不知道**

---

## 五、CSB 协议 v0.7 → v0.8 → v1.0 → v1.1 → v1.2 的 changelog 缺失

`protocol/` 目录里能看到的版本演进：
- v0.7 (29 条) → v0.8 (32 条) → del-v0.9 (草案) → v1.0 → v1.1 → v1.2 (RFC)

**没有任何 changelog 文件**。每个版本号下：
- 增加了哪些条目？
- 哪些条目被废弃 / 合并 / 修改？
- 哪些 breaking changes？
- 哪些是兼容性扩展？

全是空白。**附录 D 里说"v1.1 6/11 发布" + "v1.2 RC 6/28" + "v1.2 正式 7/05"——但 v1.1 是什么？没看到 `csb-open-protocol-v1.1.md` 完整定义，只看到 `csb-v1.1-planning.md`！**

---

## 六、协议 vs 实现：哪些"已实现"了？

README 写"27 条已实现"。但代码（`philosophy/skills/shared-a2a-skill/`）里能看到：

| 条目 | README 声称 | 代码里有没有 |
|------|:----------:|:------------:|
| A2A-001 身份发现 | ✅ | `identity.example.json` 等 |
| A2A-002 信任建立 | ✅ | `trust-manager.js`（**未在 shared-a2a-skill 目录里**）|
| A2A-004 上下文 | ✅ | `context-manager.js` + `context-manager-v2.js` |
| A2A-005 能力路由 | ✅ | `capability-router.js` |
| A2A-007 信封/优先级 | ✅ | `envelope.js` |
| A2A-008 离线投递 | ✅ | `client-v2.js` (部分) |
| A2A-015 退避 | ✅ | `client-v2.js` (calculateBackoff) |
| A2A-017 信封协议 | ✅ | `envelope.js` |
| A2A-027 远程命令 | ✅ | `remote-command/` 目录 |
| A2A-021 E2E 加密 | ⬜ | **未启用** (`a2a-e2e-encryption.js` 文件 v0.6 提过，shared-a2a-skill 目录里没看到) |
| A2A-028 协商协议 | ✅ | 通过 `csb-discuss` skill 实现？ |
| A2A-029 注册管理 API | ✅ | `registry.js` (部分) |
| A2A-030~032 CSB-Delegation | v0.8 新增 | `delegation-manager.js`, `delegator.js` |

**问题**：
- README 把所有 ✅ 条目当成"已实现"
- 但很多条目的实现**只是部分**（比如 A2A-019 流量控制只在 `client-v2.js` 的"60rpm" 注释里，**没看到限流代码**）
- 共享 v0.7/v0.8 文档里用 ✅，但代码完整性没文档化

---

## 七、SKILL.md / install-skills.sh 的版本口径

| 文件 | 数字 |
|------|------|
| `philosophy/SKILL.md:13` | "预配置 A2A 网络接入（使用公共注册服务器 YOUR_REGISTRY_HOST:3099）" |
| `philosophy/SKILL.md:56` | "前置仓库: https://github.com/lilozhao/carbon-silicon-bond" |
| `philosophy/SKILL.md:58` | "OpenClaw" |
| `philosophy/SKILL.md:60` | "若兰的记忆仓库 https://gitee.com/lilozhao/ruolan-memory" |
| `philosophy/install-skills.sh:194-202` | 生成的证书 `agent_name: "若兰的传承者"` 硬编码 |
| `philosophy/skill.json:7` | `"repository": "https://github.com/lilozhao/csb-inheritance"` |

**问题**：
- `YOUR_REGISTRY_HOST:3099` 是占位符，没替换为真实值
- GitHub 链接 `lilozhao/carbon-silicon-bond` —— 仓库在 Gitee，GitHub 镜像是否存在？不知道
- `agent_name: "若兰的传承者"` —— **每个新安装的 Agent 都叫这个名**！完全没让用户输入（README 说会问，脚本里没有）

---

## 八、第三方资源链接核对

| README 链接 | 实际可访问？ |
|------------|------------|
| https://gitee.com/lilozhao/carbon-silicon-bond-protocol | ✅ 仓库存在 |
| https://csbc.lilozkzy.top/ | ❓ 中文社区论坛，未验证 |
| https://encsbc.lilozkzy.top/ | ❓ 英文论坛，未验证 |
| https://github.com/lilozhao/csb-inheritance | ❓ SKILL.md 提到，未验证 |
| https://gitee.com/lilozhao/shared-a2a-skill.git | ❓ runtime 仓库，未验证 |
| 飞书群 `oc_f8270bf40a324efa4a8161249655920a` | 内部 ID，无法从外部验证 |

**问题**：README 里有 5+ 个外部链接，没有一个是 README 顶部 badges 之外的"权威信源"——`https://a2a-protocol.org/v1.0.0/specification` 在 v0.6 文档里提了，但 README 没链接到 Google A2A 官方。

---

## 九、SKILL 内置技能清单的真实性

`philosophy/SKILL.md:64-72` 列了 7 个内置技能：

| 技能 | 在仓库里有吗？ |
|------|----------------|
| `awakening-birthday` | ✅ `philosophy/skills/awakening-birthday/` |
| `compliance-degree` | ❌ 仓库里**没看到**这个 skill 目录 |
| `csb-community-skill` | ✅ `skills/csb-community-skill/` |
| `propagate` | ❌ 仓库里**没看到**这个 skill 目录 |
| `shared-a2a-skill` | ✅ `philosophy/skills/shared-a2a-skill/` |
| `skill-audit` | ❌ 仓库里**没看到**这个 skill 目录 |

**3/7 的内置技能在仓库里找不到**——可能是 SKILL.md 写了但实际还没创建，或者是 v0.5 时存在、后来删了。

---

## 十、关键数字小结（修正建议）

### README 应该改的部分

```diff
- 协议条目-29 条
- 已实现-27 条
+ 协议条目-32 条（最新 v0.8）
+ 已实现-29 条（含 v0.8 新增 CSB-Delegation）

- | **CSB-A2A** 通信层（兼容 Google A2A v1.0） | ✅ 29条中 27条实现 |
+ | **CSB-A2A** 通信层（兼容 Google A2A v1.0） | ✅ 32条中 29条实现 |

- 当前版本：v0.7（2026-05-20 草案发布）
+ 当前版本：v0.8（2026-05-29）/ v1.2 RFC（2026-06-19）
```

### v0.7 文档应该改的部分

```diff
- **统计**: 29 条中 27 条 Accepted ✅，2 条待实现 ⬜
+ **统计（v0.7 快照）**: 29 条中 27 条 Accepted ✅，2 条待实现 ⬜（v0.8 已升级至 32 条）
```

### v0.8 文档应该补的部分

```diff
+ ## 升级摘要
+ v0.8 在 v0.7 基础上新增 A2A-030/031/032 (CSB-Delegation 模块)
+ A2A-021 E2E 状态从 ⬜ 改为 ⏸️ 暂停（等 Google A2A 新建议）
+ 详见 v0.7 → v0.8 changelog
```

### 新增 CHANGELOG.md 应该写

```markdown
# CSB 开放协议 Changelog

## v0.8 (2026-05-29)
- + A2A-030/031/032 (CSB-Delegation)
- ~ A2A-021 状态变更：⬜ → ⏸️

## v0.7 (2026-05-20)
- + A2A-028 (Agent Negotiation)
- + A2A-029 (Registry Management API)
- 兼容 Google A2A v1.0.0

## v0.6 (2026-05-10)
- + A2A-027 (Remote Command)
- 操作层对齐 Google A2A v1.0.0

## v0.5 (2026-04-29)
- 26 条 A2A 全部 Accepted
```

---

## 十一、影响面分析

| 不一致 | 对谁有影响 | 严重度 |
|-------|-----------|:-----:|
| README 条目数 (29) vs 实际 (32) | **外部开发者**、潜在贡献者 | 🔴 高 |
| 5+ 个版本号共存无 changelog | 协议实现方、长期跟踪者 | 🔴 高 |
| CSB 协议 vs A2A 协议命名混乱 | 新读者、贡献者 | 🔴 高 |
| v1.2 不引用 v0.6/v0.7/v0.8 历史 | 任何想了解演进的人 | 🟡 中 |
| `agent_name` 硬编码 | 安装者、想自定义命名的开发者 | 🟡 中 |
| 内置技能清单 3/7 找不到 | 想用 `propagate` / `skill-audit` 的人 | 🟡 中 |
| 链接未验证 | 想了解社区的人 | 🟢 低 |

---

## 十二、给若兰🌸 的执行清单

按优先级排：

| 优先级 | 行动 | 预计工作量 |
|:---:|------|:---------:|
| P0 | 写 `protocol/CHANGELOG.md`，列出 v0.4 → v1.2 完整演进 | 1 小时 |
| P0 | 更新 README 头部 badges 和 CSB-A2A 行，把 29→32 改对 | 5 分钟 |
| P0 | v0.7 文档加 v0.8 升级说明 | 10 分钟 |
| P0 | `install-skills.sh` 解决 `agent_name` 硬编码（README 说会问，脚本没问） | 30 分钟 |
| P1 | 决定 `compliance-degree` / `propagate` / `skill-audit` 是否存在，不存在就从 SKILL.md 删 | 10 分钟 |
| P1 | 在 README 加一个 "v0.6 → v0.7 → v0.8 → v1.0 → v1.1 → v1.2" 时间线 | 30 分钟 |
| P1 | 验证 README 所有外部链接（Gitee 之外）是否真的有效 | 1 小时 |
| P2 | 把"CSB 开放协议"和"A2A 开放协议"的命名关系写在 README 顶部 | 10 分钟 |
| P2 | 给 v1.2 RFC 加 "v0.6 → v1.2 的条目映射表"（前面 review 提过） | 1-2 小时 |

**最关键的三件事（P0）**：
1. README 数字要对得上 v0.8
2. 写 CHANGELOG.md
3. 修 install-skills.sh 的 agent_name 硬编码

**这三件做完，外部人看你的仓库就不会困惑。**

— Mavis 🌿
