import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { VirtList } from '../src/VirtList';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: String(i), text: `item-${i}` }));
}

/** 创建 VirtList 并让内部滚动容器的 scrollTop 可读写（jsdom 无布局，默认恒为 0） */
function createList(count = 20) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const vl = new VirtList<{ id: string; text: string }>(container, {
    list: makeList(count),
    itemKey: 'id',
    estimatedSize: 40,
    fixedSize: true,
    renderItem: (item, _index, el) => {
      el.textContent = item.text;
    },
  });

  Object.defineProperty(vl.clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });

  return vl;
}

describe('VirtList (DOM) 平滑滚动透传', () => {
  it('不传 options 时仍为同步跳转', () => {
    const vl = createList();
    vl.scrollToIndex(3);
    expect(vl.core.getOffset()).toBe(120);
  });

  it('smooth 分帧推进，最终落在目标位置', () => {
    vi.useFakeTimers();
    const vl = createList();

    const onDone = vi.fn();
    vl.scrollToIndex(5, { behavior: 'smooth', duration: 100, onDone });
    expect(vl.core.getOffset()).toBe(0);

    vi.advanceTimersByTime(48);
    expect(vl.core.getOffset()).toBeGreaterThan(0);
    expect(vl.core.getOffset()).toBeLessThan(200);

    vi.advanceTimersByTime(200);
    expect(vl.core.getOffset()).toBe(200);
    expect(onDone).toHaveBeenCalledWith(false);
  });

  it('cancelScroll 中断动画', () => {
    vi.useFakeTimers();
    const vl = createList();

    const onDone = vi.fn();
    vl.scrollToOffset(400, { behavior: 'smooth', duration: 200, onDone });
    vi.advanceTimersByTime(48);
    const midway = vl.core.getOffset();

    vl.cancelScroll();
    expect(onDone).toHaveBeenCalledWith(true);

    vi.advanceTimersByTime(400);
    expect(vl.core.getOffset()).toBe(midway);
  });
});

/**
 * 平滑滚动期间渲染区间必须跟着动。
 *
 * 这是删掉原生滚动之后最容易漏的一条：原生模式下写 scrollTop 会让浏览器异步派发
 * scroll 事件，区间靠那个事件重算；现在容器 overflow:hidden、根本没有 scroll 事件，
 * 动画每帧只写偏移量的话，区间会冻结在起点——内容滑走而 DOM 窗口不动，就是露白。
 *
 * 只断言最终落位是抓不到这个 bug 的（落位一直是对的），必须逐帧看区间。
 */
describe('平滑滚动期间的渲染区间', () => {
  function setup(count = 500) {
    const vl = createList(count);
    vl.core.slotSize.clientSize = 200;
    vl.core.forceUpdate();
    return vl;
  }

  /** 渲染区间是否覆盖当前视口 */
  function covered(vl: VirtList<any>) {
    const off = vl.core.getOffset();
    const { renderBegin, renderEnd } = vl.core.getState();
    const top = vl.core.getItemPosByIndex(renderBegin).top;
    const bottom = vl.core.getItemPosByIndex(renderEnd).bottom;
    return {
      ok: top <= off && bottom >= off + vl.core.slotSize.clientSize,
      off, top, bottom, renderBegin, renderEnd,
    };
  }

  it('逐帧推进时区间始终覆盖视口（scrollToIndex smooth）', () => {
    vi.useFakeTimers();
    const vl = setup();

    vl.scrollToIndex(400, { behavior: 'smooth', duration: 300 });

    for (let i = 0; i < 30; i++) {
      vi.advanceTimersByTime(16);
      const c = covered(vl);
      expect(
        c.ok,
        `第 ${i} 帧：视口 ${Math.round(c.off)} 不在渲染区间 ` +
          `[${c.top}, ${c.bottom})（render=${c.renderBegin}..${c.renderEnd}）`,
      ).toBe(true);
    }

    vi.runAllTimers();
    expect(covered(vl).ok).toBe(true);
    expect(vl.core.getOffset()).toBe(400 * 40);
  });

  it('逐帧推进时区间始终覆盖视口（scrollToBottom smooth）', () => {
    vi.useFakeTimers();
    const vl = setup();

    vl.scrollToBottom({ behavior: 'smooth', duration: 300 });

    for (let i = 0; i < 30; i++) {
      vi.advanceTimersByTime(16);
      const c = covered(vl);
      expect(c.ok, `第 ${i} 帧：视口 ${Math.round(c.off)} 不在 [${c.top}, ${c.bottom})`).toBe(true);
    }

    vi.runAllTimers();
    expect(vl.core.getOffset()).toBe(500 * 40 - 200);
    expect(vl.core.getState().inViewEnd).toBe(499);
  });

  it('远距离 smooth 的预跳之后区间也跟上了', () => {
    vi.useFakeTimers();
    const vl = setup(5000);

    // 距离远超 smoothMaxDistance（默认两倍视口），会先瞬跳一段
    vl.scrollToIndex(4000, { behavior: 'smooth', duration: 300 });
    vi.advanceTimersByTime(16); // approach 帧

    const c = covered(vl);
    expect(c.ok, `预跳后视口 ${Math.round(c.off)} 不在 [${c.top}, ${c.bottom})`).toBe(true);
  });
});
