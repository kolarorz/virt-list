<template>
  <div class="tree-demo">
    <div class="tree-btn-container">
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="toggleLine">{{ toggleLabel }}</button>
    </div>
    <div class="virt-tree-wrapper">
      <VirtTree
        :key="lineKey"
        :list="treeData"
        :field-names="{ key: 'id' }"
        :indent="28"
        :icon-size="14"
        :show-line="showLine"
        default-expand-all
        :item-gap="4"
        fixed
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
import TreeEmpty from './items/TreeEmpty.vue';
import '../../demo.css';

function generateTreeData() {
  const data = Array.from({ length: 40 }, (_, i) => ({
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
  const first = data[0]?.children?.[0];
  if (first) {
    first.title =
      'abvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagac';
  }
  return data;
}

const showLine = ref(true);
const lineKey = ref(0);
const toggleLabel = ref('切换连接线');
const treeData = ref(generateTreeData());

function toggleLine() {
  showLine.value = !showLine.value;
  lineKey.value += 1;
  toggleLabel.value = showLine.value ? '隐藏连接线' : '显示连接线';
}
</script>
