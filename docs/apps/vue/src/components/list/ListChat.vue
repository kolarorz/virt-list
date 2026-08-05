<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="60"
        :load-more="onLoadMore"
        :has-more-bottom="false"
        initial-position="bottom"
        sticky-bottom
        @load-state-change="onLoadStateChange"
        @update="onUpdate"
      >
        <template #header="{ loadState }">
          <div id="chatLoadingBar" class="demo-loading-bar">
            {{ loadState.loadingTop ? '加载中...' : loadState.hasMoreTop ? '' : '没有更早的消息了' }}
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
      </VirtList>
    </div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onSend">发送随机消息</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue';
import type { LoadDirection, LoadState } from '@virt-list/vue';

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

const statsText = ref('');
const page = ref(5);
const list = ref<Item[]>(generatePage(page.value, PAGE_SIZE));
const loadState = ref<LoadState | null>(null);

/**
 * 向上加载更早的消息。
 *
 * 只需取数并写入 list，返回是否还有更早的数据。防重入、加载中不重复触发、
 * 加载后的滚动位置补偿与重新渲染都由组件内部完成。
 */
async function onLoadMore(direction: LoadDirection) {
  if (direction !== 'top') return false;
  const prevPage = await asyncGeneratePage(page.value - 1, PAGE_SIZE);
  page.value--;
  list.value = prevPage.concat(list.value);
  return page.value > 1;
}

/** 发消息只管往列表里加，sticky-bottom 负责「贴底时才跟随」 */
function onSend() {
  const text = CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)];
  list.value = [...list.value, { id: uid++, index: list.value.length, text }];
}

function onLoadStateChange(state: LoadState) {
  loadState.value = state;
  updateStats();
}

function onUpdate(_list: any[], state: any) {
  updateStats(state);
}

function updateStats(state?: any) {
  const pending = loadState.value?.pendingNew ?? 0;
  const parts = [
    `总数: ${list.value.length}`,
    `Page: ${page.value}`,
    `可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'}`,
    `渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}`,
  ];
  if (loadState.value?.loadingTop) parts.push('加载中...');
  // 用户正在翻历史时收到的新消息数，实际项目里可以拿它渲染「N 条新消息」角标
  if (pending > 0) parts.push(`${pending} 条新消息`);
  statsText.value = parts.join(' | ');
}

updateStats();
</script>
