import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 程序化滚动之后，内部偏移量必须与真实 scrollTop 同步。
 *
 * 写 scrollTop 触发的 scroll 事件是浏览器**异步**回送的。在它到达之前，如果
 * ResizeObserver 先触发一轮（尺寸还在变的时候非常常见），列表就会拿滞后的偏移量
 * 去算渲染区间——区间对应的是旧位置，而视口已经在新位置上了，下方于是留出一块
 * 没有 DOM 的空白。等下一次真实滚动把 scroll 事件送到，区间重算，画面才恢复。
 *
 * 这几个用例的关键就是**不派发 scroll 事件**，只让 ResizeObserver 先到。
 */

const PRE_SIZE = 76;
const CLIENT_SIZE = 498;
const HEADER_SIZE = 40;
const COUNT = 60;
const EXPANDED = 1146;

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

/** 只上报被观察的元素——只有渲染出来的项才有真实高度 */
function measure() {
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    let size: number;
    if (id === 'client') size = CLIENT_SIZE;
    else if (id === 'header') size = HEADER_SIZE;
    else size = sizes.get(id) ?? PRE_SIZE;
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

/**
 * 渲染区间是否覆盖整个视口。
 *
 * 判据用 core 自己的位置计算即可——这里要验的是"区间是按哪个偏移量算的"，
 * 而不是位置算得准不准。
 */
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

/**
 * 构造期间就回调出去，是原生用法最容易踩的坑：
 *
 *   const vl = new VirtList(el, { hasMoreBottom: false }, {
 *     loadStateChange: () => vl.core.getState(),   // ← vl 还没赋值
 *   });
 *
 * 报出来是 "Cannot access 'vl' before initialization"。所以初始加载状态不该在
 * 构造期间推送——需要的话 getLoadState() 随时能取。
 */
describe('构造期间不回调加载状态', () => {
  it('hasMoreBottom 为 false 时，构造期间不触发 loadStateChange', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const loadStateChange = vi.fn();

    new VirtList<Item>(
      container,
      {
        list: makeList(30),
        itemKey: 'id',
        itemPreSize: PRE_SIZE,
        hasMoreBottom: false,
        renderItem: (item, _i, el) => {
          el.textContent = item.text;
        },
      },
      { loadStateChange },
    );

    expect(loadStateChange).not.toHaveBeenCalled();
  });

  it('事件回调里访问实例不会因构造期未完成而抛错', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let vl: VirtList<Item> | undefined;
    expect(() => {
      vl = new VirtList<Item>(
        container,
        {
          list: makeList(30),
          itemKey: 'id',
          itemPreSize: PRE_SIZE,
          hasMoreTop: false,
          hasMoreBottom: false,
          renderItem: (item, _i, el) => {
            el.textContent = item.text;
          },
        },
        {
          // 使用方普遍会这么写；构造期间被调到就会炸
          loadStateChange: () => vl!.core.getState(),
        },
      );
    }).not.toThrow();

    expect(vl).toBeDefined();
  });
});

describe('程序化滚动后的偏移量同步', () => {
  const TALL = 20;

  it('scrollToIndex 之后 ResizeObserver 先到（scroll 事件还没来），区间不能算错', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    // 展开 #20，让它高过一屏
    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL).top - 100);
    measure();
    sizes.set(list[TALL]!.id, EXPANDED);
    measure();

    // 底部对齐定位，随后只让 ResizeObserver 触发——scroll 事件故意不派发，
    // 模拟浏览器还没把它送回来的那一刻
    vl.scrollToIndex(TALL, { align: 'end' });
    measure();

    const cov = coversViewport(vl, clientEl);
    expect(
      cov.ok,
      `视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 [${cov.top}, ${cov.bottom}) 覆盖；` +
        `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
    ).toBe(true);
  });

  it('scrollToOffset 之后同理', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 500);
    measure();

    // 直接跳到远处，不派发 scroll，只让 ResizeObserver 触发
    vl.scrollToOffset(2500);
    measure();

    const cov = coversViewport(vl, clientEl);
    expect(
      cov.ok,
      `视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 [${cov.top}, ${cov.bottom}) 覆盖；` +
        `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
    ).toBe(true);
  });

  it('scrollToBottom 之后同理', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 500);
    measure();

    vl.scrollToBottom();
    measure();

    const cov = coversViewport(vl, clientEl);
    expect(
      cov.ok,
      `视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 [${cov.top}, ${cov.bottom}) 覆盖；` +
        `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
    ).toBe(true);
  });

  it('渐进修正连续跑几轮（每轮只有 ResizeObserver），区间始终跟得上', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL).top - 100);
    measure();

    // 展开与定位同一步发出，之后只靠 ResizeObserver 推进修正
    sizes.set(list[TALL]!.id, EXPANDED);
    vl.scrollToIndex(TALL, { align: 'end' });

    for (let round = 0; round < 5; round += 1) {
      measure();
      const cov = coversViewport(vl, clientEl);
      expect(
        cov.ok,
        `第 ${round} 轮：视口 [${cov.offset}, ${cov.viewBottom}) 没被渲染区间 ` +
          `[${cov.top}, ${cov.bottom}) 覆盖；` +
          `render=[${cov.state.renderBegin},${cov.state.renderEnd}]`,
      ).toBe(true);
    }
  });
});
