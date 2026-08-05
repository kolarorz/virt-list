import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 尽量贴近聊天室 demo 的完整场景。
 *
 * 与之前几个测试的关键差别：**项是按需测量的**。只有渲染出来的项才会被
 * ResizeObserver 观察到、才有真实高度；没渲染过的一直用 itemPreSize 估算。
 * demo 里估算值 76 而长消息实际 200，所以向下滚动时每进入一项，它的尺寸就会
 * 从估算值跳到真实值，总高度和后续项的位置随之持续变化。
 *
 * 之前的测试都用 measure() 一次性上报所有被观察元素，等于假设"尺寸早就准了"，
 * 把这条最容易出问题的路径简化掉了。
 */

const PRE_SIZE = 76;
const CLIENT_SIZE = 400;
const HEADER_SIZE = 30;
const COUNT = 200;
/** 展开成三屏 */
const EXPANDED = CLIENT_SIZE * 3;
const SLOT_IDS = ['client', 'header', 'footer', 'stickyHeader', 'stickyFooter'];

interface Item {
  id: string;
  text: string;
}

function makeList(n: number, prefix = 'm'): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`,
    text: `msg-${i}`,
  }));
}

/** 折叠态的真实高度：长短消息交替，且都不等于 itemPreSize */
function collapsedSizeOf(index: number): number {
  return index % 10 === 0 ? 200 : 76 + (index % 5) * 12;
}

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = {
  cb: null,
  targets: new Set(),
};
const OriginalRO = globalThis.ResizeObserver;
const OriginalRAF = globalThis.requestAnimationFrame;
const OriginalCAF = globalThis.cancelAnimationFrame;

/** 被展开的项（key → 高度），其余项走 collapsedSizeOf */
let expanded: Map<string, number>;
let rafQueue: (FrameRequestCallback | null)[];

function flushRaf() {
  const pending = rafQueue;
  rafQueue = [];
  pending.forEach((cb) => cb?.(0));
}

beforeEach(() => {
  ro.cb = null;
  ro.targets = new Set();
  expanded = new Map();
  rafQueue = [];
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    if (id >= 1 && id <= rafQueue.length) rafQueue[id - 1] = null;
  }) as typeof cancelAnimationFrame;
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
  globalThis.requestAnimationFrame = OriginalRAF;
  globalThis.cancelAnimationFrame = OriginalCAF;
  document.body.innerHTML = '';
});

/**
 * 只上报当前被观察的元素——也就是只有渲染出来的项才有真实高度，
 * 这正是浏览器的行为。
 */
function measure(list: Item[]) {
  const indexOfKey = new Map(list.map((it, i) => [it.id, i]));
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    let size: number;
    if (id === 'client') size = CLIENT_SIZE;
    else if (id === 'header') size = HEADER_SIZE;
    else if (expanded.has(id)) size = expanded.get(id)!;
    else size = collapsedSizeOf(indexOfKey.get(id) ?? 0);
    return {
      target: el,
      borderBoxSize: [{ blockSize: size, inlineSize: size }],
      contentRect: { height: size, width: size },
    } as unknown as ResizeObserverEntry;
  });
  ro.cb?.(entries, {} as ResizeObserver);
}

function setup(list: Item[]) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const vl = new VirtList<Item>(container, {
    list,
    itemKey: 'id',
    itemPreSize: PRE_SIZE,
    initialPosition: 'bottom',
    stickyBottom: true,
    renderItem: (item, _index, el) => {
      el.textContent = item.text;
    },
    renderHeader: (el) => {
      el.textContent = 'loading';
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

  // 首屏：定位到底部 + 渐进修正 + 首帧校准，交替推进直到稳定
  for (let i = 0; i < 8; i += 1) {
    measure(list);
    flushRaf();
    clientEl.dispatchEvent(new Event('scroll'));
  }
  return { vl, clientEl };
}

/**
 * 模拟一次滚轮，并返回**绘制那一刻**的布局快照。
 *
 * 浏览器一帧内的顺序是：scroll 事件 → 列表更新区间并 patch DOM → **绘制** →
 * ResizeObserver 回调（新项的真实高度这时才上报）→ 再 patch → 下一帧绘制。
 *
 * 用户眼睛看到的是第一次绘制，也就是"新项已经插进 DOM、但真实高度还没上报"
 * 的那个瞬间。所以判据要取在 measure 之前，取在之后就把这一帧检查漏掉了。
 */
function wheel(
  vl: VirtList<Item>,
  clientEl: HTMLElement,
  list: Item[],
  delta: number,
) {
  clientEl.scrollTop = clientEl.scrollTop + delta;
  clientEl.dispatchEvent(new Event('scroll'));

  // 这一刻浏览器就要绘制了
  const painted = realLayoutCoversViewport(vl, clientEl, list);

  measure(list);
  flushRaf();

  return painted;
}

/**
 * 按**真实 DOM 高度**推算渲染块的实际屏幕位置，看它是否盖住视口。
 *
 * 这是关键判据。用 core 的 getItemPosByIndex 去验证 core 是自证——它拿的是
 * sizesMap，而项刚渲染出来、ResizeObserver 还没上报的那一刻，sizesMap 里还是
 * itemPreSize 估算值，与浏览器实际布局出来的高度并不相同。用户看到的是后者。
 *
 * jsdom 不做布局，所以这里自己按浏览器的规则算一遍：
 * header 占前面一段，接着是虚拟占位元素（高度取 DOM 上生效的那个值），
 * 然后各渲染项按真实高度依次排下去。
 */
function realLayoutCoversViewport(
  vl: VirtList<Item>,
  clientEl: HTMLElement,
  list: Item[],
) {
  const indexOfKey = new Map(list.map((it, i) => [it.id, i]));
  const realHeight = (id: string) =>
    expanded.has(id)
      ? expanded.get(id)!
      : collapsedSizeOf(indexOfKey.get(id) ?? 0);

  const virtualEl = vl.listEl.firstElementChild as HTMLElement;
  const virtualH = Number.parseFloat(virtualEl.style.height || '0');

  // 渲染项在 DOM 里的实际顺序
  const itemEls = Array.from(vl.listEl.children).filter(
    (el) => (el as HTMLElement).dataset.id !== undefined,
  ) as HTMLElement[];

  let y = HEADER_SIZE + virtualH;
  const blockTop = y;
  for (const el of itemEls) {
    y += realHeight(el.dataset.id!);
  }
  const blockBottom = y;

  const viewTop = clientEl.scrollTop;
  const viewBottom = viewTop + CLIENT_SIZE;
  const state = vl.core.getState();
  const atListEnd = state.renderEnd >= list.length - 1;

  return {
    ok: blockTop <= viewTop && (atListEnd || viewBottom <= blockBottom),
    blockTop,
    blockBottom,
    viewTop,
    viewBottom,
    virtualH,
    state,
  };
}

/** 与视口相交的项，DOM 里是否都在 */
function domCoversViewport(
  vl: VirtList<Item>,
  clientEl: HTMLElement,
  list: Item[],
) {
  const present = new Set(
    Array.from(clientEl.querySelectorAll('div[data-id]'))
      .map((el) => (el as HTMLElement).dataset.id!)
      .filter((id) => !SLOT_IDS.includes(id)),
  );

  const offset = clientEl.scrollTop;
  const viewBottom = offset + CLIENT_SIZE;
  const missing: string[] = [];

  for (let i = 0; i < list.length; i += 1) {
    const pos = vl.core.getItemPosByIndex(i);
    if (pos.bottom <= offset || pos.top >= viewBottom) continue;
    if (!present.has(list[i]!.id)) missing.push(`${list[i]!.id}@${i}`);
  }

  const state = vl.core.getState();
  return {
    ok: missing.length === 0,
    missing,
    offset,
    viewBottom,
    state,
    /** DOM 上真正生效的虚拟占位高度 */
    virtualElHeight: Number.parseFloat(
      (vl.listEl.firstElementChild as HTMLElement).style.height || '0',
    ),
    expectedVirtualSize: (() => {
      let sum = 0;
      for (let i = 0; i < state.renderBegin; i += 1) {
        sum += vl.core.getItemSize(list[i]!.id);
      }
      return sum;
    })(),
  };
}

describe('聊天室高保真滚动（项按需测量）', () => {
  const TALL = 110;

  it('展开 #110 后连续小步向下滚动，每一步 DOM 都覆盖视口', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    // 滚到 #110 附近，让它先渲染出来
    clientEl.scrollTop = vl.core.getItemPosByIndex(TALL).top - 100;
    clientEl.dispatchEvent(new Event('scroll'));
    measure(list);
    flushRaf();

    // 展开
    expanded.set(list[TALL]!.id, EXPANDED);
    measure(list);
    flushRaf();

    // 模拟滚轮：连续小步往下滚，跨过整条展开的消息和它后面几项
    for (let step = 0; step < 120; step += 1) {
      // painted 是绘制那一刻的状态，也就是用户眼睛看到的东西
      const painted = wheel(vl, clientEl, list, 20);
      expect(
        painted.ok,
        `第 ${step} 步绘制时：视口 [${painted.viewTop}, ${painted.viewBottom}) ` +
          `没被渲染块 [${painted.blockTop}, ${painted.blockBottom}) 盖住；` +
          `占位高度=${painted.virtualH}，` +
          `inView=[${painted.state.inViewBegin},${painted.state.inViewEnd}] ` +
          `render=[${painted.state.renderBegin},${painted.state.renderEnd}]`,
      ).toBe(true);

      const cov = domCoversViewport(vl, clientEl, list);
      expect(
        cov.ok,
        `第 ${step} 步（scrollTop=${cov.offset}）缺少 DOM：[${cov.missing.join(', ')}]`,
      ).toBe(true);
    }
  });

  it('展开 #110 并用 align=end 定位后再向下滚，同样不留白', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    clientEl.scrollTop = vl.core.getItemPosByIndex(TALL).top - 100;
    clientEl.dispatchEvent(new Event('scroll'));
    measure(list);
    flushRaf();

    // demo 的做法：实测高度超过一屏 → 底部贴视口底部
    expanded.set(list[TALL]!.id, EXPANDED);
    measure(list);
    flushRaf();
    vl.scrollToIndex(TALL, { align: 'end' });
    for (let i = 0; i < 6; i += 1) {
      measure(list);
      flushRaf();
      clientEl.dispatchEvent(new Event('scroll'));
    }

    for (let step = 0; step < 60; step += 1) {
      wheel(vl, clientEl, list, 20);
      const cov = domCoversViewport(vl, clientEl, list);
      expect(
        cov.ok,
        `第 ${step} 步（scrollTop=${cov.offset}）缺少 DOM：[${cov.missing.join(', ')}]，` +
          `inView=[${cov.state.inViewBegin},${cov.state.inViewEnd}] ` +
          `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
      ).toBe(true);
    }
  });

  it('向上滚动同样不留白', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    clientEl.scrollTop = vl.core.getItemPosByIndex(TALL).top - 100;
    clientEl.dispatchEvent(new Event('scroll'));
    measure(list);
    flushRaf();

    expanded.set(list[TALL]!.id, EXPANDED);
    measure(list);
    flushRaf();

    // 先往下走一段，再一路往回滚
    for (let i = 0; i < 40; i += 1) wheel(vl, clientEl, list, 20);
    for (let step = 0; step < 80; step += 1) {
      wheel(vl, clientEl, list, -20);
      const cov = domCoversViewport(vl, clientEl, list);
      expect(
        cov.ok,
        `第 ${step} 步（scrollTop=${cov.offset}）缺少 DOM：[${cov.missing.join(', ')}]，` +
          `inView=[${cov.state.inViewBegin},${cov.state.inViewEnd}] ` +
          `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
      ).toBe(true);
    }
  });
});
