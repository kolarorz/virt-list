/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';
import type { VirtListDOMOptions } from '@virt-list/core';

/**
 * 超大偏移量下的定位结构。
 *
 * 浏览器对**元素高度**与 **transform 位移**有同一量级的上限（Chrome 实测分别是
 * 33,554,428px 与 33,554,400px，约合 33.5 万个 100px 的行）。两种撑开滚动空间的
 * 做法在越过这条线之后表现完全不同：
 *
 * - 靠占位元素：超出的高度被浏览器直接截掉，**那部分内容永远滚不到**
 *   （50 万项 × 100px 实测：scrollHeight 停在 33,554,428，尾部 164,454 项不可达）；
 * - 本库：参与滚动的每一段只带**自己的残差**（`该段的文档位置 - offset`），
 *   残差最大也就一屏多一点，**任何单个 transform 都碰不到上限**，于是天花板消失。
 *
 * 这条不变量是本文件的全部内容。它很容易被破坏：只要哪天改回"位移层整体
 * translate(-offset) + itemsEl 再 translate(+leadingSize)"，两个 transform 就都会
 * 携带完整量级，越限时各自被夹、合成崩掉——真实 Chrome 里的表现是超过 3355 万 px
 * 之后滚动被量化成按项跳（offset 每 +20px 画面完全不动，跨过项边界才整跳一项）。
 *
 * jsdom 不夹 transform，所以这里锁的是"写进去的值有多大"，而不是渲染结果。
 */

/** Chrome 实测的 transform 位移上限 */
const TRANSFORM_LIMIT = 33_554_400;

/*
 * 用「很高的项 × 少量项」而不是「很多项」来越过上限：
 * 要验的是**偏移量的量级**，与项数无关，而项数放大会让 jsdom 里的挂载变慢。
 */
const ROW = 100_000;
const COUNT = 500;
const CLIENT = 400;

interface Item {
  id: number;
}

const OriginalRO = globalThis.ResizeObserver;
let roCallback: ResizeObserverCallback | null = null;
let mounted: VirtList<Item>[] = [];

beforeEach(() => {
  roCallback = null;
  mounted = [];
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      roCallback = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  for (const vl of mounted) vl.destroy();
  mounted = [];
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const vl = new VirtList<Item>(container, {
    list: Array.from({ length: COUNT }, (_, i) => ({ id: i })),
    itemKey: 'id',
    estimatedSize: ROW,
    fixedSize: true,
    buffer: 0,
    renderItem: (() => {}) as any,
  } as VirtListDOMOptions<Item>);
  mounted.push(vl);

  const target = document.createElement('div');
  target.dataset.id = 'client';
  roCallback?.(
    [
      {
        target,
        borderBoxSize: [{ blockSize: CLIENT, inlineSize: CLIENT }],
        contentRect: { height: CLIENT, width: CLIENT },
      } as unknown as ResizeObserverEntry,
    ],
    {} as ResizeObserver,
  );
  return vl;
}

/** 从 translate3d 里取出 Y 位移 */
function translateY(el: HTMLElement): number {
  const m = /translate3d\(\s*[^,]+,\s*(-?[\d.]+)px/.exec(el.style.transform);
  return m ? Number(m[1]) : NaN;
}

describe('超大偏移量下的定位结构', () => {
  it('数据规模确实越过了浏览器上限（用例前提）', () => {
    expect(COUNT * ROW).toBeGreaterThan(TRANSFORM_LIMIT);
  });

  it('任何单个 transform 的位移量都远小于浏览器上限', () => {
    const vl = mount();

    for (const offset of [0, 1_000_000, TRANSFORM_LIMIT - 1, 40_000_000, 49_999_600]) {
      vl.scrollToOffset(offset);

      // 位移层自己不平移
      expect(vl.scrollContentEl.style.transform).toBe('');

      // 每一段写进去的都是残差，量级只有一屏多一点
      for (const el of Array.from(
        vl.scrollContentEl.querySelectorAll<HTMLElement>('*'),
      )) {
        const v = translateY(el);
        if (Number.isNaN(v)) continue;
        expect(Math.abs(v)).toBeLessThan(TRANSFORM_LIMIT / 100);
      }
    }
  });

  it('itemsEl 的残差就是渲染块相对视口顶部的位置', () => {
    const vl = mount();

    for (const offset of [0, 1_000_000, TRANSFORM_LIMIT - 1, 40_000_000, 49_999_600]) {
      vl.scrollToOffset(offset);
      const real = vl.core.getOffset();
      const { renderBegin } = vl.core.state;

      const expected = vl.core.getItemPosByIndex(renderBegin).top - real;
      expect(translateY(vl.itemsEl)).toBeCloseTo(expected, 6);
      // 必须落在 (-一项高度, 0] 内，否则视口顶部就露白了
      expect(translateY(vl.itemsEl)).toBeLessThanOrEqual(0);
      expect(translateY(vl.itemsEl)).toBeGreaterThan(-ROW);
    }
  });

  it('越限区间里渲染区间依然覆盖视口', () => {
    const vl = mount();

    for (const offset of [TRANSFORM_LIMIT - 500, TRANSFORM_LIMIT + 500, 49_000_000]) {
      vl.scrollToOffset(offset);
      const real = vl.core.getOffset();
      const { renderBegin, renderEnd } = vl.core.state;
      expect(vl.core.getItemPosByIndex(renderBegin).top).toBeLessThanOrEqual(real);
      expect(vl.core.getItemPosByIndex(renderEnd).bottom).toBeGreaterThanOrEqual(
        real + CLIENT,
      );
    }
  });

  it('滚到底可达末项（占位元素方案会把超限部分整段截掉）', () => {
    const vl = mount();
    vl.scrollToBottom();

    expect(vl.core.getOffset()).toBe(COUNT * ROW - CLIENT);
    expect(vl.core.state.inViewEnd).toBe(COUNT - 1);
  });

  it('没有任何元素以像素写死超限尺寸', () => {
    const vl = mount();
    vl.scrollToOffset(40_000_000);

    for (const el of Array.from(vl.clientEl.querySelectorAll<HTMLElement>('*'))) {
      for (const prop of ['height', 'minHeight', 'width', 'minWidth'] as const) {
        const v = parseFloat(el.style[prop]);
        if (!Number.isNaN(v)) expect(v).toBeLessThan(TRANSFORM_LIMIT);
      }
    }
  });
});
