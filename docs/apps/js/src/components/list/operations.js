import { VirtListDOM } from '@virt-list/dom';

const SENTENCES = [
  '使用 scrollToIndex 可以精确跳转到指定索引的位置。',
  '使用 scrollToOffset 可以跳转到指定的像素偏移量。',
  '这行内容较短。',
  'scrollIntoView 会将目标元素滚动到可视区域内，如果已经在可视区域则不会滚动。这个 API 在需要确保某个元素可见时非常有用。',
  '滚动到顶部和底部是最常见的操作。',
  '虚拟列表支持多种滚动定位方式，可以根据不同的业务场景选择最合适的 API。所有的滚动操作都是平滑的，不会出现跳动或闪烁。',
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
        <label>scrollToOffset</label>
        <input type="number" id="offsetInput" value="1000" min="0" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnOffset">跳转</button>
      </div>
      <div class="virt-list-control-group">
        <label>scrollToIndex</label>
        <input type="number" id="indexInput" value="500" min="0" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnIndex">跳转</button>
      </div>
      <div class="virt-list-control-group">
        <label>scrollIntoView</label>
        <input type="number" id="intoViewInput" value="100" min="0" />
        <button class="virt-list-btn virt-list-btn-success" id="btnIntoView">跳转</button>
        <div style="display:flex;gap:4px;margin-top:4px;">
          <button class="virt-list-btn virt-list-btn-success" id="btnPrev" style="font-size:10px;padding:4px 8px;">Prev</button>
          <button class="virt-list-btn virt-list-btn-success" id="btnNext" style="font-size:10px;padding:4px 8px;">Next</button>
        </div>
      </div>
    </div>
    <div class="demo-toolbar" style="margin-top:4px;">
      <button class="virt-list-btn virt-list-btn-primary" id="btnTop">scrollToTop</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnBottom">scrollToBottom</button>
    </div>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapOperations(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(2000);

  const virtList = new VirtListDOM(
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
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = `总数: ${list.length} | RenderBegin: ${begin} | RenderEnd: ${end}`;
      },
    },
  );

  const getVal = (id) => parseInt(root.querySelector(`#${id}`).value, 10);
  const setVal = (id, val) => {
    root.querySelector(`#${id}`).value = String(val);
  };

  root.querySelector('#btnOffset').addEventListener('click', () => {
    virtList.scrollToOffset(getVal('offsetInput'));
  });
  root.querySelector('#btnIndex').addEventListener('click', () => {
    virtList.scrollToIndex(getVal('indexInput'));
  });
  root.querySelector('#btnIntoView').addEventListener('click', () => {
    virtList.scrollIntoView(getVal('intoViewInput'));
  });
  root.querySelector('#btnPrev').addEventListener('click', () => {
    const cur = getVal('intoViewInput');
    const next = Math.max(0, cur - 1);
    setVal('intoViewInput', next);
    virtList.scrollIntoView(next);
  });
  root.querySelector('#btnNext').addEventListener('click', () => {
    const cur = getVal('intoViewInput');
    const next = Math.min(list.length - 1, cur + 1);
    setVal('intoViewInput', next);
    virtList.scrollIntoView(next);
  });
  root.querySelector('#btnTop').addEventListener('click', () => {
    virtList.scrollToTop();
  });
  root.querySelector('#btnBottom').addEventListener('click', () => {
    virtList.scrollToBottom();
  });

  statsEl.textContent = `总数: ${list.length}`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
