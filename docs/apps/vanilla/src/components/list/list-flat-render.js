import { VirtList } from '@virt-list/vanilla';

const SENTENCES = [
  '使用 el 回调模式可以直接操作 item wrapper，减少一层 DOM 嵌套。',
  '短行。',
  '传统方式需要创建一个额外的包裹元素再返回，而 el 回调模式下子元素直接挂载到 item wrapper 上，DOM 结构更扁平。',
  '这对于表格行、高频滚动等对 DOM 层级敏感的场景尤其有用。',
  '所有 render 函数（renderItem、renderHeader、renderFooter、renderStickyHeader、renderStickyFooter）均支持两种用法：返回元素（传统）或操作 el（扁平）。',
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

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapFlatRender(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(1000);

  const virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      buffer: 2,
      stickyHeaderStyle:
        'display: flex; align-items: center; justify-content: center; height: 50px; background: #2e8b57;',
      // 扁平模式：直接操作 el，不返回元素
      renderStickyHeader: (el) => {
        el.textContent = 'Sticky Header (固定头部)';
      },
      headerStyle:
        'display: flex; align-items: center; justify-content: center; height: 40px; background: #3cb371;',
      renderHeader: (el) => {
        el.textContent = 'Header (头部)';
      },
      footerStyle:
        'display: flex; align-items: center; justify-content: center; height: 40px; background: #20b2aa;',
      renderFooter: (el) => {
        el.textContent = 'Footer (尾部)';
      },
      stickyFooterStyle:
        'display: flex; align-items: center; justify-content: center; height: 50px; background: #008b8b;',
      renderStickyFooter: (el) => {
        el.textContent = 'Sticky Footer (固定底部)';
      },
      // 扁平模式：子元素直接挂到 item wrapper 上，少一层 <div>
      renderItem: (item, index, el) => {
        el.className = 'demo-row-item';
        el.innerHTML = `
          <span class="demo-row-index">#${item.index}</span>
          <span class="demo-row-text">${item.text}</span>
        `;
      },
    },
    {
      update: (_, state) => {
        statsEl.textContent = `总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`;
      },
    },
  );

  statsEl.textContent = `总数: ${list.length} | 扁平渲染模式`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
