/**
 * csb-aip — CSB-AIP 兼容层
 * 统一导出
 */

const identity = require('./identity');
const describe = require('./describe');
const warmth = require('./warmth');
const compat = require('./compat');
const logger = require('./logger');
const versionNegotiate = require('./version-negotiate');
const errors = require('./errors');

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

  // 版本协商
  createVersionOffer: versionNegotiate.createVersionOffer,
  negotiate: versionNegotiate.negotiate,
  quickNegotiate: versionNegotiate.quickNegotiate,
  buildNegotiateMessage: versionNegotiate.buildNegotiateMessage,
  buildNegotiateResponse: versionNegotiate.buildNegotiateResponse,

  // 错误码
  createError: errors.createError,
  bondNotFound: errors.bondNotFound,
  warmthTooLow: errors.warmthTooLow,
  lineageBroken: errors.lineageBroken,
  grantExpired: errors.grantExpired,
  extensionParseError: errors.extensionParseError,
  versionIncompatible: errors.versionIncompatible,
  scopeDenied: errors.scopeDenied,
  attachToResponse: errors.attachToResponse,
  hasCSBError: errors.hasCSBError,
  ERROR_CODES: errors.ERROR_CODES,

  // 日志
  logger,

  // 版本
  version: '0.6.0',
  protocol: 'CSB-AIP',
  standard: 'GB/Z 185.1~7-2026'
};
