<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="40"
        :load-more="onLoadMore"
        :has-more-top="false"
        @load-state-change="onLoadStateChange"
        @update="onUpdate"
      >
        <template #default="{ itemData }">
          <div class="demo-row-item">
            <span class="demo-row-index">#{{ itemData.index }}</span>
            <span class="demo-row-text">{{ itemData.text }}</span>
          </div>
        </template>
        <template #footer="{ loadState }">
          <div id="loadingBar" class="demo-loading-bar">
            {{ loadState.loadingBottom ? '加载中...' : ' ' }}
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

let uid = 0;

const SENTENCES = [
  '滚动到底部会自动触发加载更多数据。',
  '新数据加载完成后会追加到列表末尾。',
  '加载过程中 footer 区域会显示加载提示，防止重复触发。数据加载完成后，虚拟列表会自动更新渲染范围，新增的行会无缝衔接到现有内容之后。',
  '短行。',
  '无限加载模式适用于数据量不确定的场景，比如社交媒体的信息流、搜索结果列表等。每次加载一页数据，用户可以一直向下滚动浏览。',
];

function generateList(count: number, startIndex = 0, delay = 0) {
  const items = Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const n = (idx % 4) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(idx + s * 2) % SENTENCES.length] ?? '');
    return { id: uid++, index: idx, text: parts.join(' ') };
  });
  if (delay <= 0) return Promise.resolve(items);
  return new Promise<typeof items>((resolve) => setTimeout(() => resolve(items), delay));
}

type Item = Awaited<ReturnType<typeof generateList>>[number];

const statsText = ref('');
const list = ref<Item[]>([]);
const loadState = ref<LoadState | null>(null);

/**
 * 触底取数。
 *
 * 列表初始为空，首屏这一次加载也由组件自动发起——内容填不满视口时会继续要
 * 下一页，不需要在 onMounted 里手动拉第一页。
 */
async function onLoadMore(direction: LoadDirection) {
  if (direction !== 'bottom') return false;
  const newItems = await generateList(200, list.value.length, 1000);
  list.value = list.value.concat(newItems);
  return true;
}

function onLoadStateChange(state: LoadState) {
  loadState.value = state;
  updateStats();
}

function onUpdate(_list: any[], state: any) {
  updateStats(state);
}

function updateStats(state?: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'} | 渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}${
    loadState.value?.loadingBottom ? ' | 加载中...' : ''
  }`;
}

updateStats();
</script>
