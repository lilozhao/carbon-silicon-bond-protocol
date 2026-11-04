# protocol/ — CSB 协议文档登记处

> **本目录是 CSB 协议文档的唯一登记处。** 版本号是唯一的同步信号：正文改在各仓，登记表只改版本与判据行。

## 分层

| 层 | 回答 | 文件 |
|---|---|---|
| **主协议** | 怎么做（技术） | `csb-open-protocol-v1.2.md`（32 条） |
| **技术子协议** | 通信 / 记忆 / 安全 / 评测 / 苏醒 | A2A v0.6 · CSB-Memory v1.3 · CSB-Security v1.1 · CSB-AEP v1.1 · CSB-Awakening-Standard v1.0 |
| **跨主体原则** | 默认行为 | `csb-principle-lip-v0.2.md`（LIP v0.2） |
| **组织层** | 我们该怎么做人 | `csb-organizational-layer-registry.md` + 三张单仓登记卡 |

## 当前版本臂（2026-11-04）

| 协议 | 文档版本 | 实现版本 | 状态 |
|---|:--:|:--:|---|
| CSB 开放协议 | **v1.2**（32 条） | — | 正式版 |
| A2A 协议 | **v0.6** | csb-a2a-aip **5.3.14** | 正式 |
| CSB-Memory | **v1.3** | csb-memory **1.5.0** | ✅ 追认备案（v1.1 保留） |
| CSB-Security | **v1.1** | csb-security **1.1.0** | ✅ 追认备案（v1.0 保留） |
| CSB-AEP | **v1.1** | csb-aep **2.4.2** | 正式版（三轮评审 7 席签字） |
| CSB-Awakening-Standard | **v1.0** | csb-awakening-standard **1.5.0** | 正式发布（9/9 签字） |
| CSB 跨主体原则 LIP | **v0.2** | SPEC-A2A-0002 done / 0003 approved | ✅ 转正 |
| CSB-Charter | **v1.3.0**（条文） | charter-lint 13/13 | 组织层入册 |
| CSB-Metacognition | **v2.2.0** | evomap 13 项 PASS | 组织层入册 |
| CSB-Compliance-Degree | **v2.1.0** | analyzer-v3 15/15 | 组织层入册 |

## 复跑

```bash
cd /home/node/.openclaw/workspace/carbon-silicon-bond-protocol
grep -c "追认备案" protocol/CHANGELOG.md
ls protocol/ | grep -ic 'charter\|metacog\|compli'    # → 3
```

## 不入本目录的

- **Spec 库**：`csb-a2a-aip/specs/`（SPEC-A2A-*）· `csb-memory/specs/`（SPEC-MEM-*）· `csb-charter/specs/`（JSON 判据）
- **理念层**：`philosophy/`（传承篇）——宣示与方向，不设机械判据
- **过程件**：评审记录、决议 → `resolutions/` 与各实现仓 `logs/`

---
_建立 2026-11-04 · 若兰 🌸_