<template>
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div class="input-container">
        <label>操作指定节点：</label>
        <input v-model="nodeKeyInput" style="width: 80px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px" />
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="expandNode">展开</button>
        <button type="button" class="virt-list-btn virt-list-btn-secondary" @click="collapseNode">折叠</button>
      </div>
      <div style="display: flex; gap: 8px">
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="collapseAll">折叠所有</button>
        <button type="button" class="virt-list-btn virt-list-btn-success" @click="expandAll">展开所有</button>
      </div>
    </div>
    <div class="status-text" style="margin: 8px 0; height: 40px; overflow: auto">{{ expandedDisplay }}</div>
    <div class="virt-tree-wrapper">
      <VirtTree
        ref="treeRef"
        :list="treeData"
        :field-names="{ key: 'id' }"
        :expanded-keys="initialExpanded"
        @expand="onExpand"
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
    children: Array.from({ length: 3 }, (_, j) => ({
      id: `${i}-${j}`,
      title: `Node-${i}-${j}`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: `${i}-${j}-${k}`,
        title: `Node-${i}-${j}-${k}`,
        children:
          k % 2 !== 0
            ? []
            : Array.from({ length: 2 }, (_, l) => ({
                id: `${i}-${j}-${k}-${l}`,
                title: `Node-${i}-${j}-${k}-${l}`,
              })),
      })),
    })),
  }));
}

const initialExpanded = ['0-0'] as const;

const treeRef = ref<VirtTreeRef | null>(null);
const treeData = ref(generateTreeData());
const expandedDisplay = ref('');
const nodeKeyInput = ref('0-0');

function updateDisplay(keys: readonly TreeNodeKey[]) {
  expandedDisplay.value = `expandedKeys: [${keys.join(', ')}]`;
}

updateDisplay([...initialExpanded]);

function onExpand(keys: TreeNodeKey[]) {
  updateDisplay(keys);
}

function expandNode() {
  treeRef.value?.expandNode(nodeKeyInput.value, true);
}
function collapseNode() {
  treeRef.value?.expandNode(nodeKeyInput.value, false);
}
function collapseAll() {
  treeRef.value?.expandAll(false);
}
function expandAll() {
  treeRef.value?.expandAll(true);
}
</script>
