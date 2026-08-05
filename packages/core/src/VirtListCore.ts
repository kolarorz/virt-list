/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ListState,
  LoadState,
  SlotSize,
  VirtListOptions,
  VirtListEvents,
  VirtScrollOptions,
  RequiredOptions,
} from './types';
import { DEFAULT_OPTIONS } from './types';
import { ChunkedSizeIndex } from './ChunkedSizeIndex';
import { ListLoader } from './ListLoader';

/** 平滑滚动动画的运行时状态 */
interface AnimState {
  /**
   * 动画阶段：
   * - approach：远距离预跳（把距离压缩到一屏级别），并等一帧让新区间完成渲染与测量
   * - running：真正的逐帧插值动画
   */
  phase: 'approach' | 'running';
  /** 当前帧的 rAF id */
  rafId: number;
  /** 首帧时间戳（由 rAF 回调参数赋值） */
  startTime: number | null;
  /** 动画起始偏移量 */
  from: number;
  /** 动画时长（ms） */
  duration: number;
  /** 目标偏移量的取值函数，每帧调用一次（不定高场景下目标会变化） */
  getTarget: () => number;
  /** 本次动画的逐帧穿越上限，缺省走 options.smoothMaxDistance */
  maxDistance?: number;
  onDone?: (canceled: boolean) => void;
  /** 用户滚动手势的中断监听器 */
  onInterrupt: () => void;
}

/**
 * 滚动锚点：视口顶部的参照项 + 视口落在该项内部的偏移。
 *
 * 这是"内容不跳动"的不变量——参照项自身尺寸稳定（已实测），只要它上方的项
 * 尺寸变化，就重新求解一次 scrollOffset 让它回到原位。相比"算出位移量再补偿"，
 * 求解不变量是幂等的：重复应用没有副作用，也不需要判断收敛。
 */
interface ScrollAnchor {
  /** 参照项的 itemKey 值，用于校验 index 是否仍指向同一项 */
  key: string;
  /** 参照项在 list 中的索引 */
  index: number;
  /** 捕获时 scrollOffset 与参照项 top 的差值 */
  offset: number;
}

/**
 * 顶部 / 底部渐进修正的最大重试次数。
 *
 * 纯防御用：正常情况下几次回调内目标就稳定了，这里只保证 getTarget 永远不收敛时
 * （例如外部持续在改列表）不会无限重试下去。
 */
const EDGE_FIX_MAX_ATTEMPTS = 30;

/**
 * 增量搜索 inViewBegin 时允许的最大步数。
 *
 * 稳态滚动每帧只跨越几项，增量搜索是 O(1) 级的，比走索引更快；
 * 但一次性大跳（scrollToBottom、End 键、拖动滚动条到底）会跨越成千上万项。
 * 超过这个步数就改用分块索引定位，把最坏情况从 O(跨越项数) 压到 O(√n)。
 */
const MAX_INCREMENTAL_STEPS = 64;

/**
 * 头部结构变化的最大扫描项数。
 *
 * 分页加载一次进出的量级是几十到几百项，2048 足够覆盖；超出这个范围的头部改动
 * 更可能是整体换数据源，那种情况本就不该维持视口位置，按普通更新处理即可。
 * 上界的意义是保证 _diffHead 与列表长度无关，不会在 30w 列表上退化成 O(n)。
 */
const HEAD_SCAN_LIMIT = 2048;

/** easeOutCubic：起步快、收尾慢，贴近原生 smooth 的手感 */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * 虚拟列表核心引擎（框架无关）。
 *
 * 职责：
 * - 维护滚动状态（offset、inViewBegin/End、renderBegin/End）
 * - 管理每项的实测尺寸（sizesMap）与总尺寸计算
 * - 通过 ResizeObserver 监听容器和列表项的尺寸变化
 * - 根据滚动方向（forward/backward）计算可视区间，并在区间变化时通知上层
 *
 * 该类不直接操作 DOM，由 VirtList 负责 DOM 构建与增量 patch。
 */
export class VirtListCore<T extends Record<string, any>> {
  /** 响应式状态，驱动上层渲染 */
  readonly state: ListState;
  /** 各插槽区域的尺寸 */
  readonly slotSize: SlotSize;
  /** 列表项 key → 实测尺寸 的映射，未测量项回退到 itemPreSize + itemGap */
  readonly sizesMap: Map<string, number> = new Map();

  /** 当前滚动偏移量（内部状态，不驱动 UI 渲染） */
  private _offset = 0;
  /** 向上方向的缓冲项数 */
  private _bufferTop = 0;
  /** 向下方向的缓冲项数 */
  private _bufferBottom = 0;

  /** 当前需要渲染的列表项子集 */
  private _renderList: T[] = [];
  /**
   * 渲染窗口内 key → 索引。两个用途：
   * - 判断尺寸上报是否来自渲染窗口之外（窗口外意味着增量维护的值失效）
   * - ResizeObserver 只给得到 key，而分块索引的增量更新需要索引
   */
  private _renderKeys: Map<string, number> = new Map();
  /**
   * 分块尺寸索引，把「前缀和」与「按偏移定位」从 O(n) 降到 O(√n)。
   * fixed 模式与「尚无任何实测尺寸」时都走乘除法，不经过它。
   */
  private _sizeIndex: ChunkedSizeIndex;
  /**
   * 增量维护的 virtualSize 是否已失效。
   *
   * virtualSize 只统计 renderBegin 之前的项，正常情况下被观察的项都在渲染窗口内，
   * 它们的尺寸变化不影响 virtualSize。但窗口之外的项若上报了尺寸（例如
   * addedList2Top 插入的项还没进入窗口就完成测量），这个增量值就不再可信。
   */
  private _virtualSizeDirty = false;
  /** 经 Proxy 封装的配置项，访问时自动回退到 DEFAULT_OPTIONS */
  private _props: RequiredOptions<T>;

  /*
   * 以下三个字段是 _props 中高频配置的快照。
   *
   * _props 是 Proxy，每次属性读取都要走 get 陷阱（两次 Reflect.get）。
   * getItemSize 是全 core 最热的函数——一次全量遍历 30w 列表就要调 30w 次，
   * 而它原本每次调用都要读 fixed / itemPreSize / itemGap 三个属性。实测
   * 30w 遍历从 13.0ms 降到 2.6ms，差 5 倍。
   *
   * 快照由 _syncHotOptions() 统一刷新，updateOptions 是配置变更的唯一入口。
   */
  /** itemPreSize + itemGap，即未测量项的占位尺寸 */
  private _unitSize = 0;
  private _fixed = false;
  /** 滚动偏移对应的 DOM 属性名 */
  private _offsetKey: 'scrollTop' | 'scrollLeft' = 'scrollTop';
  /** 事件回调集合 */
  private _events: VirtListEvents<T>;
  /**
   * 当前滚动方向：
   * - forward：向上/向左滚动
   * - backward：向下/向右滚动
   */
  private _direction: 'forward' | 'backward' = 'backward';
  /** 当前滚动锚点，null 表示没有需要维持的视口参照 */
  private _anchor: ScrollAnchor | null = null;
  /** 正在应用锚点修正的窗口，用于把程序化滚动与用户滚动区分开 */
  private _applyingAnchor = false;
  /** 程序化滚动窗口：这期间回送的 scroll 事件不算用户操作 */
  private _programmaticScroll = false;
  /** 关闭 _programmaticScroll 窗口的 rAF 句柄 */
  private _programmaticRafId: number | null = null;
  /** 最近一次程序化写入后的真实偏移量（浏览器 clamp 之后的值） */
  private _lastProgrammaticOffset = -1;
  /** 关闭 _applyingAnchor 窗口的 rAF 句柄 */
  private _anchorWindowRafId: number | null = null;
  /** 滚动定位的渐进修正回调，每次 ResizeObserver 触发时执行 */
  private _fixTaskFn: (() => void) | null = null;
  /** 顶部/底部渐进修正的 rAF 兜底句柄，null 表示当前没有排队 */
  private _edgeFixRafId: number | null = null;
  /** 进行中的平滑滚动动画，null 表示当前没有动画 */
  private _anim: AnimState | null = null;
  /** 首次渲染完成标记，用于首帧后重新校准区间 */
  private _isInit = false;
  /**
   * 上一次列表的头部 key 快照（至多 HEAD_SCAN_LIMIT 项）。
   *
   * 头部增删是唯一会整体推移后续内容的结构变化，识别它需要"变化前的头部长什么样"。
   * 只留头部是因为尾部增删不影响视口位置，不必为此拷一份全量 key。
   */
  private _prevHeadKeys: string[] = [];
  /** 上一次列表的长度，用于识别尾部追加（贴底跟随） */
  private _prevLen = 0;
  /** 是否已有可比对的列表快照（首次装载时无从比对） */
  private _hasListSnapshot = false;
  /** 列表变更计数，作为"同一次变更"的标识 */
  private _listVersion = 0;
  /** 已由 _onListChange 自动补偿过位移的列表版本号 */
  private _autoFixedVersion = -1;
  /** 最近一次列表变更是否为尾部追加（头部未动且变长） */
  private _lastChangeWasAppend = false;
  /**
   * 上一次列表变更时的总尺寸。
   *
   * 贴底跟随必须知道"变更之前是否贴底"，而变更后 totalSize 已经变大了。
   * 尾部追加不会改动浏览器的 scrollTop，所以拿变更前的总尺寸配当前偏移量，
   * 就能准确还原变更前的贴底状态，不必额外维护一份易失同步的标志位。
   */
  private _prevTotalSize = 0;
  /** 分页 / 无限加载状态机 */
  private _loader: ListLoader;
  /** 绑定的滚动容器 DOM */
  private _clientEl: HTMLElement | null = null;
  private _resizeObserver: ResizeObserver | undefined;
  private _boundOnScroll: (e: Event) => void;

  get renderList(): T[] {
    return this._renderList;
  }

  get resizeObserver(): ResizeObserver | undefined {
    return this._resizeObserver;
  }

  get props(): RequiredOptions<T> {
    return this._props;
  }

  constructor(
    options: VirtListOptions<T>,
    events: VirtListEvents<T> = {},
  ) {
    this._events = events;
    this._boundOnScroll = this._onScroll.bind(this);

    // 使用 Proxy 使未显式设置的选项自动回退到默认值
    this._props = new Proxy(options as RequiredOptions<T>, {
      get(target, key) {
        return (
          Reflect.get(target, key) ?? Reflect.get(DEFAULT_OPTIONS, key)
        );
      },
    }) as RequiredOptions<T>;

    this.slotSize = {
      clientSize: 0,
      headerSize: 0,
      footerSize: 0,
      stickyHeaderSize: 0,
      stickyFooterSize: 0,
    };

    this.state = {
      listTotalSize: 0,
      virtualSize: 0,
      inViewBegin: 0,
      inViewEnd: 0,
      renderBegin: 0,
      renderEnd: 0,
    };

    this._sizeIndex = new ChunkedSizeIndex((index) => {
      const { itemKey, list } = this._props;
      return this.getItemSize(list[index]?.[itemKey]);
    });

    this._loader = new ListLoader(
      {
        getOffset: () => this.getOffset(),
        getTotalSize: () => this.getTotalSize(),
        getClientSize: () => this.slotSize.clientSize,
        getListLength: () => this._props.list.length,
        getEdgeThreshold: () => this._edgeThreshold(),
        scrollToBottom: () => this.scrollToBottom(),
      },
      () => this._props.loadMore,
      (loadState) => this._events.loadStateChange?.(loadState),
      // 初始值走构造参数：建好之后再 setHasMore 会立刻发一次通知，而那时使用方的
      // `const vl = new VirtList(...)` 还没赋值完，回调里碰到 vl 就是 TDZ 错误
      {
        hasMoreTop: options.hasMoreTop,
        hasMoreBottom: options.hasMoreBottom,
      },
    );

    this._syncHotOptions();
    this._initBuffer();
    this._initResizeObserver();
    this._onListChange();
  }

  /** 判定触达顶部 / 底部的容差，与 toTop / toBottom 的触发边界一致 */
  private _edgeThreshold(): number {
    return Math.max(this._props.scrollDistance, 2);
  }

  /**
   * 判定"贴底"的容差。
   *
   * 与 _edgeThreshold 分开：贴底跟随往往需要比加载触发更宽松的容差
   * （差几像素也该算贴底），但放宽它不应该连带改变 toTop / toBottom 的时机。
   */
  private _stickyThresholdPx(): number {
    return Math.max(
      this._props.stickyThreshold || this._props.scrollDistance,
      2,
    );
  }

  /**
   * [0, index) 的尺寸总和，即第 index 项的顶部偏移（不含 header）。
   *
   * 均匀尺寸下是一次乘法；否则交给分块索引，O(√n) 而非 O(index)。
   */
  private _prefixSize(index: number): number {
    if (index <= 0) return 0;
    if (this._fixed || this.sizesMap.size === 0) {
      return index * this._unitSize;
    }
    return this._sizeIndex.prefix(index);
  }

  /** 定位偏移量落在第几项，同样在均匀尺寸下退化为一次除法 */
  private _locateIndex(offset: number): number {
    const last = Math.max(0, this._props.list.length - 1);
    if (offset <= 0) return 0;
    if (this._fixed || this.sizesMap.size === 0) {
      return Math.min(Math.floor(offset / this._unitSize), last);
    }
    return Math.min(this._sizeIndex.locate(offset).index, last);
  }

  /** 刷新高频配置的快照，见字段处说明 */
  private _syncHotOptions(): void {
    this._unitSize = this._props.itemPreSize + this._props.itemGap;
    this._fixed = this._props.fixed;
    this._offsetKey = this._props.horizontal ? 'scrollLeft' : 'scrollTop';
  }

  // ==================== 公共 API ====================

  /** 获取当前滚动偏移量 */
  getOffset(): number {
    return this._clientEl ? this._clientEl[this._offsetKey] : 0;
  }

  /** 获取所有插槽（header + footer + sticky）的尺寸总和 */
  getSlotSize(): number {
    return (
      this.slotSize.headerSize +
      this.slotSize.footerSize +
      this.slotSize.stickyHeaderSize +
      this.slotSize.stickyFooterSize
    );
  }

  /** 获取列表总尺寸（列表项 + 插槽） */
  getTotalSize(): number {
    return this.state.listTotalSize + this.getSlotSize();
  }

  /** 获取指定 key 对应项的尺寸，未测量则返回 itemPreSize + itemGap */
  getItemSize(itemKey: string): number {
    if (this._fixed) return this._unitSize;
    return this.sizesMap.get(String(itemKey)) ?? this._unitSize;
  }

  setItemSize(itemKey: string, size: number): void {
    this.sizesMap.set(String(itemKey), size);
    // 外部改写无法定位到具体的块，只能整体废弃索引（下次查询时惰性重建）
    this._sizeIndex.invalidate();
  }

  deleteItemSize(itemKey: string): void {
    this.sizesMap.delete(String(itemKey));
    this._sizeIndex.invalidate();
  }

  /** 获取指定索引项的位置信息（相对于列表顶部的 top/bottom） */
  getItemPosByIndex(index: number): {
    top: number;
    current: number;
    bottom: number;
  } {
    if (this._fixed) {
      const unitSize = this._unitSize;
      return {
        top: unitSize * index,
        current: unitSize,
        bottom: unitSize * (index + 1),
      };
    }

    const { itemKey, list } = this._props;
    const top = this.slotSize.headerSize + this._prefixSize(index);
    const current = this.getItemSize(list[index]?.[itemKey]);
    return { top, current, bottom: top + current };
  }

  /** 滚动到指定偏移量（用户主动调用，取消所有待执行的自动修正） */
  scrollToOffset(offset: number, options?: VirtScrollOptions): void {
    this._clearScrollTasks();

    if (options?.behavior === 'smooth') {
      this._animateTo(
        () => offset,
        this._getDuration(options),
        options.onDone,
        options.maxDistance,
      );
      return;
    }

    this._setScrollOffset(offset);
    this._syncOffsetAndRange();
    options?.onDone?.(false);
  }

  /**
   * 滚动到指定索引项。
   * 由于不定高场景下尺寸可能在渲染后变化，采用渐进修正策略：
   * 每次 ResizeObserver 回调后重新计算目标偏移并修正，直到稳定。
   *
   * smooth 模式下动画期间不挂修正任务（否则会与动画互相抢夺 scrollOffset），
   * 待动画正常结束后再挂上，用于精确落位。
   */
  scrollToIndex(index: number, options?: VirtScrollOptions): void {
    if (index < 0) return;
    // 末项交给 scrollToBottom：它的目标就是"贴到底"，两种对齐在那里没有分别
    if (index >= this._props.list.length - 1) {
      this.scrollToBottom(options);
      return;
    }

    const align = options?.align ?? 'start';

    if (options?.behavior === 'smooth') {
      this._clearScrollTasks();
      // getTarget 每帧都会被调用，start 对齐要走 _getTopByIndex：
      // 预跳之后目标项就在渲染窗口内，不能每帧付一次 O(index) 的累加
      this._animateTo(
        () => this._getIndexScrollTarget(index, align),
        this._getDuration(options),
        (canceled) => {
          if (!canceled) this._attachIndexFixTask(index, align);
          options.onDone?.(canceled);
        },
        options.maxDistance,
      );
      return;
    }

    this.scrollToOffset(this._getIndexScrollTarget(index, align));
    this._attachIndexFixTask(index, align);
    options?.onDone?.(false);
  }

  /** 将指定索引项滚动到可视区域内（如果已可见则不滚动） */
  scrollIntoView(index: number, options?: VirtScrollOptions): void {
    const { top: targetMin, current, bottom: targetMax } =
      this.getItemPosByIndex(index);
    const { clientSize, stickyHeaderSize } = this.slotSize;
    const offsetMin = this.getOffset();
    const offsetMax = offsetMin + clientSize;
    // 比视口还高的项无法完整放入，此时不做「贴边对齐」，交给下面的整项定位
    const fitsInViewport = current < clientSize;

    // 上边缘被截断：向上贴到项的顶部
    if (fitsInViewport && targetMin < offsetMin && offsetMin < targetMax) {
      this.scrollToOffset(targetMin, options);
      return;
    }
    // 下边缘被截断：向下贴到项的底部
    if (
      fitsInViewport &&
      targetMin + stickyHeaderSize < offsetMax &&
      offsetMax < targetMax + stickyHeaderSize
    ) {
      this.scrollToOffset(targetMax - clientSize + stickyHeaderSize, options);
      return;
    }
    // 完全在视口之外：直接定位到该项
    if (targetMin + stickyHeaderSize >= offsetMax || targetMax <= offsetMin) {
      this.scrollToIndex(index, options);
      return;
    }

    // 目标已完整可见，无需滚动，直接视为完成
    options?.onDone?.(false);
  }

  /** 滚动到顶部（渐进修正确保到达） */
  scrollToTop(options?: VirtScrollOptions): void {
    if (options?.behavior === 'smooth') {
      this._clearScrollTasks();
      this._animateTo(
        () => 0,
        this._getDuration(options),
        (canceled) => {
          // 动画正常结束后再做一次兜底校准，防止途中尺寸变化导致差几像素
          if (!canceled) this._attachTopFixTask();
          options.onDone?.(canceled);
        },
        options.maxDistance,
      );
      return;
    }

    this._clearScrollTasks();
    this._attachTopFixTask();
    options?.onDone?.(false);
  }

  /** 滚动到底部（渐进修正确保到达） */
  scrollToBottom(options?: VirtScrollOptions): void {
    if (options?.behavior === 'smooth') {
      this._clearScrollTasks();
      this._animateTo(
        // 同 _attachBottomFixTask：终点取浏览器的可滚动上限
        () => this._maxScrollOffset(),
        this._getDuration(options),
        (canceled) => {
          if (!canceled) this._attachBottomFixTask();
          options.onDone?.(canceled);
        },
        options.maxDistance,
      );
      return;
    }

    this._clearScrollTasks();
    this._attachBottomFixTask();
    options?.onDone?.(false);
  }

  /** 取消进行中的平滑滚动动画（若无动画则为空操作） */
  cancelScroll(): void {
    this._cancelAnim();
  }

  /** 手动指定渲染区间（跳过自动计算） */
  manualRender(newRenderBegin: number, newRenderEnd: number): void {
    this.state.renderBegin = newRenderBegin;
    this.state.renderEnd = newRenderEnd;

    // 区间由外部任意指定，与上一次没有连续性，直接全量重算 virtualSize
    this._setRenderList();
    this._updateTotalVirtualSize();
    this._notify();
  }

  /** 重置所有状态（列表清空时调用） */
  reset(): void {
    this._clearAnchor();
    this._offset = 0;
    this._direction = 'backward';
    this._virtualSizeDirty = false;
    this.state.listTotalSize = 0;
    this.state.virtualSize = 0;
    this.state.inViewBegin = 0;
    this.state.inViewEnd = 0;
    this.state.renderBegin = 0;
    this.state.renderEnd = 0;
    this.sizesMap.clear();
    this._sizeIndex.reset(0);
    // 尺寸与偏移都归零后，头部快照失去参照价值：拿它算出的补偿量必然是错的
    this._hasListSnapshot = false;
    this._prevHeadKeys = [];
    this._prevLen = 0;
    this._updateRenderRange();
  }

  /**
   * 本次列表变更的位移是否已由 _onListChange 自动补偿。
   *
   * 列表变更会自动补偿头部增删的位移，此时旧代码里的 addedList2Top /
   * deletedList2Top 调用必须短路，否则同一次变更被补两遍，视口会跳两倍距离。
   */
  private _isAutoFixed(): boolean {
    return this._autoFixedVersion === this._listVersion;
  }

  /**
   * 列表头部删除项后修正滚动位置，使视口内容保持不跳动。
   *
   * 头部增删现已由列表变更自动补偿，这个方法只在自动识别失败时才需要手动调用
   * （例如一次变更同时改动头部两端、或头部改动超过 HEAD_SCAN_LIMIT 项）。
   */
  deletedList2Top(deletedList: T[]): void {
    if (this._isAutoFixed()) return;
    this._calcListTotalSize();
    let deletedListSize = 0;
    for (const item of deletedList) {
      deletedListSize += this.getItemSize(item[this._props.itemKey]);
    }
    this._updateTotalVirtualSize();
    this._setScrollOffset(this._offset - deletedListSize);
    this._calcRange();
  }

  /**
   * 列表头部新增项后修正滚动位置，使视口内容保持不跳动。
   *
   * 同 deletedList2Top，头部增删现已自动补偿，这里只作为识别失败时的兜底。
   */
  addedList2Top(addedList: T[]): void {
    if (this._isAutoFixed()) return;
    this._calcListTotalSize();
    let addedListSize = 0;
    for (const item of addedList) {
      addedListSize += this.getItemSize(item[this._props.itemKey]);
    }
    this._updateTotalVirtualSize();
    this._setScrollOffset(this._offset + addedListSize);
    this._calcRange();
    // 头部插入的项尺寸多为估算值，先锚定当前顶部项，
    // 待新项测出真实尺寸后由 _applyAnchor 二次校正
    this._captureAnchor(this.state.inViewBegin);
  }

  /** 强制触发一次完整的重新计算与渲染更新 */
  forceUpdate(): void {
    this._calcListTotalSize();
    this._updateTotalVirtualSize();
    this._updateRange(this.state.inViewBegin);
    this._notify();
  }

  getState(): ListState {
    return this.state;
  }

  /** 增量更新配置项，自动触发列表/缓冲区重算 */
  updateOptions(partial: Partial<VirtListOptions<T>>): void {
    // 写入 Proxy 背后的原始对象
    Object.assign(this._props as unknown as Record<string, any>, partial);
    // 配置变更的唯一入口，快照必须在此同步
    this._syncHotOptions();

    // hasMore 可以当受控属性用（React 侧的常见写法），与 loadMore 的返回值双轨，
    // 后写入的一方生效。必须先于 list 落位：同一批更新里既给数据又标记
    // "这是最后一页"时，语义上后者应当立即生效，避免续拉多发一次请求
    if ('hasMoreTop' in partial) {
      this._loader.setHasMore('top', partial.hasMoreTop !== false);
    }
    if ('hasMoreBottom' in partial) {
      this._loader.setHasMore('bottom', partial.hasMoreBottom !== false);
    }

    if ('list' in partial) {
      this._onListChange();
    }

    if ('bufferTop' in partial || 'bufferBottom' in partial || 'buffer' in partial) {
      this._initBuffer();
    }
  }

  /** 获取当前的加载状态（loading / hasMore / pendingNew） */
  getLoadState(): LoadState {
    return this._loader.getState();
  }

  /** 绑定滚动容器 DOM，开始监听 scroll 和 resize 事件 */
  bindDOM(clientEl: HTMLElement): void {
    this._clientEl = clientEl;
    clientEl.addEventListener('scroll', this._boundOnScroll);
    this._resizeObserver?.observe(clientEl);

    if (this._props.start) {
      this.scrollToIndex(this._props.start);
    } else if (this._props.offset) {
      this.scrollToOffset(this._props.offset);
    } else if (this._props.initialPosition === 'bottom') {
      // scrollToBottom 自带渐进修正，不定高首屏也能稳定落到底部——
      // 这正是聊天室过去要靠「itemResize 里判一个 firstResize 布尔量」手写的事
      this.scrollToBottom();
    }

    // 初始数据可能为空或不足一屏，这两种情况都不会产生 scroll 事件。
    //
    // 推到微任务里执行：bindDOM 通常在构造函数或 onMounted 中同步调用，若此刻
    // 就回调出去，使用方 loadMore 闭包里引用的变量（组件实例、list 自身）
    // 可能还没完成赋值，拿到的是 undefined
    Promise.resolve().then(() => this._loader.checkAutoLoad());
  }

  /** 监听插槽元素的尺寸变化 */
  observeSlotEl(el: HTMLElement): void {
    this._resizeObserver?.observe(el);
  }

  unobserveSlotEl(el: HTMLElement): void {
    this._resizeObserver?.unobserve(el);
  }

  /** 恢复滚动位置（如 keep-alive 场景） */
  resume(): void {
    this.scrollToOffset(this._offset);
  }

  destroy(): void {
    this._loader.destroy();
    this._cancelAnim();
    this._cancelEdgeFix();
    this._clearAnchor();
    if (this._programmaticRafId !== null) {
      cancelAnimationFrame(this._programmaticRafId);
      this._programmaticRafId = null;
    }
    this._programmaticScroll = false;
    this._fixTaskFn = null;
    if (this._clientEl) {
      this._clientEl.removeEventListener('scroll', this._boundOnScroll);
      this._resizeObserver?.unobserve(this._clientEl);
      this.slotSize.clientSize = 0;
    }
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._clientEl = null;
  }

  // ==================== 私有方法 ====================

  /**
   * 设置 scrollTop / scrollLeft，并标记接下来回送的 scroll 事件属于程序化滚动。
   *
   * 这里是所有程序化滚动的唯一出口，用户拖动滚动条 / 滚轮不经过它——这个差别正是
   * `_onScroll` 用来判断"该不该放弃未完成的渐进修正"的依据。
   */
  private _setScrollOffset(offset: number): void {
    if (!this._clientEl) return;
    this._clientEl[this._offsetKey] = offset;
    // 读回浏览器 clamp 后的真实值：scroll 事件回送时拿它比对，才能认出
    // "这次滚动就是我们自己发起的那一次"
    this._lastProgrammaticOffset = this._clientEl[this._offsetKey];
    this._openProgrammaticWindow();
  }

  /**
   * 浏览器允许的最大滚动偏移量 —— "到底了没有"这件事的权威标准。
   *
   * 不能拿 `getTotalSize() - clientSize` 代替：那是列表自己的账本（靠
   * ResizeObserver 的上报增量维护），而 scrollHeight 由浏览器按实际盒模型算。
   * 两者在真实环境里必然会错开一点——亚像素、测量滞后、项的外边距，任一项都够。
   * 实测过差到 400 多 px 的情况：拿账本当上限就会把用户从底部硬拽回来，
   * 或者让"滚到底"的收敛判据提前成立。
   *
   * 没有绑定容器时只能退回账本。
   */
  private _maxScrollOffset(): number {
    const ledger = Math.max(
      0,
      this.getTotalSize() - this.slotSize.clientSize,
    );
    const dom = this._domMaxScroll();
    // 取较大者：账本偏矮时靠 DOM 兜住，DOM 尚未布局时靠账本兜住。
    // 目标偏大没有副作用——浏览器会把写入值裁到真正的上限
    return dom === null ? ledger : Math.max(dom, ledger);
  }

  /**
   * 浏览器给出的可滚动上限，拿不到布局信息时返回 null。
   *
   * scrollHeight 为 0 意味着还没布局（容器隐藏、或测试环境不做布局），
   * 这时它不能代表"不能滚动"，得让调用方退回账本。
   */
  private _domMaxScroll(): number | null {
    const el = this._clientEl;
    if (!el) return null;

    const value = this._props.horizontal
      ? el.scrollWidth - el.clientWidth
      : el.scrollHeight - el.clientHeight;
    return value > 0 ? value : null;
  }

  /** 是否已经滚到浏览器允许的最底部 —— 浏览器优先，拿不到才问账本 */
  private _isAtScrollEnd(): boolean {
    const dom = this._domMaxScroll();
    if (dom !== null) {
      return Math.abs(Math.round(this.getOffset()) - Math.round(dom)) <= 2;
    }

    const total = this.getTotalSize();
    // 内容不足一屏，本就无法滚动，视为已到位
    if (total <= this.slotSize.clientSize) return true;
    return (
      Math.abs(
        Math.round(this.getOffset() + this.slotSize.clientSize) -
          Math.round(total),
      ) <= 2
    );
  }

  /**
   * 把内部偏移量收回到当前可滚动范围内。
   *
   * 列表变短时浏览器自己也会夹 scrollTop，这里只是让内部状态在同一时刻就跟上，
   * 不必等异步回送的 scroll 事件。
   */
  private _clampOffsetToScrollRange(): boolean {
    const max = this._maxScrollOffset();
    if (this._offset <= max) return false;

    this._setScrollOffset(max);
    // 读回浏览器 clamp 后的真实值；没有容器时就用算出来的上限
    this._offset = this._clientEl ? this.getOffset() : max;
    return true;
  }

  /**
   * 程序化写入 scrollOffset 之后，把内部偏移量与渲染区间同步到新位置。
   *
   * 写 scrollTop 触发的 scroll 事件是浏览器**异步**回送的，在它到达之前内部偏移量
   * 还是旧值。若此间 ResizeObserver 先触发一轮（尺寸还在变时非常常见），区间就会
   * 按旧位置算出来——视口已经到了新位置，那里却没有渲染任何东西，表现为一片空白，
   * 直到下一次真实滚动把 scroll 事件送到才恢复。
   *
   * 之后回送的 scroll 事件会因为偏移量已经相等而直接返回，不会重复计算。
   */
  private _syncOffsetAndRange(): void {
    if (!this._clientEl) return;

    const real = this.getOffset();
    if (real === this._offset) return;

    // 方向按真实位移更新，否则后续的增量搜索会走错分支
    this._direction = real < this._offset ? 'forward' : 'backward';
    this._offset = real;

    // 程序化滚动表达的是"去某处"，不是"保持当前内容不动"。而 _calcRange 内部的
    // _updateRange 在起始项前移时会顺手立一个锚点——那是为用户向上滚动准备的。
    // 大跳时（scrollToTop 从列表底部回到 0）这个条件恰好成立，立下的锚点参照着
    // 跳之前那一段内容，随后 _applyAnchor 就把视口又拽回去了，于是停不到 0。
    // 这里把锚点还原成进来时的样子。
    const anchorBefore = this._anchor;
    this._calcRange();
    this._anchor = anchorBefore;
  }

  /**
   * 打开程序化滚动窗口，下一帧自动关闭。
   *
   * 写 scrollTop 触发的 scroll 事件是异步回送的，靠这个窗口把它和用户操作区分开。
   * 与 `_applyingAnchor` 是同一套手法。
   */
  private _openProgrammaticWindow(): void {
    if (typeof requestAnimationFrame === 'undefined') {
      // 没有 rAF 可用时无法延后关闭窗口，退化为不启用（宁可误判成用户滚动，
      // 也不能让窗口一直开着——那会让渐进修正永远清不掉）
      this._programmaticScroll = false;
      return;
    }

    this._programmaticScroll = true;
    if (this._programmaticRafId !== null) {
      cancelAnimationFrame(this._programmaticRafId);
    }
    this._programmaticRafId = requestAnimationFrame(() => {
      this._programmaticRafId = null;
      this._programmaticScroll = false;
    });
  }

  // -------------------- 滚动定位 / 平滑动画 --------------------

  /** 取消所有待执行的自动修正（用户主动发起滚动时调用） */
  private _clearScrollTasks(): void {
    this._cancelAnim();
    this._cancelEdgeFix();
    this._clearAnchor();
    this._fixTaskFn = null;
  }

  private _getDuration(options?: VirtScrollOptions): number {
    return options?.duration ?? this._props.scrollDuration;
  }

  /** 将偏移量限制在 [0, 可滚动最大值] 内 */
  private _clampOffset(offset: number): number {
    const max = Math.max(0, this.getTotalSize() - this.slotSize.clientSize);
    return Math.min(Math.max(offset, 0), max);
  }

  /**
   * 挂载 scrollToIndex 的渐进修正任务：
   * 每次 ResizeObserver 回调后重新计算目标偏移，直到两次结果一致。
   */
  /**
   * 求某一项在指定对齐方式下的目标滚动偏移量。
   *
   * - `start`：项顶部对齐视口顶部
   * - `end`：项底部对齐视口底部
   *
   * 用的都是列表项容器的边界，所以项内 padding 与 itemGap 自然计入，
   * 卡片之间的间隔会保留。
   */
  private _getIndexScrollTarget(
    index: number,
    align: 'start' | 'end',
  ): number {
    if (align === 'start') return this._getTopByIndex(index);

    // 项底部贴视口底部；吸顶区域压在视口上沿，可用高度要相应扣掉
    const bottom =
      this._getTopByIndex(index) +
      this.getItemSize(this._props.list[index]?.[this._props.itemKey]);
    return Math.max(
      0,
      bottom - this.slotSize.clientSize + this.slotSize.stickyHeaderSize,
    );
  }

  private _attachIndexFixTask(
    index: number,
    align: 'start' | 'end' = 'start',
  ): void {
    // 同样走 _getIndexScrollTarget：修正过程中目标项已在渲染窗口内，
    // start 对齐不必为每次 ResizeObserver 回调付一次 O(index) 的累加
    let lastOffset = -1;
    let first = true;
    let attempts = 0;

    const fixToIndex = () => {
      // 用户已经滚到别处了，这次定位不该再把他拽回来。
      //
      // 这条判断只在"定位到某个索引"上成立：目标是列表中间的某个位置，浏览器
      // 自己绝不会把 scrollTop 挪到那儿，所以偏移量变了必定是用户操作。
      // 滚到两端就不能这么判，见 _attachEdgeFixTask 开头的说明。
      if (!first && this.getOffset() !== this._lastProgrammaticOffset) {
        this._fixTaskFn = null;
        return;
      }

      const offset = this._getIndexScrollTarget(index, align);
      this._setScrollOffset(offset);
      this._syncOffsetAndRange();

      // 首次不判收敛，理由与 _attachEdgeFixTask 相同：发起滚动的那一刻目标项
      // 往往还在渲染窗口之外，尺寸只能按 itemPreSize 估。它渲染出来、真实尺寸
      // 上报之后目标就变了，此时必须还有人在修——所以至少要跑两轮。
      // attempts 上限纯防御，兜住"目标永远不收敛"（例如外部在持续改内容）
      if (!first && (lastOffset === offset || attempts >= EDGE_FIX_MAX_ATTEMPTS)) {
        this._fixTaskFn = null;
        return;
      }

      first = false;
      attempts += 1;
      lastOffset = offset;
      this._fixTaskFn = fixToIndex;
    };

    this._fixTaskFn = fixToIndex;
  }

  /**
   * 平滑滚动允许逐帧穿越的最大距离。
   *
   * 超过这个距离的部分会先瞬跳掉：虚拟列表逐帧穿越长距离时，每帧的渲染区间
   * 完全不重叠（每帧都要新建整屏 DOM），主线程跟不上就会露白，
   * 而中间那些一闪而过的内容本身也没有观看价值。
   */
  private _getApproachDistance(perCall?: number): number {
    if (typeof perCall === 'number' && perCall > 0) return perCall;
    const explicit = this._props.smoothMaxDistance;
    if (typeof explicit === 'number' && explicit > 0) return explicit;
    const viewport =
      this.slotSize.clientSize ||
      (this._props.itemPreSize + this._props.itemGap) * 10;
    return viewport * 2;
  }

  /**
   * 以 rAF 动画滚动到目标偏移量。
   *
   * 不使用原生 `scrollTo({ behavior: 'smooth' })` 的原因：
   * 不定高列表在滚动途中会渲染出新项、目标偏移量随之变化，需要每帧重新取值；
   * 原生 smooth 无法中途改目标，且会被 scrollTop 赋值直接打断。
   *
   * 动画分两个阶段：
   * 1. approach：距离超过 smoothMaxDistance 时先瞬跳到目标附近，并等一帧让
   *    新区间完成渲染和尺寸测量，避免带着一堆错误估算进入动画；
   * 2. running：在最后一段短距离内逐帧插值，此时相邻帧的渲染区间高度重叠，
   *    DOM 可复用、尺寸已实测，不会露白。
   */
  private _animateTo(
    getTarget: () => number,
    duration: number,
    onDone?: (canceled: boolean) => void,
    maxDistance?: number,
  ): void {
    if (!this._clientEl || !(duration > 0)) {
      this._setScrollOffset(this._clampOffset(getTarget()));
      onDone?.(false);
      return;
    }

    const onInterrupt = () => this._cancelAnim();
    this._clientEl.addEventListener('wheel', onInterrupt, { passive: true });
    this._clientEl.addEventListener('touchstart', onInterrupt, {
      passive: true,
    });

    const step = (timestamp: number) => {
      const anim = this._anim;
      if (!anim) return;

      // ---------- approach 阶段 ----------
      if (anim.phase === 'approach') {
        const from = this.getOffset();
        const target = this._clampOffset(anim.getTarget());
        const maxDistance = this._getApproachDistance(anim.maxDistance);

        if (Math.abs(target - from) > maxDistance) {
          // 预跳到"目标前 maxDistance"处，本帧同步完成渲染，下一帧尺寸已测量
          this._setScrollOffset(
            target > from ? target - maxDistance : target + maxDistance,
          );
          anim.phase = 'running';
          anim.rafId = requestAnimationFrame(step);
          return;
        }

        // 距离本来就不远，直接进入动画
        anim.phase = 'running';
      }

      // ---------- running 阶段 ----------
      if (anim.startTime === null) {
        anim.startTime = timestamp;
        // 起点在 approach 之后才确定
        anim.from = this.getOffset();
      }

      const t = Math.min(1, (timestamp - anim.startTime) / anim.duration);
      const target = this._clampOffset(anim.getTarget());

      if (t >= 1) {
        this._setScrollOffset(target);
        this._finishAnim(false);
        return;
      }

      this._setScrollOffset(anim.from + (target - anim.from) * easeOutCubic(t));
      anim.rafId = requestAnimationFrame(step);
    };

    this._anim = {
      phase: 'approach',
      rafId: requestAnimationFrame(step),
      startTime: null,
      from: this.getOffset(),
      duration,
      getTarget,
      maxDistance,
      onDone,
      onInterrupt,
    };
  }

  /** 结束动画：清理 rAF、解绑中断监听并回调 onDone */
  private _finishAnim(canceled: boolean): void {
    const anim = this._anim;
    if (!anim) return;

    this._anim = null;
    cancelAnimationFrame(anim.rafId);
    this._clientEl?.removeEventListener('wheel', anim.onInterrupt);
    this._clientEl?.removeEventListener('touchstart', anim.onInterrupt);
    anim.onDone?.(canceled);
  }

  private _cancelAnim(): void {
    this._finishAnim(true);
  }

  /** 滚动到顶部的渐进校准（不定高场景下一次赋值可能不到位） */
  private _attachTopFixTask(): void {
    this._attachEdgeFixTask(
      () => 0,
      () => {
        const key = this._props.horizontal ? 'scrollLeft' : 'scrollTop';
        return !this._clientEl || this._clientEl[key] === 0;
      },
    );
  }

  /** 滚动到底部的渐进校准 */
  private _attachBottomFixTask(): void {
    // 目标与判据都问浏览器（见 _maxScrollOffset / _isAtScrollEnd）。
    //
    // 曾经写的是"账本总高"这个偏大的值，指望浏览器把它裁到可滚动上限——但账本
    // 本身就可能比实际内容矮几百 px（增量维护 + 亚像素 + 测量滞后），那时写进去
    // 的值根本没超过真实上限，于是永远差最后几项到不了底。
    this._attachEdgeFixTask(
      () => this._maxScrollOffset(),
      () => this._isAtScrollEnd(),
    );
  }

  /**
   * 挂载顶部 / 底部的渐进修正任务。
   *
   * 不定高列表一次赋值往往到不了位：赋值 scrollTop 会渲染出新项，实测尺寸回填后
   * listTotalSize（或上方内容高度）随之改变，刚才算出的目标就失效了。
   *
   * 修正由两个信号驱动，都不猜时间：
   * - ResizeObserver 回调（`_fixTaskFn`，见 `_initResizeObserver`）：尺寸真的变了
   *   才重算，是主驱动，也是"到不了位"的根因信号；
   * - rAF 兜底：覆盖赋值后没有任何元素尺寸变化、ResizeObserver 不回调的情况。
   *
   * 重复赋值同一目标是幂等的，两条信号落在同一帧也没有副作用。
   */
  private _attachEdgeFixTask(
    getTarget: () => number,
    reached: () => boolean,
  ): void {
    let attempts = 0;
    let first = true;
    /** 上一轮的内容总高，用来判断内容是否还在长 */
    let lastTotal = -1;
    /** 连续几轮"到底且内容没长"了 */
    let settledRounds = 0;

    // 这里刻意不做"偏移量被改过就放弃"的判断（scrollToIndex 那边做了）。
    //
    // 滚到两端时浏览器会自己动 scrollTop：项测出来比 itemPreSize 矮，内容总高
    // 缩水，超出新上限的 scrollTop 就被浏览器收回去——这跟用户滚动长得一模一样。
    // 一旦误判成"用户接管"，轮询就停在离底几百 px 的地方了（2000 项停在 1995
    // 就是这么来的）。所以两端只认两个终止条件：到底了，或者试满次数。
    const step = (): void => {
      // 有新的平滑滚动接管时放弃兜底，避免抢夺 scrollOffset
      if (this._anim) {
        this._fixTaskFn = null;
        this._cancelEdgeFix();
        return;
      }

      // 光"这一刻到底了"不算数，还要内容不再长。
      //
      // 滚到底的过程中新项持续进入窗口、报上真实尺寸，内容总高一路变大，可滚动
      // 上限也跟着往后挪。某一轮 scrollTop 恰好等于**当时**的上限是常事，就此
      // 收手就会停在半路——内容长完之后没人再补那一截了。
      const total = this.getTotalSize();
      settledRounds = reached() && total === lastTotal ? settledRounds + 1 : 0;
      lastTotal = total;

      // 要连续两轮才算稳：测量天然滞后一轮——到底之后渲染窗口才定下来，新进窗口
      // 的项要等下一轮才报上尺寸。只看一轮的话，那一轮的"稳定"其实是假的，
      // 内容随后还会再长一截，而轮询已经散了（用户实测差了最后 4 项）
      const settled = settledRounds >= 2;

      // 首次无条件赋值：刚赋值时新项的测量还没回填，此刻判断会把"其实还差一屏"
      // 误判成已到底。attempts 上限纯防御，兜住内容永远长不完的情况
      if (!first && (settled || attempts >= EDGE_FIX_MAX_ATTEMPTS)) {
        this._fixTaskFn = null;
        this._cancelEdgeFix();
        return;
      }

      first = false;
      attempts += 1;
      this._setScrollOffset(getTarget());
      this._syncOffsetAndRange();
      this._fixTaskFn = step;
      this._scheduleEdgeFix(step);
    };

    step();
  }

  /** 为渐进修正排一次 rAF 兜底（同一时刻只保留一个） */
  private _scheduleEdgeFix(step: () => void): void {
    if (this._edgeFixRafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') return;

    this._edgeFixRafId = requestAnimationFrame(() => {
      this._edgeFixRafId = null;
      // 任务已完成或被新的滚动请求替换时不再插手
      if (this._fixTaskFn === step) step();
    });
  }

  private _cancelEdgeFix(): void {
    if (this._edgeFixRafId === null) return;
    cancelAnimationFrame(this._edgeFixRafId);
    this._edgeFixRafId = null;
  }

  // -------------------- 滚动锚点 --------------------

  /**
   * 获取指定项的 top，语义与 `getItemPosByIndex(index).top` 完全一致，
   * 但对渲染窗口内的项是 O(渲染项数) 而非 O(index)。
   *
   * 锚点的捕获与求解都在滚动热路径上（每次 ResizeObserver 回调至少一次），
   * 而不定高模式下 `getItemPosByIndex` 要从 0 累加到 index——30w 列表滚到中段
   * 单次就是十几万次查表，向上滚动时每帧多次，直接吃掉整个帧预算。
   *
   * 快路径复用增量维护的 `virtualSize`（= renderBegin 之前的累计尺寸），
   * 只累加窗口内的几十项，成本与列表长度无关。被观察的项都在窗口内，
   * 所以 ResizeObserver 期间 `virtualSize` 不会失效。
   */
  private _getTopByIndex(index: number): number {
    // fixed 模式本就是 O(1) 乘法，且不计 headerSize，语义交给原方法
    if (this._props.fixed) return this.getItemPosByIndex(index).top;

    // virtualSize 失效时先补一次全量重算（罕见），之后重新走快路径
    if (this._virtualSizeDirty) this._updateTotalVirtualSize();

    const { renderBegin, renderEnd } = this.state;
    if (index >= renderBegin && index <= renderEnd + 1) {
      return (
        this.slotSize.headerSize +
        this.state.virtualSize +
        this._getRangeSize(renderBegin, index)
      );
    }
    return this.getItemPosByIndex(index).top;
  }

  /**
   * 以 index 项为参照捕获锚点。
   * 参照项应当是已渲染测量过的项，否则它自身的尺寸也会变，锚点就不稳。
   */
  private _captureAnchor(index: number): void {
    const item = this._props.list[index];
    if (!item) {
      this._anchor = null;
      return;
    }

    this._anchor = {
      key: String(item[this._props.itemKey]),
      index,
      offset: this.getOffset() - this._getTopByIndex(index),
    };
  }

  /**
   * 重新求解 scrollOffset，使锚点参照项回到捕获时的视口位置。
   *
   * 与"算出 diff 再补偿"的区别：这里每次都从当前尺寸重新解一遍，
   * 所以重复调用幂等，也无需记录"是否已补偿过"。
   */
  private _applyAnchor(): void {
    const anchor = this._anchor;
    if (!anchor) return;

    // 参照项被移除或索引发生漂移，锚点不再可信
    const item = this._props.list[anchor.index];
    if (!item || String(item[this._props.itemKey]) !== anchor.key) {
      this._clearAnchor();
      return;
    }

    const target = this._getTopByIndex(anchor.index) + anchor.offset;
    const drift = target - this.getOffset();
    // 亚像素漂移人眼不可见，改了反而会打断用户滚动
    if (Math.abs(drift) < 0.5) return;

    if (this._anim) {
      // 动画进行中：内容整体位移了 drift，插值起点必须同步平移，否则下一帧会把
      // 视口拉回旧坐标，表现为内容跳动 / 露白。位置本身交给动画的下一帧，
      // 这里不写 scrollTop，免得和插值互相抢夺
      this._anim.from += drift;
      return;
    }

    this._applyingAnchor = true;
    this._setScrollOffset(target);

    // 必须在本帧内让内部状态跟上刚写进去的 scrollOffset，否则：
    // 1. 渲染区间要等下一个 scroll 事件才更新，而本帧的绘制已经用了新的
    //    scrollOffset —— 视口落在 virtualEl 的空白占位上，就是一帧露白；
    // 2. `_offset` 仍是修正前的旧值，下一个 scroll 事件会拿它判断方向，把
    //    「用户继续向上滚」误判成向下滚，`_calcRange` 走 backward 分支后
    //    直接 return，区间彻底不更新，露白从一帧变成持续。
    // 向上滚动时每次 ResizeObserver 回调都会走到这里，所以这两点会被放大成
    // 连续白屏，而不是偶发一帧。
    this._offset = this.getOffset();
    this._calcRange();

    this._closeAnchorWindowNextFrame();
  }

  /**
   * 下一帧关闭 _applyingAnchor 窗口。
   *
   * 写 scrollTop 会异步派发 scroll 事件，若不加窗口区分，锚点修正自己触发的
   * scroll 会被 _calcRange 当成"用户向下滚"而把锚点清掉，导致修正只生效一次。
   */
  private _closeAnchorWindowNextFrame(): void {
    if (typeof requestAnimationFrame === 'undefined') {
      this._applyingAnchor = false;
      return;
    }
    if (this._anchorWindowRafId !== null) {
      cancelAnimationFrame(this._anchorWindowRafId);
    }
    this._anchorWindowRafId = requestAnimationFrame(() => {
      this._anchorWindowRafId = null;
      this._applyingAnchor = false;
    });
  }

  private _clearAnchor(): void {
    this._anchor = null;
    this._applyingAnchor = false;
    if (this._anchorWindowRafId !== null) {
      cancelAnimationFrame(this._anchorWindowRafId);
      this._anchorWindowRafId = null;
    }
  }

  private _initBuffer(): void {
    this._bufferTop = this._props.bufferTop || this._props.buffer;
    this._bufferBottom = this._props.bufferBottom || this._props.buffer;
  }

  /**
   * 初始化 ResizeObserver，统一监听：
   * - 滚动容器（data-id="client"）→ 更新 clientSize，重算起始
   * - 插槽元素（header/footer/sticky）→ 更新对应 slotSize
   * - 列表项（data-id=itemKey）→ 更新 sizesMap，触发偏移修正
   */
  private _initResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver((entries) => {
      let diff = 0;
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.id;
        if (!id) continue;

        const oldSize = this.getItemSize(id);
        let newSize = 0;

        if (entry.borderBoxSize) {
          const boxSize = Array.isArray(entry.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry.borderBoxSize;
          newSize = this._props.horizontal
            ? boxSize.inlineSize
            : boxSize.blockSize;
        } else {
          newSize = this._props.horizontal
            ? entry.contentRect.width
            : entry.contentRect.height;
        }

        if (id === 'client') {
          this.slotSize.clientSize = newSize;
          this._onClientResize();
        } else if (id === 'header') {
          this.slotSize.headerSize = newSize;
        } else if (id === 'footer') {
          this.slotSize.footerSize = newSize;
        } else if (id === 'stickyHeader') {
          this.slotSize.stickyHeaderSize = newSize;
        } else if (id === 'stickyFooter') {
          this.slotSize.stickyFooterSize = newSize;
        } else if (oldSize !== newSize) {
          // 直接写 map：公开的 setItemSize 会保守地整体废弃索引，
          // 而这里知道项的索引，可以只修正它所属的那一块
          this.sizesMap.set(id, newSize);
          const delta = newSize - oldSize;
          diff += delta;

          const index = this._renderKeys.get(id);
          if (index === undefined) {
            // 渲染窗口之外的项上报了尺寸：增量维护的值都不再可信
            this._virtualSizeDirty = true;
            this._sizeIndex.invalidate();
          } else {
            this._sizeIndex.applyDelta(index, delta);
          }
          this._events.itemResize?.(id, newSize);
        }
      }

      this.state.listTotalSize += diff;

      // 执行滚动定位的渐进修正（平滑滚动进行中时交由动画自行跟随目标）
      if (!this._anim) this._fixTaskFn?.();

      if (diff !== 0) {
        // 按锚点复原视口内容，防止跳动。只有锚点上方的项才会改变解，
        // 下方项的 diff 自然得出零位移，无需额外判断
        this._applyAnchor();

        // 兜底：真实 scrollTop 可能在我们不知情的时候被动过，而内容高度刚变
        // 正是最容易发生的时刻（浏览器的滚动锚定就是这么干的，而且不派发 scroll
        // 事件）。内部偏移量与它对齐一次，否则区间会按旧位置算，视口边缘留白。
        // 若锚点刚刚生效过，它内部已经同步过，这里就是一次空操作
        this._syncOffsetAndRange();

        // 尺寸变了，填满视口所需的项数也跟着变——项缩小时（折叠长消息）尤其明显：
        // 原本一项撑满视口，缩回去之后要好几项才够。偏移量没动的话上面那次同步
        // 是空操作，所以这里必须单独重算一次结束项
        this._refreshViewEnd();
        // listTotalSize 已更新，通知 UI 层刷新 minHeight，防止底部空白
        this._notify();
        // 首屏项测出真实尺寸后总高度才准，这时才能判断内容是否填满视口。
        // 首屏只回来半屏数据的情况全靠这里续拉，否则会停在半屏不再加载
        this._loader.checkAutoLoad();
      }

      // 首次渲染完成后再校准一次区间：首次测量之前 clientSize 是 0，
      // 那时算出的可视区间必然不可信。
      //
      // 参照物是当前真实的滚动偏移量，不是 props.start：start / offset /
      // initialPosition='bottom' 以及用户在首帧里的滚动，都会让实际位置偏离
      // start。用 start 就会把区间拽回列表顶部，而滚动位置在别处——视口于是
      // 落在虚拟占位的空白上，且因为 _onScroll 在偏移量未变时会直接返回，
      // 这个错误状态不会自愈，非得用户滚一下才恢复。
      if (!this._isInit) {
        requestAnimationFrame(() => {
          if (this._clientEl) {
            this._offset = this.getOffset();
            this._calcRange();
          } else {
            // 还没绑定滚动容器，偏移量无从得知，此时 start 是唯一的参照
            this._updateRange(this._props.start);
          }
        });
        this._isInit = true;
      }
    });
  }

  /** 滚动事件处理：更新方向 → 重算区间 → 判断是否到达边界 */
  private _onScroll(evt: Event): void {
    this._events.scroll?.(evt);

    const offset = this.getOffset();
    if (offset === this._offset) return;

    this._direction = offset < this._offset ? 'forward' : 'backward';
    this._offset = offset;

    // 注意：这里刻意**不**去判断"是不是用户滚动，然后取消渐进修正"。
    // 写 scrollTop 引发的 scroll 事件是异步回送的，和程序化窗口的关闭是竞态，
    // 误判一次就会把轮询连同它的 rAF 兜底一起掐掉，scrollToBottom 再也到不了底。
    // 放弃修正的判断改在轮询自身的每一步里做（见 _attachEdgeFixTask）。

    // 用户真的动了滚动条：解开上一次空加载留下的停摆，让自动续拉重新可用
    this._loader.onUserScroll();

    this._calcRange();
    this._judgePosition();
  }

  /** 容器尺寸变化后重算起始并更新区间 */
  private _onClientResize(): void {
    this._updateRange(this.state.inViewBegin);
    // 容器变大后现有内容可能填不满视口了，此时不会有 scroll 事件来触发加载
    this._loader.checkAutoLoad();
  }

  /** 根据 start 和 clientSize 动态计算 inViewEnd（不依赖预估项高） */
  private _calculateViewEnd(start: number): number {
    const { itemKey, list } = this._props;
    const { clientSize } = this.slotSize;
    const len = list.length;

    // 固定行高：填满视口所需的项数可直接算出，无需逐项累加。
    // 同样要按绝对的视口下边界来算（见下方不定高分支的说明），
    // 否则 itemPreSize 大于视口时会少渲染
    if (this._fixed) {
      const startTop = this.slotSize.headerSize + start * this._unitSize;
      const span = Math.max(0, this._offset + clientSize - startTop);
      const end = start + Math.floor(span / this._unitSize) + 1;
      return end <= len ? end : Math.max(0, len - 1);
    }

    // 视口顶部通常落在 start 项的内部，而不是恰好对齐它的顶部。所以要覆盖的是
    // 绝对区间 [_offset, _offset + clientSize]，而不是"从 start 项顶部起的一屏"。
    //
    // 两者的差值就是视口顶部扎进 start 项的那段深度。项高远小于视口时，这点偏差
    // 被下面"多给一个渲染位"掩盖住了；可一旦某一项高于视口（展开的长消息就是），
    // 从它顶部算一屏在第一项就满了，后续项一个都不渲染——而它们本该出现在视口的
    // 下半部分，那里于是留下一块空白。
    //
    // 代价是一次 O(√n) 的前缀和查询；不定高路径本来就在用同量级的索引查询，
    // 而 fixed 模式走上面的快路径，不受影响。
    const targetBottom = this._offset + clientSize;
    let pos = this.getItemPosByIndex(start).top;

    for (let i = start; i < len; i += 1) {
      pos += this.getItemSize(list[i]?.[itemKey]);
      // 多给一个渲染位，减少边界闪烁
      if (pos > targetBottom) return i + 1;
    }
    return Math.max(0, len - 1);
  }

  /**
   * 重新计算所有列表项的尺寸总和。
   *
   * 这是 list 内容可能已变的时刻，顺带让分块索引按新长度重建（惰性，O(1) 标记）。
   * 均匀尺寸下总和是一次乘法；有实测尺寸时必须扫一遍全表——总和本身就依赖每一项，
   * 这一趟省不掉，但之后的前缀和与定位查询都由索引承担，不再是 O(n)。
   */
  private _calcListTotalSize(): void {
    const { itemKey, list } = this._props;
    const len = list.length;

    if (this._fixed || this.sizesMap.size === 0) {
      // 均匀尺寸：顺手把索引也建好（O(n / 块大小)），这样即便随后开始实测，
      // 索引也一直是有效的，不会在某次大跳跃时突然付一笔 O(n) 重建
      this._sizeIndex.fill(len, this._unitSize);
      this.state.listTotalSize = len * this._unitSize;
      return;
    }

    // 取值函数在这里就把 list / itemKey 解构好，避免重建的每一次迭代
    // 都去读两次 Proxy 属性；它只在本次重建期间被使用
    this._sizeIndex.rebuild(len, (index) =>
      this.getItemSize(list[index]?.[itemKey]),
    );
    this.state.listTotalSize = this._sizeIndex.total;
  }

  /**
   * 更新可视区间 [inViewBegin, inViewEnd] 并触发渲染区间更新。
   * 如果 start 比当前 inViewBegin 小，说明即将向上渲染新项，先立好锚点。
   */
  private _updateRange(start: number): void {
    // 列表变短时（切换数据源、过滤）旧的 inViewBegin 可能已经越界，
    // 不夹一下会让 renderBegin 超过 renderEnd，渲染切片直接变成空数组
    const last = Math.max(0, this._props.list.length - 1);
    start = Math.min(Math.max(start, 0), last);

    if (start < this.state.inViewBegin) {
      // 锚定当前顶部项：它已经渲染测量过、尺寸稳定，是可靠的参照物。
      // 上方新项测出真实尺寸后，据此把视口拉回同一段内容
      this._captureAnchor(this.state.inViewBegin);
    }

    this.state.inViewBegin = start;
    this.state.inViewEnd = this._calculateViewEnd(start);
    this._updateRenderRange();
  }

  /**
   * 根据当前 offset 定位新的 inViewBegin。
   *
   * - fixed：一次除法直接算出，与列表长度无关
   * - 不定高：从上一次的 inViewBegin 出发增量搜索（forward 往前、backward 往后）。
   *   增量是这里的关键，稳态滚动每帧只跨越几项；但一次性大跳（scrollToBottom、
   *   End 键、恢复滚动位置）仍是 O(跨越项数)，30w 列表全程约 13ms。
   */
  private _calcRange(): void {
    const target = this._offset - this.slotSize.headerSize;
    if (target < 0) {
      this._updateRange(0);
      return;
    }

    // 循环外取一次：list / itemKey 走的是 Proxy，不能放在迭代里读
    const { itemKey, list } = this._props;
    const inViewBegin = this.state.inViewBegin;
    const last = Math.max(0, list.length - 1);
    let start = inViewBegin;
    // 当前 inViewBegin 顶部的累计尺寸；搜索时随迭代推进，因此先留一份初值
    const beginTop = this._getVirtualSize2beginInView();
    let top = beginTop;

    if (this._fixed) {
      start = Math.min(Math.floor(target / this._unitSize), last);
    } else if (this._direction === 'forward') {
      // 目标已落在当前项内部时无需搜索
      if (target < top) {
        let found = false;
        for (
          let i = inViewBegin - 1, steps = 0;
          i >= 0 && steps < MAX_INCREMENTAL_STEPS;
          i -= 1, steps += 1
        ) {
          const size = this.getItemSize(list[i]?.[itemKey]);
          top -= size;
          if (top <= target && target < top + size) {
            start = i;
            found = true;
            break;
          }
        }
        // 跨越太远（或状态不一致导致搜索落空）：改由索引直接定位
        if (!found) start = this._locateIndex(target);
      }
    } else if (target > top) {
      let found = false;
      for (
        let i = inViewBegin, steps = 0;
        i <= last && steps < MAX_INCREMENTAL_STEPS;
        i += 1, steps += 1
      ) {
        const size = this.getItemSize(list[i]?.[itemKey]);
        if (top <= target && target < top + size) {
          start = i;
          found = true;
          break;
        }
        top += size;
      }
      // 同上；目标超出内容总高时索引会给出最后一项
      if (!found) start = this._locateIndex(target);
    }

    // 向下滚动说明用户已经离开原来那段内容，待处理的锚点作废。
    // 锚点修正自身写 scrollTop 也会走到这里，靠 _applyingAnchor 窗口区分开
    if (
      this._direction === 'backward' &&
      target > beginTop &&
      !this._applyingAnchor
    ) {
      this._anchor = null;
    }

    if (start !== inViewBegin) {
      this._updateRange(start);
      return;
    }

    // 起始项没变，但视口下边界随偏移量移动了，结束项要跟着重算（见 _refreshViewEnd）
    this._refreshViewEnd();
  }

  /**
   * 重算结束项。
   *
   * inViewEnd 由两个东西共同决定：视口的**下边界**，以及从起始项往下**各项的尺寸**。
   * 任一变化都得重算：
   * - 偏移量移动（滚动、程序化定位）会挪动下边界
   * - 项尺寸变化会改变"填满视口需要几项"——尤其是变小的时候（折叠长消息），
   *   原本一项就撑满视口，缩回去之后要好几项才够
   *
   * 只在"起始项变化时"重算是不够的：项高于视口时，起始项可以长时间钉在同一项上，
   * 期间下边界和尺寸都可能变，视口下方就会露出一块空白，滚开了才恢复。
   */
  private _refreshViewEnd(): boolean {
    const end = this._calculateViewEnd(this.state.inViewBegin);
    if (end === this.state.inViewEnd) return false;

    this.state.inViewEnd = end;
    this._updateRenderRange();
    return true;
  }

  /** 判断是否滚动到了顶部/底部边界，触发 toTop/toBottom 事件 */
  private _judgePosition(): void {
    const { list } = this._props;
    const threshold = this._edgeThreshold();

    if (this._direction === 'forward') {
      if (this._offset - threshold <= 0) {
        this._events.toTop?.(list[0] as T);
        this._loader.onReachEdge('top');
      }
      return;
    }

    const scrollSize = Math.round(this._offset + this.slotSize.clientSize);
    if (Math.round(this.getTotalSize() - scrollSize) <= threshold) {
      this._events.toBottom?.(list[list.length - 1] as T);
      this._loader.onReachEdge('bottom');
    }
  }

  /** 获取 virtualSize 到 inViewBegin 的累计尺寸（renderBegin → inViewBegin） */
  private _getVirtualSize2beginInView(): number {
    return (
      this.state.virtualSize +
      this._getRangeSize(this.state.renderBegin, this.state.inViewBegin)
    );
  }

  /** 计算 [range1, range2) 区间内所有项的尺寸总和 */
  private _getRangeSize(range1: number, range2: number): number {
    const start = Math.min(range1, range2);
    const end = Math.max(range1, range2);
    // 没有任何实测尺寸时每项都是 itemPreSize + itemGap，与 fixed 同为一次乘法。
    // 首次装载正是这种情形——此时遍历几十万项纯属做白工
    if (this._fixed || this.sizesMap.size === 0) {
      return (end - start) * this._unitSize;
    }

    // 循环外取一次：list / itemKey 走的是 Proxy，不能放在迭代里读
    const { itemKey, list } = this._props;
    let total = 0;
    for (let i = start; i < end; i += 1) {
      total += this.getItemSize(list[i]?.[itemKey]);
    }
    return total;
  }

  /** 重新计算 renderBegin 之前所有项的尺寸（即 virtualSize） */
  private _updateTotalVirtualSize(): void {
    this.state.virtualSize = this._prefixSize(this.state.renderBegin);
    // 全量重算即为权威值，此前的失效标记随之清除
    this._virtualSizeDirty = false;
  }

  /** 更新渲染切片，并同步用于识别「窗口外尺寸上报」的 key 集合 */
  private _setRenderList(): void {
    const { itemKey, list } = this._props;
    this._renderList = list.slice(
      this.state.renderBegin,
      this.state.renderEnd + 1,
    );
    // 每次区间变化都会走到这里，复用 Map 而不是重建，也省掉中间数组
    const keys = this._renderKeys;
    keys.clear();
    const begin = this.state.renderBegin;
    const rendered = this._renderList;
    for (let i = 0; i < rendered.length; i += 1) {
      keys.set(String(rendered[i]![itemKey]), begin + i);
    }
  }

  /**
   * 根据 inViewBegin/End + buffer 计算实际渲染区间 [renderBegin, renderEnd]，
   * 更新 virtualSize（增量计算），切片出 renderList 并通知上层。
   */
  private _updateRenderRange(): void {
    const oldRenderBegin = this.state.renderBegin;
    let newRenderBegin = this.state.inViewBegin;
    let newRenderEnd = this.state.inViewEnd;

    newRenderBegin = Math.max(0, newRenderBegin - this._bufferTop);
    newRenderEnd = Math.min(
      newRenderEnd + this._bufferBottom,
      this._props.list.length - 1 > 0 ? this._props.list.length - 1 : 0,
    );

    if (this._props.renderControl) {
      const ctrl = this._props.renderControl(
        this.state.inViewBegin,
        this.state.inViewEnd,
      );
      newRenderBegin = ctrl.begin;
      newRenderEnd = ctrl.end;
    }

    this.state.renderBegin = newRenderBegin;
    this.state.renderEnd = newRenderEnd;

    // virtualSize 优先增量更新（稳态滚动只挪动几项）；但一次性大跳时两端相距
    // 成千上万项，增量累加本身就成了 O(n)——那时直接走索引重算前缀和
    if (
      Math.abs(newRenderBegin - oldRenderBegin) > MAX_INCREMENTAL_STEPS
    ) {
      this.state.virtualSize = this._prefixSize(newRenderBegin);
    } else {
      const delta = this._getRangeSize(oldRenderBegin, newRenderBegin);
      this.state.virtualSize +=
        newRenderBegin > oldRenderBegin ? delta : -delta;
    }

    this._setRenderList();
    this._notify();
  }

  /** 列表数据变化后重新计算尺寸和区间 */
  private _onListChange(): void {
    const newLen = this._props.list.length;
    this._listVersion += 1;
    this._lastChangeWasAppend = false;

    if (newLen <= 0) {
      this.reset();
      this._snapshotList();
      return;
    }

    const { count: shiftCount, size: shiftSize } = this._diffHead();

    if (shiftCount !== 0) {
      // 头部增删会把后续内容整体推移：补偿等量的 scrollOffset，让视口内容留在原处。
      // 这是 addedList2Top / deletedList2Top 做的事，现在由列表变更自动触发。
      //
      // 变更前视口顶部那一项要先记下来：它是"用户正在看的内容"，也是稍后立锚点的
      // 参照。等下面重新定位过，这个信息就取不回来了
      const prevInViewBegin = this.state.inViewBegin;

      this._calcListTotalSize();

      // 先让上层把容器高度更新到新的 listTotalSize，再写 scrollOffset。
      // 顺序不能反：头部插入新增的那段高度此刻还不存在于 DOM 上，浏览器会按旧的
      // 可滚动上限把 scrollTop 裁掉。这一次通知用的还是旧渲染切片，但同一个同步
      // 任务里后面会修正，中间态不会被绘制出来
      this._notify();

      this._setScrollOffset(this._offset + shiftSize);
      // 与 _applyAnchor 同理：写完立刻把 _offset 同步到浏览器 clamp 后的真实值，
      // 否则下一个 scroll 事件会拿旧值误判滚动方向
      if (this._clientEl) this._offset = this.getOffset();

      // 用补偿后的偏移量重新定位视口顶部项，而不是把旧的 inViewBegin 平移 shiftCount。
      //
      // 平移看着更直接，却依赖"旧 inViewBegin 与旧 scrollOffset 自洽"这个前提，
      // 而停在顶部时它不成立：那时 target 为负，inViewBegin 被 _calcRange 的
      // `target < 0` 分支钳成 0，视口其实还落在 header 里。平移的结果就会比真实
      // 位置多出一个 header 的高度，视口正好停在没被渲染的那一项上（白屏，
      // 且向上滚 1px 触发重新定位后内容才出现）。
      //
      // 也不能交给 _calcRange：它做的是增量搜索，前提同样是"旧 inViewBegin 仍指向
      // 同一段内容"，而头部增删恰好打破了这一点。这里直接走索引定位，
      // 与方向、header 高度、是否停在边界都无关。
      const target = this._offset - this.slotSize.headerSize;
      const newBegin = target < 0 ? 0 : this._locateIndex(target);

      this.state.inViewBegin = newBegin;
      this.state.inViewEnd = this._calculateViewEnd(newBegin);
      this._updateRenderRange();
      // _updateRenderRange 的 virtualSize 走增量，而增量假设两次 renderBegin 指向
      // 同一个列表；头部平移后必须全量重算，否则占位高度会偏掉
      this._updateTotalVirtualSize();

      // virtualSize 刚被全量校正，再通知一次让上层拿到正确的占位高度；
      // 列表内容也确实变了（旧代码正是靠手动 forceUpdate 兜住这一步）
      this._setRenderList();
      this._notify();

      if (shiftCount > 0) {
        // 头部插入项的尺寸此刻多半还是估算值，补偿量因此不准，差额要靠锚点在
        // 尺寸测出来之后补回来（_applyAnchor 每次 ResizeObserver 回调重新求解）。
        //
        // 参照项必须是「变更前视口顶部那一项」平移后的位置，而不是补偿后视口顶部
        // 那一项（newBegin）：后者可能正是刚插入的、尺寸还会变的项，锚在它身上
        // 只能保住它自己——它一变高，下面用户真正在看的内容就被整体挤下去。
        // 平移后的这一项已经渲染测量过，尺寸稳定，才是可靠参照。
        //
        // 放在通知之后：捕获要用到刚校正的 virtualSize 与渲染区间
        const anchorIndex = Math.min(
          prevInViewBegin + shiftCount,
          Math.max(0, this._props.list.length - 1),
        );
        this._captureAnchor(anchorIndex);
      }
      // 记录版本号：本次变更的位移已经补过，手动补偿调用应当短路，否则会叠加成两倍
      this._autoFixedVersion = this._listVersion;
    } else {
      this._lastChangeWasAppend =
        this._hasListSnapshot && newLen > this._prevLen;
      // 贴底判定必须用变更前的总尺寸，所以在 _calcListTotalSize 之前先算出来
      const wasAtBottom = this._lastChangeWasAppend
        ? this._wasAtBottomBeforeChange()
        : false;
      const addedCount = newLen - this._prevLen;

      this._calcListTotalSize();

      // 列表变短后（切换数据源、过滤）旧偏移量可能已经超出新的可滚动范围。
      // 浏览器会把 scrollTop 夹回来，但 scroll 事件是异步回送的——内部偏移量
      // 必须立刻跟着收，否则这一轮的区间会按一个已经不存在的位置去算
      if (this._clampOffsetToScrollRange()) {
        // 偏移量变了，旧的 inViewBegin 不再对应当前位置，按新偏移量权威定位
        const target = this._offset - this.slotSize.headerSize;
        this._updateRange(target < 0 ? 0 : this._locateIndex(target));
      } else {
        this._updateRange(this.state.inViewBegin);
      }
      this._updateTotalVirtualSize();
      this._updateRenderRange();

      if (this._lastChangeWasAppend) {
        this._loader.onAppend(
          addedCount,
          wasAtBottom,
          this._props.stickyBottom,
        );
      }
    }

    this._snapshotList();
  }

  /**
   * 还原"本次列表变更之前视口是否贴底"。
   *
   * 尾部追加不会改动浏览器的 scrollTop，因此当前偏移量仍是变更前的值；
   * 配上变更前的总尺寸快照就能准确判定，无需维护一份随时可能失同步的标志位。
   */
  private _wasAtBottomBeforeChange(): boolean {
    const { clientSize } = this.slotSize;
    // 尺寸还没量出来，无从判断，保守地不跟随
    if (clientSize <= 0) return false;
    const scrollSize = Math.round(this.getOffset() + clientSize);
    return (
      Math.round(this._prevTotalSize - scrollSize) <= this._stickyThresholdPx()
    );
  }

  /**
   * 识别列表头部的结构变化。
   *
   * - `count`：索引的平移量（正数为插入，负数为删除）
   * - `size`：需要补偿的 scrollOffset 增量，符号与 count 一致
   *
   * 两者都为 0 表示头部未变或无法识别（整体换数据源），按普通更新处理。
   * 判定只依赖首项 key 与头部快照，与列表长度无关。
   */
  private _diffHead(): { count: number; size: number } {
    const none = { count: 0, size: 0 };
    if (!this._hasListSnapshot) return none;

    const prev = this._prevHeadKeys;
    if (prev.length === 0) return none;

    const { list, itemKey } = this._props;
    const prevFirstKey = prev[0];
    const newFirstKey = String(list[0]?.[itemKey]);
    if (newFirstKey === prevFirstKey) return none;

    // 旧首项在新列表的前段出现 → 它前面的都是新插入的项
    const scanEnd = Math.min(list.length, HEAD_SCAN_LIMIT);
    for (let i = 1; i < scanEnd; i += 1) {
      if (String(list[i]?.[itemKey]) === prevFirstKey) {
        let size = 0;
        for (let j = 0; j < i; j += 1) {
          size += this.getItemSize(String(list[j]?.[itemKey]));
        }
        return { count: i, size };
      }
    }

    // 新首项在旧头部快照中出现 → 它前面的都被移除了。
    // 尺寸取自 sizesMap，此刻还没被清理，拿到的是移除前的实测值
    for (let i = 1; i < prev.length; i += 1) {
      if (prev[i] === newFirstKey) {
        let size = 0;
        for (let j = 0; j < i; j += 1) {
          // j < i < prev.length，索引一定命中
          size += this.getItemSize(prev[j]!);
        }
        return { count: -i, size: -size };
      }
    }

    return none;
  }

  /** 记录当前列表的头部 key 与长度，供下一次变更比对 */
  private _snapshotList(): void {
    const { list, itemKey } = this._props;
    const n = Math.min(list.length, HEAD_SCAN_LIMIT);
    const keys: string[] = new Array(n);
    for (let i = 0; i < n; i += 1) {
      keys[i] = String(list[i]?.[itemKey]);
    }
    this._prevHeadKeys = keys;
    this._prevLen = list.length;
    this._prevTotalSize = this.getTotalSize();
    this._hasListSnapshot = true;
  }

  /** 通知上层渲染列表已更新 */
  private _notify(): void {
    // virtualSize 失效时先补一次全量重算。
    //
    // 上层拿它当虚拟占位的高度来摆放整个渲染块，用陈旧值会让这一块内容整体偏移，
    // 表现就是视口里某几项凭空消失、再滚一下才恢复。
    //
    // 失效的来源是"渲染窗口之外的项报来了尺寸"：项滚出窗口后 DOM 已移除、
    // 也调过 unobserve，但 ResizeObserver 的回调是异步的，队列里可能还压着它的
    // 一条上报，快速滚动时很常见。此前只有 _getTopByIndex 会消费这个标记，
    // 而 DOM 层读的是 state.virtualSize，走不到那里。
    if (this._virtualSizeDirty) this._updateTotalVirtualSize();

    this._events.update?.(this._renderList, this.state);
  }
}
