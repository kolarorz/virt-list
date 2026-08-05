import { describe, it, expect, beforeAll } from 'vitest';
import { VirtTree } from '../src/tree/VirtTree';
import '../src/tree/tree.css';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

function createContainer(): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    clientWidth: { get: () => 300 },
    clientHeight: { get: () => 400 },
  });
  document.body.appendChild(el);
  return el;
}

function makeTree(roots = 20, children = 4) {
  return Array.from({ length: roots }, (_, i) => ({
    key: `${i}`,
    title: `Node-${i}`,
    children: Array.from({ length: children }, (_, j) => ({
      key: `${i}-${j}`,
      title: `Node-${i}-${j}`,
    })),
  }));
}

function makeTreeInstance(data: any, opts: any = {}) {
  return new VirtTree(createContainer(), {
    list: data,
    itemPreSize: 30,
    checkable: true,
    ...opts,
  } as any);
}

/**
 * 批量勾选会把父级冒泡延后到循环结束（否则每个 key 都要付一趟全树遍历，
 * 整体退化成 O(k·n)）。这一组用例锁定「延后冒泡」与「逐个立即冒泡」结果一致。
 */
describe('VirtTree 批量勾选', () => {
  const data = makeTree();

  /** 逐个调用 checkNode，每次都走单节点的立即冒泡路径 */
  function oneByOne(keys: string[], opts: any = {}) {
    const tree = makeTreeInstance(data, opts);
    for (const k of keys) tree.checkNode(k, true);
    return tree;
  }

  /** 一次性传入整个数组，走延后冒泡的批量路径 */
  function batched(keys: string[], opts: any = {}) {
    const tree = makeTreeInstance(data, opts);
    tree.checkNode(keys, true);
    return tree;
  }

  it('叶子节点混合：选中集与半选集与逐个调用完全一致', () => {
    const keys = ['0-0', '0-1', '3-2', '7-0', '7-1', '7-2', '7-3'];
    const expected = oneByOne(keys);
    const actual = batched(keys);

    expect(actual.getCheckedKeys()).toEqual(expected.getCheckedKeys());
    expect(actual.getHalfCheckedKeys()).toEqual(expected.getHalfCheckedKeys());
    // 7 的四个子节点全部选中 → 7 自身应被冒泡为选中
    expect(actual.getCheckedKeys()).toContain('7');
    // 0 只选中两个子节点 → 半选
    expect(actual.getHalfCheckedKeys()).toContain('0');
  });

  it('父子 key 混合传入时结果一致（父节点会级联覆盖子节点）', () => {
    const keys = ['1-0', '1', '5', '5-2'];
    const expected = oneByOne(keys);
    const actual = batched(keys);

    expect(actual.getCheckedKeys()).toEqual(expected.getCheckedKeys());
    expect(actual.getHalfCheckedKeys()).toEqual(expected.getHalfCheckedKeys());
  });

  it('checkedStrictly 下既不级联也不冒泡', () => {
    const keys = ['2-0', '2-1'];
    const expected = oneByOne(keys, { checkedStrictly: true });
    const actual = batched(keys, { checkedStrictly: true });

    expect(actual.getCheckedKeys()).toEqual(expected.getCheckedKeys());
    expect(actual.getCheckedKeys()).toEqual(keys);
    expect(actual.getHalfCheckedKeys()).toEqual([]);
  });

  it('构造时传入 checkedKeys 与逐个 checkNode 等价', () => {
    const keys = ['0-0', '0-1', '0-2', '0-3', '9-0'];
    const expected = oneByOne(keys);
    const actual = makeTreeInstance(data, { checkedKeys: keys });

    expect(actual.getCheckedKeys()).toEqual(expected.getCheckedKeys());
    expect(actual.getHalfCheckedKeys()).toEqual(expected.getHalfCheckedKeys());
    expect(actual.getCheckedKeys()).toContain('0');
  });

  it('批量取消后不残留半选状态', () => {
    const all = ['0-0', '0-1', '0-2', '0-3'];
    const tree = batched(all);
    expect(tree.getCheckedKeys()).toContain('0');

    tree.checkNode(all, false);
    expect(tree.getCheckedKeys()).toEqual([]);
    expect(tree.getHalfCheckedKeys()).toEqual([]);
  });

  it('disableCheckbox 的节点被跳过，不影响其余节点的冒泡', () => {
    const tree = makeTreeInstance([
      {
        key: 'p',
        title: 'p',
        children: [
          { key: 'c1', title: 'c1' },
          { key: 'c2', title: 'c2', disableCheckbox: true },
        ],
      },
    ]);

    tree.checkNode(['c1', 'c2'], true);
    // c2 被跳过，但 c1 是唯一可勾选的子节点，故 p 仍被冒泡为选中。
    // 顺序基准是后序遍历，父节点排在子节点之后
    expect(tree.getCheckedKeys()).toEqual(['c1', 'p']);
  });

  it('传入的 key 全部不存在时不产生任何状态', () => {
    const tree = batched(['nope-1', 'nope-2']);
    expect(tree.getCheckedKeys()).toEqual([]);
    expect(tree.getHalfCheckedKeys()).toEqual([]);
  });
});

describe('VirtTree key 顺序基准', () => {
  it('setList 后排序基准随新数据重建', () => {
    const tree = makeTreeInstance(makeTree(5, 2));
    tree.checkNode(['0-0', '0-1'], true);
    expect(tree.getCheckedKeys()).toEqual(['0-0', '0-1', '0']);

    // 换成一批 key 的字典序与数据顺序相反的新数据
    tree.setList([
      { key: 'z', title: 'z', children: [{ key: 'z-0', title: 'z-0' }] },
      { key: 'a', title: 'a', children: [{ key: 'a-0', title: 'a-0' }] },
    ] as any);
    tree.checkNode(['a-0', 'z-0'], true);

    // 按新数据的遍历顺序（z 在前）而非字典序，说明基准表确实重建了
    expect(tree.getCheckedKeys()).toEqual(['z-0', 'z', 'a-0', 'a']);
  });
});
