<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        ref="virtListRef"
        :list="list"
        item-key="id"
        :item-pre-size="60"
        @to-top="onToTop"
        @to-bottom="onToBottom"
        @item-resize="onItemResize"
        @update="onUpdate"
      >
        <template #header>
          <div class="demo-loading-bar">{{ headerHint }}</div>
        </template>
        <template #default="{ itemData }">
          <div class="demo-chat-message">
            <div class="demo-chat-bubble">
              <div style="font-weight: bold; margin-bottom: 2px">消息 #{{ itemData.index }}</div>
              <div>{{ itemData.text }}</div>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="demo-loading-bar">{{ footerHint }}</div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { VirtList } from '@virt-list/vue';
import '../../demo.css';

const PAGE_SIZE = 20;
const PAGE_MAX = 10;

let uid = 0;

const PAGE_MSGS = [
  '短消息。',
  '这是一条普通长度的分页消息，展示双向分页加载的效果。',
  '向上滚动会加载更早的数据，向下滚动会加载更新的数据。同时，离开可视区域较远的数据会被移除，以控制内存中的数据量。',
  '分页已加载。',
  '双向分页模式适用于消息列表、日志浏览等场景。用户可以在时间线上自由导航，而不需要一次性加载所有数据。这种模式通过 addedList2Top 和 deletedList2Top 两个 API 来实现数据的动态增删，同时保持滚动位置的稳定。',
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

const virtListRef = ref<InstanceType<typeof VirtList> | null>(null);
const statsText = ref('');
const page = ref(PAGE_MAX);
const list = ref<Item[]>([...generatePage(page.value - 1), ...generatePage(page.value)]);
const loadingTop = ref(false);
const loadingBottom = ref(false);
const firstResize = ref(true);

const headerHint = computed(() => (page.value > 2 ? '上拉加载...' : '没有更早的数据了'));
const footerHint = computed(() => (page.value < PAGE_MAX ? '下拉加载...' : '没有更新的数据了'));

function updateStats(state?: any) {
  const extra = loadingTop.value || loadingBottom.value ? ' | 加载中...' : '';
  statsText.value = `总数: ${list.value.length} | Page: ${page.value} | 可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'} | 渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}${extra}`;
}

updateStats();

async function onToTop() {
  if (loadingTop.value || page.value <= 2 || !virtListRef.value) return;
  loadingTop.value = true;
  updateStats();

  const prevPageData = await asyncGeneratePage(page.value - 2);
  page.value--;

  const removed = list.value.splice(list.value.length - PAGE_SIZE, PAGE_SIZE);
  virtListRef.value.deletedList2Top(removed);
  list.value = prevPageData.concat(list.value);
  virtListRef.value.addedList2Top(prevPageData);
  virtListRef.value.forceUpdate();

  loadingTop.value = false;
  updateStats();
}

async function onToBottom() {
  if (loadingBottom.value || page.value >= PAGE_MAX || !virtListRef.value) return;
  loadingBottom.value = true;
  updateStats();

  const nextPageData = await asyncGeneratePage(page.value + 1);
  page.value++;

  const removed = list.value.splice(0, PAGE_SIZE);
  virtListRef.value.deletedList2Top(removed);
  list.value = list.value.concat(nextPageData);
  virtListRef.value.forceUpdate();

  loadingBottom.value = false;
  updateStats();
}

function onItemResize() {
  if (firstResize.value && virtListRef.value) {
    firstResize.value = false;
    virtListRef.value.scrollToBottom();
  }
}

function onUpdate(_list: any[], state: any) {
  updateStats(state);
}
</script>
