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
      <label>更新方式：</label>
      <button
        type="button"
        class="virt-list-btn"
        :class="mode === 'replace' ? 'virt-list-btn-primary' : 'virt-list-btn-secondary'"
        @click="mode = 'replace'"
      >
        换新数组
      </button>
      <button
        type="button"
        class="virt-list-btn"
        :class="mode === 'mutate' ? 'virt-list-btn-primary' : 'virt-list-btn-secondary'"
        @click="mode = 'mutate'"
      >
        原地修改
      </button>
      <button
        v-if="mode === 'mutate'"
        type="button"
        class="virt-list-btn virt-list-btn-warning"
        @click="manualRefresh"
      >
        refreshItems()
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
      总数: {{ list.length }} | 数据已改: {{ dataTick }} 轮 | 间隔: {{ interval }}ms | 状态: {{ running ? '刷新中' : '已停止' }}
    </div>
    <div class="demo-stats">
      {{ mode === 'replace'
        ? '换新数组：组件识别到 list 换了，把最新数据交给可视区内的每一项，行上的轮次跟着涨'
        : '原地改字段：引用与长度都没变，组件无从知晓，行上的轮次会停住 —— 点 refreshItems() 才追上' }}
    </div>
    <div class="demo-list-container">
      <VirtList
        ref="virtListRef"
        :list="list"
        item-key="id"
        :estimated-size="44"
      >
        <template #default="{ itemData }">
          <div class="demo-row-item">
            <span class="demo-row-index">#{{ itemData.index }}</span>
            <span class="demo-row-text">
              值: <b>{{ itemData.value }}</b>&ensp;轮次: <b>{{ itemData.tick }}</b>&ensp;更新于: {{ itemData.updatedAt }}
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

interface Row {
  id: number;
  index: number;
  value: number;
  tick: number;
  updatedAt: string;
}

type Mode = 'replace' | 'mutate';

function nowText() {
  return new Date().toLocaleTimeString();
}

function randValue() {
  return Math.floor(Math.random() * 1000);
}

// demo:fold 示例数据构造：createRows()
function createRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    index,
    value: randValue(),
    tick: 0,
    updatedAt: nowText(),
  }));
}
// /demo:fold

const virtListRef = ref<typeof VirtList | null>(null);
const interval = ref(1000);
const rowCount = ref(1000);
const dataTick = ref(0);
const running = ref(false);
const mode = ref<Mode>('replace');
// 大数据量用 shallowRef：放进 data 的数组会被 Vue 2 预先递归改写每个属性（十万条 150~190ms），
// 之后每次整表读还要多走一层 getter（13~20ms 对 shallowRef 的 0.8~1ms）。
// 代价是「原地改某一项的字段」Vue 察觉不到 —— 正是下面 mutate 模式演示的
const list = shallowRef<Row[]>(createRows(1000));
let timer: ReturnType<typeof setInterval> | null = null;

function doTick() {
  dataTick.value += 1;
  const time = nowText();
  const t = dataTick.value;

  if (mode.value === 'replace') {
    // 推荐写法：换一个新数组。组件发现 list 引用变了，会把最新数据交给
    // 可视区内的每一项，插槽内容随之重渲染 —— 不需要任何手动调用。
    // 配合 shallowRef 就是「高性能 + 自动更新」两头都要
    list.value = list.value.map((row) => ({
      ...row,
      value: randValue(),
      tick: t,
      updatedAt: time,
    }));
  } else {
    // 原地改字段：数组引用没变、长度没变，shallowRef 又不代理数组元素 ——
    // Vue 和组件都无从知晓，界面会停在上一轮
    list.value.forEach((row) => {
      row.value = randValue();
      row.tick = t;
      row.updatedAt = time;
    });
  }
}

/**
 * 手动重建可视区内的项。
 *
 * 只有上面那种「谁都察觉不到」的原地修改才需要它。传 keys 可以精确到某几项
 * （`refreshItems([3, 7])`），不传则重建全部可见项。
 */
function manualRefresh() {
  virtListRef.value?.refreshItems();
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
  dataTick.value = 0;
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>
