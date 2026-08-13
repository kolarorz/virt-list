/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';
import { VirtTree } from '../src/tree/VirtTree';
import type { VirtTreeDOMOptions } from '../src/tree/types';

/**
 * 响应式更新与滚动的性能契约。
 *
 * 这里断言的都是「做了多少次」而不是「跑了多少毫秒」——耗时随机器波动，
 * 次数不会。三条：
 *
 * 1. 一次数据变更只把可见项过一遍（`updateItem` 每项恰好一次）。core 侧的通知
 *    合并见 core 的 `ListChangeNotify.test.ts`，这里锁的是 DOM 层的落点。
 * 2. 滚动帧上不读几何量。`_applyLayout` 每帧写完各段 transform 之后如果再读
 *    `getBoundingClientRect`，浏览器为了给出准确矩形必须立刻重算布局，
 *    就是每帧一次强制同步回流（读写交替）。
 * 3. Tree 的一次数据变更只重建一遍可见节点。它的 `setList` 会清空渲染池，
 *    如果之后再走一次 `forceUpdate`，同一批节点就要连建两遍。
 */

interface Item {
  id: number;
  label: string;
}

const OriginalRO = globalThis.ResizeObserver;
let roCallback: ResizeObserverCallback | null = null;

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
  document.elementFromPoint = (() => null) as any;
  document.body.innerHTML = '';
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
});

/** 统计一段代码里 getBoundingClientRect 被调用了多少次 */
function countReflows(fn: () => void): number {
  let calls = 0;
  const orig = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    calls += 1;
    return orig.call(this);
  };
  try {
    fn();
  } finally {
    Element.prototype.getBoundingClientRect = orig;
  }
  return calls;
}

describe('数据变更只把可见项过一遍', () => {
  let host: HTMLElement;
  let vl: VirtList<Item>;
  let list: Item[];
  let updateCalls: number[];

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    list = Array.from({ length: 200 }, (_, i) => ({ id: i, label: `原始 ${i}` }));
    updateCalls = [];
    vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item, _i, el) => {
        el.textContent = item.label;
      },
      updateItem: (item, _i, el) => {
        updateCalls.push(item.id);
        el.textContent = item.label;
      },
    });
  });

  afterEach(() => {
    vl?.destroy();
  });

  /** 当前渲染出来的项的 key */
  function visibleKeys(): string[] {
    return [...vl.clientEl.querySelectorAll<HTMLElement>('[data-id]')]
      .map((el) => el.dataset.id!)
      .filter((k) => /^\d+$/.test(k));
  }

  it('尾部追加：每个可见项恰好一次 updateItem', () => {
    const visible = visibleKeys();
    updateCalls = [];

    vl.setList([...list, { id: 999, label: '新' }]);

    expect(updateCalls.map(String).sort()).toEqual([...visible].sort());
  });

  it('整体换新：每个可见项恰好一次 updateItem', () => {
    const visible = visibleKeys();
    updateCalls = [];

    vl.setList(list.map((it) => ({ ...it, label: `改 ${it.id}` })));

    expect(updateCalls.map(String).sort()).toEqual([...visible].sort());
  });

  it('头部插入：每个复用项恰好一次 updateItem', () => {
    const visibleCount = visibleKeys().length;
    updateCalls = [];

    vl.setList([{ id: 1001, label: 'a' }, { id: 1002, label: 'b' }, ...list]);

    // 新插入的两项走 renderItem，复用的那些各更新一次
    expect(updateCalls).toHaveLength(visibleCount);
    expect(new Set(updateCalls).size).toBe(updateCalls.length);
  });
});

describe('滚动帧不读几何量', () => {
  it('连续滚动不触发 getBoundingClientRect', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const list = Array.from({ length: 500 }, (_, i) => ({
      id: i,
      label: `原始 ${i}`,
    }));
    const vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item, _i, el) => {
        el.textContent = item.label;
      },
    });

    const reflows = countReflows(() => {
      for (let i = 0; i < 10; i += 1) vl.core.scrollFromUser(400 + i * 40);
    });

    expect(reflows).toBe(0);
    vl.destroy();
  });

  it('数据变更也不读几何量', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const list = Array.from({ length: 500 }, (_, i) => ({
      id: i,
      label: `原始 ${i}`,
    }));
    const vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item, _i, el) => {
        el.textContent = item.label;
      },
      updateItem: (item, _i, el) => {
        el.textContent = item.label;
      },
    });

    const reflows = countReflows(() => {
      vl.setList([...list, { id: 999, label: '新' }]);
    });

    expect(reflows).toBe(0);
    vl.destroy();
  });

  it('容器尺寸变化后会重新测量轨道（缓存按视口尺寸失效）', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const list = Array.from({ length: 500 }, (_, i) => ({ id: i, label: `${i}` }));
    const vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: () => {},
    });

    // 先让缓存建立起来
    vl.core.scrollFromUser(400);

    const reflows = countReflows(() => {
      vl.core.setClientSize(600);
    });

    expect(reflows).toBeGreaterThan(0);
    vl.destroy();
  });
});

describe('Tree 的一次数据变更只重建一遍可见节点', () => {
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

  function mount(renderCount: { n: number }) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const nodes = Array.from({ length: 60 }, (_, i) => ({
      key: `${i}`,
      title: `节点 ${i}`,
    }));
    const tree = new VirtTree(
      container,
      {
        list: nodes,
        estimatedSize: 32,
        indent: 16,
        iconSize: 16,
        renderNode: (node: any, _expanded: boolean, el: HTMLElement) => {
          renderCount.n += 1;
          el.textContent = node.data.title;
        },
      } as unknown as VirtTreeDOMOptions,
      {},
    );
    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    Object.defineProperty(clientEl, 'scrollTop', {
      writable: true,
      configurable: true,
      value: 0,
    });
    flushResize('client', 400);
    return { container, tree, nodes };
  }

  it('setList 后每个可见节点只 renderNode 一次', () => {
    const count = { n: 0 };
    const { container, tree, nodes } = mount(count);
    const visible = container.querySelectorAll('.virt-tree-item').length;
    expect(visible).toBeGreaterThan(1);
    count.n = 0;

    tree.setList(nodes.map((n) => (n.key === '0' ? { ...n, title: '改过了' } : n)));

    expect(count.n).toBe(visible);
    tree.destroy();
  });

  it('内容确实更新了（合并通知没有把重建吞掉）', () => {
    const count = { n: 0 };
    const { container, tree, nodes } = mount(count);

    tree.setList(nodes.map((n) => (n.key === '0' ? { ...n, title: '改过了' } : n)));

    expect(container.textContent).toContain('改过了');
    tree.destroy();
  });

  it('展开 / 折叠仍会重建可见节点（那条路要靠重建刷新图标与缩进）', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const count = { n: 0 };
    const nodes = [
      {
        key: 'p',
        title: '父',
        children: [
          { key: 'c1', title: '子 1' },
          { key: 'c2', title: '子 2' },
        ],
      },
    ];
    const tree = new VirtTree(
      container,
      {
        list: nodes,
        estimatedSize: 32,
        indent: 16,
        iconSize: 16,
        renderNode: (node: any, _expanded: boolean, el: HTMLElement) => {
          count.n += 1;
          el.textContent = node.data.title;
        },
      } as unknown as VirtTreeDOMOptions,
      {},
    );
    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    Object.defineProperty(clientEl, 'scrollTop', {
      writable: true,
      configurable: true,
      value: 0,
    });
    flushResize('client', 400);
    count.n = 0;

    tree.expandNode('p', true);

    // 父节点的展开图标要转过来，子节点要出现：两者都得重出内容
    expect(count.n).toBeGreaterThan(0);
    expect(container.textContent).toContain('子 1');
    tree.destroy();
  });
});
