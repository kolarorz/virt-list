/**
 * 自绘滚动条的几何与映射计算。
 *
 * 全部是纯函数，不碰 DOM —— 滚动条最容易出错的地方就是这些换算，
 * 单独拎出来才能直接单测，不必去驱动一整套鼠标事件。
 */

/** 滑块尺寸的下限（px），太短会没法用鼠标抓住 */
export const DEFAULT_MIN_THUMB_SIZE = 20;

export interface ThumbGeometry {
  /** 滑块长度（px） */
  size: number;
  /** 滑块可移动的行程（px），即轨道长度减去滑块长度 */
  travel: number;
  /** 内容是否长到需要滚动条 */
  visible: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * 由「视口 / 内容」的比例求滑块尺寸。
 *
 * 滑块有最小长度，所以行程 `travel` 一般小于 `trackSize - trackSize*clientSize/totalSize`，
 * 位置换算必须用 travel 而不是轨道长度，否则长列表拖到底也到不了底。
 */
export function computeThumb(params: {
  trackSize: number;
  clientSize: number;
  totalSize: number;
  minThumbSize?: number;
}): ThumbGeometry {
  const { trackSize, clientSize, totalSize } = params;
  const minThumbSize = params.minThumbSize ?? DEFAULT_MIN_THUMB_SIZE;

  if (
    trackSize <= 0 ||
    clientSize <= 0 ||
    totalSize <= clientSize
  ) {
    return { size: 0, travel: 0, visible: false };
  }

  const size = clamp(
    (trackSize * clientSize) / totalSize,
    Math.min(minThumbSize, trackSize),
    trackSize,
  );
  return { size, travel: Math.max(0, trackSize - size), visible: true };
}

/**
 * 内容像素偏移 → 滑块比例（0..1）。
 *
 * 自绘滚动条要与原生滚动条保持同一种空间语义：内容走过可滚动距离的 30%，
 * 滑块也走过自身行程的 30%。不定高列表可以在测量回填后重新计算 maxOffset，
 * 但不能把不同高度的项压成相同的滑块刻度。
 */
export function offsetToRatio(offset: number, maxOffset: number): number {
  if (maxOffset <= 0) return 0;
  return clamp(offset / maxOffset, 0, 1);
}

/** 滑块比例 → 内容像素偏移，`offsetToRatio` 的逆运算。 */
export function ratioToOffset(ratio: number, maxOffset: number): number {
  if (maxOffset <= 0) return 0;
  return clamp(ratio, 0, 1) * maxOffset;
}

/**
 * 内容位置 → 滑块比例（0..1）。
 *
 * 这是供需要「每项等权」语义的外部组件使用的索引映射工具；VirtList 自己的
 * 滚动条使用 `offsetToRatio`，与原生滚动条一样按像素距离映射。
 *
 * `frac` 是视口顶部扎进该项内部的比例，让滑块在长项上也能连续移动而不是一格一格跳。
 *
 * @param maxBegin 滚到底时视口顶部那一项的索引，也就是 inViewBegin 的上限
 */
export function positionToRatio(params: {
  inViewBegin: number;
  maxBegin: number;
  frac: number;
}): number {
  const { inViewBegin, maxBegin, frac } = params;
  if (maxBegin <= 0) return 0;
  return clamp((inViewBegin + clamp(frac, 0, 1)) / maxBegin, 0, 1);
}

/**
 * 滑块比例 → 内容位置，`positionToRatio` 的逆运算。
 *
 * 两个方向必须严格互逆，否则拖到某处一松手，滑块就会跳到别的地方。
 */
export function ratioToPosition(
  ratio: number,
  maxBegin: number,
): { index: number; frac: number } {
  if (maxBegin <= 0) return { index: 0, frac: 0 };

  const pos = clamp(ratio, 0, 1) * maxBegin;
  const index = Math.min(Math.floor(pos), maxBegin);
  return { index, frac: pos - index };
}

/**
 * 指针位置 → 滑块比例。
 *
 * @param pointer   指针在轨道所在轴上的坐标（视口坐标系）
 * @param trackStart 轨道起点的视口坐标
 * @param grabDelta 按下时指针相对滑块起点的偏移，拖拽时滑块不会"跳到指针下"
 */
export function pointerToRatio(params: {
  pointer: number;
  trackStart: number;
  grabDelta: number;
  travel: number;
}): number {
  const { pointer, trackStart, grabDelta, travel } = params;
  if (travel <= 0) return 0;
  return clamp((pointer - trackStart - grabDelta) / travel, 0, 1);
}
