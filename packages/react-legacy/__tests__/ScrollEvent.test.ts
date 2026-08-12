/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, createRef } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { VirtList, VirtGrid, VirtTree } from '../src/index';
import type { VirtScrollEvent } from '../src/index';

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

const OriginalRO = globalThis.ResizeObserver;

beforeEach(() => {
  globalThis.ResizeObserver = class {
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

/** React 16/17 用 ReactDOM.render 挂载 */
function mount(component: any, props: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const onScroll = vi.fn<(e: VirtScrollEvent) => void>();
  const instRef = createRef<any>();

  act(() => {
    ReactDOM.render(
      createElement(component, { ref: instRef, onScroll, ...props }),
      container,
    );
  });

  return { container, onScroll, instRef };
}

/*
 * onScroll 与 React 的合成滚动事件同名，但组件只把 style / className 交给根 div、
 * 事件 props 一律不透传，所以这里收到的必须是我们自己的载荷（普通对象），
 * 而不是 React 的 SyntheticEvent。
 */
describe('React 17: onScroll', () => {
  it('VirtList 触发 onScroll，载荷是普通对象而不是 Event', () => {
    const { container, onScroll, instRef } = mount(VirtList, {
      list: makeList(50),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderItem: (item: Item, _i: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });
    onScroll.mockClear();

    act(() => {
      instRef.current.scrollFromUser(400);
    });

    expect(onScroll).toHaveBeenCalledTimes(1);
    const e = onScroll.mock.calls[0]![0];
    expect(e).not.toBeInstanceOf(Event);
    expect(e).toMatchObject({ offset: 400, direction: 'end', source: 'user' });

    ReactDOM.unmountComponentAtNode(container);
  });

  it('VirtGrid 触发 onScroll', () => {
    const { container, onScroll, instRef } = mount(VirtGrid, {
      list: makeList(60),
      gridItems: 3,
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });
    onScroll.mockClear();

    act(() => {
      instRef.current.scrollFromUser(200);
    });

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0]![0]).toMatchObject({
      offset: 200,
      source: 'user',
    });

    ReactDOM.unmountComponentAtNode(container);
  });

  it('VirtTree 触发 onScroll', () => {
    const { container, onScroll, instRef } = mount(VirtTree, {
      list: makeList(50).map((item) => ({ ...item, label: item.text })),
      estimatedSize: 32,
      fixedSize: true,
    });
    onScroll.mockClear();

    act(() => {
      instRef.current.scrollFromUser(320);
    });

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0]![0]).toMatchObject({
      offset: 320,
      source: 'user',
    });

    ReactDOM.unmountComponentAtNode(container);
  });
});

/*
 * clientEl 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。
 * 它必须是那个 data-id="client" 的 scrollport，不是组件根元素——
 * 原生 scroll 不冒泡，挂错地方就永远收不到。
 */
describe('React 17: clientEl 逃生舱', () => {
  it('指向 scrollport 而不是根元素', () => {
    const { instRef } = mount(VirtList, {
      list: makeList(50),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderItem: (item: Item, _i: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });

    const clientEl = instRef.current.clientEl as HTMLElement;
    expect(clientEl).toBeTruthy();
    expect(clientEl.dataset.id).toBe('client');

    // 交叉轴的 scrollport 是它的子节点：横向滚动位置在那上面读写
    const cross = instRef.current.scrollContentEl as HTMLElement;
    expect(cross.parentElement).toBe(clientEl);
    expect(cross.style.overflowX).toBe('auto');
  });
});
