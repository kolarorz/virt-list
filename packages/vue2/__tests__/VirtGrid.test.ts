/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Vue from 'vue';
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

function mount(
  props: Record<string, unknown> = {},
  scopedSlots?: Record<string, any>,
  listeners: Record<string, any> = {},
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const mountPoint = document.createElement('div');
  container.appendChild(mountPoint);

  const vm = new Vue({
    render(h: any) {
      return h(VirtGrid as any, {
        ref: 'grid',
        props: {
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
        on: listeners,
        scopedSlots,
      });
    },
  });
  vm.$mount(mountPoint);

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 200);

  return { container, vm, clientEl, api: () => vm.$refs.grid as any };
}

function rowIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-id]'))
    .map((el) => (el as HTMLElement).dataset.id!)
    .filter((id) => /^\d+$/.test(id));
}

describe('Vue2 VirtGrid', () => {
  it('渲染出行，每行含 gridItems 个单元格', () => {
    const { container, vm } = mount();

    expect(rowIds(container)).toEqual(['0', '3', '6', '9', '12', '15', '18']);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(3);

    vm.$destroy();
  });

  it('default 作用域插槽渲染单元格', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      render(h: any) {
        return h(VirtGrid as any, {
          props: {
            list: makeList(30),
            gridItems: 3,
            itemKey: 'id',
            itemPreSize: 40,
          },
          scopedSlots: {
            default: ({ itemData, listIndex }: any) =>
              h('span', `${listIndex}:${itemData.id} `),
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 200);

    expect(container.textContent).toContain('0:0');
    expect(container.textContent).toContain('3:3');

    vm.$destroy();
  });

  it('末行不足一整行时只渲染剩余单元格', () => {
    const { container, vm } = mount({ list: makeList(10) });

    expect(container.querySelector('[data-id="9"]')!.children.length).toBe(1);

    vm.$destroy();
  });

  it('list 变化后重新分组', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      data: () => ({ list: makeList(9) }),
      render(h: any) {
        return h(VirtGrid as any, {
          props: {
            list: (this as any).list,
            gridItems: 3,
            itemKey: 'id',
            itemPreSize: 40,
            renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
              el.textContent = item.text;
            },
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 200);
    expect(rowIds(container)).toEqual(['0', '3', '6']);

    (vm as any).list = makeList(3);
    await Vue.nextTick();

    expect(rowIds(container)).toEqual(['0']);

    vm.$destroy();
  });

  it('gridItems 变化后按新列数重排', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      data: () => ({ gridItems: 3 }),
      render(h: any) {
        return h(VirtGrid as any, {
          props: {
            list: makeList(12),
            gridItems: (this as any).gridItems,
            itemKey: 'id',
            itemPreSize: 40,
            renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
              el.textContent = item.text;
            },
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 200);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(3);

    (vm as any).gridItems = 4;
    await Vue.nextTick();

    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(4);

    vm.$destroy();
  });

  it('暴露滚动与数据 API', () => {
    const { container, vm, api, clientEl } = mount({ list: makeList(120) });

    api().scrollToIndex(15);
    expect(clientEl.scrollTop).toBe(200);

    api().scrollToOffset(88);
    expect(clientEl.scrollTop).toBe(88);

    api().setList(makeList(4));
    expect(rowIds(container)).toEqual(['0', '3']);

    api().setGridItems(2);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(2);

    expect(() => api().forceUpdate()).not.toThrow();

    vm.$destroy();
  });

  it('事件被 emit', () => {
    const scroll = vi.fn();
    const toBottom = vi.fn();
    const update = vi.fn();
    const { vm, clientEl } = mount({}, undefined, { scroll, toBottom, update });

    expect(update).toHaveBeenCalled();

    clientEl.scrollTop = 100;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(scroll).toHaveBeenCalled();

    clientEl.scrollTop = 200;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(toBottom).toHaveBeenCalled();

    vm.$destroy();
  });

  it('销毁后清空容器', () => {
    const { container, vm } = mount();

    vm.$destroy();

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
