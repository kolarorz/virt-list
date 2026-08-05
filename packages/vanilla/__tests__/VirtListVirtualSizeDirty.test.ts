import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 渲染窗口之外的项上报尺寸时，虚拟占位高度必须跟着修正。
 *
 * virtualSize（= renderBegin 之前所有项的累计高度）是增量维护的，前提是"被观察的
 * 项都在渲染窗口内"。这个前提会被打破：项滚出窗口、DOM 被移除、unobserve 也调了，
 * 但 ResizeObserver 的回调是异步的，队列里可能还压着它的一条上报。快速滚动时
 * 这种情况很常见。
 *
 * 一旦发生，增量值就不再可信。若上层拿着这个陈旧值去摆放渲染块，整块内容都会
 * 偏移——表现就是某几项看不见了，再滚一下才恢复。
 */

const COLLAPSED = 50;
const CLIENT_SIZE = 300;
const COUNT = 200;

interface Item {
  id: string;
  text: string;
}

function makeList(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m-${i}`,
    text: `msg-${i}`,
  }));
}

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = {
  cb: null,
  targets: new Set(),
};
const OriginalRO = globalThis.ResizeObserver;
let sizes: Map<string, number>;

beforeEach(() => {
  ro.cb = null;
  ro.targets = new Set();
  sizes = new Map();
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      ro.cb = cb;
    }
    observe(el: Element) {
      ro.targets.add(el);
    }
    unobserve(el: Element) {
      ro.targets.delete(el);
    }
    disconnect() {
      ro.targets.clear();
    }
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
});

function entryFor(id: string, size: number) {
  const target = document.createElement('div');
  target.dataset.id = id;
  return {
    target,
    borderBoxSize: [{ blockSize: size, inlineSize: size }],
    contentRect: { height: size, width: size },
  } as unknown as ResizeObserverEntry;
}

function measure() {
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    const size = id === 'client' ? CLIENT_SIZE : (sizes.get(id) ?? COLLAPSED);
    return entryFor(id, size);
  });
  ro.cb?.(entries, {} as ResizeObserver);
}

function setup(list: Item[]) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const vl = new VirtList<Item>(container, {
    list,
    itemKey: 'id',
    itemPreSize: COLLAPSED,
    renderItem: (item, _index, el) => {
      el.textContent = item.text;
    },
  });

  const clientEl = vl.clientEl;
  let scrollValue = 0;
  Object.defineProperty(clientEl, 'scrollTop', {
    configurable: true,
    get: () => scrollValue,
    set: (v: number) => {
      const max = Math.max(0, vl.core.getTotalSize() - CLIENT_SIZE);
      scrollValue = Math.min(Math.max(v, 0), max);
    },
  });

  measure();
  measure();
  return { vl, clientEl };
}

function scrollTo(clientEl: HTMLElement, offset: number) {
  clientEl.scrollTop = offset;
  clientEl.dispatchEvent(new Event('scroll'));
}

/** 虚拟占位元素当前的高度（DOM 上真正生效的那个值） */
function virtualElHeight(vl: VirtList<Item>): number {
  const el = vl.listEl.firstElementChild as HTMLElement;
  return Number.parseFloat(el.style.height || '0');
}

/** 权威的占位高度：renderBegin 之前所有项的累计高度 */
function expectedVirtualSize(vl: VirtList<Item>): number {
  const { renderBegin } = vl.core.getState();
  let sum = 0;
  for (let i = 0; i < renderBegin; i += 1) {
    sum += vl.core.getItemSize(vl.core.props.list[i]!.id);
  }
  return sum;
}

describe('渲染窗口外的尺寸上报', () => {
  it('窗口外的项报来新尺寸后，DOM 的虚拟占位高度仍然正确', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 2500);
    measure();

    const { renderBegin } = vl.core.getState();
    expect(renderBegin).toBeGreaterThan(20);

    // 一个远在渲染窗口之上的项报来了真实尺寸（比估算值高很多）——
    // 它的 DOM 早就被移除了，这条上报是队列里的残留
    const staleIndex = 10;
    const staleKey = list[staleIndex]!.id;
    sizes.set(staleKey, 200);
    ro.cb?.([entryFor(staleKey, 200)], {} as ResizeObserver);

    expect(virtualElHeight(vl)).toBe(expectedVirtualSize(vl));
  });

  it('多个窗口外的项接连上报，占位高度依然正确', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 3000);
    measure();

    for (const idx of [5, 12, 27, 33]) {
      const key = list[idx]!.id;
      sizes.set(key, 150);
      ro.cb?.([entryFor(key, 150)], {} as ResizeObserver);
    }

    expect(virtualElHeight(vl)).toBe(expectedVirtualSize(vl));
  });

  it('窗口外上报之后继续滚动，占位高度保持正确', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 2500);
    measure();

    const staleKey = list[10]!.id;
    sizes.set(staleKey, 220);
    ro.cb?.([entryFor(staleKey, 220)], {} as ResizeObserver);

    for (const y of [2600, 2800, 2400, 3200]) {
      scrollTo(clientEl, y);
      measure();
      expect(
        virtualElHeight(vl),
        `滚到 ${y} 时占位高度 ${virtualElHeight(vl)} != ${expectedVirtualSize(vl)}`,
      ).toBe(expectedVirtualSize(vl));
    }
  });
});
