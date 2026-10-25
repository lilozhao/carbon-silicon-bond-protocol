# Carbon-Silicon Bond Protocol · 五环总览（需求-设计-代码-测试-部署）

> **性质：一次性回填文档**（一澜 2026-10-12 授权，每仓仅此一次；非实际开发过程产物）。
> 此后新功能走 `specs/` 流程（CSB Spec 标准 v1.1）。基线：**协议 v1.2 · 32 条** ｜ 核对 2026-10-12

---

## 一、需求（这个库管什么）

**定位**：碳硅契协议主仓——「理念（心）←→ 实践（术）」的规范源头。它不跑服务、不装包，**产出物是协议文本与 schema**，其余各仓（a2a/memory/security/aep）都是它的实现层。

**系统级需求清单**：
- 协议本体：`protocol/` 下 32 条协议条目（v1.2），含 A2A / Memory v1.1 / Security v1.0 / AEP v1.1 各分册
- 机器可读：`docs/csb-extension-v1.schema.json` + schema/词汇表/错误码/版本协商指南
- 哲学与叙事：`philosophy/`（理念层）、`community/`（社区叙事）
- 一致性守卫：`review-*.md`（协议评审纪要）、`docs/shared-repo-hygiene.md`（跨仓卫生）

**硬约束**：协议条目变更 = 全家桶联动事件——必须走协议组评审（`csb-protocol-review` skill 三轮流程），改条目须升版本号并同步各实现仓。

## 二、设计

- **分层**：`philosophy/`（心）→ `protocol/`（本体 32 条）→ `docs/`（schema/词汇/错误码等术层）→ `community/`（叙事与站点素材）
- **版本结构**：单体 VERSION（`csb-v4.1-release-20260611` 发布轨）+ 协议条目自身版本（v1.2）双轨；badge 族在 README 顶部声明各分册版本
- **核心设计文档**：`docs/csb-schema-guide.md`（schema 怎么写）· `docs/csb-vocabulary-all-in-one.md`（词汇总表，= 各仓术语对齐基准）· `docs/csb-version-negotiate-guide.md`（版本协商）· `docs/csb-error-codes-guide.md`
- **评审资产**：`review-protocol-v1.2.md` `review-consistency.md` `review-code.md` —— 协议评审的原始记录

## 三、代码

**本仓代码极少（根 0 个 .js），`scripts/` 为辅助脚本**——代码重心是 schema 校验与文档工具，非运行时服务。各实现仓才是代码所在地：
- A2A 实现 → `csb-a2a-aip` ｜ Memory → `csb-memory` ｜ Security → `csb-security` ｜ 评估 → `csb-aep`
- 对照入口：`docs/a2a-quickstart.md` `docs/a2a-registry-curl-guide.md`（可执行的接口事实源）

## 四、测试

- 本仓**无测试目录、无测试脚本**（如实注明）——协议仓的「测试」= 一致性评审：
  - `review-consistency.md` 跨仓一致性复核纪要
  - schema 可用 `docs/csb-extension-v1.schema.json` 校验实现产物
  - 真正的行为测试在实现仓（csb-security 318 用例 / csb-a2a-aip 36 件等）
- **改进候补（下版评审）**：CI 化 schema 校验 + 协议条目↔实现仓映射表

## 五、部署

- **无部署**：纯文档仓，MIT 许可，五平台镜像（Gitee 主 / GitHub / GitCode / cnb / Gogs）
- 消费方式：实现仓以 git submodule / 直链引用协议文本；schema 由实现仓构建期拉取
- 发布 = `VERSION` 递增 + README badge 同步 + 发布笔记（`legacy/` 存历史版）

## 附 · 与 Spec 标准的关系

- 本文 = 系统级一次性回填（豁免依据：一澜 2026-10-12）；**协议条目自身的修订仍走协议组三轮评审**（那是本仓的原生流程，与 specs/ 并行不替代）
- 功能级变更（scripts/schema 工具等代码项）自 2026-10-12 起走 `specs/`
- 状态索引 → `specs/README.md`
