import { VirtListDOM } from '@virt-list/dom';

const template = `
  <div class="demo-panel">
    <div class="demo-toolbar">
      <button class="virt-list-btn virt-list-btn-secondary" id="btnLoad">生成 30w 数据</button>
      <span id="loadStatus" style="font-size:12px;color:#666;"></span>
    </div>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer">
      <div id="emptyHint" style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">
        点击按钮生成海量数据
      </div>
    </div>
  </div>
`;

export function bootstrapHugeData(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const btnLoad = root.querySelector('#btnLoad');
  const loadStatus = root.querySelector('#loadStatus');
  const emptyHint = root.querySelector('#emptyHint');

  let virtList = null;

  btnLoad.addEventListener('click', () => {
    btnLoad.disabled = true;
    loadStatus.textContent = '正在生成数据...';
    emptyHint.textContent = '数据生成中...';

    setTimeout(() => {
      const hugeTexts = [
        '海量数据测试行。',
        '虚拟列表在处理大量数据时依然保持流畅的滚动体验，DOM 节点数量始终维持在较低水平。',
        '这一行的内容比较短。',
        '通过增量式的 DOM 更新策略，虚拟列表避免了一次性创建大量节点所带来的性能瓶颈。即使数据量达到数十万条，首屏渲染速度和滚动帧率都不会受到明显影响。这是传统列表渲染方式无法做到的。',
        '数据量越大，虚拟列表相对于全量渲染的性能优势越明显。',
      ];
      const list = [];
      for (let i = 0; i < 300000; i++) {
        const n = (i % 4) + 1;
        const parts = [];
        for (let s = 0; s < n; s++) parts.push(hugeTexts[(i + s * 2) % hugeTexts.length]);
        list.push({ id: i, index: i, text: parts.join(' ') });
      }

      emptyHint.remove();
      loadStatus.textContent = `已生成 ${list.length.toLocaleString()} 条数据`;

      virtList = new VirtListDOM(
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
            statsEl.textContent = `总数: ${list.length.toLocaleString()} | RenderBegin: ${begin} | RenderEnd: ${end}`;
          },
        },
      );

      statsEl.textContent = `总数: ${list.length.toLocaleString()}`;
    }, 50);
  });

  return () => {
    if (virtList) virtList.destroy();
    root.innerHTML = '';
  };
}
