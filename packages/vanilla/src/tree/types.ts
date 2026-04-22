import type { ListState } from '@virt-list/core';

/** 树节点原始数据（用户传入的未加工数据） */
export type TreeNodeData = Record<string, any>;
/** 树节点唯一标识 */
export type TreeNodeKey = string | number;
/** 原始树形数据数组 */
export type TreeData = TreeNodeData[];

/**
 * 内部加工后的树节点，附带层级、父子关系等元信息。
 */
export interface TreeNode<T = TreeNodeData> {
  /** 唯一标识 */
  key: TreeNodeKey;
  /** 节点深度（根节点为 1） */
  level: number;
  /** 显示标题 */
  title?: string;
  /** 是否叶子节点（无子节点） */
  isLeaf?: boolean;
  /** 是否为同级中的最后一个节点（连接线绘制需要） */
  isLast?: boolean;
  /** 父节点引用 */
  parent?: TreeNode;
  /** 子节点列表 */
  children?: TreeNode[];
  /** 是否禁用选择 */
  disableSelect?: boolean;
  /** 是否禁用复选框 */
  disableCheckbox?: boolean;
  /** 过滤命中时的匹配位置索引（-1 表示未搜索） */
  searchedIndex?: number;
  /** 原始数据引用 */
  data: T;
}

/**
 * 字段名映射，支持自定义数据字段名。
 */
export interface TreeFieldNames {
  key?: string;
  title?: string;
  children?: string;
  disableSelect?: string;
  disableCheckbox?: string;
  /** 禁止其他节点拖入该节点 */
  disableDragIn?: string;
  /** 禁止该节点被拖出 */
  disableDragOut?: string;
}

/**
 * 树的全局信息缓存，在 _setTreeData 时构建。
 */
export interface TreeInfo {
  /** key → TreeNode 的快速查找表 */
  treeNodesMap: Map<TreeNodeKey, TreeNode>;
  /** 扁平化后的根层级节点列表 */
  treeNodes: TreeNode[];
  /** 按 level 分组的节点列表（复选框的自下而上冒泡需要） */
  levelNodesMap: Map<TreeNodeKey, TreeNode[]>;
  /** 树的最大深度 */
  maxLevel: number;
  /** 所有节点 key 的列表 */
  allNodeKeys: TreeNodeKey[];
}

/** 复选框状态信息 */
export interface CheckedInfo {
  checkedKeys: TreeNodeKey[];
  checkedNodes: TreeData;
  halfCheckedKeys: TreeNodeKey[];
  halfCheckedNodes: TreeData;
}

/** scrollTo 方法的参数 */
export interface IScrollParams {
  /** 目标节点 key */
  key?: TreeNodeKey;
  /** 对齐方式：'top' 滚动到顶部，'view' 滚动到可视区域内 */
  align?: 'view' | 'top';
  /** 直接指定滚动偏移量（优先级最高） */
  offset?: number;
}

/**
 * 虚拟树配置项。
 */
export interface VirtTreeDOMOptions {
  /** 树形数据源 */
  list: TreeData;
  /** 自定义字段名映射 */
  fieldNames?: TreeFieldNames;
  /** 缩进宽度（px） */
  indent?: number;
  /** 展开/折叠图标尺寸（px） */
  iconSize?: number;
  /** 节点间距（px） */
  itemGap?: number;
  /** 渲染缓冲行数 */
  buffer?: number;
  /** 节点预估高度（px） */
  itemPreSize?: number;
  /** 是否固定行高 */
  fixed?: boolean;
  /** 是否显示连接线 */
  showLine?: boolean;
  /** 节点行的自定义 class */
  itemClass?: string;
  /** 列表容器的自定义 class */
  listClass?: string;
  /** 自定义 CSS class 分组前缀（默认 'virt-tree-group'） */
  customGroup?: string;

  /** 初始化时是否展开所有节点 */
  defaultExpandAll?: boolean;
  /** 初始展开的节点 key 列表 */
  expandedKeys?: TreeNodeKey[];
  /** 点击节点内容时是否触发展开/折叠 */
  expandOnClickNode?: boolean;

  /** 是否启用选择功能 */
  selectable?: boolean;
  /** 是否允许多选 */
  selectMultiple?: boolean;
  /** 初始选中的节点 key 列表 */
  selectedKeys?: TreeNodeKey[];

  /** 是否启用复选框 */
  checkable?: boolean;
  /** 初始勾选的节点 key 列表 */
  checkedKeys?: TreeNodeKey[];
  /** 父子节点是否严格不关联（不自动级联勾选） */
  checkedStrictly?: boolean;
  /** 点击节点内容时是否触发勾选 */
  checkOnClickNode?: boolean;

  /** 聚焦高亮的节点 key 列表 */
  focusedKeys?: TreeNodeKey[];

  /** 是否启用拖拽 */
  draggable?: boolean;
  /** 拖拽源节点的自定义 class */
  dragClass?: string;
  /** 拖拽幽灵元素的自定义 class */
  dragGhostClass?: string;
  /** 拖拽放置位置判定区域（上/中/下的比例） */
  dragoverPlacement?: number[];
  /** 是否允许跨层级拖拽 */
  crossLevelDraggable?: boolean;

  /** 过滤方法 */
  filterMethod?: (query: string, node: TreeNode) => boolean;

  /**
   * 自定义整个节点的渲染（替代默认的 node 结构）。
   * - 返回 HTMLElement：自动 appendChild 到 item wrapper
   * - 返回 void：可直接操作第三个参数 el，减少一层 DOM 嵌套
   */
  renderNode?: (node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement | void;
  /**
   * 自定义节点内容区域的渲染。
   * - 返回 HTMLElement：自动 appendChild 到 content 容器
   * - 返回 void：可直接操作第三个参数 el（content 容器）
   */
  renderContent?: (node: TreeNode, el: HTMLElement) => HTMLElement | void;
  /**
   * 自定义展开/折叠图标的渲染。
   * - 返回 HTMLElement：自动 appendChild 到 icon 容器
   * - 返回 void：可直接操作第三个参数 el（icon 容器）
   */
  renderIcon?: (node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement | void;
  renderStickyHeader?: (el: HTMLElement) => HTMLElement | void;
  renderStickyFooter?: (el: HTMLElement) => HTMLElement | void;
  renderHeader?: (el: HTMLElement) => HTMLElement | void;
  renderFooter?: (el: HTMLElement) => HTMLElement | void;
  renderEmpty?: (el: HTMLElement) => HTMLElement | void;
}

/**
 * 虚拟树事件回调。
 */
export interface VirtTreeDOMEvents {
  update?: (renderList: TreeNode[], state: ListState) => void;
  scroll?: (e: Event) => void;
  toTop?: (item: TreeNode) => void;
  toBottom?: (item: TreeNode) => void;
  itemResize?: (id: string, newSize: number) => void;
  click?: (data: TreeNodeData, node: TreeNode, e: MouseEvent) => void;

  /** 展开/折叠状态变化时触发 */
  expand?: (
    expandKeys: TreeNodeKey[],
    data: {
      node?: TreeNode;
      expanded: boolean;
      expandedNodes: TreeNodeData[];
    },
  ) => void;

  /** 选择状态变化时触发 */
  select?: (
    selectedKeys: TreeNodeKey[],
    data: {
      node: TreeNode;
      selected: boolean;
      selectedKeys: TreeNodeKey[];
      selectedNodes: TreeNodeData[];
    },
  ) => void;

  /** 复选框状态变化时触发 */
  check?: (
    checkedKeys: TreeNodeKey[],
    data: {
      node: TreeNode;
      checked: boolean;
      checkedKeys: TreeNodeKey[];
      checkedNodes: TreeNodeData[];
      halfCheckedKeys: TreeNodeKey[];
      halfCheckedNodes: TreeNodeData[];
    },
  ) => void;

  /** 拖拽开始时触发 */
  dragstart?: (data: { sourceNode: TreeNodeData }) => void;
  /**
   * 拖拽结束时触发。
   * 返回 undefined 表示拖拽被取消（Esc）；
   * 返回对象中的 prevNode/parentNode 指示目标位置。
   */
  dragend?: (data?: {
    node: TreeNode;
    prevNode: TreeNode | undefined;
    parentNode: TreeNode | undefined;
  }) => void;
}
