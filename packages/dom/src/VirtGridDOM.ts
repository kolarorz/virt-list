/* eslint-disable @typescript-eslint/no-explicit-any */
import { VirtListDOM } from './VirtListDOM';
import type { VirtListEvents } from '@virt-list/core';

/**
 * 网格布局配置项。
 */
export interface VirtGridDOMOptions<T extends Record<string, any>> {
  /** 数据源（扁平数组，会被自动分组为行） */
  list: T[];
  /** 每行显示的列数 */
  gridItems: number;
  /** 每项的唯一 key 字段名 */
  itemKey: string;
  /** 每行的预估高度（px） */
  itemPreSize: number;
  /** 行间距（px） */
  itemGap?: number;
  /** 是否固定行高 */
  fixed?: boolean;
  /** 渲染缓冲行数 */
  buffer?: number;
  /** 行的自定义 style */
  itemStyle?: string;
  /** 单元格渲染函数 */
  renderCell: (item: T, index: number, rowIndex: number) => HTMLElement;
  renderStickyHeader?: () => HTMLElement;
  renderStickyFooter?: () => HTMLElement;
  renderHeader?: () => HTMLElement;
  renderFooter?: () => HTMLElement;
  renderEmpty?: () => HTMLElement;
  stickyHeaderStyle?: string;
}

export interface VirtGridDOMEvents<_T extends Record<string, any> = Record<string, any>> {
  scroll?: (e: Event) => void;
  toTop?: (item: any) => void;
  toBottom?: (item: any) => void;
  itemResize?: (id: string, newSize: number) => void;
  rangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
}

/**
 * 内部行数据结构。
 * _id 为该行在扁平数组中的起始索引，也作为虚拟列表的 itemKey。
 */
interface GridRow<T> {
  _id: number;
  children: T[];
  [key: string]: any;
}

/**
 * 虚拟网格布局的 DOM 实现。
 *
 * 原理：将扁平的 list 按 gridItems 分组为 GridRow[]（每行包含 gridItems 个子项），
 * 然后交给 VirtListDOM 进行虚拟滚动。每行的 renderItem 内部调用 renderCell 渲染各个单元格。
 *
 * 注意：GridRow 的 _id 是扁平数组的起始索引。当 gridItems 变化时，
 * 新旧行的 _id 可能重叠（如 gridItems=2 的 row[0,2,4...] 和 gridItems=3 的 row[0,3,6...]）。
 * 因此 setGridItems 时必须先 clearItemPool，否则 pool 中的旧 DOM 会被错误复用。
 */
export class VirtGridDOM<T extends Record<string, any>> {
  private _options: VirtGridDOMOptions<T>;
  private _virtListDOM: VirtListDOM<GridRow<T>>;
  /** 分组后的行数据 */
  private _gridList: GridRow<T>[] = [];

  constructor(
    container: HTMLElement,
    options: VirtGridDOMOptions<T>,
    events?: VirtGridDOMEvents<T>,
  ) {
    this._options = options;
    this._updateGridList();

    const listEvents: VirtListEvents<GridRow<T>> = {
      scroll: (e) => events?.scroll?.(e),
      toTop: (item) => events?.toTop?.(item),
      toBottom: (item) => events?.toBottom?.(item),
      itemResize: (id, size) => events?.itemResize?.(id, size),
      rangeUpdate: (begin, end) => events?.rangeUpdate?.(begin, end),
    };

    this._virtListDOM = new VirtListDOM<GridRow<T>>(
      container,
      {
        list: this._gridList,
        itemKey: '_id',
        itemPreSize: options.itemPreSize,
        itemGap: options.itemGap,
        fixed: options.fixed,
        buffer: options.buffer,
        itemStyle: `display:flex;min-width:min-content;${options.itemStyle ?? ''}`,
        renderItem: (rowData: GridRow<T>, rowIndex: number) => {
          // 使用 display:contents 使子元素直接参与 flex 布局
          const wrapper = document.createElement('div');
          wrapper.style.display = 'contents';
          for (let i = 0; i < rowData.children.length; i++) {
            const cellEl = this._options.renderCell(
              rowData.children[i]!,
              rowData._id + i,
              rowIndex,
            );
            wrapper.appendChild(cellEl);
          }
          return wrapper;
        },
        renderStickyHeader: options.renderStickyHeader,
        renderStickyFooter: options.renderStickyFooter,
        renderHeader: options.renderHeader,
        renderFooter: options.renderFooter,
        renderEmpty: options.renderEmpty,
        stickyHeaderStyle: options.stickyHeaderStyle,
      },
      listEvents,
    );
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

  /** 更新数据源 */
  setList(list: T[]): void {
    this._options.list = list;
    this._updateGridList();
    this._virtListDOM.setList(this._gridList);
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
  scrollToIndex(index: number): void {
    const targetRowIndex = Math.floor(index / this._options.gridItems);
    this._virtListDOM.scrollToIndex(targetRowIndex);
  }

  scrollIntoView(index: number): void {
    const targetRowIndex = Math.floor(index / this._options.gridItems);
    this._virtListDOM.scrollIntoView(targetRowIndex);
  }

  scrollToTop(): void {
    this._virtListDOM.scrollToTop();
  }

  scrollToBottom(): void {
    this._virtListDOM.scrollToBottom();
  }

  scrollToOffset(offset: number): void {
    this._virtListDOM.scrollToOffset(offset);
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
