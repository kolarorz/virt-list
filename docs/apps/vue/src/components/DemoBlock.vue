<template>
  <div class="demo-block">
    <slot />
    <div class="demo-block__actions">
      <span class="demo-block__divider" />
      <button class="demo-block__toggle" @click="showCode = !showCode">
        <svg
          :class="['demo-block__arrow', { 'is-open': showCode }]"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span>{{ showCode ? '隐藏代码' : '展示代码' }}</span>
      </button>
      <span class="demo-block__divider" />
    </div>
    <div v-if="showCode" class="demo-block__source">
      <div class="demo-block__source-header">
        <button class="demo-block__copy" @click="onCopy">{{ copyText }}</button>
      </div>
      <!-- 高亮 HTML 在构建时生成（见 _shared/vitePluginHighlightSource.ts），这里只负责渲染 -->
      <div class="demo-block__pre" v-html="props.source.html" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { DemoSource } from '../../../_shared/demoSource';

const props = defineProps<{
  source: DemoSource;
}>();

const showCode = ref(false);
const copyText = ref('复制');

async function onCopy() {
  try {
    await navigator.clipboard.writeText(props.source.raw);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = props.source.raw;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  copyText.value = '已复制 ✓';
  setTimeout(() => {
    copyText.value = '复制';
  }, 2000);
}
</script>
