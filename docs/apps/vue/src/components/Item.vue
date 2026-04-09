<template>
  <div class="demo-row-item">
    <div class="demo-row-index">#{{ props.item.index }}</div>
    <div class="demo-row-text">{{ props.item.text }}</div>
  </div>
</template>

<script setup lang="ts">
interface DemoItem {
  index: number;
  text: string;
}

const props = defineProps<{
  item: DemoItem;
}>();
</script>
