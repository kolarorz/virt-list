import { describe, expect, it } from 'vitest';
import {
  computeThumb,
  positionToRatio,
  ratioToPosition,
  pointerToRatio,
  DEFAULT_MIN_THUMB_SIZE,
} from '../src/scrollbar/geometry';

/**
 * 自绘滚动条的换算。这些是最容易出错、又最难靠肉眼发现的地方：
 * 差一点点表现为「拖到底还差几项」或者「松手后滑块跳一下」。
 */

describe('computeThumb', () => {
  it('内容不足一屏时不显示滚动条', () => {
    expect(
      computeThumb({ trackSize: 200, clientSize: 200, totalSize: 200 }),
    ).toEqual({ size: 0, travel: 0, visible: false });

    expect(
      computeThumb({ trackSize: 200, clientSize: 200, totalSize: 150 }).visible,
    ).toBe(false);
  });

  it('滑块长度按视口占内容的比例给出', () => {
    const geo = computeThumb({
      trackSize: 200,
      clientSize: 200,
      totalSize: 800,
    });
    expect(geo.size).toBe(50);
    expect(geo.travel).toBe(150);
    expect(geo.visible).toBe(true);
  });

  it('超长列表下滑块不短于最小长度，行程随之收缩', () => {
    // 30w × 100px，比例算出来不到 0.07px，必须被最小长度托住
    const geo = computeThumb({
      trackSize: 600,
      clientSize: 600,
      totalSize: 30_000_000,
    });
    expect(geo.size).toBe(DEFAULT_MIN_THUMB_SIZE);
    // 行程是「轨道 - 滑块」而不是轨道本身，否则拖到底也到不了底
    expect(geo.travel).toBe(600 - DEFAULT_MIN_THUMB_SIZE);
  });

  it('轨道比最小滑块还短时，滑块不超出轨道', () => {
    const geo = computeThumb({
      trackSize: 12,
      clientSize: 12,
      totalSize: 10_000,
      minThumbSize: 20,
    });
    expect(geo.size).toBeLessThanOrEqual(12);
    expect(geo.travel).toBeGreaterThanOrEqual(0);
  });

  it('尺寸未知（未布局）时不显示', () => {
    expect(
      computeThumb({ trackSize: 0, clientSize: 0, totalSize: 1000 }).visible,
    ).toBe(false);
  });
});

describe('位置 ↔ 比例 的索引映射', () => {
  it('两个方向严格互逆（松手时滑块不会跳）', () => {
    const maxBegin = 2000;
    for (const ratio of [0, 0.001, 0.25, 0.5, 0.7333, 0.999, 1]) {
      const { index, frac } = ratioToPosition(ratio, maxBegin);
      const back = positionToRatio({ inViewBegin: index, maxBegin, frac });
      expect(back).toBeCloseTo(ratio, 10);
    }
  });

  it('滚到底时比例为 1（分母是 maxBegin，不是 list.length）', () => {
    // 50 项、一屏 5 项 → 滚到底时视口顶部是第 45 项
    expect(positionToRatio({ inViewBegin: 45, maxBegin: 45, frac: 0 })).toBe(1);
    // 若错用 list.length - 1 = 49 做分母，这里只会得到 0.918
    expect(positionToRatio({ inViewBegin: 45, maxBegin: 49, frac: 0 })).not.toBe(
      1,
    );
  });

  it('项内比例让滑块在长项上连续移动', () => {
    const a = positionToRatio({ inViewBegin: 10, maxBegin: 100, frac: 0 });
    const b = positionToRatio({ inViewBegin: 10, maxBegin: 100, frac: 0.5 });
    expect(b).toBeGreaterThan(a);
    expect(b).toBeCloseTo(0.105, 10);
  });

  it('内容不足一屏（maxBegin 为 0）时比例恒为 0，不会除零', () => {
    expect(positionToRatio({ inViewBegin: 0, maxBegin: 0, frac: 0.5 })).toBe(0);
    expect(ratioToPosition(0.7, 0)).toEqual({ index: 0, frac: 0 });
  });

  it('越界的比例与 frac 都被夹住', () => {
    expect(positionToRatio({ inViewBegin: 999, maxBegin: 100, frac: 0 })).toBe(
      1,
    );
    expect(positionToRatio({ inViewBegin: -5, maxBegin: 100, frac: 0 })).toBe(0);
    expect(ratioToPosition(1.5, 100).index).toBe(100);
    expect(ratioToPosition(-1, 100).index).toBe(0);
  });
});

describe('pointerToRatio', () => {
  it('按下时抓住滑块的哪一点，拖动时就保持在哪一点', () => {
    // 轨道从 y=100 起，行程 150，抓住滑块中部（距滑块顶 25px）
    const ratio = pointerToRatio({
      pointer: 175,
      trackStart: 100,
      grabDelta: 25,
      travel: 150,
    });
    expect(ratio).toBeCloseTo(0.3333, 4);
  });

  it('超出轨道两端时夹到 0 / 1', () => {
    const base = { trackStart: 100, grabDelta: 0, travel: 150 };
    expect(pointerToRatio({ ...base, pointer: 0 })).toBe(0);
    expect(pointerToRatio({ ...base, pointer: 9999 })).toBe(1);
  });

  it('行程为 0（内容不足一屏）时恒为 0', () => {
    expect(
      pointerToRatio({
        pointer: 500,
        trackStart: 100,
        grabDelta: 0,
        travel: 0,
      }),
    ).toBe(0);
  });
});
