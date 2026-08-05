import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

/**
 * ResizeObserver 的尺寸上报是 core 的另一条主输入（除 scroll 之外）：
 * 容器与插槽尺寸、每一项的实测高度都从这里进来。
 * jsdom 不实现它，这里换成能手动触发的桩，把回调抓在手上。
 */
describe('VirtListCore 的 ResizeObserver 输入', () => {
  const OriginalRO = globalThis.ResizeObserver;
  let roCallback: ResizeObserverCallback | null = null;
  let observed: Element[] = [];
  let unobserved: Element[] = [];
  let disconnectCount = 0;

  beforeEach(() => {
    roCallback = null;
    observed = [];
    unobserved = [];
    disconnectCount = 0;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        roCallback = cb;
      }
      observe(el: Element) {
        observed.push(el);
      }
      unobserve(el: Element) {
        unobserved.push(el);
      }
      disconnect() {
        disconnectCount += 1;
      }
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = OriginalRO;
    vi.useRealTimers();
  });

  /** borderBoxSize 为数组的常规 entry（Chrome / Firefox 的形态） */
  function entry(id: string, size: number) {
    const target = document.createElement('div');
    target.dataset.id = id;
    return {
      target,
      borderBoxSize: [{ blockSize: size, inlineSize: size * 2 }],
      contentRect: { height: size * 10, width: size * 20 },
    } as unknown as ResizeObserverEntry;
  }

  /** borderBoxSize 缺失、只能退回 contentRect 的 entry（老 Safari 的形态） */
  function contentRectEntry(id: string, size: number) {
    const target = document.createElement('div');
    target.dataset.id = id;
    return {
      target,
      borderBoxSize: undefined,
      contentRect: { height: size, width: size * 2 },
    } as unknown as ResizeObserverEntry;
  }

  function flush(entries: ResizeObserverEntry[]) {
    roCallback?.(entries, {} as ResizeObserver);
  }

  describe('插槽与容器尺寸', () => {
    it('client 上报写入 clientSize 并重算可视区间', () => {
      const core = new VirtListCore(baseOptions());
      expect(core.getState().inViewEnd).toBe(1);

      flush([entry('client', 200)]);

      expect(core.slotSize.clientSize).toBe(200);
      // 200px 视口装得下 5 项 40px，多给一位渲染余量
      expect(core.getState().inViewEnd).toBe(6);
    });

    it('header / footer / stickyHeader / stickyFooter 分别写入对应字段', () => {
      const core = new VirtListCore(baseOptions());

      flush([
        entry('header', 30),
        entry('footer', 40),
        entry('stickyHeader', 50),
        entry('stickyFooter', 60),
      ]);

      expect(core.slotSize.headerSize).toBe(30);
      expect(core.slotSize.footerSize).toBe(40);
      expect(core.slotSize.stickyHeaderSize).toBe(50);
      expect(core.slotSize.stickyFooterSize).toBe(60);
      expect(core.getSlotSize()).toBe(180);
    });

    it('插槽尺寸不计入 listTotalSize，但计入 getTotalSize', () => {
      const core = new VirtListCore(baseOptions(makeList(10)));

      flush([entry('header', 30)]);

      expect(core.getState().listTotalSize).toBe(400);
      expect(core.getTotalSize()).toBe(430);
    });

    it('headerSize 参与列表项的位置计算', () => {
      const core = new VirtListCore(baseOptions(makeList(10)));
      flush([entry('header', 30)]);

      expect(core.getItemPosByIndex(2).top).toBe(30 + 80);
    });

    it('没有 data-id 的元素被忽略', () => {
      const core = new VirtListCore(baseOptions());
      const bare = document.createElement('div');
      const bogus = {
        target: bare,
        borderBoxSize: [{ blockSize: 999, inlineSize: 999 }],
        contentRect: { height: 999, width: 999 },
      } as unknown as ResizeObserverEntry;

      flush([bogus]);

      expect(core.slotSize.clientSize).toBe(0);
      expect(core.getState().listTotalSize).toBe(50 * 40);
    });
  });

  describe('列表项尺寸', () => {
    it('实测尺寸写入 sizesMap，并按差值调整 listTotalSize', () => {
      const itemResize = vi.fn();
      const core = new VirtListCore(baseOptions(makeList(10)), { itemResize });

      flush([entry('0', 100)]);

      expect(core.getItemSize('0')).toBe(100);
      // 10 项估算 400，第 0 项 +60
      expect(core.getState().listTotalSize).toBe(460);
      expect(itemResize).toHaveBeenCalledWith('0', 100);
    });

    it('尺寸没变时不触发 itemResize，也不动 listTotalSize', () => {
      const itemResize = vi.fn();
      const core = new VirtListCore(baseOptions(makeList(10)), { itemResize });

      // 40 正好等于 itemPreSize + itemGap 的回退值
      flush([entry('0', 40)]);

      expect(itemResize).not.toHaveBeenCalled();
      expect(core.getState().listTotalSize).toBe(400);
    });

    it('多项一次上报时差值累加', () => {
      const core = new VirtListCore(baseOptions(makeList(10)));

      flush([entry('0', 50), entry('1', 60), entry('2', 30)]);

      // +10 +20 -10
      expect(core.getState().listTotalSize).toBe(420);
    });

    it('borderBoxSize 缺失时退回 contentRect', () => {
      const core = new VirtListCore(baseOptions(makeList(10)));

      flush([contentRectEntry('0', 77)]);

      expect(core.getItemSize('0')).toBe(77);
    });

    it('borderBoxSize 不是数组时也能读到（部分实现返回单对象）', () => {
      const core = new VirtListCore(baseOptions(makeList(10)));
      const target = document.createElement('div');
      target.dataset.id = '0';
      flush([
        {
          target,
          borderBoxSize: { blockSize: 88, inlineSize: 12 },
          contentRect: { height: 1, width: 1 },
        } as unknown as ResizeObserverEntry,
      ]);

      expect(core.getItemSize('0')).toBe(88);
    });

    it('horizontal 模式读取 inlineSize', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(10)),
        horizontal: true,
      });

      // entry 的 inlineSize 是 blockSize 的两倍
      flush([entry('0', 30)]);

      expect(core.getItemSize('0')).toBe(60);
    });

    it('horizontal 模式退回 contentRect 时读取 width', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(10)),
        horizontal: true,
      });

      flush([contentRectEntry('0', 25)]);

      expect(core.getItemSize('0')).toBe(50);
    });

    it('fixed 模式下上报被 getItemSize 忽略（始终返回估算值）', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(10)),
        fixed: true,
      });

      flush([entry('0', 100)]);

      expect(core.getItemSize('0')).toBe(40);
    });

    it('尺寸变化会通知上层刷新（listTotalSize 已变，UI 需更新占位高度）', () => {
      const update = vi.fn();
      const core = new VirtListCore(baseOptions(makeList(10)), { update });
      update.mockClear();

      flush([entry('0', 100)]);

      expect(update).toHaveBeenCalled();
    });
  });

  describe('渲染窗口之外的上报（virtualSize 失效与重算）', () => {
    it('窗口外的项变高后，滚动定位仍落在正确位置', () => {
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);
      core.slotSize.clientSize = 200;

      // 向下滚到第 10 项，renderBegin 前进到 10，virtualSize 增量维护为 400
      el.scrollTop = 400;
      el.dispatchEvent(new Event('scroll'));
      expect(core.getState().renderBegin).toBe(10);
      expect(core.getState().virtualSize).toBe(400);

      // 第 0 项在渲染窗口之外，它变高不会体现在增量维护的 virtualSize 里。
      // 这类上报会把增量值标记为失效，而通知上层之前必须补一次全量重算——
      // DOM 层拿 virtualSize 当虚拟占位高度来摆放整个渲染块，用陈旧值会让
      // 这一块内容整体偏移（视口里某几项凭空消失，再滚一下才恢复）
      flush([entry('0', 100)]);
      expect(core.getState().virtualSize).toBe(460);

      // 定位到窗口内的项：落点正确，且区间会立刻跟到新位置上
      core.scrollToIndex(12);

      // 程序化滚动之后内部偏移量与区间当场同步（不等浏览器回送 scroll 事件），
      // 所以 renderBegin 前进到 12，virtualSize 随之变成它之前所有项的累计
      expect(el.scrollTop).toBe(460 + 80);
      expect(core.getState().renderBegin).toBe(12);
      expect(core.getState().virtualSize).toBe(540);
    });

    it('窗口内的项变高不会让 virtualSize 失效', () => {
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);
      core.slotSize.clientSize = 200;
      el.scrollTop = 400;
      el.dispatchEvent(new Event('scroll'));

      // 第 12 项在渲染窗口内
      flush([entry('12', 100)]);

      expect(core.getState().virtualSize).toBe(400);

      // 同上：程序化滚动会让区间当场跟到新位置，renderBegin 前进到 11
      core.scrollToIndex(11);
      expect(el.scrollTop).toBe(440);
      expect(core.getState().renderBegin).toBe(11);
      expect(core.getState().virtualSize).toBe(440);
    });
  });

  describe('首帧校准', () => {
    it('第一次上报后按 start 重新校准区间', () => {
      vi.useFakeTimers();
      const core = new VirtListCore({
        ...baseOptions(makeList(50)),
        start: 8,
      });

      flush([entry('client', 200)]);
      // 校准排在下一帧
      expect(core.getState().inViewBegin).toBe(0);

      vi.advanceTimersByTime(16);

      expect(core.getState().inViewBegin).toBe(8);
    });

    it('后续上报不再触发校准（不会把用户滚动位置拽回 start）', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore({
        ...baseOptions(makeList(50)),
        start: 8,
      });
      core.bindDOM(el);
      core.slotSize.clientSize = 200;

      flush([entry('client', 200)]);
      vi.advanceTimersByTime(16);

      el.scrollTop = 800;
      el.dispatchEvent(new Event('scroll'));
      expect(core.getState().inViewBegin).toBe(20);

      flush([entry('20', 45)]);
      vi.advanceTimersByTime(16);

      expect(core.getState().inViewBegin).toBe(20);
    });
  });

  describe('observe / unobserve / destroy', () => {
    it('bindDOM 观察滚动容器', () => {
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions());
      core.bindDOM(el);

      expect(observed).toContain(el);
    });

    it('observeSlotEl / unobserveSlotEl 转发到观察器', () => {
      const core = new VirtListCore(baseOptions());
      const slot = document.createElement('div');

      core.observeSlotEl(slot);
      expect(observed).toContain(slot);

      core.unobserveSlotEl(slot);
      expect(unobserved).toContain(slot);
    });

    it('destroy 断开观察器、清零 clientSize，且后续上报不再生效', () => {
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(10)));
      core.bindDOM(el);
      flush([entry('client', 200)]);
      expect(core.slotSize.clientSize).toBe(200);

      core.destroy();

      expect(unobserved).toContain(el);
      expect(disconnectCount).toBe(1);
      expect(core.slotSize.clientSize).toBe(0);
      expect(core.resizeObserver).toBeUndefined();
    });
  });

  describe('运行环境不提供 ResizeObserver 时', () => {
    it('不创建观察器，其余功能照常', () => {
      // @ts-expect-error 故意模拟缺失的运行环境
      globalThis.ResizeObserver = undefined;

      const core = new VirtListCore(baseOptions(makeList(10)));
      const el = makeScrollEl();

      expect(core.resizeObserver).toBeUndefined();
      expect(() => core.bindDOM(el)).not.toThrow();
      expect(core.getState().listTotalSize).toBe(400);
      expect(() => core.destroy()).not.toThrow();
    });
  });
});
