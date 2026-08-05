import { describe, expect, it, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';
import type { LoadDirection, LoadState } from '../src/types';

const ITEM_SIZE = 40;
const CLIENT_SIZE = 200;

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

/** scrollTop 像浏览器那样被裁剪到 [0, 最大可滚动值] 的容器 */
function makeScrollEl(totalSize: () => number, clientSize: number) {
  const el = document.createElement('div');
  let value = 0;
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => value,
    set: (v: number) => {
      const max = Math.max(0, totalSize() - clientSize);
      value = Math.min(Math.max(v, 0), max);
    },
  });
  return el;
}

interface SetupOptions {
  list: Item[];
  loadMore?: (dir: LoadDirection) => boolean | void | Promise<boolean | void>;
  stickyBottom?: boolean;
  initialPosition?: 'top' | 'bottom';
  hasMoreTop?: boolean;
  hasMoreBottom?: boolean;
  /** 不绑定 DOM，用于验证纯状态行为 */
  skipBind?: boolean;
}

function setup(opts: SetupOptions) {
  const loadStateChange = vi.fn<(s: LoadState) => void>();
  const core = new VirtListCore<Item>(
    {
      list: opts.list,
      itemKey: 'id',
      itemPreSize: ITEM_SIZE,
      fixed: true,
      loadMore: opts.loadMore,
      stickyBottom: opts.stickyBottom,
      initialPosition: opts.initialPosition,
      hasMoreTop: opts.hasMoreTop,
      hasMoreBottom: opts.hasMoreBottom,
    },
    { loadStateChange },
  );
  const el = makeScrollEl(() => core.getTotalSize(), CLIENT_SIZE);
  if (!opts.skipBind) {
    // clientSize 先给上：真实环境由 ResizeObserver 填，jsdom 里不会触发
    core.slotSize.clientSize = CLIENT_SIZE;
    core.bindDOM(el);
  }
  return { core, el, loadStateChange };
}

function scrollTo(el: HTMLElement, offset: number) {
  el.scrollTop = offset;
  el.dispatchEvent(new Event('scroll'));
}

/** 让挂起的 promise 回调跑完 */
async function flush(times = 6) {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
}

describe('声明式加载（core 集成）', () => {
  it('滚到底部触发 loadMore("bottom")，数据由回调自己写入', async () => {
    const list = makeList(20);
    let current = list;
    const loadMore = vi.fn(async (dir: LoadDirection) => {
      expect(dir).toBe('bottom');
      current = [...current, ...makeList(20, 'next', current.length)];
      core.updateOptions({ list: current });
      return true;
    });
    const { core, el } = setup({ list, loadMore });

    scrollTo(el, core.getTotalSize());
    await flush();

    expect(loadMore).toHaveBeenCalled();
    expect(core.props.list.length).toBeGreaterThan(20);
  });

  it('加载期间重复触边不会重复请求', async () => {
    let resolve!: (v: boolean) => void;
    const loadMore = vi.fn(
      () => new Promise<boolean>((r) => { resolve = r; }),
    );
    const { core, el } = setup({ list: makeList(20), loadMore });

    const bottom = core.getTotalSize();
    scrollTo(el, bottom);
    scrollTo(el, bottom - 1);
    scrollTo(el, bottom);

    expect(loadMore).toHaveBeenCalledTimes(1);
    resolve(true);
    await flush();
  });

  it('滚到顶部触发 loadMore("top")，并自动补偿位移', async () => {
    const list = makeList(50);
    let current = list;
    const loadMore = vi.fn(async (dir: LoadDirection) => {
      if (dir !== 'top') return true;
      const prepend = makeList(20, 'older');
      current = [...prepend, ...current];
      core.updateOptions({ list: current });
      return true;
    });
    const { core, el } = setup({ list, loadMore });

    scrollTo(el, 400);
    scrollTo(el, 0);
    // 触边这一刻视口顶部是哪一项，加载完成后应当还是它
    const keyAtTop = core.props.list[core.getState().inViewBegin]!.id;
    await flush();

    expect(loadMore).toHaveBeenCalledWith('top');
    // 加载历史消息后视口内容没有被推走——过去要手写 addedList2Top + forceUpdate
    expect(core.props.list[core.getState().inViewBegin]!.id).toBe(keyAtTop);
    expect(el.scrollTop).toBe(20 * ITEM_SIZE);
  });

  it('loadMore 返回 false 后该方向不再触发', async () => {
    const loadMore = vi.fn(async () => false);
    const { core, el } = setup({ list: makeList(20), loadMore });

    scrollTo(el, core.getTotalSize());
    await flush();
    expect(core.getLoadState().hasMoreBottom).toBe(false);

    scrollTo(el, core.getTotalSize() - 1);
    scrollTo(el, core.getTotalSize());
    await flush();

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('hasMoreBottom 作为受控属性可直接关闭加载', () => {
    const loadMore = vi.fn(async () => true);
    const { core, el } = setup({
      list: makeList(20),
      loadMore,
      hasMoreBottom: false,
    });

    scrollTo(el, core.getTotalSize());

    expect(loadMore).not.toHaveBeenCalled();
    expect(core.getLoadState().hasMoreBottom).toBe(false);
  });

  it('updateOptions 可以改回 hasMore', async () => {
    const loadMore = vi.fn(async () => true);
    const { core, el } = setup({
      list: makeList(20),
      loadMore,
      hasMoreBottom: false,
    });

    core.updateOptions({ hasMoreBottom: true });
    scrollTo(el, core.getTotalSize());
    await flush();

    expect(loadMore).toHaveBeenCalled();
  });

  /**
   * 构造期间不该发出任何加载状态通知。
   *
   * 那一刻使用方的 `const vl = new VirtList(...)` 还没完成赋值，回调里碰到 vl
   * 就是一个 TDZ 错误（原生用法最容易撞上：Cannot access 'vl' before
   * initialization）。初始状态没有推送的必要——需要的话 getLoadState() 随时能取。
   */
  it('构造期间不触发 loadStateChange，但初始 hasMore 已经落位', () => {
    const loadStateChange = vi.fn();
    const core = new VirtListCore<Item>(
      {
        list: makeList(20),
        itemKey: 'id',
        itemPreSize: ITEM_SIZE,
        hasMoreTop: false,
        hasMoreBottom: false,
      },
      { loadStateChange },
    );

    expect(loadStateChange).not.toHaveBeenCalled();
    expect(core.getLoadState().hasMoreTop).toBe(false);
    expect(core.getLoadState().hasMoreBottom).toBe(false);
  });

  it('loadState 变化会通知上层，用于渲染加载提示条', async () => {
    let resolve!: (v: boolean) => void;
    const loadMore = vi.fn(
      () => new Promise<boolean>((r) => { resolve = r; }),
    );
    const { core, el, loadStateChange } = setup({
      list: makeList(20),
      loadMore,
    });

    scrollTo(el, core.getTotalSize());

    expect(loadStateChange).toHaveBeenCalled();
    expect(loadStateChange.mock.calls.at(-1)![0].loadingBottom).toBe(true);

    resolve(false);
    await flush();

    const last = loadStateChange.mock.calls.at(-1)![0];
    expect(last.loadingBottom).toBe(false);
    expect(last.hasMoreBottom).toBe(false);
  });

  it('初始数据不足一屏时自动补齐（无需在 onMounted 里手动首次加载）', async () => {
    // 3 项 * 40px = 120px < 200px 视口
    let current = makeList(3);
    const loadMore = vi.fn(async () => {
      current = [...current, ...makeList(20, 'more', current.length)];
      core.updateOptions({ list: current });
      return true;
    });
    const { core } = setup({ list: current, loadMore });
    await flush();

    expect(loadMore).toHaveBeenCalled();
    expect(core.props.list.length).toBeGreaterThan(3);
  });

  it('initialPosition="bottom" 挂载即定位到底部', () => {
    const { core, el } = setup({
      list: makeList(100),
      initialPosition: 'bottom',
    });

    expect(el.scrollTop).toBe(core.getTotalSize() - CLIENT_SIZE);
  });

  it('start 优先于 initialPosition', () => {
    const list = makeList(100);
    const core = new VirtListCore<Item>({
      list,
      itemKey: 'id',
      itemPreSize: ITEM_SIZE,
      fixed: true,
      start: 10,
      initialPosition: 'bottom',
    });
    const el = makeScrollEl(() => core.getTotalSize(), CLIENT_SIZE);
    core.slotSize.clientSize = CLIENT_SIZE;
    core.bindDOM(el);

    expect(el.scrollTop).toBe(10 * ITEM_SIZE);
  });
});

describe('贴底跟随', () => {
  it('贴底时尾部追加会自动跟随', () => {
    const list = makeList(50);
    const { core, el } = setup({ list, stickyBottom: true });

    scrollTo(el, core.getTotalSize()); // 贴到底
    const before = el.scrollTop;

    core.updateOptions({ list: [...list, ...makeList(1, 'new')] });

    expect(el.scrollTop).toBeGreaterThan(before);
    expect(el.scrollTop).toBe(core.getTotalSize() - CLIENT_SIZE);
    expect(core.getLoadState().pendingNew).toBe(0);
  });

  it('未贴底时不动视口，只累加 pendingNew', () => {
    const list = makeList(50);
    const { core, el } = setup({ list, stickyBottom: true });

    scrollTo(el, 400); // 用户正在翻历史
    const before = el.scrollTop;

    core.updateOptions({ list: [...list, ...makeList(2, 'new')] });

    expect(el.scrollTop).toBe(before);
    expect(core.getLoadState().pendingNew).toBe(2);
  });

  it('回到底部后 pendingNew 归零', () => {
    const list = makeList(50);
    const { core, el } = setup({ list, stickyBottom: true });

    scrollTo(el, 400);
    core.updateOptions({ list: [...list, ...makeList(2, 'new')] });
    expect(core.getLoadState().pendingNew).toBe(2);

    scrollTo(el, core.getTotalSize());

    expect(core.getLoadState().pendingNew).toBe(0);
  });

  it('未开启 stickyBottom 时尾部追加不动视口', () => {
    const list = makeList(50);
    const { core, el } = setup({ list });

    scrollTo(el, core.getTotalSize());
    const before = el.scrollTop;

    core.updateOptions({ list: [...list, ...makeList(5, 'new')] });

    expect(el.scrollTop).toBe(before);
    expect(core.getLoadState().pendingNew).toBe(0);
  });

  it('头部插入不会被当成新消息计数', () => {
    const list = makeList(50);
    const { core, el } = setup({ list, stickyBottom: true });

    scrollTo(el, 400);
    core.updateOptions({ list: [...makeList(10, 'older'), ...list] });

    expect(core.getLoadState().pendingNew).toBe(0);
  });

  it('destroy 后加载回调落地不再改动状态', async () => {
    let resolve!: (v: boolean) => void;
    const loadMore = vi.fn(
      () => new Promise<boolean>((r) => { resolve = r; }),
    );
    const { core, el, loadStateChange } = setup({
      list: makeList(20),
      loadMore,
    });

    scrollTo(el, core.getTotalSize());
    core.destroy();
    loadStateChange.mockClear();

    resolve(true);
    await flush();

    expect(loadStateChange).not.toHaveBeenCalled();
  });
});
