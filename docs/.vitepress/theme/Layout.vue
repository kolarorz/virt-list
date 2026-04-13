<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useRoute } from 'vitepress';
import { nextTick, onBeforeUnmount, watch } from 'vue';
import FrameworkSwitch from './components/FrameworkSwitch.vue';

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
  </DefaultTheme.Layout>
</template>
