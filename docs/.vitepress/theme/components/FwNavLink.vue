<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vitepress';
import {
  useFramework,
  getModuleLink,
  type ModuleName,
} from '../composables/useFramework';

const props = defineProps<{
  text: string;
  mod: ModuleName;
  /** 高亮这一项（新模块的入口），并在文字后跟一个小圆点 */
  badge?: boolean;
}>();

const router = useRouter();
const { currentFramework, currentModule } = useFramework();

const href = computed(() => getModuleLink(currentFramework.value, props.mod));
/**
 * 按路径段判断，不能用 `route.path.includes(props.mod)`：
 * mod 名进到子串匹配里迟早会撞车——`ai` 就会被 `/vanilla/examples/list-ai-chat`
 * 这样的示例页命中，导致「AI」和「示例」两个 tab 同时点亮。
 */
const isActive = computed(() => currentModule.value === props.mod);

function navigate(e: MouseEvent) {
  e.preventDefault();
  router.go(href.value);
}
</script>

<template>
  <a
    class="VPNavBarMenuLink"
    :href="href"
    :class="{ active: isActive, badged: badge }"
    @click="navigate"
  >
    <span>{{ text }}</span>
    <span v-if="badge" class="dot" aria-hidden="true" />
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

/*
 * 新模块的标记。只加一个圆点，不改文字颜色：导航栏里的渐变文字会和主题的
 * active / hover 两个状态抢色，反而看不出哪一项是当前页。
 */
.dot {
  margin-left: 5px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

/* 抽屉里是 block 布局，圆点靠 inline-block 跟在文字后面同一行 */
.VPNavBarMenuLink[screen-menu] .dot {
  display: inline-block;
  vertical-align: middle;
}

.VPNavBarMenuLink.badged:not(.active) .dot {
  animation: dot-pulse 2.4s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .VPNavBarMenuLink.badged:not(.active) .dot {
    animation: none;
  }
}

/*
 * 移动端导航抽屉复用同一个组件（VitePress 会给 component 型 nav item 传
 * screen-menu 属性）。那里是纵向列表，64px 的导航栏行高会在三个链接之间
 * 撑出 100px 以上的空隙，所以按抽屉里原生链接的样式重排。
 */
.VPNavBarMenuLink[screen-menu] {
  display: block;
  padding: 12px 0 11px;
  border-bottom: 1px solid var(--vp-c-divider);
  line-height: 24px;
}
</style>
