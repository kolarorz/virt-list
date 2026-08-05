/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Vue from 'vue';
import { VirtList } from '../src/index';

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

/** Vue 2 没有 createApp，用实例 + $mount 挂到容器里 */
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
      return h(VirtList as any, {
        ref: 'list',
        props: {
          list: makeList(50),
          itemKey: 'id',
          itemPreSize: 40,
          buffer: 0,
          ...props,
        },
        on: listeners,
        scopedSlots: scopedSlots ?? {
          default: ({ itemData }: any) => h('div', itemData.text),
        },
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

  return { container, vm, clientEl, api: () => (vm.$refs.list as any) };
}

function renderedIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-id]'))
    .map((el) => (el as HTMLElement).dataset.id!)
    .filter((id) => /^\d+$/.test(id));
}

describe('Vue2 VirtList', () => {
  it('确认跑在 Vue 2 上', () => {
    expect(Vue.version.startsWith('2.')).toBe(true);
  });

  it('挂载后构建滚动容器并渲染一屏项', () => {
    const { container, vm } = mount();

    expect(container.querySelector('[data-id="client"]')).toBeTruthy();
    expect(renderedIds(container)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(container.textContent).toContain('item-0');

    vm.$destroy();
  });

  it('default 作用域插槽拿到 itemData 与 index', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      render(h: any) {
        return h(VirtList as any, {
          props: {
            list: makeList(50),
            itemKey: 'id',
            itemPreSize: 40,
            buffer: 0,
          },
          scopedSlots: {
            default: ({ itemData, index }: any) =>
              h('span', `${index}:${itemData.id}`),
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

  it('header / footer / sticky / empty 插槽', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      render(h: any) {
        return h(VirtList as any, {
          props: { list: [], itemKey: 'id', itemPreSize: 40 },
          scopedSlots: {
            default: () => h('div', 'x'),
            header: () => h('div', 'H'),
            footer: () => h('div', 'F'),
            stickyHeader: () => h('div', 'SH'),
            stickyFooter: () => h('div', 'SF'),
            empty: () => h('div', 'EMPTY'),
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 200);

    expect(container.querySelector('[data-id="header"]')!.textContent).toBe('H');
    expect(container.querySelector('[data-id="footer"]')!.textContent).toBe('F');
    expect(
      container.querySelector('[data-id="stickyHeader"]')!.textContent,
    ).toBe('SH');
    expect(
      container.querySelector('[data-id="stickyFooter"]')!.textContent,
    ).toBe('SF');
    expect(container.textContent).toContain('EMPTY');

    vm.$destroy();
  });

  it('renderItem prop 走 DOM 语义', () => {
    const { container, vm } = mount({
      renderItem: (item: Item, _i: number, el: HTMLElement) => {
        el.textContent = `dom-${item.id}`;
      },
    });

    expect(container.textContent).toContain('dom-0');

    vm.$destroy();
  });

  it('暴露状态查询 API', () => {
    const { vm, api } = mount();

    expect(api().getState().renderEnd).toBe(6);
    expect(api().getOffset()).toBe(0);
    expect(api().getItemSize('0')).toBe(40);
    expect(api().getItemPosByIndex(2)).toEqual({
      top: 80,
      current: 40,
      bottom: 120,
    });

    vm.$destroy();
  });

  it('暴露滚动 API', () => {
    vi.useFakeTimers();
    const { vm, api, clientEl } = mount();

    api().scrollToIndex(10);
    expect(clientEl.scrollTop).toBe(400);

    api().scrollToOffset(55);
    expect(clientEl.scrollTop).toBe(55);

    api().scrollToBottom();
    // scrollToBottom 停在浏览器允许的可滚动上限（总高 - 可视高度），
    // 而不是把总高原样写进 scrollTop —— 后者在真实浏览器里会被裁掉
    expect(clientEl.scrollTop).toBe(2000 - 200);

    api().scrollToTop();
    vi.runAllTimers();
    expect(clientEl.scrollTop).toBe(0);

    vm.$destroy();
  });

  it('暴露 reset / manualRender / setList / forceUpdate', () => {
    const { vm, api } = mount();

    api().manualRender(5, 8);
    expect(api().getState().renderBegin).toBe(5);

    api().reset();
    expect(api().getState().inViewBegin).toBe(0);

    api().setList(makeList(2));
    expect(api().getState().listTotalSize).toBe(80);

    expect(() => api().forceUpdate()).not.toThrow();

    vm.$destroy();
  });

  it('事件被 emit', () => {
    const scroll = vi.fn();
    const toBottom = vi.fn();
    const update = vi.fn();
    const itemResize = vi.fn();
    const { vm, clientEl } = mount({}, undefined, {
      scroll,
      toBottom,
      update,
      itemResize,
    });

    expect(update).toHaveBeenCalled();

    clientEl.scrollTop = 400;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(scroll).toHaveBeenCalled();

    clientEl.scrollTop = 1800;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(toBottom).toHaveBeenCalled();

    flushResize('0', 88);
    expect(itemResize).toHaveBeenCalledWith('0', 88);

    vm.$destroy();
  });

  it('list 长度变化后同步', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      data: () => ({ list: makeList(50) }),
      render(h: any) {
        return h(VirtList as any, {
          ref: 'list',
          props: {
            list: (this as any).list,
            itemKey: 'id',
            itemPreSize: 40,
          },
          scopedSlots: {
            default: ({ itemData }: any) => h('div', itemData.text),
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 200);

    (vm as any).list = makeList(3);
    await Vue.nextTick();

    expect((vm.$refs.list as any).getState().listTotalSize).toBe(120);
    expect(renderedIds(container)).toEqual(['0', '1', '2']);

    vm.$destroy();
  });

  it('销毁后清空容器', () => {
    const { container, vm } = mount();

    vm.$destroy();

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
