/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtTree } from '../src/tree/VirtTree';
import type { VirtTreeDOMOptions } from '../src/tree/types';

const OriginalRO = globalThis.ResizeObserver;
let mounted: VirtTree[] = [];

beforeEach(() => {
  mounted = [];
  globalThis.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  for (const t of mounted) t.destroy();
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
});

/** A 自身匹配 'apple'，两个孩子都不匹配 —— 正是 hiddenExpandIcon 的触发条件 */
function makeTree() {
  return [
    { key: 'A', title: 'apple', children: [
      { key: 'A1', title: 'zeta' },
      { key: 'A2', title: 'omega' },
    ] },
    { key: 'B', title: 'banana', children: [
      { key: 'B1', title: 'apple-pie' },
    ] },
  ];
}

function mount(list: any = makeTree()) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const tree = new VirtTree(container, {
    list,
    estimatedSize: 30,
    fixedSize: true,
    filterMethod: (q: string, node: any) =>
      q === '' || String(node.title).toLowerCase().includes(q.toLowerCase()),
  } as unknown as VirtTreeDOMOptions);
  mounted.push(tree);
  return { container, tree };
}

const hiddenIcon = (tree: VirtTree) =>
  [...(tree as any)._hiddenExpandIconKeySet].sort();
const hiddenNode = (tree: VirtTree) =>
  [...(tree as any)._hiddenNodeKeySet].sort();

describe('Tree 过滤状态的生命周期', () => {
  it('每次 filter 都从零重算，不带上一轮的 hiddenExpandIcon', () => {
    const { tree } = mount();

    tree.filter('apple');
    expect(hiddenIcon(tree)).toEqual(['A']);

    // A 的孩子 A1 现在可见，A 不该再被判为"隐藏展开图标"
    tree.filter('zeta');
    expect(hiddenIcon(tree)).toEqual([]);
  });

  it('整个子树都不匹配时也不残留（该节点自己已被隐藏，判定无从更新）', () => {
    const { tree } = mount();
    tree.filter('apple');
    expect(hiddenIcon(tree)).toEqual(['A']);

    tree.filter('banana');
    expect(hiddenIcon(tree)).not.toContain('A');
  });

  it('清空查询词后两个集合都空', () => {
    const { tree } = mount();
    tree.filter('apple');
    tree.filter('');
    expect(hiddenIcon(tree)).toEqual([]);
    expect(hiddenNode(tree)).toEqual([]);
  });

  it('setList 换数据源时丢掉过滤留下的隐藏状态', () => {
    const { tree } = mount();
    tree.filter('apple');
    expect(hiddenIcon(tree)).toEqual(['A']);
    expect(hiddenNode(tree).length).toBeGreaterThan(0);

    // 新数据复用了同样的 key —— 不清就会一上来就是隐藏的
    tree.setList([
      { key: 'A', title: 'brand new', children: [{ key: 'A1', title: 'child' }] },
    ] as any);

    expect(hiddenIcon(tree)).toEqual([]);
    expect(hiddenNode(tree)).toEqual([]);
  });

  it('setList 之后复用同 key 的节点能正常显示与展开', () => {
    const { container, tree } = mount();
    tree.filter('apple'); // A1 / A2 被隐藏

    tree.setList([
      { key: 'A', title: 'fresh', children: [
        { key: 'A1', title: 'kid-1' },
        { key: 'A2', title: 'kid-2' },
      ] },
    ] as any);
    tree.expandAll(true);

    const ids = Array.from(container.querySelectorAll('.virt-tree-item'))
      .map((el) => (el as HTMLElement).dataset.id);
    expect(ids).toEqual(['A', 'A1', 'A2']);
  });
});
