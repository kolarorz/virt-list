<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="40"
        :buffer="2"
        sticky-header-style="display: flex; align-items: center; justify-content: center; height: 50px; background: #2e8b57; font-weight: bold; color: #fff;"
        header-style="display: flex; align-items: center; justify-content: center; height: 40px; background: #3cb371; font-weight: bold; color: #fff;"
        footer-style="display: flex; align-items: center; justify-content: center; height: 40px; background: #20b2aa; font-weight: bold; color: #fff;"
        sticky-footer-style="display: flex; align-items: center; justify-content: center; height: 50px; background: #008b8b; font-weight: bold; color: #fff;"
        item-class="demo-row-item"
        @update="onUpdate"
      >
        <template #stickyHeader>Sticky Header (固定头部)</template>
        <template #header>Header (头部)</template>
        <template #default="{ itemData }">
          <span class="demo-row-index">#{{ itemData.index }}</span>
          <span class="demo-row-text">{{ itemData.text }}</span>
        </template>
        <template #footer>Footer (尾部)</template>
        <template #stickyFooter>Sticky Footer (固定底部)</template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue';
import '../../demo.css';

const SENTENCES = [
  '使用扁平渲染模式，slot 内容直接挂载到 item wrapper 上，无额外包裹层。',
  '短行。',
  '对比插槽 demo 中 slot 内容被一层 <div> 包裹的情况，扁平渲染减少了一层 DOM 嵌套，CSS 选择器也更简洁。',
  '这对于表格行、高频滚动等对 DOM 层级敏感的场景尤其有用。',
  'Vue 的 Fragment 支持让多个根元素可以直接作为 slot 内容输出，无需额外包裹。',
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

const statsText = ref('总数: 1000 | 扁平渲染模式');
const list = ref<Item[]>(generateList(1000));

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}
</script>
