/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';
import { VirtGrid } from '../src/VirtGrid';
import { VirtTree } from '../src/tree';
import type { VirtScrollEvent } from '@virt-list/core';

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
});

/** jsdom 没有布局，视口尺寸只能由观察器上报 */
function reportClientSize(size: number) {
  const target = document.createElement('div');
  target.dataset.id = 'client';
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

function makeContainer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

/*
 * core 派发的 scroll 事件要一路透传到使用方，中间三层（List / Grid / Tree）
 * 各自都得转发。转发是一行代码，但漏掉任何一层都只有用的人会发现。
 */
describe('scroll 事件透传到 DOM 层', () => {
  it('VirtList 把载荷原样交给外部', () => {
    const scroll = vi.fn<(e: VirtScrollEvent) => void>();
    const vl = new VirtList<Item>(
      makeContainer(),
      {
        list: makeList(50),
        itemKey: 'id',
        itemPreSize: 40,
        fixed: true,
        renderItem: (item, _i, el) => {
          el.textContent = item.text;
        },
      } as any,
      { scroll },
    );
    reportClientSize(200);
    scroll.mockClear();

    vl.core.scrollFromUser(400);

    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.calls[0]![0]).toMatchObject({
      offset: 400,
      delta: 400,
      direction: 'end',
      source: 'user',
      clientSize: 200,
      scrollSize: 2000,
      maxOffset: 1800,
    });
  });

  it('VirtGrid 转发 scroll', () => {
    const scroll = vi.fn<(e: VirtScrollEvent) => void>();
    const grid = new VirtGrid<Item>(
      makeContainer(),
      {
        list: makeList(60),
        gridItems: 3,
        itemKey: 'id',
        itemPreSize: 40,
        fixed: true,
        renderItem: (item: Item, _r, _l, el: HTMLElement) => {
          el.textContent = item.text;
        },
      } as any,
      { scroll },
    );
    reportClientSize(200);
    scroll.mockClear();

    grid.core.scrollFromUser(200);

    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.calls[0]![0]).toMatchObject({
      offset: 200,
      source: 'user',
    });
  });

  it('VirtTree 转发 scroll', () => {
    const scroll = vi.fn<(e: VirtScrollEvent) => void>();
    const tree = new VirtTree(
      makeContainer(),
      {
        list: makeList(50).map((item) => ({ ...item, label: item.text })),
        itemPreSize: 32,
        fixed: true,
      } as any,
      { scroll },
    );
    reportClientSize(200);
    scroll.mockClear();

    tree.core.scrollFromUser(320);

    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.calls[0]![0]).toMatchObject({
      offset: 320,
      source: 'user',
    });
  });
});
