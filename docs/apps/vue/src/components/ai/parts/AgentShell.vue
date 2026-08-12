<template>
  <div class="demo-agent-shell">
    <!-- 顶部状态条：谁在回答、在做什么、走到第几步 -->
    <div class="demo-agent-topbar">
      <span class="demo-agent-model">
        <span class="demo-agent-dot" :class="{ 'is-live': live }" />
        {{ model }}
      </span>
      <span class="demo-agent-phase">{{ phase }}</span>
      <div v-if="steps" class="demo-agent-steps">
        <span
          v-for="i in steps.total"
          :key="i"
          class="demo-agent-step"
          :class="{ 'is-done': i <= steps.done, 'is-current': live && i === steps.done + 1 }"
        />
      </div>
    </div>

    <slot />

    <!-- 底部输入区：快捷提示 + 输入框 + 发送/停止 -->
    <div class="demo-agent-composer">
      <!--
        生成中不禁用输入：真实 agent 界面允许你追问，于是会有多条回答同时在生成。
        这对列表是更难的一档——「正在变化的那一项」不再只有一个。
      -->
      <div v-if="quickAsks.length > 0" class="demo-agent-chips">
        <button
          v-for="q in quickAsks"
          :key="q"
          type="button"
          class="demo-agent-chip"
          @click="emit('send', q)"
        >
          {{ q }}
        </button>
      </div>
      <div class="demo-agent-inputrow">
        <input
          v-model="draft"
          class="demo-input"
          type="text"
          :placeholder="placeholder"
          @keyup.enter="send"
        />
        <button type="button" class="virt-list-btn virt-list-btn-primary" @click="send">发送</button>
        <button v-if="live" type="button" class="virt-list-btn" @click="emit('stop')">停止生成</button>
        <slot name="toolbar" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

/**
 * Agent 会话的外壳：顶部状态条 + 列表 + 底部输入区。
 *
 * 抽出来的理由和 demoStats 一样——它是让示例看起来像真实产品的部分，
 * 不是示例要教的东西。列表本身通过默认插槽放进来。
 */
// 不接收返回值：模板直接用这些 prop，setup 里已经不需要读它们
withDefaults(
  defineProps<{
    /** 是否有回答正在生成：状态灯呼吸，并露出「停止生成」 */
    live: boolean;
    model: string;
    phase?: string;
    steps?: { done: number; total: number };
    quickAsks?: string[];
    placeholder?: string;
  }>(),
  {
    phase: '',
    steps: undefined,
    quickAsks: () => [],
    placeholder: '问点什么…（回车发送）',
  },
);

const emit = defineEmits<{ send: [text: string]; stop: [] }>();

const draft = ref('');

function send() {
  const text = draft.value.trim();
  if (!text) return;
  draft.value = '';
  emit('send', text);
}
</script>
