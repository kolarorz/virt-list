/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtTree } from '../src/tree/VirtTree';
import type { VirtTreeDOMEvents, VirtTreeDOMOptions } from '../src/tree/types';

const OriginalRO = globalThis.ResizeObserver;
const OriginalElementFromPoint = document.elementFromPoint;
let roCallback: ResizeObserverCallback | null = null;
/** 本轮用例挂载出来的树，afterEach 统一销毁 */
let mounted: VirtTree[] = [];

beforeEach(() => {
  roCallback = null;
  mounted = [];
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      roCallback = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // jsdom 没有命中测试，默认让它返回 null（等价于"没悬停在任何节点上"）
  document.elementFromPoint = (() => null) as any;
});

afterEach(() => {
  // 拖拽把监听挂在 document 上，只清 DOM 会让未结束的拖拽串到下一个用例
  for (const tree of mounted) tree.destroy();
  mounted = [];
  globalThis.ResizeObserver = OriginalRO;
  document.elementFromPoint = OriginalElementFromPoint;
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

function makeTree(rootCount = 6, childCount = 2) {
  return Array.from({ length: rootCount }, (_, i) => ({
    key: `${i}`,
    title: `Node-${i}`,
    children: Array.from({ length: childCount }, (_, j) => ({
      key: `${i}-${j}`,
      title: `Node-${i}-${j}`,
    })),
  }));
}

const ROW = 32;

function mount(
  options: Partial<VirtTreeDOMOptions> = {},
  events: VirtTreeDOMEvents = {},
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const tree = new VirtTree(
    container,
    {
      list: makeTree(),
      itemPreSize: ROW,
      fixed: true,
      buffer: 0,
      draggable: true,
      ...options,
    } as VirtTreeDOMOptions,
    events,
  );

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 6 * ROW);

  mounted.push(tree);
  return { container, tree, clientEl };
}

function itemEl(container: HTMLElement, key: string): HTMLElement {
  return container.querySelector(`.virt-tree-item[data-id="${key}"]`)!;
}

function nodeEl(container: HTMLElement, key: string): HTMLElement {
  return itemEl(container, key).querySelector('.virt-tree-node')!;
}

function startDrag(container: HTMLElement, key: string) {
  nodeEl(container, key).dispatchEvent(
    new MouseEvent('dragstart', { bubbles: true }),
  );
}

function mouseMove(x: number, y: number) {
  document.dispatchEvent(
    new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }),
  );
}

function mouseUp() {
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
}

/**
 * 给容器和每个可见项装上一套自洽的几何：第 i 个可见项占据 [i*ROW, (i+1)*ROW)。
 * 拖拽的落点判定完全建立在 getBoundingClientRect 与 elementFromPoint 之上，
 * jsdom 两者都缺，只有喂进坐标才能走到真正的位置计算分支。
 */
function fakeGeometry(container: HTMLElement, clientEl: HTMLElement) {
  const viewportHeight = 6 * ROW;
  clientEl.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      right: 300,
      bottom: viewportHeight,
      width: 300,
      height: viewportHeight,
    }) as DOMRect;

  const items = Array.from(
    container.querySelectorAll('.virt-tree-item'),
  ) as HTMLElement[];
  items.forEach((el, i) => {
    el.getBoundingClientRect = () =>
      ({
        top: i * ROW,
        left: 0,
        right: 300,
        bottom: (i + 1) * ROW,
        width: 300,
        height: ROW,
      }) as DOMRect;
  });

  // 落点命中：按 y 坐标算出第几行，返回该行的内容元素
  document.elementFromPoint = ((_x: number, y: number) => {
    const index = Math.floor(y / ROW);
    const target = items[index];
    return target
      ? target.querySelector('.virt-tree-node-content') ?? target
      : null;
  }) as any;

  return items;
}

describe('VirtTree 拖拽开关', () => {
  it('draggable 为假时节点不可拖', () => {
    const { container } = mount({ draggable: false });

    expect(nodeEl(container, '0').getAttribute('draggable')).toBeNull();
  });

  it('draggable 为真时节点标记为可拖', () => {
    const { container } = mount();

    expect(nodeEl(container, '0').getAttribute('draggable')).toBe('true');
  });

  it('draggable 为假时 dragstart 不产生任何拖拽状态', () => {
    const { container, clientEl } = mount({ draggable: false });

    startDrag(container, '0');
    mouseMove(10, 10);

    expect(clientEl.classList.contains('is-dragging')).toBe(false);
    expect(document.querySelector('.virt-tree-item--ghost')).toBeNull();
  });
});

describe('VirtTree 拖拽生命周期', () => {
  it('首次 mousemove 才真正开始拖拽：建幽灵元素、发 dragstart', () => {
    const dragstart = vi.fn();
    const { container, clientEl } = mount({}, { dragstart });

    startDrag(container, '1');
    // dragstart 事件在拖拽真正开始（第一次移动）时才发出
    expect(dragstart).not.toHaveBeenCalled();

    mouseMove(50, 50);

    expect(dragstart).toHaveBeenCalledTimes(1);
    expect(dragstart.mock.calls[0]![0].sourceNode.key).toBe('1');
    expect(clientEl.classList.contains('is-dragging')).toBe(true);

    const ghost = document.querySelector('.virt-tree-item--ghost') as HTMLElement;
    expect(ghost).toBeTruthy();
    expect(ghost.style.position).toBe('fixed');
    expect(itemEl(container, '1').classList.contains('virt-tree-item--drag')).toBe(
      true,
    );
  });

  it('幽灵元素跟随鼠标位移', () => {
    const { container } = mount();

    startDrag(container, '1');
    mouseMove(0, 0);
    mouseMove(30, 40);

    const ghost = document.querySelector('.virt-tree-item--ghost') as HTMLElement;
    expect(ghost.style.left).toBe('40px');
    expect(ghost.style.top).toBe('50px');
  });

  it('dragClass / dragGhostClass 被应用', () => {
    const { container } = mount({
      dragClass: 'my-drag',
      dragGhostClass: 'my-ghost',
    });

    startDrag(container, '1');
    mouseMove(10, 10);

    expect(itemEl(container, '1').classList.contains('my-drag')).toBe(true);
    expect(document.querySelector('.my-ghost')).toBeTruthy();
  });

  it('拖出被禁止的节点不会开始拖拽', () => {
    const list = makeTree();
    (list[1] as any).disableDragOut = true;
    const dragstart = vi.fn();
    const { container, clientEl } = mount({ list }, { dragstart });

    startDrag(container, '1');
    mouseMove(10, 10);

    expect(dragstart).not.toHaveBeenCalled();
    expect(document.querySelector('.virt-tree-item--ghost')).toBeNull();
    expect(clientEl.classList.contains('is-dragging')).toBe(false);
  });

  it('拖起已展开的节点会先把它折叠（避免拖着整棵子树）', () => {
    const { container, tree } = mount({ expandedKeys: ['1'] });
    expect(tree.hasExpanded(tree.getTreeNode('1')!)).toBe(true);

    startDrag(container, '1');
    mouseMove(10, 10);

    expect(tree.hasExpanded(tree.getTreeNode('1')!)).toBe(false);
  });

  it('没有落到有效目标时 mouseup 以取消结束（dragend 不带数据）', () => {
    const dragend = vi.fn();
    const { container } = mount({}, { dragend });

    startDrag(container, '1');
    mouseMove(10, 10);
    mouseUp();

    expect(dragend).toHaveBeenCalledTimes(1);
    expect(dragend.mock.calls[0]![0]).toBeUndefined();
    expect(document.querySelector('.virt-tree-item--ghost')).toBeNull();
  });

  it('Esc 取消拖拽，同样以 dragend 不带数据结束', () => {
    const dragend = vi.fn();
    const { container, clientEl } = mount({}, { dragend });
    fakeGeometry(container, clientEl);

    startDrag(container, '1');
    // 悬停到一个有效目标，让 dragEffect 立起来
    mouseMove(50, 3 * ROW + 20);

    pressEscape();

    expect(dragend).toHaveBeenCalledTimes(1);
    expect(dragend.mock.calls[0]![0]).toBeUndefined();
  });

  it('mouseup 后下一个宏任务里移除 is-dragging', () => {
    vi.useFakeTimers();
    const { container, clientEl } = mount();

    startDrag(container, '1');
    mouseMove(10, 10);
    mouseUp();
    expect(clientEl.classList.contains('is-dragging')).toBe(true);

    vi.advanceTimersByTime(1);

    expect(clientEl.classList.contains('is-dragging')).toBe(false);
  });

  it('拖拽期间点击图标与复选框不生效', () => {
    const expand = vi.fn();
    const check = vi.fn();
    const { container } = mount({ checkable: true }, { expand, check });

    startDrag(container, '1');
    mouseMove(10, 10);
    expand.mockClear();

    itemEl(container, '1')
      .querySelector('.virt-tree-icon')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    itemEl(container, '2')
      .querySelector('.virt-tree-checkbox')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(expand).not.toHaveBeenCalled();
    expect(check).not.toHaveBeenCalled();
  });

  it('destroy 解绑 document 上的拖拽监听', () => {
    const dragend = vi.fn();
    const { container, tree } = mount({}, { dragend });

    startDrag(container, '1');
    mouseMove(10, 10);
    tree.destroy();

    expect(() => {
      mouseMove(20, 20);
      mouseUp();
      pressEscape();
    }).not.toThrow();
    expect(dragend).not.toHaveBeenCalled();
  });
});

describe('VirtTree 同层级拖放的落点计算', () => {
  /** crossLevelDraggable: false 时只允许同层级同父之间排序 */
  function setupSameLevel(events: VirtTreeDOMEvents) {
    const mounted = mount({ crossLevelDraggable: false }, events);
    fakeGeometry(mounted.container, mounted.clientEl);
    return mounted;
  }

  it('悬停在兄弟节点下半部分时插到它之后', () => {
    const dragend = vi.fn();
    const { container } = setupSameLevel({ dragend });

    startDrag(container, '1');
    // 第 3 行的下半部分（ratio 0.625 > 0.33 → 落在其后）
    mouseMove(50, 3 * ROW + 20);
    mouseUp();

    expect(dragend).toHaveBeenCalledTimes(1);
    const payload = dragend.mock.calls[0]![0]!;
    expect(payload.node.key).toBe('1');
    expect(payload.prevNode?.key).toBe('3');
    expect(payload.parentNode).toBeUndefined();
  });

  it('拖动过程中会画出插入位置指示线', () => {
    const { container } = setupSameLevel({});

    startDrag(container, '1');
    mouseMove(50, 3 * ROW + 20);

    expect(
      itemEl(container, '3').querySelector('.virt-tree-drag-line-same-level'),
    ).toBeTruthy();
  });

  it('悬停回自己身上时不产生落点', () => {
    const dragend = vi.fn();
    const { container } = setupSameLevel({ dragend });

    startDrag(container, '1');
    mouseMove(50, 1 * ROW + 20);
    mouseUp();

    expect(dragend.mock.calls[0]![0]).toBeUndefined();
  });

  it('鼠标移出容器范围时落点失效', () => {
    const dragend = vi.fn();
    const { container } = setupSameLevel({ dragend });

    startDrag(container, '1');
    mouseMove(50, 3 * ROW + 20);
    // 移到容器下方之外
    mouseMove(50, 6 * ROW + 100);
    mouseUp();

    expect(dragend.mock.calls[0]![0]).toBeUndefined();
  });

  it('跨层级被禁止时，悬停到不同层级的节点不产生落点', () => {
    const dragend = vi.fn();
    const { container, tree } = setupSameLevel({ dragend });
    // 展开第 0 个根节点，让第 1、2 行变成 level 2 的子节点
    tree.expandNode('0', true);
    fakeGeometry(container, tree['_virtListDOM'].clientEl);

    startDrag(container, '3');
    mouseMove(50, 1 * ROW + 20);
    mouseUp();

    expect(dragend.mock.calls[0]![0]).toBeUndefined();
  });
});
