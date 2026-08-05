import { VirtListCore } from '@virt-list/core';
import type {
  ListState,
  LoadState,
  VirtListDOMOptions,
  VirtListEvents,
  VirtScrollOptions,
} from '@virt-list/core';
import { mergeStyles, applyClass, applyStyle, normalizeStyle } from './utils';

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
  /**
   * header / footer 的渲染函数是否走"返回元素"模式。
   *
   * 加载状态变化时要重渲染这两个插槽，而两种渲染模式的清理方式相反：
   * 返回元素的实现每次都产出新节点，重渲染前必须清空容器，否则会不断堆叠；
   * 直接操作 el 的实现（框架封装走的是这条，内部是幂等 patch）反而不能清空，
   * 清了会打断框架自己维护的 vnode 引用。
   */
  private _headerReturnsEl = false;
  private _footerReturnsEl = false;

  get core(): VirtListCore<T> {
    return this._core;
  }

  get state(): ListState {
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
      update: (renderList, state) => {
        if (this._domReady) {
          this._patch(renderList, state);
        }
        externalEvents?.update?.(renderList, state);
      },
      loadStateChange: (loadState) => {
        this._rerenderLoadSlots(loadState);
        externalEvents?.loadStateChange?.(loadState);
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

  scrollToIndex(index: number, options?: VirtScrollOptions): void {
    this._core.scrollToIndex(index, options);
  }

  scrollIntoView(index: number, options?: VirtScrollOptions): void {
    this._core.scrollIntoView(index, options);
  }

  scrollToTop(options?: VirtScrollOptions): void {
    this._core.scrollToTop(options);
  }

  scrollToBottom(options?: VirtScrollOptions): void {
    this._core.scrollToBottom(options);
  }

  scrollToOffset(offset: number, options?: VirtScrollOptions): void {
    this._core.scrollToOffset(offset, options);
  }

  /** 取消进行中的平滑滚动动画 */
  cancelScroll(): void {
    this._core.cancelScroll();
  }

  reset(): void {
    this._core.reset();
  }

  setList(list: T[]): void {
    this._core.updateOptions({ list });
  }

  /** 获取当前加载状态（loading / hasMore / pendingNew） */
  getLoadState(): LoadState {
    return this._core.getLoadState();
  }

  /**
   * 加载状态变化后重渲染 header / footer，让加载提示条反映最新状态。
   *
   * 这两个插槽本来只在建 DOM 时渲染一次，而"加载中 / 没有更多了"必须跟着状态走。
   */
  private _rerenderLoadSlots(loadState: LoadState): void {
    if (!this._domReady) return;

    if (this._options.renderHeader && this._headerEl) {
      if (this._headerReturnsEl) this._headerEl.replaceChildren();
      const hd = this._options.renderHeader(this._headerEl, loadState);
      if (hd) this._headerEl.appendChild(hd);
    }
    if (this._options.renderFooter && this._footerEl) {
      if (this._footerReturnsEl) this._footerEl.replaceChildren();
      const ft = this._options.renderFooter(this._footerEl, loadState);
      if (ft) this._footerEl.appendChild(ft);
    }
  }

  updateOptions(partial: Partial<VirtListDOMOptions<T>>): void {
    Object.assign(this._options, partial);
    this._core.updateOptions(partial);
  }

  forceUpdate(): void {
    this.clearItemPool();
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
    this._clientEl.dataset.id = 'client';
    // overflow-anchor: none 必须显式关掉浏览器的滚动锚定。
    //
    // 默认开启时，只要视口上方的内容高度发生变化，浏览器就会自作主张微调
    // scrollTop 来保持画面稳定——而且这个调整**不派发 scroll 事件**。虚拟列表
    // 每次回填实测尺寸都在改内容高度，于是滚动位置被悄悄挪走，内部偏移量还是
    // 旧值，渲染区间就按一个错的位置去算，视口边缘留出空白（再滚一下才恢复）。
    //
    // 滚动位置本来就由列表自己用锚点机制维护，浏览器这份好意只会和它打架。
    applyStyle(
      this._clientEl,
      'width:100%; height:100%; overflow:auto; overflow-anchor: none; position: relative;',
    );

    if (this._options.renderStickyHeader) {
      this._stickyHeaderEl = document.createElement('div');
      this._stickyHeaderEl.dataset.id = 'stickyHeader';
      if (this._options.stickyHeaderClass) {
        applyClass(this._stickyHeaderEl, this._options.stickyHeaderClass);
      }
      applyStyle(
        this._stickyHeaderEl,
        mergeStyles(
          'position: sticky; z-index: 10;',
          horizontal ? 'left: 0' : 'top: 0',
          this._options.stickyHeaderStyle,
        ),
      );
      const sh = this._options.renderStickyHeader(this._stickyHeaderEl);
      if (sh) this._stickyHeaderEl.appendChild(sh);
      this._clientEl.appendChild(this._stickyHeaderEl);
    }

    if (this._options.renderHeader) {
      this._headerEl = document.createElement('div');
      this._headerEl.dataset.id = 'header';
      if (this._options.headerClass) {
        applyClass(this._headerEl, this._options.headerClass);
      }
      if (this._options.headerStyle) {
        applyStyle(this._headerEl, this._options.headerStyle);
      }
      const hd = this._options.renderHeader(
        this._headerEl,
        this._core.getLoadState(),
      );
      if (hd) {
        this._headerEl.appendChild(hd);
        this._headerReturnsEl = true;
      }
      this._clientEl.appendChild(this._headerEl);
    }

    this._listEl = document.createElement('div');
    if (this._options.listClass) {
      applyClass(this._listEl, this._options.listClass);
    }

    this._virtualEl = document.createElement('div');
    this._listEl.appendChild(this._virtualEl);

    this._clientEl.appendChild(this._listEl);

    if (this._options.renderFooter) {
      this._footerEl = document.createElement('div');
      this._footerEl.dataset.id = 'footer';
      if (this._options.footerClass) {
        applyClass(this._footerEl, this._options.footerClass);
      }
      if (this._options.footerStyle) {
        applyStyle(this._footerEl, this._options.footerStyle);
      }
      const ft = this._options.renderFooter(
        this._footerEl,
        this._core.getLoadState(),
      );
      if (ft) {
        this._footerEl.appendChild(ft);
        this._footerReturnsEl = true;
      }
      this._clientEl.appendChild(this._footerEl);
    }

    if (this._options.renderStickyFooter) {
      this._stickyFooterEl = document.createElement('div');
      this._stickyFooterEl.dataset.id = 'stickyFooter';
      if (this._options.stickyFooterClass) {
        applyClass(this._stickyFooterEl, this._options.stickyFooterClass);
      }
      applyStyle(
        this._stickyFooterEl,
        mergeStyles(
          'position: sticky;  z-index:10;',
          horizontal ? 'right: 0;' : 'bottom: 0;',
          this._options.stickyFooterStyle,
        ),
      );
      const sf = this._options.renderStickyFooter(this._stickyFooterEl);
      if (sf) this._stickyFooterEl.appendChild(sf);
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
  private _patch(renderList: T[], reactiveData: ListState): void {
    const { itemKey, horizontal, listStyle, itemGap } = this._options;
    const { listTotalSize, virtualSize, renderBegin } = reactiveData;

    const listStyleCSS = listStyle ? normalizeStyle(listStyle) : '';
    const dynamicListStyle = horizontal
      ? `will-change: width; min-width: ${listTotalSize}px; display: flex; ${listStyleCSS}`
      : `will-change: height; min-height: ${listTotalSize}px; ${listStyleCSS}`;
    applyStyle(this._listEl, dynamicListStyle);

    const virtualStyle = horizontal
      ? `width: ${virtualSize}px; will-change: width;`
      : `height: ${virtualSize}px; will-change: height;`;
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
        this._emptyEl = document.createElement('div');
        applyStyle(this._emptyEl, `width: 100%; height: 100%; position: absolute; top: 0; left: 0;`);
        const emp = this._options.renderEmpty(this._emptyEl);
        if (emp) this._emptyEl.appendChild(emp);
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
        const baseStyle = gap > 0 ? `padding: ${gap / 2}px 0;` : '';
        const rawItemStyle =
          typeof this._options.itemStyle === 'function'
            ? this._options.itemStyle(item, renderBegin + i)
            : this._options.itemStyle ?? '';
        applyStyle(el, baseStyle + normalizeStyle(rawItemStyle));

        const customClass =
          typeof this._options.itemClass === 'function'
            ? this._options.itemClass(item, renderBegin + i)
            : this._options.itemClass ?? '';
        if (customClass) applyClass(el, customClass);

        const child = this._options.renderItem(item, renderBegin + i, el);
        if (child) el.appendChild(child);
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
