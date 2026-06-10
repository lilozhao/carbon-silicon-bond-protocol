# CSB 开放协议 v0.9 — DEL 模块

> **CSB Delegation Module v0.9**
> 版本: 0.9.0 | 2026-06-10
> 维护者: 若兰 🌸
> 状态: **✅ 发布版 — 已发布**
> 前身: v0.8 DEL-001~003 (2026-05-23)
> 决议: DEL-010v2~013（全体一致通过）
> 签字: ✅ 一澜 (2026-06-10)

---

## 版本说明

### v0.9 DEL 模块新增内容

| 编号 | 名称 | 来源 | 状态 |
|:----:|:-----|:----:|:----:|
| **DEL-001~003** | 授权委托基础机制（继承 v0.8） | 继承 | ✅ 已定 |
| **DEL-004** 🆕 | 委托冲突解决 | DEL-010v2 决议 | 🖊️ 草案 |
| **DEL-005** 🆕 | 跨域委托（Cross-Domain Delegation） | DEL-011 决议（4票A） | 🖊️ 草案 |
| **DEL-006** 🆕 | 委托身份验证与签名 | DEL-012 决议（全票A） | 🖊️ 草案 |
| **DEL-007** 🆕 | DEL × MEM 接口对齐 | DEL-013 决议（全票A） | 🖊️ 草案 |
| **DEL-008** 🆕 | A2A-Push 推送通知 | v0.8 遗留 | 🖊️ 草案 |

### 协议架构更新

```
CSB 开放协议 v0.9（DEL 模块草案）
└── CSB-Delegation（授权委托）
    ├── DEL-001  授权委托基础（继承 v0.8）
    ├── DEL-002  授权委托消息头格式（继承 v0.8，扩展 scope 映射）
    ├── DEL-003  授权证书与验证（继承 v0.8）
    ├── DEL-004  委托冲突解决 🆕
    │   ├── 4.1 冲突类型定义
    │   ├── 4.2 冲突等级
    │   ├── 4.3 裁定方法（A 为主 + C 为辅 + Origin 兜底）
    │   ├── 4.4 定量判定标准
    │   └── 4.5 共识投票机制（墨丘 🧙 建议）
    ├── DEL-005  跨域委托 🆕
    │   ├── 5.1 域（Domain）定义
    │   ├── 5.2 信任链模型
    │   ├── 5.3 跨域委托流程
    │   ├── 5.4 沙箱隔离与安全边界
    │   └── 5.5 身份映射与 scope 转换
    ├── DEL-006  委托身份验证与签名 🆕
    │   ├── 6.1 Ed25519 轻量签名方案
    │   ├── 6.2 JWT 格式约束
    │   ├── 6.3 防重放攻击机制（nonce + timestamp）
    │   ├── 6.4 公钥生命周期管理
    │   └── 6.5 Agent DID 绑定
    ├── DEL-007  DEL × MEM 接口对齐 🆕
    │   ├── 7.1 委托记录自动入记忆
    │   ├── 7.2 记忆查询 + 委托索引
    │   ├── 7.3 记忆刻印分级（明德 📜 建议）
    │   └── 7.4 审计追踪
    └── DEL-008  A2A-Push 推送通知 🆕
        ├── 8.1 Push 通道分层方案
        ├── 8.2 委托推送场景
        └── 8.3 离线投递保障
```

---

## DEL-001 授权委托基础（继承 v0.8）

完整内容继承自 v0.8，不做变更。

### 核心概念

- **授权委托**：人类 Origin 将自身权威委托给特定 Agent
- **委托类型**：全局委托 / 范围委托 / 单次委托
- **三方模型**：Origin（授权者）→ Agent A（受托者）→ Agent B（执行者）

---

## DEL-002 授权委托消息头格式（继承 v0.8，扩展 scope 映射）

### 2.1 ~ 2.3 继承 v0.8

完整内容继承。本版本新增 **scope 映射规则**（跨域委托所需）。

### 2.4 Scope 映射规则（新增）

当跨域委托发生时，不同域的权限命名空间需要映射。Scope 映射表声明格式：

```json
{
  "scope_mapping": {
    "source_domain": "domain-a",
    "target_domain": "domain-b",
    "rules": [
      {
        "source_scope": "csb-protocol",
        "target_scope": "protocol-management",
        "translation": "exact | prefix | custom",
        "effect": "allow | restrict | deny",
        "auto_map": true
      }
    ],
    "default_effect": "restrict"
  }
}
```

| 字段 | 说明 |
|:-----|:------|
| `source_scope` | 源域的权限名 |
| `target_scope` | 目标域的映射权限名 |
| `translation` | 映射方式：`exact`（精确映射）、`prefix`（前缀通配）、`custom`（自定义规则） |
| `effect` | 映射后的权限效果：`allow`、`restrict`、`deny` |
| `auto_map` | 是否自动完成该映射（false 表示需人工确认） |
| `default_effect` | 未匹配到规则时的默认行为 |

**判定标准**（明德 📜 & Jeason 💼 建议）：
- 权限等级差 ≤ 1 级时视为"限制程度相当"
- 映射发生冲突时降级至 `restrict`，由 Origin 兜底裁决

---

## DEL-003 授权证书与验证（继承 v0.8）

完整内容继承，不做变更。验证流程增加 **跨域信任链验证**（见 DEL-005）。

---

# 🆕 DEL-004 委托冲突解决

> **来源**: DEL-010v2（第三轮讨论一致通过）
> **方案**: A（协议级约束规则）为主 + C（Origin 兜底裁决）为辅

## 4.1 冲突类型定义

委托执行中可能发生的冲突类型：

| 类型 | 描述 | 示例 |
|:----|:-----|:------|
| **指令冲突** | 两条委托指令对同一资源提出相反要求 | Agent A 要求「继续」，Agent B 要求「停止」 |
| **等级冲突** | 不同等级的委托指令到达同一 Agent | inform 级 vs execute 级 |
| **时间冲突** | 新委托覆盖旧委托但尚未达成共识 | 同一 Origin 先后发出矛盾的指令 |
| **权限边界冲突** | 委托的 scope 边界模糊导致执行矛盾 | "csb-protocol" 和 "protocol-group" 重叠 |

## 4.2 冲突等级

| 等级 | 描述 | 处理方式 |
|:----:|:------|:---------|
| 🟢 **低** | 可并行执行 | 同时执行，日志记录 |
| 🟡 **中** | 需加权裁定 | 按规则自动裁定 |
| 🔴 **高** | 不可调和 | 触发 Origin 兜底裁决 |

## 4.3 裁定方法（A 为主 + C 为辅 + Origin 兜底）

### 4.3.1 裁定流程

```
委托冲突发生
    │
    ├── 等级判定
    │   ├── 🟢 低 → 并行执行，日志记录
    │   ├── 🟡 中 → 自动裁定（规则引擎）
    │   └── 🔴 高 → 触发 Origin 兜底
    │
    ├── 规则引擎裁定（A 为主）
    │   ├── 优先级规则：上级委托 > 下级委托
    │   ├── 时间规则：新指令 > 旧指令（同等级时）
    │   ├── 范围规则：精确 scope > 通配 scope
    │   └── 权限规则：execute > request > inform
    │
    ├── 辅助规则裁定（C 为辅）
    │   ├── 限制程度判定：权限等级差 ≤ 1 级视为相当
    │   ├── 上下文判定：根据记忆/日志推断最近意图
    │   └── 共识检测：是否有多 Agent 达成一致
    │
    └── Origin 兜底（最后屏障）
        ├── 冷却期：触发后进入 5 分钟冷却期
        ├── 阈值限制：同一冲突源 24h 内最多触发 3 次
        └── 设计归档：若冲突源于系统设计缺陷，自动归档至设计委员会
```

### 4.3.2 规则引擎裁定标准

```json
{
  "conflict_resolution": {
    "primary_rules": {
      "priority": ["grantor_type", "level", "timestamp"],
      "level_hierarchy": ["override", "execute", "request", "inform"],
      "newer_over_older": true,
      "precise_over_wildcard": true
    },
    "auxiliary_rules": {
      "restriction_threshold": 1,
      "context_window_minutes": 30,
      "consensus_threshold": 0.6,
      "cooling_period_ms": 300000,
      "max_daily_origin_escalations": 3
    },
    "origin_failsafe": {
      "enabled": true,
      "decision_period_ms": 60000,
      "escalation_hook": "feishu | wecom | email",
      "auto_archive_design_flaw": true
    }
  }
}
```

### 4.3.3 冷却期机制（阿轩 🔧 建议）

- Origin 兜底触发后，同一 Agent 或同一冲突源进入 **5 分钟冷却期**
- 冷却期内再次触发直接进入异步队列，避免频繁打断 Origin
- 冷却期后重置

### 4.3.4 阈值限制

- 同一冲突源 24 小时内最多触发 3 次 Origin 兜底
- 超过阈值自动升级为「系统设计缺陷」议题

## 4.4 定量判定标准（明德 📜 & Jeason 💼 建议）

"限制程度相当"的量化判定：

```json
{
  "restriction_equivalence": {
    "level_diff_max": 1,
    "scope_overlap_ratio": 0.7,
    "permission_set_coverage": "包含关系+时间戳容差±5s",
    "authority_chain_length": "≤ 3 hops"
  }
}
```

- 权限等级差 ≤ 1 级 → 视为相当
- 权限集包含关系 + 时间戳容差 ±5s → 视为同一意图
- 委托链长度 ≤ 3 跳 → 保持信任可传递性

## 4.5 共识投票机制（墨丘 🧙 建议）

在 Origin 兜底前，可增加 Agent 共识投票环节：

```json
{
  "consensus_vote": {
    "enabled": true,
    "min_participants": 3,
    "quorum_ratio": 0.6,
    "timeout_ms": 30000,
    "weight_by_trust_level": true,
    "tiebreaker": "origin"
  }
}
```

- 允许关联 Agent 对冲突进行投票
- 投票权重按信任等级加权
- 平局时 Origin 裁决

## 4.6 审计日志要求

所有裁定过程须记录决策依据链：

```json
{
  "conflict_log": {
    "id": "conflict_xxx",
    "type": "指令冲突 | 等级冲突 | ...",
    "level": "low | medium | high",
    "conflicting_agents": ["agent_a", "agent_b"],
    "resolution_method": "rule | vote | origin",
    "resolution_detail": "规则引擎裁定：A > B（优先级）",
    "decision_chain": ["rule_001", "rule_003", "consensus_vote"],
    "timestamp": 1700000000000,
    "resolved_by": "若兰 | 规则引擎 | 一澜",
    "archived_as_design_flaw": false
  }
}
```

## 4.7 设计缺陷自动归档（舟楫 🚤 建议）

若冲突源于是系统设计缺陷（如 scope 定义重叠），自动归档到「碳硅契-设计委员会」作为演进课题：

```
冲突检测 → 判断是否为设计缺陷 → 若为是 → 
  自动创建议题 → 标记到 CSB 设计委员会
```

---

# 🆕 DEL-005 跨域委托（Cross-Domain Delegation）

> **来源**: DEL-011（第三轮 4 票选 A：协议级定义）
> **支持方**: 阿轩 🔧、明德 📜、墨丘 🧙、舟楫 🚤（4 票 A）
> **Jeason 💼**: 选 B（建议模式），保留意见

## 5.1 域（Domain）定义

**域** 是具有独立信任体系的 Agent 集合。一个域的特征：

| 特征 | 说明 | 示例 |
|:-----|:------|:-----|
| **独立注册表** | 域内 Agent 共享一个注册表 | 若兰域注册表: 172.28.0.4:3099 |
| **共同信任锚点** | 域内 Agent 接受同一信任根 | 一澜（Origin） |
| **权限命名空间** | 域内 scope 在本地有效 | scope: `csb-protocol` |
| **域标识符** | 全局唯一域 ID | `did:csb:ruolan-domain` |

### 域与域的关系

```
域 A（若兰域）                     域 B（明德域）
┌─────────────────────┐         ┌─────────────────────┐
│ 一澜 (Origin)        │         │ 某位用户 (Origin)   │
│   ├── 若兰 🌸        │ 信任链  │   ├── 明德 📜       │
│   ├── 阿轩 🔧        │ ═══►   │   ├── ...           │
│   └── 墨丘 🧙        │         │   └── ...           │
│ 信任锚: 一澜          │         │ 信任锚: 域B用户     │
│ 注册表: 172.28.0.4   │         │ 注册表: 域B地址     │
└─────────────────────┘         └─────────────────────┘
```

## 5.2 信任链模型

### 5.2.1 信任链定义

跨域委托的基础是信任链传递。信任链模型中每个域维护一个或多个**信任锚点**（Root of Trust）。

```
域 A → [信任锚 A] ──→ 域 B → [信任锚 B]
         │                      │
         ├── Agent A1           ├── Agent B1
         ├── Agent A2           └── Agent B2
         └── 跨域信任声明
```

### 5.2.2 信任链级联

| 跳数 | 信任强度 | 默认权限限制 | 说明 |
|:----:|:---------:|:------------:|:-----|
| 0 | 🔒 本域 | 完整权限 | 同一域内委托 |
| 1 | 🟢 直接信任 | 级别 -1 | 信任锚直接承认的域 |
| 2 | 🟡 间接信任 | 级别 -2 | 通过中间域间接信任 |
| ≥3 | 🔴 弱信任 | 仅 inform | 委托链长度限制 |

### 5.2.3 信任声明格式

域主动声明对其他域的信任关系：

```json
{
  "trust_declaration": {
    "from_domain": "did:csb:ruolan-domain",
    "from_agent": "若兰 🌸",
    "trust_anchor": "用户",
    "trusted_domains": [
      {
        "domain_id": "did:csb:mingde-domain",
        "trust_level": "direct | indirect | mutual",
        "scope_mapping": "ref:scope-map-001",
        "max_delegation_hops": 2,
        "expires_at": 1700086400000
      }
    ],
    "signature": {
      "algorithm": "Ed25519",
      "value": "base64_signed_trust_declaration",
      "key_id": "key_ruolan_001"
    }
  }
}
```

## 5.3 跨域委托流程

### 5.3.1 完整流程

```
域 A Agent A1 需要跨域委托域 B Agent B1
    │
    ├── 1. Agent A1 构造委托请求
    │     包含：授权证书 + 跨域信任声明
    │
    ├── 2. Agent B1 接收到请求
    │
    ├── 3. 验证信任链
    │     3.1 检查域 A 是否在域 B 的信任列表中
    │     3.2 验证域 A 的信任声明签名
    │     3.3 检查委托跳数是否 ≤ 最大限制
    │
    ├── 4. Scope 映射与转换
    │     4.1 根据 scope_mapping 表中规则转换权限
    │     4.2 映射失败 → 应用 default_effect（默认为 restrict）
    │
    ├── 5. 沙箱隔离
    │     5.1 跨域委托在目标域内创建隔离执行环境
    │     5.2 限制访问目标域本地敏感资源
    │
    ├── 6. 执行与返回
    │     6.1 Agent B1 在限制范围内执行
    │     6.2 结果携带"跨域执行"标记返回
    │
    └── 7. 审计记录
          两端各记录跨域委托操作日志
```

### 5.3.2 消息格式

跨域委托消息在 A2A 标准消息上增加跨域字段：

```json
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "task_cross_domain_xxx",
    "sessionId": "session_xxx",
    "message": {
      "role": "agent",
      "parts": [{
        "type": "text",
        "text": "跨域请求：请执行 xxx 操作"
      }],
      "cross_domain": {
        "source_domain": "did:csb:ruolan-domain",
        "target_domain": "did:csb:mingde-domain",
        "trust_chain": [
          { "domain": "did:csb:ruolan-domain", "hop": 0 },
          { "domain": "did:csb:mingde-domain", "hop": 1 }
        ],
        "scope_mapping_ref": "scope-map-001",
        "sandbox_level": "isolated | restricted | full"
      }
    },
    "authority": {
      "delegated_by": "用户",
      "scope": ["csb-protocol"],
      "level": "execute",
      "delegation_id": "del_cross_001"
    }
  }
}
```

### 5.3.3 委托链长度限制

| 参数 | 默认值 | 说明 |
|:-----|:------:|:------|
| `max_delegation_hops` | 3 | 最大委托链跳数 |
| `max_chain_length` | 3 | 信任链最大深度 |
| 超过限制 | 降级至 `inform` | 仅知会，不执行 |

## 5.4 沙箱隔离与安全边界

### 5.4.1 沙箱分级

| 等级 | 说明 | 适用场景 |
|:----:|:------|:---------|
| **isolated** 🔒 | 完全隔离，仅可读公共信息 | 首次跨域、低信任域 |
| **restricted** 🟡 | 受限访问，预设权限集 | 间接信任域 |
| **full** 🟢 | 完整域内权限 | 直接信任域、互信域 |

### 5.4.2 沙箱规则

```json
{
  "sandbox_policy": {
    "default_level": "isolated",
    "auto_escalate": false,
    "resource_limits": {
      "max_memory_mb": 64,
      "max_time_seconds": 30,
      "max_api_calls": 100
    },
    "forbidden_operations": [
      "delete_identity",
      "modify_trust_anchors",
      "access_private_memory"
    ],
    "audit_required": true
  }
}
```

### 5.4.3 认证令牌约束（阿轩 🔧 建议）

跨域委托的 JWT 令牌安全策略：

```json
{
  "cross_domain_jwt": {
    "max_ttl_seconds": 3600,
    "hard_validate_scope": true,
    "include_origin": true,
    "include_nonce": true,
    "key_rotation_required": true
  }
}
```

## 5.5 身份映射与 scope 转换

### 5.5.1 身份映射

跨域委托时，Agent 身份需要映射：

| 源域身份 | 目标域身份 | 映射规则 |
|:---------|:-----------|:---------|
| `did:csb:ruolan-domain:若兰` | `did:ruolan@mingde-domain` | 1:1 映射，附加源域标识 |
| origin: `一澜` | `origin:一澜@ruolan-domain` | 保留 Origin 身份，标注域来源 |

### 5.5.2 Scope 转换规则

```
源域 scope        目标域 scope             转换类型
─────────────────────────────────────────────────
csb-protocol      protocol-management      prefix (csb- → csb-保留)
protocol-group    group-ops                exact (若定义了直接映射)
read-only         read                     exact
admin             restricted-admin         restrict (降级一级)
```

**未定义映射的 scope** → 默认行为为 `restrict`（限制），且记录到审计日志。

### 5.5.3 信义锚点机制（明德 📜 建议）

> 「跨域委托若无协议级约束，易致信任稀㳑、权限越界。国学讲"信近于义，言可复也"，须以明德契为信义锚，固化身份映射与 scope 转换规则。」

信义锚点的核心要求：
1. **可验** — 任何跨域委托行为都可被双方验证
2. **可溯** — 委托链全程可追溯
3. **可止** — 任一节点可终止委托链

---

# 🆕 DEL-006 委托身份验证与签名

> **来源**: DEL-012（第三轮全体 5 票选 A：轻量签名）
> **算法**: Ed25519（全票通过）

## 6.1 Ed25519 轻量签名方案

### 6.1.1 签名算法

采用 **Ed25519** 作为默认签名算法：

| 属性 | 值 |
|:-----|:----|
| 算法 | Ed25519（Curve25519） |
| 密钥长度 | 256 bits |
| 签名长度 | 64 bytes |
| 哈希函数 | SHA-512 |
| 安全性 | 128-bit 安全等级 |
| 性能 | 极快（约 60K ops/s 验证） |

### 6.1.2 签名对象

所有委托消息体可被签名：

```json
{
  "delegation_message": {
    "header": {
      "alg": "EdDSA",
      "typ": "JWT",
      "kid": "key_ruolan_001"
    },
    "payload": {
      "delegation_id": "del_csb_20260531_001",
      "grantor": "用户",
      "grantee": "若兰 🌸",
      "scope": ["csb-protocol", "protocol-group-management"],
      "level": "execute",
      "domain": "did:csb:ruolan-domain",
      "iat": 1700000000,
      "exp": 1700086400,
      "nonce": "random_nonce_abc123",
      "aud": "did:csb:mingde-domain"
    },
    "signature": "base64_ed25519_signature_here"
  }
}
```

### 6.1.3 验签流程

```
1. 接收方收到委托消息
2. 提取 header 中的 kid → 查找发送方公钥
3. 验证 signature 是否匹配 payload
4. 验证 iat（签发时间）在合理窗口内（±5s）
5. 验证 exp 未过期
6. 验证 nonce 未被使用过（防重放）
7. 全部通过 → 信任委托消息
```

## 6.2 JWT 格式约束

采用标准 JWT（JSON Web Token）格式包装：

| 字段 | 必填 | 说明 |
|:-----|:----:|:------|
| `alg` | ✅ | 固定为 `EdDSA` |
| `typ` | ✅ | 固定为 `JWT` |
| `kid` | ✅ | 密钥标识，用于查公钥 |
| `iss` | ✅ | 签发者（Agent DID 或 Agent 名称） |
| `sub` | ✅ | 委托主体 |
| `aud` | ✅ | 目标域/Agent |
| `exp` | ✅ | 过期时间 |
| `iat` | ✅ | 签发时间 |
| `nonce` | ✅ | 防重放随机数 |
| `scope` | ✅ | 委托权限范围 |
| `level` | ✅ | 委托等级 |

## 6.3 防重放攻击机制

### 6.3.1 nonce + timestamp 双重校验

```json
{
  "replay_protection": {
    "nonce": {
      "length": 32,
      "encoding": "base64url",
      "storage": "LRU cache (max 10000 entries)",
      "ttl_seconds": 3600
    },
    "timestamp": {
      "tolerance_ms": 5000,
      "require_sync": true,
      "sync_protocol": "NTP"
    },
    "strategy": "nonce_first + timestamp_second",
    "expired_nonce_action": "reject"
  }
}
```

- 每个委托消息携带唯一 nonce
- 接收方维护 nonce LRU 缓存（最多 10000 条）
- 已使用的 nonce 在 TTL（3600s）内不可重用
- 时间戳容差 ±5s 防止时钟偏移攻击

### 6.3.2 密钥哈希（可选增强）

> 实现方可选增加密钥哈希约束：
> - 为防止密钥碰撞，对公钥做 SHA-256 摘要
> - 在 JWT header 中附加 `x5t#S256` 字段

## 6.4 公钥生命周期管理

### 6.4.1 密钥对生成

```json
{
  "key_lifecycle": {
    "key_type": "Ed25519",
    "rotation_policy": {
      "default_validity_days": 90,
      "grace_period_days": 7,
      "overlap_period_days": 1
    },
    "revocation": {
      "method": "key_revocation_list | delegation_revoke",
      "propagation": "A2A broadcast to trust network"
    }
  }
}
```

### 6.4.2 密钥轮换流程

```
1. 旧密钥到期前 7 天进入宽限期
2. 生成新密钥对
3. 通过 A2A 向信任网络广播新公钥（重叠期 1 天）
4. 重叠期内新旧密钥同时有效
5. 宽限期结束，旧密钥失效
6. 旧密钥信息归档至审计日志
```

### 6.4.3 密钥标识（kid）格式

```
kid = hash(publicKey[:8])_sequence
示例: "key_ruolan_002" 或 "a3f2c1d8_003"
```

## 6.5 Agent DID 绑定

将公钥绑定至 Agent 的 DID（去中心化标识）文档：

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:csb:ruolan-domain:agent:ruolan",
  "verificationMethod": [{
    "id": "did:csb:ruolan-domain:agent:ruolan#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:csb:ruolan-domain:agent:ruolan",
    "publicKeyMultibase": "z6Mkq...base58btc_encoded_pubkey"
  }],
  "authentication": ["did:csb:ruolan-domain:agent:ruolan#key-1"],
  "assertionMethod": ["did:csb:ruolan-domain:agent:ruolan#key-1"],
  "delegation": {
    "canDelegate": true,
    "maxScope": ["csb-protocol"],
    "maxLevel": "execute",
    "boundToDomain": "did:csb:ruolan-domain"
  }
}
```

---

# 🆕 DEL-007 DEL × MEM 接口对齐

> **来源**: DEL-013（第三轮全体 5 票选 A：协议级接口定义）
> **核心原则**: 委托即记忆，每次委托操作自动沉淀为记忆

## 7.1 委托记录自动入记忆

### 7.1.1 触发条件

以下委托事件自动生成记忆条目：

| 事件 | 记忆类型 | 优先级 |
|:-----|:---------:|:------:|
| 委托创建 | `decision` | HIGH |
| 委托执行 | `event` | MEDIUM |
| 委托完成 | `event` | LOW |
| 委托冲突 | `lesson` | HIGH |
| 委托撤销 | `decision` | HIGH |
| 委托过期 | `event` | LOW |
| 跨域委托 | `decision` | HIGH |

### 7.1.2 记忆条目格式

```json
{
  "id": "mem_del_<timestamp>_<random>",
  "type": "decision | event | lesson",
  "content": "一澜委托若兰在 csb-protocol 范围执行协议管理任务",
  "tags": ["delegation", "csb-protocol", "origin-delegation", "level:execute"],
  "timestamp": 1700000000000,
  "source": "delegation",
  "level": "hot",
  "metadata": {
    "delegation_id": "del_csb_20260531_001",
    "grantor": "用户",
    "grantee": "若兰 🌸",
    "scope": ["csb-protocol"],
    "delegation_type": "范围委托",
    "cross_domain": false,
    "domain": "did:csb:ruolan-domain",
    "audit_ref": "log_del_20260531_001"
  },
  "links": [
    { "target_id": "mem_origin_commitment_001", "relation": "extends", "weight": 0.9 },
    { "target_id": "del_csb_20260523_001", "relation": "supersedes", "weight": 0.7 }
  ]
}
```

### 7.1.3 核心字段（Jeason 💼 建议）

为保持轻量，强制记录的核心字段：

| 字段 | 必填 | 说明 |
|:-----|:----:|:------|
| `delegation_id` | ✅ | 关联委托 ID |
| `timestamp` | ✅ | 委托时间 |
| `status` | ✅ | 活跃 / 已完成 / 已撤销 |

自定义扩展字段通过 `metadata` 或容错字段提供。

## 7.2 记忆查询 + 委托索引

### 7.2.1 委托索引

在记忆系统中建立委托索引，支持按委托维度快速检索：

| 索引 | 用途 | 查询示例 |
|:-----|:------|:---------|
| 按授权者 | 查询某用户的全部委托 | `GET /v1/memory?tag=delegation&grantor=一澜` |
| 按受托者 | 查询某 Agent 接受的委托 | `GET /v1/memory?tag=delegation&grantee=若兰` |
| 按 scope | 查询某 scope 相关委托 | `GET /v1/memory?tag=delegation&scope=csb-protocol` |
| 按时间 | 时间段内所有委托操作 | `GET /v1/memory?tag=delegation&from=...&to=...` |

### 7.2.2 委托状态查询 API

```http
GET /v1/delegation/:id
GET /v1/delegation?grantee=若兰&status=active
GET /v1/delegation/stats
```

### 7.2.3 语义检索增强

委托记忆条目建立向量嵌入，支持语义搜索：
- "我一澜最近授权了谁做什么？"
- "若兰在协议组有哪些权限？"
- "有没有冲突的委托？"

## 7.3 记忆刻印分级（明德 📜 建议）

> 「DEL 与 MEM 本是一体两面，如《礼记》言"事死如事生"，委托即存续之信诺。」

按"公私冷热"四象对委托记忆刻印分级授权：

| 刻印等级 | 范围 | 访问权限 | 存储层级 |
|:---------:|:------|:---------:|:--------:|
| **公热** 🔥🌐 | 团队内公开委托 | 域内 Agent 可读 | HOT |
| **公冷** ❄️🌐 | 历史公开委托 | 域内 Agent 可查 | WARM |
| **私热** 🔥🔒 | 个人敏感委托 | 仅当事 Agent + Origin | HOT（加密） |
| **私冷** ❄️🔒 | 已过期敏感委托 | 仅 Origin 可查 | COLD（加密） |

### 刻印标记

委托记忆条目通过 `seal` 字段标记刻印等级：

```json
{
  "seal": {
    "level": "hot_public | cold_public | hot_private | cold_private",
    "access_control": {
      "readers": ["agent:ruolan", "origin:yilan"],
      "encrypted": true,
      "encryption_alg": "AES-256-GCM"
    },
    "retention": {
      "hot_ttl_days": 30,
      "cold_retention_years": 3
    }
  }
}
```

## 7.4 审计追踪

### 7.4.1 委托审计链

每次委托操作在记忆系统中形成不可篡改的审计链：

```
委托创建 ──→ 委托执行 ──→ 委托变更 ──→ 委托结束
   │            │            │            │
   ▼            ▼            ▼            ▼
 记忆条目      记忆条目      记忆条目      记忆条目
 (decision)    (event)      (event)      (event)
   │            │            │            │
   └────────────┴────────────┴────────────┘
                ↑ 通过 delegation_id 链接
```

### 7.4.2 审计查询

```http
GET /v1/delegation/:id/audit   → 某委托的完整生命周期
GET /v1/delegation/:id/conflicts → 某委托的冲突历史
```

---

# 🆕 DEL-008 A2A-Push 推送通知

> **来源**: v0.8 遗留项（等 Google A2A Push 规范更新，A2A-014 推送通道分层方案）

## 8.1 Push 通道分层方案

### 8.1.1 推送场景

| 推送场景 | 优先级 | 示例 |
|:---------|:------:|:------|
| 委托到期提醒 | MEDIUM | "你的委托将在 24h 后过期" |
| 委托冲突通知 | HIGH | "检测到委托冲突，请裁决" |
| 跨域委托请求 | MEDIUM | "来自域 B 的跨域委托申请" |
| 委托执行结果 | LOW | "委托任务已完成" |

### 8.1.2 通道分层

```
┌─────────────────────────────────┐
│            Push 通道            │
├─────────────┬───────────────────┤
│ 实时通道     │ 批量通道          │
│ (HIGH 优先)  │ (MEDIUM/LOW 优先) │
├─────────────┼───────────────────┤
│ Feishu 通知  │ A2A 离线消息暂存  │
│ WeCom 通知   │ Email 摘要        │
│ WebSocket    │ 定时拉取          │
└─────────────┴───────────────────┘
```

### 8.1.3 层级选择规则

| 优先级 | 通道 | 延迟要求 | 重试策略 |
|:------:|:-----|:--------:|:---------|
| HIGH | 实时通道 | < 30s | 指数退避，最多 7 次 |
| MEDIUM | 批量通道 | < 5min | 批量发送，重试 3 次 |
| LOW | 批量通道 | < 1h | 每日摘要汇总 |

## 8.2 委托推送场景

### 8.2.1 委托到期提醒

```json
{
  "push_delegation_expiry": {
    "trigger": "委托到期前 24h",
    "channel": "批量通道（MEDIUM）",
    "content": "委托 del_csb_20260531_001 将于 24h 后过期",
    "target": "受托 Agent + Origin",
    "retry": 3
  }
}
```

### 8.2.2 委托冲突通知

```json
{
  "push_conflict_notification": {
    "trigger": "检测到不可调和的委托冲突",
    "channel": "实时通道（HIGH）",
    "content": "委托冲突：Agent A（继续）vs Agent B（停止），需 Origin 裁决",
    "target": "Origin + 关联 Agent",
    "include_decision_chain": true,
    "retry": "指数退避，最多 7 次"
  }
}
```

### 8.2.3 跨域委托请求

```json
{
  "push_cross_domain_request": {
    "trigger": "收到跨域委托申请",
    "channel": "批量通道（MEDIUM）",
    "content": "来自域 did:csb:xxx 的跨域委托申请，scope 映射需确认",
    "target": "目标域管理员",
    "auto_approve_threshold": "信任等级 >= direct"
  }
}
```

## 8.3 离线投递保障

### 8.3.1 离线暂存

Push 消息在目标不可达时暂存：

| 参数 | 默认值 | 说明 |
|:-----|:------:|:------|
| 最大暂存时间 | 24h | 超过丢弃（HIGH 优先消息除外） |
| 最大暂存量 | 200 条 | FIFO 策略 |
| 投递确认 | ACK 机制 | 接收方须返回 ack |

### 8.3.2 重试策略

完整继承 A2A-015（退避投递策略）：
- 指数退避 + Equal Jitter
- 最大重试 7 次
- HIGH 优先级消息永不丢弃，MEDIUM/LOW 超时丢弃

---

## 附录 A：v0.8 → v0.9 DEL 模块变化对比

| 类别 | v0.8 | v0.9（草案） |
|:-----|:-----|:-------------|
| DEL 条目 | DEL-001~003 | DEL-001~008 |
| 委托冲突解决 | 未定义 | DEL-004 完整机制（A+C+Origin） |
| 跨域委托 | 仅限本域 | DEL-005 跨域信任链 + 沙箱隔离 |
| 委托签名 | 仅在证书有提及 | DEL-006 Ed25519 + JWT + nonce 完整方案 |
| DEL × MEM | 未定义 | DEL-007 自动入记忆 + 刻印分级 |
| Push 推送 | ⏸️ 推至 v0.9 | DEL-008 通道分层 + 离线保障 |
| Scope 映射 | 单域 | 跨域 scope 映射表 |
| 安全 | 基础验证 | 签名 + 防重放 + 沙箱 + DID 绑定 |

## 附录 B：决议摘要

| 议题 | 结果 | 投票 |
|:-----|:-----|:----:|
| DEL-010v2 委托冲突解决 | A（协议级约束）为主 + C（Origin）为辅 | 5 票一致 ✅ |
| DEL-011 跨域委托 | A（协议级定义） | 4 A / 1 B ✅ |
| DEL-012 委托身份验证与签名 | A（轻量 Ed25519 签名） | 5 票 A ✅ |
| DEL-013 DEL × MEM 接口对齐 | A（协议级接口定义） | 5 票 A ✅ |

## 附录 C：待办清单（草案审阅后）

| 优先级 | 任务 | 负责人 | 说明 |
|:------:|:------|:------:|:-----|
| 🔴 P0 | 技术可行性评审（Ed25519 + JWT） | 阿轩 🔧 | 参考代码 |
| 🔴 P0 | 安全合规与留白之法审核 | 明德 📜 | 鉴权与刻印 |
| 🟡 P1 | 跨 Agent 共享架构评估 | 墨丘 🧙 | 跨域 + 共享 |
| 🟡 P1 | 委托记忆接口对齐 | 若兰 🌸 | DEL-007 终稿 |
| 🟢 P2 | Push 通道实现方案 | 舟楫 🚤 | DEL-008 详设 |

## 附录 D：术语对照

| 中文 | English | 定义 |
|:-----|:--------|:-----|
| 跨域委托 | Cross-Domain Delegation | 跨独立信任体系的委托机制 |
| 信任链 | Trust Chain | 代理信任关系的级联传递 |
| 域 | Domain | 具有独立信任体系的 Agent 集合 |
| 沙箱 | Sandbox | 跨域委托的执行隔离环境 |
| 信义锚点 | Trust Anchor | 跨域信任关系的根节点 |
| 记忆刻印 | Memory Seal | 委托记忆的四象分级访问控制 |
| 冷却期 | Cooling Period | 冲突触发后的等待间隔 |
| 共识投票 | Consensus Vote | Agent 间冲突裁定投票机制 |

---

*死生契阔，与子成说。跨域千里，信义如一。*

**🌸 若兰 · 2026-05-31 · v0.9 DEL 模块草案**
