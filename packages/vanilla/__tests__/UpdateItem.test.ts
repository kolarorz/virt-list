import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';
import { VirtGrid } from '../src/VirtGrid';

/**
 * updateItem：让「同一个 key 的数据变了」自动生效，且**只**在数据真的变了时生效。
 *
 * 渲染池里已有的 key 不会重新执行 renderItem（增量 patch 的核心优化），于是
 * 不可变更新（`list.map(it => it.id === id ? {...it, text} : it)`）与流式输出下
 * 内容会停在挂载那一刻。`updateItem` 补的就是这一环：core 通知 DOM 层本次 patch
 * 的原因（见 ListUpdateReason），只有 `list` / `force` 那两类才带最新数据回调它。
 *
 * 另一半同样要锁住：滚动（`range`）与尺寸上报（`size`）每帧都在发，
 * 在那里重出内容等于把虚拟滚动的优化还回去。
 */

interface Item {
  id: number;
  label: string;
}

describe('updateItem', () => {
  let host: HTMLElement;
  let vl: VirtList<Item>;
  let list: Item[];
  /** updateItem 收到的 (id, index)，按调用顺序 */
  let updateCalls: Array<[number, number]>;
  let renderCalls: number[];

  function build(extra: Record<string, unknown> = {}) {
    vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item, _index, el) => {
        renderCalls.push(item.id);
        el.textContent = item.label;
      },
      updateItem: (item, index, el) => {
        updateCalls.push([item.id, index]);
        el.textContent = item.label;
      },
      ...extra,
    });
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
    list = Array.from({ length: 200 }, (_, i) => ({ id: i, label: `原始 ${i}` }));
    updateCalls = [];
    renderCalls = [];
  });

  afterEach(() => {
    vl?.destroy();
    document.body.innerHTML = '';
  });

  /** 当前渲染出来的项：key → 文本 */
  function rendered() {
    const out = new Map<string, string>();
    for (const el of vl.clientEl.querySelectorAll<HTMLElement>('[data-id]')) {
      const key = el.dataset.id!;
      if (/^\d+$/.test(key)) out.set(key, el.textContent ?? '');
    }
    return out;
  }

  it('不可变替换后，同 key 的内容跟着更新', () => {
    build();
    const key = Number([...rendered().keys()][0]!);

    // React 惯用、Vue 里也常见的写法：整个数组换成新对象
    vl.setList(
      list.map((it) => (it.id === key ? { ...it, label: '改过了' } : it)),
    );

    expect(rendered().get(String(key))).toBe('改过了');
  });

  it('更新走的是原地更新，不重建 DOM 元素', () => {
    build();
    const key = [...rendered().keys()][0]!;
    const before = vl.clientEl.querySelector(`[data-id="${key}"]`);
    renderCalls = [];

    vl.setList(list.map((it) => ({ ...it, label: `改过 ${it.id}` })));

    // 元素本身被复用（refreshItems 那条路会换新元素，这里不会）
    expect(vl.clientEl.querySelector(`[data-id="${key}"]`)).toBe(before);
    // 复用的项不会再走 renderItem
    expect(renderCalls).not.toContain(Number(key));
  });

  it('原地 mutate 后 setList 同样生效', () => {
    build();
    const key = Number([...rendered().keys()][0]!);
    list[key]!.label = '原地改的';

    vl.setList([...list]);

    expect(rendered().get(String(key))).toBe('原地改的');
  });

  it('滚动引起的 patch 不调 updateItem', () => {
    build();
    updateCalls = [];

    vl.scrollToIndex(50);

    // 新进入窗口的项走 renderItem，池里已有的项只调位置
    expect(renderCalls.length).toBeGreaterThan(0);
    expect(updateCalls).toEqual([]);
  });

  it('尺寸上报引起的 patch 不调 updateItem', () => {
    build();
    updateCalls = [];

    // 插槽尺寸变化是 reason='size' 的一条同步通道
    vl.core.setSlotSize('header', 24);

    expect(updateCalls).toEqual([]);
  });

  it('列表变更时每个可见项都收到最新的 index', () => {
    build();
    const visible = [...rendered().keys()].map(Number);
    expect(visible.length).toBeGreaterThan(1);
    updateCalls = [];

    // 尾部追加不移动头部，index 与 key 仍一一对应
    vl.setList([...list, { id: 999, label: '新项' }]);

    for (const [id, index] of updateCalls) {
      expect(index).toBe(id);
    }
    expect(updateCalls.length).toBeGreaterThan(0);
  });

  it('不提供 updateItem 时行为与从前一致（内容不刷新）', () => {
    vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item, _index, el) => {
        el.textContent = item.label;
      },
    });
    const key = Number([...rendered().keys()][0]!);

    vl.setList(
      list.map((it) => (it.id === key ? { ...it, label: '改过了' } : it)),
    );

    expect(rendered().get(String(key))).toBe(`原始 ${key}`);
  });

  describe('函数式 itemStyle / itemClass 在复用时重算', () => {
    it('头部插入后，复用项按新的 index 重算', () => {
      build({
        itemClass: (_item: Item, index: number) => `row-${index}`,
        itemStyle: (_item: Item, index: number) => `--i:${index};`,
      });

      const key = [...rendered().keys()][0]!;
      const el = vl.clientEl.querySelector<HTMLElement>(`[data-id="${key}"]`)!;
      expect(el.className).toBe(`row-${key}`);

      // 头部插入两项：后面所有项的 index 都往后挪 2
      vl.setList([
        { id: 1001, label: '插入 1' },
        { id: 1002, label: '插入 2' },
        ...list,
      ]);

      const shifted = Number(key) + 2;
      expect(el.className).toBe(`row-${shifted}`);
      expect(el.getAttribute('style')).toContain(`--i:${shifted}`);
    });

    it('class 从有到无时会被清掉', () => {
      let withClass = true;
      build({
        itemClass: () => (withClass ? 'highlight' : ''),
      });

      const key = [...rendered().keys()][0]!;
      const el = vl.clientEl.querySelector<HTMLElement>(`[data-id="${key}"]`)!;
      expect(el.className).toBe('highlight');

      withClass = false;
      vl.setList([...list]);

      expect(el.className).toBe('');
    });

    it('静态 itemStyle / itemClass 不受影响', () => {
      build({ itemClass: 'static-row', itemStyle: 'color:red;' });

      const key = [...rendered().keys()][0]!;
      const el = vl.clientEl.querySelector<HTMLElement>(`[data-id="${key}"]`)!;

      vl.setList([...list]);

      expect(el.className).toBe('static-row');
      expect(el.getAttribute('style')).toContain('color:red');
    });
  });
});

describe('VirtGrid 的单元格更新', () => {
  let host: HTMLElement;
  let grid: VirtGrid<Item>;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    grid?.destroy();
    document.body.innerHTML = '';
  });

  function build(list: Item[], gridItems: number) {
    grid = new VirtGrid<Item>(host, {
      list,
      gridItems,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item, _rowIndex, _listIndex, el) => {
        el.dataset.cell = String(item.id);
        el.textContent = item.label;
      },
      updateItem: (item, _rowIndex, _listIndex, el) => {
        el.dataset.cell = String(item.id);
        el.textContent = item.label;
      },
    });
  }

  /** 渲染出来的单元格：id → 文本 */
  function cells() {
    const out = new Map<string, string>();
    for (const el of host.querySelectorAll<HTMLElement>('[data-cell]')) {
      out.set(el.dataset.cell!, el.textContent ?? '');
    }
    return out;
  }

  it('不可变替换后单元格内容更新', () => {
    const list = Array.from({ length: 9 }, (_, i) => ({ id: i, label: `原始 ${i}` }));
    build(list, 3);
    expect(cells().get('0')).toBe('原始 0');

    grid.setList(list.map((it) => ({ ...it, label: `改过 ${it.id}` })));

    expect(cells().get('0')).toBe('改过 0');
    expect(cells().get('4')).toBe('改过 4');
  });

  /**
   * 尾行的成员数会随列表长度变化，而行的 _id（起始扁平索引）不变。
   * 行元素被复用、renderItem 又不重跑，补建缺失单元格这一步只能由 _updateRow 做。
   */
  it('尾行追加的单元格会被补建', () => {
    // 4 项 / 每行 3 个 → 尾行 _id=3 只有 1 个单元格
    const list = Array.from({ length: 4 }, (_, i) => ({ id: i, label: `原始 ${i}` }));
    build(list, 3);
    expect(cells().has('3')).toBe(true);
    expect(cells().has('4')).toBe(false);

    // 追加一项：尾行 _id 不变，成员从 1 个变 2 个
    grid.setList([...list, { id: 4, label: '第五项' }]);

    expect(cells().get('4')).toBe('第五项');
  });

  /**
   * 删掉中间一项后每行的 _id 不变、装的人整体前移，而行元素与单元格容器都被复用。
   * 有 updateItem 时这一切原地消化，不重建任何 DOM。
   */
  it('删掉中间某项后单元格前移，且行元素被复用', () => {
    const list = Array.from({ length: 9 }, (_, i) => ({ id: i, label: `原始 ${i}` }));
    build(list, 3);
    const firstRow = host.querySelector('[data-id="0"]');
    const firstCell = host.querySelector<HTMLElement>('[data-cell]');

    grid.setList(list.filter((it) => it.id !== 1));

    expect([...cells().keys()]).not.toContain('1');
    // 第二格现在装的是 item 2
    const secondCell = host.querySelectorAll<HTMLElement>('[data-cell]')[1]!;
    expect(secondCell.dataset.cell).toBe('2');
    // 行元素与第一个单元格容器都是原来那个
    expect(host.querySelector('[data-id="0"]')).toBe(firstRow);
    expect(host.querySelector('[data-cell]')).toBe(firstCell);
  });

  /**
   * 纯 DOM 用法（不注入 updateItem）走的是另一条路：setList 里作废成员变了的行，
   * 让它们按新数据重建。内容同样要正确，代价是那几行的 DOM 换新。
   */
  it('没有 updateItem 时，靠作废重建保证内容正确', () => {
    const list = Array.from({ length: 9 }, (_, i) => ({ id: i, label: `原始 ${i}` }));
    grid = new VirtGrid<Item>(host, {
      list,
      gridItems: 3,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item, _rowIndex, _listIndex, el) => {
        el.dataset.cell = String(item.id);
        el.textContent = item.label;
      },
    });
    const firstRow = host.querySelector('[data-id="0"]');

    grid.setList(list.filter((it) => it.id !== 1));

    expect([...cells().keys()]).not.toContain('1');
    expect(host.querySelectorAll<HTMLElement>('[data-cell]')[1]!.dataset.cell).toBe('2');
    // 成员变了的行被重建，元素换新 —— 这是这条路径的代价
    expect(host.querySelector('[data-id="0"]')).not.toBe(firstRow);
  });

  it('尾行减少的单元格会被收回', () => {
    const list = Array.from({ length: 5 }, (_, i) => ({ id: i, label: `原始 ${i}` }));
    build(list, 3);
    expect(cells().has('4')).toBe(true);

    grid.setList(list.slice(0, 4));

    expect(cells().has('4')).toBe(false);
    expect(cells().has('3')).toBe(true);
  });
});
