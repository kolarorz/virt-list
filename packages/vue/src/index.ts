/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  defineComponent,
  onMounted,
  onBeforeUnmount,
  onActivated,
  shallowReactive,
  shallowRef,
  ref,
  watch,
  type ShallowReactive,
  type ShallowRef,
  type VNode,
  type SetupContext,
} from 'vue-demi';
import { VirtListCore } from '@virt-list/core';
import type {
  ReactiveData,
  SlotSize,
  VirtListOptions,
  VirtListEvents,
} from '@virt-list/core';
import { _h, _hChild, getSlot, mergeStyles } from './utils';
import { ObserverItem } from './ObserverItem';

// ======================== useVirtList (composable) ========================
// Vue Composition API 封装，将 VirtListCore 的状态映射为 Vue 响应式数据。
// update 事件中同步 renderList / reactiveData / slotSize，驱动模板重渲染。

export interface EmitFunction<T> {
  scroll?: (e: Event) => void;
  toTop?: (item: T) => void;
  toBottom?: (item: T) => void;
  itemResize?: (id: string, newSize: number) => void;
  rangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
}

export interface UseVirtListReturn<T extends Record<string, any>> {
  props: Required<VirtListOptions<T>>;
  renderList: ShallowRef<T[]>;
  clientRefEl: ReturnType<typeof ref<HTMLElement | null>>;
  listRefEl: ReturnType<typeof ref<HTMLElement | null>>;
  headerRefEl: ReturnType<typeof ref<HTMLElement | null>>;
  footerRefEl: ReturnType<typeof ref<HTMLElement | null>>;
  stickyHeaderRefEl: ReturnType<typeof ref<HTMLElement | null>>;
  stickyFooterRefEl: ReturnType<typeof ref<HTMLElement | null>>;
  reactiveData: ShallowReactive<ReactiveData>;
  slotSize: ShallowReactive<SlotSize>;
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
  userProps: ShallowReactive<VirtListOptions<T>>,
  emitFunction?: EmitFunction<T>,
): UseVirtListReturn<T> {
  const clientRefEl = ref<HTMLElement | null>(null);
  const listRefEl = ref<HTMLElement | null>(null);
  const headerRefEl = ref<HTMLElement | null>(null);
  const footerRefEl = ref<HTMLElement | null>(null);
  const stickyHeaderRefEl = ref<HTMLElement | null>(null);
  const stickyFooterRefEl = ref<HTMLElement | null>(null);

  const renderList: ShallowRef<T[]> = shallowRef([]);

  const reactiveData: ShallowReactive<ReactiveData> = shallowReactive({
    views: 0,
    offset: 0,
    listTotalSize: 0,
    virtualSize: 0,
    inViewBegin: 0,
    inViewEnd: 0,
    renderBegin: 0,
    renderEnd: 0,
    bufferTop: 0,
    bufferBottom: 0,
  });

  const slotSize: ShallowReactive<SlotSize> = shallowReactive({
    clientSize: 0,
    headerSize: 0,
    footerSize: 0,
    stickyHeaderSize: 0,
    stickyFooterSize: 0,
  });

  let core: VirtListCore<T>;

  const events: VirtListEvents<T> = {
    scroll: (e) => emitFunction?.scroll?.(e),
    toTop: (item) => emitFunction?.toTop?.(item),
    toBottom: (item) => emitFunction?.toBottom?.(item),
    itemResize: (id, size) => emitFunction?.itemResize?.(id, size),
    rangeUpdate: (begin, end) => emitFunction?.rangeUpdate?.(begin, end),
    update: (list, state) => {
      renderList.value = list;
      Object.assign(reactiveData, state);
      if (core) {
        Object.assign(slotSize, core.slotSize);
      }
    },
  };

  core = new VirtListCore<T>(userProps, events);

  renderList.value = core.renderList;
  Object.assign(reactiveData, core.state);
  Object.assign(slotSize, core.slotSize);

  // watch list length changes -> forward to core
  watch(
    () => (userProps as any).list?.length,
    () => {
      core.updateOptions({ list: (userProps as any).list });
    },
  );

  onMounted(() => {
    if (clientRefEl.value) {
      core.bindDOM(clientRefEl.value);
    }
    if (stickyHeaderRefEl.value) core.observeSlotEl(stickyHeaderRefEl.value);
    if (stickyFooterRefEl.value) core.observeSlotEl(stickyFooterRefEl.value);
    if (headerRefEl.value) core.observeSlotEl(headerRefEl.value);
    if (footerRefEl.value) core.observeSlotEl(footerRefEl.value);
  });

  onBeforeUnmount(() => {
    if (stickyHeaderRefEl.value) core.unobserveSlotEl(stickyHeaderRefEl.value);
    if (stickyFooterRefEl.value) core.unobserveSlotEl(stickyFooterRefEl.value);
    if (headerRefEl.value) core.unobserveSlotEl(headerRefEl.value);
    if (footerRefEl.value) core.unobserveSlotEl(footerRefEl.value);
    core.destroy();
  });

  onActivated(() => {
    core.resume();
  });

  return {
    props: core.props,
    renderList,
    clientRefEl,
    listRefEl,
    headerRefEl,
    footerRefEl,
    stickyHeaderRefEl,
    stickyFooterRefEl,
    reactiveData,
    slotSize,
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

// ======================== VirtList (Vue component) ========================
// Vue 虚拟列表组件，基于 useVirtList composable 实现。
// 通过插槽（default/header/footer/stickyHeader/stickyFooter/empty）渲染内容。
// 每个列表项由 ObserverItem 包裹以监听尺寸变化。

export const VirtList = defineComponent({
  name: 'VirtList',
  emits: {
    scroll: (e: Event) => e,
    toTop: (firstItem: any) => firstItem,
    toBottom: (lastItem: any) => lastItem,
    itemResize: (_id: string, _newSize: number) => true,
    rangeUpdate: (_inViewBegin: number, _inViewEnd: number) => true,
  },
  props: {
    list: { type: Array as () => any[], default: () => [] },
    itemKey: { type: [String, Number], required: true },
    itemPreSize: { type: Number, default: 20, required: true },
    itemGap: { type: Number, default: 0 },
    renderControl: { type: Function, default: undefined },
    fixed: { type: Boolean, default: false },
    buffer: { type: Number, default: 0 },
    bufferTop: { type: Number, default: 0 },
    bufferBottom: { type: Number, default: 0 },
    scrollDistance: { type: Number, default: 0 },
    horizontal: { type: Boolean, default: false },
    start: { type: Number, default: 0 },
    offset: { type: Number, default: 0 },
    listStyle: { type: [String, Array, Object], default: '' },
    listClass: { type: [String, Array, Object], default: '' },
    itemStyle: { type: [String, Array, Object, Function], default: '' },
    itemClass: { type: [String, Array, Object, Function], default: '' },
    headerClass: { type: [String, Array, Object], default: '' },
    headerStyle: { type: [String, Array, Object], default: '' },
    footerClass: { type: [String, Array, Object], default: '' },
    footerStyle: { type: [String, Array, Object], default: '' },
    stickyHeaderClass: { type: [String, Array, Object], default: '' },
    stickyHeaderStyle: { type: [String, Array, Object], default: '' },
    stickyFooterClass: { type: [String, Array, Object], default: '' },
    stickyFooterStyle: { type: [String, Array, Object], default: '' },
  },
  setup(props: any, context: SetupContext) {
    const emitFn: EmitFunction<any> = {
      scroll: (e) => context.emit('scroll', e),
      toTop: (item) => context.emit('toTop', item),
      toBottom: (item) => context.emit('toBottom', item),
      itemResize: (id, size) => context.emit('itemResize', id, size),
      rangeUpdate: (begin, end) => context.emit('rangeUpdate', begin, end),
    };
    return useVirtList(props, emitFn);
  },
  render() {
    const { renderList, reactiveData, resizeObserver } = this;
    const { itemKey, horizontal } = this.props;
    const {
      itemGap,
      listStyle,
      listClass,
      itemStyle,
      itemClass,
      headerClass,
      headerStyle,
      footerClass,
      footerStyle,
      stickyHeaderClass,
      stickyHeaderStyle,
      stickyFooterClass,
      stickyFooterStyle,
    } = this.$props as any;

    const renderStickyHeaderSlot = (): VNode | null =>
      getSlot(this, 'stickyHeader')
        ? _h(
            'div',
            {
              key: 'slot-sticky-header',
              class: stickyHeaderClass,
              style: mergeStyles(
                'position: sticky; z-index: 10;',
                horizontal ? 'left: 0' : 'top: 0;',
                stickyHeaderStyle,
              ),
              ref: 'stickyHeaderRefEl',
              attrs: { 'data-id': 'stickyHeader' },
            },
            [getSlot(this, 'stickyHeader')?.()],
          )
        : null;

    const renderStickyFooterSlot = (): VNode | null =>
      getSlot(this, 'stickyFooter')
        ? _h(
            'div',
            {
              key: 'slot-sticky-footer',
              class: stickyFooterClass,
              style: mergeStyles(
                'position: sticky; z-index: 10;',
                horizontal ? 'right: 0' : 'bottom: 0;',
                stickyFooterStyle,
              ),
              ref: 'stickyFooterRefEl',
              attrs: { 'data-id': 'stickyFooter' },
            },
            [getSlot(this, 'stickyFooter')?.()],
          )
        : null;

    const renderHeaderSlot = (): VNode | null =>
      getSlot(this, 'header')
        ? _h(
            'div',
            {
              key: 'slot-header',
              class: headerClass,
              style: headerStyle,
              ref: 'headerRefEl',
              attrs: { 'data-id': 'header' },
            },
            [getSlot(this, 'header')?.()],
          )
        : null;

    const renderFooterSlot = (): VNode | null =>
      getSlot(this, 'footer')
        ? _h(
            'div',
            {
              key: 'slot-footer',
              class: footerClass,
              style: footerStyle,
              ref: 'footerRefEl',
              attrs: { 'data-id': 'footer' },
            },
            [getSlot(this, 'footer')?.()],
          )
        : null;

    const { listTotalSize, virtualSize, renderBegin } = reactiveData;

    const renderMainList = (): VNode | null => {
      const mainList: VNode[] = [];
      for (let index = 0; index < renderList.length; index += 1) {
        const currentItem = renderList[index];
        mainList.push(
          _hChild(
            ObserverItem,
            {
              key: currentItem[itemKey],
              class:
                typeof itemClass === 'function'
                  ? itemClass(currentItem, index)
                  : itemClass,
              style: mergeStyles(
                itemGap > 0 ? `padding: ${itemGap / 2}px 0;` : '',
                typeof itemStyle === 'function'
                  ? itemStyle(currentItem, index)
                  : itemStyle,
              ),
              attrs: {
                id: currentItem[itemKey],
                resizeObserver: resizeObserver,
              },
            },
            getSlot(
              this,
              'default',
            )?.({
              itemData: currentItem,
              index: renderBegin + index,
            }),
          ),
        );
      }

      if (mainList.length === 0 && getSlot(this, 'empty')) {
        const height = this.slotSize.clientSize - this.getSlotSize();
        mainList.push(
          _h(
            'div',
            {
              key: `slot-empty-${height}`,
              style: `height: ${height}px`,
            },
            [getSlot(this, 'empty')?.()],
          ),
        );
      }

      const dynamicListStyle = horizontal
        ? `will-change: width; min-width: ${listTotalSize}px; display: flex; ${listStyle}`
        : `will-change: height; min-height: ${listTotalSize}px; ${listStyle}`;
      const virtualStyle = horizontal
        ? `width: ${virtualSize}px; will-change: width;`
        : `height: ${virtualSize}px; will-change: height;`;

      return _h(
        'div',
        {
          ref: 'listRefEl',
          class: listClass,
          style: dynamicListStyle,
        },
        [
          _h('div', { style: virtualStyle }),
          mainList,
        ],
      );
    };

    return _h(
      'div',
      {
        ref: 'clientRefEl',
        class: 'virt-list__client',
        style: 'width: 100%; height: 100%; overflow: auto;',
        attrs: { 'data-id': 'client' },
      },
      [
        renderStickyHeaderSlot(),
        renderHeaderSlot(),
        renderMainList(),
        renderFooterSlot(),
        renderStickyFooterSlot(),
      ],
    );
  },
});

export { VirtTree } from './VirtTree';
export type { TreeNode, TreeNodeKey, TreeData, TreeFieldNames, TreeNodeData, IScrollParams } from './VirtTree';
export { VirtGrid } from './VirtGrid';
