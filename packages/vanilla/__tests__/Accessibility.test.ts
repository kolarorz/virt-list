import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 虚拟滚动的无障碍缺口。
 *
 * DOM 里只有视口附近那几十项，于是：
 * - 屏幕阅读器按元素个数推断规模，三万条会被朗读成「共 20 项」；
 * - 程序把用户带到别处（引用跳转、搜索定位）时视口动了而焦点没动，
 *   辅助技术用户得不到任何提示。
 *
 * 这两件事都不是浏览器能自己解决的，必须由库显式告知。
 */

interface Item {
  id: number;
  text: string;
}

const TOTAL = 3000;

describe('无障碍语义与焦点', () => {
  let host: HTMLElement;
  let vl: VirtList<Item>;
  let list: Item[];

  function create(options: Record<string, unknown> = {}) {
    list = Array.from({ length: TOTAL }, (_, i) => ({ id: i, text: `第 ${i} 项` }));
    return new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item) => {
        const el = document.createElement('div');
        el.textContent = item.text;
        return el;
      },
      ...options,
    } as never);
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    vl?.destroy();
    document.body.innerHTML = '';
  });

  function items() {
    return Array.from(vl.clientEl.querySelectorAll<HTMLElement>('[data-id]')).filter(
      (el) => /^\d+$/.test(el.dataset.id ?? ''),
    );
  }

  it('默认不加任何 role——不擅自改变既有 DOM 的语义', () => {
    vl = create();

    expect(vl.itemsEl.hasAttribute('role')).toBe(false);
    for (const el of items()) {
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-posinset')).toBe(false);
    }
  });

  it('开启后每项都带上数据里的真实位置与总数', () => {
    vl = create({ aria: true, ariaLabel: '消息列表' });

    expect(vl.itemsEl.getAttribute('role')).toBe('list');
    expect(vl.itemsEl.getAttribute('aria-label')).toBe('消息列表');

    const rendered = items();
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(TOTAL);

    for (const el of rendered) {
      const index = Number(el.dataset.id);
      expect(el.getAttribute('role')).toBe('listitem');
      // posinset 是 1-based
      expect(el.getAttribute('aria-posinset')).toBe(String(index + 1));
      // 关键：总数来自数据，不是 DOM 里的元素个数
      expect(el.getAttribute('aria-setsize')).toBe(String(TOTAL));
    }
  });

  it('listbox 模式下项的角色是 option', () => {
    vl = create({ aria: 'listbox' });

    expect(vl.itemsEl.getAttribute('role')).toBe('listbox');
    for (const el of items()) {
      expect(el.getAttribute('role')).toBe('option');
    }
  });

  it('数据变长后 setsize 跟着更新', () => {
    vl = create({ aria: true });
    expect(items()[0]!.getAttribute('aria-setsize')).toBe(String(TOTAL));

    vl.setList([...list, { id: TOTAL, text: '新增' }]);

    expect(items()[0]!.getAttribute('aria-setsize')).toBe(String(TOTAL + 1));
  });

  it('头部插入后 posinset 整体后移（复用的项也要更新）', () => {
    vl = create({ aria: true });
    const firstKey = items()[0]!.dataset.id;

    // 往头部插 5 项：原来的项在整个列表里的序号都要 +5
    const older = Array.from({ length: 5 }, (_, i) => ({ id: -1 - i, text: `更早 ${i}` }));
    vl.setList([...older, ...list]);

    const el = vl.clientEl.querySelector<HTMLElement>(`[data-id="${firstKey}"]`);
    if (el) {
      // 该项仍在 DOM 里（被复用），序号必须已经更新
      expect(el.getAttribute('aria-posinset')).toBe(String(Number(firstKey) + 5 + 1));
    }
  });

  it('scrollToIndex 带 focus 时把焦点移到目标项', () => {
    vl = create({ aria: true });

    vl.scrollToIndex(1200, { focus: true });

    const active = document.activeElement as HTMLElement | null;
    expect(active?.dataset.id).toBe('1200');
    // 用 -1 而不是 0：项会被回收，全塞进 Tab 序列会让键盘用户走不出列表
    expect(active?.getAttribute('tabindex')).toBe('-1');
  });

  it('不传 focus 时不动焦点', () => {
    vl = create();
    const before = document.activeElement;

    vl.scrollToIndex(1200);

    expect(document.activeElement).toBe(before);
  });

  it('scrollIntoView 同样支持 focus', () => {
    vl = create();

    vl.scrollIntoView(800, { focus: true });

    expect((document.activeElement as HTMLElement | null)?.dataset.id).toBe('800');
  });

  it('目标索引越界时不抛错、也不动焦点', () => {
    vl = create();
    const before = document.activeElement;

    vl.scrollToIndex(999999, { focus: true });

    expect(document.activeElement).toBe(before);
  });
});
