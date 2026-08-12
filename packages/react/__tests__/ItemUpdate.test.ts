import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, createRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VirtList, VirtGrid } from '../src/index';

/**
 * 锁「同一个 key 换了新对象后内容跟着更新」。
 *
 * 与 MountRefresh.test.ts 的分工：那条锁的是「宿主 state 变了、`props.list`
 * 引用没变」，由宿主渲染后的 `flushMounts()` 兜住。这条锁的是数据本身变了，
 * 走的是 core 的 `updateItem` 通道 —— 尤其是**命令式** `ref.setList(...)`：
 * 宿主根本不重渲染，`flushMounts()` 不会跑，只有这条通道能刷到。
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
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
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

async function measure() {
  await act(async () => {
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

async function unmount(root: Root) {
  await act(async () => {
    root.unmount();
  });
  await act(async () => {});
}

function texts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.cell')).map(
    (el) => el.textContent ?? '',
  );
}

function makeList(n: number, prefix = '原始'): Item[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, label: `${prefix}${i}` }));
}

describe('React VirtList 不可变更新', () => {
  it('list.map 出全新对象后，可见项内容更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

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

    await act(async () => {
      root.render(createElement(Host));
    });
    await measure();
    await measure();

    expect(texts(container)).toContain('原始0');

    await act(async () => {
      setList(
        makeList(30).map((it) =>
          it.id === 0 ? { ...it, label: '改过了' } : it,
        ),
      );
    });

    expect(texts(container)).toContain('改过了');
    expect(texts(container)).not.toContain('原始0');

    await unmount(root);
  });

  /**
   * 命令式 setList：宿主不重渲染，`flushMounts()` 那条路完全不会跑。
   * 内容能更新只可能来自 core 的 updateItem 通道。
   */
  it('通过 ref 命令式 setList 时内容也更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
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

    await act(async () => {
      root.render(createElement(Host));
    });
    await measure();
    await measure();

    expect(texts(container)).toContain('原始0');

    await act(async () => {
      listRef.current.setList(makeList(30, '命令式'));
    });

    expect(texts(container)).toContain('命令式0');
    expect(texts(container)).not.toContain('原始0');

    await unmount(root);
  });
});

describe('React VirtGrid 删除中间项', () => {
  /**
   * 单元格容器按位置复用，所以 mountKey 也必须按位置。
   *
   * 用数据 key 的话，删掉中间一项后「item-2 的内容」要渲染进「原来 item-1 的容器」，
   * 挂载器发现记录里那个 key 对应的是别的元素，就会卸载它、再对当前元素重复
   * createRoot —— 内容看着是对的，但每次删除都刷一串 React 警告并白白重建一批 root
   * （组件内部 state 与动画全丢）。这条用例锁住「安静地原地更新」。
   */
  it('删除后内容前移，且不重建挂载点（无 React 警告）', async () => {
    const warnings: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(String(args[0]));
    });
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      warnings.push(String(args[0]));
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

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

    await act(async () => {
      root.render(createElement(Host));
    });
    await measure();
    await measure();

    expect(texts(container).join('')).toBe('[0][1][2][3][4][5][6][7][8]');
    // 第二格的容器：删除后它要装 item-2，元素本身必须被复用
    const secondCell = container.querySelectorAll('.cell')[1]!.parentElement;

    await act(async () => {
      setList(makeList(9).filter((it) => it.id !== 1));
    });

    expect(texts(container).join('')).toBe('[0][2][3][4][5][6][7][8]');
    expect(container.querySelectorAll('.cell')[1]!.parentElement).toBe(secondCell);
    expect(warnings).toEqual([]);

    await unmount(root);
  });
});

describe('React VirtGrid 不可变更新', () => {
  it('单元格内容跟着更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

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

    await act(async () => {
      root.render(createElement(Host));
    });
    await measure();
    await measure();

    expect(texts(container)).toContain('原始0');

    await act(async () => {
      setList(makeList(9, '改过'));
    });

    expect(texts(container)).toContain('改过0');
    expect(texts(container)).not.toContain('原始0');

    await unmount(root);
  });
});
