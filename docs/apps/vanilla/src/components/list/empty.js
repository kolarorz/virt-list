import { VirtList } from '@virt-list/vanilla';

const SENTENCES = [
  '虚拟列表是一种高性能的列表渲染方案，只渲染可视区域内的元素。',
  '通过动态计算每个元素的位置和大小，可以高效地处理海量数据。',
  '每一行的内容长度不同，高度也会随之变化，这正是动态高度虚拟列表的核心能力。',
  '当列表项的高度不固定时，需要在渲染后测量实际尺寸并更新位置信息。',
  '这段文本比较短。',
];

let uid = 0;

function generateList(count, startIndex = 0) {
  return Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const sentenceCount = (idx % 4) + 1;
    const parts = [];
    for (let s = 0; s < sentenceCount; s++) {
      parts.push(SENTENCES[(idx + s * 3) % SENTENCES.length]);
    }
    return {
      id: uid++,
      index: idx,
      text: parts.join(' '),
    };
  });
}

const template = `
  <div class="demo-panel">
    <div class="demo-toolbar">
      <button class="virt-list-btn virt-list-btn-primary" id="btnToggle">切换为空列表</button>
    </div>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapEmpty(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const btnToggle = root.querySelector('#btnToggle');

  let list = [];
  let isEmpty = true;

  const virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-row-item';
        row.innerHTML = `
          <span class="demo-row-index">#${item.index}</span>
          <span class="demo-row-text">${item.text}</span>
        `;
        return row;
      },
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.cssText =
          'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#999;';
        el.innerHTML = `
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5z"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
          <p style="margin-top:12px;font-size:14px;">暂无数据</p>
        `;
        return el;
      },
    },
    {
      update: (_, state) => {
        statsEl.textContent = `总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
      },
    },
  );

  statsEl.textContent = `总数: ${list.length}`;

  btnToggle.addEventListener('click', () => {
    if (isEmpty) {
      list = generateList(1000);
      btnToggle.textContent = '切换为空列表';
    } else {
      list = [];
      btnToggle.textContent = '切换为有数据列表';
    }
    isEmpty = !isEmpty;
    virtList.setList(list);
    virtList.forceUpdate();
    statsEl.textContent = `总数: ${list.length}`;
  });

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
