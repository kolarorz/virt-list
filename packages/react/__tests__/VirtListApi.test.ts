/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VirtList, type VirtListRef } from '../src/index';

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

/** 40px 估算、视口 200px、buffer 0 的列表 */
async function mount(props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const listRef = createRef<VirtListRef<Item>>();
  const root: Root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(VirtList as any, {
        ref: listRef,
        list: makeList(50),
        itemKey: 'id',
        itemPreSize: 40,
        buffer: 0,
        renderItem: (item: Item, _index: number, el: HTMLElement) => {
          el.textContent = item.text;
        },
        ...props,
      }),
    );
  });

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
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
  flushResize('client', 200);

  return { container, listRef, root, clientEl };
}

function renderedIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-id]'))
    .map((el) => (el as HTMLElement).dataset.id!)
    .filter((id) => /^\d+$/.test(id));
}

async function unmount(root: Root) {
  await act(async () => {
    root.unmount();
  });
}

describe('React VirtList 渲染', () => {
  it('构建滚动容器并渲染一屏项', async () => {
    const { container, root } = await mount();

    expect(container.querySelector('[data-id="client"]')).toBeTruthy();
    expect(renderedIds(container)).toEqual(['0', '1', '2', '3', '4', '5', '6']);

    await unmount(root);
  });

  it('children 渲染 prop 用 React 节点渲染每一项', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(VirtList as any, {
          list: makeList(50),
          itemKey: 'id',
          itemPreSize: 40,
          buffer: 0,
          children: ({ itemData, index }: any) =>
            createElement('span', null, `react-${index}-${itemData.id}`),
        }),
      );
    });
    flushResize('client', 200);
    // 每项各自一个 React root，渲染排在微任务里
    await act(async () => {});

    expect(container.textContent).toContain('react-0-0');
    expect(container.textContent).toContain('react-3-3');

    await unmount(root);
  });

  it('插槽渲染 prop 输出 React 节点', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(VirtList as any, {
          list: [],
          itemKey: 'id',
          itemPreSize: 40,
          renderHeader: () => createElement('div', null, 'H'),
          renderFooter: () => createElement('div', null, 'F'),
          renderStickyHeader: () => createElement('div', null, 'SH'),
          renderStickyFooter: () => createElement('div', null, 'SF'),
          renderEmpty: () => createElement('div', null, 'EMPTY'),
          children: () => null,
        }),
      );
    });
    flushResize('client', 200);
    await act(async () => {});

    expect(container.querySelector('[data-id="header"]')!.textContent).toBe('H');
    expect(container.querySelector('[data-id="footer"]')!.textContent).toBe('F');
    expect(
      container.querySelector('[data-id="stickyHeader"]')!.textContent,
    ).toBe('SH');
    expect(
      container.querySelector('[data-id="stickyFooter"]')!.textContent,
    ).toBe('SF');
    expect(container.textContent).toContain('EMPTY');

    await unmount(root);
  });

  it('itemClass / itemStyle 的函数形式作用到每一项', async () => {
    const { container, root } = await mount({
      itemClass: (item: Item) => `row-${item.id}`,
      itemStyle: (_item: Item, index: number) => `top:${index}px;`,
    });

    const second = container.querySelector('[data-id="1"]') as HTMLElement;
    expect(second.className).toContain('row-1');
    expect(second.getAttribute('style')).toContain('top:1px;');

    await unmount(root);
  });

  it('list 长度变化后同步到底层列表', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const listRef = createRef<VirtListRef<Item>>();
    const root = createRoot(container);
    const render = async (list: Item[]) => {
      await act(async () => {
        root.render(
          createElement(VirtList as any, {
            ref: listRef,
            list,
            itemKey: 'id',
            itemPreSize: 40,
            renderItem: (item: Item, _i: number, el: HTMLElement) => {
              el.textContent = item.text;
            },
          }),
        );
      });
    };

    await render(makeList(50));
    flushResize('client', 200);

    await render(makeList(3));

    expect(listRef.current!.getState().listTotalSize).toBe(120);
    expect(renderedIds(container)).toEqual(['0', '1', '2']);

    await unmount(root);
  });
});

describe('React VirtList ref API', () => {
  it('暴露状态与尺寸查询', async () => {
    const { listRef, root } = await mount();
    const api = listRef.current!;

    expect(api.getState().renderEnd).toBe(6);
    expect(api.reactiveData.listTotalSize).toBe(2000);
    expect(api.slotSize.clientSize).toBe(200);
    expect(api.sizesMap).toBeInstanceOf(Map);
    expect(api.resizeObserver).toBeDefined();
    expect(api.getOffset()).toBe(0);
    expect(api.getSlotSize()).toBe(0);
    expect(api.getItemSize('0')).toBe(40);
    expect(api.getItemPosByIndex(2)).toEqual({
      top: 80,
      current: 40,
      bottom: 120,
    });

    await unmount(root);
  });

  it('暴露滚动 API', async () => {
    vi.useFakeTimers();
    const { listRef, clientEl, root } = await mount();
    const api = listRef.current!;

    api.scrollToIndex(10);
    expect(clientEl.scrollTop).toBe(400);

    api.scrollToOffset(66);
    expect(clientEl.scrollTop).toBe(66);

    api.scrollIntoView(0);
    expect(clientEl.scrollTop).toBe(0);

    api.scrollToBottom();
    // scrollToBottom 停在浏览器允许的可滚动上限（总高 - 可视高度），
    // 而不是把总高原样写进 scrollTop —— 后者在真实浏览器里会被裁掉
    expect(clientEl.scrollTop).toBe(2000 - 200);

    api.scrollToTop();
    vi.runAllTimers();
    expect(clientEl.scrollTop).toBe(0);

    vi.useRealTimers();
    await unmount(root);
  });

  it('smooth 滚动可被 cancelScroll 打断', async () => {
    vi.useFakeTimers();
    const { listRef, clientEl, root } = await mount();

    listRef.current!.scrollToIndex(40, { behavior: 'smooth', duration: 200 });
    vi.advanceTimersByTime(32);
    listRef.current!.cancelScroll();
    const stopped = clientEl.scrollTop;
    vi.advanceTimersByTime(300);

    expect(clientEl.scrollTop).toBe(stopped);

    vi.useRealTimers();
    await unmount(root);
  });

  it('暴露 manualRender / reset / deleteItemSize / forceUpdate / setList', async () => {
    const { listRef, clientEl, root } = await mount();
    const api = listRef.current!;

    api.manualRender(5, 8);
    expect(api.getState().renderBegin).toBe(5);

    clientEl.scrollTop = 400;
    clientEl.dispatchEvent(new Event('scroll'));
    api.reset();
    expect(api.getState().inViewBegin).toBe(0);

    api.deleteItemSize('0');
    expect(api.getItemSize('0')).toBe(40);

    api.setList(makeList(2));
    expect(api.getState().listTotalSize).toBe(80);

    expect(() => api.forceUpdate()).not.toThrow();

    await unmount(root);
  });

  it('暴露头部增删修正', async () => {
    const list = makeList(50);
    const { listRef, clientEl, root } = await mount({ list });
    const api = listRef.current!;

    clientEl.scrollTop = 400;
    clientEl.dispatchEvent(new Event('scroll'));

    const added = [{ id: 'new-0', text: 'new-0' }];
    list.unshift(...added);
    api.addedList2Top(added);
    expect(clientEl.scrollTop).toBe(440);
    clientEl.dispatchEvent(new Event('scroll'));

    const deleted = list.splice(0, 1);
    api.deletedList2Top(deleted);
    expect(clientEl.scrollTop).toBe(400);

    await unmount(root);
  });
});

describe('React VirtList 事件与卸载', () => {
  it('事件回调被调用', async () => {
    const onScroll = vi.fn();
    const onToTop = vi.fn();
    const onToBottom = vi.fn();
    const onUpdate = vi.fn();
    const onItemResize = vi.fn();
    const { clientEl, root } = await mount({
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

    await unmount(root);
  });

  it('horizontal 模式走横向布局', async () => {
    const { container, listRef, clientEl, root } = await mount({
      horizontal: true,
    });

    const listEl = container.querySelector('[data-id="client"]')!
      .children[0] as HTMLElement;
    expect(listEl.getAttribute('style')).toContain('min-width');

    listRef.current!.scrollToIndex(5);
    expect(clientEl.scrollLeft).toBe(200);

    await unmount(root);
  });

  it('卸载后清空容器', async () => {
    const { container, root } = await mount();

    await unmount(root);

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
