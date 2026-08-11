export { VirtList } from './VirtList.js';
export { VirtGrid } from './VirtGrid.js';
export { VirtTree } from './tree/index.js';
export { DEFAULT_DOM_OPTIONS } from './defaults.js';

export type { VirtGridOptions, VirtGridEvents, GridRow } from './VirtGrid.js';
export type {
  TreeNode,
  TreeNodeData,
  TreeNodeKey,
  TreeData,
  TreeFieldNames,
  TreeInfo,
  CheckedInfo,
  VirtTreeScrollTarget,
  VirtTreeDOMOptions,
  VirtTreeDOMEvents,
} from './tree/index.js';
export type {
  ListState,
  SlotSize,
  VirtScrollOptions,
  VirtScrollEvent,
  VirtScrollSource,
  LoadState,
  LoadDirection,
} from '@virt-list/core';
export { normalizeStyle, mergeStyles, setAttrs, applyStyle, applyClass } from './utils.js';

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
export { Scrollbar } from './scrollbar/Scrollbar.js';
export type { ScrollbarHost, ScrollbarOptions } from './scrollbar/Scrollbar.js';
export { InputController } from './scrollbar/InputController.js';
export type { InputHost, InputControllerOptions } from './scrollbar/InputController.js';
export {
  computeThumb,
  positionToRatio,
  ratioToPosition,
  pointerToRatio,
  DEFAULT_MIN_THUMB_SIZE,
} from './scrollbar/geometry.js';
export type { ThumbGeometry } from './scrollbar/geometry.js';
// 流式输出的帧内合并：与虚拟列表无耦合的纯工具，一并透出免得使用方直接依赖 core
export { createStreamBuffer } from '@virt-list/core';
export type { StreamBuffer } from '@virt-list/core';
