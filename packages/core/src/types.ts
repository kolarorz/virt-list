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
  /** 初始化后自动滚动到的索引 */
  start?: number;
  /** 初始化后自动滚动到的偏移量 */
  offset?: number;
  /** 自定义渲染区间控制（覆盖默认的 buffer 逻辑） */
  renderControl?: (
    begin: number,
    end: number,
  ) => { begin: number; end: number };
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
   */
  renderHeader?: (el: HTMLElement) => HTMLElement | void;
  /**
   * 列表底部渲染函数（参与滚动）。
   * 同 renderItem，可返回元素或直接操作 el。
   */
  renderFooter?: (el: HTMLElement) => HTMLElement | void;
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
  horizontal: false,
  start: 0,
  offset: 0,
  renderControl: undefined,
} as const;
