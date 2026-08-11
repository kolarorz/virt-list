import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 不定高列表滚到底部。
 *
 * 这是 scrollToBottom 最难的情形：目标位置取决于总高度，而总高度又取决于各项的
 * 实测尺寸——项只有被渲染出来才会被测量。于是"滚到底"是个动态目标：每滚近一点，
 * 新项进入窗口、报上真实高度、总高度随之变化，目标又往后挪了一截。
 *
 * 列表靠渐进修正来收敛（每次 ResizeObserver 回调重算一次目标），这些用例验证它
 * 真的能收敛到底，而不是停在半路。
 *
 * 曾经这里还有三个用例，验的是「账本比浏览器实际内容矮几百 px 时仍要滚到浏览器
 * 允许的真实底部」——原生滚动下账本（ResizeObserver 增量维护）与 scrollHeight
 * （浏览器按盒模型算）必然错开，实测差过 420px，那时必须两头取大来仲裁。
 * 滚动位置改由 JS 掌管之后**账本就是唯一真相**，内容画在哪儿、能滚多远由同一份
 * 账本决定，这种不一致从定义上就不存在了，所以那三个用例连同仲裁逻辑一起删掉。
 */

const PRE_SIZE = 40;
const CLIENT_SIZE = 500;
const COUNT = 2000;

interface Item {
  id: string;
  text: string;
}

function makeList(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${i}`,
    text: `item-${i}`,
  }));
}

/** 真实高度不均匀，且都不等于 estimatedSize —— 与 demo 的行为一致 */
function realSizeOf(index: number): number {
  return [40, 62, 84, 106][index % 4]!;
}

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = {
  cb: null,
  targets: new Set(),
};
const OriginalRO = globalThis.ResizeObserver;
const OriginalRAF = globalThis.requestAnimationFrame;
const OriginalCAF = globalThis.cancelAnimationFrame;
let rafQueue: (FrameRequestCallback | null)[];

function flushRaf() {
  const pending = rafQueue;
  rafQueue = [];
  pending.forEach((cb) => cb?.(0));
}

beforeEach(() => {
  ro.cb = null;
  ro.targets = new Set();
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

/** 只上报当前被观察的元素：项必须先渲染出来才有真实高度 */
function measure(list: Item[]) {
  const indexOf = new Map(list.map((it, i) => [it.id, i]));
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    const size = id === 'client' ? CLIENT_SIZE : realSizeOf(indexOf.get(id) ?? 0);
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
    estimatedSize: PRE_SIZE,
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
      // 浏览器语义：写入被裁剪到 [0, 可滚动上限]
      const max = Math.max(0, vl.core.getTotalSize() - CLIENT_SIZE);
      scrollValue = Math.min(Math.max(v, 0), max);
    },
  });

  measure(list);
  flushRaf();
  return { vl, clientEl };
}

/** 推进若干轮"测量 + rAF + scroll 事件回送"，模拟浏览器的帧循环 */
function settle(clientEl: HTMLElement, list: Item[], rounds = 40) {
  for (let i = 0; i < rounds; i += 1) {
    measure(list);
    flushRaf();
  }
}

/** 是否真的贴在底部 */
function atBottom(vl: VirtList<Item>) {
  const total = vl.core.getTotalSize();
  const bottom = vl.core.getOffset() + CLIENT_SIZE;
  return {
    ok: Math.abs(Math.round(bottom) - Math.round(total)) <= 2,
    scrollTop: vl.core.getOffset(),
    bottom,
    total,
    gap: Math.round(total - bottom),
  };
}

describe('scrollToBottom（不定高 + 按需测量）', () => {
  it('2000 项从顶部一次调用就能收敛到底', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    vl.scrollToBottom();
    settle(clientEl, list);

    const r = atBottom(vl);
    expect(
      r.ok,
      `没到底：scrollTop=${r.scrollTop}，视口底=${r.bottom}，总高=${r.total}，差 ${r.gap}px`,
    ).toBe(true);
  });

  it('从列表中段调用也能到底', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    clientEl.scrollTop = 20000;
    settle(clientEl, list, 6);

    vl.scrollToBottom();
    settle(clientEl, list);

    const r = atBottom(vl);
    expect(
      r.ok,
      `没到底：scrollTop=${r.scrollTop}，视口底=${r.bottom}，总高=${r.total}，差 ${r.gap}px`,
    ).toBe(true);
  });

  it('连续调用两次仍然在底部', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    vl.scrollToBottom();
    settle(clientEl, list);
    vl.scrollToBottom();
    settle(clientEl, list);

    const r = atBottom(vl);
    expect(r.ok, `没到底，差 ${r.gap}px`).toBe(true);
  });

  it('到底之后再 scrollToTop，然后又回到底部', () => {
    const list = makeList(COUNT);
    const { vl, clientEl } = setup(list);

    vl.scrollToBottom();
    settle(clientEl, list);

    vl.scrollToTop();
    settle(clientEl, list);
    expect(vl.core.getOffset()).toBe(0);

    vl.scrollToBottom();
    settle(clientEl, list);

    const r = atBottom(vl);
    expect(r.ok, `没到底，差 ${r.gap}px`).toBe(true);
  });

  /**
   * 「各类操作」示例里那几个按钮可以任意顺序点。任何一个前序定位都不该让后面的
   * scrollToBottom 失效 —— 这一组把常见组合都过一遍。
   */
  describe('前序操作之后仍能到底', () => {
    const cases: Array<[string, (vl: VirtList<Item>) => void]> = [
      ['scrollToTop', (vl) => vl.scrollToTop()],
      ['scrollToIndex(0)', (vl) => vl.scrollToIndex(0)],
      ['scrollToIndex(500)', (vl) => vl.scrollToIndex(500)],
      ['scrollToIndex(1999)', (vl) => vl.scrollToIndex(1999)],
      ['scrollToOffset(0)', (vl) => vl.scrollToOffset(0)],
      ['scrollToOffset(30000)', (vl) => vl.scrollToOffset(30000)],
      ['scrollIntoView(300)', (vl) => vl.scrollIntoView(300)],
      ['scrollToBottom', (vl) => vl.scrollToBottom()],
    ];

    for (const [name, act] of cases) {
      it(`先 ${name}，再 scrollToBottom`, () => {
        const list = makeList(COUNT);
        const { vl, clientEl } = setup(list);

        act(vl);
        settle(clientEl, list);

        vl.scrollToBottom();
        settle(clientEl, list);

        const r = atBottom(vl);
        expect(
          r.ok,
          `先 ${name} 后没到底：scrollTop=${r.scrollTop}，视口底=${r.bottom}，` +
            `总高=${r.total}，差 ${r.gap}px`,
        ).toBe(true);
      });
    }

    it('用户手动滚动之后再 scrollToBottom', () => {
      const list = makeList(COUNT);
      const { vl, clientEl } = setup(list);

      // 模拟滚轮：往下滚一段再往上滚一段（会立下锚点）
      for (const y of [4000, 8000, 6000, 3000]) {
        clientEl.scrollTop = y;
        measure(list);
        flushRaf();
      }

      vl.scrollToBottom();
      settle(clientEl, list);

      const r = atBottom(vl);
      expect(r.ok, `没到底，差 ${r.gap}px`).toBe(true);
    });
  });

  /**
   * 滚动途中浏览器自己收回 scrollTop，轮询不能就此罢手。
   *
   * 这是"滚到底"独有的麻烦：项测出来比 estimatedSize 矮时内容总高会缩水，原先写进
   * 去的 scrollTop 超出了新上限，浏览器于是主动把它收回来——不派 scroll 事件，
   * 看上去和用户滚动一模一样。
   *
   * 中途放弃的代价就是停在离底几百 px 的地方（用户实测：2000 项停在 1995）。
   * 所以这里只认两个终止条件：真到底了，或者试满次数。
   */
  it('浏览器途中收回 scrollTop 也要继续滚到底', () => {
    const list = makeList(COUNT);
    const container = document.createElement('div');
    document.body.appendChild(container);

    const vl = new VirtList<Item>(container, {
      list,
      itemKey: 'id',
      estimatedSize: PRE_SIZE,
      renderItem: (item, _index, el) => {
        el.textContent = item.text;
      },
    });

    const clientEl = vl.clientEl;
    let scrollValue = 0;
    /** 内容总高会缩水的轮次——那几轮浏览器要把 scrollTop 往回收 */
    let writes = 0;
    Object.defineProperty(clientEl, 'clientHeight', {
      configurable: true,
      get: () => CLIENT_SIZE,
    });
    Object.defineProperty(clientEl, 'scrollHeight', {
      configurable: true,
      get: () => vl.core.getTotalSize(),
    });
    Object.defineProperty(clientEl, 'scrollTop', {
      configurable: true,
      get: () => scrollValue,
      set: (v: number) => {
        const max = Math.max(0, clientEl.scrollHeight - clientEl.clientHeight);
        scrollValue = Math.min(Math.max(v, 0), max);
        writes += 1;
        // 前几轮模拟"内容缩水后浏览器主动回收"：静默改掉，不派 scroll 事件
        if (writes <= 3 && scrollValue > 300) scrollValue -= 300;
      },
    });

    measure(list);
    flushRaf();

    vl.scrollToBottom();
    settle(clientEl, list);

    const max = clientEl.scrollHeight - clientEl.clientHeight;
    const remain = Math.round(max - vl.core.getOffset());
    expect(
      remain <= 2,
      `被浏览器的回收掐断了：scrollTop=${vl.core.getOffset()}，可滚上限=${max}，` +
        `差 ${remain}px`,
    ).toBe(true);
  });

  it('小列表（内容不足一屏）调用后不动也算到位', () => {
    const list = makeList(5);
    const { vl, clientEl } = setup(list);

    vl.scrollToBottom();
    settle(clientEl, list, 10);

    // 总高不足一屏，可滚动上限为 0
    expect(vl.core.getOffset()).toBe(0);
    expect(vl.core.getTotalSize()).toBeLessThanOrEqual(CLIENT_SIZE);
  });
});
