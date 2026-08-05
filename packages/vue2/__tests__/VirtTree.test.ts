/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Vue from 'vue';
import { VirtTree } from '../src/index';

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

function mount(
  props: Record<string, unknown> = {},
  listeners: Record<string, any> = {},
  scopedSlots?: Record<string, any>,
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const mountPoint = document.createElement('div');
  container.appendChild(mountPoint);

  const vm = new Vue({
    render(h: any) {
      return h(VirtTree as any, {
        ref: 'tree',
        props: {
          list: makeTree(),
          itemPreSize: 32,
          ...props,
        },
        on: listeners,
        scopedSlots,
      });
    },
  });
  vm.$mount(mountPoint);

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 400);

  return { container, vm, clientEl, api: () => vm.$refs.tree as any };
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

describe('Vue2 VirtTree', () => {
  it('挂载后渲染树节点，根节点默认折叠', () => {
    const { container, vm } = mount();

    expect(visibleKeys(container)).toEqual(['0', '1', '2']);
    expect(item(container, '0').textContent).toContain('Node-0');

    vm.$destroy();
  });

  it('defaultExpandAll 展开全部', () => {
    const { container, vm } = mount({ defaultExpandAll: true });

    expect(visibleKeys(container).length).toBe(9);

    vm.$destroy();
  });

  it('点击图标 emit expand 与 update:expandedKeys', () => {
    const expand = vi.fn();
    const updateExpandedKeys = vi.fn();
    const { container, vm } = mount({}, {
      expand,
      'update:expandedKeys': updateExpandedKeys,
    });

    clickPart(container, '0', '.virt-tree-icon');

    expect(expand).toHaveBeenCalledTimes(1);
    expect(updateExpandedKeys).toHaveBeenCalledWith(['0']);
    expect(visibleKeys(container)).toContain('0-0');

    vm.$destroy();
  });

  it('点击内容区 emit select', () => {
    const select = vi.fn();
    const { container, vm } = mount({ selectable: true }, { select });

    clickPart(container, '1', '.virt-tree-node-content');

    expect(select).toHaveBeenCalledTimes(1);
    expect(select.mock.calls[0]![0]).toEqual(['1']);

    vm.$destroy();
  });

  it('点击复选框 emit check 并级联', () => {
    const check = vi.fn();
    const { container, vm } = mount({ checkable: true }, { check });

    clickPart(container, '0', '.virt-tree-checkbox');

    expect(check).toHaveBeenCalledTimes(1);
    expect(check.mock.calls[0]![0]).toEqual(['0-0', '0-1', '0']);

    vm.$destroy();
  });

  it('点击节点 emit nodeClick', () => {
    const nodeClick = vi.fn();
    const { container, vm } = mount({}, { nodeClick });

    clickPart(container, '1', '.virt-tree-node-content');

    expect(nodeClick).toHaveBeenCalledTimes(1);
    const [data, node, e] = nodeClick.mock.calls[0]!;
    expect(data.key).toBe('1');
    expect(node.key).toBe('1');
    expect(e).toBeInstanceOf(MouseEvent);

    vm.$destroy();
  });

  it('受控的 expandedKeys 变化会同步', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      data: () => ({ keys: [] as string[] }),
      render(h: any) {
        return h(VirtTree as any, {
          props: {
            list: makeTree(),
            itemPreSize: 32,
            expandedKeys: (this as any).keys,
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 400);

    (vm as any).keys = ['1'];
    await Vue.nextTick();

    expect(visibleKeys(container)).toEqual(['0', '1', '1-0', '1-1', '2']);

    vm.$destroy();
  });

  it('暴露展开 / 勾选 / 半选 API', () => {
    const { container, vm, api } = mount({ checkable: true });

    api().expandAll(true);
    expect(visibleKeys(container).length).toBe(9);

    api().setExpandedKeys([]);
    expect(visibleKeys(container).length).toBe(3);

    api().checkNode('0-0', true);
    expect(api().getCheckedKeys()).toEqual(['0-0']);
    expect(api().getHalfCheckedKeys()).toEqual(['0']);

    api().checkAll(false);
    expect(api().getCheckedKeys()).toEqual([]);

    vm.$destroy();
  });

  it('暴露 filter / setFocusedKeys / getTreeNode', () => {
    const { container, vm, api } = mount({
      filterMethod: (query: string, node: any) =>
        (node.title as string).includes(query),
    });

    api().setFocusedKeys(['2']);
    expect(
      item(container, '2')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-focused'),
    ).toBe(true);

    api().filter('1-0');
    expect(visibleKeys(container)).toContain('1-0');
    expect(visibleKeys(container)).not.toContain('0-0');

    expect(api().getTreeNode('0').title).toBe('Node-0');

    vm.$destroy();
  });

  it('暴露滚动 API', () => {
    vi.useFakeTimers();
    const { vm, api, clientEl } = mount({ list: makeTree(40, 0), fixed: true });

    api().scrollTo({ offset: 100 });
    expect(clientEl.scrollTop).toBe(100);

    api().scrollTo({ key: '20', align: 'top' });
    expect(clientEl.scrollTop).toBe(20 * 32);

    api().scrollToTop();
    vi.runAllTimers();
    expect(clientEl.scrollTop).toBe(0);

    vm.$destroy();
  });

  it('#content 插槽自定义内容区', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      render(h: any) {
        return h(VirtTree as any, {
          props: { list: makeTree(), itemPreSize: 32 },
          scopedSlots: {
            content: ({ node }: any) => h('span', `c-${node.key}`),
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 400);

    expect(
      item(container, '0').querySelector('.virt-tree-node-content')!.textContent,
    ).toBe('c-0');

    vm.$destroy();
  });

  it('setList 后重建树', () => {
    const { container, vm, api } = mount();

    api().setList([{ key: 'y', title: 'Y' }]);

    expect(visibleKeys(container)).toEqual(['y']);

    vm.$destroy();
  });

  it('销毁后清空容器', () => {
    const { container, vm } = mount();

    vm.$destroy();

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
