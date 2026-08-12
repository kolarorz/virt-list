import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, createRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { VirtList, VirtGrid } from '../src/index';

/**
 * 锁「同一个 key 换了新对象后内容跟着更新」，与 vue / vue2 / react 三个包的
 * 同名用例对齐。
 *
 * 与 MountRefresh.test.ts 的分工：那条锁的是「宿主 state 变了、`props.list`
 * 引用没变」，由宿主渲染后的 `flushMounts()` 兜住。这条锁的是数据本身变了，
 * 走 core 的 `updateItem` 通道 —— 命令式 `ref.setList(...)` 时宿主不重渲染，
 * 只有这条通道能刷到。
 */

interface Item {
  id: number;
  label: string;
}

const CLIENT_SIZE = 400;
const ITEM_SIZE = 40;

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = {
  cb: null,
  targets: new Set(),
};
const OriginalRO = globalThis.ResizeObserver;

beforeEach(() => {
  ro.cb = null;
  ro.targets = new Set();
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      ro.cb = cb;
    }
    observe(el: Element) {
      ro.targets.add(el);
    }
    unobserve(el: Element) {
      ro.targets.delete(el);
    }
    disconnect() {
      ro.targets.clear();
    }
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function measure() {
  act(() => {
    const entries = Array.from(ro.targets).map((el) => {
      const id = (el as HTMLElement).dataset.id ?? '';
      const size = id === 'client' ? CLIENT_SIZE : ITEM_SIZE;
      return {
        target: el,
        borderBoxSize: [{ blockSize: size, inlineSize: size }],
        contentRect: { height: size, width: size },
      } as unknown as ResizeObserverEntry;
    });
    ro.cb?.(entries, {} as ResizeObserver);
  });
}

function texts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.cell')).map(
    (el) => el.textContent ?? '',
  );
}

function makeList(n: number, prefix = '原始'): Item[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, label: `${prefix}${i}` }));
}

describe('React 16-17 VirtList 不可变更新', () => {
  it('list.map 出全新对象后，可见项内容更新', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let setList: (l: Item[]) => void = () => {};

    function Host() {
      const [list, set] = useState<Item[]>(() => makeList(30));
      setList = set;
      return createElement(VirtList as any, {
        list,
        itemKey: 'id',
        estimatedSize: ITEM_SIZE,
        children: ({ itemData }: { itemData: Item }) =>
          createElement('div', { className: 'cell' }, itemData.label),
      });
    }

    act(() => {
      ReactDOM.render(createElement(Host), container);
    });
    measure();
    measure();

    expect(texts(container)).toContain('原始0');

    act(() => {
      setList(
        makeList(30).map((it) =>
          it.id === 0 ? { ...it, label: '改过了' } : it,
        ),
      );
    });

    expect(texts(container)).toContain('改过了');
    expect(texts(container)).not.toContain('原始0');

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
  });

  it('通过 ref 命令式 setList 时内容也更新', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const listRef = createRef<any>();

    function Host() {
      return createElement(VirtList as any, {
        ref: listRef,
        list: makeList(30),
        itemKey: 'id',
        estimatedSize: ITEM_SIZE,
        children: ({ itemData }: { itemData: Item }) =>
          createElement('div', { className: 'cell' }, itemData.label),
      });
    }

    act(() => {
      ReactDOM.render(createElement(Host), container);
    });
    measure();
    measure();

    expect(texts(container)).toContain('原始0');

    act(() => {
      listRef.current.setList(makeList(30, '命令式'));
    });

    expect(texts(container)).toContain('命令式0');
    expect(texts(container)).not.toContain('原始0');

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
  });
});

describe('React 16-17 VirtGrid 删除中间项', () => {
  /**
   * 单元格容器按位置复用，mountKey 因此也按位置取。用数据 key 的话，删掉中间一项后
   * 「item-2 的内容」要渲染进「原来 item-1 的容器」，挂载器会卸载记录里那个元素、
   * 再重新挂载当前这个 —— 内容看着对，但每次删除都白白重建一批挂载点
   * （组件内部 state 与动画全丢）。
   */
  it('删除后内容前移，且挂载点被复用', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let setList: (l: Item[]) => void = () => {};

    function Host() {
      const [list, set] = useState<Item[]>(() => makeList(9));
      setList = set;
      return createElement(VirtGrid as any, {
        list,
        gridItems: 3,
        itemKey: 'id',
        estimatedSize: ITEM_SIZE,
        children: ({ itemData }: { itemData: Item }) =>
          createElement('div', { className: 'cell' }, `[${itemData.id}]`),
      });
    }

    act(() => {
      ReactDOM.render(createElement(Host), container);
    });
    measure();
    measure();

    expect(texts(container).join('')).toBe('[0][1][2][3][4][5][6][7][8]');
    const secondCell = container.querySelectorAll('.cell')[1]!.parentElement;

    act(() => {
      setList(makeList(9).filter((it) => it.id !== 1));
    });

    expect(texts(container).join('')).toBe('[0][2][3][4][5][6][7][8]');
    expect(container.querySelectorAll('.cell')[1]!.parentElement).toBe(secondCell);

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
  });
});

describe('React 16-17 VirtGrid 不可变更新', () => {
  it('单元格内容跟着更新', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let setList: (l: Item[]) => void = () => {};

    function Host() {
      const [list, set] = useState<Item[]>(() => makeList(9));
      setList = set;
      return createElement(VirtGrid as any, {
        list,
        gridItems: 3,
        itemKey: 'id',
        estimatedSize: ITEM_SIZE,
        children: ({ itemData }: { itemData: Item }) =>
          createElement('div', { className: 'cell' }, itemData.label),
      });
    }

    act(() => {
      ReactDOM.render(createElement(Host), container);
    });
    measure();
    measure();

    expect(texts(container)).toContain('原始0');

    act(() => {
      setList(makeList(9, '改过'));
    });

    expect(texts(container)).toContain('改过0');
    expect(texts(container)).not.toContain('原始0');

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
  });
});
