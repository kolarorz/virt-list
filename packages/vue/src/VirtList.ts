/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  defineComponent,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  h,
  Fragment,
  render as vueRender,
  type PropType,
  type VNode,
} from 'vue';
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
  containerRef: ReturnType<typeof ref<HTMLElement | null>>;
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

// ======================== useVirtList (composable) ========================

export function useVirtList<T extends Record<string, any>>(
  options: VirtListDOMOptions<T>,
  emitFunction?: EmitFunction<T>,
): UseVirtListReturn<T> {
  const containerRef = ref<HTMLElement | null>(null);
  let vl: VirtListVanilla<T> | null = null;

  const events: VirtListEvents<T> = {
    scroll: (e) => emitFunction?.scroll?.(e),
    toTop: (item) => emitFunction?.toTop?.(item),
    toBottom: (item) => emitFunction?.toBottom?.(item),
    itemResize: (id, size) => emitFunction?.itemResize?.(id, size),
    update: (list, state) => emitFunction?.update?.(list, state),
    loadStateChange: (loadState) =>
      emitFunction?.loadStateChange?.(loadState),
  };

  onMounted(() => {
    if (containerRef.value) {
      vl = new VirtListVanilla<T>(containerRef.value, options, events);
    }
  });

  onBeforeUnmount(() => {
    vl?.destroy();
    vl = null;
  });

  const getVL = () => vl!;

  return {
    containerRef,
    get reactiveData() { return getVL().state; },
    get slotSize() { return getVL().core.slotSize; },
    get sizesMap() { return getVL().core.sizesMap; },
    get resizeObserver() { return getVL().core.resizeObserver; },
    getState: () => getVL().state,
    getOffset: () => getVL().core.getOffset(),
    getSlotSize: () => getVL().core.getSlotSize(),
    reset: () => vl?.reset(),
    scrollToIndex: (i, opts) => vl?.scrollToIndex(i, opts),
    scrollIntoView: (i, opts) => vl?.scrollIntoView(i, opts),
    scrollToTop: (opts) => vl?.scrollToTop(opts),
    scrollToBottom: (opts) => vl?.scrollToBottom(opts),
    scrollToOffset: (o, opts) => vl?.scrollToOffset(o, opts),
    cancelScroll: () => vl?.cancelScroll(),
    manualRender: (b, e) => vl?.core.manualRender(b, e),
    getItemSize: (k) => getVL().core.getItemSize(k),
    deleteItemSize: (k) => getVL().core.deleteItemSize(k),
    deletedList2Top: (l) => vl?.deletedList2Top(l),
    addedList2Top: (l) => vl?.addedList2Top(l),
    getItemPosByIndex: (i) => getVL().core.getItemPosByIndex(i),
    forceUpdate: () => vl?.forceUpdate(),
    setList: (l) => vl?.setList(l),
    getLoadState: () => getVL().getLoadState(),
  };
}

// ======================== VirtList (Vue component) ========================

export const VirtList = defineComponent({
  name: 'VirtList',
  emits: {
    scroll: (e: Event) => e,
    toTop: (firstItem: unknown) => firstItem,
    toBottom: (lastItem: unknown) => lastItem,
    itemResize: (_id: string, _newSize: number) => true,
    update: (_renderList: unknown[], _state: ListState) => true,
    loadStateChange: (_loadState: LoadState) => true,
  },
  props: {
    list: { type: Array as () => any[], default: () => [] },
    itemKey: { type: [String, Number], required: true },
    itemPreSize: { type: Number },
    itemGap: { type: Number, default: 0 },
    renderControl: { type: Function, default: undefined },
    fixed: { type: Boolean, default: false },
    buffer: { type: Number, default: 0 },
    bufferTop: { type: Number, default: 0 },
    bufferBottom: { type: Number, default: 0 },
    scrollDistance: { type: Number, default: 0 },
    scrollDuration: { type: Number, default: 300 },
    smoothMaxDistance: { type: Number, default: 0 },
    horizontal: { type: Boolean, default: false },
    start: { type: Number, default: 0 },
    offset: { type: Number, default: 0 },
    loadMore: {
      type: Function as PropType<
        (direction: LoadDirection) => boolean | void | Promise<boolean | void>
      >,
      default: undefined,
    },
    hasMoreTop: { type: Boolean, default: true },
    hasMoreBottom: { type: Boolean, default: true },
    initialPosition: {
      type: String as PropType<'top' | 'bottom'>,
      default: 'top',
    },
    stickyBottom: { type: Boolean, default: false },
    stickyThreshold: { type: Number, default: 0 },
    listStyle: { type: [String, Object, Array] as PropType<StyleValue>, default: '' },
    listClass: { type: [String, Array, Object] as PropType<ClassValue>, default: '' },
    itemStyle: { type: [String, Object, Array, Function] as PropType<StyleValue | ((item: any, index: number) => StyleValue)>, default: '' },
    itemClass: { type: [String, Array, Object, Function] as PropType<ClassValue | ((item: any, index: number) => ClassValue)>, default: '' },
    headerClass: { type: [String, Array, Object] as PropType<ClassValue>, default: '' },
    headerStyle: { type: [String, Object] as PropType<StyleValue>, default: '' },
    footerClass: { type: [String, Array, Object] as PropType<ClassValue>, default: '' },
    footerStyle: { type: [String, Object] as PropType<StyleValue>, default: '' },
    stickyHeaderClass: { type: [String, Array, Object] as PropType<ClassValue>, default: '' },
    stickyHeaderStyle: { type: [String, Object] as PropType<StyleValue>, default: '' },
    stickyFooterClass: { type: [String, Array, Object] as PropType<ClassValue>, default: '' },
    stickyFooterStyle: { type: [String, Object] as PropType<StyleValue>, default: '' },
    renderItem: { type: Function as PropType<(item: any, index: number, el: HTMLElement) => HTMLElement | void>, default: undefined },
  },
  setup(props, { emit, expose, slots }) {
    const containerRef = ref<HTMLElement | null>(null);
    let vl: VirtListVanilla<any> | null = null;

    const _slotContainers = new Map<string, HTMLElement>();
    /** 将 VNode 直接渲染到目标 el 中，无额外包裹层 */
    function _mountSlot(mountKey: string, vNodes: VNode[], el: HTMLElement): void {
      const old = _slotContainers.get(mountKey);
      if (old && old !== el) vueRender(null, old);
      vueRender(h(Fragment, null, vNodes), el);
      _slotContainers.set(mountKey, el);
    }
    function _cleanupSlots() {
      _slotContainers.forEach((el) => vueRender(null, el));
      _slotContainers.clear();
    }

    function buildOptions(): VirtListDOMOptions<any> {
      const opts: VirtListDOMOptions<any> = {
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
        loadMore: props.loadMore,
        hasMoreTop: props.hasMoreTop,
        hasMoreBottom: props.hasMoreBottom,
        initialPosition: props.initialPosition,
        stickyBottom: props.stickyBottom,
        stickyThreshold: props.stickyThreshold,
        renderControl: props.renderControl as any,
        listStyle: props.listStyle,
        listClass: props.listClass,
        itemStyle: props.itemStyle as any,
        itemClass: props.itemClass as any,
        headerClass: props.headerClass,
        headerStyle: props.headerStyle,
        footerClass: props.footerClass,
        footerStyle: props.footerStyle,
        stickyHeaderClass: props.stickyHeaderClass,
        stickyHeaderStyle: props.stickyHeaderStyle,
        stickyFooterClass: props.stickyFooterClass,
        stickyFooterStyle: props.stickyFooterStyle,
        renderItem: props.renderItem ?? ((item: any, index: number, el: HTMLElement) => {
          if (slots.default) {
            _mountSlot(`item:${item[props.itemKey]}`, slots.default({ itemData: item, index }), el);
          }
        }),
      };

      // header / footer 拿到 loadState：加载提示条（"加载中" / "没有更早的消息了"）
      // 直接在插槽里按状态渲染，不必自己维护 loading 变量
      if (slots.header) {
        opts.renderHeader = (el: HTMLElement, loadState) => {
          _mountSlot('header', slots.header!({ loadState }), el);
        };
      }
      if (slots.footer) {
        opts.renderFooter = (el: HTMLElement, loadState) => {
          _mountSlot('footer', slots.footer!({ loadState }), el);
        };
      }
      if (slots.stickyHeader) {
        opts.renderStickyHeader = (el: HTMLElement) => { _mountSlot('stickyHeader', slots.stickyHeader!({}), el); };
      }
      if (slots.stickyFooter) {
        opts.renderStickyFooter = (el: HTMLElement) => { _mountSlot('stickyFooter', slots.stickyFooter!({}), el); };
      }
      if (slots.empty) {
        opts.renderEmpty = (el: HTMLElement) => { _mountSlot('empty', slots.empty!({}), el); };
      }

      return opts;
    }

    function buildEvents(): VirtListEvents<any> {
      return {
        scroll: (e) => emit('scroll', e),
        toTop: (item) => emit('toTop', item),
        toBottom: (item) => emit('toBottom', item),
        itemResize: (id, size) => emit('itemResize', id, size),
        update: (renderList, state) => emit('update', renderList, state),
        loadStateChange: (loadState) => emit('loadStateChange', loadState),
      };
    }

    onMounted(() => {
      if (!containerRef.value) return;
      vl = new VirtListVanilla(containerRef.value, buildOptions(), buildEvents());
    });

    onBeforeUnmount(() => {
      vl?.destroy();
      vl = null;
      _cleanupSlots();
    });

    // 只盯 length 会漏掉「长度不变但结构变了」的场景：双向分页一次删一页又加一页，
    // 长度前后相同，列表却整体位移了。引用变化覆盖了这一类以及整体换数据源。
    // setList 之后无需再 forceUpdate：core 已在列表变更中完成重算、位移补偿与通知
    watch([() => props.list, () => props.list.length], () => {
      vl?.setList(props.list);
    });

    // hasMore 当受控属性用时要能改回来（例如切换会话后重新开放历史加载）
    watch([() => props.hasMoreTop, () => props.hasMoreBottom], ([top, bottom]) => {
      vl?.updateOptions({ hasMoreTop: top, hasMoreBottom: bottom });
    });

    watch(() => props.loadMore, (fn) => {
      vl?.updateOptions({ loadMore: fn });
    });

    const api = {
      reactiveData: undefined as unknown as ListState,
      slotSize: undefined as unknown as SlotSize,
      sizesMap: undefined as unknown as Map<string, number>,
      resizeObserver: undefined as ResizeObserver | undefined,
      getState: () => vl!.state,
      getOffset: () => vl!.core.getOffset(),
      getSlotSize: () => vl!.core.getSlotSize(),
      reset: () => vl?.reset(),
      scrollToIndex: (index: number, options?: VirtScrollOptions) =>
        vl?.scrollToIndex(index, options),
      scrollIntoView: (index: number, options?: VirtScrollOptions) =>
        vl?.scrollIntoView(index, options),
      scrollToTop: (options?: VirtScrollOptions) => vl?.scrollToTop(options),
      scrollToBottom: (options?: VirtScrollOptions) =>
        vl?.scrollToBottom(options),
      scrollToOffset: (offset: number, options?: VirtScrollOptions) =>
        vl?.scrollToOffset(offset, options),
      cancelScroll: () => vl?.cancelScroll(),
      manualRender: (begin: number, end: number) => vl?.core.manualRender(begin, end),
      getItemSize: (itemKey: string) => vl!.core.getItemSize(itemKey),
      deleteItemSize: (itemKey: string) => vl!.core.deleteItemSize(itemKey),
      deletedList2Top: (list: any[]) => {
        vl?.setList(props.list);
        vl?.deletedList2Top(list);
      },
      addedList2Top: (list: any[]) => {
        vl?.setList(props.list);
        vl?.addedList2Top(list);
      },
      getItemPosByIndex: (index: number) => vl!.core.getItemPosByIndex(index),
      forceUpdate: () => {
        vl?.forceUpdate();
      },
      setList: (list: any[]) => vl?.setList(list),
      getLoadState: () => vl!.getLoadState(),
    };

    Object.defineProperty(api, 'reactiveData', {
      get: () => vl?.state,
      enumerable: true,
    });
    Object.defineProperty(api, 'slotSize', {
      get: () => vl?.core.slotSize,
      enumerable: true,
    });
    Object.defineProperty(api, 'sizesMap', {
      get: () => vl?.core.sizesMap,
      enumerable: true,
    });
    Object.defineProperty(api, 'resizeObserver', {
      get: () => vl?.core.resizeObserver,
      enumerable: true,
    });

    expose(api);

    return () => h('div', {
      ref: containerRef,
      style: 'width: 100%; height: 100%;',
    });
  },
});
