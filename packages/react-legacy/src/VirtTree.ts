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
import { VirtTree as VirtTreeVanilla } from '@virt-list/vanilla';
import type {
  ListState,
  TreeNode,
  TreeNodeKey,
  TreeData,
  TreeFieldNames,
  TreeNodeData,
  IScrollParams,
  VirtTreeDOMOptions,
  VirtTreeDOMEvents,
  VirtScrollOptions,
} from '@virt-list/vanilla';
import '@virt-list/vanilla/src/tree/tree.css';
import { createReactMounter } from './compat';

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
  scrollDuration?: number;
  smoothMaxDistance?: number;
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
  onScroll?: (e: Event) => void;
  onToTop?: (item: TreeNode) => void;
  onToBottom?: (item: TreeNode) => void;
  onItemResize?: (id: string, size: number) => void;
  onUpdate?: (renderList: TreeNode[], state: ListState) => void;

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
  scrollToTop: (options?: VirtScrollOptions) => void;
  scrollToBottom: (options?: VirtScrollOptions) => void;
  cancelScroll: () => void;
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

  const mountedElsRef = useRef(new Set<HTMLElement>());
  const { mountReact, cleanupAllRoots } = createReactMounter(mountedElsRef);

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
      scrollDuration: props.scrollDuration,
      smoothMaxDistance: props.smoothMaxDistance,
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
      toTop: (item) => eventsRef.current.onToTop?.(item),
      toBottom: (item) => eventsRef.current.onToBottom?.(item),
      itemResize: (id, size) => eventsRef.current.onItemResize?.(id, size),
      update: (renderList, state) => eventsRef.current.onUpdate?.(renderList, state),
    };

    treeRef.current = new VirtTreeVanilla(containerRef.current, options, events);

    return () => {
      treeRef.current?.destroy();
      treeRef.current = null;
      cleanupAllRoots();
    };
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
    scrollToTop: (opts) => treeRef.current?.scrollToTop(opts),
    scrollToBottom: (opts) => treeRef.current?.scrollToBottom(opts),
    cancelScroll: () => treeRef.current?.cancelScroll(),
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
