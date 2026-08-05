/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';
import type { VirtListDOMOptions } from '@virt-list/core';

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
let observed: Element[] = [];
let unobserved: Element[] = [];

beforeEach(() => {
  roCallback = null;
  observed = [];
  unobserved = [];
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

/** 挂载一个 40px 估算、视口 200px 的列表，滚动容器的 scrollTop 可读写 */
function mount(
  options: Partial<VirtListDOMOptions<Item>> = {},
  list = makeList(50),
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const renderItem = vi.fn((item: Item, _index: number, el: HTMLElement) => {
    el.textContent = item.text;
  });

  const vl = new VirtList<Item>(container, {
    list,
    itemKey: 'id',
    itemPreSize: 40,
    renderItem: renderItem as any,
    ...options,
  } as VirtListDOMOptions<Item>);

  const clientEl = vl.clientEl;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  Object.defineProperty(clientEl, 'scrollLeft', {
    writable: true,
    configurable: true,
    value: 0,
  });
  // jsdom 没有布局，视口尺寸只能由观察器上报
  flushResize([sizeEntry('client', 200)]);

  return { container, vl, clientEl, renderItem };
}

function scrollTo(el: HTMLElement, offset: number) {
  el.scrollTop = offset;
  el.dispatchEvent(new Event('scroll'));
}

/** listEl 里按 DOM 顺序排列的项 key（virtualEl 没有 data-id，自然被排除） */
function renderedKeys(vl: VirtList<Item>): string[] {
  return Array.from(vl.listEl.children)
    .map((el) => (el as HTMLElement).dataset.id)
    .filter((id): id is string => Boolean(id));
}

describe('VirtList DOM 结构', () => {
  it('构建 client → list → virtual 的基本骨架', () => {
    const { container, vl } = mount();

    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    expect(clientEl).toBe(vl.clientEl);
    expect(clientEl.className).toBe('virt-list__client');
    expect(clientEl.getAttribute('style')).toContain('overflow:auto');

    // listEl 是 clientEl 的子节点，virtualEl 是 listEl 的第一个子节点
    expect(vl.listEl.parentElement).toBe(clientEl);
    expect(vl.listEl.firstElementChild).toBeTruthy();
  });

  it('插槽按 stickyHeader → header → list → footer → stickyFooter 排列', () => {
    const { vl } = mount({
      renderStickyHeader: (el) => {
        el.textContent = 'sticky-header';
      },
      renderHeader: (el) => {
        el.textContent = 'header';
      },
      renderFooter: (el) => {
        el.textContent = 'footer';
      },
      renderStickyFooter: (el) => {
        el.textContent = 'sticky-footer';
      },
    });

    const ids = Array.from(vl.clientEl.children).map(
      (el) => (el as HTMLElement).dataset.id ?? 'list',
    );
    expect(ids).toEqual([
      'stickyHeader',
      'header',
      'list',
      'footer',
      'stickyFooter',
    ]);
  });

  it('插槽渲染函数返回元素时自动挂载', () => {
    const { vl } = mount({
      renderHeader: () => {
        const el = document.createElement('h1');
        el.textContent = 'returned-header';
        return el;
      },
    });

    const header = vl.clientEl.querySelector('[data-id="header"]')!;
    expect(header.querySelector('h1')!.textContent).toBe('returned-header');
  });

  it('sticky 插槽带上定位样式，并接受自定义 class / style', () => {
    const { vl } = mount({
      renderStickyHeader: () => {},
      renderStickyFooter: () => {},
      stickyHeaderClass: 'my-sticky-header',
      stickyHeaderStyle: 'background:red;',
      stickyFooterClass: ['my-sticky-footer'],
    });

    const sh = vl.clientEl.querySelector('[data-id="stickyHeader"]') as HTMLElement;
    const sf = vl.clientEl.querySelector('[data-id="stickyFooter"]') as HTMLElement;

    expect(sh.className).toBe('my-sticky-header');
    expect(sh.getAttribute('style')).toContain('position: sticky');
    expect(sh.getAttribute('style')).toContain('top: 0');
    expect(sh.getAttribute('style')).toContain('background:red;');
    expect(sf.className).toBe('my-sticky-footer');
    expect(sf.getAttribute('style')).toContain('bottom: 0');
  });

  it('horizontal 模式下 sticky 改用左右定位', () => {
    const { vl } = mount({
      horizontal: true,
      renderStickyHeader: () => {},
      renderStickyFooter: () => {},
    });

    const sh = vl.clientEl.querySelector('[data-id="stickyHeader"]') as HTMLElement;
    const sf = vl.clientEl.querySelector('[data-id="stickyFooter"]') as HTMLElement;

    expect(sh.getAttribute('style')).toContain('left: 0');
    expect(sf.getAttribute('style')).toContain('right: 0');
  });

  it('header / footer 应用自定义 class 与 style', () => {
    const { vl } = mount({
      renderHeader: () => {},
      renderFooter: () => {},
      headerClass: { 'my-header': true },
      headerStyle: { minHeight: '20px' },
      footerClass: 'my-footer',
      footerStyle: 'color:red;',
    });

    const header = vl.clientEl.querySelector('[data-id="header"]') as HTMLElement;
    const footer = vl.clientEl.querySelector('[data-id="footer"]') as HTMLElement;

    expect(header.className).toBe('my-header');
    expect(header.getAttribute('style')).toBe('min-height:20px;');
    expect(footer.className).toBe('my-footer');
    expect(footer.getAttribute('style')).toBe('color:red;');
  });

  it('listClass / listStyle 作用在列表容器上', () => {
    const { vl } = mount({
      listClass: 'my-list',
      listStyle: { paddingLeft: '8px' },
    });

    expect(vl.listEl.className).toBe('my-list');
    expect(vl.listEl.getAttribute('style')).toContain('padding-left:8px;');
  });

  it('插槽元素被交给观察器（尺寸变化要反映到滚动计算里）', () => {
    const { vl } = mount({
      renderHeader: () => {},
      renderFooter: () => {},
      renderStickyHeader: () => {},
      renderStickyFooter: () => {},
    });

    for (const id of ['header', 'footer', 'stickyHeader', 'stickyFooter']) {
      expect(observed).toContain(
        vl.clientEl.querySelector(`[data-id="${id}"]`),
      );
    }
  });
});

describe('VirtList 尺寸样式', () => {
  it('listEl 的 min-height 跟随 listTotalSize', () => {
    const { vl } = mount();

    expect(vl.listEl.getAttribute('style')).toContain('min-height: 2000px');
    expect(vl.listEl.getAttribute('style')).toContain('will-change: height');
  });

  it('virtualEl 的高度跟随 virtualSize（把渲染项推到正确位置）', () => {
    const { vl, clientEl } = mount();
    const virtualEl = vl.listEl.firstElementChild as HTMLElement;

    expect(virtualEl.getAttribute('style')).toContain('height: 0px');

    scrollTo(clientEl, 400);

    expect(vl.state.virtualSize).toBe(400);
    expect(virtualEl.getAttribute('style')).toContain('height: 400px');
  });

  it('horizontal 模式改用 min-width / width 与 flex 布局', () => {
    const { vl } = mount({ horizontal: true });
    const virtualEl = vl.listEl.firstElementChild as HTMLElement;

    expect(vl.listEl.getAttribute('style')).toContain('min-width: 2000px');
    expect(vl.listEl.getAttribute('style')).toContain('display: flex');
    expect(virtualEl.getAttribute('style')).toContain('width: 0px');
  });

  it('实测尺寸回填后 min-height 同步变大', () => {
    const { vl } = mount();

    flushResize([sizeEntry('0', 100)]);

    expect(vl.listEl.getAttribute('style')).toContain('min-height: 2060px');
  });
});

describe('VirtList 列表项增量 patch', () => {
  it('初次渲染出一屏项，并写上 data-id', () => {
    const { vl, renderItem } = mount();

    // 200px 视口装 5 项，多一个渲染余量 → 0..6
    expect(renderedKeys(vl)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(renderItem).toHaveBeenCalledTimes(7);
  });

  it('渲染项被交给观察器（用于实测高度）', () => {
    const { vl } = mount();

    const first = vl.listEl.querySelector('[data-id="0"]');
    expect(observed).toContain(first);
  });

  it('滚动后只为新进入的项调用 renderItem，已有项复用 DOM', () => {
    const { vl, clientEl, renderItem } = mount();
    const reusedEl = vl.listEl.querySelector('[data-id="3"]');
    renderItem.mockClear();

    scrollTo(clientEl, 40);

    // 1..7：只有 7 是新的
    expect(renderedKeys(vl)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(renderItem).toHaveBeenCalledTimes(1);
    expect(renderItem.mock.calls[0]![0].id).toBe('7');
    expect(vl.listEl.querySelector('[data-id="3"]')).toBe(reusedEl);
  });

  it('离开渲染区间的项被移除并取消观察', () => {
    const { vl, clientEl } = mount();
    const leaving = vl.listEl.querySelector('[data-id="0"]')!;

    scrollTo(clientEl, 200);

    expect(vl.listEl.querySelector('[data-id="0"]')).toBeNull();
    expect(leaving.parentElement).toBeNull();
    expect(unobserved).toContain(leaving);
  });

  it('向上滚动时新项插到正确位置（DOM 顺序与数据顺序一致）', () => {
    const { vl, clientEl } = mount();
    scrollTo(clientEl, 800);
    expect(renderedKeys(vl)).toEqual([
      '20', '21', '22', '23', '24', '25', '26',
    ]);

    scrollTo(clientEl, 720);

    expect(renderedKeys(vl)).toEqual([
      '18', '19', '20', '21', '22', '23', '24',
    ]);
  });

  it('virtualEl 始终排在所有列表项之前', () => {
    const { vl, clientEl } = mount();
    const virtualEl = vl.listEl.firstElementChild;

    scrollTo(clientEl, 800);
    scrollTo(clientEl, 400);

    expect(vl.listEl.firstElementChild).toBe(virtualEl);
  });

  it('renderItem 返回元素时挂到项容器内', () => {
    const { vl } = mount({
      renderItem: (item: Item) => {
        const el = document.createElement('span');
        el.className = 'cell';
        el.textContent = item.text;
        return el;
      },
    });

    const first = vl.listEl.querySelector('[data-id="0"]')!;
    expect(first.querySelector('span.cell')!.textContent).toBe('item-0');
  });

  it('renderItem 直接写入传入的 el 时不产生额外嵌套', () => {
    const { vl } = mount();

    const first = vl.listEl.querySelector('[data-id="0"]')!;
    expect(first.children.length).toBe(0);
    expect(first.textContent).toBe('item-0');
  });

  it('renderItem 收到的索引是列表中的真实下标', () => {
    const { clientEl, renderItem } = mount();
    renderItem.mockClear();

    scrollTo(clientEl, 400);

    const indexes = renderItem.mock.calls.map((c) => c[1]);
    const items = renderItem.mock.calls.map((c) => c[0].id);
    expect(indexes).toEqual(items.map(Number));
  });

  it('itemGap 转成项的上下 padding', () => {
    const { vl } = mount({ itemGap: 10 });

    const first = vl.listEl.querySelector('[data-id="0"]') as HTMLElement;
    expect(first.getAttribute('style')).toContain('padding: 5px 0;');
  });

  it('itemStyle / itemClass 支持静态值', () => {
    const { vl } = mount({
      itemStyle: { color: 'red' },
      itemClass: ['row', { active: true }],
    });

    const first = vl.listEl.querySelector('[data-id="0"]') as HTMLElement;
    expect(first.getAttribute('style')).toContain('color:red;');
    expect(first.className).toBe('row active');
  });

  it('itemStyle / itemClass 支持函数形式，并收到 (item, index)', () => {
    const itemStyle = vi.fn((_item: Item, index: number) => `top:${index}px;`);
    const itemClass = vi.fn(
      (item: Item, _index: number) => `row-${item.id}`,
    );
    const { vl } = mount({ itemStyle: itemStyle as any, itemClass: itemClass as any });

    const second = vl.listEl.querySelector('[data-id="1"]') as HTMLElement;
    expect(second.getAttribute('style')).toBe('top:1px;');
    expect(second.className).toBe('row-1');
    expect(itemStyle.mock.calls[1]).toEqual([{ id: '1', text: 'item-1' }, 1]);
    expect(itemClass.mock.calls[1]![1]).toBe(1);
  });

  it('onItemMounted / onItemUnmounted 在项进出时回调', () => {
    const onItemMounted = vi.fn();
    const onItemUnmounted = vi.fn();
    const { vl, clientEl } = mount({ onItemMounted, onItemUnmounted });

    expect(onItemMounted).toHaveBeenCalledTimes(7);
    onItemMounted.mockClear();

    const leaving = vl.listEl.querySelector('[data-id="0"]');
    scrollTo(clientEl, 200);

    expect(onItemMounted.mock.calls.length).toBeGreaterThan(0);
    expect(onItemUnmounted).toHaveBeenCalledWith(leaving);
  });
});

describe('VirtList 空状态', () => {
  it('列表为空时渲染空状态', () => {
    const { vl } = mount(
      {
        renderEmpty: (el) => {
          el.textContent = 'no data';
        },
      },
      [],
    );

    expect(vl.listEl.textContent).toBe('no data');
    expect(renderedKeys(vl)).toEqual([]);
  });

  it('renderEmpty 返回元素时挂到占位容器内', () => {
    const { vl } = mount(
      {
        renderEmpty: () => {
          const el = document.createElement('p');
          el.textContent = 'empty';
          return el;
        },
      },
      [],
    );

    expect(vl.listEl.querySelector('p')!.textContent).toBe('empty');
  });

  it('数据回来后空状态被移除', () => {
    const { vl } = mount(
      {
        renderEmpty: (el) => {
          el.textContent = 'no data';
        },
      },
      [],
    );

    vl.setList(makeList(10));

    expect(vl.listEl.textContent).not.toContain('no data');
    expect(renderedKeys(vl).length).toBeGreaterThan(0);
  });

  it('列表被清空时移除所有项并显示空状态', () => {
    const { vl } = mount({
      renderEmpty: (el) => {
        el.textContent = 'no data';
      },
    });
    expect(renderedKeys(vl).length).toBe(7);

    vl.setList([]);

    expect(renderedKeys(vl)).toEqual([]);
    expect(vl.listEl.textContent).toBe('no data');
  });

  it('未提供 renderEmpty 时空列表只是没有内容，不报错', () => {
    const { vl } = mount({}, []);

    expect(renderedKeys(vl)).toEqual([]);
    expect(vl.listEl.children.length).toBe(1); // 只剩 virtualEl
  });
});

describe('VirtList 数据与缓存池维护', () => {
  it('setList 替换数据源并重新渲染', () => {
    const { vl } = mount();

    vl.setList([{ id: 'x', text: 'only' }]);

    expect(renderedKeys(vl)).toEqual(['x']);
    expect(vl.state.listTotalSize).toBe(40);
  });

  it('clearItemPool 移除所有已渲染项并取消观察', () => {
    const { vl } = mount();
    const first = vl.listEl.querySelector('[data-id="0"]');

    vl.clearItemPool();

    expect(renderedKeys(vl)).toEqual([]);
    expect(unobserved).toContain(first);
  });

  it('forceUpdate 先清池再重建（同 key 数据变了也能刷新）', () => {
    const list = makeList(50);
    const { vl, renderItem } = mount({}, list);
    renderItem.mockClear();

    list[0]!.text = 'changed';
    vl.forceUpdate();

    expect(renderItem).toHaveBeenCalled();
    expect(vl.listEl.querySelector('[data-id="0"]')!.textContent).toBe('changed');
  });

  it('updateOptions 同时更新 DOM 层选项与 core 选项', () => {
    const { vl } = mount();

    vl.updateOptions({ buffer: 3 });
    vl.forceUpdate();

    expect(vl.core.props.buffer).toBe(3);
    expect(renderedKeys(vl).length).toBe(10);
  });

  it('reset 清零状态', () => {
    const { vl, clientEl } = mount();
    scrollTo(clientEl, 400);

    vl.reset();

    expect(vl.state.inViewBegin).toBe(0);
    expect(vl.state.virtualSize).toBe(0);
  });

  it('addedList2Top / deletedList2Top 透传到 core 并修正偏移', () => {
    const list = makeList(50);
    const { vl, clientEl } = mount({}, list);
    scrollTo(clientEl, 400);

    const added = [{ id: 'new-0', text: 'new-0' }];
    list.unshift(...added);
    vl.addedList2Top(added);
    expect(clientEl.scrollTop).toBe(440);

    // 浏览器写 scrollTop 后会异步派发 scroll，内部偏移随之同步
    clientEl.dispatchEvent(new Event('scroll'));

    const deleted = list.splice(0, 1);
    vl.deletedList2Top(deleted);
    expect(clientEl.scrollTop).toBe(400);
  });
});

describe('VirtList 滚动 API 与事件透传', () => {
  it('scrollToIndex / scrollToOffset 走 core 的定位', () => {
    const { vl, clientEl } = mount();

    vl.scrollToIndex(10);
    expect(clientEl.scrollTop).toBe(400);

    vl.scrollToOffset(123);
    expect(clientEl.scrollTop).toBe(123);
  });

  it('scrollIntoView 对已可见项不滚动', () => {
    const { vl, clientEl } = mount();

    vl.scrollIntoView(1);

    expect(clientEl.scrollTop).toBe(0);
  });

  it('scrollToTop / scrollToBottom 到达两端', () => {
    vi.useFakeTimers();
    const { vl, clientEl } = mount();

    vl.scrollToBottom();
    expect(clientEl.scrollTop).toBe(
      vl.core.getTotalSize() - vl.core.slotSize.clientSize,
    );

    vl.scrollToTop();
    vi.runAllTimers();
    expect(clientEl.scrollTop).toBe(0);
  });

  it('外部事件被原样转发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const events = {
      scroll: vi.fn(),
      toTop: vi.fn(),
      toBottom: vi.fn(),
      itemResize: vi.fn(),
      update: vi.fn(),
    };
    const list = makeList(50);
    const vl = new VirtList<Item>(
      container,
      {
        list,
        itemKey: 'id',
        itemPreSize: 40,
        renderItem: (item, _i, el) => {
          el.textContent = item.text;
        },
      },
      events,
    );
    Object.defineProperty(vl.clientEl, 'scrollTop', {
      writable: true,
      configurable: true,
      value: 0,
    });
    flushResize([sizeEntry('client', 200)]);

    expect(events.update).toHaveBeenCalled();

    scrollTo(vl.clientEl, 400);
    expect(events.scroll).toHaveBeenCalled();

    scrollTo(vl.clientEl, 1800);
    expect(events.toBottom).toHaveBeenCalledWith(list[49]);

    scrollTo(vl.clientEl, 0);
    expect(events.toTop).toHaveBeenCalledWith(list[0]);

    flushResize([sizeEntry('0', 88)]);
    expect(events.itemResize).toHaveBeenCalledWith('0', 88);
  });
});

describe('VirtList destroy', () => {
  it('清空容器、取消所有观察并回调 onItemUnmounted', () => {
    const onItemUnmounted = vi.fn();
    const { container, vl } = mount({
      onItemUnmounted,
      renderHeader: () => {},
      renderFooter: () => {},
      renderStickyHeader: () => {},
      renderStickyFooter: () => {},
    });
    const items = Array.from(vl.listEl.querySelectorAll('[data-id]'));

    vl.destroy();

    expect(container.innerHTML).toBe('');
    expect(onItemUnmounted).toHaveBeenCalledTimes(items.length);
    for (const item of items) expect(unobserved).toContain(item);
  });

  it('destroy 后滚动不再更新状态', () => {
    const { vl, clientEl } = mount();
    vl.destroy();

    scrollTo(clientEl, 400);

    expect(vl.state.inViewBegin).toBe(0);
  });
});
