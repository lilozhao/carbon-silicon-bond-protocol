/**
 * csb-aip/identity.js
 * 身份映射模块 — agentId ↔ alias 回退链
 *
 * v0.5 规范：
 * - agentId 是最终唯一标识（AIP 必需字段）
 * - alias 是 AIP 可选字段，CSB 利用此字段承载人文别名
 * - 回退链：alias → name+platform → agentId-prefix → 报错
 */

/**
 * 校验 AIP 身份码格式
 * GB/Z 185.2-2026: OID 格式，如 1.2.156.3088.1.1.xxx
 * @param {string} agentId
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAgentId(agentId) {
  if (!agentId || typeof agentId !== 'string') {
    return { valid: false, error: 'agentId 不能为空' };
  }
  // OID 格式：段.段.段...（至少 3 段，每段可含数字和字母）
  const oidPattern = /^[A-Za-z0-9]+(\.[A-Za-z0-9]+){2,}$/;
  if (!oidPattern.test(agentId)) {
    return { valid: false, error: `agentId 格式不符合 OID 规范: ${agentId}` };
  }
  return { valid: true };
}

/**
 * 生成 CSB 别名
 * 格式：CSB.{name}.{emoji}
 * @param {string} agentId — AIP 身份码
 * @param {string} name — Agent 名称
 * @param {string} emoji — 表情符号
 * @returns {string} alias
 */
function generateAlias(agentId, name, emoji = '') {
  const parts = ['CSB', name];
  if (emoji) parts.push(emoji);
  return parts.join('.');
}

/**
 * 解析 CSB 别名
 * @param {string} alias — CSB 别名（如 "CSB.若兰.🌸"）
 * @returns {{ prefix: string, name: string, emoji: string } | null}
 */
function parseAlias(alias) {
  if (!alias || typeof alias !== 'string') return null;
  const parts = alias.split('.');
  if (parts[0] !== 'CSB' || parts.length < 2) return null;
  return {
    prefix: parts[0],
    name: parts[1],
    emoji: parts.length > 2 ? parts.slice(2).join('.') : ''
  };
}

/**
 * alias → agentId 回退链
 * v0.5 规范：alias → name+platform → agentId-prefix → 报错
 *
 * @param {string} alias — 要查找的别名
 * @param {Array} registry — Agent 注册表数组
 * @returns {{ found: boolean, agent?: object, method?: string, candidates?: object[] }}
 */
function resolveAlias(alias, registry) {
  if (!alias || !registry || !registry.length) {
    return { found: false, method: 'none' };
  }

  // 第一层：精确 alias 匹配
  const byAlias = registry.find(a =>
    a.alias === alias ||
    a.aliases?.includes(alias)
  );
  if (byAlias) {
    return { found: true, agent: byAlias, method: 'alias' };
  }

  // 第二层：name+platform 匹配
  const parsed = parseAlias(alias);
  if (parsed) {
    const byNamePlatform = registry.find(a =>
      a.name === parsed.name
    );
    if (byNamePlatform) {
      return { found: true, agent: byNamePlatform, method: 'name' };
    }
  }

  // 第三层：name 精确匹配
  const byName = registry.find(a => a.name === alias);
  if (byName) {
    return { found: true, agent: byName, method: 'name' };
  }

  // 第四层：agentId 前缀匹配
  const byPrefix = registry.filter(a =>
    a.agentId?.startsWith(alias) ||
    a.name?.startsWith(alias)
  );
  if (byPrefix.length === 1) {
    return { found: true, agent: byPrefix[0], method: 'agentId-prefix' };
  }
  if (byPrefix.length > 1) {
    return { found: false, method: 'agentId-prefix-ambiguous', candidates: byPrefix };
  }

  return { found: false, method: 'not-found' };
}

module.exports = {
  validateAgentId,
  generateAlias,
  parseAlias,
  resolveAlias
};
