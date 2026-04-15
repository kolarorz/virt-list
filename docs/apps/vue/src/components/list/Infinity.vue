<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        v-if="list.length > 0"
        ref="virtListRef"
        :list="list"
        item-key="id"
        :item-pre-size="40"
        @to-bottom="onToBottom"
        @update="onUpdate"
      >
        <template #default="{ itemData }">
          <div class="demo-row-item">
            <span class="demo-row-index">#{{ itemData.index }}</span>
            <span class="demo-row-text">{{ itemData.text }}</span>
          </div>
        </template>
        <template #footer>
          <div id="loadingBar" class="demo-loading-bar">{{ loading ? '加载中...' : ' ' }}</div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { VirtList } from '@virt-list/vue';
import '../../demo.css';

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

const virtListRef = ref<InstanceType<typeof VirtList> | null>(null);
const statsText = ref('');
const list = ref<Item[]>([]);
const loading = ref(false);

function updateStats(state?: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state?.inViewBegin ?? '-'} - ${state?.inViewEnd ?? '-'} | 渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}${
    loading.value ? ' | 加载中...' : ''
  }`;
}

async function loadMore() {
  if (loading.value) return;
  loading.value = true;
  updateStats();
  const newItems = await generateList(200, list.value.length, 1000);
  list.value = list.value.concat(newItems);
  loading.value = false;
  await nextTick();
  virtListRef.value?.forceUpdate();
  updateStats();
}

function onToBottom() {
  void loadMore();
}

function onUpdate(_list: any[], state: any) {
  updateStats(state);
}

onMounted(() => {
  void loadMore();
});
</script>
