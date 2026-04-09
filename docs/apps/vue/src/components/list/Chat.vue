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
        @item-resize="onItemResize"
        @range-update="onRangeUpdate"
      >
        <template #header>
          <div id="chatLoadingBar" class="demo-loading-bar">{{ headerHint }}</div>
        </template>
        <template #default="{ itemData }">
          <div class="demo-chat-message">
            <div class="demo-chat-bubble">
              <div style="font-weight: bold; margin-bottom: 2px">消息 #{{ itemData.index }}</div>
              <div>{{ itemData.text }}</div>
            </div>
          </div>
        </template>
      </VirtList>
    </div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onSend">发送随机消息</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { VirtList } from '@virt-list/vue';
import '../../demo.css';

const PAGE_SIZE = 40;

let uid = 0;

const CHAT_MSGS = [
  '好的，收到！',
  '这个方案看起来不错，我觉得可以按这个方向继续推进。',
  '你有空的时候帮我看一下那个 bug 吗？就是用户反馈的列表滚动卡顿问题。',
  '明天的会议改到下午三点了，记得提前准备一下演示材料。',
  '我刚刚测试了一下新版本的虚拟列表组件，在十万条数据的情况下滚动依然非常流畅，完全没有掉帧的情况。之前用全量渲染的方案在五千条数据时就开始卡顿了，这次的优化效果非常明显！',
  '👍',
  '关于上次讨论的技术选型问题，我整理了一份对比文档，包括性能测试数据、社区活跃度、学习成本等方面的分析。总体来看，新方案在各方面都有优势。等你有空了我们再详细讨论一下具体的迁移计划。',
  '周末愉快！',
];

function generatePage(page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return Array.from({ length: pageSize }, (_, i) => {
    const idx = start + i;
    return {
      id: uid++,
      index: idx,
      text: CHAT_MSGS[idx % CHAT_MSGS.length],
    };
  });
}

function asyncGeneratePage(page: number, pageSize: number) {
  return new Promise<ReturnType<typeof generatePage>>((resolve) =>
    setTimeout(() => resolve(generatePage(page, pageSize)), 800),
  );
}

type Item = ReturnType<typeof generatePage>[number];

const virtListRef = ref<InstanceType<typeof VirtList> | null>(null);
const statsText = ref('');
const page = ref(5);
const list = ref<Item[]>(generatePage(page.value, PAGE_SIZE));
const loading = ref(false);
const firstResize = ref(true);

const headerHint = computed(() => (page.value > 1 ? '加载中...' : '没有更早的消息了'));

function updateStats(begin?: number, end?: number) {
  statsText.value = `总数: ${list.value.length} | Page: ${page.value} | RenderBegin: ${begin ?? '-'} | RenderEnd: ${end ?? '-'}`;
}

updateStats();

async function onToTop() {
  if (loading.value || page.value <= 1) return;
  loading.value = true;
  statsText.value += ' | 加载中...';
  const prevPage = await asyncGeneratePage(page.value - 1, PAGE_SIZE);
  page.value--;
  list.value = prevPage.concat(list.value);
  const vl = virtListRef.value;
  if (!vl) return;
  vl.addedList2Top(prevPage);
  vl.forceUpdate();
  loading.value = false;
  updateStats();
}

function onItemResize() {
  if (firstResize.value && virtListRef.value) {
    firstResize.value = false;
    virtListRef.value.scrollToBottom();
  }
}

function onRangeUpdate(begin: number, end: number) {
  updateStats(begin, end);
}

function onSend() {
  const text = CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)];
  const newItem = { id: uid++, index: list.value.length, text };
  list.value = [...list.value, newItem];
  virtListRef.value?.forceUpdate();
  nextTick(() => {
    virtListRef.value?.scrollToBottom();
  });
  updateStats();
}
</script>
