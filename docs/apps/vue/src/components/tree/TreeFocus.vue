<template>
  <div class="tree-demo">
    <div class="status-text" style="margin-bottom: 8px">
      focusedKeys: [{{ focusedKeys.join(', ') }}]
    </div>
    <div class="virt-tree-wrapper">
      <VirtTree
        :list="treeData"
        :field-names="{ key: 'id' }"
        :indent="20"
        selectable
        default-expand-all
        :focused-keys="focusedKeys"
      >
        <template #content="{ node }">
          <TreeFocusItem :node="node" @focus="(key) => (focusedKeys = [key])" />
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
import { VirtTree } from '@virt-list/vue';
import type { TreeNodeKey } from '@virt-list/vue';
import TreeFocusItem from './items/TreeFocusItem.vue';
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
const focusedKeys = ref<TreeNodeKey[]>([]);
</script>
