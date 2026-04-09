<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useRoute } from 'vitepress';
import { nextTick, onBeforeUnmount, watch } from 'vue';

const route = useRoute();

// Only routes in this whitelist will keep the `.vp-doc` class.
const VP_DOC_ENABLED_PREFIXES: string[] = [];
const VP_DOC_MARKER_ATTR = 'data-vp-doc-target';

const shouldEnableVpDocClass = (path: string): boolean => {
  return VP_DOC_ENABLED_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const syncVpDocClass = (path: string) => {
  if (typeof document === 'undefined') return;

  const enabled = shouldEnableVpDocClass(path);
  const nodes = document.querySelectorAll<HTMLElement>(`.vp-doc, [${VP_DOC_MARKER_ATTR}="1"]`);

  nodes.forEach((el) => {
    el.setAttribute(VP_DOC_MARKER_ATTR, '1');
    el.classList.add('vp-doc');
    // 后续如果需要禁用样式就加上
    // if (enabled) {
    //   el.classList.add('vp-doc');
    // } else {
    //   el.classList.remove('vp-doc');
    // }
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
  <DefaultTheme.Layout />
</template>
