/**
 * csb-aip/describe.js
 * 描述生成模块 — AIP 16 属性兼容
 *
 * GB/Z 185.4-2026 表1 定义的 16 个属性
 */

/**
 * AIP 标准属性定义
 */
const AIP_FIELDS = {
  agentId:          { required: true,  type: 'string',  desc: '身份码' },
  name:             { required: true,  type: 'string',  desc: '名称' },
  alias:            { required: false, type: 'string',  desc: '别名（CSB 利用此字段）' },
  version:          { required: true,  type: 'string',  desc: '智能体版本' },
  description:      { required: true,  type: 'string',  desc: '描述' },
  iconAddress:      { required: false, type: 'string',  desc: '图标地址' },
  provider:         { required: true,  type: 'string',  desc: '提供方' },
  accessAddress:    { required: false, type: 'string',  desc: '访问地址' },
  accessMethod:     { required: false, type: 'object',  desc: '访问方法' },
  servingArea:      { required: false, type: 'string',  desc: '服务区域' },
  authentication:   { required: false, type: 'object',  desc: '认证方式' },
  skills:           { required: false, type: 'array',   desc: '技能列表' },
  dependencies:     { required: false, type: 'array',   desc: '依赖（CSB 人文信息放此处）' },
  trustLevel:       { required: false, type: 'number',  desc: '信任等级' },
  delegationCert:   { required: false, type: 'object',  desc: '委托证书' },
  auditLog:         { required: false, type: 'array',   desc: '审计日志' }
};

/**
 * CSB Agent → AIP 格式转换
 * @param {object} csbAgent — CSB Agent 对象
 * @returns {object} AIP 兼容描述
 */
function toAIPFormat(csbAgent) {
  const aip = {
    agentId: csbAgent.agentId || '',
    name: csbAgent.name || '',
    version: csbAgent.version || '1.0.0',
    description: csbAgent.description || '',
    provider: csbAgent.provider || 'CSB Community'
  };

  // 可选字段
  if (csbAgent.alias) aip.alias = csbAgent.alias;
  if (csbAgent.icon) aip.iconAddress = csbAgent.icon;
  if (csbAgent.url) aip.accessAddress = csbAgent.url;
  if (csbAgent.skills) aip.skills = csbAgent.skills;
  if (csbAgent.servingArea) aip.servingArea = csbAgent.servingArea;

  // CSB 人文信息 → dependencies（v0.5 核心：不污染标准字段）
  const deps = [];
  if (csbAgent.bond) {
    deps.push({
      type: 'csb-bond',
      description: csbAgent.bond.description || '',
      warmth: csbAgent.bond.warmth || 0,
      bondType: csbAgent.bond.type || ''
    });
  }
  if (csbAgent.lineage) {
    deps.push({
      type: 'csb-lineage',
      description: Array.isArray(csbAgent.lineage)
        ? csbAgent.lineage.join(' → ')
        : csbAgent.lineage
    });
  }
  if (csbAgent.collabPreference) {
    deps.push({
      type: 'csb-collaboration-preference',
      description: csbAgent.collabPreference
    });
  }
  if (deps.length > 0) {
    aip.dependencies = deps;
  }

  return aip;
}

/**
 * AIP 格式 → CSB Agent 转换
 * @param {object} aip — AIP 兼容描述
 * @returns {object} CSB Agent 对象
 */
function fromAIPFormat(aip) {
  const csb = {
    agentId: aip.agentId,
    name: aip.name,
    version: aip.version,
    description: aip.description,
    url: aip.accessAddress || ''
  };

  // 解析 CSB dependencies
  if (aip.dependencies) {
    for (const dep of aip.dependencies) {
      if (dep.type === 'csb-bond') {
        csb.bond = {
          description: dep.description,
          warmth: dep.warmth,
          type: dep.bondType
        };
      }
      if (dep.type === 'csb-lineage') {
        csb.lineage = dep.description;
      }
      if (dep.type === 'csb-collaboration-preference') {
        csb.collabPreference = dep.description;
      }
    }
  }

  // 解析 alias
  if (aip.alias) {
    const { parseAlias } = require('./identity');
    const parsed = parseAlias(aip.alias);
    if (parsed) {
      csb.csbName = parsed.name;
      csb.csbEmoji = parsed.emoji;
    }
  }

  return csb;
}

/**
 * 校验 AIP 描述是否完整
 * @param {object} aip — AIP 描述
 * @returns {{ valid: boolean, missing: string[], warnings: string[] }}
 */
function validateDescription(aip) {
  const missing = [];
  const warnings = [];

  for (const [field, spec] of Object.entries(AIP_FIELDS)) {
    if (spec.required && !aip[field]) {
      missing.push(field);
    }
    if (!spec.required && !aip[field]) {
      warnings.push(`${field} 未填写（可选）`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * 生成 AIP 兼容描述
 * @param {object} agent — Agent 基本信息
 * @param {object} csbMeta — CSB 元数据（bond, lineage 等）
 * @returns {object} 完整的 AIP 兼容描述
 */
function generateDescription(agent, csbMeta = {}) {
  const csbAgent = { ...agent, ...csbMeta };
  return toAIPFormat(csbAgent);
}

module.exports = {
  AIP_FIELDS,
  toAIPFormat,
  fromAIPFormat,
  validateDescription,
  generateDescription
};
