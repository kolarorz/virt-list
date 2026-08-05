/* eslint-disable @typescript-eslint/no-explicit-any */

/** 样式对象（键值对，camelCase 会被转换为 kebab-case） */
export type StyleObject = Record<string, string | number | null | undefined>;

/**
 * CSS 样式值：
 * - string: CSS 文本
 * - object: 样式对象
 * - array: 样式数组（可嵌套）
 */
export type StyleValue = string | StyleObject | StyleValue[];

/**
 * class 值：
 * - string: class 文本
 * - object: `{ className: boolean }`
 * - array: class 数组（可嵌套）
 */
export type ClassValue =
  | string
  | Record<string, boolean | null | undefined>
  | ClassValue[];

/**
 * 虚拟列表的响应式状态数据，驱动渲染与滚动定位。
 */
export interface ListState {
  /** 所有列表项的尺寸总和（不含 slot） */
  listTotalSize: number;
  /** renderBegin 之前所有项的累计尺寸，用于虚拟占位 */
  virtualSize: number;
  /** 视口内第一个可见项的索引 */
  inViewBegin: number;
  /** 视口内最后一个可见项的索引 */
  inViewEnd: number;
  /** 实际渲染区间起始索引（含 buffer） */
  renderBegin: number;
  /** 实际渲染区间结束索引（含 buffer） */
  renderEnd: number;
}

/**
 * 各个插槽区域的尺寸，由 ResizeObserver 实时更新。
 */
export interface SlotSize {
  /** 滚动容器的可视尺寸（高度或宽度） */
  clientSize: number;
  /** 列表头部插槽尺寸（参与滚动） */
  headerSize: number;
  /** 列表底部插槽尺寸（参与滚动） */
  footerSize: number;
  /** 吸顶插槽尺寸（不参与滚动偏移计算） */
  stickyHeaderSize: number;
  /** 吸底插槽尺寸（不参与滚动偏移计算） */
  stickyFooterSize: number;
}

/**
 * 滚动行为配置。
 *
 * 注意：不能命名为 `ScrollToOptions`，会与 DOM 内置全局类型冲突。
 */
export interface VirtScrollOptions {
  /**
   * 滚动方式：
   * - `'auto'`（默认）：瞬时跳转
   * - `'smooth'`：requestAnimationFrame 动画
   */
  behavior?: 'auto' | 'smooth';
  /**
   * 目标项与视口的对齐方式（仅 scrollToIndex 生效）：
   * - `'start'`（默认）：项的顶部对齐视口顶部
   * - `'end'`：项的底部对齐视口底部
   *
   * 对齐用的是列表项容器的边界，项内的 padding 与 itemGap 都已计入，
   * 所以卡片之间的间隔会自然保留下来。
   *
   * `'end'` 用于展开成好几屏的项——顶部对齐会把刚展开的内容推到视口外面去。
   */
  align?: 'start' | 'end';
  /** 动画时长（ms），仅 smooth 生效；缺省取 options.scrollDuration */
  duration?: number;
  /**
   * 本次逐帧穿越的最大距离（px），超出部分先瞬跳；
   * 缺省取 options.smoothMaxDistance（默认两倍视口）。
   */
  maxDistance?: number;
  /** 动画结束回调，canceled 表示被中断（用户滚动 / 新的滚动调用 / destroy） */
  onDone?: (canceled: boolean) => void;
}

/** 加载方向 */
export type LoadDirection = 'top' | 'bottom';

/**
 * 分页 / 无限加载的运行状态，透出给上层渲染加载提示条。
 */
export interface LoadState {
  /** 顶部方向正在加载 */
  loadingTop: boolean;
  /** 底部方向正在加载 */
  loadingBottom: boolean;
  /** 顶部方向是否还有更多数据 */
  hasMoreTop: boolean;
  /** 底部方向是否还有更多数据 */
  hasMoreBottom: boolean;
  /**
   * 未贴底时尾部新增的项数（贴底跟随场景下的"N 条新消息"角标）。
   * 视口回到底部后归零。仅在 stickyBottom 开启时累加。
   */
  pendingNew: number;
}

/**
 * 虚拟列表核心配置项。
 */
export interface VirtListOptions<T extends Record<string, any>> {
  /** 数据源数组 */
  list: T[];
  /** 每项的唯一 key 字段名 */
  itemKey: string;
  /** 每项的预估尺寸（px），用于初始布局与未测量项的占位 */
  itemPreSize: number;
  /** 列表项之间的间距（px） */
  itemGap?: number;
  /** 是否固定高度模式（跳过 ResizeObserver 测量） */
  fixed?: boolean;
  /** 上下两侧的渲染缓冲项数（同时设置 bufferTop/bufferBottom） */
  buffer?: number;
  /** 向上方向单独设置的缓冲项数 */
  bufferTop?: number;
  /** 向下方向单独设置的缓冲项数 */
  bufferBottom?: number;
  /** 是否启用水平滚动模式 */
  horizontal?: boolean;
  /** 触发 toTop/toBottom 事件的阈值距离（px） */
  scrollDistance?: number;
  /** smooth 滚动的默认动画时长（ms） */
  scrollDuration?: number;
  /**
   * 平滑滚动允许逐帧穿越的最大距离（px），超出部分先瞬跳掉。
   * 缺省为两倍视口高度。设为 Infinity 表示全程逐帧滚动（长距离会明显露白）。
   */
  smoothMaxDistance?: number;
  /** 初始化后自动滚动到的索引 */
  start?: number;
  /** 初始化后自动滚动到的偏移量 */
  offset?: number;
  /** 自定义渲染区间控制（覆盖默认的 buffer 逻辑） */
  renderControl?: (
    begin: number,
    end: number,
  ) => { begin: number; end: number };

  /**
   * 触达边界时的取数回调，声明式分页 / 无限加载的入口。
   *
   * 约定：回调内部自行把新数据写入 `list`（数据所有权仍在使用方，这样才能适配
   * Vue 的响应式与 React 的 setState），返回该方向是否还有更多数据；
   * 返回 `false` 会关闭这个方向的后续触发，返回 `void` 视为仍有更多。
   *
   * 库负责其余全部：防重入、加载期间不重复触发、加载后的位移补偿与重算、
   * 内容不足一屏时自动续拉、loading 状态透出。
   *
   * ```ts
   * loadMore: async (dir) => {
   *   const data = await fetchPage(dir === 'top' ? --page : ++page);
   *   list.value = dir === 'top' ? data.concat(list.value) : list.value.concat(data);
   *   return data.length > 0;
   * }
   * ```
   */
  loadMore?: (
    direction: LoadDirection,
  ) => boolean | void | Promise<boolean | void>;
  /** 顶部方向是否还有更多数据，默认 true；可作为受控属性覆盖 loadMore 的返回值 */
  hasMoreTop?: boolean;
  /** 底部方向是否还有更多数据，默认 true；可作为受控属性覆盖 loadMore 的返回值 */
  hasMoreBottom?: boolean;
  /**
   * 首屏定位。`'bottom'` 会在挂载后定位到列表底部，并在不定高场景下
   * 随尺寸测量渐进校准（聊天室的常规需求）。
   * 与 start / offset 同时给出时，start / offset 优先。
   */
  initialPosition?: 'top' | 'bottom';
  /**
   * 尾部追加时是否自动跟随到底部。
   *
   * 关键在于"仅在原本就贴底时才跟随"：用户正在向上翻历史消息时来了新消息，
   * 视口不会被拽走，新增量记在 loadState.pendingNew 里供上层渲染角标。
   */
  stickyBottom?: boolean;
  /** 判定"贴底"的容差（px），缺省取 scrollDistance（至少 2px） */
  stickyThreshold?: number;
}

export type RequiredOptions<T extends Record<string, any>> = Required<
  VirtListOptions<T>
>;

/**
 * 虚拟列表事件回调。
 */
export interface VirtListEvents<T extends Record<string, any>> {
  /** 滚动事件 */
  scroll?: (e: Event) => void;
  /** 滚动到顶部时触发，参数为第一项 */
  toTop?: (item: T) => void;
  /** 滚动到底部时触发，参数为最后一项 */
  toBottom?: (item: T) => void;
  /** 某项尺寸变化时触发 */
  itemResize?: (id: string, newSize: number) => void;
  /** 渲染列表（可视区间）更新时触发 */
  update?: (renderList: T[], state: ListState) => void;
  /** 加载状态变化时触发（loading / hasMore / pendingNew） */
  loadStateChange?: (state: LoadState) => void;
}

/**
 * DOM 层虚拟列表的扩展配置项，在核心配置基础上增加渲染相关选项。
 */
export interface VirtListDOMOptions<T extends Record<string, any>>
  extends VirtListOptions<T> {
  /**
   * 列表项渲染函数。
   * - 返回 HTMLElement：自动 appendChild 到 item wrapper 中
   * - 返回 void：可直接操作第三个参数 el（item wrapper），减少一层 DOM 嵌套
   */
  renderItem: (item: T, index: number, el: HTMLElement) => HTMLElement | void;
  /**
   * 列表头部渲染函数（参与滚动）。
   * 同 renderItem，可返回元素或直接操作 el。
   *
   * 第二个参数是当前加载状态，加载提示条（"加载中" / "没有更早的消息了"）直接
   * 据此渲染即可。状态变化时这个函数会被重新调用。
   */
  renderHeader?: (el: HTMLElement, loadState: LoadState) => HTMLElement | void;
  /**
   * 列表底部渲染函数（参与滚动）。
   * 同 renderItem，可返回元素或直接操作 el。
   *
   * 同 renderHeader，第二个参数为当前加载状态。
   */
  renderFooter?: (el: HTMLElement, loadState: LoadState) => HTMLElement | void;
  /**
   * 吸顶区域渲染函数。
   * 同 renderItem，可返回元素或直接操作 el。
   */
  renderStickyHeader?: (el: HTMLElement) => HTMLElement | void;
  /**
   * 吸底区域渲染函数。
   * 同 renderItem，可返回元素或直接操作 el。
   */
  renderStickyFooter?: (el: HTMLElement) => HTMLElement | void;
  /**
   * 空状态渲染函数。
   * 同 renderItem，可返回元素或直接操作 el。
   */
  renderEmpty?: (el: HTMLElement) => HTMLElement | void;
  /** 列表项 DOM 挂载后回调 */
  onItemMounted?: (el: HTMLElement) => void;
  /** 列表项 DOM 卸载后回调 */
  onItemUnmounted?: (el: HTMLElement) => void;
  /** 列表容器的自定义 style */
  listStyle?: StyleValue;
  /** 列表容器的自定义 class */
  listClass?: ClassValue;
  /** 列表项的自定义 style（可为函数） */
  itemStyle?: StyleValue | ((item: T, index: number) => StyleValue);
  /** 列表项的自定义 class（可为函数） */
  itemClass?: ClassValue | ((item: T, index: number) => ClassValue);
  headerClass?: ClassValue;
  headerStyle?: StyleValue;
  footerClass?: ClassValue;
  footerStyle?: StyleValue;
  stickyHeaderClass?: ClassValue;
  stickyHeaderStyle?: StyleValue;
  stickyFooterClass?: ClassValue;
  stickyFooterStyle?: StyleValue;
}

/** 虚拟列表选项的默认值 */
export const DEFAULT_OPTIONS = {
  itemGap: 0,
  fixed: false,
  buffer: 0,
  bufferTop: 0,
  bufferBottom: 0,
  scrollDistance: 0,
  scrollDuration: 300,
  smoothMaxDistance: 0,
  horizontal: false,
  start: 0,
  offset: 0,
  renderControl: undefined,
  loadMore: undefined,
  hasMoreTop: true,
  hasMoreBottom: true,
  initialPosition: 'top',
  stickyBottom: false,
  stickyThreshold: 0,
} as const;
