/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, type Ref } from 'vue';
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

function mount(props: Record<string, unknown> = {}, slots?: any) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const treeRef: Ref<any> = ref(null);
  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(
            VirtTree as any,
            {
              ref: treeRef,
              list: makeTree(),
              itemPreSize: 32,
              ...props,
            },
            slots,
          );
      },
    }),
  );
  app.mount(container);

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 400);

  return { app, container, treeRef, clientEl };
}

function item(container: HTMLElement, key: string): HTMLElement {
  return container.querySelector(`.virt-tree-item[data-id="${key}"]`)!;
}

function clickPart(container: HTMLElement, key: string, selector: string) {
  item(container, key)
    .querySelector(selector)!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function visibleKeys(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.virt-tree-item')).map(
    (el) => (el as HTMLElement).dataset.id!,
  );
}

describe('Vue VirtTree', () => {
  it('挂载后渲染树节点，根节点默认折叠', () => {
    const { app, container } = mount();

    expect(visibleKeys(container)).toEqual(['0', '1', '2']);
    expect(item(container, '0').textContent).toContain('Node-0');

    app.unmount();
  });

  it('defaultExpandAll 展开全部', () => {
    const { app, container } = mount({ defaultExpandAll: true });

    expect(visibleKeys(container)).toEqual([
      '0', '0-0', '0-1', '1', '1-0', '1-1', '2', '2-0', '2-1',
    ]);

    app.unmount();
  });

  it('list 变化后重建树', async () => {
    const list = ref<any[]>(makeTree(2, 1));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(VirtTree as any, { list: list.value, itemPreSize: 32 });
        },
      }),
    );
    app.mount(container);
    flushResize('client', 400);
    expect(visibleKeys(container)).toEqual(['0', '1']);

    list.value = [{ key: 'x', title: 'X' }];
    await nextTick();

    expect(visibleKeys(container)).toEqual(['x']);

    app.unmount();
  });

  it('受控的 expandedKeys 变化会同步到视图', async () => {
    const expandedKeys = ref<string[]>([]);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(VirtTree as any, {
              list: makeTree(),
              itemPreSize: 32,
              expandedKeys: expandedKeys.value,
            });
        },
      }),
    );
    app.mount(container);
    flushResize('client', 400);

    expandedKeys.value = ['1'];
    await nextTick();

    expect(visibleKeys(container)).toEqual(['0', '1', '1-0', '1-1', '2']);

    app.unmount();
  });

  it('受控的 selectedKeys / checkedKeys / focusedKeys 变化会同步', async () => {
    const selectedKeys = ref<string[]>([]);
    const checkedKeys = ref<string[]>([]);
    const focusedKeys = ref<string[]>([]);
    const treeRef: Ref<any> = ref(null);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(VirtTree as any, {
              ref: treeRef,
              list: makeTree(),
              itemPreSize: 32,
              selectable: true,
              checkable: true,
              selectedKeys: selectedKeys.value,
              checkedKeys: checkedKeys.value,
              focusedKeys: focusedKeys.value,
            });
        },
      }),
    );
    app.mount(container);
    flushResize('client', 400);

    selectedKeys.value = ['1'];
    checkedKeys.value = ['2-0'];
    focusedKeys.value = ['0'];
    await nextTick();

    expect(
      item(container, '1')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-selected'),
    ).toBe(true);
    expect(treeRef.value.getCheckedKeys()).toContain('2-0');
    expect(
      item(container, '0')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-focused'),
    ).toBe(true);

    app.unmount();
  });

  it('点击图标 emit expand 与 update:expandedKeys', () => {
    const onExpand = vi.fn();
    const onUpdateExpandedKeys = vi.fn();
    const { app, container } = mount({
      onExpand,
      'onUpdate:expandedKeys': onUpdateExpandedKeys,
    });

    clickPart(container, '0', '.virt-tree-icon');

    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onExpand.mock.calls[0]![0]).toEqual(['0']);
    expect(onUpdateExpandedKeys).toHaveBeenCalledWith(['0']);

    app.unmount();
  });

  it('点击内容区 emit select 与 update:selectedKeys', () => {
    const onSelect = vi.fn();
    const onUpdateSelectedKeys = vi.fn();
    const { app, container } = mount({
      selectable: true,
      onSelect,
      'onUpdate:selectedKeys': onUpdateSelectedKeys,
    });

    clickPart(container, '1', '.virt-tree-node-content');

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onUpdateSelectedKeys).toHaveBeenCalledWith(['1']);

    app.unmount();
  });

  it('点击复选框 emit check 与 update:checkedKeys', () => {
    const onCheck = vi.fn();
    const onUpdateCheckedKeys = vi.fn();
    const { app, container } = mount({
      checkable: true,
      onCheck,
      'onUpdate:checkedKeys': onUpdateCheckedKeys,
    });

    clickPart(container, '0', '.virt-tree-checkbox');

    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(onUpdateCheckedKeys).toHaveBeenCalledWith(['0-0', '0-1', '0']);

    app.unmount();
  });

  it('点击节点 emit nodeClick', () => {
    const onNodeClick = vi.fn();
    const { app, container } = mount({ onNodeClick });

    clickPart(container, '1', '.virt-tree-node-content');

    expect(onNodeClick).toHaveBeenCalledTimes(1);
    const [data, node, e] = onNodeClick.mock.calls[0]!;
    expect(data.key).toBe('1');
    expect(node.key).toBe('1');
    expect(e).toBeInstanceOf(MouseEvent);

    app.unmount();
  });

  it('nodeClick 与 select 并存，互不影响', () => {
    const onNodeClick = vi.fn();
    const onSelect = vi.fn();
    const { app, container, treeRef } = mount({
      selectable: true,
      onNodeClick,
      onSelect,
    });

    clickPart(container, '0', '.virt-tree-node-content');

    expect(onNodeClick).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(treeRef.value.getTreeNode('0')).toBeTruthy();

    app.unmount();
  });

  it('暴露展开 / 选择 / 勾选 API', () => {
    const { app, container, treeRef } = mount({
      selectable: true,
      selectMultiple: true,
      checkable: true,
    });

    treeRef.value.expandAll(true);
    expect(visibleKeys(container).length).toBe(9);

    treeRef.value.setExpandedKeys([]);
    expect(visibleKeys(container).length).toBe(3);

    treeRef.value.expandNode('0', true);
    expect(visibleKeys(container)).toContain('0-0');

    treeRef.value.selectAll(true);
    expect(
      item(container, '0')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-selected'),
    ).toBe(true);

    treeRef.value.selectNode('0', false);
    expect(
      item(container, '0')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-selected'),
    ).toBe(false);

    treeRef.value.checkNode('1', true);
    expect(treeRef.value.getCheckedKeys()).toContain('1');

    treeRef.value.checkAll(false);
    expect(treeRef.value.getCheckedKeys()).toEqual([]);

    app.unmount();
  });

  it('暴露 toggleExpand / toggleSelect / toggleCheckbox（需要节点对象）', () => {
    const { app, treeRef } = mount({ selectable: true, checkable: true });
    const node = treeRef.value.getTreeNode('0');

    treeRef.value.toggleExpand(node);
    expect(treeRef.value.getTreeNode('0')).toBeTruthy();

    treeRef.value.toggleSelect(node);
    treeRef.value.toggleCheckbox(node);

    expect(treeRef.value.getCheckedKeys().length).toBeGreaterThan(0);

    app.unmount();
  });

  it('暴露半选查询与 setFocusedKeys', () => {
    const { app, container, treeRef } = mount({ checkable: true });

    treeRef.value.checkNode('0-0', true);
    expect(treeRef.value.getHalfCheckedKeys()).toEqual(['0']);

    treeRef.value.setFocusedKeys(['2']);
    expect(
      item(container, '2')
        .querySelector('.virt-tree-node')!
        .classList.contains('is-focused'),
    ).toBe(true);

    app.unmount();
  });

  it('暴露 filter：命中节点保留，未命中隐藏', () => {
    const { app, container, treeRef } = mount({
      filterMethod: (query: string, node: any) =>
        (node.title as string).includes(query),
    });

    treeRef.value.filter('1-0');

    expect(visibleKeys(container)).toContain('1-0');
    expect(visibleKeys(container)).not.toContain('0-0');

    app.unmount();
  });

  it('暴露 scrollTo / scrollToTop / scrollToBottom', () => {
    vi.useFakeTimers();
    const { app, treeRef, clientEl } = mount({ list: makeTree(40, 0), fixed: true });

    treeRef.value.scrollTo({ offset: 100 });
    expect(clientEl.scrollTop).toBe(100);

    treeRef.value.scrollTo({ key: '20', align: 'top' });
    expect(clientEl.scrollTop).toBe(20 * 32);

    treeRef.value.scrollToTop();
    vi.runAllTimers();
    expect(clientEl.scrollTop).toBe(0);

    treeRef.value.scrollToBottom();
    expect(clientEl.scrollTop).toBeGreaterThan(0);
    vi.runAllTimers();

    app.unmount();
  });

  it('暴露 setList / forceUpdate / getTreeNode', () => {
    const { app, container, treeRef } = mount();

    treeRef.value.setList([{ key: 'y', title: 'Y' }]);
    expect(visibleKeys(container)).toEqual(['y']);
    expect(treeRef.value.getTreeNode('y').title).toBe('Y');

    expect(() => treeRef.value.forceUpdate()).not.toThrow();

    app.unmount();
  });

  it('#content 插槽自定义内容区', () => {
    const { app, container } = mount(
      {},
      { content: ({ node }: any) => h('span', null, `c-${node.key}`) },
    );

    expect(
      item(container, '0').querySelector('.virt-tree-node-content')!.textContent,
    ).toBe('c-0');

    app.unmount();
  });

  it('#icon 插槽自定义图标', () => {
    const { app, container } = mount(
      {},
      {
        icon: ({ isExpanded }: any) =>
          h('span', null, isExpanded ? 'open' : 'closed'),
      },
    );

    expect(item(container, '0').querySelector('.virt-tree-icon')!.textContent).toBe(
      'closed',
    );

    app.unmount();
  });

  it('#default 插槽接管整行', () => {
    const { app, container } = mount(
      {},
      { default: ({ node }: any) => h('div', null, `row-${node.key}`) },
    );

    expect(item(container, '0').textContent).toBe('row-0');
    expect(item(container, '0').querySelector('.virt-tree-node')).toBeNull();

    app.unmount();
  });

  it('#empty / #header / #footer 插槽', () => {
    const { app, container } = mount(
      { list: [] },
      {
        empty: () => h('div', null, 'tree-empty'),
        header: () => h('div', null, 'tree-header'),
        footer: () => h('div', null, 'tree-footer'),
      },
    );

    expect(container.textContent).toContain('tree-empty');
    expect(container.textContent).toContain('tree-header');
    expect(container.textContent).toContain('tree-footer');

    app.unmount();
  });

  it('滚动事件被 emit', () => {
    const onScroll = vi.fn();
    const onUpdate = vi.fn();
    const { app, clientEl } = mount({ onScroll, onUpdate });

    expect(onUpdate).toHaveBeenCalled();

    clientEl.scrollTop = 40;
    clientEl.dispatchEvent(new Event('scroll'));

    expect(onScroll).toHaveBeenCalled();

    app.unmount();
  });

  it('卸载后清空容器', () => {
    const { app, container } = mount();

    app.unmount();

    expect(container.querySelector('[data-id="client"]')).toBeNull();
  });
});
