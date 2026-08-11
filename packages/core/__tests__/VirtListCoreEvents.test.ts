import { afterEach, describe, expect, it, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    text: `item-${i}`,
  }));
}

function baseOptions(list = makeList(50)) {
  return {
    list,
    itemKey: 'id' as const,
    estimatedSize: 40,
  };
}

function makeScrollEl(initial = 0) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', {
    writable: true,
    configurable: true,
    value: initial,
  });
  return el;
}

function scrollTo(core: VirtListCore<any>, offset: number) {
  core.scrollFromUser(offset);
}

/** 50 项 × 40px = 2000，视口 200 → 可滚动到 1800 */
function setup(list = makeList(50), extra: Record<string, unknown> = {}) {
  const el = makeScrollEl();
  const events = {
    offsetChange: vi.fn(),
    toTop: vi.fn(),
    toBottom: vi.fn(),
    update: vi.fn(),
  };
  const core = new VirtListCore({ ...baseOptions(list), ...extra }, events);
  core.bindDOM(el);
  core.slotSize.clientSize = 200;
  return { el, core, events };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('滚动事件与区间推进', () => {
  describe('offsetChange：同帧提交的落点', () => {
    /*
     * 容器是 overflow:hidden，浏览器既不会自己滚也不会派发 scroll 事件。
     * offsetChange 是「内容与偏移量同帧提交」的落点，带的是裸偏移量；
     * 想拿方向 / 边界 / 来源用 scroll 事件（见 VirtListCoreScrollEvent.test.ts）。
     * 这里锁住原生 scroll 事件已经彻底不参与了。
     */
    it('每次偏移变化都带着新偏移量通知上层', () => {
      const { core, events } = setup();
      events.offsetChange.mockClear();

      scrollTo(core, 400);

      expect(events.offsetChange).toHaveBeenCalledTimes(1);
      expect(events.offsetChange.mock.calls[0]![0]).toBe(400);
    });

    it('偏移没变时不重复通知，也不重算区间', () => {
      const { core, events } = setup();
      scrollTo(core, 400);
      const stateAfterFirst = { ...core.getState() };
      events.offsetChange.mockClear();
      events.update.mockClear();

      scrollTo(core, 400);

      expect(events.offsetChange).not.toHaveBeenCalled();
      expect(events.update).not.toHaveBeenCalled();
      expect(core.getState()).toEqual(stateAfterFirst);
    });

    it('容器上的原生 scroll 事件不再引起任何反应', () => {
      const { el, core, events } = setup();
      scrollTo(core, 400);
      const stateBefore = { ...core.getState() };
      events.offsetChange.mockClear();
      events.update.mockClear();

      el.dispatchEvent(new Event('scroll'));

      expect(events.offsetChange).not.toHaveBeenCalled();
      expect(events.update).not.toHaveBeenCalled();
      expect(core.getState()).toEqual(stateBefore);
    });
  });

  describe('可视区间随滚动增量推进', () => {
    it('向下滚动时 inViewBegin 前进', () => {
      const { el, core } = setup();

      scrollTo(core, 400);

      expect(core.getState().inViewBegin).toBe(10);
      expect(core.renderList[0]!.id).toBe('10');
    });

    it('向上滚动时 inViewBegin 回退', () => {
      const { el, core } = setup();
      scrollTo(core, 400);

      scrollTo(core, 120);

      expect(core.getState().inViewBegin).toBe(3);
      expect(core.renderList[0]!.id).toBe('3');
    });

    it('落在项中间时归属到该项', () => {
      const { el, core } = setup();

      // 第 10 项覆盖 [400, 440)
      scrollTo(core, 430);

      expect(core.getState().inViewBegin).toBe(10);
    });

    it('偏移回到 0 时区间归零', () => {
      const { el, core } = setup();
      scrollTo(core, 400);

      scrollTo(core, 0);

      expect(core.getState().inViewBegin).toBe(0);
    });

    it('一次大跨度跳跃也能定位到正确项', () => {
      const { el, core } = setup();

      scrollTo(core, 1600);

      expect(core.getState().inViewBegin).toBe(40);
    });

    it('headerSize 会从滚动偏移里扣除', () => {
      const { el, core } = setup();
      core.slotSize.headerSize = 100;

      // 前 100px 是 header，列表内容从 100 开始
      scrollTo(core, 100 + 400);

      expect(core.getState().inViewBegin).toBe(10);
    });

    it('实测尺寸参与区间搜索', () => {
      const { el, core } = setup();
      // 前 5 项各 100px（共 500），之后仍是 40px 估算
      for (let i = 0; i < 5; i += 1) core.setItemSize(String(i), 100);
      core.forceUpdate();

      scrollTo(core, 500);

      expect(core.getState().inViewBegin).toBe(5);
    });
  });

  describe('toTop / toBottom', () => {
    it('滚到底部触发 toBottom，参数是最后一项', () => {
      const list = makeList(50);
      const { el, events, core } = setup(list);

      scrollTo(core, 1800);

      expect(events.toBottom).toHaveBeenCalledTimes(1);
      expect(events.toBottom.mock.calls[0]![0]).toBe(list[49]);
    });

    it('距底部还远时不触发', () => {
      const { el, events, core } = setup();

      scrollTo(core, 1000);

      expect(events.toBottom).not.toHaveBeenCalled();
    });

    it('默认阈值下差 1px 也算到底（threshold 最小为 2）', () => {
      const { el, events, core } = setup();

      scrollTo(core, 1799);

      expect(events.toBottom).toHaveBeenCalledTimes(1);
    });

    it('edgeThreshold 放宽触发距离', () => {
      const { el, events, core } = setup(makeList(50), { edgeThreshold: 200 });

      // 距底 200，默认阈值不会触发，edgeThreshold=200 则触发
      scrollTo(core, 1600);

      expect(events.toBottom).toHaveBeenCalledTimes(1);
    });

    it('向上滚到顶部触发 toTop，参数是第一项', () => {
      const list = makeList(50);
      const { el, events, core } = setup(list);
      scrollTo(core, 400);

      scrollTo(core, 1);

      expect(events.toTop).toHaveBeenCalledTimes(1);
      expect(events.toTop.mock.calls[0]![0]).toBe(list[0]);
    });

    it('向上滚但离顶还远时不触发 toTop', () => {
      const { el, events, core } = setup();
      scrollTo(core, 1000);

      scrollTo(core, 600);

      expect(events.toTop).not.toHaveBeenCalled();
    });

    it('向上滚动不会误触发 toBottom', () => {
      const { el, events, core } = setup();
      scrollTo(core, 1800);
      events.toBottom.mockClear();

      scrollTo(core, 1700);

      expect(events.toBottom).not.toHaveBeenCalled();
    });

    it('插槽尺寸计入总高度，从而影响到底判定', () => {
      const { el, core, events } = setup();
      core.slotSize.footerSize = 300;

      // 不含 footer 时 1800 就是底部，含 footer 后还差 300
      scrollTo(core, 1800);

      expect(events.toBottom).not.toHaveBeenCalled();

      scrollTo(core, 2100);
      expect(events.toBottom).toHaveBeenCalledTimes(1);
    });
  });

  describe('列表为空 / 极短时的健壮性', () => {
    it('空列表滚动不抛错，状态保持归零', () => {
      const { el, core } = setup([]);

      expect(() => scrollTo(core, 100)).not.toThrow();
      expect(core.getState().itemsTotalSize).toBe(0);
      expect(core.renderList).toEqual([]);
    });

    it('单项列表的区间不越界', () => {
      const { core } = setup(makeList(1));

      const state = core.getState();
      expect(state.renderBegin).toBe(0);
      expect(state.renderEnd).toBe(0);
      expect(core.renderList.length).toBe(1);
    });

    it('列表被清空时走 reset 路径', () => {
      const { el, core } = setup();
      scrollTo(core, 400);

      core.updateOptions({ list: [] });

      const state = core.getState();
      expect(state.inViewBegin).toBe(0);
      expect(state.itemsTotalSize).toBe(0);
      expect(core.sizesMap.size).toBe(0);
    });
  });

  describe('destroy 之后', () => {
    it('不再接受滚动写入', () => {
      const { core, events } = setup();
      core.destroy();
      events.offsetChange.mockClear();

      scrollTo(core, 400);

      expect(events.offsetChange).not.toHaveBeenCalled();
      expect(core.getOffset()).toBe(0);
      expect(core.getState().inViewBegin).toBe(0);
    });

    it('重复 destroy 是安全的', () => {
      const { core } = setup();
      core.destroy();

      expect(() => core.destroy()).not.toThrow();
    });
  });
});

/**
 * 头部增删对偏移量的补偿。
 *
 * `_onListChange` 的补偿是「读当前偏移 → 加减位移量 → 写回」，所以每一次写入之后
 * 内部的位置状态必须立刻跟着走。靠原生滚动时不需要操心：写 scrollTop 会让浏览器
 * 异步派发一次 scroll 事件，顺手把内部状态对齐了。偏移量归 JS 之后没有这一步，
 * 漏了同步就会让下一次变更从旧值上再算一遍——加一项再删掉应当回到原处，却会少掉一截。
 */
describe('头部增删的偏移补偿', () => {
  it('头部加一项再删掉，偏移量回到原处', () => {
    const list = makeList(50);
    const { core } = setup(list);
    scrollTo(core, 400);

    core.updateOptions({ list: [{ id: 'new-0', text: 'new-0' }, ...list] });
    expect(core.getOffset()).toBe(440);

    core.updateOptions({ list: [...list] });
    expect(core.getOffset()).toBe(400);
  });

  it('连续两次头部插入逐次累加，不会漏掉前一次', () => {
    const base = makeList(50);
    const { core } = setup(base);
    scrollTo(core, 400);

    let cur = base;
    for (const id of ['a', 'b']) {
      cur = [{ id, text: id }, ...cur];
      core.updateOptions({ list: cur });
    }

    expect(core.getOffset()).toBe(480);
  });
});
