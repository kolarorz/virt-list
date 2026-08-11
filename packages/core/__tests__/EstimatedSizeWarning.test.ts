import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

/**
 * estimatedSize 的诊断。
 *
 * 这个配置给错不会报错、也不会让布局最终出错，但会让首屏渲染的项数明显偏离。
 * 症状（视口下方留白 / 白建一堆 DOM）很难反推到配置上，所以由组件提示一次。
 */

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: String(i), text: `item-${i}` }));
}

describe('estimatedSize 与实测尺寸不符时的提示', () => {
  const OriginalRO = globalThis.ResizeObserver;
  let roCallback: ResizeObserverCallback | null = null;
  let warn: ReturnType<typeof vi.spyOn>;

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
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.ResizeObserver = OriginalRO;
    warn.mockRestore();
  });

  function setup(estimatedSize: number, fixedSize = false) {
    return new VirtListCore({
      list: makeList(80),
      itemKey: 'id',
      estimatedSize,
      fixedSize,
    });
  }

  /** 喂 n 条列表项的尺寸上报，每条用不同的 key（同一 key 报同样的值不算变化） */
  function report(count: number, size: number, from = 0) {
    const entries = Array.from({ length: count }, (_, i) => {
      const target = document.createElement('div');
      target.dataset.id = String(from + i);
      return {
        target,
        borderBoxSize: [{ blockSize: size, inlineSize: size }],
        contentRect: { height: size, width: size },
      } as unknown as ResizeObserverEntry;
    });
    roCallback?.(entries, {} as ResizeObserver);
  }

  it('实测远小于配置时提示，并给出建议值', () => {
    const core = setup(80);
    report(32, 24);

    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0]![0]);
    expect(msg).toContain('配置 80');
    expect(msg).toContain('实测中位数 24');
    expect(msg).toContain('建议改为 24');
    // 非 fixedSize 讲的是首屏渲染项数
    expect(msg).toContain('首屏渲染的项数');
    expect(core.getState().itemsTotalSize).toBeGreaterThan(0);
  });

  it('实测远大于配置时同样提示', () => {
    setup(20);
    report(32, 120);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain('实测中位数 120');
  });

  it('相差在一倍以内不提示（不定高列表本来就参差不齐）', () => {
    setup(40);
    report(32, 60);

    expect(warn).not.toHaveBeenCalled();
  });

  it('恰好两倍不提示，超过才提示（边界）', () => {
    setup(40);
    report(32, 80);
    expect(warn).not.toHaveBeenCalled();

    setup(40);
    report(32, 81, 100);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('样本不足时不提示——头几项常常不典型', () => {
    setup(80);
    report(10, 24);

    expect(warn).not.toHaveBeenCalled();
  });

  it('只提示一次，后续上报不再重复', () => {
    setup(80);
    report(32, 24);
    expect(warn).toHaveBeenCalledTimes(1);

    report(64, 24, 100);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('用中位数而不是均值，几条超长项不会触发误报', () => {
    setup(40);
    // 30 条正常高度 + 2 条超长：均值被拉到 100 以上，中位数仍是 44
    report(30, 44);
    report(2, 2000, 50);

    expect(warn).not.toHaveBeenCalled();
  });

  it('fixedSize 模式下的提示指向错位风险', () => {
    setup(40, true);
    report(32, 96);

    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0]![0]);
    expect(msg).toContain('fixedSize');
    expect(msg).toContain('错位');
  });

  it('插槽尺寸不参与诊断', () => {
    setup(80);

    // 32 条插槽上报（header / footer / client），一条列表项都没有
    for (let i = 0; i < 32; i += 1) {
      const target = document.createElement('div');
      target.dataset.id = i % 2 === 0 ? 'header' : 'footer';
      roCallback?.(
        [
          {
            target,
            borderBoxSize: [{ blockSize: 24 + i, inlineSize: 24 }],
            contentRect: { height: 24 + i, width: 24 },
          } as unknown as ResizeObserverEntry,
        ],
        {} as ResizeObserver,
      );
    }

    expect(warn).not.toHaveBeenCalled();
  });
});
