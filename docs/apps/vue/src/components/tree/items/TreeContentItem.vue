<template>
  <div>
    <span>level: {{ props.node.level }}; </span>
    <span>title: {{ props.node.data.name }}</span>
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '@virt-list/vue';

const props = defineProps<{
  node: TreeNode;
}>();
</script>
