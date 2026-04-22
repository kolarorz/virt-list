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
import type { ListState, StyleValue } from '@virt-list/core';

/**
 * Vue 虚拟网格组件。
 *
 * 薄封装层：在 onMounted 时创建 VirtGrid 实例，
 * watch list 和 gridItems 变化并同步给 DOM 层。
 */
export const VirtGrid = defineComponent({
  name: 'VirtGrid',
  emits: {
    scroll: (_e: Event) => true,
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
    itemStyle: { type: [String, Object, Array] as PropType<StyleValue>, default: undefined },
    renderItem: { type: Function as PropType<(item: any, index: number, rowIndex: number, el: HTMLElement) => HTMLElement | void>, default: undefined },
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
          renderItem: props.renderItem ?? ((item, index, rowIndex, el) => {
            if (slots.default) {
              mountVNode(
                `grid:item:${String(item?.[props.itemKey] ?? index)}`,
                slots.default({ itemData: item, index, rowIndex }) as VNode[],
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
          scroll: (e) => emit('scroll', e),
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
      scrollToIndex: (i: number) => grid?.scrollToIndex(i),
      scrollIntoView: (i: number) => grid?.scrollIntoView(i),
      scrollToTop: () => grid?.scrollToTop(),
      scrollToBottom: () => grid?.scrollToBottom(),
      scrollToOffset: (o: number) => grid?.scrollToOffset(o),
      forceUpdate: () => grid?.forceUpdate(),
    };

    expose(api);

    return () => h('div', {
      ref: containerRef,
      style: 'width: 100%; height: 100%;',
    });
  },
});
