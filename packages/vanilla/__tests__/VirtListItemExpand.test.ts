import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 项高度在原地突变（折叠消息的展开 / 收起）。
 *
 * 与头部增删不同：列表数据一个字没改，变的只是某一项渲染后的高度。列表靠
 * ResizeObserver 感知，需要更新总高度并让视口内容保持稳定——展开一条消息，
 * 只应该把它下方的内容推下去，视口顶部不能跟着动。
 */

const PRE_SIZE = 50;
const COLLAPSED = 50;
const EXPANDED = 170;
const CLIENT_SIZE = 300;
/** 用于带 header 的用例（加载提示条会占高度） */
const HEADER_SIZE = 30;

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

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = {
  cb: null,
  targets: new Set(),
};
const OriginalRO = globalThis.ResizeObserver;
const OriginalRAF = globalThis.requestAnimationFrame;
const OriginalCAF = globalThis.cancelAnimationFrame;

/** 每一项当前的"渲染高度"，展开就往这里写大值 */
let sizes: Map<string, number>;
/**
 * 待执行的 rAF 回调。
 *
 * 列表内部有几处逻辑挂在 rAF 上：首帧渲染后的区间校准、边界渐进修正的兜底、
 * 锚点窗口的关闭。浏览器里这些一定会跑，测试里必须显式驱动，
 * 否则整条时序都被跳过了。
 */
let rafQueue: (FrameRequestCallback | null)[];

/** 执行当前排队的 rAF 回调（回调里新排的留到下一次） */
function flushRaf(times = 1) {
  for (let i = 0; i < times; i += 1) {
    const pending = rafQueue;
    rafQueue = [];
    pending.forEach((cb) => cb?.(0));
  }
}

beforeEach(() => {
  ro.cb = null;
  ro.targets = new Set();
  sizes = new Map();
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

/** 把当前被观察的元素按 sizes 上报一遍，模拟浏览器完成一轮测量 */
function measure() {
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    const size =
      id === 'client'
        ? CLIENT_SIZE
        : id === 'header'
          ? HEADER_SIZE
          : (sizes.get(id) ?? COLLAPSED);
    return {
      target: el,
      borderBoxSize: [{ blockSize: size, inlineSize: size }],
      contentRect: { height: size, width: size },
    } as unknown as ResizeObserverEntry;
  });
  ro.cb?.(entries, {} as ResizeObserver);
}

function setup(
  list: Item[],
  opts?: { initialPosition?: 'top' | 'bottom'; headerSize?: number },
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const vl = new VirtList<Item>(container, {
    list,
    itemKey: 'id',
    itemPreSize: PRE_SIZE,
    initialPosition: opts?.initialPosition,
    renderItem: (item, _index, el) => {
      el.textContent = item.text;
    },
    ...(opts?.headerSize
      ? {
          renderHeader: (el: HTMLElement) => {
            el.textContent = 'header';
          },
        }
      : {}),
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

  // 劫持 scrollTop 之后补一次定位：构造期间（bindDOM）列表写的是 jsdom 的原生
  // 属性（不做裁剪），与这里劫持后的初值对不上，内部记录的偏移量会和容器脱节
  if (opts?.initialPosition === 'bottom') vl.scrollToBottom();

  return { vl, clientEl };
}

function scrollTo(clientEl: HTMLElement, offset: number) {
  clientEl.scrollTop = offset;
  clientEl.dispatchEvent(new Event('scroll'));
}

/** 某一项顶部相对视口顶部的偏移 */
function relOffsetOf(vl: VirtList<Item>, clientEl: HTMLElement, key: string) {
  const index = vl.core.props.list.findIndex((it) => it.id === key);
  if (index < 0) throw new Error(`找不到 ${key}`);
  return vl.core.getItemPosByIndex(index).top - clientEl.scrollTop;
}

/**
 * 视口是否落在渲染出的那批 DOM 之内。
 *
 * 白屏就是这个不变量被破坏：滚动位置指向的地方没有对应的 DOM。
 */
function viewportCovered(vl: VirtList<Item>, clientEl: HTMLElement) {
  const state = vl.core.getState();
  const offset = clientEl.scrollTop;
  let top = vl.core.getItemPosByIndex(state.renderBegin).top;
  const renderedTop = top;
  for (let i = state.renderBegin; i <= state.renderEnd; i += 1) {
    top += vl.core.getItemSize(vl.core.props.list[i]!.id);
  }
  return {
    ok: renderedTop <= offset && offset < top,
    renderedTop,
    renderedBottom: top,
    offset,
    state,
  };
}

/**
 * 渲染区间是否覆盖了**整个**视口，而不只是视口顶部。
 *
 * 视口下半部分没有 DOM 就是"内容下面有一块空白"。当某一项远高于视口、视口又深入
 * 它的内部时，这个不变量最容易破——从该项顶部算起累加一屏的高度，第一项就够了，
 * 于是后续项一个都没被渲染，而它们本该出现在视口下半部分。
 */
function viewportFullyCovered(vl: VirtList<Item>, clientEl: HTMLElement) {
  const state = vl.core.getState();
  const offset = clientEl.scrollTop;
  const renderedTop = vl.core.getItemPosByIndex(state.renderBegin).top;
  const renderedBottom = vl.core.getItemPosByIndex(state.renderEnd).bottom;
  const atListEnd = state.renderEnd >= vl.core.props.list.length - 1;
  return {
    // 已经渲染到列表最后一项时，下方本来就没有内容可渲染了
    ok:
      renderedTop <= offset &&
      (atListEnd || offset + CLIENT_SIZE <= renderedBottom),
    renderedTop,
    renderedBottom,
    viewBottom: offset + CLIENT_SIZE,
    offset,
    state,
  };
}

const SLOT_IDS = ['client', 'header', 'footer', 'stickyHeader', 'stickyFooter'];

/**
 * 与视口相交的项，DOM 里是否真的存在。
 *
 * 这是最贴近"用户看到什么"的判据：几何算得对、但 DOM 没被 patch 出来，
 * 用户看到的依然是空白。
 */
function domCoversViewport(vl: VirtList<Item>, clientEl: HTMLElement) {
  const present = new Set(
    Array.from(clientEl.querySelectorAll('div[data-id]'))
      .map((el) => (el as HTMLElement).dataset.id!)
      .filter((id) => !SLOT_IDS.includes(id)),
  );

  const offset = clientEl.scrollTop;
  const viewBottom = offset + CLIENT_SIZE;
  const list = vl.core.props.list;
  const missing: string[] = [];

  for (let i = 0; i < list.length; i += 1) {
    const pos = vl.core.getItemPosByIndex(i);
    // 与视口不相交的项本来就不该渲染
    if (pos.bottom <= offset || pos.top >= viewBottom) continue;
    if (!present.has(list[i]!.id)) missing.push(`${list[i]!.id}@${i}`);
  }

  return { ok: missing.length === 0, missing, present, offset, viewBottom };
}

describe('单项高度超过一屏', () => {
  /** 展开成三屏高 */
  const VERY_TALL = CLIENT_SIZE * 3;

  it('滚到超高项的末段时，视口下半部分也要有内容（不能留空白）', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    const expandIndex = vl.core.getState().inViewBegin;
    const expandKey = vl.core.props.list[expandIndex]!.id;
    sizes.set(expandKey, VERY_TALL);
    measure();
    flushRaf();

    // 滚到这条消息的末段：视口上半是消息尾部，下半应该是后面几条消息
    const pos = vl.core.getItemPosByIndex(expandIndex);
    scrollTo(clientEl, pos.bottom - CLIENT_SIZE / 2);
    measure();
    flushRaf();

    const cov = viewportFullyCovered(vl, clientEl);
    expect(
      cov.ok,
      `视口 [${cov.offset}, ${cov.viewBottom}) 超出了渲染区间 [${cov.renderedTop}, ${cov.renderedBottom})`,
    ).toBe(true);
  });

  it('从超高项内部一路细步滚到它之后的几项，每一步都不留空白', () => {
    const list = makeList(200);
    const { vl, clientEl } = setup(list, { headerSize: 30 });

    // 让它落在列表中段，和 demo 里 #110 的位置相当
    const TALL = 110;
    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL).top - 100);
    measure();
    flushRaf();

    sizes.set(vl.core.props.list[TALL]!.id, VERY_TALL);
    measure();
    flushRaf();

    const pos = vl.core.getItemPosByIndex(TALL);
    // 从超高项内部一路滚到它后面第 4 项，步长取小值，off-by-one 才藏不住
    const from = pos.top;
    const to = vl.core.getItemPosByIndex(TALL + 4).bottom;
    for (let y = from; y <= to; y += 25) {
      scrollTo(clientEl, y);
      measure();
      const dom = domCoversViewport(vl, clientEl);
      expect(
        dom.ok,
        `滚到 ${y} 时视口 [${dom.offset}, ${dom.viewBottom}) 内这些项没有 DOM：` +
          `${dom.missing.join(', ')}`,
      ).toBe(true);

      const cov = viewportFullyCovered(vl, clientEl);
      expect(
        cov.ok,
        `滚到 ${y} 时视口 [${cov.offset}, ${cov.viewBottom}) 超出渲染区间 ` +
          `[${cov.renderedTop}, ${cov.renderedBottom})，` +
          `区间 inView=[${cov.state.inViewBegin},${cov.state.inViewEnd}] ` +
          `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
      ).toBe(true);
    }
  });

  it('在超高项内部逐段滚动，视口始终被完整覆盖', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    const expandIndex = vl.core.getState().inViewBegin;
    const expandKey = vl.core.props.list[expandIndex]!.id;
    sizes.set(expandKey, VERY_TALL);
    measure();
    flushRaf();

    const pos = vl.core.getItemPosByIndex(expandIndex);
    for (let y = pos.top; y <= pos.bottom; y += CLIENT_SIZE / 3) {
      scrollTo(clientEl, y);
      measure();
      const cov = viewportFullyCovered(vl, clientEl);
      expect(
        cov.ok,
        `滚到 ${y} 时视口 [${cov.offset}, ${cov.viewBottom}) 超出渲染区间 [${cov.renderedTop}, ${cov.renderedBottom})`,
      ).toBe(true);
    }
  });

  it('展开成三屏后，视口仍落在渲染出的内容上', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    const expandIndex = vl.core.getState().inViewBegin;
    const expandKey = vl.core.props.list[expandIndex]!.id;
    sizes.set(expandKey, VERY_TALL);
    measure();

    const cov = viewportCovered(vl, clientEl);
    expect(
      cov.ok,
      `视口 ${cov.offset} 不在渲染区间 [${cov.renderedTop}, ${cov.renderedBottom})`,
    ).toBe(true);
  });

  it('聊天室配置（首屏定位到底部）下展开三屏消息不白屏', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list, { initialPosition: 'bottom' });
    // 首屏定位到底部会挂渐进修正任务，测量与 rAF 兜底交替推进直到收敛
    for (let i = 0; i < 6; i += 1) {
      measure();
      flushRaf();
      clientEl.dispatchEvent(new Event('scroll'));
    }

    // 向上滚一段（聊天室里读历史的动作，会立下滚动锚点）
    scrollTo(clientEl, clientEl.scrollTop - 800);
    measure();
    flushRaf();

    const expandIndex = vl.core.getState().inViewBegin + 1;
    const expandKey = vl.core.props.list[expandIndex]!.id;
    sizes.set(expandKey, VERY_TALL);
    measure();
    flushRaf();

    const cov = viewportCovered(vl, clientEl);
    expect(
      cov.ok,
      `视口 ${cov.offset} 不在渲染区间 [${cov.renderedTop}, ${cov.renderedBottom})`,
    ).toBe(true);
  });

  it('首屏定位到底部后，rAF 的首帧校准不会把区间拽回列表顶部', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list, { initialPosition: 'bottom' });

    // 首次尺寸上报会排一个 rAF 做首帧区间校准，它用的是 start（默认 0）
    measure();
    flushRaf();
    clientEl.dispatchEvent(new Event('scroll'));

    const state = vl.core.getState();
    // 视口在底部，区间就不该回到 0 附近
    expect(state.inViewBegin).toBeGreaterThan(0);
    const cov = viewportCovered(vl, clientEl);
    expect(
      cov.ok,
      `视口 ${cov.offset} 不在渲染区间 [${cov.renderedTop}, ${cov.renderedBottom})`,
    ).toBe(true);
  });

  it('展开时若底部渐进修正任务尚未收敛，视口也不该被拽走', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list, { initialPosition: 'bottom' });

    // 刻意只推进一轮就打断：底部修正任务此刻还挂着
    measure();
    clientEl.dispatchEvent(new Event('scroll'));

    // 用户向上滚去读历史
    scrollTo(clientEl, Math.max(0, clientEl.scrollTop - 900));
    measure();
    const offsetBeforeExpand = clientEl.scrollTop;

    // 展开一条三屏高的消息
    const expandIndex = vl.core.getState().inViewBegin + 1;
    const expandKey = vl.core.props.list[expandIndex]!.id;
    sizes.set(expandKey, VERY_TALL);
    measure();
    flushRaf();
    clientEl.dispatchEvent(new Event('scroll'));

    // 展开只应该把下方内容推下去，不该把视口拽到列表底部
    expect(
      clientEl.scrollTop,
      `展开后 scrollTop 从 ${offsetBeforeExpand} 变成 ${clientEl.scrollTop}`,
    ).toBeLessThanOrEqual(offsetBeforeExpand + VERY_TALL);
    const cov = viewportCovered(vl, clientEl);
    expect(
      cov.ok,
      `视口 ${cov.offset} 不在渲染区间 [${cov.renderedTop}, ${cov.renderedBottom})`,
    ).toBe(true);
  });

  it('在三屏高的项内部逐段向下滚动，始终有内容', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    const expandIndex = vl.core.getState().inViewBegin;
    const expandKey = vl.core.props.list[expandIndex]!.id;
    sizes.set(expandKey, VERY_TALL);
    measure();

    const pos = vl.core.getItemPosByIndex(expandIndex);
    // 从这一项顶部一路滚到它底部
    for (let y = pos.top; y < pos.bottom; y += CLIENT_SIZE / 2) {
      scrollTo(clientEl, y);
      measure();
      const cov = viewportCovered(vl, clientEl);
      expect(
        cov.ok,
        `滚到 ${y} 时视口 ${cov.offset} 不在渲染区间 [${cov.renderedTop}, ${cov.renderedBottom})`,
      ).toBe(true);
    }
  });

  it('展开三屏后再收起，几何仍然自洽', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    const expandIndex = vl.core.getState().inViewBegin;
    const expandKey = vl.core.props.list[expandIndex]!.id;
    sizes.set(expandKey, VERY_TALL);
    measure();
    sizes.set(expandKey, COLLAPSED);
    measure();

    const cov = viewportCovered(vl, clientEl);
    expect(
      cov.ok,
      `视口 ${cov.offset} 不在渲染区间 [${cov.renderedTop}, ${cov.renderedBottom})`,
    ).toBe(true);
  });
});

describe('折叠消息：项高度原地突变', () => {
  it('展开视口内的一项，视口顶部内容不动，总高度增加', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    const topKey = vl.core.props.list[vl.core.getState().inViewBegin]!.id;
    const relTopBefore = relOffsetOf(vl, clientEl, topKey);
    const totalBefore = vl.core.getState().listTotalSize;

    // 展开视口中间那一项（视口顶部之下）
    const expandIndex = vl.core.getState().inViewBegin + 2;
    const expandKey = vl.core.props.list[expandIndex]!.id;
    sizes.set(expandKey, EXPANDED);
    measure();

    // 视口顶部那一项不能动——展开只应该把它下方的内容推下去
    expect(relOffsetOf(vl, clientEl, topKey)).toBe(relTopBefore);
    expect(vl.core.getState().listTotalSize).toBe(
      totalBefore + (EXPANDED - COLLAPSED),
    );
    expect(vl.core.getItemSize(expandKey)).toBe(EXPANDED);
  });

  it('展开视口顶部那一项，它自己的顶部保持不动', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    const topKey = vl.core.props.list[vl.core.getState().inViewBegin]!.id;
    const relBefore = relOffsetOf(vl, clientEl, topKey);

    sizes.set(topKey, EXPANDED);
    measure();

    expect(relOffsetOf(vl, clientEl, topKey)).toBe(relBefore);
  });

  it('收起后总高度与位置都还原', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    const topKey = vl.core.props.list[vl.core.getState().inViewBegin]!.id;
    const relBefore = relOffsetOf(vl, clientEl, topKey);
    const totalBefore = vl.core.getState().listTotalSize;

    const expandKey = vl.core.props.list[vl.core.getState().inViewBegin + 1]!.id;
    sizes.set(expandKey, EXPANDED);
    measure();
    sizes.set(expandKey, COLLAPSED);
    measure();

    expect(vl.core.getState().listTotalSize).toBe(totalBefore);
    expect(relOffsetOf(vl, clientEl, topKey)).toBe(relBefore);
  });

  it('反复展开收起不会累积漂移', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    const topKey = vl.core.props.list[vl.core.getState().inViewBegin]!.id;
    const relBefore = relOffsetOf(vl, clientEl, topKey);
    const totalBefore = vl.core.getState().listTotalSize;
    const expandKey = vl.core.props.list[vl.core.getState().inViewBegin + 2]!.id;

    for (let i = 0; i < 5; i += 1) {
      sizes.set(expandKey, EXPANDED);
      measure();
      sizes.set(expandKey, COLLAPSED);
      measure();
    }

    expect(vl.core.getState().listTotalSize).toBe(totalBefore);
    expect(relOffsetOf(vl, clientEl, topKey)).toBe(relBefore);
  });

  it('批量展开（所有项变高）后总高度正确，且视口仍落在渲染出的内容上', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    // 全部展开：先改高度，再 forceUpdate 重建渲染窗口内的项
    list.forEach((it) => sizes.set(it.id, EXPANDED));
    vl.forceUpdate();
    measure();
    measure();

    const state = vl.core.getState();
    // 渲染窗口必须覆盖可视区，否则视口就是空白
    expect(state.renderBegin).toBeLessThanOrEqual(state.inViewBegin);
    expect(state.renderEnd).toBeGreaterThanOrEqual(state.inViewBegin);

    const topOfInView = vl.core.getItemPosByIndex(state.inViewBegin).top;
    expect(Math.abs(topOfInView - clientEl.scrollTop)).toBeLessThanOrEqual(
      EXPANDED,
    );
  });

  it('展开后再向上加载历史，位置依然连续', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1000);
    measure();

    // 展开视口里的一条
    const expandKey = vl.core.props.list[vl.core.getState().inViewBegin + 1]!.id;
    sizes.set(expandKey, EXPANDED);
    measure();

    const topKey = vl.core.props.list[vl.core.getState().inViewBegin]!.id;
    const relBefore = relOffsetOf(vl, clientEl, topKey);

    // 滚到顶加载上一页
    scrollTo(clientEl, 0);
    measure();
    const relAtTop = relOffsetOf(vl, clientEl, topKey);

    const older = makeList(20, 'older');
    vl.setList([...older, ...list]);
    expect(relOffsetOf(vl, clientEl, topKey)).toBe(relAtTop);

    measure();
    expect(relOffsetOf(vl, clientEl, topKey)).toBe(relAtTop);
    // 展开状态（尺寸）不受列表变更影响
    expect(vl.core.getItemSize(expandKey)).toBe(EXPANDED);
    expect(relBefore).toBeDefined();
  });
});
