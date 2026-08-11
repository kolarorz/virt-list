<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-horizontal-container">
      <VirtList
        :list="list"
        item-key="id"
        :estimated-size="108"
        horizontal
        @update="onUpdate"
      >
        <template #default="{ itemData }">
          <div
            class="demo-col-item"
            :style="{ minWidth: `${itemData.width}px`, width: `${itemData.width}px` }"
          >
            <div class="demo-col-card">
              <span class="demo-col-index">{{ itemData.id }}</span>
              <span class="demo-col-size">{{ itemData.width }}px</span>
            </div>
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue';

const WIDTHS = [76, 92, 108, 124, 148];

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

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}
</script>
