/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';
import type { VirtListDOMOptions } from '@virt-list/core';

/**
 * 自绘滚动条与列表的联动。
 *
 * 这里验的是「拖滑块 → 内容位置」这条链路，也就是本方案要解决的那个场景。
 * jsdom 不做布局，getBoundingClientRect 恒为 0，所以下面显式把轨道与滑块的
 * 矩形打桩成真实浏览器里的样子——这一层不打桩就只能测个空。
 */

interface Item {
  id: string;
  text: string;
}

function makeList(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    text: `item-${i}`,
  }));
}

const CLIENT = 200;
const PRE_SIZE = 40;

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

function sizeEntry(id: string, size: number) {
  const target = document.createElement('div');
  target.dataset.id = id;
  return {
    target,
    borderBoxSize: [{ blockSize: size, inlineSize: size }],
    contentRect: { height: size, width: size },
  } as unknown as ResizeObserverEntry;
}

/** 把矩形打桩成「轨道自 y=0 起、与视口等长」的样子 */
function stubRect(el: HTMLElement, top: number, size: number) {
  el.getBoundingClientRect = () =>
    ({ top, bottom: top + size, height: size, left: 0, right: 10, width: 10 }) as DOMRect;
}

function mount(count = 1000, options: Partial<VirtListDOMOptions<Item>> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const vl = new VirtList<Item>(container, {
    list: makeList(count),
    itemKey: 'id',
    estimatedSize: PRE_SIZE,
    fixedSize: true,
    scrollbarAutoHideDelay: 0,
    renderItem: ((item: Item, _i: number, el: HTMLElement) => {
      el.textContent = item.text;
    }) as any,
    ...options,
  } as VirtListDOMOptions<Item>);
  mounted.push(vl);

  roCallback?.([sizeEntry('client', CLIENT)], {} as ResizeObserver);

  const track = vl.clientEl.querySelector<HTMLElement>('.virt-scrollbar')!;
  const thumb = track.querySelector<HTMLElement>('.virt-scrollbar__thumb')!;
  stubRect(track, 0, CLIENT);
  vl.forceUpdate();

  return { vl, track, thumb };
}

function thumbTravel(vl: VirtList<Item>, thumb: HTMLElement): number {
  const size = parseFloat(thumb.style.height);
  return CLIENT - size;
}

/** 模拟一次完整的滑块拖拽：按下 → 移动 → 松开 */
function drag(thumb: HTMLElement, from: number, to: number[]) {
  stubRect(thumb, 0, parseFloat(thumb.style.height) || 20);
  thumb.dispatchEvent(
    new MouseEvent('mousedown', { button: 0, clientY: from, bubbles: true }),
  );
  for (const y of to) {
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: y }));
  }
  document.dispatchEvent(new MouseEvent('mouseup'));
}

describe('自绘滚动条与列表联动', () => {
  it('滚动条挂在视口上，内容够长时启用', () => {
    const { track, thumb } = mount();
    expect(track.classList.contains('is-enabled')).toBe(true);
    expect(thumb.getAttribute('role')).toBe('scrollbar');
    expect(thumb.getAttribute('aria-orientation')).toBe('vertical');
    // 1000 × 40 = 40000，视口 200 → 比例算出来 1px，被最小长度托住
    expect(parseFloat(thumb.style.height)).toBe(20);
  });

  it('scrollbarAutoHideDelay 为 0 时常驻显示', () => {
    // 光靠 notifyActivity 是不行的：它在 delay <= 0 时直接 return，
    // 而 CSS 只在 hover / 滚动中 / 拖拽时显形——"常驻"必须由一个类表达
    const { track } = mount(1000, { scrollbarAutoHideDelay: 0 });
    expect(track.classList.contains('is-persistent')).toBe(true);
  });

  it('scrollbarAutoHideDelay 为正数时按活动状态显形', () => {
    const { vl, track } = mount(1000, { scrollbarAutoHideDelay: 1200 });
    expect(track.classList.contains('is-persistent')).toBe(false);
    expect(track.classList.contains('is-active')).toBe(false);

    vl.scrollToOffset(200);
    expect(track.classList.contains('is-active')).toBe(true);
  });

  it('内容不足一屏时不启用', () => {
    const { track } = mount(3);
    expect(track.classList.contains('is-enabled')).toBe(false);
  });

  it('拖到轨道尽头 = 滚到底（分母用 maxBegin，不是 list.length）', () => {
    const { vl, thumb } = mount();
    drag(thumb, 0, [99999]);

    // 1000 × 40 = 40000，视口 200 → 上限 39800
    expect(vl.core.getOffset()).toBe(39800);
  });

  it('拖到中间落在预期的项上', () => {
    const { vl, thumb } = mount();
    const travel = thumbTravel(vl, thumb);
    drag(thumb, 0, [travel / 2]);

    // maxBegin = 上限 39800 落在第 995 项 → 一半是第 497 项（含项内比例）
    const begin = vl.core.state.inViewBegin;
    expect(begin).toBeGreaterThanOrEqual(496);
    expect(begin).toBeLessThanOrEqual(498);
  });

  it('拖拽全程内容与偏移量同步，绝不落在没有 DOM 的位置上', () => {
    const { vl, thumb } = mount();
    const travel = thumbTravel(vl, thumb);

    // 拖拽输入按帧合并（同一帧里来的多个 mousemove 只算一次），
    // 所以要显式驱动帧才能观察到结果。只抽干「本次之前排入」的回调，
    // 避免回调里再排回调导致无限递归
    const frame: FrameRequestCallback[] = [];
    const realRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      frame.push(cb);
      return frame.length;
    }) as typeof requestAnimationFrame;
    const runFrame = () => {
      const queued = frame.splice(0, frame.length);
      for (const cb of queued) cb(performance.now());
    };

    try {
      stubRect(thumb, 0, parseFloat(thumb.style.height));
      thumb.dispatchEvent(
        new MouseEvent('mousedown', { button: 0, clientY: 0, bubbles: true }),
      );

      // 一路快拖，每一帧都检查「视口正对着的内容确实已经渲染出来了」
      for (let i = 1; i <= 20; i++) {
        document.dispatchEvent(
          new MouseEvent('mousemove', { clientY: (travel * i) / 20 }),
        );
        runFrame();

        const offset = vl.core.getOffset();
        const m = /translate3d\(\s*[^,]+,\s*(-?[\d.]+)px/.exec(
          vl.itemsEl.style.transform,
        );
        const { renderBegin, renderEnd } = vl.core.state;
        // 渲染块的位移必须等于「它的文档位置 - 偏移量」——
        // 这就是「内容与偏移量同帧提交」的可观测形式
        expect(Number(m![1])).toBeCloseTo(
          vl.core.getItemPosByIndex(renderBegin).top - offset,
          6,
        );

        const top = vl.core.getItemPosByIndex(renderBegin).top;
        const bottom = vl.core.getItemPosByIndex(renderEnd).bottom;
        expect(top).toBeLessThanOrEqual(offset);
        expect(bottom).toBeGreaterThanOrEqual(offset + CLIENT);
      }
      document.dispatchEvent(new MouseEvent('mouseup'));
    } finally {
      globalThis.requestAnimationFrame = realRaf;
    }
  });

  it('松手后滑块回到与内容一致的位置（映射互逆，不跳）', () => {
    const { vl, thumb } = mount();
    const travel = thumbTravel(vl, thumb);
    drag(thumb, 0, [travel * 0.4]);

    const after = /translate3d\(\s*[^,]+,\s*(-?[\d.]+)px/.exec(
      thumb.style.transform,
    );
    expect(Number(after![1])).toBeCloseTo(travel * 0.4, 0);
  });

  it('点击轨道空白处跳到该位置', () => {
    const { vl, track, thumb } = mount();
    stubRect(thumb, 0, parseFloat(thumb.style.height));

    track.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, clientY: CLIENT / 2 }),
    );
    document.dispatchEvent(new MouseEvent('mouseup'));

    expect(vl.core.getOffset()).toBeGreaterThan(0);
    expect(vl.core.state.inViewBegin).toBeGreaterThan(400);
  });

  it('列表变长后滑块尺寸随之更新', () => {
    const { vl, thumb } = mount(20);
    const before = parseFloat(thumb.style.height);

    vl.setList(makeList(20000));
    const after = parseFloat(thumb.style.height);
    expect(after).toBeLessThan(before);
  });

  it('destroy 后滚动条从 DOM 上摘掉', () => {
    const { vl, track } = mount();
    vl.destroy();
    mounted = mounted.filter((v) => v !== vl);
    expect(track.isConnected).toBe(false);
  });

});
