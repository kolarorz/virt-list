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
import { VirtGrid as VirtGridVanilla } from '@virt-list/vanilla';
import type {
  ListState,
  StyleValue,
  VirtScrollEvent,
  VirtScrollOptions,
} from '@virt-list/core';

export interface VirtGridProps<T extends Record<string, any> = Record<string, any>> {
  list: T[];
  gridItems: number;
  itemKey: string;
  itemPreSize?: number;
  itemGap?: number;
  fixed?: boolean;
  buffer?: number;
  scrollDuration?: number;
  smoothMaxDistance?: number;
  scrollbarAutoHide?: number;
  scrollbarMinThumbSize?: number;
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
  setList: (list: Record<string, any>[]) => void;
  setGridItems: (n: number) => void;
  scrollToIndex: (i: number, options?: VirtScrollOptions) => void;
  scrollIntoView: (i: number, options?: VirtScrollOptions) => void;
  scrollToTop: (options?: VirtScrollOptions) => void;
  scrollToBottom: (options?: VirtScrollOptions) => void;
  scrollToOffset: (o: number, options?: VirtScrollOptions) => void;
  /** 当前滚动偏移量。容器的 scrollTop 恒为 0（内容靠 transform 移动），必须走这里读 */
  getOffset: () => number;
  /** 上报一次用户发起的滚动（会触发 toTop / toBottom 与自动续拉） */
  scrollFromUser: (offset: number) => void;
  cancelScroll: () => void;
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
  const reactRootsRef = useRef(new Map<string, Root>());

  function mountReact(mountKey: string, node: ReactNode, el: HTMLElement): void {
    const old = reactRootsRef.current.get(mountKey);
    if (old) {
      queueMicrotask(() => {
        old.unmount();
      });
    }
    const root = createRoot(el);
    queueMicrotask(() => {
      flushSync(() => root.render(node));
    });
    reactRootsRef.current.set(mountKey, root);
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

    gridRef.current = new VirtGridVanilla(
      containerRef.current,
      {
        list: props.list,
        gridItems: props.gridItems,
        itemKey: props.itemKey,
        itemPreSize: props.itemPreSize ?? 50,
        itemGap: props.itemGap,
        fixed: props.fixed,
        buffer: props.buffer ?? 2,
        scrollDuration: props.scrollDuration,
        smoothMaxDistance: props.smoothMaxDistance,
        scrollbarAutoHide: props.scrollbarAutoHide,
        scrollbarMinThumbSize: props.scrollbarMinThumbSize,
        itemStyle: props.itemStyle,
        renderItem: props.renderItem ?? ((item: any, rowIndex: number, listIndex: number, el: HTMLElement) => {
          if (eventsRef.current.children) {
            mountReact(
              `grid:item:${String(item?.[props.itemKey] ?? listIndex)}`,
              eventsRef.current.children({ itemData: item, rowIndex, listIndex }),
              el,
            );
          }
        }),
        renderStickyHeader: props.renderStickyHeader,
        renderStickyFooter: props.renderStickyFooter,
        renderHeader: props.renderHeader,
        renderFooter: props.renderFooter,
        renderEmpty: props.renderEmpty,
        stickyHeaderStyle: props.stickyHeaderStyle,
      },
      events,
    );

    return () => {
      gridRef.current?.destroy();
      gridRef.current = null;
      reactRootsRef.current.forEach((root) => root.unmount());
      reactRootsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevListRef = useRef(props.list);
  if (props.list !== prevListRef.current) {
    prevListRef.current = props.list;
    gridRef.current?.setList(props.list);
  }

  const prevGridItemsRef = useRef(props.gridItems);
  if (props.gridItems !== prevGridItemsRef.current) {
    prevGridItemsRef.current = props.gridItems;
    if (props.gridItems > 0) gridRef.current?.setGridItems(props.gridItems);
  }

  useImperativeHandle(ref, () => ({
    setList: (list) => gridRef.current?.setList(list),
    setGridItems: (n) => gridRef.current?.setGridItems(n),
    scrollToIndex: (i, opts) => gridRef.current?.scrollToIndex(i, opts),
    scrollIntoView: (i, opts) => gridRef.current?.scrollIntoView(i, opts),
    scrollToTop: (opts) => gridRef.current?.scrollToTop(opts),
    scrollToBottom: (opts) => gridRef.current?.scrollToBottom(opts),
    scrollToOffset: (o, opts) => gridRef.current?.scrollToOffset(o, opts),
    getOffset: () => gridRef.current?.getOffset() ?? 0,
    scrollFromUser: (o) => gridRef.current?.scrollFromUser(o),
    cancelScroll: () => gridRef.current?.cancelScroll(),
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
