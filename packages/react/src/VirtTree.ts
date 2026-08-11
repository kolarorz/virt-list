/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  createElement,
  type ForwardedRef,
  type Ref,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { VirtTree as VirtTreeVanilla } from '@virt-list/vanilla';
import type {
  ListState,
  TreeNode,
  TreeNodeKey,
  TreeData,
  TreeFieldNames,
  TreeNodeData,
  VirtTreeScrollTarget,
  VirtTreeDOMOptions,
  VirtTreeDOMEvents,
  VirtScrollEvent,
  VirtScrollOptions,
} from '@virt-list/vanilla';

export type { TreeNode, TreeNodeKey, TreeData, TreeFieldNames, TreeNodeData, VirtTreeScrollTarget };

export interface VirtTreeProps {
  list: TreeData;
  fieldNames?: TreeFieldNames;
  indent?: number;
  iconSize?: number;
  itemGap?: number;
  buffer?: number;
  estimatedSize?: number;
  fixedSize?: boolean;
  scrollDuration?: number;
  smoothMaxDistance?: number;
  scrollbarAutoHideDelay?: number;
  scrollbarMinThumbSize?: number;
  /** 是否接管键盘（方向键 / PageUp-Down / Space / Home-End），默认 true。宿主已在祖先元素上处理这些键时关掉 */
  keyboard?: boolean;
  showLine?: boolean;
  itemClass?: string;
  listClass?: string;
  customGroup?: string;

  defaultExpandAll?: boolean;
  expandedKeys?: TreeNodeKey[];
  expandOnClickNode?: boolean;

  selectable?: boolean;
  selectMultiple?: boolean;
  selectedKeys?: TreeNodeKey[];

  checkable?: boolean;
  checkedKeys?: TreeNodeKey[];
  checkedStrictly?: boolean;
  checkOnClickNode?: boolean;

  focusedKeys?: TreeNodeKey[];

  draggable?: boolean;
  dragClass?: string;
  dragGhostClass?: string;
  crossLevelDraggable?: boolean;

  filterMethod?: (query: string, node: TreeNode) => boolean;

  renderContent?: (node: TreeNode, el: HTMLElement) => HTMLElement | void;
  renderIcon?: (node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement | void;
  renderNode?: (node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement | void;
  renderEmpty?: (el: HTMLElement) => HTMLElement | void;
  renderStickyHeader?: (el: HTMLElement) => HTMLElement | void;
  renderStickyFooter?: (el: HTMLElement) => HTMLElement | void;
  renderHeader?: (el: HTMLElement) => HTMLElement | void;
  renderFooter?: (el: HTMLElement) => HTMLElement | void;

  /** JSX 渲染函数，优先级高于 renderContent */
  content?: (props: { node: TreeNode }) => ReactNode;
  /** JSX 渲染函数，优先级高于 renderIcon */
  icon?: (props: { node: TreeNode; isExpanded: boolean }) => ReactNode;
  /** JSX 渲染函数，优先级高于 renderNode */
  nodeRender?: (props: { node: TreeNode; isExpanded: boolean }) => ReactNode;
  /** JSX 渲染函数，优先级高于 renderEmpty */
  empty?: () => ReactNode;
  /** JSX 渲染函数，优先级高于 renderHeader */
  header?: () => ReactNode;
  /** JSX 渲染函数，优先级高于 renderFooter */
  footer?: () => ReactNode;
  /** JSX 渲染函数，优先级高于 renderStickyHeader */
  stickyHeader?: () => ReactNode;
  /** JSX 渲染函数，优先级高于 renderStickyFooter */
  stickyFooter?: () => ReactNode;

  /** 点击节点（内容区，或 nodeRender 接管后的整行） */
  onNodeClick?: VirtTreeDOMEvents['click'];
  onExpand?: VirtTreeDOMEvents['expand'];
  onSelect?: VirtTreeDOMEvents['select'];
  onCheck?: VirtTreeDOMEvents['check'];
  onDragstart?: VirtTreeDOMEvents['dragstart'];
  onDragend?: VirtTreeDOMEvents['dragend'];
  /**
   * 滚动了。容器 overflow:hidden，没有原生 scroll 事件，这是它的替代品。
   *
   * 与 React 的合成 `onScroll` 不冲突：本组件只把 style / className 交给根 div，
   * 事件 props 一律不透传。
   */
  onScroll?: (event: VirtScrollEvent) => void;
  /** 滚动偏移量变化。要跟着偏移量重写 DOM 时用它，只想感知滚动用 onScroll */
  onOffsetChange?: (offset: number) => void;
  onToTop?: (item: TreeNode) => void;
  onToBottom?: (item: TreeNode) => void;
  onItemResize?: (id: string, size: number) => void;
  onUpdate?: (renderList: TreeNode[], state: ListState) => void;

  style?: React.CSSProperties;
  className?: string;
}

export interface VirtTreeRef {
  /**
   * 滚动容器（唯一的 scrollport）。
   *
   * 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。感知滚动请用
   * `onScroll`——挂在这上面的原生 `scroll` 监听收不到有用信息。
   */
  clientEl: HTMLElement;
  expandAll: (expanded: boolean) => void;
  expandNode: (key: TreeNodeKey | TreeNodeKey[], expanded: boolean) => void;
  toggleExpand: (node: TreeNode) => void;
  setExpandedKeys: (keys: TreeNodeKey[]) => void;
  selectAll: (selected: boolean) => void;
  selectNode: (key: TreeNodeKey | TreeNodeKey[], selected: boolean) => void;
  toggleSelect: (node: TreeNode) => void;
  checkAll: (checked: boolean) => void;
  checkNode: (key: TreeNodeKey | TreeNodeKey[], checked: boolean) => void;
  toggleCheckbox: (node: TreeNode) => void;
  getCheckedKeys: (leafOnly?: boolean) => TreeNodeKey[];
  getHalfCheckedKeys: () => TreeNodeKey[];
  setFocusedKeys: (keys: TreeNodeKey[]) => void;
  filter: (query: string) => void;
  scrollTo: (params: VirtTreeScrollTarget) => void;
  /** 定位到指定节点（折叠时先展开祖先），无论是否可见都滚动 */
  scrollToKey: (key: TreeNodeKey, options?: VirtScrollOptions) => void;
  /** 把节点滚进可视区域，已完整可见则不动 */
  scrollKeyIntoView: (key: TreeNodeKey, options?: VirtScrollOptions) => void;
  scrollToOffset: (offset: number, options?: VirtScrollOptions) => void;
  scrollToTop: (options?: VirtScrollOptions) => void;
  scrollToBottom: (options?: VirtScrollOptions) => void;
  /** 当前滚动偏移量。容器的 scrollTop 恒为 0（内容靠 transform 移动），必须走这里读 */
  getOffset: () => number;
  /** 当前允许的最大偏移量，即 `getTotalSize() - clientSize`（不为负） */
  getMaxOffset: () => number;
  /** 内容总尺寸（列表项 + 各插槽），对应原生语境的 `scrollHeight` */
  getTotalSize: () => number;
  /** 上报一次用户发起的滚动（会触发 toTop / toBottom 与自动续拉） */
  scrollFromUser: (offset: number) => void;
  cancelScroll: () => void;
  /** 容器被隐藏/重新挂载后（keep-alive）把内容重新摆到当前偏移量上 */
  resume: () => void;
  setList: (list: TreeData) => void;
  forceUpdate: () => void;
  getTreeNode: (key: TreeNodeKey) => TreeNode | undefined;
}

/** 逐项比较两组 key，undefined 与空数组视为不同（前者表示不受控） */
function sameKeys(a?: TreeNodeKey[], b?: TreeNodeKey[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * React 虚拟树形组件的内部实现。
 *
 * VirtTree 在 useEffect([]) 中创建一次。事件通过 eventsRef 间接引用，
 * 避免 effect 重建。list 引用变化时通过 render 阶段的 ref 比较触发 setList。
 *
 * 注意：setList 会重置展开/勾选状态（从 options 重新初始化），
 * 因此 list prop 应保持稳定引用（useMemo），除非确实需要重置整棵树。
 */
function VirtTreeInner(props: VirtTreeProps, ref: ForwardedRef<VirtTreeRef>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<VirtTreeVanilla | null>(null);
  const eventsRef = useRef(props);
  eventsRef.current = props;

  const reactRootsRef = useRef(new Map<string, Root>());

  /** 将 ReactNode 直接渲染到目标 el 中，无额外包裹层 */
  function mountReact(mountKey: string, node: ReactNode, el: HTMLElement): void {
    const old = reactRootsRef.current.get(mountKey);
    if (old) {
      // 渲染期间同步卸载组件问题
      queueMicrotask(() => {
        old.unmount();
      })
    }
    const root = createRoot(el);
    // 生命周期内调用 flushSync 问题
    queueMicrotask(() => {
      flushSync(() => root.render(node));
    })
    reactRootsRef.current.set(mountKey, root);
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const p = eventsRef.current;

    const options: VirtTreeDOMOptions = {
      list: props.list,
      fieldNames: props.fieldNames,
      indent: props.indent,
      iconSize: props.iconSize,
      itemGap: props.itemGap,
      buffer: props.buffer,
      estimatedSize: props.estimatedSize,
      fixedSize: props.fixedSize,
      scrollDuration: props.scrollDuration,
      smoothMaxDistance: props.smoothMaxDistance,
      scrollbarAutoHideDelay: props.scrollbarAutoHideDelay,
      scrollbarMinThumbSize: props.scrollbarMinThumbSize,
      keyboard: props.keyboard,
      showLine: props.showLine,
      itemClass: props.itemClass,
      listClass: props.listClass,
      customGroup: props.customGroup,
      defaultExpandAll: props.defaultExpandAll,
      expandedKeys: props.expandedKeys,
      expandOnClickNode: props.expandOnClickNode,
      selectable: props.selectable,
      selectMultiple: props.selectMultiple,
      selectedKeys: props.selectedKeys,
      checkable: props.checkable,
      checkedKeys: props.checkedKeys,
      checkedStrictly: props.checkedStrictly,
      checkOnClickNode: props.checkOnClickNode,
      focusedKeys: props.focusedKeys,
      draggable: props.draggable,
      dragClass: props.dragClass,
      dragGhostClass: props.dragGhostClass,
      crossLevelDraggable: props.crossLevelDraggable,
      filterMethod: props.filterMethod,
      renderContent: props.renderContent,
      renderIcon: props.renderIcon,
      renderNode: props.renderNode,
      renderEmpty: props.renderEmpty,
      renderStickyHeader: props.renderStickyHeader,
      renderStickyFooter: props.renderStickyFooter,
      renderHeader: props.renderHeader,
      renderFooter: props.renderFooter,
    };

    if (p.content) {
      options.renderContent = (node: TreeNode, el: HTMLElement) => {
        mountReact(`content:${node.key}`, eventsRef.current.content!({ node }), el);
      };
    }
    if (p.icon) {
      options.renderIcon = (node: TreeNode, isExpanded: boolean, el: HTMLElement) => {
        mountReact(`icon:${node.key}`, eventsRef.current.icon!({ node, isExpanded }), el);
      };
    }
    if (p.nodeRender) {
      options.renderNode = (node: TreeNode, isExpanded: boolean, el: HTMLElement) => {
        mountReact(`node:${node.key}`, eventsRef.current.nodeRender!({ node, isExpanded }), el);
      };
    }
    if (p.empty) {
      options.renderEmpty = (el: HTMLElement) => {
        mountReact('empty', eventsRef.current.empty!(), el);
      };
    }
    if (p.header) {
      options.renderHeader = (el: HTMLElement) => {
        mountReact('header', eventsRef.current.header!(), el);
      };
    }
    if (p.footer) {
      options.renderFooter = (el: HTMLElement) => {
        mountReact('footer', eventsRef.current.footer!(), el);
      };
    }
    if (p.stickyHeader) {
      options.renderStickyHeader = (el: HTMLElement) => {
        mountReact('stickyHeader', eventsRef.current.stickyHeader!(), el);
      };
    }
    if (p.stickyFooter) {
      options.renderStickyFooter = (el: HTMLElement) => {
        mountReact('stickyFooter', eventsRef.current.stickyFooter!(), el);
      };
    }

    const events: VirtTreeDOMEvents = {
      click: (...args) => eventsRef.current.onNodeClick?.(...args),
      expand: (...args) => eventsRef.current.onExpand?.(...args),
      select: (...args) => eventsRef.current.onSelect?.(...args),
      check: (...args) => eventsRef.current.onCheck?.(...args),
      dragstart: (...args) => eventsRef.current.onDragstart?.(...args),
      dragend: (...args) => eventsRef.current.onDragend?.(...args),
      scroll: (e) => eventsRef.current.onScroll?.(e),
      offsetChange: (o) => eventsRef.current.onOffsetChange?.(o),
      toTop: (item) => eventsRef.current.onToTop?.(item),
      toBottom: (item) => eventsRef.current.onToBottom?.(item),
      itemResize: (id, size) => eventsRef.current.onItemResize?.(id, size),
      update: (renderList, state) => eventsRef.current.onUpdate?.(renderList, state),
    };

    treeRef.current = new VirtTreeVanilla(containerRef.current, options, events);

    return () => {
      treeRef.current?.destroy();
      treeRef.current = null;
      reactRootsRef.current.forEach((root) => root.unmount());
      reactRootsRef.current.clear();
    };
    // Only recreate on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevListRef = useRef(props.list);
  if (props.list !== prevListRef.current) {
    prevListRef.current = props.list;
    treeRef.current?.setList(props.list);
  }

  /*
   * 受控 keys 的同步。
   *
   * 比较到元素粒度而不是引用：React 侧写 `expandedKeys={[...]}` 是常态，
   * 每次 render 都是新数组，按引用比较会让整棵树在每次父组件渲染时全量重建。
   */
  const prevKeysRef = useRef({
    expandedKeys: props.expandedKeys,
    selectedKeys: props.selectedKeys,
    checkedKeys: props.checkedKeys,
    focusedKeys: props.focusedKeys,
  });
  useEffect(() => {
    const prev = prevKeysRef.current;
    const next = {
      expandedKeys: props.expandedKeys,
      selectedKeys: props.selectedKeys,
      checkedKeys: props.checkedKeys,
      focusedKeys: props.focusedKeys,
    };
    const partial: Partial<VirtTreeDOMOptions> = {};
    for (const key of Object.keys(next) as (keyof typeof next)[]) {
      // undefined 表示"该项不受控"，不能拿它去清空 DOM 层已有状态
      if (next[key] !== undefined && !sameKeys(prev[key], next[key])) {
        partial[key] = next[key];
      }
    }
    prevKeysRef.current = next;
    if (Object.keys(partial).length > 0) {
      treeRef.current?.updateOptions(partial);
    }
  }, [
    props.expandedKeys,
    props.selectedKeys,
    props.checkedKeys,
    props.focusedKeys,
  ]);

  useImperativeHandle(ref, () => ({
    get clientEl() { return treeRef.current!.clientEl; },
    expandAll: (expanded) => treeRef.current?.expandAll(expanded),
    expandNode: (key, expanded) => treeRef.current?.expandNode(key, expanded),
    toggleExpand: (node) => treeRef.current?.toggleExpand(node),
    setExpandedKeys: (keys) => treeRef.current?.setExpandedKeys(keys),
    selectAll: (selected) => treeRef.current?.selectAll(selected),
    selectNode: (key, selected) => treeRef.current?.selectNode(key, selected),
    toggleSelect: (node) => treeRef.current?.toggleSelect(node),
    checkAll: (checked) => treeRef.current?.checkAll(checked),
    checkNode: (key, checked) => treeRef.current?.checkNode(key, checked),
    toggleCheckbox: (node) => treeRef.current?.toggleCheckbox(node),
    getCheckedKeys: (leafOnly) => treeRef.current?.getCheckedKeys(leafOnly) ?? [],
    getHalfCheckedKeys: () => treeRef.current?.getHalfCheckedKeys() ?? [],
    setFocusedKeys: (keys) => treeRef.current?.setFocusedKeys(keys),
    filter: (query) => treeRef.current?.filter(query),
    scrollTo: (params) => treeRef.current?.scrollTo(params),
    scrollToKey: (key, opts) => treeRef.current?.scrollToKey(key, opts),
    scrollKeyIntoView: (key, opts) => treeRef.current?.scrollKeyIntoView(key, opts),
    scrollToOffset: (o, opts) => treeRef.current?.scrollToOffset(o, opts),
    scrollToTop: (opts) => treeRef.current?.scrollToTop(opts),
    scrollToBottom: (opts) => treeRef.current?.scrollToBottom(opts),
    getOffset: () => treeRef.current?.getOffset() ?? 0,
    getMaxOffset: () => treeRef.current?.getMaxOffset() ?? 0,
    getTotalSize: () => treeRef.current?.getTotalSize() ?? 0,
    scrollFromUser: (o) => treeRef.current?.scrollFromUser(o),
    cancelScroll: () => treeRef.current?.cancelScroll(),
    resume: () => treeRef.current?.resume(),
    setList: (list) => treeRef.current?.setList(list),
    forceUpdate: () => treeRef.current?.forceUpdate(),
    getTreeNode: (key) => treeRef.current?.getTreeNode(key),
  }));

  return createElement('div', {
    ref: containerRef,
    style: { width: '100%', height: '100%', ...props.style },
    className: props.className,
  });
}

export const VirtTree = forwardRef(VirtTreeInner) as (
  props: VirtTreeProps & { ref?: Ref<VirtTreeRef> },
) => ReactElement | null;
