/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import { useVirtList } from '../src/index';
import type { UseVirtListReturn } from '../src/index';

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

/** 在一个最小组件里使用 composable，返回它的句柄 */
function setup(
  options: Record<string, unknown> = {},
  events: Record<string, any> = {},
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let api!: UseVirtListReturn<Item>;
  const app = createApp(
    defineComponent({
      setup() {
        api = useVirtList<Item>(
          {
            list: makeList(50),
            itemKey: 'id',
            itemPreSize: 40,
            buffer: 0,
            renderItem: (item: Item, _index: number, el: HTMLElement) => {
              el.textContent = item.text;
            },
            ...options,
          } as any,
          events,
        );
        return () => h('div', { ref: api.containerRef });
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

  return { app, container, api, clientEl };
}

describe('Vue useVirtList', () => {
  it('挂载后在 containerRef 指向的元素里构建列表', () => {
    const { app, container } = setup();

    expect(container.querySelector('[data-id="client"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-id="0"]').length).toBe(1);
    expect(container.textContent).toContain('item-0');

    app.unmount();
  });

  it('暴露响应式状态与尺寸信息', () => {
    const { app, api } = setup();

    expect(api.reactiveData.renderEnd).toBe(6);
    expect(api.getState().listTotalSize).toBe(2000);
    expect(api.slotSize.clientSize).toBe(200);
    expect(api.sizesMap).toBeInstanceOf(Map);
    expect(api.resizeObserver).toBeDefined();
    expect(api.getSlotSize()).toBe(0);

    app.unmount();
  });

  it('暴露尺寸查询与位置计算', () => {
    const { app, api } = setup();

    expect(api.getItemSize('0')).toBe(40);
    api.deleteItemSize('0');
    expect(api.getItemSize('0')).toBe(40);
    expect(api.getItemPosByIndex(3)).toEqual({
      top: 120,
      current: 40,
      bottom: 160,
    });

    app.unmount();
  });

  it('暴露滚动 API', () => {
    vi.useFakeTimers();
    const { app, api, clientEl } = setup();

    api.scrollToIndex(10);
    expect(clientEl.scrollTop).toBe(400);
    expect(api.getOffset()).toBe(400);

    api.scrollToOffset(77);
    expect(clientEl.scrollTop).toBe(77);

    api.scrollIntoView(0);
    expect(clientEl.scrollTop).toBe(0);

    api.scrollToBottom();
    // scrollToBottom 停在浏览器允许的可滚动上限（总高 - 可视高度），
    // 而不是把总高原样写进 scrollTop —— 后者在真实浏览器里会被裁掉
    expect(clientEl.scrollTop).toBe(2000 - 200);

    api.scrollToTop();
    vi.runAllTimers();
    expect(clientEl.scrollTop).toBe(0);

    app.unmount();
  });

  it('smooth 滚动可被 cancelScroll 打断', () => {
    vi.useFakeTimers();
    const { app, api, clientEl } = setup();

    api.scrollToIndex(40, { behavior: 'smooth', duration: 200 });
    vi.advanceTimersByTime(32);
    api.cancelScroll();
    const stopped = clientEl.scrollTop;
    vi.advanceTimersByTime(300);

    expect(clientEl.scrollTop).toBe(stopped);

    app.unmount();
  });

  it('暴露 manualRender / reset / forceUpdate / setList', () => {
    const { app, api, container } = setup();

    api.manualRender(5, 7);
    expect(api.getState().renderBegin).toBe(5);

    api.reset();
    expect(api.getState().inViewBegin).toBe(0);

    api.setList(makeList(2));
    expect(api.getState().listTotalSize).toBe(80);
    expect(container.querySelectorAll('.virt-list__client [data-id]').length)
      .toBeGreaterThan(0);

    expect(() => api.forceUpdate()).not.toThrow();

    app.unmount();
  });

  it('暴露头部增删修正', () => {
    const list = makeList(50);
    const { app, api, clientEl } = setup({ list });

    clientEl.scrollTop = 400;
    clientEl.dispatchEvent(new Event('scroll'));

    const added = [{ id: 'new-0', text: 'new-0' }];
    list.unshift(...added);
    api.setList(list);
    api.addedList2Top(added);
    expect(clientEl.scrollTop).toBe(440);
    clientEl.dispatchEvent(new Event('scroll'));

    const deleted = list.splice(0, 1);
    api.setList(list);
    api.deletedList2Top(deleted);
    expect(clientEl.scrollTop).toBe(400);

    app.unmount();
  });

  it('事件回调被调用', () => {
    const scroll = vi.fn();
    const toBottom = vi.fn();
    const update = vi.fn();
    const itemResize = vi.fn();
    const { app, clientEl } = setup({}, { scroll, toBottom, update, itemResize });

    expect(update).toHaveBeenCalled();

    clientEl.scrollTop = 400;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(scroll).toHaveBeenCalled();

    clientEl.scrollTop = 1800;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(toBottom).toHaveBeenCalled();

    flushResize('0', 66);
    expect(itemResize).toHaveBeenCalledWith('0', 66);

    app.unmount();
  });

  it('卸载时销毁列表', () => {
    const { app, container } = setup();

    app.unmount();

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
