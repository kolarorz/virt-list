/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, createRef } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
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

function mount(props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const treeRef = createRef<VirtTreeRef>();

  act(() => {
    ReactDOM.render(
      createElement(VirtTree as any, {
        ref: treeRef,
        list: makeTree(),
        itemPreSize: 32,
        ...props,
      }),
      container,
    );
  });

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 400);

  return { container, treeRef, clientEl };
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

function unmount(container: HTMLElement) {
  act(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
}

describe('React-legacy VirtTree', () => {
  it('挂载后渲染树节点，根节点默认折叠', () => {
    const { container } = mount();

    expect(visibleKeys(container)).toEqual(['0', '1', '2']);
    expect(item(container, '0').textContent).toContain('Node-0');

    unmount(container);
  });

  it('defaultExpandAll 展开全部', () => {
    const { container } = mount({ defaultExpandAll: true });

    expect(visibleKeys(container).length).toBe(9);

    unmount(container);
  });

  it('初始 expandedKeys / checkedKeys 生效', () => {
    const { container, treeRef } = mount({
      checkable: true,
      expandedKeys: ['1'],
      checkedKeys: ['2-0'],
    });

    expect(visibleKeys(container)).toEqual(['0', '1', '1-0', '1-1', '2']);
    expect(treeRef.current!.getCheckedKeys()).toContain('2-0');

    unmount(container);
  });

  it('点击图标触发 onExpand', () => {
    const onExpand = vi.fn();
    const { container } = mount({ onExpand });

    clickPart(container, '0', '.virt-tree-icon');

    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onExpand.mock.calls[0]![0]).toEqual(['0']);
    expect(visibleKeys(container)).toContain('0-0');

    unmount(container);
  });

  it('点击内容区触发 onSelect', () => {
    const onSelect = vi.fn();
    const { container } = mount({ selectable: true, onSelect });

    clickPart(container, '1', '.virt-tree-node-content');

    expect(onSelect.mock.calls[0]![0]).toEqual(['1']);

    unmount(container);
  });

  it('点击复选框触发 onCheck 并级联', () => {
    const onCheck = vi.fn();
    const { container } = mount({ checkable: true, onCheck });

    clickPart(container, '0', '.virt-tree-checkbox');

    expect(onCheck.mock.calls[0]![0]).toEqual(['0-0', '0-1', '0']);

    unmount(container);
  });

  it('点击节点触发 onNodeClick', () => {
    const onNodeClick = vi.fn();
    const { container } = mount({ onNodeClick });

    clickPart(container, '1', '.virt-tree-node-content');

    expect(onNodeClick).toHaveBeenCalledTimes(1);
    const [data, node, e] = onNodeClick.mock.calls[0]!;
    expect(data.key).toBe('1');
    expect(node.key).toBe('1');
    expect(e).toBeInstanceOf(MouseEvent);

    unmount(container);
  });

  it('受控 keys 变化后同步到视图', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const list = makeTree();
    const treeRef = createRef<VirtTreeRef>();
    const render = (keys: Record<string, string[]>) => {
      act(() => {
        ReactDOM.render(
          createElement(VirtTree as any, {
            ref: treeRef,
            list,
            itemPreSize: 32,
            selectable: true,
            checkable: true,
            ...keys,
          }),
          container,
        );
      });
    };

    render({ expandedKeys: [] });
    flushResize('client', 400);
    expect(visibleKeys(container)).toEqual(['0', '1', '2']);

    render({ expandedKeys: ['1'] });
    expect(visibleKeys(container)).toEqual(['0', '1', '1-0', '1-1', '2']);

    render({ expandedKeys: ['1'], selectedKeys: ['2'] });
    expect(
      item(container, '2')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-selected'),
    ).toBe(true);

    render({ expandedKeys: ['1'], checkedKeys: ['1-0'] });
    expect(treeRef.current!.getCheckedKeys()).toEqual(['1-0']);
    expect(treeRef.current!.getHalfCheckedKeys()).toEqual(['1']);

    render({ expandedKeys: ['1'], focusedKeys: ['0'] });
    expect(
      item(container, '0')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-focused'),
    ).toBe(true);

    unmount(container);
  });

  it('内容相同的新数组不会触发重建', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const list = makeTree();
    const onUpdate = vi.fn();
    const render = (expandedKeys: string[]) => {
      act(() => {
        ReactDOM.render(
          createElement(VirtTree as any, {
            list,
            itemPreSize: 32,
            expandedKeys,
            onUpdate,
          }),
          container,
        );
      });
    };

    render(['1']);
    flushResize('client', 400);
    onUpdate.mockClear();

    render(['1']);

    expect(onUpdate).not.toHaveBeenCalled();

    unmount(container);
  });

  it('暴露展开与勾选 API', () => {
    const { container, treeRef } = mount({ checkable: true });
    const api = treeRef.current!;

    api.expandAll(true);
    expect(visibleKeys(container).length).toBe(9);

    api.setExpandedKeys([]);
    expect(visibleKeys(container).length).toBe(3);

    api.checkNode('0-0', true);
    expect(api.getCheckedKeys()).toEqual(['0-0']);
    expect(api.getHalfCheckedKeys()).toEqual(['0']);

    api.checkAll(false);
    expect(api.getCheckedKeys()).toEqual([]);

    unmount(container);
  });

  it('暴露 filter / setFocusedKeys / getTreeNode / setList', () => {
    const { container, treeRef } = mount({
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

    expect(api.getTreeNode('0')!.title).toBe('Node-0');

    api.setList([{ key: 'y', title: 'Y' }]);
    expect(visibleKeys(container)).toEqual(['y']);

    unmount(container);
  });

  it('暴露滚动 API', () => {
    vi.useFakeTimers();
    const { container, treeRef, clientEl } = mount({
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

    vi.useRealTimers();
    unmount(container);
  });

  it('JSX 渲染 prop 自定义内容区与整行', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      ReactDOM.render(
        createElement(VirtTree as any, {
          list: makeTree(),
          itemPreSize: 32,
          content: ({ node }: any) => createElement('span', null, `c-${node.key}`),
        }),
        container,
      );
    });
    flushResize('client', 400);

    expect(
      item(container, '0').querySelector('.virt-tree-node-content')!.textContent,
    ).toBe('c-0');

    unmount(container);
  });

  it('卸载后清空容器', () => {
    const { container } = mount();

    unmount(container);

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
