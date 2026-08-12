/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  defineComponent,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  h,
  type PropType,
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
  VirtScrollEvent,
  VirtScrollOptions,
} from '@virt-list/core';
import { createSlotMounter } from './compat.js';

// ======================== Types ========================

export interface EmitFunction<T> {
  /** 滚动了。容器 overflow:hidden，没有原生 scroll 事件，这是它的替代品 */
  scroll?: (event: VirtScrollEvent) => void;
  /** 滚动偏移量变化。要跟着偏移量重写 DOM 时用它，只想感知滚动用 scroll */
  offsetChange?: (offset: number) => void;
  toTop?: (item: T) => void;
  toBottom?: (item: T) => void;
  itemResize?: (id: string, newSize: number) => void;
  update?: (renderList: T[], state: ListState) => void;
  loadStateChange?: (loadState: LoadState) => void;
}

export interface UseVirtListReturn<T extends Record<string, any>> {
  containerRef: ReturnType<typeof ref<HTMLElement | null>>;
  state: ListState;
  slotSize: SlotSize;
  sizesMap: Map<string, number>;
  resizeObserver: ResizeObserver | undefined;
  getState: () => ListState;
  getOffset: () => number;
  /** 当前允许的最大偏移量，即 `getTotalSize() - clientSize`（不为负） */
  getMaxOffset: () => number;
  /** 内容总尺寸（列表项 + 各插槽），对应原生语境的 `scrollHeight` */
  getTotalSize: () => number;
  /** 给定偏移量落在第几项，是 `getItemPosByIndex(index).top` 的逆运算 */
  getIndexByOffset: (offset: number) => number;
  /** 上报一次用户发起的滚动（会触发 toTop / toBottom 与自动续拉） */
  scrollFromUser: (offset: number) => void;
  getSlotsTotalSize: () => number;
  reset: () => void;
  scrollToIndex: (index: number, options?: VirtScrollOptions) => void;
  scrollIntoView: (index: number, options?: VirtScrollOptions) => void;
  scrollToTop: (options?: VirtScrollOptions) => void;
  scrollToBottom: (options?: VirtScrollOptions) => void;
  scrollToOffset: (offset: number, options?: VirtScrollOptions) => void;
  cancelScroll: () => void;
  /** 容器被隐藏/重新挂载后（keep-alive）把内容重新摆到当前偏移量上 */
  resume: () => void;
  manualRender: (begin: number, end: number) => void;
  getItemSize: (itemKey: string) => number;
  deleteItemSize: (itemKey: string) => void;
  getItemPosByIndex: (
    index: number,
  ) => { top: number; current: number; bottom: number };
  /**
   * 重建指定的项（不传则重建全部可见项，等价于 forceUpdate）。
   *
   * 通常不需要：数据变更（`list` 换新）已经会自动把最新数据交给可见项。
   * 它是给「既不换数组引用、也不改长度、又不在框架响应式里」那种原地修改用的
   * 出口 —— 例如 Vue 里用 shallowRef 存列表后直接改某一项的字段。
   *
   * 与 forceUpdate 的差别是范围：这个只动指定的几项，其余项的 DOM 原样保留。
   */
  refreshItems: (keys?: Array<string | number>) => void;
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
    offsetChange: (offset) => emitFunction?.offsetChange?.(offset),
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
    get state() { return getVL().state; },
    get slotSize() { return getVL().core.slotSize; },
    get sizesMap() { return getVL().core.sizesMap; },
    get resizeObserver() { return getVL().core.resizeObserver; },
    getState: () => getVL().state,
    getOffset: () => getVL().core.getOffset(),
    getMaxOffset: () => getVL().core.getMaxOffset(),
    getTotalSize: () => getVL().core.getTotalSize(),
    getIndexByOffset: (offset: number) => getVL().core.getIndexByOffset(offset),
    scrollFromUser: (o: number) => getVL().core.scrollFromUser(o),
    getSlotsTotalSize: () => getVL().core.getSlotsTotalSize(),
    reset: () => vl?.reset(),
    scrollToIndex: (i, opts) => vl?.scrollToIndex(i, opts),
    scrollIntoView: (i, opts) => vl?.scrollIntoView(i, opts),
    scrollToTop: (opts) => vl?.scrollToTop(opts),
    scrollToBottom: (opts) => vl?.scrollToBottom(opts),
    scrollToOffset: (o, opts) => vl?.scrollToOffset(o, opts),
    cancelScroll: () => vl?.cancelScroll(),
    resume: () => vl?.resume(),
    manualRender: (b, e) => vl?.core.manualRender(b, e),
    getItemSize: (k) => getVL().core.getItemSize(k),
    deleteItemSize: (k) => getVL().core.deleteItemSize(k),
    getItemPosByIndex: (i) => getVL().core.getItemPosByIndex(i),
    refreshItems: (keys?: Array<string | number>) => vl?.refreshItems(keys),
    forceUpdate: () => vl?.forceUpdate(),
    setList: (l) => vl?.setList(l),
    getLoadState: () => getVL().getLoadState(),
  };
}

// ======================== VirtList (Vue component) ========================

export const VirtList = defineComponent({
  name: 'VirtList',
  emits: {
    /**
     * 滚动。这里可以放心叫 scroll——与 nodeClick 那个坑不同。
     *
     * 声明 emits.scroll 确实会拦掉「落到根元素的原生 scroll」，但那个事件不存在：
     * 1. 根元素是没有 overflow 的 wrapper（见下面 render），`overflow: visible`
     *    的元素不构成 scrollport，永远不派发 scroll；
     * 2. 主轴的 scrollport 是 clientEl（`overflow: hidden` 仍是 scrollport，
     *    focus / scrollIntoView 会让浏览器静默改它的 scrollTop），而它是根元素的
     *    子节点，原生 scroll **不冒泡**，到不了根元素；
     * 3. 就算能到，那个事件也早被库自己消费了——InputController._onNativeScroll
     *    把 drift 读出来归零并折算进虚拟偏移量，回调里 scrollTop 恒为 0。
     *    正是当初把 scroll 事件移除的原因。
     *
     * 第 1 条是实现细节，由 __tests__/ScrollEvent.test.ts 锁住。
     */
    scroll: (_event: VirtScrollEvent) => true,
    offsetChange: (_offset: number) => true,
    // 载荷是列表项，而 list prop 就是 any[]——写 unknown 会让 (item: MyItem) => void
    // 这样的处理函数无法赋值给事件（函数参数逆变）
    toTop: (_firstItem: any) => true,
    toBottom: (_lastItem: any) => true,
    itemResize: (_id: string, _newSize: number) => true,
    update: (_renderList: any[], _state: ListState) => true,
    loadStateChange: (_loadState: LoadState) => true,
  },
  props: {
    list: { type: Array as () => any[], default: () => [] },
    itemKey: { type: [String, Number], required: true },
    estimatedSize: { type: Number },
    itemGap: { type: Number, default: 0 },
    renderControl: { type: Function, default: undefined },
    /** 每项对应的纯文本，给出即开启跨虚拟化的选区复制 */
    copyText: { type: Function, default: undefined },
    /** 复制时各项之间的分隔符，默认换行 */
    copySeparator: { type: String, default: undefined },
    fixedSize: { type: Boolean, default: false },
    buffer: { type: Number, default: 0 },
    bufferTop: { type: Number, default: 0 },
    bufferBottom: { type: Number, default: 0 },
    edgeThreshold: { type: Number, default: 0 },
    scrollDuration: { type: Number, default: 300 },
    smoothMaxDistance: { type: Number, default: 0 },
    horizontal: { type: Boolean, default: false },
    initialIndex: { type: Number, default: 0 },
    initialOffset: { type: Number, default: 0 },
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
    scrollbarAutoHideDelay: { type: Number, default: undefined },
    scrollbarMinThumbSize: { type: Number, default: undefined },
    /** 是否接管键盘（方向键 / PageUp-Down / Space / Home-End），默认 true。宿主已在祖先元素上处理这些键时关掉 */
    keyboard: { type: Boolean, default: true },
    /** 交叉轴（竖向列表的横向、横向列表的竖向）是否允许原生滚动，默认 true。关掉即两轴全裁切 */
    crossScroll: { type: Boolean, default: true },
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

    const { mountSlot, cleanupSlots } = createSlotMounter();

    /**
     * 挂载/更新一项的插槽内容。
     *
     * 同时充当 `renderItem` 与 `updateItem`：`mountSlot` 按 mountKey 幂等，
     * 重复调用只是给 SlotRenderer 换一个新的 slotFn，于是插槽用最新的
     * itemData / index 重渲染一次，DOM 容器本身照旧复用。
     *
     * 为什么 `updateItem` 是必需的：Vue 的依赖收集只能覆盖「原地改响应式属性」
     * （`item.text += 'x'`）。不可变替换（`list = list.map(...)`）给同一个 key
     * 换了新对象，而闭包里捕获的还是挂载那一刻的旧对象 —— 那个对象再也不会变，
     * 于是任何 render effect 都不会重跑。
     */
    function mountItem(item: any, index: number, el: HTMLElement): void {
      if (!slots.default) return;
      mountSlot(
        `item:${item[props.itemKey]}`,
        () => slots.default!({ itemData: item, index }),
        el,
      );
    }

    function buildOptions(): VirtListDOMOptions<any> {
      const opts: VirtListDOMOptions<any> = {
        list: props.list,
        itemKey: String(props.itemKey),
        estimatedSize: props.estimatedSize!,
        itemGap: props.itemGap,
        fixedSize: props.fixedSize,
        buffer: props.buffer,
        bufferTop: props.bufferTop,
        bufferBottom: props.bufferBottom,
        edgeThreshold: props.edgeThreshold,
        scrollDuration: props.scrollDuration,
        smoothMaxDistance: props.smoothMaxDistance,
        horizontal: props.horizontal,
        initialIndex: props.initialIndex,
        initialOffset: props.initialOffset,
        loadMore: props.loadMore,
        hasMoreTop: props.hasMoreTop,
        hasMoreBottom: props.hasMoreBottom,
        initialPosition: props.initialPosition,
        stickyBottom: props.stickyBottom,
        stickyThreshold: props.stickyThreshold,
        scrollbarAutoHideDelay: props.scrollbarAutoHideDelay,
        scrollbarMinThumbSize: props.scrollbarMinThumbSize,
        keyboard: props.keyboard,
        crossScroll: props.crossScroll,
        renderControl: props.renderControl as any,
        copyText: props.copyText as any,
        copySeparator: props.copySeparator,
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
        renderItem: props.renderItem ?? mountItem,
        // 插槽路径才注入：用户自己接管 renderItem 时，怎么更新也由他决定
        // （原地更新的语义只有他知道，我们无脑重跑他的 renderItem 会重复追加节点）
        updateItem: typeof props.renderItem === 'function' ? undefined : mountItem,
      };

      // header / footer 拿到 loadState：加载提示条（"加载中" / "没有更早的消息了"）
      // 直接在插槽里按状态渲染，不必自己维护 loading 变量
      if (slots.header) {
        opts.renderHeader = (el: HTMLElement, loadState) => {
          mountSlot('header', () => slots.header!({ loadState }), el);
        };
      }
      if (slots.footer) {
        opts.renderFooter = (el: HTMLElement, loadState) => {
          mountSlot('footer', () => slots.footer!({ loadState }), el);
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
        offsetChange: (o) => emit('offsetChange', o),
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
      cleanupSlots();
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
      clientEl: undefined as unknown as HTMLElement,
      scrollContentEl: undefined as unknown as HTMLElement,
      state: undefined as unknown as ListState,
      slotSize: undefined as unknown as SlotSize,
      sizesMap: undefined as unknown as Map<string, number>,
      resizeObserver: undefined as ResizeObserver | undefined,
      getState: () => vl!.state,
      getOffset: () => vl!.core.getOffset(),
      getMaxOffset: () => vl!.core.getMaxOffset(),
      getTotalSize: () => vl!.core.getTotalSize(),
      getIndexByOffset: (offset: number) => vl!.core.getIndexByOffset(offset),
      scrollFromUser: (o: number) => vl?.core.scrollFromUser(o),
      getSlotsTotalSize: () => vl!.core.getSlotsTotalSize(),
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
      resume: () => vl?.resume(),
      manualRender: (begin: number, end: number) => vl?.core.manualRender(begin, end),
      getItemSize: (itemKey: string) => vl!.core.getItemSize(itemKey),
      deleteItemSize: (itemKey: string) => vl!.core.deleteItemSize(itemKey),
      getItemPosByIndex: (index: number) => vl!.core.getItemPosByIndex(index),
      refreshItems: (keys?: Array<string | number>) => vl?.refreshItems(keys),
      forceUpdate: () => {
        vl?.forceUpdate();
      },
      setList: (list: any[]) => vl?.setList(list),
      getLoadState: () => vl!.getLoadState(),
    };

    /**
     * 滚动容器（主轴视口）。
     *
     * 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。感知滚动请用
     * `scroll` 事件——挂在这上面的原生 `scroll` 监听收不到有用信息。
     */
    Object.defineProperty(api, 'clientEl', {
      get: () => vl?.clientEl,
      enumerable: true,
    });
    /**
     * 交叉轴（竖向列表的横向）的滚动容器。那条轴归浏览器原生滚动：
     * 读写它的 `scrollLeft` 就是读写横向滚动位置，横滚也是真的原生 `scroll` 事件。
     */
    Object.defineProperty(api, 'scrollContentEl', {
      get: () => vl?.scrollContentEl,
      enumerable: true,
    });
    Object.defineProperty(api, 'state', {
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
