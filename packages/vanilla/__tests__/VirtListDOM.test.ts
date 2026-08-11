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
    estimatedSize: 40,
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

function scrollTo(vl: VirtList<any>, offset: number) {
  vl.core.scrollFromUser(offset);
}

/** itemsEl 里按 DOM 顺序排列的项 key */
function renderedKeys(vl: VirtList<Item>): string[] {
  return Array.from(vl.itemsEl.children)
    .map((el) => (el as HTMLElement).dataset.id)
    .filter((id): id is string => Boolean(id));
}

describe('VirtList DOM 结构', () => {
  it('构建 client → scrollContent → list → items 的基本骨架', () => {
    const { container, vl } = mount();

    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    expect(clientEl).toBe(vl.clientEl);
    expect(clientEl.className).toBe('virt-list__client');
    // 滚动位置归 JS 掌管，容器自己不滚
    expect(clientEl.getAttribute('style')).toContain('overflow:hidden');

    // 内容流挂在位移层下，列表项挂在 itemsEl 下
    expect(vl.scrollContentEl.parentElement).toBe(clientEl);
    expect(vl.listEl.parentElement).toBe(vl.scrollContentEl);
    expect(vl.itemsEl.parentElement).toBe(vl.listEl);
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

    // 参与滚动的三段按序挂在这一层里，各自绝对定位、各自带残差 transform
    const flow = Array.from(vl.scrollContentEl.children).map(
      (el) => (el as HTMLElement).dataset.id ?? 'list',
    );
    expect(flow).toEqual(['header', 'list', 'footer']);

    // 吸顶 / 吸底是视口的直接子节点，不随内容位移
    const pinned = Array.from(vl.clientEl.children)
      .map((el) => (el as HTMLElement).dataset.id)
      .filter(Boolean);
    expect(pinned).toEqual(['stickyHeader', 'stickyFooter']);
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
    // position:sticky 的粘附由原生滚动驱动，overflow:hidden 下永不触发，
    // 所以改成相对视口的绝对定位
    expect(sh.getAttribute('style')).toContain('position: absolute');
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
    // 各段是绝对定位 + 残差 transform，自定义 style 合并在后面
    expect(header.style.position).toBe('absolute');
    expect(header.style.minHeight).toBe('20px');
    expect(footer.className).toBe('my-footer');
    expect(footer.style.color).toBe('red');
    // footer 的文档位置在整段列表之后
    expect(footer.style.transform).toContain('2000px');
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
  /**
   * 关键性质：**没有任何元素的几何尺寸随列表长度增长**。
   *
   * 滚动空间不需要实体高度来撑开，所有位移都用 transform 表达——这也正是
   * 浏览器元素高度上限（Chrome 实测 33,554,428px）不再是长列表天花板的原因。
   */
  it('listEl 高度恒为 0，不随 itemsTotalSize 增长', () => {
    const { vl } = mount();

    expect(vl.state.itemsTotalSize).toBe(2000);
    expect(vl.listEl.getAttribute('style')).toContain('height: 0');
    expect(vl.listEl.getAttribute('style')).not.toContain('min-height');
  });

  it('itemsEl 的位移是「渲染块文档位置 - offset」的残差', () => {
    const { vl } = mount();

    expect(vl.itemsEl.style.transform).toBe('translate3d(0, 0px, 0)');

    scrollTo(vl, 400);

    // 渲染块正好从第 10 项起（400/40），所以残差为 0——
    // 关键是它**不再**是 leadingSize（400）那个会随列表长度无限增长的值
    expect(vl.state.leadingSize).toBe(400);
    expect(vl.itemsEl.style.transform).toBe('translate3d(0, 0px, 0)');
  });

  it('horizontal 模式沿 X 轴位移并用 flex 布局', () => {
    const { vl } = mount({ horizontal: true });

    expect(vl.listEl.getAttribute('style')).toContain('width: 0');
    expect(vl.itemsEl.getAttribute('style')).toContain('display: flex');
  });

  it('实测尺寸回填只改账本，不改任何元素的几何高度', () => {
    const { vl } = mount();

    flushResize([sizeEntry('0', 100)]);

    expect(vl.state.itemsTotalSize).toBe(2060);
    expect(vl.listEl.getAttribute('style')).toContain('height: 0');
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
    const { vl, renderItem } = mount();
    const reusedEl = vl.listEl.querySelector('[data-id="3"]');
    renderItem.mockClear();

    scrollTo(vl, 40);

    // 1..7：只有 7 是新的
    expect(renderedKeys(vl)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(renderItem).toHaveBeenCalledTimes(1);
    expect(renderItem.mock.calls[0]![0].id).toBe('7');
    expect(vl.listEl.querySelector('[data-id="3"]')).toBe(reusedEl);
  });

  it('离开渲染区间的项被移除并取消观察', () => {
    const { vl } = mount();
    const leaving = vl.listEl.querySelector('[data-id="0"]')!;

    scrollTo(vl, 200);

    expect(vl.listEl.querySelector('[data-id="0"]')).toBeNull();
    expect(leaving.parentElement).toBeNull();
    expect(unobserved).toContain(leaving);
  });

  it('向上滚动时新项插到正确位置（DOM 顺序与数据顺序一致）', () => {
    const { vl } = mount();
    scrollTo(vl, 800);
    expect(renderedKeys(vl)).toEqual([
      '20', '21', '22', '23', '24', '25', '26',
    ]);

    scrollTo(vl, 720);

    expect(renderedKeys(vl)).toEqual([
      '18', '19', '20', '21', '22', '23', '24',
    ]);
  });

  it('virtualEl 始终排在所有列表项之前', () => {
    const { vl } = mount();
    const virtualEl = vl.listEl.firstElementChild;

    scrollTo(vl, 800);
    scrollTo(vl, 400);

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
    const { vl, renderItem } = mount();
    renderItem.mockClear();

    scrollTo(vl, 400);

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
    const { vl } = mount({ onItemMounted, onItemUnmounted });

    expect(onItemMounted).toHaveBeenCalledTimes(7);
    onItemMounted.mockClear();

    const leaving = vl.listEl.querySelector('[data-id="0"]');
    scrollTo(vl, 200);

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

    // 空状态挂在视口容器上：listEl 高度恒为 0，撑不起 height:100%
    expect(vl.clientEl.textContent).toBe('no data');
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

    expect(vl.clientEl.querySelector('p')!.textContent).toBe('empty');
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
    expect(vl.clientEl.textContent).toBe('no data');
  });

  it('未提供 renderEmpty 时空列表只是没有内容，不报错', () => {
    const { vl } = mount({}, []);

    expect(renderedKeys(vl)).toEqual([]);
    expect(vl.itemsEl.children.length).toBe(0); // 项全部移除
  });
});

describe('VirtList 数据与缓存池维护', () => {
  it('setList 替换数据源并重新渲染', () => {
    const { vl } = mount();

    vl.setList([{ id: 'x', text: 'only' }]);

    expect(renderedKeys(vl)).toEqual(['x']);
    expect(vl.state.itemsTotalSize).toBe(40);
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
    const { vl } = mount();
    scrollTo(vl, 400);

    vl.reset();

    expect(vl.state.inViewBegin).toBe(0);
    expect(vl.state.leadingSize).toBe(0);
  });

  it('setList 后头部增删的位移由 core 自动补偿', () => {
    const list = makeList(50);
    const { vl } = mount({}, list);
    scrollTo(vl, 400);

    vl.setList([{ id: 'new-0', text: 'new-0' }, ...list]);
    expect(vl.core.getOffset()).toBe(440);

    vl.setList([...list]);
    expect(vl.core.getOffset()).toBe(400);
  });
});

describe('VirtList 滚动 API 与事件透传', () => {
  it('scrollToIndex / scrollToOffset 走 core 的定位', () => {
    const { vl } = mount();

    vl.scrollToIndex(10);
    expect(vl.core.getOffset()).toBe(400);

    vl.scrollToOffset(123);
    expect(vl.core.getOffset()).toBe(123);
  });

  it('scrollIntoView 对已可见项不滚动', () => {
    const { vl } = mount();

    vl.scrollIntoView(1);

    expect(vl.core.getOffset()).toBe(0);
  });

  it('scrollToTop / scrollToBottom 到达两端', () => {
    vi.useFakeTimers();
    const { vl } = mount();

    vl.scrollToBottom();
    expect(vl.core.getOffset()).toBe(
      vl.core.getTotalSize() - vl.core.slotSize.clientSize,
    );

    vl.scrollToTop();
    vi.runAllTimers();
    expect(vl.core.getOffset()).toBe(0);
  });

  it('外部事件被原样转发', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const events = {
      offsetChange: vi.fn(),
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
        estimatedSize: 40,
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

    scrollTo(vl, 400);
    expect(events.offsetChange).toHaveBeenCalledWith(400);

    scrollTo(vl, 1800);
    expect(events.toBottom).toHaveBeenCalledWith(list[49]);

    scrollTo(vl, 0);
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
    const items = Array.from(vl.itemsEl.querySelectorAll('[data-id]'));

    vl.destroy();

    expect(container.innerHTML).toBe('');
    expect(onItemUnmounted).toHaveBeenCalledTimes(items.length);
    for (const item of items) expect(unobserved).toContain(item);
  });

  it('destroy 后滚动不再更新状态', () => {
    const { vl } = mount();
    vl.destroy();

    scrollTo(vl, 400);

    expect(vl.state.inViewBegin).toBe(0);
  });
});
