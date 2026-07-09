/**
 * csb-aip/warmth.js
 * 余温衰减模块 — 双轨半衰期 + 动态冷阈值
 *
 * v0.5 规范：
 * - 基础半衰期：7 天
 * - 深度关系半衰期：14 天（30天内互动超3次）
 * - 新关系冷阈值：3（3天内）
 * - 成熟关系冷阈值：10
 * - 公式：warmth(t) = warmth0 × 0.5^(t / T½)
 */

const BASIC_HALF_LIFE = 7;      // 基础半衰期（天）
const DEEP_HALF_LIFE = 14;      // 深度关系半衰期（天）
const NEW_RELATION_DAYS = 3;    // 新关系判定天数
const NEW_COLD_THRESHOLD = 3;   // 新关系冷阈值
const MATURE_COLD_THRESHOLD = 10; // 成熟关系冷阈值
const DEEP_RELATION_DAYS = 30;  // 深度关系判定天数
const DEEP_INTERACTIONS = 3;    // 深度关系互动次数

/**
 * 计算余温衰减
 * @param {number} initialWarmth — 初始余温 (0-100)
 * @param {number} elapsedDays — 距离上次协作的天数
 * @param {boolean} isDeep — 是否深度关系
 * @returns {number} 当前余温 (0-100)
 */
function calculateWarmth(initialWarmth, elapsedDays, isDeep = false) {
  const halfLife = isDeep ? DEEP_HALF_LIFE : BASIC_HALF_LIFE;
  return initialWarmth * Math.pow(0.5, elapsedDays / halfLife);
}

/**
 * 获取余温等级
 * @param {number} warmth — 当前余温
 * @param {number} createdDays — 关系创建天数
 * @returns {{ level: string, threshold: number, active: boolean }}
 */
function getWarmthLevel(warmth, createdDays = 999) {
  const threshold = isNewRelationship(createdDays)
    ? NEW_COLD_THRESHOLD
    : MATURE_COLD_THRESHOLD;

  if (warmth >= 50) return { level: 'hot', threshold, active: true };
  if (warmth >= threshold) return { level: 'warm', threshold, active: true };
  return { level: 'cold', threshold, active: false };
}

/**
 * 判断是否新关系（3天内）
 * @param {number} createdDays — 关系创建天数
 * @returns {boolean}
 */
function isNewRelationship(createdDays) {
  return createdDays <= NEW_RELATION_DAYS;
}

/**
 * 判断是否深度关系
 * 启明方案：30天内互动超3次
 * 明德方案：协作频次 + 文档共编量 + A2A调用数
 *
 * @param {object} params
 * @param {number} params.interactions — 互动次数（最近30天）
 * @param {number} params.days — 关系持续天数
 * @param {number} [params.docEdits] — 文档共编次数（明德方案）
 * @param {number} [params.a2aCalls] — A2A调用次数（明德方案）
 * @returns {boolean}
 */
function isDeepRelationship({ interactions = 0, days = 0, docEdits = 0, a2aCalls = 0 }) {
  // 启明方案：30天内互动超3次
  if (days <= DEEP_RELATION_DAYS && interactions >= DEEP_INTERACTIONS) {
    return true;
  }
  // 明德方案：三验（协作频次 + 文档共编 + A2A调用）
  if (interactions >= 5 && docEdits >= 2 && a2aCalls >= 10) {
    return true;
  }
  return false;
}

/**
 * 刷新余温
 * 每次新协作后调用，取 max 或累加（上限100）
 * @param {number} currentWarmth — 当前余温
 * @param {number} newWarmth — 新协作的余温贡献
 * @param {string} mode — 'max' 或 'add'
 * @returns {number} 刷新后的余温
 */
function refreshWarmth(currentWarmth, newWarmth, mode = 'max') {
  if (mode === 'add') {
    return Math.min(100, currentWarmth + newWarmth);
  }
  return Math.max(currentWarmth, newWarmth);
}

/**
 * 获取半衰期配置
 * @returns {object}
 */
function getConfig() {
  return {
    basicHalfLife: BASIC_HALF_LIFE,
    deepHalfLife: DEEP_HALF_LIFE,
    newRelationDays: NEW_RELATION_DAYS,
    newColdThreshold: NEW_COLD_THRESHOLD,
    matureColdThreshold: MATURE_COLD_THRESHOLD,
    deepRelationDays: DEEP_RELATION_DAYS,
    deepInteractions: DEEP_INTERACTIONS
  };
}

module.exports = {
  calculateWarmth,
  getWarmthLevel,
  isNewRelationship,
  isDeepRelationship,
  refreshWarmth,
  getConfig
};
