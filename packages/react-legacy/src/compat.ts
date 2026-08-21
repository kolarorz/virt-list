/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactDOM from 'react-dom';
import { type ReactNode, createElement, Fragment, type ReactElement } from 'react';

/**
 * React 16-17 mounting adapter.
 *
 * React 18 introduced `createRoot` / `root.unmount()` as the new client API.
 * React 16-17 use `ReactDOM.render()` and `ReactDOM.unmountComponentAtNode()`.
 * This adapter provides the same `mountReact` / `flushMounts` / cleanup surface
 * as the React 18 package, but backed by the legacy ReactDOM APIs.
 *
 * `ReactDOM.render()` 本身同步且对同一容器幂等，所以这里不需要 React 18 那套
 * root 复用与 flushSync 时机判断。要自己管的只有一件事：core 的增量 patch 对已在
 * 池中的项不会重新调用 renderItem（见 vanilla 的 `_patch`），而这些内容又不在宿主
 * 的 vdom 树上 —— 宿主 state 变了它们不会跟着更新（流式输出的气泡会一直是空的）。
 * 于是这里记住每个挂载点「怎么重渲染」，由宿主在每次渲染后调 `flushMounts()`。
 */

interface MountEntry {
  el: HTMLElement;
  /** 重渲染这个挂载点。每次调用都要读宿主最新的闭包，不能缓存 ReactNode */
  render: () => ReactNode;
}

export function createReactMounter() {
  const entries = new Map<string, MountEntry>();
  const mountedEls = new Set<HTMLElement>();

  function renderInto(el: HTMLElement, node: ReactNode): void {
    ReactDOM.render(createElement(Fragment, null, node) as ReactElement, el);
    mountedEls.add(el);
  }

  /** 挂载（或重挂载）一个挂载点。`render` 会被记下来，供后续 flush 复用 */
  function mountReact(mountKey: string, render: () => ReactNode, el: HTMLElement): void {
    const old = entries.get(mountKey);
    if (old && old.el !== el) unmountEl(old.el);
    entries.set(mountKey, { el, render });
    renderInto(el, render());
  }

  /**
   * 只替换某个挂载点的 render，不渲染 —— 渲染统一交给随后的 `flushMounts()`，
   * 免得同一项在一次宿主渲染里被刷两遍。挂载点不存在时什么都不做。
   */
  function setMountRender(mountKey: string, render: () => ReactNode): void {
    const entry = entries.get(mountKey);
    if (!entry) return;
    entry.render = render;
  }

  /** 用各自当下的闭包把所有挂载点重刷一遍 */
  function flushMounts(): void {
    entries.forEach((entry, key) => {
      if (prune(key, entry)) return;
      renderInto(entry.el, entry.render());
    });
  }

  /**
   * 元素已经离开文档就把这个挂载点清掉，返回 true 表示不必再渲染。
   *
   * 项滚出渲染窗口时 core 会 remove 掉元素，List / Grid / Tree 都接了
   * `onItemUnmounted` → `dropMount` 精确清账，这里只是重刷路径上的兜底：
   * 万一有元素绕过那条路被摘掉，也不至于往脱离文档的节点里白渲染。
   *
   * 只在重刷路径上做 —— 首次挂载时元素还没被 insertBefore 进去（见 vanilla 的 `_patch`），
   * 那时 isConnected 必然是 false。
   */
  function prune(mountKey: string, entry: MountEntry): boolean {
    if (entry.el.isConnected) return false;
    entries.delete(mountKey);
    unmountEl(entry.el);
    return true;
  }

  function unmountEl(el: HTMLElement): void {
    if (!mountedEls.delete(el)) return;
    ReactDOM.unmountComponentAtNode(el);
  }

  /**
   * 项滚出渲染窗口时清账（接 core 的 onItemUnmounted），否则挂载点会一直泄漏。
   *
   * 传入的是**项元素**，而挂载点可能是它的后代（Grid 的单元格是行元素的子节点、
   * Tree 的插槽挂在节点行里），所以按 `contains` 匹配 —— `el.contains(el)` 为真，
   * List 那种"挂载点就是项元素本身"的情形一并覆盖。core 在 `remove()` 之前回调，
   * 此刻子树还完整。
   *
   * 不能只依赖 `flushMounts()` 里的 `prune`：那条路只在宿主重渲染时才走，纯滚动
   * 期间账本只增不减；Grid 更是压根指望不上 —— 它的挂载点容器按行位置复用，旧 key
   * 记着的元素仍 `isConnected`，`prune` 判不出来。
   */
  function dropMount(el: HTMLElement): void {
    entries.forEach((entry, key) => {
      if (el !== entry.el && !el.contains(entry.el)) return;
      entries.delete(key);
      unmountEl(entry.el);
    });
    unmountEl(el);
  }

  function cleanupAllRoots(): void {
    entries.clear();
    mountedEls.forEach((el) => {
      ReactDOM.unmountComponentAtNode(el);
    });
    mountedEls.clear();
  }

  return { mountReact, setMountRender, flushMounts, dropMount, cleanupAllRoots };
}
