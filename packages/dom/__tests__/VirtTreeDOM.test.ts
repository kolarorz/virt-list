import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { VirtTreeDOM } from '../src/tree/VirtTreeDOM';
import type {
  VirtTreeDOMOptions,
  VirtTreeDOMEvents,
  TreeNode,
  TreeNodeKey,
} from '../src/tree/types';

// Vitest handles CSS imports in jsdom mode
import '../src/tree/tree.css';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

function createContainer(width = 300, height = 400): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    clientWidth: { get: () => width },
    clientHeight: { get: () => height },
  });
  document.body.appendChild(el);
  return el;
}

function makeTree(rootCount = 5, childCount = 3) {
  return Array.from({ length: rootCount }, (_, i) => ({
    key: `${i}`,
    title: `Node-${i}`,
    children: Array.from({ length: childCount }, (_, j) => ({
      key: `${i}-${j}`,
      title: `Node-${i}-${j}`,
    })),
  }));
}

const baseOptions = (): Pick<
  VirtTreeDOMOptions,
  'itemPreSize' | 'buffer' | 'indent' | 'iconSize' | 'itemGap'
> => ({
  itemPreSize: 32,
  buffer: 2,
  indent: 16,
  iconSize: 16,
  itemGap: 0,
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VirtTreeDOM', () => {
  describe('initialization', () => {
    it('creates tree from data with roots collapsed by default', () => {
      const container = createContainer();
      const list = makeTree(3, 2);
      const tree = new VirtTreeDOM(container, {
        list,
        ...baseOptions(),
      });

      const root0 = tree.getTreeNode('0');
      expect(root0).toBeDefined();
      expect(root0!.title).toBe('Node-0');
      expect(tree.hasExpanded(root0!)).toBe(false);
    });

    it('respects defaultExpandAll', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: makeTree(2, 2),
        defaultExpandAll: true,
        ...baseOptions(),
      });

      const root0 = tree.getTreeNode('0');
      expect(tree.hasExpanded(root0!)).toBe(true);
    });

    it('respects initial expandedKeys', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: makeTree(2, 2),
        expandedKeys: ['1'],
        ...baseOptions(),
      });

      expect(tree.hasExpanded(tree.getTreeNode('1')!)).toBe(true);
      expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(false);
    });
  });

  describe('getTreeNode', () => {
    it('retrieves node by key with correct metadata', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: makeTree(2, 2),
        ...baseOptions(),
      });

      const leaf = tree.getTreeNode('0-1');
      expect(leaf).toBeDefined();
      expect(leaf!.key).toBe('0-1');
      expect(leaf!.isLeaf).toBe(true);
      expect(leaf!.parent?.key).toBe('0');
    });
  });

  describe('expand / collapse', () => {
    it('expandAll / expandAll(false) and fires expand with correct keys', () => {
      const container = createContainer();
      const onExpand = vi.fn();
      const list = makeTree(2, 2);
      const events: VirtTreeDOMEvents = { expand: onExpand };
      const tree = new VirtTreeDOM(container, { list, ...baseOptions() }, events);

      tree.expandAll(true);
      expect(onExpand).toHaveBeenCalled();
      let [keys, data] = onExpand.mock.calls[onExpand.mock.calls.length - 1]!;
      expect(keys).toEqual(['0', '1']);
      expect(data.expanded).toBe(true);
      expect(data.expandedNodes).toHaveLength(2);

      tree.expandAll(false);
      [keys, data] = onExpand.mock.calls[onExpand.mock.calls.length - 1]!;
      expect(keys).toEqual([]);
      expect(data.expanded).toBe(false);
    });

    it('expandNode toggles expansion and reports full expanded key set', () => {
      const container = createContainer();
      const onExpand = vi.fn();
      const tree = new VirtTreeDOM(
        container,
        { list: makeTree(2, 2), ...baseOptions() },
        { expand: onExpand },
      );

      tree.expandNode('0', true);
      let [keys] = onExpand.mock.calls[onExpand.mock.calls.length - 1]!;
      expect(keys).toContain('0');
      expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(true);

      tree.expandNode('0', false);
      [keys] = onExpand.mock.calls[onExpand.mock.calls.length - 1]!;
      expect(keys).not.toContain('0');
    });

    it('setExpandedKeys sets expansion without relying on prior state', () => {
      const container = createContainer();
      const onExpand = vi.fn();
      const tree = new VirtTreeDOM(
        container,
        { list: makeTree(3, 1), ...baseOptions() },
        { expand: onExpand },
      );

      tree.setExpandedKeys(['2']);
      expect(tree.hasExpanded(tree.getTreeNode('2')!)).toBe(true);
      expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(false);
    });
  });

  describe('selection', () => {
    it('selectNode updates selection; toggleSelect fires select with sorted keys', () => {
      const container = createContainer();
      const onSelect = vi.fn();
      const tree = new VirtTreeDOM(
        container,
        {
          list: makeTree(2, 1),
          selectable: true,
          selectMultiple: true,
          ...baseOptions(),
        },
        { select: onSelect },
      );

      tree.selectNode('0', true);
      expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(true);
      expect(onSelect).not.toHaveBeenCalled();

      tree.toggleSelect(tree.getTreeNode('1')!);
      expect(onSelect).toHaveBeenCalled();
      const [keys, data] = onSelect.mock.calls[onSelect.mock.calls.length - 1]!;
      expect(keys).toEqual(expect.arrayContaining(['0', '1']));
      expect(data.selectedKeys.sort()).toEqual(['0', '1'].sort());
      expect(data.node.key).toBe('1');
      expect(data.selected).toBe(true);
    });

    it('selectMultiple false keeps a single selection via toggleSelect', () => {
      const container = createContainer();
      const onSelect = vi.fn();
      const tree = new VirtTreeDOM(
        container,
        {
          list: makeTree(2, 1),
          selectable: true,
          selectMultiple: false,
          ...baseOptions(),
        },
        { select: onSelect },
      );

      tree.toggleSelect(tree.getTreeNode('0')!);
      tree.toggleSelect(tree.getTreeNode('1')!);
      const [keys] = onSelect.mock.calls[onSelect.mock.calls.length - 1]!;
      expect(keys).toEqual(['1']);
      expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(false);
      expect(tree.hasSelected(tree.getTreeNode('1')!)).toBe(true);
    });

    it('selectAll selects or clears all selectable nodes', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: makeTree(2, 1),
        selectable: true,
        ...baseOptions(),
      });

      tree.selectAll(true);
      expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(true);
      expect(tree.hasSelected(tree.getTreeNode('0-0')!)).toBe(true);

      tree.selectAll(false);
      expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(false);
    });
  });

  describe('checkbox', () => {
    const cascadeList = () => [
      {
        key: 'p',
        title: 'Parent',
        children: [
          { key: 'c1', title: 'Child1' },
          { key: 'c2', title: 'Child2' },
        ],
      },
    ];

    it('checkNode cascades to children; getCheckedKeys / leafOnly', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: cascadeList(),
        checkable: true,
        defaultExpandAll: true,
        ...baseOptions(),
      });

      tree.checkNode('p', true);
      expect(tree.getCheckedKeys().sort()).toEqual(['c1', 'c2', 'p'].sort());
      expect(tree.getCheckedKeys(true).sort()).toEqual(['c1', 'c2'].sort());
    });

    it('partial child check yields half-checked parent', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: cascadeList(),
        checkable: true,
        defaultExpandAll: true,
        ...baseOptions(),
      });

      tree.checkNode('c1', true);
      expect(tree.getCheckedKeys()).toContain('c1');
      expect(tree.getHalfCheckedKeys()).toContain('p');
    });

    it('toggleCheckbox fires check with aggregated keys', () => {
      const container = createContainer();
      const onCheck = vi.fn();
      const tree = new VirtTreeDOM(
        container,
        {
          list: cascadeList(),
          checkable: true,
          defaultExpandAll: true,
          ...baseOptions(),
        },
        { check: onCheck },
      );

      tree.toggleCheckbox(tree.getTreeNode('c1')!);
      expect(onCheck).toHaveBeenCalled();
      const [keys, data] = onCheck.mock.calls[0]!;
      expect(keys).toContain('c1');
      expect(data.checked).toBe(true);
      expect(data.node.key).toBe('c1');
    });

    it('checkAll checks or clears every checkable node', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: cascadeList(),
        checkable: true,
        defaultExpandAll: true,
        ...baseOptions(),
      });

      tree.checkAll(true);
      expect(tree.getCheckedKeys().length).toBe(3);

      tree.checkAll(false);
      expect(tree.getCheckedKeys()).toEqual([]);
      expect(tree.getHalfCheckedKeys()).toEqual([]);
    });

    it('checkedStrictly disables cascade on checkNode', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: cascadeList(),
        checkable: true,
        checkedStrictly: true,
        defaultExpandAll: true,
        ...baseOptions(),
      });

      tree.checkNode('p', true);
      expect(tree.getCheckedKeys()).toEqual(['p']);
    });
  });

  describe('filter', () => {
    it('uses filterMethod and expands ancestors for matches', () => {
      const container = createContainer();
      const onExpand = vi.fn();
      const list = makeTree(2, 3);
      const tree = new VirtTreeDOM(
        container,
        {
          list,
          ...baseOptions(),
          filterMethod: (query: string, node: TreeNode) =>
            !query || String(node.title).toLowerCase().includes(query.toLowerCase()),
        },
        { expand: onExpand },
      );

      tree.filter('0-1');
      expect(onExpand).toHaveBeenCalled();
      const root0 = tree.getTreeNode('0')!;
      expect(tree.hasExpanded(root0)).toBe(true);
    });

    it('empty query with permissive filter shows tree again', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: makeTree(2, 2),
        ...baseOptions(),
        defaultExpandAll: true,
        filterMethod: (query: string, node: TreeNode) =>
          !query || String(node.title).toLowerCase().includes(query.toLowerCase()),
      });

      tree.filter('nope');
      tree.filter('');
      const root = tree.getTreeNode('0')!;
      expect(tree.getTreeNode('0-0')).toBeDefined();
    });
  });

  describe('setList', () => {
    it('replaces data and rebuilds nodes', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: makeTree(2, 1),
        ...baseOptions(),
      });

      tree.setList([
        { key: 'a', title: 'A', children: [{ key: 'a1', title: 'A1' }] },
      ]);

      expect(tree.getTreeNode('0')).toBeUndefined();
      expect(tree.getTreeNode('a')).toBeDefined();
      expect(tree.getTreeNode('a1')!.title).toBe('A1');
    });
  });

  describe('fieldNames', () => {
    it('maps custom id / name / children fields', () => {
      const container = createContainer();
      const raw = [
        {
          id: 10,
          name: 'Root',
          kids: [{ id: 11, name: 'Leaf' }],
        },
      ];

      const tree = new VirtTreeDOM(container, {
        list: raw as any,
        fieldNames: { key: 'id', title: 'name', children: 'kids' },
        ...baseOptions(),
      });

      const rootKey: TreeNodeKey = 10;
      const root = tree.getTreeNode(rootKey);
      expect(root?.title).toBe('Root');
      expect(tree.getTreeNode(11)?.parent?.key).toBe(10);
    });
  });

  describe('updateOptions', () => {
    it('updates expandedKeys, selectedKeys, and checkedKeys', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: makeTree(2, 2),
        selectable: true,
        checkable: true,
        ...baseOptions(),
      });

      tree.updateOptions({ expandedKeys: ['0'] });
      expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(true);

      tree.updateOptions({ selectedKeys: ['1'] });
      expect(tree.hasSelected(tree.getTreeNode('1')!)).toBe(true);

      // Leaf key: _updateCheckedKeys would strip a parent if its children are not all checked
      tree.updateOptions({ checkedKeys: ['0-0'] });
      expect(tree.getCheckedKeys()).toContain('0-0');
    });
  });

  describe('destroy', () => {
    it('clears container contents', () => {
      const container = createContainer();
      const tree = new VirtTreeDOM(container, {
        list: makeTree(1, 1),
        ...baseOptions(),
      });

      expect(container.children.length).toBeGreaterThan(0);
      tree.destroy();
      expect(container.innerHTML).toBe('');
    });
  });
});
