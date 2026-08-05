/**
 * 白屏自检（临时诊断用，五个框架的折叠消息示例共用一份）。
 *
 * 判据只有一条：视口这块区域，是不是真的被渲染出来的项盖住了。盖不住就是用户
 * 眼里的白屏。
 *
 * 关键在于**用 getBoundingClientRect 拿浏览器真实布局**，而不是问列表内部的
 * 计算结果——后者是拿自己的账本核对自己，账本本身错了就查不出来。
 */

export interface DiagnosticsHost {
  /** 示例的根容器，自检从这里往下找 data-id="client" 的滚动容器 */
  root: () => HTMLElement | null;
  /** 当前数据量 */
  listLength: () => number;
  /** 列表内部记录的插槽尺寸 */
  slotSize: () => { clientSize: number; headerSize: number } | undefined;
  /** 列表内部记录的某项尺寸 */
  itemSize: (key: string) => number;
}

/** update 事件里那个 state，这里只用到两个字段 */
export interface DiagnosticsState {
  renderBegin?: number;
  renderEnd?: number;
}

/** 插槽元素也带 data-id，逐项检查时要跳过 */
const SLOT_IDS = [
  'client',
  'header',
  'footer',
  'stickyHeader',
  'stickyFooter',
];

/** 亚像素舍入不算问题，只报肉眼可见的 */
const VISIBLE_GAP = 8;

export interface BlankScreenDiagnostics {
  /** 排一次检查，每帧最多真的量一次 */
  schedule: (state?: DiagnosticsState) => void;
  /** 丢弃挂起的检查（组件卸载时调用） */
  dispose: () => void;
}

/**
 * @param host 从各框架取内部状态的适配器
 * @param onText 结论回调，空串表示一切正常
 */
export function createBlankScreenDiagnostics(
  host: DiagnosticsHost,
  onText: (text: string) => void,
): BlankScreenDiagnostics {
  /** 到目前为止出现过的最大空白，用来抓住转瞬即逝的那一次 */
  let worstGap = 0;
  let rafId: number | null = null;

  function run(state?: DiagnosticsState): void {
    const root = host.root();
    if (!root) return;
    const clientEl = root.querySelector<HTMLElement>('[data-id="client"]');
    if (!clientEl) return;

    const items = Array.from(
      clientEl.querySelectorAll<HTMLElement>('div[data-id]'),
    ).filter((el) => !SLOT_IDS.includes(el.dataset.id ?? ''));

    if (items.length === 0) {
      onText('没有渲染任何项');
      return;
    }

    const view = clientEl.getBoundingClientRect();
    const blockTop = items[0]!.getBoundingClientRect().top;
    const blockBottom = items[items.length - 1]!.getBoundingClientRect().bottom;

    const gapTop = Math.round(blockTop - view.top);
    const gapBottom = Math.round(view.bottom - blockBottom);
    const atListEnd = (state?.renderEnd ?? -1) >= host.listLength() - 1;

    const problems: string[] = [];
    if (gapTop > VISIBLE_GAP) problems.push(`顶部空白 ${gapTop}px`);
    if (gapBottom > VISIBLE_GAP && !atListEnd) {
      problems.push(`底部空白 ${gapBottom}px`);
    }

    // 列表记的可视高度 vs 浏览器实际的可视高度。前者用来算渲染区间，
    // 小了就会少渲染，视口下方留白
    const slot = host.slotSize();
    const coreClientSize = slot?.clientSize ?? 0;
    const realClientSize = clientEl.clientHeight;
    const clientSizeDrift = Math.round(realClientSize - coreClientSize);
    if (Math.abs(clientSizeDrift) > 2) {
      problems.push(`可视高度偏差 ${clientSizeDrift}px`);
    }

    const worst = Math.max(gapTop, atListEnd ? 0 : gapBottom);
    if (worst > worstGap) worstGap = worst;

    if (problems.length === 0) {
      onText(worstGap > VISIBLE_GAP ? `曾出现最大空白 ${worstGap}px` : '');
      return;
    }

    onText(
      `${problems.join('，')}（滚动位置 ${Math.round(clientEl.scrollTop)}）` +
        (worstGap > VISIBLE_GAP ? ` | 最大空白 ${worstGap}px` : ''),
    );

    // eslint-disable-next-line no-console
    console.warn('[虚拟列表白屏自检]', {
      问题: problems.join('，'),
      scrollTop: clientEl.scrollTop,
      列表记的可视高度: coreClientSize,
      浏览器实际可视高度: realClientSize,
      可视高度偏差: clientSizeDrift,
      列表记的header高度: slot?.headerSize,
      渲染块顶: Math.round(blockTop - view.top),
      渲染块底: Math.round(blockBottom - view.top),
      渲染项数: items.length,
      首项: items[0]!.dataset.id,
      末项: items[items.length - 1]!.dataset.id,
      // 每项的浏览器实际高度 vs 列表记录的尺寸，不一致说明测量没跟上
      各项高度: items.map((el) => {
        const id = el.dataset.id!;
        const real = Math.round(el.getBoundingClientRect().height);
        const known = Math.round(host.itemSize(id));
        return `${id}: 实际${real} / 记录${known}${real !== known ? ' ←不一致' : ''}`;
      }),
      state: state && { ...state },
    });
  }

  return {
    schedule(state) {
      // getBoundingClientRect 会强制布局，滚动中每帧最多量一次
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        // 等这一轮 DOM 落定再量，否则读到的是上一帧的几何
        run(state);
      });
    },
    dispose() {
      if (rafId === null) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}
