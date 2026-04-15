<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-resize-container" style="overflow: auto">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="40"
        @update="onUpdate"
      >
        <template #default="{ itemData }">
          <div class="demo-row-item">
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
import { VirtList } from '@virt-list/vue';
import '../../demo.css';

const SENTENCES = [
  '拖拽容器右下角可以调整大小，虚拟列表会自动适应新的容器尺寸。',
  '容器变大时会渲染更多的行。',
  '这种自适应能力依赖于 ResizeObserver 对容器尺寸变化的监听。当容器的可视区域发生变化时，虚拟列表会重新计算需要渲染的元素数量，并更新视图。',
  '短行。',
  '无论容器是变大还是变小，滚动位置和列表状态都会被正确保留。这意味着用户在调整窗口大小时不会丢失当前的浏览位置。',
  '每一行的高度都不同，体现了动态高度的特性。',
];

function generateList(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 5) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length] ?? '');
    return { id: i, index: i, text: parts.join(' ') };
  });
}

type Item = ReturnType<typeof generateList>[number];

const statsText = ref('');
const list = ref<Item[]>(generateList(2000));

statsText.value = `总数: ${list.value.length} | 拖拽容器边框调整大小`;

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}
</script>
