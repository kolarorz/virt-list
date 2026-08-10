export { VirtList } from './VirtList';
export { VirtGrid } from './VirtGrid';
export { VirtTree } from './tree';
export { DEFAULT_DOM_OPTIONS } from './defaults';

export type { VirtGridOptions, VirtGridEvents, GridRow } from './VirtGrid';
export type {
  TreeNode,
  TreeNodeData,
  TreeNodeKey,
  TreeData,
  TreeFieldNames,
  TreeInfo,
  CheckedInfo,
  IScrollParams,
  VirtTreeDOMOptions,
  VirtTreeDOMEvents,
} from './tree';
export type {
  ListState,
  SlotSize,
  VirtScrollOptions,
  VirtScrollEvent,
  VirtScrollSource,
  LoadState,
  LoadDirection,
} from '@virt-list/core';
export { normalizeStyle, mergeStyles, setAttrs, applyStyle, applyClass } from './utils';

/**
 * 自绘滚动条的可复用零件。
 *
 * 透出它们是为了让**别的**虚拟化组件（virt-table 的表格就是一例）能共用同一套
 * 滚动条外观与手势，而不必各写一份。三块的职责边界：
 *
 * - `Scrollbar`：单轴的「画滑块 + 指针位置↔比例换算」，与数据源无关 ——
 *   纵横两条都用它，差别只在宿主给的 `getTotalSize` / `getRatio` 从哪来；
 * - `InputController`：滚轮 / 键盘 / 触摸 / 惯性的接管，单轴；
 * - `geometry`：一组纯函数。`positionToRatio` / `ratioToPosition` 严格互逆，
 *   不定高列表按**索引**映射滑块时靠它们保证「拖到某处松手滑块不跳」。
 *
 * 外观样式在 `./scrollbar.css`（子路径导出）。宿主的容器类名与 `.virt-list__client`
 * 不同时，那份里的 hover 显形选择器要自己重写。
 */
export { Scrollbar } from './scrollbar/Scrollbar';
export type { ScrollbarHost, ScrollbarOptions } from './scrollbar/Scrollbar';
export { InputController } from './scrollbar/InputController';
export type { InputHost, InputControllerOptions } from './scrollbar/InputController';
export {
  computeThumb,
  positionToRatio,
  ratioToPosition,
  pointerToRatio,
  DEFAULT_MIN_THUMB_SIZE,
} from './scrollbar/geometry';
export type { ThumbGeometry } from './scrollbar/geometry';
