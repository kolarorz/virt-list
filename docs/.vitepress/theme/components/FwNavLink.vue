<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vitepress';
import {
  useFramework,
  getModuleLink,
  type ModuleName,
} from '../composables/useFramework';

const props = defineProps<{
  text: string;
  mod: ModuleName;
}>();

const router = useRouter();
const route = useRoute();
const { currentFramework, currentModule } = useFramework();

const href = computed(() => getModuleLink(currentFramework.value, props.mod));
const isActive = computed(() => currentModule.value === props.mod);

function navigate(e: MouseEvent) {
  e.preventDefault();
  router.go(href.value);
}
</script>

<template>
  <a
    class="VPNavBarMenuLink"
    :class="{ active: isActive }"
    :href="href"
    @click="navigate"
  >
    <span>{{ text }}</span>
  </a>
</template>

<style scoped>
.VPNavBarMenuLink {
  display: flex;
  align-items: center;
  padding: 0 12px;
  line-height: var(--vp-nav-height);
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}

.VPNavBarMenuLink.active {
  color: var(--vp-c-brand-1);
}

.VPNavBarMenuLink:hover {
  color: var(--vp-c-brand-1);
}
</style>
