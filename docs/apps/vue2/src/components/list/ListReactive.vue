<template>
  <div class="demo-panel">
    <div class="demo-toolbar">
      <button
        v-if="!running"
        type="button"
        class="virt-list-btn virt-list-btn-success"
        @click="start"
      >
        开始刷新
      </button>
      <button
        v-else
        type="button"
        class="virt-list-btn virt-list-btn-secondary"
        @click="stop"
      >
        停止刷新
      </button>
      <label>间隔(ms)：</label>
      <input
        v-model.number="interval"
        type="number"
        min="200"
        step="200"
        style="width: 80px"
        @change="onIntervalChange"
      />
      <label>数量：</label>
      <input
        v-model.number="rowCount"
        type="number"
        min="100"
        step="100"
        style="width: 80px"
        @change="onCountChange"
      />
    </div>
    <div class="demo-stats">
      总数: {{ list.length }} | 更新轮次: {{ tick }} | 间隔: {{ interval }}ms | 状态: {{ running ? '刷新中' : '已停止' }}
    </div>
    <div class="demo-list-container">
      <VirtList
        ref="virtListRef"
        :list="list"
        item-key="id"
        :item-pre-size="44"
      >
        <template #default="{ itemData }">
          <div class="demo-row-item">
            <span class="demo-row-index">#{{ itemData.index }}</span>
            <span class="demo-row-text">
              值: <b>{{ itemData.value }}</b>&ensp;更新于: {{ itemData.updatedAt }}
            </span>
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onUnmounted } from 'vue';
import { VirtList } from '@virt-list/vue2';
import '../../demo.css';

interface Row {
  id: number;
  index: number;
  value: number;
  updatedAt: string;
}

function nowText() {
  return new Date().toLocaleTimeString();
}

function createRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    index,
    value: Math.floor(Math.random() * 1000),
    updatedAt: nowText(),
  }));
}

const virtListRef = ref<InstanceType<typeof VirtList> | null>(null);
const interval = ref(1000);
const rowCount = ref(1000);
const tick = ref(0);
const running = ref(false);
const list = shallowRef<Row[]>(createRows(1000));
let timer: ReturnType<typeof setInterval> | null = null;

function doTick() {
  const time = nowText();
  list.value.forEach((row) => {
    row.value = Math.floor(Math.random() * 1000);
    row.updatedAt = time;
  });
  tick.value += 1;
  virtListRef.value?.forceUpdate();
}

function start() {
  if (timer) return;
  doTick();
  timer = setInterval(doTick, interval.value);
  running.value = true;
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  running.value = false;
}

function onIntervalChange() {
  if (timer) {
    stop();
    start();
  }
}

function onCountChange() {
  stop();
  list.value = createRows(rowCount.value);
  tick.value = 0;
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>
