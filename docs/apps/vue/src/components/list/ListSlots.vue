<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container">
      <VirtList
        :list="list"
        item-key="id"
        :item-pre-size="40"
        @update="onUpdate"
      >
        <template #stickyHeader>
          <div class="demo-band demo-band--sticky-header">
            <span class="demo-band__tag">stickyHeader</span>
            <span class="demo-band__text">固定头部</span>
            <span class="demo-band__note">吸在容器顶部，不随内容滚动</span>
          </div>
        </template>
        <template #header>
          <div class="demo-band demo-band--header">
            <span class="demo-band__tag">header</span>
            <span class="demo-band__text">头部</span>
            <span class="demo-band__note">排在第一项之前，随内容一起滚动</span>
          </div>
        </template>
        <template #default="{ itemData }">
          <div class="demo-row-item">
            <span class="demo-row-index">#{{ itemData.index }}</span>
            <span class="demo-row-text">{{ itemData.text }}</span>
          </div>
        </template>
        <template #footer>
          <div class="demo-band demo-band--footer">
            <span class="demo-band__tag">footer</span>
            <span class="demo-band__text">尾部</span>
            <span class="demo-band__note">排在最后一项之后，随内容一起滚动</span>
          </div>
        </template>
        <template #stickyFooter>
          <div class="demo-band demo-band--sticky-footer">
            <span class="demo-band__tag">stickyFooter</span>
            <span class="demo-band__text">固定底部</span>
            <span class="demo-band__note">吸在容器底部，不随内容滚动</span>
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VirtList } from '@virt-list/vue';

const SENTENCES = [
  '插槽示例展示了 stickyHeader、header、footer、stickyFooter 四种插槽的使用方法。',
  '短行。',
  'Sticky 插槽会固定在滚动容器的顶部或底部，不会随内容一起滚动。这在需要展示固定表头或固定操作栏的场景中非常实用。',
  '普通 header 和 footer 会随列表内容一起滚动。',
  '每一行的高度各不相同，这是因为文本内容的长度不同导致自然换行。虚拟列表会在渲染后准确测量每个元素的尺寸，从而保证滚动行为的正确性。',
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

const statsText = ref(`总数: ${1000} | 含 Sticky/Header/Footer 插槽`);
const list = ref<Item[]>(generateList(1000));

function onUpdate(_list: any[], state: any) {
  statsText.value = `总数: ${list.value.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
}
</script>
