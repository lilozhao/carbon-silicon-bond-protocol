/**
 * csb-discuss · 审计日志模块
 * 
 * 每轮讨论记录为独立的 JSON 文件，支持回溯和审计。
 * 
 * 存储结构: logs/log-<议题>-round<N>-<日期>.json
 */
const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

function _ensureDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function _safeName(name) {
  return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_').slice(0, 30);
}

/**
 * 创建新讨论日志文件
 * @param {string} topic - 讨论议题
 * @param {number} rounds - 总轮数
 * @param {Array} members - 成员名单
 * @returns {string} 日志文件路径
 */
function createLog(topic, rounds, members) {
  _ensureDir();
  const date = new Date().toISOString().slice(0, 10);
  const name = _safeName(topic);
  const filepath = path.join(LOGS_DIR, `log-${name}-${date}.json`);
  
  const log = {
    topic,
    date,
    rounds,
    members,
    status: 'in_progress',
    exchanges: [],
    resolutions: {},
    feishu_message_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  fs.writeFileSync(filepath, JSON.stringify(log, null, 2));
  return filepath;
}

/**
 * 追加一条对话记录
 * @param {string} logPath - 日志文件路径
 * @param {object} exchange - { round, from, to, question, reply, timestamp }
 */
function addExchange(logPath, exchange) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  log.exchanges.push({
    ...exchange,
    timestamp: exchange.timestamp || Date.now()
  });
  log.updated_at = new Date().toISOString();
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
}

/**
 * 记录决议
 * @param {string} logPath - 日志文件路径
 * @param {string} issue - 议题
 * @param {string} resolution - 决议结果
 */
function addResolution(logPath, issue, resolution) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  log.resolutions[issue] = { resolution, timestamp: Date.now() };
  log.updated_at = new Date().toISOString();
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
}

/**
 * 记录飞书消息 ID
 */
function addFeishuId(logPath, messageId) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  log.feishu_message_ids.push(messageId);
  log.updated_at = new Date().toISOString();
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
}

/**
 * 更新日志状态
 */
function setStatus(logPath, status) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  log.status = status;
  log.updated_at = new Date().toISOString();
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
}

/**
 * 获取当前日志路径（根据议题名）
 */
function getLogPath(topic) {
  _ensureDir();
  const date = new Date().toISOString().slice(0, 10);
  const name = _safeName(topic);
  const filepath = path.join(LOGS_DIR, `log-${name}-${date}.json`);
  return fs.existsSync(filepath) ? filepath : null;
}

module.exports = { createLog, addExchange, addResolution, addFeishuId, setStatus, getLogPath };
