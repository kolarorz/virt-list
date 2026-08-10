import { VirtListCore } from '@virt-list/core';
import type {
  ListState,
  LoadState,
  VirtListDOMOptions,
  VirtListEvents,
  VirtScrollOptions,
} from '@virt-list/core';
import { DEFAULT_DOM_OPTIONS } from './defaults';
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
  /** 滚动容器（overflow:hidden，滚动位置由 JS 掌管），由内部创建 */
  private _clientEl!: HTMLElement;
  /** 列表容器，高度恒为 0，仅作为 itemsEl 的定位参照 */
  private _listEl!: HTMLElement;

  /**
   * 各段落的公共父节点。**它自己不平移**，平移在每一段上（见 `_applyLayout`）。
   *
   * 滚动位置由 JS 掌管，内容靠 transform 移动，因此**不需要撑开滚动空间的
   * 占位元素**——最高的元素只有一屏。
   *
   * 这对超大列表是实质差别：浏览器对元素高度与 transform 位移有同一量级的上限
   * （Chrome 实测 33,554,428 / 33,554,400px）。靠占位元素撑开时，超限的高度被
   * 直接截掉，那部分内容永远滚不到；而这里没有任何一个 transform 携带完整量级，
   * 所以那条线不存在（100 万项 × 100px 实测定位误差 0px）。
   */
  private _scrollContentEl!: HTMLElement;
  /** 列表项的直接父节点 */
  private _itemHostEl!: HTMLElement;
  /** 自绘滚动条，横向模式下装的是横向那条 */
  private _scrollbar: Scrollbar | null = null;
  /** 滚轮 / 键盘 / 触摸的接管者 */
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

  /** 承载滚动位移的内容层：header / list / footer 都在它下面 */
  get scrollContentEl(): HTMLElement {
    return this._scrollContentEl;
  }

  /**
   * 列表项的直接父节点。
   *
   * 列表项挂在它下面，而不是 `listEl` 的直接子节点——`listEl` 高度恒为 0，
   * 只是 `itemsEl` 的定位参照，真正把渲染块推到正确位置的是 `itemsEl` 的 transform。
   */
  get itemsEl(): HTMLElement {
    return this._itemHostEl;
  }

  /**
   * 订阅偏移量变化，返回取消订阅的函数。
   *
   * 容器不会派发原生 `scroll` 事件（内容靠 transform 移动），
   * 所以「跟着滚动重算」这类逻辑（树拖拽的落点判定）得挂到这里。
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

    // 拦截 core 的 update 事件，执行 DOM patch 后再转发给外部
    const events: VirtListEvents<T> = {
      scroll: (e) => externalEvents?.scroll?.(e),
      toTop: (item) => externalEvents?.toTop?.(item),
      toBottom: (item) => externalEvents?.toBottom?.(item),
      itemResize: (id, size) => externalEvents?.itemResize?.(id, size),
      // 偏移量生效的同步回调。内容在这里移动，与上面的
      // DOM patch 落在同一个同步任务里 —— 这正是"位置与 DOM 同帧提交"的落点
      offsetChange: (offset) => {
        this._applyLayout();
        // 只有真的滚动了才让滚动条显形；_patch（区间/尺寸变化）不算
        this._scrollbar?.notifyActivity();
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
    this._initScrollbar();
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

  /**
   * 上报一次用户发起的滚动。
   *
   * 与 `scrollToOffset` 的区别是语义：这是「用户动了」，会触发 toTop / toBottom
   * 与自动续拉；`scrollToOffset` 是「程序要求去某处」，不触发。
   * 接自定义输入源（自建手势、外部滚动条）时用它。
   */
  scrollFromUser(offset: number): void {
    this._core.scrollFromUser(offset);
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
   *   clientEl (overflow:hidden)
   *   ├─ scrollContentEl (transform: translate3d(0, -offset, 0))
   *   │  ├─ stickySpacerEl (height: stickyHeaderSize，复现吸顶区占的滚动空间)
   *   │  ├─ headerEl
   *   │  ├─ listEl (height: 0)
   *   │  │  └─ itemsEl (transform: translateY(virtualSize))
   *   │  │     └─ [item elements...]
   *   │  └─ footerEl (transform: translateY(listTotalSize))
   *   ├─ stickyHeaderEl (position:absolute; top:0)   ← sticky 依赖原生滚动，这里失效
   *   ├─ stickyFooterEl (position:absolute; bottom:0)
   *   └─ scrollbarEl └─ thumbEl
   *
   * 没有任何元素的**几何尺寸**与列表长度相关，所有偏移都由 transform 表达。
   */
  private _buildDOM(): void {
    const { horizontal } = this._options;

    this._clientEl = document.createElement('div');
    this._clientEl.className = 'virt-list__client';
    this._clientEl.dataset.id = 'client';

    // overflow:hidden 仍然是个 scrollport（可编程滚动、sticky 有参照），
    // 但用户无法直接滚动它 —— 浏览器不会在合成器线程上抢先把画面滚过去，
    // 于是"已呈现的一帧落在没有 DOM 的位置上"这件事从根上不成立。
    //
    // overflow-anchor:none 仍然必须显式关掉：overflow:hidden 依然是 scrollport，
    // 浏览器的滚动锚定照样会在内容高度变化时悄悄改 scrollTop（且不派发 scroll
    // 事件）。滚动位置由列表自己维护，浏览器这份好意只会和它打架。
    //
    // touch-action:none 是因为触摸滚动改由 InputController 接管。
    this._clientEl.tabIndex = 0;
    applyStyle(
      this._clientEl,
      'width:100%; height:100%; overflow:hidden; overflow-anchor:none;' +
        ' position:relative; touch-action:none;',
    );

    // 参与滚动的各段都挂在这一层里，但**它自己不平移**。
    //
    // 曾经的做法是让这一层整体 translate(-offset)、再让 itemsEl translate(+virtualSize)，
    // 两者的合成才是内容的真实位置。问题是浏览器对**单个** transform 的位移量有上限
    // （Chrome 实测 33,554,400px），两个都超限时各自被夹住，合成结果就崩了——
    // 表现为超过 3355 万 px 之后滚动被量化成按项跳（offset 每 +20px 画面完全不动）。
    //
    // 现在每一段只带自己的**残差**（`该段的文档位置 - offset`），残差最大也就
    // 一屏多一点，永远碰不到上限，于是那个天花板整个消失。
    this._scrollContentEl = document.createElement('div');
    applyStyle(
      this._scrollContentEl,
      'position:absolute; top:0; left:0; width:100%; height:0;',
    );
    this._clientEl.appendChild(this._scrollContentEl);

    /** 参与滚动的内容都挂在这一层，各自绝对定位 + 自带残差 transform */
    const flowEl = this._scrollContentEl;
    const sectionStyle = horizontal
      ? 'position:absolute; top:0; bottom:0; left:0; will-change:transform;'
      : 'position:absolute; left:0; right:0; top:0; will-change:transform;';

    if (this._options.renderStickyHeader) {
      this._stickyHeaderEl = document.createElement('div');
      this._stickyHeaderEl.dataset.id = 'stickyHeader';
      if (this._options.stickyHeaderClass) {
        applyClass(this._stickyHeaderEl, this._options.stickyHeaderClass);
      }
      applyStyle(
        this._stickyHeaderEl,
        mergeStyles(
          // position:sticky 的粘附由原生滚动驱动，overflow:hidden 下它永远
          // 不会触发，只能改成相对视口的绝对定位
          'position: absolute; z-index: 10; left: 0; right: 0;',
          horizontal ? 'left: 0' : 'top: 0',
          this._options.stickyHeaderStyle,
        ),
      );
      const sh = this._options.renderStickyHeader(this._stickyHeaderEl);
      if (sh) this._stickyHeaderEl.appendChild(sh);
      // 不需要占位块把吸顶区占的滚动空间还回内容流：各段的位置是**算**出来的，
      // stickyHeaderSize 直接计入 header / 列表 / footer 的文档位置
      this._clientEl.appendChild(this._stickyHeaderEl);
    }

    if (this._options.renderHeader) {
      this._headerEl = document.createElement('div');
      this._headerEl.dataset.id = 'header';
      if (this._options.headerClass) {
        applyClass(this._headerEl, this._options.headerClass);
      }
      applyStyle(
        this._headerEl,
        mergeStyles(sectionStyle, this._options.headerStyle),
      );
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

    // listEl 不撑开滚动空间（height:0），列表项统一由 itemsEl 用 transform 定位
    this._itemHostEl = document.createElement('div');
    this._listEl.appendChild(this._itemHostEl);

    flowEl.appendChild(this._listEl);

    if (this._options.renderFooter) {
      this._footerEl = document.createElement('div');
      this._footerEl.dataset.id = 'footer';
      if (this._options.footerClass) {
        applyClass(this._footerEl, this._options.footerClass);
      }
      applyStyle(
        this._footerEl,
        mergeStyles(sectionStyle, this._options.footerStyle),
      );
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
          'position: absolute; z-index: 10; left: 0; right: 0;',
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
   * 把参与滚动的每一段摆到它该在的位置。
   *
   * 每段写入的都是**残差**：`该段的文档位置 - offset`。这样任何一个 transform 的
   * 位移量都不超过一屏多一点，永远碰不到浏览器对单个 transform 的位移上限
   * （Chrome 实测 33,554,400px）。
   *
   * 曾经的做法是「位移层整体 -offset + itemsEl 再 +virtualSize」，靠两者合成得到
   * 真实位置。那样每个 transform 都携带完整量级，超限时各自被夹住、合成崩掉，
   * 表现为超过 3355 万 px 后滚动被量化成按项跳。
   *
   * 由 offsetChange（滚动）与 _patch（区间/尺寸变化）共同驱动，两条路径都要走这里。
   */
  private _applyLayout(): void {
    if (!this._scrollContentEl) return;

    const { horizontal } = this._options;
    const offset = this._core.getOffset();
    const { virtualSize, listTotalSize } = this._core.state;
    const { stickyHeaderSize, headerSize } = this._core.slotSize;

    // 各段在「内容坐标系」里的位置。吸顶区不占内容流，但它在账本里占滚动空间
    // （getSlotSize 计入 stickyHeaderSize），所以后面各段都从它之后排起
    const headerTop = stickyHeaderSize;
    const listTop = headerTop + headerSize;

    const shift = (el: HTMLElement | null, docPos: number) => {
      if (!el) return;
      const d = docPos - offset;
      el.style.transform = horizontal
        ? `translate3d(${d}px, 0, 0)`
        : `translate3d(0, ${d}px, 0)`;
    };

    shift(this._headerEl, headerTop);
    // 渲染块的第一项在 virtualSize 处
    shift(this._itemHostEl, listTop + virtualSize);
    shift(this._footerEl, listTop + listTotalSize);

    this._scrollbar?.update();
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
    // 而那个任务会和下一次 move 抢 offset。修正只在松手时做一次。
    // 走 scrollFromUser 而非 scrollToOffset，边界事件与自动续拉才会触发
    this._core.scrollFromUser(pos.top + frac * pos.current);
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
        // 用 ?? 而非 ||：0 是「常驻」的合法取值，不能被当成缺省
        autoHideDelay:
          this._options.scrollbarAutoHide ??
          DEFAULT_DOM_OPTIONS.scrollbarAutoHide,
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
        // 用户输入必须走 scrollFromUser：只有它会触发 toTop / toBottom 判定
        // 与自动续拉。走 scrollToOffset（程序化路径）的话，滚轮滚到底也不会
        // 触发 loadMore —— 无限加载会整个失效
        scrollBy: (delta) =>
          this._core.scrollFromUser(this._core.getOffset() + delta),
        scrollTo: (offset) => this._core.scrollFromUser(offset),
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
   * 1. 更新各段的 transform 位移
   * 2. 移除不再可见的项（key 不在新列表中）
   * 3. 对新列表中的每项：从 pool 取或新建 DOM，按顺序 insertBefore
   *
   * 关键优化：已在 pool 中的项不会重新 renderItem，仅调整 DOM 位置。
   * 这意味着如果同一 key 对应的数据内容变了（如 grid 的 row children），
   * 需要先 clearItemPool() 才能获得正确渲染。
   */
  private _patch(renderList: T[], reactiveData: ListState): void {
    const { itemKey, horizontal, listStyle, itemGap } = this._options;
    const { renderBegin } = reactiveData;

    const listStyleCSS = listStyle ? normalizeStyle(listStyle) : '';

    // 所有位移都用 transform 表达，没有任何元素的几何尺寸随列表长度增长。
    // listEl 收缩到 0，仅作为 itemsEl 的定位参照
    applyStyle(
      this._listEl,
      (horizontal ? 'width: 0;' : 'height: 0;') +
        ' position: absolute; top: 0; left: 0; right: 0;' +
        listStyleCSS,
    );
    if (horizontal) {
      this._itemHostEl.style.display = 'flex';
    }
    this._itemHostEl.style.willChange = 'transform';
    // 区间 / 尺寸变了，各段的文档位置随之改变，统一重新摆一次
    this._applyLayout();

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
        // listEl 高度为 0，撑不起 height:100% 的空状态；
        // 挂到视口容器上（它本身就是 position:relative），语义也更贴切
        this._clientEl.appendChild(this._emptyEl);
      }
      this._renderedKeys = [];
      return;
    }

    if (this._emptyEl) {
      this._emptyEl.remove();
      this._emptyEl = null;
    }

    // 按序插入/复用列表项，利用 insertBefore 保持 DOM 顺序。
    // 没有占位元素，直接从 itemsEl 开头排起
    let prevNode: ChildNode | null = null;
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

      const nextSibling: ChildNode | null = prevNode
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
