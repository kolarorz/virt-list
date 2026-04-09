<template>
  <div style="max-width: 800px; margin: 0 auto; padding: 20px">
    <div
      style="
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 20px;
      "
    >
      <button @click="scrollToTop">滚动到顶部</button>
      <button @click="scrollToBottom">滚动到底部</button>
      <button @click="scrollToIndex(500)">滚动到第500项</button>
      <button @click="scrollToIndex(Math.floor(Math.random() * 1000))">
        随机滚动
      </button>
    </div>

    <div
      style="
        width: 400px;
        height: 600px;
        border: 1px solid #000;
        margin: 0 auto;
      "
    >
      <VirtList
        ref="virtListRef"
        :list="list"
        item-key="id"
        :min-size="50"
        :buffer="4"
        @toTop="onToTop"
        @toBottom="onToBottom"
      >
        <template #default="{ itemData, index }">
          <div style="padding: 4px">
            <div style="font-weight: bold">Item {{ itemData.id }}</div>
            <div style="color: #666; font-size: 12px">
              {{ itemData.content }}
            </div>
            <div style="color: #999; font-size: 10px">
              Index: {{ index }} (@virt-list/vue VirtList)
            </div>
          </div>
        </template>
        <template #stickyHeader>
          <div
            style="
              background: cyan;
              padding: 10px;
              text-align: center;
              font-weight: bold;
            "
          >
            Sticky Header
          </div>
        </template>
        <template #stickyFooter>
          <div
            style="
              background: cyan;
              padding: 10px;
              text-align: center;
              font-weight: bold;
            "
          >
            Sticky Footer
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { faker } from '@faker-js/faker';
import { VirtList } from '@virt-list/vue';

interface DemoItem {
  id: number;
  content: string;
}

const virtListRef = ref<InstanceType<typeof VirtList> | null>(null);

const list: DemoItem[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  content: faker.lorem.paragraph(),
}));

const scrollToTop = () => (virtListRef.value as any)?.scrollToTop();
const scrollToBottom = () => (virtListRef.value as any)?.scrollToBottom();
const scrollToIndex = (index: number) =>
  (virtListRef.value as any)?.scrollToIndex(index);
const onToTop = (item: DemoItem) => console.log('到达顶部', item);
const onToBottom = (item: DemoItem) => console.log('到达底部', item);
</script>
