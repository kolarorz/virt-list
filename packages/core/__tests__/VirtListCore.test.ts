import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';
import { DEFAULT_OPTIONS } from '../src/types';

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    text: `item-${i}`,
  }));
}

function baseOptions(list = makeList(10)) {
  return {
    list,
    itemKey: 'id' as const,
    itemPreSize: 40,
  };
}

describe('VirtListCore', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('initializes with minimal options and DEFAULT_OPTIONS fallbacks via props proxy', () => {
      const list = makeList(3);
      const core = new VirtListCore(baseOptions(list));

      expect(core.props.list).toBe(list);
      expect(core.props.itemKey).toBe('id');
      expect(core.props.itemPreSize).toBe(40);
      expect(core.props.itemGap).toBe(DEFAULT_OPTIONS.itemGap);
      expect(core.props.fixed).toBe(DEFAULT_OPTIONS.fixed);
      expect(core.props.buffer).toBe(DEFAULT_OPTIONS.buffer);
      expect(core.props.bufferTop).toBe(DEFAULT_OPTIONS.bufferTop);
      expect(core.props.bufferBottom).toBe(DEFAULT_OPTIONS.bufferBottom);
      expect(core.props.horizontal).toBe(DEFAULT_OPTIONS.horizontal);
    });

    it('respects custom options (itemGap, fixed, buffer, horizontal)', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(5)),
        itemGap: 8,
        fixed: true,
        buffer: 2,
        bufferTop: 1,
        bufferBottom: 3,
        horizontal: true,
      });

      expect(core.props.itemGap).toBe(8);
      expect(core.props.fixed).toBe(true);
      expect(core.props.buffer).toBe(2);
      expect(core.props.horizontal).toBe(true);
    });

    it('accepts optional events object as second argument', () => {
      const update = vi.fn();
      const core = new VirtListCore(baseOptions(), { update });
      expect(update).toHaveBeenCalled();
      const [renderList, state] = update.mock.calls[0]!;
      expect(renderList.length).toBeGreaterThan(0);
      expect(state.listTotalSize).toBeGreaterThan(0);
    });
  });

  describe('state initialization (listTotalSize)', () => {
    it('sets listTotalSize to list.length * (itemPreSize + itemGap) in fixed mode', () => {
      const n = 7;
      const itemPreSize = 30;
      const itemGap = 5;
      const core = new VirtListCore({
        ...baseOptions(makeList(n)),
        itemPreSize,
        itemGap,
        fixed: true,
      });
      expect(core.state.listTotalSize).toBe(n * (itemPreSize + itemGap));
    });

    it('sets listTotalSize from estimated sizes when not fixed and nothing measured', () => {
      const n = 4;
      const itemPreSize = 25;
      const itemGap = 3;
      const core = new VirtListCore({
        ...baseOptions(makeList(n)),
        itemPreSize,
        itemGap,
        fixed: false,
      });
      expect(core.state.listTotalSize).toBe(n * (itemPreSize + itemGap));
    });
  });

  describe('getItemSize', () => {
    it('in fixed mode always returns itemPreSize + itemGap (ignores sizesMap)', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(3)),
        itemPreSize: 50,
        itemGap: 2,
        fixed: true,
      });
      core.setItemSize('0', 999);
      expect(core.getItemSize('0')).toBe(52);
    });

    it('in dynamic mode returns measured size from sizesMap when present', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(3)),
        itemPreSize: 50,
        itemGap: 2,
        fixed: false,
      });
      core.setItemSize('1', 120);
      expect(core.getItemSize('1')).toBe(120);
    });

    it('in dynamic mode falls back to itemPreSize + itemGap when not measured', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(2)),
        itemPreSize: 40,
        itemGap: 6,
        fixed: false,
      });
      expect(core.getItemSize('0')).toBe(46);
    });
  });

  describe('setItemSize / deleteItemSize', () => {
    it('setItemSize stores size; deleteItemSize removes it', () => {
      const core = new VirtListCore({ ...baseOptions(), fixed: false });
      core.setItemSize('0', 88);
      expect(core.sizesMap.get('0')).toBe(88);
      expect(core.getItemSize('0')).toBe(88);

      core.deleteItemSize('0');
      expect(core.sizesMap.has('0')).toBe(false);
      expect(core.getItemSize('0')).toBe(core.props.itemPreSize + core.props.itemGap);
    });

    it('coerces itemKey to string for map storage', () => {
      const core = new VirtListCore({ ...baseOptions(), fixed: false });
      core.setItemSize('42', 10);
      expect(core.sizesMap.get('42')).toBe(10);
      core.deleteItemSize('42');
      expect(core.sizesMap.has('42')).toBe(false);
    });
  });

  describe('getItemPosByIndex', () => {
    it('fixed mode: positions are uniform steps', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(5)),
        itemPreSize: 20,
        itemGap: 10,
        fixed: true,
      });
      const unit = 30;
      expect(core.getItemPosByIndex(0)).toEqual({
        top: 0,
        current: unit,
        bottom: unit,
      });
      expect(core.getItemPosByIndex(2)).toEqual({
        top: 2 * unit,
        current: unit,
        bottom: 3 * unit,
      });
    });

    it('dynamic mode: sums prior item sizes and includes headerSize', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(4)),
        itemPreSize: 10,
        itemGap: 0,
        fixed: false,
      });
      core.slotSize.headerSize = 100;
      core.setItemSize('0', 50);
      core.setItemSize('1', 60);
      // index 2: top = header + size0 + size1
      expect(core.getItemPosByIndex(2).top).toBe(100 + 50 + 60);
      expect(core.getItemPosByIndex(2).current).toBe(10); // fallback preSize
    });
  });

  describe('list replacement (updateOptions list)', () => {
    it('recomputes totals and render slice when list changes', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(10)),
        itemPreSize: 40,
        fixed: true,
      });
      const prevTotal = core.state.listTotalSize;
      expect(prevTotal).toBe(10 * 40);

      const next = makeList(3);
      core.updateOptions({ list: next });

      expect(core.props.list).toBe(next);
      expect(core.state.listTotalSize).toBe(3 * 40);
      expect(core.renderList.every((item) => next.includes(item))).toBe(true);
    });

    it('empty list triggers reset-like state', () => {
      const core = new VirtListCore(baseOptions(makeList(5)));
      core.setItemSize('0', 77);
      core.updateOptions({ list: [] });

      expect(core.state.listTotalSize).toBe(0);
      expect(core.sizesMap.size).toBe(0);
      expect(core.renderList).toEqual([]);
    });
  });

  describe('forceUpdate / reset', () => {
    it('forceUpdate refreshes render range and invokes update', () => {
      const update = vi.fn();
      const core = new VirtListCore(baseOptions(makeList(8)), { update });
      update.mockClear();

      core.forceUpdate();

      expect(update).toHaveBeenCalled();
      expect(core.renderList).toEqual(
        core.props.list.slice(core.state.renderBegin, core.state.renderEnd + 1),
      );
    });

    it('reset clears offset, totals, maps, and re-runs render range', () => {
      const core = new VirtListCore({ ...baseOptions(makeList(4)), fixed: false });
      core.setItemSize('0', 50);
      core.state.listTotalSize = 999;

      core.reset();

      expect(core.state.listTotalSize).toBe(0);
      expect(core.state.virtualSize).toBe(0);
      expect(core.sizesMap.size).toBe(0);
    });
  });

  describe('getSlotSize / getTotalSize', () => {
    it('getSlotSize sums header, footer, sticky header and sticky footer', () => {
      const core = new VirtListCore(baseOptions());
      core.slotSize.headerSize = 10;
      core.slotSize.footerSize = 20;
      core.slotSize.stickyHeaderSize = 3;
      core.slotSize.stickyFooterSize = 7;
      expect(core.getSlotSize()).toBe(40);
    });

    it('getTotalSize is listTotalSize + getSlotSize()', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(2)),
        itemPreSize: 50,
        fixed: true,
      });
      core.slotSize.headerSize = 15;
      core.slotSize.footerSize = 5;
      expect(core.state.listTotalSize).toBe(100);
      expect(core.getTotalSize()).toBe(100 + 20);
    });
  });

  describe('props proxy (DEFAULT_OPTIONS fallback)', () => {
    it('reading unset optional keys returns DEFAULT_OPTIONS values', () => {
      const opts = baseOptions();
      const core = new VirtListCore(opts);

      expect(core.props.scrollDistance).toBe(DEFAULT_OPTIONS.scrollDistance);
      expect(core.props.start).toBe(DEFAULT_OPTIONS.start);
      expect(core.props.offset).toBe(DEFAULT_OPTIONS.offset);
      expect(core.props.renderControl).toBe(DEFAULT_OPTIONS.renderControl);
    });

    it('mutating original options object is reflected through props after updateOptions', () => {
      const opts = baseOptions(makeList(2));
      const core = new VirtListCore(opts);
      Object.assign(opts, { itemGap: 12 });
      expect(core.props.itemGap).toBe(12);
    });
  });

  describe('renderList', () => {
    it('is a slice of list from renderBegin to renderEnd inclusive', () => {
      const list = makeList(20);
      const core = new VirtListCore({
        list,
        itemKey: 'id',
        itemPreSize: 40,
        fixed: true,
        buffer: 1,
      });
      const { renderBegin, renderEnd } = core.state;
      expect(core.renderList).toEqual(list.slice(renderBegin, renderEnd + 1));
    });

    it('respects renderControl when provided', () => {
      const list = makeList(10);
      const core = new VirtListCore({
        list,
        itemKey: 'id',
        itemPreSize: 40,
        fixed: true,
        renderControl: () => ({ begin: 2, end: 5 }),
      });
      expect(core.state.renderBegin).toBe(2);
      expect(core.state.renderEnd).toBe(5);
      expect(core.renderList).toEqual(list.slice(2, 6));
    });
  });

  describe('getOffset / bindDOM / scrollToOffset', () => {
    it('getOffset returns 0 when no scroll container is bound', () => {
      const core = new VirtListCore(baseOptions());
      expect(core.getOffset()).toBe(0);
    });

    it('after bindDOM, getOffset and scrollToOffset use scrollTop by default', () => {
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 0,
      });
      const core = new VirtListCore(baseOptions());
      core.bindDOM(el);

      el.scrollTop = 42;
      expect(core.getOffset()).toBe(42);

      core.scrollToOffset(100);
      expect(el.scrollTop).toBe(100);
      expect(core.getOffset()).toBe(100);
    });

    it('horizontal mode uses scrollLeft', () => {
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollLeft', {
        writable: true,
        configurable: true,
        value: 0,
      });
      const core = new VirtListCore({ ...baseOptions(), horizontal: true });
      core.bindDOM(el);

      el.scrollLeft = 33;
      expect(core.getOffset()).toBe(33);
      core.scrollToOffset(50);
      expect(el.scrollLeft).toBe(50);
    });
  });

  describe('scrollToIndex', () => {
    it('scrolls to item top offset for middle index', () => {
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 0,
      });
      const core = new VirtListCore({
        ...baseOptions(makeList(10)),
        itemPreSize: 40,
        fixed: true,
      });
      core.bindDOM(el);
      core.scrollToIndex(3);
      expect(el.scrollTop).toBe(3 * 40);
    });

    it('delegates to scrollToBottom for last index or beyond', () => {
      vi.useFakeTimers();
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 0,
      });
      const core = new VirtListCore({
        ...baseOptions(makeList(3)),
        itemPreSize: 40,
        fixed: true,
      });
      core.bindDOM(el);
      core.slotSize.clientSize = 200;

      core.scrollToIndex(99);
      vi.runAllTimers();
      expect(el.scrollTop).toBe(
        Math.max(0, core.getTotalSize() - core.slotSize.clientSize),
      );
    });
  });

  describe('scrollToTop / scrollToBottom', () => {
    it('scrollToTop sets scroll position to 0', () => {
      vi.useFakeTimers();
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 50,
      });
      const core = new VirtListCore(baseOptions());
      core.bindDOM(el);
      core.scrollToTop();
      vi.runAllTimers();
      expect(el.scrollTop).toBe(0);
    });

    /** scrollTop 像浏览器那样被裁剪到 [0, 最大可滚动值] 的容器 */
    function makeClampedScrollEl(getMaxScroll: () => number) {
      const el = document.createElement('div');
      let value = 0;
      Object.defineProperty(el, 'scrollTop', {
        configurable: true,
        get: () => value,
        set: (v: number) => {
          value = Math.min(Math.max(0, v), Math.max(0, getMaxScroll()));
        },
      });
      return el;
    }

    it('底部未到位时按后续信号继续修正，追上 totalSize 后停止', () => {
      vi.useFakeTimers();
      const core = new VirtListCore(baseOptions(makeList(50)));
      const state = core.getState();
      const el = makeClampedScrollEl(() =>
        Math.max(0, state.listTotalSize - 100),
      );
      core.bindDOM(el);
      core.slotSize.clientSize = 100;
      state.listTotalSize = 500;

      core.scrollToBottom();
      expect(el.scrollTop).toBe(400);

      // 模拟新项测量回填后 totalSize 变大：上一次的落点已不是底部，需要继续修正。
      // 关键回归点——若在赋值后同步判断收敛，这里会被误判成已到底而提前停下
      state.listTotalSize = 620;
      vi.advanceTimersByTime(16);
      expect(el.scrollTop).toBe(520);

      // 已到底，后续帧不再改动，也不留挂起的回调
      vi.advanceTimersByTime(160);
      expect(el.scrollTop).toBe(520);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('目标始终不收敛时渐进修正会自行停止，不会无限重试', () => {
      vi.useFakeTimers();
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 0,
      });
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);
      core.slotSize.clientSize = 100;
      // clientSize 永远填不满，reached() 恒为 false
      core.getState().listTotalSize = 500;

      core.scrollToBottom();
      // 30 帧上限，多推进一些确保循环已退出
      vi.advanceTimersByTime(16 * 60);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('用户主动滚动会取消挂起的底部修正', () => {
      vi.useFakeTimers();
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 0,
      });
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);
      core.slotSize.clientSize = 100;
      core.getState().listTotalSize = 500;

      core.scrollToBottom();
      core.scrollToOffset(80);
      vi.advanceTimersByTime(160);

      expect(el.scrollTop).toBe(80);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('smooth scroll', () => {
    /** 创建一个 scrollTop 可读写的容器（jsdom 下 scrollTop 恒为 0） */
    function makeScrollEl(initial = 0) {
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollTop', {
        writable: true,
        configurable: true,
        value: initial,
      });
      return el;
    }

    it('behavior 缺省时保持同步硬跳（回归保护）', () => {
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions());
      core.bindDOM(el);

      const onDone = vi.fn();
      core.scrollToOffset(120, { onDone });

      expect(el.scrollTop).toBe(120);
      expect(onDone).toHaveBeenCalledWith(false);
    });

    it('scrollToOffset smooth 分帧推进并在结束时回调 onDone(false)', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(10)));
      core.bindDOM(el);

      const onDone = vi.fn();
      core.scrollToOffset(200, { behavior: 'smooth', duration: 100, onDone });

      // 调用后不应立即到位
      expect(el.scrollTop).toBe(0);
      expect(onDone).not.toHaveBeenCalled();

      vi.advanceTimersByTime(48);
      expect(el.scrollTop).toBeGreaterThan(0);
      expect(el.scrollTop).toBeLessThan(200);

      vi.advanceTimersByTime(200);
      expect(el.scrollTop).toBe(200);
      expect(onDone).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledWith(false);
    });

    it('scrollToIndex smooth 最终落在目标项顶部', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore({
        ...baseOptions(makeList(10)),
        itemPreSize: 40,
        fixed: true,
      });
      core.bindDOM(el);

      core.scrollToIndex(3, { behavior: 'smooth', duration: 100 });
      expect(el.scrollTop).toBe(0);

      vi.advanceTimersByTime(200);
      expect(el.scrollTop).toBe(3 * 40);
    });

    it('用户 wheel 手势中断动画并回调 onDone(true)', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(10)));
      core.bindDOM(el);

      const onDone = vi.fn();
      core.scrollToOffset(300, { behavior: 'smooth', duration: 200, onDone });
      vi.advanceTimersByTime(48);

      const midway = el.scrollTop;
      el.dispatchEvent(new Event('wheel'));

      expect(onDone).toHaveBeenCalledWith(true);

      vi.advanceTimersByTime(400);
      // 动画已取消，位置不再被推进
      expect(el.scrollTop).toBe(midway);
    });

    it('新的滚动调用会抢占进行中的动画', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(10)));
      core.bindDOM(el);

      const onDone = vi.fn();
      core.scrollToOffset(300, { behavior: 'smooth', duration: 200, onDone });
      vi.advanceTimersByTime(48);

      core.scrollToOffset(0);
      expect(onDone).toHaveBeenCalledWith(true);
      expect(el.scrollTop).toBe(0);

      vi.advanceTimersByTime(400);
      expect(el.scrollTop).toBe(0);
    });

    it('cancelScroll 与 destroy 都会取消进行中的动画', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(10)));
      core.bindDOM(el);

      const onCanceled = vi.fn();
      core.scrollToOffset(300, {
        behavior: 'smooth',
        duration: 200,
        onDone: onCanceled,
      });
      core.cancelScroll();
      expect(onCanceled).toHaveBeenCalledWith(true);

      const onDestroyed = vi.fn();
      core.scrollToOffset(300, {
        behavior: 'smooth',
        duration: 200,
        onDone: onDestroyed,
      });
      core.destroy();
      expect(onDestroyed).toHaveBeenCalledWith(true);
    });

    it('duration 缺省时取 options.scrollDuration', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore({
        ...baseOptions(makeList(10)),
        scrollDuration: 1000,
      });
      core.bindDOM(el);

      core.scrollToOffset(200, { behavior: 'smooth' });
      vi.advanceTimersByTime(400);
      // 1000ms 的动画在 400ms 时还没结束
      expect(el.scrollTop).toBeLessThan(200);

      vi.advanceTimersByTime(1000);
      expect(el.scrollTop).toBe(200);
    });

    it('duration 为 0 时退化为同步跳转', () => {
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(10)));
      core.bindDOM(el);

      const onDone = vi.fn();
      core.scrollToOffset(160, { behavior: 'smooth', duration: 0, onDone });

      expect(el.scrollTop).toBe(160);
      expect(onDone).toHaveBeenCalledWith(false);
    });

    it('远距离 smooth 会先预跳到目标附近，再逐帧滑完最后一段', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore({
        ...baseOptions(makeList(2000)),
        itemPreSize: 40,
        fixed: true,
      });
      core.bindDOM(el);
      core.slotSize.clientSize = 400; // approach 距离 = 400 * 2 = 800

      core.scrollToIndex(1000, { behavior: 'smooth', duration: 300 });

      // 第一帧只做预跳：直接落到「目标 - 800」
      vi.advanceTimersByTime(16);
      expect(el.scrollTop).toBe(40000 - 800);

      vi.advanceTimersByTime(400);
      expect(el.scrollTop).toBe(40000);
    });

    it('smoothMaxDistance 为 Infinity 时全程逐帧滚动（不预跳）', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore({
        ...baseOptions(makeList(2000)),
        itemPreSize: 40,
        fixed: true,
        smoothMaxDistance: Infinity,
      });
      core.bindDOM(el);
      core.slotSize.clientSize = 400;

      core.scrollToIndex(1000, { behavior: 'smooth', duration: 300 });

      vi.advanceTimersByTime(32);
      // 没有预跳，前两帧还在起点附近
      expect(el.scrollTop).toBeLessThan(40000 - 800);

      vi.advanceTimersByTime(400);
      expect(el.scrollTop).toBe(40000);
    });

    it('自定义 smoothMaxDistance 生效', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore({
        ...baseOptions(makeList(2000)),
        itemPreSize: 40,
        fixed: true,
        smoothMaxDistance: 200,
      });
      core.bindDOM(el);
      core.slotSize.clientSize = 400;

      core.scrollToIndex(1000, { behavior: 'smooth', duration: 300 });
      vi.advanceTimersByTime(16);
      expect(el.scrollTop).toBe(40000 - 200);
    });

    it('scrollToTop smooth 最终归零', () => {
      vi.useFakeTimers();
      const el = makeScrollEl(200);
      const core = new VirtListCore(baseOptions(makeList(10)));
      core.bindDOM(el);

      core.scrollToTop({ behavior: 'smooth', duration: 100 });
      expect(el.scrollTop).toBe(200);

      vi.advanceTimersByTime(200);
      vi.runAllTimers();
      expect(el.scrollTop).toBe(0);
    });
  });

  describe('bindDOM / destroy (cleanup)', () => {
    it('destroy removes scroll listener and clears client binding', () => {
      const el = document.createElement('div');
      const removeSpy = vi.spyOn(el, 'removeEventListener');
      const core = new VirtListCore(baseOptions());
      core.bindDOM(el);

      core.destroy();

      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      core.scrollToOffset(10);
      expect(core.getOffset()).toBe(0);
    });
  });

  describe('scroll anchor（尺寸实测后的视口复原）', () => {
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

    function makeScrollEl(initial = 0) {
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollTop', {
        writable: true,
        configurable: true,
        value: initial,
      });
      return el;
    }

    /** 构造一条 ResizeObserver entry（data-id 即 itemKey） */
    function sizeEntry(id: string, size: number) {
      const target = document.createElement('div');
      target.dataset.id = id;
      return {
        target,
        borderBoxSize: [{ blockSize: size, inlineSize: size }],
        contentRect: { height: size, width: size },
      } as unknown as ResizeObserverEntry;
    }

    function flushResize(entries: ResizeObserverEntry[]) {
      roCallback?.(entries, {} as ResizeObserver);
    }

    function scrollTo(el: HTMLElement, offset: number) {
      el.scrollTop = offset;
      el.dispatchEvent(new Event('scroll'));
    }

    /** 参照项相对视口顶部的位置——"内容不跳"就是这个值保持不变 */
    function screenPos(core: VirtListCore<any>, el: HTMLElement, index: number) {
      return core.getItemPosByIndex(index).top - el.scrollTop;
    }

    /** 40px 估算、无 gap、视口 200px 的 50 项列表，已滚到中部 */
    function setup() {
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);
      core.slotSize.clientSize = 200;
      // 向下滚到第 10 项顶部，让 inViewBegin 前进到 10
      scrollTo(el, 400);
      return { el, core };
    }

    it('向上滚动后上方项实测变高，视口内容不跳动', () => {
      const { el, core } = setup();
      const anchorIndex = core.getState().inViewBegin;
      expect(anchorIndex).toBe(10);

      // 向上滚进第 9 项，触发向上渲染并立起锚点
      scrollTo(el, 360);
      const before = screenPos(core, el, anchorIndex);

      // 第 9 项实测 60px（比 40px 的估算高 20）
      flushResize([sizeEntry('9', 60)]);

      expect(screenPos(core, el, anchorIndex)).toBe(before);
      expect(el.scrollTop).toBe(380);
    });

    it('锚点下方的项变高不会移动视口（旧的 diff 补偿会在此误判）', () => {
      const { el, core } = setup();
      scrollTo(el, 360);

      // 第 30 项远在视口下方，它变高只该让列表更长，不该动 scrollTop
      flushResize([sizeEntry('30', 60)]);

      expect(el.scrollTop).toBe(360);
      expect(core.getTotalSize()).toBe(50 * 40 + 20);
    });

    it('多项同时实测时按锚点上方的部分求解', () => {
      const { el, core } = setup();
      // 锚点参照的是"向上滚之前"的顶部项，须在 scrollTo 之前取
      const anchorIndex = core.getState().inViewBegin;
      scrollTo(el, 360);
      const before = screenPos(core, el, anchorIndex);

      // 上方两项各 +20，下方一项 +20：只有上方的 40 该计入位移
      flushResize([
        sizeEntry('8', 60),
        sizeEntry('9', 60),
        sizeEntry('30', 60),
      ]);

      expect(screenPos(core, el, anchorIndex)).toBe(before);
      expect(el.scrollTop).toBe(400);
    });

    it('向下滚动会作废待处理的锚点', () => {
      const { el, core } = setup();
      scrollTo(el, 360);
      // 向下滚回去，说明用户已离开原来那段内容
      scrollTo(el, 480);

      flushResize([sizeEntry('9', 60)]);

      expect(el.scrollTop).toBe(480);
    });

    it('用户主动 scrollToOffset 会清掉锚点', () => {
      const { el, core } = setup();
      scrollTo(el, 360);

      core.scrollToOffset(360);
      flushResize([sizeEntry('9', 60)]);

      expect(el.scrollTop).toBe(360);
    });

    it('参照项从列表中消失后锚点失效，不做错误修正', () => {
      const list = makeList(50);
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(list));
      core.bindDOM(el);
      core.slotSize.clientSize = 200;
      scrollTo(el, 400);
      scrollTo(el, 360);

      // 整体换成另一批 key，锚点的参照项不复存在
      core.updateOptions({
        list: list.map((item) => ({ ...item, id: `x-${item.id}` })),
      });
      flushResize([sizeEntry('9', 60)]);

      expect(el.scrollTop).toBe(360);
    });

    it('平滑滚动进行中，锚点只平移插值起点，不直接改写 scrollTop', () => {
      vi.useFakeTimers();
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);
      core.slotSize.clientSize = 200;
      scrollTo(el, 400);

      // 先启动动画（会清掉已有锚点），再由动画自身的向上滚动重新立起锚点
      core.scrollToOffset(0, {
        behavior: 'smooth',
        duration: 200,
        maxDistance: Infinity,
      });
      vi.advanceTimersByTime(32);
      // jsdom 不会因赋值 scrollTop 而派发 scroll，手动补上浏览器的这一步
      el.dispatchEvent(new Event('scroll'));

      const during = el.scrollTop;
      flushResize([sizeEntry('5', 60)]);
      // 位置仍由动画掌管，锚点不在此刻插手
      expect(el.scrollTop).toBe(during);

      // 动画照常收尾，落在目标位置
      vi.advanceTimersByTime(400);
      expect(el.scrollTop).toBe(0);
    });

    it('修正幅度大于用户滚动步长时，继续向上滚不会被误判成向下滚而作废锚点', () => {
      vi.useFakeTimers();
      const { el, core } = setup();

      // 先消耗掉"首次 ResizeObserver 回调后基于 start 重新校准"的那一帧，
      // 它会把区间拉回 start=0，与本例要验证的锚点行为无关
      flushResize([]);
      vi.advanceTimersByTime(20);
      scrollTo(el, 0);
      scrollTo(el, 400);
      expect(core.getState().inViewBegin).toBe(10);

      // 向上滚进第 9 项并立起锚点
      scrollTo(el, 360);
      // 第 9 项实测 240px（比 40px 估算高 200），修正幅度 200 > 用户一次滚动的 100
      flushResize([sizeEntry('9', 240)]);
      expect(el.scrollTop).toBe(560);

      // 让 _applyingAnchor 窗口正常关闭，回到"用户滚动"的判定语境
      vi.advanceTimersByTime(20);

      // 用户继续向上滚 100px。此时 scrollTop(460) 仍大于修正前的偏移(360)，
      // 若内部偏移没跟着修正一起同步，这一步会被判成向下滚而清掉锚点
      scrollTo(el, 460);

      // 锚点仍在：第 9 项再变高，视口继续跟着复原
      flushResize([sizeEntry('9', 340)]);
      expect(el.scrollTop).toBe(660);
    });

    it('addedList2Top 后新项实测变高，原内容仍停在原处', () => {
      const list = makeList(50);
      const el = makeScrollEl();
      const core = new VirtListCore(baseOptions(list));
      core.bindDOM(el);
      core.slotSize.clientSize = 200;
      scrollTo(el, 400);

      // 头部插入 2 项（估算各 40）
      const added = [
        { id: 'new-0', text: 'new-0' },
        { id: 'new-1', text: 'new-1' },
      ];
      list.unshift(...added);
      core.addedList2Top(added);
      expect(el.scrollTop).toBe(480);

      const anchorIndex = core.getState().inViewBegin;
      const before = screenPos(core, el, anchorIndex);

      // 新项实际比估算各高 10
      flushResize([sizeEntry('new-0', 50), sizeEntry('new-1', 50)]);

      expect(screenPos(core, el, anchorIndex)).toBe(before);
      expect(el.scrollTop).toBe(500);
    });
  });

  /** 可读写 scrollTop / scrollLeft 的容器（jsdom 下两者恒为 0） */
  function createScrollEl(initial = 0, key: 'scrollTop' | 'scrollLeft' = 'scrollTop') {
    const el = document.createElement('div');
    Object.defineProperty(el, key, {
      writable: true,
      configurable: true,
      value: initial,
    });
    return el;
  }

  describe('scrollIntoView', () => {
    /**
     * 40px 估算的 50 项列表：第 index 项的 top 就是 40 * index。
     * clientSize 直接写入 slotSize（jsdom 无布局，ResizeObserver 不会自己填）。
     */
    function setup(clientSize: number, offset = 0) {
      const el = createScrollEl(offset);
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);
      core.slotSize.clientSize = clientSize;
      return { el, core };
    }

    it('上边缘被截断时向上贴到该项顶部', () => {
      // 第 5 项占 [200, 240)，视口从 220 开始——顶部被切掉 20px
      const { el, core } = setup(100, 220);
      core.scrollIntoView(5);

      expect(el.scrollTop).toBe(200);
    });

    it('下边缘被截断时向下贴到该项底部', () => {
      // 第 5 项占 [200, 240)，视口是 [170, 220)——底部被切掉 20px
      const { el, core } = setup(50, 170);
      core.scrollIntoView(5);

      // targetMax - clientSize = 240 - 50
      expect(el.scrollTop).toBe(190);
    });

    it('下边缘贴边时把 stickyHeaderSize 计入目标偏移', () => {
      // 视口 [180, 240)，吸顶区占 30px：第 5 项 [200, 240) 的底部仍被切掉
      const { el, core } = setup(60, 180);
      core.slotSize.stickyHeaderSize = 30;
      core.scrollIntoView(5);

      // targetMax - clientSize + stickyHeaderSize = 240 - 60 + 30
      expect(el.scrollTop).toBe(210);
    });

    it('目标整个被吸顶区遮住时按整项定位', () => {
      // 视口 [170, 220)，吸顶区 30px 把可见下界压到 190；第 5 项 [200,240) 起点已在其外
      const { el, core } = setup(50, 170);
      core.slotSize.stickyHeaderSize = 30;
      core.scrollIntoView(5);

      expect(el.scrollTop).toBe(200);
    });

    it('目标在视口下方之外时按整项定位', () => {
      const { el, core } = setup(100, 0);
      core.scrollIntoView(20);

      expect(el.scrollTop).toBe(800);
    });

    it('目标在视口上方之外时按整项定位', () => {
      const { el, core } = setup(100, 1000);
      core.scrollIntoView(2);

      expect(el.scrollTop).toBe(80);
    });

    it('目标已完整可见时不滚动，直接回调 onDone(false)', () => {
      // 视口 [200, 400) 完整包住第 6 项 [240, 280)
      const { el, core } = setup(200, 200);
      const onDone = vi.fn();

      core.scrollIntoView(6, { onDone });

      expect(el.scrollTop).toBe(200);
      expect(onDone).toHaveBeenCalledWith(false);
    });

    it('比视口还高的项不做贴边对齐（避免来回抖动）', () => {
      // clientSize 30 < 项高 40，fitsInViewport 为假；且该项与视口有交叠
      const { el, core } = setup(30, 210);
      core.scrollIntoView(5);

      expect(el.scrollTop).toBe(210);
    });

    it('smooth 选项会透传给底层定位', () => {
      vi.useFakeTimers();
      const { el, core } = setup(100, 0);

      core.scrollIntoView(20, { behavior: 'smooth', duration: 100 });
      // 动画尚未开始推进
      expect(el.scrollTop).toBe(0);

      vi.advanceTimersByTime(200);
      expect(el.scrollTop).toBe(800);
    });
  });

  describe('manualRender', () => {
    it('直接指定渲染区间并重算 virtualSize', () => {
      const update = vi.fn();
      const core = new VirtListCore(baseOptions(makeList(20)), { update });
      update.mockClear();

      core.manualRender(5, 8);

      const state = core.getState();
      expect(state.renderBegin).toBe(5);
      expect(state.renderEnd).toBe(8);
      expect(core.renderList.map((i) => i.id)).toEqual(['5', '6', '7', '8']);
      // renderBegin 之前 5 项 × 40px
      expect(state.virtualSize).toBe(200);
      expect(update).toHaveBeenCalled();
    });

    it('区间与上一次不连续时 virtualSize 仍然正确（全量重算而非增量）', () => {
      const core = new VirtListCore(baseOptions(makeList(20)));

      core.manualRender(10, 12);
      expect(core.getState().virtualSize).toBe(400);

      core.manualRender(2, 4);
      expect(core.getState().virtualSize).toBe(80);
    });
  });

  describe('deletedList2Top', () => {
    it('头部删除后按被删尺寸回退偏移，总尺寸同步缩小', () => {
      const list = makeList(50);
      const el = createScrollEl();
      const core = new VirtListCore(baseOptions(list));
      core.bindDOM(el);
      core.slotSize.clientSize = 200;

      // 走一次真实 scroll，让内部 _offset 跟上
      el.scrollTop = 400;
      el.dispatchEvent(new Event('scroll'));

      const deleted = list.splice(0, 2);
      core.deletedList2Top(deleted);

      expect(el.scrollTop).toBe(320);
      expect(core.getState().listTotalSize).toBe(48 * 40);
    });

    it('删除项已有实测尺寸时按实测值回退', () => {
      const list = makeList(50);
      const el = createScrollEl();
      const core = new VirtListCore(baseOptions(list));
      core.bindDOM(el);
      core.slotSize.clientSize = 200;
      core.setItemSize('0', 100);

      el.scrollTop = 400;
      el.dispatchEvent(new Event('scroll'));

      const deleted = list.splice(0, 1);
      core.deletedList2Top(deleted);

      expect(el.scrollTop).toBe(300);
    });
  });

  describe('resume', () => {
    it('把容器的滚动位置恢复到内部记录的偏移（keep-alive 场景）', () => {
      const el = createScrollEl();
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);

      el.scrollTop = 400;
      el.dispatchEvent(new Event('scroll'));

      // 模拟组件被缓存后容器重建，scrollTop 归零
      el.scrollTop = 0;
      core.resume();

      expect(el.scrollTop).toBe(400);
    });
  });

  describe('updateOptions 的 buffer 重算', () => {
    it('buffer 变更后经 forceUpdate 生效', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(50)),
        buffer: 0,
      });
      core.slotSize.clientSize = 100;
      core.forceUpdate();
      const endWithoutBuffer = core.getState().renderEnd;

      core.updateOptions({ buffer: 4 });
      core.forceUpdate();

      expect(core.getState().renderEnd).toBe(endWithoutBuffer + 4);
      expect(core.getState().renderBegin).toBe(0);
    });

    it('bufferTop / bufferBottom 各自独立生效', () => {
      const el = createScrollEl();
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);
      core.slotSize.clientSize = 100;

      core.updateOptions({ bufferTop: 3, bufferBottom: 1 });
      el.scrollTop = 400;
      el.dispatchEvent(new Event('scroll'));

      const state = core.getState();
      expect(state.inViewBegin).toBe(10);
      expect(state.renderBegin).toBe(10 - 3);
      expect(state.renderEnd).toBe(state.inViewEnd + 1);
    });

    it('renderEnd 不会越过列表末项', () => {
      const core = new VirtListCore({
        ...baseOptions(makeList(6)),
        buffer: 50,
      });
      core.forceUpdate();

      expect(core.getState().renderEnd).toBe(5);
    });
  });

  describe('bindDOM 的初始定位', () => {
    it('start 指定初始索引', () => {
      const el = createScrollEl();
      const core = new VirtListCore({
        ...baseOptions(makeList(50)),
        start: 10,
      });
      core.bindDOM(el);

      expect(el.scrollTop).toBe(400);
    });

    it('offset 指定初始偏移', () => {
      const el = createScrollEl();
      const core = new VirtListCore({
        ...baseOptions(makeList(50)),
        offset: 123,
      });
      core.bindDOM(el);

      expect(el.scrollTop).toBe(123);
    });

    it('同时给出 start 与 offset 时 start 优先', () => {
      const el = createScrollEl();
      const core = new VirtListCore({
        ...baseOptions(makeList(50)),
        start: 5,
        offset: 999,
      });
      core.bindDOM(el);

      expect(el.scrollTop).toBe(200);
    });

    it('都不给时保持在 0', () => {
      const el = createScrollEl();
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.bindDOM(el);

      expect(el.scrollTop).toBe(0);
    });
  });

  describe('inViewEnd 由 clientSize 决定（不依赖预估项高的整除关系）', () => {
    it('视口能装下 2.5 项时多渲染一位', () => {
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.slotSize.clientSize = 100;
      core.forceUpdate();

      // 40 + 40 + 40 = 120 首次超过 100，发生在 i=2，故 end = 3
      expect(core.getState().inViewEnd).toBe(3);
    });

    it('clientSize 为 0 时只渲染一项', () => {
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.forceUpdate();

      expect(core.getState().inViewEnd).toBe(1);
    });

    it('实测尺寸参与填充计算', () => {
      const core = new VirtListCore(baseOptions(makeList(50)));
      core.slotSize.clientSize = 100;
      // 前两项实测各 60，两项就填满了
      core.setItemSize('0', 60);
      core.setItemSize('1', 60);
      core.forceUpdate();

      expect(core.getState().inViewEnd).toBe(2);
    });

    it('列表短于一屏时 end 落在末项', () => {
      const core = new VirtListCore(baseOptions(makeList(3)));
      core.slotSize.clientSize = 1000;
      core.forceUpdate();

      expect(core.getState().inViewEnd).toBe(2);
    });
  });

  describe('horizontal 模式的滚动定位', () => {
    it('scrollToTop 归零 scrollLeft', () => {
      vi.useFakeTimers();
      const el = createScrollEl(300, 'scrollLeft');
      const core = new VirtListCore({
        ...baseOptions(makeList(50)),
        horizontal: true,
      });
      core.bindDOM(el);

      core.scrollToTop();
      vi.runAllTimers();

      expect(el.scrollLeft).toBe(0);
    });

    it('scrollToBottom 写到总尺寸处', () => {
      vi.useFakeTimers();
      const el = createScrollEl(0, 'scrollLeft');
      const core = new VirtListCore({
        ...baseOptions(makeList(50)),
        horizontal: true,
      });
      core.bindDOM(el);
      core.slotSize.clientSize = 200;

      core.scrollToBottom();

      expect(el.scrollLeft).toBe(
        Math.max(0, core.getTotalSize() - core.slotSize.clientSize),
      );
      vi.runAllTimers();
    });

    it('scrollToIndex 与 scrollToOffset 都走 scrollLeft', () => {
      const el = createScrollEl(0, 'scrollLeft');
      const core = new VirtListCore({
        ...baseOptions(makeList(50)),
        horizontal: true,
      });
      core.bindDOM(el);

      core.scrollToIndex(10);
      expect(el.scrollLeft).toBe(400);

      core.scrollToOffset(55);
      expect(el.scrollLeft).toBe(55);
      expect(core.getOffset()).toBe(55);
    });
  });
});
