<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="40"
        fixed
        @update="onUpdate"
      >
        <template #default="{ itemData }">
          <div class="demo-row-item" style="height: 40px; line-height: 40px; min-height: 40px">
            <span class="demo-row-index">#{{ itemData.index }}</span>
            <span class="demo-row-text">{{ itemData.text }}</span>
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue2';
import '../../demo.css';

function generateList(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    index: i,
    text: `固定高度行 ${i}，每行高度一致（40px）。`,
  }));
}

type Item = ReturnType<typeof generateList>[number];

const statsText = ref('');
const list = ref<Item[]>(generateList(1000));

statsText.value = `总数: ${list.value.length} | 固定高度: 40px`;

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}
</script>
