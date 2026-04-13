/* eslint-disable @typescript-eslint/no-explicit-any */
import { VirtListCore } from '@virt-list/core';
import type {
  ReactiveData,
  VirtListDOMOptions,
  VirtListEvents,
} from '@virt-list/core';
import { mergeStyles, applyStyle } from './utils';

/**
 * 虚拟列表的 DOM 层实现。
 *
 * 职责：
 * - 构建滚动容器的完整 DOM 结构（client → stickyHeader / header / list / footer / stickyFooter）
 * - 维护 itemPool（key → DOM 元素），实现增量 patch：
 *   仅创建/销毁进出渲染区间的项，已有项通过 insertBefore 调整顺序
 * - 将 VirtListCore 的 update 事件转换为 DOM 操作
 */
export class VirtList<T extends Record<string, any>> {
  private _core: VirtListCore<T>;
  private _options: VirtListDOMOptions<T>;

  /** 外部传入的挂载容器 */
  private _containerEl: HTMLElement;
  /** 滚动容器（overflow: auto），由内部创建 */
  private _clientEl!: HTMLElement;
  /** 列表容器，高度等于 listTotalSize，形成滚动空间 */
  private _listEl!: HTMLElement;
  /** 虚拟占位元素，高度等于 virtualSize，将渲染项推到正确位置 */
  private _virtualEl!: HTMLElement;
  private _stickyHeaderEl: HTMLElement | null = null;
  private _stickyFooterEl: HTMLElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _footerEl: HTMLElement | null = null;
  private _emptyEl: HTMLElement | null = null;

  /** 列表项 DOM 缓存池：itemKey → HTMLElement */
  private _itemPool: Map<string, HTMLElement> = new Map();
  /** 上一次渲染的 key 列表，用于 diff 时识别需要移除的项 */
  private _renderedKeys: string[] = [];
  /** DOM 是否已构建完成（防止 constructor 中的首次 update 事件过早 patch） */
  private _domReady = false;

  get core(): VirtListCore<T> {
    return this._core;
  }

  get state(): ReactiveData {
    return this._core.state;
  }

  get clientEl(): HTMLElement {
    return this._clientEl;
  }

  get listEl(): HTMLElement {
    return this._listEl;
  }

  constructor(
    container: HTMLElement,
    options: VirtListDOMOptions<T>,
    externalEvents?: VirtListEvents<T>,
  ) {
    this._containerEl = container;
    this._options = options;

    // 拦截 core 的 update 事件，执行 DOM patch 后再转发给外部
    const events: VirtListEvents<T> = {
      scroll: (e) => externalEvents?.scroll?.(e),
      toTop: (item) => externalEvents?.toTop?.(item),
      toBottom: (item) => externalEvents?.toBottom?.(item),
      itemResize: (id, size) => externalEvents?.itemResize?.(id, size),
      rangeUpdate: (begin, end) => externalEvents?.rangeUpdate?.(begin, end),
      update: (renderList, state) => {
        if (this._domReady) {
          this._patch(renderList, state);
        }
        externalEvents?.update?.(renderList, state);
      },
    };

    this._core = new VirtListCore<T>(options, events);
    this._buildDOM();
    this._domReady = true;
    this._patch(this._core.renderList, this._core.state);
    this._core.bindDOM(this._clientEl);

    // 监听各插槽元素的尺寸变化
    if (options.renderStickyHeader && this._stickyHeaderEl) {
      this._core.observeSlotEl(this._stickyHeaderEl);
    }
    if (options.renderStickyFooter && this._stickyFooterEl) {
      this._core.observeSlotEl(this._stickyFooterEl);
    }
    if (options.renderHeader && this._headerEl) {
      this._core.observeSlotEl(this._headerEl);
    }
    if (options.renderFooter && this._footerEl) {
      this._core.observeSlotEl(this._footerEl);
    }
  }

  // ==================== 公共代理 API ====================

  scrollToIndex(index: number): void {
    this._core.scrollToIndex(index);
  }

  scrollIntoView(index: number): void {
    this._core.scrollIntoView(index);
  }

  scrollToTop(): void {
    this._core.scrollToTop();
  }

  scrollToBottom(): void {
    this._core.scrollToBottom();
  }

  scrollToOffset(offset: number): void {
    this._core.scrollToOffset(offset);
  }

  reset(): void {
    this._core.reset();
  }

  setList(list: T[]): void {
    this._core.updateOptions({ list });
  }

  updateOptions(partial: Partial<VirtListDOMOptions<T>>): void {
    Object.assign(this._options, partial);
    this._core.updateOptions(partial);
  }

  forceUpdate(): void {
    this._core.forceUpdate();
  }

  /** 清空 DOM 缓存池，移除所有已渲染的列表项（gridItems 变化等场景需要） */
  clearItemPool(): void {
    this._itemPool.forEach((el) => {
      this._core.resizeObserver?.unobserve(el);
      this._options.onItemUnmounted?.(el);
      el.remove();
    });
    this._itemPool.clear();
    this._renderedKeys = [];
  }

  deletedList2Top(deletedList: T[]): void {
    this._core.deletedList2Top(deletedList);
  }

  addedList2Top(addedList: T[]): void {
    this._core.addedList2Top(addedList);
  }

  destroy(): void {
    if (this._stickyHeaderEl) this._core.unobserveSlotEl(this._stickyHeaderEl);
    if (this._stickyFooterEl) this._core.unobserveSlotEl(this._stickyFooterEl);
    if (this._headerEl) this._core.unobserveSlotEl(this._headerEl);
    if (this._footerEl) this._core.unobserveSlotEl(this._footerEl);

    this._itemPool.forEach((el) => {
      this._core.resizeObserver?.unobserve(el);
      this._options.onItemUnmounted?.(el);
    });
    this._itemPool.clear();

    this._core.destroy();
    this._containerEl.innerHTML = '';
  }

  // ==================== DOM 构建 ====================

  /**
   * 构建滚动容器的完整 DOM 结构：
   *   container
   *   └─ clientEl (overflow:auto, 滚动容器)
   *      ├─ stickyHeaderEl (position:sticky)
   *      ├─ headerEl
   *      ├─ listEl (min-height: listTotalSize)
   *      │  ├─ virtualEl (height: virtualSize, 占位)
   *      │  └─ [item elements...]
   *      ├─ footerEl
   *      └─ stickyFooterEl (position:sticky)
   */
  private _buildDOM(): void {
    const { horizontal } = this._options;

    this._clientEl = document.createElement('div');
    this._clientEl.className = 'virt-list__client';
    applyStyle(this._clientEl, 'width:100%;height:100%;overflow:auto;');
    this._clientEl.dataset.id = 'client';

    if (this._options.renderStickyHeader) {
      this._stickyHeaderEl = document.createElement('div');
      this._stickyHeaderEl.dataset.id = 'stickyHeader';
      if (this._options.stickyHeaderClass) {
        this._stickyHeaderEl.className = this._options.stickyHeaderClass;
      }
      applyStyle(
        this._stickyHeaderEl,
        mergeStyles(
          'position:sticky;z-index:10;',
          horizontal ? 'left:0' : 'top:0',
          this._options.stickyHeaderStyle,
        ),
      );
      this._stickyHeaderEl.appendChild(this._options.renderStickyHeader());
      this._clientEl.appendChild(this._stickyHeaderEl);
    }

    if (this._options.renderHeader) {
      this._headerEl = document.createElement('div');
      this._headerEl.dataset.id = 'header';
      if (this._options.headerClass) {
        this._headerEl.className = this._options.headerClass;
      }
      if (this._options.headerStyle) {
        applyStyle(this._headerEl, this._options.headerStyle);
      }
      this._headerEl.appendChild(this._options.renderHeader());
      this._clientEl.appendChild(this._headerEl);
    }

    this._listEl = document.createElement('div');
    if (this._options.listClass) {
      this._listEl.className = this._options.listClass;
    }

    this._virtualEl = document.createElement('div');
    this._listEl.appendChild(this._virtualEl);

    this._clientEl.appendChild(this._listEl);

    if (this._options.renderFooter) {
      this._footerEl = document.createElement('div');
      this._footerEl.dataset.id = 'footer';
      if (this._options.footerClass) {
        this._footerEl.className = this._options.footerClass;
      }
      if (this._options.footerStyle) {
        applyStyle(this._footerEl, this._options.footerStyle);
      }
      this._footerEl.appendChild(this._options.renderFooter());
      this._clientEl.appendChild(this._footerEl);
    }

    if (this._options.renderStickyFooter) {
      this._stickyFooterEl = document.createElement('div');
      this._stickyFooterEl.dataset.id = 'stickyFooter';
      if (this._options.stickyFooterClass) {
        this._stickyFooterEl.className = this._options.stickyFooterClass;
      }
      applyStyle(
        this._stickyFooterEl,
        mergeStyles(
          'position:sticky;z-index:10;',
          horizontal ? 'right:0' : 'bottom:0',
          this._options.stickyFooterStyle,
        ),
      );
      this._stickyFooterEl.appendChild(this._options.renderStickyFooter());
      this._clientEl.appendChild(this._stickyFooterEl);
    }

    this._containerEl.appendChild(this._clientEl);
  }

  // ==================== 增量 DOM Patch ====================

  /**
   * 增量更新 DOM：
   * 1. 更新 listEl 的 min-height 和 virtualEl 的 height
   * 2. 移除不再可见的项（key 不在新列表中）
   * 3. 对新列表中的每项：从 pool 取或新建 DOM，按顺序 insertBefore
   *
   * 关键优化：已在 pool 中的项不会重新 renderItem，仅调整 DOM 位置。
   * 这意味着如果同一 key 对应的数据内容变了（如 grid 的 row children），
   * 需要先 clearItemPool() 才能获得正确渲染。
   */
  private _patch(renderList: T[], reactiveData: ReactiveData): void {
    const { itemKey, horizontal, listStyle, itemGap } = this._options;
    const { listTotalSize, virtualSize, renderBegin } = reactiveData;

    const dynamicListStyle = horizontal
      ? `will-change:width;min-width:${listTotalSize}px;display:flex;${listStyle ?? ''}`
      : `will-change:height;min-height:${listTotalSize}px;${listStyle ?? ''}`;
    applyStyle(this._listEl, dynamicListStyle);

    const virtualStyle = horizontal
      ? `width:${virtualSize}px;will-change:width;`
      : `height:${virtualSize}px;will-change:height;`;
    applyStyle(this._virtualEl, virtualStyle);

    const newKeys: string[] = [];
    for (const item of renderList) {
      newKeys.push(String(item[itemKey]));
    }

    // 移除不再可见的项
    const newKeySet = new Set(newKeys);
    for (const key of this._renderedKeys) {
      if (!newKeySet.has(key)) {
        const el = this._itemPool.get(key);
        if (el) {
          this._core.resizeObserver?.unobserve(el);
          this._options.onItemUnmounted?.(el);
          el.remove();
          this._itemPool.delete(key);
        }
      }
    }

    // 空状态处理
    if (renderList.length === 0) {
      if (this._options.renderEmpty && !this._emptyEl) {
        const height =
          this._core.slotSize.clientSize - this._core.getSlotSize();
        this._emptyEl = document.createElement('div');
        applyStyle(this._emptyEl, `height:${height}px`);
        this._emptyEl.appendChild(this._options.renderEmpty());
        this._listEl.appendChild(this._emptyEl);
      }
      this._renderedKeys = [];
      return;
    }

    if (this._emptyEl) {
      this._emptyEl.remove();
      this._emptyEl = null;
    }

    // 按序插入/复用列表项，利用 insertBefore 保持 DOM 顺序
    let prevNode: ChildNode = this._virtualEl;
    for (let i = 0; i < renderList.length; i++) {
      const item = renderList[i]!;
      const key = String(item[itemKey]);
      let el = this._itemPool.get(key);

      if (!el) {
        el = document.createElement('div');
        el.dataset.id = key;

        const gap = itemGap ?? 0;
        const baseStyle = gap > 0 ? `padding:${gap / 2}px 0;` : '';
        const customStyle =
          typeof this._options.itemStyle === 'function'
            ? this._options.itemStyle(item, renderBegin + i)
            : this._options.itemStyle ?? '';
        applyStyle(el, baseStyle + customStyle);

        const customClass =
          typeof this._options.itemClass === 'function'
            ? this._options.itemClass(item, renderBegin + i)
            : this._options.itemClass ?? '';
        if (customClass) el.className = customClass;

        el.appendChild(this._options.renderItem(item, renderBegin + i));
        this._core.resizeObserver?.observe(el);
        this._options.onItemMounted?.(el);
        this._itemPool.set(key, el);
      }

      const nextSibling = prevNode.nextSibling;
      if (nextSibling !== el) {
        this._listEl.insertBefore(el, nextSibling);
      }
      prevNode = el;
    }

    this._renderedKeys = newKeys;
  }
}
