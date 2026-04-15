import {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  createElement,
  type ForwardedRef,
  type Ref,
  type ReactElement,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { VirtListCore } from '@virt-list/core';
import { flushSync } from 'react-dom';
import type {
  ReactiveData,
  SlotSize,
  VirtListOptions,
  VirtListEvents,
} from '@virt-list/core';
import { ObserverItem } from './ObserverItem';

// ======================== Helpers ========================

function mergeStyles(...styles: (string | undefined | null)[]): string {
  let result = '';
  for (const s of styles) {
    if (!s) continue;
    result += s;
    if (!s.endsWith(';')) result += ';';
  }
  return result;
}

function cssTextToStyle(css: string): CSSProperties {
  const style: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!prop || !val) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    style[camel] = val;
  }
  return style as CSSProperties;
}

// ======================== useVirtList (hook) ========================
// React hook, mirrors the Vue useVirtList composable.
// Core owns its internal state; the update event triggers React re-renders.
// Rendering reads directly from core.state and core.renderList.

const defaultProps = {
  itemGap: 0,
  fixed: false,
  buffer: 0,
  bufferTop: 0,
  bufferBottom: 0,
  scrollDistance: 0,
  horizontal: false,
  fixSelection: false,
  start: 0,
  offset: 0,
  listStyle: '',
  listClass: '',
  itemStyle: '' as string | ((item: any, index: number) => string),
  itemClass: '' as string | ((item: any, index: number) => string),
  headerClass: '',
  headerStyle: '',
  footerClass: '',
  footerStyle: '',
  stickyHeaderClass: '',
  stickyHeaderStyle: '',
  stickyFooterClass: '',
  stickyFooterStyle: '',
};

export interface EmitFunction<T> {
  scroll?: (e: Event) => void;
  toTop?: (item: T) => void;
  toBottom?: (item: T) => void;
  itemResize?: (id: string, newSize: number) => void;
  rangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
  update?: (renderList: T[], state: ReactiveData) => void;
}

export interface UseVirtListReturn<T extends Record<string, any>> {
  props: VirtListOptions<T>;
  renderList: T[];
  clientRefEl: React.RefObject<HTMLElement | null>;
  listRefEl: React.RefObject<HTMLElement | null>;
  headerRefEl: React.RefObject<HTMLElement | null>;
  footerRefEl: React.RefObject<HTMLElement | null>;
  stickyHeaderRefEl: React.RefObject<HTMLElement | null>;
  stickyFooterRefEl: React.RefObject<HTMLElement | null>;
  reactiveData: ReactiveData;
  slotSize: SlotSize;
  sizesMap: Map<string, number>;
  resizeObserver: ResizeObserver | undefined;
  getReactiveData: () => ReactiveData;
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
}

export function useVirtList<T extends Record<string, any>>(
  userProps: VirtListOptions<T>,
  emitFunction?: EmitFunction<T>,
): UseVirtListReturn<T> {
  const mergedProps = { ...defaultProps, ...userProps };

  const clientRefEl = useRef<HTMLElement | null>(null);
  const listRefEl = useRef<HTMLElement | null>(null);
  const headerRefEl = useRef<HTMLElement | null>(null);
  const footerRefEl = useRef<HTMLElement | null>(null);
  const stickyHeaderRefEl = useRef<HTMLElement | null>(null);
  const stickyFooterRefEl = useRef<HTMLElement | null>(null);

  // React hook 每次渲染都跑，闭包会过期，所以需要 useRef 做间接寻址。
  const emitRef = useRef(emitFunction);
  emitRef.current = emitFunction;

  const renderingRef = useRef(true);
  renderingRef.current = true;

  const [renderList, setRenderList] = useState<T[]>([]);

  const coreRef = useRef<VirtListCore<T> | null>(null);
  if (!coreRef.current) {
    const events: VirtListEvents<T> = {
      scroll: (e) => {
        if (!renderingRef.current) emitRef.current?.scroll?.(e);
      },
      toTop: (item) => {
        if (!renderingRef.current) emitRef.current?.toTop?.(item);
      },
      toBottom: (item) => {
        if (!renderingRef.current) emitRef.current?.toBottom?.(item);
      },
      itemResize: (id, size) => {
        if (!renderingRef.current) emitRef.current?.itemResize?.(id, size);
      },
      rangeUpdate: (begin, end) => {
        if (!renderingRef.current) emitRef.current?.rangeUpdate?.(begin, end);
      },
      update: (list, state) => {
        flushSync(() => {
          setRenderList(list);
        });
        if (!renderingRef.current) emitRef.current?.update?.(list, state);
      },
    };
    coreRef.current = new VirtListCore<T>(mergedProps, events);
  }

  const core = coreRef.current;

  // Sync list changes during render. External callbacks are guarded,
  // but setVersion fires normally (React handles same-component setState during render).
  const prevListRef = useRef(userProps.list);
  if (userProps.list !== prevListRef.current) {
    prevListRef.current = userProps.list;
    core.updateOptions({ list: userProps.list });
  }

  // Render phase complete — external emit callbacks will propagate normally.
  renderingRef.current = false;

  // Mount / unmount (equivalent to Vue's onMounted / onBeforeUnmount)
  useEffect(() => {
    if (clientRefEl.current) core.bindDOM(clientRefEl.current);
    if (stickyHeaderRefEl.current)
      core.observeSlotEl(stickyHeaderRefEl.current);
    if (stickyFooterRefEl.current)
      core.observeSlotEl(stickyFooterRefEl.current);
    if (headerRefEl.current) core.observeSlotEl(headerRefEl.current);
    if (footerRefEl.current) core.observeSlotEl(footerRefEl.current);

    return () => {
      if (stickyHeaderRefEl.current)
        core.unobserveSlotEl(stickyHeaderRefEl.current);
      if (stickyFooterRefEl.current)
        core.unobserveSlotEl(stickyFooterRefEl.current);
      if (headerRefEl.current) core.unobserveSlotEl(headerRefEl.current);
      if (footerRefEl.current) core.unobserveSlotEl(footerRefEl.current);
      core.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    props: mergedProps,
    renderList,
    clientRefEl,
    listRefEl,
    headerRefEl,
    footerRefEl,
    stickyHeaderRefEl,
    stickyFooterRefEl,
    reactiveData: core.state,
    slotSize: core.slotSize,
    sizesMap: core.sizesMap,
    resizeObserver: core.resizeObserver,
    getReactiveData: () => core.getReactiveData(),
    getOffset: () => core.getOffset(),
    getSlotSize: () => core.getSlotSize(),
    reset: () => core.reset(),
    scrollToIndex: (i) => core.scrollToIndex(i),
    scrollIntoView: (i) => core.scrollIntoView(i),
    scrollToTop: () => core.scrollToTop(),
    scrollToBottom: () => core.scrollToBottom(),
    scrollToOffset: (o) => core.scrollToOffset(o),
    manualRender: (b, e) => core.manualRender(b, e),
    getItemSize: (k) => core.getItemSize(k),
    deleteItemSize: (k) => core.deleteItemSize(k),
    deletedList2Top: (l) => core.deletedList2Top(l),
    addedList2Top: (l) => core.addedList2Top(l),
    getItemPosByIndex: (i) => core.getItemPosByIndex(i),
    forceUpdate: () => core.forceUpdate(),
  };
}

// ======================== VirtList (React component) ========================
// React virtual list component, based on the useVirtList hook.
// Render props (children/renderHeader/renderFooter/renderStickyHeader/renderStickyFooter/renderEmpty)
// replace Vue slots. Each list item is wrapped by ObserverItem for resize observation.

export interface VirtListProps<T extends Record<string, any> = any> {
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
  fixSelection?: boolean;
  start?: number;
  offset?: number;
  listStyle?: string;
  listClass?: string;
  itemStyle?: string | ((item: T, index: number) => string);
  itemClass?: string | ((item: T, index: number) => string);
  headerClass?: string;
  headerStyle?: string;
  footerClass?: string;
  footerStyle?: string;
  stickyHeaderClass?: string;
  stickyHeaderStyle?: string;
  stickyFooterClass?: string;
  stickyFooterStyle?: string;

  children?: (props: { itemData: T; index: number }) => ReactNode;
  renderHeader?: () => ReactNode;
  renderFooter?: () => ReactNode;
  renderStickyHeader?: () => ReactNode;
  renderStickyFooter?: () => ReactNode;
  renderEmpty?: () => ReactNode;

  onScroll?: (e: Event) => void;
  onToTop?: (item: T) => void;
  onToBottom?: (item: T) => void;
  onItemResize?: (id: string, newSize: number) => void;
  onRangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
  onUpdate?: (renderList: T[], state: ReactiveData) => void;
}

export interface VirtListRef<T extends Record<string, any> = any> {
  reactiveData: ReactiveData;
  slotSize: SlotSize;
  sizesMap: Map<string, number>;
  resizeObserver: ResizeObserver | undefined;
  getReactiveData: () => ReactiveData;
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
}

function VirtListInner(
  props: VirtListProps<any>,
  ref: ForwardedRef<VirtListRef<any>>,
) {
  const emitFn: EmitFunction<any> = {
    scroll: (e) => props.onScroll?.(e),
    toTop: (item) => props.onToTop?.(item),
    toBottom: (item) => props.onToBottom?.(item),
    itemResize: (id, size) => props.onItemResize?.(id, size),
    rangeUpdate: (begin, end) => props.onRangeUpdate?.(begin, end),
    update: (list, state) => props.onUpdate?.(list, state),
  };

  const vl = useVirtList(props as any, emitFn);

  useImperativeHandle(ref, () => ({
    reactiveData: vl.reactiveData,
    slotSize: vl.slotSize,
    sizesMap: vl.sizesMap,
    resizeObserver: vl.resizeObserver,
    getReactiveData: vl.getReactiveData,
    getOffset: vl.getOffset,
    getSlotSize: vl.getSlotSize,
    reset: vl.reset,
    scrollToIndex: vl.scrollToIndex,
    scrollIntoView: vl.scrollIntoView,
    scrollToTop: vl.scrollToTop,
    scrollToBottom: vl.scrollToBottom,
    scrollToOffset: vl.scrollToOffset,
    manualRender: vl.manualRender,
    getItemSize: vl.getItemSize,
    deleteItemSize: vl.deleteItemSize,
    deletedList2Top: vl.deletedList2Top,
    addedList2Top: vl.addedList2Top,
    getItemPosByIndex: vl.getItemPosByIndex,
    forceUpdate: vl.forceUpdate,
  }));

  const { renderList, reactiveData, resizeObserver } = vl;
  const {
    itemGap = 0,
    itemKey,
    horizontal = false,
    listStyle = '',
    listClass = '',
    itemStyle = '' as string | ((item: any, index: number) => string),
    itemClass = '' as string | ((item: any, index: number) => string),
    headerClass = '',
    headerStyle = '',
    footerClass = '',
    footerStyle = '',
    stickyHeaderClass = '',
    stickyHeaderStyle = '',
    stickyFooterClass = '',
    stickyFooterStyle = '',
  } = props;

  const { listTotalSize, virtualSize, renderBegin } = reactiveData;

  // ---- Render sticky header slot ----
  const renderStickyHeaderSlot = (): ReactElement | null =>
    props.renderStickyHeader
      ? createElement(
        'div',
        {
          key: 'slot-sticky-header',
          ref: vl.stickyHeaderRefEl,
          className: stickyHeaderClass || undefined,
          style: cssTextToStyle(
            mergeStyles(
              'position: sticky; z-index: 10;',
              horizontal ? 'left: 0' : 'top: 0;',
              stickyHeaderStyle,
            ),
          ),
          'data-id': 'stickyHeader',
        },
        props.renderStickyHeader(),
      )
      : null;

  // ---- Render sticky footer slot ----
  const renderStickyFooterSlot = (): ReactElement | null =>
    props.renderStickyFooter
      ? createElement(
        'div',
        {
          key: 'slot-sticky-footer',
          ref: vl.stickyFooterRefEl,
          className: stickyFooterClass || undefined,
          style: cssTextToStyle(
            mergeStyles(
              'position: sticky; z-index: 10;',
              horizontal ? 'right: 0' : 'bottom: 0;',
              stickyFooterStyle,
            ),
          ),
          'data-id': 'stickyFooter',
        },
        props.renderStickyFooter(),
      )
      : null;

  // ---- Render header slot ----
  const renderHeaderSlot = (): ReactElement | null =>
    props.renderHeader
      ? createElement(
        'div',
        {
          key: 'slot-header',
          ref: vl.headerRefEl,
          className: headerClass || undefined,
          style: headerStyle ? cssTextToStyle(headerStyle) : undefined,
          'data-id': 'header',
        },
        props.renderHeader(),
      )
      : null;

  // ---- Render footer slot ----
  const renderFooterSlot = (): ReactElement | null =>
    props.renderFooter
      ? createElement(
        'div',
        {
          key: 'slot-footer',
          ref: vl.footerRefEl,
          className: footerClass || undefined,
          style: footerStyle ? cssTextToStyle(footerStyle) : undefined,
          'data-id': 'footer',
        },
        props.renderFooter(),
      )
      : null;

  // ---- Render main list ----
  const renderMainList = (): ReactElement => {
    const mainList: ReactElement[] = [];

    for (let index = 0; index < renderList.length; index += 1) {
      const currentItem = renderList[index];
      const resolvedClass =
        typeof itemClass === 'function'
          ? itemClass(currentItem, index)
          : (itemClass as string);
      const resolvedStyle = mergeStyles(
        itemGap > 0
          ? horizontal
            ? `padding: 0 ${itemGap / 2}px;`
            : `padding: ${itemGap / 2}px 0;`
          : '',
        typeof itemStyle === 'function'
          ? itemStyle(currentItem, index)
          : (itemStyle as string),
      );

      mainList.push(
        createElement(
          ObserverItem,
          {
            key: currentItem[itemKey],
            id: currentItem[itemKey],
            resizeObserver,
            className: resolvedClass || undefined,
            style: resolvedStyle ? cssTextToStyle(resolvedStyle) : undefined,
          },
          props.children?.({
            itemData: currentItem,
            index: renderBegin + index,
          }),
        ),
      );
    }

    if (mainList.length === 0 && props.renderEmpty) {
      mainList.push(
        createElement(
          'div',
          {
            key: 'slot-empty',
            style: {
              width: '100%',
              height: '100%',
              position: 'absolute' as const,
              top: 0,
              left: 0,
            },
          },
          props.renderEmpty(),
        ),
      );
    }

    const dynamicListStyle = horizontal
      ? `will-change: width; min-width: ${listTotalSize}px; display: flex; ${listStyle}`
      : `will-change: height; min-height: ${listTotalSize}px; ${listStyle}`;
    const virtualStyle = horizontal
      ? `width: ${virtualSize}px; will-change: width;`
      : `height: ${virtualSize}px; will-change: height;`;

    return createElement(
      'div',
      {
        ref: vl.listRefEl,
        className: listClass || undefined,
        style: cssTextToStyle(dynamicListStyle),
      },
      createElement('div', { style: cssTextToStyle(virtualStyle) }),
      ...mainList,
    );
  };

  // ---- Root element ----
  return createElement(
    'div',
    {
      ref: vl.clientRefEl,
      className: 'virt-list__client',
      style: { width: '100%', height: '100%', overflow: 'auto', position: 'relative' },
      'data-id': 'client',
    },
    renderStickyHeaderSlot(),
    renderHeaderSlot(),
    renderMainList(),
    renderFooterSlot(),
    renderStickyFooterSlot(),
  );
}

export const VirtList = forwardRef(VirtListInner) as <
  T extends Record<string, any> = any,
>(
  props: VirtListProps<T> & { ref?: Ref<VirtListRef<T>> },
) => ReactElement | null;
