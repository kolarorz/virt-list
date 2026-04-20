<template>
  <div class="demo-panel">
    <div style="margin-bottom: 8px; font-size: 12px; color: #888">
      提示：点击内容区域可以直接编辑文本，行高会自动适应。
    </div>
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="20"
        @update="onUpdate"
      >
        <template #default="{ itemData }">
          <div class="demo-row-item demo-dynamic-row">
            <span class="demo-row-index">#{{ itemData.index }}</span>
            <div
              class="demo-editable"
              contenteditable="true"
              @input="onEditInput(itemData, $event)"
            >
              {{ itemData.text }}
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
  const texts = [
    '短文本。',
    '这是一段中等长度的文本内容，用来展示可变高度的虚拟列表项。',
    '这是一段比较长的文本内容，用来展示可变高度的虚拟列表项。每一行的高度都不同，虚拟列表需要动态计算每个元素的实际高度，以确保滚动位置的准确性。这是虚拟列表最核心的功能之一。',
    '极短',
    '这段文本的长度适中。它既不太短也不太长，但足以让虚拟列表检测到与其他行不同的高度。动态高度列表相比固定高度列表需要更多的计算，但它提供了更灵活的内容展示方式。可以在这里输入任意内容来改变行高。',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    index: i,
    text: texts[i % texts.length] ?? '',
  }));
}

type Item = ReturnType<typeof generateList>[number];

const statsText = ref('');
const list = ref<Item[]>(generateList(200));

statsText.value = `总数: ${list.value.length} | 可变高度 + 可编辑`;

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}

function onEditInput(item: Item, e: Event) {
  item.text = (e.target as HTMLElement).textContent ?? '';
}
</script>
