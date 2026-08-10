import { VirtList } from '@virt-list/vanilla';
import '@virt-list/vanilla/src/scrollbar/scrollbar.css';

/**
 * 数据规模刻意选在**超过浏览器元素高度上限**的量级。
 *
 * Chrome 实测上限为 33,554,428px（2^25）。靠占位元素撑开滚动空间的做法，
 * 超过上限的部分会被浏览器直接截掉，尾部的项永远滚不到。
 * 本库让每一段只带自己的残差 transform，没有任何一个位移携带完整量级，
 * 所以这条线不存在（1 亿 px 处实测定位误差 0px）。
 *
 * 左侧的对照组是**手写的裸 DOM**（一个 overflow:auto 容器 + 一个高占位元素），
 * 不走本库的任何代码路径——库里已经没有原生滚动这条路了。
 */
const COUNT = 500000;
const ROW = 100;
const TOTAL = COUNT * ROW;
const CHROME_LIMIT = 33554428;

const template = `
  <div class="demo-panel">
    <div class="demo-toolbar">
      <button class="virt-list-btn virt-list-btn-secondary" id="btnLoad">生成 50w 数据</button>
      <button class="virt-list-btn" id="btnBottom" disabled>两侧同时滚到底</button>
    </div>
    <div class="demo-stats" id="hint">
      50w × ${ROW}px = ${TOTAL.toLocaleString()}px，超过 Chrome 的元素高度上限
      ${CHROME_LIMIT.toLocaleString()}px（2<sup>25</sup>）
    </div>
    <div style="display:flex;gap:12px;">
      <div style="flex:1;min-width:0;">
        <div class="demo-stats" id="statsNaive">对照组：占位元素撑开滚动空间</div>
        <div class="demo-list-container" id="hostNaive"></div>
      </div>
      <div style="flex:1;min-width:0;">
        <div class="demo-stats" id="statsVirt">本库：transform 定位</div>
        <div class="demo-list-container" id="hostVirt"></div>
      </div>
    </div>
  </div>
`;

function renderItem(item, _index, el) {
  el.className = 'demo-row-item';
  el.style.height = `${ROW}px`;
  el.innerHTML = `
    <span class="demo-row-index">#${item.index}</span>
    <span class="demo-row-text">第 ${item.index.toLocaleString()} 项</span>
  `;
}

/**
 * 对照组：最朴素的"占位元素撑开滚动空间"写法。
 *
 * 只渲染视口内的行，位置靠 top 定位——和绝大多数虚拟列表的做法一样。
 * 关键点只有一个：spacer 的高度等于内容总高，于是撞上浏览器的元素高度上限。
 */
function mountNaive(host) {
  host.style.overflow = 'auto';
  host.style.position = 'relative';

  const spacer = document.createElement('div');
  spacer.style.height = `${TOTAL}px`;
  spacer.style.position = 'relative';
  host.appendChild(spacer);

  const render = () => {
    const top = host.scrollTop;
    const height = host.clientHeight || 400;
    const begin = Math.floor(top / ROW);
    const end = Math.min(COUNT - 1, Math.ceil((top + height) / ROW));

    spacer.textContent = '';
    for (let i = begin; i <= end; i++) {
      const row = document.createElement('div');
      row.style.cssText =
        `position:absolute;left:0;right:0;top:${i * ROW}px;height:${ROW}px;`;
      renderItem({ index: i }, i, row);
      spacer.appendChild(row);
    }
    return { begin, end };
  };

  host.addEventListener('scroll', render);
  render();
  return {
    render,
    /** 浏览器实际认下来的可滚动高度 —— 超上限的部分已经被截掉了 */
    scrollHeight: () => host.scrollHeight,
    reachedIndex: () => render().end,
    scrollToBottom: () => {
      host.scrollTop = host.scrollHeight;
      render();
    },
    destroy: () => {
      host.removeEventListener('scroll', render);
      host.innerHTML = '';
    },
  };
}

function createStats(el, title, read) {
  let fps = 0;
  let last = performance.now();
  let rafId = null;

  const tick = () => {
    const now = performance.now();
    const dt = now - last;
    last = now;
    if (dt > 0) fps = fps ? fps * 0.9 + (1000 / dt) * 0.1 : 1000 / dt;

    const { sizeInfo, reached } = read();
    const missing = COUNT - 1 - reached;
    el.innerHTML =
      `<b>${title}</b> | FPS ${fps.toFixed(0)} | ${sizeInfo}` +
      ` | 当前可见到第 ${reached.toLocaleString()} 项` +
      (missing > 0
        ? ` <span style="color:#d33">尾部 ${missing.toLocaleString()} 项不可达</span>`
        : ' <span style="color:#2a2">✓ 已达末项</span>');

    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => rafId !== null && cancelAnimationFrame(rafId);
}

export function bootstrapScrollbar(root) {
  root.innerHTML = template;

  const btnLoad = root.querySelector('#btnLoad');
  const btnBottom = root.querySelector('#btnBottom');
  const hostNaive = root.querySelector('#hostNaive');
  const hostVirt = root.querySelector('#hostVirt');
  const statsNaive = root.querySelector('#statsNaive');
  const statsVirt = root.querySelector('#statsVirt');

  let naive = null;
  let virt = null;
  const stoppers = [];

  btnBottom.addEventListener('click', () => {
    naive?.scrollToBottom();
    virt?.scrollToBottom();
  });

  btnLoad.addEventListener('click', () => {
    btnLoad.disabled = true;

    setTimeout(() => {
      naive = mountNaive(hostNaive);

      virt = new VirtList(hostVirt, {
        list: Array.from({ length: COUNT }, (_, i) => ({ id: i, index: i })),
        itemKey: 'id',
        itemPreSize: ROW,
        fixed: true,
        buffer: 2,
        // 对比 demo 里让滚动条常驻，方便直接抓住拖拽
        scrollbarAutoHide: 0,
        renderItem,
      });

      stoppers.push(
        createStats(statsNaive, '占位元素', () => {
          const sh = naive.scrollHeight();
          const truncated = TOTAL - sh;
          return {
            sizeInfo:
              `占位元素 ${sh.toLocaleString()}px` +
              (truncated > 1
                ? ` <span style="color:#d33">被浏览器截掉 ${truncated.toLocaleString()}px</span>`
                : ''),
            reached: naive.reachedIndex(),
          };
        }),
        createStats(statsVirt, 'transform', () => ({
          sizeInfo: '不需要占位元素（最高的元素只有一屏）',
          reached: virt.core.state.inViewEnd,
        })),
      );

      btnBottom.disabled = false;
    }, 50);
  });

  return () => {
    for (const stop of stoppers) stop();
    naive?.destroy();
    virt?.destroy();
    root.innerHTML = '';
  };
}
