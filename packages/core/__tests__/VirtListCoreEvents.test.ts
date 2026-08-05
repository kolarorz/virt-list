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
    itemPreSize: 40,
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

function scrollTo(el: HTMLElement, offset: number) {
  el.scrollTop = offset;
  el.dispatchEvent(new Event('scroll'));
}

/** 50 项 × 40px = 2000，视口 200 → 可滚动到 1800 */
function setup(list = makeList(50), extra: Record<string, unknown> = {}) {
  const el = makeScrollEl();
  const events = {
    scroll: vi.fn(),
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
  describe('scroll 事件转发', () => {
    it('每次滚动都把原始事件交给上层', () => {
      const { el, events } = setup();

      scrollTo(el, 100);

      expect(events.scroll).toHaveBeenCalledTimes(1);
      expect(events.scroll.mock.calls[0]![0]).toBeInstanceOf(Event);
    });

    it('偏移没变的滚动事件仍转发，但不重算区间', () => {
      const { el, core, events } = setup();
      scrollTo(el, 400);
      const stateAfterFirst = { ...core.getState() };
      events.update.mockClear();

      // 同一偏移再派发一次（浏览器在惯性滚动收尾时会这样）
      el.dispatchEvent(new Event('scroll'));

      expect(events.scroll).toHaveBeenCalledTimes(2);
      expect(events.update).not.toHaveBeenCalled();
      expect(core.getState()).toEqual(stateAfterFirst);
    });
  });

  describe('可视区间随滚动增量推进', () => {
    it('向下滚动时 inViewBegin 前进', () => {
      const { el, core } = setup();

      scrollTo(el, 400);

      expect(core.getState().inViewBegin).toBe(10);
      expect(core.renderList[0]!.id).toBe('10');
    });

    it('向上滚动时 inViewBegin 回退', () => {
      const { el, core } = setup();
      scrollTo(el, 400);

      scrollTo(el, 120);

      expect(core.getState().inViewBegin).toBe(3);
      expect(core.renderList[0]!.id).toBe('3');
    });

    it('落在项中间时归属到该项', () => {
      const { el, core } = setup();

      // 第 10 项覆盖 [400, 440)
      scrollTo(el, 430);

      expect(core.getState().inViewBegin).toBe(10);
    });

    it('偏移回到 0 时区间归零', () => {
      const { el, core } = setup();
      scrollTo(el, 400);

      scrollTo(el, 0);

      expect(core.getState().inViewBegin).toBe(0);
    });

    it('一次大跨度跳跃也能定位到正确项', () => {
      const { el, core } = setup();

      scrollTo(el, 1600);

      expect(core.getState().inViewBegin).toBe(40);
    });

    it('headerSize 会从滚动偏移里扣除', () => {
      const { el, core } = setup();
      core.slotSize.headerSize = 100;

      // 前 100px 是 header，列表内容从 100 开始
      scrollTo(el, 100 + 400);

      expect(core.getState().inViewBegin).toBe(10);
    });

    it('实测尺寸参与区间搜索', () => {
      const { el, core } = setup();
      // 前 5 项各 100px（共 500），之后仍是 40px 估算
      for (let i = 0; i < 5; i += 1) core.setItemSize(String(i), 100);
      core.forceUpdate();

      scrollTo(el, 500);

      expect(core.getState().inViewBegin).toBe(5);
    });
  });

  describe('toTop / toBottom', () => {
    it('滚到底部触发 toBottom，参数是最后一项', () => {
      const list = makeList(50);
      const { el, events } = setup(list);

      scrollTo(el, 1800);

      expect(events.toBottom).toHaveBeenCalledTimes(1);
      expect(events.toBottom.mock.calls[0]![0]).toBe(list[49]);
    });

    it('距底部还远时不触发', () => {
      const { el, events } = setup();

      scrollTo(el, 1000);

      expect(events.toBottom).not.toHaveBeenCalled();
    });

    it('默认阈值下差 1px 也算到底（threshold 最小为 2）', () => {
      const { el, events } = setup();

      scrollTo(el, 1799);

      expect(events.toBottom).toHaveBeenCalledTimes(1);
    });

    it('scrollDistance 放宽触发距离', () => {
      const { el, events } = setup(makeList(50), { scrollDistance: 200 });

      // 距底 200，默认阈值不会触发，scrollDistance=200 则触发
      scrollTo(el, 1600);

      expect(events.toBottom).toHaveBeenCalledTimes(1);
    });

    it('向上滚到顶部触发 toTop，参数是第一项', () => {
      const list = makeList(50);
      const { el, events } = setup(list);
      scrollTo(el, 400);

      scrollTo(el, 1);

      expect(events.toTop).toHaveBeenCalledTimes(1);
      expect(events.toTop.mock.calls[0]![0]).toBe(list[0]);
    });

    it('向上滚但离顶还远时不触发 toTop', () => {
      const { el, events } = setup();
      scrollTo(el, 1000);

      scrollTo(el, 600);

      expect(events.toTop).not.toHaveBeenCalled();
    });

    it('向上滚动不会误触发 toBottom', () => {
      const { el, events } = setup();
      scrollTo(el, 1800);
      events.toBottom.mockClear();

      scrollTo(el, 1700);

      expect(events.toBottom).not.toHaveBeenCalled();
    });

    it('插槽尺寸计入总高度，从而影响到底判定', () => {
      const { el, core, events } = setup();
      core.slotSize.footerSize = 300;

      // 不含 footer 时 1800 就是底部，含 footer 后还差 300
      scrollTo(el, 1800);

      expect(events.toBottom).not.toHaveBeenCalled();

      scrollTo(el, 2100);
      expect(events.toBottom).toHaveBeenCalledTimes(1);
    });
  });

  describe('列表为空 / 极短时的健壮性', () => {
    it('空列表滚动不抛错，状态保持归零', () => {
      const { el, core } = setup([]);

      expect(() => scrollTo(el, 100)).not.toThrow();
      expect(core.getState().listTotalSize).toBe(0);
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
      scrollTo(el, 400);

      core.updateOptions({ list: [] });

      const state = core.getState();
      expect(state.inViewBegin).toBe(0);
      expect(state.listTotalSize).toBe(0);
      expect(core.sizesMap.size).toBe(0);
    });
  });

  describe('destroy 之后', () => {
    it('不再响应容器的滚动事件', () => {
      const { el, core, events } = setup();
      core.destroy();
      events.scroll.mockClear();

      scrollTo(el, 400);

      expect(events.scroll).not.toHaveBeenCalled();
      expect(core.getState().inViewBegin).toBe(0);
    });

    it('重复 destroy 是安全的', () => {
      const { core } = setup();
      core.destroy();

      expect(() => core.destroy()).not.toThrow();
    });
  });
});
