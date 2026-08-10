/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';
import type { VirtListDOMOptions } from '@virt-list/core';

/**
 * 输入接管。
 *
 * `overflow: hidden` 之后浏览器不再提供任何滚动手段，滚轮 / 键盘 / 触摸都得自己实现。
 * 这是"完全接管"的主要成本，也是最容易留坑的地方——尤其两条：
 *
 * - **滚动链**：到边界还继续朝外滚时必须放行，否则嵌在页面里的列表滚到底之后
 *   整个页面就再也滚不动了；
 * - **focus 吸收**：overflow:hidden 仍是 scrollport，浏览器会在元素获得焦点时
 *   静默改 scrollTop，不吸收掉内容就会凭空错位。
 */

interface Item {
  id: string;
  text: string;
}

const CLIENT = 200;
const PRE_SIZE = 40;
const COUNT = 100;
/** 100 × 40 = 4000，视口 200 → 上限 3800 */
const MAX_OFFSET = COUNT * PRE_SIZE - CLIENT;

const OriginalRO = globalThis.ResizeObserver;
let roCallback: ResizeObserverCallback | null = null;
let mounted: VirtList<Item>[] = [];
/**
 * 手动驱动的帧队列：输入按帧合并，不驱动就观察不到结果。
 *
 * 必须同时伪造 cancelAnimationFrame —— 惯性刹车靠的就是它，
 * 只伪造 requestAnimationFrame 的话被取消的回调仍会执行。
 */
let frameQueue = new Map<number, FrameRequestCallback>();
let frameSeq = 0;
let frameTime = 0;
let realRaf: typeof requestAnimationFrame;
let realCaf: typeof cancelAnimationFrame;

beforeEach(() => {
  roCallback = null;
  mounted = [];
  frameQueue = new Map();
  frameSeq = 0;
  frameTime = 0;
  realRaf = globalThis.requestAnimationFrame;
  realCaf = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    const id = ++frameSeq;
    frameQueue.set(id, cb);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    frameQueue.delete(id);
  }) as typeof cancelAnimationFrame;

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
  globalThis.requestAnimationFrame = realRaf;
  globalThis.cancelAnimationFrame = realCaf;
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

/** 只抽干本次之前排入的回调，避免回调里再排回调导致无限递归 */
function runFrame() {
  const queued = [...frameQueue];
  frameQueue.clear();
  // 时间戳必须真的往前走：惯性的衰减是按帧间隔折算的，
  // 恒定时间戳会让它既不动也不衰减
  frameTime += 16.67;
  for (const [, cb] of queued) cb(frameTime);
}

function sizeEntry(id: string, size: number) {
  const target = document.createElement('div');
  target.dataset.id = id;
  return {
    target,
    borderBoxSize: [{ blockSize: size, inlineSize: size }],
    contentRect: { height: size, width: size },
  } as unknown as ResizeObserverEntry;
}

function mount(
  options: Partial<VirtListDOMOptions<Item>> = {},
  events: Record<string, unknown> = {},
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const vl = new VirtList<Item>(container, {
    list: Array.from({ length: COUNT }, (_, i) => ({
      id: String(i),
      text: `item-${i}`,
    })),
    itemKey: 'id',
    itemPreSize: PRE_SIZE,
    fixed: true,
    renderItem: ((item: Item, _i: number, el: HTMLElement) => {
      el.textContent = item.text;
    }) as any,
    ...options,
  } as VirtListDOMOptions<Item>, events as any);
  mounted.push(vl);

  roCallback?.([sizeEntry('client', CLIENT)], {} as ResizeObserver);
  runFrame();
  return { vl, clientEl: vl.clientEl };
}

function wheel(el: HTMLElement, init: WheelEventInit): WheelEvent {
  const e = new WheelEvent('wheel', { cancelable: true, ...init });
  el.dispatchEvent(e);
  runFrame();
  return e;
}

function key(el: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { cancelable: true, ...init });
  el.dispatchEvent(e);
  runFrame();
  return e;
}

describe('滚轮', () => {
  it('像素模式按原值滚动', () => {
    const { vl, clientEl } = mount();
    const e = wheel(clientEl, { deltaY: 120, deltaMode: 0 });

    expect(vl.core.getOffset()).toBe(120);
    expect(e.defaultPrevented).toBe(true);
  });

  it('行模式（Firefox 鼠标滚轮）折算成像素', () => {
    const { vl, clientEl } = mount();
    wheel(clientEl, { deltaY: 3, deltaMode: 1 });
    // 3 行 × 40px；照搬 deltaY 的话只会滚 3px，慢到像卡住
    expect(vl.core.getOffset()).toBe(120);
  });

  it('页模式按视口高度折算', () => {
    const { vl, clientEl } = mount();
    wheel(clientEl, { deltaY: 1, deltaMode: 2 });
    expect(vl.core.getOffset()).toBe(CLIENT);
  });

  it('同一帧内的多次滚轮合并成一次滚动', () => {
    const { vl, clientEl } = mount();
    for (let i = 0; i < 5; i++) {
      clientEl.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 10, cancelable: true }),
      );
    }
    expect(vl.core.getOffset()).toBe(0); // 还没到帧边界
    runFrame();
    expect(vl.core.getOffset()).toBe(50); // 一次落位，而不是五次
  });

  it('ctrl + 滚轮是浏览器缩放，不拦截也不滚动', () => {
    const { vl, clientEl } = mount();
    const e = wheel(clientEl, { deltaY: 120, ctrlKey: true });

    expect(vl.core.getOffset()).toBe(0);
    expect(e.defaultPrevented).toBe(false);
  });

  it('顶部继续上滚时放行事件，让外层容器接管（滚动链）', () => {
    const { vl, clientEl } = mount();
    const e = wheel(clientEl, { deltaY: -120 });

    expect(vl.core.getOffset()).toBe(0);
    // 拦下来的话，嵌在页面里的列表滚到顶之后整个页面就再也滚不动了
    expect(e.defaultPrevented).toBe(false);
  });

  it('底部继续下滚时放行事件', () => {
    const { vl, clientEl } = mount();
    vl.scrollToOffset(MAX_OFFSET);
    expect(vl.core.getOffset()).toBe(MAX_OFFSET);

    const e = wheel(clientEl, { deltaY: 120 });
    expect(e.defaultPrevented).toBe(false);
  });

  it('未到边界时拦截事件，页面不跟着一起滚', () => {
    const { clientEl } = mount();
    const e = wheel(clientEl, { deltaY: 40 });
    expect(e.defaultPrevented).toBe(true);
  });

  it('横向列表同时认 deltaX 与 deltaY', () => {
    const { vl, clientEl } = mount({ horizontal: true });
    wheel(clientEl, { deltaX: 100, deltaY: 0 });
    expect(vl.core.getOffset()).toBe(100);

    // 普通鼠标滚轮只有 deltaY，横向列表也该能滚
    wheel(clientEl, { deltaX: 0, deltaY: 50 });
    expect(vl.core.getOffset()).toBe(150);
  });
});

describe('边界事件与自动续拉', () => {
  /**
   * 用户输入必须触发 toTop / toBottom。
   *
   * 这条曾经是坏的：InputController 一度经由 scrollToOffset（程序化路径）
   * 驱动 core，而 _judgePosition 只在「用户滚动」路径上跑——于是滚轮滚到底
   * 不发 toBottom，无限加载整个失效，而偏移量看起来完全正常。
   */
  it('滚轮滚到底触发 toBottom', () => {
    const toBottom = vi.fn();
    const { clientEl } = mount({}, { toBottom });

    wheel(clientEl, { deltaY: MAX_OFFSET });

    expect(toBottom).toHaveBeenCalledTimes(1);
  });

  it('滚轮滚回顶部触发 toTop', () => {
    const toTop = vi.fn();
    const { vl, clientEl } = mount({}, { toTop });
    vl.scrollToOffset(MAX_OFFSET);

    wheel(clientEl, { deltaY: -MAX_OFFSET });

    expect(toTop).toHaveBeenCalledTimes(1);
  });

  it('键盘翻页到底同样触发 toBottom', () => {
    const toBottom = vi.fn();
    const { clientEl } = mount({}, { toBottom });

    for (let i = 0; i < 40; i++) key(clientEl, { key: 'PageDown' });

    expect(toBottom).toHaveBeenCalled();
  });
});

describe('键盘', () => {
  it('方向键按步长滚动', () => {
    const { vl, clientEl } = mount();
    key(clientEl, { key: 'ArrowDown' });
    expect(vl.core.getOffset()).toBe(40);
    key(clientEl, { key: 'ArrowUp' });
    expect(vl.core.getOffset()).toBe(0);
  });

  it('翻页保留一点重叠，跨在边界上的那一项不会整个消失', () => {
    const { vl, clientEl } = mount();
    key(clientEl, { key: 'PageDown' });
    expect(vl.core.getOffset()).toBe(CLIENT - 40);
  });

  it('空格翻页，Shift + 空格反向', () => {
    const { vl, clientEl } = mount();
    key(clientEl, { key: ' ' });
    expect(vl.core.getOffset()).toBe(CLIENT - 40);
    key(clientEl, { key: ' ', shiftKey: true });
    expect(vl.core.getOffset()).toBe(0);
  });

  it('Home / End 直达两端', () => {
    const { vl, clientEl } = mount();
    key(clientEl, { key: 'End' });
    expect(vl.core.getOffset()).toBe(MAX_OFFSET);
    key(clientEl, { key: 'Home' });
    expect(vl.core.getOffset()).toBe(0);
  });

  it('焦点在输入控件里时方向键属于文本编辑，不抢', () => {
    const { vl, clientEl } = mount();
    const input = document.createElement('input');
    clientEl.appendChild(input);

    const e = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      cancelable: true,
      bubbles: true,
    });
    input.dispatchEvent(e);
    runFrame();

    expect(vl.core.getOffset()).toBe(0);
    expect(e.defaultPrevented).toBe(false);
  });

  it('组合键留给宿主（Ctrl+F 之类）', () => {
    const { vl, clientEl } = mount();
    const e = key(clientEl, { key: 'ArrowDown', ctrlKey: true });
    expect(vl.core.getOffset()).toBe(0);
    expect(e.defaultPrevented).toBe(false);
  });

  it('横向列表用左右方向键', () => {
    const { vl, clientEl } = mount({ horizontal: true });
    key(clientEl, { key: 'ArrowRight' });
    expect(vl.core.getOffset()).toBe(40);
    // 纵向键在横向列表里不该有反应
    key(clientEl, { key: 'ArrowDown' });
    expect(vl.core.getOffset()).toBe(40);
  });
});

describe('触摸', () => {
  function touch(
    el: HTMLElement,
    type: 'touchstart' | 'touchmove' | 'touchend',
    y: number,
    timeStamp = 0,
  ) {
    const e = new Event(type, { cancelable: true, bubbles: true }) as any;
    e.touches = type === 'touchend' ? [] : [{ clientX: 0, clientY: y }];
    Object.defineProperty(e, 'timeStamp', { value: timeStamp });
    el.dispatchEvent(e);
    runFrame();
    return e as TouchEvent;
  }

  it('手指上滑，内容跟着上走', () => {
    const { vl, clientEl } = mount();
    touch(clientEl, 'touchstart', 300, 0);
    touch(clientEl, 'touchmove', 250, 16);
    expect(vl.core.getOffset()).toBe(50);
    touch(clientEl, 'touchmove', 200, 32);
    expect(vl.core.getOffset()).toBe(100);
  });

  it('松手后惯性继续滑行，并逐帧衰减', () => {
    const { vl, clientEl } = mount();
    touch(clientEl, 'touchstart', 300, 0);
    touch(clientEl, 'touchmove', 260, 16);
    touch(clientEl, 'touchmove', 220, 32);
    const afterDrag = vl.core.getOffset();

    touch(clientEl, 'touchend', 220, 48);

    // 惯性靠 rAF 推进
    const steps: number[] = [];
    for (let i = 0; i < 5; i++) {
      runFrame();
      steps.push(vl.core.getOffset());
    }
    expect(steps[0]).toBeGreaterThan(afterDrag);

    // 每帧位移越来越小
    const d1 = steps[1]! - steps[0]!;
    const d2 = steps[4]! - steps[3]!;
    expect(d2).toBeLessThan(d1);
  });

  it('手指再次落下会刹住惯性', () => {
    const { vl, clientEl } = mount();
    touch(clientEl, 'touchstart', 300, 0);
    touch(clientEl, 'touchmove', 260, 16);
    touch(clientEl, 'touchmove', 220, 32);
    touch(clientEl, 'touchend', 220, 48);
    runFrame();

    const atStop = vl.core.getOffset();
    touch(clientEl, 'touchstart', 220, 64);
    runFrame();
    runFrame();
    expect(vl.core.getOffset()).toBe(atStop);
  });
});

describe('focus 吸收', () => {
  it('浏览器静默改动的 scrollTop 被归零并折算进虚拟偏移量', () => {
    const { vl, clientEl } = mount();
    vl.scrollToOffset(400);

    // 模拟浏览器为了露出获得焦点的元素而自行滚动容器
    clientEl.scrollTop = 60;
    clientEl.dispatchEvent(new Event('scroll'));
    runFrame();

    // 位移必须被折算进账本，否则内容会凭空错位 60px
    expect(vl.core.getOffset()).toBe(460);
    // 且容器自身要归零，不能留下双重位移
    expect(clientEl.scrollTop).toBe(0);
  });

  it('容器没有被动过时不做任何事', () => {
    const { vl, clientEl } = mount();
    vl.scrollToOffset(400);
    clientEl.dispatchEvent(new Event('scroll'));
    runFrame();
    expect(vl.core.getOffset()).toBe(400);
  });
});

