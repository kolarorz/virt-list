/**
 * DOM 层选项的默认值。
 *
 * 与 core 的 `DEFAULT_OPTIONS` 分工明确：那张表只管 `VirtListOptions`（算法内核认识的
 * 选项），这张表只管 `VirtListDOMOptions` 独有的部分。两层各自维护自己的默认值，
 * 才不会出现「core 以为是 A、DOM 层以为是 B」的错位。
 *
 * 和 core 一样，默认值在每次读取时兜底（而非构造时拷贝一份），因此运行时改这里
 * 会影响**之后**创建的实例 —— 示例站的滚动条开关正是靠这一点做到「切换后重挂载即生效」。
 */
export const DEFAULT_DOM_OPTIONS = {
  /** 自绘滚动条停止滚动多久后淡出（ms），`0` 表示常驻 */
  scrollbarAutoHide: 1200,
};
