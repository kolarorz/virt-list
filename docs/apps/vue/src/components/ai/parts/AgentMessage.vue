<template>
  <div class="demo-agent-msg" :class="{ 'is-user': isUser, 'is-current-hit': currentHit }">
    <div class="demo-agent-head">
      <span class="demo-agent-avatar" :class="isUser ? 'is-user' : 'is-assistant'">
        {{ isUser ? '你' : '✦' }}
      </span>
      <span class="demo-agent-name">{{ isUser ? '你' : message.model }}</span>
      <span class="demo-agent-time">{{ message.time }}</span>
      <span v-if="index !== undefined" class="demo-ai-index">#{{ index }}</span>
    </div>

    <div class="demo-agent-body">
      <!--
        流式生成时只有最后一个块在长，前面的块一个属性都没变——
        列表结构、其他项的 DOM 一概不动，这正是流式该有的开销。
      -->
      <AgentBlock
        v-for="(block, i) in message.blocks"
        :key="i"
        :block="block"
        :keyword="keyword"
        :current-hit="currentHit"
        :streaming="streaming && i === message.blocks.length - 1"
      />

      <!-- 请求已发出、第一个块还没到：给一条占位，避免界面空着 -->
      <div v-if="streaming && message.blocks.length === 0" class="demo-agent-skeleton">
        <span>正在思考</span>
        <span class="demo-agent-skeleton-bar" />
      </div>

      <!-- 操作栏只在回答完成后出现，生成中露出「复制」会让人复制到半截内容 -->
      <div v-if="showActions" class="demo-agent-actions">
        <button type="button" class="demo-agent-action" @click="copyAll">
          {{ copied ? '已复制' : '⧉ 复制' }}
        </button>
        <button type="button" class="demo-agent-action" @click="emit('retry', message)">↻ 重试</button>
        <button
          type="button"
          class="demo-agent-action"
          :class="{ 'is-active': message.liked }"
          @click="message.liked = !message.liked"
        >
          ♡ 有用
        </button>
        <span class="demo-agent-meta">{{ formatTokens(message.tokens) }} tok · {{ formatMs(message.ms) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { blocksToMarkdown, formatMs, formatTokens } from '../../../../../_shared/agentBlocks';
import type { AiMessage } from '../../../../../_shared/aiData';
import AgentBlock from './AgentBlock.vue';

const props = defineProps<{
  message: AiMessage;
  /** 这条消息是否正在生成 */
  streaming?: boolean;
  /** 列表下标，搜索示例里用来对照跳转位置 */
  index?: number;
  keyword?: string;
  currentHit?: boolean;
}>();

const emit = defineEmits<{ retry: [message: AiMessage] }>();

const isUser = computed(() => props.message.role === 'user');

const showActions = computed(
  () => !isUser.value && !props.streaming && props.message.blocks.length > 0,
);

const copied = ref(false);

/**
 * 复制整条回答。
 *
 * 输出的是 Markdown 而不是屏幕上那几行文字——代码带围栏、工具调用带状态，
 * 粘到编辑器里就能直接用。
 */
function copyAll() {
  void navigator.clipboard?.writeText(blocksToMarkdown(props.message.blocks));
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1200);
}
</script>
