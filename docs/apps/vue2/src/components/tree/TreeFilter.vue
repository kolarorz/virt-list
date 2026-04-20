<template>
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div class="input-container">
        <input
          v-model="filterInput"
          style="width: 160px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px"
        />
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="applyFilter">filter</button>
      </div>
    </div>
    <div class="virt-tree-wrapper">
      <VirtTree ref="treeRef" :list="treeData" :field-names="{ key: 'id' }" :indent="20" :filter-method="filterMethod">
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

function filterMethod(query: string, node: TreeNode) {
  return node.title?.includes(query) ?? false;
}

const treeRef = ref<VirtTreeRef | null>(null);
const treeData = ref(generateTreeData());
const filterInput = ref('Node-0');

function applyFilter() {
  treeRef.value?.filter(filterInput.value);
}
</script>
