<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="40"
        sticky-header-style="background:#f0f0f0;"
        @update="onUpdate"
      >
        <template #stickyHeader>
          <div class="demo-table-row demo-table-header">
            <div
              class="demo-table-cell"
              :style="{ ...stickyLeft, width: '80px', minWidth: '80px', background: '#e0e0e0' }"
            >
              ID
            </div>
            <div class="demo-table-cell" style="width: 120px; min-width: 120px">名称</div>
            <div class="demo-table-cell" style="width: 600px; min-width: 600px">描述1</div>
            <div class="demo-table-cell" style="width: 600px; min-width: 600px">描述2</div>
            <div
              class="demo-table-cell"
              :style="{ ...stickyRight, width: '80px', minWidth: '80px', background: '#e0e0e0' }"
            >
              操作
            </div>
          </div>
        </template>
        <template #default="{ itemData }">
          <div class="demo-table-row">
            <div
              class="demo-table-cell"
              :style="{ ...stickyLeft, width: '80px', minWidth: '80px' }"
            >
              {{ itemData.id }}
            </div>
            <div class="demo-table-cell" style="width: 120px; min-width: 120px">{{ itemData.name }}</div>
            <div class="demo-table-cell" style="width: 600px; min-width: 600px">{{ itemData.desc1 }}</div>
            <div class="demo-table-cell" style="width: 600px; min-width: 600px">{{ itemData.desc2 }}</div>
            <div class="demo-table-cell" :style="{ ...stickyRight, width: '80px', minWidth: '80px' }">
              <button type="button" class="virt-list-btn virt-list-btn-primary" style="font-size: 10px; padding: 2px 8px">
                详情
              </button>
            </div>
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue2';
import '../../demo.css';

function generateList(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `用户_${i}`,
    desc1: `这是用户 ${i} 的详细描述信息，可能是一段较长的文本`,
    desc2: `补充说明 ${i}，包含更多关于该用户的信息`,
    action: '操作',
  }));
}

type Item = ReturnType<typeof generateList>[number];

const stickyLeft: Record<string, string> = {
  position: 'sticky',
  left: '0',
  zIndex: '1',
  background: '#fff',
};
const stickyRight: Record<string, string> = {
  position: 'sticky',
  right: '0',
  zIndex: '1',
  background: '#fff',
};

const statsText = ref('');
const list = ref<Item[]>(generateList(1000));

statsText.value = `总数: ${list.value.length} | 表格模式（水平滚动 + sticky 列）`;

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}
</script>
