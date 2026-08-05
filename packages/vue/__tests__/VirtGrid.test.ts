/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { VirtGrid } from '../src/index';

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

let roCallback: ResizeObserverCallback | null = null;
const OriginalRO = globalThis.ResizeObserver;

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

function mount(props: Record<string, unknown> = {}, slots?: any) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const gridRef: Ref<any> = ref(null);
  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(
            VirtGrid as any,
            {
              ref: gridRef,
              list: makeList(30),
              gridItems: 3,
              itemKey: 'id',
              itemPreSize: 40,
              buffer: 0,
              renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
                el.textContent = item.text;
              },
              ...props,
            },
            slots,
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

  return { app, container, gridRef, clientEl };
}

function rowIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-id]'))
    .map((el) => (el as HTMLElement).dataset.id!)
    .filter((id) => /^\d+$/.test(id));
}

describe('Vue VirtGrid', () => {
  it('挂载后渲染出行，每行含 gridItems 个单元格', () => {
    const { app, container } = mount();

    expect(rowIds(container)).toEqual(['0', '3', '6', '9', '12', '15', '18']);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(3);

    app.unmount();
  });

  it('list 变化后重新分组', async () => {
    const list = ref(makeList(9));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(VirtGrid as any, {
              list: list.value,
              gridItems: 3,
              itemKey: 'id',
              itemPreSize: 40,
              renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
                el.textContent = item.text;
              },
            });
        },
      }),
    );
    app.mount(container);
    flushResize('client', 200);
    expect(rowIds(container)).toEqual(['0', '3', '6']);

    list.value = makeList(3);
    await nextTick();

    expect(rowIds(container)).toEqual(['0']);

    app.unmount();
  });

  it('gridItems 变化后按新列数重排', async () => {
    const gridItems = ref(3);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(VirtGrid as any, {
              list: makeList(12),
              gridItems: gridItems.value,
              itemKey: 'id',
              itemPreSize: 40,
              renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
                el.textContent = item.text;
              },
            });
        },
      }),
    );
    app.mount(container);
    flushResize('client', 200);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(3);

    gridItems.value = 4;
    await nextTick();

    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(4);

    app.unmount();
  });

  it('非正数 gridItems 不触发重排', async () => {
    const gridItems = ref(3);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(VirtGrid as any, {
              list: makeList(12),
              gridItems: gridItems.value,
              itemKey: 'id',
              itemPreSize: 40,
              renderItem: (_i: Item, _r: number, _l: number, el: HTMLElement) => {
                el.textContent = 'x';
              },
            });
        },
      }),
    );
    app.mount(container);
    flushResize('client', 200);

    gridItems.value = 0;
    await nextTick();

    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(3);

    app.unmount();
  });

  it('暴露滚动 API', () => {
    const { app, gridRef, clientEl } = mount({ list: makeList(120) });

    gridRef.value.scrollToIndex(15);
    expect(clientEl.scrollTop).toBe(200);

    gridRef.value.scrollToOffset(88);
    expect(clientEl.scrollTop).toBe(88);

    gridRef.value.scrollIntoView(60);
    expect(clientEl.scrollTop).toBe(800);

    app.unmount();
  });

  it('暴露 setList / setGridItems / forceUpdate', async () => {
    const { app, container, gridRef } = mount();

    gridRef.value.setList(makeList(4));
    expect(rowIds(container)).toEqual(['0', '3']);

    gridRef.value.setGridItems(2);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(2);

    expect(() => gridRef.value.forceUpdate()).not.toThrow();

    app.unmount();
  });

  it('smooth 滚动可被 cancelScroll 打断', () => {
    vi.useFakeTimers();
    const { app, gridRef, clientEl } = mount({ list: makeList(120) });

    gridRef.value.scrollToIndex(90, { behavior: 'smooth', duration: 200 });
    vi.advanceTimersByTime(32);
    gridRef.value.cancelScroll();
    const stopped = clientEl.scrollTop;
    vi.advanceTimersByTime(300);

    expect(clientEl.scrollTop).toBe(stopped);

    app.unmount();
  });

  it('事件被 emit 出来', () => {
    const onScroll = vi.fn();
    const onToBottom = vi.fn();
    const onUpdate = vi.fn();
    const { app, clientEl } = mount({ onScroll, onToBottom, onUpdate });

    expect(onUpdate).toHaveBeenCalled();

    clientEl.scrollTop = 100;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(onScroll).toHaveBeenCalled();

    // 10 行 × 40 = 400，视口 200
    clientEl.scrollTop = 200;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(onToBottom).toHaveBeenCalled();

    app.unmount();
  });

  it('头尾与空状态通过 render props 提供（Grid 只开放 default 插槽）', () => {
    const { app, container } = mount({
      list: [],
      renderHeader: (el: HTMLElement) => {
        el.textContent = 'grid-header';
      },
      renderFooter: (el: HTMLElement) => {
        el.textContent = 'grid-footer';
      },
      renderEmpty: (el: HTMLElement) => {
        el.textContent = 'grid-empty';
      },
    });

    expect(container.textContent).toContain('grid-header');
    expect(container.textContent).toContain('grid-footer');
    expect(container.textContent).toContain('grid-empty');

    app.unmount();
  });

  it('default 插槽渲染单元格', () => {
    const { app, container } = mount(
      { renderItem: undefined },
      {
        default: ({ itemData }: any) => h('span', null, `cell-${itemData.id}`),
      },
    );

    expect(container.textContent).toContain('cell-0');

    app.unmount();
  });

  it('卸载后清空容器', () => {
    const { app, container } = mount();

    app.unmount();

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
