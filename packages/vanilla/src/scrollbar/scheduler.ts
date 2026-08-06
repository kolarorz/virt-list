/**
 * 每帧至多执行一次的调度器。
 *
 * 滚动输入的到达频率与刷新率无关：高刷鼠标的 mousemove、触摸板的 wheel、
 * touchmove 都可能一帧来好几个。合并到一次 rAF 里执行，既省掉重复的区间计算，
 * 又保证内容位移与 DOM patch 落在同一帧提交。
 */
export interface FrameScheduler {
  /** 排入本帧的任务，同一帧内重复调用只保留最后一个 */
  schedule(fn: () => void): void;
  /** 立即执行待办任务（用于手势结束时不再等下一帧） */
  flush(): void;
  cancel(): void;
}

export function createFrameScheduler(): FrameScheduler {
  let rafId: number | null = null;
  let pending: (() => void) | null = null;

  const run = (): void => {
    rafId = null;
    const fn = pending;
    pending = null;
    fn?.();
  };

  return {
    schedule(fn) {
      pending = fn;
      // 测试环境或极老的宿主没有 rAF，退化成同步执行而不是静默丢弃
      if (typeof requestAnimationFrame === 'undefined') {
        run();
        return;
      }
      if (rafId === null) rafId = requestAnimationFrame(run);
    },
    flush() {
      if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
      }
      if (pending) run();
    },
    cancel() {
      if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
      }
      rafId = null;
      pending = null;
    },
  };
}
