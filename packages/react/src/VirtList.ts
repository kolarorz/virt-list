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
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { VirtList as VirtListVanilla } from '@virt-list/vanilla';
import type {
  ClassValue,
  StyleValue,
  ListState,
  SlotSize,
  VirtListDOMOptions,
  VirtListEvents,
} from '@virt-list/core';

// ======================== Types ========================

export interface EmitFunction<T> {
  scroll?: (e: Event) => void;
  toTop?: (item: T) => void;
  toBottom?: (item: T) => void;
  itemResize?: (id: string, newSize: number) => void;
  update?: (renderList: T[], state: ListState) => void;
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
  scrollToIndex: (index: number) => void;
  scrollIntoView: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToOffset: (offset: number) => void;
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
    get reactiveData() { return getVL().state; },
    get slotSize() { return getVL().core.slotSize; },
    get sizesMap() { return getVL().core.sizesMap; },
    get resizeObserver() { return getVL().core.resizeObserver; },
    getState: () => getVL().state,
    getOffset: () => getVL().core.getOffset(),
    getSlotSize: () => getVL().core.getSlotSize(),
    reset: () => vlRef.current?.reset(),
    scrollToIndex: (i) => vlRef.current?.scrollToIndex(i),
    scrollIntoView: (i) => vlRef.current?.scrollIntoView(i),
    scrollToTop: () => vlRef.current?.scrollToTop(),
    scrollToBottom: () => vlRef.current?.scrollToBottom(),
    scrollToOffset: (o) => vlRef.current?.scrollToOffset(o),
    manualRender: (b, e) => vlRef.current?.core.manualRender(b, e),
    getItemSize: (k) => getVL().core.getItemSize(k),
    deleteItemSize: (k) => getVL().core.deleteItemSize(k),
    deletedList2Top: (l) => vlRef.current?.deletedList2Top(l),
    addedList2Top: (l) => vlRef.current?.addedList2Top(l),
    getItemPosByIndex: (i) => getVL().core.getItemPosByIndex(i),
    forceUpdate: () => vlRef.current?.forceUpdate(),
    setList: (l) => vlRef.current?.setList(l),
  };
}

// ======================== VirtList (React component) ========================

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
  horizontal?: boolean;
  start?: number;
  offset?: number;
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
  renderHeader?: () => ReactNode;
  renderFooter?: () => ReactNode;
  renderStickyHeader?: () => ReactNode;
  renderStickyFooter?: () => ReactNode;
  renderEmpty?: () => ReactNode;

  onScroll?: (e: Event) => void;
  onToTop?: (item: T) => void;
  onToBottom?: (item: T) => void;
  onItemResize?: (id: string, newSize: number) => void;
  onUpdate?: (renderList: T[], state: ListState) => void;

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
  scrollToIndex: (index: number) => void;
  scrollIntoView: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToOffset: (offset: number) => void;
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
}

function VirtListInner(
  props: VirtListProps<any>,
  ref: ForwardedRef<VirtListRef<any>>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vlRef = useRef<VirtListVanilla<any> | null>(null);
  const eventsRef = useRef(props);
  eventsRef.current = props;

  const reactRootsRef = useRef(new Map<string, Root>());

  /** 将 ReactNode 直接渲染到目标 el 中，无额外包裹层 */
  function mountReact(mountKey: string, node: ReactNode, el: HTMLElement): void {
    const old = reactRootsRef.current.get(mountKey);
    if (old) {
      // 渲染期间同步卸载组件问题
      queueMicrotask(() => {
        old.unmount();
      })
    }
    const root = createRoot(el);
    // 生命周期内调用 flushSync 问题
    queueMicrotask(() => {
      flushSync(() => root.render(node));
    })
    reactRootsRef.current.set(mountKey, root);
  }

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
      horizontal: props.horizontal,
      start: props.start,
      offset: props.offset,
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
      options.renderHeader = (el: HTMLElement) => {
        mountReact('header', eventsRef.current.renderHeader!(), el);
      };
    }
    if (p.renderFooter) {
      options.renderFooter = (el: HTMLElement) => {
        mountReact('footer', eventsRef.current.renderFooter!(), el);
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
    };

    vlRef.current = new VirtListVanilla(containerRef.current, options, events);

    return () => {
      vlRef.current?.destroy();
      vlRef.current = null;
      reactRootsRef.current.forEach((root) => root.unmount());
      reactRootsRef.current.clear();
    };
  }, []);

  const prevListRef = useRef(props.list.length);
  if (props.list.length !== prevListRef.current) {
    prevListRef.current = props.list.length;
    vlRef.current?.setList(props.list);
    vlRef.current?.forceUpdate();
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
    scrollToIndex: (i) => vlRef.current?.scrollToIndex(i),
    scrollIntoView: (i) => vlRef.current?.scrollIntoView(i),
    scrollToTop: () => vlRef.current?.scrollToTop(),
    scrollToBottom: () => vlRef.current?.scrollToBottom(),
    scrollToOffset: (o) => vlRef.current?.scrollToOffset(o),
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
