import { VirtList } from '@virt-list/vanilla';

// demo:fold 示例数据构造：SENTENCES、generateList()
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
    for (let s = 0; s < n; s++)
      parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}
// /demo:fold

/** 四个插槽共用一套排版，只有色带和文案不同 */
function createBand(variant, tag, text, note) {
  const el = document.createElement('div');
  el.className = `demo-band demo-band--${variant}`;
  el.innerHTML = `
    <span class="demo-band__tag">${tag}</span>
    <span class="demo-band__text">${text}</span>
    <span class="demo-band__note">${note}</span>
  `;
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

  const virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderStickyHeader: () =>
        createBand(
          'sticky-header',
          'stickyHeader',
          '固定头部',
          '吸在容器顶部，不随内容滚动',
        ),
      renderHeader: () =>
        createBand('header', 'header', '头部', '排在第一项之前，随内容一起滚动'),
      renderFooter: () =>
        createBand('footer', 'footer', '尾部', '排在最后一项之后，随内容一起滚动'),
      renderStickyFooter: () =>
        createBand(
          'sticky-footer',
          'stickyFooter',
          '固定底部',
          '吸在容器底部，不随内容滚动',
        ),
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

  statsEl.textContent = `总数: ${list.length} | 含 Sticky/Header/Footer 插槽`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
