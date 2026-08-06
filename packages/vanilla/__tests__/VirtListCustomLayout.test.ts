/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';
import type { VirtListDOMOptions } from '@virt-list/core';

/**
 * 自绘滚动条模式（scrollbar: 'custom'）的 DOM 布局。
 *
 * 这个模式与 native 的根本差别在于：容器 overflow:hidden，偏移量是一个纯 JS 数字，
 * 内容靠 transform 移动。由此带来两件事必须在这里锁住：
 *
 * 1. **没有任何元素的几何尺寸随列表长度增长**——这是解除浏览器元素高度上限
 *    （Chrome 约 3350 万 px、Firefox 约 1780 万 px）的前提；
 * 2. **偏移量一变，内容立刻跟着动**——不能依赖 core 的 update 事件，因为渲染区间
 *    没变化时 core 不发 update（_calcRange 走 _refreshViewEnd 返回 false），
 *    小幅滚动就会丢帧。
 */

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
let roCallback: ResizeObserverCallback | null = null;
/** 本用例文件里挂载过的实例，afterEach 统一销毁 */
let mounted: VirtList<Item>[] = [];

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
});

afterEach(() => {
  // 必须显式销毁：core 会排 rAF（首帧区间校准、边界渐进修正），
  // 实例活到环境拆除之后，那些回调就会在没有 document 的世界里执行并抛错
  for (const vl of mounted) vl.destroy();
  mounted = [];
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function sizeEntry(id: string, size: number) {
  const target = document.createElement('div');
  target.dataset.id = id;
  return {
    target,
    borderBoxSize: [{ blockSize: size, inlineSize: size }],
    contentRect: { height: size, width: size },
  } as unknown as ResizeObserverEntry;
}

function mount(
  options: Partial<VirtListDOMOptions<Item>> = {},
  list = makeList(50),
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const vl = new VirtList<Item>(container, {
    list,
    itemKey: 'id',
    itemPreSize: 40,
    scrollbar: 'custom',
    renderItem: ((item: Item, _i: number, el: HTMLElement) => {
      el.textContent = item.text;
    }) as any,
    ...options,
  } as VirtListDOMOptions<Item>);

  // 视口尺寸只能经 ResizeObserver 告知 core
  roCallback?.([sizeEntry('client', 200)], {} as ResizeObserver);

  mounted.push(vl);
  return { vl, container, clientEl: vl.clientEl };
}

/** 从 transform 里取出位移量，jsdom 会把 translate3d 原样保存 */
function translateY(el: HTMLElement): number {
  const m = /translate3d\(\s*[^,]+,\s*(-?[\d.]+)px/.exec(el.style.transform);
  return m ? Number(m[1]) : NaN;
}

function translateX(el: HTMLElement): number {
  const m = /translate3d\(\s*(-?[\d.]+)px/.exec(el.style.transform);
  return m ? Number(m[1]) : NaN;
}

describe('custom 滚动条模式的 DOM 布局', () => {
  it('容器为 overflow:hidden 且可聚焦（键盘滚动的前提）', () => {
    const { clientEl } = mount();

    expect(clientEl.style.overflow).toBe('hidden');
    expect(clientEl.tabIndex).toBe(0);
    // 触摸滚动改由 InputController 接管，必须先关掉浏览器的默认手势。
    // 读 style 属性而不是 style.touchAction：jsdom 不认识 touch-action，
    // 会把它从 cssText 里悄悄丢掉，但属性字符串本身是原样送进浏览器的
    expect(clientEl.getAttribute('style')).toContain('touch-action:none');
    expect(clientEl.className).toContain('virt-list__client--custom');
  });

  it('没有任何元素的几何尺寸随列表长度增长（解除浏览器高度上限）', () => {
    // 50w × 100px = 5000 万 px，超过 Chrome 实测的元素高度上限 33,554,428px。
    // native 模式下 listEl 的 min-height 就是这个值，会被浏览器截断，
    // 尾部约 16 万项永远滚不到；custom 模式必须是 0
    const { vl } = mount({ itemPreSize: 100 }, makeList(500_000));

    expect(vl.core.getState().listTotalSize).toBe(50_000_000);
    expect(vl.listEl.style.height).toBe('0px');
    expect(vl.listEl.style.minHeight).toBe('');

    // 整棵子树里不应存在任何以像素写死的巨大尺寸
    for (const el of Array.from(
      vl.clientEl.querySelectorAll<HTMLElement>('*'),
    )) {
      for (const prop of ['height', 'minHeight', 'width', 'minWidth'] as const) {
        const v = parseFloat(el.style[prop]);
        if (!Number.isNaN(v)) expect(v).toBeLessThan(100_000);
      }
    }
  });

  it('渲染项由 itemsEl 的 transform 定位，取代 native 的 virtualEl 占位', () => {
    const { vl } = mount();
    // itemsEl 是 listEl 的唯一子节点，列表项都挂在它下面
    const itemsEl = vl.listEl.firstElementChild as HTMLElement;

    expect(translateY(itemsEl)).toBe(0);
    expect(itemsEl.querySelectorAll('[data-id]').length).toBeGreaterThan(0);

    vl.scrollToIndex(20);
    // virtualSize = renderBegin 之前的累计尺寸，itemsEl 必须同步推下去
    expect(translateY(itemsEl)).toBe(vl.core.getState().virtualSize);
    expect(translateY(itemsEl)).toBeGreaterThan(0);
  });

  it('偏移量变化时内容同步位移（不依赖 update 事件）', () => {
    const { vl } = mount();
    const contentEl = vl.clientEl.firstElementChild as HTMLElement;

    vl.scrollToOffset(120);
    expect(vl.core.getOffset()).toBe(120);
    expect(translateY(contentEl)).toBe(-120);

    // 关键用例：小幅滚动不会改变渲染区间，core 因此不发 update 事件。
    // 若把 transform 挂在 update 上，这一步内容就不动了
    const before = vl.core.getState().renderBegin;
    vl.scrollToOffset(121);
    expect(vl.core.getState().renderBegin).toBe(before);
    expect(translateY(contentEl)).toBe(-121);
  });

  it('偏移量被夹在 [0, 账本上限] 内', () => {
    const { vl } = mount();
    // 50 项 × 40px = 2000，视口 200 → 上限 1800
    vl.scrollToOffset(99999);
    expect(vl.core.getOffset()).toBe(1800);

    vl.scrollToOffset(-50);
    expect(vl.core.getOffset()).toBe(0);
  });

  it('footer 用 transform 补回列表长度（listEl 没有高度）', () => {
    const { vl } = mount({
      renderFooter: ((el: HTMLElement) => {
        el.textContent = 'footer';
      }) as any,
    });

    const footerEl = vl.clientEl.querySelector<HTMLElement>(
      '[data-id="footer"]',
    )!;
    expect(translateY(footerEl)).toBe(vl.core.getState().listTotalSize);
  });

  it('吸顶区改绝对定位，并用占位块还回它占的滚动空间', () => {
    const { vl } = mount({
      renderStickyHeader: ((el: HTMLElement) => {
        el.textContent = 'sticky';
      }) as any,
    });

    const stickyEl = vl.clientEl.querySelector<HTMLElement>(
      '[data-id="stickyHeader"]',
    )!;
    // position:sticky 的粘附由原生滚动驱动，overflow:hidden 下永不触发
    expect(stickyEl.style.position).toBe('absolute');
    // 它必须是视口的直接子节点，否则会跟着内容一起被 transform 带走
    expect(stickyEl.parentElement).toBe(vl.clientEl);

    roCallback?.([sizeEntry('stickyHeader', 36)], {} as ResizeObserver);
    vl.forceUpdate();

    const contentEl = vl.clientEl.firstElementChild as HTMLElement;
    const spacer = contentEl.firstElementChild as HTMLElement;
    expect(spacer.style.height).toBe('36px');
  });

  it('水平模式沿 X 轴位移', () => {
    const { vl } = mount({ horizontal: true });
    const contentEl = vl.clientEl.firstElementChild as HTMLElement;

    vl.scrollToOffset(150);
    expect(translateX(contentEl)).toBe(-150);
    expect(vl.listEl.style.width).toBe('0px');
  });

  it('空列表渲染空状态，且挂在视口上（listEl 没有高度撑不住）', () => {
    const { vl } = mount(
      {
        renderEmpty: ((el: HTMLElement) => {
          el.textContent = 'empty';
        }) as any,
      },
      [],
    );

    const empty = Array.from(
      vl.clientEl.children as HTMLCollectionOf<HTMLElement>,
    ).find((el) => el.textContent === 'empty');
    expect(empty).toBeTruthy();
  });

  it('native 模式不受影响：仍用 min-height 与 virtualEl 占位', () => {
    const { vl } = mount({ scrollbar: 'native' });

    expect(vl.clientEl.style.overflow).toBe('auto');
    expect(vl.listEl.style.minHeight).toBe('2000px');
    // 首个子节点是 virtualEl 占位块，不是 itemsEl
    const first = vl.listEl.firstElementChild as HTMLElement;
    expect(first.style.height).toBe('0px');
    expect(first.dataset.id).toBeUndefined();
  });
});
