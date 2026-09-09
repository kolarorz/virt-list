/**
 * 滚动链：到边界之后，这次输入该交给谁。
 *
 * 容器是 `overflow: hidden` + `touch-action` 不放行单指平移，浏览器不再提供任何滚动
 * 手段，"把滚动链交给外层"这件事也就没人替我们做了。这里守的是两条独立的出口：
 *
 * - **滚轮**：主轴到边界时 `_onWheel` 本来就不 `preventDefault`，事件落回浏览器、
 *   由 `overscroll-behavior` 决定链往哪走。唯独**纯交叉轴手势 + 交叉轴到头**要区别
 *   对待：放行会让 macOS 弹橡皮筋，所以先问"外层真有能滚的容器吗"，有才放行。
 * - **触摸**：浏览器压根不生成滚动手势，只能自己写外层的 `scrollTop` / `scrollLeft`。
 *   归属按 iOS 语义在**手势起步那一刻定一次**，中途不转手，抬手重滑才重新判定。
 *
 * jsdom 没有布局引擎（`scrollHeight` / `clientHeight` 恒为 0，`scrollTop` 写不进去），
 * 所以可滚性全靠 `makeScrollable` 显式伪造 —— 换来的是能精确摆出"外层可滚 / 不可滚 /
 * 被 CSS 掐断"三种局面，那正是这套逻辑的全部分支。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { InputController, type InputHost } from '../src/scrollbar/InputController';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = '';
  // documentElement 上伪造的可滚性要撤掉，否则漏给下一个用例
  for (const k of ['scrollWidth', 'clientWidth', 'scrollHeight', 'clientHeight', 'scrollLeft', 'scrollTop']) {
    if (Object.getOwnPropertyDescriptor(document.documentElement, k)) {
      delete (document.documentElement as any)[k];
    }
  }
});

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** 伪造布局：让元素在指定轴上真的"有得滚"，`scrollTop/Left` 带 clamp */
function makeScrollable(
  el: HTMLElement,
  opts: { scrollW?: number; clientW?: number; scrollH?: number; clientH?: number },
): void {
  const { scrollW = 0, clientW = 0, scrollH = 0, clientH = 0 } = opts;
  let left = 0;
  let top = 0;
  const def = (k: string, get: () => unknown, set?: (v: any) => void) =>
    Object.defineProperty(el, k, { configurable: true, get, set });
  def('scrollWidth', () => scrollW);
  def('clientWidth', () => clientW);
  def('scrollHeight', () => scrollH);
  def('clientHeight', () => clientH);
  def('scrollLeft', () => left, (v) => { left = clamp(v, 0, Math.max(scrollW - clientW, 0)); });
  def('scrollTop', () => top, (v) => { top = clamp(v, 0, Math.max(scrollH - clientH, 0)); });
}

/** 虚拟偏移量账本，等价于 VirtList / VirtTable 那一侧 */
function makeHost(maxOffset = 1000) {
  let offset = 0;
  const host: InputHost & { peek(): number; seed(v: number): void } = {
    getOffset: () => offset,
    getMaxOffset: () => maxOffset,
    getClientSize: () => 300,
    scrollBy: (d) => { offset = clamp(offset + d, 0, maxOffset); },
    scrollTo: (o) => { offset = clamp(o, 0, maxOffset); },
    scrollToTop: () => { offset = 0; },
    scrollToBottom: () => { offset = maxOffset; },
    onActivity: () => {},
    peek: () => offset,
    seed: (v) => { offset = v; },
  };
  return host;
}

/**
 * 搭出真实的层级：`outer`（宿主页面里包着表格的那一层）> `el`（视口，既是
 * InputController 的宿主也是交叉轴的 scrollport，与 virt-table 的 `.vt-client` 一致）。
 */
function setup(opts: { maxOffset?: number; crossMax?: number } = {}) {
  const outer = document.createElement('div');
  const el = document.createElement('div');
  outer.appendChild(el);
  document.body.appendChild(outer);

  // 视口自己的交叉轴（横向）余量
  const crossMax = opts.crossMax ?? 1700;
  makeScrollable(el, { scrollW: 300 + crossMax, clientW: 300, scrollH: 200, clientH: 200 });

  const host = makeHost(opts.maxOffset ?? 1000);
  const ctrl = new InputController(el, host, false, { crossEl: el, keyboard: false });
  cleanups.push(() => ctrl.destroy());
  return { outer, el, host, ctrl };
}

function wheel(el: HTMLElement, deltaX: number, deltaY: number): Event {
  const e = new Event('wheel', { cancelable: true, bubbles: true }) as any;
  e.deltaX = deltaX;
  e.deltaY = deltaY;
  e.deltaMode = 0;
  el.dispatchEvent(e);
  return e as Event;
}

function touch(
  el: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend',
  x: number,
  y: number,
  time: number,
): Event {
  const e = new Event(type, { cancelable: true, bubbles: true }) as any;
  e.touches = type === 'touchend' ? [] : [{ clientX: x, clientY: y }];
  Object.defineProperty(e, 'timeStamp', { value: time });
  el.dispatchEvent(e);
  return e as Event;
}

const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

describe('滚轮 · 横向到头：穿透与防回弹两者都要', () => {
  /** 把视口横向推到最右，之后的横扫就都是"到头还继续推" */
  const toRight = (el: HTMLElement) => { el.scrollLeft = 99999; };

  /**
   * 这一组的共同前提：**事件一律被 `preventDefault`**。
   *
   * 反直觉但必须如此 —— 宿主在交叉轴上写了 `overscroll-behavior-x: none` 压橡皮筋，
   * 那条声明同时掐断了滚动链，所以"放行给浏览器"在这条轴上等于什么都不发生
   * （真实浏览器里实测过：放行后祖先的 scrollLeft 一动不动）。于是位移改由我们自己写，
   * 浏览器全程不介入。区别只在**祖先有没有被写动**。
   */
  it('外层能横滚 → 自己写它的 scrollLeft（穿透）', () => {
    const { outer, el } = setup();
    outer.style.overflowX = 'auto';
    makeScrollable(outer, { scrollW: 2000, clientW: 300, scrollH: 200, clientH: 200 });
    toRight(el);

    const e = wheel(el, 120, 0);
    expect(e.defaultPrevented).toBe(true);
    expect(outer.scrollLeft).toBeGreaterThan(0);
  });

  it('外层没有可横滚容器 → 只拦不滚，横向到头就停住（不回弹）', () => {
    const { outer, el } = setup();
    toRight(el);

    const e = wheel(el, 120, 0);
    expect(e.defaultPrevented).toBe(true);
    expect(outer.scrollLeft).toBe(0);
  });

  /**
   * `overscroll-behavior: contain` 的语义是「链不从**我**往上传」，它并不妨碍我自己被滚。
   * 所以这条契约只在**外层自己也到头**时才成立 —— 那一刻链本该继续找页面，`contain` 掐断它。
   */
  it('外层到头且 overscroll-behavior-x: contain → 链终止，页面不该被滚', () => {
    const { outer, el } = setup();
    outer.style.overflowX = 'auto';
    outer.style.setProperty('overscroll-behavior-x', 'contain');
    makeScrollable(outer, { scrollW: 2000, clientW: 300, scrollH: 200, clientH: 200 });
    outer.scrollLeft = 99999;
    makeScrollable(document.documentElement, { scrollW: 5000, clientW: 800, scrollH: 200, clientH: 200 });
    toRight(el);

    const e = wheel(el, 120, 0);
    expect(e.defaultPrevented).toBe(true);
    expect(document.documentElement.scrollLeft).toBe(0);
  });

  it('外层到头但没写 overscroll-behavior → 跳过它继续往上，滚到页面', () => {
    const { outer, el } = setup();
    outer.style.overflowX = 'auto';
    makeScrollable(outer, { scrollW: 2000, clientW: 300, scrollH: 200, clientH: 200 });
    outer.scrollLeft = 99999;
    makeScrollable(document.documentElement, { scrollW: 5000, clientW: 800, scrollH: 200, clientH: 200 });
    toRight(el);

    wheel(el, 120, 0);
    expect(document.documentElement.scrollLeft).toBeGreaterThan(0);
  });

  it('外层是 overflow: hidden → 不算可滚（用户滚不动它），一步都不许动它', () => {
    const { outer, el } = setup();
    outer.style.overflowX = 'hidden';
    makeScrollable(outer, { scrollW: 2000, clientW: 300, scrollH: 200, clientH: 200 });
    toRight(el);

    const e = wheel(el, 120, 0);
    expect(e.defaultPrevented).toBe(true);
    expect(outer.scrollLeft).toBe(0);
  });

  it('外层有余量时 contain 不该妨碍它自己被滚', () => {
    const { outer, el } = setup();
    outer.style.overflowX = 'auto';
    outer.style.setProperty('overscroll-behavior-x', 'contain');
    makeScrollable(outer, { scrollW: 2000, clientW: 300, scrollH: 200, clientH: 200 });
    toRight(el);

    wheel(el, 120, 0);
    expect(outer.scrollLeft).toBeGreaterThan(0);
  });

  it('横向还没到头 → 自己吃掉，与外层无关', () => {
    const { outer, el } = setup();
    outer.style.overflowX = 'auto';
    makeScrollable(outer, { scrollW: 2000, clientW: 300, scrollH: 200, clientH: 200 });

    const e = wheel(el, 120, 0);
    expect(e.defaultPrevented).toBe(true);
    expect(el.scrollLeft).toBeGreaterThan(0);
    expect(outer.scrollLeft).toBe(0);
  });

  /**
   * 斜向手势不走代劳这条路：纵向穿透（靠 `overscroll-behavior-y: auto` 交回浏览器）
   * 比横向防回弹重要得多，拦下来会把「表格滚到底之后页面再也滚不动」带回来。
   */
  it('主轴（纵向）有位移时一律放行 —— 纵向穿透优先于横向防回弹', () => {
    const { el, host } = setup();
    host.seed(1000);
    toRight(el);

    const e = wheel(el, 120, 120);
    expect(e.defaultPrevented).toBe(false);
  });
});

describe('触摸 · iOS 语义：归属在起步时定一次，中途不转手', () => {
  /** 让页面本身成为可纵滚的外层 */
  function makePageScrollable() {
    makeScrollable(document.documentElement, { scrollH: 5000, clientH: 800, scrollW: 300, clientW: 300 });
  }

  it('内层横向 scrollport 优先于列表自己的交叉轴', async () => {
    const { el, host } = setup();
    const inner = document.createElement('pre');
    inner.style.overflowX = 'auto';
    makeScrollable(inner, {
      scrollW: 1200,
      clientW: 300,
      scrollH: 100,
      clientH: 100,
    });
    el.appendChild(inner);

    touch(inner, 'touchstart', 300, 100, 0);
    touch(inner, 'touchmove', 288, 100, 16);
    const move = touch(inner, 'touchmove', 248, 100, 32);
    await frame();

    expect(inner.scrollLeft).toBeGreaterThan(0);
    expect(el.scrollLeft).toBe(0);
    expect(host.peek()).toBe(0);
    expect(move.defaultPrevented).toBe(true);
  });

  it('内层纵向 scrollport 优先于列表主轴', async () => {
    const { el, host } = setup();
    const inner = document.createElement('div');
    inner.style.overflowY = 'auto';
    makeScrollable(inner, {
      scrollW: 100,
      clientW: 100,
      scrollH: 1200,
      clientH: 300,
    });
    el.appendChild(inner);

    touch(inner, 'touchstart', 100, 300, 0);
    touch(inner, 'touchmove', 100, 288, 16);
    touch(inner, 'touchmove', 100, 248, 32);
    await frame();

    expect(inner.scrollTop).toBeGreaterThan(0);
    expect(host.peek()).toBe(0);
  });

  it('起步时表格已到底 → 整个手势交给页面，表格一动不动', async () => {
    const { el, host } = setup();
    host.seed(1000);
    makePageScrollable();

    touch(el, 'touchstart', 100, 300, 0);
    touch(el, 'touchmove', 100, 288, 16); // 越过 9px 起步阈值，纵向主导
    touch(el, 'touchmove', 100, 268, 32);
    await frame();

    expect(document.documentElement.scrollTop).toBeGreaterThan(0);
    expect(host.peek()).toBe(1000); // 表格没被碰过
  });

  it('起步时表格还有余量 → 表格滚；中途滚到底也不把剩下的让给页面', async () => {
    const { el, host } = setup({ maxOffset: 40 }); // 余量很小，两帧就见底
    makePageScrollable();

    touch(el, 'touchstart', 100, 300, 0);
    touch(el, 'touchmove', 100, 288, 16);
    touch(el, 'touchmove', 100, 200, 32); // 这一帧的位移远超剩余余量
    touch(el, 'touchmove', 100, 100, 48);
    await frame();

    expect(host.peek()).toBe(40); // 表格滚到底了
    expect(document.documentElement.scrollTop).toBe(0); // 页面始终没动
  });

  it('抬手重滑 → 这次起步时已到底，于是轮到页面', async () => {
    const { el, host } = setup({ maxOffset: 40 });
    makePageScrollable();

    // 第一次手势：表格滚到底
    touch(el, 'touchstart', 100, 300, 0);
    touch(el, 'touchmove', 100, 288, 16);
    touch(el, 'touchmove', 100, 200, 32);
    touch(el, 'touchend', 100, 200, 40);
    await frame();
    expect(host.peek()).toBe(40);
    expect(document.documentElement.scrollTop).toBe(0);

    // 第二次手势：起步就在底部
    touch(el, 'touchstart', 100, 300, 200);
    touch(el, 'touchmove', 100, 288, 216);
    touch(el, 'touchmove', 100, 268, 232);
    await frame();
    expect(document.documentElement.scrollTop).toBeGreaterThan(0);
  });

  it('外层根本没得滚 → 什么都不发生（不报错、也别去动表格）', async () => {
    const { el, host } = setup();
    host.seed(1000);
    // 页面不可滚：不调 makePageScrollable

    touch(el, 'touchstart', 100, 300, 0);
    touch(el, 'touchmove', 100, 288, 16);
    touch(el, 'touchmove', 100, 268, 32);
    await frame();

    expect(host.peek()).toBe(1000);
    expect(document.documentElement.scrollTop).toBe(0);
  });

  it('横向主导且横向已到头 → 交给外层的横轴', async () => {
    const { outer, el } = setup();
    el.scrollLeft = 99999; // 视口横向到头
    outer.style.overflowX = 'auto';
    makeScrollable(outer, { scrollW: 2000, clientW: 300, scrollH: 200, clientH: 200 });

    touch(el, 'touchstart', 300, 100, 0);
    touch(el, 'touchmove', 288, 100, 16); // 横向主导
    touch(el, 'touchmove', 268, 100, 32);
    await frame();

    expect(outer.scrollLeft).toBeGreaterThan(0);
  });

  it('甩出去的惯性跟着 latch 目标走，不会半路回到表格上', async () => {
    const { el, host } = setup();
    host.seed(1000);
    makePageScrollable();

    // 快速上滑后松手 → 有初速
    touch(el, 'touchstart', 100, 400, 0);
    touch(el, 'touchmove', 100, 388, 16);
    touch(el, 'touchmove', 100, 320, 32);
    touch(el, 'touchmove', 100, 250, 48);
    touch(el, 'touchend', 100, 250, 56);

    const afterGesture = document.documentElement.scrollTop;
    await frame();
    await frame();

    expect(document.documentElement.scrollTop).toBeGreaterThan(afterGesture);
    expect(host.peek()).toBe(1000); // 表格全程没参与
  });
});

describe('滚动链不许绕过 scroll lock', () => {
  /**
   * `html { overflow: hidden }` / `body { overflow: hidden }` 是弹窗锁背景页最通行的手法。
   * 代劳滚动链时如果只看「页面有没有余量」，就会越过这把锁去滚页面 ——
   * 比「滚不动」严重得多：用户明明看着一个模态框，背景却在动。
   */
  it('html 横向被锁 → 横向到头就停住，不去滚页面', () => {
    const { el } = setup();
    makeScrollable(document.documentElement, { scrollW: 5000, clientW: 800, scrollH: 200, clientH: 200 });
    document.documentElement.style.overflowX = 'hidden';
    el.scrollLeft = 99999;

    const e = wheel(el, 120, 0);
    expect(e.defaultPrevented).toBe(true);
    expect(document.documentElement.scrollLeft).toBe(0);
    document.documentElement.style.overflowX = '';
  });

  it('body 纵向被锁 → 表格到底的手势不去滚页面', async () => {
    const { el, host } = setup();
    host.seed(1000);
    makeScrollable(document.documentElement, { scrollH: 5000, clientH: 800, scrollW: 300, clientW: 300 });
    document.body.style.overflowY = 'hidden';

    touch(el, 'touchstart', 100, 300, 0);
    touch(el, 'touchmove', 100, 288, 16);
    touch(el, 'touchmove', 100, 268, 32);
    await frame();

    expect(document.documentElement.scrollTop).toBe(0);
    expect(host.peek()).toBe(1000);
    document.body.style.overflowY = '';
  });
});
