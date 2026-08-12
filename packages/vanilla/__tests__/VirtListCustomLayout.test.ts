/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';
import type { VirtListDOMOptions } from '@virt-list/core';

/**
 * transform 定位的 DOM 布局。
 *
 * 容器 overflow:hidden，偏移量是一个纯 JS 数字，内容靠 transform 移动。
 * 由此带来两件事必须在这里锁住：
 *
 * 1. **没有任何元素的几何尺寸随列表长度增长**——靠占位元素撑开滚动空间时，
 *    超过浏览器上限（Chrome 实测 33,554,428px）的那部分会被直接截掉，
 *    尾部的项永远滚不到；
 * 2. **偏移量一变，内容立刻跟着动**——不能依赖 core 的 update 事件，因为渲染区间
 *    没变化时 core 不发 update（_calcRange 走 _refreshViewEnd 返回 false），
 *    小幅滚动就会丢帧；
 * 3. **每一段只带自己的残差**（`该段的文档位置 - offset`）——这样任何单个 transform
 *    的位移量都不超过一屏多一点，碰不到浏览器对单个 transform 的位移上限
 *    （Chrome 实测 33,554,400px）。
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
    estimatedSize: 40,
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

describe('transform 定位的 DOM 布局', () => {
  it('容器为 overflow:hidden 且可聚焦（键盘滚动的前提）', () => {
    const { clientEl } = mount();

    expect(clientEl.style.overflow).toBe('hidden');
    expect(clientEl.tabIndex).toBe(0);
    // 主轴的触摸滚动由 InputController 接管，必须先关掉浏览器在这条轴上的默认手势；
    // 交叉轴（这里是横向）反过来要放行，那条轴归原生滚动。
    // 读 style 属性而不是 style.touchAction：jsdom 不认识 touch-action，
    // 会把它从 cssText 里悄悄丢掉，但属性字符串本身是原样送进浏览器的
    expect(clientEl.getAttribute('style')).toContain('touch-action:pan-x');
  });

  it('crossScroll: false 时回到两轴全裁切', () => {
    const { vl, clientEl } = mount({ crossScroll: false } as any);

    expect(clientEl.getAttribute('style')).toContain('touch-action:none');
    expect(vl.scrollContentEl.getAttribute('style')).toContain(
      'overflow:hidden',
    );
    expect(vl.scrollContentEl.style.overflowX).toBe('');
  });

  it('交叉轴的滚动落在 scrollContentEl 上，主轴仍是 hidden', () => {
    const { vl, clientEl } = mount();

    // 外层只负责裁切，横滚交给内层——自绘滚动条挂在外层，横滚时才不会被推出视口
    expect(clientEl.style.overflow).toBe('hidden');
    expect(vl.scrollContentEl.style.overflowX).toBe('auto');
    expect(vl.scrollContentEl.style.overflowY).toBe('hidden');
    // 它铺满视口（原来是 height:0 的空壳），否则撑不起一个 scrollport
    expect(vl.scrollContentEl.style.position).toBe('absolute');
    expect(vl.scrollContentEl.style.bottom).toBe('0px');
    // 主轴上它自己不平移，位移全在各段身上
    expect(vl.scrollContentEl.style.transform).toBe('');
  });

  it('横向列表把交叉轴换成竖向', () => {
    const { vl, clientEl } = mount({ horizontal: true } as any);

    expect(clientEl.getAttribute('style')).toContain('touch-action:pan-y');
    expect(vl.scrollContentEl.style.overflowY).toBe('auto');
    expect(vl.scrollContentEl.style.overflowX).toBe('hidden');
  });

  it('没有任何元素的几何尺寸随列表长度增长', () => {
    // 50w × 100px = 5000 万 px，超过 Chrome 实测的元素高度上限 33,554,428px。
    // 若靠占位元素撑开滚动空间，它会被浏览器截断，尾部约 16 万项永远滚不到
    const { vl } = mount({ estimatedSize: 100 }, makeList(500_000));

    expect(vl.core.getState().itemsTotalSize).toBe(50_000_000);
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

  it('itemsEl 的位移就是渲染块相对视口顶部的位置', () => {
    const { vl } = mount();
    const itemsEl = vl.itemsEl;

    expect(translateY(itemsEl)).toBe(0);
    expect(itemsEl.querySelectorAll('[data-id]').length).toBeGreaterThan(0);

    vl.scrollToIndex(20);

    // 残差 = renderBegin 那一项的文档位置 - offset。
    // 它必须落在 (-一项高度, 0] 内，否则视口顶部就露白了
    const { renderBegin } = vl.core.getState();
    const expected = vl.core.getItemPosByIndex(renderBegin).top - vl.core.getOffset();
    expect(translateY(itemsEl)).toBeCloseTo(expected, 6);
    expect(translateY(itemsEl)).toBeLessThanOrEqual(0);
    expect(translateY(itemsEl)).toBeGreaterThan(-40);
  });

  it('偏移量变化时内容同步位移（不依赖 update 事件）', () => {
    const { vl } = mount();

    vl.scrollToOffset(120);
    expect(vl.core.getOffset()).toBe(120);
    // 渲染块从第 3 项起（120 / 40），残差 = 120 - 120 = 0
    expect(translateY(vl.itemsEl)).toBe(0);

    // 关键用例：小幅滚动不会改变渲染区间，core 因此不发 update 事件。
    // 若把 transform 挂在 update 上，这一步内容就不动了
    const before = vl.core.getState().renderBegin;
    vl.scrollToOffset(121);
    expect(vl.core.getState().renderBegin).toBe(before);
    expect(translateY(vl.itemsEl)).toBe(-1);
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
    expect(translateY(footerEl)).toBe(vl.core.getState().itemsTotalSize);
  });

  it('吸顶区改绝对定位，其占的滚动空间计入各段的文档位置', () => {
    const { vl } = mount({
      renderStickyHeader: ((el: HTMLElement) => {
        el.textContent = 'sticky';
      }) as any,
    });

    const stickyEl = vl.clientEl.querySelector<HTMLElement>(
      '[data-id="stickyHeader"]',
    )!;
    // 主轴上 position:sticky 的粘附由原生滚动驱动，overflow:hidden 下永不触发
    expect(stickyEl.style.position).toBe('absolute');
    // 它挂在交叉轴的滚动层里：主轴上不会被各段的 transform 带走（那些 transform
    // 在兄弟节点身上），交叉轴上则跟着列一起横移，表头才不会与列错位
    expect(stickyEl.parentElement).toBe(vl.scrollContentEl);
    expect(stickyEl.style.transform).toBe('');

    roCallback?.([sizeEntry('stickyHeader', 36)], {} as ResizeObserver);
    vl.forceUpdate();

    // 不再有占位块：吸顶区占的 36px 直接加到列表段的文档位置上，
    // 于是 offset 为 0 时渲染块被推到吸顶区下方
    expect(vl.core.slotSize.stickyHeaderSize).toBe(36);
    expect(translateY(vl.itemsEl)).toBe(36);
  });

  it('水平模式沿 X 轴位移', () => {
    const { vl } = mount({ horizontal: true });

    vl.scrollToOffset(150);
    const { renderBegin } = vl.core.getState();
    const expected = vl.core.getItemPosByIndex(renderBegin).top - 150;
    expect(translateX(vl.itemsEl)).toBeCloseTo(expected, 6);
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

});
