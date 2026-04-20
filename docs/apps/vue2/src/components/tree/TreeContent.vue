<template>
  <div class="tree-demo">
    <div class="virt-tree-wrapper">
      <VirtTree :list="treeData" :field-names="{ key: 'id' }" :indent="20">
        <template #content="{ node }">
          <TreeContentItem :node="node" />
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
import TreeContentItem from './items/TreeContentItem.vue';
import TreeEmpty from './items/TreeEmpty.vue';
import '../../demo.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: `Node-${i}`,
    name: `Name-${i}`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: `${i}-${j}`,
      title: `Node-${i}-${j}`,
      name: `Name-${i}-${j}`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: `${i}-${j}-${k}`,
        title: `Node-${i}-${j}-${k}`,
        name: `Name-${i}-${j}-${k}`,
      })),
    })),
  }));
}

const treeData = ref(generateTreeData());
</script>
