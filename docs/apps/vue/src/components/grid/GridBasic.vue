<template>
  <div class="virt-grid-demo">
    <div class="virt-grid-controls">
      <span>gridItems:</span>
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="setGridItems(2)">2</button>
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="setGridItems(3)">3</button>
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="setGridItems(4)">4</button>
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="setGridItems(5)">5</button>
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="setGridItems(6)">6</button>
    </div>
    <div class="status-text">{{ statusText }}</div>
    <div class="virt-grid-container">
      <VirtGrid
        ref="gridRef"
        :list="gridList"
        :grid-items="gridItems"
        item-key="id"
        :item-pre-size="70"
        @to-top="onToTop"
      >
        <template #default="{ itemData, index, rowIndex }">
          <GridItem
            :item="itemData"
            :index="index"
            :row-index="rowIndex"
            @delete="handleDelete(itemData, index)"
          />
        </template>
      </VirtGrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { faker } from '@faker-js/faker';
import { VirtGrid } from '@virt-list/vue';
import GridItem from './GridItem.vue';
import type { VirtGridRef } from '../_virtRefTypes';
import '../../demo.css';

function generateData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: faker.string.nanoid(),
    index: i,
    avatar: faker.image.avatar(),
    name: faker.person.firstName(),
  }));
}

type GridItem = ReturnType<typeof generateData>[number];

const gridRef = ref<VirtGridRef | null>(null);
const statusText = ref('');
const gridItems = ref(2);
const gridList = ref<GridItem[]>(generateData(1000));

function handleDelete(item: GridItem, index: number) {
  const idx = gridList.value.findIndex((v) => v.id === item.id);
  if (idx > -1) {
    gridList.value = gridList.value.filter((v) => v.id !== item.id);
    statusText.value = `已删除 item ${index}，剩余 ${gridList.value.length} 项`;
  }
}

statusText.value = '网格示例已就绪：1000 项数据，2 列';

function setGridItems(n: number) {
  gridItems.value = n;
  gridRef.value?.setGridItems(n);
  statusText.value = `gridItems 已设为 ${n}`;
}

function onToTop() {
  statusText.value = '已滚动到顶部';
}
</script>
