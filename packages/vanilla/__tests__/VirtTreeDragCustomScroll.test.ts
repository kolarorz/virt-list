/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtTree } from '../src/tree/VirtTree';
import type { VirtTreeDOMOptions } from '../src/tree/types';

/**
 * 树拖拽到边缘时的自动滚动。
 *
 * 这里锁的是一个很容易漏掉的连带损伤：滚动位置归 JS 掌管后就没有撑开滚动空间的
 * 占位元素了，靠 `scrollHeight > offsetHeight` 找「可滚动祖先」的通用做法会越过
 * 容器、一路找到页面——那样拖到边缘滚的就是整个文档，树自己纹丝不动。
 * 所以自动滚动必须直接以列表为对象。
 */

const ROW = 32;
const VISIBLE = 6;
const CLIENT = VISIBLE * ROW;

const OriginalRO = globalThis.ResizeObserver;
const OriginalElementFromPoint = document.elementFromPoint;
let roCallback: ResizeObserverCallback | null = null;
let mounted: VirtTree[] = [];
let frameQueue = new Map<number, FrameRequestCallback>();
let frameSeq = 0;
let frameTime = 0;
let realRaf: typeof requestAnimationFrame;
let realCaf: typeof cancelAnimationFrame;

beforeEach(() => {
  roCallback = null;
  mounted = [];
  frameQueue = new Map();
  frameSeq = 0;
  frameTime = 0;
  realRaf = globalThis.requestAnimationFrame;
  realCaf = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    const id = ++frameSeq;
    frameQueue.set(id, cb);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    frameQueue.delete(id);
  }) as typeof cancelAnimationFrame;

  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      roCallback = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  document.elementFromPoint = (() => null) as any;
});

afterEach(() => {
  for (const tree of mounted) tree.destroy();
  mounted = [];
  globalThis.requestAnimationFrame = realRaf;
  globalThis.cancelAnimationFrame = realCaf;
  globalThis.ResizeObserver = OriginalRO;
  document.elementFromPoint = OriginalElementFromPoint;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function runFrame() {
  const queued = [...frameQueue];
  frameQueue.clear();
  frameTime += 16.67;
  for (const [, cb] of queued) cb(frameTime);
}

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

function makeTree(rootCount = 40) {
  return Array.from({ length: rootCount }, (_, i) => ({
    key: `${i}`,
    title: `Node-${i}`,
  }));
}

function mount(options: Partial<VirtTreeDOMOptions> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const tree = new VirtTree(container, {
    list: makeTree(),
    estimatedSize: ROW,
    fixedSize: true,
    buffer: 0,
    draggable: true,
    ...options,
  } as VirtTreeDOMOptions);
  mounted.push(tree);

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  // 自动滚动的速度完全建立在容器矩形上，jsdom 不做布局，必须喂进去
  clientEl.getBoundingClientRect = () =>
    ({
      top: 0,
      bottom: CLIENT,
      height: CLIENT,
      left: 0,
      right: 300,
      width: 300,
    }) as DOMRect;

  flushResize('client', CLIENT);
  runFrame();
  return { container, tree, clientEl };
}

function startDrag(container: HTMLElement, key: string) {
  container
    .querySelector(`.virt-tree-item[data-id="${key}"] .virt-tree-node`)!
    .dispatchEvent(new MouseEvent('dragstart', { bubbles: true }));
}

function mouseMove(x: number, y: number) {
  document.dispatchEvent(
    new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }),
  );
}

describe('树拖拽到边缘时的自动滚动', () => {

  it('拖到下边缘时滚动的是这棵树，而不是外层文档', () => {
    const { container, tree, clientEl } = mount({ scrollbar: 'custom' });
    const vl = (tree as any)._virtListDOM;
    expect(vl.core.getOffset()).toBe(0);

    startDrag(container, '0');
    // 落进容器下 1/4 区域（y > CLIENT * 0.75 = 144）才会触发自动滚动
    mouseMove(50, CLIENT - 4);

    for (let i = 0; i < 6; i++) runFrame();

    expect(vl.core.getOffset()).toBeGreaterThan(0);
    // 容器自身的 scrollTop 必须一直是 0：偏移量归列表管，
    // 写 scrollTop 在 overflow:hidden 且无内容高度的容器上是无效动作。
    // 这里读的就是 clientEl 本身，不能替换成 getOffset()——两者语义相反
    expect(clientEl.scrollTop).toBe(0);
  });

  it('拖到上边缘时向上滚', () => {
    const { container, tree } = mount({ scrollbar: 'custom' });
    const vl = (tree as any)._virtListDOM;
    vl.scrollToOffset(400);
    const before = vl.core.getOffset();

    startDrag(container, String(vl.core.state.inViewBegin));
    mouseMove(50, 4);
    for (let i = 0; i < 6; i++) runFrame();

    expect(vl.core.getOffset()).toBeLessThan(before);
  });

  it('指针回到中间区域后停止滚动', () => {
    const { container, tree } = mount({ scrollbar: 'custom' });
    const vl = (tree as any)._virtListDOM;

    startDrag(container, '0');
    mouseMove(50, CLIENT - 4);
    for (let i = 0; i < 4; i++) runFrame();
    const moved = vl.core.getOffset();
    expect(moved).toBeGreaterThan(0);

    mouseMove(50, CLIENT / 2);
    for (let i = 0; i < 4; i++) runFrame();
    expect(vl.core.getOffset()).toBe(moved);
  });

  it('拖拽结束后不再有自动滚动残留', () => {
    const { container, tree } = mount({ scrollbar: 'custom' });
    const vl = (tree as any)._virtListDOM;

    startDrag(container, '0');
    mouseMove(50, CLIENT - 4);
    runFrame();
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    const after = vl.core.getOffset();
    for (let i = 0; i < 5; i++) runFrame();
    expect(vl.core.getOffset()).toBe(after);
  });
});
