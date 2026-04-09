<template>
  <div style="max-width: 800px; margin: 0 auto; padding: 20px">
    <div
      ref="container"
      style="
        width: 400px;
        height: 600px;
        border: 1px solid #000;
        margin: 20px auto;
      "
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { VirtListDOM } from '@virt-list/dom';
import { faker } from '@faker-js/faker';

interface DemoItem {
  id: number;
  content: string;
}

const container = ref<HTMLElement | null>(null);
let virtList: VirtListDOM<DemoItem> | null = null;

const generateData = (): DemoItem[] => {
  const data: DemoItem[] = [];
  for (let i = 0; i < 100; i += 1) {
    data.push({
      id: i,
      content: faker.lorem.paragraph(),
    });
  }
  return data;
};

const initVirtList = (): void => {
  if (!container.value) return;

  if (virtList) {
    virtList.destroy();
  }

  virtList = new VirtListDOM(container.value, {
    list: generateData(),
    itemKey: 'id',
    itemPreSize: 50,
    renderItem: (item: DemoItem): HTMLElement => {
      const row = document.createElement('div');
      row.style.padding = '4px';
      row.innerHTML = `
        <div style="font-weight:bold;">Item ${item.id}</div>
        <div style="color:#666;font-size:12px;">${item.content}</div>
        <div style="color:#999;font-size:10px;">Key: ${item.id} (Pure JS)</div>
      `;
      return row;
    },
  });
};

onMounted(() => {
  initVirtList();
});

onUnmounted(() => {
  if (virtList) {
    virtList.destroy();
    virtList = null;
  }
});
</script>
