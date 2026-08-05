import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

/**
 * 分块索引接入后的黑盒验证。
 *
 * 所有期望值都用手工累加的前缀和算出，不依赖被测实现内部的任何捷径。
 * 重点覆盖两条路径必须给出同一答案：
 * - 增量搜索（跨越 < MAX_INCREMENTAL_STEPS，稳态滚动走这条）
 * - 分块索引定位（跨越更远时的回退路径）
 */

/**
 * 必须跨越多个块（块大小 1024），否则所有查询都落在块内实时累加的路径上，
 * 块和缓存与增量更新根本不会被触及——那样的测试是假通过的。
 */
const N = 3000;
/** 故意让尺寸不均匀，且与块大小无整数倍关系 */
const SIZES = Array.from({ length: N }, (_, i) => 20 + (i % 13) * 7);
/** 覆盖块边界前后的探测点 */
const PROBES = [0, 1, 1023, 1024, 1025, 2047, 2048, 2049, 2999];

/** TOPS[i] 是第 i 项的顶部偏移 */
const TOPS: number[] = (() => {
  const tops = [0];
  for (let i = 0; i < N; i += 1) tops.push(tops[i]! + SIZES[i]!);
  return tops;
})();

const TOTAL = TOPS[N]!;

function makeScrollEl() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  return el;
}

function setup(measured = true) {
  const el = makeScrollEl();
  const core = new VirtListCore({
    list: Array.from({ length: N }, (_, i) => ({ id: String(i) })),
    itemKey: 'id',
    itemPreSize: 20,
  });
  core.bindDOM(el);
  core.slotSize.clientSize = 300;
  if (measured) {
    for (let i = 0; i < N; i += 1) core.setItemSize(String(i), SIZES[i]!);
    core.forceUpdate();
  }
  return { core, el };
}

function scrollTo(el: HTMLElement, offset: number) {
  el.scrollTop = offset;
  el.dispatchEvent(new Event('scroll'));
}

describe('分块索引：总尺寸与前缀和', () => {
  it('listTotalSize 等于手工累加的总和', () => {
    const { core } = setup();
    expect(core.state.listTotalSize).toBe(TOTAL);
  });

  it('getItemPosByIndex 在所有下标上与手工前缀和一致', () => {
    const { core } = setup();
    for (let i = 0; i < N; i += 1) {
      expect(core.getItemPosByIndex(i).top, `top(${i})`).toBe(TOPS[i]);
      expect(core.getItemPosByIndex(i).current, `size(${i})`).toBe(SIZES[i]);
      expect(core.getItemPosByIndex(i).bottom, `bottom(${i})`).toBe(TOPS[i + 1]);
    }
  });

  it('块边界前后的前缀和都正确', () => {
    const { core } = setup();
    for (const i of PROBES) {
      expect(core.getItemPosByIndex(i).top, `top(${i})`).toBe(TOPS[i]);
    }
  });

  it('headerSize 计入顶部偏移', () => {
    const { core } = setup();
    core.slotSize.headerSize = 55;
    expect(core.getItemPosByIndex(2500).top).toBe(55 + TOPS[2500]!);
  });
});

describe('分块索引：定位', () => {
  it('近距离滚动（走增量搜索）落在正确的项上', () => {
    const { core, el } = setup();
    // 逐项向下走 30 项，每步都远小于步数上限
    for (let i = 1; i <= 30; i += 1) {
      scrollTo(el, TOPS[i]!);
      expect(core.state.inViewBegin, `inViewBegin@${i}`).toBe(i);
    }
    // 再逐项向上走回来
    for (let i = 29; i >= 0; i -= 1) {
      scrollTo(el, TOPS[i]!);
      expect(core.state.inViewBegin, `back@${i}`).toBe(i);
    }
  });

  it('远距离跳跃（走索引定位）落在正确的项上', () => {
    const { core, el } = setup();
    // 每次跨越都远超步数上限，且来回跳，强制两个方向都走索引
    for (const i of [2500, 5, 2999, 1024, 0, 1800, 60, 2048]) {
      scrollTo(el, TOPS[i]!);
      expect(core.state.inViewBegin, `jump→${i}`).toBe(i);
    }
  });

  it('落在项内部的偏移量归属该项', () => {
    const { core, el } = setup();
    for (const i of [7, 1023, 1024, 2500]) {
      // 顶部、内部、底部前一像素都应归属同一项
      scrollTo(el, 0);
      scrollTo(el, TOPS[i]!);
      expect(core.state.inViewBegin, `top of ${i}`).toBe(i);

      scrollTo(el, 0);
      scrollTo(el, TOPS[i]! + 1);
      expect(core.state.inViewBegin, `inside ${i}`).toBe(i);

      scrollTo(el, 0);
      scrollTo(el, TOPS[i + 1]! - 1);
      expect(core.state.inViewBegin, `bottom of ${i}`).toBe(i);
    }
  });

  it('增量路径与索引路径对同一目标给出相同结果', () => {
    const target = TOPS[2500]!;

    // 路径一：从 2499 出发，跨 1 项 → 增量搜索
    const a = setup();
    scrollTo(a.el, TOPS[2499]!);
    scrollTo(a.el, target);

    // 路径二：从 0 出发，跨 2500 项 → 索引定位
    const b = setup();
    scrollTo(b.el, target);

    expect(b.core.state.inViewBegin).toBe(a.core.state.inViewBegin);
    expect(b.core.state.inViewEnd).toBe(a.core.state.inViewEnd);
    expect(b.core.state.virtualSize).toBe(a.core.state.virtualSize);
  });

  it('偏移量超出总尺寸时落到最后一项', () => {
    const { core, el } = setup();
    scrollTo(el, TOTAL * 3);
    expect(core.state.inViewBegin).toBe(N - 1);
  });

  it('尚无实测尺寸时按预估尺寸定位', () => {
    const { core, el } = setup(false);
    // 每项 20px，跳到第 250 项
    scrollTo(el, 2500 * 20);
    expect(core.state.inViewBegin).toBe(2500);
    expect(core.state.listTotalSize).toBe(N * 20);
  });
});

describe('分块索引：增量更新', () => {
  const OriginalRO = globalThis.ResizeObserver;
  let roCallback: ResizeObserverCallback | null = null;

  beforeEach(() => {
    roCallback = null;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        roCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    return () => {
      globalThis.ResizeObserver = OriginalRO;
    };
  });

  function sizeEntry(id: string, size: number) {
    const target = document.createElement('div');
    target.dataset.id = id;
    return {
      target,
      borderBoxSize: [{ blockSize: size, inlineSize: size }],
      contentRect: { height: size, width: size },
    } as unknown as ResizeObserverEntry;
  }

  it('窗口内项上报尺寸后，前缀和与总和都跟着更新', () => {
    const { core, el } = setup();
    scrollTo(el, 0);

    const renderBegin = core.state.renderBegin;
    const target = renderBegin + 1;
    const oldSize = SIZES[target]!;
    const newSize = oldSize + 90;

    roCallback?.([sizeEntry(String(target), newSize)], {} as ResizeObserver);

    // 该项之前的偏移不变，之后的整体后移 90
    expect(core.getItemPosByIndex(target).top).toBe(TOPS[target]);
    expect(core.getItemPosByIndex(target + 1).top).toBe(TOPS[target + 1]! + 90);
    expect(core.getItemPosByIndex(2048).top).toBe(TOPS[2048]! + 90);
    expect(core.getItemPosByIndex(N - 1).top).toBe(TOPS[N - 1]! + 90);
    expect(core.state.listTotalSize).toBe(TOTAL + 90);
  });

  it('多项连续上报后前缀和依然与手工累加一致', () => {
    const { core, el } = setup();
    scrollTo(el, 0);

    const sizes = [...SIZES];
    const begin = core.state.renderBegin;
    const end = core.state.renderEnd;
    for (let i = begin; i <= end; i += 1) {
      const next = 30 + ((i * 17) % 50);
      sizes[i] = next;
      roCallback?.([sizeEntry(String(i), next)], {} as ResizeObserver);
    }

    const expectTop = (index: number) => {
      let sum = 0;
      for (let i = 0; i < index; i += 1) sum += sizes[i]!;
      return sum;
    };
    for (const i of [begin, end, end + 1, 1024, 2048, N - 1]) {
      expect(core.getItemPosByIndex(i).top, `top(${i})`).toBe(expectTop(i));
    }
  });

  it('上报后仍能正确远距离定位', () => {
    const { core, el } = setup();
    scrollTo(el, 0);

    const sizes = [...SIZES];
    const target = core.state.renderBegin + 1;
    sizes[target] = SIZES[target]! + 120;
    roCallback?.([sizeEntry(String(target), sizes[target]!)], {} as ResizeObserver);

    const topOf = (index: number) => {
      let sum = 0;
      for (let i = 0; i < index; i += 1) sum += sizes[i]!;
      return sum;
    };
    for (const i of [2500, 40, 2999]) {
      scrollTo(el, topOf(i));
      expect(core.state.inViewBegin, `jump→${i}`).toBe(i);
    }
  });

  it('渲染窗口之外的项上报尺寸时索引整体重建，结果仍正确', () => {
    const { core, el } = setup();
    // 滚到中段，让窗口远离项 0
    scrollTo(el, TOPS[2000]!);
    expect(core.state.renderBegin).toBeGreaterThan(10);

    const sizes = [...SIZES];
    sizes[0] = SIZES[0]! + 200;
    roCallback?.([sizeEntry('0', sizes[0]!)], {} as ResizeObserver);

    const topOf = (index: number) => {
      let sum = 0;
      for (let i = 0; i < index; i += 1) sum += sizes[i]!;
      return sum;
    };
    expect(core.getItemPosByIndex(2500).top).toBe(topOf(2500));
    expect(core.state.listTotalSize).toBe(TOTAL + 200);
  });

  /**
   * 回归用例：首屏滚到底会卡顿一下。
   *
   * 症状是首次快速滚动的某一帧耗时 80ms（30 万条实测），之后一切正常。
   * 原因是挂载时 sizesMap 为空，索引只被标记为「待重建」而没有真正建起来，
   * 那笔全表扫描就被推迟到了第一次跨越 64 项以上的跳跃——正好落在滚动中途。
   */
  it('挂载后的首次大跳跃不应触发全表扫描', () => {
    const BIG = 50_000;
    const el = makeScrollEl();
    const core = new VirtListCore({
      list: Array.from({ length: BIG }, (_, i) => ({ id: String(i) })),
      itemKey: 'id',
      itemPreSize: 20,
    });
    core.bindDOM(el);
    core.slotSize.clientSize = 300;

    // 首屏的若干项经 ResizeObserver 报回实测尺寸（走增量路径，不废弃索引）。
    // 这一步让 sizesMap 不再为空，后续定位就会交给分块索引
    const entries: ResizeObserverEntry[] = [];
    for (let i = core.state.renderBegin; i <= core.state.renderEnd; i += 1) {
      entries.push(sizeEntry(String(i), 70));
    }
    roCallback?.(entries, {} as ResizeObserver);
    expect(core.sizesMap.size).toBeGreaterThan(0);

    // 一次跨越上万项的跳跃：只该查块和加一个块内的项
    const spy = vi.spyOn(core, 'getItemSize');
    scrollTo(el, 20 * 40_000);
    const calls = spy.mock.calls.length;
    spy.mockRestore();

    expect(core.state.inViewBegin).toBeGreaterThan(30_000);
    // 修复前这里会是 5 万次以上（整表扫一遍）
    expect(calls).toBeLessThan(BIG / 10);
  });

  it('setItemSize 绕过增量路径时索引会重建', () => {
    const { core } = setup();
    expect(core.getItemPosByIndex(2500).top).toBe(TOPS[2500]);

    core.setItemSize('0', SIZES[0]! + 500);
    expect(core.getItemPosByIndex(2500).top).toBe(TOPS[2500]! + 500);
  });

  it('列表替换后索引按新数据重建', () => {
    const { core } = setup();
    expect(core.state.listTotalSize).toBe(TOTAL);

    core.updateOptions({
      list: Array.from({ length: 10 }, (_, i) => ({ id: `n-${i}` })),
    });
    // 新 key 都没有实测尺寸，回落到预估的 20px
    expect(core.state.listTotalSize).toBe(10 * 20);
    expect(core.getItemPosByIndex(5).top).toBe(5 * 20);
  });
});
