<template>
  <div class="tree-demo">
    <div class="virt-tree-wrapper">
      <VirtTree :list="treeData" :field-names="{ key: 'id' }" :indent="20">
        <template #icon="{ node, isExpanded }">
          <TreeIconItem :node="node" :is-expanded="isExpanded" />
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
import TreeIconItem from './items/TreeIconItem.vue';
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

const treeData = ref(generateTreeData());
</script>
