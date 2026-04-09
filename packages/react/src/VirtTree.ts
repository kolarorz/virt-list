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
import { VirtTreeDOM } from '@virt-list/dom';
import type {
  TreeNode,
  TreeNodeKey,
  TreeData,
  TreeFieldNames,
  TreeNodeData,
  IScrollParams,
  VirtTreeDOMOptions,
  VirtTreeDOMEvents,
} from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

export type { TreeNode, TreeNodeKey, TreeData, TreeFieldNames, TreeNodeData, IScrollParams };

export interface VirtTreeProps {
  list: TreeData;
  fieldNames?: TreeFieldNames;
  indent?: number;
  iconSize?: number;
  itemGap?: number;
  buffer?: number;
  itemPreSize?: number;
  fixed?: boolean;
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

  renderContent?: (node: TreeNode) => HTMLElement;
  renderIcon?: (node: TreeNode, isExpanded: boolean) => HTMLElement;
  renderNode?: (node: TreeNode, isExpanded: boolean) => HTMLElement;
  renderEmpty?: () => HTMLElement;
  renderStickyHeader?: () => HTMLElement;
  renderStickyFooter?: () => HTMLElement;
  renderHeader?: () => HTMLElement;
  renderFooter?: () => HTMLElement;

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

  onExpand?: VirtTreeDOMEvents['expand'];
  onSelect?: VirtTreeDOMEvents['select'];
  onCheck?: VirtTreeDOMEvents['check'];
  onDragstart?: VirtTreeDOMEvents['dragstart'];
  onDragend?: VirtTreeDOMEvents['dragend'];
  onScroll?: (e: Event) => void;
  onToTop?: (item: any) => void;
  onToBottom?: (item: any) => void;
  onItemResize?: (id: string, size: number) => void;
  onRangeUpdate?: (begin: number, end: number) => void;

  style?: React.CSSProperties;
  className?: string;
}

export interface VirtTreeRef {
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
  scrollTo: (params: IScrollParams) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  setList: (list: TreeData) => void;
  forceUpdate: () => void;
  getTreeNode: (key: TreeNodeKey) => TreeNode | undefined;
}

/**
 * React 虚拟树组件的内部实现。
 *
 * VirtTreeDOM 在 useEffect([]) 中创建一次。事件通过 eventsRef 间接引用，
 * 避免 effect 重建。list 引用变化时通过 render 阶段的 ref 比较触发 setList。
 *
 * 注意：setList 会重置展开/勾选状态（从 options 重新初始化），
 * 因此 list prop 应保持稳定引用（useMemo），除非确实需要重置整棵树。
 */
function VirtTreeInner(props: VirtTreeProps, ref: ForwardedRef<VirtTreeRef>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<VirtTreeDOM | null>(null);
  const eventsRef = useRef(props);
  eventsRef.current = props;

  const reactRootsRef = useRef(new Map<string, Root>());

  /**
   * 将 ReactNode 渲染到独立 DOM 容器中，供 VirtTreeDOM 使用。
   * 同一 mountKey 的旧 root 会先被卸载，避免内存泄漏。
   */
  function mountReact(mountKey: string, node: ReactNode): HTMLElement {
    const old = reactRootsRef.current.get(mountKey);
    if (old) old.unmount();
    const container = document.createElement('div');
    container.style.display = 'contents';
    const root = createRoot(container);
    flushSync(() => root.render(node));
    reactRootsRef.current.set(mountKey, root);
    return container;
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
      itemPreSize: props.itemPreSize,
      fixed: props.fixed,
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
      options.renderContent = (node: TreeNode) =>
        mountReact(`content:${node.key}`, eventsRef.current.content!({ node }));
    }
    if (p.icon) {
      options.renderIcon = (node: TreeNode, isExpanded: boolean) =>
        mountReact(`icon:${node.key}`, eventsRef.current.icon!({ node, isExpanded }));
    }
    if (p.nodeRender) {
      options.renderNode = (node: TreeNode, isExpanded: boolean) =>
        mountReact(`node:${node.key}`, eventsRef.current.nodeRender!({ node, isExpanded }));
    }
    if (p.empty) {
      options.renderEmpty = () => mountReact('empty', eventsRef.current.empty!());
    }
    if (p.header) {
      options.renderHeader = () => mountReact('header', eventsRef.current.header!());
    }
    if (p.footer) {
      options.renderFooter = () => mountReact('footer', eventsRef.current.footer!());
    }
    if (p.stickyHeader) {
      options.renderStickyHeader = () =>
        mountReact('stickyHeader', eventsRef.current.stickyHeader!());
    }
    if (p.stickyFooter) {
      options.renderStickyFooter = () =>
        mountReact('stickyFooter', eventsRef.current.stickyFooter!());
    }

    const events: VirtTreeDOMEvents = {
      expand: (...args) => eventsRef.current.onExpand?.(...args),
      select: (...args) => eventsRef.current.onSelect?.(...args),
      check: (...args) => eventsRef.current.onCheck?.(...args),
      dragstart: (...args) => eventsRef.current.onDragstart?.(...args),
      dragend: (...args) => eventsRef.current.onDragend?.(...args),
      scroll: (e) => eventsRef.current.onScroll?.(e),
      toTop: (item) => eventsRef.current.onToTop?.(item),
      toBottom: (item) => eventsRef.current.onToBottom?.(item),
      itemResize: (id, size) => eventsRef.current.onItemResize?.(id, size),
      rangeUpdate: (begin, end) => eventsRef.current.onRangeUpdate?.(begin, end),
    };

    treeRef.current = new VirtTreeDOM(containerRef.current, options, events);

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

  useImperativeHandle(ref, () => ({
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
    scrollToTop: () => treeRef.current?.scrollToTop(),
    scrollToBottom: () => treeRef.current?.scrollToBottom(),
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
