<template>
  <div
    class="virt-tree-node"
    :style="{
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid var(--demo-c-divider)',
      boxSizing: 'border-box',
      paddingLeft: `${(props.node.level - 1) * props.indent}px`,
    }"
  >
    level: {{ props.node.level }}; -- title: {{ props.node.title ?? '' }}
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '@virt-list/vue';

// 整行被自定义节点接管后，库不再画缩进块，indent 要自己乘上层级算成 padding
const props = withDefaults(
  defineProps<{
    node: TreeNode;
    indent?: number;
  }>(),
  { indent: 20 },
);
</script>
