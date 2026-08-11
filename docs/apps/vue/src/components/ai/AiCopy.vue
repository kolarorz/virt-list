<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div class="demo-list-container" ref="wrapRef">
      <VirtList
        ref="vlRef"
        :list="list"
        item-key="id"
        :estimated-size="80"
        :copy-text="enabled ? copyText : undefined"
        :copy-separator="SEPARATOR"
        @update="onUpdate"
      >
        <template #default="{ itemData }">
          <div class="demo-chat-message demo-ai-row" :class="{ 'is-user': itemData.role === 'user' }">
            <div class="demo-chat-bubble">{{ copyText(itemData) }}</div>
          </div>
        </template>
      </VirtList>
    </div>
    <div class="demo-chat-toolbar">
      <label>
        <input v-model="enabled" type="checkbox" />
        启用跨虚拟化复制
      </label>
      <button type="button" class="virt-list-btn" @click="selectAll">选中全部对话</button>
      <span class="demo-hint">{{ result }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { VirtList } from '@virt-list/vue';
import { generateAiPage, type AiMessage } from '../../../../_shared/aiData';

const COUNT = 400;
/** 必须绑定而不是写成属性字面量：模板里的 "\n\n" 是反斜杠加 n，不是换行 */
const SEPARATOR = '\n\n';

const vlRef = ref<typeof VirtList | null>(null);
const wrapRef = ref<HTMLElement | null>(null);
const list = ref<AiMessage[]>(generateAiPage(1, COUNT));
const enabled = ref(true);
const result = ref('');
const listState = ref<any>(null);

/** 复制成一段可读的对话记录；渲染也用它，保证复制到的与看到的一致 */
const copyText = (item: AiMessage) =>
  `${item.role === 'user' ? '我' : 'AI'}：${item.text}`;

const statsText = computed(() => {
  const s = listState.value;
  if (!s) return `消息数: ${list.value.length}`;
  const rendered = s.renderEnd - s.renderBegin + 1;
  return [
    `消息数: ${list.value.length}`,
    `当前渲染: ${rendered} 项（${s.renderBegin} - ${s.renderEnd}）`,
    `未渲染: ${list.value.length - rendered} 项`,
  ].join(' | ');
});

function onUpdate(_list: AiMessage[], state: any) {
  listState.value = state;
}

/**
 * 一键全选。
 *
 * 选中的是滚动容器的全部内容——它只包含当前渲染的那几十项，所以这个选区在
 * 浏览器眼里「跨越」了全部 400 条消息，正是要演示的那个缺口。
 */
function selectAll() {
  const clientEl = vlRef.value?.clientEl as HTMLElement | undefined;
  const selection = document.getSelection();
  if (!clientEl || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(clientEl);
  selection.removeAllRanges();
  selection.addRange(range);
  result.value = '已选中，按 Cmd/Ctrl+C 复制后粘贴到别处对比';
}

function onCopy(e: ClipboardEvent) {
  // 组件内部的监听已经改写完剪贴板，这里读回来的就是用户真正粘贴到的内容
  const written = e.clipboardData?.getData('text/plain') ?? '';
  const inDom = document.getSelection()?.toString().length ?? 0;
  result.value = written
    ? `已复制 ${written.length} 字，其中 ${Math.max(0, written.length - inDom)} 字来自未渲染的项`
    : `已复制 ${inDom} 字（只有 DOM 里的内容）`;
}

onMounted(() => wrapRef.value?.addEventListener('copy', onCopy));
onBeforeUnmount(() => wrapRef.value?.removeEventListener('copy', onCopy));
</script>
