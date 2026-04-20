<script setup lang="ts">
import type { MicroApp } from 'qiankun';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type FrameworkKind = 'vanilla' | 'vue' | 'vue2' | 'react' | 'react-legacy';

interface PlaygroundProps {
  framework: FrameworkKind;
  exampleId: string;
  onEvent?: (payload: { framework: FrameworkKind; message: string }) => void;
}

const props = withDefaults(
  defineProps<{
    framework?: FrameworkKind;
    exampleId?: string;
  }>(),
  {
    framework: 'vanilla',
    exampleId: '',
  },
);

const framework = computed(() => props.framework);
const exampleId = computed(() => props.exampleId);
const containerRef = ref<HTMLElement | null>(null);
const isMounted = ref(false);
const isLoading = ref(false);
const loadError = ref('');
const eventLog = ref<string[]>([]);

let started = false;
let currentApp: MicroApp | null = null;
let qiankunApi: null | {
  start: typeof import('qiankun').start;
  loadMicroApp: typeof import('qiankun').loadMicroApp;
} = null;

const isDev = (import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV;

const base = (import.meta as any).env.BASE_URL || '/';
const appEntries: Record<FrameworkKind, string> = {
  vanilla: isDev ? 'http://localhost:7101/' : `${base}micro-apps/vanilla/`,
  vue: isDev ? 'http://localhost:7102/' : `${base}micro-apps/vue/`,
  react: isDev ? 'http://localhost:7103/' : `${base}micro-apps/react/`,
  vue2: isDev ? 'http://localhost:7104/' : `${base}micro-apps/vue2/`,
  'react-legacy': isDev ? 'http://localhost:7105/' : `${base}micro-apps/react-legacy/`,
};

const appNames: Record<FrameworkKind, string> = {
  vanilla: 'vanillaDemo',
  vue: 'vueDemo',
  vue2: 'vue2Demo',
  react: 'reactDemo',
  'react-legacy': 'reactLegacyDemo',
};

const titleMap: Record<FrameworkKind, string> = {
  vanilla: 'Vanilla 示例运行中',
  vue: 'Vue 3 示例运行中',
  vue2: 'Vue 2 示例运行中',
  react: 'React 18+ 示例运行中',
  'react-legacy': 'React 16-17 示例运行中',
};

const appendLog = (message: string) => {
  eventLog.value = [message, ...eventLog.value].slice(0, 8);
};

const mountApp = async () => {
  if (!containerRef.value) return;

  isLoading.value = true;
  loadError.value = '';

  try {
    if (!qiankunApi) {
      qiankunApi = await import('qiankun');
    }

    if (!started) {
      qiankunApi.start({ sandbox: true, prefetch: false });
      started = true;
    }

    if (currentApp) {
      await currentApp.unmount();
      currentApp = null;
    }

    containerRef.value.innerHTML = '';

    currentApp = qiankunApi.loadMicroApp({
      name: appNames[framework.value],
      entry: appEntries[framework.value],
      container: containerRef.value,
      props: {
        framework: framework.value,
        exampleId: exampleId.value,
        onEvent: (payload: { framework: FrameworkKind; message: string }) =>
          appendLog(`[${payload.framework}] ${payload.message}`),
      },
    });

    await currentApp.mountPromise;
    isMounted.value = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : '微应用加载失败';
    loadError.value = message;
    isMounted.value = false;
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await mountApp();
});

watch([framework, exampleId], async () => {
  await mountApp();
});

onBeforeUnmount(async () => {
  if (currentApp) {
    await currentApp.unmount();
    currentApp = null;
  }
});
</script>

<template>
  <section class="playground-shell">
    <div v-if="loadError" class="status error">
      {{ loadError }}
    </div>
    <div v-else-if="isLoading" class="status loading">微应用加载中...</div>
    <div v-else-if="!isMounted" class="status warning">微应用尚未挂载。</div>

    <div ref="containerRef" class="micro-container" />
  </section>
</template>
