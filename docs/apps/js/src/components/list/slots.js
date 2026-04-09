import { VirtListDOM } from '@virt-list/dom';

const SENTENCES = [
  '插槽示例展示了 stickyHeader、header、footer、stickyFooter 四种插槽的使用方法。',
  '短行。',
  'Sticky 插槽会固定在滚动容器的顶部或底部，不会随内容一起滚动。这在需要展示固定表头或固定操作栏的场景中非常实用。',
  '普通 header 和 footer 会随列表内容一起滚动。',
  '每一行的高度各不相同，这是因为文本内容的长度不同导致自然换行。虚拟列表会在渲染后准确测量每个元素的尺寸，从而保证滚动行为的正确性。',
];

function generateList(count) {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 4) + 1;
    const parts = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}

function createSlotEl(text, style) {
  const el = document.createElement('div');
  el.textContent = text;
  Object.assign(el.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#fff',
  });
  if (style) Object.assign(el.style, style);
  return el;
}

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapSlots(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(1000);

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      buffer: 2,
      stickyHeaderStyle: 'background:#2e8b57;height:50px;',
      renderStickyHeader: () => createSlotEl('Sticky Header（固定头部）'),
      renderHeader: () =>
        createSlotEl('Header（头部）', {
          background: '#3cb371',
          height: '40px',
        }),
      renderFooter: () =>
        createSlotEl('Footer（尾部）', {
          background: '#20b2aa',
          height: '40px',
        }),
      stickyFooterStyle: 'background:#008b8b;height:50px;',
      renderStickyFooter: () => createSlotEl('Sticky Footer（固定底部）'),
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

  statsEl.textContent = `总数: ${list.length} | 含 Sticky/Header/Footer 插槽`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
