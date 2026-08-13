import { describe, it, expect } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';
import type { ListUpdateReason } from '../src/types';

/**
 * 一个外部事件 = 一次 update 通知。
 *
 * 这是响应式更新与滚动的性能契约。core 内部处理一个外部事件（列表换了、一批项
 * 测出新尺寸、强制刷新）要经过好几步校正：区间 → leadingSize → 偏移量补偿 →
 * 贴底求解。每一步都会顺手发通知，而它们全是通往同一个终态的中间态。
 *
 * 逐次发出去的代价是实打实的：DOM 层每收到一次就要重摆各段、重建 key 集合、
 * 把可见项过一遍；带 `list` / `force` 的那几次还会让每个可见项重出内容，于是
 * Vue / vue2 的插槽多求值一遍、Tree 的整池 DOM 多重建一遍。
 *
 * 合并只在**一个事件内部**发生：两次滚动、两批尺寸上报各自代表一次真实变化，
 * 仍然逐次通知。原因也不能被合并冲淡 —— 取事务内最强的那个
 * （range < size < force < list），DOM 层靠它决定要不要重出内容。
 */

const KEY = 'id';

function mk(from: number, n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `k${from + i}`, v: 0 }));
}

function setup(list: any[]) {
  const reasons: ListUpdateReason[] = [];
  const core = new VirtListCore<any>(
    { list, itemKey: KEY, estimatedSize: 50, fixedSize: true },
    { update: (_rl, _st, reason) => reasons.push(reason) },
  );
  core.bindDOM(document.createElement('div'));
  core.slotSize.clientSize = 400;
  return { core, reasons };
}

describe('列表变更的通知次数', () => {
  it('尾部追加只通知一次，reason 为 list', () => {
    const { core, reasons } = setup(mk(0, 1000));
    reasons.length = 0;

    core.updateOptions({ list: [...mk(0, 1000), ...mk(1000, 1)] });

    expect(reasons).toEqual(['list']);
  });

  it('整体换新（同长度、同 key）只通知一次', () => {
    const list = mk(0, 1000);
    const { core, reasons } = setup(list);
    reasons.length = 0;

    core.updateOptions({ list: list.map((it) => ({ ...it, v: 1 })) });

    expect(reasons).toEqual(['list']);
  });

  it('头部插入只通知一次（此前是三次）', () => {
    const { core, reasons } = setup(mk(0, 1000));
    core.scrollToOffset(5000);
    reasons.length = 0;

    core.updateOptions({ list: [...mk(-10, 10), ...mk(0, 1000)] });

    expect(reasons).toEqual(['list']);
  });

  it('头部删除只通知一次', () => {
    const { core, reasons } = setup(mk(0, 1000));
    core.scrollToOffset(5000);
    reasons.length = 0;

    core.updateOptions({ list: mk(10, 990) });

    expect(reasons).toEqual(['list']);
  });

  it('列表清空只通知一次', () => {
    const { core, reasons } = setup(mk(0, 1000));
    reasons.length = 0;

    core.updateOptions({ list: [] });

    expect(reasons).toEqual(['list']);
  });

  it('合并只发生在列表变更内：滚动与尺寸仍逐次通知', () => {
    const { core, reasons } = setup(mk(0, 1000));
    reasons.length = 0;

    core.scrollFromUser(500);
    core.scrollFromUser(1000);
    core.setSlotSize('header', 30);

    // 两次滚动各自代表一次真实位置变化，尺寸上报同理
    expect(reasons).toEqual(['range', 'range', 'size']);
  });

  it('变更回调里同步再改一次列表：只在最外层出栈时通知一次', () => {
    const reasons: ListUpdateReason[] = [];
    let nested = 0;
    let core!: VirtListCore<any>;
    core = new VirtListCore<any>(
      { list: mk(0, 1000), itemKey: KEY, estimatedSize: 50, fixedSize: true },
      {
        update: (_rl, _st, reason) => reasons.push(reason),
        // 头部补偿会同步写偏移量并发出 scroll，使用方在这里再改一次列表
        // 就构成了嵌套事务——真实代码里「滚动到顶就换数据源」正是这种写法
        scroll: () => {
          if (nested > 0) return;
          nested += 1;
          core.updateOptions({ list: mk(0, 500) });
        },
      },
    );
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;
    core.scrollToOffset(5000);
    reasons.length = 0;

    core.updateOptions({ list: [...mk(-10, 10), ...mk(0, 1000)] });

    expect(nested).toBe(1);
    // 嵌套的那次没有单独发通知，最外层出栈时一并代表
    expect(reasons).toEqual(['list']);
  });

  it('通知发出时状态已是终态（不会看到中间态的 leadingSize）', () => {
    const seen: Array<{ begin: number; leading: number }> = [];
    const list = mk(0, 1000);
    const core = new VirtListCore<any>(
      { list, itemKey: KEY, estimatedSize: 50, fixedSize: true },
      {
        update: (_rl, st) =>
          seen.push({ begin: st.renderBegin, leading: st.leadingSize }),
      },
    );
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;
    core.scrollToOffset(5000);
    seen.length = 0;

    core.updateOptions({ list: [...mk(-10, 10), ...mk(0, 1000)] });

    expect(seen).toHaveLength(1);
    // 补偿之后视口停在原来那一项上，leadingSize 与 renderBegin 自洽
    expect(seen[0]!.leading).toBe(seen[0]!.begin * 50);
  });
});

describe('其余路径的通知次数', () => {
  /** 装一个可控的 ResizeObserver，返回触发回调的句柄 */
  function setupWithRO(list: any[]) {
    const reasons: ListUpdateReason[] = [];
    let roCb: ResizeObserverCallback | null = null;
    const Original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        roCb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    const core = new VirtListCore<any>(
      { list, itemKey: KEY, estimatedSize: 50 },
      { update: (_rl, _st, reason) => reasons.push(reason) },
    );
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;

    /** 让前 n 个渲染中的项各报一个新尺寸 */
    const reportSizes = (n: number, size: number) => {
      const entries = core.renderList.slice(0, n).map((it: any) => {
        const el = document.createElement('div');
        el.dataset.id = it.id;
        return {
          target: el,
          borderBoxSize: [{ blockSize: size, inlineSize: size }],
          contentRect: { height: size, width: size },
        } as unknown as ResizeObserverEntry;
      });
      (roCb as unknown as ResizeObserverCallback)(entries, {} as ResizeObserver);
    };

    return { core, reasons, reportSizes, restore: () => {
      globalThis.ResizeObserver = Original;
    } };
  }

  it('forceUpdate 只通知一次，reason 为 force', () => {
    const { core, reasons, restore } = setupWithRO(mk(0, 1000));
    core.scrollToOffset(2000);
    reasons.length = 0;

    core.forceUpdate();

    // _updateRange 内部自报的那次 range 是中间态，不该单独发出去
    expect(reasons).toEqual(['force']);
    restore();
  });

  it('一批项上报尺寸只通知一次，reason 为 size', () => {
    const { core, reasons, reportSizes, restore } = setupWithRO(mk(0, 1000));
    core.scrollToOffset(2000);
    reasons.length = 0;

    reportSizes(5, 80);

    // 尺寸变化会牵动偏移量修正（_resolvePinned 自报 range），但这一批只是一个事件
    expect(reasons).toEqual(['size']);
    restore();
  });

  it('两批尺寸上报仍是两次通知（合并只在一个事件内）', () => {
    const { core, reasons, reportSizes, restore } = setupWithRO(mk(0, 1000));
    core.scrollToOffset(2000);
    reasons.length = 0;

    reportSizes(3, 80);
    reportSizes(3, 90);

    expect(reasons).toEqual(['size', 'size']);
    restore();
  });

  it('尺寸上报里同步换了列表：原因升级为 list', () => {
    const reasons: ListUpdateReason[] = [];
    let roCb: ResizeObserverCallback | null = null;
    const Original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        roCb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    let nested = 0;
    let core!: VirtListCore<any>;
    core = new VirtListCore<any>(
      { list: mk(0, 1000), itemKey: KEY, estimatedSize: 50 },
      {
        update: (_rl, _st, reason) => reasons.push(reason),
        // itemResize 在 RO 的 entry 循环里同步发出，使用方在这里换数据
        // （"这条消息量出来了，顺手把列表刷一遍"）就构成了跨类型的嵌套事务
        itemResize: () => {
          if (nested > 0) return;
          nested += 1;
          core.updateOptions({ list: mk(0, 1200) });
        },
      },
    );
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;
    const first = core.renderList[0] as any;
    reasons.length = 0;

    const el = document.createElement('div');
    el.dataset.id = first.id;
    (roCb as unknown as ResizeObserverCallback)(
      [
        {
          target: el,
          borderBoxSize: [{ blockSize: 80, inlineSize: 80 }],
          contentRect: { height: 80, width: 80 },
        } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );

    expect(nested).toBe(1);
    // size 与 list 混在一个事务里，取更强的 list —— 否则可见项不会重出内容
    expect(reasons).toEqual(['list']);
    globalThis.ResizeObserver = Original;
  });
});
