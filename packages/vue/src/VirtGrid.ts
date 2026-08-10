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
    // 与 VirtList 同理：根元素 overflow:hidden 不会原生滚动，
    // 原生 scroll 又不冒泡，所以叫 scroll 不会拦掉任何东西
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
    itemPreSize: { type: Number, default: 50 },
    itemGap: { type: Number, default: 0 },
    fixed: { type: Boolean, default: false },
    buffer: { type: Number, default: 2 },
    scrollDuration: { type: Number, default: 300 },
    smoothMaxDistance: { type: Number, default: 0 },
    /**
     * 滚动条实现方式，见 @virt-list/core 的 VirtListOptions.scrollbar。
     *
     * 缺省值刻意留空而非写 'native'：写死会让本组件永远显式传值，
     * 从而盖掉 DEFAULT_OPTIONS 里的默认值。留空则交由下层统一兜底（结果同样是 native）。
     */
    scrollbarAutoHide: { type: Number, default: undefined },
    scrollbarMinThumbSize: { type: Number, default: undefined },
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
          itemPreSize: props.itemPreSize,
          itemGap: props.itemGap,
          fixed: props.fixed,
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
          scrollbarAutoHide: props.scrollbarAutoHide,
          scrollbarMinThumbSize: props.scrollbarMinThumbSize,
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
      scrollFromUser: (o: number) => grid?.scrollFromUser(o),
      cancelScroll: () => grid?.cancelScroll(),
      forceUpdate: () => grid?.forceUpdate(),
    };

    expose(api);

    return () => h('div', {
      ref: containerRef,
      style: 'width: 100%; height: 100%;',
    });
  },
});
