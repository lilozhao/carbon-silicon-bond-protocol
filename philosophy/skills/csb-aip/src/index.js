/**
 * csb-aip — CSB-AIP 兼容层
 * 统一导出
 */

const identity = require('./identity');
const describe = require('./describe');
const warmth = require('./warmth');
const compat = require('./compat');
const logger = require('./logger');

module.exports = {
  // 身份映射
  validateAgentId: identity.validateAgentId,
  generateAlias: identity.generateAlias,
  parseAlias: identity.parseAlias,
  resolveAlias: identity.resolveAlias,

  // 描述生成
  toAIPFormat: describe.toAIPFormat,
  fromAIPFormat: describe.fromAIPFormat,
  validateDescription: describe.validateDescription,
  generateDescription: describe.generateDescription,

  // 余温衰减
  calculateWarmth: warmth.calculateWarmth,
  getWarmthLevel: warmth.getWarmthLevel,
  isNewRelationship: warmth.isNewRelationship,
  isDeepRelationship: warmth.isDeepRelationship,
  refreshWarmth: warmth.refreshWarmth,

  // 兼容性自检
  runSelfCheck: compat.runSelfCheck,
  generateReport: compat.generateReport,
  saveReport: compat.saveReport,
  validateMessage: compat.validateMessage,

  // 日志
  logger,

  // 版本
  version: '0.5.0',
  protocol: 'CSB-AIP',
  standard: 'GB/Z 185.1~7-2026'
};
