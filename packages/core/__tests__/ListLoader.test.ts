import { describe, expect, it, vi } from 'vitest';
import { ListLoader, type LoaderHost } from '../src/ListLoader';
import type { LoadDirection, LoadState } from '../src/types';

/** 宿主替身的可写状态，测试通过改它来摆出各种滚动姿态 */
interface HostState {
  offset: number;
  totalSize: number;
  clientSize: number;
  listLength: number;
  edgeThreshold: number;
}

/**
 * 可编程的宿主替身。
 *
 * ListLoader 只读取滚动状态、只发起 scrollToBottom，因此完全可以脱离滚动引擎
 * 单独驱动——这里直接摆出各种"停在边界 / 不足一屏"的姿态来验证状态机。
 */
function makeHost(init?: Partial<HostState>) {
  const state = {
    offset: 0,
    totalSize: 1000,
    clientSize: 200,
    listLength: 50,
    edgeThreshold: 2,
    scrollToBottom: vi.fn(),
  };
  const host: LoaderHost = {
    getOffset: () => state.offset,
    getTotalSize: () => state.totalSize,
    getClientSize: () => state.clientSize,
    getListLength: () => state.listLength,
    getEdgeThreshold: () => state.edgeThreshold,
    scrollToBottom: () => state.scrollToBottom(),
  };
  Object.assign(state, init);
  return { host, state };
}

function setup(
  loadMore?: (dir: LoadDirection) => boolean | void | Promise<boolean | void>,
  hostInit?: Parameters<typeof makeHost>[0],
) {
  const { host, state } = makeHost(hostInit);
  const onStateChange = vi.fn<(s: LoadState) => void>();
  const loader = new ListLoader(host, () => loadMore, onStateChange);
  return { loader, host, state, onStateChange };
}

describe('ListLoader', () => {
  describe('防重入', () => {
    it('加载进行中不会重复触发同一方向', async () => {
      let resolve!: (v: boolean) => void;
      const loadMore = vi.fn(
        () => new Promise<boolean>((r) => { resolve = r; }),
      );
      const { loader, state } = setup(loadMore);

      loader.onReachEdge('bottom');
      loader.onReachEdge('bottom');
      loader.onReachEdge('bottom');

      expect(loadMore).toHaveBeenCalledTimes(1);

      state.listLength += 20;
      resolve(true);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(loader.getState().loadingBottom).toBe(false);
    });

    it('两个方向的加载互不阻塞', () => {
      const loadMore = vi.fn(
        (_dir: LoadDirection) => new Promise<boolean>(() => {}),
      );
      const { loader } = setup(loadMore);

      loader.onReachEdge('top');
      loader.onReachEdge('bottom');

      expect(loadMore).toHaveBeenCalledTimes(2);
      expect(loadMore.mock.calls.map((c) => c[0])).toEqual(['top', 'bottom']);
    });
  });

  describe('hasMore 落位', () => {
    it('loadMore 返回 false 后不再触发该方向', async () => {
      const loadMore = vi.fn(() => Promise.resolve(false));
      const { loader } = setup(loadMore);

      loader.onReachEdge('top');
      await Promise.resolve();
      await Promise.resolve();

      expect(loader.getState().hasMoreTop).toBe(false);

      loader.onReachEdge('top');
      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it('返回 void 视为仍有更多', async () => {
      const loadMore = vi.fn(() => Promise.resolve());
      const { loader, state } = setup(loadMore);

      state.listLength += 10;
      loader.onReachEdge('top');
      await Promise.resolve();
      await Promise.resolve();

      expect(loader.getState().hasMoreTop).toBe(true);
    });

    it('同步返回 false 也能正确落位', () => {
      const loadMore = vi.fn(() => false);
      const { loader } = setup(loadMore);

      loader.onReachEdge('bottom');

      expect(loader.getState().hasMoreBottom).toBe(false);
    });

    it('受控的 setHasMore 会关闭触发', () => {
      const loadMore = vi.fn(() => Promise.resolve(true));
      const { loader } = setup(loadMore);

      loader.setHasMore('bottom', false);
      loader.onReachEdge('bottom');

      expect(loadMore).not.toHaveBeenCalled();
    });

    it('重新开放方向后可以再次触发', () => {
      const loadMore = vi.fn(() => Promise.resolve(true));
      const { loader } = setup(loadMore);

      loader.setHasMore('bottom', false);
      loader.setHasMore('bottom', true);
      loader.onReachEdge('bottom');

      expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });

  describe('加载失败', () => {
    it('promise 拒绝后解锁 loading，且保留 hasMore 供重试', async () => {
      const loadMore = vi.fn(() => Promise.reject(new Error('网络错误')));
      const { loader } = setup(loadMore);

      loader.onReachEdge('bottom');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const s = loader.getState();
      expect(s.loadingBottom).toBe(false);
      expect(s.hasMoreBottom).toBe(true);
    });

    it('同步抛错也会解锁，异常继续向外抛', () => {
      const loadMore = vi.fn(() => {
        throw new Error('同步失败');
      });
      const { loader } = setup(loadMore);

      expect(() => loader.onReachEdge('bottom')).toThrow('同步失败');
      expect(loader.getState().loadingBottom).toBe(false);
    });

    it('空加载后停摆，不会忙循环；用户滚动后恢复', async () => {
      // 数据量始终不变（请求失败或返回空），且没有把 hasMore 置为 false
      const loadMore = vi.fn(() => Promise.resolve());
      const { loader, state } = setup(loadMore, {
        totalSize: 100,
        clientSize: 200, // 内容不足一屏，checkAutoLoad 本会持续续拉
      });

      loader.checkAutoLoad();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const callsAfterFirst = loadMore.mock.calls.length;
      loader.checkAutoLoad();
      expect(loadMore.mock.calls.length).toBe(callsAfterFirst);

      // 用户真的滚了一下，说明状态可能变了，允许再试
      loader.onUserScroll();
      state.listLength += 1;
      loader.checkAutoLoad();
      expect(loadMore.mock.calls.length).toBe(callsAfterFirst + 1);
    });
  });

  describe('自动续拉', () => {
    it('内容不足一屏时继续要数据，直到填满', async () => {
      const { host, state } = makeHost({ totalSize: 100, clientSize: 500 });
      const loadMore = vi.fn(async () => {
        state.listLength += 10;
        state.totalSize += 200;
        return true;
      });
      const loader = new ListLoader(host, () => loadMore, vi.fn());

      loader.checkAutoLoad();
      // 每次落地后重新判断，共需 3 次才够 500
      for (let i = 0; i < 12; i += 1) await Promise.resolve();

      expect(state.totalSize).toBeGreaterThan(500);
      expect(loadMore.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('数据量没有增长时终止续拉', async () => {
      const loadMore = vi.fn(async () => true);
      const { loader } = setup(loadMore, { totalSize: 50, clientSize: 500 });

      loader.checkAutoLoad();
      for (let i = 0; i < 12; i += 1) await Promise.resolve();

      // 长度没变 → 停摆，不会无限递归
      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it('容器尺寸未知时不触发', () => {
      const loadMore = vi.fn(async () => true);
      const { loader } = setup(loadMore, { clientSize: 0 });

      loader.checkAutoLoad();

      expect(loadMore).not.toHaveBeenCalled();
    });

    it('停在底部时自动补一次底部加载', () => {
      const loadMore = vi.fn(async () => true);
      const { loader } = setup(loadMore, {
        totalSize: 1000,
        clientSize: 200,
        offset: 800,
      });

      loader.checkAutoLoad();

      expect(loadMore).toHaveBeenCalledWith('bottom');
    });

    it('停在顶部时不自动补顶部加载（offset 为 0 是初始常态，不代表用户意图）', () => {
      const loadMore = vi.fn(async () => true);
      const { loader } = setup(loadMore, {
        totalSize: 1000,
        clientSize: 200,
        offset: 0,
      });

      loader.checkAutoLoad();

      // 自动补了 top 的话，任何配置了 loadMore 的列表挂载即无限向上拉取
      expect(loadMore).not.toHaveBeenCalled();
    });

    it('顶部加载只由主动滚到顶触发', () => {
      const loadMore = vi.fn(async () => true);
      const { loader } = setup(loadMore, { offset: 0 });

      loader.onReachEdge('top');

      expect(loadMore).toHaveBeenCalledWith('top');
    });

    it('续拉链有长度上限，病态数据不会打成忙循环', async () => {
      const { host, state } = makeHost({ totalSize: 10, clientSize: 500 });
      // 数据量一直增长，却始终撑不起高度：正常终止条件都不成立
      const loadMore = vi.fn(async () => {
        state.listLength += 1;
        return true;
      });
      const loader = new ListLoader(host, () => loadMore, vi.fn());

      loader.checkAutoLoad();
      for (let i = 0; i < 200; i += 1) await Promise.resolve();

      expect(loadMore.mock.calls.length).toBeLessThanOrEqual(20);
    });

    it('没有配置 loadMore 时什么都不做', () => {
      const { loader, state } = setup(undefined, { clientSize: 200 });

      expect(() => loader.checkAutoLoad()).not.toThrow();
      expect(state.scrollToBottom).not.toHaveBeenCalled();
    });
  });

  describe('贴底跟随', () => {
    it('原本贴底时跟随到底部', () => {
      const { loader, state } = setup();

      loader.onAppend(1, true, true);

      expect(state.scrollToBottom).toHaveBeenCalledTimes(1);
      expect(loader.getState().pendingNew).toBe(0);
    });

    it('原本没贴底时不动视口，累加 pendingNew', () => {
      const { loader, state } = setup();

      loader.onAppend(2, false, true);
      loader.onAppend(3, false, true);

      expect(state.scrollToBottom).not.toHaveBeenCalled();
      expect(loader.getState().pendingNew).toBe(5);
    });

    it('未开启 stickyBottom 时既不跟随也不计数', () => {
      const { loader, state } = setup();

      loader.onAppend(5, true, false);

      expect(state.scrollToBottom).not.toHaveBeenCalled();
      expect(loader.getState().pendingNew).toBe(0);
    });

    it('滚到底部后 pendingNew 归零', () => {
      const { loader } = setup();

      loader.onAppend(3, false, true);
      expect(loader.getState().pendingNew).toBe(3);

      loader.onReachEdge('bottom');

      expect(loader.getState().pendingNew).toBe(0);
    });
  });

  describe('状态通知', () => {
    it('loading 起落各通知一次，且传出的是副本', async () => {
      const loadMore = vi.fn(async () => true);
      const { loader, onStateChange, state } = setup(loadMore);

      loader.onReachEdge('bottom');
      expect(onStateChange.mock.calls[0]![0].loadingBottom).toBe(true);

      state.listLength += 10;
      for (let i = 0; i < 6; i += 1) await Promise.resolve();

      const last = onStateChange.mock.calls.at(-1)![0];
      expect(last.loadingBottom).toBe(false);

      // 外部改动不应影响内部状态
      last.pendingNew = 999;
      expect(loader.getState().pendingNew).toBe(0);
    });

    it('destroy 之后不再通知也不再触发加载', async () => {
      let resolve!: (v: boolean) => void;
      const loadMore = vi.fn(
        () => new Promise<boolean>((r) => { resolve = r; }),
      );
      const { loader, onStateChange } = setup(loadMore);

      loader.onReachEdge('bottom');
      loader.destroy();
      onStateChange.mockClear();

      resolve(true);
      for (let i = 0; i < 4; i += 1) await Promise.resolve();

      expect(onStateChange).not.toHaveBeenCalled();

      loader.onReachEdge('top');
      expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });
});
