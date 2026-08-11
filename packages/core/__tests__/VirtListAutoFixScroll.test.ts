import { describe, expect, it, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

const ITEM_SIZE = 40;

interface Item {
  id: string;
  text: string;
}

/** 生成一段 id 连续的数据，用 prefix 区分不同批次，避免 key 意外重复 */
function makeList(n: number, prefix = 'a', start = 0): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${start + i}`,
    text: `item-${start + i}`,
  }));
}

/** scrollTop 像浏览器那样被裁剪到 [0, 最大可滚动值] 的容器 */
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

function setup(list: Item[], clientSize = 200) {
  const events = { update: vi.fn() };
  const core = new VirtListCore<Item>(
    { list, itemKey: 'id', estimatedSize: ITEM_SIZE, fixedSize: true },
    events,
  );
  const el = makeScrollEl(() => core.getTotalSize(), clientSize);
  core.bindDOM(el);
  core.slotSize.clientSize = clientSize;
  return { core, el, events };
}

/** 滚动到指定偏移，并派发 scroll 事件让 core 同步内部偏移 */
function scrollTo(core: VirtListCore<any>, offset: number) {
  core.scrollFromUser(offset);
}

describe('列表变更时自动补偿滚动位移', () => {
  it('头部插入后视口内容保持不动', () => {
    const list = makeList(50);
    const { core, el } = setup(list);
    scrollTo(core, 400);

    // 视口顶部当前是哪一项，补偿后应当还是它
    const keyBefore = list[core.getState().inViewBegin]!.id;

    const inserted = makeList(20, 'prepend');
    core.updateOptions({ list: [...inserted, ...list] });

    expect(core.getOffset()).toBe(400 + 20 * ITEM_SIZE);
    expect(core.props.list[core.getState().inViewBegin]!.id).toBe(keyBefore);
  });

  it('头部删除后视口内容保持不动', () => {
    const list = makeList(50);
    const { core, el } = setup(list);
    scrollTo(core, 800);

    const keyBefore = list[core.getState().inViewBegin]!.id;

    core.updateOptions({ list: list.slice(10) });

    expect(core.getOffset()).toBe(800 - 10 * ITEM_SIZE);
    expect(core.props.list[core.getState().inViewBegin]!.id).toBe(keyBefore);
  });

  it('双向分页：头部加一页尾部删一页，长度不变也能正确补偿', () => {
    const list = makeList(100);
    const { core, el } = setup(list);
    scrollTo(core, 1000);

    const keyBefore = list[core.getState().inViewBegin]!.id;

    const pageSize = 20;
    const inserted = makeList(pageSize, 'prepend');
    const next = [...inserted, ...list.slice(0, list.length - pageSize)];
    expect(next.length).toBe(list.length); // 长度不变，只能靠 key 识别

    core.updateOptions({ list: next });

    expect(core.getOffset()).toBe(1000 + pageSize * ITEM_SIZE);
    expect(core.props.list[core.getState().inViewBegin]!.id).toBe(keyBefore);
  });




  it('尾部追加不改动滚动位置', () => {
    const list = makeList(50);
    const { core, el } = setup(list);
    scrollTo(core, 400);

    core.updateOptions({ list: [...list, ...makeList(20, 'append')] });

    expect(core.getOffset()).toBe(400);
  });

  it('整体替换数据源时不做补偿', () => {
    const list = makeList(50);
    const { core, el } = setup(list);
    scrollTo(core, 400);

    core.updateOptions({ list: makeList(50, 'other') });

    expect(core.getOffset()).toBe(400);
  });

  it('在顶部插入后仍渲染原内容并通知上层（旧代码靠 forceUpdate 兜住的那一次）', () => {
    const list = makeList(50);
    const { core, el, events } = setup(list);
    scrollTo(core, 0);
    events.update.mockClear();

    const inserted = makeList(20, 'prepend');
    core.updateOptions({ list: [...inserted, ...list] });

    // 补偿的语义是"视口内容不动"：原本停在 a-0，插入后仍应停在 a-0，
    // 新插入的 20 项落在视口上方（buffer 为 0，不进渲染窗口）
    expect(core.getOffset()).toBe(20 * ITEM_SIZE);
    expect(core.renderList[0]!.id).toBe('a-0');
    // 列表内容变了就必须通知上层，否则 DOM 停留在旧数据上
    expect(events.update).toHaveBeenCalled();
  });

  it('头部插入项已有实测尺寸时按实测尺寸补偿', () => {
    const list = makeList(50);
    const { core, el } = setup(list);
    scrollTo(core, 400);

    // 非 fixedSize 才会查 sizesMap，这里单独构造一个不定高实例
    const list2 = makeList(50);
    const events2 = { update: vi.fn() };
    const core2 = new VirtListCore<Item>(
      { list: list2, itemKey: 'id', estimatedSize: ITEM_SIZE },
      events2,
    );
    const el2 = makeScrollEl(() => core2.getTotalSize(), 200);
    core2.bindDOM(el2);
    core2.slotSize.clientSize = 200;
    scrollTo(core2, 400);

    const inserted = makeList(3, 'prepend');
    // 插入项在进入渲染窗口前就被测量过（头部插入场景的常态）
    inserted.forEach((it) => core2.setItemSize(it.id, 100));
    core2.updateOptions({ list: [...inserted, ...list2] });

    expect(core2.getOffset()).toBe(400 + 3 * 100);
  });

  it('列表清空后再填充不会拿失效的旧快照做补偿', () => {
    const list = makeList(50);
    const { core, el } = setup(list);
    scrollTo(core, 400);

    core.updateOptions({ list: [] });
    // reset 只归零内部状态，不写 DOM（既有行为），这里关心的是之后不再误补偿
    const afterClear = core.getOffset();

    core.updateOptions({ list: makeList(50, 'refill') });

    expect(core.getOffset()).toBe(afterClear);
    expect(core.getState().inViewBegin).toBe(0);
  });

  it('未绑定容器时补偿不抛错', () => {
    const list = makeList(50);
    const events = { update: vi.fn() };
    const core = new VirtListCore<Item>(
      { list, itemKey: 'id', estimatedSize: ITEM_SIZE, fixedSize: true },
      events,
    );

    expect(() => {
      core.updateOptions({ list: [...makeList(10, 'prepend'), ...list] });
    }).not.toThrow();
    expect(core.getOffset()).toBe(0);
  });
});
