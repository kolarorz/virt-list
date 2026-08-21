/* eslint-disable @typescript-eslint/no-explicit-any */
import { VirtList } from './VirtList.js';
import { normalizeStyle } from './utils.js';
import type {
  ListState,
  ListUpdateReason,
  StyleValue,
  VirtListEvents,
  VirtScrollEvent,
  VirtScrollOptions,
} from '@virt-list/core';

/**
 * 网格布局配置项。
 */
export interface VirtGridOptions<T extends Record<string, any>> {
  /** 数据源（扁平数组，会被自动分组为行） */
  list: T[];
  /** 每行显示的列数 */
  gridItems: number;
  /** 每项的唯一 key 字段名 */
  itemKey: string;
  /** 每行的预估高度（px） */
  estimatedSize: number;
  /** 行间距（px） */
  itemGap?: number;
  /** 是否固定行高 */
  fixedSize?: boolean;
  /** 渲染缓冲行数 */
  buffer?: number;
  /** smooth 滚动的默认动画时长（ms），默认 300 */
  scrollDuration?: number;
  /** 平滑滚动允许逐帧穿越的最大距离（px），默认两倍视口 */
  smoothMaxDistance?: number;
  /** 滚动条淡出延迟（ms），`0` 常驻 */
  scrollbarAutoHideDelay?: number;
  /** 滑块的最小长度（px） */
  scrollbarMinThumbSize?: number;
  /** 是否接管键盘（方向键 / PageUp-Down / Space / Home-End），默认 true。宿主已在祖先元素上处理这些键时关掉 */
  keyboard?: boolean;
  /** 交叉轴（竖向列表的横向、横向列表的竖向）是否允许原生滚动，默认 true。关掉即两轴全裁切 */
  crossScroll?: boolean;
  /** 行的自定义 style */
  itemStyle?: StyleValue;
  /** 单元格渲染函数（可返回 HTMLElement，或直接渲染到传入 el） */
  renderItem: (
    item: T,
    rowIndex: number,
    listIndex: number,
    el: HTMLElement,
  ) => HTMLElement | void;
  /**
   * 单元格的**原地更新**函数，数据变更（`setList`）时按最新数据回调。
   *
   * 行的 `_id` 是起始扁平索引，不随行内容变化，而虚拟列表对池里已有的 key
   * 不会重新 `renderItem` —— 没有这个回调，同一行里换了内容的单元格会停在
   * 挂载那一刻。滚动与尺寸上报不会触发它。
   *
   * `el` 是该单元格首次挂载时的容器，应当复用而不是重建。
   */
  updateItem?: (
    item: T,
    rowIndex: number,
    listIndex: number,
    el: HTMLElement,
  ) => void;
  renderStickyHeader?: (el: HTMLElement) => HTMLElement | void;
  renderStickyFooter?: (el: HTMLElement) => HTMLElement | void;
  renderHeader?: (el: HTMLElement) => HTMLElement | void;
  renderFooter?: (el: HTMLElement) => HTMLElement | void;
  renderEmpty?: (el: HTMLElement) => HTMLElement | void;
  /**
   * 行滚出渲染窗口、即将被移除前回调。框架适配层用它回收单元格的挂载点
   * （React 的 root、Vue 的组件实例），否则滚过的每一格都会留一份在内存里。
   *
   * **给到的是行元素，不是单元格**：单元格容器是行元素的子节点。调用时机在
   * `remove()` 之前，此刻子树还完整，按 `contains` 就能找出该行下的所有挂载点。
   */
  onItemUnmounted?: (el: HTMLElement) => void;
  stickyHeaderStyle?: StyleValue;
}

export interface VirtGridEvents<T extends Record<string, any> = Record<string, any>> {
  /** 滚动了。容器 overflow:hidden，没有原生 scroll 事件，这是它的替代品 */
  scroll?: (event: VirtScrollEvent) => void;
  /** 滚动偏移量变化。要跟着偏移量重写 DOM 时用它，只想感知滚动用 scroll */
  offsetChange?: (offset: number) => void;
  toTop?: (item: GridRow<T>) => void;
  toBottom?: (item: GridRow<T>) => void;
  itemResize?: (id: string, newSize: number) => void;
  update?: (
    renderList: GridRow<T>[],
    state: ListState,
    reason: ListUpdateReason,
  ) => void;
}

/**
 * 内部行数据结构。
 * _id 为该行在扁平数组中的起始索引，也作为虚拟列表的 itemKey。
 */
export interface GridRow<T> {
  _id: number;
  children: T[];
  [key: string]: any;
}

/**
 * 虚拟网格布局的 DOM 实现。
 *
 * 原理：将扁平的 list 按 gridItems 分组为 GridRow[]（每行包含 gridItems 个子项），
 * 然后交给 VirtList 进行虚拟滚动。每行的 renderItem 内部调用外部 renderItem 渲染各个单元格。
 *
 * 注意：GridRow 的 _id 是扁平数组的起始索引，**不随行内容变化**，而 VirtList 对
 * 已在池中的 key 不会重新 renderItem。两条写入路径因此各有对策：
 * - `setGridItems` 整体 `clearItemPool`：新旧行的 _id 会重叠（gridItems=2 的
 *   row[0,2,4...] 与 gridItems=3 的 row[0,3,6...]），行的成员完全对不上，只能重建；
 * - `setList` 走 `updateItem`（见 `_updateRow`）：行元素与单元格都复用，只把最新
 *   数据交给已有单元格，并补齐/收回尾行变动的那几个。
 */
export class VirtGrid<T extends Record<string, any>> {
  private _options: VirtGridOptions<T>;
  private _virtListDOM: VirtList<GridRow<T>>;
  /** 分组后的行数据 */
  private _gridList: GridRow<T>[] = [];

  constructor(
    container: HTMLElement,
    options: VirtGridOptions<T>,
    events?: VirtGridEvents<T>,
  ) {
    this._options = options;
    this._updateGridList();

    const listEvents: VirtListEvents<GridRow<T>> = {
      scroll: (e) => events?.scroll?.(e),
      offsetChange: (offset) => events?.offsetChange?.(offset),
      toTop: (item) => events?.toTop?.(item),
      toBottom: (item) => events?.toBottom?.(item),
      itemResize: (id, size) => events?.itemResize?.(id, size),
      update: (renderList, state, reason) =>
        events?.update?.(renderList, state, reason),
    };

    this._virtListDOM = new VirtList<GridRow<T>>(
      container,
      {
        list: this._gridList,
        itemKey: '_id',
        estimatedSize: options.estimatedSize,
        itemGap: options.itemGap,
        fixedSize: options.fixedSize,
        buffer: options.buffer,
        scrollDuration: options.scrollDuration,
        smoothMaxDistance: options.smoothMaxDistance,
        scrollbarAutoHideDelay: options.scrollbarAutoHideDelay,
        scrollbarMinThumbSize: options.scrollbarMinThumbSize,
        keyboard: options.keyboard,
        crossScroll: options.crossScroll,
        itemStyle: `display:flex;min-width:min-content;${options.itemStyle ? normalizeStyle(options.itemStyle) : ''}`,
        renderItem: (rowData: GridRow<T>, rowIndex: number, el: HTMLElement) => {
          for (let i = 0; i < rowData.children.length; i++) {
            this._mountCell(rowData, rowIndex, i, el);
          }
        },
        updateItem: (rowData: GridRow<T>, rowIndex: number, el: HTMLElement) =>
          this._updateRow(rowData, rowIndex, el),
        renderStickyHeader: options.renderStickyHeader,
        renderStickyFooter: options.renderStickyFooter,
        renderHeader: options.renderHeader,
        renderFooter: options.renderFooter,
        renderEmpty: options.renderEmpty,
        onItemUnmounted: (el: HTMLElement) => options.onItemUnmounted?.(el),
        stickyHeaderStyle: options.stickyHeaderStyle,
      },
      listEvents,
    );
  }

  /** 建出一个单元格并挂到行元素末尾 */
  private _mountCell(
    rowData: GridRow<T>,
    rowIndex: number,
    cellIndex: number,
    rowEl: HTMLElement,
  ): void {
    const mountEl = document.createElement('div');
    const cellEl = this._options.renderItem(
      rowData.children[cellIndex]!,
      rowIndex,
      rowData._id + cellIndex,
      mountEl,
    );
    rowEl.appendChild(cellEl ?? mountEl);
  }

  /**
   * 数据变更后就地更新一行，复用已有的单元格元素。
   *
   * 两件事：
   * 1. **对齐单元格个数**。行的 `_id` 是起始扁平索引、不随内容变化，而尾行的
   *    成员数会变（gridItems=3 时 4 项的尾行有 1 个单元格，追加到 5 项就是 2 个）。
   *    行元素被复用、`renderItem` 又不会重跑，缺的单元格于是永远不出现 —— 这里补建。
   * 2. **把最新数据交给已有的单元格**（`updateItem`），不重建 DOM。
   *
   * 单元格容器纯按位置复用（第 i 个子节点装第 i 个成员），框架层的 mountKey
   * 因此也必须按位置取 —— 见各框架包 VirtGrid 里 `mountCell` 的注释。
   */
  private _updateRow(
    rowData: GridRow<T>,
    rowIndex: number,
    rowEl: HTMLElement,
  ): void {
    // 没有 updateItem 时这一行的正确性由 setList 里的作废重建负责，
    // 在这里补建单元格只是白做一遍（整行随后会被重建）
    if (!this._options.updateItem) return;

    const cells = rowData.children;

    // 收回多出来的单元格（列表变短时的尾行）。框架层挂在这些元素上的内容
    // 由各自的挂载器按 isConnected 兜底回收
    while (rowEl.children.length > cells.length) {
      rowEl.lastElementChild!.remove();
    }

    for (let i = 0; i < cells.length; i++) {
      const existing = rowEl.children[i];
      if (existing instanceof HTMLElement) {
        this._options.updateItem?.(cells[i]!, rowIndex, rowData._id + i, existing);
      } else {
        this._mountCell(rowData, rowIndex, i, rowEl);
      }
    }
  }

  /** 将扁平 list 按 gridItems 分组为 GridRow[] */
  private _updateGridList(): void {
    const { list, gridItems } = this._options;
    if (gridItems <= 0) return;

    const result: GridRow<T>[] = [];
    for (let i = 0; i < list.length; i += gridItems) {
      const children: T[] = [];
      for (let j = 0; j < gridItems; j++) {
        if (i + j >= list.length) break;
        children.push(list[i + j]!);
      }
      result.push({ _id: i, children });
    }
    this._gridList = result;
  }

  /**
   * 更新数据源。
   *
   * 行的 key 是 `_id`（行首扁平索引），删掉中间一项后每行的 `_id` 没变、装的人变了，
   * 而虚拟列表对池里已有的 key 不会重新 `renderItem` —— 不处理的话界面上就是
   * 「删除点了没反应」。两条路径按能力择一：
   *
   * - **给了 `updateItem`**（四个框架包的插槽路径都会注入）：交给 `_updateRow`
   *   原地更新，行元素与单元格容器全部复用。这条路更好 —— 重建会让框架挂在
   *   单元格上的内容连根拔起，组件内部 state、输入焦点、进行中的动画全丢。
   *   成员比对也一并省了。
   * - **没给**（纯 DOM 用法）：只能作废成员变了的那几行，让它们按新数据重建。
   *   不作废就不会有任何一环去改这些行的 DOM。
   */
  setList(list: T[]): void {
    const prevRows = this._gridList;
    this._options.list = list;
    this._updateGridList();

    const staleRowIds: number[] = [];
    if (!this._options.updateItem) {
      const prevById = new Map<number, GridRow<T>>();
      for (const row of prevRows) prevById.set(row._id, row);
      for (const row of this._gridList) {
        if (!this._sameMembers(prevById.get(row._id), row)) staleRowIds.push(row._id);
      }
    }

    this._virtListDOM.setList(this._gridList);
    // setList 之后再作废：refreshItems 会立刻按新数据重渲染这几行，
    // 反过来做的话重渲染读到的还是旧 list
    if (staleRowIds.length > 0) this._virtListDOM.refreshItems(staleRowIds);
  }

  /**
   * 两行装的是不是同一批项（按 itemKey 比，先走对象同一性快路径）。
   * 只在没有 `updateItem`、必须靠作废重建的那条路径上用得到。
   */
  private _sameMembers(prev: GridRow<T> | undefined, next: GridRow<T>): boolean {
    if (!prev || prev.children.length !== next.children.length) return false;
    const { itemKey } = this._options;
    for (let i = 0; i < prev.children.length; i++) {
      const a = prev.children[i]!;
      const b = next.children[i]!;
      if (a === b) continue;
      if (String(a[itemKey]) !== String(b[itemKey])) return false;
    }
    return true;
  }

  /**
   * 修改每行列数。
   * 必须先 clearItemPool，因为新旧 _id 可能重叠导致 DOM 缓存内容过时。
   * 修改后通过 scrollToIndex 尽量保持视口位置。
   */
  setGridItems(gridItems: number): void {
    if (gridItems <= 0) return;
    const oldGridItems = this._options.gridItems;
    this._options.gridItems = gridItems;

    const inViewBegin = this._virtListDOM.state.inViewBegin;
    this._updateGridList();
    this._virtListDOM.clearItemPool();
    this._virtListDOM.setList(this._gridList);

    // 根据旧列数换算出对应的新行索引，尽量保持视口位置
    const targetRowIndex = Math.floor(
      (inViewBegin * oldGridItems) / gridItems,
    );
    requestAnimationFrame(() => {
      this._virtListDOM.scrollToIndex(targetRowIndex);
    });
  }

  /** 按扁平索引滚动（自动换算为行索引） */
  scrollToIndex(index: number, options?: VirtScrollOptions): void {
    const targetRowIndex = Math.floor(index / this._options.gridItems);
    this._virtListDOM.scrollToIndex(targetRowIndex, options);
  }

  scrollIntoView(index: number, options?: VirtScrollOptions): void {
    const targetRowIndex = Math.floor(index / this._options.gridItems);
    this._virtListDOM.scrollIntoView(targetRowIndex, options);
  }

  scrollToTop(options?: VirtScrollOptions): void {
    this._virtListDOM.scrollToTop(options);
  }

  scrollToBottom(options?: VirtScrollOptions): void {
    this._virtListDOM.scrollToBottom(options);
  }

  scrollToOffset(offset: number, options?: VirtScrollOptions): void {
    this._virtListDOM.scrollToOffset(offset, options);
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

  /** 内容总尺寸（所有行 + 各插槽），对应原生语境的 `scrollHeight` */
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

  /** 强制刷新（重建行数据并更新列表） */
  forceUpdate(): void {
    this._updateGridList();
    this._virtListDOM.setList(this._gridList);
    this._virtListDOM.forceUpdate();
  }

  destroy(): void {
    this._virtListDOM.destroy();
  }
}
