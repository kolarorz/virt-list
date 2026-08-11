/**
 * 把侧边栏滚到当前条目上——纯 DOM 逻辑，不碰 Vue / VitePress。
 *
 * 单独成文件是为了能测：一旦 import 了 `vitepress`，测试环境会被它依赖的 esbuild
 * 拖进 jsdom 下的 TextEncoder 冲突里。Vue 那一层在 {@link ./useSidebarAutoScroll}。
 *
 * 为什么需要它：这个站的侧边栏一屏装不下（示例一组 20 条，三组 35 条），而侧边栏
 * 自己的 `scrollTop` 不在浏览器的滚动恢复范围内——刷新后一律停在最顶上。于是打开
 * `tree-dragarea` 这种靠后的页面时，高亮那行在视野外，"我在哪"得自己找。
 * VitePress 默认主题不做这件事。
 *
 * 两个坑：
 *
 * 1. **不能用 `scrollIntoView`。** 它会把所有可滚动祖先一起滚，包括文档流本身
 *    ——刷新的瞬间正文被推走，比不定位更糟。这里只写 `.VPSidebar` 的 `scrollTop`。
 * 2. **`is-active` 不在 SSR 输出里。** 它是水合之后才挂上的（服务端只给分组的
 *    `has-active`），所以拿不到时要退回按 href 比对当前路径。
 */

/** 目标行与侧边栏上下边缘的最小距离：贴着边缘虽然"可见"，读起来却像被截断了 */
const EDGE_PADDING = 24;

/** `/vue/examples/list/list-basic.html` 与 `/vue/examples/list/list-basic/` 视为同一页 */
function normalizePath(path: string): string {
  return path
    .replace(/\/index\.html$/, '/')
    .replace(/\.html$/, '')
    .replace(/\/$/, '');
}

/**
 * 找出当前页对应的那个 `<a>`。
 *
 * 优先用 VitePress 自己标的 `is-active`（它知道 rewrites / cleanUrls 这些弯路），
 * 取最深的一条——分组标题若自带链接也会被标上。水合前退回 href 比对。
 */
function findActiveLink(sidebar: HTMLElement): HTMLElement | null {
  const flagged = sidebar.querySelectorAll<HTMLElement>(
    '.VPSidebarItem.is-active > .item > .link',
  );
  if (flagged.length > 0) return flagged[flagged.length - 1] ?? null;

  const here = normalizePath(window.location.pathname);
  const links = sidebar.querySelectorAll<HTMLAnchorElement>('a.link[href]');
  for (const link of links) {
    if (normalizePath(link.pathname) === here) return link;
  }
  return null;
}

export function scrollSidebarToActive(): void {
  const sidebar = document.querySelector<HTMLElement>('.VPSidebar');
  if (!sidebar) return;

  const overflow = sidebar.scrollHeight - sidebar.clientHeight;
  // 装得下就没有"定位"一说；移动端抽屉收起时高度为 0，同样在这里被挡掉
  if (overflow <= 0) return;

  const link = findActiveLink(sidebar);
  if (!link) return;

  const sidebarRect = sidebar.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();

  // 已经舒舒服服在视野里就别动，否则每次换页侧边栏都要抖一下
  const fullyVisible =
    linkRect.top >= sidebarRect.top + EDGE_PADDING &&
    linkRect.bottom <= sidebarRect.bottom - EDGE_PADDING;
  if (fullyVisible) return;

  // 用 rect 差值而不是 offsetTop：不必关心 offsetParent 是侧边栏还是别的谁
  const delta =
    linkRect.top - sidebarRect.top - (sidebar.clientHeight - linkRect.height) / 2;
  sidebar.scrollTop = Math.max(0, Math.min(overflow, sidebar.scrollTop + delta));
}
