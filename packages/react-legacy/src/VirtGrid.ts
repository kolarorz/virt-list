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
   * 滚动容器（唯一的 scrollport）。
   *
   * 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。感知滚动请用
   * `onScroll`——挂在这上面的原生 `scroll` 监听收不到有用信息。
   */
  clientEl: HTMLElement;
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
        estimatedSize: props.estimatedSize ?? 50,
        itemGap: props.itemGap,
        fixedSize: props.fixedSize,
        buffer: props.buffer ?? 2,
        scrollDuration: props.scrollDuration,
        smoothMaxDistance: props.smoothMaxDistance,
        scrollbarAutoHideDelay: props.scrollbarAutoHideDelay,
        scrollbarMinThumbSize: props.scrollbarMinThumbSize,
        keyboard: props.keyboard,
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
      {
        scroll: (e) => eventsRef.current.onScroll?.(e),
        offsetChange: (o) => eventsRef.current.onOffsetChange?.(o),
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
    get clientEl() { return gridRef.current!.clientEl; },
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
