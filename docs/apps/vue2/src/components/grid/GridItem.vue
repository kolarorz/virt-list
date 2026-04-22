<template>
  <div class="grid-cell">
    <div>
      <div style="font-size:12px;color:#999;">
        row:{{ rowIndex }} - item:{{ index }}
      </div>
      <div style="display:flex;align-items:center;">
        <img :src="item.avatar" style="width:40px;height:40px;border-radius:50%;" />
        <span style="margin-left:6px;">{{ item.name }}</span>
      </div>
    </div>
    <button class="grid-delete-btn" @click="emit('delete')">delete</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  item: {
    id: string;
    avatar: string;
    name: string;
  };
  index: number;
  rowIndex: number;
}>();

const emit = defineEmits<{
  (e: 'delete'): void;
}>();
</script>
