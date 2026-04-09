import { VirtListDOM } from '@virt-list/dom';

function generateList(count) {
  const texts = [
    '短文本。',
    '这是一段中等长度的文本内容，用来展示可变高度的虚拟列表项。',
    '这是一段比较长的文本内容，用来展示可变高度的虚拟列表项。每一行的高度都不同，虚拟列表需要动态计算每个元素的实际高度，以确保滚动位置的准确性。这是虚拟列表最核心的功能之一。',
    '极短',
    '这段文本的长度适中。它既不太短也不太长，但足以让虚拟列表检测到与其他行不同的高度。动态高度列表相比固定高度列表需要更多的计算，但它提供了更灵活的内容展示方式。可以在这里输入任意内容来改变行高。',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    index: i,
    text: texts[i % texts.length],
  }));
}

const template = `
  <div class="demo-panel">
    <div style="margin-bottom:8px;font-size:12px;color:#888;">提示：点击内容区域可以直接编辑文本，行高会自动适应。</div>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapDynamic(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(200);

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 20,
      buffer: 5,
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-row-item demo-dynamic-row';

        const idx = document.createElement('span');
        idx.className = 'demo-row-index';
        idx.textContent = `#${item.index}`;

        const editor = document.createElement('div');
        editor.className = 'demo-editable';
        editor.contentEditable = 'true';
        editor.textContent = item.text;
        editor.addEventListener('input', () => {
          item.text = editor.textContent || '';
        });

        row.appendChild(idx);
        row.appendChild(editor);
        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = `总数: ${list.length} | RenderBegin: ${begin} | RenderEnd: ${end}`;
      },
    },
  );

  statsEl.textContent = `总数: ${list.length} | 可变高度 + 可编辑`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
