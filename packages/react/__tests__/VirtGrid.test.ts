/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VirtGrid, type VirtGridRef } from '../src/index';

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

/** 行高 40px、视口 200px、每行 3 列 */
async function mount(props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const gridRef = createRef<VirtGridRef>();
  const root: Root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(VirtGrid as any, {
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
      }),
    );
  });

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 200);

  return { container, gridRef, root, clientEl };
}

function rowIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-id]'))
    .map((el) => (el as HTMLElement).dataset.id!)
    .filter((id) => /^\d+$/.test(id));
}

async function unmount(root: Root) {
  await act(async () => {
    root.unmount();
  });
}

describe('React VirtGrid', () => {
  it('渲染出行，每行含 gridItems 个单元格', async () => {
    const { container, root } = await mount();

    expect(rowIds(container)).toEqual(['0', '3', '6', '9', '12', '15', '18']);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(3);
    expect(container.querySelector('[data-id="0"]')!.textContent).toBe(
      'item-0item-1item-2',
    );

    await unmount(root);
  });

  it('children 渲染 prop 收到 (itemData, rowIndex, listIndex)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(VirtGrid as any, {
          list: makeList(30),
          gridItems: 3,
          itemKey: 'id',
          itemPreSize: 40,
          children: ({ rowIndex, listIndex }: any) =>
            createElement('span', null, `${rowIndex}/${listIndex} `),
        }),
      );
    });
    flushResize('client', 200);
    await act(async () => {});

    expect(container.textContent).toContain('0/0');
    expect(container.textContent).toContain('1/3');

    await unmount(root);
  });

  it('末行不足一整行时只渲染剩余单元格', async () => {
    const { container, root } = await mount({ list: makeList(10) });

    expect(container.querySelector('[data-id="9"]')!.children.length).toBe(1);

    await unmount(root);
  });

  it('list 变化后重新分组', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const render = async (list: Item[]) => {
      await act(async () => {
        root.render(
          createElement(VirtGrid as any, {
            list,
            gridItems: 3,
            itemKey: 'id',
            itemPreSize: 40,
            renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
              el.textContent = item.text;
            },
          }),
        );
      });
    };

    await render(makeList(9));
    flushResize('client', 200);
    expect(rowIds(container)).toEqual(['0', '3', '6']);

    await render(makeList(3));

    expect(rowIds(container)).toEqual(['0']);

    await unmount(root);
  });

  it('gridItems 变化后按新列数重排', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const render = async (gridItems: number) => {
      await act(async () => {
        root.render(
          createElement(VirtGrid as any, {
            list: makeList(12),
            gridItems,
            itemKey: 'id',
            itemPreSize: 40,
            renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
              el.textContent = item.text;
            },
          }),
        );
      });
    };

    await render(3);
    flushResize('client', 200);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(3);

    await render(4);

    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(4);

    await unmount(root);
  });

  it('暴露滚动 API（扁平索引换算成行）', async () => {
    const { gridRef, clientEl, root } = await mount({ list: makeList(120) });

    gridRef.current!.scrollToIndex(15);
    expect(clientEl.scrollTop).toBe(200);

    gridRef.current!.scrollToOffset(99);
    expect(clientEl.scrollTop).toBe(99);

    gridRef.current!.scrollIntoView(60);
    expect(clientEl.scrollTop).toBe(800);

    await unmount(root);
  });

  it('暴露 setList / setGridItems / forceUpdate', async () => {
    const { container, gridRef, root } = await mount();

    gridRef.current!.setList(makeList(4));
    expect(rowIds(container)).toEqual(['0', '3']);

    gridRef.current!.setGridItems(2);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(2);

    expect(() => gridRef.current!.forceUpdate()).not.toThrow();

    await unmount(root);
  });

  it('smooth 滚动可被 cancelScroll 打断', async () => {
    vi.useFakeTimers();
    const { gridRef, clientEl, root } = await mount({ list: makeList(120) });

    gridRef.current!.scrollToIndex(90, { behavior: 'smooth', duration: 200 });
    vi.advanceTimersByTime(32);
    gridRef.current!.cancelScroll();
    const stopped = clientEl.scrollTop;
    vi.advanceTimersByTime(300);

    expect(clientEl.scrollTop).toBe(stopped);

    vi.useRealTimers();
    await unmount(root);
  });

  it('事件回调被调用', async () => {
    const onScroll = vi.fn();
    const onToBottom = vi.fn();
    const onUpdate = vi.fn();
    const { clientEl, root } = await mount({ onScroll, onToBottom, onUpdate });

    expect(onUpdate).toHaveBeenCalled();

    clientEl.scrollTop = 100;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(onScroll).toHaveBeenCalled();

    // 10 行 × 40 = 400，视口 200
    clientEl.scrollTop = 200;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(onToBottom).toHaveBeenCalled();

    await unmount(root);
  });

  it('空列表渲染 renderEmpty', async () => {
    const { container, root } = await mount({
      list: [],
      renderEmpty: (el: HTMLElement) => {
        el.textContent = 'grid-empty';
      },
    });

    expect(container.textContent).toContain('grid-empty');

    await unmount(root);
  });

  it('卸载后清空容器', async () => {
    const { container, root } = await mount();

    await unmount(root);

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
