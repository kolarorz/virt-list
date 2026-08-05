import { describe, expect, it, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

/**
 * 不定高模式下的头部增删。
 *
 * 与 VirtListAutoFixScroll 的区别只有一个：那边跑的是 fixed，_calcRange 会用
 * 一次除法无条件重算区间；这边不定高，走的是增量搜索路径——聊天室与双向分页
 * 都是不定高，白屏正是出在这条路径上。
 */

const REAL_SIZE = 50;
const PRE_SIZE = 40;
const CLIENT_SIZE = 200;

interface Item {
  id: string;
  text: string;
}

function makeList(n: number, prefix = 'a', start = 0): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${start + i}`,
    text: `item-${start + i}`,
  }));
}

function makeScrollEl(totalSize: () => number, clientSize: number) {
  const el = document.createElement('div');
  let value = 0;
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => value,
    set: (v: number) => {
      const max = Math.max(0, totalSize() - clientSize);
      value = Math.min(Math.max(v, 0), max);
    },
  });
  return el;
}

function setup(list: Item[], opts?: { headerSize?: number }) {
  const events = { update: vi.fn() };
  const core = new VirtListCore<Item>(
    { list, itemKey: 'id', itemPreSize: PRE_SIZE },
    events,
  );
  const el = makeScrollEl(() => core.getTotalSize(), CLIENT_SIZE);
  core.slotSize.clientSize = CLIENT_SIZE;
  core.slotSize.headerSize = opts?.headerSize ?? 0;
  core.bindDOM(el);
  // 所有项都测量过真实尺寸（与预估值不同，这样才能暴露尺寸相关的错算）
  list.forEach((it) => core.setItemSize(it.id, REAL_SIZE));
  core.forceUpdate();
  return { core, el, events };
}

function scrollTo(el: HTMLElement, offset: number) {
  el.scrollTop = offset;
  el.dispatchEvent(new Event('scroll'));
}

/**
 * 某一项的顶部相对视口顶部的偏移（正数表示在视口下方）。
 *
 * 「视口内容不动」的精确表述就是这个值在列表变更前后保持不变——比"inViewBegin
 * 指向哪一项"更本质：有 header 时视口顶部那一行可能是上一项的尾部，
 * inViewBegin 会变，但内容并没有移动。
 */
function relOffsetOf(
  core: VirtListCore<Item>,
  el: HTMLElement,
  key: string,
): number {
  const index = core.props.list.findIndex((it) => it.id === key);
  if (index < 0) throw new Error(`列表中找不到 ${key}`);
  return core.getItemPosByIndex(index).top - el.scrollTop;
}

/** 视口顶部那一项是否真的被摆在视口里——白屏就是这个不变量被破坏 */
function viewportIsConsistent(core: VirtListCore<Item>, el: HTMLElement) {
  const state = core.getState();
  const offset = el.scrollTop;
  // 渲染窗口必须覆盖可视区
  const covers =
    state.renderBegin <= state.inViewBegin &&
    state.renderEnd >= state.inViewBegin;
  // inViewBegin 那一项的顶部应当落在视口附近（允许一项的误差）
  const top = core.getItemPosByIndex(state.inViewBegin).top;
  const near = Math.abs(top - offset) <= REAL_SIZE;
  return { covers, near, top, offset, state };
}

describe('不定高模式下的头部增删（白屏回归）', () => {
  it('向上滚到顶后头部插入，视口仍指向原内容且渲染窗口覆盖可视区', () => {
    const list = makeList(60);
    const { core, el } = setup(list);

    // 先向下滚，再向上滚到顶——把 _direction 置为 forward，
    // 这正是「滚到顶触发加载上一页」的真实时序
    scrollTo(el, 1000);
    scrollTo(el, 0);
    expect(core.getState().inViewBegin).toBe(0);
    const relBefore = relOffsetOf(core, el, 'a-0');

    const inserted = makeList(20, 'older');
    inserted.forEach((it) => core.setItemSize(it.id, REAL_SIZE));
    core.updateOptions({ list: [...inserted, ...list] });

    expect(relOffsetOf(core, el, 'a-0')).toBe(relBefore);
    const { covers, near, top, offset, state } = viewportIsConsistent(core, el);
    expect(core.props.list[state.inViewBegin]!.id).toBe('a-0');
    expect(covers).toBe(true);
    expect(near, `inViewBegin 顶部=${top} 与 scrollTop=${offset} 相距过远`).toBe(true);
  });

  it('停在中间向上滚后头部插入，视口内容不变', () => {
    const list = makeList(60);
    const { core, el } = setup(list);

    scrollTo(el, 1000);
    scrollTo(el, 800); // forward，但不在顶部
    const keyAtTop = core.props.list[core.getState().inViewBegin]!.id;
    const relBefore = relOffsetOf(core, el, keyAtTop);

    const inserted = makeList(20, 'older');
    inserted.forEach((it) => core.setItemSize(it.id, REAL_SIZE));
    core.updateOptions({ list: [...inserted, ...list] });

    expect(relOffsetOf(core, el, keyAtTop)).toBe(relBefore);
    const { covers, near, state } = viewportIsConsistent(core, el);
    expect(core.props.list[state.inViewBegin]!.id).toBe(keyAtTop);
    expect(covers).toBe(true);
    expect(near).toBe(true);
  });

  it('带 header 时补偿同样正确（加载提示条会占高度）', () => {
    const list = makeList(60);
    const { core, el } = setup(list, { headerSize: 30 });

    scrollTo(el, 1000);
    scrollTo(el, 0);
    // 停在顶部时视口顶部落在 header 里，a-0 在其下方——补偿要保持这个相对位置
    const relBefore = relOffsetOf(core, el, 'a-0');

    const inserted = makeList(20, 'older');
    inserted.forEach((it) => core.setItemSize(it.id, REAL_SIZE));
    core.updateOptions({ list: [...inserted, ...list] });

    expect(relOffsetOf(core, el, 'a-0')).toBe(relBefore);

    // 视口顶部那一行此时是最后一个插入项的尾部，不再是 a-0；
    // 关键是它必须落在渲染窗口内，否则那块就是空白
    const { covers, near, state } = viewportIsConsistent(core, el);
    expect(core.props.list[state.inViewBegin]!.id).toBe('older-19');
    expect(covers).toBe(true);
    expect(near).toBe(true);
  });

  it('双向分页：头部加一页尾部删一页，视口内容不变', () => {
    const list = makeList(100);
    const { core, el } = setup(list);

    scrollTo(el, 2000);
    scrollTo(el, 1500); // forward
    const keyAtTop = core.props.list[core.getState().inViewBegin]!.id;

    const relBefore = relOffsetOf(core, el, keyAtTop);
    const pageSize = 20;
    const inserted = makeList(pageSize, 'older');
    inserted.forEach((it) => core.setItemSize(it.id, REAL_SIZE));
    core.updateOptions({
      list: [...inserted, ...list.slice(0, list.length - pageSize)],
    });

    expect(relOffsetOf(core, el, keyAtTop)).toBe(relBefore);
    const { covers, near, state } = viewportIsConsistent(core, el);
    expect(core.props.list[state.inViewBegin]!.id).toBe(keyAtTop);
    expect(covers).toBe(true);
    expect(near).toBe(true);
  });

  it('头部删除后视口内容不变', () => {
    const list = makeList(100);
    const { core, el } = setup(list);

    scrollTo(el, 2000);
    scrollTo(el, 1500);
    const keyAtTop = core.props.list[core.getState().inViewBegin]!.id;
    const relBefore = relOffsetOf(core, el, keyAtTop);

    core.updateOptions({ list: list.slice(20) });

    expect(relOffsetOf(core, el, keyAtTop)).toBe(relBefore);
    const { covers, near, state } = viewportIsConsistent(core, el);
    expect(core.props.list[state.inViewBegin]!.id).toBe(keyAtTop);
    expect(covers).toBe(true);
    expect(near).toBe(true);
  });

  it('带 header 且插入项事后测量：原内容不被挤下去', () => {
    const OriginalRO = globalThis.ResizeObserver;
    const ro: { cb: ResizeObserverCallback | null } = { cb: null };
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        ro.cb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    try {
      const list = makeList(60);
      const { core, el } = setup(list, { headerSize: 30 });

      scrollTo(el, 1000);
      scrollTo(el, 0);
      const relBefore = relOffsetOf(core, el, 'a-0');

      // 插入项按 itemPreSize(40) 估算，真实高度 120——补偿只能按估算值算，
      // 差额要靠锚点在测量后补回来
      const inserted = makeList(20, 'older');
      core.updateOptions({ list: [...inserted, ...list] });
      expect(relOffsetOf(core, el, 'a-0')).toBe(relBefore);

      // 视口顶部此刻是最后一个插入项（尚未测量），锚点不能锚在它身上——
      // 它自己一变高就会把 a-0 推下去
      const entries = inserted.map((it) => {
        const target = document.createElement('div');
        target.dataset.id = it.id;
        return {
          target,
          borderBoxSize: [{ blockSize: 120, inlineSize: 120 }],
          contentRect: { height: 120, width: 120 },
        } as unknown as ResizeObserverEntry;
      });
      ro.cb?.(entries, {} as ResizeObserver);

      // 上方内容实际比估算高出 20*(120-40)=1600，scrollTop 必须跟着补上，
      // 否则用户看的内容就被整体挤到下面去了
      expect(relOffsetOf(core, el, 'a-0')).toBe(relBefore);
    } finally {
      globalThis.ResizeObserver = OriginalRO;
    }
  });

  it('插入项的真实尺寸事后由 ResizeObserver 上报，锚点把视口拉回同一段内容', () => {
    const OriginalRO = globalThis.ResizeObserver;
    // 用对象持有而不是裸变量：只在 class 构造函数里赋值，裸变量会被 TS
    // 的控制流分析窄化成 never，调用处就报「不可调用」
    const ro: { cb: ResizeObserverCallback | null } = { cb: null };
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        ro.cb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    try {
      const list = makeList(60);
      const { core, el } = setup(list);

      scrollTo(el, 1000);
      scrollTo(el, 0);

      // 插入项按 itemPreSize(40) 估算，真实高度是 120——聊天室里长短消息混排
      // 就是这个情形，估算与实测差得远
      const inserted = makeList(20, 'older');
      core.updateOptions({ list: [...inserted, ...list] });

      const offsetBefore = el.scrollTop;
      expect(core.props.list[core.getState().inViewBegin]!.id).toBe('a-0');

      // 插入项进入渲染窗口后陆续报上真实尺寸
      const entries = inserted.slice(0, 6).map((it) => {
        const target = document.createElement('div');
        target.dataset.id = it.id;
        return {
          target,
          borderBoxSize: [{ blockSize: 120, inlineSize: 240 }],
          contentRect: { height: 120, width: 240 },
        } as unknown as ResizeObserverEntry;
      });
      ro.cb?.(entries, {} as ResizeObserver);

      // 视口上方的项变高了，scrollTop 必须跟着增大，否则内容会向下跳；
      // 而视口顶部指向的仍应是 a-0
      expect(el.scrollTop).toBeGreaterThan(offsetBefore);
      const { covers, near, state } = viewportIsConsistent(core, el);
      expect(core.props.list[state.inViewBegin]!.id).toBe('a-0');
      expect(covers).toBe(true);
      expect(near).toBe(true);
    } finally {
      globalThis.ResizeObserver = OriginalRO;
    }
  });

  it('新插入项尚未测量（真实场景：尺寸要等渲染后才知道）也不白屏', () => {
    const list = makeList(60);
    const { core, el } = setup(list);

    scrollTo(el, 1000);
    scrollTo(el, 0);

    // 不预设尺寸，插入项按 itemPreSize 估算
    const inserted = makeList(20, 'older');
    core.updateOptions({ list: [...inserted, ...list] });

    const { covers, near, state } = viewportIsConsistent(core, el);
    expect(core.props.list[state.inViewBegin]!.id).toBe('a-0');
    expect(covers).toBe(true);
    expect(near).toBe(true);
  });
});
