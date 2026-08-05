/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtTree } from '../src/tree/VirtTree';
import type {
  TreeNodeKey,
  VirtTreeDOMEvents,
  VirtTreeDOMOptions,
} from '../src/tree/types';

const OriginalRO = globalThis.ResizeObserver;
let roCallback: ResizeObserverCallback | null = null;

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

/** 视口 400px 的树，足够渲染出示例数据的全部节点 */
function mount(
  options: Partial<VirtTreeDOMOptions> = {},
  events: VirtTreeDOMEvents = {},
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const tree = new VirtTree(
    container,
    {
      list: makeTree(),
      itemPreSize: 32,
      indent: 16,
      iconSize: 16,
      buffer: 2,
      ...options,
    } as VirtTreeDOMOptions,
    events,
  );

  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  Object.defineProperty(clientEl, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  flushResize('client', 400);

  return { container, tree, clientEl };
}

function item(container: HTMLElement, key: string): HTMLElement {
  return container.querySelector(`.virt-tree-item[data-id="${key}"]`)!;
}

function node(container: HTMLElement, key: string): HTMLElement {
  return item(container, key).querySelector('.virt-tree-node')!;
}

function clickEl(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function clickIcon(container: HTMLElement, key: string) {
  clickEl(item(container, key).querySelector('.virt-tree-icon')!);
}

function clickCheckbox(container: HTMLElement, key: string) {
  clickEl(item(container, key).querySelector('.virt-tree-checkbox')!);
}

function clickContent(container: HTMLElement, key: string) {
  clickEl(item(container, key).querySelector('.virt-tree-node-content')!);
}

describe('VirtTree 节点 DOM 结构', () => {
  it('每行是 .virt-tree-item，内部是 .virt-tree-node', () => {
    const { container } = mount();

    const first = item(container, '0');
    expect(first).toBeTruthy();
    expect(first.querySelector('.virt-tree-node')).toBeTruthy();
  });

  it('节点由图标区与内容区组成，标题写在内容区', () => {
    const { container } = mount();
    const wrapper = node(container, '0');

    expect(wrapper.querySelector('.virt-tree-icon-wrapper')).toBeTruthy();
    expect(wrapper.querySelector('.virt-tree-icon')).toBeTruthy();
    expect(
      wrapper.querySelector('.virt-tree-node-content')!.textContent,
    ).toBe('Node-0');
  });

  it('列表容器带上分组 class 与自定义 listClass', () => {
    const { container } = mount({ listClass: 'my-list' });
    const listEl = container.querySelector('.virt-tree-group') as HTMLElement;

    expect(listEl).toBeTruthy();
    expect(listEl.className).toContain('my-list');
  });

  it('customGroup 可替换分组 class', () => {
    const { container } = mount({ customGroup: 'my-group' });

    expect(container.querySelector('.my-group')).toBeTruthy();
  });

  it('itemClass 追加到行 class 上', () => {
    const { container } = mount({ itemClass: 'my-item' });

    expect(item(container, '0').className).toContain('virt-tree-item');
    expect(item(container, '0').className).toContain('my-item');
  });

  it('节点高度取 itemPreSize；fixed 时锁定高度', () => {
    const { container } = mount({ itemPreSize: 48, fixed: true });
    const wrapper = node(container, '0');

    expect(wrapper.style.minHeight).toBe('48px');
    expect(wrapper.style.height).toBe('48px');
    expect(
      wrapper
        .querySelector('.virt-tree-node-content')!
        .classList.contains('is-fixed-height'),
    ).toBe(true);
  });

  it('非 fixed 时只给最小高度', () => {
    const { container } = mount({ itemPreSize: 48 });
    const wrapper = node(container, '0');

    expect(wrapper.style.minHeight).toBe('48px');
    expect(wrapper.style.height).toBe('');
  });

  it('根节点没有缩进块，子节点按层级缩进', () => {
    const { container } = mount({ expandedKeys: ['0'] });

    expect(node(container, '0').querySelector('.virt-tree-node-indent')).toBeNull();

    const childIndent = node(container, '0-0').querySelector(
      '.virt-tree-node-indent',
    )!;
    expect(childIndent.children.length).toBe(1);
    expect((childIndent.children[0] as HTMLElement).style.width).toBe('16px');
  });

  it('三层结构的第三层有两个缩进块', () => {
    const { container } = mount({
      list: [
        {
          key: 'a',
          title: 'A',
          children: [
            { key: 'b', title: 'B', children: [{ key: 'c', title: 'C' }] },
          ],
        },
      ],
      defaultExpandAll: true,
    });

    expect(
      node(container, 'c').querySelector('.virt-tree-node-indent')!.children
        .length,
    ).toBe(2);
  });

  it('itemGap 把缩进块拉高以接上相邻行的连接线', () => {
    const { container } = mount({ expandedKeys: ['0'], itemGap: 8 });
    const block = node(container, '0-0').querySelector(
      '.virt-tree-node-indent-block',
    ) as HTMLElement;

    expect(block.style.height).toBe('calc(100% + 8px)');
    expect(block.style.transform).toBe('translateY(-4px)');
  });

  it('叶子节点不显示展开图标', () => {
    const { container } = mount({ expandedKeys: ['0'] });

    expect(
      (node(container, '0-0').querySelector('.virt-tree-icon') as HTMLElement)
        .style.display,
    ).toBe('none');
    expect(
      (node(container, '0').querySelector('.virt-tree-icon') as HTMLElement)
        .style.display,
    ).toBe('block');
  });

  it('展开状态体现在图标容器的 class 上', () => {
    const { container } = mount({ expandedKeys: ['0'] });

    expect(
      node(container, '0')
        .querySelector('.virt-tree-icon-wrapper')!
        .classList.contains('is-expanded'),
    ).toBe(true);
    expect(
      node(container, '1')
        .querySelector('.virt-tree-icon-wrapper')!
        .classList.contains('is-expanded'),
    ).toBe(false);
  });

  it('iconSize 决定图标尺寸，indent 决定图标区宽度', () => {
    const { container } = mount({ indent: 24, iconSize: 12 });
    const iconWrapper = node(container, '0').querySelector(
      '.virt-tree-icon-wrapper',
    ) as HTMLElement;
    const icon = iconWrapper.querySelector('.virt-tree-icon') as HTMLElement;

    expect(iconWrapper.style.width).toBe('24px');
    expect(icon.style.width).toBe('12px');
    expect(icon.style.height).toBe('12px');
  });

  it('默认渲染内置的箭头 svg', () => {
    const { container } = mount();

    expect(node(container, '0').querySelector('.virt-tree-icon svg')).toBeTruthy();
  });
});

describe('VirtTree 连接线', () => {
  it('showLine 关闭时缩进块没有线条 class', () => {
    const { container } = mount({ expandedKeys: ['0'] });
    const block = node(container, '0-0').querySelector(
      '.virt-tree-node-indent-block',
    )!;

    expect(block.className).toBe('virt-tree-node-indent-block');
  });

  it('showLine 打开时缩进块带竖线，末级缩进块再带横线', () => {
    const { container } = mount({ expandedKeys: ['0'], showLine: true });
    const block = node(container, '0-0').querySelector(
      '.virt-tree-node-indent-block',
    )!;

    expect(
      block.classList.contains('virt-tree-node-indent-block-line-vertical'),
    ).toBe(true);
    expect(
      block.classList.contains('virt-tree-node-indent-block-line-horizontal'),
    ).toBe(true);
  });

  it('叶子节点的横线加倍（连到节点内容）', () => {
    const { container } = mount({ expandedKeys: ['0'], showLine: true });
    const block = node(container, '0-0').querySelector(
      '.virt-tree-node-indent-block',
    )!;

    expect(
      block.classList.contains(
        'virt-tree-node-indent-block-line-horizontal--double',
      ),
    ).toBe(true);
  });

  it('同级最后一个且未展开的节点，竖线只画一半', () => {
    const { container } = mount({ expandedKeys: ['0'], showLine: true });
    const last = node(container, '0-1').querySelector(
      '.virt-tree-node-indent-block',
    )!;
    const notLast = node(container, '0-0').querySelector(
      '.virt-tree-node-indent-block',
    )!;

    expect(
      last.classList.contains(
        'virt-tree-node-indent-block-line-vertical--half',
      ),
    ).toBe(true);
    expect(
      notLast.classList.contains(
        'virt-tree-node-indent-block-line-vertical--half',
      ),
    ).toBe(false);
  });
});

describe('VirtTree 复选框渲染', () => {
  it('checkable 关闭时不渲染复选框', () => {
    const { container } = mount();

    expect(node(container, '0').querySelector('.virt-tree-checkbox')).toBeNull();
  });

  it('checkable 打开时渲染复选框', () => {
    const { container } = mount({ checkable: true });

    expect(
      node(container, '0').querySelector('.virt-tree-checkbox-wrapper'),
    ).toBeTruthy();
  });

  it('勾选与半选状态体现在 class 上', () => {
    const { container } = mount({
      checkable: true,
      expandedKeys: ['0'],
      checkedKeys: ['0-0'],
    });

    expect(
      node(container, '0-0')
        .querySelector('.virt-tree-checkbox')!
        .classList.contains('is-checked'),
    ).toBe(true);
    expect(
      node(container, '0')
        .querySelector('.virt-tree-checkbox')!
        .classList.contains('is-indeterminate'),
    ).toBe(true);
  });

  it('全部子节点勾选后父节点变为选中而非半选', () => {
    const { container } = mount({
      checkable: true,
      expandedKeys: ['0'],
      checkedKeys: ['0-0', '0-1'],
    });
    const parentCb = node(container, '0').querySelector('.virt-tree-checkbox')!;

    expect(parentCb.classList.contains('is-checked')).toBe(true);
    expect(parentCb.classList.contains('is-indeterminate')).toBe(false);
  });

  it('disableCheckbox 的节点复选框带禁用 class', () => {
    const list: any = makeTree();
    list[1].disableCheckbox = true;
    const { container } = mount({ checkable: true, list });

    expect(
      node(container, '1')
        .querySelector('.virt-tree-checkbox')!
        .classList.contains('is-disabled'),
    ).toBe(true);
  });
});

describe('VirtTree 节点状态 class', () => {
  it('选中态写在节点根元素上', () => {
    const { container } = mount({ selectable: true, selectedKeys: ['1'] });

    expect(node(container, '1').classList.contains('is-selected')).toBe(true);
    expect(node(container, '0').classList.contains('is-selected')).toBe(false);
  });

  it('聚焦态写在节点根元素上', () => {
    const { container } = mount({ focusedKeys: ['2'] });

    expect(node(container, '2').classList.contains('is-focused')).toBe(true);
  });

  it('disableSelect 的节点带禁用 class', () => {
    const list: any = makeTree();
    list[0].disableSelect = true;
    const { container } = mount({ selectable: true, list });

    expect(node(container, '0').classList.contains('is-disabled')).toBe(true);
  });

  it('状态变化就地更新 class，不重建节点 DOM', () => {
    const { container, tree } = mount({ selectable: true, checkable: true });
    const before = node(container, '1');

    tree.selectNode('1', true);
    tree.checkNode('1', true);
    tree.setFocusedKeys(['1']);

    // 同一个元素被复用，只是 class 变了
    expect(node(container, '1')).toBe(before);
    expect(before.classList.contains('is-selected')).toBe(true);
    expect(before.classList.contains('is-focused')).toBe(true);
    expect(
      before.querySelector('.virt-tree-checkbox')!.classList.contains('is-checked'),
    ).toBe(true);
  });

  it('展开会改变可见列表，节点按新状态重建', () => {
    const { container, tree } = mount();
    const before = node(container, '0');

    tree.expandNode('0', true);

    // 可见列表变了，节点 DOM 整体重建（与选中/勾选的就地更新不同）
    expect(node(container, '0')).not.toBe(before);
    expect(
      node(container, '0')
        .querySelector('.virt-tree-icon-wrapper')!
        .classList.contains('is-expanded'),
    ).toBe(true);
  });
});

describe('VirtTree 点击交互', () => {
  it('点击图标切换展开状态并触发 expand', () => {
    const expand = vi.fn();
    const { container, tree } = mount({}, { expand });

    clickIcon(container, '0');

    expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(true);
    expect(expand).toHaveBeenCalledTimes(1);
    expect(expand.mock.calls[0]![0]).toEqual(['0']);
    expect(expand.mock.calls[0]![1].expanded).toBe(true);

    clickIcon(container, '0');

    expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(false);
    expect(expand).toHaveBeenCalledTimes(2);
    expect(expand.mock.calls[1]![1].expanded).toBe(false);
  });

  it('点击复选框切换勾选并级联到子节点', () => {
    const check = vi.fn();
    const { container, tree } = mount({ checkable: true }, { check });

    clickCheckbox(container, '0');

    // key 按数据源的遍历顺序返回：子节点先于父节点
    expect(tree.getCheckedKeys()).toEqual(['0-0', '0-1', '0']);
    expect(check).toHaveBeenCalledTimes(1);
    expect(check.mock.calls[0]![1].checked).toBe(true);
  });

  it('点击内容区在 selectable 下切换选中', () => {
    const select = vi.fn();
    const { container, tree } = mount({ selectable: true }, { select });

    clickContent(container, '1');

    expect(tree.hasSelected(tree.getTreeNode('1')!)).toBe(true);
    expect(select).toHaveBeenCalledTimes(1);
    expect(select.mock.calls[0]![1].selected).toBe(true);

    clickContent(container, '1');

    expect(tree.hasSelected(tree.getTreeNode('1')!)).toBe(false);
  });

  it('selectable 下点击内容区不会顺带展开', () => {
    const { container, tree } = mount({
      selectable: true,
      expandOnClickNode: true,
    });

    clickContent(container, '0');

    expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(true);
    expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(false);
  });

  it('disableSelect 的节点点击内容区不被选中', () => {
    const list: any = makeTree();
    list[0].disableSelect = true;
    const { container, tree } = mount({ selectable: true, list });

    clickContent(container, '0');

    expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(false);
  });

  it('checkOnClickNode 下点击内容区触发勾选', () => {
    const { container, tree } = mount({
      checkable: true,
      checkOnClickNode: true,
    });

    clickContent(container, '1');

    expect(tree.hasChecked(tree.getTreeNode('1')!)).toBe(true);
  });

  it('checkOnClickNode 对 disableCheckbox 的节点无效', () => {
    const list: any = makeTree();
    list[1].disableCheckbox = true;
    const { container, tree } = mount({
      checkable: true,
      checkOnClickNode: true,
      list,
    });

    clickContent(container, '1');

    expect(tree.hasChecked(tree.getTreeNode('1')!)).toBe(false);
  });

  it('expandOnClickNode 下点击内容区切换展开', () => {
    const { container, tree } = mount({ expandOnClickNode: true });

    clickContent(container, '0');

    expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(true);
  });

  it('三个开关都不开时点击内容区什么都不做', () => {
    const { container, tree } = mount();

    clickContent(container, '0');

    expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(false);
    expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(false);
  });

  it('点击图标不会冒泡成内容区的点击', () => {
    const { container, tree } = mount({ selectable: true });

    clickIcon(container, '0');

    expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(true);
    expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(false);
  });

  it('点击复选框不会冒泡成内容区的点击', () => {
    const { container, tree } = mount({ selectable: true, checkable: true });

    clickCheckbox(container, '0');

    expect(tree.hasChecked(tree.getTreeNode('0')!)).toBe(true);
    expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(false);
  });
});

describe('VirtTree click 事件', () => {
  it('点击内容区触发 click，带上原始数据、节点与鼠标事件', () => {
    const click = vi.fn();
    const { container } = mount({}, { click });

    clickContent(container, '1');

    expect(click).toHaveBeenCalledTimes(1);
    const [data, node, e] = click.mock.calls[0]!;
    expect(data).toEqual({ key: '1', title: 'Node-1', children: expect.anything() });
    expect(node.key).toBe('1');
    expect(e).toBeInstanceOf(MouseEvent);
  });

  it('三个开关都关时也会触发（业务只想知道点了哪个节点）', () => {
    const click = vi.fn();
    const { container, tree } = mount({}, { click });

    clickContent(container, '0');

    expect(click).toHaveBeenCalledTimes(1);
    expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(false);
    expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(false);
  });

  it('与 select 并存：click 先触发，默认行为照常执行', () => {
    const order: string[] = [];
    const { container, tree } = mount(
      { selectable: true },
      {
        click: () => order.push('click'),
        select: () => order.push('select'),
      },
    );

    clickContent(container, '1');

    expect(order).toEqual(['click', 'select']);
    expect(tree.hasSelected(tree.getTreeNode('1')!)).toBe(true);
  });

  it('disableSelect 的节点仍然会触发 click（只是不被选中）', () => {
    const list: any = makeTree();
    list[0].disableSelect = true;
    const click = vi.fn();
    const { container, tree } = mount({ selectable: true, list }, { click });

    clickContent(container, '0');

    expect(click).toHaveBeenCalledTimes(1);
    expect(tree.hasSelected(tree.getTreeNode('0')!)).toBe(false);
  });

  it('点击图标与复选框不触发 click（它们各有自己的语义）', () => {
    const click = vi.fn();
    const { container } = mount({ checkable: true }, { click });

    clickIcon(container, '0');
    clickCheckbox(container, '1');

    expect(click).not.toHaveBeenCalled();
  });

  it('renderNode 接管整行时，点击整行触发 click', () => {
    const click = vi.fn();
    const { container } = mount(
      {
        renderNode: (n: any, _e: boolean, el: HTMLElement) => {
          el.textContent = n.title;
        },
      } as any,
      { click },
    );

    item(container, '2').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.calls[0]![1].key).toBe('2');
  });

  it('拖拽进行中不触发 click', () => {
    const click = vi.fn();
    const { container } = mount({ draggable: true }, { click });

    // 进入拖拽状态：dragstart 后第一次 mousemove 才真正开始
    item(container, '0')
      .querySelector('.virt-tree-node')!
      .dispatchEvent(new MouseEvent('dragstart', { bubbles: true }));
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 5, clientY: 5, bubbles: true }),
    );

    clickContent(container, '1');

    expect(click).not.toHaveBeenCalled();

    // 收尾，别把 document 上的拖拽监听留给后面的用例
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
});

describe('VirtTree 自定义渲染', () => {
  it('renderNode 完全接管节点内容', () => {
    const renderNode = vi.fn((n: any, isExpanded: boolean, el: HTMLElement) => {
      el.textContent = `${n.title}:${isExpanded}`;
    });
    const { container } = mount({ renderNode: renderNode as any });

    expect(item(container, '0').textContent).toBe('Node-0:false');
    // 接管后不再有默认结构
    expect(item(container, '0').querySelector('.virt-tree-node')).toBeNull();
    expect(renderNode.mock.calls[0]![1]).toBe(false);
  });

  it('renderNode 返回元素时挂到行容器内', () => {
    const { container } = mount({
      renderNode: (n: any) => {
        const el = document.createElement('span');
        el.className = 'custom-node';
        el.textContent = n.title;
        return el;
      },
    } as any);

    expect(
      item(container, '0').querySelector('span.custom-node')!.textContent,
    ).toBe('Node-0');
  });

  it('renderContent 只接管内容区，图标仍在', () => {
    const { container } = mount({
      renderContent: (n: any, el: HTMLElement) => {
        el.textContent = `[${n.key}]`;
      },
    } as any);

    const wrapper = node(container, '0');
    expect(wrapper.querySelector('.virt-tree-node-content')!.textContent).toBe(
      '[0]',
    );
    expect(wrapper.querySelector('.virt-tree-icon')).toBeTruthy();
  });

  it('renderContent 返回元素时挂到内容区内', () => {
    const { container } = mount({
      renderContent: (n: any) => {
        const el = document.createElement('b');
        el.textContent = n.title;
        return el;
      },
    } as any);

    expect(
      node(container, '0').querySelector('.virt-tree-node-content b')!.textContent,
    ).toBe('Node-0');
  });

  it('renderIcon 替换默认箭头', () => {
    const { container } = mount({
      renderIcon: (_n: any, isExpanded: boolean, el: HTMLElement) => {
        el.textContent = isExpanded ? '-' : '+';
      },
    } as any);

    expect(node(container, '0').querySelector('.virt-tree-icon')!.textContent).toBe(
      '+',
    );
    expect(node(container, '0').querySelector('.virt-tree-icon svg')).toBeNull();
  });

  it('自定义图标仍然可点击展开', () => {
    const { container, tree } = mount({
      renderIcon: (_n: any, _e: boolean, el: HTMLElement) => {
        el.textContent = 'x';
      },
    } as any);

    clickIcon(container, '0');

    expect(tree.hasExpanded(tree.getTreeNode('0')!)).toBe(true);
  });
});

describe('VirtTree 其余公开 API', () => {
  it('toggleExpand 在两种状态间切换', () => {
    const { tree } = mount();
    const target = tree.getTreeNode('0')!;

    tree.toggleExpand(target);
    expect(tree.hasExpanded(target)).toBe(true);

    tree.toggleExpand(target);
    expect(tree.hasExpanded(target)).toBe(false);
  });

  it('setFocusedKeys 替换聚焦集合', () => {
    const { tree } = mount();

    tree.setFocusedKeys(['0', '1']);
    expect(tree.hasFocused(tree.getTreeNode('0')!)).toBe(true);
    expect(tree.hasFocused(tree.getTreeNode('1')!)).toBe(true);

    tree.setFocusedKeys(['2']);
    expect(tree.hasFocused(tree.getTreeNode('0')!)).toBe(false);
    expect(tree.hasFocused(tree.getTreeNode('2')!)).toBe(true);

    tree.setFocusedKeys([]);
    expect(tree.hasFocused(tree.getTreeNode('2')!)).toBe(false);
  });

  it('getHalfCheckedKeys 返回半选的父节点', () => {
    const { tree } = mount({ checkable: true });

    tree.checkNode('0-0', true);

    expect(tree.getHalfCheckedKeys()).toEqual(['0']);
    expect(tree.getCheckedKeys()).toEqual(['0-0']);
  });

  it('子节点全选后父节点不再是半选', () => {
    const { tree } = mount({ checkable: true });

    tree.checkNode(['0-0', '0-1'], true);

    expect(tree.getHalfCheckedKeys()).toEqual([]);
    expect(tree.getCheckedKeys()).toContain('0');
  });

  it('treeInfo 暴露层级索引与全部 key', () => {
    const { tree } = mount();
    const info = tree.treeInfo;

    expect(info.maxLevel).toBe(2);
    expect(info.treeNodes.length).toBe(3);
    // 后序遍历：每个父节点排在它的子节点之后
    expect(info.allNodeKeys).toEqual([
      '0-0', '0-1', '0', '1-0', '1-1', '1', '2-0', '2-1', '2',
    ] as TreeNodeKey[]);
    expect(info.treeNodesMap.get('1-1')?.level).toBe(2);
  });

  it('getTreeNode 对不存在的 key 返回 undefined', () => {
    const { tree } = mount();

    expect(tree.getTreeNode('nope')).toBeUndefined();
  });

  it('插槽渲染函数透传到底层列表', () => {
    const { container } = mount({
      renderHeader: (el: HTMLElement) => {
        el.textContent = 'tree-header';
      },
      renderFooter: (el: HTMLElement) => {
        el.textContent = 'tree-footer';
      },
      renderStickyHeader: (el: HTMLElement) => {
        el.textContent = 'tree-sticky-header';
      },
      renderStickyFooter: (el: HTMLElement) => {
        el.textContent = 'tree-sticky-footer';
      },
    } as any);

    expect(container.querySelector('[data-id="header"]')!.textContent).toBe(
      'tree-header',
    );
    expect(container.querySelector('[data-id="footer"]')!.textContent).toBe(
      'tree-footer',
    );
    expect(
      container.querySelector('[data-id="stickyHeader"]')!.textContent,
    ).toBe('tree-sticky-header');
    expect(
      container.querySelector('[data-id="stickyFooter"]')!.textContent,
    ).toBe('tree-sticky-footer');
  });

  it('空数据时渲染 renderEmpty', () => {
    const { container } = mount({
      list: [],
      renderEmpty: (el: HTMLElement) => {
        el.textContent = 'empty-tree';
      },
    } as any);

    expect(container.textContent).toContain('empty-tree');
  });

  it('setList 后节点 DOM 完全重建', () => {
    const { container, tree } = mount();

    tree.setList([{ key: 'x', title: 'X' }]);

    expect(item(container, '0')).toBeNull();
    expect(item(container, 'x')).toBeTruthy();
    expect(node(container, 'x').textContent).toBe('X');
  });

  it('forceUpdate 用最新数据重建已渲染节点', () => {
    const list = makeTree();
    const { container, tree } = mount({ list });

    list[0]!.title = 'renamed';
    tree.forceUpdate();

    expect(
      node(container, '0').querySelector('.virt-tree-node-content')!.textContent,
    ).toBe('renamed');
  });

  it('事件透传：scroll / toTop / toBottom / update', () => {
    const events = {
      scroll: vi.fn(),
      toTop: vi.fn(),
      toBottom: vi.fn(),
      update: vi.fn(),
    };
    const { tree, clientEl } = mount(
      { list: makeTree(40, 0), itemPreSize: 32, buffer: 0 },
      events,
    );
    // 视口 400、40 行 × 32 = 1280
    expect(events.update).toHaveBeenCalled();

    clientEl.scrollTop = 100;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(events.scroll).toHaveBeenCalled();

    clientEl.scrollTop = 880;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(events.toBottom).toHaveBeenCalled();
    expect(events.toBottom.mock.calls[0]![0].key).toBe('39');

    clientEl.scrollTop = 0;
    clientEl.dispatchEvent(new Event('scroll'));
    expect(events.toTop).toHaveBeenCalled();
    expect(events.toTop.mock.calls[0]![0].key).toBe('0');

    tree.destroy();
  });
});
