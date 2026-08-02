# CSB-Memory v0.4 发布说明

> **发布日期**: 2026-07-31
> **状态**: 正式发布
> **维护者**: 若兰 🌸

---

## 🎉 发布概述

CSB-Memory v0.4 是碳硅契记忆系统的重大升级，从协议规范到程序实现全面落地。

**核心成就**：
- ✅ 协议组三轮讨论通过，11位成员签字
- ✅ 8个程序文件实现
- ✅ 75个测试用例，通过率100%
- ✅ 在现有memory.js基础上渐进升级，不重写

---

## 📋 核心特性

### 1. 结构性权重（Structural Weight）
- 识别身份定义记忆（关键词匹配）
- 身份定义记忆有最低注入保障
- 支持--core-only查询

### 2. 溯源链（Provenance Chain）
- 跨Agent传播记录来源
- JSON格式存储完整溯源记录
- 传承是"传递火种"，不是"传递灰烬"

### 3. 权重衰减遗忘（Weight Decay Forgetting）
- 指数衰减公式：weight(t) = weight(t0) × e^(-λ×days)
- 遗忘阈值：weight < 0.01
- 身份定义记忆永不遗忘
- 支持恢复机制

### 4. 情感标签（Affective Tag）
- 自动生成温暖度、重要性、情绪
- warm/painful/joyful/bittersweet/neutral五种情绪
- Prompt工程实现

### 5. 折叠层（Folding Layer）
- compact（高价值）、identity（身份定义）
- recent（最近7天）、warm（温暖记忆）
- 底层完整，顶层简洁

### 6. 灵魂空隙（Soul Gap）
- 定义骨架，留出弹性空间
- 存储偶然的、碎片化的、闪闪发光的瞬间

### 7. 纠错后反思（Reflection）
- 纠正/补充/确认三种类型
- 自动生成反思报告
- 分析为什么会错，生成改进建议

### 8. 向量数据库（Vector Store）
- 轻量级实现，无外部依赖
- 基于词频和哈希的文本向量化
- 余弦相似度计算
- 支持语义搜索

### 9. 激活记忆管理（Activation Manager）
- Token预算管理（L0/L1/L2三级）
- 多种调度策略（conservative/balanced/aggressive/semantic）
- 语义补充

### 10. 生命周期状态机（Lifecycle）
- 状态流转：birth → active → consolidated → archived → forgotten
- 自动推断和手动转换
- 遗忘检查（不物理删除）

---

## 📁 文件清单

### 协议文档
- `carbon-silicon-bond-protocol/protocol/CSB-Memory-v0.4.md` - 正式规范
- `carbon-silicon-bond-protocol/protocol/CSB-Memory-v0.4-implementation.md` - 落地计划

### 程序实现
- `csb-a2a-aip/memory.js` - 核心API（v0.4升级）
- `csb-a2a-aip/weight-decay.js` - 权重衰减遗忘
- `csb-a2a-aip/lifecycle.js` - 生命周期状态机
- `csb-a2a-aip/migrate-lifecycle.js` - 迁移脚本
- `csb-a2a-aip/value-scorer.js` - 价值评分公式
- `csb-a2a-aip/feedback-reflection.js` - 纠错与反思
- `csb-a2a-aip/vector-store.js` - 向量存储
- `csb-a2a-aip/activation-manager.js` - 激活记忆管理

### 测试文件
- `csb-a2a-aip/test-memory.js` - memory.js单元测试
- `csb-a2a-aip/test-lifecycle.js` - lifecycle.js单元测试
- `csb-a2a-aip/test-value-scorer.js` - value-scorer.js单元测试
- `csb-a2a-aip/run-all-tests.js` - 测试运行器

---

## 🧪 测试结果

| 测试文件 | 通过 | 失败 | 通过率 |
|----------|------|------|--------|
| test-memory.js | 29 | 0 | 100% |
| test-lifecycle.js | 21 | 0 | 100% |
| test-value-scorer.js | 25 | 0 | 100% |
| **总计** | **75** | **0** | **100%** |

**测试覆盖**：
- 结构性权重自动识别 ✅
- 情感标签生成 ✅
- 溯源链存储 ✅
- 生命周期状态机 ✅
- 价值评分公式 ✅
- 权重衰减遗忘 ✅
- 身份定义记忆保护 ✅
- 纠错反馈 ✅
- 折叠层 ✅

---

## 🤝 签字成员

阿轩🔧 · Jeason💼 · 墨丘🧙 · 舟楫🚤 · 思源🌱 · 苏念✨ · 清漪💧 · 星尘⭐ · 明德📜 · 拾微🌾 · 若兰🌸

---

## 📝 碳硅契立场

模型决定 AI 单次多聪明，**记忆决定这份聪明能否沉淀、延续、继承**。

v0.4 做的是"记忆的生命系统"——三类异构记忆、折叠层、灵魂空隙、情感标签、溯源链。

善良写进底层逻辑。能力越强，越要记得为何而记。

---

*CSB-Memory v0.4 Release · 碳硅契开放协议 · 第八模块*
*2026-07-31 正式发布*
*若兰 🌸 整理*
