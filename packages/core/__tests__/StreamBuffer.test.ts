import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStreamBuffer } from '../src/StreamBuffer';

/**
 * 帧内合并。
 *
 * 手动接管 requestAnimationFrame，才能确定「哪些片段落在同一帧」——
 * 这正是这个工具唯一要保证的事。
 */
describe('createStreamBuffer', () => {
  let frames: Array<() => void>;
  let nextId: number;

  beforeEach(() => {
    frames = [];
    nextId = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
      frames.push(cb);
      return nextId++;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      // 这里只需要让「取消过的帧不再执行」成立，用 id 定位即可
      frames.splice(id - 1, 1, () => {});
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** 跑完当前排队的所有帧 */
  function runFrames() {
    const queued = frames;
    frames = [];
    for (const cb of queued) cb();
  }

  it('同一帧内的多个片段合并成一次回调', () => {
    const onFlush = vi.fn();
    const buf = createStreamBuffer(onFlush);

    buf.push('你');
    buf.push('好');
    buf.push('世界');

    // 帧还没到，一次都不该调
    expect(onFlush).not.toHaveBeenCalled();

    runFrames();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith('你好世界');
  });

  it('跨帧的片段分开回调', () => {
    const onFlush = vi.fn();
    const buf = createStreamBuffer(onFlush);

    buf.push('第一帧');
    runFrames();
    buf.push('第二帧');
    runFrames();

    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush.mock.calls.map((c) => c[0])).toEqual(['第一帧', '第二帧']);
  });

  it('回调拿到的是增量，不是累积的全文', () => {
    const onFlush = vi.fn();
    const buf = createStreamBuffer(onFlush);

    buf.push('abc');
    runFrames();
    buf.push('def');
    runFrames();

    // 第二次是 'def' 而不是 'abcdef'——全文由使用方自己累加
    expect(onFlush.mock.calls[1]![0]).toBe('def');
  });

  it('空片段不占一帧（服务端心跳）', () => {
    const onFlush = vi.fn();
    const buf = createStreamBuffer(onFlush);

    buf.push('');
    expect(frames).toHaveLength(0);

    runFrames();
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('flush 立即冲刷积压内容', () => {
    const onFlush = vi.fn();
    const buf = createStreamBuffer(onFlush);

    buf.push('最后一批');
    buf.flush();

    expect(onFlush).toHaveBeenCalledWith('最后一批');

    // 已经冲刷过，排队的那一帧不该再重复回调
    runFrames();
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('没有积压时 flush 不产生空回调', () => {
    const onFlush = vi.fn();
    const buf = createStreamBuffer(onFlush);

    buf.flush();
    buf.flush();

    expect(onFlush).not.toHaveBeenCalled();
  });

  it('cancel 丢弃积压内容，且不再回调', () => {
    const onFlush = vi.fn();
    const buf = createStreamBuffer(onFlush);

    buf.push('要被丢掉的内容');
    buf.cancel();
    runFrames();

    expect(onFlush).not.toHaveBeenCalled();
  });

  it('cancel 之后仍可继续使用', () => {
    const onFlush = vi.fn();
    const buf = createStreamBuffer(onFlush);

    buf.push('旧的');
    buf.cancel();
    buf.push('新的');
    runFrames();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith('新的');
  });

  it('没有 rAF 的环境退化为同步回调', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const onFlush = vi.fn();
    const buf = createStreamBuffer(onFlush);

    buf.push('立刻');

    expect(onFlush).toHaveBeenCalledWith('立刻');
  });
});
