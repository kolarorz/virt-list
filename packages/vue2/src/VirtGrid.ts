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
import { VirtGrid as VirtGridVanilla } from '@virt-list/vanilla';
import type { ListState, StyleValue, VirtScrollOptions } from '@virt-list/core';
import { createSlotMounter } from './compat';

/**
 * Vue 2 虚拟网格组件。
 *
 * renderItem 通过 Vue 渲染器挂载到网格单元格容器。
 *
 * 注意：Vue 2.7 内置 Composition API，可直接 import from 'vue'。
 * 若使用 Vue 2.6，需将 import 来源替换为 '@vue/composition-api'，
 * 或通过构建工具 alias 处理。
 */
export const VirtGrid = defineComponent({
  name: 'VirtGrid',
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
    const { mountSlot, cleanupSlots } = createSlotMounter();

    onMounted(() => {
      if (!containerRef.value) return;
      grid = new VirtGridVanilla(
        containerRef.value,
        {
          list: props.list,
          gridItems: props.gridItems,
          itemKey: props.itemKey,
          itemPreSize: props.itemPreSize,
          scrollDuration: props.scrollDuration,
          smoothMaxDistance: props.smoothMaxDistance,
          itemGap: props.itemGap,
          fixed: props.fixed,
          buffer: props.buffer,
          itemStyle: props.itemStyle,
          renderItem: props.renderItem ?? ((item, rowIndex, listIndex, el) => {
            if (slots.default) {
              mountSlot(
                `grid:item:${String(item?.[props.itemKey] ?? listIndex)}`,
                () => slots.default!({ itemData: item, rowIndex, listIndex }),
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
      cleanupSlots();
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
