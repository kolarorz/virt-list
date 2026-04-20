<template>
  <div class="tree-demo">
    <div class="tree-btn-container" style="margin-bottom: 8px">
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <button type="button" class="virt-list-btn virt-list-btn-success" @click="expandAll">展开所有</button>
        <button type="button" class="virt-list-btn virt-list-btn-secondary" @click="collapseAll">折叠所有</button>
      </div>
    </div>
    <div class="virt-tree-wrapper">
      <VirtTree
        ref="treeRef"
        :list="treeData"
        :field-names="{ key: 'id' }"
        :indent="20"
        selectable
        default-expand-all
      >
        <template #stickyHeader>
          <TreeStickyHeader />
        </template>
        <template #header>
          <TreeHeader />
        </template>
        <template #footer>
          <TreeFooter />
        </template>
        <template #stickyFooter>
          <TreeStickyFooter />
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
import type { VirtTreeRef } from '../_virtRefTypes';
import TreeStickyHeader from './items/TreeStickyHeader.vue';
import TreeHeader from './items/TreeHeader.vue';
import TreeFooter from './items/TreeFooter.vue';
import TreeStickyFooter from './items/TreeStickyFooter.vue';
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

const treeRef = ref<VirtTreeRef | null>(null);
const treeData = ref(generateTreeData());

function expandAll() {
  treeRef.value?.expandAll(true);
}
function collapseAll() {
  treeRef.value?.expandAll(false);
}
</script>
