<template>
  <div class="tree-demo">
    <div class="tree-btn-container" style="display: flex; flex-direction: column; gap: 8px">
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center">
        <button type="button" class="virt-list-btn virt-list-btn-success" @click="expandAll">展开所有</button>
        <button type="button" class="virt-list-btn virt-list-btn-secondary" @click="collapseAll">折叠所有</button>
        <label style="display: flex; align-items: center; gap: 6px">
          <span>节点 key</span>
          <input
            v-model="nodeKeyInput"
            class="demo-input" style="width: 100px"
          />
        </label>
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="expandNode">展开节点</button>
        <button type="button" class="virt-list-btn virt-list-btn-warning" @click="collapseNode">折叠节点</button>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center">
        <label style="display: flex; align-items: center; gap: 6px">
          <span>scroll key</span>
          <input
            v-model="scrollKeyInput"
            class="demo-input" style="width: 100px"
          />
        </label>
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="scrollToKey">scrollToKey</button>
        <button type="button" class="virt-list-btn virt-list-btn-success" @click="scrollKeyIntoView">scrollKeyIntoView</button>
        <label style="display: flex; align-items: center; gap: 6px">
          <span>offset</span>
          <input
            v-model.number="offsetInput"
            type="number"
            class="demo-input" style="width: 88px"
          />
        </label>
        <button type="button" class="virt-list-btn virt-list-btn-secondary" @click="scrollToOffset">scrollToOffset</button>
      </div>
    </div>
    <div class="virt-tree-wrapper">
      <VirtTree ref="treeRef" :list="treeData" :field-names="{ key: 'id' }" :indent="20">
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
import TreeEmpty from './items/TreeEmpty.vue';

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
const nodeKeyInput = ref('0-0');
const scrollKeyInput = ref('5');
const offsetInput = ref(200);

function expandAll() {
  treeRef.value?.expandAll(true);
}
function collapseAll() {
  treeRef.value?.expandAll(false);
}
function expandNode() {
  treeRef.value?.expandNode(nodeKeyInput.value, true);
}
function collapseNode() {
  treeRef.value?.expandNode(nodeKeyInput.value, false);
}
function scrollToKey() {
  treeRef.value?.scrollToKey(scrollKeyInput.value);
}
function scrollKeyIntoView() {
  treeRef.value?.scrollKeyIntoView(scrollKeyInput.value);
}
function scrollToOffset() {
  treeRef.value?.scrollToOffset(offsetInput.value);
}
</script>
