/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createElement, Fragment, type ReactElement, type ReactNode } from 'react';

/**
 * React 18 挂载适配器。
 *
 * children / renderXxx 渲染出的内容要落到 core 建好的 item / slot 元素里，
 * 而这些元素不在宿主组件的 vdom 树上，只能各自开一个 root 渲染。由此带来两件
 * 必须自己管的事：
 *
 * 1. **root 按元素复用**。同一个容器重复 `createRoot` 会被 React 直接警告
 *    （"container that has already been passed to createRoot() before"），
 *    而且旧 root 一卸载就把刚渲染好的内容抹掉。
 * 2. **内容不会跟着宿主重渲染**。core 的增量 patch 对已在池中的项不会重新调用
 *    renderItem（见 vanilla 的 `_patch`），独立 root 又不在宿主的 vdom 树上，
 *    宿主 state 变了这些内容一动不动 —— 流式输出场景下气泡永远是空的。
 *    所以这里记住每个挂载点「怎么重渲染」，由宿主在每次渲染后调 `flushMounts()`。
 */

interface MountEntry {
  el: HTMLElement;
  /** 重渲染这个挂载点。每次调用都要读宿主最新的闭包，不能缓存 ReactNode */
  render: () => ReactNode;
}

export function createReactMounter() {
  const roots = new Map<HTMLElement, Root>();
  const entries = new Map<string, MountEntry>();
  /** 推到微任务里等着渲染的内容，按元素合并（见 renderInto） */
  const pending = new Map<HTMLElement, ReactElement>();
  /**
   * 当前是否处在 React 自己的渲染 / 提交阶段。
   *
   * 阶段内调 flushSync 既不生效还会警告，只能推到微任务里；阶段外（core 因滚动、
   * ResizeObserver、定时器触发的挂载）则要同步落地 —— vanilla 构造期的
   * `_syncSlotSizes()` 是同步读 offsetHeight 定首屏位置的，内容晚一拍会让首帧偏移。
   */
  let inReactPhase = false;
  /** 已经排了一个微任务去兑现 `pending`，避免每个挂载点各排一个 */
  let flushScheduled = false;

  function setReactPhase(value: boolean): void {
    inReactPhase = value;
  }

  /** 把这一拍攒下的挂载点在**一次** flushSync 里全部渲染掉 */
  function flushPending(): void {
    // 先复位：渲染过程中如果又投递了新内容（effect 里再挂一层），
    // 那批要能排到下一个微任务，而不是被这一趟悄悄吞掉
    flushScheduled = false;
    if (pending.size === 0) return;

    const batch = Array.from(pending);
    pending.clear();

    flushSync(() => {
      for (const [el, vnode] of batch) {
        // 期间可能已经被卸载（滚出窗口 / 整体清理），那时 roots 里已经没有它
        const root = roots.get(el);
        if (root) root.render(vnode);
      }
    });
  }

  function rootFor(el: HTMLElement): Root {
    let root = roots.get(el);
    if (!root) {
      root = createRoot(el);
      roots.set(el, root);
    }
    return root;
  }

  function renderInto(el: HTMLElement, node: ReactNode): void {
    const root = rootFor(el);
    const vnode = createElement(Fragment, null, node);
    if (inReactPhase) {
      // 提交阶段内 flushSync 既不生效还会警告（"flushSync was called from inside a
      // lifecycle method"），推到微任务里补一次同步渲染。
      // 代价是这一拍 DOM 还是空的 —— 测试里要 `await act(...)` 才看得到内容
      //
      // 同一个元素在一拍里可能被投递多次（setList 触发的新挂载 + 随后的 flushMounts），
      // 只留最后那份，避免同一项连着渲染两遍
      pending.set(el, vnode);
      // **整批只调一次 flushSync**，而不是每个元素各来一次。一次数据变更会同时
      // 投递所有可见项（十几到几十个挂载点），每个都单独 flushSync 就是几十次
      // 独立的同步渲染 + 提交；合并成一批，React 只走一趟。
      if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flushPending);
      }
    } else {
      // 阶段外（滚动 / ResizeObserver / 定时器触发）必须同步落地：
      // 项刚建好就要能被量到尺寸
      pending.delete(el);
      flushSync(() => root.render(vnode));
    }
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
    pending.delete(el);
    const root = roots.get(el);
    if (!root) return;
    roots.delete(el);
    // 渲染期间同步卸载会报错，推到微任务里
    queueMicrotask(() => root.unmount());
  }

  /**
   * 项滚出渲染窗口时清账（接 core 的 onItemUnmounted），否则 root 会一直泄漏。
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
    pending.clear();
    const stale = Array.from(roots.values());
    roots.clear();
    queueMicrotask(() => stale.forEach((root) => root.unmount()));
  }

  return {
    mountReact,
    setMountRender,
    flushMounts,
    dropMount,
    cleanupAllRoots,
    setReactPhase,
  };
}
