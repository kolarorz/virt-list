<template>
  <div class="demo-panel">
    <div class="demo-toolbar">
      <button
        type="button"
        class="virt-list-btn virt-list-btn-secondary"
        :disabled="loaded"
        @click="onLoad"
      >
        生成 30w 数据
      </button>
      <span style="font-size: 12px; color: #666">{{ loadStatus }}</span>
    </div>
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <div
        v-if="!loaded"
        style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999"
      >
        {{ emptyHint }}
      </div>
      <VirtList
        v-else
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

type Row = { id: number; index: number; text: string };

const statsText = ref('');
const loadStatus = ref('');
const emptyHint = ref('点击按钮生成海量数据');
const loaded = ref(false);
const list = ref<Row[]>([]);

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length.toLocaleString()} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}

function onLoad() {
  loaded.value = false;
  loadStatus.value = '正在生成数据...';
  emptyHint.value = '数据生成中...';

  setTimeout(() => {
    const hugeTexts = [
      '海量数据测试行。',
      '虚拟列表在处理大量数据时依然保持流畅的滚动体验，DOM 节点数量始终维持在较低水平。',
      '这一行的内容比较短。',
      '通过增量式的 DOM 更新策略，虚拟列表避免了一次性创建大量节点所带来的性能瓶颈。即使数据量达到数十万条，首屏渲染速度和滚动帧率都不会受到明显影响。这是传统列表渲染方式无法做到的。',
      '数据量越大，虚拟列表相对于全量渲染的性能优势越明显。',
    ];
    const data: Row[] = [];
    for (let i = 0; i < 300000; i++) {
      const n = (i % 4) + 1;
      const parts: string[] = [];
      for (let s = 0; s < n; s++) parts.push(hugeTexts[(i + s * 2) % hugeTexts.length] ?? '');
      data.push({ id: i, index: i, text: parts.join(' ') });
    }
    list.value = data;
    loaded.value = true;
    loadStatus.value = `已生成 ${data.length.toLocaleString()} 条数据`;
    statsText.value = `总数: ${data.length.toLocaleString()}`;
  }, 50);
}
</script>
