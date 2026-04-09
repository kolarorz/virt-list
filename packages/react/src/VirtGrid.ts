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
} from 'react';
import { VirtGridDOM } from '@virt-list/dom';

export interface VirtGridProps {
  list: any[];
  gridItems: number;
  itemKey: string;
  itemPreSize?: number;
  itemGap?: number;
  fixed?: boolean;
  buffer?: number;
  itemStyle?: string;
  renderCell: (item: any, index: number, rowIndex: number) => HTMLElement;
  renderStickyHeader?: () => HTMLElement;
  renderStickyFooter?: () => HTMLElement;
  renderHeader?: () => HTMLElement;
  renderFooter?: () => HTMLElement;
  renderEmpty?: () => HTMLElement;
  stickyHeaderStyle?: string;

  onScroll?: (e: Event) => void;
  onToTop?: (item: any) => void;
  onToBottom?: (item: any) => void;
  onItemResize?: (id: string, size: number) => void;
  onRangeUpdate?: (begin: number, end: number) => void;

  style?: React.CSSProperties;
  className?: string;
}

export interface VirtGridRef {
  setList: (list: any[]) => void;
  setGridItems: (n: number) => void;
  scrollToIndex: (i: number) => void;
  scrollIntoView: (i: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToOffset: (o: number) => void;
  forceUpdate: () => void;
}

/**
 * React 虚拟网格组件的内部实现。
 *
 * VirtGridDOM 在 useEffect([]) 中创建一次。
 * list 和 gridItems 的变化通过 render 阶段的 ref 比较检测并同步。
 */
function VirtGridInner(props: VirtGridProps, ref: ForwardedRef<VirtGridRef>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<VirtGridDOM<any> | null>(null);
  const eventsRef = useRef(props);
  eventsRef.current = props;

  useEffect(() => {
    if (!containerRef.current) return;

    gridRef.current = new VirtGridDOM(
      containerRef.current,
      {
        list: props.list,
        gridItems: props.gridItems,
        itemKey: props.itemKey,
        itemPreSize: props.itemPreSize ?? 50,
        itemGap: props.itemGap,
        fixed: props.fixed,
        buffer: props.buffer,
        itemStyle: props.itemStyle,
        renderCell: props.renderCell,
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
        rangeUpdate: (begin, end) => eventsRef.current.onRangeUpdate?.(begin, end),
      },
    );

    return () => {
      gridRef.current?.destroy();
      gridRef.current = null;
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
