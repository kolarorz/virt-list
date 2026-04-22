<template>
  <div class="demo-panel">
    <div class="demo-toolbar">
      <label>添加数量：</label>
      <input v-model.number="addCount" type="number" min="1" style="width: 80px" />
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onAdd">手动添加</button>
      <button type="button" class="virt-list-btn virt-list-btn-success" @click="onAutoAdd">自动添加</button>
      <button
        v-show="autoTimer != null"
        type="button"
        class="virt-list-btn virt-list-btn-secondary"
        @click="onStop"
      >
        停止
      </button>
    </div>
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        ref="virtListRef"
        :list="list"
        item-key="id"
        :item-pre-size="40"
        :buffer="5"
        @update="onUpdate"
      >
        <template #default="{ itemData }">
          <Item :item="itemData" />
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { VirtList } from '@virt-list/vue';
import Item from '../Item.vue';
import '../../demo.css';

const SENTENCES = [
  '虚拟列表是一种高性能的列表渲染方案，只渲染可视区域内的元素。',
  '通过动态计算每个元素的位置和大小，可以高效地处理海量数据。',
  '每一行的内容长度不同，高度也会随之变化，这正是动态高度虚拟列表的核心能力。',
  '当列表项的高度不固定时，需要在渲染后测量实际尺寸并更新位置信息。',
  '这段文本比较短。',
  '相比传统的全量渲染方式，虚拟列表可以将 DOM 节点数量控制在一个很小的范围内，从而大幅提升滚动性能和内存效率。即使数据量达到数十万条，滚动体验依然流畅。',
  '支持自动添加数据。',
  '滚动过程中，列表会根据当前的滚动位置计算出需要渲染的起始和结束索引，只创建必要的 DOM 节点。被移出可视区域的节点会被及时回收，避免内存泄漏。',
];

let uid = 0;

function generateList(count: number, startIndex = 0) {
  return Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const sentenceCount = (idx % 5) + 1;
    const parts: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      parts.push(SENTENCES[(idx + s * 3) % SENTENCES.length] ?? '');
    }
    return {
      id: uid++,
      index: idx,
      text: parts.join(' '),
    };
  });
}

type Item = ReturnType<typeof generateList>[number];

const virtListRef = ref<typeof VirtList | null>(null);
const statsText = ref('');
const addCount = ref(1000);
const autoTimer = ref<ReturnType<typeof setInterval> | null>(null);
const list = ref<Item[]>(generateList(1000));

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}

statsText.value = `总数: ${list.value.length}`;

onUnmounted(() => {
  if (autoTimer.value) {
    clearInterval(autoTimer.value);
    autoTimer.value = null;
  }
});

function onAdd() {
  const count = addCount.value || 1000;
  const newItems = generateList(count, list.value.length);
  list.value = list.value.concat(newItems);
  virtListRef.value?.forceUpdate();
  statsText.value = `总数: ${list.value.length}`;
}

function onAutoAdd() {
  if (autoTimer.value) return;
  autoTimer.value = setInterval(() => {
    if (list.value.length >= 500000) {
      if (autoTimer.value) clearInterval(autoTimer.value);
      autoTimer.value = null;
      return;
    }
    const newItems = generateList(1000, list.value.length);
    list.value = list.value.concat(newItems);
    virtListRef.value?.forceUpdate();
  }, 100);
}

function onStop() {
  if (autoTimer.value) {
    clearInterval(autoTimer.value);
    autoTimer.value = null;
  }
}
</script>
