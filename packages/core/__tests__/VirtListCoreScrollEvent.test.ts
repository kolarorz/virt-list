import { describe, expect, it, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';
import type { VirtScrollEvent } from '../src/types';

const ITEM_SIZE = 40;

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

/** 50 项 × 40px = 2000，视口 200 → 可滚动到 1800 */
function setup(list = makeList(50), clientSize = 200) {
  const scroll = vi.fn<(e: VirtScrollEvent) => void>();
  const offsetChange = vi.fn<(offset: number) => void>();
  const core = new VirtListCore<Item>(
    { list, itemKey: 'id', itemPreSize: ITEM_SIZE, fixed: true },
    { scroll, offsetChange },
  );
  const el = makeScrollEl(() => core.getTotalSize(), clientSize);
  core.bindDOM(el);
  core.slotSize.clientSize = clientSize;
  scroll.mockClear();
  offsetChange.mockClear();
  return { core, el, scroll, offsetChange };
}

/** 取最近一次 scroll 事件的载荷 */
function lastEvent(scroll: ReturnType<typeof vi.fn>): VirtScrollEvent {
  const calls = scroll.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1]![0] as VirtScrollEvent;
}

/*
 * scroll 是原生 scroll 事件的替代品：容器 overflow:hidden，浏览器不会派发它，
 * 所以这里锁住的是"我们自己造的那一份"——载荷是普通对象而不是 Event，
 * 且把内部账本（方向、边界、是谁动的）如实带出去。
 */
describe('scroll 事件', () => {
  describe('载荷', () => {
    it('带出完整的滚动状态，且不是 DOM Event', () => {
      const { core, scroll } = setup();

      core.scrollFromUser(400);

      expect(scroll).toHaveBeenCalledTimes(1);
      const e = lastEvent(scroll);
      expect(e).not.toBeInstanceOf(Event);
      expect(e).toEqual({
        offset: 400,
        delta: 400,
        direction: 'end',
        clientSize: 200,
        scrollSize: 2000,
        maxOffset: 1800,
        atStart: false,
        atEnd: false,
        source: 'user',
      });
    });

    it('delta 是相对上一次的位移，向上滚为负且 direction 翻转', () => {
      const { core, scroll } = setup();
      core.scrollFromUser(400);
      scroll.mockClear();

      core.scrollFromUser(250);

      const e = lastEvent(scroll);
      expect(e.delta).toBe(-150);
      expect(e.direction).toBe('start');
      expect(e.offset).toBe(250);
    });

    it('scrollSize 计入插槽尺寸，maxOffset 随之变化', () => {
      const { core, scroll } = setup();
      core.slotSize.headerSize = 100;

      core.scrollFromUser(400);

      const e = lastEvent(scroll);
      expect(e.scrollSize).toBe(2100);
      expect(e.maxOffset).toBe(1900);
    });

    it('内容缩到不足一屏时 maxOffset 是 0 而不是负数', () => {
      const list = makeList(50);
      const { core, scroll } = setup(list);
      core.scrollFromUser(1800);
      scroll.mockClear();

      // 只剩 2 项 = 80px < 视口 200，压根没有可滚动空间
      core.updateOptions({ list: list.slice(0, 2) });

      const e = lastEvent(scroll);
      expect(e.scrollSize).toBe(80);
      expect(e.maxOffset).toBe(0);
      expect(e.offset).toBe(0);
      expect(e.atStart).toBe(true);
      // 顶到底同时成立：没有可滚动空间时两头是同一个位置
      expect(e.atEnd).toBe(true);
    });
  });

  describe('边界标志', () => {
    it('回到顶部时 atStart 为真', () => {
      const { core, scroll } = setup();
      core.scrollFromUser(400);
      scroll.mockClear();

      core.scrollFromUser(0);

      const e = lastEvent(scroll);
      expect(e.atStart).toBe(true);
      expect(e.atEnd).toBe(false);
    });

    it('到达底部时 atEnd 为真', () => {
      const { core, scroll } = setup();

      core.scrollFromUser(1800);

      const e = lastEvent(scroll);
      expect(e.atEnd).toBe(true);
      expect(e.atStart).toBe(false);
    });

    it('atEnd 留了亚像素容差，差不到 0.5px 也算到底', () => {
      const { core, scroll } = setup();

      // 平滑动画的插值会落在 max 前几个千分位上，严格相等判定会漏掉收尾那一帧
      core.scrollFromUser(1799.7);

      expect(lastEvent(scroll).atEnd).toBe(true);
    });

    it('差 1px 就不算到底', () => {
      const { core, scroll } = setup();

      core.scrollFromUser(1799);

      expect(lastEvent(scroll).atEnd).toBe(false);
    });
  });

  describe('source：谁动的', () => {
    it('scrollFromUser → user', () => {
      const { core, scroll } = setup();

      core.scrollFromUser(400);

      expect(lastEvent(scroll).source).toBe('user');
    });

    it('scrollToOffset / scrollToBottom / scrollToTop → program', () => {
      const { core, scroll } = setup();

      core.scrollToOffset(400);
      expect(lastEvent(scroll).source).toBe('program');

      core.scrollToBottom();
      expect(lastEvent(scroll).source).toBe('program');

      core.scrollToTop();
      expect(lastEvent(scroll).source).toBe('program');
    });

    it('scrollToIndex → program', () => {
      const { core, scroll } = setup();

      core.scrollToIndex(20);

      expect(lastEvent(scroll).source).toBe('program');
      expect(lastEvent(scroll).offset).toBe(800);
    });

    it('头部插入触发的位移补偿 → adjust', () => {
      const list = makeList(50);
      const { core, scroll } = setup(list);
      core.scrollFromUser(400);
      scroll.mockClear();

      // 视口内容要留在原处，偏移量得跟着往下推——用户和程序都没要求滚动
      core.updateOptions({ list: [...makeList(10, 'prepend'), ...list] });

      expect(scroll).toHaveBeenCalled();
      expect(lastEvent(scroll).source).toBe('adjust');
      expect(core.getOffset()).toBe(800);
    });

    it('列表变短后的越界回夹 → adjust', () => {
      const list = makeList(50);
      const { core, scroll } = setup(list);
      core.scrollFromUser(1800);
      scroll.mockClear();

      // 只剩 10 项 = 400px，可滚动上限降到 200，旧偏移量已经越界
      core.updateOptions({ list: list.slice(0, 10) });

      expect(lastEvent(scroll).source).toBe('adjust');
      expect(lastEvent(scroll).offset).toBe(200);
    });

    it('deletedList2Top / addedList2Top → adjust', () => {
      const list = makeList(50);
      const { core, scroll } = setup(list);
      core.scrollFromUser(800);
      scroll.mockClear();

      core.addedList2Top(makeList(5, 'added'));
      expect(lastEvent(scroll).source).toBe('adjust');

      core.deletedList2Top(makeList(5, 'added'));
      expect(lastEvent(scroll).source).toBe('adjust');
    });
  });

  describe('触发时机', () => {
    it('偏移量没变时不触发', () => {
      const { core, scroll } = setup();
      core.scrollFromUser(400);
      scroll.mockClear();

      core.scrollFromUser(400);

      expect(scroll).not.toHaveBeenCalled();
    });

    it('被夹住导致偏移量没变时也不触发', () => {
      const { core, scroll } = setup();
      core.scrollFromUser(1800);
      scroll.mockClear();

      core.scrollFromUser(99999);

      expect(scroll).not.toHaveBeenCalled();
    });

    it('未绑定 DOM 时不触发', () => {
      const scroll = vi.fn();
      const core = new VirtListCore<Item>(
        { list: makeList(50), itemKey: 'id', itemPreSize: ITEM_SIZE },
        { scroll },
      );

      core.scrollFromUser(400);

      expect(scroll).not.toHaveBeenCalled();
    });

    it('resume 只补 offsetChange，不算一次滚动', () => {
      const { core, scroll, offsetChange } = setup();
      core.scrollFromUser(400);
      scroll.mockClear();
      offsetChange.mockClear();

      // resume 是重挂 DOM 后把内容摆回原位，位置根本没变
      core.resume();

      expect(offsetChange).toHaveBeenCalledTimes(1);
      expect(scroll).not.toHaveBeenCalled();
    });

    it('在 offsetChange 之后触发，两者看到的偏移量一致', () => {
      const seen: string[] = [];
      const core = new VirtListCore<Item>(
        { list: makeList(50), itemKey: 'id', itemPreSize: ITEM_SIZE },
        {
          offsetChange: (o) => seen.push(`offsetChange:${o}`),
          scroll: (e) => seen.push(`scroll:${e.offset}`),
        },
      );
      core.bindDOM(makeScrollEl(() => core.getTotalSize(), 200));
      core.slotSize.clientSize = 200;
      seen.length = 0;

      core.scrollFromUser(400);

      expect(seen).toEqual(['offsetChange:400', 'scroll:400']);
    });

    it('没有监听者时不报错', () => {
      const core = new VirtListCore<Item>(
        { list: makeList(50), itemKey: 'id', itemPreSize: ITEM_SIZE },
        { offsetChange: vi.fn() },
      );
      core.bindDOM(makeScrollEl(() => core.getTotalSize(), 200));
      core.slotSize.clientSize = 200;

      expect(() => core.scrollFromUser(400)).not.toThrow();
    });
  });

  describe('水平模式', () => {
    it('字段语义不变，offset 即 scrollLeft', () => {
      const list = makeList(50);
      const scroll = vi.fn<(e: VirtScrollEvent) => void>();
      const core = new VirtListCore<Item>(
        {
          list,
          itemKey: 'id',
          itemPreSize: ITEM_SIZE,
          fixed: true,
          horizontal: true,
        },
        { scroll },
      );
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollLeft', {
        configurable: true,
        writable: true,
        value: 0,
      });
      core.bindDOM(el);
      core.slotSize.clientSize = 200;
      scroll.mockClear();

      core.scrollFromUser(400);

      const e = lastEvent(scroll);
      expect(e.offset).toBe(400);
      expect(e.direction).toBe('end');
    });
  });
});
