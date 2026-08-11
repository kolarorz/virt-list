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
    estimatedSize: 32,
    fixedSize: true,
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
    const { tree } = mount();

    tree.scrollTo({ offset: 96 });

    expect(tree.getOffset()).toBe(96);
  });

  it('offset 为负时忽略，转而按 key 处理', () => {
    const { tree } = mount();

    tree.scrollTo({ offset: -1, key: '10', align: 'start' });

    expect(tree.getOffset()).toBe(320);
  });

  it('align:"start" 把目标节点顶到视口顶部', () => {
    const { tree } = mount();

    tree.scrollTo({ key: '8', align: 'start' });

    // 全部折叠时可见列表就是 20 个根节点，第 8 个 → 8 * 32
    expect(tree.getOffset()).toBe(256);
  });

  it('align:"nearest" 对已可见的节点不滚动', () => {
    const { tree } = mount();

    tree.scrollTo({ key: '1', align: 'nearest' });

    expect(tree.getOffset()).toBe(0);
  });

  it('align:"nearest" 把视口外的节点带进视口', () => {
    const { tree } = mount();

    tree.scrollTo({ key: '15', align: 'nearest' });

    expect(tree.getOffset()).toBeGreaterThan(0);
  });

  it('缺省 align 时按 nearest 处理', () => {
    const { tree } = mount();

    tree.scrollTo({ key: '15' });

    expect(tree.getOffset()).toBeGreaterThan(0);
  });

  it('目标是折叠着的子节点时先展开祖先再定位', () => {
    const { container, tree } = mount();
    expect(visibleKeys(container)).not.toContain('3-1');

    tree.scrollTo({ key: '3-1', align: 'start' });

    // 第 3 个根节点被展开，3-1 是可见列表里的第 5 项（0,1,2,3,3-0,3-1）
    expect(tree.getOffset()).toBe(5 * 32);
    expect(tree.hasExpanded(tree.getTreeNode('3')!)).toBe(true);
  });

  it('key 不存在时静默返回', () => {
    const { tree } = mount();

    expect(() => tree.scrollTo({ key: 'nope', align: 'start' })).not.toThrow();
    expect(tree.getOffset()).toBe(0);
  });

  it('既没有 key 也没有 offset 时什么都不做', () => {
    const { tree } = mount();

    tree.scrollTo({});

    expect(tree.getOffset()).toBe(0);
  });

  it('behavior:"smooth" 走分帧动画', () => {
    vi.useFakeTimers();
    const { tree } = mount();

    tree.scrollTo({ key: '15', align: 'start', behavior: 'smooth', duration: 100 });
    expect(tree.getOffset()).toBe(0);

    vi.advanceTimersByTime(200);

    expect(tree.getOffset()).toBe(15 * 32);
  });

  it('smooth 动画可被 cancelScroll 中断', () => {
    vi.useFakeTimers();
    const { tree } = mount();

    tree.scrollTo({ key: '19', align: 'start', behavior: 'smooth', duration: 200 });
    vi.advanceTimersByTime(32);
    tree.cancelScroll();
    const stopped = tree.getOffset();

    vi.advanceTimersByTime(400);

    expect(tree.getOffset()).toBe(stopped);
  });
});

describe('VirtTree scrollToKey / scrollKeyIntoView', () => {
  it('scrollToKey 无论是否可见都定位到节点顶部', () => {
    const { tree } = mount();

    // 第 1 个节点本来就完整可见，scrollKeyIntoView 会按兵不动，这个不会
    tree.scrollToKey('1');

    expect(tree.getOffset()).toBe(32);
  });

  it('scrollToKey 接受 align:"end"，把节点底部对齐视口底部', () => {
    const { tree } = mount();

    tree.scrollToKey('10', { align: 'end' });
    const end = tree.getOffset();

    tree.scrollToKey('10', { align: 'start' });
    // 底部对齐比顶部对齐更靠前（少滚一屏多一点）
    expect(end).toBeLessThan(tree.getOffset());
  });

  it('scrollKeyIntoView 对已完整可见的节点不动', () => {
    const { tree } = mount();

    tree.scrollKeyIntoView('1');

    expect(tree.getOffset()).toBe(0);
  });

  it('scrollKeyIntoView 把视口外的节点带进来', () => {
    const { tree } = mount();

    tree.scrollKeyIntoView('15');

    expect(tree.getOffset()).toBeGreaterThan(0);
  });

  it('两者都会先展开折叠节点的祖先', () => {
    const { tree } = mount();

    tree.scrollToKey('3-1');
    expect(tree.hasExpanded(tree.getTreeNode('3')!)).toBe(true);
  });

  it('key 不存在时静默返回', () => {
    const { tree } = mount();

    expect(() => tree.scrollToKey('nope')).not.toThrow();
    expect(() => tree.scrollKeyIntoView('nope')).not.toThrow();
    expect(tree.getOffset()).toBe(0);
  });

  it('scrollToOffset 直接落到给定偏移', () => {
    const { tree } = mount();

    tree.scrollToOffset(96);

    expect(tree.getOffset()).toBe(96);
  });
});

describe('VirtTree scrollToTop / scrollToBottom', () => {
  it('scrollToBottom 到达底部', () => {
    vi.useFakeTimers();
    const { tree } = mount();

    tree.scrollToBottom();

    // 20 行 × 32 = 640，停在可滚动上限（总高 - 可视高度 160）
    expect(tree.getOffset()).toBe(640 - 160);
    vi.runAllTimers();
  });

  it('scrollToTop 归零', () => {
    vi.useFakeTimers();
    const { tree } = mount();
    tree.scrollTo({ offset: 300 });

    tree.scrollToTop();
    vi.runAllTimers();

    expect(tree.getOffset()).toBe(0);
  });

  it('smooth 版本分帧到达顶部', () => {
    vi.useFakeTimers();
    const { tree } = mount();
    tree.scrollTo({ offset: 400 });

    tree.scrollToTop({ behavior: 'smooth', duration: 100 });
    vi.advanceTimersByTime(200);

    expect(tree.getOffset()).toBe(0);
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
    const { tree } = mount();

    tree.expandAll(true);
    tree.scrollToBottom();

    // 20 + 60 = 80 行 × 32
    // 停在可滚动上限：总高 80 × 32，减去可视高度 160
    expect(tree.getOffset()).toBe(80 * 32 - 160);
    vi.runAllTimers();
  });
});
