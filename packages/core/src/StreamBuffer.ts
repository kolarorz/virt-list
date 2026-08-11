/**
 * 流式输出的帧内合并。
 *
 * 真实的 SSE 每帧可能只给几个字符，一秒能来上百次。若每个 token 都直接触发一次
 * 渲染，开销会集中在框架的 diff（React 要重建数组、Vue 要跑一轮 patch）上，
 * 而不是虚拟滚动本身——列表结构压根没变。
 *
 * 这里把一帧内到达的所有片段合成一次回调。视觉上没有区别：屏幕本来也只有
 * 一帧刷新一次。
 *
 * 刻意只做「合并」这一件事，不持有业务状态：回调拿到的是**本帧的增量**，
 * 全文仍由使用方自己往数据里累加——那份数据是项被回收后重新渲染的依据，
 * 不该有第二份副本。
 */

export interface StreamBuffer {
  /** 收到一个片段。同一帧内的多次调用会被合并成一次 flush */
  push(chunk: string): void;
  /**
   * 立即冲刷当前积压的内容。
   *
   * 流结束时必须调一次：最后一批片段可能还压在缓冲里等下一帧，
   * 而那一帧永远不会来了（生成已经停了，没有新的 push 去驱动它）。
   */
  flush(): void;
  /** 丢弃积压内容并取消待执行的 flush（用户中断生成、组件卸载） */
  cancel(): void;
}

/**
 * @param onFlush 每帧至多调用一次，参数是这一帧合并后的增量文本
 */
export function createStreamBuffer(
  onFlush: (chunk: string) => void,
): StreamBuffer {
  /**
   * 积压的片段。用数组攒着最后 join，而不是每次做字符串拼接：
   * 一帧内可能来几十个片段，逐次拼接是 O(n²) 的字符复制。
   */
  let pending: string[] = [];
  let frame: number | null = null;

  /** 没有 rAF 的环境（SSR、单测）退化为同步调用，语义仍然成立 */
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : null;

  function emit(): void {
    frame = null;
    if (pending.length === 0) return;
    const merged = pending.join('');
    pending = [];
    onFlush(merged);
  }

  return {
    push(chunk: string): void {
      // 空片段不占一帧：有些服务端会发心跳帧
      if (!chunk) return;
      pending.push(chunk);

      if (!schedule) {
        emit();
        return;
      }
      if (frame === null) frame = schedule(emit);
    },

    flush(): void {
      if (frame !== null && schedule) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      emit();
    },

    cancel(): void {
      if (frame !== null && schedule) {
        cancelAnimationFrame(frame);
      }
      frame = null;
      pending = [];
    },
  };
}
