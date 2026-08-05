import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 浏览器滚动锚定（scroll anchoring）的干扰。
 *
 * 视口上方的内容高度一变，浏览器就会自作主张微调 scrollTop 来保持画面稳定，
 * **而且这个调整不派发 scroll 事件**。虚拟列表每次回填实测尺寸都在改内容高度，
 * 于是滚动位置被悄悄挪走，内部偏移量还留在旧值上，渲染区间就按错的位置去算，
 * 视口边缘留出空白——再滚一下（有了 scroll 事件）才恢复。
 *
 * jsdom 不实现这个特性，所以这里手动模拟：在尺寸上报的同时偷偷改 scrollTop、
 * 不派发任何事件，看列表能不能自己纠正回来。
 */

const PRE_SIZE = 76;
const CLIENT_SIZE = 498;
const HEADER_SIZE = 40;
const COUNT = 30;
const EXPANDED = 1099;

interface Item {
  id: string;
  text: string;
}

function makeList(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${i}`,
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

function measure() {
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    let size: number;
    if (id === 'client') size = CLIENT_SIZE;
    else if (id === 'header') size = HEADER_SIZE;
    else size = sizes.get(id) ?? 74;
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

  measure();
  measure();
  return { vl, clientEl };
}

function scrollTo(clientEl: HTMLElement, offset: number) {
  clientEl.scrollTop = offset;
  clientEl.dispatchEvent(new Event('scroll'));
}

/** 渲染区间是否覆盖整个视口 */
function coversViewport(vl: VirtList<Item>, clientEl: HTMLElement) {
  const state = vl.core.getState();
  const offset = clientEl.scrollTop;
  const top = vl.core.getItemPosByIndex(state.renderBegin).top;
  const bottom = vl.core.getItemPosByIndex(state.renderEnd).bottom;
  const atEnd = state.renderEnd >= vl.core.props.list.length - 1;
  return {
    ok: top <= offset && (atEnd || offset + CLIENT_SIZE <= bottom),
    top,
    bottom,
    offset,
    viewBottom: offset + CLIENT_SIZE,
    state,
  };
}

describe('浏览器偷偷改动 scrollTop（滚动锚定）', () => {
  const TALL = 20;

  it('滚动容器上关掉了 overflow-anchor', () => {
    const list = makeList(COUNT);
    const { vl } = setup(list);

    // 这是根治手段：让浏览器不要插手滚动位置
    expect(vl.clientEl.style.overflowAnchor).toBe('none');
  });

  it('尺寸变化时 scrollTop 被暗中改动（无 scroll 事件），区间仍能覆盖视口', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    // 展开 #20 到一屏以上
    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL).top - 100);
    measure();
    sizes.set(list[TALL]!.id, EXPANDED);
    measure();

    // 停在一个渲染余量刚好为零的位置：区间只到 #22，多一点都没有。
    // 用户日志里就是这种状态（渲染项数 3），任何偏移量滞后都会立刻露白
    scrollTo(clientEl, 2200);
    measure();
    expect(vl.core.getState().renderEnd).toBe(22);

    // 模拟滚动锚定：偷偷把 scrollTop 往前挪 100px，且**不派发 scroll 事件**
    clientEl.scrollTop = 2300;
    // 紧接着来一轮尺寸上报（真实情况里正是尺寸变化引发了上面的锚定）
    sizes.set(list[22]!.id, 70);
    measure();

    const cov = coversViewport(vl, clientEl);
    expect(
      cov.ok,
      `视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 [${cov.top}, ${cov.bottom}) 覆盖；` +
        `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
    ).toBe(true);
  });

  it('连续多次暗改都能纠正', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL).top - 100);
    measure();
    sizes.set(list[TALL]!.id, EXPANDED);
    measure();
    scrollTo(clientEl, 2200);
    measure();

    for (const [drift, tweak] of [
      [100, 70],
      [-60, 78],
      [120, 66],
    ] as const) {
      clientEl.scrollTop = clientEl.scrollTop + drift;
      // 尺寸也真的变一点，触发上报（锚定的诱因）
      sizes.set(list[22]!.id, tweak);
      measure();

      const cov = coversViewport(vl, clientEl);
      expect(
        cov.ok,
        `暗改 ${drift}px 后：视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 ` +
          `[${cov.top}, ${cov.bottom}) 覆盖；` +
          `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
      ).toBe(true);
    }
  });

  /**
   * 这一组不涉及任何"暗改"，是最朴素的场景：在一个高于视口的项内部往下滚。
   *
   * 起始项会长时间钉在同一项上，如果区间只在起始项变化时才重算，视口下边界推进
   * 的那部分就一直没人渲染，空白越滚越大——直到滚出这一项才恢复。
   */
  it('在超高项内部逐步向下滚，视口下方始终有内容', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL).top - 100);
    measure();
    sizes.set(list[TALL]!.id, EXPANDED);
    measure();

    const pos = vl.core.getItemPosByIndex(TALL);
    // 从这一项顶部一路滚到它底部之后，步长小到能暴露 off-by-one
    for (let y = pos.top; y <= pos.bottom + CLIENT_SIZE; y += 20) {
      scrollTo(clientEl, y);
      measure();

      const cov = coversViewport(vl, clientEl);
      expect(
        cov.ok,
        `滚到 ${y}：视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 ` +
          `[${cov.top}, ${cov.bottom}) 覆盖；` +
          `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
      ).toBe(true);
    }
  });

  it('在超高项内部滚动时，起始项不变也会更新结束项', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL).top - 100);
    measure();
    sizes.set(list[TALL]!.id, EXPANDED);
    measure();

    const pos = vl.core.getItemPosByIndex(TALL);
    scrollTo(clientEl, pos.top);
    measure();
    const beginAtTop = vl.core.getState().inViewBegin;
    const endAtTop = vl.core.getState().inViewEnd;

    // 滚到这一项的末段：起始项仍是它，结束项必须往后推
    scrollTo(clientEl, pos.bottom - 100);
    measure();
    const state = vl.core.getState();

    expect(state.inViewBegin).toBe(beginAtTop);
    expect(state.inViewEnd).toBeGreaterThan(endAtTop);
  });

  /**
   * 折叠：项尺寸骤然缩小，偏移量一动不动。
   *
   * 缩小之前那一项自己就撑满了视口，结束项因此只到它；缩回去之后要好几项才够，
   * 而偏移量没变，只靠"偏移量变化"驱动的重算完全不会被触发，视口下方就空一大块。
   */
  it('把撑满视口的项折叠回去，结束项要补足（偏移量没动）', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    // 展开 #20，并把视口顶部对齐到它
    sizes.set(list[TALL]!.id, EXPANDED);
    measure();
    const top = vl.core.getItemPosByIndex(TALL).top;
    scrollTo(clientEl, top);
    measure();

    // 一项就撑满了视口
    expect(vl.core.getState().inViewEnd).toBe(TALL + 1);

    // 折叠回去：只改尺寸，不动 scrollTop
    const offsetBefore = clientEl.scrollTop;
    sizes.set(list[TALL]!.id, 142);
    measure();

    expect(clientEl.scrollTop).toBe(offsetBefore);
    const cov = coversViewport(vl, clientEl);
    expect(
      cov.ok,
      `折叠后视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 ` +
        `[${cov.top}, ${cov.bottom}) 覆盖；` +
        `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
    ).toBe(true);
  });

  it('反复展开折叠，每一步视口都被填满', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    sizes.set(list[TALL]!.id, EXPANDED);
    measure();
    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL).top);
    measure();

    for (let i = 0; i < 4; i += 1) {
      sizes.set(list[TALL]!.id, 142);
      measure();
      let cov = coversViewport(vl, clientEl);
      expect(
        cov.ok,
        `第 ${i} 轮折叠后：视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 ` +
          `[${cov.top}, ${cov.bottom}) 覆盖；` +
          `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
      ).toBe(true);

      sizes.set(list[TALL]!.id, EXPANDED);
      measure();
      cov = coversViewport(vl, clientEl);
      expect(
        cov.ok,
        `第 ${i} 轮展开后：视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 ` +
          `[${cov.top}, ${cov.bottom}) 覆盖；` +
          `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
      ).toBe(true);
    }
  });

  it('列表中段的项缩小时也会补足（不止视口顶部那一项）', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 600);
    measure();

    // 视口内第二项撑得很高，然后缩回去
    const idx = vl.core.getState().inViewBegin + 1;
    sizes.set(list[idx]!.id, 900);
    measure();
    sizes.set(list[idx]!.id, 60);
    measure();

    const cov = coversViewport(vl, clientEl);
    expect(
      cov.ok,
      `视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 [${cov.top}, ${cov.bottom}) 覆盖；` +
        `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
    ).toBe(true);
  });

  /**
   * 项的绝大部分已经滚出视口上方、只露出底部一点点时，把它撑高。
   *
   * 它的顶部位置不变，只是往下延伸，所以 scrollOffset 不该有任何变化——
   * 视口里的内容会整体换成这一项的中段，但那是"内容变了"，不是"位置被挪了"。
   */
  it('项只露出底部一点时撑高，滚动位置一动不动', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    // 先让 #20 有个折叠态的实测高度
    sizes.set(list[TALL]!.id, 142);
    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL).top - 200);
    measure();

    // 滚到只剩它底部 20px 露在视口顶部
    const pos = vl.core.getItemPosByIndex(TALL);
    scrollTo(clientEl, pos.bottom - 20);
    measure();
    expect(vl.core.getState().inViewBegin).toBe(TALL);

    const offsetBefore = clientEl.scrollTop;
    const topBefore = vl.core.getItemPosByIndex(TALL).top;

    // 展开
    sizes.set(list[TALL]!.id, EXPANDED);
    measure();

    // 这一项的顶部没动，滚动位置也不该动
    expect(vl.core.getItemPosByIndex(TALL).top).toBe(topBefore);
    expect(clientEl.scrollTop).toBe(offsetBefore);

    // 而且视口要被填满（这一项现在够高了）
    const cov = coversViewport(vl, clientEl);
    expect(
      cov.ok,
      `视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 [${cov.top}, ${cov.bottom}) 覆盖`,
    ).toBe(true);
  });

  it('没有暗改时不会多做无用功（偏移量一致则不重算）', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 800);
    measure();
    const before = { ...vl.core.getState() };

    // 只上报一个尺寸没变的项，不动 scrollTop
    measure();

    expect(vl.core.getState()).toEqual(before);
  });
});
