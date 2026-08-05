<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useRoute } from 'vitepress';
import { nextTick, onBeforeUnmount, watch } from 'vue';
import FrameworkSwitch from './components/FrameworkSwitch.vue';
import PerfMetrics from './components/PerfMetrics.vue';
import HeroDemo from './components/HeroDemo.vue';

const route = useRoute();

const VP_DOC_MARKER_ATTR = 'data-vp-doc-target';

const syncVpDocClass = (_path: string) => {
  if (typeof document === 'undefined') return;

  const nodes = document.querySelectorAll<HTMLElement>(`.vp-doc, [${VP_DOC_MARKER_ATTR}="1"]`);

  nodes.forEach((el) => {
    el.setAttribute(VP_DOC_MARKER_ATTR, '1');
    el.classList.add('vp-doc');
  });
};

const stopWatch = watch(
  () => route.path,
  async (path) => {
    if (typeof window === 'undefined') return;
    await nextTick();
    requestAnimationFrame(() => syncVpDocClass(path));
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopWatch();
});
</script>

<template>
  <DefaultTheme.Layout>
    <template #nav-bar-content-before>
      <FrameworkSwitch />
    </template>
    <!-- hero 右侧：一个真在跑的迷你虚拟列表 -->
    <template #home-hero-image>
      <ClientOnly>
        <HeroDemo />
      </ClientOnly>
    </template>
    <!-- 紧跟 hero 的硬指标条，只在首页出现 -->
    <template #home-hero-after>
      <PerfMetrics />
    </template>
  </DefaultTheme.Layout>
</template>
