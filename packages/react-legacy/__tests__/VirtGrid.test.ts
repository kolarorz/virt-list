/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, createRef } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { VirtGrid } from '../src/index';
import type { VirtGridRef } from '../src/VirtGrid';

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

function mount(props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const gridRef = createRef<VirtGridRef>();

  act(() => {
    ReactDOM.render(
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
      container,
    );
  });

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 200);

  return { container, gridRef, clientEl };
}

function rowIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-id]'))
    .map((el) => (el as HTMLElement).dataset.id!)
    .filter((id) => /^\d+$/.test(id));
}

function unmount(container: HTMLElement) {
  act(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
}

describe('React-legacy VirtGrid', () => {
  it('渲染出行，每行含 gridItems 个单元格', () => {
    const { container } = mount();

    expect(rowIds(container)).toEqual(['0', '3', '6', '9', '12', '15', '18']);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(3);

    unmount(container);
  });

  it('children 渲染 prop 收到 (rowIndex, listIndex)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      ReactDOM.render(
        createElement(VirtGrid as any, {
          list: makeList(30),
          gridItems: 3,
          itemKey: 'id',
          itemPreSize: 40,
          children: ({ rowIndex, listIndex }: any) =>
            createElement('span', null, `${rowIndex}/${listIndex} `),
        }),
        container,
      );
    });
    flushResize('client', 200);

    expect(container.textContent).toContain('0/0');
    expect(container.textContent).toContain('1/3');

    unmount(container);
  });

  it('末行不足一整行时只渲染剩余单元格', () => {
    const { container } = mount({ list: makeList(10) });

    expect(container.querySelector('[data-id="9"]')!.children.length).toBe(1);

    unmount(container);
  });

  it('list 变化后重新分组', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const render = (list: Item[]) => {
      act(() => {
        ReactDOM.render(
          createElement(VirtGrid as any, {
            list,
            gridItems: 3,
            itemKey: 'id',
            itemPreSize: 40,
            renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
              el.textContent = item.text;
            },
          }),
          container,
        );
      });
    };

    render(makeList(9));
    flushResize('client', 200);
    expect(rowIds(container)).toEqual(['0', '3', '6']);

    render(makeList(3));

    expect(rowIds(container)).toEqual(['0']);

    unmount(container);
  });

  it('gridItems 变化后按新列数重排', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const render = (gridItems: number) => {
      act(() => {
        ReactDOM.render(
          createElement(VirtGrid as any, {
            list: makeList(12),
            gridItems,
            itemKey: 'id',
            itemPreSize: 40,
            renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
              el.textContent = item.text;
            },
          }),
          container,
        );
      });
    };

    render(3);
    flushResize('client', 200);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(3);

    render(4);

    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(4);

    unmount(container);
  });

  it('暴露滚动与数据 API', () => {
    const { container, gridRef, clientEl } = mount({ list: makeList(120) });
    const api = gridRef.current!;

    api.scrollToIndex(15);
    expect(clientEl.scrollTop).toBe(200);

    api.scrollToOffset(88);
    expect(clientEl.scrollTop).toBe(88);

    api.scrollIntoView(60);
    expect(clientEl.scrollTop).toBe(800);

    api.setList(makeList(4));
    expect(rowIds(container)).toEqual(['0', '3']);

    api.setGridItems(2);
    expect(container.querySelector('[data-id="0"]')!.children.length).toBe(2);

    expect(() => api.forceUpdate()).not.toThrow();

    unmount(container);
  });

  it('事件回调被调用', () => {
    const onScroll = vi.fn();
    const onToBottom = vi.fn();
    const onUpdate = vi.fn();
    const { container, clientEl } = mount({ onScroll, onToBottom, onUpdate });

    expect(onUpdate).toHaveBeenCalled();

    clientEl.scrollTop = 100;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(onScroll).toHaveBeenCalled();

    clientEl.scrollTop = 200;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(onToBottom).toHaveBeenCalled();

    unmount(container);
  });

  it('卸载后清空容器', () => {
    const { container } = mount();

    unmount(container);

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
