<template>
  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
    <span>level: {{ props.node.level }}; {{ props.node.title ?? String(props.node.key) }}</span>
    <button
      type="button"
      class="virt-list-btn virt-list-btn-secondary"
      @click.stop.prevent="emit('focus', props.node.key)"
    >
      more
    </button>
  </div>
</template>

<script setup lang="ts">
import type { TreeNode, TreeNodeKey } from '@virt-list/vue';

const props = defineProps<{
  node: TreeNode;
}>();

// 用调用签名而不是 `focus: [key]` 元组写法：后者是 Vue 3.3+ 才有的，Vue 2.7 认不出
const emit = defineEmits<{
  (e: 'focus', key: TreeNodeKey): void;
}>();
</script>
