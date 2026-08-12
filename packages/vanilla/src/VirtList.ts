import { VirtListCore } from '@virt-list/core';
import type {
  ClassValue,
  ListState,
  ListUpdateReason,
  LoadState,
  VirtListDOMOptions,
  VirtListEvents,
  VirtScrollOptions,
} from '@virt-list/core';
import { DEFAULT_DOM_OPTIONS } from './defaults.js';
import {
  mergeStyles,
  applyClass,
  applyStyle,
  normalizeClass,
  normalizeStyle,
} from './utils.js';
import { Scrollbar } from './scrollbar/Scrollbar.js';
import { InputController } from './scrollbar/InputController.js';
import { positionToRatio, ratioToPosition } from './scrollbar/geometry.js';

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
  /** 已排了一次交叉轴视口校正，见 `_queueCrossViewportSync` */
  private _crossSyncQueued = false;
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

  /**
   * 滚动容器，**主轴**（虚拟化的那条轴）的视口。
   *
   * 它是 `overflow: hidden`，滚动位置归 JS 掌管，所以读写它的 `scrollTop` 没有意义
   * （`getOffset` / `scrollToOffset` 才是）。暴露它是为了那些只认 DOM 元素的场合：
   * 往真正的滚动容器上挂原生监听、量它的位置、交给第三方库。
   *
   * 想感知滚动请用 `scroll` 事件——挂在这上面的原生 `scroll` 监听收不到有用信息，
   * 浏览器为露出焦点元素而静默改动的 scrollTop 会被内部立刻归零。
   */
  get clientEl(): HTMLElement {
    return this._clientEl;
  }

  /** 列表容器（`.virt-list__list`，使用方的 `listClass` 追加在这个类名后面） */
  get listEl(): HTMLElement {
    return this._listEl;
  }

  /**
   * 内容层（`.virt-list__scroll-content`），同时是**交叉轴**的滚动容器
   * （竖向列表的横向、横向列表的竖向）。
   *
   * 各段（含吸顶 / 吸底）都在它下面，主轴的位移由各段自己的 transform 表达，
   * 它自己在主轴上不动。交叉轴则是货真价实的原生滚动：读写它的
   * `scrollLeft`（横向列表读 `scrollTop`）就是读写横向滚动位置。
   *
   * 想回到「两轴全裁切」，把 `crossScroll` 关掉，或直接
   * `scrollContentEl.style.overflowX = 'hidden'`。
   */
  get scrollContentEl(): HTMLElement {
    return this._scrollContentEl;
  }

  /**
   * 列表项的直接父节点（`.virt-list__items`）。
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
      update: (renderList, state, reason) => {
        if (this._domReady) {
          this._patch(renderList, state, reason);
        }
        externalEvents?.update?.(renderList, state, reason);
      },
      loadStateChange: (loadState) => {
        this._rerenderLoadSlots(loadState);
        externalEvents?.loadStateChange?.(loadState);
      },
    };

    this._core = new VirtListCore<T>(options, events);
    this._buildDOM();
    // 必须在首帧 _patch 之前：_applyLayout 从账本里的 stickyHeaderSize 排起，
    // 而下面 observeSlotEl 装的 ResizeObserver 是异步的，此刻账本里还是 0
    this._syncSlotSizes();
    this._domReady = true;
    // 首帧池子是空的，每一项都会走新建分支，标 'list' 只是语义上的实话
    this._patch(this._core.renderList, this._core.state, 'list');
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

    // 首帧内容一渲染出来，交叉轴的原生滚动条就可能已经出现了，视口随之矮一条
    this._queueCrossViewportSync();
  }

  /**
   * 把四个插槽**当下量到的**尺寸同步进 core 的账本。
   *
   * 插槽尺寸平时由 core 的 ResizeObserver 维护，但 RO 是异步的：构造期
   * `_buildDOM()` → `_patch()` → `_applyLayout()` 这一串全在第一次 RO 回调之前跑完，
   * 那时 `stickyHeaderSize` 还是 0，于是首帧各段整体上移一个吸顶高度 —— 第一项正好
   * 躲在吸顶区背后。`bindDOM()` 里的首屏定位（`initialPosition: 'bottom'` /
   * `scrollIntoView` 的 `align: 'end'` 都要扣掉吸顶高度）同样早于 RO。
   *
   * DOM 刚建好，`offsetHeight` 是同步可读的，所以这里直接报给账本，
   * 首帧就不需要等那一拍。RO 之后报来同样的值是空操作（见 core 的 `_writeSlotSize`）。
   */
  private _syncSlotSizes(): void {
    const horizontal = !!this._options.horizontal;
    const measure = (el: HTMLElement | undefined | null): number =>
      !el ? 0 : horizontal ? el.offsetWidth : el.offsetHeight;
    this._core.setSlotSize('stickyHeader', measure(this._stickyHeaderEl));
    this._core.setSlotSize('stickyFooter', measure(this._stickyFooterEl));
    this._core.setSlotSize('header', measure(this._headerEl));
    this._core.setSlotSize('footer', measure(this._footerEl));
  }

  // ==================== 公共代理 API ====================

  scrollToIndex(index: number, options?: VirtScrollOptions): void {
    this._core.scrollToIndex(index, options);
    // 落位是同步的（core 通知 → _patch 建好 DOM），所以这里目标项已经在池子里了。
    // 平滑滚动是个例外：动画还没跑完，但焦点该立刻转移——朗读与视觉不必同步
    if (options?.focus) this._focusItem(index);
  }

  scrollIntoView(index: number, options?: VirtScrollOptions): void {
    this._core.scrollIntoView(index, options);
    if (options?.focus) this._focusItem(index);
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

  /**
   * 把内容重新摆到当前偏移量上。
   *
   * 用在容器被隐藏 / 重新挂载之后（keep-alive、`display:none` 切回来）：偏移量归 JS
   * 掌管，hide / show 不会把它弄丢，但 DOM 上的 transform 会被清掉，内容于是回到了
   * 原点。这里不改偏移量，只是让 DOM 层重新按它摆一次。
   *
   * 不要用 `scrollToOffset(getOffset())` 代替：值没变，写入会被跳过，
   * DOM 层收不到通知，就成了空操作。
   */
  resume(): void {
    this._core.resume();
  }

  /**
   * 当前滚动偏移量。
   *
   * 容器的 `scrollTop` 恒为 0（内容靠 transform 移动），读滚动位置必须走这里。
   */
  getOffset(): number {
    return this._core.getOffset();
  }

  /** 当前允许的最大偏移量，即 `getTotalSize() - clientSize`（不为负） */
  getMaxOffset(): number {
    return this._core.getMaxOffset();
  }

  /** 内容总尺寸（列表项 + 各插槽），对应原生语境的 `scrollHeight` */
  getTotalSize(): number {
    return this._core.getTotalSize();
  }

  /**
   * 给定偏移量落在第几项，是 `getItemPosByIndex(index).top` 的逆运算。
   *
   * 两个方向严格互逆，所以可以用来做「滑块位置 ↔ 列表项」的双向映射
   * （自绘滚动条正是这么算的）。
   */
  getIndexByOffset(offset: number): number {
    return this._core.getIndexByOffset(offset);
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

  /**
   * 重新渲染指定的项。
   *
   * 渲染池里已有的 key 不会重新执行 `renderItem`（只调整位置），这是增量 patch 的
   * 核心优化。代价是「数据变了但 key 没变」时得显式说一声——搜索高亮、
   * 折叠状态、选中态都属于这类。
   *
   * 不传 `keys` 等价于 `forceUpdate()`：重建全部可见项。传 `keys` 时只重建那几项，
   * 其余项的 DOM 原样保留——这才是它存在的理由。改一项的选中态而重建整屏，
   * 在长列表里是能看出来的开销。
   *
   * 传进来的 key 不在可见范围内时是空操作：那些项本来就没有 DOM，
   * 等它们滚进视口自然会按新数据渲染。
   */
  refreshItems(keys?: Array<string | number>): void {
    if (!keys) {
      this.forceUpdate();
      return;
    }

    let dropped = 0;
    for (const key of keys) {
      const k = String(key);
      const el = this._itemPool.get(k);
      if (!el) continue;
      this._core.resizeObserver?.unobserve(el);
      this._options.onItemUnmounted?.(el);
      el.remove();
      this._itemPool.delete(k);
      dropped += 1;
    }

    // 一项都没命中就不必触发重渲染。_renderedKeys 里残留的 key 是无害的：
    // 下一次 patch 的移除循环取不到元素会跳过，末尾又会整体重置
    if (dropped > 0) this._core.forceUpdate();
  }

  /** 容器角色：`aria` 传 true 时用 list，也可以指定 listbox */
  private _ariaRole(): 'list' | 'listbox' | null {
    const aria = this._options.aria;
    if (!aria) return null;
    return aria === true ? 'list' : aria;
  }

  private _applyAriaContainer(): void {
    const role = this._ariaRole();
    if (!role) return;
    if (this._itemHostEl.getAttribute('role') !== role) {
      this._itemHostEl.setAttribute('role', role);
    }
    const label = this._options.ariaLabel;
    if (label && this._itemHostEl.getAttribute('aria-label') !== label) {
      this._itemHostEl.setAttribute('aria-label', label);
    }
  }

  /**
   * 告诉辅助技术这一项**在整个数据里**的位置，而不是在 DOM 里的位置。
   *
   * 少了这两个属性，屏幕阅读器只能按 DOM 里的元素个数推断，
   * 三万条的列表会被朗读成「第 3 项，共 20 项」。
   */
  private _applyAriaItem(el: HTMLElement, index: number): void {
    const role = this._ariaRole();
    if (!role) return;

    const itemRole = role === 'listbox' ? 'option' : 'listitem';
    if (el.getAttribute('role') !== itemRole) el.setAttribute('role', itemRole);

    // aria-posinset 是 1-based
    const pos = String(index + 1);
    const size = String(this._options.list.length);
    if (el.getAttribute('aria-posinset') !== pos) {
      el.setAttribute('aria-posinset', pos);
    }
    if (el.getAttribute('aria-setsize') !== size) {
      el.setAttribute('aria-setsize', size);
    }
  }

  /**
   * 把键盘焦点移到某一项。
   *
   * `preventScroll` 不能省：焦点转移会让浏览器尝试把元素滚进视口，而这里的容器是
   * `overflow: hidden` + transform 定位，那一次原生滚动会把我们刚算好的位置顶歪。
   */
  private _focusItem(index: number): void {
    const item = this._options.list[index];
    if (!item) return;
    const el = this._itemPool.get(String(item[this._options.itemKey]));
    if (!el) return;

    // 补上 tabindex 才能接收编程式焦点。用 -1 而不是 0：项会被回收，
    // 把它们全塞进 Tab 序列会让键盘用户在列表里走不出去
    if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
    el.focus({ preventScroll: true });
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
   *   clientEl .virt-list__client (overflow:hidden; position:relative; touch-action:pan-x)
   *   ├─ scrollContentEl .virt-list__scroll-content ← 交叉轴的滚动层
   *   │     (inset:0; overflow-x:auto; overflow-y:hidden)
   *   │  ├─ stickyHeaderEl (position:absolute; top:0) ← sticky 依赖原生滚动，主轴上失效
   *   │  ├─ headerEl               ← 残差 stickyHeaderSize − offset
   *   │  ├─ listEl .virt-list__list (height:0)
   *   │  │  └─ itemsEl .virt-list__items  ← 残差 listTop + leadingSize − offset
   *   │  │     └─ [item elements...]
   *   │  ├─ footerEl               ← 残差 listTop + itemsTotalSize − offset
   *   │  └─ stickyFooterEl (position:absolute; bottom:0)
   *   └─ scrollbarEl └─ thumbEl    ← 留在滚动层**外面**
   *
   *   listTop = stickyHeaderSize + headerSize
   *
   * 三件事值得留意：
   *
   * - **没有占位元素**。吸顶区占的滚动空间不靠 spacer 还给内容流，各段的位置是
   *   **算**出来的（`stickyHeaderSize` 直接计入文档位置），最高的元素只有一屏。
   * - **平移在每一段上，不在公共父节点上**。每段只带自己的残差
   *   `该段的文档位置 − offset`，所以任何单个 transform 都碰不到浏览器的位移上限。
   *   详见 `_applyLayout`。
   * - **两条轴的滚动归属不同**。主轴（虚拟化的那条）归 JS，交叉轴归浏览器原生
   *   滚动，落在 `scrollContentEl` 上（理由见 `crossScroll` 选项）。自绘滚动条与
   *   空状态因此必须留在 `clientEl` 里：放进滚动层的话，横滚 400px 就把整条滚动条
   *   推出视口了（实测如此）。吸顶 / 吸底反过来要放**进**滚动层，表头才会跟着列横移。
   *
   * 没有任何元素的**几何尺寸**与列表长度相关，主轴的偏移都由 transform 表达。
   */
  private _buildDOM(): void {
    const { horizontal } = this._options;
    const crossScroll = this._options.crossScroll !== false;
    /**
     * 交叉轴方向上放行的原生 pan 手势。
     *
     * 不能再一律 `none`：主轴的触摸滚动由 InputController 接管（`touchmove` 里
     * preventDefault），交叉轴则要让浏览器自己滚。而 touch-action 沿祖先链**求交**，
     * 只在内层滚动层上写 pan-x、外层留 none 的话一样滚不动。
     */
    const touchAction = crossScroll ? (horizontal ? 'pan-y' : 'pan-x') : 'none';

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
    // touch-action 收窄到只放行交叉轴，是因为主轴的触摸滚动改由 InputController 接管。
    this._clientEl.tabIndex = 0;
    applyStyle(
      this._clientEl,
      'width:100%; height:100%; overflow:hidden; overflow-anchor:none;' +
        ` position:relative; touch-action:${touchAction};`,
    );

    // 参与滚动的各段都挂在这一层里，但**它在主轴上不平移**。
    //
    // 曾经的做法是让这一层整体 translate(-offset)、再让 itemsEl translate(+leadingSize)，
    // 两者的合成才是内容的真实位置。问题是浏览器对**单个** transform 的位移量有上限
    // （Chrome 实测 33,554,400px），两个都超限时各自被夹住，合成结果就崩了——
    // 表现为超过 3355 万 px 之后滚动被量化成按项跳（offset 每 +20px 画面完全不动）。
    //
    // 现在每一段只带自己的**残差**（`该段的文档位置 - offset`），残差最大也就
    // 一屏多一点，永远碰不到上限，于是那个天花板整个消失。
    //
    // 主轴的职责被抽空之后，这一层改去干另一件事：**当交叉轴的滚动容器**。
    // 它铺满视口（原来是 height:0 的空壳），交叉轴 `auto`、主轴 `hidden`。
    // 交叉轴上没有虚拟化、内容是完整的真实 DOM，原生滚动在那条轴上既安全又跟手。
    this._scrollContentEl = document.createElement('div');
    // 带上类名纯粹为了可读：DevTools 里这一层原来是个匿名 div，看不出它是干什么的。
    // 库自己的样式一行都不挂在类名上（全是 inline style），所以覆盖它不会影响布局
    this._scrollContentEl.className = 'virt-list__scroll-content';
    const crossOverflow = !crossScroll
      ? 'overflow:hidden;'
      : horizontal
        ? 'overflow-x:hidden; overflow-y:auto;'
        : 'overflow-x:auto; overflow-y:hidden;';
    applyStyle(
      this._scrollContentEl,
      // 用 top/right/bottom/left 而不是 inset 简写：jsdom 的 cssstyle 不认 inset，
      // 单测里读出来会是空串
      'position:absolute; top:0; right:0; bottom:0; left:0;' +
        // 主轴方向照样要显式关掉滚动锚定：这一层现在是真正的 scrollport 了，
        // 浏览器会在内容高度变化时悄悄改它的 scrollTop（且不派发 scroll 事件）
        ` ${crossOverflow} overflow-anchor:none; touch-action:${touchAction};`,
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
      //
      // 挂在滚动层**里面**：表格类用法的吸顶表头必须跟着列一起横移，否则一横滚
      // 表头就和列错位。想让插槽里的某块横向钉住，在插槽内包一层
      // `position:sticky; left:0`（冻结列的老办法，实测在 absolute 父级下同样生效），
      // 前提是插槽根真的跨满了内容宽度、sticky 才有可粘的余量 ——
      // 插槽默认只有一屏宽，需要的话自己给 stickyHeaderStyle 补 `width:max-content`。
      flowEl.appendChild(this._stickyHeaderEl);
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
    // 库的类名排在前面，使用方的 listClass 跟在后面 —— 不能只写后者：
    // applyClass 是整体覆盖，那样库的类名会被 listClass 顶掉
    applyClass(this._listEl, ['virt-list__list', this._options.listClass ?? '']);

    // listEl 不撑开滚动空间（height:0），列表项统一由 itemsEl 用 transform 定位
    this._itemHostEl = document.createElement('div');
    this._itemHostEl.className = 'virt-list__items';
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
      // 吸底区在账本里占的滚动空间由 maxOffset 自然涵盖（getSlotsTotalSize 已计入）。
      // 与吸顶区不同的是它还不影响任何一段的摆放位置：各段都排在吸顶区之后，
      // 吸底区在下方，`_applyLayout` 用不到它
      //
      // 同吸顶区，挂在滚动层里（跟着横滚）
      flowEl.appendChild(this._stickyFooterEl);
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
   * 曾经的做法是「位移层整体 -offset + itemsEl 再 +leadingSize」，靠两者合成得到
   * 真实位置。那样每个 transform 都携带完整量级，超限时各自被夹住、合成崩掉，
   * 表现为超过 3355 万 px 后滚动被量化成按项跳。
   *
   * 由 offsetChange（滚动）与 _patch（区间/尺寸变化）共同驱动，两条路径都要走这里。
   */
  private _applyLayout(): void {
    if (!this._scrollContentEl) return;

    const { horizontal } = this._options;
    const offset = this._core.getOffset();
    const { leadingSize, itemsTotalSize } = this._core.state;
    const { stickyHeaderSize, headerSize } = this._core.slotSize;

    // 各段在「内容坐标系」里的位置。吸顶区不占内容流，但它在账本里占滚动空间
    // （getSlotsTotalSize 计入 stickyHeaderSize），所以后面各段都从它之后排起
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
    // 渲染块的第一项在 leadingSize 处
    shift(this._itemHostEl, listTop + leadingSize);
    shift(this._footerEl, listTop + itemsTotalSize);

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
          this._options.scrollbarAutoHideDelay ??
          DEFAULT_DOM_OPTIONS.scrollbarAutoHideDelay,
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
      {
        keyboard: this._options.keyboard,
        crossEl:
          this._options.crossScroll !== false ? this._scrollContentEl : null,
      },
    );
  }

  /**
   * 把账本里的视口尺寸校正成滚动层的**真实**可视尺寸。
   *
   * 交叉轴出现原生滚动条时，它占的那一条（Windows / Linux 约 15px，macOS 的浮层
   * 滚动条是 0）不属于可视区，而 ResizeObserver 报的 borderBoxSize 含它。
   * 不校正的话 maxOffset 少算这么多，滚到底时最后十几像素永远压在横向滚动条底下。
   *
   * `clientHeight` / `clientWidth` 天生不含滚动条，正好是要的值。刻意不放进
   * `_applyLayout`（每帧都在跑，那里读几何量等于每帧强制一次布局）：滚动条的出现
   * 与消失只跟内容尺寸与容器尺寸有关，跟着 `list` / `force` / `size` 那几趟走就够了。
   */
  private _queueCrossViewportSync(): void {
    if (this._options.crossScroll === false) return;
    if (this._crossSyncQueued) return;
    this._crossSyncQueued = true;
    // 推到微任务里，而不是就地校正：调用点还在 `_patch` 的栈上，而 setClientSize
    // 会同步再发一次 update —— 就地做就成了 `_patch` 套 `_patch`。
    // 微任务仍落在同一帧内，用户看不出延迟
    Promise.resolve().then(() => {
      this._crossSyncQueued = false;
      this._syncCrossViewport();
    });
  }

  private _syncCrossViewport(): void {
    if (this._options.crossScroll === false) return;
    const el = this._scrollContentEl;
    if (!el) return;
    const inner = this._options.horizontal ? el.clientWidth : el.clientHeight;
    // jsdom 里没有布局，一切几何量都是 0 —— 那会把账本里 bindDOM 手工塞进去的
    // 视口尺寸清成 0，整个渲染区间跟着塌掉。0 一律视为"量不到"
    if (inner > 0) this._core.setClientSize(inner);
  }

  // ==================== 增量 DOM Patch ====================

  /**
   * 增量更新 DOM：
   * 1. 更新各段的 transform 位移
   * 2. 移除不再可见的项（key 不在新列表中）
   * 3. 对新列表中的每项：从 pool 取或新建 DOM，按顺序 insertBefore
   *
   * 关键优化：已在 pool 中的项不会重新 `renderItem`，仅调整 DOM 位置。
   *
   * 代价是「同一个 key 的数据内容变了」时内容会停在挂载那一刻。这一类由
   * `reason === 'list' | 'force'` 那一趟负责补：见下面的 `dataChanged`，
   * 它会带最新的 item / index 调 `updateItem`，并重算函数式的 itemStyle /
   * itemClass。滚动（`range`）与尺寸上报（`size`）不走这一步 —— 那是每帧都在发的，
   * 在那里重出内容等于把虚拟滚动的优化全还回去。
   */
  /** 求一项的 class（函数式 itemClass 每次按当下的 item / index 求值） */
  private _itemClassFor(item: T, index: number): ClassValue {
    const { itemClass } = this._options;
    return typeof itemClass === 'function'
      ? itemClass(item, index)
      : itemClass ?? '';
  }

  /** 写一项的 style：itemGap 折算出的内边距 + 用户的 itemStyle */
  private _applyItemStyle(el: HTMLElement, item: T, index: number): void {
    const { itemStyle, itemGap } = this._options;
    const gap = itemGap ?? 0;
    const baseStyle = gap > 0 ? `padding: ${gap / 2}px 0;` : '';
    const raw =
      typeof itemStyle === 'function' ? itemStyle(item, index) : itemStyle ?? '';
    applyStyle(el, baseStyle + normalizeStyle(raw));
  }

  private _patch(
    renderList: T[],
    listState: ListState,
    reason: ListUpdateReason,
  ): void {
    // itemGap 归 _applyItemStyle 读
    const { itemKey, horizontal, listStyle } = this._options;
    const { renderBegin } = listState;
    const dataChanged = reason === 'list' || reason === 'force';

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

    // 内容或容器尺寸变了，交叉轴的原生滚动条可能刚出现或刚消失，视口随之变化。
    // 刻意不含 'range'：那是滚动过程中每帧都在发的，而横向滚动条的存废与滚到哪
    // 没有关系
    if (dataChanged || reason === 'size') this._queueCrossViewportSync();

    this._applyAriaContainer();

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

        this._applyItemStyle(el, item, renderBegin + i);
        const customClass = this._itemClassFor(item, renderBegin + i);
        if (customClass) applyClass(el, customClass);

        const child = this._options.renderItem(item, renderBegin + i, el);
        if (child) el.appendChild(child);
        this._core.resizeObserver?.observe(el);
        this._options.onItemMounted?.(el);
        this._itemPool.set(key, el);
      } else if (dataChanged) {
        // 复用这一项，但数据可能已经不是挂载时那份了（不可变更新会给同一个 key
        // 换一个新对象），index 也可能变了（头部插入一页历史）。
        //
        // 函数式的 itemStyle / itemClass 是 (item, index) 的函数，两个入参都变了
        // 就必须重算 —— 此前它们只在新建分支求值，复用项会一直挂着旧结果。
        // 静态值不用管：重算得到的是同一个串，白写一次 DOM 属性。
        if (typeof this._options.itemStyle === 'function') {
          this._applyItemStyle(el, item, renderBegin + i);
        }
        if (typeof this._options.itemClass === 'function') {
          // 这里不能用 applyClass：它对空串是空操作，于是「class 从有到无」
          // 清不掉。item wrapper 上没有库自己加的 class，可以整体覆盖
          el.className = normalizeClass(this._itemClassFor(item, renderBegin + i));
        }
        this._options.updateItem?.(item, renderBegin + i, el);
      }

      // 每一轮都要更新：项被复用时它在整个列表里的序号可能已经变了
      // （头部插入一页历史，后面所有项的 posinset 都要跟着挪）
      this._applyAriaItem(el, renderBegin + i);

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
