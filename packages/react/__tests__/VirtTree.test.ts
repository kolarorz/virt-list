/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VirtTree } from '../src/index';
import type { VirtTreeRef } from '../src/VirtTree';

function makeTree(rootCount = 3, childCount = 2) {
  return Array.from({ length: rootCount }, (_, i) => ({
    key: `${i}`,
    title: `Node-${i}`,
    children: Array.from({ length: childCount }, (_, j) => ({
      key: `${i}-${j}`,
      title: `Node-${i}-${j}`,
    })),
  }));
}

let roCallback: ResizeObserverCallback | null = null;
const OriginalRO = globalThis.ResizeObserver;

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  roCallback = null;
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      roCallback = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function flushResize(id: string, size: number) {
  const target = document.createElement('div');
  target.dataset.id = id;
  roCallback?.(
    [
      {
        target,
        borderBoxSize: [{ blockSize: size, inlineSize: size }],
        contentRect: { height: size, width: size },
      } as unknown as ResizeObserverEntry,
    ],
    {} as ResizeObserver,
  );
}

async function mount(props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const treeRef = createRef<VirtTreeRef>();
  const root: Root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(VirtTree as any, {
        ref: treeRef,
        list: makeTree(),
        itemPreSize: 32,
        ...props,
      }),
    );
  });

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 400);

  return { container, treeRef, root, clientEl };
}

function item(container: HTMLElement, key: string): HTMLElement {
  return container.querySelector(`.virt-tree-item[data-id="${key}"]`)!;
}

function visibleKeys(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.virt-tree-item')).map(
    (el) => (el as HTMLElement).dataset.id!,
  );
}

function clickPart(container: HTMLElement, key: string, selector: string) {
  item(container, key)
    .querySelector(selector)!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

async function unmount(root: Root) {
  await act(async () => {
    root.unmount();
  });
}

describe('React VirtTree 渲染', () => {
  it('挂载后渲染树节点，根节点默认折叠', async () => {
    const { container, root } = await mount();

    expect(visibleKeys(container)).toEqual(['0', '1', '2']);
    expect(item(container, '0').textContent).toContain('Node-0');

    await unmount(root);
  });

  it('defaultExpandAll 展开全部', async () => {
    const { container, root } = await mount({ defaultExpandAll: true });

    expect(visibleKeys(container)).toEqual([
      '0', '0-0', '0-1', '1', '1-0', '1-1', '2', '2-0', '2-1',
    ]);

    await unmount(root);
  });

  it('初始 expandedKeys / selectedKeys / checkedKeys 生效', async () => {
    const { container, treeRef, root } = await mount({
      selectable: true,
      checkable: true,
      expandedKeys: ['1'],
      selectedKeys: ['0'],
      checkedKeys: ['2-0'],
    });

    expect(visibleKeys(container)).toEqual(['0', '1', '1-0', '1-1', '2']);
    expect(
      item(container, '0')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-selected'),
    ).toBe(true);
    expect(treeRef.current!.getCheckedKeys()).toContain('2-0');

    await unmount(root);
  });

  it('list 引用变化后重建整棵树', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const render = async (list: any[]) => {
      await act(async () => {
        root.render(
          createElement(VirtTree as any, { list, itemPreSize: 32 }),
        );
      });
    };

    await render(makeTree(2, 1));
    flushResize('client', 400);
    expect(visibleKeys(container)).toEqual(['0', '1']);

    await render([{ key: 'x', title: 'X' }]);

    expect(visibleKeys(container)).toEqual(['x']);

    await unmount(root);
  });

  it('受控 keys 变化后同步到视图', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const list = makeTree();
    const treeRef = createRef<VirtTreeRef>();
    const render = async (keys: {
      expandedKeys?: string[];
      selectedKeys?: string[];
      checkedKeys?: string[];
      focusedKeys?: string[];
    }) => {
      await act(async () => {
        root.render(
          createElement(VirtTree as any, {
            ref: treeRef,
            list,
            itemPreSize: 32,
            selectable: true,
            checkable: true,
            ...keys,
          }),
        );
      });
    };

    await render({ expandedKeys: [] });
    flushResize('client', 400);
    expect(visibleKeys(container)).toEqual(['0', '1', '2']);

    await render({ expandedKeys: ['1'] });
    expect(visibleKeys(container)).toEqual(['0', '1', '1-0', '1-1', '2']);

    await render({ expandedKeys: ['1'], selectedKeys: ['2'] });
    expect(
      item(container, '2')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-selected'),
    ).toBe(true);

    await render({ expandedKeys: ['1'], checkedKeys: ['1-0'] });
    expect(treeRef.current!.getCheckedKeys()).toEqual(['1-0']);
    expect(treeRef.current!.getHalfCheckedKeys()).toEqual(['1']);

    await render({ expandedKeys: ['1'], focusedKeys: ['0'] });
    expect(
      item(container, '0')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-focused'),
    ).toBe(true);

    await unmount(root);
  });

  it('内容相同的新数组不会触发重建（React 里内联数组是常态）', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const list = makeTree();
    const onUpdate = vi.fn();
    const render = async (expandedKeys: string[]) => {
      await act(async () => {
        root.render(
          createElement(VirtTree as any, {
            list,
            itemPreSize: 32,
            expandedKeys,
            onUpdate,
          }),
        );
      });
    };

    await render(['1']);
    flushResize('client', 400);
    onUpdate.mockClear();

    // 同样内容、不同引用
    await render(['1']);

    expect(onUpdate).not.toHaveBeenCalled();
    expect(visibleKeys(container)).toEqual(['0', '1', '1-0', '1-1', '2']);

    await unmount(root);
  });

  it('未传的 keys 保持不受控，不会被清空', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const list = makeTree();
    const treeRef = createRef<VirtTreeRef>();
    const render = async (expandedKeys: string[]) => {
      await act(async () => {
        root.render(
          createElement(VirtTree as any, {
            ref: treeRef,
            list,
            itemPreSize: 32,
            checkable: true,
            expandedKeys,
          }),
        );
      });
    };

    await render([]);
    flushResize('client', 400);
    // 勾选状态由 ref API 驱动（checkedKeys 未受控）
    treeRef.current!.checkNode('0-0', true);
    expect(treeRef.current!.getCheckedKeys()).toEqual(['0-0']);

    // 只改 expandedKeys，勾选不该被顺带清掉
    await render(['1']);

    expect(treeRef.current!.getCheckedKeys()).toEqual(['0-0']);

    await unmount(root);
  });

  it('showLine / indent / itemClass 等外观选项透传', async () => {
    const { container, root } = await mount({
      expandedKeys: ['0'],
      showLine: true,
      indent: 24,
      itemClass: 'my-node',
    });

    const block = item(container, '0-0').querySelector(
      '.virt-tree-node-indent-block',
    ) as HTMLElement;
    expect(block.style.width).toBe('24px');
    expect(
      block.classList.contains('virt-tree-node-indent-block-line-vertical'),
    ).toBe(true);
    expect(item(container, '0').className).toContain('my-node');

    await unmount(root);
  });
});

describe('React VirtTree 交互事件', () => {
  it('点击图标触发 onExpand', async () => {
    const onExpand = vi.fn();
    const { container, root } = await mount({ onExpand });

    clickPart(container, '0', '.virt-tree-icon');

    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onExpand.mock.calls[0]![0]).toEqual(['0']);
    expect(visibleKeys(container)).toContain('0-0');

    await unmount(root);
  });

  it('点击内容区触发 onSelect', async () => {
    const onSelect = vi.fn();
    const { container, root } = await mount({ selectable: true, onSelect });

    clickPart(container, '1', '.virt-tree-node-content');

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]![0]).toEqual(['1']);

    await unmount(root);
  });

  it('点击复选框触发 onCheck 并级联', async () => {
    const onCheck = vi.fn();
    const { container, root } = await mount({ checkable: true, onCheck });

    clickPart(container, '0', '.virt-tree-checkbox');

    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(onCheck.mock.calls[0]![0]).toEqual(['0-0', '0-1', '0']);

    await unmount(root);
  });

  it('点击节点触发 onNodeClick', async () => {
    const onNodeClick = vi.fn();
    const { container, root } = await mount({ onNodeClick });

    clickPart(container, '1', '.virt-tree-node-content');

    expect(onNodeClick).toHaveBeenCalledTimes(1);
    const [data, node, e] = onNodeClick.mock.calls[0]!;
    expect(data.key).toBe('1');
    expect(node.key).toBe('1');
    expect(e).toBeInstanceOf(MouseEvent);

    await unmount(root);
  });

  it('滚动与更新事件被转发', async () => {
    const onScroll = vi.fn();
    const onUpdate = vi.fn();
    const { clientEl, root } = await mount({ onScroll, onUpdate });

    expect(onUpdate).toHaveBeenCalled();

    clientEl.scrollTop = 32;
    clientEl.dispatchEvent(new Event('scroll'));

    expect(onScroll).toHaveBeenCalled();

    await unmount(root);
  });
});

describe('React VirtTree ref API', () => {
  it('展开相关方法', async () => {
    const { container, treeRef, root } = await mount();
    const api = treeRef.current!;

    api.expandAll(true);
    expect(visibleKeys(container).length).toBe(9);

    api.setExpandedKeys([]);
    expect(visibleKeys(container).length).toBe(3);

    api.expandNode('0', true);
    expect(visibleKeys(container)).toContain('0-0');

    api.toggleExpand(api.getTreeNode('0')!);
    expect(visibleKeys(container)).not.toContain('0-0');

    await unmount(root);
  });

  it('选择相关方法', async () => {
    const { container, treeRef, root } = await mount({
      selectable: true,
      selectMultiple: true,
    });
    const api = treeRef.current!;

    api.selectNode('1', true);
    expect(
      item(container, '1')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-selected'),
    ).toBe(true);

    api.selectAll(true);
    expect(
      item(container, '0')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-selected'),
    ).toBe(true);

    api.selectAll(false);
    expect(
      item(container, '0')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-selected'),
    ).toBe(false);

    await unmount(root);
  });

  it('勾选相关方法与半选查询', async () => {
    const { treeRef, root } = await mount({ checkable: true });
    const api = treeRef.current!;

    api.checkNode('0-0', true);
    expect(api.getCheckedKeys()).toEqual(['0-0']);
    expect(api.getHalfCheckedKeys()).toEqual(['0']);

    api.checkNode('0-1', true);
    expect(api.getCheckedKeys()).toContain('0');
    expect(api.getHalfCheckedKeys()).toEqual([]);
    expect(api.getCheckedKeys(true)).toEqual(['0-0', '0-1']);

    api.checkAll(false);
    expect(api.getCheckedKeys()).toEqual([]);

    api.toggleCheckbox(api.getTreeNode('1')!);
    expect(api.getCheckedKeys()).toContain('1');

    await unmount(root);
  });

  it('setFocusedKeys 与 filter', async () => {
    const { container, treeRef, root } = await mount({
      filterMethod: (query: string, node: any) =>
        (node.title as string).includes(query),
    });
    const api = treeRef.current!;

    api.setFocusedKeys(['2']);
    expect(
      item(container, '2')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-focused'),
    ).toBe(true);

    api.filter('1-0');
    expect(visibleKeys(container)).toContain('1-0');
    expect(visibleKeys(container)).not.toContain('0-0');

    await unmount(root);
  });

  it('滚动方法', async () => {
    vi.useFakeTimers();
    const { treeRef, clientEl, root } = await mount({
      list: makeTree(40, 0),
      fixed: true,
    });
    const api = treeRef.current!;

    api.scrollTo({ offset: 100 });
    expect(clientEl.scrollTop).toBe(100);

    api.scrollTo({ key: '20', align: 'top' });
    expect(clientEl.scrollTop).toBe(20 * 32);

    api.scrollToTop();
    vi.runAllTimers();
    expect(clientEl.scrollTop).toBe(0);

    api.scrollToBottom();
    expect(clientEl.scrollTop).toBeGreaterThan(0);
    vi.runAllTimers();

    vi.useRealTimers();
    await unmount(root);
  });

  it('setList / forceUpdate / getTreeNode', async () => {
    const { container, treeRef, root } = await mount();
    const api = treeRef.current!;

    api.setList([{ key: 'y', title: 'Y' }]);
    expect(visibleKeys(container)).toEqual(['y']);
    expect(api.getTreeNode('y')!.title).toBe('Y');
    expect(api.getTreeNode('nope')).toBeUndefined();

    expect(() => api.forceUpdate()).not.toThrow();

    await unmount(root);
  });
});

describe('React VirtTree JSX 渲染 prop', () => {
  it('content 渲染节点内容区', async () => {
    const { container, root } = await mount({
      content: ({ node }: any) => createElement('span', null, `c-${node.key}`),
    });
    await act(async () => {});

    expect(
      item(container, '0').querySelector('.virt-tree-node-content')!.textContent,
    ).toBe('c-0');

    await unmount(root);
  });

  it('icon 渲染展开图标', async () => {
    const { container, root } = await mount({
      icon: ({ isExpanded }: any) =>
        createElement('span', null, isExpanded ? 'open' : 'closed'),
    });
    await act(async () => {});

    expect(item(container, '0').querySelector('.virt-tree-icon')!.textContent).toBe(
      'closed',
    );

    await unmount(root);
  });

  it('nodeRender 接管整行', async () => {
    const { container, root } = await mount({
      nodeRender: ({ node }: any) => createElement('div', null, `row-${node.key}`),
    });
    await act(async () => {});

    expect(item(container, '0').textContent).toBe('row-0');
    expect(item(container, '0').querySelector('.virt-tree-node')).toBeNull();

    await unmount(root);
  });

  it('empty / header / footer 渲染 prop', async () => {
    const { container, root } = await mount({
      list: [],
      empty: () => createElement('div', null, 'tree-empty'),
      header: () => createElement('div', null, 'tree-header'),
      footer: () => createElement('div', null, 'tree-footer'),
    });
    await act(async () => {});

    expect(container.textContent).toContain('tree-empty');
    expect(container.textContent).toContain('tree-header');
    expect(container.textContent).toContain('tree-footer');

    await unmount(root);
  });

  it('卸载后清空容器', async () => {
    const { container, root } = await mount();

    await unmount(root);

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
