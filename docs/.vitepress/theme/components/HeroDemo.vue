<script setup lang="ts">
/**
 * hero 右侧的迷你实时演示。
 *
 * 与其放一张插图，不如让访客第一眼就看到真东西在跑：五万条数据的列表缓慢自流，
 * 底部实时显示 DOM 里究竟有几个节点——这正是虚拟滚动的全部意义。
 *
 * 自动滚动本身也是个演示：它每帧都在走 scroll 处理逻辑，而首屏依然不掉帧。
 * 尊重 prefers-reduced-motion，用户若关闭了动效就保持静止（仍可手动滚）。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { VirtList } from '@virt-list/vanilla';

interface Row {
  id: number;
  label: string;
}

const TOTAL = 50_000;
const ROW_HEIGHT = 40;
/** 每帧滚动的像素数：约 2 行/秒，看得出在流动又不晃眼 */
const SPEED = 1.3;

const hostRef = ref<HTMLElement | null>(null);
const domCount = ref(0);

let vList: VirtList<Row> | null = null;
let rafId: number | null = null;

function stopLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

onMounted(() => {
  const host = hostRef.value;
  if (!host) return;

  const list: Row[] = new Array(TOTAL);
  for (let i = 0; i < TOTAL; i += 1) {
    list[i] = { id: i, label: `第 ${(i + 1).toLocaleString()} 行` };
  }

  vList = new VirtList<Row>(
    host,
    {
      list,
      itemKey: 'id',
      itemPreSize: ROW_HEIGHT,
      fixed: true,
      buffer: 1,
      renderItem: (item, _index, el) => {
        el.className = 'hero-demo-row';
        el.textContent = item.label;
      },
    },
    {
      update: (renderList) => {
        domCount.value = renderList.length;
      },
    },
  );

  const reduceMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  if (reduceMotion) return;

  const clientEl = vList.clientEl;
  const maxOffset = () =>
    Math.max(0, vList!.core.getTotalSize() - clientEl.clientHeight);

  /*
   * 累加器必须自己维护，不能写成 scrollTop += SPEED：
   * 这个容器的 scrollHeight 是 200 万 px，在这个量级上浏览器会丢掉
   * scrollTop 的亚像素部分，逐帧读回来的值永远是取整后的，小步进会被吃光。
   */
  let offset = 0;
  const step = () => {
    offset += SPEED;
    if (offset >= maxOffset()) offset = 0;
    clientEl.scrollTop = offset;
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
});

onBeforeUnmount(() => {
  stopLoop();
  vList?.destroy();
  vList = null;
});
</script>

<template>
  <div class="hero-demo">
    <div class="hero-demo-head">
      <span class="hero-demo-total">{{ TOTAL.toLocaleString() }}</span>
      <span class="hero-demo-unit">条数据</span>
    </div>
    <div ref="hostRef" class="hero-demo-body" />
    <div class="hero-demo-foot">
      DOM 中的列表节点：<strong>{{ domCount }}</strong> 个
    </div>
  </div>
</template>

<style scoped>
.hero-demo {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  /* 与列表主体同色：主体要用 mask 做上下淡出，不能自带底色 */
  background: var(--vp-c-bg);
  overflow: hidden;
}

.hero-demo-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 14px 18px 12px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.hero-demo-total {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-brand-1);
}

.hero-demo-unit {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.hero-demo-body {
  height: 300px;
  /* 上下淡出，暗示列表在无限延伸 */
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 24px,
    #000 calc(100% - 24px),
    transparent 100%
  );
}

.hero-demo-foot {
  padding: 12px 18px 14px;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.hero-demo-foot strong {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
}

@media (max-width: 960px) {
  .hero-demo {
    max-width: none;
  }

  .hero-demo-body {
    height: 240px;
  }
}
</style>

<style>
/*
 * 去掉 vitepress hero 自带的蓝色光晕装饰：它会从列表的淡出边缘透出来，
 * 而这里已经用真实运行的演示替代了装饰位。
 */
.VPHero .image-bg {
  display: none;
}

/*
 * hero 的图位原本是给一张带留白的插图准备的：用负边距抵消留白、把容器锁成
 * 320/560 见方、再整体偏移 -32px。换成一张实心卡片后这些都会变成问题——
 * 移动端负边距会让卡片压住导航与标题，容器定高则直接裁掉卡片底部。
 */
.VPHero .image {
  /* 窄屏下排到标题与按钮之后：先看清这是什么，再看它跑得怎么样 */
  order: 3;
  margin: 8px 0 0;
}

.VPHero .image-container {
  width: 100%;
  height: auto;
  transform: none;
}

@media (min-width: 960px) {
  .VPHero .image {
    order: 2;
    margin: 0;
  }
}

/* renderItem 创建的节点不在 scoped 作用域内 */
.hero-demo-body .hero-demo-row {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 18px;
  box-sizing: border-box;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-2);
}
</style>
