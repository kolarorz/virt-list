/**
 * 语义滚动条的分段计算，五个框架共用。
 *
 * 「语义滚动条」通常被想象成要靠模型去理解内容，但对结构化的长列表来说完全不必：
 * Agent 执行流里「一个阶段」的边界是可以从数据本身读出来的——
 * 思考行开启一个新阶段，连续的错误自成一段。纯函数、无网络、无模型。
 *
 * 分段的用途有两个：
 * - 在滚动条旁边画出色块，让用户一眼看出「这条日志的形状」；
 * - 点击某段跳过去，代替漫无目的地拖滚动条。
 */

import type { TraceLine } from './traceData';

export interface OutlineSection {
  /** 段起始项的索引，点击跳转用 */
  index: number;
  /** 段内项数，决定色块高度占比 */
  count: number;
  /** 段落标题，取自开启这一段的那一行 */
  title: string;
  /** 这一段里最严重的事件类型，决定色块颜色 */
  kind: TraceLine['kind'];
  /** 段内错误数，用来在导航条上标记出问题的位置 */
  errors: number;
}

/** 一段最少要有这么多行，否则并入上一段——否则连续的思考行会切出一堆一行段 */
const MIN_SECTION = 3;

/**
 * 导航条最多显示多少段。
 *
 * 这不是审美问题而是布局约束：每个色块都有最小可见高度，段数一多，
 * 色块高度之和就会超过容器高度——被压到最小值之后仍然装不下，
 * 整条导航条于是比列表高出一截。
 *
 * 三千行日志按「每十行一次思考」的节奏会切出三百段，远超容器能容纳的数量，
 * 所以分段之后必须再按上限合并一次。
 */
export const MAX_SECTIONS = 48;

/**
 * 把执行流切成若干段。
 *
 * 规则：
 * - `thought`（思考）开启新的一段，它的文本就是段落标题；
 * - 太短的段并入上一段，避免导航条被碎片淹没；
 * - 段的颜色取段内最严重的事件（错误 > 工具 > 输出）。
 */
export function buildOutline(
  list: TraceLine[],
  maxSections = MAX_SECTIONS,
): OutlineSection[] {
  const sections: OutlineSection[] = [];

  for (let i = 0; i < list.length; i += 1) {
    const line = list[i]!;
    const startsNew = line.kind === 'thought' || sections.length === 0;

    if (startsNew) {
      const prev = sections[sections.length - 1];
      // 上一段太短就不另起一段，把这一行并进去
      if (prev && prev.count < MIN_SECTION) {
        prev.count += 1;
        if (line.kind === 'error') prev.errors += 1;
        continue;
      }
      sections.push({
        index: i,
        count: 1,
        title: line.kind === 'thought' ? line.text : '执行中',
        kind: line.kind,
        errors: line.kind === 'error' ? 1 : 0,
      });
      continue;
    }

    const current = sections[sections.length - 1]!;
    current.count += 1;
    if (line.kind === 'error') {
      current.errors += 1;
      current.kind = 'error';
    } else if (current.kind !== 'error' && line.kind === 'tool') {
      current.kind = 'tool';
    }
  }

  return sections.length > maxSections ? mergeSections(sections, maxSections) : sections;
}

/** 严重程度排序，合并时取更高的那一个 */
const SEVERITY: Record<TraceLine['kind'], number> = {
  error: 3,
  tool: 2,
  output: 1,
  thought: 0,
};

/**
 * 把相邻的段等量合并到不超过上限。
 *
 * 合并保留的是「结构的轮廓」：段首索引取组内第一段的（点击仍跳到那一段的开头）、
 * 标题取第一段的、颜色取组内最严重的、错误数累加——于是含错误的位置在合并后
 * 依然显眼，不会被旁边的正常段冲淡。
 */
function mergeSections(
  sections: OutlineSection[],
  maxSections: number,
): OutlineSection[] {
  const groupSize = Math.ceil(sections.length / maxSections);
  const merged: OutlineSection[] = [];

  for (let i = 0; i < sections.length; i += groupSize) {
    const group = sections.slice(i, i + groupSize);
    const head = group[0]!;
    const worst = group.reduce((a, b) => (SEVERITY[b.kind] > SEVERITY[a.kind] ? b : a));

    merged.push({
      index: head.index,
      count: group.reduce((sum, s) => sum + s.count, 0),
      title: group.length > 1 ? `${head.title}（含 ${group.length} 个阶段）` : head.title,
      kind: worst.kind,
      errors: group.reduce((sum, s) => sum + s.errors, 0),
    });
  }

  return merged;
}

/** 当前视口落在第几段（用 inViewBegin 判断） */
export function activeSection(
  sections: OutlineSection[],
  inViewBegin: number,
): number {
  // 段是按 index 升序的，找最后一个起点不超过视口起点的段
  let at = 0;
  for (let i = 0; i < sections.length; i += 1) {
    if (sections[i]!.index <= inViewBegin) at = i;
    else break;
  }
  return at;
}
