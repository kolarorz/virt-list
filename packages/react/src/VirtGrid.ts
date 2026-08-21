/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  createElement,
  type ForwardedRef,
  type Ref,
  type ReactElement,
  type ReactNode,
} from 'react';
import { VirtGrid as VirtGridVanilla } from '@virt-list/vanilla';
import type {
  ListState,
  StyleValue,
  VirtScrollEvent,
  VirtScrollOptions,
} from '@virt-list/core';
import { createReactMounter } from './compat.js';

export interface VirtGridProps<T extends Record<string, any> = Record<string, any>> {
  list: T[];
  gridItems: number;
  itemKey: string;
  estimatedSize?: number;
  itemGap?: number;
  fixedSize?: boolean;
  buffer?: number;
  scrollDuration?: number;
  smoothMaxDistance?: number;
  scrollbarAutoHideDelay?: number;
  scrollbarMinThumbSize?: number;
  /** 是否接管键盘（方向键 / PageUp-Down / Space / Home-End），默认 true。宿主已在祖先元素上处理这些键时关掉 */
  keyboard?: boolean;
  /** 交叉轴（竖向列表的横向、横向列表的竖向）是否允许原生滚动，默认 true。关掉即两轴全裁切 */
  crossScroll?: boolean;
  itemStyle?: StyleValue;
  children?: (props: { itemData: T; rowIndex: number; listIndex: number }) => ReactNode;
  renderItem?: (item: T, rowIndex: number, listIndex: number, el: HTMLElement) => HTMLElement | void;
  renderStickyHeader?: (el: HTMLElement) => HTMLElement | void;
  renderStickyFooter?: (el: HTMLElement) => HTMLElement | void;
  renderHeader?: (el: HTMLElement) => HTMLElement | void;
  renderFooter?: (el: HTMLElement) => HTMLElement | void;
  renderEmpty?: (el: HTMLElement) => HTMLElement | void;
  stickyHeaderStyle?: StyleValue;

  /**
   * 滚动了。容器 overflow:hidden，没有原生 scroll 事件，这是它的替代品。
   *
   * 与 React 的合成 `onScroll` 不冲突：本组件只把 style / className 交给根 div，
   * 事件 props 一律不透传。
   */
  onScroll?: (event: VirtScrollEvent) => void;
  /** 滚动偏移量变化。要跟着偏移量重写 DOM 时用它，只想感知滚动用 onScroll */
  onOffsetChange?: (offset: number) => void;
  onToTop?: (item: unknown) => void;
  onToBottom?: (item: unknown) => void;
  onItemResize?: (id: string, size: number) => void;
  onUpdate?: (renderList: unknown[], state: ListState) => void;

  style?: React.CSSProperties;
  className?: string;
}

export interface VirtGridRef {
  /**
   * 滚动容器（主轴视口）。
   *
   * 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。感知滚动请用
   * `onScroll`——挂在这上面的原生 `scroll` 监听收不到有用信息。
   */
  clientEl: HTMLElement;
  /**
   * 交叉轴（竖向列表的横向）的滚动容器。那条轴归浏览器原生滚动：
   * 读写它的 `scrollLeft` 就是读写横向滚动位置，横滚也是真的原生 `scroll` 事件。
   */
  scrollContentEl: HTMLElement;
  setList: (list: Record<string, any>[]) => void;
  setGridItems: (n: number) => void;
  scrollToIndex: (i: number, options?: VirtScrollOptions) => void;
  scrollIntoView: (i: number, options?: VirtScrollOptions) => void;
  scrollToTop: (options?: VirtScrollOptions) => void;
  scrollToBottom: (options?: VirtScrollOptions) => void;
  scrollToOffset: (o: number, options?: VirtScrollOptions) => void;
  /** 当前滚动偏移量。容器的 scrollTop 恒为 0（内容靠 transform 移动），必须走这里读 */
  getOffset: () => number;
  /** 当前允许的最大偏移量，即 `getTotalSize() - clientSize`（不为负） */
  getMaxOffset: () => number;
  /** 内容总尺寸（列表项 + 各插槽），对应原生语境的 `scrollHeight` */
  getTotalSize: () => number;
  /** 上报一次用户发起的滚动（会触发 toTop / toBottom 与自动续拉） */
  scrollFromUser: (offset: number) => void;
  cancelScroll: () => void;
  /** 容器被隐藏/重新挂载后（keep-alive）把内容重新摆到当前偏移量上 */
  resume: () => void;
  forceUpdate: () => void;
}

/**
 * React 虚拟网格组件的内部实现。
 *
 * VirtGrid 在 useEffect([]) 中创建一次。
 * list 和 gridItems 的变化通过 render 阶段的 ref 比较检测并同步。
 */
function VirtGridInner(props: VirtGridProps, ref: ForwardedRef<VirtGridRef>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<VirtGridVanilla<any> | null>(null);
  const eventsRef = useRef(props);
  eventsRef.current = props;
  const mounterRef = useRef<ReturnType<typeof createReactMounter> | null>(null);
  if (!mounterRef.current) mounterRef.current = createReactMounter();
  const mounter = mounterRef.current;
  const { mountReact } = mounter;

  /** 在 React 渲染 / 提交阶段内驱动 core，挂载器据此决定 flushSync 的时机 */
  function inReactPhase(fn: () => void): void {
    mounter.setReactPhase(true);
    try {
      fn();
    } finally {
      mounter.setReactPhase(false);
    }
  }

  /**
   * 挂载/更新一个单元格的内容，同时充当 `renderItem` 与 `updateItem`。
   *
   * `flushMounts()` 在这里不够用：它用的是挂载那一刻捕获的 `item`，而 React
   * 侧的更新都是不可变的 —— 同一个 key 换了新对象，旧闭包再刷也是旧数据。
   *
   * **mountKey 用位置（listIndex）而不是数据 key**，与 VirtList 相反。
   * 依据是容器的复用方式：VirtList 的项元素在 itemPool 里按 key 管理，同一个 key
   * 永远对应同一个元素；而单元格容器只是行元素的第 i 个子节点，纯按位置复用
   * （见 vanilla VirtGrid 的 `_updateRow`）。两者不一致就会错位 —— 删掉中间一项后
   * 「item-2 的内容」要渲染进「原来 item-1 的那个容器」，挂载器发现记录里
   * `grid:item:2` 对应的是别的元素，就会去卸载它、再对当前元素重复 `createRoot`，
   * 于是刷一串 "createRoot() on a container that has already been passed" 警告，
   * 每次删除都白白重建一批 root（组件内部 state 与动画全丢）。
   *
   * `listIndex` = 行首扁平索引 + 单元格序号，正是这个格子的位置，不随内容变化。
   */
  function mountCell(
    item: any,
    rowIndex: number,
    listIndex: number,
    el: HTMLElement,
  ): void {
    if (!eventsRef.current.children) return;
    mountReact(
      `grid:cell:${listIndex}`,
      () => eventsRef.current.children!({ itemData: item, rowIndex, listIndex }),
      el,
    );
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const events = {
      scroll: (e: VirtScrollEvent) => eventsRef.current.onScroll?.(e),
      offsetChange: (o: number) => eventsRef.current.onOffsetChange?.(o),
      toTop: (item: unknown) => eventsRef.current.onToTop?.(item),
      toBottom: (item: unknown) => eventsRef.current.onToBottom?.(item),
      itemResize: (id: string, size: number) => eventsRef.current.onItemResize?.(id, size),
      update: (renderList: unknown[], state: ListState) =>
        eventsRef.current.onUpdate?.(renderList, state),
    } as any;

    const options = {
      list: props.list,
      gridItems: props.gridItems,
      itemKey: props.itemKey,
      estimatedSize: props.estimatedSize ?? 50,
      itemGap: props.itemGap,
      fixedSize: props.fixedSize,
      buffer: props.buffer ?? 2,
      scrollDuration: props.scrollDuration,
      smoothMaxDistance: props.smoothMaxDistance,
      scrollbarAutoHideDelay: props.scrollbarAutoHideDelay,
      scrollbarMinThumbSize: props.scrollbarMinThumbSize,
      keyboard: props.keyboard,
      crossScroll: props.crossScroll,
      itemStyle: props.itemStyle,
      renderItem: props.renderItem ?? mountCell,
      updateItem: typeof props.renderItem === 'function' ? undefined : mountCell,
      renderStickyHeader: props.renderStickyHeader,
      renderStickyFooter: props.renderStickyFooter,
      renderHeader: props.renderHeader,
      renderFooter: props.renderFooter,
      renderEmpty: props.renderEmpty,
      // 行滚出渲染窗口时回收它下面所有单元格的 root。少了这条，纯滚动期间账本
      // 只增不减 —— flushMounts 的 prune 判不出来（单元格容器按行位置复用，
      // 旧 key 记着的元素仍 isConnected），而且宿主不重渲染时它压根不会跑
      onItemUnmounted: (el: HTMLElement) => mounter.dropMount(el),
      stickyHeaderStyle: props.stickyHeaderStyle,
    };

    // 构造发生在 effect 里，仍属于 React 的提交阶段
    inReactPhase(() => {
      gridRef.current = new VirtGridVanilla(containerRef.current!, options, events);
    });

    return () => {
      gridRef.current?.destroy();
      gridRef.current = null;
      mounter.cleanupAllRoots();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevListRef = useRef(props.list);
  const prevGridItemsRef = useRef(props.gridItems);

  /**
   * 每次宿主渲染后跟 core 对齐一次。没有 deps 是故意的：已挂载的单元格内容不在
   * React 的 vdom 树上，只能靠这里用最新的渲染 prop 重刷一遍。
   * setList / setGridItems 同样不能写在 render 函数体里 —— 那是在 React 渲染阶段里
   * 驱动 core 重渲染。
   */
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    inReactPhase(() => {
      if (props.list !== prevListRef.current) {
        prevListRef.current = props.list;
        grid.setList(props.list);
      }
      if (props.gridItems !== prevGridItemsRef.current) {
        prevGridItemsRef.current = props.gridItems;
        if (props.gridItems > 0) grid.setGridItems(props.gridItems);
      }
      mounter.flushMounts();
    });
  });

  useImperativeHandle(ref, () => ({
    get clientEl() { return gridRef.current!.clientEl; },
    get scrollContentEl() { return gridRef.current!.scrollContentEl; },
    setList: (list) => gridRef.current?.setList(list),
    setGridItems: (n) => gridRef.current?.setGridItems(n),
    scrollToIndex: (i, opts) => gridRef.current?.scrollToIndex(i, opts),
    scrollIntoView: (i, opts) => gridRef.current?.scrollIntoView(i, opts),
    scrollToTop: (opts) => gridRef.current?.scrollToTop(opts),
    scrollToBottom: (opts) => gridRef.current?.scrollToBottom(opts),
    scrollToOffset: (o, opts) => gridRef.current?.scrollToOffset(o, opts),
    getOffset: () => gridRef.current?.getOffset() ?? 0,
    getMaxOffset: () => gridRef.current?.getMaxOffset() ?? 0,
    getTotalSize: () => gridRef.current?.getTotalSize() ?? 0,
    scrollFromUser: (o) => gridRef.current?.scrollFromUser(o),
    cancelScroll: () => gridRef.current?.cancelScroll(),
    resume: () => gridRef.current?.resume(),
    forceUpdate: () => gridRef.current?.forceUpdate(),
  }));

  return createElement('div', {
    ref: containerRef,
    style: { width: '100%', height: '100%', ...props.style },
    className: props.className,
  });
}

export const VirtGrid = forwardRef(VirtGridInner) as (
  props: VirtGridProps & { ref?: Ref<VirtGridRef> },
) => ReactElement | null;
