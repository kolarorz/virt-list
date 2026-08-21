<script setup lang="ts">
/**
 * hero 右侧的迷你实时演示。
 *
 * 与其放一张插图，不如让访客第一眼就看到真东西在跑：五万条数据的列表匀速自流，
 * 底部实时显示 DOM 里究竟有几个节点——这正是虚拟滚动的全部意义。
 *
 * 自动滚动本身也是个演示：它每帧都在走 scroll 处理逻辑，而首屏依然不掉帧。旁边的
 * 帧率就是这个循环自己量的，不是写死的数字。
 * 尊重 prefers-reduced-motion，用户若关闭了动效就保持静止（仍可手动滚）；此时
 * 没有滚动循环，也就没有帧率可测，读数保持「—」。
 *
 * 访客一动手（滚轮 / 触摸 / 键盘 / 拖滑块），自动滚动立刻让位：卡片是可以真的上手
 * 玩的，自流的内容不该把他指定的位置抢回去。停手一会儿再自己接着跑——鼠标掠过
 * hero 时的一下误触不该把演示永久钉住。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { VirtList } from '@virt-list/vanilla';

interface Row {
  id: number;
  label: string;
}

const TOTAL = 50_000;
/**
 * 行高，必须与样式里的 `--hero-row-h` 保持一致。
 *
 * 容器高度也得是它的整数倍（见 `--hero-rows`）：否则视口下边界会切在某一行的
 * 中间，可见项数随滚动在 n / n+1 之间来回摆动，底部那个「DOM 中的列表节点」
 * 就会一直跳字——数字本身是对的，但看着像库在抖。
 */
const ROW_HEIGHT = 40;
/**
 * 自动滚动速度，单位是**像素 / 秒**（约 22 行/秒）。
 *
 * 与 virt-table 首页的实时表格取同一个值（那边写作 0.9 px/ms），两个站的 hero
 * 看上去是同一套东西在跑。
 *
 * 不要写成「每帧多少像素」：那样速度就绑在了刷新率上，60Hz 与 120Hz 的访客
 * 看到的是快慢差一倍的两个演示。下面按帧间隔积分，两种屏上都是这个值。
 */
const SPEED_PX_PER_SEC = 900;
/**
 * 帧率的结账周期：按窗口均值公布，不逐帧刷数字。
 *
 * 逐帧算「1000 / 帧间隔」得到的是瞬时值，正常抖动也会让读数在 55~62 之间乱跳，
 * 看着像在掉帧；400ms 一结账既跟得上手感变化，数字也稳得住。
 */
const SAMPLE_MS = 400;
/**
 * 手动滚动后，静止多久自动接着跑。
 *
 * 定这么一个时长而不是「一动手就永久停」：hero 卡片占着首屏右侧一大块，访客滚页面
 * 时鼠标常常正掠过它，滚轮被卡片接走了——那不是「我要看这一段」的意思，演示不该
 * 因此永久静止。反过来也不能太短：1.6s 足够读完一行再决定下一步，又不至于让人
 * 觉得卡片卡住了。
 */
const RESUME_DELAY_MS = 1600;

const hostRef = ref<HTMLElement | null>(null);
const domCount = ref(0);
/** 实时帧率；0 表示还没有测量窗口结账（静止或刚挂载），UI 上显示为「—」 */
const fps = ref(0);
/** 因手动滚动而让位中，脚注据此换成「已暂停」，免得看着像卡住了 */
const paused = ref(false);

let vList: VirtList<Row> | null = null;
let rafId: number | null = null;
let resumeTimer: number | null = null;
/**
 * 自动滚动这条路是否开着：reduced-motion 下整个循环都不存在，
 * 手动滚动便无从「暂停」，也不该在停手后凭空跑起来。
 */
let autoScroll = false;

/*
 * 自动滚动的进度累加器，以及帧率采样窗口。
 *
 * 累加器自己维护，不去读回 getOffset()：到达底部那一帧的写入会被裁到
 * maxOffset，读回来的值就不再是我们的进度，下一帧会卡在底部反复自增。
 * 唯一的例外是用户接手之后——那时以他停下的位置为新起点（见 pauseForUser）。
 */
let offset = 0;
let lastTs: number | null = null;
/* 窗口内累计帧数，到期一起公布 */
let frames = 0;
let windowStart: number | null = null;

function step(ts: number): void {
  /*
   * 首帧只用来取时间基准（此时还没有"上一帧"可比）。
   * 上限 50ms：切走标签页时 rAF 停跑，切回来的第一帧间隔是整段离开的时长，
   * 不钳住就会一次瞬移几百上千像素。
   */
  const deltaSec = lastTs === null ? 0 : Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;

  offset += SPEED_PX_PER_SEC * deltaSec;
  if (offset >= vList!.getMaxOffset()) offset = 0;
  /*
   * 走 scrollToOffset，不要写 clientEl.scrollTop：容器是 overflow:hidden，
   * 偏移量归 JS 掌管，写原生 scrollTop 不但不滚动，还会被内部当成「浏览器为露出
   * 焦点元素而静默滚动」立刻归零。
   *
   * 语义上这是「程序要求去某处」而非用户滚动，所以用 scrollToOffset
   * 而不是 scrollFromUser：不该触发 toTop / toBottom 与自动续拉。这一路派发的
   * scroll 事件 source 是 'program'，于是下面那个暂停判定不会被自己触发。
   */
  vList!.scrollToOffset(offset);

  /*
   * 帧率也是这个循环量出来的：帧数除以窗口实际时长，而不是除以 SAMPLE_MS
   * ——最后一帧总会略微越过窗口边界，用名义值算会把读数系统性抬高一点。
   */
  frames += 1;
  if (windowStart === null) windowStart = ts;
  const elapsed = ts - windowStart;
  if (elapsed >= SAMPLE_MS) {
    fps.value = Math.round((frames * 1000) / elapsed);
    frames = 0;
    windowStart = ts;
  }

  rafId = requestAnimationFrame(step);
}

function startLoop(): void {
  if (!autoScroll || rafId !== null) return;
  /*
   * 时间基准与采样窗口都清掉再起步：暂停期间时钟照走，留着旧的 lastTs 会让复跑的
   * 第一帧把整段暂停时长当成帧间隔（虽被 50ms 钳住，仍是一次看得见的跳），留着旧的
   * windowStart 则会拿几帧去除一整段停顿，帧率报出个位数。
   */
  lastTs = null;
  windowStart = null;
  frames = 0;
  rafId = requestAnimationFrame(step);
}

function stopLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/**
 * 用户动了滚动位置：让位，并排一个复跑的定时器。
 *
 * 每来一次都重排定时器，所以连续滚动期间不会被打断，只有真的停手才开始计时。
 */
function pauseForUser(): void {
  if (!autoScroll) return;
  stopLoop();
  paused.value = true;
  // 循环停了就没有测量窗口，读数保持诚实：显示「—」而不是冻住最后那个数字
  fps.value = 0;
  if (resumeTimer !== null) clearTimeout(resumeTimer);
  resumeTimer = window.setTimeout(() => {
    resumeTimer = null;
    paused.value = false;
    startLoop();
  }, RESUME_DELAY_MS);
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
      estimatedSize: ROW_HEIGHT,
      fixedSize: true,
      renderItem: (item, _index, el) => {
        el.className = 'hero-demo-row';
        el.textContent = item.label;
      },
    },
    {
      update: (renderList) => {
        domCount.value = renderList.length;
      },
      /*
       * 谁动的滚动位置，库自己说得准（source 是确定的，不是靠比对上次写入值去猜）：
       * 'program' 是上面那个自动滚循环，'adjust' 是内部补偿（这里数据不变，不会有），
       * 只有 'user' 才是访客的滚轮 / 触摸 / 方向键 / 拖滑块。
       */
      scroll: (e) => {
        if (e.source !== 'user') return;
        // 以他停下的地方作为新起点，复跑时才不会跳回自动滚原来的进度
        offset = e.offset;
        pauseForUser();
      },
    },
  );

  const reduceMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  if (reduceMotion) return;

  /*
   * Home / End 走的是程序化路径（scrollToTop / scrollToBottom），派发的 scroll 事件
   * source 是 'program'，上面那个判定看不见它。容器 tabIndex 是 0，键盘确实够得着，
   * 所以补一个 keydown：多余的按键（Tab 之类）顶多让演示晚 1.6s 继续，而漏掉 End
   * 会让访客刚跳到的位置当场被自动滚抢走。
   */
  vList.clientEl.addEventListener('keydown', pauseForUser);

  autoScroll = true;
  startLoop();
});

onBeforeUnmount(() => {
  stopLoop();
  if (resumeTimer !== null) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }
  autoScroll = false;
  vList?.clientEl.removeEventListener('keydown', pauseForUser);
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
      <span>DOM 中的列表节点：<strong>{{ domCount }}</strong> 个</span>
      <span class="hero-demo-sep" aria-hidden="true">·</span>
      <!--
        暂停时明说一句，不要只让帧率变成「—」：那看着像演示卡住了。
        aria-live 让读屏用户也知道自动滚动是主动让位的，不是他碰坏了什么。
      -->
      <span v-if="paused" aria-live="polite">自动滚动<strong>已暂停</strong></span>
      <span v-else>实时帧率：<strong :class="{ 'is-smooth': fps >= 60 }">{{ fps || '—' }}</strong> fps</span>
    </div>
  </div>
</template>

<style scoped>
.hero-demo {
  /*
   * 行高与可视行数：容器高度由两者相乘得出，保证视口下边界恰好落在行的边界上，
   * 渲染窗口大小因此恒定（脚注的节点数不跳字）。--hero-row-h 与脚本里的
   * ROW_HEIGHT 是同一个值，改一处要改两处。
   */
  --hero-row-h: 40px;
  --hero-rows: 8;

  width: 100%;
  max-width: 420px;
  /* 桌面端靠右：让卡片右边缘与下方指标条 / 特性卡片的右边缘对齐 */
  margin: 0 0 0 auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--vt-radius-card);
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
  height: calc(var(--hero-row-h) * var(--hero-rows));
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
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  padding: 12px 18px 14px;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 用 text-3 而不是 divider 色：暗色主题下 divider 几乎看不见，那个点就白占位置了 */
.hero-demo-sep {
  color: var(--vp-c-text-3);
}

.hero-demo-foot strong {
  font-size: 14px;
  /* 等宽数字：帧率每 400ms 换一次，字宽不定的话整行会跟着左右挪 */
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
}

/*
 * 满帧（≥60）转绿：这是「跑得住」的信号，掉到 60 以下就退回普通文字色，
 * 读数于是自己会说话——不是写死的装饰数字。
 * 用 --vp-c-green-1 而不是写死色值：它在浅/深主题下分别是 #18794e / #3dd68c，
 * 两种底色上都读得清。
 */
.hero-demo-foot strong.is-smooth {
  color: #10b981;
}

@media (max-width: 960px) {
  .hero-demo {
    max-width: none;
    /* 窄屏矮一点，仍是行高的整数倍 */
    --hero-rows: 6;
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
  height: var(--hero-row-h);
  padding: 0 18px;
  box-sizing: border-box;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-2);
}
</style>
