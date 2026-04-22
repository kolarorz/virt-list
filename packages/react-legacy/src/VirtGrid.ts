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
import { VirtGrid as VirtGridVanilla } from '@virt-list/vanilla';
import type { ListState, StyleValue } from '@virt-list/core';
import { createReactMounter } from './compat';

export interface VirtGridProps<T extends Record<string, any> = Record<string, any>> {
  list: T[];
  gridItems: number;
  itemKey: string;
  itemPreSize?: number;
  itemGap?: number;
  fixed?: boolean;
  buffer?: number;
  itemStyle?: StyleValue;
  children?: (props: { itemData: T; index: number; rowIndex: number }) => ReactNode;
  renderItem?: (item: T, index: number, rowIndex: number, el: HTMLElement) => HTMLElement | void;
  renderStickyHeader?: (el: HTMLElement) => HTMLElement | void;
  renderStickyFooter?: (el: HTMLElement) => HTMLElement | void;
  renderHeader?: (el: HTMLElement) => HTMLElement | void;
  renderFooter?: (el: HTMLElement) => HTMLElement | void;
  renderEmpty?: (el: HTMLElement) => HTMLElement | void;
  stickyHeaderStyle?: StyleValue;

  onScroll?: (e: Event) => void;
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
  scrollToIndex: (i: number) => void;
  scrollIntoView: (i: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToOffset: (o: number) => void;
  forceUpdate: () => void;
}

/**
 * React 16-17 虚拟网格组件。
 *
 * 默认通过 children 渲染单元格；也可用 renderItem 走底层 DOM 回调。
 */
function VirtGridInner(props: VirtGridProps, ref: ForwardedRef<VirtGridRef>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<VirtGridVanilla<any> | null>(null);
  const eventsRef = useRef(props);
  eventsRef.current = props;
  const mountedElsRef = useRef(new Set<HTMLElement>());
  const { mountReact, cleanupAllRoots } = createReactMounter(mountedElsRef);

  useEffect(() => {
    if (!containerRef.current) return;

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
        itemStyle: props.itemStyle,
        renderItem: props.renderItem ?? ((item: any, index: number, rowIndex: number, el: HTMLElement) => {
          if (eventsRef.current.children) {
            mountReact(
              `grid:item:${String(item?.[props.itemKey] ?? index)}`,
              eventsRef.current.children({ itemData: item, index, rowIndex }),
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
      {
        scroll: (e) => eventsRef.current.onScroll?.(e),
        toTop: (item) => eventsRef.current.onToTop?.(item),
        toBottom: (item) => eventsRef.current.onToBottom?.(item),
        itemResize: (id, size) => eventsRef.current.onItemResize?.(id, size),
        update: (renderList, state) => eventsRef.current.onUpdate?.(renderList, state),
      },
    );

    return () => {
      gridRef.current?.destroy();
      gridRef.current = null;
      cleanupAllRoots();
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
    scrollToIndex: (i) => gridRef.current?.scrollToIndex(i),
    scrollIntoView: (i) => gridRef.current?.scrollIntoView(i),
    scrollToTop: () => gridRef.current?.scrollToTop(),
    scrollToBottom: () => gridRef.current?.scrollToBottom(),
    scrollToOffset: (o) => gridRef.current?.scrollToOffset(o),
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
