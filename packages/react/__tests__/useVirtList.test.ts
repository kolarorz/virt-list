/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

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

/** 在一个最小组件里使用 hook，把返回的句柄透出来 */
async function setup(
  options: Record<string, unknown> = {},
  events: Record<string, any> = {},
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let api!: UseVirtListReturn<Item>;

  function Demo() {
    api = useVirtList<Item>(
      {
        list: makeList(50),
        itemKey: 'id',
        estimatedSize: 40,
        buffer: 0,
        renderItem: (item: Item, _index: number, el: HTMLElement) => {
          el.textContent = item.text;
        },
        ...options,
      } as any,
      events,
    );
    return createElement('div', { ref: api.containerRef as any });
  }

  await act(async () => {
    root.render(createElement(Demo));
  });

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 200);

  return { container, root, clientEl, getApi: () => api };
}

async function unmount(root: Root) {
  await act(async () => {
    root.unmount();
  });
}

describe('React useVirtList', () => {
  it('挂载后在 containerRef 指向的元素里构建列表', async () => {
    const { container, root } = await setup();

    expect(container.querySelector('[data-id="client"]')).toBeTruthy();
    expect(container.querySelector('[data-id="0"]')).toBeTruthy();
    expect(container.textContent).toContain('item-0');

    await unmount(root);
  });

  it('暴露状态与尺寸信息', async () => {
    const { root, getApi } = await setup();
    const api = getApi();

    expect(api.state.renderEnd).toBe(6);
    expect(api.getState().itemsTotalSize).toBe(2000);
    expect(api.slotSize.clientSize).toBe(200);
    expect(api.sizesMap).toBeInstanceOf(Map);
    expect(api.resizeObserver).toBeDefined();
    expect(api.getSlotsTotalSize()).toBe(0);
    expect(api.getItemSize('0')).toBe(40);
    expect(api.getItemPosByIndex(3)).toEqual({
      top: 120,
      current: 40,
      bottom: 160,
    });

    await unmount(root);
  });

  it('暴露滚动 API', async () => {
    vi.useFakeTimers();
    const { root, getApi } = await setup();
    const api = getApi();

    api.scrollToIndex(10);
    expect(api.getOffset()).toBe(400);
    expect(api.getOffset()).toBe(400);

    api.scrollToOffset(77);
    expect(api.getOffset()).toBe(77);

    api.scrollIntoView(0);
    expect(api.getOffset()).toBe(0);

    api.scrollToBottom();
    // scrollToBottom 停在浏览器允许的可滚动上限（总高 - 可视高度），
    // 而不是把总高原样写进 scrollTop —— 后者在真实浏览器里会被裁掉
    expect(api.getOffset()).toBe(2000 - 200);

    api.scrollToTop();
    vi.runAllTimers();
    expect(api.getOffset()).toBe(0);

    vi.useRealTimers();
    await unmount(root);
  });

  it('smooth 滚动可被 cancelScroll 打断', async () => {
    vi.useFakeTimers();
    const { root, getApi } = await setup();
    const api = getApi();

    api.scrollToIndex(40, { behavior: 'smooth', duration: 200 });
    vi.advanceTimersByTime(32);
    api.cancelScroll();
    const stopped = api.getOffset();
    vi.advanceTimersByTime(300);

    expect(api.getOffset()).toBe(stopped);

    vi.useRealTimers();
    await unmount(root);
  });

  it('暴露 manualRender / reset / deleteItemSize / setList / forceUpdate', async () => {
    const { root, getApi } = await setup();
    const api = getApi();

    api.manualRender(5, 7);
    expect(api.getState().renderBegin).toBe(5);

    api.reset();
    expect(api.getState().inViewBegin).toBe(0);

    api.deleteItemSize('0');
    expect(api.getItemSize('0')).toBe(40);

    api.setList(makeList(2));
    expect(api.getState().itemsTotalSize).toBe(80);

    expect(() => api.forceUpdate()).not.toThrow();

    await unmount(root);
  });

  it('暴露头部增删修正', async () => {
    const list = makeList(50);
    const { root, getApi } = await setup({ list });
    const api = getApi();

    getApi().scrollFromUser(400);

    api.setList([{ id: 'new-0', text: 'new-0' }, ...list]);
    expect(api.getOffset()).toBe(440);

    api.setList([...list]);
    expect(api.getOffset()).toBe(400);

    await unmount(root);
  });

  it('事件回调被调用', async () => {
    const offsetChange = vi.fn();
    const toBottom = vi.fn();
    const update = vi.fn();
    const itemResize = vi.fn();
    const { root, getApi } = await setup(
      {},
      { offsetChange, toBottom, update, itemResize },
    );

    expect(update).toHaveBeenCalled();

    getApi().scrollFromUser(400);
    expect(offsetChange).toHaveBeenCalledWith(400);

    getApi().scrollFromUser(1800);
    expect(toBottom).toHaveBeenCalled();

    flushResize('0', 66);
    expect(itemResize).toHaveBeenCalledWith('0', 66);

    await unmount(root);
  });

  it('卸载时销毁列表', async () => {
    const { container, root } = await setup();

    await unmount(root);

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
