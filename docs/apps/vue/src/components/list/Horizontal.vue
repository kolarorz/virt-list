<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-horizontal-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="60"
        horizontal
        :buffer="2"
        @range-update="onRangeUpdate"
      >
        <template #default="{ itemData }">
          <div
            class="demo-col-item"
            :style="{ minWidth: `${itemData.width}px`, width: `${itemData.width}px` }"
          >
            <div style="font-weight: bold">{{ itemData.id }}</div>
            <div style="font-size: 11px; color: #999">w:{{ itemData.width }}</div>
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue';
import '../../demo.css';

const WIDTHS = [60, 80, 100, 110, 130];

function generateList(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    width: WIDTHS[Math.floor(Math.random() * WIDTHS.length)]!,
  }));
}

type Item = ReturnType<typeof generateList>[number];

const statsText = ref('');
const list = ref<Item[]>(generateList(1000));

statsText.value = `总数: ${list.value.length} | 水平滚动`;

function onRangeUpdate(begin: number, end: number) {
  statsText.value = `总数: ${list.value.length} | RenderBegin: ${begin} | RenderEnd: ${end}`;
}
</script>
