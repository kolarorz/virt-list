<template>
  <div class="demo-panel">
    <div class="demo-toolbar">
      <div class="virt-list-control-group">
        <label>behavior</label>
        <select v-model="behavior">
          <option value="auto">auto（瞬时跳转）</option>
          <option value="smooth">smooth（平滑动画）</option>
        </select>
      </div>
      <div class="virt-list-control-group">
        <label>duration (ms)</label>
        <input v-model.number="duration" type="number" min="0" step="100" />
      </div>
      <div class="virt-list-control-group">
        <label>逐帧穿越距离</label>
        <select v-model.number="smoothMaxDistance">
          <option :value="0">自动（两屏，推荐）</option>
          <option :value="400">400px（约一屏）</option>
          <option :value="2000">2000px</option>
          <option :value="NO_LIMIT">不限制（会露白）</option>
        </select>
      </div>
      <div class="virt-list-control-group">
        <label>scrollToIndex</label>
        <input v-model.number="indexInput" type="number" min="0" />
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onIndex">跳转</button>
      </div>
      <div class="virt-list-control-group">
        <label>scrollToOffset</label>
        <input v-model.number="offsetInput" type="number" min="0" />
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onOffset">跳转</button>
      </div>
    </div>
    <div class="demo-toolbar" style="margin-top: 4px">
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onTop">scrollToTop</button>
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onBottom">scrollToBottom</button>
      <button type="button" class="virt-list-btn virt-list-btn-success" @click="onIntoView">scrollIntoView</button>
      <button type="button" class="virt-list-btn virt-list-btn-warning" @click="onCancel">cancelScroll</button>
    </div>
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-stats" style="min-height: 20px">{{ doneText }}</div>
    <p class="demo-hint">
      提示：平滑滚动进行中，滚动鼠标滚轮或触摸滑动会立即接管（onDone 收到 canceled = true）；
      发起新的滚动调用或点击 cancelScroll 同样会中断动画。<br />
      「逐帧穿越距离」控制动画真正逐帧滚过多长的距离，超出部分会先瞬跳掉。把它切成「不限制」，
      再跳到 index 1500，就能看到虚拟列表逐帧穿越长距离时的露白 —— 中间那几十屏内容根本来不及渲染，
      也没有观看价值，所以默认只逐帧滚最后两屏。
    </p>
    <div class="demo-list-container">
      <VirtList
        ref="virtListRef"
        :list="list"
        item-key="id"
        :item-pre-size="40"
        :buffer="2"
        :scroll-duration="duration"
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
import { VirtList } from '@virt-list/vue2';

const SENTENCES = [
  '平滑滚动通过 behavior: "smooth" 开启，不传参数时保持瞬时跳转。',
  '这一行比较短。',
  'duration 控制动画时长，也可以通过组件属性 scrollDuration 设置默认值。动画使用 requestAnimationFrame 实现，每一帧都会重新计算目标位置，所以不定高列表在滚动途中撑开高度也不会跑偏。',
  'onDone 回调会告诉你动画是正常结束还是被中断。',
  '虚拟列表的滚动定位 API 都支持这个可选参数：scrollToIndex、scrollIntoView、scrollToTop、scrollToBottom、scrollToOffset。',
];

function generateList(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 4) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length] ?? '');
    return { id: i, index: i, text: parts.join(' ') };
  });
}

type Item = ReturnType<typeof generateList>[number];

const virtListRef = ref<typeof VirtList | null>(null);
const list = ref<Item[]>(generateList(2000));

const behavior = ref<'auto' | 'smooth'>('smooth');
const duration = ref(300);
/** 不限制逐帧穿越距离（会露白，用于对比）*/
const NO_LIMIT = Infinity;
const smoothMaxDistance = ref(0);
const indexInput = ref(1500);
const offsetInput = ref(8000);
const statsText = ref(`总数: ${list.value.length}`);
const doneText = ref('');

/** 组装本次调用的滚动参数，并把 onDone 结果打到界面上 */
function scrollOptions(label: string) {
  doneText.value = `${label} 执行中...`;
  return {
    behavior: behavior.value,
    duration: duration.value,
    maxDistance: smoothMaxDistance.value,
    onDone: (canceled: boolean) => {
      doneText.value = canceled
        ? `${label} 被中断（onDone: canceled = true）`
        : `${label} 已完成（onDone: canceled = false）`;
    },
  };
}

function onUpdate(_list: unknown[], state: { inViewBegin: number; inViewEnd: number; renderBegin: number; renderEnd: number }) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}

function onIndex() {
  virtListRef.value?.scrollToIndex(indexInput.value, scrollOptions(`scrollToIndex(${indexInput.value})`));
}
function onOffset() {
  virtListRef.value?.scrollToOffset(offsetInput.value, scrollOptions(`scrollToOffset(${offsetInput.value})`));
}
function onIntoView() {
  virtListRef.value?.scrollIntoView(indexInput.value, scrollOptions(`scrollIntoView(${indexInput.value})`));
}
function onTop() {
  virtListRef.value?.scrollToTop(scrollOptions('scrollToTop'));
}
function onBottom() {
  virtListRef.value?.scrollToBottom(scrollOptions('scrollToBottom'));
}
function onCancel() {
  virtListRef.value?.cancelScroll();
}
</script>
