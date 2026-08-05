import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 「加载上一页后白屏」的 DOM 级回归。
 *
 * core 层的测试只看内部状态，这里跑完整链路：真实的 DOM patch、真实的
 * scrollTop clamp、由 ResizeObserver 事后上报的不定高尺寸。判据是几何自洽——
 * 视口位置必须落在渲染出来的那批 DOM 之内，否则用户看到的就是空白。
 */

const PRE_SIZE = 40;
const CLIENT_SIZE = 300;
const HEADER_SIZE = 30;
/** 实测高度与预估值刻意不同，且长短交替，模拟聊天消息 */
const sizeOfItem = (id: string) => (id.charCodeAt(id.length - 1) % 2 ? 90 : 50);

interface Item {
  id: string;
  text: string;
}

function makeList(n: number, prefix = 'a', start = 0): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${start + i}`,
    text: `item-${start + i}`,
  }));
}

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = {
  cb: null,
  targets: new Set(),
};
const OriginalRO = globalThis.ResizeObserver;

beforeEach(() => {
  ro.cb = null;
  ro.targets = new Set();
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

/** 把当前被观察的元素全部上报一遍，模拟浏览器完成一轮测量 */
function measure() {
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    const size =
      id === 'client'
        ? CLIENT_SIZE
        : id === 'header'
          ? HEADER_SIZE
          : sizeOfItem(id);
    return {
      target: el,
      borderBoxSize: [{ blockSize: size, inlineSize: size }],
      contentRect: { height: size, width: size },
    } as unknown as ResizeObserverEntry;
  });
  ro.cb?.(entries, {} as ResizeObserver);
}

function setup(list: Item[], opts?: { initialPosition?: 'top' | 'bottom' }) {
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
    renderHeader: (el) => {
      el.textContent = 'loading-bar';
    },
  });

  const clientEl = vl.clientEl;
  // 浏览器语义的 scrollTop：写入被裁剪到 [0, 可滚动上限]
  let scrollValue = 0;
  Object.defineProperty(clientEl, 'scrollTop', {
    configurable: true,
    get: () => scrollValue,
    set: (v: number) => {
      const max = Math.max(0, vl.core.getTotalSize() - CLIENT_SIZE);
      scrollValue = Math.min(Math.max(v, 0), max);
    },
  });

  // 首屏测量：容器、header、首批项
  measure();
  measure();
  return { vl, container, clientEl };
}

function scrollTo(clientEl: HTMLElement, offset: number) {
  clientEl.scrollTop = offset;
  clientEl.dispatchEvent(new Event('scroll'));
}

/** 当前 DOM 的几何快照 */
function snapshot(vl: VirtList<Item>, clientEl: HTMLElement) {
  const state = vl.core.getState();
  const items = Array.from(
    clientEl.querySelectorAll('div[data-id]'),
  ) as HTMLElement[];
  const itemIds = items
    .map((el) => el.dataset.id!)
    .filter((id) => !['client', 'header', 'footer'].includes(id));
  return {
    scrollTop: clientEl.scrollTop,
    virtualSize: state.virtualSize,
    renderBegin: state.renderBegin,
    renderEnd: state.renderEnd,
    inViewBegin: state.inViewBegin,
    firstRenderedId: itemIds[0],
    itemCount: itemIds.length,
    /** 渲染出的这批 DOM 在文档流中占据的区间（相对滚动容器内容顶部） */
    renderedTop: HEADER_SIZE + state.virtualSize,
    renderedBottom:
      HEADER_SIZE +
      state.virtualSize +
      itemIds.reduce((sum, id) => sum + sizeOfItem(id), 0),
  };
}

/** 视口是否真的落在渲染出的那批 DOM 之内——白屏就是这个不变量被破坏 */
function viewportCovered(s: ReturnType<typeof snapshot>) {
  return (
    s.renderedTop <= s.scrollTop && s.scrollTop < s.renderedBottom
  );
}

describe('加载上一页（头部插入）后的 DOM 几何', () => {
  it('滚到顶加载上一页后，视口立刻落在新渲染的内容上（无需再滚动一次）', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    // 向下滚再向上滚到顶，复现「滚到顶触发加载」的真实时序
    scrollTo(clientEl, 1200);
    measure();
    scrollTo(clientEl, 0);
    measure();

    const older = makeList(20, 'older');
    vl.setList([...older, ...list]);

    // 插入瞬间（新项尺寸还是预估值）
    const afterInsert = snapshot(vl, clientEl);
    expect(
      viewportCovered(afterInsert),
      `插入后视口 ${afterInsert.scrollTop} 不在渲染区间 [${afterInsert.renderedTop}, ${afterInsert.renderedBottom})`,
    ).toBe(true);

    // 新项完成测量
    measure();
    const afterMeasure = snapshot(vl, clientEl);
    expect(
      viewportCovered(afterMeasure),
      `测量后视口 ${afterMeasure.scrollTop} 不在渲染区间 [${afterMeasure.renderedTop}, ${afterMeasure.renderedBottom})`,
    ).toBe(true);

    // 关键判据：此刻再滚 1px 不应该让区间发生跳变。
    // 若跳变，说明上面那一刻的区间本就是错的——正是「滚一下才出现内容」的现象
    const before = snapshot(vl, clientEl);
    scrollTo(clientEl, before.scrollTop - 1);
    const after = snapshot(vl, clientEl);

    expect(
      Math.abs(after.renderBegin - before.renderBegin),
      `滚 1px 后 renderBegin 从 ${before.renderBegin} 跳到 ${after.renderBegin}`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(after.virtualSize - before.virtualSize),
      `滚 1px 后 virtualSize 从 ${before.virtualSize} 跳到 ${after.virtualSize}`,
    ).toBeLessThanOrEqual(sizeOfItem(before.firstRenderedId ?? 'a-0'));
  });

  it('initialPosition=bottom（聊天室）下加载上一页同样立刻可见', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list, { initialPosition: 'bottom' });

    // 首屏定位到底部会挂渐进修正任务，多测量几轮让它收敛
    for (let i = 0; i < 4; i += 1) measure();

    scrollTo(clientEl, 0);
    measure();

    const older = makeList(20, 'older');
    vl.setList([...older, ...list]);

    const afterInsert = snapshot(vl, clientEl);
    expect(
      viewportCovered(afterInsert),
      `插入后视口 ${afterInsert.scrollTop} 不在渲染区间 [${afterInsert.renderedTop}, ${afterInsert.renderedBottom})`,
    ).toBe(true);

    measure();
    const afterMeasure = snapshot(vl, clientEl);
    expect(
      viewportCovered(afterMeasure),
      `测量后视口 ${afterMeasure.scrollTop} 不在渲染区间 [${afterMeasure.renderedTop}, ${afterMeasure.renderedBottom})`,
    ).toBe(true);

    const before = snapshot(vl, clientEl);
    scrollTo(clientEl, before.scrollTop - 1);
    const after = snapshot(vl, clientEl);
    expect(
      Math.abs(after.renderBegin - before.renderBegin),
      `滚 1px 后 renderBegin 从 ${before.renderBegin} 跳到 ${after.renderBegin}`,
    ).toBeLessThanOrEqual(1);
  });

  it('插入项测出真实尺寸后，原本在看的内容不被整体挤下去', () => {
    const list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1200);
    measure();
    scrollTo(clientEl, 0);
    measure();

    /** a-0 的顶部相对视口顶部的偏移——「内容不动」就是这个值不变 */
    const relOfA0 = () => {
      const index = vl.core.props.list.findIndex((it) => it.id === 'a-0');
      return vl.core.getItemPosByIndex(index).top - clientEl.scrollTop;
    };
    const relBefore = relOfA0();

    // 插入项进来时只有预估尺寸（40），真实高度是 50/90 交替，补偿量必然不准
    const older = makeList(20, 'older');
    vl.setList([...older, ...list]);
    expect(relOfA0()).toBe(relBefore);

    // 多轮测量：尺寸陆续回填，锚点要在每一轮之后都把内容按住
    for (let i = 0; i < 4; i += 1) {
      measure();
      expect(
        relOfA0(),
        `第 ${i + 1} 轮测量后 a-0 偏移变成 ${relOfA0()}，应保持 ${relBefore}`,
      ).toBe(relBefore);
    }

    const s = snapshot(vl, clientEl);
    expect(viewportCovered(s)).toBe(true);
  });

  it('连续加载两页都立刻可见', () => {
    let list = makeList(60);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 1200);
    measure();

    for (let page = 0; page < 2; page += 1) {
      scrollTo(clientEl, 0);
      measure();
      const older = makeList(20, `p${page}`);
      list = [...older, ...list];
      vl.setList(list);
      measure();

      const s = snapshot(vl, clientEl);
      expect(
        viewportCovered(s),
        `第 ${page + 1} 页加载后视口 ${s.scrollTop} 不在渲染区间 [${s.renderedTop}, ${s.renderedBottom})`,
      ).toBe(true);
    }
  });
});
