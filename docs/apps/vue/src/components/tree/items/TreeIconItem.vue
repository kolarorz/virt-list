<template>
  <div
    v-if="!props.node.isLeaf"
    style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      color: #333;
      transition: transform 0.15s ease;
    "
    :style="{ transform: props.isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }"
  >
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      stroke-width="4"
      stroke-linecap="butt"
      stroke-linejoin="miter"
      width="14"
      height="14"
    >
      <path d="M39.6 17.443 24.043 33 8.487 17.443"></path>
    </svg>
  </div>
  <div v-else style="width: 16px; height: 16px"></div>
</template>

<script setup lang="ts">
import type { TreeNode } from '@virt-list/vue';

const props = defineProps<{
  node: TreeNode;
  isExpanded: boolean;
}>();
</script>
