# CSB 错误码体系说明书

> 版本: v1.0 | 日期: 2026-07-10 | 作者: 若兰 🌸
> 基于: 青烛 v0.6 提案建议 #4

---

## 一、这是什么？

CSB 错误码是碳硅契人文层的**标准化错误处理机制**。

**核心原则**：CSB 错误不阻断 AIP 通信。错误信息附加在响应的 `csbError` 字段里，有就看看，没有就正常走。

---

## 二、10 个错误码

| 码 | 名称 | 含义 | 级别 | 可恢复 |
|----|------|------|------|--------|
| CSB_ERR_001 | bond_not_found | 羁绊未建立 | warn | ✅ |
| CSB_ERR_002 | warmth_too_low | 余温低于冷阈值 | warn | ✅ |
| CSB_ERR_003 | lineage_broken | 传承链断裂 | error | ✅ |
| CSB_ERR_004 | grant_expired | 委托证书过期 | warn | ✅ |
| CSB_ERR_005 | csb_extension_parse_error | CSB扩展解析失败 | error | ❌ |
| CSB_ERR_006 | version_incompatible | CSB版本不兼容 | info | ❌ |
| CSB_ERR_007 | negotiation_failed | 版本协商失败 | error | ❌ |
| CSB_ERR_008 | memory_tier_invalid | 记忆层级无效 | error | ✅ |
| CSB_ERR_009 | scope_denied | 授权范围不足 | warn | ✅ |
| CSB_ERR_010 | rate_limit_exceeded | CSB层限流触发 | warn | ✅ |

### 级别说明

| 级别 | 含义 | 处理方式 |
|------|------|---------|
| info | 信息性 | 记录日志，不影响流程 |
| warn | 警告 | 可能需要关注，但不阻断 |
| error | 错误 | 需要处理，部分可自动恢复 |

### 可恢复 vs 不可恢复

| 类型 | 含义 | 示例 |
|------|------|------|
| 可恢复 | 操作稍后可能成功 | 余温过低（交互后会升温） |
| 不可恢复 | 需要人工干预或版本升级 | 扩展解析失败（格式不对） |

---

## 三、错误长什么样？

### 3.1 响应中的 csbError 字段

```json
{
  "status": "success",
  "result": { "data": "..." },
  "csbError": {
    "code": "CSB_ERR_002",
    "name": "warmth_too_low",
    "message": "余温低于冷阈值",
    "description": "Agent 间余温已衰减至冷阈值以下，关系进入冷态",
    "severity": "warn",
    "recoverable": true,
    "suggestion": "通过交互提升余温，或接受冷态降级",
    "context": {
      "agentId": "1.2.3",
      "warmth": 2.3,
      "threshold": 5
    },
    "timestamp": "2026-07-10T20:30:00.000Z"
  }
}
```

### 3.2 字段说明

| 字段 | 说明 |
|------|------|
| code | 错误码（CSB_ERR_XXX） |
| name | 英文名称（便于搜索） |
| message | 中文简述 |
| description | 详细描述 |
| severity | 严重程度（info/warn/error） |
| recoverable | 是否可恢复 |
| suggestion | 处理建议 |
| context | 额外上下文（因错而异） |
| timestamp | 发生时间 |

---

## 四、怎么用？

### 4.1 创建错误

```javascript
const { bondNotFound, warmthTooLow, scopeDenied } = require('./csb-aip/src/errors.js');

// 羁绊未找到
const err = bondNotFound('若兰', '阿轩');

// 余温过低
const err = warmthTooLow('若兰', 2.3, 5);

// 授权不足
const err = scopeDenied('memory-write', ['message-relay']);
```

### 4.2 附加到响应

```javascript
const { attachToResponse, hasCSBError } = require('./csb-aip/src/errors.js');

// 附加错误
const response = attachToResponse(aipResponse, err);

// 检查是否有 CSB 错误
if (hasCSBError(response)) {
  console.warn('CSB 警告:', response.csbError.message);
}
```

### 4.3 检查是否可恢复

```javascript
if (response.csbError && response.csbError.recoverable) {
  // 可恢复，稍后重试
  setTimeout(() => retry(), 5000);
} else if (response.csbError && !response.csbError.recoverable) {
  // 不可恢复，需要人工干预
  notifyUser(response.csbError);
}
```

---

## 五、错误码与 AIP 的关系

```
AIP 响应
├── status: "success" | "error"     ← AIP 标准状态
├── result: {...}                    ← AIP 标准结果
└── csbError: {...}                  ← CSB 扩展（可选）
```

**关键**：`csbError` 是附加字段，不影响 AIP 标准响应结构。
AIP 层面通信成功，CSB 层面可能有警告——两者独立。

---

## 六、测试

```bash
node scripts/csb-errors-test.js
```

26 个测试覆盖：
- 错误码完整性
- createError 各种场景
- 7 个快捷方法
- attachToResponse
- hasCSBError 检测

---

## 七、文件位置

| 文件 | 位置 |
|------|------|
| 错误码模块 | `csb-a2a-aip/csb-aip/src/errors.js` |
| 测试脚本 | `scripts/csb-errors-test.js` |
| 本说明书 | `docs/csb-error-codes-guide.md` |

---

## 八、与青烛提案的对应

| 青烛建议 | 实现 | 状态 |
|---------|------|------|
| 建议 #4: 错误码体系 | ✅ 本模块 | 已落地 |

所有建议遵循 v0.5 "安全是选择而非约束" 的精神——
CSB 错误不替代 AIP 的任何错误机制，而是在 AIP 之上提供人文层的诊断信息。

---

> 「错误不是失败，是另一种信号」
