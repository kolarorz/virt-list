import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type Ref,
} from 'vue';
import { VirtList } from '../src/index';

interface ListItem {
  id: string;
  text: string;
}

function makeList(length: number): ListItem[] {
  return Array.from({ length }, (_, i) => ({
    id: String(i),
    text: `item-${i}`,
  }));
}

function getRenderedItemIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('div[data-id]'))
    .map((el) => el.getAttribute('data-id') || '')
    .filter((id) => /^\d+$/.test(id));
}

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function mountVirtList() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const listRef: Ref<any> = ref(null);
  const list = makeList(320);
  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(
            VirtList as any,
            {
              ref: listRef,
              list,
              itemKey: 'id',
              itemPreSize: 20,
              fixed: true,
              buffer: 3,
            },
            {
              default: ({ index }: { index: number }) =>
                h('div', null, `item-${index}`),
            },
          );
      },
    }),
  );

  app.mount(container);
  return { app, container, listRef };
}

describe('Vue VirtList', () => {
  it('scrollToIndex updates rendered range without blank container', async () => {
    const { app, container, listRef } = mountVirtList();
    await nextTick();

    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    expect(clientEl).toBeTruthy();

    listRef.value?.scrollToIndex(140);
    clientEl.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);
    expect(container.textContent).toContain('item-140');

    app.unmount();
  });

  it('scrollToTop/scrollToBottom and rapid scroll keep non-empty rendered items', async () => {
    vi.useFakeTimers();
    const { app, container, listRef } = mountVirtList();
    await nextTick();

    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    expect(clientEl).toBeTruthy();

    listRef.value?.scrollToBottom();
    vi.runAllTimers();
    clientEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);

    for (const offset of [120, 880, 1560, 2400, 3000]) {
      clientEl.scrollTop = offset;
      clientEl.dispatchEvent(new Event('scroll'));
    }
    await nextTick();
    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);

    listRef.value?.scrollToTop();
    vi.runAllTimers();
    clientEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);
    expect(container.textContent).toContain('item-0');

    app.unmount();
  });
});

describe('Vue VirtList 渲染与 API', () => {
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

  function flushResize(id: string, size: number) {
    const target = document.createElement('div');
    target.dataset.id = id;
    roCallback?.(
      [
        {
          target,
          borderBoxSize: [{ blockSize: size, inlineSize: size }],
          contentRect: { height: size, width: size },
        } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );
  }

  /** 40px 估算、视口 200px、buffer 0 的列表 */
  function mount(props: Record<string, unknown> = {}, slots?: any) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const listRef: Ref<any> = ref(null);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(
              VirtList as any,
              {
                ref: listRef,
                list: makeList(50),
                itemKey: 'id',
                itemPreSize: 40,
                buffer: 0,
                ...props,
              },
              slots ?? {
                default: ({ itemData }: { itemData: ListItem }) =>
                  h('div', null, itemData.text),
              },
            );
        },
      }),
    );
    app.mount(container);

    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    Object.defineProperty(clientEl, 'scrollTop', {
      writable: true,
      configurable: true,
      value: 0,
    });
    flushResize('client', 200);

    return { app, container, listRef, clientEl };
  }

  it('构建出滚动容器并渲染一屏项', () => {
    const { app, container } = mount();

    expect(container.querySelector('[data-id="client"]')).toBeTruthy();
    expect(getRenderedItemIds(container)).toEqual([
      '0', '1', '2', '3', '4', '5', '6',
    ]);
    expect(container.textContent).toContain('item-0');

    app.unmount();
  });

  it('default 插槽拿到 itemData 与 index', () => {
    const { app, container } = mount({}, {
      default: ({ itemData, index }: any) =>
        h('div', null, `${index}:${itemData.id}`),
    });

    expect(container.textContent).toContain('0:0');
    expect(container.textContent).toContain('3:3');

    app.unmount();
  });

  it('header / footer / stickyHeader / stickyFooter 插槽', () => {
    const { app, container } = mount({}, {
      default: () => h('div', null, 'x'),
      header: () => h('div', null, 'H'),
      footer: () => h('div', null, 'F'),
      stickyHeader: () => h('div', null, 'SH'),
      stickyFooter: () => h('div', null, 'SF'),
    });

    expect(container.querySelector('[data-id="header"]')!.textContent).toBe('H');
    expect(container.querySelector('[data-id="footer"]')!.textContent).toBe('F');
    expect(
      container.querySelector('[data-id="stickyHeader"]')!.textContent,
    ).toBe('SH');
    expect(
      container.querySelector('[data-id="stickyFooter"]')!.textContent,
    ).toBe('SF');

    app.unmount();
  });

  it('空列表渲染 empty 插槽', () => {
    const { app, container } = mount({ list: [] }, {
      default: () => h('div', null, 'x'),
      empty: () => h('div', null, 'nothing here'),
    });

    expect(container.textContent).toContain('nothing here');

    app.unmount();
  });

  it('renderItem prop 走 DOM 语义（返回元素或直接写 el）', () => {
    const { app, container } = mount({
      renderItem: (item: ListItem, _index: number, el: HTMLElement) => {
        el.textContent = `dom-${item.id}`;
      },
    });

    expect(container.textContent).toContain('dom-0');

    app.unmount();
  });

  it('itemClass / itemStyle 的函数形式作用到每一项', () => {
    const { app, container } = mount({
      itemClass: (item: ListItem) => `row-${item.id}`,
      itemStyle: (_item: ListItem, index: number) => `top:${index}px;`,
    });

    const second = container.querySelector('[data-id="1"]') as HTMLElement;
    expect(second.className).toContain('row-1');
    expect(second.getAttribute('style')).toContain('top:1px;');

    app.unmount();
  });

  it('list 长度变化后同步到底层列表', async () => {
    const list = ref(makeList(50));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const listRef: Ref<any> = ref(null);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(
              VirtList as any,
              {
                ref: listRef,
                list: list.value,
                itemKey: 'id',
                itemPreSize: 40,
              },
              { default: ({ itemData }: any) => h('div', null, itemData.text) },
            );
        },
      }),
    );
    app.mount(container);
    flushResize('client', 200);

    list.value = makeList(3);
    await nextTick();

    expect(listRef.value.getState().listTotalSize).toBe(120);
    expect(getRenderedItemIds(container)).toEqual(['0', '1', '2']);

    app.unmount();
  });

  it('暴露状态查询 API', () => {
    const { app, listRef } = mount();

    expect(listRef.value.getState().renderEnd).toBe(6);
    expect(listRef.value.getOffset()).toBe(0);
    expect(listRef.value.getSlotSize()).toBe(0);
    expect(listRef.value.getItemSize('0')).toBe(40);
    expect(listRef.value.getItemPosByIndex(2)).toEqual({
      top: 80,
      current: 40,
      bottom: 120,
    });

    app.unmount();
  });

  it('暴露滚动 API', () => {
    vi.useFakeTimers();
    const { app, listRef, clientEl } = mount();

    listRef.value.scrollToIndex(10);
    expect(clientEl.scrollTop).toBe(400);

    listRef.value.scrollToOffset(55);
    expect(clientEl.scrollTop).toBe(55);

    listRef.value.scrollIntoView(0);
    expect(clientEl.scrollTop).toBe(0);

    listRef.value.scrollToBottom();
    // scrollToBottom 停在浏览器允许的可滚动上限（总高 - 可视高度），
    // 而不是把总高原样写进 scrollTop —— 后者在真实浏览器里会被裁掉
    expect(clientEl.scrollTop).toBe(2000 - 200);
    vi.runAllTimers();

    app.unmount();
  });

  it('smooth 滚动可被 cancelScroll 打断', () => {
    vi.useFakeTimers();
    const { app, listRef, clientEl } = mount();

    listRef.value.scrollToIndex(40, { behavior: 'smooth', duration: 200 });
    vi.advanceTimersByTime(32);
    listRef.value.cancelScroll();
    const stopped = clientEl.scrollTop;
    vi.advanceTimersByTime(300);

    expect(clientEl.scrollTop).toBe(stopped);

    app.unmount();
  });

  it('暴露 reset / manualRender / deleteItemSize / forceUpdate', () => {
    const { app, listRef, clientEl } = mount();

    listRef.value.manualRender(5, 8);
    expect(listRef.value.getState().renderBegin).toBe(5);

    clientEl.scrollTop = 400;
    clientEl.dispatchEvent(new Event('scroll'));
    listRef.value.reset();
    expect(listRef.value.getState().inViewBegin).toBe(0);

    listRef.value.deleteItemSize('0');
    expect(listRef.value.getItemSize('0')).toBe(40);

    expect(() => listRef.value.forceUpdate()).not.toThrow();

    app.unmount();
  });

  it('暴露 setList 与头部增删', () => {
    const list = makeList(50);
    const { app, listRef, clientEl } = mount({ list });

    clientEl.scrollTop = 400;
    clientEl.dispatchEvent(new Event('scroll'));

    const added = [{ id: 'new-0', text: 'new-0' }];
    list.unshift(...added);
    listRef.value.addedList2Top(added);
    expect(clientEl.scrollTop).toBe(440);
    clientEl.dispatchEvent(new Event('scroll'));

    const deleted = list.splice(0, 1);
    listRef.value.deletedList2Top(deleted);
    expect(clientEl.scrollTop).toBe(400);

    listRef.value.setList(makeList(2));
    expect(listRef.value.getState().listTotalSize).toBe(80);

    app.unmount();
  });

  it('事件被 emit：scroll / toTop / toBottom / update / itemResize', () => {
    const onScroll = vi.fn();
    const onToTop = vi.fn();
    const onToBottom = vi.fn();
    const onUpdate = vi.fn();
    const onItemResize = vi.fn();
    const { app, clientEl } = mount({
      onScroll,
      onToTop,
      onToBottom,
      onUpdate,
      onItemResize,
    });

    expect(onUpdate).toHaveBeenCalled();

    clientEl.scrollTop = 400;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(onScroll).toHaveBeenCalled();

    clientEl.scrollTop = 1800;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(onToBottom).toHaveBeenCalled();

    clientEl.scrollTop = 0;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(onToTop).toHaveBeenCalled();

    flushResize('0', 90);
    expect(onItemResize).toHaveBeenCalledWith('0', 90);

    app.unmount();
  });

  it('horizontal 模式走横向布局', () => {
    const { app, container, listRef, clientEl } = mount({ horizontal: true });
    Object.defineProperty(clientEl, 'scrollLeft', {
      writable: true,
      configurable: true,
      value: 0,
    });

    const listEl = container.querySelector('[data-id="client"]')!
      .children[0] as HTMLElement;
    expect(listEl.getAttribute('style')).toContain('min-width');

    listRef.value.scrollToIndex(5);
    expect(clientEl.scrollLeft).toBe(200);

    app.unmount();
  });

  it('卸载后容器被清空', () => {
    const { app, container } = mount();

    app.unmount();

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
