import { afterEach, describe, expect, it } from 'vitest';
import { InputController, type InputHost } from '../src/scrollbar/InputController';

/**
 * 触摸手势的轴锁是个状态机，回归起来悄无声息（表现只是"横向滚不动"或"竖滚时列在漂"），
 * 所以这里逐条钉住它的判定：起步阈值、锁哪条轴、什么时候解锁、惯性走哪条轴。
 *
 * jsdom 没有 `TouchEvent` 构造函数，也不会给 `scrollLeft` 留可写的实现（没有布局），
 * 两者都在下面手工补上 —— 被测代码只读 `touches[0].clientX/clientY`、`timeStamp`
 * 与 `preventDefault`，补这三样就够。
 */

/** 造一个带单点 touches 与可控 timeStamp 的事件 */
function touchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  x: number,
  y: number,
  time: number,
): Event {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'touches', {
    value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }],
  });
  Object.defineProperty(e, 'timeStamp', { value: time });
  return e;
}

/** 主轴宿主：把偏移量夹在 [0, max] 里，够用来触发 `_wouldOverscroll` */
function makeHost(max = 1000): InputHost & { offset: number } {
  const state = {
    offset: 0,
    getOffset: () => state.offset,
    getMaxOffset: () => max,
    getClientSize: () => 300,
    scrollBy: (d: number) => {
      state.offset = Math.min(Math.max(state.offset + d, 0), max);
    },
    scrollTo: (o: number) => {
      state.offset = Math.min(Math.max(o, 0), max);
    },
    scrollToTop: () => {
      state.offset = 0;
    },
    scrollToBottom: () => {
      state.offset = max;
    },
    onActivity: () => {},
  };
  return state;
}

/** 交叉轴滚动层：jsdom 的 scrollLeft 恒为 0，换成夹在 [0, max] 的可写实现 */
function makeCrossEl(max = 500): HTMLElement {
  const el = document.createElement('div');
  let left = 0;
  Object.defineProperty(el, 'scrollLeft', {
    get: () => left,
    set: (v: number) => {
      left = Math.min(Math.max(v, 0), max);
    },
  });
  return el;
}

/** 等一帧，让 `_accumulate` 的 rAF 落地 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

let ctl: InputController | null = null;

function setup(max = 1000) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const host = makeHost(max);
  const crossEl = makeCrossEl();
  ctl = new InputController(el, host, false, { crossEl });
  return { el, host, crossEl };
}

afterEach(() => {
  ctl?.destroy();
  ctl = null;
  document.body.innerHTML = '';
});

describe('InputController 触摸手势', () => {
  it('起步阈值内既不滚也不拦截', async () => {
    const { el, host, crossEl } = setup();

    el.dispatchEvent(touchEvent('touchstart', 100, 200, 0));
    // 直线距离 5px < TOUCH_SLOP(9)，还没起步
    const move = touchEvent('touchmove', 103, 196, 16);
    el.dispatchEvent(move);
    await nextFrame();

    expect(host.offset).toBe(0);
    expect(crossEl.scrollLeft).toBe(0);
    // 没接管就不能拦：这一下也许是 tap，也许该让给外层滚动链
    expect(move.defaultPrevented).toBe(false);
  });

  it('竖向主导的手势锁主轴，横向分量被丢弃', async () => {
    const { el, host, crossEl } = setup();

    el.dispatchEvent(touchEvent('touchstart', 100, 200, 0));
    // 越过阈值：dy=-20 主导 → 锁 main。起步那一段位移不补进内容，所以这一帧不滚
    el.dispatchEvent(touchEvent('touchmove', 100, 180, 16));
    await nextFrame();
    expect(host.offset).toBe(0);

    // 手指继续上滑 20px，同时横漂 10px —— 横漂必须被吃掉
    el.dispatchEvent(touchEvent('touchmove', 110, 160, 32));
    await nextFrame();

    expect(host.offset).toBe(20);
    expect(crossEl.scrollLeft).toBe(0);
  });

  it('横向主导的手势锁交叉轴，主轴不动且事件被拦下', async () => {
    const { el, host, crossEl } = setup();

    el.dispatchEvent(touchEvent('touchstart', 200, 100, 0));
    // dx=-20 主导 → 锁 cross
    el.dispatchEvent(touchEvent('touchmove', 180, 100, 16));
    await nextFrame();

    const move = touchEvent('touchmove', 160, 105, 32);
    el.dispatchEvent(move);
    await nextFrame();

    expect(crossEl.scrollLeft).toBe(20);
    // 竖向那 5px 属于锁掉的轴
    expect(host.offset).toBe(0);
    // 交叉轴吃下了这次位移，不能再放给外层祖先，否则页面会跟着滚
    expect(move.defaultPrevented).toBe(true);
  });

  it('锁定后持续朝另一轴推过阈值就解锁，两轴同时跟手', async () => {
    const { el, host, crossEl } = setup();

    el.dispatchEvent(touchEvent('touchstart', 200, 200, 0));
    el.dispatchEvent(touchEvent('touchmove', 200, 180, 16)); // 锁 main
    await nextFrame();

    // 相对锁定点横移 50px > AXIS_UNLOCK_DISTANCE(40) → 解锁
    el.dispatchEvent(touchEvent('touchmove', 150, 170, 32));
    await nextFrame();

    expect(host.offset).toBe(10);
    expect(crossEl.scrollLeft).toBe(50);
  });

  it('横漂不到解锁阈值时锁一直有效（竖滚时列不会漂）', async () => {
    const { el, host, crossEl } = setup();

    el.dispatchEvent(touchEvent('touchstart', 200, 300, 0));
    el.dispatchEvent(touchEvent('touchmove', 200, 280, 16)); // 锁 main
    await nextFrame();

    // 一路上下滑，横向始终在锁定点 ±39px 内抖动
    el.dispatchEvent(touchEvent('touchmove', 180, 250, 32));
    el.dispatchEvent(touchEvent('touchmove', 220, 220, 48));
    el.dispatchEvent(touchEvent('touchmove', 165, 190, 64));
    await nextFrame();

    expect(host.offset).toBe(90);
    expect(crossEl.scrollLeft).toBe(0);
  });

  it('没越过起步阈值的 tap 不产生惯性', async () => {
    const { el, host, crossEl } = setup();

    el.dispatchEvent(touchEvent('touchstart', 100, 200, 0));
    el.dispatchEvent(touchEvent('touchmove', 102, 198, 8));
    el.dispatchEvent(touchEvent('touchend', 102, 198, 16));

    await nextFrame();
    await nextFrame();
    await nextFrame();

    expect(host.offset).toBe(0);
    expect(crossEl.scrollLeft).toBe(0);
  });

  it('手势中途 target 被 DOM 回收，滚动照样继续', async () => {
    const { el, host } = setup();
    // 一个会在滚动中被回收的后代（虚拟滚动重建行、按需创建的单元格内层都是这样）
    const cell = document.createElement('div');
    el.appendChild(cell);

    const fire = (
      type: 'touchstart' | 'touchmove',
      y: number,
      time: number,
    ): void => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'touches', { value: [{ clientX: 100, clientY: y }] });
      Object.defineProperty(e, 'timeStamp', { value: time });
      // touch 事件的 target 在 touchstart 时就固定，后续 move 全派发给它
      cell.dispatchEvent(e);
    };

    fire('touchstart', 300, 0);
    fire('touchmove', 280, 16); // 越过阈值，锁主轴
    await nextFrame();
    fire('touchmove', 260, 32);
    await nextFrame();
    const beforeDetach = host.offset;
    expect(beforeDetach).toBe(20);

    // 行被回收：target 脱离文档，事件从此不再冒泡到容器（CDP 实测如此），
    // 但仍派发到 target 自己 —— 兜底监听必须接住
    cell.remove();
    fire('touchmove', 240, 48);
    fire('touchmove', 220, 64);
    await nextFrame();

    expect(host.offset).toBeGreaterThan(beforeDetach);
  });

  it('惯性只沿锁定的那条轴滑行', async () => {
    const { el, host, crossEl } = setup();

    // 锁 cross，然后快速横扫松手
    el.dispatchEvent(touchEvent('touchstart', 300, 100, 0));
    el.dispatchEvent(touchEvent('touchmove', 280, 100, 16));
    el.dispatchEvent(touchEvent('touchmove', 240, 102, 32));
    el.dispatchEvent(touchEvent('touchmove', 200, 104, 48));
    await nextFrame();

    const beforeEnd = crossEl.scrollLeft;
    el.dispatchEvent(touchEvent('touchend', 200, 104, 56));

    // 惯性跑几帧
    for (let i = 0; i < 5; i++) await nextFrame();

    expect(crossEl.scrollLeft).toBeGreaterThan(beforeEnd);
    // 竖向那 4px 属于锁掉的轴，惯性不该朝那边斜飞
    expect(host.offset).toBe(0);
  });
});
