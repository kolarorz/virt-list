import { describe, it, expect, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';
import { ListLoader, type LoaderHost } from '../src/ListLoader';

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `k${i}` }));
}

function makeHost(overrides: Partial<LoaderHost> = {}): LoaderHost {
  return {
    getOffset: () => 0,
    getTotalSize: () => 10000,
    getClientSize: () => 400,
    getListLength: () => 100,
    getEdgeThreshold: () => 5,
    scrollToBottom: () => {},
    ...overrides,
  };
}

describe('ListLoader.reset', () => {
  it('归零 loading / pendingNew，放开 hasMore、解掉停摆', async () => {
    let resolveLoad: (v: boolean) => void = () => {};
    const onChange = vi.fn();
    const loader = new ListLoader(
      makeHost(),
      () => () => new Promise<boolean>((r) => { resolveLoad = r; }),
      onChange,
    );

    loader.onReachEdge('top');
    loader.onAppend(3, false, true);
    expect(loader.getState()).toMatchObject({ loadingTop: true, pendingNew: 3 });

    loader.setHasMore('bottom', false);
    loader.reset();

    expect(loader.getState()).toEqual({
      loadingTop: false,
      loadingBottom: false,
      hasMoreTop: true,
      hasMoreBottom: true,
      pendingNew: 0,
    });
    resolveLoad(true);
  });

  it('hasMore 还原成构造时的初值，而不是无脑置 true', () => {
    const loader = new ListLoader(
      makeHost(),
      () => undefined,
      () => {},
      { hasMoreTop: false },
    );
    loader.setHasMore('top', true);
    loader.reset();
    expect(loader.getState().hasMoreTop).toBe(false);
    expect(loader.getState().hasMoreBottom).toBe(true);
  });

  it('本来就在初始态时不发多余的通知', () => {
    const onChange = vi.fn();
    const loader = new ListLoader(makeHost(), () => undefined, onChange);
    loader.reset();
    loader.reset();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reset 之前发起的请求落地后不再改状态', async () => {
    let resolveLoad: (v: boolean) => void = () => {};
    let length = 100;
    const loader = new ListLoader(
      makeHost({ getListLength: () => length }),
      () => () => new Promise<boolean>((r) => { resolveLoad = r; }),
      () => {},
    );

    loader.onReachEdge('top');
    expect(loader.getState().loadingTop).toBe(true);

    // 切数据源
    loader.reset();
    // 旧会话的请求这时才回来，并且报"没有更多了"
    resolveLoad(false);
    await Promise.resolve();
    await Promise.resolve();

    // 旧会话的结论不该落到新一轮上
    expect(loader.getState()).toMatchObject({
      loadingTop: false,
      hasMoreTop: true,
    });
    void length;
  });

  it('reset 后这个方向还能重新触发加载', () => {
    const loadMore = vi.fn(() => {});
    const loader = new ListLoader(makeHost(), () => loadMore, () => {});

    loader.onReachEdge('top');
    expect(loadMore).toHaveBeenCalledTimes(1);
    // 数据没长，方向被标记停摆
    loader.onReachEdge('top');
    expect(loadMore).toHaveBeenCalledTimes(1);

    loader.reset();
    loader.onReachEdge('top');
    expect(loadMore).toHaveBeenCalledTimes(2);
  });
});

describe('VirtListCore.reset 联动分页状态', () => {
  function setup(extra: Record<string, unknown> = {}) {
    const core = new VirtListCore<any>({
      list: makeList(100),
      itemKey: 'id',
      estimatedSize: 50,
      fixedSize: true,
      stickyBottom: true,
      ...extra,
    });
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;
    return core;
  }

  it('reset() 清掉 pendingNew 与 loading', () => {
    let resolveLoad: (v: boolean) => void = () => {};
    const core = setup({
      loadMore: () => new Promise<boolean>((r) => { resolveLoad = r; }),
    });

    core.scrollFromUser(1000);
    core.updateOptions({ list: makeList(105) });
    expect(core.getLoadState().pendingNew).toBe(5);

    core.scrollFromUser(0);
    core.scrollFromUser(0);
    core.reset();

    expect(core.getLoadState()).toMatchObject({
      pendingNew: 0,
      loadingTop: false,
      loadingBottom: false,
    });
    resolveLoad(true);
  });

  it('切会话（清空 list）不会留下上一个会话的角标', () => {
    const core = setup();
    core.scrollFromUser(1000);
    core.updateOptions({ list: makeList(110) });
    expect(core.getLoadState().pendingNew).toBe(10);

    core.updateOptions({ list: [] });
    expect(core.getLoadState().pendingNew).toBe(0);
  });

  it('清空 list 会把状态变化通知出去', () => {
    const loadStateChange = vi.fn();
    const core = new VirtListCore<any>(
      {
        list: makeList(100),
        itemKey: 'id',
        estimatedSize: 50,
        fixedSize: true,
        stickyBottom: true,
      },
      { loadStateChange },
    );
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;
    core.scrollFromUser(1000);
    core.updateOptions({ list: makeList(110) });
    loadStateChange.mockClear();

    core.updateOptions({ list: [] });
    expect(loadStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ pendingNew: 0 }),
    );
  });

  it('反复清空不会刷出一串一模一样的通知', () => {
    const loadStateChange = vi.fn();
    const core = new VirtListCore<any>(
      { list: makeList(10), itemKey: 'id', estimatedSize: 50, fixedSize: true },
      { loadStateChange },
    );
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;

    core.updateOptions({ list: [] });
    loadStateChange.mockClear();
    core.updateOptions({ list: [] });
    core.reset();
    expect(loadStateChange).not.toHaveBeenCalled();
  });
});
