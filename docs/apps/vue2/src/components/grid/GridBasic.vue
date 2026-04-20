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
        :render-cell="renderCell"
        @to-top="onToTop"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { faker } from '@faker-js/faker';
import { VirtGrid } from '@virt-list/vue2';
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

function renderCell(item: GridItem, index: number, rowIndex: number) {
  const cell = document.createElement('div');
  cell.className = 'grid-cell';
  cell.innerHTML = `
        <div>
          <div style="font-size:12px;color:#999;">row:${rowIndex} - item:${index}</div>
          <div style="display:flex;align-items:center;">
            <img src="${item.avatar}" style="width:40px;height:40px;border-radius:50%;" />
            <span style="margin-left:6px;">${item.name}</span>
          </div>
        </div>
        <button class="grid-delete-btn" data-id="${item.id}">delete</button>
      `;

  const deleteBtn = cell.querySelector('.grid-delete-btn');
  deleteBtn?.addEventListener('click', () => {
    const idx = gridList.value.findIndex((v) => v.id === item.id);
    if (idx > -1) {
      gridList.value = gridList.value.filter((v) => v.id !== item.id);
      gridRef.value?.setList(gridList.value);
      statusText.value = `已删除 item ${index}，剩余 ${gridList.value.length} 项`;
    }
  });
  return cell;
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
