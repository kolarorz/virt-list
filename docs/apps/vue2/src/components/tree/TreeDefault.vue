<template>
  <div class="tree-demo">
    <div class="virt-tree-wrapper">
      <VirtTree
        ref="treeRef"
        :list="treeData"
        :field-names="{ key: 'id' }"
        :indent="INDENT"
        :estimated-size="40"
        fixed-size
        selectable
        default-expand-all
        @node-click="onNodeClick"
      >
        <template #default="{ node }">
          <TreeDefaultItem :node="node" :indent="INDENT" />
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
import TreeDefaultItem from './items/TreeDefaultItem.vue';
import TreeEmpty from './items/TreeEmpty.vue';

const INDENT = 20;

// demo:fold 示例数据构造：generateTreeData()
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
// /demo:fold

const treeRef = ref<VirtTreeRef | null>(null);
const treeData = ref(generateTreeData());

/**
 * 整行被自定义节点接管时，库只把点击事件抛出来，不再执行 selectable 的默认行为
 * ——默认行为挂在它自己画的 content 区上，这里那一层不存在了。选中要自己调。
 */
function onNodeClick(_data: unknown, node: TreeNode) {
  const current = treeRef.value?.getTreeNode(node.key);
  if (!current || current.disableSelect) return;
  treeRef.value?.toggleSelect(current);
}
</script>
