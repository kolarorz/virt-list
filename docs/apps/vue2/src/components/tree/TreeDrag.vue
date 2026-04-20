<template>
  <div class="tree-demo">
    <div class="status-text" style="margin-bottom: 8px">{{ statusText }}</div>
    <div class="virt-tree-wrapper">
      <VirtTree
        ref="treeRef"
        :list="treeData"
        :field-names="{ key: 'id' }"
        :indent="20"
        draggable
        expand-on-click-node
        @dragstart="onDragStart"
        @dragend="onDragEnd"
      >
        <template #content="{ node }">
          <TreeDragItem :node="node" />
        </template>
        <template #empty>
          <TreeEmpty />
        </template>
      </VirtTree>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtTree } from '@virt-list/vue2';
import type { TreeNode } from '@virt-list/vue2';
import type { VirtTreeRef } from '../_virtRefTypes';
import TreeDragItem from './items/TreeDragItem.vue';
import TreeEmpty from './items/TreeEmpty.vue';
import '../../demo.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: `Node-${i}`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: `${i}-${j}`,
      title: `Node-${i}-${j}`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: `${i}-${j}-${k}`,
        title: `Node-${i}-${j}-${k}`,
      })),
    })),
  }));
}

type TreeRow = ReturnType<typeof generateTreeData>[number];

function removeNode(list: TreeRow[], node: { data: { id: string } }): boolean {
  for (let i = 0; i < list.length; i++) {
    const row = list[i]!;
    if (row.id === node.data.id) {
      list.splice(i, 1);
      return true;
    }
    if (row.children?.length && removeNode(row.children as TreeRow[], node)) {
      return true;
    }
  }
  return false;
}

function insertNode(
  list: TreeRow[],
  node: { data: TreeRow },
  prevNode: { data: { id: string } } | null,
  parentNode: { data: TreeRow } | null,
) {
  const raw = node.data;
  if (parentNode) {
    if (!parentNode.data.children) parentNode.data.children = [] as TreeRow[];
    const target = parentNode.data.children as TreeRow[];
    if (prevNode) {
      const idx = target.findIndex((n) => n.id === prevNode.data.id);
      target.splice(idx + 1, 0, raw);
    } else {
      target.unshift(raw);
    }
  } else if (prevNode) {
    const idx = list.findIndex((n) => n.id === prevNode.data.id);
    list.splice(idx + 1, 0, raw);
  } else {
    list.unshift(raw);
  }
}

const treeRef = ref<VirtTreeRef | null>(null);
const treeData = ref<TreeRow[]>(generateTreeData());
const statusText = ref('拖拽树示例已就绪（支持跨层级拖拽）');

function onDragStart(data: { sourceNode: TreeNode }) {
  statusText.value = `开始拖拽: ${data.sourceNode.title ?? data.sourceNode.data?.id}`;
}

function onDragEnd(data: unknown) {
  if (!data) {
    statusText.value = '拖拽取消';
    return;
  }
  const d = data as {
    node: { data: TreeRow; title?: string };
    prevNode: { data: TreeRow } | null;
    parentNode: { data: TreeRow } | null;
  };
  const n = d.node;
  const prev = d.prevNode;
  const parent = d.parentNode;
  removeNode(treeData.value, n);
  insertNode(treeData.value, n, prev, parent);
  treeRef.value?.setList([...treeData.value]);
  statusText.value = `拖拽完成: ${n.title ?? n.data?.id}`;
}
</script>
