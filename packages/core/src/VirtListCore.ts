/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ListState,
  ListUpdateReason,
  LoadState,
  SlotId,
  SlotSize,
  VirtListOptions,
  VirtListEvents,
  VirtScrollOptions,
  VirtScrollSource,
  RequiredOptions,
} from './types.js';
import { DEFAULT_OPTIONS } from './types.js';
import { ChunkedSizeIndex } from './ChunkedSizeIndex.js';
import { ListLoader } from './ListLoader.js';
import { buildCopyText, type SelectionCopyHost } from './SelectionCopy.js';

/** `dataset.id` 是否指向一个插槽（`client` 不算，它另有一条处理路径） */
function isSlotId(id: string): id is SlotId {
  return (
    id === 'header' ||
    id === 'footer' ||
    id === 'stickyHeader' ||
    id === 'stickyFooter'
  );
}

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
 * 待维持的滚动目标 —— 「视口应该停在哪儿」这件事的唯一表示。
 *
 * 不定高列表里"停在某处"是个动态目标：项只有渲染出来才会被测量，测量之后
 * 总高度和各项位置都会变，先前算出的偏移量随之失效。
 *
 * 这里的解法是**只记目标、每次重新求解**，而不是"算出位移量再补偿"：
 * 求解不变量是幂等的，重复应用没有副作用，也不需要判断收敛、不需要重试上限。
 *
 * 曾经这件事由三套并行机制分别做（锚点求解 + 两端轮询 + 索引轮询，共 237 行），
 * 因为原生滚动下既不知道浏览器会把 scrollTop 夹到哪、也分不清是谁动的它。
 * 偏移量归 JS 掌管之后两个前提都消失了，三套塌缩成这一套。
 */
type PinnedTarget =
  | {
      /** 贴到底：目标是 `totalSize - clientSize`，随测量推进而变 */
      kind: 'end';
      /**
       * 是否为显式定位（scrollToBottom）。
       *
       * 贴底目标有两种来源：`scrollToBottom()` 是显式的；而「用户自己滚到底」
       * 建立的跟随不是——它只是对当前位置的一次记账，语义上更接近自动锚定。
       * 两者在 `_syncFromScrollPosition` 里的归宿相同（向上滚都会让位给
       * `_pinIndex`），区分开只是为了不把用户行为记成程序意图。
       */
      explicit: boolean;
    }
  | {
      /** 锚定某一项：目标是该项的位置加上项内偏移 */
      kind: 'index';
      /** 参照项在 list 中的索引 */
      index: number;
      /** 参照项的 itemKey 值，用于校验 index 是否仍指向同一项 */
      key: string;
      align: 'start' | 'end';
      /** 捕获时偏移量与参照项对齐位置的差值 */
      within: number;
      /**
       * 是否为显式定位（scrollToIndex）。
       *
       * 显式目标不会被"用户向上滚时自动锚定顶部项"覆盖掉——否则 scrollToIndex
       * 的落位会在渐进求解途中被改成"锚住当前顶部项"，永远到不了目标。
       */
      explicit: boolean;
    };

/**
 * 增量搜索 inViewBegin 时允许的最大步数。
 *
 * 稳态滚动每帧只跨越几项，增量搜索是 O(1) 级的，比走索引更快；
 * 但一次性大跳（scrollToBottom、End 键、拖动滚动条到底）会跨越成千上万项。
 * 超过这个步数就改用分块索引定位，把最坏情况从 O(跨越项数) 压到 O(√n)。
 */
const MAX_INCREMENTAL_STEPS = 64;

/**
 * 头部结构变化的最大识别范围。
 *
 * 头部增删是唯一会整体推移后续内容的结构变化，识别它需要「变化前的头部长什么样」。
 * 这个上界同时约束两件事：正向扫描新列表找旧首项的步数（识别插入），以及头部 key
 * 快照的长度（识别删除）。超出范围的头部改动识别不出来，视口不再维持——
 * 那种量级更可能是整体换数据源，本就不该维持位置。
 *
 * 取 65536 而不是更小的值，是因为成本实测足够低（300k 列表，Node 22）：
 * 快照 0.295ms / 次列表变更，扫描扑空 0.170ms / 次换数据源。都是亚毫秒、且只在
 * 列表变更时付一次，不在滚动热路径上。
 *
 * 上界的意义是保证 _diffHead 与列表长度无关，不会在 30w 列表上退化成 O(n)。
 */
const HEAD_SCAN_LIMIT = 65536;

/**
 * 尺寸诊断：收集到这么多实测值之后与 `estimatedSize` 比对一次。
 *
 * 取 32 而不是更小的值，是为了让样本覆盖首屏之外的几项——头几项常常不典型
 * （聊天室的第一条、日志的启动行），过早比对容易误报。
 */
const SIZE_SAMPLE_TARGET = 32;

/**
 * 实测中位数与 `estimatedSize` 的比值超出这个倍数才提示。
 *
 * 不定高列表本来就参差不齐，差个百分之几十是常态、也无害；差到一倍以上时
 * 首屏渲染的项数就会明显偏离，那才值得说一句。
 */
const SIZE_MISMATCH_RATIO = 2;

/**
 * 通知原因的强弱次序，供事务合并时取最强的那个（见 `VirtListCore._coalesce`）。
 *
 * 「强」的判据是 DOM 层为它多做多少事：`range` 只需重摆位置，`size` 还要重新校正
 * 交叉轴视口，`force` / `list` 则要让每个可见项按最新数据重出内容。
 */
const REASON_RANK: Record<ListUpdateReason, number> = {
  range: 0,
  size: 1,
  force: 2,
  list: 3,
};

/** 取两个通知原因里更强的那个（`null` 表示还没有原因） */
function strongerReason(
  a: ListUpdateReason | null,
  b: ListUpdateReason,
): ListUpdateReason {
  if (a === null) return b;
  return REASON_RANK[b] > REASON_RANK[a] ? b : a;
}

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
  /** 列表项 key → 实测尺寸 的映射，未测量项回退到 estimatedSize + itemGap */
  readonly sizesMap: Map<string, number> = new Map();

  /**
   * 内部状态（方向、渲染区间）已经同步到的偏移量。
   *
   * **不是**权威值——权威值是 `_scrollOffset`，`getOffset()` 读的是那个。
   * 这里存的是「上一次 `_calcRange` 是按哪个位置算的」，两者的差值就是
   * 「已经写进账本、但区间还没跟上」的那一段，`_syncAfterWrite` 负责抹平它。
   *
   * 两个字段必须一起变更。曾经它叫 `_offset`，看起来才像那个权威值，
   * 结果 `reset()` 只归零了它、漏掉 `_scrollOffset`，留下「账本说 0、
   * 内容停在旧位置」的不自洽状态。
   */
  private _syncedOffset = 0;
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
   * fixedSize 模式与「尚无任何实测尺寸」时都走乘除法，不经过它。
   */
  private _sizeIndex: ChunkedSizeIndex;
  /**
   * 增量维护的 leadingSize 是否已失效。
   *
   * leadingSize 只统计 renderBegin 之前的项，正常情况下被观察的项都在渲染窗口内，
   * 它们的尺寸变化不影响 leadingSize。但窗口之外的项若上报了尺寸（例如
   * 头部插入的项还没进入窗口就完成测量），这个增量值就不再可信。
   */
  private _leadingSizeDirty = false;
  /** 经 Proxy 封装的配置项，访问时自动回退到 DEFAULT_OPTIONS */
  private _props: RequiredOptions<T>;

  /*
   * 以下三个字段是 _props 中高频配置的快照。
   *
   * _props 是 Proxy，每次属性读取都要走 get 陷阱（两次 Reflect.get）。
   * getItemSize 是全 core 最热的函数——一次全量遍历 30w 列表就要调 30w 次，
   * 而它原本每次调用都要读 fixedSize / estimatedSize / itemGap 三个属性。实测
   * 30w 遍历从 13.0ms 降到 2.6ms，差 5 倍。
   *
   * 快照由 _syncHotOptions() 统一刷新，updateOptions 是配置变更的唯一入口。
   */
  /** estimatedSize + itemGap，即未测量项的占位尺寸 */
  private _unitSize = 0;
  private _fixedSize = false;
  /** 事件回调集合 */
  private _events: VirtListEvents<T>;
  /**
   * 当前滚动方向：
   * - forward：向上/向左滚动
   * - backward：向下/向右滚动
   */
  private _direction: 'forward' | 'backward' = 'backward';
  /**
   * 待维持的滚动目标，null 表示"当前位置不需要维持"。
   *
   * 每次 ResizeObserver 回调重新求解一次（`_resolvePinned`），幂等。
   */
  private _pinned: PinnedTarget | null = null;
  /** 进行中的平滑滚动动画，null 表示当前没有动画 */
  private _anim: AnimState | null = null;
  /** 首次渲染完成标记，用于首帧后重新校准区间 */
  private _isInit = false;
  /**
   * 上一次列表的头部 key 快照（至多 HEAD_SCAN_LIMIT 项）。
   *
   * 头部增删是唯一会整体推移后续内容的结构变化，识别它需要"变化前的头部长什么样"。
   * 只留头部是因为尾部增删不影响视口位置，不必为此拷一份全量 key。
   *
   * 存**原样**的 key 而不是 `String()` 之后的字符串：这份快照每次列表变更都要重建
   * 一遍（长列表上就是几万次），而数字 key 转字符串每次都要新分配一个堆对象，
   * 实测占了重建耗时的大头。比对改成原值 `===`，只在要拿尺寸时才转字符串
   * （`getItemSize` 内部本来就会转）。
   *
   * 代价是数字 `1` 与字符串 `'1'` 不再算同一个 key。这类混用本来就已经是错的：
   * `sizesMap` 一直按 `String(key)` 存，两者会撞进同一条尺寸记录。
   */
  private _prevHeadKeys: unknown[] = [];
  /** 上一次列表的长度，用于识别尾部追加（贴底跟随） */
  private _prevLen = 0;
  /** 是否已有可比对的列表快照（首次装载时无从比对） */
  private _hasListSnapshot = false;
  /** 最近一次列表变更是否为尾部追加（头部未动且变长） */
  private _lastChangeWasAppend = false;
  /**
   * 通知合并事务的嵌套层数，`> 0` 表示正处在一个事务里（见 `_coalesce`）。
   *
   * 计数而非布尔量：使用方的 `scroll` / `loadStateChange` / `loadMore` 回调可能
   * 同步再改一次列表，那时事务是嵌套的，只有最外层出栈才该发通知。
   */
  private _coalesceDepth = 0;
  /** 事务期间攒下的通知原因（取最强的那个），null 表示还没有人要求通知 */
  private _pendingReason: ListUpdateReason | null = null;
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
  /**
   * 权威滚动偏移量。
   *
   * 滚动位置由 JS 掌管：容器是 `overflow: hidden`，浏览器既不会自己滚，
   * 也就不会出现「合成器已经把画面滚过去了，但 DOM 还没跟上」的那一帧。
   * 于是这个数字是唯一真相，不存在「账本与浏览器对不上」的问题。
   */
  private _scrollOffset = 0;
  /** 是否已绑定容器。未绑定时不接受滚动写入 */
  private _bound = false;
  private _resizeObserver: ResizeObserver | undefined;
  /**
   * copy 事件的监听器，仅在配了 `copyText` 时创建。
   *
   * 存下引用是为了 destroy 时能精确摘掉——容器可能由使用方复用，
   * 留一个野监听会在下一次挂载后继续改写剪贴板。
   */
  private _onCopy: ((e: ClipboardEvent) => void) | null = null;
  /**
   * 尺寸诊断的样本，比对完置为 null——之后这条路径彻底不再执行，
   * 也不会一直往数组里堆数字。
   */
  private _sizeSamples: number[] | null = [];

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
      itemsTotalSize: 0,
      leadingSize: 0,
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
    return Math.max(this._props.edgeThreshold, 2);
  }

  /**
   * 判定"贴底"的容差。
   *
   * 与 _edgeThreshold 分开：贴底跟随往往需要比加载触发更宽松的容差
   * （差几像素也该算贴底），但放宽它不应该连带改变 toTop / toBottom 的时机。
   */
  private _stickyThresholdPx(): number {
    return Math.max(
      this._props.stickyThreshold || this._props.edgeThreshold,
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
    if (this._fixedSize || this.sizesMap.size === 0) {
      return index * this._unitSize;
    }
    return this._sizeIndex.prefix(index);
  }

  /** 定位偏移量落在第几项，同样在均匀尺寸下退化为一次除法 */
  private _locateIndex(offset: number): number {
    const last = Math.max(0, this._props.list.length - 1);
    if (offset <= 0) return 0;
    if (this._fixedSize || this.sizesMap.size === 0) {
      return Math.min(Math.floor(offset / this._unitSize), last);
    }
    return Math.min(this._sizeIndex.locate(offset).index, last);
  }

  /** 刷新高频配置的快照，见字段处说明 */
  private _syncHotOptions(): void {
    this._unitSize = this._props.estimatedSize + this._props.itemGap;
    this._fixedSize = this._props.fixedSize;
  }

  // ==================== 公共 API ====================

  /** 获取当前滚动偏移量 */
  getOffset(): number {
    return this._scrollOffset;
  }

  /** 获取所有插槽（header + footer + sticky）的尺寸总和 */
  getSlotsTotalSize(): number {
    return (
      this.slotSize.headerSize +
      this.slotSize.footerSize +
      this.slotSize.stickyHeaderSize +
      this.slotSize.stickyFooterSize
    );
  }

  /** 获取列表总尺寸（列表项 + 插槽） */
  getTotalSize(): number {
    return this.state.itemsTotalSize + this.getSlotsTotalSize();
  }

  /** 获取指定 key 对应项的尺寸，未测量则返回 estimatedSize + itemGap */
  getItemSize(itemKey: string): number {
    if (this._fixedSize) return this._unitSize;
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
    if (this._fixedSize) {
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

  /**
   * `getItemPosByIndex(index).top` 的逆运算：给定偏移量，返回它落在第几项。
   *
   * 自绘滚动条的「滑块位置 ↔ 列表项」映射两个方向都要用到，必须严格互逆，
   * 否则拖到某处松手时滑块会跳。
   *
   * 注意 fixedSize 模式下 `getItemPosByIndex` 不计 headerSize（既有行为），
   * 这里的基准要跟着它走，不能统一减掉 header。
   */
  getIndexByOffset(offset: number): number {
    const base = this._fixedSize ? offset : offset - this.slotSize.headerSize;
    return base <= 0 ? 0 : this._locateIndex(base);
  }

  /** 当前允许的最大滚动偏移量 */
  getMaxOffset(): number {
    return this._maxScrollOffset();
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

    this._writeOffset(offset, 'program');
    this._syncAfterWrite();
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
          // 动画落位后才挂目标：动画期间挂上会与逐帧插值互相抢夺偏移量
          if (!canceled) this._pinIndex(index, align, true);
          options.onDone?.(canceled);
        },
        options.maxDistance,
      );
      return;
    }

    this.scrollToOffset(this._getIndexScrollTarget(index, align));
    // 目标项此刻多半还在渲染窗口之外、尺寸只能按 estimatedSize 估。
    // 记下「要锚在这一项」，之后每次测量都重新求解一次，直到落准
    this._pinIndex(index, align, true);
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

  /** 滚动到顶部 */
  scrollToTop(options?: VirtScrollOptions): void {
    if (options?.behavior === 'smooth') {
      this._clearScrollTasks();
      // 落位后不需要再补一次：动画最后一帧写的就是 0，而 0 是个不会漂移的目标
      this._animateTo(
        () => 0,
        this._getDuration(options),
        options.onDone,
        options.maxDistance,
      );
      return;
    }

    // 顶部不需要待维持目标：0 就是 0，写进去就是准的，
    // 上方内容再怎么变也不会把它挪走（原生滚动下才要轮询——浏览器会自己夹 scrollTop）
    this._clearScrollTasks();
    this._writeOffset(0, 'program');
    this._syncAfterWrite();
    options?.onDone?.(false);
  }

  /** 滚动到底部（渐进修正确保到达） */
  scrollToBottom(options?: VirtScrollOptions): void {
    if (options?.behavior === 'smooth') {
      this._clearScrollTasks();
      this._animateTo(
        () => this._maxScrollOffset(),
        this._getDuration(options),
        (canceled) => {
          if (!canceled) this._pinned = { kind: 'end', explicit: true };
          options.onDone?.(canceled);
        },
        options.maxDistance,
      );
      return;
    }

    // 「到底」是个动态目标：项被渲染出来后报上真实尺寸，总高度随之变化，
    // 上限也跟着往后挪。记下 kind:'end'，每次测量重新求解 —— 实测一轮即收敛
    this._clearScrollTasks();
    this._pinned = { kind: 'end', explicit: true };
    this._writeOffset(this._maxScrollOffset(), 'program');
    this._syncAfterWrite();
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

    // 区间由外部任意指定，与上一次没有连续性，直接全量重算 leadingSize
    this._setRenderList();
    this._updateLeadingSize();
    // 区间变了、数据没变：新进入窗口的项自然会走 renderItem，池里已有的项不必重出内容
    this._notify('range');
  }

  /** 重置所有状态（列表清空时调用） */
  reset(): void {
    // 动画和待维持目标都指着旧内容里的位置，留着会在下一帧把偏移量重新写回去
    this._clearScrollTasks();
    this._direction = 'backward';
    this._leadingSizeDirty = false;

    // 偏移量的两个字段必须一起归零。权威值是 _scrollOffset（getOffset() 读它、
    // DOM 层按它摆放内容），_syncedOffset 只是「区间算到哪了」的镜像。
    // 只归零镜像的话，列表清空后 getOffset() 仍是旧值，重新灌入数据时视口
    // 停在旧偏移量、而渲染区间从头开始——白屏，且因为偏移量没变不会自愈
    const hadOffset = this._scrollOffset !== 0;
    this._scrollOffset = 0;
    this._syncedOffset = 0;

    this.state.itemsTotalSize = 0;
    this.state.leadingSize = 0;
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

    // 只发 offsetChange 不发 scroll，与 resume() 同理：DOM 层要据此把内容搬回
    // 原点，但「重置」不是一次滚动，方向 / 边界 / 来源那套载荷在这里没有意义
    if (hadOffset) this._events.offsetChange?.(0);
    this._updateRenderRange();
  }

  /** 强制触发一次完整的重新计算与渲染更新 */
  forceUpdate(): void {
    // 合并成一次通知：`_updateRange` 内部会自报一次 `range`，那一趟是中间态
    this._coalesce(() => {
      this._calcListTotalSize();
      this._updateLeadingSize();
      this._updateRange(this.state.inViewBegin);
      this._notify('force');
    });
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

    // 复制能力可以被运行时开关（框架层的 props 变化最终都走到这里）
    if ('copyText' in partial) this._syncCopyListener();
  }

  /** 获取当前的加载状态（loading / hasMore / pendingNew） */
  getLoadState(): LoadState {
    return this._loader.getState();
  }

  /** 绑定滚动容器 DOM，开始监听 scroll 和 resize 事件 */
  bindDOM(clientEl: HTMLElement): void {
    this._clientEl = clientEl;
    this._bound = true;

    this._resizeObserver?.observe(clientEl);
    this._syncCopyListener();

    if (this._props.initialIndex) {
      this.scrollToIndex(this._props.initialIndex);
    } else if (this._props.initialOffset) {
      this.scrollToOffset(this._props.initialOffset);
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

  /**
   * 直接写入某个插槽的尺寸。
   *
   * `observeSlotEl` 之外的**同步**通道：DOM 层刚建好吸顶表头 / header / footer、
   * 手里已经有 `offsetHeight` 时调它，账本立刻就对，不用等 ResizeObserver 那一拍。
   *
   * 为什么需要它：RO 是异步的，而 DOM 层的首帧摆放（`_applyLayout` 从
   * `stickyHeaderSize` 处排起）和 `bindDOM` 里的首屏定位（`initialIndex` /
   * `initialPosition: 'bottom'` 都要扣掉吸顶高度）都发生在**第一次 RO 回调之前**。
   * 那时账本里是 0，于是首帧内容整体上移一个吸顶高度 —— 第一项正好躲在吸顶区背后
   * （virt-table 的表格首行被固定表头压住就是这个原因，见其 `_syncGeometryVars`）。
   *
   * 值变了会 `_notify()`，与 RO 那条路径同一个规则（见 `_writeSlotSize`）。
   * 重复写同一个值是空操作，可以放心在每次重建插槽后无脑调。
   *
   * `client`（滚动容器）不走这里：它还要连带重算可视区间，只由 RO 与 `bindDOM` 维护。
   */
  setSlotSize(id: SlotId, size: number): void {
    if (this._writeSlotSize(id, size)) this._notify('size');
  }

  /**
   * 直接写入视口尺寸（滚动轴方向），并连带重算可视区间。
   *
   * 上面那句「`client` 不走 `setSlotSize`」的例外就在这里，用途只有一个：
   * **交叉轴出现原生滚动条时把它占掉的那一条从视口里扣掉**。滚动条占的宽度
   * Windows / Linux 上约 15px，macOS 的浮层滚动条是 0，而 ResizeObserver 报的
   * `borderBoxSize` 含它 —— 不扣的话 `maxOffset` 少算一个滚动条的量，
   * 滚到底时最后十几像素正好压在横向滚动条底下，怎么滚都露不出来。
   *
   * DOM 层量到真实视口（滚动层的 `clientHeight` / `clientWidth`，这两个值天生
   * 不含滚动条）之后调它。值没变是空操作，可以放心反复调。
   */
  setClientSize(size: number): void {
    if (!(size >= 0) || size === this.slotSize.clientSize) return;
    this.slotSize.clientSize = size;
    this._onClientResize();
    // 视口变了，最大偏移量与滑块几何随之变化，得让 DOM 层重摆一次
    this._notify('size');
  }

  /**
   * 重新把内容摆到当前偏移量上（如 keep-alive 场景）。
   *
   * 偏移量本身归 JS 掌管，hide / show 不会把它弄丢——需要恢复的是 **DOM**：
   * 容器重建后 transform 会被清掉，内容就回到了 0 的位置。
   *
   * 所以这里不能走 `scrollToOffset(this._syncedOffset)`：偏移量没变，
   * `_writeOffset` 会因为"值没变"而跳过通知，DOM 层收不到 offsetChange，
   * transform 也就不会被重写——`resume()` 就成了空操作。
   */
  resume(): void {
    this._events.offsetChange?.(this._scrollOffset);
    this._syncAfterWrite();
  }

  destroy(): void {
    this._loader.destroy();
    this._cancelAnim();
    this._pinned = null;
    if (this._clientEl) {
      this._resizeObserver?.unobserve(this._clientEl);
      if (this._onCopy) {
        this._clientEl.removeEventListener('copy', this._onCopy);
        this._onCopy = null;
      }
      this.slotSize.clientSize = 0;
    }
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._bound = false;
    this._clientEl = null;
  }

  // ==================== 私有方法 ====================

  /**
   * 让 copy 监听与 `copyText` 配置保持一致。
   *
   * 没配就一个监听都不挂：复制是浏览器的原生行为，不该因为引入了虚拟列表
   * 而多出一条谁都没要求的拦截。配置被运行时改掉时也要相应摘掉。
   *
   * 判断用 typeof 而不是真值：`_props` 是 `Required<Options>`，类型上这个字段
   * 「总是有值」，直接 `if (fn)` 会被 tsc 判成恒真（TS2774）。
   */
  private _syncCopyListener(): void {
    const el = this._clientEl;
    if (!el) return;

    const wanted = typeof this._props.copyText === 'function';
    if (wanted === !!this._onCopy) return;

    if (wanted) {
      this._onCopy = (e: ClipboardEvent) => this._handleCopy(e);
      el.addEventListener('copy', this._onCopy);
    } else if (this._onCopy) {
      el.removeEventListener('copy', this._onCopy);
      this._onCopy = null;
    }
  }

  /**
   * 供 buildCopyText 读取的最小信息面。
   *
   * 只读渲染窗口内的 key→索引：选区的两端必然落在已渲染的 DOM 上，
   * 而中间那些「不在 DOM 里」的项由索引区间直接推出，不需要查表。
   */
  private get _copyHost(): SelectionCopyHost {
    return {
      getRootEl: () => this._clientEl,
      getIndexByKey: (key: string) => this._renderKeys.get(key),
      getItemText: (index: number) => {
        const item = this._props.list[index];
        if (!item) return null;
        return this._props.copyText!(item, index);
      },
      getLength: () => this._props.list.length,
    };
  }

  /**
   * 用「选区真正覆盖的内容」改写剪贴板。
   *
   * 解不出结果时直接返回，既不 preventDefault 也不写剪贴板——浏览器的默认行为
   * 接着走，最坏情况是回到没有这个功能时的表现，不会因为拦截失败而复制不到东西。
   */
  private _handleCopy(e: ClipboardEvent): void {
    const doc = this._clientEl?.ownerDocument;
    const selection = doc?.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const text = buildCopyText(
      selection.getRangeAt(0),
      this._copyHost,
      this._props.copySeparator,
    );
    if (text === null) return;

    e.clipboardData?.setData('text/plain', text);
    e.preventDefault();
  }

  /**
   * 写入偏移量并返回裁剪后的真实值。
   *
   * 只负责"移动"，不做任何「后续该干什么」的记账——那个由调用方区分：
   * 程序化滚动走 `scrollToXxx`，用户滚动走 `scrollFromUser`。
   *
   * `source` 只用于 `scroll` 事件的载荷，不影响这里的任何行为。要求每个调用方
   * 显式给出而不设默认值：漏标会被类型检查拦住，而不是静默归到某一类里。
   */
  private _writeOffset(offset: number, source: VirtScrollSource): number {
    if (!this._bound) return this._scrollOffset;

    const next = Math.min(Math.max(offset, 0), this._maxScrollOffset());
    // 渐进修正会反复写同一个目标值，跳过无变化的写入省掉重复的样式失效
    if (next === this._scrollOffset) return next;

    const prev = this._scrollOffset;
    this._scrollOffset = next;
    // 同步通知：内容在这一步移动，与随后的 DOM patch 落在同一个任务里
    this._events.offsetChange?.(next);
    this._emitScroll(next, next - prev, source);
    return next;
  }

  /**
   * 组装并派发 `scroll` 事件。
   *
   * 没人监听时直接返回：载荷里的 `scrollSize` / `maxOffset` 虽然都是 O(1) 读取，
   * 但这是滚动热路径，白算一个对象没有必要。
   */
  private _emitScroll(
    offset: number,
    delta: number,
    source: VirtScrollSource,
  ): void {
    const handler = this._events.scroll;
    if (!handler) return;

    const clientSize = this.slotSize.clientSize;
    const scrollSize = this.getTotalSize();
    const maxOffset = Math.max(0, scrollSize - clientSize);

    handler({
      offset,
      delta,
      direction: delta > 0 ? 'end' : 'start',
      clientSize,
      scrollSize,
      maxOffset,
      atStart: offset <= 0,
      // 平滑动画的插值会落在 max 前几个千分位上，必须留容差，
      // 否则动画收尾那一帧的 atEnd 会是 false
      atEnd: maxOffset - offset < 0.5,
      source,
    });
  }

  /**
   * 允许的最大滚动偏移量。
   *
   * 滚动位置归 JS 掌管，所以账本就是权威——不存在「账本与浏览器的 scrollHeight
   * 对不上」这回事（原生滚动下两者实测差过 400 多 px，那时必须两头取大来仲裁）。
   */
  private _maxScrollOffset(): number {
    return Math.max(0, this.getTotalSize() - this.slotSize.clientSize);
  }

  /**
   * 程序化写入偏移量之后，把内部状态与渲染区间同步到新位置。
   *
   * 写入是同步的（偏移量就是个 JS 数字），但 `_syncedOffset`（上一次同步到的位置）与
   * 渲染区间不会自动跟上——不同步的话，本帧的绘制已经用了新位置，而区间还按旧位置
   * 算出来，视口就落在没有 DOM 的地方。
   */
  private _syncAfterWrite(): void {
    if (!this._bound) return;

    const real = this.getOffset();
    if (real === this._syncedOffset) return;

    // 方向按真实位移更新，否则后续的增量搜索会走错分支
    this._direction = real < this._syncedOffset ? 'forward' : 'backward';
    this._syncedOffset = real;
    this._calcRange();
  }

  // -------------------- 滚动定位 / 平滑动画 --------------------

  /** 放弃当前的滚动意图：停掉动画，取消待维持的目标 */
  private _clearScrollTasks(): void {
    this._cancelAnim();
    this._pinned = null;
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
      (this._props.estimatedSize + this._props.itemGap) * 10;
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
      this._writeOffset(this._clampOffset(getTarget()), 'program');
      this._syncAfterWrite();
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
          this._writeOffset(
            target > from ? target - maxDistance : target + maxDistance,
            'program',
          );
          this._syncAfterWrite();
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
        this._writeOffset(target, 'program');
        this._syncAfterWrite();
        this._finishAnim(false);
        return;
      }

      this._writeOffset(
        anim.from + (target - anim.from) * easeOutCubic(t),
        'program',
      );
      // 每帧都必须同步区间。靠原生滚动时这件事是浏览器代劳的（写 scrollTop 会异步
      // 派发 scroll 事件，区间靠它重算）；现在容器 overflow:hidden、没有 scroll
      // 事件，只写偏移量的话区间会冻结在起点——内容滑走而 DOM 窗口不动，就是露白
      this._syncAfterWrite();
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

  // -------------------- 滚动锚点 --------------------

  /**
   * 获取指定项的 top，语义与 `getItemPosByIndex(index).top` 完全一致，
   * 但对渲染窗口内的项是 O(渲染项数) 而非 O(index)。
   *
   * 锚点的捕获与求解都在滚动热路径上（每次 ResizeObserver 回调至少一次），
   * 而不定高模式下 `getItemPosByIndex` 要从 0 累加到 index——30w 列表滚到中段
   * 单次就是十几万次查表，向上滚动时每帧多次，直接吃掉整个帧预算。
   *
   * 快路径复用增量维护的 `leadingSize`（= renderBegin 之前的累计尺寸），
   * 只累加窗口内的几十项，成本与列表长度无关。被观察的项都在窗口内，
   * 所以 ResizeObserver 期间 `leadingSize` 不会失效。
   */
  private _getTopByIndex(index: number): number {
    // fixedSize 模式本就是 O(1) 乘法，且不计 headerSize，语义交给原方法
    if (this._props.fixedSize) return this.getItemPosByIndex(index).top;

    // leadingSize 失效时先补一次全量重算（罕见），之后重新走快路径
    if (this._leadingSizeDirty) this._updateLeadingSize();

    const { renderBegin, renderEnd } = this.state;
    if (index >= renderBegin && index <= renderEnd + 1) {
      return (
        this.slotSize.headerSize +
        this.state.leadingSize +
        this._getRangeSize(renderBegin, index)
      );
    }
    return this.getItemPosByIndex(index).top;
  }

  /**
   * 记下一个「锚定某项」的待维持目标。
   *
   * 参照项应当是已渲染测量过的项，否则它自身的尺寸也会变，目标就不稳。
   *
   * @param explicit 显式定位（scrollToIndex）不会被自动锚定覆盖
   */
  private _pinIndex(
    index: number,
    align: 'start' | 'end' = 'start',
    explicit = false,
  ): void {
    const item = this._props.list[index];
    if (!item) {
      this._pinned = null;
      return;
    }

    this._pinned = {
      kind: 'index',
      index,
      key: String(item[this._props.itemKey]),
      align,
      within: this.getOffset() - this._getIndexScrollTarget(index, align),
      explicit,
    };
  }

  /** 待维持目标当前解出来的偏移量；目标已失效时返回 null */
  private _solvePinned(): number | null {
    const pin = this._pinned;
    if (!pin) return null;

    if (pin.kind === 'end') return this._maxScrollOffset();

    // 参照项被移除或索引发生漂移，目标不再可信
    const item = this._props.list[pin.index];
    if (!item || String(item[this._props.itemKey]) !== pin.key) {
      this._pinned = null;
      return null;
    }
    return this._getIndexScrollTarget(pin.index, pin.align) + pin.within;
  }

  /**
   * 重新求解并应用待维持的目标。
   *
   * 每次 ResizeObserver 回调调一次。因为求解的是不变量而不是增量补偿，
   * 重复调用是幂等的——不需要收敛判据，也不需要重试上限。
   */
  private _resolvePinned(): void {
    const target = this._solvePinned();
    if (target === null) return;

    const drift = target - this.getOffset();
    // 亚像素漂移人眼不可见，改了反而会打断用户滚动
    if (Math.abs(drift) < 0.5) return;

    if (this._anim) {
      // 动画进行中：内容整体位移了 drift，插值起点必须同步平移，否则下一帧会把
      // 视口拉回旧坐标，表现为内容跳动 / 露白。位置本身交给动画的下一帧，
      // 这里不写偏移量，免得和插值互相抢夺
      this._anim.from += drift;
      return;
    }

    this._writeOffset(target, 'adjust');
    // 必须在本帧内让内部状态跟上刚写进去的偏移量，否则本帧的绘制用的是新位置，
    // 而渲染区间还按旧位置算——视口落在没有 DOM 的地方，就是一帧露白。
    // 向上滚动时每次 ResizeObserver 回调都会走到这里，会被放大成连续白屏。
    //
    // 必须走 _syncAfterWrite，不能自己赋 _syncedOffset 再调 _calcRange：那样会漏掉
    // **方向**的更新，而 _calcRange 的增量搜索是按方向分支的——方向不对时两个
    // 分支都不进，区间就原地不动（贴底求解正是这种情形：目标比当前位置更靠上）
    this._syncAfterWrite();
  }

  private _initBuffer(): void {
    this._bufferTop = this._props.bufferTop || this._props.buffer;
    this._bufferBottom = this._props.bufferBottom || this._props.buffer;
  }

  /**
   * 比对实测尺寸与 `estimatedSize`，差得离谱时提示一次。
   *
   * 为什么值得内建：`estimatedSize` 给错不会报错、也不会让布局最终出错
   * （项测量之后一切以实测为准），但它决定**首屏渲染多少项**——给大了视口下半部分
   * 会短暂留白，给小了白建一堆 DOM。这类症状很难反推到一个配置项上，
   * 而组件手里正好有判断它的全部依据。
   *
   * 用中位数而不是均值：不定高列表里几条超长消息就能把均值拉走，
   * 而中位数给出的正是「典型一项有多高」——也就是这个配置该填的值。
   */
  private _checkEstimatedSize(): void {
    const samples = this._sizeSamples;
    if (!samples) return;
    // 只诊断一次。样本一并丢掉，热路径上那个判断从此是一次 null 检查
    this._sizeSamples = null;

    const configured = this._props.estimatedSize;
    // 非正数是另一类配置错误，不在这里越权判断
    if (!(configured > 0)) return;

    const sorted = samples.slice().sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1]!;
    if (median <= 0) return;

    const ratio = median / configured;
    if (ratio <= SIZE_MISMATCH_RATIO && ratio >= 1 / SIZE_MISMATCH_RATIO) return;

    const suggested = Math.round(median);
    const detail = this._fixedSize
      ? `fixedSize 为 true 时所有项都按 estimatedSize 定位，与实际高度不符会让内容逐项错位。` +
        `要么把 estimatedSize 改成 ${suggested}，要么关掉 fixedSize 改用实测。`
      : `首屏渲染的项数按 estimatedSize 估算：偏大会少渲染（视口下方短暂留白），` +
        `偏小会多建 DOM。建议改为 ${suggested} 左右。`;

    console.warn(
      `[virt-list] estimatedSize 与实测尺寸相差较大：配置 ${configured}，` +
        `实测中位数 ${suggested}（取前 ${samples.length} 项）。${detail}` +
        `这条提示只出现一次。`,
    );
  }

  /**
   * 写入一个插槽的尺寸，返回**是否真的变了**。
   *
   * 收成一处是因为「变了要通知」这条规则不能只在一条写入路径上成立。原来两条路径
   * （RO 回调、无）都是直接赋值，而 `_notify()` 只在**列表项**尺寸有增量（`diff !== 0`）
   * 时才调 —— 插槽的 entry 不计入 `diff`，于是插槽尺寸的变化**从不通知上层**。
   *
   * 后果是实打实的：`stickyHeaderSize` 是内容坐标系的起点（DOM 层的 `_applyLayout`
   * 从它排起），它 0 → 42 之后没人重摆，内容就整体压在吸顶区背后，要等下一次滚动 /
   * 数据变化 / 强制刷新才「自己好了」。吸顶表头是运行时会变高的（多级分组表头重排、
   * 字体加载完成、display:none → 显示），不是只有首帧这一次。
   *
   * 只在**值确实变化**时返回 true：RO 每轮都会把没变的插槽也报一遍，
   * 无条件通知等于给每次容器 resize 附赠一次全量重绘。
   */
  private _writeSlotSize(id: SlotId, size: number): boolean {
    switch (id) {
      case 'header':
        if (this.slotSize.headerSize === size) return false;
        this.slotSize.headerSize = size;
        return true;
      case 'footer':
        if (this.slotSize.footerSize === size) return false;
        this.slotSize.footerSize = size;
        return true;
      case 'stickyHeader':
        if (this.slotSize.stickyHeaderSize === size) return false;
        this.slotSize.stickyHeaderSize = size;
        return true;
      case 'stickyFooter':
        if (this.slotSize.stickyFooterSize === size) return false;
        this.slotSize.stickyFooterSize = size;
        return true;
    }
  }

  /**
   * 初始化 ResizeObserver，统一监听：
   * - 滚动容器（data-id="client"）→ 更新 clientSize，重算起始
   * - 插槽元素（header/footer/sticky）→ 更新对应 slotSize
   * - 列表项（data-id=itemKey）→ 更新 sizesMap，触发偏移修正
   */
  private _initResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    // 一次回调就是一个外部事件（"这一批元素测出了新尺寸"），内部的偏移量修正与
    // 区间重算都是它的中间步骤，合并成一次通知。这条是滚动与流式输出的热路径：
    // 每有项被测量就走一遍，此前每次发 2 条（`_resolvePinned` 的 range + 末尾的 size）
    this._resizeObserver = new ResizeObserver((entries) =>
      this._coalesce(() => this._onResizeEntries(entries)),
    );
  }

  private _onResizeEntries(entries: ResizeObserverEntry[]): void {
    let diff = 0;
    /** 本轮有插槽尺寸真的变了（吸顶/吸底/header/footer，不含 client） */
    let slotChanged = false;
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
      } else if (isSlotId(id)) {
        if (this._writeSlotSize(id, newSize)) slotChanged = true;
      } else if (oldSize !== newSize) {
        // 直接写 map：公开的 setItemSize 会保守地整体废弃索引，
        // 而这里知道项的索引，可以只修正它所属的那一块
        this.sizesMap.set(id, newSize);
        const delta = newSize - oldSize;
        diff += delta;

        const index = this._renderKeys.get(id);
        if (index === undefined) {
          // 渲染窗口之外的项上报了尺寸：增量维护的值都不再可信
          this._leadingSizeDirty = true;
          this._sizeIndex.invalidate();
        } else {
          this._sizeIndex.applyDelta(index, delta);
        }
        this._events.itemResize?.(id, newSize);

        if (this._sizeSamples) {
          this._sizeSamples.push(newSize);
          if (this._sizeSamples.length >= SIZE_SAMPLE_TARGET) {
            this._checkEstimatedSize();
          }
        }
      }
    }

    this.state.itemsTotalSize += diff;

    // 重新求解待维持的目标，防止内容跳动。只有目标上方的项才会改变解，
    // 下方项的尺寸变化自然得出零位移，无需额外判断。
    //
    // 刻意放在 `diff !== 0` 之外：`kind:'end'` 的目标是 totalSize - clientSize，
    // **容器**尺寸变化也会让它失效，而那一轮的 diff 是 0。求解本身幂等，
    // 没有待维持目标时是一次早退
    this._resolvePinned();
    this._syncAfterWrite();

    if (diff !== 0) {

      // 尺寸变了，填满视口所需的项数也跟着变——项缩小时（折叠长消息）尤其明显：
      // 原本一项撑满视口，缩回去之后要好几项才够。偏移量没动的话上面那次同步
      // 是空操作，所以这里必须单独重算一次结束项
      this._refreshViewEnd();
      // itemsTotalSize 变了，footer 的文档位置随之改变；同时最大偏移量也变了，
      // 通知上层重摆各段并刷新滚动条滑块
      this._notify('size');
      // 首屏项测出真实尺寸后总高度才准，这时才能判断内容是否填满视口。
      // 首屏只回来半屏数据的情况全靠这里续拉，否则会停在半屏不再加载
      this._loader.checkAutoLoad();
    } else if (slotChanged) {
      // 插槽尺寸变了也必须通知，理由见 `_writeSlotSize`。
      // `diff !== 0` 那支已经 `_notify()` 过，这里只补它漏下的那种轮次
      this._notify('size');
    }

    // 首次渲染完成后再校准一次区间：首次测量之前 clientSize 是 0，
    // 那时算出的可视区间必然不可信。
    //
    // 参照物是当前真实的滚动偏移量，不是 props.initialIndex：initialIndex /
    // initialOffset / initialPosition='bottom' 以及用户在首帧里的滚动，都会让
    // 实际位置偏离它。用 initialIndex 就会把区间拽回列表顶部，而滚动位置在
    // 别处——视口于是落在还没渲染的空白上，且因为偏移量未变时同步逻辑会直接
    // 返回，这个错误状态不会自愈，非得用户滚一下才恢复。
    if (!this._isInit) {
      requestAnimationFrame(() => {
        if (this._bound) {
          this._syncedOffset = this.getOffset();
          this._calcRange();
        } else {
          // 还没绑定滚动容器，偏移量无从得知，此时 start 是唯一的参照
          this._updateRange(this._props.initialIndex);
        }
      });
      this._isInit = true;
    }
  }

  /**
   * 上报一次**用户发起**的滚动，偏移量由调用方给出。
   *
   * 与 `scrollToOffset` 的区别是语义：
   * - `scrollToOffset` 是「程序要求去某处」；
   * - 这个方法是「用户动了」——会触发 toTop / toBottom 判定、解开加载停摆，
   *   并让显式定位的意图作废。
   *
   * 浏览器不再派发 scroll 事件（容器 overflow:hidden），所有用户输入
   * （滚轮 / 键盘 / 触摸 / 拖拽滑块）都必须经由这里，
   * 否则 toTop / toBottom 与自动续拉都不会触发。
   */
  scrollFromUser(offset: number): void {
    this._writeOffset(offset, 'user');
    this._syncFromScrollPosition();
  }

  /**
   * 把内部状态同步到当前偏移量，并按用户滚动处理后续判定。
   *
   * 「谁动了偏移量」在这里是**确定的**，不需要任何猜测：所有写入都过我们的手，
   * 用户输入走 `scrollFromUser`，程序化定位走 `scrollToXxx`。
   * 原生滚动下这件事做不到——写 scrollTop 引发的 scroll 事件异步回送，
   * 与任何标记窗口都是竞态，只能靠比对"上次程序化写入的值"去猜。
   */
  private _syncFromScrollPosition(): void {
    const offset = this.getOffset();
    if (offset === this._syncedOffset) return;

    const direction = offset < this._syncedOffset ? 'forward' : 'backward';
    this._direction = direction;

    // 用户接管了滚动，显式定位（scrollToIndex / scrollToBottom）的意图作废
    if (this._pinned?.explicit) this._pinned = null;

    if (direction === 'forward') {
      // 向上滚：锚定当前顶部项。它已经渲染测量过、尺寸稳定，是可靠的参照物——
      // 上方即将进入窗口的新项测出真实尺寸后，据此把视口拉回同一段内容。
      // 必须在 _syncedOffset / 区间更新**之前**捕获，那时顶部项还是"用户正在看的那一项"
      if (!this._pinned?.explicit) this._pinIndex(this.state.inViewBegin);
    } else {
      // 向下滚说明用户已经离开原来那段内容，不再需要维持
      this._pinned = null;
    }

    this._syncedOffset = offset;

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
    // 否则 estimatedSize 大于视口时会少渲染
    if (this._fixedSize) {
      const startTop = this.slotSize.headerSize + start * this._unitSize;
      const span = Math.max(0, this._syncedOffset + clientSize - startTop);
      const end = start + Math.floor(span / this._unitSize) + 1;
      return end <= len ? end : Math.max(0, len - 1);
    }

    // 视口顶部通常落在 start 项的内部，而不是恰好对齐它的顶部。所以要覆盖的是
    // 绝对区间 [_syncedOffset, _syncedOffset + clientSize]，而不是"从 start 项顶部起的一屏"。
    //
    // 两者的差值就是视口顶部扎进 start 项的那段深度。项高远小于视口时，这点偏差
    // 被下面"多给一个渲染位"掩盖住了；可一旦某一项高于视口（展开的长消息就是），
    // 从它顶部算一屏在第一项就满了，后续项一个都不渲染——而它们本该出现在视口的
    // 下半部分，那里于是留下一块空白。
    //
    // 代价是一次 O(√n) 的前缀和查询；不定高路径本来就在用同量级的索引查询，
    // 而 fixedSize 模式走上面的快路径，不受影响。
    const targetBottom = this._syncedOffset + clientSize;
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

    if (this._fixedSize || this.sizesMap.size === 0) {
      // 均匀尺寸：顺手把索引也建好（O(n / 块大小)），这样即便随后开始实测，
      // 索引也一直是有效的，不会在某次大跳跃时突然付一笔 O(n) 重建
      this._sizeIndex.fill(len, this._unitSize);
      this.state.itemsTotalSize = len * this._unitSize;
      return;
    }

    // 取值函数在这里就把 list / itemKey / sizesMap / 估算值全部解构好：
    // 重建要跑满整个列表（30w 项就是 30w 次回调），每一次都去读 Proxy 属性、
    // 或多走一层 `getItemSize`（那里还要判一次 fixedSize）都会被放大 n 倍。
    //
    // key 已经是字符串时跳过 `String()`：`sizesMap` 按字符串存，而数字 key
    // 每次转换都要新分配一个堆对象——这是重建耗时里最大的一块，
    // 而字符串 id 的列表本来就不需要它。
    const sizes = this.sizesMap;
    const unit = this._unitSize;
    this._sizeIndex.rebuild(len, (index) => {
      const raw = list[index]?.[itemKey];
      const key = typeof raw === 'string' ? raw : String(raw);
      return sizes.get(key) ?? unit;
    });
    this.state.itemsTotalSize = this._sizeIndex.total;
  }

  /** 更新可视区间 [inViewBegin, inViewEnd] 并触发渲染区间更新 */
  private _updateRange(start: number): void {
    // 列表变短时（切换数据源、过滤）旧的 inViewBegin 可能已经越界，
    // 不夹一下会让 renderBegin 超过 renderEnd，渲染切片直接变成空数组
    const last = Math.max(0, this._props.list.length - 1);
    start = Math.min(Math.max(start, 0), last);

    this.state.inViewBegin = start;
    this.state.inViewEnd = this._calculateViewEnd(start);
    this._updateRenderRange();
  }

  /**
   * 根据当前 offset 定位新的 inViewBegin。
   *
   * - fixedSize：一次除法直接算出，与列表长度无关
   * - 不定高：从上一次的 inViewBegin 出发增量搜索（forward 往前、backward 往后）。
   *   增量是这里的关键，稳态滚动每帧只跨越几项；但一次性大跳（scrollToBottom、
   *   End 键、恢复滚动位置）仍是 O(跨越项数)，30w 列表全程约 13ms。
   */
  private _calcRange(): void {
    const target = this._syncedOffset - this.slotSize.headerSize;
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
    const beginTop = this._leadingSizeToInView();
    let top = beginTop;

    if (this._fixedSize) {
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
      if (this._syncedOffset - threshold <= 0) {
        this._events.toTop?.(list[0] as T);
        this._loader.onReachEdge('top');
      }
      return;
    }

    const scrollSize = Math.round(this._syncedOffset + this.slotSize.clientSize);
    if (Math.round(this.getTotalSize() - scrollSize) <= threshold) {
      // 用户自己滚到底 = 表达了「我要跟着最新内容看」。这一步之前，跟随只能靠
      // `scrollToBottom()` 或「追加时恰好贴底」建立，手动滚到底之后 _pinned 是
      // null——AI 流式输出那种「同一项持续变高」的变更于是不会跟随，内容直接
      // 长出视口下沿。
      //
      // explicit 必须是 false：向上滚时 `_syncFromScrollPosition` 会用
      // `_pinIndex(inViewBegin)` 覆盖非显式目标，脱离跟随这件事因此不需要
      // 额外的状态位，交回给既有的两条分支即可。
      if (this._props.stickyBottom) {
        this._pinned = { kind: 'end', explicit: false };
      }
      this._events.toBottom?.(list[list.length - 1] as T);
      this._loader.onReachEdge('bottom');
    }
  }

  /** 获取 leadingSize 到 inViewBegin 的累计尺寸（renderBegin → inViewBegin） */
  private _leadingSizeToInView(): number {
    return (
      this.state.leadingSize +
      this._getRangeSize(this.state.renderBegin, this.state.inViewBegin)
    );
  }

  /** 计算 [range1, range2) 区间内所有项的尺寸总和 */
  private _getRangeSize(range1: number, range2: number): number {
    const start = Math.min(range1, range2);
    const end = Math.max(range1, range2);
    // 没有任何实测尺寸时每项都是 estimatedSize + itemGap，与 fixedSize 同为一次乘法。
    // 首次装载正是这种情形——此时遍历几十万项纯属做白工
    if (this._fixedSize || this.sizesMap.size === 0) {
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

  /** 重新计算 renderBegin 之前所有项的尺寸（即 leadingSize） */
  private _updateLeadingSize(): void {
    this.state.leadingSize = this._prefixSize(this.state.renderBegin);
    // 全量重算即为权威值，此前的失效标记随之清除
    this._leadingSizeDirty = false;
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
   * 更新 leadingSize（增量计算），切片出 renderList 并通知上层。
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

    // leadingSize 优先增量更新（稳态滚动只挪动几项）；但一次性大跳时两端相距
    // 成千上万项，增量累加本身就成了 O(n)——那时直接走索引重算前缀和
    if (
      Math.abs(newRenderBegin - oldRenderBegin) > MAX_INCREMENTAL_STEPS
    ) {
      this.state.leadingSize = this._prefixSize(newRenderBegin);
    } else {
      const delta = this._getRangeSize(oldRenderBegin, newRenderBegin);
      this.state.leadingSize +=
        newRenderBegin > oldRenderBegin ? delta : -delta;
    }

    this._setRenderList();
    this._notify('range');
  }

  /** 列表数据变化后重新计算尺寸和区间 */
  private _onListChange(): void {
    this._coalesce(() => {
      this._onListChangeInner();
      // 末尾无条件要一次 `list`：走到这里就意味着 list 确实换过，DOM 层必须收到
      // 带 `list` 的通知才会让可见项重出内容。内部各步自报的是 `range` / `size`，
      // 光靠它们攒出来的原因不够强
      this._notify('list');
    });
  }

  private _onListChangeInner(): void {
    const newLen = this._props.list.length;
    this._lastChangeWasAppend = false;

    if (newLen <= 0) {
      this.reset();
      this._snapshotList();
      return;
    }

    const { count: shiftCount, size: shiftSize } = this._diffHead();

    if (shiftCount !== 0) {
      // 头部增删会把后续内容整体推移：补偿等量的 scrollOffset，让视口内容留在原处。
      // 使用方只管把新数据写进 list，位移补偿由这里承担。
      //
      // 变更前视口顶部那一项要先记下来：它是"用户正在看的内容"，也是稍后立锚点的
      // 参照。等下面重新定位过，这个信息就取不回来了
      const prevInViewBegin = this.state.inViewBegin;

      // 必须先算总尺寸再写偏移量：`_writeOffset` 会按 `_maxScrollOffset()`
      // （即 `getTotalSize() - clientSize`）裁剪，头部插入新增的那段高度不先进账，
      // 补偿量就会被裁掉。裁剪读的是账本、与 DOM 上容器有多高无关——偏移量由
      // core 自己持有（`_scrollOffset`），不经过原生 scrollTop
      this._calcListTotalSize();

      this._writeOffset(this._syncedOffset + shiftSize, 'adjust');
      // 与 _resolvePinned 同理：写完立刻把 _syncedOffset 同步到裁剪后的真实值，
      // 否则下一次滚动会拿旧值误判方向
      if (this._bound) this._syncedOffset = this.getOffset();

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
      const target = this._syncedOffset - this.slotSize.headerSize;
      const newBegin = target < 0 ? 0 : this._locateIndex(target);

      this.state.inViewBegin = newBegin;
      this.state.inViewEnd = this._calculateViewEnd(newBegin);
      this._updateRenderRange();
      // _updateRenderRange 的 leadingSize 走增量，而增量假设两次 renderBegin 指向
      // 同一个列表；头部平移后必须全量重算，否则渲染块的位移量会偏掉
      this._updateLeadingSize();

      // leadingSize 刚被全量校正，渲染切片要跟着重取——事务出栈时那一次通知
      // 发出去的就是这份切片与这个位移量
      this._setRenderList();

      if (shiftCount > 0) {
        // 头部插入项的尺寸此刻多半还是估算值，补偿量因此不准，差额要靠锚点在
        // 尺寸测出来之后补回来（_resolvePinned 每次 ResizeObserver 回调重新求解）。
        //
        // 参照项必须是「变更前视口顶部那一项」平移后的位置，而不是补偿后视口顶部
        // 那一项（newBegin）：后者可能正是刚插入的、尺寸还会变的项，锚在它身上
        // 只能保住它自己——它一变高，下面用户真正在看的内容就被整体挤下去。
        // 平移后的这一项已经渲染测量过，尺寸稳定，才是可靠参照。
        //
        // 放在通知之后：捕获要用到刚校正的 leadingSize 与渲染区间
        const anchorIndex = Math.min(
          prevInViewBegin + shiftCount,
          Math.max(0, this._props.list.length - 1),
        );
        this._pinIndex(anchorIndex);
      }
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
      // 列表变短后旧偏移量可能已越界：重写一次当前值就会被夹回范围内
      const beforeClamp = this.getOffset();
      this._writeOffset(beforeClamp, 'adjust');
      if (this.getOffset() !== beforeClamp) {
        this._syncedOffset = this.getOffset();
        // 偏移量变了，旧的 inViewBegin 不再对应当前位置，按新偏移量权威定位
        const target = this._syncedOffset - this.slotSize.headerSize;
        this._updateRange(target < 0 ? 0 : this._locateIndex(target));
      } else {
        this._updateRange(this.state.inViewBegin);
      }
      this._updateLeadingSize();
      this._updateRenderRange();

      // 列表变了，待维持的目标要按新内容重新求解（例如贴底跟随）
      this._resolvePinned();

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
    const newFirstKey = list[0]?.[itemKey];
    if (newFirstKey === prevFirstKey) return none;

    // 旧首项在新列表的前段出现 → 它前面的都是新插入的项
    const scanEnd = Math.min(list.length, HEAD_SCAN_LIMIT);
    for (let i = 1; i < scanEnd; i += 1) {
      if (list[i]?.[itemKey] === prevFirstKey) {
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
          size += this.getItemSize(String(prev[j]));
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
    // 原样存，不转字符串——理由见 `_prevHeadKeys`
    const keys: unknown[] = new Array(n);
    for (let i = 0; i < n; i += 1) {
      keys[i] = list[i]?.[itemKey];
    }
    this._prevHeadKeys = keys;
    this._prevLen = list.length;
    this._prevTotalSize = this.getTotalSize();
    this._hasListSnapshot = true;
  }

  /**
   * 通知上层渲染列表已更新。
   *
   * `reason` 必传：DOM 层要靠它区分「数据变了」和「只是滚动/尺寸变了」——
   * 前者才需要让池里已有的项重新出内容。漏标或标错会直接变成性能问题
   * （每帧重渲染全部可见项）或正确性问题（数据变了内容不刷新），
   * 所以这里不给默认值，每个调用点都必须显式说明自己是哪一类。
   */
  private _notify(reason: ListUpdateReason): void {
    // 事务内的通知不当场发，攒成一条由出栈时代表整趟变更（见 `_coalesce`）
    if (this._coalesceDepth > 0) {
      this._pendingReason = strongerReason(this._pendingReason, reason);
      return;
    }
    this._emitUpdate(reason);
  }

  /**
   * 把一串内部校正合并成**一次**通知。
   *
   * 一个外部事件（列表换了、一批项测出新尺寸、强制刷新）在 core 内部要经过好几步
   * 校正：区间 → leadingSize → 偏移量补偿 → 贴底求解。每一步都会顺手 `_notify`，
   * 而它们全是通往同一个终态的中间态——实测一次列表变更发 2~3 次，一批尺寸上报发 2 次，
   * `forceUpdate` 发 2 次。
   *
   * 逐次发出去的代价是实打实的：DOM 层每收到一次就要重摆各段、重建一遍 key 集合、
   * 把可见项过一遍；带 `list` / `force` 的那几次还会让每个可见项重出内容，
   * 于是 Vue / vue2 的插槽多求值一遍、Tree 的整池 DOM 多重建一遍。
   *
   * `reason` 不写死而是取事务内出现过的**最强**那个（range < size < force < list）：
   * DOM 层拿它决定要不要重出内容、要不要重新校正交叉轴视口，标弱了会漏刷新，
   * 标强了会白干活。
   */
  private _coalesce(fn: () => void): void {
    this._coalesceDepth += 1;
    try {
      fn();
    } finally {
      this._coalesceDepth -= 1;
    }
    if (this._coalesceDepth > 0) return;

    const reason = this._pendingReason;
    this._pendingReason = null;
    if (reason) this._emitUpdate(reason);
  }

  /** 真正把 update 事件发出去。事务合并之后只剩这里一个出口 */
  private _emitUpdate(reason: ListUpdateReason): void {
    // leadingSize 失效时先补一次全量重算。
    //
    // 上层拿它当渲染块的位移量（itemsEl 的 transform），用陈旧值会让这一块内容整体偏移，
    // 表现就是视口里某几项凭空消失、再滚一下才恢复。
    //
    // 失效的来源是"渲染窗口之外的项报来了尺寸"：项滚出窗口后 DOM 已移除、
    // 也调过 unobserve，但 ResizeObserver 的回调是异步的，队列里可能还压着它的
    // 一条上报，快速滚动时很常见。此前只有 _getTopByIndex 会消费这个标记，
    // 而 DOM 层读的是 state.leadingSize，走不到那里。
    if (this._leadingSizeDirty) this._updateLeadingSize();

    this._events.update?.(this._renderList, this.state, reason);
  }
}
