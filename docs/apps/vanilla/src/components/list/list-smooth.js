import { VirtList } from '@virt-list/vanilla';

/** 不限制逐帧穿越距离（会露白，用于对比） */
const NO_LIMIT = Infinity;

const SENTENCES = [
  '平滑滚动通过 behavior: "smooth" 开启，不传参数时保持瞬时跳转。',
  '这一行比较短。',
  'duration 控制动画时长，也可以通过配置项 scrollDuration 设置默认值。动画使用 requestAnimationFrame 实现，每一帧都会重新计算目标位置，所以不定高列表在滚动途中撑开高度也不会跑偏。',
  'onDone 回调会告诉你动画是正常结束还是被中断。',
  '虚拟列表的滚动定位 API 都支持这个可选参数：scrollToIndex、scrollIntoView、scrollToTop、scrollToBottom、scrollToOffset。',
];

function generateList(count) {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 4) + 1;
    const parts = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}

const template = `
  <div class="demo-panel">
    <div class="demo-toolbar">
      <div class="virt-list-control-group">
        <label>behavior</label>
        <select id="behavior">
          <option value="auto">auto（瞬时跳转）</option>
          <option value="smooth" selected>smooth（平滑动画）</option>
        </select>
      </div>
      <div class="virt-list-control-group">
        <label>duration (ms)</label>
        <input type="number" id="durationInput" value="300" min="0" step="100" />
      </div>
      <div class="virt-list-control-group">
        <label>逐帧穿越距离</label>
        <select id="maxDistance">
          <option value="0" selected>自动（两屏，推荐）</option>
          <option value="400">400px（约一屏）</option>
          <option value="2000">2000px</option>
          <option value="Infinity">不限制（会露白）</option>
        </select>
      </div>
      <div class="virt-list-control-group">
        <label>scrollToIndex</label>
        <input type="number" id="indexInput" value="1500" min="0" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnIndex">跳转</button>
      </div>
      <div class="virt-list-control-group">
        <label>scrollToOffset</label>
        <input type="number" id="offsetInput" value="8000" min="0" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnOffset">跳转</button>
      </div>
    </div>
    <div class="demo-toolbar" style="margin-top:4px;">
      <button class="virt-list-btn virt-list-btn-primary" id="btnTop">scrollToTop</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnBottom">scrollToBottom</button>
      <button class="virt-list-btn virt-list-btn-success" id="btnIntoView">scrollIntoView</button>
      <button class="virt-list-btn virt-list-btn-warning" id="btnCancel">cancelScroll</button>
    </div>
    <div id="stats" class="demo-stats"></div>
    <div id="done" class="demo-stats" style="min-height:20px;"></div>
    <p class="demo-hint">
      提示：平滑滚动进行中，滚动鼠标滚轮或触摸滑动会立即接管（onDone 收到 canceled = true）；
      发起新的滚动调用或点击 cancelScroll 同样会中断动画。<br />
      「逐帧穿越距离」控制动画真正逐帧滚过多长的距离，超出部分会先瞬跳掉。把它切成「不限制」，
      再跳到 index 1500，就能看到虚拟列表逐帧穿越长距离时的露白 —— 中间那几十屏内容根本来不及渲染，
      也没有观看价值，所以默认只逐帧滚最后两屏。
    </p>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapSmooth(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const doneEl = root.querySelector('#done');
  const list = generateList(2000);

  const virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      buffer: 2,
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-row-item';
        row.innerHTML = `
          <span class="demo-row-index">#${item.index}</span>
          <span class="demo-row-text">${item.text}</span>
        `;
        return row;
      },
    },
    {
      update: (_, state) => {
        statsEl.textContent = `总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
      },
    },
  );

  const getVal = (id) => parseInt(root.querySelector(`#${id}`).value, 10);

  /** 组装本次调用的滚动参数，并把 onDone 结果打到界面上 */
  function scrollOptions(label) {
    doneEl.textContent = `${label} 执行中...`;
    const rawMax = root.querySelector('#maxDistance').value;
    return {
      behavior: root.querySelector('#behavior').value,
      duration: getVal('durationInput'),
      maxDistance: rawMax === 'Infinity' ? NO_LIMIT : Number(rawMax),
      onDone: (canceled) => {
        doneEl.textContent = canceled
          ? `${label} 被中断（onDone: canceled = true）`
          : `${label} 已完成（onDone: canceled = false）`;
      },
    };
  }

  root.querySelector('#btnIndex').addEventListener('click', () => {
    const index = getVal('indexInput');
    virtList.scrollToIndex(index, scrollOptions(`scrollToIndex(${index})`));
  });
  root.querySelector('#btnOffset').addEventListener('click', () => {
    const offset = getVal('offsetInput');
    virtList.scrollToOffset(offset, scrollOptions(`scrollToOffset(${offset})`));
  });
  root.querySelector('#btnIntoView').addEventListener('click', () => {
    const index = getVal('indexInput');
    virtList.scrollIntoView(index, scrollOptions(`scrollIntoView(${index})`));
  });
  root.querySelector('#btnTop').addEventListener('click', () => {
    virtList.scrollToTop(scrollOptions('scrollToTop'));
  });
  root.querySelector('#btnBottom').addEventListener('click', () => {
    virtList.scrollToBottom(scrollOptions('scrollToBottom'));
  });
  root.querySelector('#btnCancel').addEventListener('click', () => {
    virtList.cancelScroll();
  });

  statsEl.textContent = `总数: ${list.length}`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
