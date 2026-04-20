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

const emit = defineEmits<{
  focus: [key: TreeNodeKey];
}>();
</script>
