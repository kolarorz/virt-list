/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  defineComponent,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  h,
  type Ref,
  type PropType,
} from 'vue';
import { VirtList as VirtListVanilla } from '@virt-list/vanilla';
import type {
  StyleValue,
  ReactiveData,
  SlotSize,
  VirtListDOMOptions,
  VirtListEvents,
} from '@virt-list/core';
import { createSlotMounter } from './compat';

// ======================== Types ========================

export interface EmitFunction<T> {
  scroll?: (e: Event) => void;
  toTop?: (item: T) => void;
  toBottom?: (item: T) => void;
  itemResize?: (id: string, newSize: number) => void;
  rangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
  update?: (renderList: T[], state: ReactiveData) => void;
}

export interface UseVirtListReturn<T extends Record<string, any>> {
  containerRef: Ref<HTMLElement | null>;
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
  setList: (list: T[]) => void;
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
    rangeUpdate: (begin, end) => emitFunction?.rangeUpdate?.(begin, end),
    update: (list, state) => emitFunction?.update?.(list, state),
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
    getReactiveData: () => getVL().state,
    getOffset: () => getVL().core.getOffset(),
    getSlotSize: () => getVL().core.getSlotSize(),
    reset: () => vl?.reset(),
    scrollToIndex: (i) => vl?.scrollToIndex(i),
    scrollIntoView: (i) => vl?.scrollIntoView(i),
    scrollToTop: () => vl?.scrollToTop(),
    scrollToBottom: () => vl?.scrollToBottom(),
    scrollToOffset: (o) => vl?.scrollToOffset(o),
    manualRender: (b, e) => vl?.core.manualRender(b, e),
    getItemSize: (k) => getVL().core.getItemSize(k),
    deleteItemSize: (k) => getVL().core.deleteItemSize(k),
    deletedList2Top: (l) => vl?.deletedList2Top(l),
    addedList2Top: (l) => vl?.addedList2Top(l),
    getItemPosByIndex: (i) => getVL().core.getItemPosByIndex(i),
    forceUpdate: () => vl?.forceUpdate(),
    setList: (l) => vl?.setList(l),
  };
}

// ======================== VirtList (Vue 2 component) ========================

export const VirtList = defineComponent({
  name: 'VirtList',
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
    horizontal: { type: Boolean, default: false },
    fixSelection: { type: Boolean, default: false },
    start: { type: Number, default: 0 },
    offset: { type: Number, default: 0 },
    listStyle: { type: [String, Object] as PropType<StyleValue>, default: '' },
    listClass: { type: [String, Array, Object] as PropType<string>, default: '' },
    itemStyle: { type: [String, Object, Function] as PropType<StyleValue | ((item: any, index: number) => StyleValue)>, default: '' },
    itemClass: { type: [String, Array, Object, Function] as PropType<string | ((item: any, index: number) => string)>, default: '' },
    headerClass: { type: [String, Array, Object] as PropType<string>, default: '' },
    headerStyle: { type: [String, Object] as PropType<StyleValue>, default: '' },
    footerClass: { type: [String, Array, Object] as PropType<string>, default: '' },
    footerStyle: { type: [String, Object] as PropType<StyleValue>, default: '' },
    stickyHeaderClass: { type: [String, Array, Object] as PropType<string>, default: '' },
    stickyHeaderStyle: { type: [String, Object] as PropType<StyleValue>, default: '' },
    stickyFooterClass: { type: [String, Array, Object] as PropType<string>, default: '' },
    stickyFooterStyle: { type: [String, Object] as PropType<StyleValue>, default: '' },
    renderItem: { type: Function as PropType<(item: any, index: number, el: HTMLElement) => HTMLElement | void>, default: undefined },
  },
  setup(props, { emit, expose, slots }) {
    const containerRef = ref<HTMLElement | null>(null);
    let vl: VirtListVanilla<any> | null = null;

    const { mountSlot, cleanupSlots } = createSlotMounter();

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
        horizontal: props.horizontal,
        start: props.start,
        offset: props.offset,
        renderControl: props.renderControl as any,
        listStyle: props.listStyle,
        listClass: props.listClass as string,
        itemStyle: props.itemStyle as any,
        itemClass: props.itemClass as any,
        headerClass: props.headerClass as string,
        headerStyle: props.headerStyle,
        footerClass: props.footerClass as string,
        footerStyle: props.footerStyle,
        stickyHeaderClass: props.stickyHeaderClass as string,
        stickyHeaderStyle: props.stickyHeaderStyle,
        stickyFooterClass: props.stickyFooterClass as string,
        stickyFooterStyle: props.stickyFooterStyle,
        renderItem: props.renderItem ?? ((item: any, index: number, el: HTMLElement) => {
          if (slots.default) {
            mountSlot(
              `item:${item[props.itemKey]}`,
              () => slots.default!({ itemData: item, index }),
              el,
            );
          }
        }),
      };

      if (slots.header) {
        opts.renderHeader = (el: HTMLElement) => {
          mountSlot('header', () => slots.header!({}), el);
        };
      }
      if (slots.footer) {
        opts.renderFooter = (el: HTMLElement) => {
          mountSlot('footer', () => slots.footer!({}), el);
        };
      }
      if (slots.stickyHeader) {
        opts.renderStickyHeader = (el: HTMLElement) => {
          mountSlot('stickyHeader', () => slots.stickyHeader!({}), el);
        };
      }
      if (slots.stickyFooter) {
        opts.renderStickyFooter = (el: HTMLElement) => {
          mountSlot('stickyFooter', () => slots.stickyFooter!({}), el);
        };
      }
      if (slots.empty) {
        opts.renderEmpty = (el: HTMLElement) => {
          mountSlot('empty', () => slots.empty!({}), el);
        };
      }

      return opts;
    }

    function buildEvents(): VirtListEvents<any> {
      return {
        scroll: (e) => emit('scroll', e),
        toTop: (item) => emit('toTop', item),
        toBottom: (item) => emit('toBottom', item),
        itemResize: (id, size) => emit('itemResize', id, size),
        rangeUpdate: (begin, end) => emit('rangeUpdate', begin, end),
        update: (renderList, state) => emit('update', renderList, state),
      };
    }

    onMounted(() => {
      if (!containerRef.value) return;
      vl = new VirtListVanilla(containerRef.value, buildOptions(), buildEvents());
    });

    onBeforeUnmount(() => {
      vl?.destroy();
      vl = null;
      cleanupSlots();
    });

    watch(() => props.list.length, () => {
      vl?.setList(props.list);
      vl?.forceUpdate();
    });

    const api = {
      reactiveData: undefined as unknown as ReactiveData,
      slotSize: undefined as unknown as SlotSize,
      sizesMap: undefined as unknown as Map<string, number>,
      resizeObserver: undefined as ResizeObserver | undefined,
      getReactiveData: () => vl!.state,
      getOffset: () => vl!.core.getOffset(),
      getSlotSize: () => vl!.core.getSlotSize(),
      reset: () => vl?.reset(),
      scrollToIndex: (index: number) => vl?.scrollToIndex(index),
      scrollIntoView: (index: number) => vl?.scrollIntoView(index),
      scrollToTop: () => vl?.scrollToTop(),
      scrollToBottom: () => vl?.scrollToBottom(),
      scrollToOffset: (offset: number) => vl?.scrollToOffset(offset),
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
