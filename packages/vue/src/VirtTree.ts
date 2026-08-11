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
import { VirtTree as VirtTreeVanilla } from '@virt-list/vanilla';
import type {
  ListState,
  TreeNode,
  TreeNodeKey,
  TreeData,
  TreeFieldNames,
  TreeNodeData,
  VirtTreeScrollTarget,
  VirtTreeDOMOptions,
  VirtTreeDOMEvents,
  VirtScrollOptions,
} from '@virt-list/vanilla';

export type { TreeNode, TreeNodeKey, TreeData, TreeFieldNames, TreeNodeData, VirtTreeScrollTarget, VirtTreeDOMEvents };

/**
 * 取 DOM 层某个事件的参数元组。
 *
 * emits 的载荷类型直接从 `VirtTreeDOMEvents` 派生，而不是在这里重写一遍：
 * 组件只是把 DOM 层的回调原样转发出去，两份声明一旦手抄就会漂移
 * （之前 dragstart/dragend 的载荷写成 unknown，模板里就没法给处理函数标类型了）。
 */
type TreeEventArgs<K extends keyof VirtTreeDOMEvents> = Parameters<
  NonNullable<VirtTreeDOMEvents[K]>
>;

/**
 * Vue 虚拟树组件。
 *
 * 薄封装层：在 onMounted 时创建 VirtTree 实例，通过 watch 监听 prop 变化
 * 并调用 setList / updateOptions 同步给 DOM 层。
 *
 * 支持通过 slot 使用 Vue 模板语法自定义渲染（优先级高于 render* props）:
 *   #content="{ node }"          — 自定义节点内容区
 *   #icon="{ node, isExpanded }" — 自定义展开图标
 *   #default="{ node, isExpanded }" — 自定义整行节点
 *   #empty                       — 空状态
 *   #header / #footer            — 列表头尾
 *   #stickyHeader / #stickyFooter — 固定悬浮头尾
 */
export const VirtTree = defineComponent({
  name: 'VirtTree',
  emits: {
    /**
     * 点击节点。取名 nodeClick（模板里 `@node-click`）而不是 click：
     * 若声明 emits.click，落到根元素的原生点击就会被拦截成自定义事件。
     */
    nodeClick: (..._args: TreeEventArgs<'click'>) => true,
    expand: (..._args: TreeEventArgs<'expand'>) => true,
    'update:expandedKeys': (_keys: TreeNodeKey[]) => true,
    select: (..._args: TreeEventArgs<'select'>) => true,
    'update:selectedKeys': (_keys: TreeNodeKey[]) => true,
    check: (..._args: TreeEventArgs<'check'>) => true,
    'update:checkedKeys': (_keys: TreeNodeKey[]) => true,
    dragstart: (..._args: TreeEventArgs<'dragstart'>) => true,
    dragend: (..._args: TreeEventArgs<'dragend'>) => true,
    // 叫 scroll 不会拦掉任何东西，三条论据见 VirtList 的 emits.scroll 注释
    scroll: (..._args: TreeEventArgs<'scroll'>) => true,
    offsetChange: (_offset: number) => true,
    toTop: (..._args: TreeEventArgs<'toTop'>) => true,
    toBottom: (..._args: TreeEventArgs<'toBottom'>) => true,
    itemResize: (_id: string, _size: number) => true,
    update: (_renderList: TreeNode[], _state: ListState) => true,
  },
  props: {
    list: { type: Array as PropType<TreeData>, required: true },
    fieldNames: { type: Object as PropType<TreeFieldNames>, default: undefined },
    indent: { type: Number, default: 16 },
    iconSize: { type: Number, default: 16 },
    itemGap: { type: Number, default: 0 },
    buffer: { type: Number, default: 2 },
    estimatedSize: { type: Number, default: 32 },
    fixedSize: { type: Boolean, default: false },
    scrollDuration: { type: Number, default: 300 },
    smoothMaxDistance: { type: Number, default: 0 },
    /** 滚动条淡出延迟（ms），`0` 常驻。留空交由 DEFAULT_DOM_OPTIONS 兜底 */
    scrollbarAutoHideDelay: { type: Number, default: undefined },
    scrollbarMinThumbSize: { type: Number, default: undefined },
    /** 是否接管键盘（方向键 / PageUp-Down / Space / Home-End），默认 true。宿主已在祖先元素上处理这些键时关掉 */
    keyboard: { type: Boolean, default: true },
    showLine: { type: Boolean, default: false },
    itemClass: { type: String, default: undefined },
    listClass: { type: String, default: undefined },
    customGroup: { type: String, default: undefined },

    defaultExpandAll: { type: Boolean, default: false },
    expandedKeys: { type: Array as PropType<TreeNodeKey[]>, default: undefined },
    expandOnClickNode: { type: Boolean, default: false },

    selectable: { type: Boolean, default: false },
    selectMultiple: { type: Boolean, default: false },
    selectedKeys: { type: Array as PropType<TreeNodeKey[]>, default: undefined },

    checkable: { type: Boolean, default: false },
    checkedKeys: { type: Array as PropType<TreeNodeKey[]>, default: undefined },
    checkedStrictly: { type: Boolean, default: false },
    checkOnClickNode: { type: Boolean, default: false },

    focusedKeys: { type: Array as PropType<TreeNodeKey[]>, default: undefined },

    draggable: { type: Boolean, default: false },
    dragClass: { type: String, default: undefined },
    dragGhostClass: { type: String, default: undefined },
    crossLevelDraggable: { type: Boolean, default: true },

    filterMethod: { type: Function as PropType<(query: string, node: TreeNode) => boolean>, default: undefined },

    renderContent: { type: Function as PropType<(node: TreeNode, el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderIcon: { type: Function as PropType<(node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderNode: { type: Function as PropType<(node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderEmpty: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderStickyHeader: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderStickyFooter: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderHeader: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
    renderFooter: { type: Function as PropType<(el: HTMLElement) => HTMLElement | void>, default: undefined },
  },
  setup(props, { emit, expose, slots }) {
    const containerRef = ref<HTMLElement | null>(null);
    let tree: VirtTreeVanilla | null = null;

    const _slotContainers = new Map<string, HTMLElement>();
    /** 将 VNode 直接渲染到目标 el 中，无额外包裹层 */
    function _mountSlot(mountKey: string, vnodes: VNode[], el: HTMLElement): void {
      const old = _slotContainers.get(mountKey);
      if (old && old !== el) vueRender(null, old);
      vueRender(h(Fragment, null, vnodes), el);
      _slotContainers.set(mountKey, el);
    }
    function _cleanupSlots() {
      _slotContainers.forEach((el) => vueRender(null, el));
      _slotContainers.clear();
    }

    function buildOptions(): VirtTreeDOMOptions {
      const opts: VirtTreeDOMOptions = {
        list: props.list,
        fieldNames: props.fieldNames,
        indent: props.indent,
        iconSize: props.iconSize,
        itemGap: props.itemGap,
        buffer: props.buffer,
        estimatedSize: props.estimatedSize,
        fixedSize: props.fixedSize,
        scrollDuration: props.scrollDuration,
        smoothMaxDistance: props.smoothMaxDistance,
        scrollbarAutoHideDelay: props.scrollbarAutoHideDelay,
        scrollbarMinThumbSize: props.scrollbarMinThumbSize,
        keyboard: props.keyboard,
        showLine: props.showLine,
        itemClass: props.itemClass,
        listClass: props.listClass,
        customGroup: props.customGroup,
        defaultExpandAll: props.defaultExpandAll,
        expandedKeys: props.expandedKeys,
        expandOnClickNode: props.expandOnClickNode,
        selectable: props.selectable,
        selectMultiple: props.selectMultiple,
        selectedKeys: props.selectedKeys,
        checkable: props.checkable,
        checkedKeys: props.checkedKeys,
        checkedStrictly: props.checkedStrictly,
        checkOnClickNode: props.checkOnClickNode,
        focusedKeys: props.focusedKeys,
        draggable: props.draggable,
        dragClass: props.dragClass,
        dragGhostClass: props.dragGhostClass,
        crossLevelDraggable: props.crossLevelDraggable,
        filterMethod: props.filterMethod as any,
        renderContent: props.renderContent as any,
        renderIcon: props.renderIcon as any,
        renderNode: props.renderNode as any,
        renderEmpty: props.renderEmpty as any,
        renderStickyHeader: props.renderStickyHeader as any,
        renderStickyFooter: props.renderStickyFooter as any,
        renderHeader: props.renderHeader as any,
        renderFooter: props.renderFooter as any,
      };

      if (slots.content) {
        opts.renderContent = (node: TreeNode, el: HTMLElement) => {
          _mountSlot(`content:${node.key}`, slots.content!({ node }), el);
        };
      }
      if (slots.icon) {
        opts.renderIcon = (node: TreeNode, isExpanded: boolean, el: HTMLElement) => {
          _mountSlot(`icon:${node.key}`, slots.icon!({ node, isExpanded }), el);
        };
      }
      if (slots.default) {
        opts.renderNode = (node: TreeNode, isExpanded: boolean, el: HTMLElement) => {
          _mountSlot(`node:${node.key}`, slots.default!({ node, isExpanded }), el);
        };
      }
      if (slots.empty) {
        opts.renderEmpty = (el: HTMLElement) => { _mountSlot('empty', slots.empty!({}), el); };
      }
      if (slots.header) {
        opts.renderHeader = (el: HTMLElement) => { _mountSlot('header', slots.header!({}), el); };
      }
      if (slots.footer) {
        opts.renderFooter = (el: HTMLElement) => { _mountSlot('footer', slots.footer!({}), el); };
      }
      if (slots.stickyHeader) {
        opts.renderStickyHeader = (el: HTMLElement) => { _mountSlot('stickyHeader', slots.stickyHeader!({}), el); };
      }
      if (slots.stickyFooter) {
        opts.renderStickyFooter = (el: HTMLElement) => { _mountSlot('stickyFooter', slots.stickyFooter!({}), el); };
      }

      return opts;
    }

    function buildEvents(): VirtTreeDOMEvents {
      return {
        click: (data, node, e) => emit('nodeClick', data, node, e),
        expand: (keys, data) => {
          emit('expand', keys, data);
          emit('update:expandedKeys', keys);
        },
        select: (keys, data) => {
          emit('select', keys, data);
          emit('update:selectedKeys', keys);
        },
        check: (keys, data) => {
          emit('check', keys, data);
          emit('update:checkedKeys', keys);
        },
        dragstart: (data) => emit('dragstart', data),
        dragend: (data) => emit('dragend', data),
        scroll: (e) => emit('scroll', e),
        offsetChange: (o) => emit('offsetChange', o),
        toTop: (item) => emit('toTop', item),
        toBottom: (item) => emit('toBottom', item),
        itemResize: (id, size) => emit('itemResize', id, size),
        update: (renderList, state) => emit('update', renderList, state),
      };
    }

    onMounted(() => {
      if (!containerRef.value) return;
      tree = new VirtTreeVanilla(containerRef.value, buildOptions(), buildEvents());
    });

    onBeforeUnmount(() => {
      tree?.destroy();
      tree = null;
      _cleanupSlots();
    });

    watch(() => props.list, (newList) => {
      tree?.setList(newList);
    });

    watch(() => props.expandedKeys, (keys) => {
      if (keys !== undefined) tree?.updateOptions({ expandedKeys: keys });
    });

    watch(() => props.selectedKeys, (keys) => {
      if (keys !== undefined) tree?.updateOptions({ selectedKeys: keys });
    });

    watch(() => props.checkedKeys, (keys) => {
      if (keys !== undefined) tree?.updateOptions({ checkedKeys: keys });
    });

    watch(() => props.focusedKeys, (keys) => {
      if (keys !== undefined) tree?.updateOptions({ focusedKeys: keys });
    });

    const api = {
      expandAll: (expanded: boolean) => tree?.expandAll(expanded),
      expandNode: (key: TreeNodeKey | TreeNodeKey[], expanded: boolean) => tree?.expandNode(key, expanded),
      toggleExpand: (node: TreeNode) => tree?.toggleExpand(node),
      setExpandedKeys: (keys: TreeNodeKey[]) => tree?.setExpandedKeys(keys),
      selectAll: (selected: boolean) => tree?.selectAll(selected),
      selectNode: (key: TreeNodeKey | TreeNodeKey[], selected: boolean) => tree?.selectNode(key, selected),
      toggleSelect: (node: TreeNode) => tree?.toggleSelect(node),
      checkAll: (checked: boolean) => tree?.checkAll(checked),
      checkNode: (key: TreeNodeKey | TreeNodeKey[], checked: boolean) => tree?.checkNode(key, checked),
      toggleCheckbox: (node: TreeNode) => tree?.toggleCheckbox(node),
      getCheckedKeys: (leafOnly?: boolean) => tree?.getCheckedKeys(leafOnly) ?? [],
      getHalfCheckedKeys: () => tree?.getHalfCheckedKeys() ?? [],
      setFocusedKeys: (keys: TreeNodeKey[]) => tree?.setFocusedKeys(keys),
      filter: (query: string) => tree?.filter(query),
      scrollTo: (params: VirtTreeScrollTarget) => tree?.scrollTo(params),
      scrollToKey: (key: TreeNodeKey, options?: VirtScrollOptions) => tree?.scrollToKey(key, options),
      scrollKeyIntoView: (key: TreeNodeKey, options?: VirtScrollOptions) => tree?.scrollKeyIntoView(key, options),
      scrollToOffset: (offset: number, options?: VirtScrollOptions) => tree?.scrollToOffset(offset, options),
      scrollToTop: (options?: VirtScrollOptions) => tree?.scrollToTop(options),
      scrollToBottom: (options?: VirtScrollOptions) =>
        tree?.scrollToBottom(options),
      getOffset: () => tree?.getOffset() ?? 0,
      getMaxOffset: () => tree?.getMaxOffset() ?? 0,
      getTotalSize: () => tree?.getTotalSize() ?? 0,
      scrollFromUser: (o: number) => tree?.scrollFromUser(o),
      cancelScroll: () => tree?.cancelScroll(),
      resume: () => tree?.resume(),
      setList: (list: TreeData) => tree?.setList(list),
      forceUpdate: () => tree?.forceUpdate(),
      getTreeNode: (key: TreeNodeKey) => tree?.getTreeNode(key),
    };

    /**
     * 滚动容器（唯一的 scrollport）。
     *
     * 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。感知滚动请用
     * `scroll` 事件——挂在这上面的原生 `scroll` 监听收不到有用信息。
     */
    Object.defineProperty(api, 'clientEl', {
      get: () => tree?.clientEl,
      enumerable: true,
    });

    expose(api);

    return () => h('div', {
      ref: containerRef,
      style: 'width: 100%; height: 100%;',
    });
  },
});
