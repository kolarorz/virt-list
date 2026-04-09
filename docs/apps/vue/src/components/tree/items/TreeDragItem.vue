<template>
  <div style="display: flex; align-items: center; gap: 4px">
    <span>{{ props.node.isLeaf ? '📄' : '📁' }}</span>
    <span>{{ props.node.title ?? '' }}</span>
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '@virt-list/vue';

const props = defineProps<{
  node: TreeNode;
}>();
</script>
