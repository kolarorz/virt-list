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
/** currentApp 当前承载的框架。与 framework 相同时切示例可以只走 update。 */
let mountedFramework: FrameworkKind | null = null;
/** 递增序号：异步挂载/更新期间又来了新的切换，旧的那次结果一律作废。 */
let loadSeq = 0;
let qiankunApi: null | {
  start: typeof import('qiankun').start;
  loadMicroApp: typeof import('qiankun').loadMicroApp;
} = null;

const isDev = (import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV;

const base = (import.meta as any).env.BASE_URL || '/';
const appEntries: Record<FrameworkKind, string> = {
  vanilla: isDev ? 'http://localhost:7801/' : `${base}micro-apps/vanilla/`,
  vue: isDev ? 'http://localhost:7802/' : `${base}micro-apps/vue/`,
  react: isDev ? 'http://localhost:7803/' : `${base}micro-apps/react/`,
  vue2: isDev ? 'http://localhost:7804/' : `${base}micro-apps/vue2/`,
  'react-legacy': isDev ? 'http://localhost:7805/' : `${base}micro-apps/react-legacy/`,
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

/**
 * 传给子应用的 props。mount 与 update 必须**同构**：
 * single-spa 的 parcel.update 是「整体替换 customProps」而不是合并
 * （single-spa.dev.js: `parcel.customProps = customProps`），
 * 少传 container 会让子应用的 getContainer 退化到全局 getElementById，
 * 少传 onEvent 则事件日志在 update 之后静音。
 */
const buildProps = () => ({
  framework: framework.value,
  exampleId: exampleId.value,
  container: containerRef.value as HTMLElement,
  onEvent: (payload: { framework: FrameworkKind; message: string }) =>
    appendLog(`[${payload.framework}] ${payload.message}`),
});

const mountApp = async () => {
  if (!containerRef.value) return;

  const seq = ++loadSeq;
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
      mountedFramework = null;
    }

    // 期间又切了一次：容器归属已经不是我们了，别再往里挂。
    if (seq !== loadSeq) return;

    containerRef.value.innerHTML = '';

    const target = framework.value;
    currentApp = qiankunApi.loadMicroApp({
      name: appNames[target],
      entry: appEntries[target],
      container: containerRef.value,
      props: buildProps(),
    });

    await currentApp.mountPromise;
    if (seq !== loadSeq) return;
    mountedFramework = target;
    isMounted.value = true;
  } catch (error) {
    if (seq !== loadSeq) return;
    const message = error instanceof Error ? error.message : '微应用加载失败';
    loadError.value = message;
    isMounted.value = false;
  } finally {
    if (seq === loadSeq) isLoading.value = false;
  }
};

/**
 * 同框架换示例走子应用的 update 生命周期。
 *
 * 省掉的是整个沙箱重建：qiankun 用 eval 执行子应用脚本，绕过浏览器的字节码缓存，
 * 重新 loadMicroApp 意味着 2MB+ 的 bundle 每次都要重新 parse + compile。
 * 五个子应用的 update 都实现成幂等的 render(props)，可以直接复用。
 *
 * - `ok`：已更新到位。
 * - `stale`：期间又切了一次，有更新的一轮在处理，调用方什么都不该做。
 * - `unsupported`：子应用没有 update 生命周期，或 update 抛错，需要整体重挂。
 */
type UpdateOutcome = 'ok' | 'stale' | 'unsupported';

const updateApp = async (): Promise<UpdateOutcome> => {
  if (!currentApp || typeof currentApp.update !== 'function') return 'unsupported';

  const seq = ++loadSeq;
  loadError.value = '';
  try {
    await currentApp.update(buildProps());
  } catch {
    return seq === loadSeq ? 'unsupported' : 'stale';
  }
  return seq === loadSeq ? 'ok' : 'stale';
};

onMounted(async () => {
  await mountApp();
});

watch([framework, exampleId], async ([nextFramework]) => {
  if (currentApp && mountedFramework === nextFramework) {
    const outcome = await updateApp();
    if (outcome === 'ok') {
      isMounted.value = true;
      return;
    }
    if (outcome === 'stale') return;
  }
  await mountApp();
});

onBeforeUnmount(async () => {
  loadSeq++;
  if (currentApp) {
    await currentApp.unmount();
    currentApp = null;
    mountedFramework = null;
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
