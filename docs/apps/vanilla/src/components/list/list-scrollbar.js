import { VirtList } from '@virt-list/vanilla';
import '@virt-list/vanilla/src/scrollbar/scrollbar.css';

/**
 * 数据规模刻意选在**超过浏览器元素高度上限**的量级。
 *
 * Chrome 实测上限为 33,554,428px（2^25）：native 模式靠占位元素撑开滚动空间，
 * 超过上限的部分会被浏览器直接截掉，尾部的项永远滚不到。
 * custom 模式不需要占位元素，最高的元素只有一屏，因此不受这个上限约束。
 */
const COUNT = 500000;
const ROW = 100;
const CHROME_LIMIT = 33554428;

const template = `
  <div class="demo-panel">
    <div class="demo-toolbar">
      <button class="virt-list-btn virt-list-btn-secondary" id="btnLoad">生成 50w 数据</button>
      <button class="virt-list-btn" id="btnBottom" disabled>两侧同时滚到底</button>
      <button class="virt-list-btn" id="btnReset" disabled>重置统计</button>
    </div>
    <div class="demo-stats" id="hint">
      50w × ${ROW}px = ${(COUNT * ROW).toLocaleString()}px，超过 Chrome 的元素高度上限
      ${CHROME_LIMIT.toLocaleString()}px（2<sup>25</sup>）
    </div>
    <div style="display:flex;gap:12px;">
      <div style="flex:1;min-width:0;">
        <div class="demo-stats" id="statsNative">native</div>
        <div class="demo-list-container" id="hostNative"></div>
      </div>
      <div style="flex:1;min-width:0;">
        <div class="demo-stats" id="statsCustom">custom</div>
        <div class="demo-list-container" id="hostCustom"></div>
      </div>
    </div>
  </div>
`;

function makeList(n) {
  const list = [];
  for (let i = 0; i < n; i++) list.push({ id: i, index: i });
  return list;
}

function renderItem(item, _index, el) {
  el.className = 'demo-row-item';
  el.style.height = `${ROW}px`;
  el.innerHTML = `
    <span class="demo-row-index">#${item.index}</span>
    <span class="demo-row-text">第 ${item.index.toLocaleString()} 项</span>
  `;
}

/**
 * 统计面板。
 *
 * 这里刻意**不**统计"露白帧"：露白发生在「合成器已经呈现、主线程还没跟上」
 * 的那一帧里，而任何跑在主线程 rAF 里的探针都只能看到已经处理完 scroll 事件
 * 之后的状态——测出来永远是 0，是个假指标。想看露白只能肉眼观察或用 DevTools
 * 的 Performance 面板逐帧回看。
 *
 * 能客观测量的是**可达性**：尾部的项到底还能不能滚到。
 */
function createStats(vl, el, title, scrollEl) {
  let fps = 0;
  let last = performance.now();
  let rafId = null;

  const tick = () => {
    const now = performance.now();
    const dt = now - last;
    last = now;
    if (dt > 0) fps = fps ? fps * 0.9 + (1000 / dt) * 0.1 : 1000 / dt;

    const core = vl.core;
    const reached = core.state.inViewEnd;
    const missing = COUNT - 1 - reached;

    let sizeInfo;
    if (vl.isCustomScrollbar) {
      // custom 没有占位元素，scrollHeight 只有一屏——这是设计如此，不是被截断
      sizeInfo = '不需要占位元素（最高的元素只有一屏）';
    } else {
      const sh = scrollEl.scrollHeight;
      const truncated = COUNT * ROW - sh;
      sizeInfo =
        `占位元素 ${sh.toLocaleString()}px` +
        (truncated > 1
          ? ` <span style="color:#d33">被浏览器截掉 ${truncated.toLocaleString()}px</span>`
          : '');
    }

    el.innerHTML =
      `<b>${title}</b> | FPS ${fps.toFixed(0)} | ${sizeInfo}` +
      ` | 当前可见到第 ${reached.toLocaleString()} 项` +
      (missing > 0
        ? ` <span style="color:#d33">尾部 ${missing.toLocaleString()} 项不可达</span>`
        : ' <span style="color:#2a2">✓ 已达末项</span>');

    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    reset() {
      fps = 0;
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
  };
}

export function bootstrapScrollbar(root) {
  root.innerHTML = template;

  const btnLoad = root.querySelector('#btnLoad');
  const btnBottom = root.querySelector('#btnBottom');
  const btnReset = root.querySelector('#btnReset');
  const hostNative = root.querySelector('#hostNative');
  const hostCustom = root.querySelector('#hostCustom');
  const statsNative = root.querySelector('#statsNative');
  const statsCustom = root.querySelector('#statsCustom');

  const lists = [];
  const stats = [];

  btnBottom.addEventListener('click', () => {
    for (const vl of lists) vl.scrollToBottom();
  });
  btnReset.addEventListener('click', () => {
    for (const s of stats) s.reset();
  });

  btnLoad.addEventListener('click', () => {
    btnLoad.disabled = true;

    setTimeout(() => {
      // 两侧共用同一个数组，对比的是滚动机制而不是数据规模
      const list = makeList(COUNT);
      const base = {
        list,
        itemKey: 'id',
        itemPreSize: ROW,
        fixed: true,
        buffer: 2,
        renderItem,
      };

      const nativeList = new VirtList(hostNative, { ...base });
      const customList = new VirtList(hostCustom, {
        ...base,
        scrollbar: 'custom',
        // 对比 demo 里让滚动条常驻，方便直接抓住拖拽
        scrollbarAutoHide: 0,
      });
      lists.push(nativeList, customList);

      stats.push(
        createStats(nativeList, statsNative, 'native', nativeList.clientEl),
        createStats(customList, statsCustom, 'custom', customList.clientEl),
      );

      btnBottom.disabled = false;
      btnReset.disabled = false;
    }, 50);
  });

  return () => {
    for (const s of stats) s.stop();
    for (const vl of lists) vl.destroy();
    root.innerHTML = '';
  };
}
