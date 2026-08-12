import { describe, expect, it } from 'vitest';
import {
  appendToBlock,
  blocksToMarkdown,
  blocksToSearchText,
  buildAnswerScript,
  makeAnswerBlocks,
  makeChart,
  makeCode,
  makeText,
  makeThinking,
  makeTool,
  settleBlock,
  stepHoldFrames,
  stepText,
  stepToBlock,
  type AgentBlock,
} from '../agentBlocks';

describe('块的初值', () => {
  /**
   * 这条是给 Vue 2 兜底的。
   *
   * Vue 2 的响应式侦测不到「创建之后才出现」的属性，所以凡是后续会变的字段
   * 都必须在造数据时就存在。字段缺失的表现是点了展开没反应——很难查，
   * 因此在这里拦住。
   */
  it('凡是后续会变的字段，造出来就存在', () => {
    for (const block of makeAnswerBlocks(0, '正文')) {
      if (block.kind === 'thinking' || block.kind === 'tool') {
        expect(block).toHaveProperty('expanded');
        expect(typeof block.expanded).toBe('boolean');
      }
      if (block.kind === 'tool') {
        expect(block).toHaveProperty('status');
        expect(block).toHaveProperty('ms');
      }
      if (block.kind === 'chart') {
        expect(block).toHaveProperty('loading');
        expect(typeof block.loading).toBe('boolean');
      }
    }
  });

  it('同一个 seed 造出同样的块，换 seed 才换内容', () => {
    expect(makeAnswerBlocks(3, 'x')).toEqual(makeAnswerBlocks(3, 'x'));
    expect(makeAnswerBlocks(3, 'x')).not.toEqual(makeAnswerBlocks(4, 'x'));
  });

  it('输出里带报错的工具模板，终态是失败而不是成功', () => {
    const statuses = Array.from({ length: 6 }, (_, i) => makeTool(i, 'ok').status);
    expect(statuses).toContain('error');
    expect(statuses).toContain('ok');
  });
});

describe('序列化', () => {
  const blocks: AgentBlock[] = [
    makeThinking(0),
    makeTool(1),
    makeText('这是正文'),
    makeCode(0),
    makeChart(0),
  ];

  it('搜索只看正文块——命中与高亮必须基于同一份文本', () => {
    const text = blocksToSearchText(blocks);
    expect(text).toBe('这是正文');
    // 代码、工具参数、思考过程都不算命中，因为界面上不会给它们画高亮
    expect(text).not.toContain('_solveAnchor');
    expect(text).not.toContain('grep');
  });

  it('复制出来的 Markdown 能直接粘贴：代码有围栏，图表变表格', () => {
    const md = blocksToMarkdown(blocks);
    expect(md).toContain('```ts');
    expect(md).toMatch(/```[\s\S]*```/);
    expect(md).toContain('| --- | --- |');
    // 折叠起来的思考过程只留一行摘要，不把没展开的内容塞进剪贴板
    expect(md).toMatch(/> 思考 \d+s（已折叠）/);
    expect(md).not.toContain(makeThinking(0).text);
  });

  it('工具调用带上状态与耗时', () => {
    expect(blocksToMarkdown([makeTool(1)])).toMatch(/grep.*→ 成功 · \d+ms/);
  });
});

describe('流式演出脚本', () => {
  const SCRIPT = buildAnswerScript();

  it('文本块从空开始，工具卡以执行中入场，图表先占位', () => {
    for (const step of SCRIPT) {
      const block = stepToBlock(step);
      if (block.kind === 'text' || block.kind === 'thinking') expect(block.text).toBe('');
      if (block.kind === 'code') expect(block.code).toBe('');
      if (block.kind === 'tool') expect(block.status).toBe('running');
      if (block.kind === 'chart') expect(block.loading).toBe(true);
    }
  });

  it('逐片追加后，块的内容等于这一步的完整文本', () => {
    for (const step of SCRIPT) {
      const full = stepText(step);
      if (!full) continue;

      const block = stepToBlock(step);
      // 一次一个字符，等价于最细的 SSE 分片
      for (const ch of full) appendToBlock(block, ch);

      const got = block.kind === 'code' ? block.code : 'text' in block ? block.text : '';
      expect(got).toBe(full);
    }
  });

  it('落地后工具卡不再是执行中，图表不再是占位', () => {
    for (const step of SCRIPT) {
      const block = stepToBlock(step);
      settleBlock(block, step);
      if (block.kind === 'tool') expect(block.status).not.toBe('running');
      if (block.kind === 'chart') expect(block.loading).toBe(false);
    }
  });

  it('只有工具卡和图表需要停帧，纯文本步骤不停', () => {
    for (const step of SCRIPT) {
      const frames = stepHoldFrames(step);
      if (step.type === 'tool' || step.type === 'chart') expect(frames).toBeGreaterThan(0);
      else expect(frames).toBe(0);
    }
  });

  /** 演示的重点是「插块」和「块内追加」两种变化都出现，缺了哪一种都不算完整 */
  it('脚本里既有连续增高的文本步骤，也有制造跳变的插块步骤', () => {
    const types = new Set(SCRIPT.map((s) => s.type));
    expect(types.has('text')).toBe(true);
    expect(types.has('tool')).toBe(true);
    expect(types.has('chart')).toBe(true);
  });

  it('appendToBlock 不动没有文本的块', () => {
    const chart = makeChart(0);
    const before = { ...chart };
    appendToBlock(chart, '啊');
    expect(chart).toEqual(before);
  });
});

describe('makeText', () => {
  it('原样保留文本，包括 Markdown 标记', () => {
    expect(makeText('**粗** `码`')).toEqual({ kind: 'text', text: '**粗** `码`' });
  });
});
