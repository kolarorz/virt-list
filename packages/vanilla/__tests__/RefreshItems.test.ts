import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * refreshItems：让「数据变了但 key 没变」这件事有个说得清的入口。
 *
 * 渲染池里已有的 key 不会重新执行 renderItem，这是增量 patch 的核心优化，
 * 但也意味着搜索高亮 / 折叠 / 选中态这类改动需要显式触发一次重渲染。
 */

interface Item {
  id: number;
  label: string;
}

describe('refreshItems', () => {
  let host: HTMLElement;
  let vl: VirtList<Item>;
  let list: Item[];
  let renderCalls: number[];

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);

    list = Array.from({ length: 200 }, (_, i) => ({ id: i, label: `原始 ${i}` }));
    renderCalls = [];

    vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item) => {
        renderCalls.push(item.id);
        const el = document.createElement('div');
        el.textContent = item.label;
        return el;
      },
    });
  });

  afterEach(() => {
    vl.destroy();
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

  // 这个前提只在「没给 updateItem」时成立 —— 给了就会自动更新，见 UpdateItem.test.ts。
  // 四个框架包的插槽路径都注入了 updateItem，所以组件使用方看到的是自动更新
  it('前提：没有 updateItem 时，同 key 改数据后不会自动重渲染', () => {
    const key = [...rendered().keys()][0]!;
    list[Number(key)]!.label = '改过了';

    vl.setList([...list]);

    expect(rendered().get(key)).toBe(`原始 ${key}`);
  });

  it('指定 key 后只重建那一项', () => {
    const keys = [...rendered().keys()];
    expect(keys.length).toBeGreaterThan(1);
    const target = keys[0]!;

    for (const k of keys) list[Number(k)]!.label = `改过 ${k}`;
    renderCalls = [];

    vl.refreshItems([target]);

    // 只有目标项重新执行了 renderItem
    expect(renderCalls).toEqual([Number(target)]);
    const now = rendered();
    expect(now.get(target)).toBe(`改过 ${target}`);
    // 其余项的 DOM 原样保留，仍是旧文本
    for (const k of keys.slice(1)) {
      expect(now.get(k)).toBe(`原始 ${k}`);
    }
  });

  it('可以一次刷新多项', () => {
    const keys = [...rendered().keys()].slice(0, 2);
    for (const k of keys) list[Number(k)]!.label = `改过 ${k}`;
    renderCalls = [];

    vl.refreshItems(keys);

    expect(renderCalls.sort((a, b) => a - b)).toEqual(
      keys.map(Number).sort((a, b) => a - b),
    );
    for (const k of keys) expect(rendered().get(k)).toBe(`改过 ${k}`);
  });

  it('不传 keys 时重建全部可见项', () => {
    const keys = [...rendered().keys()];
    for (const k of keys) list[Number(k)]!.label = `改过 ${k}`;
    renderCalls = [];

    vl.refreshItems();

    expect(renderCalls.sort((a, b) => a - b)).toEqual(
      keys.map(Number).sort((a, b) => a - b),
    );
  });

  it('key 不在可见范围内时是空操作，不触发重渲染', () => {
    renderCalls = [];

    // 第 199 项远在渲染窗口之外
    vl.refreshItems([199]);

    expect(renderCalls).toEqual([]);
  });

  it('数字与字符串 key 都能命中', () => {
    const key = [...rendered().keys()][0]!;
    list[Number(key)]!.label = '数字 key';
    vl.refreshItems([Number(key)]);
    expect(rendered().get(key)).toBe('数字 key');

    list[Number(key)]!.label = '字符串 key';
    vl.refreshItems([key]);
    expect(rendered().get(key)).toBe('字符串 key');
  });

  it('重建的项会重新被观测，也会走 onItemUnmounted', () => {
    const unmounted: HTMLElement[] = [];
    vl.destroy();
    vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      onItemUnmounted: (el) => unmounted.push(el),
      renderItem: (item) => {
        const el = document.createElement('div');
        el.textContent = item.label;
        return el;
      },
    });

    const key = [...rendered().keys()][0]!;
    const before = vl.clientEl.querySelector(`[data-id="${key}"]`);

    vl.refreshItems([key]);

    expect(unmounted).toHaveLength(1);
    expect(unmounted[0]).toBe(before);
    // 换成了新的元素，而不是复用旧的
    expect(vl.clientEl.querySelector(`[data-id="${key}"]`)).not.toBe(before);
  });

  it('forceUpdate 本身已含清池，不需要额外调 clearItemPool', () => {
    const spy = vi.spyOn(vl, 'clearItemPool');

    vl.forceUpdate();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
