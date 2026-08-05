/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtGrid, type GridRow, type VirtGridOptions } from '../src/VirtGrid';

interface Item {
  id: string;
  text: string;
}

function makeList(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    text: `item-${i}`,
  }));
}

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
  document.body.innerHTML = '';
  vi.useRealTimers();
});

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

/** 行高 40px、视口 200px 的网格 */
function mount(
  options: Partial<VirtGridOptions<Item>> = {},
  list = makeList(30),
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const renderItem = vi.fn(
    (item: Item, _rowIndex: number, listIndex: number, el: HTMLElement) => {
      el.dataset.cell = String(listIndex);
      el.textContent = item.text;
    },
  );
  const events = {
    scroll: vi.fn(),
    toTop: vi.fn(),
    toBottom: vi.fn(),
    itemResize: vi.fn(),
    update: vi.fn(),
  };

  const grid = new VirtGrid<Item>(
    container,
    {
      list,
      gridItems: 3,
      itemKey: 'id',
      itemPreSize: 40,
      renderItem: renderItem as any,
      ...options,
    } as VirtGridOptions<Item>,
    events,
  );

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize([sizeEntry('client', 200)]);

  return { container, grid, clientEl, renderItem, events };
}

/** 最近一次 update 拿到的行数据（VirtGrid 不对外暴露分组结果） */
function lastRows(events: { update: ReturnType<typeof vi.fn> }): GridRow<Item>[] {
  const calls = events.update.mock.calls;
  return calls[calls.length - 1]![0];
}

function renderedRowIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-id]'))
    .map((el) => (el as HTMLElement).dataset.id!)
    .filter((id) => /^\d+$/.test(id));
}

function scrollTo(el: HTMLElement, offset: number) {
  el.scrollTop = offset;
  el.dispatchEvent(new Event('scroll'));
}

describe('VirtGrid 分组', () => {
  it('按 gridItems 把扁平列表切成行，_id 是行首的扁平索引', () => {
    const { events } = mount({}, makeList(9));
    const rows = lastRows(events);

    expect(rows.map((r) => r._id)).toEqual([0, 3, 6]);
    expect(rows[0]!.children.map((c) => c.id)).toEqual(['0', '1', '2']);
    expect(rows[2]!.children.map((c) => c.id)).toEqual(['6', '7', '8']);
  });

  it('末行不足一整行时只放剩余项', () => {
    const { events } = mount({}, makeList(10));
    const rows = lastRows(events);

    expect(rows.length).toBe(4);
    expect(rows[3]!.children.map((c) => c.id)).toEqual(['9']);
  });

  it('gridItems 为 1 时每项独占一行', () => {
    const { events } = mount({ gridItems: 1 }, makeList(4));
    const rows = lastRows(events);

    expect(rows.map((r) => r._id)).toEqual([0, 1, 2, 3]);
  });

  it('gridItems 大于总数时只有一行', () => {
    const { events } = mount({ gridItems: 10 }, makeList(4));
    const rows = lastRows(events);

    expect(rows.length).toBe(1);
    expect(rows[0]!.children.length).toBe(4);
  });

  it('空列表得到空网格', () => {
    const { container, events } = mount({}, []);

    expect(lastRows(events)).toEqual([]);
    expect(renderedRowIds(container)).toEqual([]);
  });

  it('gridItems 非正数时不分组（守卫，不抛错）', () => {
    const { container, events } = mount({ gridItems: 0 }, makeList(10));

    expect(lastRows(events)).toEqual([]);
    expect(renderedRowIds(container)).toEqual([]);
  });
});

describe('VirtGrid 行与单元格渲染', () => {
  it('行元素以 _id 作为 data-id，只渲染视口内的行', () => {
    const { container } = mount();

    // 视口 200px / 行高 40px → 5 行 + 1 行余量 = 7 行
    expect(renderedRowIds(container)).toEqual([
      '0', '3', '6', '9', '12', '15', '18',
    ]);
  });

  it('行内为每个单元格建一个容器', () => {
    const { container } = mount();
    const firstRow = container.querySelector('[data-id="0"]')!;

    expect(firstRow.children.length).toBe(3);
    expect(firstRow.textContent).toBe('item-0item-1item-2');
  });

  it('renderItem 收到 (item, rowIndex, listIndex, el)', () => {
    const { renderItem } = mount();

    // 第二行第一个单元格：rowIndex=1，扁平索引=3
    const call = renderItem.mock.calls.find((c) => c[0].id === '3')!;
    expect(call[1]).toBe(1);
    expect(call[2]).toBe(3);
    expect(call[3]).toBeInstanceOf(HTMLElement);
  });

  it('renderItem 返回元素时用返回值作为单元格', () => {
    const { container } = mount({
      renderItem: (item: Item) => {
        const el = document.createElement('span');
        el.className = 'cell';
        el.textContent = item.text;
        return el;
      },
    });

    const firstRow = container.querySelector('[data-id="0"]')!;
    expect(firstRow.querySelectorAll('span.cell').length).toBe(3);
  });

  it('行默认是 flex 布局，并合并自定义 itemStyle', () => {
    const { container } = mount({ itemStyle: { gap: '4px' } });
    const firstRow = container.querySelector('[data-id="0"]') as HTMLElement;

    const style = firstRow.getAttribute('style')!;
    expect(style).toContain('display:flex;');
    expect(style).toContain('min-width:min-content;');
    expect(style).toContain('gap:4px;');
  });

  it('滚动后渲染出后面的行', () => {
    const { container, clientEl } = mount();

    scrollTo(clientEl, 200);

    expect(renderedRowIds(container)).toEqual([
      '15', '18', '21', '24', '27',
    ]);
  });

  it('插槽渲染函数透传给底层列表', () => {
    const { container } = mount({
      renderHeader: (el) => {
        el.textContent = 'header';
      },
      renderFooter: (el) => {
        el.textContent = 'footer';
      },
      renderStickyHeader: (el) => {
        el.textContent = 'sticky-header';
      },
      renderStickyFooter: (el) => {
        el.textContent = 'sticky-footer';
      },
    });

    expect(container.querySelector('[data-id="header"]')!.textContent).toBe(
      'header',
    );
    expect(container.querySelector('[data-id="footer"]')!.textContent).toBe(
      'footer',
    );
    expect(
      container.querySelector('[data-id="stickyHeader"]')!.textContent,
    ).toBe('sticky-header');
    expect(
      container.querySelector('[data-id="stickyFooter"]')!.textContent,
    ).toBe('sticky-footer');
  });

  it('空列表时渲染空状态', () => {
    const { container } = mount(
      {
        renderEmpty: (el) => {
          el.textContent = 'no data';
        },
      },
      [],
    );

    expect(container.textContent).toContain('no data');
  });
});

describe('VirtGrid setList', () => {
  it('替换数据后重新分组', () => {
    const { grid, events } = mount({}, makeList(9));

    grid.setList(makeList(4));

    const rows = lastRows(events);
    expect(rows.map((r) => r._id)).toEqual([0, 3]);
    expect(rows[1]!.children.length).toBe(1);
  });

  it('清空数据后没有行', () => {
    const { grid, container } = mount();

    grid.setList([]);

    expect(renderedRowIds(container)).toEqual([]);
  });
});

describe('VirtGrid setGridItems', () => {
  it('改变列数后重新分组', () => {
    const { grid, events } = mount({}, makeList(12));

    grid.setGridItems(4);

    const rows = lastRows(events);
    expect(rows.map((r) => r._id)).toEqual([0, 4, 8]);
    expect(rows[0]!.children.map((c) => c.id)).toEqual(['0', '1', '2', '3']);
  });

  it('清掉 DOM 缓存池，避免 _id 重叠时复用到过期内容', () => {
    const { grid, container } = mount({}, makeList(12));
    // gridItems=3 时 _id=0 的行装 0,1,2
    expect(container.querySelector('[data-id="0"]')!.textContent).toBe(
      'item-0item-1item-2',
    );

    grid.setGridItems(4);

    // gridItems=4 后 _id=0 的行必须重建成 0,1,2,3
    expect(container.querySelector('[data-id="0"]')!.textContent).toBe(
      'item-0item-1item-2item-3',
    );
  });

  it('按旧列数换算行索引，下一帧尽量保持视口位置', () => {
    vi.useFakeTimers();
    const { grid, clientEl } = mount({}, makeList(120));

    // 滚到第 5 行（旧列数 3 → 扁平第 15 项附近）
    scrollTo(clientEl, 200);
    expect(clientEl.scrollTop).toBe(200);

    grid.setGridItems(2);
    vi.advanceTimersByTime(16);

    // targetRowIndex = floor(5 * 3 / 2) = 7 → 7 * 40
    expect(clientEl.scrollTop).toBe(280);
  });

  it('非正数列数被忽略', () => {
    const { grid, events } = mount({}, makeList(9));
    const before = lastRows(events).map((r) => r._id);

    grid.setGridItems(0);
    grid.setGridItems(-1);

    expect(lastRows(events).map((r) => r._id)).toEqual(before);
  });
});

describe('VirtGrid 滚动 API（扁平索引 → 行索引换算）', () => {
  it('scrollToIndex 把扁平索引换算成行', () => {
    const { grid, clientEl } = mount({}, makeList(120));

    // floor(15 / 3) = 5 行 → 5 * 40
    grid.scrollToIndex(15);
    expect(clientEl.scrollTop).toBe(200);

    // 同一行内的任意扁平索引都落到同一处
    grid.scrollToIndex(17);
    expect(clientEl.scrollTop).toBe(200);
  });

  it('scrollIntoView 同样按行换算', () => {
    const { grid, clientEl } = mount({}, makeList(120));

    grid.scrollIntoView(60);

    // 第 20 行完全在视口之外，按整行定位
    expect(clientEl.scrollTop).toBe(800);
  });

  it('scrollToOffset 直接透传偏移', () => {
    const { grid, clientEl } = mount({}, makeList(120));

    grid.scrollToOffset(123);

    expect(clientEl.scrollTop).toBe(123);
  });

  it('scrollToTop / scrollToBottom 到达两端', () => {
    vi.useFakeTimers();
    const { grid, clientEl } = mount({}, makeList(120));

    grid.scrollToBottom();
    expect(clientEl.scrollTop).toBeGreaterThan(0);

    grid.scrollToTop();
    vi.runAllTimers();
    expect(clientEl.scrollTop).toBe(0);
  });

  it('smooth 滚动可被 cancelScroll 中断', () => {
    vi.useFakeTimers();
    const { grid, clientEl } = mount({}, makeList(120));
    const onDone = vi.fn();

    grid.scrollToIndex(90, { behavior: 'smooth', duration: 200, onDone });
    vi.advanceTimersByTime(32);
    grid.cancelScroll();
    const stopped = clientEl.scrollTop;

    vi.advanceTimersByTime(200);

    expect(onDone).toHaveBeenCalledWith(true);
    expect(clientEl.scrollTop).toBe(stopped);
  });
});

describe('VirtGrid forceUpdate / destroy / 事件', () => {
  it('forceUpdate 重建行并刷新已渲染内容', () => {
    const list = makeList(12);
    const { grid, container } = mount({}, list);

    list[0]!.text = 'changed';
    grid.forceUpdate();

    expect(container.querySelector('[data-id="0"]')!.textContent).toContain(
      'changed',
    );
  });

  it('事件按行数据透传', () => {
    const list = makeList(30);
    const { clientEl, events } = mount({}, list);

    scrollTo(clientEl, 100);
    expect(events.scroll).toHaveBeenCalled();

    // 10 行 × 40 = 400，视口 200 → 到底偏移 200
    scrollTo(clientEl, 200);
    expect(events.toBottom).toHaveBeenCalled();
    expect(events.toBottom.mock.calls[0]![0]._id).toBe(27);

    scrollTo(clientEl, 0);
    expect(events.toTop).toHaveBeenCalled();
    expect(events.toTop.mock.calls[0]![0]._id).toBe(0);

    flushResize([sizeEntry('0', 88)]);
    expect(events.itemResize).toHaveBeenCalledWith('0', 88);
  });

  it('destroy 清空容器', () => {
    const { grid, container } = mount();

    grid.destroy();

    expect(container.innerHTML).toBe('');
  });
});
