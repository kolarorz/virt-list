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
import { VirtTree as VirtTreeVanilla } from '@virt-list/vanilla';
import type {
  ListState,
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
import { createSlotMounter } from './compat';

export type { TreeNode, TreeNodeKey, TreeData, TreeFieldNames, TreeNodeData, IScrollParams, VirtTreeDOMEvents };

/**
 * Vue 2 虚拟树组件。
 *
 * 与 @virt-list/vue (Vue 3) 版本的核心区别：
 * - 不使用 Fragment 和独立 render()，slot 挂载通过 Vue 实例 $mount()
 * - 不声明 emits 选项（Vue 2 不支持）
 * - slot 内容用 div 包裹（Vue 2 不支持多根节点）
 */
export const VirtTree = defineComponent({
  name: 'VirtTree',
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

    const { mountSlot, cleanupSlots } = createSlotMounter();

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
        opts.renderContent = (node: TreeNode, el: HTMLElement) => {
          mountSlot(`content:${node.key}`, () => slots.content!({ node }), el);
        };
      }
      if (slots.icon) {
        opts.renderIcon = (node: TreeNode, isExpanded: boolean, el: HTMLElement) => {
          mountSlot(`icon:${node.key}`, () => slots.icon!({ node, isExpanded }), el);
        };
      }
      if (slots.default) {
        opts.renderNode = (node: TreeNode, isExpanded: boolean, el: HTMLElement) => {
          mountSlot(`node:${node.key}`, () => slots.default!({ node, isExpanded }), el);
        };
      }
      if (slots.empty) {
        opts.renderEmpty = (el: HTMLElement) => {
          mountSlot('empty', () => slots.empty!({}), el);
        };
      }
      if (slots.header) {
        opts.renderHeader = (el: HTMLElement) => {
          mountSlot('header', () => slots.header!({}), el);
        };
      }
      if (slots.footer) {
        opts.renderFooter = (el: HTMLElement) => {
          mountSlot('footer', () => slots.footer!({}), el);
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
      cleanupSlots();
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
