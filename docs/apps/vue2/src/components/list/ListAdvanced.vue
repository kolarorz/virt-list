<template>
  <div class="demo-panel">
    <p style="font-size: 12px; color: #888; margin-bottom: 8px">
      高阶用法：展示类似表格的渲染，包含 sticky 列头和多列数据。前两行进行了合并展示。
    </p>
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="40"
        sticky-header-style="background:#f5f5f5;"
        @update="onUpdate"
      >
        <template #stickyHeader>
          <div class="demo-table-row demo-table-header" style="min-width: min-content">
            <div
              v-for="col in COLUMNS"
              :key="col.key"
              class="demo-adv-cell"
              :style="{ width: `${col.width}px`, minWidth: `${col.width}px`, fontWeight: 'bold', background: '#e8e8e8' }"
            >
              {{ col.title }}
            </div>
          </div>
        </template>
        <template #default="{ itemData, index }">
          <div class="demo-table-row" style="min-width: min-content">
            <template v-if="index === 0">
              <div
                class="demo-adv-cell"
                :style="{
                  width: `${COLUMNS[0].width + COLUMNS[1].width}px`,
                  minWidth: `${COLUMNS[0].width + COLUMNS[1].width}px`,
                  background: '#fffbe6',
                  fontWeight: 'bold',
                }"
              >
                合并行 (ID: {{ itemData.id }} & {{ itemData.id + 1 }})
              </div>
              <div
                v-for="col in COLUMNS.slice(2)"
                :key="col.key"
                class="demo-adv-cell"
                :style="{ width: `${col.width}px`, minWidth: `${col.width}px` }"
              >
                {{ itemData[col.key] }}
              </div>
            </template>
            <template v-else-if="index === 1">
              <div
                class="demo-adv-cell"
                :style="{
                  width: `${COLUMNS[0].width + COLUMNS[1].width}px`,
                  minWidth: `${COLUMNS[0].width + COLUMNS[1].width}px`,
                  background: '#fffbe6',
                }"
              >
                (续) ID: {{ itemData.id }}
              </div>
              <div
                v-for="col in COLUMNS.slice(2)"
                :key="col.key"
                class="demo-adv-cell"
                :style="{ width: `${col.width}px`, minWidth: `${col.width}px` }"
              >
                {{ itemData[col.key] }}
              </div>
            </template>
            <template v-else>
              <div
                v-for="col in COLUMNS"
                :key="col.key"
                class="demo-adv-cell"
                :style="{ width: `${col.width}px`, minWidth: `${col.width}px` }"
              >
                {{ itemData[col.key] }}
              </div>
            </template>
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

const COLUMNS = [
  { key: 'id' as const, title: 'ID', width: 60 },
  { key: 'name' as const, title: '姓名', width: 100 },
  { key: 'age' as const, title: '年龄', width: 60 },
  { key: 'address' as const, title: '地址', width: 200 },
  { key: 'desc1' as const, title: '描述1', width: 300 },
  { key: 'desc2' as const, title: '描述2', width: 300 },
  { key: 'desc3' as const, title: '描述3', width: 300 },
];

function generateList(count: number) {
  const addresses = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `用户_${i}`,
    age: 20 + (i % 40),
    address: addresses[i % addresses.length],
    desc1: `描述信息 ${i}-A`,
    desc2: `描述信息 ${i}-B`,
    desc3: `描述信息 ${i}-C`,
    rowSpan: i < 2 ? 2 : 1,
  }));
}

type Item = ReturnType<typeof generateList>[number];

const statsText = ref('');
const list = ref<Item[]>(generateList(100));

statsText.value = `总数: ${list.value.length} | 高阶表格`;

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}
</script>
