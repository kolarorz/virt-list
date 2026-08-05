/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useRef,
  useEffect,
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
  VirtScrollOptions,
} from '@virt-list/core';
import { createReactMounter } from './compat';

// ======================== Types ========================

export interface EmitFunction<T> {
  scroll?: (e: Event) => void;
  toTop?: (item: T) => void;
  toBottom?: (item: T) => void;
  itemResize?: (id: string, newSize: number) => void;
  update?: (renderList: T[], state: ListState) => void;
  loadStateChange?: (loadState: LoadState) => void;
}

export interface UseVirtListReturn<T extends Record<string, any>> {
  containerRef: React.RefObject<HTMLElement | null>;
  reactiveData: ListState;
  slotSize: SlotSize;
  sizesMap: Map<string, number>;
  resizeObserver: ResizeObserver | undefined;
  getState: () => ListState;
  getOffset: () => number;
  getSlotSize: () => number;
  reset: () => void;
  scrollToIndex: (index: number, options?: VirtScrollOptions) => void;
  scrollIntoView: (index: number, options?: VirtScrollOptions) => void;
  scrollToTop: (options?: VirtScrollOptions) => void;
  scrollToBottom: (options?: VirtScrollOptions) => void;
  scrollToOffset: (offset: number, options?: VirtScrollOptions) => void;
  cancelScroll: () => void;
  manualRender: (begin: number, end: number) => void;
  getItemSize: (itemKey: string) => number;
  deleteItemSize: (itemKey: string) => void;
  deletedList2Top: (list: T[]) => void;
  addedList2Top: (list: T[]) => void;
  getItemPosByIndex: (
    index: number,
  ) => { top: number; current: number; bottom: number };
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
  }, []);

  const getVL = () => vlRef.current!;

  return {
    containerRef,
    get reactiveData() { return getVL().state; },
    get slotSize() { return getVL().core.slotSize; },
    get sizesMap() { return getVL().core.sizesMap; },
    get resizeObserver() { return getVL().core.resizeObserver; },
    getState: () => getVL().state,
    getOffset: () => getVL().core.getOffset(),
    getSlotSize: () => getVL().core.getSlotSize(),
    reset: () => vlRef.current?.reset(),
    scrollToIndex: (i, opts) => vlRef.current?.scrollToIndex(i, opts),
    scrollIntoView: (i, opts) => vlRef.current?.scrollIntoView(i, opts),
    scrollToTop: (opts) => vlRef.current?.scrollToTop(opts),
    scrollToBottom: (opts) => vlRef.current?.scrollToBottom(opts),
    scrollToOffset: (o, opts) => vlRef.current?.scrollToOffset(o, opts),
    cancelScroll: () => vlRef.current?.cancelScroll(),
    manualRender: (b, e) => vlRef.current?.core.manualRender(b, e),
    getItemSize: (k) => getVL().core.getItemSize(k),
    deleteItemSize: (k) => getVL().core.deleteItemSize(k),
    deletedList2Top: (l) => vlRef.current?.deletedList2Top(l),
    addedList2Top: (l) => vlRef.current?.addedList2Top(l),
    getItemPosByIndex: (i) => getVL().core.getItemPosByIndex(i),
    forceUpdate: () => vlRef.current?.forceUpdate(),
    setList: (l) => vlRef.current?.setList(l),
    getLoadState: () => getVL().getLoadState(),
  };
}

// ======================== VirtList (React 16-17 component) ========================

export interface VirtListProps<T extends Record<string, any> = Record<string, any>> {
  list: T[];
  itemKey: string | number;
  itemPreSize?: number;
  itemGap?: number;
  renderControl?: (
    begin: number,
    end: number,
  ) => { begin: number; end: number };
  fixed?: boolean;
  buffer?: number;
  bufferTop?: number;
  bufferBottom?: number;
  scrollDistance?: number;
  scrollDuration?: number;
  smoothMaxDistance?: number;
  horizontal?: boolean;
  start?: number;
  offset?: number;
  loadMore?: (
    direction: LoadDirection,
  ) => boolean | void | Promise<boolean | void>;
  hasMoreTop?: boolean;
  hasMoreBottom?: boolean;
  initialPosition?: 'top' | 'bottom';
  stickyBottom?: boolean;
  stickyThreshold?: number;
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

  onScroll?: (e: Event) => void;
  onToTop?: (item: T) => void;
  onToBottom?: (item: T) => void;
  onItemResize?: (id: string, newSize: number) => void;
  onUpdate?: (renderList: T[], state: ListState) => void;
  onLoadStateChange?: (loadState: LoadState) => void;

  style?: React.CSSProperties;
  className?: string;
}

export interface VirtListRef<T extends Record<string, any> = Record<string, any>> {
  reactiveData: ListState;
  slotSize: SlotSize;
  sizesMap: Map<string, number>;
  resizeObserver: ResizeObserver | undefined;
  getState: () => ListState;
  getOffset: () => number;
  getSlotSize: () => number;
  reset: () => void;
  scrollToIndex: (index: number, options?: VirtScrollOptions) => void;
  scrollIntoView: (index: number, options?: VirtScrollOptions) => void;
  scrollToTop: (options?: VirtScrollOptions) => void;
  scrollToBottom: (options?: VirtScrollOptions) => void;
  scrollToOffset: (offset: number, options?: VirtScrollOptions) => void;
  cancelScroll: () => void;
  manualRender: (begin: number, end: number) => void;
  getItemSize: (itemKey: string) => number;
  deleteItemSize: (itemKey: string) => void;
  deletedList2Top: (list: T[]) => void;
  addedList2Top: (list: T[]) => void;
  getItemPosByIndex: (
    index: number,
  ) => { top: number; current: number; bottom: number };
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

  const mountedElsRef = useRef(new Set<HTMLElement>());
  const { mountReact, cleanupAllRoots } = createReactMounter(mountedElsRef);

  useEffect(() => {
    if (!containerRef.current) return;

    const p = eventsRef.current;

    const options: VirtListDOMOptions<any> = {
      list: props.list,
      itemKey: String(props.itemKey),
      itemPreSize: props.itemPreSize!,
      itemGap: props.itemGap,
      fixed: props.fixed,
      buffer: props.buffer,
      bufferTop: props.bufferTop,
      bufferBottom: props.bufferBottom,
      scrollDistance: props.scrollDistance,
      scrollDuration: props.scrollDuration,
      smoothMaxDistance: props.smoothMaxDistance,
      horizontal: props.horizontal,
      start: props.start,
      offset: props.offset,
      // 通过 ref 读，使用方每次渲染传新的箭头函数也能拿到最新的那个
      loadMore: props.loadMore
        ? (dir) => eventsRef.current.loadMore!(dir)
        : undefined,
      hasMoreTop: props.hasMoreTop,
      hasMoreBottom: props.hasMoreBottom,
      initialPosition: props.initialPosition,
      stickyBottom: props.stickyBottom,
      stickyThreshold: props.stickyThreshold,
      renderControl: props.renderControl,
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
      renderItem: props.renderItem ?? ((item: any, index: number, el: HTMLElement) => {
        if (eventsRef.current.children) {
          mountReact(
            `item:${item[props.itemKey]}`,
            eventsRef.current.children({ itemData: item, index }),
            el,
          );
        }
      }),
    };

    if (p.renderHeader) {
      options.renderHeader = (el: HTMLElement, loadState) => {
        mountReact('header', eventsRef.current.renderHeader!(loadState), el);
      };
    }
    if (p.renderFooter) {
      options.renderFooter = (el: HTMLElement, loadState) => {
        mountReact('footer', eventsRef.current.renderFooter!(loadState), el);
      };
    }
    if (p.renderStickyHeader) {
      options.renderStickyHeader = (el: HTMLElement) => {
        mountReact('stickyHeader', eventsRef.current.renderStickyHeader!(), el);
      };
    }
    if (p.renderStickyFooter) {
      options.renderStickyFooter = (el: HTMLElement) => {
        mountReact('stickyFooter', eventsRef.current.renderStickyFooter!(), el);
      };
    }
    if (p.renderEmpty) {
      options.renderEmpty = (el: HTMLElement) => {
        mountReact('empty', eventsRef.current.renderEmpty!(), el);
      };
    }

    const events: VirtListEvents<any> = {
      scroll: (e) => eventsRef.current.onScroll?.(e),
      toTop: (item) => eventsRef.current.onToTop?.(item),
      toBottom: (item) => eventsRef.current.onToBottom?.(item),
      itemResize: (id, size) => eventsRef.current.onItemResize?.(id, size),
      update: (list, state) => eventsRef.current.onUpdate?.(list, state),
      loadStateChange: (loadState) =>
        eventsRef.current.onLoadStateChange?.(loadState),
    };

    vlRef.current = new VirtListVanilla(containerRef.current, options, events);

    return () => {
      vlRef.current?.destroy();
      vlRef.current = null;
      cleanupAllRoots();
    };
  }, []);

  // 只盯 length 会漏掉「长度不变但结构变了」的场景：双向分页一次删一页又加一页，
  // 长度前后相同，列表却整体位移了。引用比较覆盖了 React 惯用的不可变更新；
  // length 比较兜住原地 mutate。setList 之后无需 forceUpdate——core 已在列表
  // 变更中完成重算、位移补偿与通知
  const prevListRef = useRef(props.list);
  const prevListLenRef = useRef(props.list.length);
  if (
    props.list !== prevListRef.current ||
    props.list.length !== prevListLenRef.current
  ) {
    prevListRef.current = props.list;
    prevListLenRef.current = props.list.length;
    vlRef.current?.setList(props.list);
  }

  // hasMore 当受控属性用时要能改回来（例如切换会话后重新开放历史加载）
  const prevHasMoreRef = useRef({
    top: props.hasMoreTop,
    bottom: props.hasMoreBottom,
  });
  if (
    prevHasMoreRef.current.top !== props.hasMoreTop ||
    prevHasMoreRef.current.bottom !== props.hasMoreBottom
  ) {
    prevHasMoreRef.current = {
      top: props.hasMoreTop,
      bottom: props.hasMoreBottom,
    };
    vlRef.current?.updateOptions({
      hasMoreTop: props.hasMoreTop,
      hasMoreBottom: props.hasMoreBottom,
    });
  }

  useImperativeHandle(ref, () => ({
    get reactiveData() { return vlRef.current!.state; },
    get slotSize() { return vlRef.current!.core.slotSize; },
    get sizesMap() { return vlRef.current!.core.sizesMap; },
    get resizeObserver() { return vlRef.current!.core.resizeObserver; },
    getState: () => vlRef.current!.state,
    getOffset: () => vlRef.current!.core.getOffset(),
    getSlotSize: () => vlRef.current!.core.getSlotSize(),
    reset: () => vlRef.current?.reset(),
    scrollToIndex: (i, opts) => vlRef.current?.scrollToIndex(i, opts),
    scrollIntoView: (i, opts) => vlRef.current?.scrollIntoView(i, opts),
    scrollToTop: (opts) => vlRef.current?.scrollToTop(opts),
    scrollToBottom: (opts) => vlRef.current?.scrollToBottom(opts),
    scrollToOffset: (o, opts) => vlRef.current?.scrollToOffset(o, opts),
    cancelScroll: () => vlRef.current?.cancelScroll(),
    manualRender: (b, e) => vlRef.current?.core.manualRender(b, e),
    getItemSize: (k) => vlRef.current!.core.getItemSize(k),
    deleteItemSize: (k) => vlRef.current!.core.deleteItemSize(k),
    deletedList2Top: (l) => {
      vlRef.current?.setList(eventsRef.current.list);
      vlRef.current?.deletedList2Top(l);
    },
    addedList2Top: (l) => {
      vlRef.current?.setList(eventsRef.current.list);
      vlRef.current?.addedList2Top(l);
    },
    getItemPosByIndex: (i) => vlRef.current!.core.getItemPosByIndex(i),
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
