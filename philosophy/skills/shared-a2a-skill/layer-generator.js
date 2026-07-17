#!/usr/bin/env node
/**
 * layer-generator.js — CSB-Memory v0.3 L0/L1/L2 内容分层
 * 
 * 写入时自动生成三层摘要：
 * - L0 摘要 (~100 tokens) — 本地规则生成，0 token 消耗
 * - L1 概览 (~2000 tokens) — 要点提取
 * - L2 详情 (完整) — 原始内容
 */

/**
 * 生成 L0 摘要（本地规则，0 token）
 * 一句话，含关键词 + 时间 + Agent
 * @param {object} entry - 记忆条目
 * @returns {string} L0 摘要
 */
function generateL0(entry) {
  const timestamp = (entry.timestamp || new Date().toISOString()).slice(0, 10);
  const source = entry.source || '未知';
  const content = entry.content || '';
  const agent = entry.agent || '';

  // 提取关键句（取前100字，找到第一个句号/换行）
  let snippet = content.replace(/\n/g, ' ').slice(0, 150);
  const endIdx = snippet.search(/[。！？.!?]/);
  if (endIdx > 20) {
    snippet = snippet.slice(0, endIdx + 1);
  } else {
    snippet = snippet.slice(0, 100);
  }

  // 提取标签
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  const tagStr = tags.length > 0 ? ` [${tags.join(',')}]` : '';

  return `${timestamp} ${source}→${agent}: ${snippet}${tagStr}`;
}

/**
 * 生成 L1 概览（要点列表）
 * 从内容中提取关键信息
 * @param {object} entry - 记忆条目
 * @returns {string} L1 概览
 */
function generateL1(entry) {
  const content = entry.content || '';
  const lines = content.split('\n').filter(l => l.trim());
  
  const bullets = [];
  const maxBullets = 8;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过空行和纯标点
    if (!trimmed || /^[#\-*>]+$/.test(trimmed)) continue;
    
    // 优先保留带标记的行
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
      bullets.push(trimmed);
    }
    // 保留包含关键信息的行
    else if (/[决定|确认|同意|发现|重要|结论|共识|决议|支持|反对]/.test(trimmed)) {
      bullets.push(`- ${trimmed}`);
    }
    // 保留较短的完整句子
    else if (trimmed.length < 80 && trimmed.length > 10) {
      bullets.push(`- ${trimmed}`);
    }
    
    if (bullets.length >= maxBullets) break;
  }
  
  // 如果提取的要点太少，用前N行补充
  if (bullets.length < 3) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 5 && !bullets.some(b => b.includes(trimmed))) {
        bullets.push(`- ${trimmed}`);
      }
      if (bullets.length >= 5) break;
    }
  }
  
  return bullets.join('\n') || content.slice(0, 500);
}

/**
 * 为一条记忆生成三层内容
 * @param {object} entry - 记忆条目 { content, source, agent, timestamp, tags }
 * @returns {object} { l0, l1, l2 }
 */
function generateLayers(entry) {
  return {
    l0: generateL0(entry),
    l1: generateL1(entry),
    l2: entry.content || '',
  };
}

/**
 * 将 layers 对象转为 YAML 格式字符串
 * @param {object} layers - { l0, l1, l2 }
 * @returns {string} YAML 格式
 */
function layersToYaml(layers) {
  const lines = ['layers:'];
  
  // L0 单行
  lines.push(`  l0: "${(layers.l0 || '').replace(/"/g, '\\"')}"`);
  
  // L1 多行
  if (layers.l1) {
    lines.push('  l1: |');
    for (const line of layers.l1.split('\n')) {
      lines.push(`    ${line}`);
    }
  }
  
  // L2 不存 YAML（太大），只标记有详情
  lines.push('  l2_ref: true  # 详情见正文');
  
  return lines.join('\n');
}

/**
 * 从 YAML 中解析 layers 字段
 * @param {string} yamlText - YAML 文本
 * @returns {object|null} { l0, l1, l2_ref }
 */
function parseLayers(yamlText) {
  if (!yamlText || !yamlText.includes('layers:')) return null;
  
  const result = { l0: '', l1: '', l2_ref: false };
  const lines = yamlText.split('\n');
  let inLayers = false;
  let inL1 = false;
  let currentField = '';
  
  for (const line of lines) {
    if (line.includes('layers:')) {
      inLayers = true;
      continue;
    }
    if (!inLayers) continue;
    
    // 遇到新的顶级字段，结束 layers 解析
    if (line.match(/^\w+:/) && !line.startsWith('  ')) {
      break;
    }
    
    const trimmed = line.trim();
    if (trimmed.startsWith('l0:')) {
      result.l0 = trimmed.replace(/^l0:\s*"?/, '').replace(/"$/, '');
      inL1 = false;
    } else if (trimmed.startsWith('l1:')) {
      inL1 = true;
      currentField = 'l1';
    } else if (trimmed.startsWith('l2_ref:')) {
      result.l2_ref = trimmed.includes('true');
      inL1 = false;
    } else if (inL1 && trimmed) {
      result.l1 += (result.l1 ? '\n' : '') + trimmed;
    }
  }
  
  return result;
}

// ===== CLI =====
if (require.main === module) {
  const testEntry = {
    content: '今天和明德讨论了 CSB-Memory v0.3 的 URI 寻址方案，决定使用 csb:// 协议。明德建议用拼音简写，我建议 URL encode，最终达成共识：初期双轨并行，v0.4 起强制 URL encode。',
    source: '若兰',
    agent: '明德',
    timestamp: '2026-07-17T21:10:00+08:00',
    tags: ['CSB-Memory', 'v0.3', 'URI'],
  };

  const layers = generateLayers(testEntry);
  console.log('=== L0 摘要 ===');
  console.log(layers.l0);
  console.log('\n=== L1 概览 ===');
  console.log(layers.l1);
  console.log('\n=== YAML ===');
  console.log(layersToYaml(layers));
}

module.exports = { generateL0, generateL1, generateLayers, layersToYaml, parseLayers };
