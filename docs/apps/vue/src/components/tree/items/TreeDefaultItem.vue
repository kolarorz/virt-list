<template>
  <div
    style="
      height: 40px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid #eee;
      box-sizing: border-box;
    "
  >
    level: {{ props.node.level }}; -- title: {{ props.node.title ?? '' }}
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '@virt-list/vue';

const props = defineProps<{
  node: TreeNode;
}>();
</script>
