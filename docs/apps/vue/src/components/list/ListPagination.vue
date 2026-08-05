<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="60"
        :load-more="onLoadMore"
        initial-position="bottom"
        @load-state-change="onLoadStateChange"
        @update="onUpdate"
      >
        <template #header="{ loadState }">
          <div class="demo-loading-bar">
            {{ loadState.loadingTop ? '加载中...' : loadState.hasMoreTop ? '上拉加载...' : '没有更早的数据了' }}
          </div>
        </template>
        <template #default="{ itemData }">
          <div class="demo-chat-message">
            <div class="demo-chat-bubble">
              <div style="font-weight: bold; margin-bottom: 2px">消息 #{{ itemData.index }}</div>
              <div>{{ itemData.text }}</div>
            </div>
          </div>
        </template>
        <template #footer="{ loadState }">
          <div class="demo-loading-bar">
            {{ loadState.loadingBottom ? '加载中...' : loadState.hasMoreBottom ? '下拉加载...' : '没有更新的数据了' }}
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue';
import type { LoadDirection, LoadState } from '@virt-list/vue';

const PAGE_SIZE = 20;
const PAGE_MAX = 10;

let uid = 0;

const PAGE_MSGS = [
  '短消息。',
  '这是一条普通长度的分页消息，展示双向分页加载的效果。',
  '向上滚动会加载更早的数据，向下滚动会加载更新的数据。同时，离开可视区域较远的数据会被移除，以控制内存中的数据量。',
  '分页已加载。',
  '双向分页模式适用于消息列表、日志浏览等场景。用户可以在时间线上自由导航，而不需要一次性加载所有数据。数据的增删只需要照常改 list，滚动位置由组件自动补偿。',
  '翻到顶部或底部都可以触发新一页的加载。',
];

function generatePage(page: number) {
  const start = (page - 1) * PAGE_SIZE;
  return Array.from({ length: PAGE_SIZE }, (_, i) => {
    const idx = start + i;
    return {
      id: uid++,
      index: idx,
      text: PAGE_MSGS[idx % PAGE_MSGS.length],
    };
  });
}

function asyncGeneratePage(page: number) {
  return new Promise<ReturnType<typeof generatePage>>((resolve) =>
    setTimeout(() => resolve(generatePage(page)), 1000),
  );
}

type Item = ReturnType<typeof generatePage>[number];

const statsText = ref('');
const page = ref(PAGE_MAX);
const list = ref<Item[]>([...generatePage(page.value - 1), ...generatePage(page.value)]);
const loadState = ref<LoadState | null>(null);

/**
 * 双向分页取数。
 *
 * 一端加一页、另一端裁一页——即使总长度不变，组件也能识别出头部的结构变化
 * 并补偿滚动位置，不再需要 addedList2Top / deletedList2Top / forceUpdate。
 */
async function onLoadMore(direction: LoadDirection) {
  if (direction === 'top') {
    if (page.value <= 2) return false;
    const prevPage = await asyncGeneratePage(page.value - 2);
    page.value--;
    list.value = prevPage.concat(list.value.slice(0, list.value.length - PAGE_SIZE));
    return page.value > 2;
  }

  if (page.value >= PAGE_MAX) return false;
  const nextPage = await asyncGeneratePage(page.value + 1);
  page.value++;
  list.value = list.value.slice(PAGE_SIZE).concat(nextPage);
  return page.value < PAGE_MAX;
}

function onLoadStateChange(state: LoadState) {
  loadState.value = state;
  updateStats();
}

function onUpdate(_list: any[], state: any) {
  updateStats(state);
}

function updateStats(state?: any) {
  const loading = loadState.value?.loadingTop || loadState.value?.loadingBottom;
  statsText.value = `总数: ${list.value.length} | Page: ${page.value} | 可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'} | 渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}${
    loading ? ' | 加载中...' : ''
  }`;
}

updateStats();
</script>
