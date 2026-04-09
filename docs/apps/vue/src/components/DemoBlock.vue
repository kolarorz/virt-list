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
      <pre class="demo-block__pre"><code>{{ props.source }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  source: string;
}>();

const showCode = ref(false);
const copyText = ref('复制');

async function onCopy() {
  try {
    await navigator.clipboard.writeText(props.source);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = props.source;
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

<style>
.demo-block__actions {
  display: flex;
  align-items: center;
  margin-top: 12px;
  padding: 0 12px;
}

.demo-block__divider {
  flex: 1;
  height: 1px;
  background: #e8e8e8;
}

.demo-block__toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 13px;
  padding: 6px 16px;
  white-space: nowrap;
  user-select: none;
  transition: color 0.2s;
}

.demo-block__toggle:hover {
  color: #2563eb;
}

.demo-block__arrow {
  transition: transform 0.25s ease;
}

.demo-block__arrow.is-open {
  transform: rotate(180deg);
}

.demo-block__source {
  position: relative;
  margin-top: 8px;
  border-top: 1px solid #e8e8e8;
  background: #1e1e1e;
}

.demo-block__source-header {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px 0;
}

.demo-block__copy {
  background: rgba(255, 255, 255, 0.1);
  color: #a0aec0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-block__copy:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
}

.demo-block__pre {
  margin: 0;
  padding: 8px 16px 16px;
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
}

.demo-block__pre code {
  font-family: 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre;
}
</style>
