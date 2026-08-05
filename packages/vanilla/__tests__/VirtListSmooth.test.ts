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
    itemPreSize: 40,
    fixed: true,
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
    expect(vl.clientEl.scrollTop).toBe(120);
  });

  it('smooth 分帧推进，最终落在目标位置', () => {
    vi.useFakeTimers();
    const vl = createList();

    const onDone = vi.fn();
    vl.scrollToIndex(5, { behavior: 'smooth', duration: 100, onDone });
    expect(vl.clientEl.scrollTop).toBe(0);

    vi.advanceTimersByTime(48);
    expect(vl.clientEl.scrollTop).toBeGreaterThan(0);
    expect(vl.clientEl.scrollTop).toBeLessThan(200);

    vi.advanceTimersByTime(200);
    expect(vl.clientEl.scrollTop).toBe(200);
    expect(onDone).toHaveBeenCalledWith(false);
  });

  it('cancelScroll 中断动画', () => {
    vi.useFakeTimers();
    const vl = createList();

    const onDone = vi.fn();
    vl.scrollToOffset(400, { behavior: 'smooth', duration: 200, onDone });
    vi.advanceTimersByTime(48);
    const midway = vl.clientEl.scrollTop;

    vl.cancelScroll();
    expect(onDone).toHaveBeenCalledWith(true);

    vi.advanceTimersByTime(400);
    expect(vl.clientEl.scrollTop).toBe(midway);
  });
});
