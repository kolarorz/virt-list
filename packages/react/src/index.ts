/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
  createElement,
  type ReactNode,
  type CSSProperties,
  type RefObject,
  type ForwardedRef,
  type Ref,
  type ReactElement,
} from 'react';
import { VirtListCore } from '@virt-list/core';
import type {
  ReactiveData,
  SlotSize,
  VirtListOptions,
  VirtListEvents,
} from '@virt-list/core';
import { ObserverItem } from './ObserverItem';


// ======================== useVirtList (hook) ========================
// React Hook 封装，将 VirtListCore 的状态映射为 React state。
// core 在首次渲染时创建（useRef），update 事件通过 setSnapshot 触发 React 重渲染。
// 事件回调通过 eventsRef 间接引用，避免 core 重建。

export interface UseVirtListOptions<T extends Record<string, any>>
  extends VirtListOptions<T> {
  onScroll?: (e: Event) => void;
  onToTop?: (item: T) => void;
  onToBottom?: (item: T) => void;
  onItemResize?: (id: string, newSize: number) => void;
  onRangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
}

export interface UseVirtListReturn<T extends Record<string, any>> {
  renderList: T[];
  reactiveData: ReactiveData;
  slotSize: SlotSize;
  sizesMap: Map<string, number>;
  resizeObserver: ResizeObserver | undefined;

  clientRef: RefObject<HTMLElement | null>;
  listRef: RefObject<HTMLElement | null>;
  headerRef: (el: HTMLElement | null) => void;
  footerRef: (el: HTMLElement | null) => void;
  stickyHeaderRef: (el: HTMLElement | null) => void;
  stickyFooterRef: (el: HTMLElement | null) => void;

  getOffset: () => number;
  getSlotSize: () => number;
  getTotalSize: () => number;
  getItemSize: (itemKey: string) => number;
  deleteItemSize: (itemKey: string) => void;
  getItemPosByIndex: (index: number) => { top: number; current: number; bottom: number };
  getReactiveData: () => ReactiveData;

  scrollToOffset: (offset: number) => void;
  scrollToIndex: (index: number) => void;
  scrollIntoView: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  manualRender: (begin: number, end: number) => void;
  reset: () => void;
  forceUpdate: () => void;
  deletedList2Top: (deletedList: T[]) => void;
  addedList2Top: (addedList: T[]) => void;
}

export function useVirtList<T extends Record<string, any>>(
  options: UseVirtListOptions<T>,
): UseVirtListReturn<T> {
  const {
    onScroll,
    onToTop,
    onToBottom,
    onItemResize,
    onRangeUpdate,
    ...coreOptions
  } = options;

  const [snapshot, setSnapshot] = useState<{
    renderList: T[];
    reactiveData: ReactiveData;
    slotSize: SlotSize;
  }>(() => ({
    renderList: [],
    reactiveData: {
      views: 0, offset: 0, listTotalSize: 0, virtualSize: 0,
      inViewBegin: 0, inViewEnd: 0, renderBegin: 0, renderEnd: 0,
      bufferTop: 0, bufferBottom: 0,
    },
    slotSize: {
      clientSize: 0, headerSize: 0, footerSize: 0,
      stickyHeaderSize: 0, stickyFooterSize: 0,
    },
  }));

  const eventsRef = useRef<Omit<UseVirtListOptions<T>, keyof VirtListOptions<T>>>({});
  eventsRef.current = { onScroll, onToTop, onToBottom, onItemResize, onRangeUpdate };

  const coreRef = useRef<VirtListCore<T> | null>(null);
  if (!coreRef.current) {
    let core: VirtListCore<T>;
    const events: VirtListEvents<T> = {
      scroll: (e) => eventsRef.current.onScroll?.(e),
      toTop: (item) => eventsRef.current.onToTop?.(item),
      toBottom: (item) => eventsRef.current.onToBottom?.(item),
      itemResize: (id, size) => eventsRef.current.onItemResize?.(id, size),
      rangeUpdate: (begin, end) => eventsRef.current.onRangeUpdate?.(begin, end),
      update: (renderList, state) => {
        if (!core) return;
        setSnapshot({
          renderList,
          reactiveData: { ...state },
          slotSize: { ...core.slotSize },
        });
      },
    };
    core = new VirtListCore<T>(coreOptions, events);
    coreRef.current = core;
  }

  const core = coreRef.current;

  const clientRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLElement | null>(null);
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slotElsRef = useRef<{
    header: HTMLElement | null;
    footer: HTMLElement | null;
    stickyHeader: HTMLElement | null;
    stickyFooter: HTMLElement | null;
  }>({ header: null, footer: null, stickyHeader: null, stickyFooter: null });

  const makeSlotRefCallback = useCallback(
    (slotName: 'header' | 'footer' | 'stickyHeader' | 'stickyFooter') => {
      return (el: HTMLElement | null) => {
        const prev = slotElsRef.current[slotName];
        if (prev === el) return;
        if (prev) core.unobserveSlotEl(prev);
        slotElsRef.current[slotName] = el;
        if (el) core.observeSlotEl(el);
      };
    },
    [core],
  );

  const headerRef = useMemo(() => makeSlotRefCallback('header'), [makeSlotRefCallback]);
  const footerRef = useMemo(() => makeSlotRefCallback('footer'), [makeSlotRefCallback]);
  const stickyHeaderRef = useMemo(() => makeSlotRefCallback('stickyHeader'), [makeSlotRefCallback]);
  const stickyFooterRef = useMemo(() => makeSlotRefCallback('stickyFooter'), [makeSlotRefCallback]);

  useEffect(() => {
    if (destroyTimerRef.current) {
      clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }
    if (clientRef.current) {
      core.bindDOM(clientRef.current);
    }
    return () => {
      destroyTimerRef.current = setTimeout(() => {
        core.destroy();
        destroyTimerRef.current = null;
      }, 0);
    };
  }, [core]);

  const prevListStateRef = useRef({ list: options.list, length: options.list.length });
  if (
    options.list !== prevListStateRef.current.list ||
    options.list.length !== prevListStateRef.current.length
  ) {
    prevListStateRef.current = { list: options.list, length: options.list.length };
    core.updateOptions({ list: options.list });
  }

  const prevOptionsRef = useRef(coreOptions);
  const prevOpts = prevOptionsRef.current;
  if (
    prevOpts.itemPreSize !== coreOptions.itemPreSize ||
    prevOpts.itemGap !== coreOptions.itemGap ||
    prevOpts.fixed !== coreOptions.fixed ||
    prevOpts.buffer !== coreOptions.buffer ||
    prevOpts.bufferTop !== coreOptions.bufferTop ||
    prevOpts.bufferBottom !== coreOptions.bufferBottom ||
    prevOpts.horizontal !== coreOptions.horizontal ||
    prevOpts.scrollDistance !== coreOptions.scrollDistance
  ) {
    core.updateOptions(coreOptions);
    prevOptionsRef.current = coreOptions;
  }

  return {
    renderList: snapshot.renderList,
    reactiveData: snapshot.reactiveData,
    slotSize: snapshot.slotSize,
    sizesMap: core.sizesMap,
    resizeObserver: core.resizeObserver,

    clientRef,
    listRef,
    headerRef,
    footerRef,
    stickyHeaderRef,
    stickyFooterRef,

    getOffset: () => core.getOffset(),
    getSlotSize: () => core.getSlotSize(),
    getTotalSize: () => core.getTotalSize(),
    getItemSize: (k) => core.getItemSize(k),
    deleteItemSize: (k) => core.deleteItemSize(k),
    getItemPosByIndex: (i) => core.getItemPosByIndex(i),
    getReactiveData: () => core.getReactiveData(),

    scrollToOffset: (o) => core.scrollToOffset(o),
    scrollToIndex: (i) => core.scrollToIndex(i),
    scrollIntoView: (i) => core.scrollIntoView(i),
    scrollToTop: () => core.scrollToTop(),
    scrollToBottom: () => core.scrollToBottom(),
    manualRender: (b, e) => core.manualRender(b, e),
    reset: () => core.reset(),
    forceUpdate: () => core.forceUpdate(),
    deletedList2Top: (l) => core.deletedList2Top(l),
    addedList2Top: (l) => core.addedList2Top(l),
  };
}



// ======================== VirtList (component) ========================
// React 虚拟列表组件，基于 useVirtList hook 实现。
// 通过 render prop（renderItem/renderHeader/...）渲染内容。
// 每个列表项由 ObserverItem 包裹以监听尺寸变化。

export interface VirtListProps<T extends Record<string, any>>
  extends VirtListOptions<T> {
  renderItem: (item: T, index: number) => ReactNode;
  renderHeader?: () => ReactNode;
  renderFooter?: () => ReactNode;
  renderStickyHeader?: () => ReactNode;
  renderStickyFooter?: () => ReactNode;
  renderEmpty?: () => ReactNode;

  listStyle?: CSSProperties;
  listClassName?: string;
  itemStyle?: CSSProperties | ((item: T, index: number) => CSSProperties);
  itemClassName?: string | ((item: T, index: number) => string);
  headerClassName?: string;
  headerStyle?: CSSProperties;
  footerClassName?: string;
  footerStyle?: CSSProperties;
  stickyHeaderClassName?: string;
  stickyHeaderStyle?: CSSProperties;
  stickyFooterClassName?: string;
  stickyFooterStyle?: CSSProperties;

  onScroll?: (e: Event) => void;
  onToTop?: (item: T) => void;
  onToBottom?: (item: T) => void;
  onItemResize?: (id: string, newSize: number) => void;
  onRangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
}

export interface VirtListRef<T extends Record<string, any>> {
  scrollToOffset: (offset: number) => void;
  scrollToIndex: (index: number) => void;
  scrollIntoView: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  manualRender: (begin: number, end: number) => void;
  reset: () => void;
  forceUpdate: () => void;
  deletedList2Top: (deletedList: T[]) => void;
  addedList2Top: (addedList: T[]) => void;
  getOffset: () => number;
  getSlotSize: () => number;
  getTotalSize: () => number;
  getItemSize: (itemKey: string) => number;
  deleteItemSize: (itemKey: string) => void;
  getItemPosByIndex: (index: number) => { top: number; current: number; bottom: number };
  getReactiveData: () => ReactiveData;
}

function VirtListInner<T extends Record<string, any>>(
  props: VirtListProps<T>,
  ref: ForwardedRef<VirtListRef<T>>,
) {
  const {
    list,
    itemKey,
    itemPreSize,
    renderItem,
    renderHeader,
    renderFooter,
    renderStickyHeader,
    renderStickyFooter,
    renderEmpty,
    horizontal = false,
    itemGap = 0,
    listStyle,
    listClassName,
    itemStyle,
    itemClassName,
    headerClassName,
    headerStyle: headerStyleProp,
    footerClassName,
    footerStyle: footerStyleProp,
    stickyHeaderClassName,
    stickyHeaderStyle: stickyHeaderStyleProp,
    stickyFooterClassName,
    stickyFooterStyle: stickyFooterStyleProp,
    onScroll,
    onToTop,
    onToBottom,
    onItemResize,
    onRangeUpdate,
    ...restOptions
  } = props;

  const vl = useVirtList<T>({
    list,
    itemKey,
    itemPreSize,
    horizontal,
    itemGap,
    onScroll,
    onToTop,
    onToBottom,
    onItemResize,
    onRangeUpdate,
    ...restOptions,
  });

  const {
    renderList,
    reactiveData,
    resizeObserver,
    clientRef,
    listRef,
    headerRef,
    footerRef,
    stickyHeaderRef,
    stickyFooterRef,
    slotSize,
  } = vl;

  useImperativeHandle(ref, () => ({
    scrollToOffset: vl.scrollToOffset,
    scrollToIndex: vl.scrollToIndex,
    scrollIntoView: vl.scrollIntoView,
    scrollToTop: vl.scrollToTop,
    scrollToBottom: vl.scrollToBottom,
    manualRender: vl.manualRender,
    reset: vl.reset,
    forceUpdate: vl.forceUpdate,
    deletedList2Top: vl.deletedList2Top,
    addedList2Top: vl.addedList2Top,
    getOffset: vl.getOffset,
    getSlotSize: vl.getSlotSize,
    getTotalSize: vl.getTotalSize,
    getItemSize: vl.getItemSize,
    deleteItemSize: vl.deleteItemSize,
    getItemPosByIndex: vl.getItemPosByIndex,
    getReactiveData: vl.getReactiveData,
  }), [vl]);

  const { listTotalSize, virtualSize, renderBegin } = reactiveData;

  const dynamicListStyle: CSSProperties = horizontal
    ? { willChange: 'width', minWidth: listTotalSize, display: 'flex', ...listStyle }
    : { willChange: 'height', minHeight: listTotalSize, ...listStyle };

  const virtualStyle: CSSProperties = horizontal
    ? { width: virtualSize, willChange: 'width' }
    : { height: virtualSize, willChange: 'height' };

  const stickyBaseStyle: CSSProperties = { position: 'sticky', zIndex: 10 };

  const mainItems = renderList.map((item, i) => {
    const key = String(item[itemKey]);
    const idx = renderBegin + i;
    const gap: CSSProperties = itemGap > 0 ? { paddingTop: itemGap / 2, paddingBottom: itemGap / 2 } : {};
    const customStyle = typeof itemStyle === 'function' ? itemStyle(item, idx) : itemStyle;
    const customClass = typeof itemClassName === 'function' ? itemClassName(item, idx) : itemClassName;

    return createElement(
      ObserverItem,
      { key, itemKey: key, resizeObserver, className: customClass, style: { ...gap, ...customStyle } },
      renderItem(item, idx),
    );
  });

  const showEmpty = mainItems.length === 0 && renderEmpty;
  const emptyHeight = showEmpty ? slotSize.clientSize - vl.getSlotSize() : 0;

  const children: ReactNode[] = [];

  // sticky header
  if (renderStickyHeader) {
    children.push(
      createElement(
        'div',
        {
          key: 'sticky-header',
          ref: stickyHeaderRef,
          className: stickyHeaderClassName,
          style: { ...stickyBaseStyle, ...(horizontal ? { left: 0 } : { top: 0 }), ...stickyHeaderStyleProp },
          'data-id': 'stickyHeader',
        },
        renderStickyHeader(),
      ),
    );
  }

  // header
  if (renderHeader) {
    children.push(
      createElement(
        'div',
        {
          key: 'header',
          ref: headerRef,
          className: headerClassName,
          style: headerStyleProp,
          'data-id': 'header',
        },
        renderHeader(),
      ),
    );
  }

  // main list
  children.push(
    createElement(
      'div',
      { key: 'list', ref: listRef, className: listClassName, style: dynamicListStyle },
      createElement('div', { key: 'virtual', style: virtualStyle }),
      ...(showEmpty
        ? [createElement('div', { key: 'empty', style: { height: emptyHeight } }, renderEmpty!())]
        : mainItems),
    ),
  );

  // footer
  if (renderFooter) {
    children.push(
      createElement(
        'div',
        {
          key: 'footer',
          ref: footerRef,
          className: footerClassName,
          style: footerStyleProp,
          'data-id': 'footer',
        },
        renderFooter(),
      ),
    );
  }

  // sticky footer
  if (renderStickyFooter) {
    children.push(
      createElement(
        'div',
        {
          key: 'sticky-footer',
          ref: stickyFooterRef,
          className: stickyFooterClassName,
          style: { ...stickyBaseStyle, ...(horizontal ? { right: 0 } : { bottom: 0 }), ...stickyFooterStyleProp },
          'data-id': 'stickyFooter',
        },
        renderStickyFooter(),
      ),
    );
  }

  return createElement(
    'div',
    {
      ref: clientRef,
      className: 'virt-list__client',
      style: { width: '100%', height: '100%', overflow: 'auto' } as CSSProperties,
      'data-id': 'client',
    },
    ...children,
  );
}

export const VirtList = forwardRef(VirtListInner) as <T extends Record<string, any>>(
  props: VirtListProps<T> & { ref?: Ref<VirtListRef<T>> },
) => ReactElement | null;

export { VirtTree } from './VirtTree';
export type { VirtTreeProps, VirtTreeRef, TreeNode, TreeNodeKey, TreeData, TreeFieldNames, TreeNodeData, IScrollParams } from './VirtTree';
export { VirtGrid } from './VirtGrid';
export type { VirtGridProps, VirtGridRef } from './VirtGrid';
