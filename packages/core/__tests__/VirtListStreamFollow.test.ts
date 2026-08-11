import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

/**
 * AI 流式输出的贴底跟随。
 *
 * 与「追加新项」不同，流式输出改变的是**已有项自身的尺寸**：一条消息在 token
 * 流入过程中不断变高。这条路径不经过 `_onListChange`，只由 ResizeObserver 的
 * 尺寸上报驱动，所以它的跟随行为完全取决于那一刻 `_pinned` 是什么。
 */

const ITEM_SIZE = 40;
const CLIENT_SIZE = 200;
const COUNT = 50;

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    text: `item-${i}`,
  }));
}

describe('流式输出时的贴底跟随', () => {
  const OriginalRO = globalThis.ResizeObserver;
  let roCallback: ResizeObserverCallback | null = null;

  beforeEach(() => {
    roCallback = null;
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
    globalThis.ResizeObserver = OriginalRO;
  });

  function entry(id: string, size: number) {
    const target = document.createElement('div');
    target.dataset.id = id;
    return {
      target,
      borderBoxSize: [{ blockSize: size, inlineSize: size }],
      contentRect: { height: size, width: size },
    } as unknown as ResizeObserverEntry;
  }

  function flush(entries: ResizeObserverEntry[]) {
    roCallback?.(entries, {} as ResizeObserver);
  }

  function setup(stickyBottom: boolean) {
    const core = new VirtListCore<{ id: string; text: string }>({
      list: makeList(COUNT),
      itemKey: 'id',
      estimatedSize: ITEM_SIZE,
      stickyBottom,
    });
    core.bindDOM(document.createElement('div'));
    // 真实环境由 ResizeObserver 报进来，jsdom 里手动喂一次
    flush([entry('client', CLIENT_SIZE)]);
    return core;
  }

  /** 把最后一项撑高，模拟正在生成的那条消息 */
  function grow(size: number) {
    flush([entry(String(COUNT - 1), size)]);
  }

  const bottomOf = (core: VirtListCore<any>) =>
    core.getTotalSize() - CLIENT_SIZE;

  it('用户手动滚到底后，正在生成的消息变高会跟随', () => {
    const core = setup(true);

    core.scrollFromUser(bottomOf(core));
    expect(core.getOffset()).toBe(bottomOf(core));

    grow(ITEM_SIZE + 200);

    // 内容长高 200px，视口跟着落到新的底部，而不是被内容顶出视口下沿
    expect(core.getOffset()).toBe(bottomOf(core));
  });

  it('连续多次变高都保持贴底（逐 token 流入）', () => {
    const core = setup(true);
    core.scrollFromUser(bottomOf(core));

    for (let size = ITEM_SIZE; size <= ITEM_SIZE + 300; size += 20) {
      grow(size);
      expect(core.getOffset()).toBe(bottomOf(core));
    }
  });

  it('向上滚脱离跟随后，变高不再移动视口', () => {
    const core = setup(true);
    core.scrollFromUser(bottomOf(core));

    // 向上滚：_pinIndex(inViewBegin) 覆盖掉非显式的贴底目标
    core.scrollFromUser(1000);
    const before = core.getOffset();

    grow(ITEM_SIZE + 200);

    expect(core.getOffset()).toBe(before);
  });

  it('脱离后重新滚回底部，跟随恢复', () => {
    const core = setup(true);

    core.scrollFromUser(bottomOf(core));
    core.scrollFromUser(1000);
    grow(ITEM_SIZE + 100);
    expect(core.getOffset()).toBe(1000);

    // 用户自己滚回底部：这是重新表达「跟着最新内容看」
    core.scrollFromUser(bottomOf(core));
    grow(ITEM_SIZE + 300);

    expect(core.getOffset()).toBe(bottomOf(core));
  });

  it('未开启 stickyBottom 时滚到底也不跟随', () => {
    const core = setup(false);

    core.scrollFromUser(bottomOf(core));
    const before = core.getOffset();

    grow(ITEM_SIZE + 200);

    expect(core.getOffset()).toBe(before);
  });

  it('跟随由 scrollToBottom 建立时同样生效（显式定位路径）', () => {
    const core = setup(true);

    core.scrollToBottom();
    grow(ITEM_SIZE + 200);

    expect(core.getOffset()).toBe(bottomOf(core));
  });

  /**
   * 离屏的流式项（文档 ai/streaming「离屏的流式项」一节的结论）。
   *
   * 用户在生成过程中向上滚得足够远时，正在生成的那条会滚出渲染区间、DOM 被回收，
   * 于是它的尺寸停在最后一次测量值上——列表总高度此刻是**偏小**的。
   *
   * 这个偏差之所以无害，是因为「贴到内容末端」是个动态目标：项重新渲染、
   * 量到真实尺寸之后重新求解一次就收敛了。这个用例把这条结论钉死。
   */
  it('离屏期间的高度偏差会在回到底部那一刻被修正', () => {
    const core = setup(true);
    const lastKey = String(COUNT - 1);

    // 贴底跟随中，最后一条从 40 长到 240
    core.scrollFromUser(bottomOf(core));
    grow(ITEM_SIZE + 200);
    expect(core.getOffset()).toBe(bottomOf(core));
    const totalWhileVisible = core.getTotalSize();

    // 用户上滑到顶：最后一条滚出渲染窗口
    core.scrollFromUser(0);
    expect(core.getState().renderEnd).toBeLessThan(COUNT - 1);

    // 离屏期间它继续变长，但组件收不到任何上报——总高度此刻仍是旧值
    expect(core.getTotalSize()).toBe(totalWhileVisible);

    // 用户点「回到底部」，此刻的目标是按偏小的总高算出来的
    core.scrollToBottom();

    // 项重新渲染，报上离屏期间累积到的真实尺寸
    flush([entry(lastKey, ITEM_SIZE + 600)]);

    // 总高度补齐了 400，而视口跟着落到新的准确底部，没有停在旧位置
    expect(core.getTotalSize()).toBe(totalWhileVisible + 400);
    expect(core.getOffset()).toBe(bottomOf(core));
  });

  /**
   * 「偏差发生在视口之外，用户看不到」的另一半：用户停在中间时，
   * 下方项的尺寸变化解出零位移，视口不动。
   */
  it('视口下方的项变高不会移动当前视口', () => {
    const core = setup(true);

    // 先往下再往上滚一点，让锚点落在当前顶部项
    core.scrollFromUser(1000);
    core.scrollFromUser(900);
    const before = core.getOffset();
    const begin = core.getState().inViewBegin;
    expect(begin).toBeGreaterThan(0);

    // 视口下方、仍在渲染窗口内的一项忽然长高
    flush([entry(String(begin + 3), ITEM_SIZE + 300)]);

    expect(core.getOffset()).toBe(before);
  });

  /**
   * 切换会话的推荐写法（见 ai/history 文档）：reset 丢掉旧会话的尺寸缓存与
   * 滚动状态，再灌新数据、重新落到底部。少了 reset，旧会话的实测尺寸会被当成
   * 新数据的尺寸用，首屏位置就会偏。
   */
  it('reset + 新数据 + scrollToBottom 能干净地切换会话', () => {
    const core = setup(true);

    // 旧会话里最后一项被撑到 240，这个实测尺寸会进尺寸缓存
    core.scrollFromUser(bottomOf(core));
    grow(240);
    expect(core.getTotalSize()).toBe((COUNT - 1) * ITEM_SIZE + 240);

    core.reset();
    expect(core.getOffset()).toBe(0);
    expect(core.getTotalSize()).toBe(0);

    // 新会话的 key 与旧会话不重叠，尺寸全部回到预估值
    const next = Array.from({ length: 30 }, (_, i) => ({
      id: `next-${i}`,
      text: `next-${i}`,
    }));
    core.updateOptions({ list: next });
    expect(core.getTotalSize()).toBe(30 * ITEM_SIZE);

    core.scrollToBottom();
    expect(core.getOffset()).toBe(bottomOf(core));

    // 新会话里继续流式生成，跟随照常工作
    flush([entry('next-29', ITEM_SIZE + 160)]);
    expect(core.getOffset()).toBe(bottomOf(core));
  });
});
