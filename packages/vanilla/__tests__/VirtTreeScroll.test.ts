import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtTree } from '../src/tree/VirtTree';
import type { VirtTreeDOMOptions } from '../src/tree/types';

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

/** 20 个根节点，每个 3 个子节点 */
function makeTree(rootCount = 20, childCount = 3) {
  return Array.from({ length: rootCount }, (_, i) => ({
    key: `${i}`,
    title: `Node-${i}`,
    children: Array.from({ length: childCount }, (_, j) => ({
      key: `${i}-${j}`,
      title: `Node-${i}-${j}`,
    })),
  }));
}

/** 行高 32px、视口 160px（5 行）、buffer 0 的树 */
function mount(options: Partial<VirtTreeDOMOptions> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const tree = new VirtTree(container, {
    list: makeTree(),
    itemPreSize: 32,
    fixed: true,
    buffer: 0,
    indent: 16,
    iconSize: 16,
    ...options,
  } as VirtTreeDOMOptions);

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 160);

  return { container, tree, clientEl };
}

function visibleKeys(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.virt-tree-item')).map(
    (el) => (el as HTMLElement).dataset.id!,
  );
}

describe('VirtTree scrollTo', () => {
  it('offset 优先，直接落到给定偏移', () => {
    const { tree, clientEl } = mount();

    tree.scrollTo({ offset: 96 });

    expect(clientEl.scrollTop).toBe(96);
  });

  it('offset 为负时忽略，转而按 key 处理', () => {
    const { tree, clientEl } = mount();

    tree.scrollTo({ offset: -1, key: '10', align: 'top' });

    expect(clientEl.scrollTop).toBe(320);
  });

  it('align:"top" 把目标节点顶到视口顶部', () => {
    const { tree, clientEl } = mount();

    tree.scrollTo({ key: '8', align: 'top' });

    // 全部折叠时可见列表就是 20 个根节点，第 8 个 → 8 * 32
    expect(clientEl.scrollTop).toBe(256);
  });

  it('align:"view" 对已可见的节点不滚动', () => {
    const { tree, clientEl } = mount();

    tree.scrollTo({ key: '1', align: 'view' });

    expect(clientEl.scrollTop).toBe(0);
  });

  it('align:"view" 把视口外的节点带进视口', () => {
    const { tree, clientEl } = mount();

    tree.scrollTo({ key: '15', align: 'view' });

    expect(clientEl.scrollTop).toBeGreaterThan(0);
  });

  it('缺省 align 时按 view 处理', () => {
    const { tree, clientEl } = mount();

    tree.scrollTo({ key: '15' });

    expect(clientEl.scrollTop).toBeGreaterThan(0);
  });

  it('目标是折叠着的子节点时先展开祖先再定位', () => {
    const { container, tree, clientEl } = mount();
    expect(visibleKeys(container)).not.toContain('3-1');

    tree.scrollTo({ key: '3-1', align: 'top' });

    // 第 3 个根节点被展开，3-1 是可见列表里的第 5 项（0,1,2,3,3-0,3-1）
    expect(clientEl.scrollTop).toBe(5 * 32);
    expect(tree.hasExpanded(tree.getTreeNode('3')!)).toBe(true);
  });

  it('key 不存在时静默返回', () => {
    const { tree, clientEl } = mount();

    expect(() => tree.scrollTo({ key: 'nope', align: 'top' })).not.toThrow();
    expect(clientEl.scrollTop).toBe(0);
  });

  it('既没有 key 也没有 offset 时什么都不做', () => {
    const { tree, clientEl } = mount();

    tree.scrollTo({});

    expect(clientEl.scrollTop).toBe(0);
  });

  it('behavior:"smooth" 走分帧动画', () => {
    vi.useFakeTimers();
    const { tree, clientEl } = mount();

    tree.scrollTo({ key: '15', align: 'top', behavior: 'smooth', duration: 100 });
    expect(clientEl.scrollTop).toBe(0);

    vi.advanceTimersByTime(200);

    expect(clientEl.scrollTop).toBe(15 * 32);
  });

  it('smooth 动画可被 cancelScroll 中断', () => {
    vi.useFakeTimers();
    const { tree, clientEl } = mount();

    tree.scrollTo({ key: '19', align: 'top', behavior: 'smooth', duration: 200 });
    vi.advanceTimersByTime(32);
    tree.cancelScroll();
    const stopped = clientEl.scrollTop;

    vi.advanceTimersByTime(400);

    expect(clientEl.scrollTop).toBe(stopped);
  });
});

describe('VirtTree scrollToTop / scrollToBottom', () => {
  it('scrollToBottom 到达底部', () => {
    vi.useFakeTimers();
    const { tree, clientEl } = mount();

    tree.scrollToBottom();

    // 20 行 × 32 = 640，停在可滚动上限（总高 - 可视高度 160）
    expect(clientEl.scrollTop).toBe(640 - 160);
    vi.runAllTimers();
  });

  it('scrollToTop 归零', () => {
    vi.useFakeTimers();
    const { tree, clientEl } = mount();
    tree.scrollTo({ offset: 300 });

    tree.scrollToTop();
    vi.runAllTimers();

    expect(clientEl.scrollTop).toBe(0);
  });

  it('smooth 版本分帧到达顶部', () => {
    vi.useFakeTimers();
    const { tree, clientEl } = mount();
    tree.scrollTo({ offset: 400 });

    tree.scrollToTop({ behavior: 'smooth', duration: 100 });
    vi.advanceTimersByTime(200);

    expect(clientEl.scrollTop).toBe(0);
  });
});

describe('VirtTree 展开导致的可见列表变化', () => {
  it('展开节点后可见列表插入子节点', () => {
    const { container, tree } = mount();
    expect(visibleKeys(container).slice(0, 3)).toEqual(['0', '1', '2']);

    tree.expandNode('0', true);

    expect(visibleKeys(container).slice(0, 4)).toEqual([
      '0',
      '0-0',
      '0-1',
      '0-2',
    ]);
  });

  it('折叠后子节点从可见列表移除', () => {
    const { container, tree } = mount();
    tree.expandNode('0', true);

    tree.expandNode('0', false);

    expect(visibleKeys(container)).not.toContain('0-0');
  });

  it('expandAll 后总可见行数 = 根 + 全部子节点', () => {
    vi.useFakeTimers();
    const { tree, clientEl } = mount();

    tree.expandAll(true);
    tree.scrollToBottom();

    // 20 + 60 = 80 行 × 32
    // 停在可滚动上限：总高 80 × 32，减去可视高度 160
    expect(clientEl.scrollTop).toBe(80 * 32 - 160);
    vi.runAllTimers();
  });
});
