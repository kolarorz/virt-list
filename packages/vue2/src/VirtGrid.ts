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
import { createSlotMounter } from './compat.js';

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
    /** 交叉轴（竖向列表的横向、横向列表的竖向）是否允许原生滚动，默认 true。关掉即两轴全裁切 */
    crossScroll: { type: Boolean, default: true },
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
    const { mountSlot, dropSlot, cleanupSlots } = createSlotMounter();

    /**
     * 挂载/更新一个单元格的插槽内容，同时充当 renderItem 与 updateItem
     * （见 VirtList 的同名函数）。
     *
     * **mountKey 用位置（listIndex）而不是数据 key**，与 VirtList 相反：单元格容器
     * 只是行元素的第 i 个子节点、纯按位置复用（见 vanilla VirtGrid 的 `_updateRow`），
     * 而项元素是在 itemPool 里按 key 管理的。用数据 key 会在删掉中间项后错位 ——
     * 内容要进别的容器，挂载器于是先卸掉旧容器的内容再挂当前这个，白白重建挂载点。
     */
    function mountCell(
      item: any,
      rowIndex: number,
      listIndex: number,
      el: HTMLElement,
    ): void {
      if (!slots.default) return;
      mountSlot(
        `grid:cell:${listIndex}`,
        () => slots.default!({ itemData: item, rowIndex, listIndex }),
        el,
      );
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
          scrollDuration: props.scrollDuration,
          smoothMaxDistance: props.smoothMaxDistance,
          scrollbarAutoHideDelay: props.scrollbarAutoHideDelay,
          scrollbarMinThumbSize: props.scrollbarMinThumbSize,
          keyboard: props.keyboard,
          crossScroll: props.crossScroll,
          itemGap: props.itemGap,
          fixedSize: props.fixedSize,
          buffer: props.buffer,
          itemStyle: props.itemStyle,
          renderItem: props.renderItem ?? mountCell,
          updateItem: typeof props.renderItem === 'function' ? undefined : mountCell,
          renderStickyHeader: props.renderStickyHeader,
          renderStickyFooter: props.renderStickyFooter,
          renderHeader: props.renderHeader,
          renderFooter: props.renderFooter,
          renderEmpty: props.renderEmpty,
          // 行滚出渲染窗口时回收它下面所有单元格的挂载点。见 compat 的 dropSlot
          onItemUnmounted: dropSlot,
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
      cleanupSlots();
    });

    // 与 VirtList 同理：只盯引用会漏掉「在同一个数组上原地 splice / push」——
    // Vue 的 getter 依赖是 props.list 这个引用本身，原地改动不会让它重新触发。
    // 长度进依赖后这类写法也能同步（引用变化仍覆盖整体换数据源）
    watch([() => props.list, () => props.list.length], () => {
      grid?.setList(props.list);
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
     * 滚动容器（主轴视口）。
     *
     * 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。感知滚动请用
     * `scroll` 事件——挂在这上面的原生 `scroll` 监听收不到有用信息。
     */
    Object.defineProperty(api, 'clientEl', {
      get: () => grid?.clientEl,
      enumerable: true,
    });
    /**
     * 交叉轴（竖向列表的横向）的滚动容器。那条轴归浏览器原生滚动：
     * 读写它的 `scrollLeft` 就是读写横向滚动位置，横滚也是真的原生 `scroll` 事件。
     */
    Object.defineProperty(api, 'scrollContentEl', {
      get: () => grid?.scrollContentEl,
      enumerable: true,
    });

    expose(api);

    return () => h('div', {
      ref: containerRef,
      style: 'width: 100%; height: 100%;',
    });
  },
});
