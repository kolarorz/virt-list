/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  VirtList,
  VirtGrid,
  VirtTree,
  type VirtListRef,
  type VirtGridRef,
  type VirtTreeRef,
  type VirtScrollEvent,
} from '../src/index';

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

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

afterEach(() => {
  document.body.innerHTML = '';
});

/*
 * onScroll 与 React 的合成滚动事件同名，但组件只把 style / className 交给根 div、
 * 事件 props 一律不透传，所以这里收到的必须是我们自己的载荷（普通对象），
 * 而不是 React 的 SyntheticEvent。
 */
describe('React: onScroll', () => {
  async function mount(component: any, props: Record<string, unknown>) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const onScroll = vi.fn<(e: VirtScrollEvent) => void>();
    const instRef = createRef<any>();
    const root: Root = createRoot(container);

    await act(async () => {
      root.render(createElement(component, { ref: instRef, onScroll, ...props }));
    });

    return { root, onScroll, instRef };
  }

  it('VirtList 触发 onScroll，载荷是普通对象而不是 Event', async () => {
    const { root, onScroll, instRef } = await mount(VirtList<Item>, {
      list: makeList(50),
      itemKey: 'id',
      itemPreSize: 40,
      fixed: true,
      renderItem: (item: Item, _i: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });
    onScroll.mockClear();

    await act(async () => {
      (instRef.current as VirtListRef<Item>).scrollFromUser(400);
    });

    expect(onScroll).toHaveBeenCalledTimes(1);
    const e = onScroll.mock.calls[0]![0];
    expect(e).not.toBeInstanceOf(Event);
    expect(e).toMatchObject({ offset: 400, direction: 'end', source: 'user' });

    await act(async () => root.unmount());
  });

  it('VirtGrid 触发 onScroll', async () => {
    const { root, onScroll, instRef } = await mount(VirtGrid, {
      list: makeList(60),
      gridItems: 3,
      itemKey: 'id',
      itemPreSize: 40,
      fixed: true,
      renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });
    onScroll.mockClear();

    await act(async () => {
      (instRef.current as VirtGridRef).scrollFromUser(200);
    });

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0]![0]).toMatchObject({
      offset: 200,
      source: 'user',
    });

    await act(async () => root.unmount());
  });

  it('VirtTree 触发 onScroll', async () => {
    const { root, onScroll, instRef } = await mount(VirtTree, {
      list: makeList(50).map((item) => ({ ...item, label: item.text })),
      itemPreSize: 32,
      fixed: true,
    });
    onScroll.mockClear();

    await act(async () => {
      (instRef.current as VirtTreeRef).scrollFromUser(320);
    });

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0]![0]).toMatchObject({
      offset: 320,
      source: 'user',
    });

    await act(async () => root.unmount());
  });
});
