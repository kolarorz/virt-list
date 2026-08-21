import { describe, it, expect } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `k${i}` }));
}

/** 不定高列表：前 19 项各 50px，末项高 1200px（远高于 400px 视口） */
function withTallLast() {
  const core = new VirtListCore<any>({
    list: makeList(20),
    itemKey: 'id',
    estimatedSize: 50,
  });
  core.bindDOM(document.createElement('div'));
  core.slotSize.clientSize = 400;
  for (let i = 0; i < 19; i += 1) core.setItemSize(`k${i}`, 50);
  core.setItemSize('k19', 1200);
  core.forceUpdate();
  return core;
}

describe('scrollToIndex 对末项的对齐', () => {
  it("末项高于一屏时 align:'start' 把它的顶部对齐视口顶部", () => {
    const core = withTallLast();
    core.scrollToIndex(19, { align: 'start' });
    // 末项顶部 = 前 19 项之和
    expect(core.getOffset()).toBe(950);
  });

  it("末项 align:'end' 仍走贴底（两者目标本就相同，贴底是动态目标更稳）", () => {
    const core = withTallLast();
    core.scrollToIndex(19, { align: 'end' });
    expect(core.getOffset()).toBe(core.getTotalSize() - 400);
  });

  it('缺省对齐等于 start', () => {
    const core = withTallLast();
    core.scrollToIndex(19);
    expect(core.getOffset()).toBe(950);
  });

  it("末项装得进一屏时 align:'start' 被裁到底，与贴底等价", () => {
    const core = new VirtListCore<any>({
      list: makeList(20),
      itemKey: 'id',
      estimatedSize: 50,
      fixedSize: true,
    });
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;

    core.scrollToIndex(19, { align: 'start' });
    expect(core.getOffset()).toBe(core.getTotalSize() - 400);
  });

  it('倒数第二项的对齐不受这条分支影响', () => {
    const core = new VirtListCore<any>({
      list: makeList(20),
      itemKey: 'id',
      estimatedSize: 50,
    });
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;
    for (let i = 0; i < 20; i += 1) core.setItemSize(`k${i}`, 50);
    core.setItemSize('k18', 1200);
    core.forceUpdate();

    core.scrollToIndex(18, { align: 'start' });
    expect(core.getOffset()).toBe(18 * 50);
  });

  it('目标被可滚动上限裁掉时，尺寸测准后仍回到真正的目标', () => {
    // 定位那一刻末项还没渲染、只有估算尺寸，可滚动上限因此偏小，
    // 写进去的目标会被裁掉。项内偏移若把这个差额记下来就再也回不去了。
    //
    // 必须走真实的 ResizeObserver 上报路径：渐进修正挂在那条回调上，
    // 直接 setItemSize + forceUpdate 不会重新求解待维持目标
    const OriginalRO = globalThis.ResizeObserver;
    const ro: { cb: ResizeObserverCallback | null } = { cb: null };
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) { ro.cb = cb; }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    try {
      const core = new VirtListCore<any>({
        list: makeList(20),
        itemKey: 'id',
        estimatedSize: 50,
      });
      core.bindDOM(document.createElement('div'));
      core.slotSize.clientSize = 400;

      core.scrollToIndex(19, { align: 'start' });
      // 此刻总尺寸只有 20 × 50 = 1000，上限 600，目标 950 被裁到 600
      expect(core.getOffset()).toBe(600);

      // 尺寸陆续上报：前 19 项正好等于估算，末项 1200
      const entries = makeList(20).map((it, i) => {
        const target = document.createElement('div');
        target.dataset.id = it.id;
        const size = i === 19 ? 1200 : 50;
        return {
          target,
          borderBoxSize: [{ blockSize: size, inlineSize: size }],
          contentRect: { height: size, width: size },
        } as unknown as ResizeObserverEntry;
      });
      ro.cb?.(entries, {} as ResizeObserver);

      // 上限放开后要落到末项真正的顶部，而不是停在当初被裁到的位置
      expect(core.getOffset()).toBe(950);
    } finally {
      globalThis.ResizeObserver = OriginalRO;
    }
  });

  it('隐式锚定仍然保留项内偏移（用户滚到项中间时不该被拽到边上）', () => {
    const core = new VirtListCore<any>({
      list: makeList(200),
      itemKey: 'id',
      estimatedSize: 50,
      fixedSize: true,
    });
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;

    // 停在 index 50 内部第 20px（向上滚会自动锚住视口顶部那一项）
    core.scrollFromUser(3000);
    core.scrollFromUser(2520);
    expect(core.getOffset()).toBe(2520);

    // 头部插入一项：补偿后应保住"看到 k50 的第 20px"，而不是把它对齐到视口顶部
    core.updateOptions({ list: [{ id: 'head' }, ...core.props.list] });
    expect(core.getOffset()).toBe(2570);
  });

  it('空列表 / 单项列表不会因这条分支出错', () => {
    const single = new VirtListCore<any>({
      list: makeList(1),
      itemKey: 'id',
      estimatedSize: 50,
      fixedSize: true,
    });
    single.bindDOM(document.createElement('div'));
    single.slotSize.clientSize = 400;
    single.scrollToIndex(0, { align: 'start' });
    expect(single.getOffset()).toBe(0);
  });
});
