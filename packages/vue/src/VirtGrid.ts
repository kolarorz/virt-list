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
import { VirtGrid as VirtGridVanilla } from '@virt-list/vanilla';
import type {
  ListState,
  StyleValue,
  VirtScrollEvent,
  VirtScrollOptions,
} from '@virt-list/core';

/**
 * Vue 虚拟网格组件。
 *
 * 薄封装层：在 onMounted 时创建 VirtGrid 实例，
 * watch list 和 gridItems 变化并同步给 DOM 层。
 */
export const VirtGrid = defineComponent({
  name: 'VirtGrid',
  emits: {
    // 叫 scroll 不会拦掉任何东西，三条论据见 VirtList 的 emits.scroll 注释
    scroll: (_event: VirtScrollEvent) => true,
    offsetChange: (_offset: number) => true,
    toTop: (_item: unknown) => true,
    toBottom: (_item: unknown) => true,
    itemResize: (_id: string, _size: number) => true,
    update: (_renderList: unknown[], _state: ListState) => true,
  },
  props: {
    list: { type: Array as PropType<any[]>, required: true },
    gridItems: { type: Number, required: true },
    itemKey: { type: String, required: true },
    estimatedSize: { type: Number, default: 50 },
    itemGap: { type: Number, default: 0 },
    fixedSize: { type: Boolean, default: false },
    buffer: { type: Number, default: 2 },
    scrollDuration: { type: Number, default: 300 },
    smoothMaxDistance: { type: Number, default: 0 },
    /** 滚动条淡出延迟（ms），`0` 常驻。留空交由 DEFAULT_DOM_OPTIONS 兜底 */
    scrollbarAutoHideDelay: { type: Number, default: undefined },
    scrollbarMinThumbSize: { type: Number, default: undefined },
    /** 是否接管键盘（方向键 / PageUp-Down / Space / Home-End），默认 true。宿主已在祖先元素上处理这些键时关掉 */
    keyboard: { type: Boolean, default: true },
    itemStyle: { type: [String, Object, Array] as PropType<StyleValue>, default: undefined },
    renderItem: { type: Function as PropType<(item: any, rowIndex: number, listIndex: number, el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderStickyHeader: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderStickyFooter: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderHeader: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderFooter: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderEmpty: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
    stickyHeaderStyle: { type: [String, Object, Array] as PropType<StyleValue>, default: undefined },
  },
  setup(props, { emit, expose, slots }) {
    const containerRef = ref<HTMLElement | null>(null);
    let grid: VirtGridVanilla<any> | null = null;
    const mountContainers = new Map<string, HTMLElement>();

    function mountVNode(
      mountKey: string,
      node: VNode | VNode[],
      el: HTMLElement,
    ): void {
      const old = mountContainers.get(mountKey);
      if (old && old !== el) vueRender(null, old);
      const nodes = Array.isArray(node) ? node : [node];
      vueRender(h(Fragment, null, nodes), el);
      mountContainers.set(mountKey, el);
    }

    function cleanupVNodeMounts(): void {
      mountContainers.forEach((el) => vueRender(null, el));
      mountContainers.clear();
    }

    onMounted(() => {
      if (!containerRef.value) return;
      grid = new VirtGridVanilla(
        containerRef.value,
        {
          list: props.list,
          gridItems: props.gridItems,
          itemKey: props.itemKey,
          estimatedSize: props.estimatedSize,
          itemGap: props.itemGap,
          fixedSize: props.fixedSize,
          buffer: props.buffer,
          itemStyle: props.itemStyle,
          renderItem: props.renderItem ?? ((item, rowIndex, listIndex, el) => {
            if (slots.default) {
              mountVNode(
                `grid:item:${String(item?.[props.itemKey] ?? listIndex)}`,
                slots.default({ itemData: item, rowIndex, listIndex }) as VNode[],
                el,
              );
            }
          }),
          scrollDuration: props.scrollDuration,
          smoothMaxDistance: props.smoothMaxDistance,
          scrollbarAutoHideDelay: props.scrollbarAutoHideDelay,
          scrollbarMinThumbSize: props.scrollbarMinThumbSize,
          keyboard: props.keyboard,
          renderStickyHeader: props.renderStickyHeader,
          renderStickyFooter: props.renderStickyFooter,
          renderHeader: props.renderHeader,
          renderFooter: props.renderFooter,
          renderEmpty: props.renderEmpty,
          stickyHeaderStyle: props.stickyHeaderStyle,
        },
        {
          scroll: (e) => emit('scroll', e),
          offsetChange: (o) => emit('offsetChange', o),
          toTop: (item) => emit('toTop', item),
          toBottom: (item) => emit('toBottom', item),
          itemResize: (id, size) => emit('itemResize', id, size),
          update: (renderList, state) => emit('update', renderList, state),
        },
      );
    });

    onBeforeUnmount(() => {
      grid?.destroy();
      grid = null;
      cleanupVNodeMounts();
    });

    watch(() => props.list, (newList) => {
      grid?.setList(newList);
    });

    watch(() => props.gridItems, (n) => {
      if (n > 0) grid?.setGridItems(n);
    });

    const api = {
      setList: (list: any[]) => grid?.setList(list),
      setGridItems: (n: number) => grid?.setGridItems(n),
      scrollToIndex: (i: number, options?: VirtScrollOptions) =>
        grid?.scrollToIndex(i, options),
      scrollIntoView: (i: number, options?: VirtScrollOptions) =>
        grid?.scrollIntoView(i, options),
      scrollToTop: (options?: VirtScrollOptions) => grid?.scrollToTop(options),
      scrollToBottom: (options?: VirtScrollOptions) =>
        grid?.scrollToBottom(options),
      scrollToOffset: (o: number, options?: VirtScrollOptions) =>
        grid?.scrollToOffset(o, options),
      getOffset: () => grid?.getOffset() ?? 0,
      getMaxOffset: () => grid?.getMaxOffset() ?? 0,
      getTotalSize: () => grid?.getTotalSize() ?? 0,
      scrollFromUser: (o: number) => grid?.scrollFromUser(o),
      cancelScroll: () => grid?.cancelScroll(),
      resume: () => grid?.resume(),
      forceUpdate: () => grid?.forceUpdate(),
    };

    /**
     * 滚动容器（唯一的 scrollport）。
     *
     * 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。感知滚动请用
     * `scroll` 事件——挂在这上面的原生 `scroll` 监听收不到有用信息。
     */
    Object.defineProperty(api, 'clientEl', {
      get: () => grid?.clientEl,
      enumerable: true,
    });

    expose(api);

    return () => h('div', {
      ref: containerRef,
      style: 'width: 100%; height: 100%;',
    });
  },
});
