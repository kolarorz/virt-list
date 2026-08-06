import { VirtListCore } from '@virt-list/core';
import type {
  ListState,
  LoadState,
  VirtListDOMOptions,
  VirtListEvents,
  VirtScrollOptions,
} from '@virt-list/core';
import { mergeStyles, applyClass, applyStyle, normalizeStyle } from './utils';
import { Scrollbar } from './scrollbar/Scrollbar';
import { InputController } from './scrollbar/InputController';
import { positionToRatio, ratioToPosition } from './scrollbar/geometry';

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
  /** 滚动容器（native: overflow:auto / custom: overflow:hidden），由内部创建 */
  private _clientEl!: HTMLElement;
  /** 列表容器，native 下高度等于 listTotalSize 形成滚动空间 */
  private _listEl!: HTMLElement;
  /** 虚拟占位元素，高度等于 virtualSize，将渲染项推到正确位置（仅 native） */
  private _virtualEl: HTMLElement | null = null;

  /**
   * 是否为自绘滚动条模式。
   *
   * 两种模式的差别不只是滚动条长什么样：custom 模式下容器 overflow:hidden，
   * 偏移量由 JS 掌管，内容靠 transform 移动，因此**不再需要撑开滚动空间的占位元素**
   * ——最高的元素只有一屏，浏览器的元素高度上限（Chrome 实测 33,554,428px）
   * 也就不再是长列表的天花板。
   */
  private _custom = false;
  /** 承载 transform 的滚动内容层（仅 custom） */
  private _scrollContentEl: HTMLElement | null = null;
  /** 复现 native 下吸顶区占用滚动空间的占位块（仅 custom，且有 stickyHeader 时） */
  private _stickySpacerEl: HTMLElement | null = null;
  /** 列表项的直接父节点：native 为 listEl，custom 为 itemsEl */
  private _itemHostEl!: HTMLElement;
  /** 列表项插入位置的参照节点：native 为 virtualEl，custom 无（从头插） */
  private _itemAnchorEl: HTMLElement | null = null;
  /** 自绘滚动条（仅 custom），横向模式下装的是横向那条 */
  private _scrollbar: Scrollbar | null = null;
  /** 滚轮 / 键盘 / 触摸的接管者（仅 custom） */
  private _input: InputController | null = null;
  /** 偏移量变化的订阅者，见 onOffsetChange */
  private _offsetListeners = new Set<(offset: number) => void>();

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

  /** 是否为自绘滚动条模式 */
  get isCustomScrollbar(): boolean {
    return this._custom;
  }

  /**
   * 订阅偏移量变化，返回取消订阅的函数。
   *
   * custom 模式下容器不会派发原生 `scroll` 事件（内容靠 transform 移动），
   * 所以「跟着滚动重算」这类逻辑（树拖拽的落点判定）得改挂到这里。
   */
  onOffsetChange(cb: (offset: number) => void): () => void {
    this._offsetListeners.add(cb);
    return () => this._offsetListeners.delete(cb);
  }

  constructor(
    container: HTMLElement,
    options: VirtListDOMOptions<T>,
    externalEvents?: VirtListEvents<T>,
  ) {
    this._containerEl = container;
    this._options = options;
    this._custom = options.scrollbar === 'custom';

    // 拦截 core 的 update 事件，执行 DOM patch 后再转发给外部
    const events: VirtListEvents<T> = {
      scroll: (e) => externalEvents?.scroll?.(e),
      toTop: (item) => externalEvents?.toTop?.(item),
      toBottom: (item) => externalEvents?.toBottom?.(item),
      itemResize: (id, size) => externalEvents?.itemResize?.(id, size),
      // 偏移量生效的同步回调（仅 custom 模式）。内容在这里移动，与上面的
      // DOM patch 落在同一个同步任务里 —— 这正是"位置与 DOM 同帧提交"的落点
      offsetChange: (offset) => {
        this._applyScrollPosition(offset);
        for (const cb of this._offsetListeners) cb(offset);
        externalEvents?.offsetChange?.(offset);
      },
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
    // 滚动条要读 core 的尺寸账本，必须在 core 建好之后再装
    if (this._custom) this._initScrollbar();
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

    this._scrollbar?.destroy();
    this._scrollbar = null;
    this._input?.destroy();
    this._input = null;
    this._offsetListeners.clear();
    this._core.destroy();
    this._containerEl.innerHTML = '';
  }

  // ==================== DOM 构建 ====================

  /**
   * 构建滚动容器的完整 DOM 结构。
   *
   * native（overflow:auto，滚动位置归浏览器）：
   *   clientEl
   *   ├─ stickyHeaderEl (position:sticky)
   *   ├─ headerEl
   *   ├─ listEl (min-height: listTotalSize)
   *   │  ├─ virtualEl (height: virtualSize, 占位)
   *   │  └─ [item elements...]
   *   ├─ footerEl
   *   └─ stickyFooterEl (position:sticky)
   *
   * custom（overflow:hidden，滚动位置归 JS）：
   *   clientEl
   *   ├─ scrollContentEl (transform: translate3d(0, -offset, 0))
   *   │  ├─ stickySpacerEl (height: stickyHeaderSize，复现吸顶区占的滚动空间)
   *   │  ├─ headerEl
   *   │  ├─ listEl (height: 0)
   *   │  │  └─ itemsEl (transform: translateY(virtualSize))
   *   │  │     └─ [item elements...]
   *   │  └─ footerEl (transform: translateY(listTotalSize))
   *   ├─ stickyHeaderEl (position:absolute; top:0)   ← sticky 依赖原生滚动，这里失效
   *   └─ stickyFooterEl (position:absolute; bottom:0)
   *
   * custom 下没有任何元素的**几何尺寸**与列表长度相关，所有偏移都由 transform 表达。
   */
  private _buildDOM(): void {
    const { horizontal } = this._options;
    const custom = this._custom;

    this._clientEl = document.createElement('div');
    this._clientEl.className = 'virt-list__client';
    this._clientEl.dataset.id = 'client';

    if (custom) {
      // overflow:hidden 仍然是个 scrollport（可编程滚动、sticky 有参照），
      // 但用户无法直接滚动它 —— 浏览器不会在合成器线程上抢先把画面滚过去，
      // 于是"已呈现的一帧落在没有 DOM 的位置上"这件事从根上不成立。
      // touch-action:none 是因为触摸滚动改由 InputController 接管。
      this._clientEl.className += ' virt-list__client--custom';
      this._clientEl.tabIndex = 0;
      applyStyle(
        this._clientEl,
        'width:100%; height:100%; overflow:hidden; overflow-anchor:none;' +
          ' position:relative; touch-action:none;',
      );
    } else {
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
    }

    // custom 模式下真正承载滚动位移的是这一层，插槽与列表都挂在它下面
    if (custom) {
      this._scrollContentEl = document.createElement('div');
      applyStyle(
        this._scrollContentEl,
        'position:absolute; top:0; left:0; width:100%;' +
          ' will-change:transform; transform:translate3d(0,0,0);',
      );
      this._clientEl.appendChild(this._scrollContentEl);
    }

    /** 参与滚动的内容挂到这里：native 是 clientEl 本身，custom 是位移层 */
    const flowEl = this._scrollContentEl ?? this._clientEl;

    if (this._options.renderStickyHeader) {
      this._stickyHeaderEl = document.createElement('div');
      this._stickyHeaderEl.dataset.id = 'stickyHeader';
      if (this._options.stickyHeaderClass) {
        applyClass(this._stickyHeaderEl, this._options.stickyHeaderClass);
      }
      applyStyle(
        this._stickyHeaderEl,
        mergeStyles(
          custom
            ? // position:sticky 的粘附由原生滚动驱动，overflow:hidden 下它永远
              // 不会触发，只能改成相对视口的绝对定位
              'position: absolute; z-index: 10; left: 0; right: 0;'
            : 'position: sticky; z-index: 10;',
          horizontal ? 'left: 0' : 'top: 0',
          this._options.stickyHeaderStyle,
        ),
      );
      const sh = this._options.renderStickyHeader(this._stickyHeaderEl);
      if (sh) this._stickyHeaderEl.appendChild(sh);
      // custom 下吸顶区脱离了内容流，但它在 core 的账本里仍占滚动空间
      // （getSlotSize 计入 stickyHeaderSize），用占位块把这段空间还回内容流
      if (custom) {
        this._stickySpacerEl = document.createElement('div');
        flowEl.appendChild(this._stickySpacerEl);
        this._clientEl.appendChild(this._stickyHeaderEl);
      } else {
        this._clientEl.appendChild(this._stickyHeaderEl);
      }
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
      flowEl.appendChild(this._headerEl);
    }

    this._listEl = document.createElement('div');
    if (this._options.listClass) {
      applyClass(this._listEl, this._options.listClass);
    }

    if (custom) {
      // listEl 不再撑开滚动空间（height:0），列表项统一由 itemsEl 用 transform 定位
      this._itemHostEl = document.createElement('div');
      this._listEl.appendChild(this._itemHostEl);
      this._itemAnchorEl = null;
    } else {
      this._virtualEl = document.createElement('div');
      this._listEl.appendChild(this._virtualEl);
      this._itemHostEl = this._listEl;
      this._itemAnchorEl = this._virtualEl;
    }

    flowEl.appendChild(this._listEl);

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
      flowEl.appendChild(this._footerEl);
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
          custom
            ? 'position: absolute; z-index: 10; left: 0; right: 0;'
            : 'position: sticky;  z-index:10;',
          horizontal ? 'right: 0;' : 'bottom: 0;',
          this._options.stickyFooterStyle,
        ),
      );
      const sf = this._options.renderStickyFooter(this._stickyFooterEl);
      if (sf) this._stickyFooterEl.appendChild(sf);
      // 吸底区在账本里占的滚动空间由 maxOffset 自然涵盖（getSlotSize 已计入），
      // 不需要像吸顶那样补占位块
      this._clientEl.appendChild(this._stickyFooterEl);
    }

    this._containerEl.appendChild(this._clientEl);
  }

  /**
   * 把内容移到新的偏移量位置（仅 custom 模式）。
   *
   * 由 core 的 offsetChange 同步驱动，与渲染 patch 落在同一个任务里。
   */
  private _applyScrollPosition(offset: number): void {
    const el = this._scrollContentEl;
    if (!el) return;
    el.style.transform = this._options.horizontal
      ? `translate3d(${-offset}px, 0, 0)`
      : `translate3d(0, ${-offset}px, 0)`;
    this._scrollbar?.update();
    this._scrollbar?.notifyActivity();
  }

  /**
   * 滚到底时视口顶部那一项的索引，也就是 inViewBegin 的上限。
   *
   * 滑块按索引映射，这个数就是映射的分母。用 `list.length - 1` 是错的：
   * 那样滚到底时滑块只走到 (len - 可见项数) / len 的位置，永远碰不到轨道尽头。
   */
  private _maxBegin(): number {
    return this._core.getIndexByOffset(this._core.getMaxOffset());
  }

  /**
   * 当前内容位置对应的滑块比例。
   *
   * 按索引而不是像素：不定高列表的 totalSize 随实测尺寸回填一直在变，
   * 按像素算滑块会在手指底下反复跳。frac 让长项内部也能连续移动。
   */
  private _currentRatio(): number {
    const { inViewBegin } = this._core.state;
    const pos = this._core.getItemPosByIndex(inViewBegin);
    const frac =
      pos.current > 0 ? (this._core.getOffset() - pos.top) / pos.current : 0;
    return positionToRatio({
      inViewBegin,
      maxBegin: this._maxBegin(),
      frac,
    });
  }

  /** 用户把滑块拖到了 ratio，换算成偏移量并立即落位 */
  private _scrollToRatio(ratio: number): void {
    // 两端交给 core 的专用路径：按索引换算出的目标是「那一项的顶部」，
    // 到不了浏览器意义上的真正底部，末尾会差半屏
    if (ratio >= 1) {
      this._core.scrollToBottom();
      return;
    }
    if (ratio <= 0) {
      this._core.scrollToTop();
      return;
    }

    const { index, frac } = ratioToPosition(ratio, this._maxBegin());
    const pos = this._core.getItemPosByIndex(index);
    // 拖拽热路径刻意不用 scrollToIndex：它会挂渐进修正任务，
    // 而那个任务会和下一次 move 抢 offset。修正只在松手时做一次
    this._core.scrollToOffset(pos.top + frac * pos.current);
  }

  /** 创建自绘滚动条并挂到视口上 */
  private _initScrollbar(): void {
    const horizontal = !!this._options.horizontal;
    this._scrollbar = new Scrollbar(
      {
        getClientSize: () => this._core.slotSize.clientSize,
        getTotalSize: () => this._core.getTotalSize(),
        getRatio: () => this._currentRatio(),
        onRatio: (ratio) => this._scrollToRatio(ratio),
        // 松手后再挂一次渐进修正：拖拽途中新项才刚渲染出来，
        // 它们的真实尺寸回填后目标位置会变，这一步把误差收敛掉
        onDragEnd: () => {
          this._core.scrollToIndex(this._core.state.inViewBegin);
        },
      },
      {
        horizontal,
        autoHideDelay: this._options.scrollbarAutoHide ?? 1200,
        minThumbSize: this._options.scrollbarMinThumbSize,
      },
    );
    this._clientEl.appendChild(this._scrollbar.el);
    this._scrollbar.update();

    // overflow:hidden 之后浏览器不再提供任何滚动手段，输入全部自己接管
    this._input = new InputController(
      this._clientEl,
      {
        getOffset: () => this._core.getOffset(),
        getMaxOffset: () => this._core.getMaxOffset(),
        getClientSize: () => this._core.slotSize.clientSize,
        scrollBy: (delta) =>
          this._core.scrollToOffset(this._core.getOffset() + delta),
        scrollTo: (offset) => this._core.scrollToOffset(offset),
        scrollToTop: () => this._core.scrollToTop(),
        scrollToBottom: () => this._core.scrollToBottom(),
        onActivity: () => this._scrollbar?.notifyActivity(),
      },
      horizontal,
    );
  }

  // ==================== 增量 DOM Patch ====================

  /**
   * 增量更新 DOM：
   * 1. 更新列表的占位尺寸（native）或各段的 transform 位移（custom）
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

    if (this._custom) {
      // custom 模式下所有位移都用 transform 表达，没有任何元素的几何尺寸随列表长度增长。
      // listEl 收缩到 0，仅作为 itemsEl 的定位参照
      applyStyle(
        this._listEl,
        (horizontal ? 'width: 0;' : 'height: 0;') +
          ' position: relative;' +
          listStyleCSS,
      );
      applyStyle(
        this._itemHostEl,
        horizontal
          ? `display: flex; will-change: transform; transform: translate3d(${virtualSize}px, 0, 0);`
          : `will-change: transform; transform: translate3d(0, ${virtualSize}px, 0);`,
      );
      // listEl 没有高度，footer 的自然位置紧贴 header 之后，
      // 需要把整段列表的长度补回去
      if (this._footerEl) {
        this._footerEl.style.transform = horizontal
          ? `translate3d(${listTotalSize}px, 0, 0)`
          : `translate3d(0, ${listTotalSize}px, 0)`;
      }
      // 吸顶区已脱离内容流，用占位块还回它在账本里占的那段滚动空间
      if (this._stickySpacerEl) {
        const size = this._core.slotSize.stickyHeaderSize;
        this._stickySpacerEl.style[horizontal ? 'width' : 'height'] =
          `${size}px`;
      }
      // 内容总量变了，滑块尺寸与位置都要跟着变
      this._scrollbar?.update();
    } else {
      const dynamicListStyle = horizontal
        ? `will-change: width; min-width: ${listTotalSize}px; display: flex; ${listStyleCSS}`
        : `will-change: height; min-height: ${listTotalSize}px; ${listStyleCSS}`;
      applyStyle(this._listEl, dynamicListStyle);

      const virtualStyle = horizontal
        ? `width: ${virtualSize}px; will-change: width;`
        : `height: ${virtualSize}px; will-change: height;`;
      applyStyle(this._virtualEl!, virtualStyle);
    }

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
        // custom 下 listEl 高度为 0，撑不起 height:100% 的空状态；
        // 挂到视口容器上（它本身就是 position:relative），语义也更贴切
        (this._custom ? this._clientEl : this._listEl).appendChild(
          this._emptyEl,
        );
      }
      this._renderedKeys = [];
      return;
    }

    if (this._emptyEl) {
      this._emptyEl.remove();
      this._emptyEl = null;
    }

    // 按序插入/复用列表项，利用 insertBefore 保持 DOM 顺序。
    // native 从 virtualEl 之后排起，custom 没有占位元素，直接从 itemsEl 开头排
    let prevNode: ChildNode | null = this._itemAnchorEl;
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

      const nextSibling = prevNode
        ? prevNode.nextSibling
        : this._itemHostEl.firstChild;
      if (nextSibling !== el) {
        this._itemHostEl.insertBefore(el, nextSibling);
      }
      prevNode = el;
    }

    this._renderedKeys = newKeys;
  }
}
