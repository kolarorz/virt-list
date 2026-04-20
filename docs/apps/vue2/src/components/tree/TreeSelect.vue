<template>
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="selectAll">全选</button>
        <button type="button" class="virt-list-btn virt-list-btn-warning" @click="clearSelect">清空选择</button>
        <button type="button" class="virt-list-btn virt-list-btn-success" @click="expandAll">展开所有</button>
        <button type="button" class="virt-list-btn virt-list-btn-secondary" @click="collapseAll">折叠所有</button>
      </div>
    </div>
    <div class="status-text" style="margin: 8px 0">{{ selectedDisplay }}</div>
    <div class="virt-tree-wrapper">
      <VirtTree
        ref="treeRef"
        :list="treeData"
        :field-names="{ key: 'id' }"
        :indent="20"
        selectable
        select-multiple
        default-expand-all
        :selected-keys="[...initialSelected]"
        @select="onSelect"
      >
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
import type { TreeNodeKey } from '@virt-list/vue2';
import type { VirtTreeRef } from '../_virtRefTypes';
import TreeEmpty from './items/TreeEmpty.vue';
import '../../demo.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: `Node-${i}`,
    disableSelect: i === 1,
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

const initialSelected = ['0'] as const;

const treeRef = ref<VirtTreeRef | null>(null);
const treeData = ref(generateTreeData());
const selectedDisplay = ref('');

function updateDisplay(keys: readonly TreeNodeKey[]) {
  selectedDisplay.value = `selectedKeys: [${keys.join(', ')}]`;
}

updateDisplay([...initialSelected]);

function onSelect(keys: TreeNodeKey[]) {
  updateDisplay(keys);
}

function selectAll() {
  treeRef.value?.selectAll(true);
  updateDisplay(['(all)']);
}
function clearSelect() {
  treeRef.value?.selectAll(false);
  updateDisplay([]);
}
function expandAll() {
  treeRef.value?.expandAll(true);
}
function collapseAll() {
  treeRef.value?.expandAll(false);
}
</script>
