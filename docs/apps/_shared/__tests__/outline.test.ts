import { describe, expect, it } from 'vitest';
import { activeSection, buildOutline, MAX_SECTIONS } from '../outline';
import { generateTraceLines, type TraceLine } from '../traceData';

/** 分段只看 kind，其余字段给出合法初值即可 */
function line(seq: number, kind: TraceLine['kind']): TraceLine {
  return {
    id: seq,
    seq,
    kind,
    text: `${kind}-${seq}`,
    tool: '',
    status: kind === 'error' ? 'error' : 'ok',
    ms: 0,
    outputKind: 'text',
    expanded: false,
  };
}

describe('语义分段', () => {
  it('thought 开启新的一段，标题取那一行的文本', () => {
    const list = [
      line(0, 'thought'),
      line(1, 'tool'),
      line(2, 'output'),
      line(3, 'tool'),
      line(4, 'thought'),
      line(5, 'tool'),
      line(6, 'output'),
      line(7, 'output'),
    ];

    const sections = buildOutline(list);

    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({ index: 0, count: 4, title: 'thought-0' });
    expect(sections[1]).toMatchObject({ index: 4, count: 4, title: 'thought-4' });
  });

  it('太短的段并入上一段，避免导航条被碎片淹没', () => {
    const list = [
      line(0, 'thought'),
      line(1, 'tool'),
      // 上一段只有 2 行，这个 thought 不另起一段
      line(2, 'thought'),
      line(3, 'tool'),
      line(4, 'output'),
      line(5, 'thought'),
    ];

    const sections = buildOutline(list);

    expect(sections).toHaveLength(2);
    expect(sections[0]!.count).toBe(5);
  });

  it('段的颜色取段内最严重的事件', () => {
    const withError = buildOutline([
      line(0, 'thought'),
      line(1, 'tool'),
      line(2, 'error'),
      line(3, 'output'),
    ]);
    expect(withError[0]).toMatchObject({ kind: 'error', errors: 1 });

    const withTool = buildOutline([
      line(0, 'thought'),
      line(1, 'output'),
      line(2, 'tool'),
      line(3, 'output'),
    ]);
    expect(withTool[0]!.kind).toBe('tool');
  });

  /**
   * 这是导航条溢出容器的根因所在。
   *
   * 每个色块都有最小高度，段数一多，色块高度之和就会超过容器——被压到最小值之后
   * 仍然装不下，于是整条导航条比列表高出一截。段数必须有上限。
   */
  it('段数超过上限时合并相邻段', () => {
    // 3000 行按每 10 行一个 thought 算，原始分段有 300 段
    const list = generateTraceLines(3000);

    const sections = buildOutline(list);

    expect(sections.length).toBeLessThanOrEqual(MAX_SECTIONS);
    // 合并不能丢行：所有段的 count 之和仍等于总行数
    expect(sections.reduce((sum, s) => sum + s.count, 0)).toBe(3000);
    // 段的起点仍严格升序，否则点击跳转会乱
    for (let i = 1; i < sections.length; i += 1) {
      expect(sections[i]!.index).toBeGreaterThan(sections[i - 1]!.index);
    }
  });

  it('合并后错误数累加，颜色仍取最严重的', () => {
    const list = Array.from({ length: 400 }, (_, i) =>
      line(i, i % 20 === 0 ? 'thought' : i % 37 === 0 ? 'error' : 'output'),
    );

    const sections = buildOutline(list, 4);

    expect(sections.length).toBeLessThanOrEqual(4);
    const totalErrors = sections.reduce((sum, s) => sum + s.errors, 0);
    expect(totalErrors).toBe(list.filter((l) => l.kind === 'error').length);
    expect(sections.some((s) => s.kind === 'error')).toBe(true);
  });

  it('空列表不产生段', () => {
    expect(buildOutline([])).toEqual([]);
  });

  it('activeSection 找出视口所在的段', () => {
    const sections = buildOutline([
      line(0, 'thought'),
      line(1, 'tool'),
      line(2, 'output'),
      line(3, 'tool'),
      line(4, 'thought'),
      line(5, 'tool'),
      line(6, 'output'),
      line(7, 'output'),
    ]);

    expect(activeSection(sections, 0)).toBe(0);
    expect(activeSection(sections, 3)).toBe(0);
    expect(activeSection(sections, 4)).toBe(1);
    expect(activeSection(sections, 99)).toBe(1);
  });
});
