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
      expect(core.state.bufferTop).toBe(1);
      expect(core.state.bufferBottom).toBe(3);
      expect(core.props.horizontal).toBe(true);
    });

    it('uses bufferTop/bufferBottom over buffer when provided', () => {
      const core = new VirtListCore({
        ...baseOptions(),
        buffer: 10,
        bufferTop: 2,
        bufferBottom: 4,
      });
      expect(core.state.bufferTop).toBe(2);
      expect(core.state.bufferBottom).toBe(4);
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
      core.state.offset = 123;
      core.state.listTotalSize = 999;

      core.reset();

      expect(core.state.offset).toBe(0);
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
      expect(el.scrollTop).toBe(core.getTotalSize());
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
});
