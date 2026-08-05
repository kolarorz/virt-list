import { describe, expect, it } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';
import type { ListState } from '../src/types';

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: String(i) }));
}

function makeScrollEl() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  return el;
}

function setup(n: number, opts: Record<string, unknown> = {}) {
  const el = makeScrollEl();
  const core = new VirtListCore({
    list: makeList(n),
    itemKey: 'id',
    itemPreSize: 40,
    ...opts,
  });
  core.bindDOM(el);
  core.slotSize.clientSize = 800;
  return { core, el };
}

function scrollTo(el: HTMLElement, offset: number) {
  el.scrollTop = offset;
  el.dispatchEvent(new Event('scroll'));
}

function snapshot(state: ListState) {
  const { inViewBegin, inViewEnd, renderBegin, renderEnd, virtualSize } = state;
  return { inViewBegin, inViewEnd, renderBegin, renderEnd, virtualSize };
}

/**
 * fixed 模式下 _calcRange / _calculateViewEnd 走的是除法快路径（O(1)），
 * 不定高模式走逐项搜索。两者在「每项尺寸都恰好等于 itemPreSize」时必须给出
 * 完全相同的区间——这组用例就是拿不定高路径当作 fixed 快路径的参照实现。
 */
describe('fixed 区间计算与不定高逐项搜索等价', () => {
  const N = 500;
  const cases: Array<{ name: string; offsets: number[] }> = [
    { name: '逐步向下滚动', offsets: [0, 40, 120, 400, 1000, 4000] },
    { name: '逐步向上滚动', offsets: [8000, 4000, 1000, 400, 40, 0] },
    { name: '一次性大跳到末尾再跳回开头', offsets: [19960, 0, 19960] },
    { name: '在项内部的非整数倍偏移', offsets: [37, 79, 81, 1234, 1235] },
    { name: '来回抖动', offsets: [2000, 1960, 2040, 1960, 2000] },
  ];

  for (const { name, offsets } of cases) {
    it(name, () => {
      const fixed = setup(N, { fixed: true });
      // 不设任何实测尺寸，getItemSize 恒返回 itemPreSize，与 fixed 等价
      const dynamic = setup(N);

      for (const offset of offsets) {
        scrollTo(fixed.el, offset);
        scrollTo(dynamic.el, offset);
        expect(snapshot(fixed.core.state), `offset=${offset}`).toEqual(
          snapshot(dynamic.core.state),
        );
      }
    });
  }

  it('带 buffer 与 header 时同样一致', () => {
    const fixed = setup(N, { fixed: true, buffer: 5 });
    const dynamic = setup(N, { buffer: 5 });
    fixed.core.slotSize.headerSize = 60;
    dynamic.core.slotSize.headerSize = 60;

    for (const offset of [0, 60, 100, 500, 5000, 19000, 200]) {
      scrollTo(fixed.el, offset);
      scrollTo(dynamic.el, offset);
      expect(snapshot(fixed.core.state), `offset=${offset}`).toEqual(
        snapshot(dynamic.core.state),
      );
    }
  });

  it('itemGap 计入单项尺寸后仍一致', () => {
    const fixed = setup(N, { fixed: true, itemGap: 8 });
    const dynamic = setup(N, { itemGap: 8 });

    for (const offset of [0, 48, 96, 500, 4800, 23000]) {
      scrollTo(fixed.el, offset);
      scrollTo(dynamic.el, offset);
      expect(snapshot(fixed.core.state), `offset=${offset}`).toEqual(
        snapshot(dynamic.core.state),
      );
    }
  });

  it('fixed 定位与 getItemPosByIndex 自洽', () => {
    const { core, el } = setup(N, { fixed: true });
    // 第 137 项顶部
    scrollTo(el, core.getItemPosByIndex(137).top);
    expect(core.state.inViewBegin).toBe(137);
    // 该项内部偏移 1px，仍应停在同一项
    scrollTo(el, core.getItemPosByIndex(137).top + 1);
    expect(core.state.inViewBegin).toBe(137);
    // 下一项顶部
    scrollTo(el, core.getItemPosByIndex(138).top);
    expect(core.state.inViewBegin).toBe(138);
  });
});

/**
 * 目标偏移超出内容总高时，backward 的逐项搜索会一无所获。
 * 修复前 start 保持原值 → 区间永远停在原地不更新（白跑一趟循环还什么都没做）。
 */
describe('偏移超出内容总高时的兜底', () => {
  it('不定高：落到末项而不是停在原地', () => {
    const { core, el } = setup(200);
    expect(core.state.inViewBegin).toBe(0);

    // 内容总高 200*40=8000，这里给一个远超的偏移
    scrollTo(el, 999999);

    expect(core.state.inViewBegin).toBe(199);
  });

  it('fixed：同样落到末项', () => {
    const { core, el } = setup(200, { fixed: true });
    scrollTo(el, 999999);
    expect(core.state.inViewBegin).toBe(199);
  });

  it('超界后还能正常滚回来', () => {
    const { core, el } = setup(200);
    scrollTo(el, 999999);
    expect(core.state.inViewBegin).toBe(199);

    scrollTo(el, 400);
    expect(core.state.inViewBegin).toBe(10);
    scrollTo(el, 0);
    expect(core.state.inViewBegin).toBe(0);
  });
});
