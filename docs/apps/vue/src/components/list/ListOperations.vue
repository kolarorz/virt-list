<template>
  <div class="demo-panel">
    <div class="demo-toolbar">
      <div class="virt-list-control-group">
        <label>scrollToOffset</label>
        <input v-model.number="offsetInput" type="number" min="0" />
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onOffset">跳转</button>
      </div>
      <div class="virt-list-control-group">
        <label>scrollToIndex</label>
        <input v-model.number="indexInput" type="number" min="0" />
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onIndex">跳转</button>
      </div>
      <div class="virt-list-control-group">
        <label>scrollIntoView</label>
        <input v-model.number="intoViewInput" type="number" min="0" />
        <button type="button" class="virt-list-btn virt-list-btn-success" @click="onIntoView">跳转</button>
        <div style="display: flex; gap: 4px; margin-top: 4px">
          <button
            type="button"
            class="virt-list-btn virt-list-btn-success"
            style="font-size: 10px; padding: 4px 8px"
            @click="onPrev"
          >
            Prev
          </button>
          <button
            type="button"
            class="virt-list-btn virt-list-btn-success"
            style="font-size: 10px; padding: 4px 8px"
            @click="onNext"
          >
            Next
          </button>
        </div>
      </div>
    </div>
    <div class="demo-toolbar" style="margin-top: 4px">
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onTop">scrollToTop</button>
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onBottom">scrollToBottom</button>
    </div>
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        ref="virtListRef"
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
  '使用 scrollToIndex 可以精确跳转到指定索引的位置。',
  '使用 scrollToOffset 可以跳转到指定的像素偏移量。',
  '这行内容较短。',
  'scrollIntoView 会将目标元素滚动到可视区域内，如果已经在可视区域则不会滚动。这个 API 在需要确保某个元素可见时非常有用。',
  '滚动到顶部和底部是最常见的操作。',
  '虚拟列表支持多种滚动定位方式，可以根据不同的业务场景选择最合适的 API。所有的滚动操作都是平滑的，不会出现跳动或闪烁。',
];

function generateList(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 4) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length] ?? '');
    return { id: i, index: i, text: parts.join(' ') };
  });
}

type Item = ReturnType<typeof generateList>[number];

const virtListRef = ref<InstanceType<typeof VirtList> | null>(null);
const statsText = ref('');
const offsetInput = ref(1000);
const indexInput = ref(500);
const intoViewInput = ref(100);
const list = ref<Item[]>(generateList(2000));

statsText.value = `总数: ${list.value.length}`;

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}

function onOffset() {
  virtListRef.value?.scrollToOffset(offsetInput.value);
}
function onIndex() {
  virtListRef.value?.scrollToIndex(indexInput.value);
}
function onIntoView() {
  virtListRef.value?.scrollIntoView(intoViewInput.value);
}
function onPrev() {
  const next = Math.max(0, intoViewInput.value - 1);
  intoViewInput.value = next;
  virtListRef.value?.scrollIntoView(next);
}
function onNext() {
  const next = Math.min(list.value.length - 1, intoViewInput.value + 1);
  intoViewInput.value = next;
  virtListRef.value?.scrollIntoView(next);
}
function onTop() {
  virtListRef.value?.scrollToTop();
}
function onBottom() {
  virtListRef.value?.scrollToBottom();
}
</script>
