/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  defineComponent,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  h,
  type PropType,
} from 'vue-demi';
import { VirtGrid } from '@virt-list/vanilla';

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
    toTop: (_item: any) => true,
    toBottom: (_item: any) => true,
    itemResize: (_id: string, _size: number) => true,
    rangeUpdate: (_begin: number, _end: number) => true,
  },
  props: {
    list: { type: Array as PropType<any[]>, required: true },
    gridItems: { type: Number, required: true },
    itemKey: { type: String, required: true },
    itemPreSize: { type: Number, default: 50 },
    itemGap: { type: Number, default: 0 },
    fixed: { type: Boolean, default: false },
    buffer: { type: Number, default: 2 },
    itemStyle: { type: String, default: undefined },
    renderCell: { type: Function as PropType<(item: any, index: number, rowIndex: number) => HTMLElement>, required: true },
    renderStickyHeader: { type: Function as PropType<() => HTMLElement>, default: undefined },
    renderStickyFooter: { type: Function as PropType<() => HTMLElement>, default: undefined },
    renderHeader: { type: Function as PropType<() => HTMLElement>, default: undefined },
    renderFooter: { type: Function as PropType<() => HTMLElement>, default: undefined },
    renderEmpty: { type: Function as PropType<() => HTMLElement>, default: undefined },
    stickyHeaderStyle: { type: String, default: undefined },
  },
  setup(props, { emit, expose }) {
    const containerRef = ref<HTMLElement | null>(null);
    let grid: VirtGrid<any> | null = null;

    onMounted(() => {
      if (!containerRef.value) return;
      grid = new VirtGrid(
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
          renderCell: props.renderCell,
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
          rangeUpdate: (begin, end) => emit('rangeUpdate', begin, end),
        },
      );
    });

    onBeforeUnmount(() => {
      grid?.destroy();
      grid = null;
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
