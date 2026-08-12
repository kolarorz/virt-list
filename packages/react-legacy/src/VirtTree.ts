/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  createElement,
  type ForwardedRef,
  type Ref,
  type ReactElement,
  type ReactNode,
} from 'react';
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
import { createReactMounter } from './compat.js';

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
  /** 交叉轴（竖向列表的横向、横向列表的竖向）是否允许原生滚动，默认 true。关掉即两轴全裁切 */
  crossScroll?: boolean;
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

  content?: (props: { node: TreeNode }) => ReactNode;
  icon?: (props: { node: TreeNode; isExpanded: boolean }) => ReactNode;
  nodeRender?: (props: { node: TreeNode; isExpanded: boolean }) => ReactNode;
  empty?: () => ReactNode;
  header?: () => ReactNode;
  footer?: () => ReactNode;
  stickyHeader?: () => ReactNode;
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
   * 滚动容器（主轴视口）。
   *
   * 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。感知滚动请用
   * `onScroll`——挂在这上面的原生 `scroll` 监听收不到有用信息。
   */
  clientEl: HTMLElement;
  /**
   * 交叉轴（竖向列表的横向）的滚动容器。那条轴归浏览器原生滚动：
   * 读写它的 `scrollLeft` 就是读写横向滚动位置，横滚也是真的原生 `scroll` 事件。
   */
  scrollContentEl: HTMLElement;
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
 * React 16-17 虚拟树形组件。
 *
 * 与 @virt-list/react (React 18+) 的区别：
 * - 使用 ReactDOM.render() 替代 createRoot()
 * - 使用 ReactDOM.unmountComponentAtNode() 替代 root.unmount()
 * - 不依赖 flushSync（ReactDOM.render 是同步的）
 */
function VirtTreeInner(props: VirtTreeProps, ref: ForwardedRef<VirtTreeRef>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<VirtTreeVanilla | null>(null);
  const eventsRef = useRef(props);
  eventsRef.current = props;

  const mounterRef = useRef<ReturnType<typeof createReactMounter> | null>(null);
  if (!mounterRef.current) mounterRef.current = createReactMounter();
  const mounter = mounterRef.current;
  const { mountReact } = mounter;

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
      crossScroll: props.crossScroll,
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
        mountReact(`content:${node.key}`, () => eventsRef.current.content!({ node }), el);
      };
    }
    if (p.icon) {
      options.renderIcon = (node: TreeNode, isExpanded: boolean, el: HTMLElement) => {
        mountReact(`icon:${node.key}`, () => eventsRef.current.icon!({ node, isExpanded }), el);
      };
    }
    if (p.nodeRender) {
      options.renderNode = (node: TreeNode, isExpanded: boolean, el: HTMLElement) => {
        mountReact(`node:${node.key}`, () => eventsRef.current.nodeRender!({ node, isExpanded }), el);
      };
    }
    if (p.empty) {
      options.renderEmpty = (el: HTMLElement) => {
        mountReact('empty', () => eventsRef.current.empty!(), el);
      };
    }
    if (p.header) {
      options.renderHeader = (el: HTMLElement) => {
        mountReact('header', () => eventsRef.current.header!(), el);
      };
    }
    if (p.footer) {
      options.renderFooter = (el: HTMLElement) => {
        mountReact('footer', () => eventsRef.current.footer!(), el);
      };
    }
    if (p.stickyHeader) {
      options.renderStickyHeader = (el: HTMLElement) => {
        mountReact('stickyHeader', () => eventsRef.current.stickyHeader!(), el);
      };
    }
    if (p.stickyFooter) {
      options.renderStickyFooter = (el: HTMLElement) => {
        mountReact('stickyFooter', () => eventsRef.current.stickyFooter!(), el);
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
      mounter.cleanupAllRoots();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevListRef = useRef(props.list);

  /**
   * 每次宿主渲染后跟 core 对齐一次。没有 deps 是故意的：已挂载的节点内容不在
   * React 的 vdom 树上，只能靠这里用最新的渲染 prop 重刷一遍。
   * setList 同样不能写在 render 函数体里 —— 那是在 React 渲染阶段里驱动 core 重渲染。
   */
  useLayoutEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;

    if (props.list !== prevListRef.current) {
      prevListRef.current = props.list;
      tree.setList(props.list);
    }
    mounter.flushMounts();
  });

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
    get scrollContentEl() { return treeRef.current!.scrollContentEl; },
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
