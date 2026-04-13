/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  defineComponent,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  h,
  render as vueRender,
  type PropType,
  type VNode,
} from 'vue-demi';
import { VirtTree } from '@virt-list/vanilla';
import type {
  TreeNode,
  TreeNodeKey,
  TreeData,
  TreeFieldNames,
  TreeNodeData,
  IScrollParams,
  VirtTreeDOMOptions,
  VirtTreeDOMEvents,
} from '@virt-list/vanilla';
import '@virt-list/vanilla/src/tree/tree.css';

export type { TreeNode, TreeNodeKey, TreeData, TreeFieldNames, TreeNodeData, IScrollParams };

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
    expand: (_keys: TreeNodeKey[], _data: any) => true,
    'update:expandedKeys': (_keys: TreeNodeKey[]) => true,
    select: (_keys: TreeNodeKey[], _data: any) => true,
    'update:selectedKeys': (_keys: TreeNodeKey[]) => true,
    check: (_keys: TreeNodeKey[], _data: any) => true,
    'update:checkedKeys': (_keys: TreeNodeKey[]) => true,
    dragstart: (_data: any) => true,
    dragend: (_data: any) => true,
    scroll: (_e: Event) => true,
    toTop: (_item: any) => true,
    toBottom: (_item: any) => true,
    itemResize: (_id: string, _size: number) => true,
    rangeUpdate: (_begin: number, _end: number) => true,
  },
  props: {
    list: { type: Array as PropType<TreeData>, required: true },
    fieldNames: { type: Object as PropType<TreeFieldNames>, default: undefined },
    indent: { type: Number, default: 16 },
    iconSize: { type: Number, default: 16 },
    itemGap: { type: Number, default: 0 },
    buffer: { type: Number, default: 2 },
    itemPreSize: { type: Number, default: 32 },
    fixed: { type: Boolean, default: false },
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

    renderContent: { type: Function as PropType<(node: TreeNode) => HTMLElement>, default: undefined },
    renderIcon: { type: Function as PropType<(node: TreeNode, isExpanded: boolean) => HTMLElement>, default: undefined },
    renderNode: { type: Function as PropType<(node: TreeNode, isExpanded: boolean) => HTMLElement>, default: undefined },
    renderEmpty: { type: Function as PropType<() => HTMLElement>, default: undefined },
    renderStickyHeader: { type: Function as PropType<() => HTMLElement>, default: undefined },
    renderStickyFooter: { type: Function as PropType<() => HTMLElement>, default: undefined },
    renderHeader: { type: Function as PropType<() => HTMLElement>, default: undefined },
    renderFooter: { type: Function as PropType<() => HTMLElement>, default: undefined },
  },
  setup(props, { emit, expose, slots }) {
    const containerRef = ref<HTMLElement | null>(null);
    let tree: VirtTree | null = null;

    /**
     * 将 Vue slot 渲染到独立 DOM 容器中，供 VirtTree 使用。
     * 同一 mountKey 的旧容器会先被卸载，避免内存泄漏。
     */
    const _slotContainers = new Map<string, HTMLElement>();
    function _mountSlot(mountKey: string, vnodes: VNode[]): HTMLElement {
      const old = _slotContainers.get(mountKey);
      if (old) vueRender(null, old);
      const container = document.createElement('div');
      container.style.display = 'contents';
      vueRender(h('div', { style: 'display: contents' }, vnodes), container);
      _slotContainers.set(mountKey, container);
      return container;
    }
    function _cleanupSlots() {
      _slotContainers.forEach((c) => vueRender(null, c));
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
        itemPreSize: props.itemPreSize,
        fixed: props.fixed,
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
        opts.renderContent = (node: TreeNode) =>
          _mountSlot(`content:${node.key}`, slots.content!({ node }));
      }
      if (slots.icon) {
        opts.renderIcon = (node: TreeNode, isExpanded: boolean) =>
          _mountSlot(`icon:${node.key}`, slots.icon!({ node, isExpanded }));
      }
      if (slots.default) {
        opts.renderNode = (node: TreeNode, isExpanded: boolean) =>
          _mountSlot(`node:${node.key}`, slots.default!({ node, isExpanded }));
      }
      if (slots.empty) {
        opts.renderEmpty = () => _mountSlot('empty', slots.empty!({}));
      }
      if (slots.header) {
        opts.renderHeader = () => _mountSlot('header', slots.header!({}));
      }
      if (slots.footer) {
        opts.renderFooter = () => _mountSlot('footer', slots.footer!({}));
      }
      if (slots.stickyHeader) {
        opts.renderStickyHeader = () => _mountSlot('stickyHeader', slots.stickyHeader!({}));
      }
      if (slots.stickyFooter) {
        opts.renderStickyFooter = () => _mountSlot('stickyFooter', slots.stickyFooter!({}));
      }

      return opts;
    }

    function buildEvents(): VirtTreeDOMEvents {
      return {
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
        toTop: (item) => emit('toTop', item),
        toBottom: (item) => emit('toBottom', item),
        itemResize: (id, size) => emit('itemResize', id, size),
        rangeUpdate: (begin, end) => emit('rangeUpdate', begin, end),
      };
    }

    onMounted(() => {
      if (!containerRef.value) return;
      tree = new VirtTree(containerRef.value, buildOptions(), buildEvents());
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
      scrollTo: (params: IScrollParams) => tree?.scrollTo(params),
      scrollToTop: () => tree?.scrollToTop(),
      scrollToBottom: () => tree?.scrollToBottom(),
      setList: (list: TreeData) => tree?.setList(list),
      forceUpdate: () => tree?.forceUpdate(),
      getTreeNode: (key: TreeNodeKey) => tree?.getTreeNode(key),
    };

    expose(api);

    return () => h('div', {
      ref: containerRef,
      style: 'width: 100%; height: 100%;',
    });
  },
});
