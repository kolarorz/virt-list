/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, createRef, version } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { VirtList } from '../src/index';
import type { VirtListRef } from '../src/VirtList';

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

/** React 16/17 用 ReactDOM.render 挂载 */
function mount(props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const listRef = createRef<VirtListRef<Item>>();

  act(() => {
    ReactDOM.render(
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

  return { container, listRef, clientEl };
}

function renderedIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-id]'))
    .map((el) => (el as HTMLElement).dataset.id!)
    .filter((id) => /^\d+$/.test(id));
}

function unmount(container: HTMLElement) {
  act(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
}

describe('React-legacy VirtList', () => {
  it('确认跑在 React 16/17 上', () => {
    expect(Number(version.split('.')[0])).toBeLessThan(18);
  });

  it('挂载后构建滚动容器并渲染一屏项', () => {
    const { container } = mount();

    expect(container.querySelector('[data-id="client"]')).toBeTruthy();
    expect(renderedIds(container)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(container.textContent).toContain('item-0');

    unmount(container);
  });

  it('children 渲染 prop 用 React 节点渲染每一项', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      ReactDOM.render(
        createElement(VirtList as any, {
          list: makeList(50),
          itemKey: 'id',
          itemPreSize: 40,
          buffer: 0,
          children: ({ itemData, index }: any) =>
            createElement('span', null, `react-${index}-${itemData.id}`),
        }),
        container,
      );
    });
    flushResize('client', 200);

    expect(container.textContent).toContain('react-0-0');
    expect(container.textContent).toContain('react-3-3');

    unmount(container);
  });

  it('插槽渲染 prop 输出 React 节点', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      ReactDOM.render(
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
        container,
      );
    });
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

    unmount(container);
  });

  it('暴露状态与尺寸查询', () => {
    const { container, listRef } = mount();
    const api = listRef.current!;

    expect(api.getState().renderEnd).toBe(6);
    expect(api.reactiveData.listTotalSize).toBe(2000);
    expect(api.slotSize.clientSize).toBe(200);
    expect(api.getItemSize('0')).toBe(40);
    expect(api.getItemPosByIndex(2)).toEqual({
      top: 80,
      current: 40,
      bottom: 120,
    });

    unmount(container);
  });

  it('暴露滚动 API', () => {
    vi.useFakeTimers();
    const { container, listRef, clientEl } = mount();
    const api = listRef.current!;

    api.scrollToIndex(10);
    expect(clientEl.scrollTop).toBe(400);

    api.scrollToOffset(55);
    expect(clientEl.scrollTop).toBe(55);

    api.scrollToBottom();
    // scrollToBottom 停在浏览器允许的可滚动上限（总高 - 可视高度），
    // 而不是把总高原样写进 scrollTop —— 后者在真实浏览器里会被裁掉
    expect(clientEl.scrollTop).toBe(2000 - 200);

    api.scrollToTop();
    vi.runAllTimers();
    expect(clientEl.scrollTop).toBe(0);

    vi.useRealTimers();
    unmount(container);
  });

  it('暴露 manualRender / reset / setList / forceUpdate', () => {
    const { container, listRef } = mount();
    const api = listRef.current!;

    api.manualRender(5, 8);
    expect(api.getState().renderBegin).toBe(5);

    api.reset();
    expect(api.getState().inViewBegin).toBe(0);

    api.setList(makeList(2));
    expect(api.getState().listTotalSize).toBe(80);

    expect(() => api.forceUpdate()).not.toThrow();

    unmount(container);
  });

  it('list 长度变化后同步到底层列表', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const listRef = createRef<VirtListRef<Item>>();
    const render = (list: Item[]) => {
      act(() => {
        ReactDOM.render(
          createElement(VirtList as any, {
            ref: listRef,
            list,
            itemKey: 'id',
            itemPreSize: 40,
            renderItem: (item: Item, _i: number, el: HTMLElement) => {
              el.textContent = item.text;
            },
          }),
          container,
        );
      });
    };

    render(makeList(50));
    flushResize('client', 200);

    render(makeList(3));

    expect(listRef.current!.getState().listTotalSize).toBe(120);
    expect(renderedIds(container)).toEqual(['0', '1', '2']);

    unmount(container);
  });

  it('事件回调被调用', () => {
    const onScroll = vi.fn();
    const onToTop = vi.fn();
    const onToBottom = vi.fn();
    const onUpdate = vi.fn();
    const onItemResize = vi.fn();
    const { container, clientEl } = mount({
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

    flushResize('0', 88);
    expect(onItemResize).toHaveBeenCalledWith('0', 88);

    unmount(container);
  });

  it('卸载后清空容器', () => {
    const { container } = mount();

    unmount(container);

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
