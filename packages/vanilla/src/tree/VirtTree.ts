/* eslint-disable @typescript-eslint/no-explicit-any */
import { VirtList } from '../VirtList.js';
import type { VirtScrollOptions } from '@virt-list/core';
import type {
  TreeNode,
  TreeNodeData,
  TreeNodeKey,
  TreeData,
  TreeFieldNames,
  TreeInfo,
  VirtTreeScrollTarget,
  VirtTreeDOMOptions,
  VirtTreeDOMEvents,
} from './types.js';
import {
  isSiblingElement,
  findAncestorWithClass,
  getPrevSibling,
  getNextSibling,
} from './utils.js';

const DEFAULT_FIELD_NAMES: Required<TreeFieldNames> = {
  key: 'key',
  title: 'title',
  children: 'children',
  disableSelect: 'disableSelect',
  disableCheckbox: 'disableCheckbox',
  disableDragIn: 'disableDragIn',
  disableDragOut: 'disableDragOut',
};

/**
 * 拖拽自动滚动的最大速度（px/s）。
 * 与旧实现（每 10ms 移动 20px）保持一致的手感。
 */
const AUTO_SCROLL_MAX_SPEED = 2000;

/**
 * 虚拟树形的 DOM 实现。
 *
 * 核心流程：
 * 1. 将树形数据扁平化为 TreeNode[]，建立 treeNodesMap 等索引
 * 2. 根据展开状态 (_expandedKeysSet) 计算可见的 renderList（DFS 遍历，跳过折叠子树）
 * 3. 将 renderList 交给 VirtList 进行虚拟滚动渲染
 * 4. 各交互操作（展开/选择/勾选/拖拽）修改状态集合后调用 _refresh 触发重绘
 *
 * 状态管理采用 Set 集合（_expandedKeysSet / _selectedKeysSet 等），
 * 而非受控 prop 驱动，以保证交互时的即时响应。
 */
export class VirtTree {
  private _options: VirtTreeDOMOptions;
  private _events: VirtTreeDOMEvents;
  private _virtListDOM!: VirtList<TreeNode>;
  private _containerEl: HTMLElement;

  private _fieldNames: Required<TreeFieldNames>;
  /** 树的全局信息缓存 */
  private _treeInfo: TreeInfo = {
    treeNodesMap: new Map(),
    treeNodes: [],
    levelNodesMap: new Map(),
    maxLevel: 1,
    allNodeKeys: [],
  };
  /** 所有含子节点的节点 key（expandAll 时使用） */
  private _parentNodeKeys: TreeNodeKey[] = [];
  /**
   * key → DFS 顺序下标，_sortKeysByDataOrder 的排序基准。
   *
   * 与 allNodeKeys 同在 _setTreeData 中填充。之所以缓存成字段，是因为
   * 每次点击复选框都要排序两组 key（选中 + 半选），若每次重建这张表，
   * 单次交互就要多付两趟全树遍历。
   */
  private _keyOrderMap: Map<TreeNodeKey, number> = new Map();

  // ---- 交互状态集合 ----
  /** 当前展开的节点 key 集合 */
  private _expandedKeysSet: Set<TreeNodeKey> = new Set();
  /** 当前选中的节点 key 集合 */
  private _selectedKeysSet: Set<TreeNodeKey> = new Set();
  /** 当前勾选的节点 key 集合 */
  private _checkedKeysSet: Set<TreeNodeKey> = new Set();
  /** 半选状态（部分子节点被勾选）的节点 key 集合 */
  private _indeterminateKeysSet: Set<TreeNodeKey> = new Set();
  /** 聚焦高亮的节点 key 集合 */
  private _focusedKeysSet: Set<TreeNodeKey> = new Set();
  /** 被过滤隐藏的节点 key 集合 */
  private _hiddenNodeKeySet: Set<TreeNodeKey> = new Set();
  /** 过滤后所有子节点都被隐藏的父节点（隐藏其展开图标） */
  private _hiddenExpandIconKeySet: Set<TreeNodeKey> = new Set();

  /** 当前可见的扁平化节点列表（传给 VirtList 的数据源） */
  private _renderList: TreeNode[] = [];
  /** 是否正在拖拽中（拖拽时禁止其他交互） */
  private _dragging = false;

  /** 已渲染节点 key → 其 DOM 元素的映射，用于就地更新状态 class */
  private _nodeElMap: Map<TreeNodeKey, HTMLElement> = new Map();

  /** 当前拖拽状态（null 表示无拖拽） */
  private _dragState: DragState | null = null;

  constructor(
    container: HTMLElement,
    options: VirtTreeDOMOptions,
    events?: VirtTreeDOMEvents,
  ) {
    this._containerEl = container;
    this._options = { ...options };
    this._events = events ?? {};
    this._fieldNames = { ...DEFAULT_FIELD_NAMES, ...options.fieldNames };

    if (options.focusedKeys) {
      this._focusedKeysSet = new Set(options.focusedKeys);
    }
    if (options.selectedKeys) {
      this._selectedKeysSet = new Set(options.selectedKeys);
    }
    if (options.checkedKeys) {
      this._checkedKeysSet = new Set(options.checkedKeys);
    }
    if (options.expandedKeys) {
      this._expandedKeysSet = new Set(options.expandedKeys);
    }

    // 初始化流程：扁平化数据 → 初始化展开/勾选状态 → 计算可见列表 → 创建虚拟列表
    this._setTreeData(options.list);
    this._initExpandedKeys();
    this._initCheckedKeys();
    this._computeRenderList();
    this._createVirtList();
  }

  // ==================== Public API ====================

  get treeInfo(): TreeInfo {
    return this._treeInfo;
  }

  getTreeNode(key: TreeNodeKey): TreeNode | undefined {
    return this._treeInfo.treeNodesMap.get(String(key));
  }

  hasExpanded(node: TreeNode): boolean {
    return this._expandedKeysSet.has(node.key);
  }

  hasSelected(node: TreeNode): boolean {
    return this._selectedKeysSet.has(node.key);
  }

  hasChecked(node: TreeNode): boolean {
    return this._checkedKeysSet.has(node.key);
  }

  hasIndeterminate(node: TreeNode): boolean {
    return this._indeterminateKeysSet.has(node.key);
  }

  hasFocused(node: TreeNode): boolean {
    return this._focusedKeysSet.has(node.key);
  }

  // ----- Expand -----

  /** 展开或折叠所有节点 */
  expandAll(expanded: boolean): void {
    this._expandedKeysSet = new Set(
      expanded ? this._parentNodeKeys : [],
    );
    const sortedKeys = expanded ? [...this._parentNodeKeys] : [];
    const expandedNodes: TreeNodeData[] = [];
    for (const key of sortedKeys) {
      const node = this.getTreeNode(key);
      if (node) expandedNodes.push(node.data);
    }
    this._events.expand?.(sortedKeys, { expanded, expandedNodes });
    this._refresh();
  }

  /**
   * 展开或折叠指定节点。
   * 展开时会自动展开所有祖先节点（确保可见）。
   * 折叠叶子节点时折叠其父节点；foldAllNodes=true 时递归折叠所有祖先。
   */
  expandNode(
    key: TreeNodeKey | TreeNodeKey[],
    expanded: boolean,
    foldAllNodes?: boolean,
  ): void {
    const targets = Array.isArray(key) ? key : [key];
    for (const k of targets) {
      const node = this.getTreeNode(k);
      if (!node) continue;
      if (expanded) {
        this._expandParents(node);
      } else {
        if (node.isLeaf) {
          if (!node.parent) continue;
          if (foldAllNodes) {
            this._foldParents(node.parent);
          } else {
            this._expandedKeysSet.delete(node.parent.key);
          }
        } else {
          this._expandedKeysSet.delete(node.key);
        }
      }
    }

    const sortedKeys = this._sortKeysByDataOrder(this._expandedKeysSet);
    const expandedNodes: TreeNodeData[] = [];
    for (const k of sortedKeys) {
      const n = this.getTreeNode(k);
      if (n) expandedNodes.push(n.data);
    }
    this._events.expand?.(sortedKeys, {
      node: !Array.isArray(key) ? this.getTreeNode(key) : undefined,
      expanded,
      expandedNodes,
    });
    this._refresh();
  }

  toggleExpand(node: TreeNode): void {
    if (node.isLeaf) return;
    const expanded = this.hasExpanded(node);
    this.expandNode(node.key, !expanded);
  }

  setExpandedKeys(keys: TreeNodeKey[]): void {
    this._expandedKeysSet.clear();
    for (const key of keys) {
      const node = this.getTreeNode(key);
      if (node) this._expandParents(node);
    }
    this._refresh();
  }

  // ----- Select -----

  toggleSelect(node: TreeNode): void {
    if (node.disableSelect) return;
    const selected = this.hasSelected(node);
    if (selected) {
      this._selectedKeysSet.delete(node.key);
    } else {
      if (!this._options.selectMultiple) {
        this._selectedKeysSet.clear();
      }
      this._selectedKeysSet.add(node.key);
    }
    this._afterNodeSelect(node, !selected);
    this._updateRenderedNodeStates();
  }

  selectNode(key: TreeNodeKey | TreeNodeKey[], selected: boolean): void {
    const targets = Array.isArray(key) ? key : [key];
    for (const k of targets) {
      if (selected) {
        this._selectedKeysSet.add(k);
      } else {
        this._selectedKeysSet.delete(k);
      }
    }
    this._updateRenderedNodeStates();
  }

  selectAll(selected: boolean): void {
    if (selected) {
      const keys = this._treeInfo.allNodeKeys.filter((k) => {
        const n = this.getTreeNode(k);
        return n && !n.disableSelect;
      });
      this._selectedKeysSet = new Set(keys);
    } else {
      this._selectedKeysSet.clear();
    }
    this._updateRenderedNodeStates();
  }

  // ----- Check -----

  toggleCheckbox(node: TreeNode): void {
    const checked = this.hasChecked(node);
    this._toggleCheckboxInternal(node, !checked);
    this._afterNodeCheck(node, !checked);
    this._updateRenderedNodeStates();
  }

  // checkAll(checked: boolean): void {
  //   if (!checked) {
  //     this._checkedKeysSet.clear();
  //     this._indeterminateKeysSet.clear();
  //   } else {
  //     const keys = this._treeInfo.allNodeKeys.filter((k) => {
  //       const n = this.getTreeNode(k);
  //       return n && !n.disableCheckbox;
  //     });
  //     this._checkedKeysSet = new Set(keys);
  //   }
  //   this._updateRenderedNodeStates();
  // }

  checkAll(checked: boolean): void {
    this._checkedKeysSet.clear();
    this._indeterminateKeysSet.clear();
    if (checked) {
      const keys = this._treeInfo.allNodeKeys.filter((k) => {
        const n = this.getTreeNode(k);
        return n && !n.disableCheckbox;
      });
      this._checkedKeysSet = new Set(keys);
      this._updateCheckedKeys();
    }
    this._updateRenderedNodeStates();
  }

  checkNode(key: TreeNodeKey | TreeNodeKey[], checked: boolean): void {
    const targets = Array.isArray(key) ? key : [key];
    let mutated = false;
    for (const k of targets) {
      const node = this.getTreeNode(k);
      if (!node) continue;
      // 冒泡延后到循环结束，否则每个 key 都要付一趟全树遍历
      mutated = this._toggleCheckboxInternal(node, checked, true) || mutated;
    }
    this._bubbleAfterBatch(mutated);
    this._updateRenderedNodeStates();
  }

  getCheckedKeys(leafOnly = false): TreeNodeKey[] {
    const sorted = this._sortKeysByDataOrder(this._checkedKeysSet);
    if (!leafOnly) return sorted;
    return sorted.filter((key) => {
      const node = this.getTreeNode(key);
      return node && node.isLeaf;
    });
  }

  getHalfCheckedKeys(): TreeNodeKey[] {
    return this._sortKeysByDataOrder(this._indeterminateKeysSet);
  }

  // ----- Focus -----

  setFocusedKeys(keys: TreeNodeKey[]): void {
    this._focusedKeysSet = new Set(keys);
    this._updateRenderedNodeStates();
  }

  // ----- Filter -----

  filter(query: string): void {
    if (typeof this._options.filterMethod !== 'function') return;

    const expandKeySet = new Set<TreeNodeKey>();
    const hiddenKeys = this._hiddenNodeKeySet;
    const hiddenExpandIconKeys = this._hiddenExpandIconKeySet;
    const family: TreeNode[] = [];
    const nodes = this._treeInfo.treeNodes || [];
    const filterFn = this._options.filterMethod;
    // 两个 Set 都要清：下面的遍历只在「节点自己进了 expandKeySet」这一支里
    // delete hiddenExpandIconKeys，整个子树都不匹配的节点走不到那里，
    // 上一轮的判定就会留着。它此刻虽然也被隐藏、看不出来，但换成
    // `children` 为空数组之类的形态就会漏出去 —— 不如统一从零开始算
    hiddenKeys.clear();
    hiddenExpandIconKeys.clear();

    const traverse = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        node.searchedIndex =
          query === ''
            ? -1
            : node.title?.toLowerCase().indexOf(query.toLowerCase());

        family.push(node);
        if (filterFn(query, node)) {
          for (const member of family) {
            if (!member.isLeaf) expandKeySet.add(member.key);
          }
        } else if (node.isLeaf) {
          hiddenKeys.add(node.key);
        }
        if (node.children) traverse(node.children);
        if (!node.isLeaf) {
          if (!expandKeySet.has(node.key)) {
            hiddenKeys.add(node.key);
          } else if (node.children) {
            let allHidden = true;
            for (const child of node.children) {
              if (!hiddenKeys.has(child.key)) {
                allHidden = false;
                break;
              }
            }
            if (allHidden) {
              hiddenExpandIconKeys.add(node.key);
            } else {
              hiddenExpandIconKeys.delete(node.key);
            }
          }
        }
        family.pop();
      }
    };
    traverse(nodes);

    if (expandKeySet.size > 0) {
      this.expandNode([...expandKeySet], true);
    }
    this._virtListDOM.scrollToTop();
    this._refresh();
  }

  /**
   * 丢掉过滤留下的隐藏状态。
   *
   * 换数据源时必须清：两个 Set 按 key 记录，而新数据完全可能复用同样的 key
   * （切换会话、翻页、服务端返回同一批 id 的另一份内容）。不清的话新数据里
   * 那些 key 一上来就是隐藏的 —— 节点不见了、或者展开图标没了，而用户并没有
   * 在过滤。`filter()` 自己会全量重算，不需要走这里。
   */
  private _clearFilterState(): void {
    this._hiddenNodeKeySet.clear();
    this._hiddenExpandIconKeySet.clear();
  }

  // ----- Scroll -----

  /**
   * 按目标描述滚动。三种意图（绝对偏移 / 定位到节点 / 滚进视野）合在一个入口里，
   * 逐个参数拼起来往往不如直接方法好读——见 `scrollToOffset` / `scrollToKey` /
   * `scrollKeyIntoView`。
   */
  scrollTo(target: VirtTreeScrollTarget): void {
    const { key, offset, align = 'nearest', ...options } = target;

    // 给了绝对位置就不必再解析 key
    if (offset !== undefined && offset >= 0) {
      this._virtListDOM.scrollToOffset(offset, options);
      return;
    }
    if (key === undefined) return;

    if (align === 'nearest') {
      this.scrollKeyIntoView(key, options);
    } else {
      this.scrollToKey(key, { ...options, align });
    }
  }

  /**
   * 定位到指定节点。节点被折叠时先展开它的祖先。
   *
   * 无论当前是否可见都会滚动；只想「不可见才滚」用 `scrollKeyIntoView`。
   */
  scrollToKey(key: TreeNodeKey, options?: VirtScrollOptions): void {
    const index = this._revealKey(key);
    if (index < 0) return;
    this._virtListDOM.scrollToIndex(index, options);
  }

  /**
   * 把指定节点滚进可视区域，已完整可见则不动。
   * 同样会先展开被折叠节点的祖先。
   */
  scrollKeyIntoView(key: TreeNodeKey, options?: VirtScrollOptions): void {
    const index = this._revealKey(key);
    if (index < 0) return;
    this._virtListDOM.scrollIntoView(index, options);
  }

  /** 滚动到指定偏移量 */
  scrollToOffset(offset: number, options?: VirtScrollOptions): void {
    this._virtListDOM.scrollToOffset(offset, options);
  }

  scrollToTop(options?: VirtScrollOptions): void {
    this._virtListDOM.scrollToTop(options);
  }

  scrollToBottom(options?: VirtScrollOptions): void {
    this._virtListDOM.scrollToBottom(options);
  }

  /** 滚动容器（主轴视口），与 `VirtList.clientEl` 一致 */
  get clientEl(): HTMLElement {
    return this._virtListDOM.clientEl;
  }

  /**
   * 交叉轴（横向）的滚动容器，与 `VirtList.scrollContentEl` 一致。
   * 读写它的 `scrollLeft` 就是读写横向滚动位置
   */
  get scrollContentEl(): HTMLElement {
    return this._virtListDOM.scrollContentEl;
  }

  /** 底层虚拟列表的计算内核（与 VirtList.core 一致，供进阶用法与测试使用） */
  get core() {
    return this._virtListDOM.core;
  }

  /**
   * 上报一次用户发起的滚动。
   *
   * 与 `scrollToOffset` 的区别是语义：这是「用户动了」，会触发 toTop / toBottom
   * 与自动续拉；`scrollToOffset` 是「程序要求去某处」，不触发。
   * 接自定义输入源（自建手势、外部滚动条）时用它。
   */
  scrollFromUser(offset: number): void {
    this._virtListDOM.core.scrollFromUser(offset);
  }

  /**
   * 当前滚动偏移量。
   *
   * 容器的 `scrollTop` 恒为 0（内容靠 transform 移动），
   * 读滚动位置必须走这里。
   */
  getOffset(): number {
    return this._virtListDOM.core.getOffset();
  }

  /** 当前允许的最大偏移量，即 `getTotalSize() - clientSize`（不为负） */
  getMaxOffset(): number {
    return this._virtListDOM.getMaxOffset();
  }

  /** 内容总尺寸（所有可见节点 + 各插槽），对应原生语境的 `scrollHeight` */
  getTotalSize(): number {
    return this._virtListDOM.getTotalSize();
  }

  /** 取消进行中的平滑滚动动画 */
  cancelScroll(): void {
    this._virtListDOM.cancelScroll();
  }

  /**
   * 把内容重新摆到当前偏移量上（keep-alive / `display:none` 切回来时用）。
   * 详见 `VirtList.resume`。
   */
  resume(): void {
    this._virtListDOM.resume();
  }

  // ----- Data -----

  /** 替换整棵树的数据，重建所有内部状态 */
  setList(list: TreeData): void {
    this._options.list = list;
    this._clearFilterState();
    this._setTreeData(list);
    this._initExpandedKeys();
    this._initCheckedKeys();
    this._nodeElMap.clear();
    this._virtListDOM.clearItemPool();
    // 池子刚清空，随后的 setList 本身就会把每个可见节点建一遍，
    // 不必再让 _refresh 走一次 forceUpdate（那等于同一批节点连建两遍）
    this._refresh(false);
  }

  forceUpdate(): void {
    this._setTreeData(this._options.list);
    this._initExpandedKeys();
    this._initCheckedKeys();
    this._nodeElMap.clear();
    this._virtListDOM.clearItemPool();
    this._refresh(false);
  }

  /** 增量更新选项（受控模式下由外部框架 wrapper 调用） */
  updateOptions(partial: Partial<VirtTreeDOMOptions>): void {
    if (partial.expandedKeys !== undefined) {
      this._expandedKeysSet = new Set(partial.expandedKeys);
    }
    if (partial.selectedKeys !== undefined) {
      this._selectedKeysSet = new Set(partial.selectedKeys);
    }
    if (partial.checkedKeys !== undefined) {
      this._checkedKeysSet = new Set(partial.checkedKeys);
      this._updateCheckedKeys();
    }
    if (partial.focusedKeys !== undefined) {
      this._focusedKeysSet = new Set(partial.focusedKeys);
    }
    Object.assign(this._options, partial);
    if (partial.list) {
      this.setList(partial.list);
    } else {
      this._refresh();
    }
  }

  destroy(): void {
    this._cleanupDrag();
    this._virtListDOM.destroy();
    this._nodeElMap.clear();
  }

  // ==================== Private: Ordering ====================

  /**
   * 将 key 集合按照树的 DFS 遍历顺序排序（即数据源中的出现顺序）。
   * 排序基准 _keyOrderMap 由 _setTreeData 预建，这里只做 O(k log k) 的排序。
   * allNodeKeys 在 _setTreeData 时按 DFS 顺序填充，作为排序基准。
   */
  private _sortKeysByDataOrder(keys: Iterable<TreeNodeKey>): TreeNodeKey[] {
    const orderMap = this._keyOrderMap;
    const sorted = [...keys].filter((k) => orderMap.has(k));
    sorted.sort((a, b) => orderMap.get(a)! - orderMap.get(b)!);
    return sorted;
  }

  // ==================== Private: Tree Data ====================

  /**
   * 将树形数据递归扁平化为 TreeNode，建立各种索引：
   * - treeNodesMap: key → TreeNode（O(1) 查找）
   * - levelNodesMap: level → TreeNode[]（复选框冒泡需要）
   * - parentNodeKeys: 所有非叶子节点 key
   * - allNodeKeys / keyOrderMap: DFS 顺序及其反查表
   *
   * 这些索引全部在此重建，因此调用方无需（也不应）自行清理。
   */
  private _setTreeData(list: TreeData): void {
    const fieldNames = this._fieldNames;
    const levelNodesMap = new Map<TreeNodeKey, TreeNode[]>();
    let maxLevel = 1;

    this._parentNodeKeys.length = 0;
    this._treeInfo.treeNodesMap.clear();
    this._treeInfo.allNodeKeys.length = 0;
    this._keyOrderMap.clear();

    const flat = (
      nodes: TreeData,
      level: number = 1,
      parent?: TreeNode,
    ): TreeNode[] => {
      const currNodes: TreeNode[] = [];
      let index = 0;
      for (const rawNode of nodes) {
        index++;
        const key = rawNode[fieldNames.key];
        const title = rawNode[fieldNames.title];
        const children = rawNode[fieldNames.children];
        const disableSelect = rawNode[fieldNames.disableSelect];
        const disableCheckbox = rawNode[fieldNames.disableCheckbox];

        const node: TreeNode = {
          data: rawNode,
          key,
          parent,
          level,
          title,
          disableSelect,
          disableCheckbox,
          isLeaf: !children || children.length === 0,
          isLast: index === nodes.length,
        };
        if (children && children.length) {
          node.children = flat(children, level + 1, node);
          this._parentNodeKeys.push(node.key);
        }
        currNodes.push(node);
        this._treeInfo.treeNodesMap.set(String(key), node);
        this._keyOrderMap.set(key, this._treeInfo.allNodeKeys.push(key) - 1);
        if (level > maxLevel) maxLevel = level;

        const levelInfo = levelNodesMap.get(level);
        if (levelInfo) {
          levelInfo.push(node);
        } else {
          levelNodesMap.set(level, [node]);
        }
      }
      return currNodes;
    };

    this._treeInfo.treeNodes = flat(list);
    this._treeInfo.levelNodesMap = levelNodesMap;
    this._treeInfo.maxLevel = maxLevel;
  }

  /** 根据 options 初始化展开状态（defaultExpandAll 或 expandedKeys） */
  private _initExpandedKeys(): void {
    if (this._options.defaultExpandAll) {
      this._expandedKeysSet = new Set(this._parentNodeKeys);
    } else if (this._options.expandedKeys !== undefined) {
      this._expandedKeysSet.clear();
      for (const key of this._options.expandedKeys) {
        const node = this.getTreeNode(key);
        if (node) this._expandParents(node);
      }
    }
  }

  private _initCheckedKeys(): void {
    this._checkedKeysSet.clear();
    this._indeterminateKeysSet.clear();
    if (!this._options.checkable || !this._options.checkedKeys) return;

    let mutated = false;
    for (const key of this._options.checkedKeys) {
      const node = this.getTreeNode(key);
      if (node && !this.hasChecked(node)) {
        // 同 checkNode：受控树初始化时 checkedKeys 往往成百上千个
        mutated = this._toggleCheckboxInternal(node, true, true) || mutated;
      }
    }
    this._bubbleAfterBatch(mutated);
  }

  // ==================== Private: Expand ====================

  /** 递归展开节点及其所有祖先（确保节点可见） */
  private _expandParents(node: TreeNode): void {
    if (!node.isLeaf) this._expandedKeysSet.add(node.key);
    if (node.parent) this._expandParents(node.parent);
  }

  private _foldParents(node: TreeNode): void {
    this._expandedKeysSet.delete(node.key);
    if (node.parent) this._foldParents(node.parent);
  }

  // ==================== Private: Check ====================

  /**
   * 内部勾选/取消勾选逻辑，级联处理子节点（checkedStrictly 模式下不级联）。
   *
   * @param deferBubble 批量勾选时置 true，跳过 _updateCheckedKeys 的父级冒泡。
   *   冒泡是一趟全树遍历（O(n)），逐个节点各冒泡一次会让批量操作退化成
   *   O(k·n)——2 万节点勾选 1000 个 key 需要 386ms。调用方须在循环结束后
   *   补调一次 _updateCheckedKeys()。
   * @returns 是否真的发生了变更（disableCheckbox 的节点会被跳过）
   */
  private _toggleCheckboxInternal(
    node: TreeNode,
    isChecked: boolean,
    deferBubble = false,
  ): boolean {
    if (node.disableCheckbox) return false;
    const strictly = this._options.checkedStrictly;
    const toggle = (n: TreeNode, checked: boolean) => {
      this._checkedKeysSet[checked ? 'add' : 'delete'](n.key);
      if (n.children && !strictly) {
        for (const child of n.children) {
          if (!child.disableCheckbox) toggle(child, checked);
        }
      }
    };
    toggle(node, isChecked);
    if (!deferBubble && !strictly) {
      this._updateCheckedKeys();
    }
    return true;
  }

  /** 批量勾选后统一冒泡一次（无变更时连这一趟都省掉） */
  private _bubbleAfterBatch(mutated: boolean): void {
    if (mutated && !this._options.checkedStrictly) {
      this._updateCheckedKeys();
    }
  }

  /**
   * 自下而上冒泡更新父节点的勾选/半选状态。
   * 从最深层级开始，逐层检查每个父节点的所有子节点是否全选/部分选。
   */
  private _updateCheckedKeys(): void {
    if (!this._options.checkable) return;
    const { maxLevel, levelNodesMap } = this._treeInfo;
    const checkedKeySet = this._checkedKeysSet;
    const indeterminateKeySet = new Set<TreeNodeKey>();

    for (let level = maxLevel - 1; level >= 1; level--) {
      const nodes = levelNodesMap.get(level);
      if (!nodes) continue;
      for (const node of nodes) {
        const children = node.children;
        if (!children) continue;
        let allChecked = true;
        let hasChecked = false;
        for (const child of children) {
          if (child.disableCheckbox) continue;
          if (checkedKeySet.has(child.key)) {
            hasChecked = true;
          } else if (indeterminateKeySet.has(child.key)) {
            allChecked = false;
            hasChecked = true;
            break;
          } else {
            allChecked = false;
          }
        }
        if (allChecked && !node.disableCheckbox) {
          checkedKeySet.add(node.key);
        } else if (hasChecked && !node.disableCheckbox) {
          indeterminateKeySet.add(node.key);
          checkedKeySet.delete(node.key);
        } else {
          checkedKeySet.delete(node.key);
          indeterminateKeySet.delete(node.key);
        }
      }
    }
    this._indeterminateKeysSet = indeterminateKeySet;
  }

  private _afterNodeCheck(node: TreeNode, checked: boolean): void {
    const checkedKeys = this._sortKeysByDataOrder(this._checkedKeysSet);
    const checkedNodes: TreeNodeData[] = [];
    for (const k of checkedKeys) {
      const n = this.getTreeNode(k);
      if (n) checkedNodes.push(n.data);
    }
    const halfCheckedKeys = this._sortKeysByDataOrder(this._indeterminateKeysSet);
    const halfCheckedNodes: TreeNodeData[] = [];
    for (const k of halfCheckedKeys) {
      const n = this.getTreeNode(k);
      if (n) halfCheckedNodes.push(n.data);
    }
    this._events.check?.(checkedKeys, {
      node,
      checked,
      checkedKeys,
      checkedNodes,
      halfCheckedKeys,
      halfCheckedNodes,
    });
  }

  // ==================== Private: Select ====================

  private _afterNodeSelect(node: TreeNode, selected: boolean): void {
    const selectedKeys = this._sortKeysByDataOrder(this._selectedKeysSet);
    const selectedNodes: TreeNodeData[] = [];
    for (const k of selectedKeys) {
      const n = this.getTreeNode(k);
      if (n) selectedNodes.push(n.data);
    }
    this._events.select?.(selectedKeys, {
      node,
      selected,
      selectedKeys,
      selectedNodes,
    });
  }

  // ==================== Private: Render List ====================

  /**
   * DFS 遍历树，根据展开状态和隐藏状态计算当前可见的扁平节点列表。
   * 使用栈模拟递归以提高性能，逆序入栈保证正序输出。
   */
  private _computeRenderList(): void {
    const hiddenNodeKeys = this._hiddenNodeKeySet;
    const nodes = this._treeInfo.treeNodes || [];
    const flattenNodes: TreeNode[] = [];
    const stack: TreeNode[] = [];

    for (let i = nodes.length - 1; i >= 0; --i) {
      stack.push(nodes[i]!);
    }
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (!hiddenNodeKeys.has(node.key)) {
        flattenNodes.push(node);
      }
      if (this.hasExpanded(node) && node.children) {
        for (let i = node.children.length - 1; i >= 0; --i) {
          stack.push(node.children[i]!);
        }
      }
    }
    this._renderList = flattenNodes;
  }

  /**
   * 重新计算可见列表并刷新虚拟列表渲染。
   *
   * `rebuildAll` 决定要不要额外走一趟 `forceUpdate`（清空渲染池、把可见节点全部重建）。
   * 展开 / 折叠 / 筛选那类调用**需要**它：可见列表里留下来的 key 没变，而节点内部的
   * 展开图标、层级缩进都得按新状态重出——树没有给 VirtList 传 `updateItem`，
   * 复用的项不会重新走 `renderItem`，只能靠重建。
   *
   * 反过来，调用方自己刚 `clearItemPool()` 过的话要传 `false`：池子已经是空的，
   * 下面这句 `setList` 就会把每个可见节点建一遍，再 `forceUpdate` 等于连建两遍。
   */
  private _refresh(rebuildAll = true): void {
    this._computeRenderList();
    this._virtListDOM.setList(this._renderList);
    if (rebuildAll) this._virtListDOM.forceUpdate();
    this._updateRenderedNodeStates();
  }

  // ==================== Private: Scroll ====================

  /**
   * 让某个节点在可见列表里露出来，返回它的下标（-1 表示树里没这个 key）。
   *
   * 折叠的节点不在可见列表中，得先展开祖先、重算列表，之后下标才有意义。
   */
  private _revealKey(key: TreeNodeKey): number {
    let index = this._renderList.findIndex((l) => l.key === key);
    if (index < 0) {
      this.expandNode(key, true);
      this._computeRenderList();
      this._virtListDOM.setList(this._renderList);
      index = this._renderList.findIndex((l) => l.key === key);
    }
    return index;
  }

  // ==================== Private: DOM Rendering ====================

  private _isForceHiddenExpandIcon(node: TreeNode): boolean {
    return this._hiddenExpandIconKeySet.has(node.key);
  }

  private _createVirtList(): void {
    const opts = this._options;
    const defaultSize = opts.estimatedSize ?? 32;
    const customGroup = opts.customGroup ?? 'virt-tree-group';
    const listClass = `${customGroup} ${opts.listClass ?? ''}`;

    this._virtListDOM = new VirtList<TreeNode>(
      this._containerEl,
      {
        list: this._renderList,
        itemKey: 'key',
        estimatedSize: defaultSize,
        fixedSize: opts.fixedSize,
        itemGap: opts.itemGap,
        buffer: opts.buffer ?? 2,
        scrollDuration: opts.scrollDuration,
        smoothMaxDistance: opts.smoothMaxDistance,
        scrollbarAutoHideDelay: opts.scrollbarAutoHideDelay,
        scrollbarMinThumbSize: opts.scrollbarMinThumbSize,
        keyboard: opts.keyboard,
        crossScroll: opts.crossScroll,
        listStyle: 'position:relative;',
        listClass,
        itemClass: (_item: TreeNode) => {
          const classes = ['virt-tree-item'];
          if (opts.itemClass) classes.push(opts.itemClass);
          return classes.join(' ');
        },
        renderItem: (node: TreeNode, _index: number, el: HTMLElement) =>
          this._renderTreeNode(node, el),
        renderStickyHeader: opts.renderStickyHeader,
        renderStickyFooter: opts.renderStickyFooter,
        renderHeader: opts.renderHeader,
        renderFooter: opts.renderFooter,
        renderEmpty: opts.renderEmpty,
        onItemUnmounted: (el: HTMLElement) => {
          const key = el.dataset.id;
          if (key !== undefined) {
            this._nodeElMap.delete(key);
          }
          // 这个钩子被 Tree 自己占了（清 _nodeElMap），所以外部的要在这里转发出去，
          // 否则框架适配层拿不到"节点滚出去了"的时机、回收不了插槽挂载点
          opts.onItemUnmounted?.(el);
        },
      },
      {
        scroll: (e) => this._events.scroll?.(e),
        offsetChange: (offset) => this._events.offsetChange?.(offset),
        toTop: (item) => this._events.toTop?.(item),
        toBottom: (item) => this._events.toBottom?.(item),
        itemResize: (id, size) => this._events.itemResize?.(id, size),
        update: (renderList, state) => this._events.update?.(renderList, state),
      },
    );

    if (this._dragging) {
      this._virtListDOM.clientEl.classList.add('is-dragging');
    }
  }

  /**
   * 渲染单个树节点的 DOM 结构：
   *   .virt-tree-node
   *   ├─ .virt-tree-node-indent (缩进块 × level，含连接线)
   *   ├─ .virt-tree-icon-wrapper > .virt-tree-icon (展开/折叠图标)
   *   ├─ .virt-tree-checkbox-wrapper (可选，复选框)
   *   └─ .virt-tree-node-content (标题/自定义内容)
   */
  private _renderTreeNode(node: TreeNode, itemEl: HTMLElement): HTMLElement | void {
    const opts = this._options;
    const defaultSize = opts.estimatedSize ?? 32;
    const indent = opts.indent ?? 16;
    const iconSize = opts.iconSize ?? 16;
    const fixedSize = opts.fixedSize ?? false;
    const showLine = opts.showLine ?? false;
    const itemGap = opts.itemGap ?? 0;
    const checkable = opts.checkable ?? false;
    const draggable = opts.draggable ?? false;

    const isExpanded = this.hasExpanded(node);
    const isSelected = this.hasSelected(node);
    const isChecked = this.hasChecked(node);
    const isIndeterminate = this.hasIndeterminate(node);
    const isFocused = this.hasFocused(node);
    const hiddenExpandIcon = this._isForceHiddenExpandIcon(node);

    if (opts.renderNode) {
      const child = opts.renderNode(node, isExpanded, itemEl);
      if (child) itemEl.appendChild(child);
      // 整行被自定义接管时没有默认的 content 区，click 只能挂在行容器上
      itemEl.addEventListener('click', (e) => {
        if (this._dragging) return;
        const currentNode = this.getTreeNode(node.key);
        if (currentNode) this._events.click?.(currentNode.data, currentNode, e);
      });
      this._nodeElMap.set(String(node.key), itemEl);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'virt-tree-node';
    if (isSelected) wrapper.classList.add('is-selected');
    if (node.disableSelect) wrapper.classList.add('is-disabled');
    if (isFocused) wrapper.classList.add('is-focused');
    wrapper.style.minHeight = `${defaultSize}px`;
    if (fixedSize) wrapper.style.height = `${defaultSize}px`;

    const nodeKey = node.key;

    if (draggable) {
      wrapper.setAttribute('draggable', 'true');
      wrapper.addEventListener('dragstart', (e: MouseEvent) => {
        this._onDragstart(e);
      });
    }

    // Indent blocks
    if (node.level > 1) {
      const indentContainer = document.createElement('div');
      indentContainer.className = 'virt-tree-node-indent';
      for (let i = 0; i <= node.level - 2; i++) {
        const block = document.createElement('div');
        block.className = 'virt-tree-node-indent-block';
        if (showLine) {
          block.classList.add('virt-tree-node-indent-block-line-vertical');
          if (i === node.level - 2) {
            block.classList.add(
              'virt-tree-node-indent-block-line-horizontal',
            );
            if (node.isLast && !isExpanded) {
              block.classList.add(
                'virt-tree-node-indent-block-line-vertical--half',
              );
            }
            if (node.isLeaf) {
              block.classList.add(
                'virt-tree-node-indent-block-line-horizontal--double',
              );
            }
          }
        }
        block.style.width = `${indent}px`;
        block.style.height =
          itemGap > 0 ? `calc(100% + ${itemGap}px)` : '100%';
        block.style.transform = `translateY(-${itemGap / 2}px)`;
        indentContainer.appendChild(block);
      }
      wrapper.appendChild(indentContainer);
    }

    // Expand icon
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'virt-tree-icon-wrapper';
    if (isExpanded) iconWrapper.classList.add('is-expanded');
    iconWrapper.style.width = `${indent}px`;

    const iconEl = document.createElement('div');
    iconEl.className = 'virt-tree-icon';
    iconEl.style.display =
      node.isLeaf || hiddenExpandIcon ? 'none' : 'block';
    iconEl.style.width = `${iconSize}px`;
    iconEl.style.height = `${iconSize}px`;
    iconEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentNode = this.getTreeNode(nodeKey);
      if (currentNode) this._onClickExpandIcon(currentNode);
    });

    if (opts.renderIcon) {
      const iconChild = opts.renderIcon(node, isExpanded, iconEl);
      if (iconChild) iconEl.appendChild(iconChild);
    } else {
      iconEl.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.5632 7.72544L10.539 13.2587C10.2728 13.6247 9.72696 13.6247 9.46073 13.2587L5.43658 7.72544C5.11611 7.28479 5.43088 6.66666 5.97573 6.66666L14.024 6.66666C14.5689 6.66666 14.8837 7.28479 14.5632 7.72544Z" fill="var(--virt-tree-color-icon)"/></svg>`;
    }
    iconWrapper.appendChild(iconEl);
    wrapper.appendChild(iconWrapper);

    // Checkbox
    if (checkable) {
      const cbWrapper = document.createElement('div');
      cbWrapper.className = 'virt-tree-checkbox-wrapper';
      const cb = document.createElement('div');
      cb.className = 'virt-tree-checkbox';
      if (isChecked) cb.classList.add('is-checked');
      if (isIndeterminate) cb.classList.add('is-indeterminate');
      if (node.disableCheckbox) cb.classList.add('is-disabled');
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentNode = this.getTreeNode(nodeKey);
        if (currentNode) this._onClickCheckbox(currentNode);
      });
      cbWrapper.appendChild(cb);
      wrapper.appendChild(cbWrapper);
    }

    // Content
    const content = document.createElement('div');
    content.className = 'virt-tree-node-content';
    if (fixedSize) content.classList.add('is-fixed-height');
    content.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentNode = this.getTreeNode(nodeKey);
      if (currentNode) this._onClickNodeContent(currentNode, e);
    });

    if (opts.renderContent) {
      const contentChild = opts.renderContent(node, content);
      if (contentChild) content.appendChild(contentChild);
    } else {
      content.textContent = node.title ?? '';
    }
    wrapper.appendChild(content);

    this._nodeElMap.set(String(node.key), wrapper);
    return wrapper;
  }

  /** 就地更新所有已渲染节点的状态 class（选中/聚焦/勾选/展开），避免全量重建 DOM */
  private _updateRenderedNodeStates(): void {
    for (const [key, el] of this._nodeElMap) {
      const node = this.getTreeNode(key);
      if (!node) continue;

      el.classList.toggle('is-selected', this.hasSelected(node));
      el.classList.toggle('is-focused', this.hasFocused(node));

      if (this._options.checkable) {
        const cb = el.querySelector('.virt-tree-checkbox');
        if (cb) {
          cb.classList.toggle('is-checked', this.hasChecked(node));
          cb.classList.toggle(
            'is-indeterminate',
            this.hasIndeterminate(node),
          );
        }
      }

      const iconWrapper = el.querySelector('.virt-tree-icon-wrapper');
      if (iconWrapper) {
        iconWrapper.classList.toggle(
          'is-expanded',
          this.hasExpanded(node),
        );
      }
    }
  }

  // ==================== Private: Event Handlers ====================

  private _onClickExpandIcon(node: TreeNode): void {
    if (this._dragging) return;
    this.toggleExpand(node);
  }

  private _onClickCheckbox(node: TreeNode): void {
    if (this._dragging) return;
    this.toggleCheckbox(node);
  }

  /**
   * 点击节点内容区。
   *
   * 先把点击本身通知出去（业务侧常需要"点了哪个节点"而不关心选中/展开语义），
   * 再按配置执行默认行为——三个开关互斥，命中一个就不再往下走。
   */
  private _onClickNodeContent(node: TreeNode, e: MouseEvent): void {
    if (this._dragging) return;
    this._events.click?.(node.data, node, e);
    if (this._options.selectable && !node.disableSelect) {
      this.toggleSelect(node);
    } else if (
      this._options.checkable &&
      !node.disableCheckbox &&
      this._options.checkOnClickNode
    ) {
      this.toggleCheckbox(node);
    } else if (this._options.expandOnClickNode) {
      this.toggleExpand(node);
    }
  }

  // ==================== Private: Drag ====================

  private _cleanupDrag(): void {
    if (this._dragState) {
      document.removeEventListener('mousemove', this._dragState.onMousemove);
      document.removeEventListener('mouseup', this._dragState.onMouseup);
      document.removeEventListener('keydown', this._dragState.onKeydown);
      this._dragState.offsetUnsubscribe?.();
      this._dragState.offsetUnsubscribe = null;
      this._stopAutoScroll(this._dragState);
      if (this._dragState.hoverExpandTimer) {
        clearTimeout(this._dragState.hoverExpandTimer);
      }
      this._dragState = null;
    }
  }

  private _onDragstart(event: MouseEvent): void {
    if (!this._options.draggable) return;
    event.preventDefault();
    event.stopPropagation();

    const sourceTreeItem = event
      .composedPath()
      .find((v) =>
        (v as HTMLElement).classList?.contains('virt-tree-item'),
      ) as HTMLElement | undefined;

    if (!sourceTreeItem) return;

    // 自动滚动的对象就是列表本身。
    //
    // 刻意不走「向上找可滚动祖先」那套通用查找：它靠 scrollHeight > offsetHeight
    // 判断，而这里已经没有撑开滚动空间的占位元素，clientEl 匹配不上，
    // 于是会一路向上找到页面——拖到边缘时滚的就是整个文档而不是这棵树。
    const clientElement = this._virtListDOM.clientEl;
    const clientElementRect = clientElement.getBoundingClientRect();

    const opts = this._options;
    const indent = opts.indent ?? 16;
    const crossLevel = opts.crossLevelDraggable !== false;

    const dragBox = document.createElement('div');
    dragBox.classList.add('virt-tree-drag-box');

    const dragLine = document.createElement('div');
    dragLine.classList.add(
      crossLevel ? 'virt-tree-drag-line' : 'virt-tree-drag-line-same-level',
    );
    dragLine.style.paddingLeft = `${indent}px`;

    const levelArrow = document.createElement('div');
    levelArrow.classList.add('virt-tree-drag-line-arrow');

    const allowDragArea = document.createElement('div');
    allowDragArea.classList.add('virt-tree-all-drag-area');

    const state: DragState = {
      startX: 0,
      startY: 0,
      mouseX: 0,
      mouseY: 0,
      dragEffect: false,
      minLevel: 1,
      maxLevel: 1,
      targetLevel: 1,
      dragAreaBottom: false,
      placement: '',
      lastPlacement: '',
      sourceTreeItem,
      cloneTreeItem: null,
      hasStyleTreeItem: null,
      hoverTreeItem: null,
      lastHoverTreeItem: null,
      prevTreeItem: null,
      nextTreeItem: null,
      offsetUnsubscribe: null,
      dragAreaParentElement: null,
      clientElementRect,
      sourceNode: undefined,
      sourceWasExpanded: false,
      prevElementNode: undefined,
      parentNode: undefined,
      prevNode: undefined,
      nextNode: undefined,
      hoverExpandTimer: null,
      autoScrollRafId: null,
      autoScrollSpeed: 0,
      dragBox,
      dragLine,
      levelArrow,
      allowDragArea,
      onMousemove: () => {},
      onMouseup: () => {},
      onKeydown: () => {},
      onOffsetChange: () => {},
    };

    state.onOffsetChange = () => {
      if (this._dragging) {
        this._dragProcess(state);
      }
    };

    state.onMousemove = (e: MouseEvent) => {
      if (!state.cloneTreeItem) {
        this._dragStartClone(state);
      }
      if (!state.cloneTreeItem) return;

      this._dragging = true;
      this._virtListDOM.clientEl.classList.add('is-dragging');

      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
      const dx = state.mouseX - state.startX;
      const dy = state.mouseY - state.startY;
      state.cloneTreeItem.style.left = `${10 + dx}px`;
      state.cloneTreeItem.style.top = `${10 + dy}px`;

      this._autoScroll(state);
      this._dragProcess(state);
    };

    state.onMouseup = () => {
      if (this._dragging) {
        setTimeout(() => {
          this._dragging = false;
          this._virtListDOM.clientEl.classList.remove('is-dragging');
        }, 0);

        if (!crossLevel && state.allowDragArea) {
          state.allowDragArea.innerHTML = '';
          state.allowDragArea.remove();
          state.dragAreaParentElement = null;
        }

        if (!state.sourceNode) {
          this._cleanupDragDOM(state);
          return;
        }

        // 在派发 dragend **之前**还原：使用方在回调里读展开态、或据此算新的
        // expandedKeys，看到的应该是"拖拽从未折叠过它"的状态。
        // Esc 取消也走这里（onKeydown 只是把 dragEffect 置假后转调本函数）
        this._restoreSourceExpanded(state);

        if (state.dragAreaBottom && !crossLevel) {
          state.parentNode = state.sourceNode.parent;
          const hoverTreeId = state.hoverTreeItem?.dataset?.id;
          if (hoverTreeId) {
            const hoverTreeNode = this.getTreeNode(hoverTreeId);
            if (hoverTreeNode) {
              state.prevNode = this._findTargetLevelParent(
                hoverTreeNode,
                state.sourceNode.level,
              ) as TreeNode | undefined;
            }
          }
        } else if (state.placement !== 'center') {
          state.parentNode = undefined;
          if (state.prevElementNode) {
            if (state.prevElementNode.level >= state.targetLevel) {
              let diffLevel =
                state.prevElementNode.level - state.targetLevel;
              state.prevNode = state.prevElementNode;
              state.parentNode = state.prevElementNode.parent;
              while (diffLevel > 0) {
                state.prevNode = state.prevNode?.parent;
                state.parentNode = state.parentNode?.parent;
                diffLevel--;
              }
            } else {
              if (
                state.targetLevel - state.prevElementNode.level ===
                1
              ) {
                state.parentNode = state.prevElementNode;
              } else {
                state.parentNode = state.prevElementNode.parent;
                state.prevNode = state.prevElementNode;
              }
            }
          } else if (!crossLevel) {
            state.prevNode = undefined;
          }
        }

        this._events.dragend?.(
          state.dragEffect
            ? {
                node: state.sourceNode as TreeNode,
                prevNode: state.prevNode,
                parentNode: state.parentNode,
              }
            : undefined,
        );
      }
      this._cleanupDragDOM(state);
    };

    state.onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        state.dragEffect = false;
        state.onMouseup();
      }
    };

    // 内容靠 transform 移动，容器不会派发原生 scroll 事件，
    // 「跟着滚动重算落点」只能挂偏移量订阅
    state.offsetUnsubscribe = this._virtListDOM.onOffsetChange(state.onOffsetChange);
    document.addEventListener('mousemove', state.onMousemove);
    document.addEventListener('mouseup', state.onMouseup);
    document.addEventListener('keydown', state.onKeydown);

    this._dragState = state;
  }

  /** 还原拖拽开始时被折叠掉的源节点（见 DragState.sourceWasExpanded） */
  private _restoreSourceExpanded(state: DragState): void {
    if (!state.sourceWasExpanded || !state.sourceNode) return;
    state.sourceWasExpanded = false;
    this.expandNode(state.sourceNode.key, true);
  }

  private _cleanupDragDOM(state: DragState): void {
    // 兜底：正常路径已在派发 dragend 之前还原过（幂等，这里不会重复）。
    // 剩下的是 _dragging 还没置起来就收尾的那些分支 —— 折叠发生在
    // _dragStartClone 里，而 _dragging 要等它返回后才置 true
    this._restoreSourceExpanded(state);
    if (state.hasStyleTreeItem?.contains(state.dragLine)) {
      state.hasStyleTreeItem.removeChild(state.dragLine);
    }
    if (state.hasStyleTreeItem?.contains(state.dragBox)) {
      state.hasStyleTreeItem.removeChild(state.dragBox);
    }
    if (state.cloneTreeItem) {
      if (this._options.dragGhostClass) {
        state.cloneTreeItem.classList.remove(this._options.dragGhostClass);
      }
      document.body.removeChild(state.cloneTreeItem);
      state.cloneTreeItem = null;
    }
    if (state.sourceTreeItem) {
      if (this._options.dragClass) {
        state.sourceTreeItem.classList.remove(this._options.dragClass);
      }
      state.sourceTreeItem.classList.remove('virt-tree-item--drag');
      state.sourceTreeItem = null;
    }
    if (state.hoverExpandTimer) {
      clearTimeout(state.hoverExpandTimer);
      state.hoverExpandTimer = null;
    }
    this._stopAutoScroll(state);
    state.offsetUnsubscribe?.();
    state.offsetUnsubscribe = null;
    document.removeEventListener('mousemove', state.onMousemove);
    document.removeEventListener('mouseup', state.onMouseup);
    document.removeEventListener('keydown', state.onKeydown);
    this._dragState = null;
  }

  private _dragStartClone(state: DragState): void {
    if (!state.sourceTreeItem) return;

    const nodeKey = state.sourceTreeItem.dataset?.id ?? '';
    state.sourceNode = this.getTreeNode(nodeKey);
    if (!state.sourceNode) return;
    if (state.sourceNode.data?.disableDragOut) return;

    this._events.dragstart?.({ sourceNode: state.sourceNode });

    // 拖着一整棵展开的子树没法看落点，先折叠；拖拽结束时由 _restoreSourceExpanded
    // 还原（"折叠"是实现手段，不是用户意图）
    state.sourceWasExpanded = this.hasExpanded(state.sourceNode);
    if (state.sourceWasExpanded) {
      this.expandNode(nodeKey, false);
    }

    if (this._options.crossLevelDraggable === false) {
      this._createDragArea(state, state.sourceNode);
    }

    const rect = state.sourceTreeItem.getBoundingClientRect();
    state.sourceTreeItem.classList.add('virt-tree-item--drag');
    if (this._options.dragClass) {
      state.sourceTreeItem.classList.add(this._options.dragClass);
    }

    state.cloneTreeItem = state.sourceTreeItem.cloneNode(
      true,
    ) as HTMLElement;
    state.cloneTreeItem.classList.add('virt-tree-item--ghost');
    if (this._options.dragGhostClass) {
      state.cloneTreeItem.classList.add(this._options.dragGhostClass);
    }
    state.cloneTreeItem.style.position = 'fixed';
    state.cloneTreeItem.style.width = `${rect.width}px`;
    state.cloneTreeItem.style.height = `${rect.height}px`;
    document.body.append(state.cloneTreeItem);
  }

  private _createDragArea(state: DragState, sourceNode: TreeNode): void {
    const customGroup = this._options.customGroup ?? 'virt-tree-group';
    const dragAreaSize = this._calcDragArea(sourceNode.parent);
    state.dragAreaParentElement = document.querySelector(
      sourceNode.level === 1
        ? `.virt-list__client .${customGroup}`
        : `.${customGroup} [data-id="${sourceNode.parent?.key}"]`,
    ) as HTMLElement;

    if (!state.dragAreaParentElement) return;
    // 先把 listEl 变成定位元素：下面要读的 offsetTop 是相对 offsetParent 的，
    // 顺序颠倒会让首次拖拽把偏移算到更外层的祖先上，虚线区域于是错位。
    this._virtListDOM.listEl.style.position = 'relative';
    const parentElRect = state.dragAreaParentElement.getBoundingClientRect();
    state.allowDragArea.style.width = `${parentElRect.width}px`;
    state.allowDragArea.style.height = `${dragAreaSize}px`;
    state.allowDragArea.style.top = `${
      sourceNode.level === 1
        ? 0
        : parentElRect.height +
          (state.dragAreaParentElement.offsetTop ?? 0)
    }px`;
    this._virtListDOM.listEl.append(state.allowDragArea);
  }

  private _calcDragArea(parentNode?: TreeNode): number {
    const calcSize = (nodes: TreeNode[]): number => {
      let size = 0;
      for (const child of nodes || []) {
        if (child.children?.length && this.hasExpanded(child)) {
          size += this._calcDragArea(child);
        }
        size += this._virtListDOM.core.getItemSize(String(child.key));
      }
      return size;
    };
    if (!parentNode) return calcSize(this._treeInfo.treeNodes || []);
    return calcSize(parentNode.children || []);
  }

  private _findTargetLevelParent(
    childNode: TreeNode,
    targetLevel?: number,
  ): TreeNode | null {
    if (!childNode || !targetLevel) return null;
    let parentNode = childNode.parent;
    while (parentNode) {
      if (parentNode.level === targetLevel) return parentNode;
      parentNode = parentNode.parent;
    }
    return null;
  }

  /**
   * 拖拽到容器上/下边缘时自动滚动。
   *
   * 由 mousemove 高频调用，但只更新目标速度，不重启 rAF 循环——每次重启都会丢掉
   * 一帧的时间基准，而 mousemove 的频率通常与刷新率同阶，重启会让滚动几乎停滞。
   */
  private _autoScroll(state: DragState): void {
    if (!state.clientElementRect) return;

    state.autoScrollSpeed = this._calcAutoScrollSpeed(state);
    if (state.autoScrollSpeed === 0) {
      this._stopAutoScroll(state);
      return;
    }
    if (state.autoScrollRafId !== null) return;

    // 按帧间隔折算位移，滚动速度与屏幕刷新率解耦（原先固定 10ms 步进在高刷屏上偏快）；
    // rAF 在标签页不可见时自动暂停，也就不会像 setInterval 那样堆积回调
    let last: number | null = null;
    let remainder = 0;
    const step = (timestamp: number): void => {
      // 拖拽已收尾（矩形被清掉）时停下，避免多跑一帧
      if (!state.clientElementRect) {
        state.autoScrollRafId = null;
        return;
      }

      const seconds = last === null ? 0 : (timestamp - last) / 1000;
      last = timestamp;

      // 位移取整会吞掉小数，慢速时累积余量才不会完全不动
      remainder += state.autoScrollSpeed * seconds;
      const move = Math.trunc(remainder);
      if (move !== 0) {
        remainder -= move;
        const vl = this._virtListDOM;
        vl.scrollToOffset(vl.core.getOffset() + move);
      }

      state.autoScrollRafId = requestAnimationFrame(step);
    };
    state.autoScrollRafId = requestAnimationFrame(step);
  }

  /** 计算自动滚动速度（px/s）：指针进入容器上/下 1/4 区域时生效，越靠边越快 */
  private _calcAutoScrollSpeed(state: DragState): number {
    const rect = state.clientElementRect;
    if (!rect) return 0;

    // 指针移出列表可视区域时停止
    const { left, right, top, bottom } = rect;
    if (
      state.mouseX < left ||
      state.mouseX > right ||
      state.mouseY < top ||
      state.mouseY > bottom
    ) {
      return 0;
    }

    const equalPart = rect.height / 4;

    if (rect.top < state.mouseY && state.mouseY < rect.top + equalPart) {
      const ratio = 1 - (state.mouseY - rect.top) / equalPart;
      return -ratio * AUTO_SCROLL_MAX_SPEED;
    }
    if (
      rect.top + equalPart * 3 < state.mouseY &&
      state.mouseY < rect.bottom
    ) {
      const ratio = (state.mouseY - (rect.top + equalPart * 3)) / equalPart;
      return ratio * AUTO_SCROLL_MAX_SPEED;
    }
    return 0;
  }

  private _stopAutoScroll(state: DragState): void {
    state.autoScrollSpeed = 0;
    if (state.autoScrollRafId === null) return;
    cancelAnimationFrame(state.autoScrollRafId);
    state.autoScrollRafId = null;
  }

  private _buildDragLine(state: DragState, level: number): void {
    const indent = this._options.indent ?? 16;
    state.dragLine.innerHTML = '';
    for (let i = 0; i < level; i++) {
      const lineBlock = document.createElement('div');
      if (i === level - 1) {
        lineBlock.style.flex = '1';
        lineBlock.style.backgroundColor = 'var(--virt-tree-color-drag-line)';
      } else {
        lineBlock.style.width = `${indent - 4}px`;
      }
      lineBlock.style.height = '100%';
      lineBlock.style.position = 'relative';
      state.dragLine.appendChild(lineBlock);
    }
  }

  private _dragProcess(state: DragState): void {
    if (state.clientElementRect) {
      if (
        state.mouseX < state.clientElementRect.left ||
        state.mouseX > state.clientElementRect.right ||
        state.mouseY < state.clientElementRect.top ||
        state.mouseY > state.clientElementRect.bottom
      ) {
        if (state.hasStyleTreeItem?.contains(state.dragLine)) {
          state.hasStyleTreeItem.removeChild(state.dragLine);
        }
        if (state.hasStyleTreeItem?.contains(state.dragBox)) {
          state.hasStyleTreeItem.removeChild(state.dragBox);
        }
        state.lastHoverTreeItem = null;
        state.dragEffect = false;
      }
    }

    const hoverElement = document.elementFromPoint(state.mouseX, state.mouseY);
    if (!hoverElement) return;
    state.hoverTreeItem = findAncestorWithClass(
      hoverElement,
      'virt-tree-item',
    ) as HTMLElement | null;
    if (!state.hoverTreeItem) return;

    const hoverTreeId = state.hoverTreeItem.dataset?.id;
    const sourceTreeId = state.sourceTreeItem?.dataset?.id;
    if (!hoverTreeId || !sourceTreeId) return;

    const hoverTreeNode = this.getTreeNode(hoverTreeId);
    if (!hoverTreeNode) return;

    if (hoverTreeId === sourceTreeId) {
      state.sourceTreeItem = state.hoverTreeItem;
      state.sourceTreeItem.classList.add('virt-tree-item--drag');
      if (state.hasStyleTreeItem?.contains(state.dragLine))
        state.hasStyleTreeItem.removeChild(state.dragLine);
      if (state.hasStyleTreeItem?.contains(state.dragBox))
        state.hasStyleTreeItem.removeChild(state.dragBox);
      state.dragEffect = false;
      return;
    }

    const hoverTreeItemRect = state.hoverTreeItem.getBoundingClientRect();
    const relativeY = state.mouseY - hoverTreeItemRect.top;
    const positionRatio = relativeY / hoverTreeItemRect.height;

    const crossLevel = this._options.crossLevelDraggable !== false;

    if (!crossLevel) {
      this._sameLevelDragProcess(state, hoverTreeNode, positionRatio);
    } else {
      this._crossLevelDragProcess(
        state,
        hoverTreeItemRect,
        hoverTreeNode,
        hoverTreeId,
        positionRatio,
      );
    }
  }

  /**
   * @param lineHostItem 指示线的挂载行，默认就是悬停行。同级拖拽落到已展开节点
   *   的下半部分时，线要画到它子树的最后一行下边，但落点仍按悬停行推导。
   */
  private _updateDragRelateNode(
    state: DragState,
    hoverTreeItem: HTMLElement,
    lineHostItem: HTMLElement = hoverTreeItem,
  ): void {
    lineHostItem.appendChild(state.dragLine);
    state.hasStyleTreeItem = lineHostItem;

    if (state.placement === 'top') {
      state.dragLine.style.top = '-1px';
      state.dragLine.style.bottom = 'auto';
      state.nextTreeItem = hoverTreeItem;
      state.prevTreeItem = getPrevSibling(hoverTreeItem) as HTMLElement;
    } else {
      state.dragLine.style.top = 'auto';
      state.dragLine.style.bottom = '-1px';
      state.prevTreeItem = hoverTreeItem;
      state.nextTreeItem = getNextSibling(hoverTreeItem) as HTMLElement;
    }

    const prevId = state.prevTreeItem?.dataset?.id;
    const nextId = state.nextTreeItem?.dataset?.id;
    state.prevElementNode = prevId ? this.getTreeNode(prevId) : undefined;
    state.nextNode = nextId ? this.getTreeNode(nextId) : undefined;
  }

  private _sameLevelDragProcess(
    state: DragState,
    hoverTreeNode: TreeNode,
    positionRatio: number,
  ): void {
    if (
      hoverTreeNode.isLast &&
      hoverTreeNode.isLeaf &&
      state.sourceNode
    ) {
      const allDragLevelNode = this._findTargetLevelParent(
        hoverTreeNode,
        state.sourceNode.level,
      );
      if (allDragLevelNode?.isLast) {
        state.placement = 'bottom';
        state.dragEffect = true;
        state.dragAreaBottom = true;
        this._updateDragRelateNode(state, state.hoverTreeItem!);
        state.targetLevel = state.sourceNode.level ?? 1;
        this._buildDragLine(state, state.targetLevel);
        return;
      }
    }
    state.dragAreaBottom = false;

    if (
      !state.sourceNode ||
      hoverTreeNode.level !== state.sourceNode.level ||
      hoverTreeNode.parent?.data.id !== state.sourceNode.parent?.data.id
    ) {
      state.prevTreeItem = null;
      state.nextTreeItem = null;
      return;
    }

    state.placement = positionRatio > 0.33 ? 'bottom' : 'top';

    if (
      state.lastHoverTreeItem !== state.hoverTreeItem ||
      state.placement !== state.lastPlacement
    ) {
      if (
        state.lastHoverTreeItem &&
        !isSiblingElement(state.lastHoverTreeItem, state.hoverTreeItem!)
      ) {
        if (state.hasStyleTreeItem?.contains(state.dragLine)) {
          state.hasStyleTreeItem.removeChild(state.dragLine);
        }
      }
      state.lastPlacement = state.placement;
      state.lastHoverTreeItem = state.hoverTreeItem;
      state.dragEffect = true;
      // 落到已展开节点的下半部分，语义是「插到它整棵子树之后」——落点仍按悬停行
      // 推导（同级同父），只把线移到子树末行，否则线会停在父节点与它第一个子节点
      // 之间，看着像插进了子级。
      this._updateDragRelateNode(
        state,
        state.hoverTreeItem!,
        state.placement === 'bottom' && this.hasExpanded(hoverTreeNode)
          ? this._subtreeTailItem(hoverTreeNode) ?? state.hoverTreeItem!
          : state.hoverTreeItem!,
      );
      state.targetLevel = hoverTreeNode.level ?? 1;
      this._buildDragLine(state, state.targetLevel);
    }
  }

  /**
   * 取节点最后一个可见后代所在的行元素——沿展开链一路走到底。
   * 该行可能被虚拟化裁掉而不在 DOM 里，此时返回 null 由调用方降级。
   */
  private _subtreeTailItem(node: TreeNode): HTMLElement | null {
    let tail = node;
    while (tail.children?.length && this.hasExpanded(tail)) {
      tail = tail.children[tail.children.length - 1]!;
    }
    if (tail === node) return null;
    return this._containerEl.querySelector(
      `.virt-tree-item[data-id="${tail.key}"]`,
    );
  }

  private _crossLevelDragProcess(
    state: DragState,
    hoverTreeItemRect: DOMRect,
    hoverTreeNode: TreeNode,
    hoverTreeId: TreeNodeKey,
    positionRatio: number,
  ): void {
    const indent = this._options.indent ?? 16;
    let topPlacement = 0.33;
    let bottomPlacement = 0.66;

    if (hoverTreeNode.data?.disableDragIn) {
      topPlacement = 0.5;
      bottomPlacement = 0.5;
    }

    if (positionRatio < topPlacement) {
      state.placement = 'top';
    } else if (positionRatio > bottomPlacement) {
      state.placement = 'bottom';
    } else {
      state.placement = 'center';
    }

    if (
      state.lastHoverTreeItem !== state.hoverTreeItem ||
      state.placement !== state.lastPlacement
    ) {
      if (
        state.lastHoverTreeItem &&
        !isSiblingElement(state.lastHoverTreeItem, state.hoverTreeItem!)
      ) {
        if (state.hasStyleTreeItem?.contains(state.dragLine))
          state.hasStyleTreeItem.removeChild(state.dragLine);
        if (state.hasStyleTreeItem?.contains(state.dragBox))
          state.hasStyleTreeItem.removeChild(state.dragBox);
      }

      state.lastPlacement = state.placement;
      state.lastHoverTreeItem = state.hoverTreeItem;

      if (state.hoverTreeItem === state.sourceTreeItem) {
        if (state.hasStyleTreeItem?.contains(state.dragLine))
          state.hasStyleTreeItem.removeChild(state.dragLine);
        if (state.hasStyleTreeItem?.contains(state.dragBox))
          state.hasStyleTreeItem.removeChild(state.dragBox);
        state.dragEffect = false;
        return;
      }

      if (state.hoverExpandTimer) {
        clearTimeout(state.hoverExpandTimer);
        state.hoverExpandTimer = null;
      }

      if (state.placement === 'center') {
        state.dragEffect = false;
        state.parentNode = hoverTreeNode;
        state.prevNode = undefined;
        if (state.hasStyleTreeItem?.contains(state.dragLine))
          state.hasStyleTreeItem.removeChild(state.dragLine);

        if (hoverTreeNode.data?.disableDragIn) return;

        state.hoverTreeItem!.appendChild(state.dragBox);
        state.hasStyleTreeItem = state.hoverTreeItem;
        state.dragEffect = true;

        if (!this.hasExpanded(hoverTreeNode)) {
          state.hoverExpandTimer = setTimeout(() => {
            this.expandNode(hoverTreeId, true);
            state.hoverExpandTimer = null;
          }, 500);
        }
        return;
      }

      state.dragEffect = true;
      if (state.hasStyleTreeItem?.contains(state.dragBox))
        state.hasStyleTreeItem.removeChild(state.dragBox);

      state.hoverTreeItem!.appendChild(state.dragLine);
      state.hasStyleTreeItem = state.hoverTreeItem;

      if (state.placement === 'top') {
        state.dragLine.style.top = '-1px';
        state.dragLine.style.bottom = 'auto';
        state.nextTreeItem = state.hoverTreeItem;
        state.prevTreeItem = getPrevSibling(
          state.hoverTreeItem!,
        ) as HTMLElement;
      } else {
        state.dragLine.style.top = 'auto';
        state.dragLine.style.bottom = '-1px';
        state.prevTreeItem = state.hoverTreeItem;
        state.nextTreeItem = getNextSibling(
          state.hoverTreeItem!,
        ) as HTMLElement;
      }

      const prevId = state.prevTreeItem?.dataset?.id;
      const nextId = state.nextTreeItem?.dataset?.id;
      state.prevElementNode = prevId
        ? this.getTreeNode(prevId)
        : undefined;
      state.nextNode = nextId ? this.getTreeNode(nextId) : undefined;

      state.minLevel = Math.min(
        state.prevElementNode?.level ?? 1,
        state.nextNode?.level ?? 1,
      );
      state.maxLevel = Math.max(
        state.prevElementNode?.level ?? 1,
        state.nextNode?.level ?? 1,
      );

      state.dragLine.innerHTML = '';
      for (let i = 0; i < state.maxLevel; i++) {
        const lineBlock = document.createElement('div');
        if (i === state.maxLevel - 1) {
          lineBlock.style.flex = '1';
        } else {
          lineBlock.style.width = `${indent - 4}px`;
        }
        lineBlock.style.height = '100%';
        lineBlock.style.position = 'relative';
        state.dragLine.appendChild(lineBlock);
      }
    }

    if (state.placement !== 'center') {
      const relativeX =
        state.mouseX - hoverTreeItemRect.left - indent;
      state.targetLevel = Math.ceil(relativeX / indent);
      if (state.targetLevel <= state.minLevel)
        state.targetLevel = state.minLevel;
      if (state.targetLevel >= state.maxLevel)
        state.targetLevel = state.maxLevel;

      const targetElement = state.dragLine.childNodes[
        state.targetLevel - 1
      ] as HTMLElement;
      if (targetElement) {
        targetElement.appendChild(state.levelArrow);
        for (let i = state.minLevel - 1; i <= state.maxLevel - 1; i++) {
          const current = state.dragLine.childNodes[i] as HTMLElement;
          if (i < state.targetLevel - 1) {
            current.style.backgroundColor =
              'var(--virt-tree-color-drag-line-disabled)';
          } else {
            current.style.backgroundColor =
              'var(--virt-tree-color-drag-line)';
          }
        }
      }
    }
  }
}

interface DragState {
  startX: number;
  startY: number;
  mouseX: number;
  mouseY: number;
  dragEffect: boolean;
  minLevel: number;
  maxLevel: number;
  targetLevel: number;
  dragAreaBottom: boolean;
  placement: string;
  lastPlacement: string;
  sourceTreeItem: HTMLElement | null;
  cloneTreeItem: HTMLElement | null;
  hasStyleTreeItem: HTMLElement | null;
  hoverTreeItem: HTMLElement | null;
  lastHoverTreeItem: HTMLElement | null;
  prevTreeItem: HTMLElement | null;
  nextTreeItem: HTMLElement | null;
  /** 偏移量订阅的退订函数 */
  offsetUnsubscribe: (() => void) | null;
  dragAreaParentElement: HTMLElement | null;
  clientElementRect: DOMRect | undefined;
  sourceNode: TreeNode | undefined;
  /**
   * 拖拽开始前源节点是否展开。
   *
   * 拖拽期间会把它折叠起来（拖着一整棵展开的子树没法看落点），而"折叠"是实现
   * 手段、不是用户意图，所以拖拽一结束就得还原 —— 尤其是 Esc 取消那条路。
   */
  sourceWasExpanded: boolean;
  prevElementNode: TreeNode | undefined;
  parentNode: TreeNode | undefined;
  prevNode: TreeNode | undefined;
  nextNode: TreeNode | undefined;
  hoverExpandTimer: ReturnType<typeof setTimeout> | null;
  /** 拖拽自动滚动的 rAF 句柄，null 表示循环未运行 */
  autoScrollRafId: number | null;
  /** 拖拽自动滚动的当前速度（px/s，负数向上），由 mousemove 持续更新 */
  autoScrollSpeed: number;
  dragBox: HTMLElement;
  dragLine: HTMLElement;
  levelArrow: HTMLElement;
  allowDragArea: HTMLElement;
  onMousemove: (e: MouseEvent) => void;
  onMouseup: () => void;
  onKeydown: (e: KeyboardEvent) => void;
  onOffsetChange: () => void;
}
