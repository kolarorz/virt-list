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
import { VirtList as VirtListVanilla } from '@virt-list/vanilla';
import type {
  ClassValue,
  StyleValue,
  ListState,
  LoadState,
  LoadDirection,
  SlotSize,
  VirtListDOMOptions,
  VirtListEvents,
  VirtScrollEvent,
  VirtScrollOptions,
} from '@virt-list/core';
import { createReactMounter } from './compat.js';

// ======================== Types ========================

export interface EmitFunction<T> {
  /** 滚动了。容器 overflow:hidden，没有原生 scroll 事件，这是它的替代品 */
  scroll?: (event: VirtScrollEvent) => void;
  /** 滚动偏移量变化。要跟着偏移量重写 DOM 时用它，只想感知滚动用 scroll */
  offsetChange?: (offset: number) => void;
  toTop?: (item: T) => void;
  toBottom?: (item: T) => void;
  itemResize?: (id: string, newSize: number) => void;
  update?: (renderList: T[], state: ListState) => void;
  loadStateChange?: (loadState: LoadState) => void;
}

export interface UseVirtListReturn<T extends Record<string, any>> {
  containerRef: React.RefObject<HTMLElement | null>;
  state: ListState;
  slotSize: SlotSize;
  sizesMap: Map<string, number>;
  resizeObserver: ResizeObserver | undefined;
  getState: () => ListState;
  getOffset: () => number;
  /** 当前允许的最大偏移量，即 `getTotalSize() - clientSize`（不为负） */
  getMaxOffset: () => number;
  /** 内容总尺寸（列表项 + 各插槽），对应原生语境的 `scrollHeight` */
  getTotalSize: () => number;
  /** 给定偏移量落在第几项，是 `getItemPosByIndex(index).top` 的逆运算 */
  getIndexByOffset: (offset: number) => number;
  /** 上报一次用户发起的滚动（会触发 toTop / toBottom 与自动续拉） */
  scrollFromUser: (offset: number) => void;
  getSlotsTotalSize: () => number;
  reset: () => void;
  scrollToIndex: (index: number, options?: VirtScrollOptions) => void;
  scrollIntoView: (index: number, options?: VirtScrollOptions) => void;
  scrollToTop: (options?: VirtScrollOptions) => void;
  scrollToBottom: (options?: VirtScrollOptions) => void;
  scrollToOffset: (offset: number, options?: VirtScrollOptions) => void;
  cancelScroll: () => void;
  /** 容器被隐藏/重新挂载后（keep-alive）把内容重新摆到当前偏移量上 */
  resume: () => void;
  manualRender: (begin: number, end: number) => void;
  getItemSize: (itemKey: string) => number;
  deleteItemSize: (itemKey: string) => void;
  getItemPosByIndex: (
    index: number,
  ) => { top: number; current: number; bottom: number };
  /**
   * 重建指定的项（不传则重建全部可见项，等价于 forceUpdate）。
   *
   * 通常不需要：数据变更（`list` 换新）已经会自动把最新数据交给可见项。
   * 它是给「既不换数组引用、也不改长度、又不在框架响应式里」那种原地修改用的
   * 出口 —— 例如 Vue 里用 shallowRef 存列表后直接改某一项的字段。
   *
   * 与 forceUpdate 的差别是范围：这个只动指定的几项，其余项的 DOM 原样保留。
   */
  refreshItems: (keys?: Array<string | number>) => void;
  forceUpdate: () => void;
  setList: (list: T[]) => void;
  getLoadState: () => LoadState;
}

// ======================== useVirtList (hook) ========================

export function useVirtList<T extends Record<string, any>>(
  options: VirtListDOMOptions<T>,
  emitFunction?: EmitFunction<T>,
): UseVirtListReturn<T> {
  const containerRef = useRef<HTMLElement | null>(null);
  const vlRef = useRef<VirtListVanilla<T> | null>(null);
  const emitRef = useRef(emitFunction);
  emitRef.current = emitFunction;

  useEffect(() => {
    if (!containerRef.current) return;

    const events: VirtListEvents<T> = {
      scroll: (e) => emitRef.current?.scroll?.(e),
      offsetChange: (o) => emitRef.current?.offsetChange?.(o),
      toTop: (item) => emitRef.current?.toTop?.(item),
      toBottom: (item) => emitRef.current?.toBottom?.(item),
      itemResize: (id, size) => emitRef.current?.itemResize?.(id, size),
      update: (list, state) => emitRef.current?.update?.(list, state),
      loadStateChange: (loadState) =>
        emitRef.current?.loadStateChange?.(loadState),
    };

    vlRef.current = new VirtListVanilla<T>(containerRef.current, options, events);

    return () => {
      vlRef.current?.destroy();
      vlRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getVL = () => vlRef.current!;

  return {
    containerRef,
    get state() { return getVL().state; },
    get slotSize() { return getVL().core.slotSize; },
    get sizesMap() { return getVL().core.sizesMap; },
    get resizeObserver() { return getVL().core.resizeObserver; },
    getState: () => getVL().state,
    getOffset: () => getVL().core.getOffset(),
    getMaxOffset: () => getVL().core.getMaxOffset(),
    getTotalSize: () => getVL().core.getTotalSize(),
    getIndexByOffset: (offset: number) => getVL().core.getIndexByOffset(offset),
    scrollFromUser: (o: number) => getVL().core.scrollFromUser(o),
    getSlotsTotalSize: () => getVL().core.getSlotsTotalSize(),
    reset: () => vlRef.current?.reset(),
    scrollToIndex: (i, opts) => vlRef.current?.scrollToIndex(i, opts),
    scrollIntoView: (i, opts) => vlRef.current?.scrollIntoView(i, opts),
    scrollToTop: (opts) => vlRef.current?.scrollToTop(opts),
    scrollToBottom: (opts) => vlRef.current?.scrollToBottom(opts),
    scrollToOffset: (o, opts) => vlRef.current?.scrollToOffset(o, opts),
    cancelScroll: () => vlRef.current?.cancelScroll(),
    resume: () => vlRef.current?.resume(),
    manualRender: (b, e) => vlRef.current?.core.manualRender(b, e),
    getItemSize: (k) => getVL().core.getItemSize(k),
    deleteItemSize: (k) => getVL().core.deleteItemSize(k),
    getItemPosByIndex: (i) => getVL().core.getItemPosByIndex(i),
    refreshItems: (keys?: Array<string | number>) => vlRef.current?.refreshItems(keys),
    forceUpdate: () => vlRef.current?.forceUpdate(),
    setList: (l) => vlRef.current?.setList(l),
    getLoadState: () => getVL().getLoadState(),
  };
}

// ======================== VirtList (React component) ========================

export interface VirtListProps<T extends Record<string, any> = Record<string, any>> {
  list: T[];
  itemKey: string | number;
  estimatedSize?: number;
  itemGap?: number;
  renderControl?: (
    begin: number,
    end: number,
  ) => { begin: number; end: number };
  /**
   * 每项对应的纯文本，给出即开启跨虚拟化的选区复制。
   * 用户拖选跨越未渲染区域时，中间那些没有 DOM 的项从数据补齐。
   */
  copyText?: (item: T, index: number) => string;
  /** 复制时各项之间的分隔符，默认换行 */
  copySeparator?: string;
  fixedSize?: boolean;
  buffer?: number;
  bufferTop?: number;
  bufferBottom?: number;
  edgeThreshold?: number;
  scrollDuration?: number;
  smoothMaxDistance?: number;
  horizontal?: boolean;
  initialIndex?: number;
  initialOffset?: number;
  loadMore?: (
    direction: LoadDirection,
  ) => boolean | void | Promise<boolean | void>;
  hasMoreTop?: boolean;
  hasMoreBottom?: boolean;
  initialPosition?: 'top' | 'bottom';
  stickyBottom?: boolean;
  stickyThreshold?: number;
  scrollbarAutoHideDelay?: number;
  scrollbarMinThumbSize?: number;
  /** 是否接管键盘（方向键 / PageUp-Down / Space / Home-End），默认 true。宿主已在祖先元素上处理这些键时关掉 */
  keyboard?: boolean;
  /** 列表自身是否拥有交叉轴，默认 false；代码块等内层 scrollport 不受影响 */
  crossScroll?: boolean;
  listStyle?: StyleValue;
  listClass?: ClassValue;
  itemStyle?: StyleValue | ((item: T, index: number) => StyleValue);
  itemClass?: ClassValue | ((item: T, index: number) => ClassValue);
  headerClass?: ClassValue;
  headerStyle?: StyleValue;
  footerClass?: ClassValue;
  footerStyle?: StyleValue;
  stickyHeaderClass?: ClassValue;
  stickyHeaderStyle?: StyleValue;
  stickyFooterClass?: ClassValue;
  stickyFooterStyle?: StyleValue;

  children?: (props: { itemData: T; index: number }) => ReactNode;
  renderItem?: (item: T, index: number, el: HTMLElement) => HTMLElement | void;
  /** 加载状态作为参数传入，加载提示条直接据此渲染；状态变化时会重新调用 */
  renderHeader?: (loadState: LoadState) => ReactNode;
  renderFooter?: (loadState: LoadState) => ReactNode;
  renderStickyHeader?: () => ReactNode;
  renderStickyFooter?: () => ReactNode;
  renderEmpty?: () => ReactNode;

  /**
   * 滚动了。容器 overflow:hidden，没有原生 scroll 事件，这是它的替代品。
   *
   * 与 React 的合成 `onScroll` 不冲突：本组件只把 style / className 交给根 div，
   * 事件 props 一律不透传。
   */
  onScroll?: (event: VirtScrollEvent) => void;
  /** 滚动偏移量变化。要跟着偏移量重写 DOM 时用它，只想感知滚动用 onScroll */
  onOffsetChange?: (offset: number) => void;
  onToTop?: (item: T) => void;
  onToBottom?: (item: T) => void;
  onItemResize?: (id: string, newSize: number) => void;
  onUpdate?: (renderList: T[], state: ListState) => void;
  onLoadStateChange?: (loadState: LoadState) => void;

  style?: React.CSSProperties;
  className?: string;
}

export interface VirtListRef<T extends Record<string, any> = Record<string, any>> {
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
  state: ListState;
  slotSize: SlotSize;
  sizesMap: Map<string, number>;
  resizeObserver: ResizeObserver | undefined;
  getState: () => ListState;
  getOffset: () => number;
  /** 当前允许的最大偏移量，即 `getTotalSize() - clientSize`（不为负） */
  getMaxOffset: () => number;
  /** 内容总尺寸（列表项 + 各插槽），对应原生语境的 `scrollHeight` */
  getTotalSize: () => number;
  /** 给定偏移量落在第几项，是 `getItemPosByIndex(index).top` 的逆运算 */
  getIndexByOffset: (offset: number) => number;
  /** 上报一次用户发起的滚动（会触发 toTop / toBottom 与自动续拉） */
  scrollFromUser: (offset: number) => void;
  getSlotsTotalSize: () => number;
  reset: () => void;
  scrollToIndex: (index: number, options?: VirtScrollOptions) => void;
  scrollIntoView: (index: number, options?: VirtScrollOptions) => void;
  scrollToTop: (options?: VirtScrollOptions) => void;
  scrollToBottom: (options?: VirtScrollOptions) => void;
  scrollToOffset: (offset: number, options?: VirtScrollOptions) => void;
  cancelScroll: () => void;
  /** 容器被隐藏/重新挂载后（keep-alive）把内容重新摆到当前偏移量上 */
  resume: () => void;
  manualRender: (begin: number, end: number) => void;
  getItemSize: (itemKey: string) => number;
  deleteItemSize: (itemKey: string) => void;
  getItemPosByIndex: (
    index: number,
  ) => { top: number; current: number; bottom: number };
  /**
   * 重建指定的项（不传则重建全部可见项，等价于 forceUpdate）。
   *
   * 通常不需要：数据变更（`list` 换新）已经会自动把最新数据交给可见项。
   * 它是给「既不换数组引用、也不改长度、又不在框架响应式里」那种原地修改用的
   * 出口 —— 例如 Vue 里用 shallowRef 存列表后直接改某一项的字段。
   *
   * 与 forceUpdate 的差别是范围：这个只动指定的几项，其余项的 DOM 原样保留。
   */
  refreshItems: (keys?: Array<string | number>) => void;
  forceUpdate: () => void;
  setList: (list: T[]) => void;
  getLoadState: () => LoadState;
}

function VirtListInner(
  props: VirtListProps<any>,
  ref: ForwardedRef<VirtListRef<any>>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vlRef = useRef<VirtListVanilla<any> | null>(null);
  const eventsRef = useRef(props);
  eventsRef.current = props;

  const mounterRef = useRef<ReturnType<typeof createReactMounter> | null>(null);
  if (!mounterRef.current) mounterRef.current = createReactMounter();
  const mounter = mounterRef.current;
  const { mountReact } = mounter;

  /**
   * 在 React 自己的渲染 / 提交阶段内调 core，会让 core 同步渲染出的内容
   * 走进「React 正在渲染时又渲染」的路子。挂载器据此决定 flushSync 的时机
   */
  function inReactPhase(fn: () => void): void {
    mounter.setReactPhase(true);
    try {
      fn();
    } finally {
      mounter.setReactPhase(false);
    }
  }

  /**
   * 挂载/更新一项的内容。同时充当 `renderItem` 与 `updateItem`
   * —— `mountReact` 按 mountKey 幂等，重复调用只是换掉这个挂载点的 render。
   */
  function mountItem(item: any, index: number, el: HTMLElement): void {
    if (!eventsRef.current.children) return;
    mountReact(
      `item:${item[props.itemKey]}`,
      () => eventsRef.current.children!({ itemData: item, index }),
      el,
    );
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const p = eventsRef.current;

    const options: VirtListDOMOptions<any> = {
      list: props.list,
      itemKey: String(props.itemKey),
      estimatedSize: props.estimatedSize!,
      itemGap: props.itemGap,
      fixedSize: props.fixedSize,
      buffer: props.buffer,
      bufferTop: props.bufferTop,
      bufferBottom: props.bufferBottom,
      edgeThreshold: props.edgeThreshold,
      scrollDuration: props.scrollDuration,
      smoothMaxDistance: props.smoothMaxDistance,
      horizontal: props.horizontal,
      initialIndex: props.initialIndex,
      initialOffset: props.initialOffset,
      // 通过 ref 读，使用方每次渲染传新的箭头函数也能拿到最新的那个
      loadMore: props.loadMore
        ? (dir) => eventsRef.current.loadMore!(dir)
        : undefined,
      hasMoreTop: props.hasMoreTop,
      hasMoreBottom: props.hasMoreBottom,
      initialPosition: props.initialPosition,
      stickyBottom: props.stickyBottom,
      stickyThreshold: props.stickyThreshold,
      scrollbarAutoHideDelay: props.scrollbarAutoHideDelay,
      scrollbarMinThumbSize: props.scrollbarMinThumbSize,
      keyboard: props.keyboard,
      crossScroll: props.crossScroll,
      renderControl: props.renderControl,
      copyText: props.copyText,
      copySeparator: props.copySeparator,
      listStyle: props.listStyle,
      listClass: props.listClass,
      itemStyle: props.itemStyle,
      itemClass: props.itemClass,
      headerClass: props.headerClass,
      headerStyle: props.headerStyle,
      footerClass: props.footerClass,
      footerStyle: props.footerStyle,
      stickyHeaderClass: props.stickyHeaderClass,
      stickyHeaderStyle: props.stickyHeaderStyle,
      stickyFooterClass: props.stickyFooterClass,
      stickyFooterStyle: props.stickyFooterStyle,
      // 项滚出渲染窗口时 core 会移除元素，跟着把挂载点与 root 一起清掉
      onItemUnmounted: (el: HTMLElement) => mounter.dropMount(el),
      renderItem: props.renderItem ?? mountItem,
      /**
       * core 侧的数据变更通道，与下面 layout effect 里的 `flushMounts()` 互补，
       * 两条都要留着：
       * - `updateItem`：core 因数据变更重新 patch 时给出最新的 item / index。
       *   命令式调用（`ref.setList(...)`）不会让宿主重渲染，只有这条路能刷到；
       * - `flushMounts()`：宿主重渲染但 `props.list` 引用没变时（流式文本存在
       *   宿主自己的 state 里）core 根本不会通知，只有那条路能刷到。
       *
       * 两条同时命中也不会渲染两遍：挂载器在 React 阶段内按元素合并 pending，
       * 一拍只落最后那份（见 compat.ts 的 `renderInto`）。
       */
      updateItem: typeof props.renderItem === 'function' ? undefined : mountItem,
    };

    if (p.renderHeader) {
      options.renderHeader = (el: HTMLElement, loadState) => {
        mountReact('header', () => eventsRef.current.renderHeader!(loadState), el);
      };
    }
    if (p.renderFooter) {
      options.renderFooter = (el: HTMLElement, loadState) => {
        mountReact('footer', () => eventsRef.current.renderFooter!(loadState), el);
      };
    }
    if (p.renderStickyHeader) {
      options.renderStickyHeader = (el: HTMLElement) => {
        mountReact('stickyHeader', () => eventsRef.current.renderStickyHeader!(), el);
      };
    }
    if (p.renderStickyFooter) {
      options.renderStickyFooter = (el: HTMLElement) => {
        mountReact('stickyFooter', () => eventsRef.current.renderStickyFooter!(), el);
      };
    }
    if (p.renderEmpty) {
      options.renderEmpty = (el: HTMLElement) => {
        mountReact('empty', () => eventsRef.current.renderEmpty!(), el);
      };
    }

    const events: VirtListEvents<any> = {
      scroll: (e) => eventsRef.current.onScroll?.(e),
      offsetChange: (o) => eventsRef.current.onOffsetChange?.(o),
      toTop: (item) => eventsRef.current.onToTop?.(item),
      toBottom: (item) => eventsRef.current.onToBottom?.(item),
      itemResize: (id, size) => eventsRef.current.onItemResize?.(id, size),
      update: (list, state) => eventsRef.current.onUpdate?.(list, state),
      loadStateChange: (loadState) =>
        eventsRef.current.onLoadStateChange?.(loadState),
    };

    // 构造发生在 effect 里，仍属于 React 的提交阶段
    inReactPhase(() => {
      vlRef.current = new VirtListVanilla(containerRef.current!, options, events);
    });

    return () => {
      vlRef.current?.destroy();
      vlRef.current = null;
      mounter.cleanupAllRoots();
    };
  }, []);

  const prevListRef = useRef(props.list);
  const prevListLenRef = useRef(props.list.length);
  const prevHasMoreRef = useRef({
    top: props.hasMoreTop,
    bottom: props.hasMoreBottom,
  });

  /**
   * 每次宿主渲染后跟 core 对齐一次。没有 deps 是故意的：
   * 已挂载的插槽内容不在 React 的 vdom 树上，只能靠这里用最新的 render prop
   * 重刷一遍，否则宿主 state 变了它们一动不动（流式输出的气泡会一直空着）。
   *
   * 同步 list / hasMore 也必须在 effect 里做，不能像以前那样写在 render 函数体：
   * 那等于在 React 渲染阶段里同步驱动 core 重新渲染项，React 16-17 会直接告警
   * "triggering nested component updates from render is not allowed"。
   */
  useLayoutEffect(() => {
    const vl = vlRef.current;
    // 首次渲染时实例还没建（构造在 useEffect 里，晚于 layout effect）
    if (!vl) return;

    inReactPhase(() => {
      // 只盯 length 会漏掉「长度不变但结构变了」的场景：双向分页一次删一页又加一页，
      // 长度前后相同，列表却整体位移了。引用比较覆盖了 React 惯用的不可变更新；
      // length 比较兜住原地 mutate。setList 之后无需 forceUpdate——core 已在列表
      // 变更中完成重算、位移补偿与通知
      if (
        props.list !== prevListRef.current ||
        props.list.length !== prevListLenRef.current
      ) {
        prevListRef.current = props.list;
        prevListLenRef.current = props.list.length;
        vl.setList(props.list);
      }

      // hasMore 当受控属性用时要能改回来（例如切换会话后重新开放历史加载）
      if (
        prevHasMoreRef.current.top !== props.hasMoreTop ||
        prevHasMoreRef.current.bottom !== props.hasMoreBottom
      ) {
        prevHasMoreRef.current = {
          top: props.hasMoreTop,
          bottom: props.hasMoreBottom,
        };
        vl.updateOptions({
          hasMoreTop: props.hasMoreTop,
          hasMoreBottom: props.hasMoreBottom,
        });
      }

      /**
       * 可见项重新派发一次 itemData。
       *
       * 不能只重放挂载时捕获的那个 item 对象：React 侧都是不可变更新
       * （`list.map(it => it.id === id ? {...it, text} : it)`），同一个 key 换了新对象，
       * 而 core 的增量 patch 对已在池中的 key 不会重新调用 renderItem。
       */
      if (eventsRef.current.children && !props.renderItem) {
        const { renderBegin, renderEnd } = vl.state;
        for (let i = renderBegin; i <= renderEnd; i += 1) {
          const item = props.list[i];
          if (!item) continue;
          mounter.setMountRender(
            `item:${item[props.itemKey]}`,
            () => eventsRef.current.children!({ itemData: item, index: i }),
          );
        }
      }

      // header / footer 要用最新的 loadState，而不是挂载时那份
      const loadState = vl.getLoadState();
      if (eventsRef.current.renderHeader) {
        mounter.setMountRender('header', () => eventsRef.current.renderHeader!(loadState));
      }
      if (eventsRef.current.renderFooter) {
        mounter.setMountRender('footer', () => eventsRef.current.renderFooter!(loadState));
      }

      mounter.flushMounts();
    });
  });

  useImperativeHandle(ref, () => ({
    get clientEl() { return vlRef.current!.clientEl; },
    get scrollContentEl() { return vlRef.current!.scrollContentEl; },
    get state() { return vlRef.current!.state; },
    get slotSize() { return vlRef.current!.core.slotSize; },
    get sizesMap() { return vlRef.current!.core.sizesMap; },
    get resizeObserver() { return vlRef.current!.core.resizeObserver; },
    getState: () => vlRef.current!.state,
    getOffset: () => vlRef.current!.core.getOffset(),
    getMaxOffset: () => vlRef.current!.core.getMaxOffset(),
    getTotalSize: () => vlRef.current!.core.getTotalSize(),
    getIndexByOffset: (offset: number) => vlRef.current!.core.getIndexByOffset(offset),
    scrollFromUser: (o: number) => vlRef.current!.core.scrollFromUser(o),
    getSlotsTotalSize: () => vlRef.current!.core.getSlotsTotalSize(),
    reset: () => vlRef.current?.reset(),
    scrollToIndex: (i, opts) => vlRef.current?.scrollToIndex(i, opts),
    scrollIntoView: (i, opts) => vlRef.current?.scrollIntoView(i, opts),
    scrollToTop: (opts) => vlRef.current?.scrollToTop(opts),
    scrollToBottom: (opts) => vlRef.current?.scrollToBottom(opts),
    scrollToOffset: (o, opts) => vlRef.current?.scrollToOffset(o, opts),
    cancelScroll: () => vlRef.current?.cancelScroll(),
    resume: () => vlRef.current?.resume(),
    manualRender: (b, e) => vlRef.current?.core.manualRender(b, e),
    getItemSize: (k) => vlRef.current!.core.getItemSize(k),
    deleteItemSize: (k) => vlRef.current!.core.deleteItemSize(k),
    getItemPosByIndex: (i) => vlRef.current!.core.getItemPosByIndex(i),
    refreshItems: (keys) => vlRef.current?.refreshItems(keys),
    forceUpdate: () => {
      vlRef.current?.forceUpdate();
    },
    setList: (l) => vlRef.current?.setList(l),
    getLoadState: () => vlRef.current!.getLoadState(),
  }));

  return createElement('div', {
    ref: containerRef,
    style: { width: '100%', height: '100%', ...props.style },
    className: props.className,
  });
}

export const VirtList = forwardRef(VirtListInner) as <
  T extends Record<string, any> = Record<string, any>,
>(
  props: VirtListProps<T> & { ref?: Ref<VirtListRef<T>> },
) => ReactElement | null;
