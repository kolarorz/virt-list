import { VirtListDOM } from '@virt-list/dom';

const SENTENCES = [
  '虚拟列表是一种高性能的列表渲染方案，只渲染可视区域内的元素。',
  '通过动态计算每个元素的位置和大小，可以高效地处理海量数据。',
  '每一行的内容长度不同，高度也会随之变化，这正是动态高度虚拟列表的核心能力。',
  '当列表项的高度不固定时，需要在渲染后测量实际尺寸并更新位置信息。',
  '这段文本比较短。',
  '相比传统的全量渲染方式，虚拟列表可以将 DOM 节点数量控制在一个很小的范围内，从而大幅提升滚动性能和内存效率。即使数据量达到数十万条，滚动体验依然流畅。',
  '支持自动添加数据。',
  '滚动过程中，列表会根据当前的滚动位置计算出需要渲染的起始和结束索引，只创建必要的 DOM 节点。被移出可视区域的节点会被及时回收，避免内存泄漏。',
];

let uid = 0;

function generateList(count, startIndex = 0) {
  return Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const sentenceCount = (idx % 5) + 1;
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
      <label>添加数量：</label>
      <input type="number" id="addCount" value="1000" min="1" style="width:80px;" />
      <button class="virt-list-btn virt-list-btn-primary" id="btnAdd">手动添加</button>
      <button class="virt-list-btn virt-list-btn-success" id="btnAutoAdd">自动添加</button>
      <button class="virt-list-btn virt-list-btn-secondary" id="btnStop" style="display:none;">停止</button>
    </div>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapBasic(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const addCountInput = root.querySelector('#addCount');
  const btnAdd = root.querySelector('#btnAdd');
  const btnAutoAdd = root.querySelector('#btnAutoAdd');
  const btnStop = root.querySelector('#btnStop');

  let list = generateList(1000);
  let autoTimer = null;

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      buffer: 5,
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
      rangeUpdate: (begin, end) => {
        statsEl.textContent = `总数: ${list.length} | RenderBegin: ${begin} | RenderEnd: ${end}`;
      },
    },
  );

  statsEl.textContent = `总数: ${list.length}`;

  btnAdd.addEventListener('click', () => {
    const count = parseInt(addCountInput.value, 10) || 1000;
    const newItems = generateList(count, list.length);
    list = list.concat(newItems);
    virtList.setList(list);
    virtList.forceUpdate();
  });

  btnAutoAdd.addEventListener('click', () => {
    btnAutoAdd.style.display = 'none';
    btnStop.style.display = '';
    autoTimer = setInterval(() => {
      if (list.length >= 500000) {
        clearInterval(autoTimer);
        autoTimer = null;
        btnAutoAdd.style.display = '';
        btnStop.style.display = 'none';
        return;
      }
      const newItems = generateList(1000, list.length);
      list = list.concat(newItems);
      virtList.setList(list);
      virtList.forceUpdate();
    }, 100);
  });

  btnStop.addEventListener('click', () => {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    btnAutoAdd.style.display = '';
    btnStop.style.display = 'none';
  });

  return () => {
    if (autoTimer) clearInterval(autoTimer);
    virtList.destroy();
    root.innerHTML = '';
  };
}
