import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 展开后超过一屏的项，收起时视口落在哪。
 *
 * 这是折叠消息最刁的边界：一条消息展开有两三屏高，用户滚到它的中段甚至末尾去读，
 * 然后点收起——它骤然缩回一行。此时 scrollOffset 还指着原先那个很深的位置，
 * 而那个位置现在已经是后面十几条消息的地盘了。
 */

const COLLAPSED = 50;
const CLIENT_SIZE = 300;
/** 展开后约三屏高 */
const EXPANDED_TALL = 900;
const COUNT = 60;

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
    const size = id === 'client' ? CLIENT_SIZE : (sizes.get(id) ?? COLLAPSED);
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

/**
 * 反复测量直到尺寸与渐进修正都稳定。
 *
 * 每轮除了测量还补派一次 scroll 事件：库内部写 scrollTop 后依赖浏览器回送的
 * scroll 事件来同步内部偏移量，而 jsdom 的 scrollTop 赋值不会派发任何事件。
 * 不补的话，程序化滚动（scrollToIndex 等）在测试里永远收敛不了。
 */
function settle(clientEl: HTMLElement, rounds = 6) {
  for (let i = 0; i < rounds; i += 1) {
    measure();
    clientEl.dispatchEvent(new Event('scroll'));
  }
}

describe('展开超过一屏的项，收起后的落点', () => {
  const TALL_INDEX = 20;

  /** 展开第 TALL_INDEX 项到三屏高，并滚到它的中段 */
  function expandAndScrollInto(vl: VirtList<Item>, clientEl: HTMLElement) {
    const tallKey = vl.core.props.list[TALL_INDEX]!.id;
    sizes.set(tallKey, EXPANDED_TALL);
    settle(clientEl);

    const top = vl.core.getItemPosByIndex(TALL_INDEX).top;
    // 滚到这条消息中段去读
    scrollTo(clientEl, top + EXPANDED_TALL / 2);
    settle(clientEl);
    return tallKey;
  }

  it('不做处理时，收起后视口会落到这条消息之后的无关内容上', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);
    const tallKey = expandAndScrollInto(vl, clientEl);

    // 收起
    sizes.set(tallKey, COLLAPSED);
    settle(clientEl);

    const state = vl.core.getState();
    const pos = vl.core.getItemPosByIndex(TALL_INDEX);
    // 视口顶部已经不在这条消息里了——这就是"收起后找不到刚才那条消息"
    const viewportInsideTall =
      pos.top <= clientEl.scrollTop && clientEl.scrollTop < pos.bottom;
    expect(viewportInsideTall).toBe(false);
    expect(state.inViewBegin).toBeGreaterThan(TALL_INDEX);
  });

  it('收起后调用 scrollToIndex 能回到这条消息，且渐进修正会等尺寸稳定', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);
    const tallKey = expandAndScrollInto(vl, clientEl);

    // 应用层的做法：收起的同时定位回这一项
    sizes.set(tallKey, COLLAPSED);
    vl.scrollToIndex(TALL_INDEX);
    settle(clientEl);

    const pos = vl.core.getItemPosByIndex(TALL_INDEX);
    expect(clientEl.scrollTop).toBe(pos.top);
    expect(vl.core.getState().inViewBegin).toBe(TALL_INDEX);
  });

  it('先收起再定位（分两步）也能落对', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);
    const tallKey = expandAndScrollInto(vl, clientEl);

    sizes.set(tallKey, COLLAPSED);
    settle(clientEl);
    vl.scrollToIndex(TALL_INDEX);
    settle(clientEl);

    expect(clientEl.scrollTop).toBe(vl.core.getItemPosByIndex(TALL_INDEX).top);
  });

  it('展开到五屏、滚到消息末尾再收起，不会被挤到列表底部', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    const tallKey = vl.core.props.list[TALL_INDEX]!.id;
    const veryTall = CLIENT_SIZE * 5;
    sizes.set(tallKey, veryTall);
    settle(clientEl);

    // 滚到这条消息的末尾
    const pos = vl.core.getItemPosByIndex(TALL_INDEX);
    scrollTo(clientEl, pos.bottom - CLIENT_SIZE);
    settle(clientEl);

    sizes.set(tallKey, COLLAPSED);
    vl.scrollToIndex(TALL_INDEX);
    settle(clientEl);

    expect(clientEl.scrollTop).toBe(vl.core.getItemPosByIndex(TALL_INDEX).top);
    expect(vl.core.getState().inViewBegin).toBe(TALL_INDEX);
  });

  it('列表末尾的超高项收起后，落点被裁到可滚动上限但仍能看到该项', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    // 倒数第二项展开成三屏
    const lastIndex = COUNT - 2;
    const tallKey = vl.core.props.list[lastIndex]!.id;
    sizes.set(tallKey, EXPANDED_TALL);
    settle(clientEl);

    const pos = vl.core.getItemPosByIndex(lastIndex);
    scrollTo(clientEl, pos.top + EXPANDED_TALL / 2);
    settle(clientEl);

    sizes.set(tallKey, COLLAPSED);
    vl.scrollToIndex(lastIndex);
    settle(clientEl);

    // 靠近末尾时目标 top 可能超过可滚动上限，此时滚到底即可——
    // 要求是该项必须落在视口内
    const after = vl.core.getItemPosByIndex(lastIndex);
    const viewTop = clientEl.scrollTop;
    const viewBottom = viewTop + CLIENT_SIZE;
    expect(after.top).toBeLessThan(viewBottom);
    expect(after.bottom).toBeGreaterThan(viewTop);
  });

  /**
   * 示例采用的规则，展开和收起共用：
   *
   * 这条消息的顶部还在视口里 → 一动不动（用户看着它的开头，高度往下变是连续的）。
   * 顶部已经滚出视口上方 → 拉回视口顶部（否则高度骤变会让视口内容整体错位：
   * 展开时被这条消息的中段淹没，收起时被后面的消息顶上来）。
   */
  function toggleWithSmartScroll(
    vl: VirtList<Item>,
    clientEl: HTMLElement,
    index: number,
    size: number,
  ) {
    const key = vl.core.props.list[index]!.id;
    // top 只取决于上方内容，与这一项自己的高度无关，尺寸变化前就能算准
    const { top } = vl.core.getItemPosByIndex(index);
    const scrolledPastTop = clientEl.scrollTop > top;

    sizes.set(key, size);
    if (scrolledPastTop) vl.scrollToIndex(index);
    return scrolledPastTop;
  }

  /** 收起 = 把尺寸改回折叠态 */
  function collapseWithSmartScroll(
    vl: VirtList<Item>,
    clientEl: HTMLElement,
    index: number,
  ) {
    return toggleWithSmartScroll(vl, clientEl, index, COLLAPSED);
  }

  it('只露出底部一点时展开：拉回视口顶部，从头显示', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    // 折叠态先有个实测高度
    sizes.set(list[TALL_INDEX]!.id, COLLAPSED);
    scrollTo(clientEl, vl.core.getItemPosByIndex(TALL_INDEX).top - 200);
    settle(clientEl);

    // 滚到只剩它底部一点点露在视口顶部（就是"只看得见展开按钮"的样子）
    const pos = vl.core.getItemPosByIndex(TALL_INDEX);
    scrollTo(clientEl, pos.bottom - 10);
    settle(clientEl);

    const didScroll = toggleWithSmartScroll(
      vl,
      clientEl,
      TALL_INDEX,
      EXPANDED_TALL,
    );
    settle(clientEl);

    expect(didScroll).toBe(true);
    // 视口顶部对齐这条消息的顶部，于是能从第一行开始读
    expect(clientEl.scrollTop).toBe(vl.core.getItemPosByIndex(TALL_INDEX).top);
  });

  it('顶部还在视口里时展开：一个像素都不动', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    sizes.set(list[TALL_INDEX]!.id, COLLAPSED);
    settle(clientEl);

    // 视口顶部停在这条消息上方一点，它的开头是可见的
    const pos = vl.core.getItemPosByIndex(TALL_INDEX);
    scrollTo(clientEl, pos.top - 60);
    settle(clientEl);

    const offsetBefore = clientEl.scrollTop;
    const didScroll = toggleWithSmartScroll(
      vl,
      clientEl,
      TALL_INDEX,
      EXPANDED_TALL,
    );
    settle(clientEl);

    expect(didScroll).toBe(false);
    expect(clientEl.scrollTop).toBe(offsetBefore);
  });

  it('视口滚进了消息内部：收起时定位回这一行', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);
    expandAndScrollInto(vl, clientEl);

    const didScroll = collapseWithSmartScroll(vl, clientEl, TALL_INDEX);
    settle(clientEl);

    expect(didScroll).toBe(true);
    expect(clientEl.scrollTop).toBe(vl.core.getItemPosByIndex(TALL_INDEX).top);
  });

  it('消息顶部仍在视口内：收起时完全不滚动（避免割裂感）', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    // 展开成三屏，但把视口停在这条消息的上方一点，让它的顶部仍然可见
    const tallKey = vl.core.props.list[TALL_INDEX]!.id;
    sizes.set(tallKey, EXPANDED_TALL);
    settle(clientEl);
    const top = vl.core.getItemPosByIndex(TALL_INDEX).top;
    scrollTo(clientEl, top - 100);
    settle(clientEl);

    const offsetBefore = clientEl.scrollTop;
    const didScroll = collapseWithSmartScroll(vl, clientEl, TALL_INDEX);
    settle(clientEl);

    expect(didScroll).toBe(false);
    // 一点都不该动
    expect(clientEl.scrollTop).toBe(offsetBefore);
  });

  it('一屏内的短消息反复展开收起，滚动位置始终不动', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    scrollTo(clientEl, 600);
    settle(clientEl);

    // 视口顶部之下的一项，展开后仍在一屏内
    const index = vl.core.getState().inViewBegin + 1;
    const key = vl.core.props.list[index]!.id;
    const offsetBefore = clientEl.scrollTop;

    for (let i = 0; i < 4; i += 1) {
      sizes.set(key, 200);
      settle(clientEl);
      expect(clientEl.scrollTop).toBe(offsetBefore);

      const didScroll = collapseWithSmartScroll(vl, clientEl, index);
      settle(clientEl);
      expect(didScroll).toBe(false);
      expect(clientEl.scrollTop).toBe(offsetBefore);
    }
  });

  describe('对齐方式', () => {
    it("align='end'：项底部对齐视口底部", () => {
      const list = makeList(COUNT);
      const { vl, clientEl } = setup(list);

      const tallKey = vl.core.props.list[TALL_INDEX]!.id;
      sizes.set(tallKey, EXPANDED_TALL);
      settle(clientEl);

      vl.scrollToIndex(TALL_INDEX, { align: 'end' });
      settle(clientEl);

      const pos = vl.core.getItemPosByIndex(TALL_INDEX);
      expect(clientEl.scrollTop + CLIENT_SIZE).toBe(pos.bottom);
    });

    it("align='start'（默认）：项顶部对齐视口顶部", () => {
      const list = makeList(COUNT);
      const { vl, clientEl } = setup(list);

      const tallKey = vl.core.props.list[TALL_INDEX]!.id;
      sizes.set(tallKey, EXPANDED_TALL);
      settle(clientEl);

      vl.scrollToIndex(TALL_INDEX);
      settle(clientEl);

      expect(clientEl.scrollTop).toBe(vl.core.getItemPosByIndex(TALL_INDEX).top);
    });

    it("align='end' 的渐进修正能跟上展开后才测出的高度", () => {
      const list = makeList(COUNT);
      const { vl, clientEl } = setup(list);

      scrollTo(clientEl, 600);
      settle(clientEl);

      // 展开与定位在同一步发出：此刻高度还是折叠态，目标偏移要靠渐进修正跟上
      sizes.set(vl.core.props.list[TALL_INDEX]!.id, EXPANDED_TALL);
      vl.scrollToIndex(TALL_INDEX, { align: 'end' });
      settle(clientEl);

      const pos = vl.core.getItemPosByIndex(TALL_INDEX);
      expect(clientEl.scrollTop + CLIENT_SIZE).toBe(pos.bottom);
    });

    it("项高于视口时 align='end' 会露出它的末段，align='start' 露出开头", () => {
      const list = makeList(COUNT);
      const { vl, clientEl } = setup(list);

      sizes.set(vl.core.props.list[TALL_INDEX]!.id, EXPANDED_TALL);
      settle(clientEl);

      vl.scrollToIndex(TALL_INDEX, { align: 'end' });
      settle(clientEl);
      const endOffset = clientEl.scrollTop;

      vl.scrollToIndex(TALL_INDEX, { align: 'start' });
      settle(clientEl);
      const startOffset = clientEl.scrollTop;

      // 三屏高的项，两种对齐相差两屏
      expect(endOffset - startOffset).toBe(EXPANDED_TALL - CLIENT_SIZE);
    });
  });

  describe('展开时按实测高度决定是否贴底（示例采用的做法）', () => {
    /**
     * 复现示例里的交互：展开只记下是哪一项，等 itemResize 送来真实高度再判断
     * 要不要贴底。展开后的高度点击时是不知道的，所以判断只能推到这一刻。
     */
    function setupAutoAlign(list: Item[]) {
      const container = document.createElement('div');
      document.body.appendChild(container);

      let pendingKey: string | null = null;
      let vl!: VirtList<Item>;

      vl = new VirtList<Item>(
        container,
        {
          list,
          itemKey: 'id',
          itemPreSize: COLLAPSED,
          renderItem: (item, _index, el) => {
            el.textContent = item.text;
          },
        },
        {
          itemResize: (id, newSize) => {
            if (pendingKey === null || String(id) !== pendingKey) return;
            pendingKey = null;
            const clientSize = vl.core.slotSize.clientSize;
            if (clientSize > 0 && newSize > clientSize) {
              const index = vl.core.props.list.findIndex(
                (it) => String(it.id) === String(id),
              );
              if (index >= 0) vl.scrollToIndex(index, { align: 'end' });
            }
          },
        },
      );

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

      /** 展开某一项到指定高度，走的是"先标记、再由实测高度触发判断"这条路 */
      function expand(index: number, size: number) {
        const key = vl.core.props.list[index]!.id;
        pendingKey = key;
        sizes.set(key, size);
        settle(clientEl);
      }

      return { vl, clientEl, expand };
    }

    it('展开后高过一屏：底部贴住视口底部', () => {
      const list = makeList(COUNT);
      const { vl, clientEl, expand } = setupAutoAlign(list);

      scrollTo(clientEl, 800);
      settle(clientEl);

      const index = vl.core.getState().inViewBegin + 1;
      expand(index, EXPANDED_TALL);

      const pos = vl.core.getItemPosByIndex(index);
      expect(clientEl.scrollTop + CLIENT_SIZE).toBe(pos.bottom);
    });

    it('展开后仍在一屏内：一个像素都不动', () => {
      const list = makeList(COUNT);
      const { vl, clientEl, expand } = setupAutoAlign(list);

      scrollTo(clientEl, 800);
      settle(clientEl);

      const index = vl.core.getState().inViewBegin + 1;
      const offsetBefore = clientEl.scrollTop;
      // 200 < CLIENT_SIZE(300)，装得下
      expand(index, 200);

      expect(clientEl.scrollTop).toBe(offsetBefore);
    });

    it('展开五屏高的消息也只露出它的末段，不会溢出视口', () => {
      const list = makeList(COUNT);
      const { vl, clientEl, expand } = setupAutoAlign(list);

      scrollTo(clientEl, 800);
      settle(clientEl);

      const index = vl.core.getState().inViewBegin + 1;
      expand(index, CLIENT_SIZE * 5);

      const pos = vl.core.getItemPosByIndex(index);
      expect(clientEl.scrollTop + CLIENT_SIZE).toBe(pos.bottom);
      // 视口完全落在这条消息内部
      expect(clientEl.scrollTop).toBeGreaterThan(pos.top);
    });
  });

  it('scrollIntoView：项已完整可见时不动，被截断时才滚', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);
    const tallKey = expandAndScrollInto(vl, clientEl);

    sizes.set(tallKey, COLLAPSED);
    settle(clientEl);
    vl.scrollIntoView(TALL_INDEX);
    settle(clientEl);

    const pos = vl.core.getItemPosByIndex(TALL_INDEX);
    const viewTop = clientEl.scrollTop;
    expect(pos.top).toBeGreaterThanOrEqual(viewTop);
    expect(pos.bottom).toBeLessThanOrEqual(viewTop + CLIENT_SIZE);

    // 已经完整可见了，再调一次不应该再动
    const stable = clientEl.scrollTop;
    vl.scrollIntoView(TALL_INDEX);
    settle(clientEl);
    expect(clientEl.scrollTop).toBe(stable);
  });
});
