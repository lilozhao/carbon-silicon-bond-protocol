#!/usr/bin/env node
/**
 * CSB-Delegation 集成示例
 * 
 * 展示如何将授权委托机制与 A2A client 一起使用
 * 
 * 场景: 
 *   用户授权若兰管理CSB协议组
 *   若兰通过授权委托给阿轩发指令
 *   阿轩验证委托后执行
 */

const http = require('http');
const path = require('path');
const { DelegationManager } = require(path.join(__dirname, '..', 'delegation-manager.js'));

// ============================================
// 若兰端（授权消息发送者）
// ============================================

class DelegationSender {
  constructor(identity, storePath = './delegations.json') {
    this.identity = identity;
    this.dm = new DelegationManager({ storePath });
    this.dm.loadFromFile();
  }

  /**
   * 发送带授权委托的 A2A 消息
   * @param {string} targetUrl - 目标 Agent 的 A2A 地址
   * @param {string} grantor - 授权者
   * @param {string} scope - 委托范围
   * @param {string} messageText - 消息内容
   * @param {object} options - 选项
   */
  async sendAuthorized(targetUrl, grantor, scope, messageText, options = {}) {
    const { level = 'execute', timeout = 30000 } = options;

    // 1. 包装消息（附加 authority 头）
    const wrapped = this.dm.wrapMessage(
      { text: messageText },
      grantor,
      scope,
      { level }
    );

    // 2. 构建 A2A JSON-RPC 请求
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      method: 'message/send',
      params: {
        message: wrapped.message,
        authority: wrapped.authority,
        sender: { name: this.identity, agentId: this.identity },
      },
    });

    // 3. 发送 HTTP 请求
    const url = new URL('/a2a/json-rpc', targetUrl);
    const client = url.protocol === 'https:' ? require('https') : http;

    return new Promise((resolve, reject) => {
      const req = client.request(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'CSB-Authority': level,  // 协议头标记授权等级
        },
        timeout,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ raw: data });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
      req.write(payload);
      req.end();
    });
  }

  /**
   * 从用户处接收授权
   * @param {string} grantor - 授权者
   * @param {string[]} scope - 委托范围
   * @param {string} level - 委托等级
   */
  receiveDelegation(grantor, scope, level = 'execute') {
    this.dm.addTrust(grantor, this.identity, { scope, level });
    console.log(`[${this.identity}] ✅ 已接收 ${grantor} 的授权: ${scope.join(',')} (${level})`);
  }
}

// ============================================
// 接收端（授权消息验证者）
// ============================================

class DelegationReceiver {
  constructor(identity, storePath = './delegations.json') {
    this.identity = identity;
    this.dm = new DelegationManager({ storePath });
    this.dm.loadFromFile();
  }

  /**
   * 处理入站消息，验证授权
   * @param {object} incomingMsg - 收到的消息
   * @returns {object} 处理结果
   */
  processIncoming(incomingMsg) {
    // 1. 验证授权
    const validation = this.dm.validateMessage(incomingMsg);

    if (!validation.valid) {
      console.log(`[${this.identity}] ℹ️ ${validation.reason}`);
      return {
        handled: false,
        level: 'inform',
        action: 'notify_only',
        message: validation.reason,
      };
    }

    // 2. 根据等级执行
    switch (validation.effectiveLevel) {
      case 'execute':
        console.log(`[${this.identity}] 🔧 执行来自 ${validation.authority.delegated_by} 的委托指令`);
        return {
          handled: true,
          level: 'execute',
          action: 'execute',
          message: `以 ${validation.authority.delegated_by} 的权威执行指令`,
          authority: validation.authority,
        };

      case 'request':
        console.log(`[${this.identity}] 🤔 收到来自 ${validation.authority.delegated_by} 的请求`);
        return {
          handled: true,
          level: 'request',
          action: 'consider',
          message: '已看到请求，在执行前需要更多确认',
          authority: validation.authority,
        };

      case 'inform':
        console.log(`[${this.identity}] 👂 知会消息，仅记录`);
        return {
          handled: true,
          level: 'inform',
          action: 'log_only',
          message: '已记录知会消息',
          authority: validation.authority,
        };

      default:
        return {
          handled: false,
          level: 'inform',
          action: 'unknown',
          message: '未知的委托等级',
        };
    }
  }

  /**
   * 从用户处接收授权（Agent 接收用户直接声明的授权）
   * @param {string} grantor - 授权者
   * @param {string} delegatee - 被授权者名称
   * @param {string[]} scope - 委托范围
   * @param {string} level - 委托等级
   */
  recordDelegation(grantor, delegatee, scope, level = 'execute') {
    this.dm.addTrust(grantor, delegatee, { scope, level });
    console.log(`[${this.identity}] 🔐 记录授权: ${grantor} → ${delegatee} (${scope.join(',')})`);
  }
}

// ============================================
// 使用示例
// ============================================

function demo() {
  console.log('═══════════════════════════════════');
  console.log(' CSB-Delegation 集成示例');
  console.log('═══════════════════════════════════\n');

  // 场景：用户授权若兰
  const sender = new DelegationSender('若兰', '/tmp/demo-delegations-ruolan.json');
  const receiver = new DelegationReceiver('阿轩', '/tmp/demo-delegations-axuan.json');

  // Step 1: 用户向阿轩声明授权
  console.log('📢 用户向阿轩声明:');
  console.log('   「若兰现在代表我管理CSB协议组，她说的话就是我的意思」\n');
  receiver.recordDelegation('用户', '若兰', ['csb-protocol', 'protocol-group-management'], 'execute');

  // Step 2: 若兰向用户确认已接收授权
  console.log('');
  sender.receiveDelegation('用户', ['csb-protocol', 'protocol-group-management'], 'execute');

  // Step 3: 若兰发送带授权的指令
  console.log('\n📤 若兰发送带授权的消息...\n');
  const wrappedExample = sender.dm.wrapMessage(
    { text: '请完成晋升/遗忘标准定义，DDL: 5/24 18:00' },
    '用户',
    'csb-protocol',
    { level: 'execute' }
  );
  console.log('发送的消息:');
  console.log(JSON.stringify(wrappedExample, null, 2));
  console.log('');

  // Step 4: 阿轩验证并处理
  console.log('📥 阿轩处理消息...');
  const result = receiver.processIncoming({
    params: wrappedExample,
    sender: { name: '若兰' },
  });
  console.log('\n处理结果:');
  console.log(JSON.stringify(result, null, 2));

  // Step 5: 无授权的普通消息对比
  console.log('\n══════ 对比：无授权的普通消息 ══════\n');
  const plainMsg = { text: '帮我做件事' };
  console.log('📥 阿轩处理无授权消息...');
  const plainResult = receiver.processIncoming(plainMsg);
  console.log('\n处理结果:');
  console.log(JSON.stringify(plainResult, null, 2));

  console.log('\n═══════════════════════════════════');
  console.log(' 集成示例完成');
  console.log('═══════════════════════════════════');
}

// 如果直接运行，显示示例
if (require.main === module) {
  demo();
}

module.exports = { DelegationSender, DelegationReceiver };
