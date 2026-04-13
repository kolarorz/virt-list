<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vitepress';
import {
  useFramework,
  getModuleLink,
  FRAMEWORK_LABELS,
  FRAMEWORK_ICONS,
  type Framework,
} from '../composables/useFramework';

const router = useRouter();
const { currentFramework, currentModule } = useFramework();

const open = ref(false);

const frameworks: Framework[] = ['vanilla', 'vue', 'react'];

function select(fw: Framework) {
  open.value = false;
  if (fw === currentFramework.value) return;
  router.go(getModuleLink(fw, currentModule.value));
}
</script>

<template>
  <div
    class="VPFlyout fw-flyout"
    @click.prevent.stop
    @mouseenter="open = true"
    @mouseleave="open = false"
  >
    <button
      type="button"
      class="button"
      aria-haspopup="true"
      :aria-expanded="open"
      aria-label="Switch framework"
      @click="open = !open"
    >
      <span class="text">
        <span class="fw-icon" v-html="FRAMEWORK_ICONS[currentFramework]"></span>
        <span>{{ FRAMEWORK_LABELS[currentFramework] }}</span>
        <span class="vpi-chevron-down text-icon" />
      </span>
    </button>

    <div class="menu">
      <div class="VPMenu">
        <div
          v-for="fw in frameworks"
          :key="fw"
          class="item"
        >
          <button
            class="link"
            :class="{ active: fw === currentFramework }"
            @click="select(fw)"
          >
            <span class="fw-icon" v-html="FRAMEWORK_ICONS[fw]"></span>
            <span>{{ FRAMEWORK_LABELS[fw] }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.VPFlyout {
  position: relative;
}

.VPFlyout:hover .text {
  color: var(--vp-c-text-2);
}

.button[aria-expanded="false"] + .menu {
  opacity: 0;
  visibility: hidden;
}

.VPFlyout:hover .menu,
.button[aria-expanded="true"] + .menu {
  opacity: 1;
  visibility: visible;
}

.button {
  display: flex;
  align-items: center;
  padding-left: 24px;
  height: var(--vp-nav-height);
  color: var(--vp-c-text-1);
  transition: color 0.5s;
}

.text {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: var(--vp-nav-height);
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}

.fw-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.text-icon {
  margin-left: 4px;
  font-size: 14px;
}

.menu {
  position: absolute;
  top: calc(var(--vp-nav-height) / 2 + 20px);
  left: 0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s, visibility 0.25s, transform 0.25s;
}

.VPMenu {
  border-radius: 12px;
  padding: 12px;
  min-width: 128px;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
  transition: background-color 0.5s;
  max-height: calc(100vh - var(--vp-nav-height));
  overflow-y: auto;
}

.item {
  padding: 0 16px;
  white-space: nowrap;
}

.link {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 6px;
  padding: 0 12px;
  width: 100%;
  line-height: 32px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  transition: background-color 0.25s, color 0.25s;
  text-align: left;
}

.link:hover {
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-default-soft);
}

.link.active {
  color: var(--vp-c-brand-1);
}
</style>
