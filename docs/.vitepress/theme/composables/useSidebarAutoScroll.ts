import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute } from 'vitepress';
import { scrollSidebarToActive } from './sidebarAutoScroll';

/**
 * 首屏与每次换页后，把侧边栏滚到当前条目上。
 *
 * 之后不再干预——用户手动滚侧边栏时不会被拽回去。定位本身的逻辑与理由见
 * {@link ./sidebarAutoScroll}。
 */
export function useSidebarAutoScroll(): void {
  let rafId = 0;

  const schedule = () => {
    if (typeof window === 'undefined') return;
    cancelAnimationFrame(rafId);
    // 等两帧：第一帧侧边栏刚插进文档，高度和水合状态都还没定
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(scrollSidebarToActive);
    });
  };

  const route = useRoute();
  const stop = watch(() => route.path, () => void nextTick(schedule));

  onMounted(schedule);
  onBeforeUnmount(() => {
    stop();
    if (typeof window !== 'undefined') cancelAnimationFrame(rafId);
  });
}
