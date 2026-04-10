(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))t(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&t(o)}).observe(document,{childList:!0,subtree:!0});function n(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function t(i){if(i.ep)return;i.ep=!0;const r=n(i);fetch(i.href,r)}})();const aa=`import { faker } from '@faker-js/faker';
import { VirtGridDOM } from '@virt-list/dom';

function generateData(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: faker.string.nanoid(),
    index: i,
    avatar: faker.image.avatar(),
    name: faker.person.firstName(),
  }));
}

const template = \`
  <div class="virt-grid-demo">
    <div class="virt-grid-controls">
      <span>gridItems:</span>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid2">2</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid3">3</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid4">4</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid5">5</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid6">6</button>
    </div>
    <div id="status" class="status-text"></div>
    <div class="virt-grid-container" id="gridContainer"></div>
  </div>
\`;

export function bootstrapVirtGrid(root) {
  root.innerHTML = template;

  const container = root.querySelector('#gridContainer');
  const status = root.querySelector('#status');
  const list = generateData(1000);
  const listeners = [];

  const grid = new VirtGridDOM(container, {
    list,
    gridItems: 2,
    itemKey: 'id',
    itemPreSize: 70,
    renderCell: (item, index, rowIndex) => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.innerHTML = \`
        <div>
          <div style="font-size:12px;color:#999;">row:\${rowIndex} - item:\${index}</div>
          <div style="display:flex;align-items:center;">
            <img src="\${item.avatar}" style="width:40px;height:40px;border-radius:50%;" />
            <span style="margin-left:6px;">\${item.name}</span>
          </div>
        </div>
        <button class="grid-delete-btn" data-id="\${item.id}">delete</button>
      \`;

      const deleteBtn = cell.querySelector('.grid-delete-btn');
      deleteBtn.addEventListener('click', () => {
        const idx = list.findIndex((v) => v.id === item.id);
        if (idx > -1) {
          list.splice(idx, 1);
          grid.setList(list);
          status.textContent = \`已删除 item \${index}，剩余 \${list.length} 项\`;
        }
      });
      return cell;
    },
  }, {
    toTop: () => {
      status.textContent = '已滚动到顶部';
    },
  });

  const on = (id, handler) => {
    const el = root.querySelector(\`#\${id}\`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  [2, 3, 4, 5, 6].forEach((n) => {
    on(\`btnGrid\${n}\`, () => {
      grid.setGridItems(n);
      status.textContent = \`gridItems 已设为 \${n}\`;
    });
  });

  status.textContent = '网格示例已就绪：1000 项数据，2 列';

  return () => {
    grid.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
`,na=`import { VirtListDOM } from '@virt-list/dom';

const COLUMNS = [
  { key: 'id', title: 'ID', width: 60 },
  { key: 'name', title: '姓名', width: 100 },
  { key: 'age', title: '年龄', width: 60 },
  { key: 'address', title: '地址', width: 200 },
  { key: 'desc1', title: '描述1', width: 300 },
  { key: 'desc2', title: '描述2', width: 300 },
  { key: 'desc3', title: '描述3', width: 300 },
];

function generateList(count) {
  const addresses = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: \`用户_\${i}\`,
    age: 20 + (i % 40),
    address: addresses[i % addresses.length],
    desc1: \`描述信息 \${i}-A\`,
    desc2: \`描述信息 \${i}-B\`,
    desc3: \`描述信息 \${i}-C\`,
    rowSpan: i < 2 ? 2 : 1,
  }));
}

function createTableCell(text, width, extra) {
  const cell = document.createElement('div');
  cell.className = 'demo-adv-cell';
  cell.style.width = \`\${width}px\`;
  cell.style.minWidth = \`\${width}px\`;
  cell.textContent = text;
  if (extra) Object.assign(cell.style, extra);
  return cell;
}

const template = \`
  <div class="demo-panel">
    <p style="font-size:12px;color:#888;margin-bottom:8px;">
      高阶用法：展示类似表格的渲染，包含 sticky 列头和多列数据。前两行进行了合并展示。
    </p>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
\`;

export function bootstrapAdvanced(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(100);

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      stickyHeaderStyle: 'background:#f5f5f5;',
      renderStickyHeader: () => {
        const header = document.createElement('div');
        header.className = 'demo-table-row demo-table-header';
        header.style.minWidth = 'min-content';
        for (const col of COLUMNS) {
          header.appendChild(
            createTableCell(col.title, col.width, {
              fontWeight: 'bold',
              background: '#e8e8e8',
            }),
          );
        }
        return header;
      },
      renderItem: (item, index) => {
        const row = document.createElement('div');
        row.className = 'demo-table-row';
        row.style.minWidth = 'min-content';

        if (index === 0) {
          const mergedCell = createTableCell(\`合并行 (ID: \${item.id} & \${item.id + 1})\`, COLUMNS[0].width + COLUMNS[1].width, {
            minWidth: \`\${COLUMNS[0].width + COLUMNS[1].width}px\`,
            background: '#fffbe6',
            fontWeight: 'bold',
          });
          row.appendChild(mergedCell);
          for (let c = 2; c < COLUMNS.length; c++) {
            row.appendChild(createTableCell(String(item[COLUMNS[c].key]), COLUMNS[c].width));
          }
        } else if (index === 1) {
          const mergedCell = createTableCell(\`(续) ID: \${item.id}\`, COLUMNS[0].width + COLUMNS[1].width, {
            minWidth: \`\${COLUMNS[0].width + COLUMNS[1].width}px\`,
            background: '#fffbe6',
          });
          row.appendChild(mergedCell);
          for (let c = 2; c < COLUMNS.length; c++) {
            row.appendChild(createTableCell(String(item[COLUMNS[c].key]), COLUMNS[c].width));
          }
        } else {
          for (const col of COLUMNS) {
            row.appendChild(createTableCell(String(item[col.key]), col.width));
          }
        }

        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
      },
    },
  );

  statsEl.textContent = \`总数: \${list.length} | 高阶表格\`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,ta=`import { VirtListDOM } from '@virt-list/dom';

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

const template = \`
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
\`;

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
        row.innerHTML = \`
          <span class="demo-row-index">#\${item.index}</span>
          <span class="demo-row-text">\${item.text}</span>
        \`;
        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
      },
    },
  );

  statsEl.textContent = \`总数: \${list.length}\`;

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
`,ra=`import { VirtListDOM } from '@virt-list/dom';

const PAGE_SIZE = 40;

let uid = 0;

const CHAT_MSGS = [
  '好的，收到！',
  '这个方案看起来不错，我觉得可以按这个方向继续推进。',
  '你有空的时候帮我看一下那个 bug 吗？就是用户反馈的列表滚动卡顿问题。',
  '明天的会议改到下午三点了，记得提前准备一下演示材料。',
  '我刚刚测试了一下新版本的虚拟列表组件，在十万条数据的情况下滚动依然非常流畅，完全没有掉帧的情况。之前用全量渲染的方案在五千条数据时就开始卡顿了，这次的优化效果非常明显！',
  '👍',
  '关于上次讨论的技术选型问题，我整理了一份对比文档，包括性能测试数据、社区活跃度、学习成本等方面的分析。总体来看，新方案在各方面都有优势。等你有空了我们再详细讨论一下具体的迁移计划。',
  '周末愉快！',
];

function generatePage(page, pageSize) {
  const start = (page - 1) * pageSize;
  return Array.from({ length: pageSize }, (_, i) => {
    const idx = start + i;
    return {
      id: uid++,
      index: idx,
      text: CHAT_MSGS[idx % CHAT_MSGS.length],
    };
  });
}

function asyncGeneratePage(page, pageSize) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(generatePage(page, pageSize)), 800),
  );
}

const template = \`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" id="sendBtn">发送随机消息</button>
    </div>
  </div>
\`;

export function bootstrapChat(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');

  let page = 5;
  let list = generatePage(page, PAGE_SIZE);
  let loading = false;
  let firstResize = true;

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 60,
      renderHeader: () => {
        const el = document.createElement('div');
        el.className = 'demo-loading-bar';
        el.id = 'chatLoadingBar';
        el.textContent = page > 1 ? '加载中...' : '没有更早的消息了';
        return el;
      },
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-chat-message';
        row.innerHTML = \`
          <div class="demo-chat-bubble">
            <div style="font-weight:bold;margin-bottom:2px;">消息 #\${item.index}</div>
            <div>\${item.text}</div>
          </div>
        \`;
        return row;
      },
    },
    {
      toTop: async () => {
        if (loading || page <= 1) return;
        loading = true;
        statsEl.textContent += ' | 加载中...';
        const prevPage = await asyncGeneratePage(page - 1, PAGE_SIZE);
        page--;
        list = prevPage.concat(list);
        virtList.addedList2Top(prevPage);
        virtList.setList(list);
        virtList.forceUpdate();
        loading = false;
        updateStats();
      },
      itemResize: () => {
        if (firstResize) {
          firstResize = false;
          virtList.scrollToBottom();
        }
      },
      rangeUpdate: (begin, end) => {
        updateStats(begin, end);
      },
    },
  );

  function updateStats(begin, end) {
    statsEl.textContent = \`总数: \${list.length} | Page: \${page} | RenderBegin: \${begin ?? '-'} | RenderEnd: \${end ?? '-'}\`;
  }

  updateStats();

  const sendBtn = root.querySelector('#sendBtn');
  sendBtn.addEventListener('click', () => {
    const text = CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)];
    const newItem = { id: uid++, index: list.length, text };
    list.push(newItem);
    virtList.setList([...list]);
    virtList.forceUpdate();
    requestAnimationFrame(() => {
      virtList.scrollToBottom();
    });
    updateStats();
  });

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,ia=`import { VirtListDOM } from '@virt-list/dom';

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

const template = \`
  <div class="demo-panel">
    <div style="margin-bottom:8px;font-size:12px;color:#888;">提示：点击内容区域可以直接编辑文本，行高会自动适应。</div>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
\`;

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
        idx.textContent = \`#\${item.index}\`;

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
        statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
      },
    },
  );

  statsEl.textContent = \`总数: \${list.length} | 可变高度 + 可编辑\`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,oa=`import { VirtListDOM } from '@virt-list/dom';

function generateList(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    index: i,
    text: \`固定高度行 \${i}，每行高度一致（40px）。\`,
  }));
}

const template = \`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
\`;

export function bootstrapFixed(root) {
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
      fixed: true,
      buffer: 2,
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-row-item';
        row.style.height = '40px';
        row.style.lineHeight = '40px';
        row.innerHTML = \`
          <span class="demo-row-index">#\${item.index}</span>
          <span class="demo-row-text">\${item.text}</span>
        \`;
        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
      },
    },
  );

  statsEl.textContent = \`总数: \${list.length} | 固定高度: 40px\`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,la=`import { VirtListDOM } from '@virt-list/dom';

const WIDTHS = [60, 80, 100, 110, 130];

function generateList(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    width: WIDTHS[Math.floor(Math.random() * WIDTHS.length)],
  }));
}

const template = \`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-horizontal-container" id="listContainer"></div>
  </div>
\`;

export function bootstrapHorizontal(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(1000);

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 60,
      horizontal: true,
      buffer: 2,
      renderItem: (item) => {
        const col = document.createElement('div');
        col.className = 'demo-col-item';
        col.style.minWidth = \`\${item.width}px\`;
        col.style.width = \`\${item.width}px\`;
        col.innerHTML = \`
          <div style="font-weight:bold;">\${item.id}</div>
          <div style="font-size:11px;color:#999;">w:\${item.width}</div>
        \`;
        return col;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
      },
    },
  );

  statsEl.textContent = \`总数: \${list.length} | 水平滚动\`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,sa=`import { VirtListDOM } from '@virt-list/dom';

const template = \`
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
\`;

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
      loadStatus.textContent = \`已生成 \${list.length.toLocaleString()} 条数据\`;

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
            row.innerHTML = \`
              <span class="demo-row-index">#\${item.index}</span>
              <span class="demo-row-text">\${item.text}</span>
            \`;
            return row;
          },
        },
        {
          rangeUpdate: (begin, end) => {
            statsEl.textContent = \`总数: \${list.length.toLocaleString()} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
          },
        },
      );

      statsEl.textContent = \`总数: \${list.length.toLocaleString()}\`;
    }, 50);
  });

  return () => {
    if (virtList) virtList.destroy();
    root.innerHTML = '';
  };
}
`,ua=`import { VirtListDOM } from '@virt-list/dom';

let uid = 0;

const SENTENCES = [
  '滚动到底部会自动触发加载更多数据。',
  '新数据加载完成后会追加到列表末尾。',
  '加载过程中 footer 区域会显示加载提示，防止重复触发。数据加载完成后，虚拟列表会自动更新渲染范围，新增的行会无缝衔接到现有内容之后。',
  '短行。',
  '无限加载模式适用于数据量不确定的场景，比如社交媒体的信息流、搜索结果列表等。每次加载一页数据，用户可以一直向下滚动浏览。',
];

function generateList(count, startIndex = 0, delay = 0) {
  const items = Array.from({ length: count }, (_, i) => {
    const idx = startIndex + i;
    const n = (idx % 4) + 1;
    const parts = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(idx + s * 2) % SENTENCES.length]);
    return { id: uid++, index: idx, text: parts.join(' ') };
  });
  if (delay <= 0) return Promise.resolve(items);
  return new Promise((resolve) => setTimeout(() => resolve(items), delay));
}

const template = \`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
\`;

export function bootstrapInfinity(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');

  let list = [];
  let loading = false;
  let virtList = null;

  function updateStats(begin, end) {
    statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin ?? '-'} | RenderEnd: \${end ?? '-'}\${loading ? ' | 加载中...' : ''}\`;
  }

  async function loadMore() {
    if (loading) return;
    loading = true;
    updateStats();
    const newItems = await generateList(200, list.length, 1000);
    list = list.concat(newItems);
    loading = false;

    if (!virtList) {
      virtList = new VirtListDOM(
        container,
        {
          list,
          itemKey: 'id',
          itemPreSize: 40,
          buffer: 2,
          renderFooter: () => {
            const el = document.createElement('div');
            el.className = 'demo-loading-bar';
            el.id = 'loadingBar';
            el.textContent = '加载中...';
            return el;
          },
          renderItem: (item) => {
            const row = document.createElement('div');
            row.className = 'demo-row-item';
            row.innerHTML = \`
              <span class="demo-row-index">#\${item.index}</span>
              <span class="demo-row-text">\${item.text}</span>
            \`;
            return row;
          },
        },
        {
          toBottom: () => loadMore(),
          rangeUpdate: (begin, end) => updateStats(begin, end),
        },
      );
    } else {
      virtList.setList(list);
      virtList.forceUpdate();
    }
    updateStats();
  }

  loadMore();

  return () => {
    if (virtList) virtList.destroy();
    root.innerHTML = '';
  };
}
`,ca=`import { VirtListDOM } from '@virt-list/dom';

function generateUsers(count) {
  const departments = ['工程部', '设计部', '产品部', '市场部', '运营部'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: \`用户_\${i}\`,
    email: \`user\${i}@example.com\`,
    department: departments[i % departments.length],
    joinDate: new Date(2020, i % 12, (i % 28) + 1).toLocaleDateString(),
  }));
}

function generateProducts(count) {
  const categories = ['电子产品', '家居用品', '食品饮料', '运动户外', '图书文具'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: \`商品_\${i}\`,
    description: \`这是商品 \${i} 的描述信息\`,
    price: (Math.random() * 1000).toFixed(2),
    category: categories[i % categories.length],
    stock: Math.floor(Math.random() * 500),
  }));
}

function createUserItem(user) {
  const el = document.createElement('div');
  el.className = 'demo-ka-card';
  el.innerHTML = \`
    <div class="demo-ka-avatar">\${user.name.charAt(0)}</div>
    <div class="demo-ka-info">
      <div style="font-weight:bold;">\${user.name}</div>
      <div style="font-size:11px;color:#888;">\${user.email} | \${user.department}</div>
      <div style="font-size:11px;color:#aaa;">入职: \${user.joinDate}</div>
    </div>
  \`;
  return el;
}

function createProductItem(product) {
  const el = document.createElement('div');
  el.className = 'demo-ka-card';
  el.innerHTML = \`
    <div class="demo-ka-avatar" style="background:#f0ad4e;">\${product.name.charAt(0)}</div>
    <div class="demo-ka-info">
      <div style="font-weight:bold;">\${product.name} <span style="color:#e74c3c;font-size:12px;">¥\${product.price}</span></div>
      <div style="font-size:11px;color:#888;">\${product.category} | 库存: \${product.stock}</div>
      <div style="font-size:11px;color:#aaa;">\${product.description}</div>
    </div>
  \`;
  return el;
}

const template = \`
  <div class="demo-panel">
    <div class="demo-ka-tabs">
      <button class="demo-ka-tab is-active" data-tab="users">用户列表</button>
      <button class="demo-ka-tab" data-tab="products">商品列表</button>
    </div>
    <div class="demo-ka-toolbar" id="toolbar"></div>
    <div class="demo-list-container" id="listContainer" style="height:500px;"></div>
  </div>
\`;

export function bootstrapKeepAlive(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const toolbar = root.querySelector('#toolbar');
  const tabs = root.querySelectorAll('.demo-ka-tab');

  let users = generateUsers(2000);
  let products = generateProducts(2000);

  let activeTab = 'users';
  let userScrollOffset = 0;
  let productScrollOffset = 0;
  let currentVirtList = null;

  function renderTab(tab) {
    if (currentVirtList) {
      const scrollTop = currentVirtList.clientEl?.scrollTop ?? 0;
      if (activeTab === 'users') userScrollOffset = scrollTop;
      else productScrollOffset = scrollTop;
      currentVirtList.destroy();
      currentVirtList = null;
    }

    activeTab = tab;
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));

    if (tab === 'users') {
      toolbar.innerHTML = \`
        <button class="virt-list-btn virt-list-btn-primary" id="btnAddUser">添加5个用户</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearUser">清空列表</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnTopUser">回到顶部</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnBottomUser">滚动到底部</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">总数: \${users.length}</span>
      \`;
      currentVirtList = new VirtListDOM(container, {
        list: users,
        itemKey: 'id',
        itemPreSize: 70,
        buffer: 5,
        renderItem: (item) => createUserItem(item),
      });

      if (userScrollOffset > 0) {
        currentVirtList.scrollToOffset(userScrollOffset);
      }

      toolbar.querySelector('#btnAddUser').addEventListener('click', () => {
        const newUsers = generateUsers(5).map((u, i) => ({
          ...u,
          id: users.length + i,
          name: \`新用户_\${users.length + i}\`,
        }));
        users = users.concat(newUsers);
        currentVirtList.setList(users);
        currentVirtList.forceUpdate();
        toolbar.querySelector('span').textContent = \`总数: \${users.length}\`;
      });
      toolbar.querySelector('#btnClearUser').addEventListener('click', () => {
        users = [];
        currentVirtList.setList(users);
        currentVirtList.forceUpdate();
        toolbar.querySelector('span').textContent = \`总数: 0\`;
      });
      toolbar.querySelector('#btnTopUser').addEventListener('click', () => {
        currentVirtList.scrollToTop();
      });
      toolbar.querySelector('#btnBottomUser').addEventListener('click', () => {
        currentVirtList.scrollToBottom();
      });
    } else {
      toolbar.innerHTML = \`
        <button class="virt-list-btn virt-list-btn-primary" id="btnAddProd">添加5个商品</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearProd">清空列表</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnTopProd">回到顶部</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnBottomProd">滚动到底部</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">总数: \${products.length}</span>
      \`;
      currentVirtList = new VirtListDOM(container, {
        list: products,
        itemKey: 'id',
        itemPreSize: 70,
        buffer: 5,
        renderItem: (item) => createProductItem(item),
      });

      if (productScrollOffset > 0) {
        currentVirtList.scrollToOffset(productScrollOffset);
      }

      toolbar.querySelector('#btnAddProd').addEventListener('click', () => {
        const newProds = generateProducts(5).map((p, i) => ({
          ...p,
          id: products.length + i,
          name: \`新商品_\${products.length + i}\`,
        }));
        products = products.concat(newProds);
        currentVirtList.setList(products);
        currentVirtList.forceUpdate();
        toolbar.querySelector('span').textContent = \`总数: \${products.length}\`;
      });
      toolbar.querySelector('#btnClearProd').addEventListener('click', () => {
        products = [];
        currentVirtList.setList(products);
        currentVirtList.forceUpdate();
        toolbar.querySelector('span').textContent = \`总数: 0\`;
      });
      toolbar.querySelector('#btnTopProd').addEventListener('click', () => {
        currentVirtList.scrollToTop();
      });
      toolbar.querySelector('#btnBottomProd').addEventListener('click', () => {
        currentVirtList.scrollToBottom();
      });
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => renderTab(tab.dataset.tab));
  });

  renderTab('users');

  return () => {
    if (currentVirtList) currentVirtList.destroy();
    root.innerHTML = '';
  };
}
`,da=`import { faker } from '@faker-js/faker';
import { VirtListDOM } from '@virt-list/dom';

const template = \`
  <div class="virt-list-container" id="virtListContainer"></div>
\`;

function generateData() {
  return Array.from({ length: 100 }, (_, i) => ({
    id: i,
    content: faker.lorem.paragraph(),
  }));
}

export function bootstrapLiteral(root) {
  root.innerHTML = template;

  const container = root.querySelector('#virtListContainer');
  const virtList = new VirtListDOM(container, {
    list: generateData(),
    itemKey: 'id',
    itemPreSize: 72,
    buffer: 3,
    renderItem: (item) => {
      const row = document.createElement('div');
      row.style.padding = '4px';
      row.innerHTML = \`
        <div style="font-weight:bold;">Item \${item.id}</div>
        <div style="color:#666;font-size:12px;">\${item.content}</div>
        <div style="color:#999;font-size:10px;">Key: \${item.id} (DOM)</div>
      \`;
      return row;
    },
  });

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,ha=`import { VirtListDOM } from '@virt-list/dom';

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

const template = \`
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
\`;

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
        row.innerHTML = \`
          <span class="demo-row-index">#\${item.index}</span>
          <span class="demo-row-text">\${item.text}</span>
        \`;
        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
      },
    },
  );

  const getVal = (id) => parseInt(root.querySelector(\`#\${id}\`).value, 10);
  const setVal = (id, val) => {
    root.querySelector(\`#\${id}\`).value = String(val);
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

  statsEl.textContent = \`总数: \${list.length}\`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,ma=`import { VirtListDOM } from '@virt-list/dom';

const PAGE_SIZE = 20;
const PAGE_MAX = 10;

let uid = 0;

const PAGE_MSGS = [
  '短消息。',
  '这是一条普通长度的分页消息，展示双向分页加载的效果。',
  '向上滚动会加载更早的数据，向下滚动会加载更新的数据。同时，离开可视区域较远的数据会被移除，以控制内存中的数据量。',
  '分页已加载。',
  '双向分页模式适用于消息列表、日志浏览等场景。用户可以在时间线上自由导航，而不需要一次性加载所有数据。这种模式通过 addedList2Top 和 deletedList2Top 两个 API 来实现数据的动态增删，同时保持滚动位置的稳定。',
  '翻到顶部或底部都可以触发新一页的加载。',
];

function generatePage(page) {
  const start = (page - 1) * PAGE_SIZE;
  return Array.from({ length: PAGE_SIZE }, (_, i) => {
    const idx = start + i;
    return {
      id: uid++,
      index: idx,
      text: PAGE_MSGS[idx % PAGE_MSGS.length],
    };
  });
}

function asyncGeneratePage(page) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(generatePage(page)), 1000),
  );
}

const template = \`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
\`;

export function bootstrapPagination(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');

  let page = PAGE_MAX;
  let list = [...generatePage(page - 1), ...generatePage(page)];
  let loadingTop = false;
  let loadingBottom = false;
  let firstResize = true;

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 60,
      buffer: 2,
      renderHeader: () => {
        const el = document.createElement('div');
        el.className = 'demo-loading-bar';
        el.textContent = page > 2 ? '上拉加载...' : '没有更早的数据了';
        return el;
      },
      renderFooter: () => {
        const el = document.createElement('div');
        el.className = 'demo-loading-bar';
        el.textContent = page < PAGE_MAX ? '下拉加载...' : '没有更新的数据了';
        return el;
      },
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-chat-message';
        row.innerHTML = \`
          <div class="demo-chat-bubble">
            <div style="font-weight:bold;margin-bottom:2px;">消息 #\${item.index}</div>
            <div>\${item.text}</div>
          </div>
        \`;
        return row;
      },
    },
    {
      toTop: async () => {
        if (loadingTop || page <= 2) return;
        loadingTop = true;
        updateStats();

        const prevPageData = await asyncGeneratePage(page - 2);
        page--;

        const removed = list.splice(list.length - PAGE_SIZE, PAGE_SIZE);
        virtList.deletedList2Top(removed);
        list = prevPageData.concat(list);
        virtList.addedList2Top(prevPageData);
        virtList.setList(list);
        virtList.forceUpdate();

        loadingTop = false;
        updateStats();
      },
      toBottom: async () => {
        if (loadingBottom || page >= PAGE_MAX) return;
        loadingBottom = true;
        updateStats();

        const nextPageData = await asyncGeneratePage(page + 1);
        page++;

        const removed = list.splice(0, PAGE_SIZE);
        virtList.deletedList2Top(removed);
        list = list.concat(nextPageData);
        virtList.setList(list);
        virtList.forceUpdate();

        loadingBottom = false;
        updateStats();
      },
      itemResize: () => {
        if (firstResize) {
          firstResize = false;
          virtList.scrollToBottom();
        }
      },
      rangeUpdate: (begin, end) => updateStats(begin, end),
    },
  );

  function updateStats(begin, end) {
    const extra = loadingTop || loadingBottom ? ' | 加载中...' : '';
    statsEl.textContent = \`总数: \${list.length} | Page: \${page} | RenderBegin: \${begin ?? '-'} | RenderEnd: \${end ?? '-'}\${extra}\`;
  }

  updateStats();

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,pa=`import { VirtListDOM } from '@virt-list/dom';

const SENTENCES = [
  '拖拽容器右下角可以调整大小，虚拟列表会自动适应新的容器尺寸。',
  '容器变大时会渲染更多的行。',
  '这种自适应能力依赖于 ResizeObserver 对容器尺寸变化的监听。当容器的可视区域发生变化时，虚拟列表会重新计算需要渲染的元素数量，并更新视图。',
  '短行。',
  '无论容器是变大还是变小，滚动位置和列表状态都会被正确保留。这意味着用户在调整窗口大小时不会丢失当前的浏览位置。',
  '每一行的高度都不同，体现了动态高度的特性。',
];

function generateList(count) {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 5) + 1;
    const parts = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}

const template = \`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-resize-container" id="listContainer"></div>
  </div>
\`;

export function bootstrapResize(root) {
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
      buffer: 2,
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-row-item';
        row.innerHTML = \`
          <span class="demo-row-index">#\${item.index}</span>
          <span class="demo-row-text">\${item.text}</span>
        \`;
        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
      },
    },
  );

  statsEl.textContent = \`总数: \${list.length} | 拖拽容器边框调整大小\`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,Fa=`import { VirtListDOM } from '@virt-list/dom';

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

const template = \`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
\`;

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
        row.innerHTML = \`
          <span class="demo-row-index">#\${item.index}</span>
          <span class="demo-row-text">\${item.text}</span>
        \`;
        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
      },
    },
  );

  statsEl.textContent = \`总数: \${list.length} | 含 Sticky/Header/Footer 插槽\`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,ya=`import { VirtListDOM } from '@virt-list/dom';

function generateList(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: \`用户_\${i}\`,
    desc1: \`这是用户 \${i} 的详细描述信息，可能是一段较长的文本\`,
    desc2: \`补充说明 \${i}，包含更多关于该用户的信息\`,
    action: '操作',
  }));
}

function createCell(text, style) {
  const cell = document.createElement('div');
  cell.className = 'demo-table-cell';
  cell.textContent = text;
  if (style) Object.assign(cell.style, style);
  return cell;
}

const template = \`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
\`;

export function bootstrapTable(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const list = generateList(1000);

  const stickyLeft = {
    position: 'sticky',
    left: '0',
    zIndex: '1',
    background: '#fff',
  };
  const stickyRight = {
    position: 'sticky',
    right: '0',
    zIndex: '1',
    background: '#fff',
  };

  const virtList = new VirtListDOM(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 40,
      stickyHeaderStyle: 'background:#f0f0f0;',
      renderStickyHeader: () => {
        const header = document.createElement('div');
        header.className = 'demo-table-row demo-table-header';
        header.appendChild(
          createCell('ID', { ...stickyLeft, width: '80px', minWidth: '80px', background: '#e0e0e0' }),
        );
        header.appendChild(
          createCell('名称', { width: '120px', minWidth: '120px' }),
        );
        header.appendChild(
          createCell('描述1', { width: '600px', minWidth: '600px' }),
        );
        header.appendChild(
          createCell('描述2', { width: '600px', minWidth: '600px' }),
        );
        header.appendChild(
          createCell('操作', { ...stickyRight, width: '80px', minWidth: '80px', background: '#e0e0e0' }),
        );
        return header;
      },
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = 'demo-table-row';
        row.appendChild(
          createCell(String(item.id), { ...stickyLeft, width: '80px', minWidth: '80px' }),
        );
        row.appendChild(
          createCell(item.name, { width: '120px', minWidth: '120px' }),
        );
        row.appendChild(
          createCell(item.desc1, { width: '600px', minWidth: '600px' }),
        );
        row.appendChild(
          createCell(item.desc2, { width: '600px', minWidth: '600px' }),
        );
        const actionCell = createCell('', {
          ...stickyRight,
          width: '80px',
          minWidth: '80px',
        });
        const btn = document.createElement('button');
        btn.className = 'virt-list-btn virt-list-btn-primary';
        btn.style.fontSize = '10px';
        btn.style.padding = '2px 8px';
        btn.textContent = '详情';
        actionCell.appendChild(btn);
        row.appendChild(actionCell);
        return row;
      },
    },
    {
      rangeUpdate: (begin, end) => {
        statsEl.textContent = \`总数: \${list.length} | RenderBegin: \${begin} | RenderEnd: \${end}\`;
      },
    },
  );

  statsEl.textContent = \`总数: \${list.length} | 表格模式（水平滚动 + sticky 列）\`;

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
`,ga=`import { VirtListDOM } from '@virt-list/dom';

const SENTENCES = [
  '虚拟列表只渲染可视区域内的元素，大幅提升性能。',
  '动态高度列表需要在渲染后测量实际尺寸。',
  '每一行的内容长度不同，高度也会随之变化。这是虚拟列表最核心的能力之一，它需要实时追踪每个元素的实际渲染尺寸。',
  '短文本。',
  '相比全量渲染，虚拟列表可以将 DOM 节点控制在很小的范围内。即使面对数十万条数据，滚动体验依然流畅丝滑，内存占用也维持在较低水平。',
  '滚动过程中列表会计算需要渲染的起始和结束索引。',
  '被移出可视区域的节点会被及时回收，新进入可视区域的节点会被创建并插入到正确的位置。这个过程对用户来说是完全透明的。',
  '纯 JS 实现，无框架依赖。',
];

const list = Array.from({ length: 1000 }, (_, i) => {
  const n = (i % 5) + 1;
  const parts = [];
  for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 3) % SENTENCES.length]);
  return { id: i, content: parts.join(' ') };
});

const template = \`
  <div class="virt-list-controls">
    <div class="virt-list-control-group">
      <label for="scrollToIndexInput">滚动到索引:</label>
      <input type="number" id="scrollToIndexInput" placeholder="0" min="0" value="50" />
      <button class="virt-list-btn virt-list-btn-primary" id="btnScrollToIndex">滚动到索引</button>
    </div>
    <div class="virt-list-control-group">
      <label for="scrollToOffsetInput">滚动到偏移:</label>
      <input type="number" id="scrollToOffsetInput" placeholder="0" min="0" value="1000" />
      <button class="virt-list-btn virt-list-btn-secondary" id="btnScrollToOffset">滚动到偏移</button>
    </div>
    <div class="virt-list-control-group">
      <label for="scrollIntoViewInput">滚动到可视区域:</label>
      <input type="number" id="scrollIntoViewInput" placeholder="0" min="0" value="30" />
      <button class="virt-list-btn virt-list-btn-success" id="btnScrollIntoView">滚动到可视区域</button>
    </div>
  </div>
  <div class="virt-list-controls">
    <button class="virt-list-btn virt-list-btn-primary" id="btnTop">滚动到顶部</button>
    <button class="virt-list-btn virt-list-btn-primary" id="btnBottom">滚动到底部</button>
    <button class="virt-list-btn virt-list-btn-warning" id="btnRandom">随机滚动</button>
    <button class="virt-list-btn virt-list-btn-success" id="btnToggleScrollbar">切换真实滚动条</button>
  </div>
  <div id="status" class="status-text"></div>
  <div class="virt-list-container" id="virtListContainer"></div>
\`;

export function bootstrapVirtList(root) {
  root.innerHTML = template;

  const container = root.querySelector('#virtListContainer');
  const status = root.querySelector('#status');
  let hideNativeScrollbar = false;
  const listeners = [];

  const virtList = new VirtListDOM(container, {
    list,
    itemKey: 'id',
    itemPreSize: 72,
    buffer: 4,
    renderItem: (item) => {
      const row = document.createElement('div');
      row.className = 'virt-item';
      row.style.backgroundColor = \`hsl(\${(item.id * 13) % 360} 75% 95%)\`;
      row.style.padding = '8px 12px';
      row.style.borderBottom = '1px solid rgba(0,0,0,0.06)';
      row.innerHTML = \`
        <div style="font-weight:bold;margin-bottom:2px;">Item \${item.id}</div>
        <div style="color:#666;font-size:13px;line-height:1.5;">\${item.content}</div>
      \`;
      return row;
    },
  });

  const getNumber = (id) => Number.parseInt(root.querySelector(\`#\${id}\`).value, 10);
  const setStatus = (text) => {
    status.textContent = text;
  };
  const on = (id, handler) => {
    const el = root.querySelector(\`#\${id}\`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnTop', () => {
    virtList.scrollToTop();
    setStatus('已滚动到顶部');
  });
  on('btnBottom', () => {
    virtList.scrollToBottom();
    setStatus('已滚动到底部');
  });
  on('btnScrollToIndex', () => {
    const index = getNumber('scrollToIndexInput');
    if (Number.isNaN(index) || index < 0 || index >= list.length) {
      setStatus('请输入有效索引 (0 - 999)');
      return;
    }
    virtList.scrollToIndex(index);
    setStatus(\`已滚动到索引 \${index}\`);
  });
  on('btnScrollToOffset', () => {
    const offset = getNumber('scrollToOffsetInput');
    if (Number.isNaN(offset) || offset < 0) {
      setStatus('请输入有效偏移值');
      return;
    }
    virtList.scrollToOffset(offset);
    setStatus(\`已滚动到偏移 \${offset}\`);
  });
  on('btnScrollIntoView', () => {
    const index = getNumber('scrollIntoViewInput');
    if (Number.isNaN(index) || index < 0 || index >= list.length) {
      setStatus('请输入有效索引 (0 - 999)');
      return;
    }
    virtList.scrollIntoView(index);
    setStatus(\`已确保索引 \${index} 在可视区域\`);
  });
  on('btnRandom', () => {
    const randomIndex = Math.floor(Math.random() * list.length);
    root.querySelector('#scrollToIndexInput').value = String(randomIndex);
    virtList.scrollToIndex(randomIndex);
    setStatus(\`随机滚动到索引 \${randomIndex}\`);
  });
  on('btnToggleScrollbar', () => {
    hideNativeScrollbar = !hideNativeScrollbar;
    container.classList.toggle('hide-native-scrollbar', hideNativeScrollbar);
    setStatus(hideNativeScrollbar ? '已隐藏真实滚动条' : '已显示真实滚动条');
  });

  setStatus('示例已就绪：1000 行虚拟列表');

  return () => {
    virtList.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
`,ba=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeBasic(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');

  const tree = new VirtTreeDOM(container, {
    list: generateTreeData(),
    fieldNames: { key: 'id' },
    indent: 20,
    expandOnClickNode: true,
    renderEmpty: () => {
      const el = document.createElement('div');
      el.style.padding = '16px';
      el.textContent = '暂无数据';
      return el;
    },
  });

  return () => {
    tree.destroy();
    root.innerHTML = '';
  };
}
`,fa=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
        disableCheckbox: k % 2 === 0,
        children:
          k % 2 !== 0
            ? []
            : Array.from({ length: 2 }, (_, l) => ({
                id: \`\${i}-\${j}-\${k}-\${l}\`,
                title: \`Node-\${i}-\${j}-\${k}-\${l}\`,
              })),
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="virt-list-btn virt-list-btn-primary" id="btnCollapseAll">折叠所有</button>
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearCheck">清空 check</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnCheckAll">check 所有</button>
      </div>
      <div class="input-container" style="margin-top:8px;">
        <label>操作指定节点：</label>
        <input id="nodeKeyInput" value="0" style="width:80px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandNode">展开</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseNode">折叠</button>
      </div>
    </div>
    <div id="checkedDisplay" class="status-text" style="margin:8px 0;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeCheckbox(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const checkedDisplay = root.querySelector('#checkedDisplay');
  const listeners = [];

  const updateDisplay = (keys) => {
    checkedDisplay.textContent = \`checkedKeys: [\${keys.join(', ')}]\`;
  };

  const tree = new VirtTreeDOM(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 20,
      checkable: true,
      checkOnClickNode: true,
      defaultExpandAll: true,
      checkedKeys: ['0'],
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
    {
      check: (keys, data) => {
        updateDisplay(keys);
        console.warn('check', data);
      },
    },
  );

  updateDisplay(['0']);

  const on = (id, handler) => {
    const el = root.querySelector(\`#\${id}\`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnCollapseAll', () => tree.expandAll(false));
  on('btnExpandAll', () => tree.expandAll(true));
  on('btnClearCheck', () => {
    tree.checkAll(false);
    updateDisplay([]);
  });
  on('btnCheckAll', () => {
    tree.checkAll(true);
    updateDisplay(tree.getCheckedKeys());
  });
  on('btnExpandNode', () => {
    const key = root.querySelector('#nodeKeyInput').value;
    tree.expandNode(key, true);
  });
  on('btnCollapseNode', () => {
    const key = root.querySelector('#nodeKeyInput').value;
    tree.expandNode(key, false);
  });

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
`,va=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    name: \`Name-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      name: \`Name-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
        name: \`Name-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeContent(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');

  const tree = new VirtTreeDOM(container, {
    list: generateTreeData(),
    fieldNames: { key: 'id' },
    indent: 20,
    renderContent: (node) => {
      const el = document.createElement('div');
      el.innerHTML = \`<span>level: \${node.level}; </span><span>title: \${node.data.name}</span>\`;
      return el;
    },
    renderEmpty: () => {
      const el = document.createElement('div');
      el.style.padding = '16px';
      el.textContent = '暂无数据';
      return el;
    },
  });

  return () => {
    tree.destroy();
    root.innerHTML = '';
  };
}
`,Ca=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeDefault(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const indent = 20;

  const treeRef = { current: null };

  treeRef.current = new VirtTreeDOM(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent,
      selectable: true,
      defaultExpandAll: true,
      expandOnClickNode: true,
      itemPreSize: 40,
      fixed: true,
      renderNode: (node) => {
        const el = document.createElement('div');
        el.className = 'virt-tree-node';
        el.style.height = '40px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.borderBottom = '1px solid #eee';
        el.style.boxSizing = 'border-box';
        el.style.paddingLeft = \`\${(node.level - 1) * indent}px\`;
        el.textContent = \`level: \${node.level}; -- title: \${node.title ?? ''}\`;

        el.addEventListener('click', () => {
          const t = treeRef.current;
          if (!t) return;
          const current = t.getTreeNode(node.key);
          if (!current || current.disableSelect) return;
          t.toggleSelect(current);
        });

        return el;
      },
      renderEmpty: () => {
        const empty = document.createElement('div');
        empty.style.padding = '16px';
        empty.textContent = '暂无数据';
        return empty;
      },
    },
  );

  return () => {
    treeRef.current?.destroy();
    root.innerHTML = '';
  };
}
`,ka=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

function removeNode(list, node) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === node.data.id) {
      list.splice(i, 1);
      return true;
    }
    if (list[i].children && removeNode(list[i].children, node)) {
      return true;
    }
  }
  return false;
}

function insertNode(list, node, prevNode, parentNode) {
  const raw = node.data;
  if (parentNode) {
    if (!parentNode.data.children) parentNode.data.children = [];
    const target = parentNode.data.children;
    if (prevNode) {
      const idx = target.findIndex((n) => n.id === prevNode.data.id);
      target.splice(idx + 1, 0, raw);
    } else {
      target.unshift(raw);
    }
  } else {
    if (prevNode) {
      const idx = list.findIndex((n) => n.id === prevNode.data.id);
      list.splice(idx + 1, 0, raw);
    } else {
      list.unshift(raw);
    }
  }
}

const template = \`
  <div class="tree-demo">
    <div id="status" class="status-text" style="margin-bottom:8px;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeDrag(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const status = root.querySelector('#status');
  let list = generateTreeData();

  let tree = new VirtTreeDOM(
    container,
    {
      list,
      fieldNames: { key: 'id' },
      indent: 20,
      draggable: true,
      expandOnClickNode: true,
      renderContent: (node) => {
        const el = document.createElement('div');
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '4px';
        const icon = document.createElement('span');
        icon.textContent = node.isLeaf ? '📄' : '📁';
        const text = document.createElement('span');
        text.textContent = node.title ?? '';
        el.appendChild(icon);
        el.appendChild(text);
        return el;
      },
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
    {
      dragstart: (data) => {
        status.textContent = \`开始拖拽: \${data.sourceNode.title ?? data.sourceNode.data?.id}\`;
      },
      dragend: (data) => {
        if (!data) {
          status.textContent = '拖拽取消';
          return;
        }
        removeNode(list, data.node);
        insertNode(list, data.node, data.prevNode, data.parentNode);
        tree.setList([...list]);
        status.textContent = \`拖拽完成: \${data.node.title ?? data.node.data?.id}\`;
      },
    },
  );

  status.textContent = '拖拽树示例已就绪（支持跨层级拖拽）';

  return () => {
    tree.destroy();
    root.innerHTML = '';
  };
}
`,Sa=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

const treeData = [
  {
    id: 'role',
    title: '角色',
    children: [
      { id: 'role-1', title: '怪物' },
      { id: 'role-2', title: '小动物' },
      { id: 'role-3', title: '路人' },
      { id: 'role-4', title: '武器' },
    ],
  },
  {
    id: 'scene',
    title: '场景',
    children: [
      { id: 'scene-1', title: '场景地域' },
      { id: 'scene-2', title: '室内区域' },
      { id: 'scene-3', title: '室外区域' },
      { id: 'scene-4', title: '特色区域' },
    ],
  },
  {
    id: 'origin',
    title: '原始',
    children: [
      { id: 'origin-1', title: '原始' },
      { id: 'origin-2', title: '3D' },
      { id: 'origin-3', title: 'NPC' },
      { id: 'origin-4', title: '手枪' },
    ],
  },
  { id: 'drag-1', title: '角色环节', children: [] },
  { id: 'drag-2', title: '场景环节', children: [] },
  { id: 'drag-3', title: '测试', children: [] },
];

const template = \`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeDragArea(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');

  const tree = new VirtTreeDOM(
    container,
    {
      list: treeData,
      fieldNames: { key: 'id' },
      draggable: true,
      crossLevelDraggable: false,
      showLine: true,
      expandOnClickNode: true,
      defaultExpandAll: true,
      itemGap: 4,
      indent: 16,
      iconSize: 14,
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
    {
      dragstart: (data) => {
        console.log('dragstart', data);
      },
      dragend: (data) => {
        if (!data) {
          console.log('dragend', 'fail', 'cancelled');
        } else {
          console.log('dragend', 'success', data);
        }
      },
    },
  );

  return () => {
    tree.destroy();
    root.innerHTML = '';
  };
}
`,Ea=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
        children:
          k % 2 !== 0
            ? []
            : Array.from({ length: 2 }, (_, l) => ({
                id: \`\${i}-\${j}-\${k}-\${l}\`,
                title: \`Node-\${i}-\${j}-\${k}-\${l}\`,
              })),
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div class="input-container">
        <label>操作指定节点：</label>
        <input id="nodeKeyInput" value="0-0" style="width:80px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandNode">展开</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseNode">折叠</button>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="virt-list-btn virt-list-btn-primary" id="btnCollapseAll">折叠所有</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
      </div>
    </div>
    <div id="expandedDisplay" class="status-text" style="margin:8px 0;height:40px;overflow:auto;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeExpand(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const expandedDisplay = root.querySelector('#expandedDisplay');
  const listeners = [];

  const updateDisplay = (keys) => {
    expandedDisplay.textContent = \`expandedKeys: [\${keys.join(', ')}]\`;
  };

  const tree = new VirtTreeDOM(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      expandedKeys: ['0-0'],
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
    {
      expand: (keys, data) => {
        updateDisplay(keys);
        console.warn('onExpand', data);
      },
    },
  );

  updateDisplay(['0-0']);

  const on = (id, handler) => {
    const el = root.querySelector(\`#\${id}\`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnExpandNode', () => {
    const key = root.querySelector('#nodeKeyInput').value;
    tree.expandNode(key, true);
  });
  on('btnCollapseNode', () => {
    const key = root.querySelector('#nodeKeyInput').value;
    tree.expandNode(key, false);
  });
  on('btnCollapseAll', () => tree.expandAll(false));
  on('btnExpandAll', () => tree.expandAll(true));

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
`,Aa=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div class="input-container">
        <input id="filterInput" value="Node-0" style="width:160px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnFilter">filter</button>
      </div>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeFilter(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const listeners = [];

  const tree = new VirtTreeDOM(container, {
    list: generateTreeData(),
    fieldNames: { key: 'id' },
    indent: 20,
    filterMethod: (query, node) => {
      return node.title.includes(query);
    },
    renderEmpty: () => {
      const el = document.createElement('div');
      el.style.padding = '16px';
      el.textContent = '暂无数据';
      return el;
    },
  });

  const on = (id, handler) => {
    const el = root.querySelector(\`#\${id}\`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnFilter', () => {
    const query = root.querySelector('#filterInput').value;
    tree.filter(query);
  });

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
`,Da=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

/**
 * 聚焦态由库在 \`.virt-tree-node\` 上切换 \`is-focused\` class。
 * 可在业务样式中覆盖，例如：\`.virt-tree-node.is-focused { outline: 2px solid #42b983; }\`
 */
function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div id="focusedDisplay" class="status-text" style="margin-bottom:8px;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeFocus(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const focusedDisplay = root.querySelector('#focusedDisplay');

  const updateFocusedDisplay = (keys) => {
    focusedDisplay.textContent = \`focusedKeys: [\${keys.map(String).join(', ')}]\`;
  };

  const treeRef = { current: null };

  treeRef.current = new VirtTreeDOM(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 20,
      selectable: true,
      defaultExpandAll: true,
      focusedKeys: [],
      renderContent: (node) => {
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.justifyContent = 'space-between';
        wrap.style.alignItems = 'center';
        wrap.style.width = '100%';

        const titleEl = document.createElement('span');
        titleEl.textContent = \`level: \${node.level}; \${node.title ?? ''}\`;

        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'virt-list-btn virt-list-btn-secondary';
        moreBtn.textContent = '...';
        moreBtn.style.display = 'none';
        moreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          treeRef.current?.setFocusedKeys([node.key]);
          updateFocusedDisplay([node.key]);
        });

        wrap.addEventListener('mouseenter', () => {
          moreBtn.style.display = '';
        });
        wrap.addEventListener('mouseleave', () => {
          moreBtn.style.display = 'none';
        });

        wrap.appendChild(titleEl);
        wrap.appendChild(moreBtn);
        return wrap;
      },
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
  );

  updateFocusedDisplay([]);

  return () => {
    treeRef.current?.destroy();
    root.innerHTML = '';
  };
}
`,Ba=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

function createChevronIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '4');
  svg.setAttribute('stroke-linecap', 'butt');
  svg.setAttribute('stroke-linejoin', 'miter');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M39.6 17.443 24.043 33 8.487 17.443');
  svg.appendChild(path);
  return svg;
}

export function bootstrapTreeIcon(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');

  const tree = new VirtTreeDOM(container, {
    list: generateTreeData(),
    fieldNames: { key: 'id' },
    indent: 20,
    expandOnClickNode: true,
    renderIcon: () => createChevronIcon(),
    renderEmpty: () => {
      const el = document.createElement('div');
      el.style.padding = '16px';
      el.textContent = '暂无数据';
      return el;
    },
  });

  return () => {
    tree.destroy();
    root.innerHTML = '';
  };
}
`,wa=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div class="input-container" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;">
        <label>目标 key：</label>
        <input id="scrollKeyInput" value="5-1-0" style="width:120px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <label>滚动 offset：</label>
        <input id="scrollOffsetInput" value="400" type="number" min="0" style="width:100px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseAll">折叠所有</button>
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandNode">expandNode</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnCollapseNode">collapseNode</button>
        <button class="virt-list-btn virt-list-btn-primary" id="btnScrollOffset">滚动到指定位置</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnScrollTop">滚动到指定节点(顶部)</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnScrollView">滚动到指定节点(可视区)</button>
      </div>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeOperate(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const keyInput = root.querySelector('#scrollKeyInput');
  const offsetInput = root.querySelector('#scrollOffsetInput');
  const listeners = [];

  const tree = new VirtTreeDOM(container, {
    list: generateTreeData(),
    fieldNames: { key: 'id' },
    indent: 20,
    expandedKeys: ['0'],
    renderEmpty: () => {
      const el = document.createElement('div');
      el.style.padding = '16px';
      el.textContent = '暂无数据';
      return el;
    },
  });

  const on = (id, handler) => {
    const el = root.querySelector(\`#\${id}\`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnExpandAll', () => tree.expandAll(true));
  on('btnCollapseAll', () => tree.expandAll(false));
  on('btnExpandNode', () => {
    const key = keyInput.value.trim();
    if (key) tree.expandNode(key, true);
  });
  on('btnCollapseNode', () => {
    const key = keyInput.value.trim();
    if (key) tree.expandNode(key, false);
  });
  on('btnScrollOffset', () => {
    const v = Number(offsetInput.value);
    if (Number.isFinite(v) && v >= 0) {
      tree.scrollTo({ offset: v });
    }
  });
  on('btnScrollTop', () => {
    const key = keyInput.value.trim();
    if (key) tree.scrollTo({ key, align: 'top' });
  });
  on('btnScrollView', () => {
    const key = keyInput.value.trim();
    if (key) tree.scrollTo({ key, align: 'view' });
  });

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
`,Ta=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    disableSelect: i === 1,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="virt-list-btn virt-list-btn-primary" id="btnSelectAll">全选</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearSelect">清空选择</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseAll">折叠所有</button>
      </div>
    </div>
    <div id="selectedDisplay" class="status-text" style="margin:8px 0;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeSelect(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const selectedDisplay = root.querySelector('#selectedDisplay');
  const listeners = [];

  const updateDisplay = (keys) => {
    selectedDisplay.textContent = \`selectedKeys: [\${keys.join(', ')}]\`;
  };

  const tree = new VirtTreeDOM(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 20,
      selectable: true,
      selectMultiple: true,
      defaultExpandAll: true,
      selectedKeys: ['0'],
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
    {
      select: (keys, data) => {
        updateDisplay(keys);
        console.log('onSelect', keys, data);
      },
    },
  );

  updateDisplay(['0']);

  const on = (id, handler) => {
    const el = root.querySelector(\`#\${id}\`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnSelectAll', () => {
    tree.selectAll(true);
    updateDisplay(['(all)']);
  });
  on('btnClearSelect', () => {
    tree.selectAll(false);
    updateDisplay([]);
  });
  on('btnExpandAll', () => tree.expandAll(true));
  on('btnCollapseAll', () => tree.expandAll(false));

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
`,Ma=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  const data = Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
  data[0].children[0].title =
    'abvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagac';
  return data;
}

const template = \`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <button class="virt-list-btn virt-list-btn-primary" id="btnToggleLine">切换连接线</button>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeShowLine(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const listeners = [];
  let showLine = true;

  let tree = createTree(container, showLine);

  function createTree(el, line) {
    el.innerHTML = '';
    return new VirtTreeDOM(el, {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 28,
      iconSize: 14,
      showLine: line,
      defaultExpandAll: true,
      itemGap: 4,
      fixed: true,
      renderEmpty: () => {
        const div = document.createElement('div');
        div.style.padding = '16px';
        div.textContent = '暂无数据';
        return div;
      },
    });
  }

  const on = (id, handler) => {
    const el = root.querySelector(\`#\${id}\`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnToggleLine', () => {
    showLine = !showLine;
    tree.destroy();
    tree = createTree(container, showLine);
    root.querySelector('#btnToggleLine').textContent = showLine
      ? '隐藏连接线'
      : '显示连接线';
  });

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
`,La=`import { VirtTreeDOM } from '@virt-list/dom';
import '@virt-list/dom/src/tree/tree.css';

function generateTreeData() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: \`Node-\${i}\`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: \`\${i}-\${j}\`,
      title: \`Node-\${i}-\${j}\`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: \`\${i}-\${j}-\${k}\`,
        title: \`Node-\${i}-\${j}-\${k}\`,
      })),
    })),
  }));
}

const template = \`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div style="display:flex;gap:8px;">
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseAll">折叠所有</button>
      </div>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
\`;

export function bootstrapTreeSlots(root) {
  root.innerHTML = template;

  const container = root.querySelector('#treeContainer');
  const listeners = [];

  const tree = new VirtTreeDOM(
    container,
    {
      list: generateTreeData(),
      fieldNames: { key: 'id' },
      indent: 20,
      selectable: true,
      defaultExpandAll: true,
      renderStickyHeader: () => {
        const el = document.createElement('div');
        el.textContent = '悬浮header';
        el.style.padding = '10px 12px';
        el.style.background = '#42b983';
        el.style.color = '#fff';
        el.style.fontWeight = '600';
        return el;
      },
      renderHeader: () => {
        const el = document.createElement('div');
        el.textContent = 'header';
        el.style.padding = '8px 12px';
        el.style.background = 'cyan';
        el.style.color = '#1f2329';
        return el;
      },
      renderFooter: () => {
        const el = document.createElement('div');
        el.textContent = 'footer';
        el.style.padding = '8px 12px';
        el.style.background = 'cyan';
        el.style.color = '#1f2329';
        return el;
      },
      renderStickyFooter: () => {
        const el = document.createElement('div');
        el.textContent = '悬浮footer';
        el.style.padding = '10px 12px';
        el.style.background = '#42b983';
        el.style.color = '#fff';
        el.style.fontWeight = '600';
        return el;
      },
      renderEmpty: () => {
        const el = document.createElement('div');
        el.style.padding = '16px';
        el.textContent = '暂无数据';
        return el;
      },
    },
  );

  const on = (id, handler) => {
    const el = root.querySelector(\`#\${id}\`);
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };

  on('btnExpandAll', () => tree.expandAll(true));
  on('btnCollapseAll', () => tree.expandAll(false));

  return () => {
    tree.destroy();
    listeners.forEach((off) => off());
    root.innerHTML = '';
  };
}
`;var G={};var oe;function xa(){if(oe)return G;oe=1,Object.defineProperty(G,"__esModule",{value:!0});var a=typeof window<"u"?window.proxy||window:{},e=function(n){a?.__POWERED_BY_QIANKUN__&&(window.moudleQiankunAppLifeCycles||(window.moudleQiankunAppLifeCycles={}),a.qiankunName&&(window.moudleQiankunAppLifeCycles[a.qiankunName]=n))};return G.default=e,G.qiankunWindow=a,G.renderWithQiankun=e,G}var Re=xa();const Na=`
  <div class="demo-block">
    <div class="demo-block__content"></div>
    <div class="demo-block__actions">
      <span class="demo-block__divider"></span>
      <button class="demo-block__toggle" type="button">
        <svg class="demo-block__arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span class="demo-block__toggle-text">展示代码</span>
      </button>
      <span class="demo-block__divider"></span>
    </div>
    <div class="demo-block__source" style="display:none;">
      <div class="demo-block__source-header">
        <button class="demo-block__copy" type="button">复制</button>
      </div>
      <pre class="demo-block__pre"><code></code></pre>
    </div>
  </div>
`;async function Ra(a){try{return await navigator.clipboard.writeText(a),!0}catch{const e=document.createElement("textarea");e.value=a,e.style.position="fixed",e.style.left="-9999px",document.body.appendChild(e),e.select();const n=document.execCommand("copy");return document.body.removeChild(e),n}}function Pa(a,e){a.innerHTML=Na;const n=a.querySelector(".demo-block__content"),t=a.querySelector(".demo-block__source"),i=a.querySelector(".demo-block__pre code"),r=a.querySelector(".demo-block__toggle"),o=a.querySelector(".demo-block__toggle-text"),l=a.querySelector(".demo-block__arrow"),u=a.querySelector(".demo-block__copy");if(!n||!t||!i||!r||!o||!l||!u)throw new Error("Demo block mount failed: missing elements");i.textContent=e||"";let s=!1;const c=()=>{s=!s,t.style.display=s?"block":"none",o.textContent=s?"隐藏代码":"展示代码",l.classList.toggle("is-open",s)},d=async()=>{const m=await Ra(e||"");u.textContent=m?"已复制 ✓":"复制失败",setTimeout(()=>{u.textContent="复制"},2e3)};return r.addEventListener("click",c),u.addEventListener("click",d),{mountEl:n,destroy(){r.removeEventListener("click",c),u.removeEventListener("click",d),a.innerHTML=""}}}var Ha=[{name:"Aegean Airlines",iataCode:"A3"},{name:"Aeroflot",iataCode:"SU"},{name:"Aerolineas Argentinas",iataCode:"AR"},{name:"Aeromexico",iataCode:"AM"},{name:"Air Algerie",iataCode:"AH"},{name:"Air Arabia",iataCode:"G9"},{name:"Air Canada",iataCode:"AC"},{name:"Air China",iataCode:"CA"},{name:"Air Europa",iataCode:"UX"},{name:"Air France",iataCode:"AF"},{name:"Air India",iataCode:"AI"},{name:"Air Mauritius",iataCode:"MK"},{name:"Air New Zealand",iataCode:"NZ"},{name:"Air Niugini",iataCode:"PX"},{name:"Air Tahiti",iataCode:"VT"},{name:"Air Tahiti Nui",iataCode:"TN"},{name:"Air Transat",iataCode:"TS"},{name:"AirAsia X",iataCode:"D7"},{name:"AirAsia",iataCode:"AK"},{name:"Aircalin",iataCode:"SB"},{name:"Alaska Airlines",iataCode:"AS"},{name:"Alitalia",iataCode:"AZ"},{name:"All Nippon Airways",iataCode:"NH"},{name:"Allegiant Air",iataCode:"G4"},{name:"American Airlines",iataCode:"AA"},{name:"Asiana Airlines",iataCode:"OZ"},{name:"Avianca",iataCode:"AV"},{name:"Azul Linhas Aereas Brasileiras",iataCode:"AD"},{name:"Azur Air",iataCode:"ZF"},{name:"Beijing Capital Airlines",iataCode:"JD"},{name:"Boliviana de Aviacion",iataCode:"OB"},{name:"British Airways",iataCode:"BA"},{name:"Cathay Pacific",iataCode:"CX"},{name:"Cebu Pacific Air",iataCode:"5J"},{name:"China Airlines",iataCode:"CI"},{name:"China Eastern Airlines",iataCode:"MU"},{name:"China Southern Airlines",iataCode:"CZ"},{name:"Condor",iataCode:"DE"},{name:"Copa Airlines",iataCode:"CM"},{name:"Delta Air Lines",iataCode:"DL"},{name:"Easyfly",iataCode:"VE"},{name:"EasyJet",iataCode:"U2"},{name:"EcoJet",iataCode:"8J"},{name:"Egyptair",iataCode:"MS"},{name:"El Al",iataCode:"LY"},{name:"Emirates Airlines",iataCode:"EK"},{name:"Ethiopian Airlines",iataCode:"ET"},{name:"Etihad Airways",iataCode:"EY"},{name:"EVA Air",iataCode:"BR"},{name:"Fiji Airways",iataCode:"FJ"},{name:"Finnair",iataCode:"AY"},{name:"Flybondi",iataCode:"FO"},{name:"Flydubai",iataCode:"FZ"},{name:"FlySafair",iataCode:"FA"},{name:"Frontier Airlines",iataCode:"F9"},{name:"Garuda Indonesia",iataCode:"GA"},{name:"Go First",iataCode:"G8"},{name:"Gol Linhas Aereas Inteligentes",iataCode:"G3"},{name:"Hainan Airlines",iataCode:"HU"},{name:"Hawaiian Airlines",iataCode:"HA"},{name:"IndiGo Airlines",iataCode:"6E"},{name:"Japan Airlines",iataCode:"JL"},{name:"Jeju Air",iataCode:"7C"},{name:"Jet2",iataCode:"LS"},{name:"JetBlue Airways",iataCode:"B6"},{name:"JetSMART",iataCode:"JA"},{name:"Juneyao Airlines",iataCode:"HO"},{name:"Kenya Airways",iataCode:"KQ"},{name:"KLM Royal Dutch Airlines",iataCode:"KL"},{name:"Korean Air",iataCode:"KE"},{name:"Kulula.com",iataCode:"MN"},{name:"LATAM Airlines",iataCode:"LA"},{name:"Lion Air",iataCode:"JT"},{name:"LOT Polish Airlines",iataCode:"LO"},{name:"Lufthansa",iataCode:"LH"},{name:"Libyan Airlines",iataCode:"LN"},{name:"Linea Aerea Amaszonas",iataCode:"Z8"},{name:"Malaysia Airlines",iataCode:"MH"},{name:"Nordwind Airlines",iataCode:"N4"},{name:"Norwegian Air Shuttle",iataCode:"DY"},{name:"Oman Air",iataCode:"WY"},{name:"Pakistan International Airlines",iataCode:"PK"},{name:"Pegasus Airlines",iataCode:"PC"},{name:"Philippine Airlines",iataCode:"PR"},{name:"Qantas Group",iataCode:"QF"},{name:"Qatar Airways",iataCode:"QR"},{name:"Republic Airways",iataCode:"YX"},{name:"Royal Air Maroc",iataCode:"AT"},{name:"Ryanair",iataCode:"FR"},{name:"S7 Airlines",iataCode:"S7"},{name:"SAS",iataCode:"SK"},{name:"Satena",iataCode:"9R"},{name:"Saudia",iataCode:"SV"},{name:"Shandong Airlines",iataCode:"SC"},{name:"Sichuan Airlines",iataCode:"3U"},{name:"Singapore Airlines",iataCode:"SQ"},{name:"Sky Airline",iataCode:"H2"},{name:"SkyWest Airlines",iataCode:"OO"},{name:"South African Airways",iataCode:"SA"},{name:"Southwest Airlines",iataCode:"WN"},{name:"SpiceJet",iataCode:"SG"},{name:"Spirit Airlines",iataCode:"NK"},{name:"Spring Airlines",iataCode:"9C"},{name:"SriLankan Airlines",iataCode:"UL"},{name:"Star Peru",iataCode:"2I"},{name:"Sun Country Airlines",iataCode:"SY"},{name:"SunExpress",iataCode:"XQ"},{name:"TAP Air Portugal",iataCode:"TP"},{name:"Thai AirAsia",iataCode:"FD"},{name:"Thai Airways",iataCode:"TG"},{name:"TUI Airways",iataCode:"BY"},{name:"Tunisair",iataCode:"TU"},{name:"Turkish Airlines",iataCode:"TK"},{name:"Ukraine International",iataCode:"PS"},{name:"United Airlines",iataCode:"UA"},{name:"Ural Airlines",iataCode:"U6"},{name:"VietJet Air",iataCode:"VJ"},{name:"Vietnam Airlines",iataCode:"VN"},{name:"Virgin Atlantic Airways",iataCode:"VS"},{name:"Virgin Australia",iataCode:"VA"},{name:"VivaAerobus",iataCode:"VB"},{name:"VOEPASS Linhas Aereas",iataCode:"2Z"},{name:"Volaris",iataCode:"Y4"},{name:"WestJet",iataCode:"WS"},{name:"Wingo",iataCode:"P5"},{name:"Wizz Air",iataCode:"W6"}],Ia=[{name:"Aerospatiale/BAC Concorde",iataTypeCode:"SSC"},{name:"Airbus A300",iataTypeCode:"AB3"},{name:"Airbus A310",iataTypeCode:"310"},{name:"Airbus A310-200",iataTypeCode:"312"},{name:"Airbus A310-300",iataTypeCode:"313"},{name:"Airbus A318",iataTypeCode:"318"},{name:"Airbus A319",iataTypeCode:"319"},{name:"Airbus A319neo",iataTypeCode:"31N"},{name:"Airbus A320",iataTypeCode:"320"},{name:"Airbus A320neo",iataTypeCode:"32N"},{name:"Airbus A321",iataTypeCode:"321"},{name:"Airbus A321neo",iataTypeCode:"32Q"},{name:"Airbus A330",iataTypeCode:"330"},{name:"Airbus A330-200",iataTypeCode:"332"},{name:"Airbus A330-300",iataTypeCode:"333"},{name:"Airbus A330-800neo",iataTypeCode:"338"},{name:"Airbus A330-900neo",iataTypeCode:"339"},{name:"Airbus A340",iataTypeCode:"340"},{name:"Airbus A340-200",iataTypeCode:"342"},{name:"Airbus A340-300",iataTypeCode:"343"},{name:"Airbus A340-500",iataTypeCode:"345"},{name:"Airbus A340-600",iataTypeCode:"346"},{name:"Airbus A350",iataTypeCode:"350"},{name:"Airbus A350-900",iataTypeCode:"359"},{name:"Airbus A350-1000",iataTypeCode:"351"},{name:"Airbus A380",iataTypeCode:"380"},{name:"Airbus A380-800",iataTypeCode:"388"},{name:"Antonov An-12",iataTypeCode:"ANF"},{name:"Antonov An-24",iataTypeCode:"AN4"},{name:"Antonov An-26",iataTypeCode:"A26"},{name:"Antonov An-28",iataTypeCode:"A28"},{name:"Antonov An-30",iataTypeCode:"A30"},{name:"Antonov An-32",iataTypeCode:"A32"},{name:"Antonov An-72",iataTypeCode:"AN7"},{name:"Antonov An-124 Ruslan",iataTypeCode:"A4F"},{name:"Antonov An-140",iataTypeCode:"A40"},{name:"Antonov An-148",iataTypeCode:"A81"},{name:"Antonov An-158",iataTypeCode:"A58"},{name:"Antonov An-225 Mriya",iataTypeCode:"A5F"},{name:"Boeing 707",iataTypeCode:"703"},{name:"Boeing 717",iataTypeCode:"717"},{name:"Boeing 720B",iataTypeCode:"B72"},{name:"Boeing 727",iataTypeCode:"727"},{name:"Boeing 727-100",iataTypeCode:"721"},{name:"Boeing 727-200",iataTypeCode:"722"},{name:"Boeing 737 MAX 7",iataTypeCode:"7M7"},{name:"Boeing 737 MAX 8",iataTypeCode:"7M8"},{name:"Boeing 737 MAX 9",iataTypeCode:"7M9"},{name:"Boeing 737 MAX 10",iataTypeCode:"7MJ"},{name:"Boeing 737",iataTypeCode:"737"},{name:"Boeing 737-100",iataTypeCode:"731"},{name:"Boeing 737-200",iataTypeCode:"732"},{name:"Boeing 737-300",iataTypeCode:"733"},{name:"Boeing 737-400",iataTypeCode:"734"},{name:"Boeing 737-500",iataTypeCode:"735"},{name:"Boeing 737-600",iataTypeCode:"736"},{name:"Boeing 737-700",iataTypeCode:"73G"},{name:"Boeing 737-800",iataTypeCode:"738"},{name:"Boeing 737-900",iataTypeCode:"739"},{name:"Boeing 747",iataTypeCode:"747"},{name:"Boeing 747-100",iataTypeCode:"741"},{name:"Boeing 747-200",iataTypeCode:"742"},{name:"Boeing 747-300",iataTypeCode:"743"},{name:"Boeing 747-400",iataTypeCode:"744"},{name:"Boeing 747-400D",iataTypeCode:"74J"},{name:"Boeing 747-8",iataTypeCode:"748"},{name:"Boeing 747SP",iataTypeCode:"74L"},{name:"Boeing 747SR",iataTypeCode:"74R"},{name:"Boeing 757",iataTypeCode:"757"},{name:"Boeing 757-200",iataTypeCode:"752"},{name:"Boeing 757-300",iataTypeCode:"753"},{name:"Boeing 767",iataTypeCode:"767"},{name:"Boeing 767-200",iataTypeCode:"762"},{name:"Boeing 767-300",iataTypeCode:"763"},{name:"Boeing 767-400",iataTypeCode:"764"},{name:"Boeing 777",iataTypeCode:"777"},{name:"Boeing 777-200",iataTypeCode:"772"},{name:"Boeing 777-200LR",iataTypeCode:"77L"},{name:"Boeing 777-300",iataTypeCode:"773"},{name:"Boeing 777-300ER",iataTypeCode:"77W"},{name:"Boeing 787",iataTypeCode:"787"},{name:"Boeing 787-8",iataTypeCode:"788"},{name:"Boeing 787-9",iataTypeCode:"789"},{name:"Boeing 787-10",iataTypeCode:"781"},{name:"Canadair Challenger",iataTypeCode:"CCJ"},{name:"Canadair CL-44",iataTypeCode:"CL4"},{name:"Canadair Regional Jet 100",iataTypeCode:"CR1"},{name:"Canadair Regional Jet 200",iataTypeCode:"CR2"},{name:"Canadair Regional Jet 700",iataTypeCode:"CR7"},{name:"Canadair Regional Jet 705",iataTypeCode:"CRA"},{name:"Canadair Regional Jet 900",iataTypeCode:"CR9"},{name:"Canadair Regional Jet 1000",iataTypeCode:"CRK"},{name:"De Havilland Canada DHC-2 Beaver",iataTypeCode:"DHP"},{name:"De Havilland Canada DHC-2 Turbo-Beaver",iataTypeCode:"DHR"},{name:"De Havilland Canada DHC-3 Otter",iataTypeCode:"DHL"},{name:"De Havilland Canada DHC-4 Caribou",iataTypeCode:"DHC"},{name:"De Havilland Canada DHC-6 Twin Otter",iataTypeCode:"DHT"},{name:"De Havilland Canada DHC-7 Dash 7",iataTypeCode:"DH7"},{name:"De Havilland Canada DHC-8-100 Dash 8 / 8Q",iataTypeCode:"DH1"},{name:"De Havilland Canada DHC-8-200 Dash 8 / 8Q",iataTypeCode:"DH2"},{name:"De Havilland Canada DHC-8-300 Dash 8 / 8Q",iataTypeCode:"DH3"},{name:"De Havilland Canada DHC-8-400 Dash 8Q",iataTypeCode:"DH4"},{name:"De Havilland DH.104 Dove",iataTypeCode:"DHD"},{name:"De Havilland DH.114 Heron",iataTypeCode:"DHH"},{name:"Douglas DC-3",iataTypeCode:"D3F"},{name:"Douglas DC-6",iataTypeCode:"D6F"},{name:"Douglas DC-8-50",iataTypeCode:"D8T"},{name:"Douglas DC-8-62",iataTypeCode:"D8L"},{name:"Douglas DC-8-72",iataTypeCode:"D8Q"},{name:"Douglas DC-9-10",iataTypeCode:"D91"},{name:"Douglas DC-9-20",iataTypeCode:"D92"},{name:"Douglas DC-9-30",iataTypeCode:"D93"},{name:"Douglas DC-9-40",iataTypeCode:"D94"},{name:"Douglas DC-9-50",iataTypeCode:"D95"},{name:"Douglas DC-10",iataTypeCode:"D10"},{name:"Douglas DC-10-10",iataTypeCode:"D1X"},{name:"Douglas DC-10-30",iataTypeCode:"D1Y"},{name:"Embraer 170",iataTypeCode:"E70"},{name:"Embraer 175",iataTypeCode:"E75"},{name:"Embraer 190",iataTypeCode:"E90"},{name:"Embraer 195",iataTypeCode:"E95"},{name:"Embraer E190-E2",iataTypeCode:"290"},{name:"Embraer E195-E2",iataTypeCode:"295"},{name:"Embraer EMB.110 Bandeirante",iataTypeCode:"EMB"},{name:"Embraer EMB.120 Brasilia",iataTypeCode:"EM2"},{name:"Embraer Legacy 600",iataTypeCode:"ER3"},{name:"Embraer Phenom 100",iataTypeCode:"EP1"},{name:"Embraer Phenom 300",iataTypeCode:"EP3"},{name:"Embraer RJ135",iataTypeCode:"ER3"},{name:"Embraer RJ140",iataTypeCode:"ERD"},{name:"Embraer RJ145 Amazon",iataTypeCode:"ER4"},{name:"Ilyushin IL18",iataTypeCode:"IL8"},{name:"Ilyushin IL62",iataTypeCode:"IL6"},{name:"Ilyushin IL76",iataTypeCode:"IL7"},{name:"Ilyushin IL86",iataTypeCode:"ILW"},{name:"Ilyushin IL96-300",iataTypeCode:"I93"},{name:"Ilyushin IL114",iataTypeCode:"I14"},{name:"Lockheed L-182 / 282 / 382 (L-100) Hercules",iataTypeCode:"LOH"},{name:"Lockheed L-188 Electra",iataTypeCode:"LOE"},{name:"Lockheed L-1011 Tristar",iataTypeCode:"L10"},{name:"Lockheed L-1049 Super Constellation",iataTypeCode:"L49"},{name:"McDonnell Douglas MD11",iataTypeCode:"M11"},{name:"McDonnell Douglas MD80",iataTypeCode:"M80"},{name:"McDonnell Douglas MD81",iataTypeCode:"M81"},{name:"McDonnell Douglas MD82",iataTypeCode:"M82"},{name:"McDonnell Douglas MD83",iataTypeCode:"M83"},{name:"McDonnell Douglas MD87",iataTypeCode:"M87"},{name:"McDonnell Douglas MD88",iataTypeCode:"M88"},{name:"McDonnell Douglas MD90",iataTypeCode:"M90"},{name:"Sukhoi Superjet 100-95",iataTypeCode:"SU9"},{name:"Tupolev Tu-134",iataTypeCode:"TU3"},{name:"Tupolev Tu-154",iataTypeCode:"TU5"},{name:"Tupolev Tu-204",iataTypeCode:"T20"},{name:"Yakovlev Yak-40",iataTypeCode:"YK4"},{name:"Yakovlev Yak-42",iataTypeCode:"YK2"}],Ga=[{name:"Adelaide International Airport",iataCode:"ADL"},{name:"Adolfo Suarez Madrid-Barajas Airport",iataCode:"MAD"},{name:"Aeroparque Jorge Newbery Airport",iataCode:"AEP"},{name:"Afonso Pena International Airport",iataCode:"CWB"},{name:"Alfonso Bonilla Aragon International Airport",iataCode:"CLO"},{name:"Amsterdam Airport Schiphol",iataCode:"AMS"},{name:"Arturo Merino Benitez International Airport",iataCode:"SCL"},{name:"Auckland International Airport",iataCode:"AKL"},{name:"Beijing Capital International Airport",iataCode:"PEK"},{name:"Belem Val de Cans International Airport",iataCode:"BEL"},{name:"Belo Horizonte Tancredo Neves International Airport",iataCode:"CNF"},{name:"Berlin-Tegel Airport",iataCode:"TXL"},{name:"Bole International Airport",iataCode:"ADD"},{name:"Brasilia-Presidente Juscelino Kubitschek International Airport",iataCode:"BSB"},{name:"Brisbane International Airport",iataCode:"BNE"},{name:"Brussels Airport",iataCode:"BRU"},{name:"Cairns Airport",iataCode:"CNS"},{name:"Cairo International Airport",iataCode:"CAI"},{name:"Canberra Airport",iataCode:"CBR"},{name:"Capetown International Airport",iataCode:"CPT"},{name:"Charles de Gaulle International Airport",iataCode:"CDG"},{name:"Charlotte Douglas International Airport",iataCode:"CLT"},{name:"Chengdu Shuangliu International Airport",iataCode:"CTU"},{name:"Chhatrapati Shivaji International Airport",iataCode:"BOM"},{name:"Chicago O'Hare International Airport",iataCode:"ORD"},{name:"Chongqing Jiangbei International Airport",iataCode:"CKG"},{name:"Christchurch International Airport",iataCode:"CHC"},{name:"Copenhagen Kastrup Airport",iataCode:"CPH"},{name:"Dallas Fort Worth International Airport",iataCode:"DFW"},{name:"Daniel K. Inouye International Airport",iataCode:"HNL"},{name:"Denver International Airport",iataCode:"DEN"},{name:"Don Mueang International Airport",iataCode:"DMK"},{name:"Dubai International Airport",iataCode:"DXB"},{name:"Dublin Airport",iataCode:"DUB"},{name:"Dusseldorf Airport",iataCode:"DUS"},{name:"El Dorado International Airport",iataCode:"BOG"},{name:"Eleftherios Venizelos International Airport",iataCode:"ATH"},{name:"Faa'a International Airport",iataCode:"PPT"},{name:"Fort Lauderdale Hollywood International Airport",iataCode:"FLL"},{name:"Fortaleza Pinto Martins International Airport",iataCode:"FOR"},{name:"Frankfurt am Main Airport",iataCode:"FRA"},{name:"George Bush Intercontinental Houston Airport",iataCode:"IAH"},{name:"Gold Coast Airport",iataCode:"OOL"},{name:"Guarulhos - Governador Andre Franco Montoro International Airport",iataCode:"GRU"},{name:"Hartsfield-Jackson Atlanta International Airport",iataCode:"ATL"},{name:"Helsinki Vantaa Airport",iataCode:"HEL"},{name:"Hobart International Airport",iataCode:"HBA"},{name:"Hong Kong International Airport",iataCode:"HKG"},{name:"Houari Boumediene Airport",iataCode:"ALG"},{name:"Hurgada International Airport",iataCode:"HRG"},{name:"Incheon International Airport",iataCode:"ICN"},{name:"Indira Gandhi International Airport",iataCode:"DEL"},{name:"Istanbul Airport",iataCode:"IST"},{name:"Jacksons International Airport",iataCode:"POM"},{name:"Jeju International Airport",iataCode:"CJU"},{name:"John F Kennedy International Airport",iataCode:"JFK"},{name:"Jorge Chavez International Airport",iataCode:"LIM"},{name:"Jose Maria Cordova International Airport",iataCode:"MDE"},{name:"Josep Tarradellas Barcelona-El Prat Airport",iataCode:"BCN"},{name:"Kahului Airport",iataCode:"OGG"},{name:"King Abdulaziz International Airport",iataCode:"JED"},{name:"Kuala Lumpur International Airport",iataCode:"KUL"},{name:"Kunming Changshui International Airport",iataCode:"KMG"},{name:"La Tontouta International Airport",iataCode:"NOU"},{name:"Leonardo da Vinci-Fiumicino Airport",iataCode:"FCO"},{name:"London Heathrow Airport",iataCode:"LHR"},{name:"Los Angeles International Airport",iataCode:"LAX"},{name:"McCarran International Airport",iataCode:"LAS"},{name:"Melbourne International Airport",iataCode:"MEL"},{name:"Mexico City International Airport",iataCode:"MEX"},{name:"Miami International Airport",iataCode:"MIA"},{name:"Ministro Pistarini International Airport",iataCode:"EZE"},{name:"Minneapolis-St Paul International/Wold-Chamberlain Airport",iataCode:"MSP"},{name:"Mohammed V International Airport",iataCode:"CMN"},{name:"Moscow Domodedovo Airport",iataCode:"DME"},{name:"Munich Airport",iataCode:"MUC"},{name:"Murtala Muhammed International Airport",iataCode:"LOS"},{name:"Nadi International Airport",iataCode:"NAN"},{name:"Nairobi Jomo Kenyatta International Airport",iataCode:"NBO"},{name:"Narita International Airport",iataCode:"NRT"},{name:"Newark Liberty International Airport",iataCode:"EWR"},{name:"Ninoy Aquino International Airport",iataCode:"MNL"},{name:"Noumea Magenta Airport",iataCode:"GEA"},{name:"O. R. Tambo International Airport",iataCode:"JNB"},{name:"Orlando International Airport",iataCode:"MCO"},{name:"Oslo Lufthavn",iataCode:"OSL"},{name:"Perth Airport",iataCode:"PER"},{name:"Phoenix Sky Harbor International Airport",iataCode:"PHX"},{name:"Recife Guararapes-Gilberto Freyre International Airport",iataCode:"REC"},{name:"Rio de Janeiro Galeao International Airport",iataCode:"GIG"},{name:"Salgado Filho International Airport",iataCode:"POA"},{name:"Salvador Deputado Luis Eduardo Magalhaes International Airport",iataCode:"SSA"},{name:"San Francisco International Airport",iataCode:"SFO"},{name:"Santos Dumont Airport",iataCode:"SDU"},{name:"Sao Paulo-Congonhas Airport",iataCode:"CGH"},{name:"Seattle Tacoma International Airport",iataCode:"SEA"},{name:"Shanghai Hongqiao International Airport",iataCode:"SHA"},{name:"Shanghai Pudong International Airport",iataCode:"PVG"},{name:"Shenzhen Bao'an International Airport",iataCode:"SZX"},{name:"Sheremetyevo International Airport",iataCode:"SVO"},{name:"Singapore Changi Airport",iataCode:"SIN"},{name:"Soekarno-Hatta International Airport",iataCode:"CGK"},{name:'Stockholm-Arlanda Airport"',iataCode:"ARN"},{name:"Suvarnabhumi Airport",iataCode:"BKK"},{name:"Sydney Kingsford Smith International Airport",iataCode:"SYD"},{name:"Taiwan Taoyuan International Airport",iataCode:"TPE"},{name:"Tan Son Nhat International Airport",iataCode:"SGN"},{name:"Tokyo Haneda International Airport",iataCode:"HND"},{name:"Toronto Pearson International Airport",iataCode:"YYZ"},{name:"Tunis Carthage International Airport",iataCode:"TUN"},{name:"Vancouver International Airport",iataCode:"YVR"},{name:"Vienna International Airport",iataCode:"VIE"},{name:"Viracopos International Airport",iataCode:"VCP"},{name:"Vnukovo International Airport",iataCode:"VKO"},{name:"Wellington International Airport",iataCode:"WLG"},{name:"Xi'an Xianyang International Airport",iataCode:"XIY"},{name:"Zhukovsky International Airport",iataCode:"ZIA"},{name:"Zurich Airport",iataCode:"ZRH"}],_a={airline:Ha,airplane:Ia,airport:Ga},Wa=_a,Ka=["American black bear","Asian black bear","Brown bear","Giant panda","Polar bear","Sloth bear","Spectacled bear","Sun bear"],$a=["Abert's Towhee","Acadian Flycatcher","Acorn Woodpecker","Alder Flycatcher","Aleutian Tern","Allen's Hummingbird","Altamira Oriole","American Avocet","American Bittern","American Black Duck","American Coot","American Crow","American Dipper","American Golden-Plover","American Goldfinch","American Kestrel","American Oystercatcher","American Pipit","American Redstart","American Robin","American Tree Sparrow","American White Pelican","American Wigeon","American Woodcock","Ancient Murrelet","Anhinga","Anna's Hummingbird","Antillean Nighthawk","Antillean Palm Swift","Aplomado Falcon","Arctic Loon","Arctic Tern","Arctic Warbler","Ash-throated Flycatcher","Ashy Storm-Petrel","Asian Brown Flycatcher","Atlantic Puffin","Audubon's Oriole","Audubon's Shearwater","Aztec Thrush","Azure Gallinule","Bachman's Sparrow","Bachman's Warbler","Bahama Mockingbird","Bahama Swallow","Bahama Woodstar","Baikal Teal","Baird's Sandpiper","Baird's Sparrow","Bald Eagle","Baltimore Oriole","Bananaquit","Band-rumped Storm-Petrel","Band-tailed Gull","Band-tailed Pigeon","Bank Swallow","Bar-tailed Godwit","Barn Owl","Barn Swallow","Barnacle Goose","Barred Owl","Barrow's Goldeneye","Bay-breasted Warbler","Bean Goose","Bell's Vireo","Belted Kingfisher","Bendire's Thrasher","Berylline Hummingbird","Bewick's Wren","Bicknell's Thrush","Black Catbird","Black Guillemot","Black Noddy","Black Oystercatcher","Black Phoebe","Black Rail","Black Rosy-Finch","Black Scoter","Black Skimmer","Black Storm-Petrel","Black Swift","Black Tern","Black Turnstone","Black Vulture","Black-and-white Warbler","Black-backed Wagtail","Black-backed Woodpecker","Black-bellied Plover","Black-bellied Whistling-Duck","Black-billed Cuckoo","Black-billed Magpie","Black-browed Albatross","Black-capped Chickadee","Black-capped Gnatcatcher","Black-capped Petrel","Black-capped Vireo","Black-chinned Hummingbird","Black-chinned Sparrow","Black-crowned Night-Heron","Black-faced Grassquit","Black-footed Albatross","Black-headed Grosbeak","Black-headed Gull","Black-legged Kittiwake","Black-necked Stilt","Black-tailed Gnatcatcher","Black-tailed Godwit","Black-tailed Gull","Black-throated Blue Warbler","Black-throated Gray Warbler","Black-throated Green Warbler","Black-throated Sparrow","Black-vented Oriole","Black-vented Shearwater","Black-whiskered Vireo","Black-winged Stilt","Blackburnian Warbler","Blackpoll Warbler","Blue Bunting","Blue Grosbeak","Blue Grouse","Blue Jay","Blue Mockingbird","Blue-footed Booby","Blue-gray Gnatcatcher","Blue-headed Vireo","Blue-throated Hummingbird","Blue-winged Teal","Blue-winged Warbler","Bluethroat","Boat-tailed Grackle","Bobolink","Bohemian Waxwing","Bonaparte's Gull","Boreal Chickadee","Boreal Owl","Botteri's Sparrow","Brambling","Brandt's Cormorant","Brant","Brewer's Blackbird","Brewer's Sparrow","Bridled Tern","Bridled Titmouse","Bristle-thighed Curlew","Broad-billed Hummingbird","Broad-billed Sandpiper","Broad-tailed Hummingbird","Broad-winged Hawk","Bronzed Cowbird","Brown Booby","Brown Creeper","Brown Jay","Brown Noddy","Brown Pelican","Brown Shrike","Brown Thrasher","Brown-capped Rosy-Finch","Brown-chested Martin","Brown-crested Flycatcher","Brown-headed Cowbird","Brown-headed Nuthatch","Budgerigar","Buff-bellied Hummingbird","Buff-breasted Flycatcher","Buff-breasted Sandpiper","Buff-collared Nightjar","Bufflehead","Buller's Shearwater","Bullock's Oriole","Bumblebee Hummingbird","Burrowing Owl","Bushtit","Cactus Wren","California Condor","California Gnatcatcher","California Gull","California Quail","California Thrasher","California Towhee","Calliope Hummingbird","Canada Goose","Canada Warbler","Canvasback","Canyon Towhee","Canyon Wren","Cape May Warbler","Caribbean Elaenia","Carolina Chickadee","Carolina Parakeet","Carolina Wren","Caspian Tern","Cassin's Auklet","Cassin's Finch","Cassin's Kingbird","Cassin's Sparrow","Cassin's Vireo","Cattle Egret","Cave Swallow","Cedar Waxwing","Cerulean Warbler","Chestnut-backed Chickadee","Chestnut-collared Longspur","Chestnut-sided Warbler","Chihuahuan Raven","Chimney Swift","Chinese Egret","Chipping Sparrow","Chuck-will's-widow","Chukar","Cinnamon Hummingbird","Cinnamon Teal","Citrine Wagtail","Clapper Rail","Clark's Grebe","Clark's Nutcracker","Clay-colored Robin","Clay-colored Sparrow","Cliff Swallow","Colima Warbler","Collared Forest-Falcon","Collared Plover","Common Black-Hawk","Common Chaffinch","Common Crane","Common Cuckoo","Common Eider","Common Goldeneye","Common Grackle","Common Greenshank","Common Ground-Dove","Common House-Martin","Common Loon","Common Merganser","Common Moorhen","Common Murre","Common Nighthawk","Common Pauraque","Common Pochard","Common Poorwill","Common Raven","Common Redpoll","Common Ringed Plover","Common Rosefinch","Common Sandpiper","Common Snipe","Common Swift","Common Tern","Common Yellowthroat","Connecticut Warbler","Cook's Petrel","Cooper's Hawk","Cordilleran Flycatcher","Corn Crake","Cory's Shearwater","Costa's Hummingbird","Couch's Kingbird","Crane Hawk","Craveri's Murrelet","Crescent-chested Warbler","Crested Auklet","Crested Caracara","Crested Myna","Crimson-collared Grosbeak","Crissal Thrasher","Cuban Martin","Curlew Sandpiper","Curve-billed Thrasher","Dark-eyed Junco","Dickcissel","Double-crested Cormorant","Double-striped Thick-knee","Dovekie","Downy Woodpecker","Dunlin","Dusky Flycatcher","Dusky Thrush","Dusky Warbler","Dusky-capped Flycatcher","Eared Grebe","Eared Trogon","Eastern Bluebird","Eastern Kingbird","Eastern Meadowlark","Eastern Phoebe","Eastern Screech-Owl","Eastern Towhee","Eastern Wood-Pewee","Elegant Tern","Elegant Trogon","Elf Owl","Emperor Goose","Eskimo Curlew","Eurasian Blackbird","Eurasian Bullfinch","Eurasian Collared-Dove","Eurasian Coot","Eurasian Curlew","Eurasian Dotterel","Eurasian Hobby","Eurasian Jackdaw","Eurasian Kestrel","Eurasian Oystercatcher","Eurasian Siskin","Eurasian Tree Sparrow","Eurasian Wigeon","Eurasian Woodcock","Eurasian Wryneck","European Golden-Plover","European Starling","European Storm-Petrel","European Turtle-Dove","Evening Grosbeak","Eyebrowed Thrush","Falcated Duck","Fan-tailed Warbler","Far Eastern Curlew","Ferruginous Hawk","Ferruginous Pygmy-Owl","Field Sparrow","Fieldfare","Fish Crow","Five-striped Sparrow","Flame-colored Tanager","Flammulated Owl","Flesh-footed Shearwater","Florida Scrub-Jay","Fork-tailed Flycatcher","Fork-tailed Storm-Petrel","Fork-tailed Swift","Forster's Tern","Fox Sparrow","Franklin's Gull","Fulvous Whistling-Duck","Gadwall","Gambel's Quail","Garganey","Gila Woodpecker","Gilded Flicker","Glaucous Gull","Glaucous-winged Gull","Glossy Ibis","Golden Eagle","Golden-cheeked Warbler","Golden-crowned Kinglet","Golden-crowned Sparrow","Golden-crowned Warbler","Golden-fronted Woodpecker","Golden-winged Warbler","Grace's Warbler","Grasshopper Sparrow","Gray Bunting","Gray Catbird","Gray Flycatcher","Gray Hawk","Gray Jay","Gray Kingbird","Gray Partridge","Gray Silky-flycatcher","Gray Vireo","Gray Wagtail","Gray-breasted Martin","Gray-cheeked Thrush","Gray-crowned Rosy-Finch","Gray-crowned Yellowthroat","Gray-headed Chickadee","Gray-spotted Flycatcher","Gray-tailed Tattler","Great Auk","Great Black-backed Gull","Great Blue Heron","Great Cormorant","Great Crested Flycatcher","Great Egret","Great Frigatebird","Great Gray Owl","Great Horned Owl","Great Kiskadee","Great Knot","Great Skua","Great Spotted Woodpecker","Great-tailed Grackle","Greater Flamingo","Greater Pewee","Greater Prairie-chicken","Greater Roadrunner","Greater Scaup","Greater Shearwater","Greater White-fronted Goose","Greater Yellowlegs","Green Heron","Green Jay","Green Kingfisher","Green Sandpiper","Green Violet-ear","Green-breasted Mango","Green-tailed Towhee","Green-winged Teal","Greenish Elaenia","Groove-billed Ani","Gull-billed Tern","Gyrfalcon","Hairy Woodpecker","Hammond's Flycatcher","Harlequin Duck","Harris's Hawk","Harris's Sparrow","Hawfinch","Heermann's Gull","Henslow's Sparrow","Hepatic Tanager","Herald Petrel","Hermit Thrush","Hermit Warbler","Herring Gull","Himalayan Snowcock","Hoary Redpoll","Hooded Merganser","Hooded Oriole","Hooded Warbler","Hook-billed Kite","Hoopoe","Horned Grebe","Horned Lark","Horned Puffin","House Finch","House Sparrow","House Wren","Hudsonian Godwit","Hutton's Vireo","Iceland Gull","Inca Dove","Indigo Bunting","Island Scrub-Jay","Ivory Gull","Ivory-billed Woodpecker","Jabiru","Jack Snipe","Jungle Nightjar","Juniper Titmouse","Kentucky Warbler","Key West Quail-Dove","Killdeer","King Eider","King Rail","Kirtland's Warbler","Kittlitz's Murrelet","La Sagra's Flycatcher","Labrador Duck","Ladder-backed Woodpecker","Lanceolated Warbler","Lapland Longspur","Large-billed Tern","Lark Bunting","Lark Sparrow","Laughing Gull","Lawrence's Goldfinch","Laysan Albatross","Lazuli Bunting","Le Conte's Sparrow","Le Conte's Thrasher","Leach's Storm-Petrel","Least Auklet","Least Bittern","Least Flycatcher","Least Grebe","Least Sandpiper","Least Storm-Petrel","Least Tern","Lesser Black-backed Gull","Lesser Frigatebird","Lesser Goldfinch","Lesser Nighthawk","Lesser Prairie-chicken","Lesser Scaup","Lesser White-fronted Goose","Lesser Yellowlegs","Lewis's Woodpecker","Limpkin","Lincoln's Sparrow","Little Blue Heron","Little Bunting","Little Curlew","Little Egret","Little Gull","Little Ringed Plover","Little Shearwater","Little Stint","Loggerhead Kingbird","Loggerhead Shrike","Long-billed Curlew","Long-billed Dowitcher","Long-billed Murrelet","Long-billed Thrasher","Long-eared Owl","Long-tailed Jaeger","Long-toed Stint","Louisiana Waterthrush","Lucifer Hummingbird","Lucy's Warbler","MacGillivray's Warbler","Magnificent Frigatebird","Magnificent Hummingbird","Magnolia Warbler","Mallard","Mangrove Cuckoo","Manx Shearwater","Marbled Godwit","Marbled Murrelet","Marsh Sandpiper","Marsh Wren","Masked Booby","Masked Duck","Masked Tityra","McCown's Longspur","McKay's Bunting","Merlin","Mew Gull","Mexican Chickadee","Mexican Jay","Middendorff's Grasshopper-Warbler","Mississippi Kite","Mongolian Plover","Monk Parakeet","Montezuma Quail","Mottled Duck","Mottled Owl","Mottled Petrel","Mountain Bluebird","Mountain Chickadee","Mountain Plover","Mountain Quail","Mourning Dove","Mourning Warbler","Mugimaki Flycatcher","Murphy's Petrel","Muscovy Duck","Mute Swan","Narcissus Flycatcher","Nashville Warbler","Nelson's Sharp-tailed Sparrow","Neotropic Cormorant","Northern Beardless-Tyrannulet","Northern Bobwhite","Northern Cardinal","Northern Flicker","Northern Fulmar","Northern Gannet","Northern Goshawk","Northern Harrier","Northern Hawk Owl","Northern Jacana","Northern Lapwing","Northern Mockingbird","Northern Parula","Northern Pintail","Northern Pygmy-Owl","Northern Rough-winged Swallow","Northern Saw-whet Owl","Northern Shoveler","Northern Shrike","Northern Waterthrush","Northern Wheatear","Northwestern Crow","Nuttall's Woodpecker","Nutting's Flycatcher","Oak Titmouse","Oldsquaw","Olive Sparrow","Olive Warbler","Olive-backed Pipit","Olive-sided Flycatcher","Orange-crowned Warbler","Orchard Oriole","Oriental Cuckoo","Oriental Greenfinch","Oriental Pratincole","Oriental Scops-Owl","Oriental Turtle-Dove","Osprey","Ovenbird","Pacific Golden-Plover","Pacific Loon","Pacific-slope Flycatcher","Paint-billed Crake","Painted Bunting","Painted Redstart","Pallas's Bunting","Palm Warbler","Parakeet Auklet","Parasitic Jaeger","Passenger Pigeon","Pechora Pipit","Pectoral Sandpiper","Pelagic Cormorant","Peregrine Falcon","Phainopepla","Philadelphia Vireo","Pied-billed Grebe","Pigeon Guillemot","Pileated Woodpecker","Pin-tailed Snipe","Pine Bunting","Pine Grosbeak","Pine Siskin","Pine Warbler","Pink-footed Goose","Pink-footed Shearwater","Pinyon Jay","Piping Plover","Plain Chachalaca","Plain-capped Starthroat","Plumbeous Vireo","Pomarine Jaeger","Prairie Falcon","Prairie Warbler","Prothonotary Warbler","Purple Finch","Purple Gallinule","Purple Martin","Purple Sandpiper","Pygmy Nuthatch","Pyrrhuloxia","Razorbill","Red Crossbill","Red Knot","Red Phalarope","Red-bellied Woodpecker","Red-billed Pigeon","Red-billed Tropicbird","Red-breasted Flycatcher","Red-breasted Merganser","Red-breasted Nuthatch","Red-breasted Sapsucker","Red-cockaded Woodpecker","Red-crowned Parrot","Red-eyed Vireo","Red-faced Cormorant","Red-faced Warbler","Red-flanked Bluetail","Red-footed Booby","Red-headed Woodpecker","Red-legged Kittiwake","Red-naped Sapsucker","Red-necked Grebe","Red-necked Phalarope","Red-necked Stint","Red-shouldered Hawk","Red-tailed Hawk","Red-tailed Tropicbird","Red-throated Loon","Red-throated Pipit","Red-whiskered Bulbul","Red-winged Blackbird","Reddish Egret","Redhead","Redwing","Reed Bunting","Rhinoceros Auklet","Ring-billed Gull","Ring-necked Duck","Ring-necked Pheasant","Ringed Kingfisher","Roadside Hawk","Rock Dove","Rock Ptarmigan","Rock Sandpiper","Rock Wren","Rose-breasted Grosbeak","Rose-throated Becard","Roseate Spoonbill","Roseate Tern","Ross's Goose","Ross's Gull","Rough-legged Hawk","Royal Tern","Ruby-crowned Kinglet","Ruby-throated Hummingbird","Ruddy Duck","Ruddy Ground-Dove","Ruddy Quail-Dove","Ruddy Turnstone","Ruff","Ruffed Grouse","Rufous Hummingbird","Rufous-backed Robin","Rufous-capped Warbler","Rufous-crowned Sparrow","Rufous-winged Sparrow","Rustic Bunting","Rusty Blackbird","Sabine's Gull","Sage Grouse","Sage Sparrow","Sage Thrasher","Saltmarsh Sharp-tailed Sparrow","Sanderling","Sandhill Crane","Sandwich Tern","Savannah Sparrow","Say's Phoebe","Scaled Quail","Scaly-naped Pigeon","Scarlet Ibis","Scarlet Tanager","Scissor-tailed Flycatcher","Scott's Oriole","Seaside Sparrow","Sedge Wren","Semipalmated Plover","Semipalmated Sandpiper","Sharp-shinned Hawk","Sharp-tailed Grouse","Sharp-tailed Sandpiper","Shiny Cowbird","Short-billed Dowitcher","Short-eared Owl","Short-tailed Albatross","Short-tailed Hawk","Short-tailed Shearwater","Shy Albatross","Siberian Accentor","Siberian Blue Robin","Siberian Flycatcher","Siberian Rubythroat","Sky Lark","Slate-throated Redstart","Slaty-backed Gull","Slender-billed Curlew","Smew","Smith's Longspur","Smooth-billed Ani","Snail Kite","Snow Bunting","Snow Goose","Snowy Egret","Snowy Owl","Snowy Plover","Solitary Sandpiper","Song Sparrow","Sooty Shearwater","Sooty Tern","Sora","South Polar Skua","Southern Martin","Spectacled Eider","Spoonbill Sandpiper","Spot-billed Duck","Spot-breasted Oriole","Spotted Dove","Spotted Owl","Spotted Rail","Spotted Redshank","Spotted Sandpiper","Spotted Towhee","Sprague's Pipit","Spruce Grouse","Stejneger's Petrel","Steller's Eider","Steller's Jay","Steller's Sea-Eagle","Stilt Sandpiper","Stonechat","Streak-backed Oriole","Streaked Shearwater","Strickland's Woodpecker","Stripe-headed Tanager","Sulphur-bellied Flycatcher","Summer Tanager","Surf Scoter","Surfbird","Swainson's Hawk","Swainson's Thrush","Swainson's Warbler","Swallow-tailed Kite","Swamp Sparrow","Tamaulipas Crow","Tawny-shouldered Blackbird","Temminck's Stint","Tennessee Warbler","Terek Sandpiper","Thayer's Gull","Thick-billed Kingbird","Thick-billed Murre","Thick-billed Parrot","Thick-billed Vireo","Three-toed Woodpecker","Townsend's Solitaire","Townsend's Warbler","Tree Pipit","Tree Swallow","Tricolored Blackbird","Tricolored Heron","Tropical Kingbird","Tropical Parula","Trumpeter Swan","Tufted Duck","Tufted Flycatcher","Tufted Puffin","Tufted Titmouse","Tundra Swan","Turkey Vulture","Upland Sandpiper","Varied Bunting","Varied Thrush","Variegated Flycatcher","Vaux's Swift","Veery","Verdin","Vermilion Flycatcher","Vesper Sparrow","Violet-crowned Hummingbird","Violet-green Swallow","Virginia Rail","Virginia's Warbler","Wandering Albatross","Wandering Tattler","Warbling Vireo","Wedge-rumped Storm-Petrel","Wedge-tailed Shearwater","Western Bluebird","Western Grebe","Western Gull","Western Kingbird","Western Meadowlark","Western Reef-Heron","Western Sandpiper","Western Screech-Owl","Western Scrub-Jay","Western Tanager","Western Wood-Pewee","Whimbrel","Whip-poor-will","Whiskered Auklet","Whiskered Screech-Owl","Whiskered Tern","White Ibis","White Wagtail","White-breasted Nuthatch","White-cheeked Pintail","White-chinned Petrel","White-collared Seedeater","White-collared Swift","White-crowned Pigeon","White-crowned Sparrow","White-eared Hummingbird","White-eyed Vireo","White-faced Ibis","White-faced Storm-Petrel","White-headed Woodpecker","White-rumped Sandpiper","White-tailed Eagle","White-tailed Hawk","White-tailed Kite","White-tailed Ptarmigan","White-tailed Tropicbird","White-throated Needletail","White-throated Robin","White-throated Sparrow","White-throated Swift","White-tipped Dove","White-winged Crossbill","White-winged Dove","White-winged Parakeet","White-winged Scoter","White-winged Tern","Whooper Swan","Whooping Crane","Wild Turkey","Willet","Williamson's Sapsucker","Willow Flycatcher","Willow Ptarmigan","Wilson's Phalarope","Wilson's Plover","Wilson's Storm-Petrel","Wilson's Warbler","Winter Wren","Wood Duck","Wood Sandpiper","Wood Stork","Wood Thrush","Wood Warbler","Worm-eating Warbler","Worthen's Sparrow","Wrentit","Xantus's Hummingbird","Xantus's Murrelet","Yellow Bittern","Yellow Grosbeak","Yellow Rail","Yellow Wagtail","Yellow Warbler","Yellow-bellied Flycatcher","Yellow-bellied Sapsucker","Yellow-billed Cuckoo","Yellow-billed Loon","Yellow-billed Magpie","Yellow-breasted Bunting","Yellow-breasted Chat","Yellow-crowned Night-Heron","Yellow-eyed Junco","Yellow-faced Grassquit","Yellow-footed Gull","Yellow-green Vireo","Yellow-headed Blackbird","Yellow-legged Gull","Yellow-nosed Albatross","Yellow-rumped Warbler","Yellow-throated Vireo","Yellow-throated Warbler","Yucatan Vireo","Zenaida Dove","Zone-tailed Hawk"],Oa=["Abyssinian","American Bobtail","American Curl","American Shorthair","American Wirehair","Balinese","Bengal","Birman","Bombay","British Shorthair","Burmese","Chartreux","Chausie","Cornish Rex","Devon Rex","Donskoy","Egyptian Mau","Exotic Shorthair","Havana","Highlander","Himalayan","Japanese Bobtail","Korat","Kurilian Bobtail","LaPerm","Maine Coon","Manx","Minskin","Munchkin","Nebelung","Norwegian Forest Cat","Ocicat","Ojos Azules","Oriental","Persian","Peterbald","Pixiebob","Ragdoll","Russian Blue","Savannah","Scottish Fold","Selkirk Rex","Serengeti","Siamese","Siberian","Singapura","Snowshoe","Sokoke","Somali","Sphynx","Thai","Tonkinese","Toyger","Turkish Angora","Turkish Van"],za=["Amazon River Dolphin","Arnoux's Beaked Whale","Atlantic Humpbacked Dolphin","Atlantic Spotted Dolphin","Atlantic White-Sided Dolphin","Australian Snubfin Dolphin","Australian humpback Dolphin","Blue Whale","Bottlenose Dolphin","Bryde’s whale","Burrunan Dolphin","Chilean Dolphin","Chinese River Dolphin","Chinese White Dolphin","Clymene Dolphin","Commerson’s Dolphin","Costero","Dusky Dolphin","False Killer Whale","Fin Whale","Fraser’s Dolphin","Ganges River Dolphin","Guiana Dolphin","Heaviside’s Dolphin","Hector’s Dolphin","Hourglass Dolphin","Humpback whale","Indo-Pacific Bottlenose Dolphin","Indo-Pacific Hump-backed Dolphin","Irrawaddy Dolphin","Killer Whale (Orca)","La Plata Dolphin","Long-Beaked Common Dolphin","Long-finned Pilot Whale","Longman's Beaked Whale","Melon-headed Whale","Northern Rightwhale Dolphin","Omura’s whale","Pacific White-Sided Dolphin","Pantropical Spotted Dolphin","Peale’s Dolphin","Pygmy Killer Whale","Risso’s Dolphin","Rough-Toothed Dolphin","Sei Whale","Short-Beaked Common Dolphin","Short-finned Pilot Whale","Southern Bottlenose Whale","Southern Rightwhale Dolphin","Sperm Whale","Spinner Dolphin","Striped Dolphin","Tucuxi","White-Beaked Dolphin"],Ja=["Aberdeen Angus","Abergele","Abigar","Abondance","Abyssinian Shorthorned Zebu","Aceh","Achham","Adamawa","Adaptaur","Afar","Africangus","Afrikaner","Agerolese","Alambadi","Alatau","Albanian","Albera","Alderney","Alentejana","Aleutian wild cattle","Aliad Dinka","Alistana-Sanabresa","Allmogekor","Alur","American","American Angus","American Beef Friesian","American Brown Swiss","American Milking Devon","American White Park","Amerifax","Amrit Mahal","Amsterdam Island cattle","Anatolian Black","Andalusian Black","Andalusian Blond","Andalusian Grey","Angeln","Angoni","Ankina","Ankole","Ankole-Watusi","Aracena","Arado","Argentine Criollo","Argentine Friesian","Armorican","Arouquesa","Arsi","Asturian Mountain","Asturian Valley","Aubrac","Aulie-Ata","Aure et Saint-Girons","Australian Braford","Australian Brangus","Australian Charbray","Australian Friesian Sahiwal","Australian Lowline","Australian Milking Zebu","Australian Shorthorn","Austrian Simmental","Austrian Yellow","Avileña-Negra Ibérica","Avétonou","Aweil Dinka","Ayrshire","Azaouak","Azebuado","Azerbaijan Zebu","Azores","Bachaur cattle","Baherie cattle","Bakosi cattle","Balancer","Baoule","Bargur cattle","Barrosã","Barzona","Bazadaise","Beef Freisian","Beefalo","Beefmaker","Beefmaster","Begayt","Belgian Blue","Belgian Red","Belgian Red Pied","Belgian White-and-Red","Belmont Red","Belted Galloway","Bernese","Berrenda cattle","Betizu","Bianca Modenese","Blaarkop","Black Angus","Black Baldy","Black Hereford","Blanca Cacereña","Blanco Orejinegro BON","Blonde d'Aquitaine","Blue Albion","Blue Grey","Bohuskulla","Bonsmara","Boran","Boškarin","Braford","Brahman","Brahmousin","Brangus","Braunvieh","Brava","Breed","British Friesian","British White","Brown Carpathian","Brown Caucasian","Brown Swiss","Bue Lingo","Burlina","Bushuyev","Butana cattle","Buša cattle","Cachena","Caldelana","Camargue","Campbell Island cattle","Canadian Speckle Park","Canadienne","Canaria","Canchim","Caracu","Carinthian Blondvieh","Carora","Charbray","Charolais","Chateaubriand","Chiangus","Chianina","Chillingham cattle","Chinese Black Pied","Cholistani","Coloursided White Back","Commercial","Corriente","Corsican cattle","Costeño con Cuernos","Crioulo Lageano","Cárdena Andaluza","Dajal","Dangi cattle","Danish Black-Pied","Danish Jersey","Danish Red","Deep Red cattle","Deoni","Devon","Dexter cattle","Dhanni","Doayo cattle","Doela","Drakensberger","Droughtmaster","Dulong'","Dutch Belted","Dutch Friesian","Dwarf Lulu","Dølafe","East Anatolian Red","Eastern Finncattle","Eastern Red Polled","Enderby Island cattle","English Longhorn","Ennstaler Bergscheck","Estonian Holstein","Estonian Native","Estonian Red cattle","Finncattle","Finnish Ayrshire","Finnish Holstein-Friesian","Fjäll","Fleckvieh","Florida Cracker cattle","Fogera","French Simmental","Fribourgeoise","Friesian Red and White","Fulani Sudanese","Fēng Cattle","Galician Blond","Galloway cattle","Gangatiri","Gaolao","Garvonesa","Gascon cattle","Gelbvieh","Georgian Mountain cattle","German Angus","German Black Pied Dairy","German Black Pied cattle","German Red Pied","Gir","Glan cattle","Gloucester","Gobra","Greek Shorthorn","Greek Steppe","Greyman cattle","Gudali","Guernsey cattle","Guzerá","Hallikar4","Hanwoo","Hariana cattle","Hartón del Valle","Harzer Rotvieh","Hays Converter","Heck cattle","Hereford","Herens","Highland cattle","Hinterwald","Holando-Argentino","Holstein Friesian cattle","Horro","Hungarian Grey","Huáng Cattle","Hybridmaster","Iberian cattle","Icelandic","Illawarra cattle","Improved Red and White","Indo-Brazilian","Irish Moiled","Israeli Holstein","Israeli Red","Istoben cattle","Istrian cattle","Jamaica Black","Jamaica Hope","Jamaica Red","Japanese Brown","Jarmelista","Javari cattle","Jersey cattle","Jutland cattle","Kabin Buri cattle","Kalmyk cattle","Kamphaeng Saen cattle","Kangayam","Kankrej","Karan Swiss","Kasaragod Dwarf cattle","Kathiawadi","Kazakh Whiteheaded","Kenana cattle","Kenkatha cattle","Kerry cattle","Kherigarh","Khillari cattle","Kholomogory","Korat Wagyu","Kostroma cattle","Krishna Valley cattle","Kurgan cattle","Kuri","La Reina cattle","Lakenvelder cattle","Lampurger","Latvian Blue","Latvian Brown","Latvian Danish Red","Lebedyn","Levantina","Limia cattle","Limousin","Limpurger","Lincoln Red","Lineback","Lithuanian Black-and-White","Lithuanian Light Grey","Lithuanian Red","Lithuanian White-Backed","Lohani cattle","Lourdais","Lucerna cattle","Luing","Madagascar Zebu","Madura","Maine-Anjou","Malnad Gidda","Malvi","Mandalong Special","Mantequera Leonesa","Maramureş Brown","Marchigiana","Maremmana","Marinhoa","Maronesa","Masai","Mashona","Menorquina","Mertolenga","Meuse-Rhine-Issel","Mewati","Milking Shorthorn","Minhota","Mirandesa","Mirkadim","Mocăniţă","Mollie","Monchina","Mongolian","Montbéliarde","Morucha","Murboden","Murnau-Werdenfels","Murray Grey","Muturu","N'Dama","Nagori","Negra Andaluza","Nelore","Nguni","Nimari","Normande","North Bengal Grey","Northern Finncattle","Northern Shorthorn","Norwegian Red","Ongole","Original Simmental","Pajuna","Palmera","Pantaneiro","Parda Alpina","Parthenaise","Pasiega","Pembroke","Philippine Native","Pie Rouge des Plaines","Piedmontese cattle","Pineywoods","Pinzgauer","Pirenaica","Podolac","Podolica","Polish Black-and-White","Polish Red","Poll Shorthorn","Polled Hereford","Polled Shorthorn","Ponwar","Preta","Pulikulam","Punganur","Pustertaler Sprinzen","Qinchaun","Queensland Miniature Boran","RX3","Ramo Grande","Randall","Raramuri Criollo","Rathi","Raya","Red Angus","Red Brangus","Red Chittagong","Red Fulani","Red Gorbatov","Red Holstein","Red Kandhari","Red Mingrelian","Red Poll","Red Polled Østland","Red Sindhi","Retinta","Riggit Galloway","Ringamåla","Rohjan","Romagnola","Romanian Bălţata","Romanian Steppe Gray","Romosinuano","Russian Black Pied","Rätisches Grauvieh","Sahiwal","Salers","Salorn","Sanga","Sanhe","Santa Cruz","Santa Gertrudis","Sayaguesa","Schwyz","Selembu","Senepol","Serbian Pied","Serbian Steppe","Sheko","Shetland","Shorthorn","Siboney de Cuba","Simbrah","Simford","Simmental","Siri","South Devon","Spanish Fighting Bull","Speckle Park","Square Meater","Sussex","Swedish Friesian","Swedish Polled","Swedish Red Pied","Swedish Red Polled","Swedish Red-and-White","Tabapuã","Tarentaise","Tasmanian Grey","Tauros","Telemark","Texas Longhorn","Texon","Thai Black","Thai Fighting Bull","Thai Friesian","Thai Milking Zebu","Tharparkar","Tswana","Tudanca","Tuli","Tulim","Turkish Grey Steppe","Tux-Zillertal","Tyrol Grey","Ukrainian Grey","Umblachery","Valdostana Castana","Valdostana Pezzata Nera","Valdostana Pezzata Rossa","Vaynol","Vechur8","Vestland Fjord","Vestland Red Polled","Vianesa","Volinian Beef","Vorderwald","Vosgienne","Väneko","Waguli","Wagyu","Wangus","Welsh Black","Western Finncattle","White Cáceres","White Fulani","White Lamphun","White Park","Whitebred Shorthorn","Xingjiang Brown","Yakutian","Yanbian","Yanhuang","Yurino","Zebu","Évolène cattle","Żubroń"],Va=["African Slender-snouted Crocodile","Alligator mississippiensis","American Crocodile","Australian Freshwater Crocodile","Black Caiman","Broad-snouted Caiman","Chinese Alligator","Cuban Crocodile","Cuvier’s Dwarf Caiman","Dwarf Crocodile","Gharial","Morelet’s Crocodile","Mugger Crocodile","New Guinea Freshwater Crocodile","Nile Crocodile","Orinoco Crocodile","Philippine Crocodile","Saltwater Crocodile","Schneider’s Smooth-fronted Caiman","Siamese Crocodile","Spectacled Caiman","Tomistoma","West African Crocodile","Yacare Caiman"],ja=["Affenpinscher","Afghan Hound","Aidi","Airedale Terrier","Akbash","Akita","Alano Español","Alapaha Blue Blood Bulldog","Alaskan Husky","Alaskan Klee Kai","Alaskan Malamute","Alopekis","Alpine Dachsbracke","American Bulldog","American Bully","American Cocker Spaniel","American English Coonhound","American Foxhound","American Hairless Terrier","American Pit Bull Terrier","American Staffordshire Terrier","American Water Spaniel","Andalusian Hound","Anglo-Français de Petite Vénerie","Appenzeller Sennenhund","Ariegeois","Armant","Armenian Gampr dog","Artois Hound","Australian Cattle Dog","Australian Kelpie","Australian Shepherd","Australian Stumpy Tail Cattle Dog","Australian Terrier","Austrian Black and Tan Hound","Austrian Pinscher","Azawakh","Bakharwal dog","Banjara Hound","Barbado da Terceira","Barbet","Basenji","Basque Shepherd Dog","Basset Artésien Normand","Basset Bleu de Gascogne","Basset Fauve de Bretagne","Basset Hound","Bavarian Mountain Hound","Beagle","Beagle-Harrier","Bearded Collie","Beauceron","Bedlington Terrier","Belgian Shepherd","Bergamasco Shepherd","Berger Picard","Bernese Mountain Dog","Bhotia","Bichon Frisé","Billy","Black Mouth Cur","Black Norwegian Elkhound","Black Russian Terrier","Black and Tan Coonhound","Bloodhound","Blue Lacy","Blue Picardy Spaniel","Bluetick Coonhound","Boerboel","Bohemian Shepherd","Bolognese","Border Collie","Border Terrier","Borzoi","Bosnian Coarse-haired Hound","Boston Terrier","Bouvier des Ardennes","Bouvier des Flandres","Boxer","Boykin Spaniel","Bracco Italiano","Braque Francais","Braque Saint-Germain","Braque d'Auvergne","Braque de l'Ariège","Braque du Bourbonnais","Briard","Briquet Griffon Vendéen","Brittany","Broholmer","Bruno Jura Hound","Brussels Griffon","Bucovina Shepherd Dog","Bull Arab","Bull Terrier","Bulldog","Bullmastiff","Bully Kutta","Burgos Pointer","Cairn Terrier","Campeiro Bulldog","Can de Chira","Canaan Dog","Canadian Eskimo Dog","Cane Corso","Cane Paratore","Cane di Oropa","Cantabrian Water Dog","Cardigan Welsh Corgi","Carea Castellano Manchego","Carolina Dog","Carpathian Shepherd Dog","Catahoula Leopard Dog","Catalan Sheepdog","Caucasian Shepherd Dog","Cavalier King Charles Spaniel","Central Asian Shepherd Dog","Cesky Fousek","Cesky Terrier","Chesapeake Bay Retriever","Chien Français Blanc et Noir","Chien Français Blanc et Orange","Chien Français Tricolore","Chihuahua","Chilean Terrier","Chinese Chongqing Dog","Chinese Crested Dog","Chinook","Chippiparai","Chongqing dog","Chortai","Chow Chow","Cimarrón Uruguayo","Cirneco dell'Etna","Clumber Spaniel","Colombian fino hound","Coton de Tulear","Cretan Hound","Croatian Sheepdog","Curly-Coated Retriever","Cursinu","Czechoslovakian Wolfdog","Cão Fila de São Miguel","Cão da Serra de Aires","Cão de Castro Laboreiro","Cão de Gado Transmontano","Dachshund","Dalmatian","Dandie Dinmont Terrier","Danish-Swedish Farmdog","Denmark Feist","Dingo","Doberman Pinscher","Dogo Argentino","Dogo Guatemalteco","Dogo Sardesco","Dogue Brasileiro","Dogue de Bordeaux","Drentse Patrijshond","Drever","Dunker","Dutch Shepherd","Dutch Smoushond","East European Shepherd","East Siberian Laika","English Cocker Spaniel","English Foxhound","English Mastiff","English Setter","English Shepherd","English Springer Spaniel","English Toy Terrier","Entlebucher Mountain Dog","Estonian Hound","Estrela Mountain Dog","Eurasier","Field Spaniel","Fila Brasileiro","Finnish Hound","Finnish Lapphund","Finnish Spitz","Flat-Coated Retriever","French Bulldog","French Spaniel","Galgo Español","Galician Shepherd Dog","Garafian Shepherd","Gascon Saintongeois","Georgian Shepherd","German Hound","German Longhaired Pointer","German Pinscher","German Roughhaired Pointer","German Shepherd Dog","German Shorthaired Pointer","German Spaniel","German Spitz","German Wirehaired Pointer","Giant Schnauzer","Glen of Imaal Terrier","Golden Retriever","Gordon Setter","Gończy Polski","Grand Anglo-Français Blanc et Noir","Grand Anglo-Français Blanc et Orange","Grand Anglo-Français Tricolore","Grand Basset Griffon Vendéen","Grand Bleu de Gascogne","Grand Griffon Vendéen","Great Dane","Greater Swiss Mountain Dog","Greek Harehound","Greek Shepherd","Greenland Dog","Greyhound","Griffon Bleu de Gascogne","Griffon Fauve de Bretagne","Griffon Nivernais","Gull Dong","Gull Terrier","Hamiltonstövare","Hanover Hound","Harrier","Havanese","Hierran Wolfdog","Hokkaido","Hovawart","Huntaway","Hygen Hound","Hällefors Elkhound","Ibizan Hound","Icelandic Sheepdog","Indian Spitz","Indian pariah dog","Irish Red and White Setter","Irish Setter","Irish Terrier","Irish Water Spaniel","Irish Wolfhound","Istrian Coarse-haired Hound","Istrian Shorthaired Hound","Italian Greyhound","Jack Russell Terrier","Jagdterrier","Japanese Chin","Japanese Spitz","Japanese Terrier","Jindo","Jonangi","Kai Ken","Kaikadi","Kangal Shepherd Dog","Kanni","Karakachan dog","Karelian Bear Dog","Kars","Karst Shepherd","Keeshond","Kerry Beagle","Kerry Blue Terrier","King Charles Spaniel","King Shepherd","Kintamani","Kishu","Kokoni","Kombai","Komondor","Kooikerhondje","Koolie","Koyun dog","Kromfohrländer","Kuchi","Kuvasz","Labrador Retriever","Lagotto Romagnolo","Lakeland Terrier","Lancashire Heeler","Landseer","Lapponian Herder","Large Münsterländer","Leonberger","Levriero Sardo","Lhasa Apso","Lithuanian Hound","Lupo Italiano","Löwchen","Mackenzie River Husky","Magyar agár","Mahratta Greyhound","Maltese","Manchester Terrier","Maremmano-Abruzzese Sheepdog","McNab dog","Miniature American Shepherd","Miniature Bull Terrier","Miniature Fox Terrier","Miniature Pinscher","Miniature Schnauzer","Molossus of Epirus","Montenegrin Mountain Hound","Mountain Cur","Mountain Feist","Mucuchies","Mudhol Hound","Mudi","Neapolitan Mastiff","New Guinea Singing Dog","New Zealand Heading Dog","Newfoundland","Norfolk Terrier","Norrbottenspets","Northern Inuit Dog","Norwegian Buhund","Norwegian Elkhound","Norwegian Lundehund","Norwich Terrier","Nova Scotia Duck Tolling Retriever","Old Croatian Sighthound","Old Danish Pointer","Old English Sheepdog","Old English Terrier","Olde English Bulldogge","Otterhound","Pachon Navarro","Paisley Terrier","Pampas Deerhound","Papillon","Parson Russell Terrier","Pastore della Lessinia e del Lagorai","Patagonian Sheepdog","Patterdale Terrier","Pekingese","Pembroke Welsh Corgi","Perro Majorero","Perro de Pastor Mallorquin","Perro de Presa Canario","Perro de Presa Mallorquin","Peruvian Inca Orchid","Petit Basset Griffon Vendéen","Petit Bleu de Gascogne","Phalène","Pharaoh Hound","Phu Quoc Ridgeback","Picardy Spaniel","Plott Hound","Plummer Terrier","Podenco Canario","Podenco Valenciano","Pointer","Poitevin","Polish Greyhound","Polish Hound","Polish Lowland Sheepdog","Polish Tatra Sheepdog","Pomeranian","Pont-Audemer Spaniel","Poodle","Porcelaine","Portuguese Podengo","Portuguese Pointer","Portuguese Water Dog","Posavac Hound","Pražský Krysařík","Pshdar Dog","Pudelpointer","Pug","Puli","Pumi","Pungsan Dog","Pyrenean Mastiff","Pyrenean Mountain Dog","Pyrenean Sheepdog","Rafeiro do Alentejo","Rajapalayam","Rampur Greyhound","Rat Terrier","Ratonero Bodeguero Andaluz","Ratonero Mallorquin","Ratonero Murciano de Huerta","Ratonero Valenciano","Redbone Coonhound","Rhodesian Ridgeback","Romanian Mioritic Shepherd Dog","Romanian Raven Shepherd Dog","Rottweiler","Rough Collie","Russian Spaniel","Russian Toy","Russo-European Laika","Saarloos Wolfdog","Sabueso Español","Saint Bernard","Saint Hubert Jura Hound","Saint-Usuge Spaniel","Saluki","Samoyed","Sapsali","Sarabi dog","Sardinian Shepherd Dog","Schapendoes","Schillerstövare","Schipperke","Schweizer Laufhund","Schweizerischer Niederlaufhund","Scottish Deerhound","Scottish Terrier","Sealyham Terrier","Segugio Italiano","Segugio Maremmano","Segugio dell'Appennino","Seppala Siberian Sleddog","Serbian Hound","Serbian Tricolour Hound","Serrano Bulldog","Shar Pei","Shetland Sheepdog","Shiba Inu","Shih Tzu","Shikoku","Shiloh Shepherd","Siberian Husky","Silken Windhound","Silky Terrier","Sinhala Hound","Skye Terrier","Sloughi","Slovakian Wirehaired Pointer","Slovenský Cuvac","Slovenský Kopov","Smalandstövare","Small Greek domestic dog","Small Münsterländer","Smooth Collie","Smooth Fox Terrier","Soft-Coated Wheaten Terrier","South Russian Ovcharka","Spanish Mastiff","Spanish Water Dog","Spinone Italiano","Sporting Lucas Terrier","Stabyhoun","Staffordshire Bull Terrier","Standard Schnauzer","Stephens Stock","Styrian Coarse-haired Hound","Sussex Spaniel","Swedish Elkhound","Swedish Lapphund","Swedish Vallhund","Swedish White Elkhound","Taigan","Taiwan Dog","Tamaskan Dog","Teddy Roosevelt Terrier","Telomian","Tenterfield Terrier","Terrier Brasileiro","Thai Bangkaew Dog","Thai Ridgeback","Tibetan Mastiff","Tibetan Spaniel","Tibetan Terrier","Tornjak","Tosa","Toy Fox Terrier","Toy Manchester Terrier","Transylvanian Hound","Treeing Cur","Treeing Feist","Treeing Tennessee Brindle","Treeing Walker Coonhound","Trigg Hound","Tyrolean Hound","Vikhan","Villano de Las Encartaciones","Villanuco de Las Encartaciones","Vizsla","Volpino Italiano","Weimaraner","Welsh Sheepdog","Welsh Springer Spaniel","Welsh Terrier","West Highland White Terrier","West Siberian Laika","Westphalian Dachsbracke","Wetterhoun","Whippet","White Shepherd","White Swiss Shepherd Dog","Wire Fox Terrier","Wirehaired Pointing Griffon","Wirehaired Vizsla","Xiasi Dog","Xoloitzcuintli","Yakutian Laika","Yorkshire Terrier","Šarplaninac"],Ya=["Alaska pollock","Albacore","Amur catfish","Araucanian herring","Argentine hake","Asari","Asian swamp eel","Atlantic cod","Atlantic herring","Atlantic horse mackerel","Atlantic mackerel","Atlantic menhaden","Atlantic salmon","Bigeye scad","Bigeye tuna","Bighead carp","Black carp","Blood cockle","Blue swimming crab","Blue whiting","Bombay-duck","Bonga shad","California pilchard","Cape horse mackerel","Capelin","Catla","Channel catfish","Chilean jack mackerel","Chinese perch","Chinese softshell turtle","Chub mackerel","Chum salmon","Common carp","Crucian carp","Daggertooth pike conger","European anchovy","European pilchard","European sprat","Filipino Venus","Gazami crab","Goldstripe sardinella","Grass carp","Gulf menhaden","Haddock","Hilsa shad","Indian mackerel","Indian oil sardine","Iridescent shark","Japanese anchovy","Japanese cockle","Japanese common catfish","Japanese flying squid","Japanese jack mackerel","Japanese littleneck","Japanese pilchard","Jumbo flying squid","Kawakawa","Korean bullhead","Largehead hairtail","Longtail tuna","Madeiran sardinella","Mandarin fish","Milkfish","Mrigal carp","Narrow-barred Spanish mackerel","Nile perch","Nile tilapia","North Pacific hake","Northern snakehead","Pacific anchoveta","Pacific cod","Pacific herring","Pacific sand lance","Pacific sandlance","Pacific saury","Pacific thread herring","Peruvian anchoveta","Pink salmon","Pollock","Pond loach","Rainbow trout","Rohu","Round sardinella","Short mackerel","Silver carp","Silver cyprinid","Skipjack tuna","Southern African anchovy","Southern rough shrimp","Whiteleg shrimp","Wuchang bream","Yellow croaker","Yellowfin tuna","Yellowhead catfish","Yellowstripe scad"],qa=["Abaco Barb","Abtenauer","Abyssinian","Aegidienberger","Akhal-Teke","Albanian Horse","Altai Horse","Altèr Real","American Albino","American Cream Draft","American Indian Horse","American Paint Horse","American Quarter Horse","American Saddlebred","American Warmblood","Andalusian Horse","Andravida Horse","Anglo-Arabian","Anglo-Arabo-Sardo","Anglo-Kabarda","Appaloosa","AraAppaloosa","Arabian Horse","Ardennes Horse","Arenberg-Nordkirchen","Argentine Criollo","Asian wild Horse","Assateague Horse","Asturcón","Augeron","Australian Brumby","Australian Draught Horse","Australian Stock Horse","Austrian Warmblood","Auvergne Horse","Auxois","Azerbaijan Horse","Azteca Horse","Baise Horse","Bale","Balearic Horse","Balikun Horse","Baluchi Horse","Banker Horse","Barb Horse","Bardigiano","Bashkir Curly","Basque Mountain Horse","Bavarian Warmblood","Belgian Half-blood","Belgian Horse","Belgian Warmblood","Bhutia Horse","Black Forest Horse","Blazer Horse","Boerperd","Borana","Boulonnais Horse","Brabant","Brandenburger","Brazilian Sport Horse","Breton Horse","Brumby","Budyonny Horse","Burguete Horse","Burmese Horse","Byelorussian Harness Horse","Calabrese Horse","Camargue Horse","Camarillo White Horse","Campeiro","Campolina","Canadian Horse","Canadian Pacer","Carolina Marsh Tacky","Carthusian Horse","Caspian Horse","Castilian Horse","Castillonnais","Catria Horse","Cavallo Romano della Maremma Laziale","Cerbat Mustang","Chickasaw Horse","Chilean Corralero","Choctaw Horse","Cleveland Bay","Clydesdale Horse","Cob","Coldblood Trotter","Colonial Spanish Horse","Colorado Ranger","Comtois Horse","Corsican Horse","Costa Rican Saddle Horse","Cretan Horse","Criollo Horse","Croatian Coldblood","Cuban Criollo","Cumberland Island Horse","Curly Horse","Czech Warmblood","Daliboz","Danish Warmblood","Danube Delta Horse","Dole Gudbrandsdal","Don","Dongola Horse","Draft Trotter","Dutch Harness Horse","Dutch Heavy Draft","Dutch Warmblood","Dzungarian Horse","East Bulgarian","East Friesian Horse","Estonian Draft","Estonian Horse","Falabella","Faroese","Finnhorse","Fjord Horse","Fleuve","Florida Cracker Horse","Foutanké","Frederiksborg Horse","Freiberger","French Trotter","Friesian Cross","Friesian Horse","Friesian Sporthorse","Furioso-North Star","Galiceño","Galician Pony","Gelderland Horse","Georgian Grande Horse","German Warmblood","Giara Horse","Gidran","Groningen Horse","Gypsy Horse","Hackney Horse","Haflinger","Hanoverian Horse","Heck Horse","Heihe Horse","Henson Horse","Hequ Horse","Hirzai","Hispano-Bretón","Holsteiner Horse","Horro","Hungarian Warmblood","Icelandic Horse","Iomud","Irish Draught","Irish Sport Horse sometimes called Irish Hunter","Italian Heavy Draft","Italian Trotter","Jaca Navarra","Jeju Horse","Jutland Horse","Kabarda Horse","Kafa","Kaimanawa Horses","Kalmyk Horse","Karabair","Karabakh Horse","Karachai Horse","Karossier","Kathiawari","Kazakh Horse","Kentucky Mountain Saddle Horse","Kiger Mustang","Kinsky Horse","Kisber Felver","Kiso Horse","Kladruber","Knabstrupper","Konik","Kundudo","Kustanair","Kyrgyz Horse","Latvian Horse","Lipizzan","Lithuanian Heavy Draught","Lokai","Losino Horse","Lusitano","Lyngshest","M'Bayar","M'Par","Mallorquín","Malopolski","Mangalarga","Mangalarga Marchador","Maremmano","Marismeño Horse","Marsh Tacky","Marwari Horse","Mecklenburger","Menorquín","Messara Horse","Metis Trotter","Mezőhegyesi Sport Horse","Međimurje Horse","Miniature Horse","Misaki Horse","Missouri Fox Trotter","Monchina","Mongolian Horse","Mongolian Wild Horse","Monterufolino","Morab","Morgan Horse","Mountain Pleasure Horse","Moyle Horse","Murakoz Horse","Murgese","Mustang Horse","Mérens Horse","Namib Desert Horse","Nangchen Horse","National Show Horse","Nez Perce Horse","Nivernais Horse","Nokota Horse","Noma","Nonius Horse","Nooitgedachter","Nordlandshest","Noriker Horse","Norman Cob","North American Single-Footer Horse","North Swedish Horse","Norwegian Coldblood Trotter","Norwegian Fjord","Novokirghiz","Oberlander Horse","Ogaden","Oldenburg Horse","Orlov trotter","Ostfriesen","Paint","Pampa Horse","Paso Fino","Pentro Horse","Percheron","Persano Horse","Peruvian Paso","Pintabian","Pleven Horse","Poitevin Horse","Posavac Horse","Pottok","Pryor Mountain Mustang","Przewalski's Horse","Pura Raza Española","Purosangue Orientale","Qatgani","Quarab","Quarter Horse","Racking Horse","Retuerta Horse","Rhenish German Coldblood","Rhinelander Horse","Riwoche Horse","Rocky Mountain Horse","Romanian Sporthorse","Rottaler","Russian Don","Russian Heavy Draft","Russian Trotter","Saddlebred","Salerno Horse","Samolaco Horse","San Fratello Horse","Sarcidano Horse","Sardinian Anglo-Arab","Schleswig Coldblood","Schwarzwälder Kaltblut","Selale","Sella Italiano","Selle Français","Shagya Arabian","Shan Horse","Shire Horse","Siciliano Indigeno","Silesian Horse","Sokolsky Horse","Sorraia","South German Coldblood","Soviet Heavy Draft","Spanish Anglo-Arab","Spanish Barb","Spanish Jennet Horse","Spanish Mustang","Spanish Tarpan","Spanish-Norman Horse","Spiti Horse","Spotted Saddle Horse","Standardbred Horse","Suffolk Punch","Swedish Ardennes","Swedish Warmblood","Swedish coldblood trotter","Swiss Warmblood","Taishū Horse","Takhi","Tawleed","Tchernomor","Tennessee Walking Horse","Tersk Horse","Thoroughbred","Tiger Horse","Tinker Horse","Tolfetano","Tori Horse","Trait Du Nord","Trakehner","Tsushima","Tuigpaard","Ukrainian Riding Horse","Unmol Horse","Uzunyayla","Ventasso Horse","Virginia Highlander","Vlaamperd","Vladimir Heavy Draft","Vyatka","Waler","Waler Horse","Walkaloosa","Warlander","Warmblood","Welsh Cob","Westphalian Horse","Wielkopolski","Württemberger","Xilingol Horse","Yakutian Horse","Yili Horse","Yonaguni Horse","Zaniskari","Zhemaichu","Zweibrücker","Žemaitukas"],Ua=["Acacia-ants","Acorn-plum gall","Aerial yellowjacket","Africanized honey bee","Allegheny mound ant","Almond stone wasp","Ant","Arboreal ant","Argentine ant","Asian paper wasp","Baldfaced hornet","Bee","Bigheaded ant","Black and yellow mud dauber","Black carpenter ant","Black imported fire ant","Blue horntail woodwasp","Blue orchard bee","Braconid wasp","Bumble bee","Carpenter ant","Carpenter wasp","Chalcid wasp","Cicada killer","Citrus blackfly parasitoid","Common paper wasp","Crazy ant","Cuckoo wasp","Cynipid gall wasp","Eastern Carpenter bee","Eastern yellowjacket","Elm sawfly","Encyrtid wasp","Erythrina gall wasp","Eulophid wasp","European hornet","European imported fire ant","False honey ant","Fire ant","Forest bachac","Forest yellowjacket","German yellowjacket","Ghost ant","Giant ichneumon wasp","Giant resin bee","Giant wood wasp","Golden northern bumble bee","Golden paper wasp","Gouty oak gall","Grass Carrying Wasp","Great black wasp","Great golden digger wasp","Hackberry nipple gall parasitoid","Honey bee","Horned oak gall","Horse guard wasp","Hunting wasp","Ichneumonid wasp","Keyhole wasp","Knopper gall","Large garden bumble bee","Large oak-apple gall","Leafcutting bee","Little fire ant","Little yellow ant","Long-horned bees","Long-legged ant","Macao paper wasp","Mallow bee","Marble gall","Mossyrose gall wasp","Mud-daubers","Multiflora rose seed chalcid","Oak apple gall wasp","Oak rough bulletgall wasp","Oak saucer gall","Oak shoot sawfly","Odorous house ant","Orange-tailed bumble bee","Orangetailed potter wasp","Oriental chestnut gall wasp","Paper wasp","Pavement ant","Pigeon tremex","Pip gall wasp","Prairie yellowjacket","Pteromalid wasp","Pyramid ant","Raspberry Horntail","Red ant","Red carpenter ant","Red harvester ant","Red imported fire ant","Red wasp","Red wood ant","Red-tailed wasp","Reddish carpenter ant","Rough harvester ant","Sawfly parasitic wasp","Scale parasitoid","Silky ant","Sirex woodwasp","Siricid woodwasp","Smaller yellow ant","Southeastern blueberry bee","Southern fire ant","Southern yellowjacket","Sphecid wasp","Stony gall","Sweat bee","Texas leafcutting ant","Tiphiid wasp","Torymid wasp","Tramp ant","Valentine ant","Velvet ant","Vespid wasp","Weevil parasitoid","Western harvester ant","Western paper wasp","Western thatching ant","Western yellowjacket","White-horned horntail","Willow shoot sawfly","Woodwasp","Wool sower gall maker","Yellow Crazy Ant","Yellow and black potter wasp","Yellow-horned horntail"],Za=["Asiatic Lion","Barbary Lion","Cape lion","Masai Lion","Northeast Congo Lion","Transvaal lion","West African Lion"],Xa=["Ace","Archie","Bailey","Bandit","Bella","Bentley","Bruno","Buddy","Charlie","Coco","Cookie","Cooper","Daisy","Dixie","Finn","Ginger","Gracie","Gus","Hank","Jack","Jax","Joey","Kobe","Leo","Lola","Louie","Lucy","Maggie","Max","Mia","Milo","Molly","Murphey","Nala","Nova","Ollie","Oreo","Rosie","Scout","Stella","Teddy","Tuffy"],Qa=["American","American Chinchilla","American Fuzzy Lop","American Sable","Argente Brun","Belgian Hare","Beveren","Blanc de Hotot","Britannia Petite","Californian","Champagne D’Argent","Checkered Giant","Cinnamon","Crème D’Argent","Dutch","Dwarf Hotot","English Angora","English Lop","English Spot","Flemish Giant","Florida White","French Angora","French Lop","Giant Angora","Giant Chinchilla","Harlequin","Havana","Himalayan","Holland Lop","Jersey Wooly","Lilac","Lionhead","Mini Lop","Mini Rex","Mini Satin","Netherland Dwarf","New Zealand","Palomino","Polish","Rex","Rhinelander","Satin","Satin Angora","Silver","Silver Fox","Silver Marten","Standard Chinchilla","Tan","Thrianta"],en=["Abrocoma","Abrocoma schistacea","Aconaemys","Aconaemys porteri","African brush-tailed porcupine","Andean mountain cavy","Argentine tuco-tuco","Ashy chinchilla rat","Asiatic brush-tailed porcupine","Atherurus","Azara's agouti","Azara's tuco-tuco","Bahia porcupine","Bathyergus","Bathyergus janetta","Bathyergus suillus","Bennett's chinchilla rat","Bicolored-spined porcupine","Black agouti","Black dwarf porcupine","Black-rumped agouti","Black-tailed hairy dwarf porcupine","Bolivian chinchilla rat","Bolivian tuco-tuco","Bonetto's tuco-tuco","Brandt's yellow-toothed cavy","Brazilian guinea pig","Brazilian porcupine","Brazilian tuco-tuco","Bridge's degu","Brown hairy dwarf porcupine","Budin's chinchilla rat, A. budini","Cape porcupine","Catamarca tuco-tuco","Cavia","Central American agouti","Chacoan tuco-tuco","Chilean rock rat","Chinchilla","Coendou","Coiban agouti","Colburn's tuco-tuco","Collared tuco-tuco","Common degu","Common yellow-toothed cavy","Conover's tuco-tuco","Coruro","Crested agouti","Crested porcupine","Cryptomys","Cryptomys bocagei","Cryptomys damarensis","Cryptomys foxi","Cryptomys hottentotus","Cryptomys mechowi","Cryptomys ochraceocinereus","Cryptomys zechi","Ctenomys","Cuniculus","Cuscomys","Cuscomys ashanika","Dactylomys","Dactylomys boliviensis","Dactylomys dactylinus","Dactylomys peruanus","Dasyprocta","Domestic guinea pig","Emily's tuco-tuco","Erethizon","Famatina chinchilla rat","Frosted hairy dwarf porcupine","Fukomys","Fukomys amatus","Fukomys anselli","Fukomys bocagei","Fukomys damarensis","Fukomys darlingi","Fukomys foxi","Fukomys ilariae","Fukomys kafuensis","Fukomys mechowii","Fukomys micklemi","Fukomys occlusus","Fukomys ochraceocinereus","Fukomys whytei","Fukomys zechi","Furtive tuco-tuco","Galea","Georychus","Georychus capensis","Golden viscacha-rat","Goya tuco-tuco","Greater guinea pig","Green acouchi","Haig's tuco-tuco","Heliophobius","Heliophobius argenteocinereus","Heterocephalus","Heterocephalus glaber","Highland tuco-tuco","Hystrix","Indian porcupine","Isla Mocha degu","Kalinowski agouti","Kannabateomys","Kannabateomys amblyonyx","Lagidium","Lagostomus","Lewis' tuco-tuco","Long-tailed chinchilla","Long-tailed porcupine","Los Chalchaleros' viscacha-rat","Lowland paca","Magellanic tuco-tuco","Malayan porcupine","Maule tuco-tuco","Mendoza tuco-tuco","Mexican agouti","Mexican hairy dwarf porcupine","Microcavia","Montane guinea pig","Moon-toothed degu","Mottled tuco-tuco","Mountain degu","Mountain paca","Mountain viscacha-rat","Myoprocta","Natterer's tuco-tuco","North American porcupine","Northern viscacha","Octodon","Octodontomys","Octomys","Olallamys","Olallamys albicauda","Olallamys edax","Orinoco agouti","Paraguaian hairy dwarf porcupine","Pearson's tuco-tuco","Peruvian tuco-tuco","Philippine porcupine","Pipanacoctomys","Plains viscacha","Plains viscacha-rat","Porteous' tuco-tuco","Punta de Vacas chinchilla rat","Red acouchi","Red-rumped agouti","Reddish tuco-tuco","Rio Negro tuco-tuco","Robust tuco-tuco","Roosmalen's dwarf porcupine","Rothschild's porcupine","Ruatan Island agouti","Sage's rock rat","Salinoctomys","Salta tuco-tuco","San Luis tuco-tuco","Santa Catarina's guinea pig","Shiny guinea pig","Shipton's mountain cavy","Short-tailed chinchilla","Silky tuco-tuco","Social tuco-tuco","Southern mountain cavy","Southern tuco-tuco","Southern viscacha","Spalacopus","Spix's yellow-toothed cavy","Steinbach's tuco-tuco","Streaked dwarf porcupine","Strong tuco-tuco","Stump-tailed porcupine","Sumatran porcupine","Sunda porcupine","Talas tuco-tuco","Tawny tuco-tuco","Thick-spined porcupine","Tiny tuco-tuco","Trichys","Tucuman tuco-tuco","Tympanoctomys","Uspallata chinchilla rat","White-toothed tuco-tuco","Wolffsohn's viscacha"],an=["Abaco Island boa","Aesculapian snake","African beaked snake","African puff adder","African rock python","African twig snake","African wolf snake","Amazon tree boa","Amazonian palm viper","American Vine Snake","American copperhead","Amethystine python","Anaconda","Andaman cat snake","Andaman cobra","Angolan python","Annulated sea snake","Arabian cobra","Arafura file snake","Arizona black rattlesnake","Arizona coral snake","Aruba rattlesnake","Asian Vine Snake, Whip Snake","Asian cobra","Asian keelback","Asian pipe snake","Asp","Asp viper","Assam keelback","Australian copperhead","Australian scrub python","Baird's rat snake","Baja California lyresnake","Ball Python","Ball python","Bamboo pitviper","Bamboo viper","Banded Flying Snake","Banded cat-eyed snake","Banded krait","Banded pitviper","Banded water cobra","Barbour's pit viper","Barred wolf snake","Beaked sea snake","Beauty rat snake","Beddome's cat snake","Beddome's coral snake","Bimini racer","Bird snake","Bismarck ringed python","Black headed python","Black krait","Black mamba","Black rat snake","Black snake","Black tree cobra","Black-banded trinket snake","Black-headed snake","Black-necked cobra","Black-necked spitting cobra","Black-speckled palm-pitviper","Black-striped keelback","Black-tailed horned pit viper","Blanding's tree snake","Blind snake","Blonde hognose snake","Blood python","Blue krait","Blunt-headed tree snake","Bluntnose viper","Boa","Boa constrictor","Bocourt's water snake","Boelen python","Boiga","Bolivian anaconda","Boomslang","Bornean pitviper","Borneo short-tailed python","Brahminy blind snake","Brazilian coral snake","Brazilian mud Viper","Brazilian smooth snake","Bredl's python","Brongersma's pitviper","Brown snake","Brown spotted pitviper[4]","Brown tree snake","Brown water python","Brown white-lipped python","Buff striped keelback","Bull snake","Burmese keelback","Burmese krait","Burmese python","Burrowing cobra","Burrowing viper","Bush viper","Bushmaster","Buttermilk racer","Calabar python","California kingsnake","Canebrake","Cantil","Cantor's pitviper","Cape cobra","Cape coral snake","Cape gopher snake","Carpet viper","Cascabel","Caspian cobra","Cat snake","Cat-eyed night snake","Cat-eyed snake","Central American lyre snake","Central ranges taipan","Centralian carpet python","Ceylon krait","Chappell Island tiger snake","Checkered garter snake","Checkered keelback","Chicken snake","Chihuahuan ridge-nosed rattlesnake","Children's python","Chinese tree viper","Coachwhip snake","Coastal carpet python","Coastal taipan","Cobra","Collett's snake","Colorado desert sidewinder","Common adder","Common cobra","Common garter snake","Common ground snake","Common keelback","Common lancehead","Common tiger snake","Common worm snake","Congo snake","Congo water cobra","Copperhead","Coral snake","Corn snake","Coronado Island rattlesnake","Cottonmouth","Crossed viper","Crowned snake","Cuban boa","Cuban wood snake","Cyclades blunt-nosed viper","Dauan Island water python","De Schauensee's anaconda","Death Adder","Desert death adder","Desert kingsnake","Desert woma python","Diamond python","Dog-toothed cat snake","Down's tiger snake","Dubois's sea snake","Dumeril's boa","Durango rock rattlesnake","Dusky pigmy rattlesnake","Dusty hognose snake","Dwarf beaked snake","Dwarf boa","Dwarf pipe snake","Dwarf sand adder","Eastern brown snake","Eastern coral snake","Eastern diamondback rattlesnake","Eastern green mamba","Eastern hognose snake","Eastern lyre snake","Eastern mud snake","Eastern racer","Eastern tiger snake","Eastern water cobra","Eastern yellowbelly sad racer","Egg-eater","Egyptian asp","Egyptian cobra","Elegant pitviper","Emerald tree boa","Equatorial spitting cobra","European asp","European smooth snake","Eyelash palm-pitviper","Eyelash pit viper","Eyelash viper","False cobra","False horned viper","False water cobra","Fan-Si-Pan horned pitviper","Fea's viper","Fer-de-lance","Fierce snake","Fifty pacer","Fishing snake","Flat-nosed pitviper","Flinders python","Flying snake","Forest cobra","Forest flame snake","Forsten's cat snake","Fox snake, three species of Pantherophis","Gaboon viper","Garter snake","Giant Malagasy hognose snake","Godman's pit viper","Gold tree cobra","Gold-ringed cat snake","Golden tree snake","Grand Canyon rattlesnake","Grass snake","Gray cat snake","Great Basin rattlesnake","Great Lakes bush viper","Great Plains rat snake","Green anaconda","Green cat-eyed snake","Green mamba","Green palm viper","Green rat snake","Green snake","Green tree pit viper","Green tree python","Grey Lora","Grey-banded kingsnake","Ground snake","Guatemalan palm viper","Guatemalan tree viper","Habu","Habu pit viper","Hagen's pitviper","Hairy bush viper","Halmahera python","Hardwicke's sea snake","Harlequin coral snake","High Woods coral snake","Hill keelback","Himalayan keelback","Hogg Island boa","Hognose snake","Hognosed viper","Honduran palm viper","Hook Nosed Sea Snake","Hopi rattlesnake","Horned adder","Horned desert viper","Horned viper","Horseshoe pitviper","Hundred pacer","Hutton's tree viper","Ikaheka snake","Indian cobra","Indian flying snake","Indian krait","Indian python","Indian tree viper","Indigo snake","Indochinese spitting cobra","Indonesian water python","Inland carpet python","Inland taipan","Jamaican Tree Snake","Jamaican boa","Jan's hognose snake","Japanese forest rat snake","Japanese rat snake","Japanese striped snake","Javan spitting cobra","Jerdon's pitviper","Jumping viper","Jungle carpet python","Kanburian pit viper","Kaulback's lance-headed pitviper","Kayaudi dwarf reticulated python","Kaznakov's viper","Keelback","Kham Plateau pitviper","Khasi Hills keelback","King Island tiger snake","King brown","King cobra","King rat snake","King snake","Krait","Krefft's tiger snake","Lance-headed rattlesnake","Lancehead","Large shield snake","Large-eyed pitviper","Large-scaled tree viper","Leaf viper","Leaf-nosed viper","Lesser black krait","Levant viper","Long-nosed adder","Long-nosed tree snake","Long-nosed viper","Long-nosed whip snake","Long-tailed rattlesnake","Longnosed worm snake","Lora","Lyre snake","Machete savane","Macklot's python","Madagascar ground boa","Madagascar tree boa","Malabar rock pitviper","Malayan krait","Malayan long-glanded coral snake","Malayan pit viper","Malcolm's tree viper","Mamba","Mamushi","Manchurian Black Water Snake","Mandalay cobra","Mandarin rat snake","Mangrove pit viper","Mangrove snake","Mangshan pitviper","Many-banded krait","Many-banded tree snake","Many-horned adder","Many-spotted cat snake","Massasauga rattlesnake","McMahon's viper","Mexican black kingsnake","Mexican green rattlesnake","Mexican hognose snake","Mexican palm-pitviper","Mexican parrot snake","Mexican racer","Mexican vine snake","Mexican west coast rattlesnake","Midget faded rattlesnake","Milk snake","Moccasin snake","Modest keelback","Mojave desert sidewinder","Mojave rattlesnake","Mole viper","Mollucan python","Moluccan flying snake","Montpellier snake","Motuo bamboo pitviper","Mountain adder","Mozambique spitting cobra","Mud adder","Mud snake","Mussurana","Namaqua dwarf adder","Namib dwarf sand adder","Narrowhead Garter Snake","New Guinea carpet python","Nichell snake","Nicobar Island keelback","Nicobar bamboo pitviper","Night snake","Nightingale adder","Nilgiri keelback","Nitsche's bush viper","Nitsche's tree viper","North Philippine cobra","North eastern king snake","Northeastern hill krait","Northern black-tailed rattlesnake","Northern tree snake","Northern water snake","Northern white-lipped python","Northwestern carpet python","Nose-horned viper","Nubian spitting cobra","Oaxacan small-headed rattlesnake","Oenpelli python","Olive python","Olive sea snake","Orange-collared keelback","Ornate flying snake","Palestine viper","Pallas' viper","Palm viper","Papuan python","Paradise flying snake","Parrot snake","Patchnose snake","Paupan taipan","Pelagic sea snake","Peninsula tiger snake","Peringuey's adder","Perrotet's shieldtail snake","Persian rat snake","Philippine cobra","Philippine pitviper","Pine snake","Pipe snake","Pit viper","Pointed-scaled pit viper[5]","Pope's tree viper","Portuguese viper","Prairie kingsnake","Puerto Rican boa","Puff adder","Pygmy python","Python","Queen snake","Racer","Raddysnake","Rainbow boa","Rat snake","Rattler","Rattlesnake","Red blood python","Red diamond rattlesnake","Red spitting cobra","Red-backed rat snake","Red-bellied black snake","Red-headed krait","Red-necked keelback","Red-tailed bamboo pitviper","Red-tailed boa","Red-tailed pipe snake","Reticulated python","Rhinoceros viper","Rhombic night adder","Ribbon snake","Rinkhals","Rinkhals cobra","River jack","Rosy boa","Rough green snake","Rough-scaled bush viper","Rough-scaled python","Rough-scaled tree viper","Royal python","Rubber boa","Rufous beaked snake","Rungwe tree viper","San Francisco garter snake","Sand adder","Sand boa","Savu python","Saw-scaled viper","Scarlet kingsnake","Schlegel's viper","Schultze's pitviper","Sea snake","Sedge viper","Selayer reticulated python","Sharp-nosed viper","Shield-nosed cobra","Shield-tailed snake","Siamese palm viper","Side-striped palm-pitviper","Sidewinder","Sikkim keelback","Sinai desert cobra","Sind krait","Small-eyed snake","Smooth green snake","Smooth snake","Snorkel viper","Snouted cobra","Sonoran sidewinder","South American hognose snake","South eastern corn snake","Southern Indonesian spitting cobra","Southern Pacific rattlesnake","Southern Philippine cobra","Southern black racer","Southern white-lipped python","Southwestern black spitting cobra","Southwestern blackhead snake","Southwestern carpet python","Southwestern speckled rattlesnake","Speckle-bellied keelback","Speckled kingsnake","Spectacled cobra","Spiny bush viper","Spitting cobra","Spotted python","Sri Lankan pit viper","Stejneger's bamboo pitviper","Stiletto snake","Stimson's python","Stoke's sea snake","Storm water cobra","Striped snake","Sumatran short-tailed python","Sumatran tree viper","Sunbeam snake","Taipan","Taiwan cobra","Tan racer","Tancitaran dusky rattlesnake","Tanimbar python","Tasmanian tiger snake","Tawny cat snake","Temple pit viper","Temple viper","Tentacled snake","Texas Coral Snake","Texas blind snake","Texas garter snake","Texas lyre snake","Texas night snake","Thai cobra","Three-lined ground snake","Tibetan bamboo pitviper","Tic polonga","Tiger pit viper","Tiger rattlesnake","Tiger snake","Tigre snake","Timber rattlesnake","Timor python","Titanboa","Tree boa","Tree snake","Tree viper","Trinket snake","Tropical rattlesnake","Twig snake","Twin Headed King Snake","Twin-Barred tree snake","Twin-spotted rat snake","Twin-spotted rattlesnake","Undulated pit viper","Uracoan rattlesnake","Ursini's viper","Urutu","Vine snake","Viper","Viper Adder","Vipera ammodytes","Wagler's pit viper","Wart snake","Water adder","Water moccasin","Water snake","West Indian racer","Western blind snake","Western carpet python","Western coral snake","Western diamondback rattlesnake","Western green mamba","Western ground snake","Western hog-nosed viper","Western mud snake","Western tiger snake","Western woma python","Wetar Island python","Whip snake","White-lipped keelback","White-lipped python","White-lipped tree viper","Wirot's pit viper","Wolf snake","Woma python","Worm snake","Wutu","Wynaad keelback","Yarara","Yellow anaconda","Yellow-banded sea snake","Yellow-bellied sea snake","Yellow-lined palm viper","Yellow-lipped sea snake","Yellow-striped rat snake","Yunnan keelback","Zebra snake","Zebra spitting cobra"],nn=["bat","bear","bee","bird","butterfly","cat","cow","crocodile","deer","dog","dolphin","eagle","elephant","fish","flamingo","fox","frog","gecko","giraffe","gorilla","hamster","hippopotamus","horse","kangaroo","koala","lion","monkey","ostrich","panda","parrot","peacock","penguin","polar bear","rabbit","rhinoceros","sea lion","shark","snake","squirrel","tiger","turtle","whale","wolf","zebra"],tn={bear:Ka,bird:$a,cat:Oa,cetacean:za,cow:Ja,crocodilia:Va,dog:ja,fish:Ya,horse:qa,insect:Ua,lion:Za,pet_name:Xa,rabbit:Qa,rodent:en,snake:an,type:nn},rn=tn,on=["{{person.name}}","{{company.name}}"],ln=["Redhold","Treeflex","Trippledex","Kanlam","Bigtax","Daltfresh","Toughjoyfax","Mat Lam Tam","Otcom","Tres-Zap","Y-Solowarm","Tresom","Voltsillam","Biodex","Greenlam","Viva","Matsoft","Temp","Zoolab","Subin","Rank","Job","Stringtough","Tin","It","Home Ing","Zamit","Sonsing","Konklab","Alpha","Latlux","Voyatouch","Alphazap","Holdlamis","Zaam-Dox","Sub-Ex","Quo Lux","Bamity","Ventosanzap","Lotstring","Hatity","Tempsoft","Overhold","Fixflex","Konklux","Zontrax","Tampflex","Span","Namfix","Transcof","Stim","Fix San","Sonair","Stronghold","Fintone","Y-find","Opela","Lotlux","Ronstring","Zathin","Duobam","Keylex"],sn=["0.#.#","0.##","#.##","#.#","#.#.#"],un={author:on,name:ln,version:sn},cn=un,dn=["A.A. Milne","Agatha Christie","Alan Moore and Dave Gibbons","Albert Camus","Aldous Huxley","Alexander Pope","Alexandre Dumas","Alice Walker","Andrew Lang","Anne Frank","Anthony Burgess","Anthony Trollope","Antoine de Saint-Exupéry","Anton Chekhov","Anton Pavlovich Chekhov","Arthur Conan Doyle","Arthur Schopenhauer","Aylmer Maude","Ayn Rand","Beatrix Potter","Benjamin Disraeli","Benjamin Jowett","Bernard Shaw","Bertrand Russell","Bhagavanlal Indrajit","Boris Pasternak","Bram Stoker","Brian Evenson","C.E. Brock","C.S. Lewis","Carson McCallers","Charles Dickens","Charles E. Derbyshire","Charlotte Brontë","Charlotte Perkins Gilman","Chinua Achebe","Clifford R. Adams","Constance Garnett","Cormac McCarthy","D.H. Lawrence","Dan Brown","Daniel Defoe","Dante Alighieri","Dashiell Hammett","David Widger","David Wyllie","Dean Koontz","Don DeLillo","E.M. Forster","Edgar Allan Poe","Edgar Rice Burroughs","Elizabeth Cleghorn Gaskell","Elizabeth Von Arnim","Emily Brontë","Erich Remarque","Ernest Hemingway","Evelyn Waugh","F. Scott Fitzgerald","Ford Madox Ford","Frances Hodgson Burnett","Frank Herbert","Frank T. Merrill","Franz Kafka","Friedrich Wilhelm Nietzsche","Fyodor Dostoyevsky","G.K. Chesterton","Gabriel Garcia Marquez","Geoffrey Chaucer","George Eliot","George Grossmith","George Orwell","George R. R. Martin","George Saunders","Grady Ward","Graham Greene","Gustave Doré","Gustave Flaubert","Guy de Maupassant","Günter Grass","H.G. Wells","H.P. Lovecraft","Harper Lee","Harriet Beecher Stowe","Haruki Murakami","Henrik Ibsen","Henry David Thoreau","Henry Fielding","Henry James","Henry Miller","Henry Morley","Herman Melville","Hermann Broch","Homer","Honoré de Balzac","Ian McEwan","Isabel Florence Hapgood","Italo Calvino","J.D. Salinger","J.K. Rowling","J.M. Barrie","J.R.R. Tolkien","Jack Kerouac","Jack London","Jacob Grimm","Jacqueline Crooks","James Baldwin","James Dickey","James Ellroy","James Joyce","James Patterson","Jane Austen","Johann Wolfgang von Goethe","John Bunyan","John Camden Hotten","John Dos Passos","John Green","John Grisham","John Kennedy Toole","John Milton","John Ormsby","John Steinbeck","John Updike","Jonathan Franzen","Jonathan Swift","Joseph Conrad","Joseph Heller","José Rizal","Judy Blume","Jules Verne","Junot Diaz","Karl Marx","Kazuo Ishiguro","Ken Follett","Ken Kesey","Kenneth Grahame","Khaled Hosseini","Kingsley Amis","Kurt Vonnegut","L. Frank Baum","L.M. Montgomery","Laurence Sterne","Leo Tolstoy","Lewis Carroll","Louisa May Alcott","Louise Maude","Malcolm Lowry","Marcel Proust","Margaret Atwood","Margaret Mitchell","Marilynne Robinson","Mark Twain","Martin Amis","Mary Shelley","Michael Chabon","Miguel de Cervantes","Mikhail Bulgakov","Muriel Spark","Nancy Mitford","Nathanael West","Nathaniel Hawthorne","Neil Gaiman","Niccolo Machiavelli","Norman Mailer","Oscar Levy","Oscar Wilde","P.G. Wodehouse","Paulo Coelho","Peter Carey","Philip Pullman","Philip Roth","Plato","R.L. Stine","Rachel Kushner","Ralph Ellison","Ray Bradbury","Raymond Chandler","Richard Wagner","Richard Wright","Richard Yates","Roald Dahl","Robert Graves","Robert Louis Stevenson","Robert Penn Warren","Rudyard Kipling","Salman Rushdie","Samuel Beckett","Samuel Butler","Samuel Richardson","Saul Bellow","Shivaram Parashuram Bhide","Sir Arthur Conan Doyle","Sir Richard Francis Burton","Stendhal","Stephen Hawking","Stephen King","Sun Tzu","Suzanne Collins","T. Smollett","T.S. Eliot","Theodore Alois Buckley","Theodore Dreiser","Thomas Hardy","Thomas Love Peacock","Thomas Mann","Toni Morrison","Truman Capote","V.S. Naipaul","Vance Packard","Vatsyayana","Victor Hugo","Virgil","Virginia Woolf","Vladimir Nabokov","Voltaire","W.G. Sebald","W.K. Marriott","Walker Percy","Walt Whitman","Walter Scott","Wilhelm Grimm","Wilkie Collins","William Faulkner","William Gibson","William Golding","William Makepeace Thackeray","William Shakespeare","Zadie Smith"],hn=["Audiobook","Ebook","Hardcover","Paperback"],mn=["Adventure","Biography","Business","Children's Literature","Classic","Comedy","Comic","Detective","Drama","Fantasy","Graphic Novel","Historical Fiction","Horror","Memoir","Mystery","Mythology","Philosophy","Poetry","Psychology","Religion","Romance","Science Fiction","Thriller","Western","Young Adult"],pn=["Academic Press","Ace Books","Addison-Wesley","Adis International","Airiti Press","Allen Ltd","Andrews McMeel Publishing","Anova Books","Anvil Press Poetry","Applewood Books","Apress","Athabasca University Press","Atheneum Books","Atheneum Publishers","Atlantic Books","Atlas Press","BBC Books","Ballantine Books","Banner of Truth Trust","Bantam Books","Bantam Spectra","Barrie & Jenkins","Basic Books","Belknap Press","Bella Books","Bellevue Literary Press","Berg Publishers","Berkley Books","Bison Books","Black Dog Publishing","Black Library","Black Sparrow Books","Blackie and Son Limited","Blackstaff Press","Blackwell Publishing","Bloodaxe Books","Bloomsbury Publishing Plc","Blue Ribbon Books","Book League of America","Book Works","Booktrope","Borgo Press","Bowes & Bowes","Boydell & Brewer","Breslov Research Institute","Brill","Brimstone Press","Broadview Press","Burns & Oates","Butterworth-Heinemann","Caister Academic Press","Cambridge University Press","Candlewick Press","Canongate Books","Carcanet Press","Carlton Books","Carlton Publishing Group","Carnegie Mellon University Press","Casemate Publishers","Cengage Learning","Central European University Press","Chambers Harrap","Charles Scribner's Sons","Chatto and Windus","Chick Publications","Chronicle Books","Churchill Livingstone","Cisco Press","City Lights Publishers","Cloverdale Corporation","D. Appleton & Company","D. Reidel","DAW Books","Da Capo Press","Daedalus Publishing","Dalkey Archive Press","Darakwon Press","David & Charles","Dedalus Books","Del Rey Books","E. P. Dutton","ECW Press","Earthscan","Edupedia Publications","Eel Pie Publishing","Eerdmans Publishing","Ellora's Cave","Elsevier","Emerald Group Publishing","Etruscan Press","FabJob","Faber and Faber","Fairview Press","Farrar, Straus & Giroux","Fearless Books","Felony & Mayhem Press","Firebrand Books","Flame Tree Publishing","Focal Press","G-Unit Books","G. P. Putnam's Sons","Gaspereau Press","Gay Men's Press","Gefen Publishing House","George H. Doran Company","George Newnes","George Routledge & Sons","Godwit Press","Golden Cockerel Press","HMSO","Hachette Book Group USA","Hackett Publishing Company","Hamish Hamilton","Happy House","Harcourt Assessment","Harcourt Trade Publishers","Harlequin Enterprises Ltd","Harper & Brothers","Harper & Row","HarperCollins","HarperPrism","HarperTrophy","Harry N. Abrams, Inc.","Harvard University Press","Harvest House","Harvill Press at Random House","Hawthorne Books","Hay House","Haynes Manuals","Heyday Books","Hodder & Stoughton","Hodder Headline","Hogarth Press","Holland Park Press","Holt McDougal","Horizon Scientific Press","Ian Allan Publishing","Ignatius Press","Imperial War Museum","Indiana University Press","J. M. Dent","Jaico Publishing House","Jarrolds Publishing","John Blake Publishing","Karadi Tales","Kensington Books","Kessinger Publishing","Kodansha","Kogan Page","Koren Publishers Jerusalem","Ladybird Books","Leaf Books","Leafwood Publishers","Left Book Club","Legend Books","Lethe Press","Libertas Academica","Liberty Fund","Library of America","Lion Hudson","Macmillan Publishers","Mainstream Publishing","Manchester University Press","Mandrake Press","Mandrake of Oxford","Manning Publications","Manor House Publishing","Mapin Publishing","Marion Boyars Publishers","Mark Batty Publisher","Marshall Cavendish","Marshall Pickering","Martinus Nijhoff Publishers","Mascot Books","Matthias Media","McClelland and Stewart","McFarland & Company","McGraw Hill Financial","McGraw-Hill Education","Medknow Publications","Naiad Press","Nauka","NavPress","New Directions Publishing","New English Library","New Holland Publishers","New Village Press","Newnes","No Starch Press","Nonesuch Press","O'Reilly Media","Oberon Books","Open Court Publishing Company","Open University Press","Orchard Books","Orion Books","Packt Publishing","Palgrave Macmillan","Pan Books","Pantheon Books at Random House","Papadakis Publisher","Parachute Publishing","Parragon","Pathfinder Press","Paulist Press","Pavilion Books","Peace Hill Press","Pecan Grove Press","Pen and Sword Books","Penguin Books","Random House","Reed Elsevier","Reed Publishing","SAGE Publications","Salt Publishing","Sams Publishing","Schocken Books","Scholastic Press","Seagull Books","Secker & Warburg","Shambhala Publications","Shire Books","Shoemaker & Hoard Publishers","Shuter & Shooter Publishers","Sidgwick & Jackson","Signet Books","Simon & Schuster","St. Martin's Press","T & T Clark","Tachyon Publications","Tammi","Target Books","Tarpaulin Sky Press","Tartarus Press","Tate Publishing & Enterprises","Taunton Press","Taylor & Francis","Ten Speed Press","UCL Press","Unfinished Monument Press","United States Government Publishing Office","University of Akron Press","University of Alaska Press","University of California Press","University of Chicago Press","University of Michigan Press","University of Minnesota Press","University of Nebraska Press","Velazquez Press","Verso Books","Victor Gollancz Ltd","Viking Press","Vintage Books","Vintage Books at Random House","Virago Press","Virgin Publishing","Voyager Books","Zed Books","Ziff Davis Media","Zondervan"],Fn=["A Song of Ice and Fire","Anna Karenina","Colonel Race","Discworld","Dune","Harry Potter","Hercule Poirot","His Dark Materials","Jane Austen Murder Mysteries","Little Women","Outlander","Percy Jackson","Sherlock Holmes","The Arc of a Scythe","The Bartimaeus Trilogy","The Border Trilogy","The Chronicles of Narnia","The Dark Tower","The Dresden Files","The Eighth Life","The Foundation Series","The Hitchhiker's Guide to the Galaxy","The Hunger Games","The Infinity Cycle","The Inheritance Cycle","The Lord of the Rings","The Maze Runner","The Prison Healer","The Red Rising Saga","The Southern Reach","The Wheel of Time","Thursday Next Series","Twilight","War and Peace"],yn=["1984","20,000 Leagues Under the Sea","A Bend in the River","A Brief History of Time","A Clockwork Orange","A Confederacy of Dunces","A Doll's House","A Handful of Dust","A Modest Proposal","A Passage to India","A Portrait of the Artist as a Young Man","A Room with a View","A Study in Scarlet","A Tale of Two Cities","A Wrinkle in Time","Absalom, Absalom!","Adventures of Huckleberry Finn","Alice's Adventures in Wonderland","All Quiet on the Western Front","All the King's Men","American Pastoral","An American Tragedy","And Then There Were None","Animal Farm","Anna Karenina","Anne of Green Gables","Are You There God? It's Me, Margaret","As I Lay Dying","Atlas Shrugged","Atonement","Austerlitz","Beloved","Beyond Good and Evil","Bible","Bleak House","Blood Meridian","Brave New World","Brideshead Revisited","Candide","Carmilla","Catch-22","Charlie and the Chocolate Factory","Charlotte's Web","Clarissa","Cranford","Crime and Punishment","Dao De Jing: A Minimalist Translation","David Copperfield","Deliverance","Don Quixote","Dora","Dr. Zhivago","Dracula","Dubliners","Dune","East of Eden","Emma","Fahrenheit 451","Faust","For Whom the Bell Tolls","Frankenstein","Freakonomics","Go Tell It on the Mountain","Gone with the Wind","Great Expectations","Grimms' Fairy Tales","Gulliver's Travels","Hamlet","Harry Potter and the Sorcerer's Stone","Heart of Darkness","Herzog","His Dark Materials","Hitting the line","Housekeeping","I, Claudius","If on a Winter's Night a Traveler","In Cold Blood","In Search of Lost Time","Invisible Man","It","Jane Eyre","Josefine Mutzenbacher","Jude the Obscure","L.A. Confidential","Leaves of Grass","Les Miserables","Life of Pi","Little Women","Lolita","Long Walk to Freedom","Lord Jim","Lord of the Flies","Lucky Jim","Madame Bovary","Malone Dies","Meditations","Men Without Women","Metamorphosis","Middlemarch","Midnight's Children","Moby Dick","Money","Mrs. Dalloway","My Bondage and My Freedom","My Life","Native Son","Neuromancer","Never Let Me Go","Nightmare Abbey","Nineteen Eighty Four","Nostromo","Notes from the Underground","Of Mice and Men","Oliver Twist","On the Duty of Civil Disobedience","On the Road","One Flew Over the Cuckoo's Nest","One Hundred Years of Solitude","One Thousand and One Nights","Oscar and Lucinda","Pale Fire","Paradise Lost","Peter Pan","Portnoy's Complaint","Pride and Prejudice","Rabbit, Run","Republic","Revolutionary Road","Robinson Crusoe","Romeo and Juliet","Ruth Fielding in Alaska","Scoop","Second Treatise of Government","Slaughterhouse Five","Stories of Anton Chekhov","Sybil","Tess of the d'Urbervilles","The Adventures of Augie March","The Adventures of Huckleberry Finn","The Adventures of Sherlock Holmes","The Adventures of Tom Sawyer","The Aeneid","The Alchemist","The Ambassadors","The Art of War","The Big Sleep","The Black Sheep","The Blue Castle","The Brief Wondrous Life of Oscar Wao","The Brothers Karamazov","The Call of the Wild","The Canterbury Tales","The Catcher in the Rye","The Color Purple","The Complete Works of Edgar Allen Poe","The Corrections","The Count of Monte Cristo","The Day of the Locust","The Diary of a Nobody","The Diary of a Young Girl","The Divine Comedy","The Enchanted April","The Fountainhead","The Golden Bowl","The Golden Notebook","The Good Soldier","The Grapes of Wrath","The Great Gatsby","The Handmaid's Tale","The Heart is a Lonely Hunter","The Heart of the Matter","The Hobbit","The Hound of the Baskervilles","The Idiot","The Iliad","The King in Yellow","The Kite Runner","The Lion, the Witch, and the Wardrobe","The Little Prince","The Lord of the Rings","The Magic Mountain","The Maltese Falcon","The Master and Margarita","The Moviegoer","The Naked and the Dead","The Odyssey","The Old Man and the Sea","The Pickwick Papers","The Picture of Dorian Gray","The Pilgrim's Progress","The Pillars of the Earth","The Plague","The Portrait of a Lady","The Prime of Miss Jean Brodie","The Prince","The Problems of Philosophy","The Prophet","The Pursuit of Love","The Rainbow","The Red and the Black","The Remains of the Day","The Republic","The Scarlet Letter","The Sleepwalkers","The Sound and the Fury","The Stand","The Strange Case of Dr. Jekyll and Mr. Hyde","The Stranger","The Sun Also Rises","The Thirty-Nine Steps","The Three Musketeers","The Time Machine","The Tin Drum","The Trial","The War of the Worlds","The Waste Land","The Way We Live Now","The Wind in the Willows","The Woman in White","The Wonderful Wizard of Oz","The Works of Edgar Allan Poe","The Yellow Wallpaper","Things Fall Apart","Tinker, Tailor, Soldier, Spy","To Kill a Mockingbird","To the Lighthouse","Tom Jones","Treasure Island","Tristram Shandy","Tropic of Cancer","U.S.A. Trilogy","Ulysses","Uncle Tom's Cabin","Under the Volcano","Underworld","Vanity Fair","Walden","War and Peace","Watchmen","Winnie-the-Pooh","Wuthering Heights"],gn={author:dn,format:hn,genre:mn,publisher:pn,series:Fn,title:yn},bn=gn,fn=["###-###-####","(###) ###-####","1-###-###-####","###.###.####"],vn={formats:fn},Cn=vn,kn=["azure","black","blue","cyan","fuchsia","gold","green","grey","indigo","ivory","lavender","lime","magenta","maroon","mint green","olive","orange","orchid","pink","plum","purple","red","salmon","silver","sky blue","tan","teal","turquoise","violet","white","yellow"],Sn={human:kn},En=Sn,An=["Automotive","Baby","Beauty","Books","Clothing","Computers","Electronics","Games","Garden","Grocery","Health","Home","Industrial","Jewelry","Kids","Movies","Music","Outdoors","Shoes","Sports","Tools","Toys"],Dn=["Discover the {{animal.type}}-like agility of our {{commerce.product}}, perfect for {{word.adjective}} users","Discover the {{word.adjective}} new {{commerce.product}} with an exciting mix of {{commerce.productMaterial}} ingredients","Ergonomic {{commerce.product}} made with {{commerce.productMaterial}} for all-day {{word.adjective}} support","Experience the {{color.human}} brilliance of our {{commerce.product}}, perfect for {{word.adjective}} environments","Featuring {{science.chemical_element.name}}-enhanced technology, our {{commerce.product}} offers unparalleled {{word.adjective}} performance","Innovative {{commerce.product}} featuring {{word.adjective}} technology and {{commerce.productMaterial}} construction","Introducing the {{location.country}}-inspired {{commerce.product}}, blending {{word.adjective}} style with local craftsmanship","New {{color.human}} {{commerce.product}} with ergonomic design for {{word.adjective}} comfort",'New {{commerce.product}} model with {{number.int({"min": 1, "max": 100})}} GB RAM, {{number.int({"min": 1, "max": 1000})}} GB storage, and {{word.adjective}} features',"Our {{animal.type}}-friendly {{commerce.product}} ensures {{word.adjective}} comfort for your pets","Our {{food.adjective}}-inspired {{commerce.product}} brings a taste of luxury to your {{word.adjective}} lifestyle","Professional-grade {{commerce.product}} perfect for {{word.adjective}} training and recreational use","Savor the {{food.adjective}} essence in our {{commerce.product}}, designed for {{word.adjective}} culinary adventures","Stylish {{commerce.product}} designed to make you stand out with {{word.adjective}} looks","The sleek and {{word.adjective}} {{commerce.product}} comes with {{color.human}} LED lighting for smart functionality","The {{color.human}} {{commerce.product}} combines {{location.country}} aesthetics with {{science.chemical_element.name}}-based durability","The {{company.catchPhrase}} {{commerce.product}} offers reliable performance and {{word.adjective}} design","The {{person.firstName}} {{commerce.product}} is the latest in a series of {{word.adjective}} products from {{company.name}}","{{commerce.productAdjective}} {{commerce.product}} designed with {{commerce.productMaterial}} for {{word.adjective}} performance","{{company.name}}'s most advanced {{commerce.product}} technology increases {{word.adjective}} capabilities"],Bn={adjective:["Awesome","Bespoke","Electronic","Elegant","Ergonomic","Fantastic","Fresh","Frozen","Generic","Gorgeous","Handcrafted","Handmade","Incredible","Intelligent","Licensed","Luxurious","Modern","Oriental","Practical","Recycled","Refined","Rustic","Sleek","Small","Soft","Tasty","Unbranded"],material:["Aluminum","Bamboo","Bronze","Ceramic","Concrete","Cotton","Gold","Granite","Marble","Metal","Plastic","Rubber","Silk","Steel","Wooden"],product:["Bacon","Ball","Bike","Car","Chair","Cheese","Chicken","Chips","Computer","Fish","Gloves","Hat","Keyboard","Mouse","Pants","Pizza","Salad","Sausages","Shirt","Shoes","Soap","Table","Towels","Tuna"],pattern:["{{commerce.productAdjective}} {{commerce.productMaterial}} {{commerce.product}}"]},wn={department:An,product_description:Dn,product_name:Bn},Tn=wn,Mn=["AI-driven","Adaptive","Advanced","Automated","Balanced","Business-focused","Centralized","Compatible","Configurable","Cross-platform","Customer-focused","Customizable","Decentralized","Devolved","Digitized","Distributed","Diverse","Enhanced","Ergonomic","Exclusive","Expanded","Extended","Face to face","Focused","Front-line","Fully-configurable","Fundamental","Future-proofed","Grass-roots","Horizontal","Immersive","Implemented","Innovative","Integrated","Intuitive","Managed","Monitored","Multi-tiered","Networked","Open-architected","Open-source","Operative","Optimized","Optional","Organic","Organized","Persevering","Persistent","Phased","Polarised","Proactive","Profit-focused","Profound","Programmable","Progressive","Public-key","Quality-focused","Reactive","Realigned","Reduced","Reverse-engineered","Robust","Seamless","Secured","Self-enabling","Sharable","Smart","Stand-alone","Streamlined","Sustainable","Synchronised","Team-oriented","Total","Triple-buffered","Universal","Upgradable","User-centric","User-friendly","Versatile","Virtual","Visionary"],Ln=["24/7","AI-driven","B2B","B2C","back-end","best-of-breed","bleeding-edge","collaborative","compelling","cross-media","cross-platform","customized","cutting-edge","decentralized","distributed","dynamic","efficient","end-to-end","enterprise","extensible","frictionless","front-end","generative","global","granular","holistic","immersive","impactful","innovative","integrated","interactive","intuitive","killer","leading-edge","magnetic","mission-critical","next-generation","one-to-one","open-source","out-of-the-box","plug-and-play","proactive","quantum","real-time","revolutionary","rich","robust","scalable","seamless","smart","sticky","strategic","sustainable","synergistic","transparent","turn-key","ubiquitous","user-centric","value-added","vertical","viral","virtual","visionary","world-class"],xn=["AI","ROI","applications","architectures","blockchains","channels","communities","content","convergence","deliverables","e-commerce","experiences","functionalities","infrastructures","initiatives","interfaces","large language models","lifetime value","markets","methodologies","metrics","mindshare","models","networks","niches","paradigms","partnerships","platforms","relationships","schemas","smart contracts","solutions","supply-chains","synergies","systems","technologies","users","web services"],Nn=["aggregate","architect","benchmark","brand","collaborate","cultivate","deliver","deploy","disintermediate","drive","embrace","empower","enable","engage","engineer","enhance","evolve","expedite","exploit","extend","facilitate","gamify","generate","grow","harness","implement","incentivize","incubate","innovate","integrate","iterate","leverage","maximize","mesh","monetize","optimize","orchestrate","productize","redefine","reinvent","repurpose","revolutionize","scale","seize","simplify","strategize","streamline","syndicate","synthesize","target","transform","transition","unleash","utilize","visualize","whiteboard"],Rn=["24 hour","24/7","AI-powered","actuating","analyzing","asymmetric","asynchronous","attitude-oriented","bifurcated","bottom-line","clear-thinking","client-driven","client-server","cloud-native","coherent","cohesive","composite","content-based","context-sensitive","contextually-based","data-driven","dedicated","demand-driven","directional","discrete","disintermediate","dynamic","eco-centric","empowering","encompassing","executive","explicit","exuding","fault-tolerant","fresh-thinking","full-range","global","heuristic","high-level","holistic","homogeneous","human-resource","hybrid","immersive","impactful","incremental","intangible","interactive","intermediate","leading edge","local","logistical","maximized","methodical","mission-critical","mobile","modular","motivating","national","needs-based","neutral","next generation","optimal","optimizing","radical","real-time","reciprocal","regional","resilient","responsive","scalable","secondary","stable","static","sustainable","system-worthy","systematic","systemic","tangible","tertiary","transitional","uniform","user-facing","value-added","well-modulated","zero administration","zero defect","zero tolerance","zero trust"],Pn=["Group","Inc","LLC","and Sons"],Hn=["{{person.last_name.generic}} - {{person.last_name.generic}}","{{person.last_name.generic}} {{company.legal_entity_type}}","{{person.last_name.generic}}, {{person.last_name.generic}} and {{person.last_name.generic}}"],In=["ability","access","adapter","algorithm","alliance","analyzer","application","approach","architecture","archive","array","artificial intelligence","attitude","benchmark","budgetary management","capability","capacity","challenge","circuit","collaboration","complexity","concept","conglomeration","contingency","core","customer loyalty","data-warehouse","database","definition","emulation","encoding","encryption","firmware","flexibility","focus group","forecast","frame","framework","function","functionalities","generative AI","hardware","help-desk","hierarchy","hub","implementation","infrastructure","initiative","installation","instruction set","interface","internet solution","intranet","knowledge base","knowledge user","leverage","local area network","matrices","matrix","methodology","microservice","middleware","migration","model","moderator","monitoring","moratorium","neural-net","open architecture","orchestration","paradigm","parallelism","policy","portal","pricing structure","process improvement","product","productivity","project","projection","protocol","service-desk","software","solution","standardization","strategy","structure","success","support","synergy","system engine","task-force","throughput","time-frame","toolset","utilisation","website","workforce"],Gn={adjective:Mn,buzz_adjective:Ln,buzz_noun:xn,buzz_verb:Nn,descriptor:Rn,legal_entity_type:Pn,name_pattern:Hn,noun:In},_n=Gn,Wn=["avatar","category","comment","createdAt","email","group","id","name","password","phone","status","title","token","updatedAt"],Kn={column:Wn},$n=Kn,On={wide:["April","August","December","February","January","July","June","March","May","November","October","September"],abbr:["Apr","Aug","Dec","Feb","Jan","Jul","Jun","Mar","May","Nov","Oct","Sep"]},zn={wide:["Friday","Monday","Saturday","Sunday","Thursday","Tuesday","Wednesday"],abbr:["Fri","Mon","Sat","Sun","Thu","Tue","Wed"]},Jn={month:On,weekday:zn},Vn=Jn,jn=["Auto Loan","Checking","Credit Card","Home Loan","Investment","Money Market","Personal Loan","Savings"],Yn=["34##-######-####L","37##-######-####L"],qn=["30[0-5]#-######-###L","36##-######-###L"],Un=["6011-####-####-###L","65##-####-####-###L"],Zn=["3528-####-####-###L","3529-####-####-###L","35[3-8]#-####-####-###L"],Xn=["2[221-720]-####-####-###L","5[1-5]##-####-####-###L"],Qn=["4###########L","4###-####-####-###L"],et={american_express:Yn,diners_club:qn,discover:Un,jcb:Zn,mastercard:Xn,visa:Qn},at=et,nt=[{name:"UAE Dirham",code:"AED",symbol:"",numericCode:"784"},{name:"Afghani",code:"AFN",symbol:"؋",numericCode:"971"},{name:"Lek",code:"ALL",symbol:"Lek",numericCode:"008"},{name:"Armenian Dram",code:"AMD",symbol:"",numericCode:"051"},{name:"Netherlands Antillian Guilder",code:"ANG",symbol:"ƒ",numericCode:"532"},{name:"Kwanza",code:"AOA",symbol:"",numericCode:"973"},{name:"Argentine Peso",code:"ARS",symbol:"$",numericCode:"032"},{name:"Australian Dollar",code:"AUD",symbol:"$",numericCode:"036"},{name:"Aruban Guilder",code:"AWG",symbol:"ƒ",numericCode:"533"},{name:"Azerbaijanian Manat",code:"AZN",symbol:"ман",numericCode:"944"},{name:"Convertible Marks",code:"BAM",symbol:"KM",numericCode:"977"},{name:"Barbados Dollar",code:"BBD",symbol:"$",numericCode:"052"},{name:"Taka",code:"BDT",symbol:"",numericCode:"050"},{name:"Bulgarian Lev",code:"BGN",symbol:"лв",numericCode:"975"},{name:"Bahraini Dinar",code:"BHD",symbol:"",numericCode:"048"},{name:"Burundi Franc",code:"BIF",symbol:"",numericCode:"108"},{name:"Bermudian Dollar (customarily known as Bermuda Dollar)",code:"BMD",symbol:"$",numericCode:"060"},{name:"Brunei Dollar",code:"BND",symbol:"$",numericCode:"096"},{name:"Boliviano boliviano",code:"BOB",symbol:"Bs",numericCode:"068"},{name:"Brazilian Real",code:"BRL",symbol:"R$",numericCode:"986"},{name:"Bahamian Dollar",code:"BSD",symbol:"$",numericCode:"044"},{name:"Pula",code:"BWP",symbol:"P",numericCode:"072"},{name:"Belarusian Ruble",code:"BYN",symbol:"Rbl",numericCode:"933"},{name:"Belize Dollar",code:"BZD",symbol:"BZ$",numericCode:"084"},{name:"Canadian Dollar",code:"CAD",symbol:"$",numericCode:"124"},{name:"Congolese Franc",code:"CDF",symbol:"",numericCode:"976"},{name:"Swiss Franc",code:"CHF",symbol:"CHF",numericCode:"756"},{name:"Chilean Peso",code:"CLP",symbol:"$",numericCode:"152"},{name:"Yuan Renminbi",code:"CNY",symbol:"¥",numericCode:"156"},{name:"Colombian Peso",code:"COP",symbol:"$",numericCode:"170"},{name:"Costa Rican Colon",code:"CRC",symbol:"₡",numericCode:"188"},{name:"Cuban Peso",code:"CUP",symbol:"₱",numericCode:"192"},{name:"Cape Verde Escudo",code:"CVE",symbol:"",numericCode:"132"},{name:"Czech Koruna",code:"CZK",symbol:"Kč",numericCode:"203"},{name:"Djibouti Franc",code:"DJF",symbol:"",numericCode:"262"},{name:"Danish Krone",code:"DKK",symbol:"kr",numericCode:"208"},{name:"Dominican Peso",code:"DOP",symbol:"RD$",numericCode:"214"},{name:"Algerian Dinar",code:"DZD",symbol:"",numericCode:"012"},{name:"Egyptian Pound",code:"EGP",symbol:"£",numericCode:"818"},{name:"Nakfa",code:"ERN",symbol:"",numericCode:"232"},{name:"Ethiopian Birr",code:"ETB",symbol:"",numericCode:"230"},{name:"Euro",code:"EUR",symbol:"€",numericCode:"978"},{name:"Fiji Dollar",code:"FJD",symbol:"$",numericCode:"242"},{name:"Falkland Islands Pound",code:"FKP",symbol:"£",numericCode:"238"},{name:"Pound Sterling",code:"GBP",symbol:"£",numericCode:"826"},{name:"Lari",code:"GEL",symbol:"",numericCode:"981"},{name:"Cedi",code:"GHS",symbol:"",numericCode:"936"},{name:"Gibraltar Pound",code:"GIP",symbol:"£",numericCode:"292"},{name:"Dalasi",code:"GMD",symbol:"",numericCode:"270"},{name:"Guinea Franc",code:"GNF",symbol:"",numericCode:"324"},{name:"Quetzal",code:"GTQ",symbol:"Q",numericCode:"320"},{name:"Guyana Dollar",code:"GYD",symbol:"$",numericCode:"328"},{name:"Hong Kong Dollar",code:"HKD",symbol:"$",numericCode:"344"},{name:"Lempira",code:"HNL",symbol:"L",numericCode:"340"},{name:"Gourde",code:"HTG",symbol:"",numericCode:"332"},{name:"Forint",code:"HUF",symbol:"Ft",numericCode:"348"},{name:"Rupiah",code:"IDR",symbol:"Rp",numericCode:"360"},{name:"New Israeli Sheqel",code:"ILS",symbol:"₪",numericCode:"376"},{name:"Bhutanese Ngultrum",code:"BTN",symbol:"Nu",numericCode:"064"},{name:"Indian Rupee",code:"INR",symbol:"₹",numericCode:"356"},{name:"Iraqi Dinar",code:"IQD",symbol:"",numericCode:"368"},{name:"Iranian Rial",code:"IRR",symbol:"﷼",numericCode:"364"},{name:"Iceland Krona",code:"ISK",symbol:"kr",numericCode:"352"},{name:"Jamaican Dollar",code:"JMD",symbol:"J$",numericCode:"388"},{name:"Jordanian Dinar",code:"JOD",symbol:"",numericCode:"400"},{name:"Yen",code:"JPY",symbol:"¥",numericCode:"392"},{name:"Kenyan Shilling",code:"KES",symbol:"",numericCode:"404"},{name:"Som",code:"KGS",symbol:"лв",numericCode:"417"},{name:"Riel",code:"KHR",symbol:"៛",numericCode:"116"},{name:"Comoro Franc",code:"KMF",symbol:"",numericCode:"174"},{name:"North Korean Won",code:"KPW",symbol:"₩",numericCode:"408"},{name:"Won",code:"KRW",symbol:"₩",numericCode:"410"},{name:"Kuwaiti Dinar",code:"KWD",symbol:"",numericCode:"414"},{name:"Cayman Islands Dollar",code:"KYD",symbol:"$",numericCode:"136"},{name:"Tenge",code:"KZT",symbol:"лв",numericCode:"398"},{name:"Kip",code:"LAK",symbol:"₭",numericCode:"418"},{name:"Lebanese Pound",code:"LBP",symbol:"£",numericCode:"422"},{name:"Sri Lanka Rupee",code:"LKR",symbol:"₨",numericCode:"144"},{name:"Liberian Dollar",code:"LRD",symbol:"$",numericCode:"430"},{name:"Libyan Dinar",code:"LYD",symbol:"",numericCode:"434"},{name:"Moroccan Dirham",code:"MAD",symbol:"",numericCode:"504"},{name:"Moldovan Leu",code:"MDL",symbol:"",numericCode:"498"},{name:"Malagasy Ariary",code:"MGA",symbol:"",numericCode:"969"},{name:"Denar",code:"MKD",symbol:"ден",numericCode:"807"},{name:"Kyat",code:"MMK",symbol:"",numericCode:"104"},{name:"Tugrik",code:"MNT",symbol:"₮",numericCode:"496"},{name:"Pataca",code:"MOP",symbol:"",numericCode:"446"},{name:"Ouguiya",code:"MRU",symbol:"",numericCode:"929"},{name:"Mauritius Rupee",code:"MUR",symbol:"₨",numericCode:"480"},{name:"Rufiyaa",code:"MVR",symbol:"",numericCode:"462"},{name:"Kwacha",code:"MWK",symbol:"",numericCode:"454"},{name:"Mexican Peso",code:"MXN",symbol:"$",numericCode:"484"},{name:"Malaysian Ringgit",code:"MYR",symbol:"RM",numericCode:"458"},{name:"Metical",code:"MZN",symbol:"MT",numericCode:"943"},{name:"Naira",code:"NGN",symbol:"₦",numericCode:"566"},{name:"Cordoba Oro",code:"NIO",symbol:"C$",numericCode:"558"},{name:"Norwegian Krone",code:"NOK",symbol:"kr",numericCode:"578"},{name:"Nepalese Rupee",code:"NPR",symbol:"₨",numericCode:"524"},{name:"New Zealand Dollar",code:"NZD",symbol:"$",numericCode:"554"},{name:"Rial Omani",code:"OMR",symbol:"﷼",numericCode:"512"},{name:"Balboa",code:"PAB",symbol:"B/.",numericCode:"590"},{name:"Nuevo Sol",code:"PEN",symbol:"S/.",numericCode:"604"},{name:"Kina",code:"PGK",symbol:"",numericCode:"598"},{name:"Philippine Peso",code:"PHP",symbol:"Php",numericCode:"608"},{name:"Pakistan Rupee",code:"PKR",symbol:"₨",numericCode:"586"},{name:"Zloty",code:"PLN",symbol:"zł",numericCode:"985"},{name:"Guarani",code:"PYG",symbol:"Gs",numericCode:"600"},{name:"Qatari Rial",code:"QAR",symbol:"﷼",numericCode:"634"},{name:"New Leu",code:"RON",symbol:"lei",numericCode:"946"},{name:"Serbian Dinar",code:"RSD",symbol:"Дин.",numericCode:"941"},{name:"Russian Ruble",code:"RUB",symbol:"руб",numericCode:"643"},{name:"Rwanda Franc",code:"RWF",symbol:"",numericCode:"646"},{name:"Saudi Riyal",code:"SAR",symbol:"﷼",numericCode:"682"},{name:"Solomon Islands Dollar",code:"SBD",symbol:"$",numericCode:"090"},{name:"Seychelles Rupee",code:"SCR",symbol:"₨",numericCode:"690"},{name:"Sudanese Pound",code:"SDG",symbol:"",numericCode:"938"},{name:"Swedish Krona",code:"SEK",symbol:"kr",numericCode:"752"},{name:"Singapore Dollar",code:"SGD",symbol:"$",numericCode:"702"},{name:"Saint Helena Pound",code:"SHP",symbol:"£",numericCode:"654"},{name:"Leone",code:"SLE",symbol:"",numericCode:"925"},{name:"Somali Shilling",code:"SOS",symbol:"S",numericCode:"706"},{name:"Surinam Dollar",code:"SRD",symbol:"$",numericCode:"968"},{name:"South Sudanese pound",code:"SSP",symbol:"",numericCode:"728"},{name:"Dobra",code:"STN",symbol:"Db",numericCode:"930"},{name:"Syrian Pound",code:"SYP",symbol:"£",numericCode:"760"},{name:"Lilangeni",code:"SZL",symbol:"",numericCode:"748"},{name:"Baht",code:"THB",symbol:"฿",numericCode:"764"},{name:"Somoni",code:"TJS",symbol:"",numericCode:"972"},{name:"Manat",code:"TMT",symbol:"",numericCode:"934"},{name:"Tunisian Dinar",code:"TND",symbol:"",numericCode:"788"},{name:"Pa'anga",code:"TOP",symbol:"",numericCode:"776"},{name:"Turkish Lira",code:"TRY",symbol:"₺",numericCode:"949"},{name:"Trinidad and Tobago Dollar",code:"TTD",symbol:"TT$",numericCode:"780"},{name:"New Taiwan Dollar",code:"TWD",symbol:"NT$",numericCode:"901"},{name:"Tanzanian Shilling",code:"TZS",symbol:"",numericCode:"834"},{name:"Hryvnia",code:"UAH",symbol:"₴",numericCode:"980"},{name:"Uganda Shilling",code:"UGX",symbol:"",numericCode:"800"},{name:"US Dollar",code:"USD",symbol:"$",numericCode:"840"},{name:"Peso Uruguayo",code:"UYU",symbol:"$U",numericCode:"858"},{name:"Uzbekistan Sum",code:"UZS",symbol:"лв",numericCode:"860"},{name:"Venezuelan bolívar",code:"VES",symbol:"Bs",numericCode:"928"},{name:"Dong",code:"VND",symbol:"₫",numericCode:"704"},{name:"Vatu",code:"VUV",symbol:"",numericCode:"548"},{name:"Tala",code:"WST",symbol:"",numericCode:"882"},{name:"CFA Franc BEAC",code:"XAF",symbol:"",numericCode:"950"},{name:"East Caribbean Dollar",code:"XCD",symbol:"$",numericCode:"951"},{name:"CFA Franc BCEAO",code:"XOF",symbol:"",numericCode:"952"},{name:"CFP Franc",code:"XPF",symbol:"",numericCode:"953"},{name:"Yemeni Rial",code:"YER",symbol:"﷼",numericCode:"886"},{name:"Rand",code:"ZAR",symbol:"R",numericCode:"710"},{name:"Lesotho Loti",code:"LSL",symbol:"",numericCode:"426"},{name:"Namibia Dollar",code:"NAD",symbol:"N$",numericCode:"516"},{name:"Zambian Kwacha",code:"ZMW",symbol:"K",numericCode:"967"},{name:"Zimbabwe Dollar",code:"ZWL",symbol:"",numericCode:"932"}],tt=["A {{finance.transactionType}} for {{finance.currencyCode}} {{finance.amount}} was made at {{company.name}} via card ending ****{{string.numeric(4)}} on account ***{{string.numeric(4)}}.","A {{finance.transactionType}} of {{finance.currencyCode}} {{finance.amount}} occurred at {{company.name}} using a card ending in ****{{string.numeric(4)}} for account ***{{string.numeric(4)}}.","Payment of {{finance.currencyCode}} {{finance.amount}} for {{finance.transactionType}} at {{company.name}}, processed with card ending ****{{string.numeric(4)}} linked to account ***{{string.numeric(4)}}.","Transaction alert: {{finance.transactionType}} at {{company.name}} using card ending ****{{string.numeric(4)}} for an amount of {{finance.currencyCode}} {{finance.amount}} on account ***{{string.numeric(4)}}.","You made a {{finance.transactionType}} of {{finance.currencyCode}} {{finance.amount}} at {{company.name}} using card ending in ****{{string.numeric(4)}} from account ***{{string.numeric(4)}}.","Your {{finance.transactionType}} of {{finance.currencyCode}} {{finance.amount}} at {{company.name}} was successful. Charged via card ****{{string.numeric(4)}} to account ***{{string.numeric(4)}}.","{{finance.transactionType}} at {{company.name}} with a card ending in ****{{string.numeric(4)}} for {{finance.currencyCode}} {{finance.amount}} from account ***{{string.numeric(4)}}.","{{finance.transactionType}} confirmed at {{company.name}} for {{finance.currencyCode}} {{finance.amount}}, card ending in ****{{string.numeric(4)}} associated with account ***{{string.numeric(4)}}.","{{finance.transactionType}} of {{finance.currencyCode}} {{finance.amount}} at {{company.name}} charged to account ending in {{string.numeric(4)}} using card ending in ****{{string.numeric(4)}}.","{{finance.transactionType}} processed at {{company.name}} for {{finance.currencyCode}} {{finance.amount}}, using card ending ****{{string.numeric(4)}}. Account: ***{{string.numeric(4)}}.","{{finance.transactionType}} transaction at {{company.name}} using card ending with ****{{string.numeric(4)}} for {{finance.currencyCode}} {{finance.amount}} in account ***{{string.numeric(4)}}."],rt=["deposit","invoice","payment","withdrawal"],it={account_type:jn,credit_card:at,currency:nt,transaction_description_pattern:tt,transaction_type:rt},ot=it,lt=["bitter","creamy","crispy","crunchy","delicious","fluffy","fresh","golden","juicy","moist","rich","salty","savory","smoky","sour","spicy","sweet","tangy","tender","zesty"],st=["A classic pie filled with delicious {{food.meat}} and {{food.adjective}} {{food.ingredient}}, baked in a {{food.adjective}} pastry crust and topped with a golden-brown lattice.","A delightful tart combining {{food.adjective}} {{food.vegetable}} and sweet {{food.fruit}}, set in a buttery pastry shell and finished with a hint of {{food.spice}}.","A heartwarming {{food.ethnic_category}} soup, featuring fresh {{food.ingredient}} and an aromatic blend of traditional spices.","A robust {{food.adjective}} stew featuring {{food.ethnic_category}} flavors, loaded with {{food.adjective}} meat, {{food.adjective}} vegetables, and a {{food.adjective}}, {{food.adjective}} broth.","A simple {{food.fruit}} pie. No fancy stuff. Just pie.","A slow-roasted {{animal.bird}} with a {{food.adjective}}, {{food.adjective}} exterior. Stuffed with {{food.fruit}} and covered in {{food.fruit}} sauce. Sides with {{food.vegetable}} puree and wild {{food.vegetable}}.","A special {{color.human}} {{food.ingredient}} from {{location.country}}. To support the strong flavor it is sided with a tablespoon of {{food.spice}}.","A succulent {{food.meat}} steak, encased in a {{food.adjective}} {{food.spice}} crust, served with a side of {{food.spice}} mashed {{food.vegetable}}.","An exquisite {{food.meat}} roast, infused with the essence of {{food.fruit}}, slow-roasted to bring out its natural flavors and served with a side of creamy {{food.vegetable}}","Baked {{food.ingredient}}-stuffed {{food.meat}}, seasoned with {{food.spice}} and {{food.adjective}} herbs, accompanied by roasted {{food.vegetable}} medley.","Crispy fried {{food.meat}} bites, seasoned with {{food.spice}} and served with a tangy {{food.fruit}} dipping sauce.","Fresh mixed greens tossed with {{food.spice}}-rubbed {{food.meat}}, {{food.vegetable}}, and a light dressing.","Fresh {{food.ingredient}} with a pinch of {{food.spice}}, topped by a caramelized {{food.fruit}} with whipped cream","Grilled {{food.meat}} kebabs, marinated in {{food.ethnic_category}} spices and served with a fresh {{food.vegetable}} and {{food.fruit}} salad.","Hearty {{food.ingredient}} and {{food.meat}} stew, slow-cooked with {{food.spice}} and {{food.vegetable}} for a comforting, flavorful meal.","Juicy {{food.meat}}, grilled to your liking and drizzled with a bold {{food.spice}} sauce, served alongside roasted {{food.vegetable}}.","Our {{food.adjective}} {{food.meat}}, slow-cooked to perfection, accompanied by steamed {{food.vegetable}} and a rich, savory gravy.","Tender {{food.meat}} skewers, glazed with a sweet and tangy {{food.fruit}} sauce, served over a bed of fragrant jasmine rice.","Tenderly braised {{food.meat}} in a rich {{food.spice}} and {{food.vegetable}} sauce, served with a side of creamy {{food.vegetable}}.","Three {{food.ingredient}} with {{food.vegetable}}, {{food.vegetable}}, {{food.vegetable}}, {{food.vegetable}} and {{food.ingredient}}. With a side of baked {{food.fruit}}, and your choice of {{food.ingredient}} or {{food.ingredient}}.",'{{number.int({"min":1, "max":99})}}-day aged {{food.meat}} steak, with choice of {{number.int({"min":2, "max":4})}} sides.'],ut=["California maki","Peking duck","Philadelphia maki","arepas","barbecue ribs","bruschette with tomato","bunny chow","caesar salad","caprese salad","cauliflower penne","cheeseburger","chicken fajitas","chicken milanese","chicken parm","chicken wings","chilli con carne","ebiten maki","fettuccine alfredo","fish and chips","french fries with sausages","french toast","hummus","katsu curry","kebab","lasagne","linguine with clams","massaman curry","meatballs with sauce","mushroom risotto","pappardelle alla bolognese","pasta and beans","pasta carbonara","pasta with tomato and basil","pho","pierogi","pizza","poke","pork belly buns","pork sausage roll","poutine","ricotta stuffed ravioli","risotto with seafood","salmon nigiri","scotch eggs","seafood paella","som tam","souvlaki","stinky tofu","sushi","tacos","teriyaki chicken donburi","tiramisù","tuna sashimi","vegetable soup"],ct=["{{food.adjective}} {{food.ethnic_category}} stew","{{food.adjective}} {{food.meat}} with {{food.vegetable}}","{{food.ethnic_category}} {{food.ingredient}} soup","{{food.fruit}} and {{food.fruit}} tart","{{food.fruit}} pie","{{food.fruit}}-glazed {{food.meat}} skewers","{{food.fruit}}-infused {{food.meat}} roast","{{food.ingredient}} and {{food.meat}} pie","{{food.ingredient}}-infused {{food.meat}}","{{food.meat}} steak","{{food.meat}} with {{food.fruit}} sauce","{{food.spice}}-crusted {{food.meat}}","{{food.spice}}-rubbed {{food.meat}} salad","{{food.vegetable}} salad","{{person.first_name.generic}}'s special {{food.ingredient}}"],dt=["Ainu","Albanian","American","Andhra","Anglo-Indian","Arab","Argentine","Armenian","Assyrian","Awadhi","Azerbaijani","Balochi","Bangladeshi","Bashkir","Belarusian","Bengali","Berber","Brazilian","British","Buddhist","Bulgarian","Cajun","Cantonese","Caribbean","Chechen","Chinese","Chinese Islamic","Circassian","Crimean Tatar","Cypriot","Czech","Danish","Egyptian","English","Eritrean","Estonian","Ethiopian","Filipino","French","Georgian","German","Goan","Goan Catholic","Greek","Gujarati","Hyderabad","Indian","Indian Chinese","Indian Singaporean","Indonesian","Inuit","Irish","Italian","Italian-American","Jamaican","Japanese","Jewish - Israeli","Karnataka","Kazakh","Keralite","Korean","Kurdish","Laotian","Latvian","Lebanese","Lithuanian","Louisiana Creole","Maharashtrian","Malay","Malaysian Chinese","Malaysian Indian","Mangalorean","Mediterranean","Mennonite","Mexican","Mordovian","Mughal","Native American","Nepalese","New Mexican","Odia","Pakistani","Parsi","Pashtun","Pennsylvania Dutch","Peranakan","Persian","Peruvian","Polish","Portuguese","Punjabi","Québécois","Rajasthani","Romani","Romanian","Russian","Sami","Serbian","Sindhi","Slovak","Slovenian","Somali","South Indian","Soviet","Spanish","Sri Lankan","Taiwanese","Tamil","Tatar","Texan","Thai","Turkish","Udupi","Ukrainian","Vietnamese","Yamal","Zambian","Zanzibari"],ht=["apple","apricot","aubergine","avocado","banana","berry","blackberry","blood orange","blueberry","bush tomato","butternut pumpkin","cantaloupe","cavalo","cherry","corella pear","cranberry","cumquat","currant","custard apple","custard apples daikon","date","dragonfruit","dried apricot","elderberry","feijoa","fig","fingerlime","goji berry","grape","grapefruit","guava","honeydew melon","incaberry","jarrahdale pumpkin","juniper berry","kiwi fruit","kiwiberry","lemon","lime","longan","loquat","lychee","mandarin","mango","mangosteen","melon","mulberry","nashi pear","nectarine","olive","orange","papaw","papaya","passionfruit","peach","pear","pineapple","plum","pomegranate","prune","raspberry","rockmelon","snowpea","sprout","starfruit","strawberry","sultana","tangelo","tomato","watermelon"],mt=["achacha","adzuki beans","agar","agave syrup","ajowan seed","albacore tuna","alfalfa","allspice","almond oil","almonds","amaranth","amchur","anchovies","aniseed","annatto seed","apple cider vinegar","apple juice","apple juice concentrate","apples","apricots","arborio rice","arrowroot","artichoke","arugula","asafoetida","asian greens","asian noodles","asparagus","aubergine","avocado","avocado oil","avocado spread","bacon","baking powder","baking soda","balsamic vinegar","bamboo shoots","banana","barberry","barley","barramundi","basil basmati rice","bay leaves","bean shoots","bean sprouts","beans","beef","beef stock","beetroot","berries","besan","black eyed beans","blackberries","blood oranges","blue cheese","blue eye trevalla","blue swimmer crab","blueberries","bocconcini","bok choy","bonito flakes","bonza","borlotti beans","bran","brazil nut","bread","brie","broccoli","broccolini","brown flour","brown mushrooms","brown rice","brown rice vinegar","brussels sprouts","buckwheat","buckwheat flour","buckwheat noodles","bulghur","bush tomato","butter","butter beans","buttermilk","butternut lettuce","butternut pumpkin","cabbage","cacao","cake","calamari","camellia tea oil","camembert","camomile","candle nut","cannellini beans","canola oil","cantaloupe","capers","capsicum","caraway seed","cardamom","carob carrot","carrot","cashews","cassia bark","cauliflower","cavalo","cayenne","celery","celery seed","cheddar","cherries","chestnut","chia seeds","chicken","chicken stock","chickory","chickpea","chilli pepper","chinese cabbage","chinese five spice","chives","choy sum","cinnamon","clams","cloves","cocoa powder","coconut","coconut oil","coconut water","coffee","common cultivated mushrooms","corella pear","coriander leaves","coriander seed","corn oil","corn syrup","corn tortilla","cornichons","cornmeal","cos lettuce","cottage cheese","cous cous","crabs","cranberry","cream","cream cheese","cucumber","cumin","cumquat","currants","curry leaves","curry powder","custard apples","dandelion","dark chocolate","dashi","dates","dill","dragonfruit","dried apricots","dried chinese broccoli","duck","edam","edamame","eggplant","eggs","elderberry","endive","english spinach","enoki mushrooms","extra virgin olive oil","farmed prawns","feijoa","fennel","fennel seeds","fenugreek","feta","figs","file powder","fingerlime","fish sauce","fish stock","flat mushrooms","flathead","flaxseed","flaxseed oil","flounder","flour","freekeh","french eschallots","fresh chillies","fromage blanc","fruit","galangal","garam masala","garlic","goat cheese","goat milk","goji berry","grape seed oil","grapefruit","grapes","green beans","green pepper","green tea","green tea noodles","greenwheat freekeh","gruyere","guava","gula melaka","haloumi","ham","haricot beans","harissa","hazelnut","hijiki","hiramasa kingfish","hokkien noodles","honey","honeydew melon","horseradish","hot smoked salmon","hummus","iceberg lettuce","incaberries","jarrahdale pumpkin","jasmine rice","jelly","jerusalem artichoke","jewfish","jicama","juniper berries","kale","kangaroo","kecap manis","kenchur","kidney beans","kidneys","kiwi berries","kiwi fruit","kohlrabi","kokam","kombu","koshihikari rice","kudzu","kumera","lamb","lavender flowers","leeks","lemon","lemongrass","lentils","lettuce","licorice","lime leaves","limes","liver","lobster","longan","loquats","lotus root","lychees","macadamia nut","macadamia oil","mace","mackerel","mahi mahi","mahlab","malt vinegar","mandarins","mango","mangosteens","maple syrup","margarine","marigold","marjoram","mastic","melon","milk","milk chocolate","mint","miso","molasses","monkfish","morwong","mountain bread","mozzarella","muesli","mulberries","mullet","mung beans","mussels","mustard","mustard seed","nashi pear","nasturtium","nectarines","nori","nutmeg","nutritional yeast","nuts","oat flour","oatmeal","oats","octopus","okra","olive oil","olives","omega spread","onion","oranges","oregano","oyster mushrooms","oyster sauce","oysters","pandanus leaves","papaw","papaya","paprik","parmesan cheese","parrotfish","parsley","parsnip","passionfruit","pasta","peaches","peanuts","pear","pear juice","pears","peas","pecan nut","pecorino","pepitas","peppercorns","peppermint","peppers","persimmon","pine nut","pineapple","pinto beans","pistachio nut","plums","polenta","pomegranate","poppy seed","porcini mushrooms","pork","potato flour","potatoes","provolone","prunes","pumpkin","pumpkin seed","purple carrot","purple rice","quark","quince","quinoa","radicchio","radish","raisin","raspberry","red cabbage","red lentils","red pepper","red wine","red wine vinegar","redfish","rhubarb","rice flour","rice noodles","rice paper","rice syrup","ricemilk","ricotta","rockmelon","rose water","rosemary","rye","rye bread","safflower oil","saffron","sage","sake","salmon","sardines","sausages","scallops","sea salt","semolina","sesame oil","sesame seeds","shark","shiitake mushrooms","silverbeet","slivered almonds","smoked trout","snapper","snowpea sprouts","snowpeas","soba","sour dough bread","soy","soy beans","soy flour","soy milk","soy sauce","soymilk","spearmint","spelt","spelt bread","spinach","spring onions","sprouts","squash","squid","star anise","star fruit","starfruit","stevia","strawberries","sugar","sultanas","sun-dried tomatoes","sunflower oil","sunflower seeds","sweet chilli sauce","sweet potato","swiss chard","swordfish","szechuan pepperberry","tabasco","tahini","taleggio cheese","tamari","tamarillo","tangelo","tapioca","tapioca flour","tarragon","tea","tea oil","tempeh","thyme","tinned","tofu","tom yum","tomatoes","trout","tuna","turkey","turmeric","turnips","unbleached flour","vanilla beans","vegetable oil","vegetable spaghetti","vegetable stock","vermicelli noodles","vinegar","wakame","walnut","warehou","wasabi","water","watercress","watermelon","wattleseed","wheat","wheatgrass juice","white bread","white flour","white rice","white wine","white wine vinegar","whiting wild rice","wholegrain bread","wholemeal","wholewheat flour","william pear","yeast","yellow papaw","yellowtail kingfish","yoghurt","yogurt","zucchini"],pt=["beef","chicken","crocodile","duck","emu","goose","kangaroo","lamb","ostrich","pigeon","pork","quail","rabbit","salmon","turkey","venison"],Ft=["achiote seed","ajwain seed","ajwan seed","allspice","amchoor","anise","anise star","aniseed","annatto seed","arrowroot","asafoetida","baharat","balti masala","balti stir fry mix","basil","bay leaves","bbq","caraway seed","cardamom","cassia","cayenne pepper","celery","chamomile","chervil","chilli","chilli pepper","chillies","china star","chives","cinnamon","cloves","colombo","coriander","cumin","curly leaf parsley","curry","dhansak","dill","fennel seed","fenugreek","fines herbes","five spice","french lavender","galangal","garam masala","garlic","german chamomile","ginger","green cardamom","herbes de provence","jalfrezi","jerk","kaffir leaves","korma","lavender","lemon grass","lemon pepper","lime leaves","liquorice root","mace","mango","marjoram","methi","mint","mustard","nutmeg","onion seed","orange zest","oregano","paprika","parsley","pepper","peppercorns","pimento","piri piri","poppy seed","pot marjoram","poudre de colombo","ras-el-hanout","rice paper","rogan josh","rose baie","rosemary","saffron","sage","sesame seed","spearmint","sumac","sweet basil","sweet laurel","tagine","tandoori masala","tarragon","thyme","tikka masala","turmeric","vanilla","zahtar"],yt=["artichoke","arugula","asian greens","asparagus","bean shoots","bean sprouts","beans","beetroot","bok choy","broccoli","broccolini","brussels sprouts","butternut lettuce","cabbage","capers","carob carrot","carrot","cauliflower","celery","chilli pepper","chinese cabbage","chives","cornichons","cos lettuce","cucumber","dried chinese broccoli","eggplant","endive","english spinach","french eschallots","fresh chillies","garlic","green beans","green pepper","hijiki","iceberg lettuce","jerusalem artichoke","jicama","kale","kohlrabi","leeks","lettuce","okra","onion","parsnip","peas","peppers","potatoes","pumpkin","purple carrot","radicchio","radish","red cabbage","red pepper","rhubarb","snowpea sprouts","spinach","squash","sun dried tomatoes","sweet potato","swiss chard","turnips","zucchini"],gt={adjective:lt,description_pattern:st,dish:ut,dish_pattern:ct,ethnic_category:dt,fruit:ht,ingredient:mt,meat:pt,spice:Ft,vegetable:yt},bt=gt,ft=["1080p","auxiliary","back-end","bluetooth","cross-platform","digital","haptic","mobile","multi-byte","neural","online","open-source","optical","primary","redundant","solid state","virtual","wireless"],vt=["backing up","bypassing","calculating","compressing","connecting","copying","generating","hacking","indexing","navigating","overriding","parsing","programming","quantifying","synthesizing","transmitting"],Ct=["alarm","application","array","bandwidth","bus","capacitor","card","circuit","driver","feed","firewall","hard drive","interface","matrix","microchip","monitor","panel","pixel","port","program","protocol","sensor","system","transmitter"],kt=["I'll {{verb}} the {{adjective}} {{abbreviation}} {{noun}}, that should {{noun}} the {{abbreviation}} {{noun}}!","If we {{verb}} the {{noun}}, we can get to the {{abbreviation}} {{noun}} through the {{adjective}} {{abbreviation}} {{noun}}!","The {{abbreviation}} {{noun}} is down, {{verb}} the {{adjective}} {{noun}} so we can {{verb}} the {{abbreviation}} {{noun}}!","Try to {{verb}} the {{abbreviation}} {{noun}}, maybe it will {{verb}} the {{adjective}} {{noun}}!","Use the {{adjective}} {{abbreviation}} {{noun}}, then you can {{verb}} the {{adjective}} {{noun}}!","We need to {{verb}} the {{adjective}} {{abbreviation}} {{noun}}!","You can't {{verb}} the {{noun}} without {{ingverb}} the {{adjective}} {{abbreviation}} {{noun}}!","{{ingverb}} the {{noun}} won't do anything, we need to {{verb}} the {{adjective}} {{abbreviation}} {{noun}}!"],St=["back up","bypass","calculate","compress","connect","copy","generate","hack","index","input","navigate","override","parse","program","quantify","reboot","synthesize","transmit"],Et={adjective:ft,ingverb:vt,noun:Ct,phrase:kt,verb:St},At=Et,Dt=["biz","com","info","name","net","org"],Bt=["example.com","example.net","example.org"],wt=["gmail.com","hotmail.com","yahoo.com"],Tt={domain_suffix:Dt,example_email:Bt,free_email:wt},Mt=Tt,Lt=["#####","####","###"],xt=["Abilene","Akron","Alafaya","Alameda","Albany","Albuquerque","Alexandria","Alhambra","Aliso Viejo","Allen","Allentown","Aloha","Alpharetta","Altadena","Altamonte Springs","Altoona","Amarillo","Ames","Anaheim","Anchorage","Anderson","Ankeny","Ann Arbor","Annandale","Antelope","Antioch","Apex","Apopka","Apple Valley","Appleton","Arcadia","Arden-Arcade","Arecibo","Arlington","Arlington Heights","Arvada","Ashburn","Asheville","Aspen Hill","Atascocita","Athens-Clarke County","Atlanta","Attleboro","Auburn","Augusta-Richmond County","Aurora","Austin","Avondale","Azusa","Bakersfield","Baldwin Park","Baltimore","Barnstable Town","Bartlett","Baton Rouge","Battle Creek","Bayamon","Bayonne","Baytown","Beaumont","Beavercreek","Beaverton","Bedford","Bel Air South","Bell Gardens","Belleville","Bellevue","Bellflower","Bellingham","Bend","Bentonville","Berkeley","Berwyn","Bethesda","Bethlehem","Billings","Biloxi","Binghamton","Birmingham","Bismarck","Blacksburg","Blaine","Bloomington","Blue Springs","Boca Raton","Boise City","Bolingbrook","Bonita Springs","Bossier City","Boston","Bothell","Boulder","Bountiful","Bowie","Bowling Green","Boynton Beach","Bozeman","Bradenton","Brandon","Brentwood","Bridgeport","Bristol","Brockton","Broken Arrow","Brookhaven","Brookline","Brooklyn Park","Broomfield","Brownsville","Bryan","Buckeye","Buena Park","Buffalo","Buffalo Grove","Burbank","Burien","Burke","Burleson","Burlington","Burnsville","Caguas","Caldwell","Camarillo","Cambridge","Camden","Canton","Cape Coral","Carlsbad","Carmel","Carmichael","Carolina","Carrollton","Carson","Carson City","Cary","Casa Grande","Casas Adobes","Casper","Castle Rock","Castro Valley","Catalina Foothills","Cathedral City","Catonsville","Cedar Hill","Cedar Park","Cedar Rapids","Centennial","Centreville","Ceres","Cerritos","Champaign","Chandler","Chapel Hill","Charleston","Charlotte","Charlottesville","Chattanooga","Cheektowaga","Chesapeake","Chesterfield","Cheyenne","Chicago","Chico","Chicopee","Chino","Chino Hills","Chula Vista","Cicero","Cincinnati","Citrus Heights","Clarksville","Clearwater","Cleveland","Cleveland Heights","Clifton","Clovis","Coachella","Coconut Creek","Coeur d'Alene","College Station","Collierville","Colorado Springs","Colton","Columbia","Columbus","Commerce City","Compton","Concord","Conroe","Conway","Coon Rapids","Coral Gables","Coral Springs","Corona","Corpus Christi","Corvallis","Costa Mesa","Council Bluffs","Country Club","Covina","Cranston","Cupertino","Cutler Bay","Cuyahoga Falls","Cypress","Dale City","Dallas","Daly City","Danbury","Danville","Davenport","Davie","Davis","Dayton","Daytona Beach","DeKalb","DeSoto","Dearborn","Dearborn Heights","Decatur","Deerfield Beach","Delano","Delray Beach","Deltona","Denton","Denver","Des Moines","Des Plaines","Detroit","Diamond Bar","Doral","Dothan","Downers Grove","Downey","Draper","Dublin","Dubuque","Duluth","Dundalk","Dunwoody","Durham","Eagan","East Hartford","East Honolulu","East Lansing","East Los Angeles","East Orange","East Providence","Eastvale","Eau Claire","Eden Prairie","Edina","Edinburg","Edmond","El Cajon","El Centro","El Dorado Hills","El Monte","El Paso","Elgin","Elizabeth","Elk Grove","Elkhart","Ellicott City","Elmhurst","Elyria","Encinitas","Enid","Enterprise","Erie","Escondido","Euclid","Eugene","Euless","Evanston","Evansville","Everett","Fairfield","Fall River","Fargo","Farmington","Farmington Hills","Fayetteville","Federal Way","Findlay","Fishers","Flagstaff","Flint","Florence-Graham","Florin","Florissant","Flower Mound","Folsom","Fond du Lac","Fontana","Fort Collins","Fort Lauderdale","Fort Myers","Fort Pierce","Fort Smith","Fort Wayne","Fort Worth","Fountain Valley","Fountainebleau","Framingham","Franklin","Frederick","Freeport","Fremont","Fresno","Frisco","Fullerton","Gainesville","Gaithersburg","Galveston","Garden Grove","Gardena","Garland","Gary","Gastonia","Georgetown","Germantown","Gilbert","Gilroy","Glen Burnie","Glendale","Glendora","Glenview","Goodyear","Grand Forks","Grand Island","Grand Junction","Grand Prairie","Grand Rapids","Grapevine","Great Falls","Greeley","Green Bay","Greensboro","Greenville","Greenwood","Gresham","Guaynabo","Gulfport","Hacienda Heights","Hackensack","Haltom City","Hamilton","Hammond","Hampton","Hanford","Harlingen","Harrisburg","Harrisonburg","Hartford","Hattiesburg","Haverhill","Hawthorne","Hayward","Hemet","Hempstead","Henderson","Hendersonville","Hesperia","Hialeah","Hicksville","High Point","Highland","Highlands Ranch","Hillsboro","Hilo","Hoboken","Hoffman Estates","Hollywood","Homestead","Honolulu","Hoover","Houston","Huntersville","Huntington","Huntington Beach","Huntington Park","Huntsville","Hutchinson","Idaho Falls","Independence","Indianapolis","Indio","Inglewood","Iowa City","Irondequoit","Irvine","Irving","Jackson","Jacksonville","Janesville","Jefferson City","Jeffersonville","Jersey City","Johns Creek","Johnson City","Joliet","Jonesboro","Joplin","Jupiter","Jurupa Valley","Kalamazoo","Kannapolis","Kansas City","Kearny","Keller","Kendale Lakes","Kendall","Kenner","Kennewick","Kenosha","Kent","Kentwood","Kettering","Killeen","Kingsport","Kirkland","Kissimmee","Knoxville","Kokomo","La Crosse","La Habra","La Mesa","La Mirada","Lacey","Lafayette","Laguna Niguel","Lake Charles","Lake Elsinore","Lake Forest","Lake Havasu City","Lake Ridge","Lakeland","Lakeville","Lakewood","Lancaster","Lansing","Laredo","Largo","Las Cruces","Las Vegas","Lauderhill","Lawrence","Lawton","Layton","League City","Lee's Summit","Leesburg","Lehi","Lehigh Acres","Lenexa","Levittown","Lewisville","Lexington-Fayette","Lincoln","Linden","Little Rock","Littleton","Livermore","Livonia","Lodi","Logan","Lombard","Lompoc","Long Beach","Longmont","Longview","Lorain","Los Angeles","Louisville/Jefferson County","Loveland","Lowell","Lubbock","Lynchburg","Lynn","Lynwood","Macon-Bibb County","Madera","Madison","Malden","Manchester","Manhattan","Mansfield","Manteca","Maple Grove","Margate","Maricopa","Marietta","Marysville","Mayaguez","McAllen","McKinney","McLean","Medford","Melbourne","Memphis","Menifee","Mentor","Merced","Meriden","Meridian","Mesa","Mesquite","Metairie","Methuen Town","Miami","Miami Beach","Miami Gardens","Middletown","Midland","Midwest City","Milford","Millcreek","Milpitas","Milwaukee","Minneapolis","Minnetonka","Minot","Miramar","Mishawaka","Mission","Mission Viejo","Missoula","Missouri City","Mobile","Modesto","Moline","Monroe","Montebello","Monterey Park","Montgomery","Moore","Moreno Valley","Morgan Hill","Mount Pleasant","Mount Prospect","Mount Vernon","Mountain View","Muncie","Murfreesboro","Murray","Murrieta","Nampa","Napa","Naperville","Nashua","Nashville-Davidson","National City","New Bedford","New Braunfels","New Britain","New Brunswick","New Haven","New Orleans","New Rochelle","New York","Newark","Newport Beach","Newport News","Newton","Niagara Falls","Noblesville","Norfolk","Normal","Norman","North Bethesda","North Charleston","North Highlands","North Las Vegas","North Lauderdale","North Little Rock","North Miami","North Miami Beach","North Port","North Richland Hills","Norwalk","Novato","Novi","O'Fallon","Oak Lawn","Oak Park","Oakland","Oakland Park","Ocala","Oceanside","Odessa","Ogden","Oklahoma City","Olathe","Olympia","Omaha","Ontario","Orange","Orem","Orland Park","Orlando","Oro Valley","Oshkosh","Overland Park","Owensboro","Oxnard","Palatine","Palm Bay","Palm Beach Gardens","Palm Coast","Palm Desert","Palm Harbor","Palm Springs","Palmdale","Palo Alto","Paradise","Paramount","Parker","Parma","Pasadena","Pasco","Passaic","Paterson","Pawtucket","Peabody","Pearl City","Pearland","Pembroke Pines","Pensacola","Peoria","Perris","Perth Amboy","Petaluma","Pflugerville","Pharr","Philadelphia","Phoenix","Pico Rivera","Pine Bluff","Pine Hills","Pinellas Park","Pittsburg","Pittsburgh","Pittsfield","Placentia","Plainfield","Plano","Plantation","Pleasanton","Plymouth","Pocatello","Poinciana","Pomona","Pompano Beach","Ponce","Pontiac","Port Arthur","Port Charlotte","Port Orange","Port St. Lucie","Portage","Porterville","Portland","Portsmouth","Potomac","Poway","Providence","Provo","Pueblo","Quincy","Racine","Raleigh","Rancho Cordova","Rancho Cucamonga","Rancho Palos Verdes","Rancho Santa Margarita","Rapid City","Reading","Redding","Redlands","Redmond","Redondo Beach","Redwood City","Reno","Renton","Reston","Revere","Rialto","Richardson","Richland","Richmond","Rio Rancho","Riverside","Riverton","Riverview","Roanoke","Rochester","Rochester Hills","Rock Hill","Rockford","Rocklin","Rockville","Rockwall","Rocky Mount","Rogers","Rohnert Park","Rosemead","Roseville","Roswell","Round Rock","Rowland Heights","Rowlett","Royal Oak","Sacramento","Saginaw","Salem","Salina","Salinas","Salt Lake City","Sammamish","San Angelo","San Antonio","San Bernardino","San Bruno","San Buenaventura (Ventura)","San Clemente","San Diego","San Francisco","San Jacinto","San Jose","San Juan","San Leandro","San Luis Obispo","San Marcos","San Mateo","San Rafael","San Ramon","San Tan Valley","Sandy","Sandy Springs","Sanford","Santa Ana","Santa Barbara","Santa Clara","Santa Clarita","Santa Cruz","Santa Fe","Santa Maria","Santa Monica","Santa Rosa","Santee","Sarasota","Savannah","Sayreville","Schaumburg","Schenectady","Scottsdale","Scranton","Seattle","Severn","Shawnee","Sheboygan","Shoreline","Shreveport","Sierra Vista","Silver Spring","Simi Valley","Sioux City","Sioux Falls","Skokie","Smyrna","Somerville","South Bend","South Gate","South Hill","South Jordan","South San Francisco","South Valley","South Whittier","Southaven","Southfield","Sparks","Spokane","Spokane Valley","Spring","Spring Hill","Spring Valley","Springdale","Springfield","St. Charles","St. Clair Shores","St. Cloud","St. George","St. Joseph","St. Louis","St. Louis Park","St. Paul","St. Peters","St. Petersburg","Stamford","State College","Sterling Heights","Stillwater","Stockton","Stratford","Strongsville","Suffolk","Sugar Land","Summerville","Sunnyvale","Sunrise","Sunrise Manor","Surprise","Syracuse","Tacoma","Tallahassee","Tamarac","Tamiami","Tampa","Taunton","Taylor","Taylorsville","Temecula","Tempe","Temple","Terre Haute","Texas City","The Hammocks","The Villages","The Woodlands","Thornton","Thousand Oaks","Tigard","Tinley Park","Titusville","Toledo","Toms River","Tonawanda","Topeka","Torrance","Town 'n' Country","Towson","Tracy","Trenton","Troy","Trujillo Alto","Tuckahoe","Tucson","Tulare","Tulsa","Turlock","Tuscaloosa","Tustin","Twin Falls","Tyler","Union City","University","Upland","Urbana","Urbandale","Utica","Vacaville","Valdosta","Vallejo","Vancouver","Victoria","Victorville","Vineland","Virginia Beach","Visalia","Vista","Waco","Waipahu","Waldorf","Walnut Creek","Waltham","Warner Robins","Warren","Warwick","Washington","Waterbury","Waterloo","Watsonville","Waukegan","Waukesha","Wauwatosa","Wellington","Wesley Chapel","West Allis","West Babylon","West Covina","West Des Moines","West Hartford","West Haven","West Jordan","West Lafayette","West New York","West Palm Beach","West Sacramento","West Seneca","West Valley City","Westfield","Westland","Westminster","Weston","Weymouth Town","Wheaton","White Plains","Whittier","Wichita","Wichita Falls","Wilmington","Wilson","Winston-Salem","Woodbury","Woodland","Worcester","Wylie","Wyoming","Yakima","Yonkers","Yorba Linda","York","Youngstown","Yuba City","Yucaipa","Yuma"],Nt=["{{location.city_prefix}} {{person.first_name.generic}}{{location.city_suffix}}","{{location.city_prefix}} {{person.first_name.generic}}","{{person.first_name.generic}}{{location.city_suffix}}","{{person.last_name.generic}}{{location.city_suffix}}","{{location.city_name}}"],Rt=["North","East","West","South","New","Lake","Port","Fort"],Pt=["town","ton","land","ville","berg","burgh","boro","borough","bury","view","port","mouth","stad","stead","furt","chester","cester","fort","field","haven","side","shire","worth"],Ht=["Africa","Antarctica","Asia","Australia","Europe","North America","South America"],It=["Afghanistan","Åland Islands","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antarctica","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bonaire, Sint Eustatius and Saba","Bosnia and Herzegovina","Botswana","Bouvet Island","Brazil","British Indian Ocean Territory (Chagos Archipelago)","Brunei Darussalam","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Cayman Islands","Central African Republic","Chad","Chile","China","Christmas Island","Cocos (Keeling) Islands","Colombia","Comoros","Congo","Cook Islands","Costa Rica","Côte d'Ivoire","Croatia","Cuba","Curaçao","Cyprus","Czechia","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Faroe Islands","Falkland Islands (Malvinas)","Fiji","Finland","France","French Guiana","French Polynesia","French Southern Territories","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guadeloupe","Guam","Guatemala","Guernsey","Guinea","Guinea-Bissau","Guyana","Haiti","Heard Island and McDonald Islands","Holy See (Vatican City State)","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kiribati","Democratic People's Republic of Korea","Republic of Korea","Kuwait","Kyrgyz Republic","Lao People's Democratic Republic","Latvia","Lebanon","Lesotho","Liberia","Libyan Arab Jamahiriya","Liechtenstein","Lithuania","Luxembourg","Macao","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Martinique","Mauritania","Mauritius","Mayotte","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","Niue","Norfolk Island","North Macedonia","Northern Mariana Islands","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Pitcairn Islands","Poland","Portugal","Puerto Rico","Qatar","Réunion","Romania","Russian Federation","Rwanda","Saint Barthélemy","Saint Helena","Saint Kitts and Nevis","Saint Lucia","Saint Martin","Saint Pierre and Miquelon","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Sint Maarten","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Georgia and the South Sandwich Islands","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Svalbard & Jan Mayen Islands","Sweden","Switzerland","Syrian Arab Republic","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tokelau","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Turks and Caicos Islands","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","United States Minor Outlying Islands","Uruguay","Uzbekistan","Vanuatu","Venezuela","Vietnam","Virgin Islands, British","Virgin Islands, U.S.","Wallis and Futuna","Western Sahara","Yemen","Zambia","Zimbabwe"],Gt=["Adams County","Calhoun County","Carroll County","Clark County","Clay County","Crawford County","Douglas County","Fayette County","Franklin County","Grant County","Greene County","Hamilton County","Hancock County","Henry County","Jackson County","Jefferson County","Johnson County","Lake County","Lawrence County","Lee County","Lincoln County","Logan County","Madison County","Marion County","Marshall County","Monroe County","Montgomery County","Morgan County","Perry County","Pike County","Polk County","Scott County","Union County","Warren County","Washington County","Wayne County","Avon","Bedfordshire","Berkshire","Borders","Buckinghamshire","Cambridgeshire","Central","Cheshire","Cleveland","Clwyd","Cornwall","County Antrim","County Armagh","County Down","County Fermanagh","County Londonderry","County Tyrone","Cumbria","Derbyshire","Devon","Dorset","Dumfries and Galloway","Durham","Dyfed","East Sussex","Essex","Fife","Gloucestershire","Grampian","Greater Manchester","Gwent","Gwynedd County","Hampshire","Herefordshire","Hertfordshire","Highlands and Islands","Humberside","Isle of Wight","Kent","Lancashire","Leicestershire","Lincolnshire","Lothian","Merseyside","Mid Glamorgan","Norfolk","North Yorkshire","Northamptonshire","Northumberland","Nottinghamshire","Oxfordshire","Powys","Rutland","Shropshire","Somerset","South Glamorgan","South Yorkshire","Staffordshire","Strathclyde","Suffolk","Surrey","Tayside","Tyne and Wear","Warwickshire","West Glamorgan","West Midlands","West Sussex","West Yorkshire","Wiltshire","Worcestershire"],_t={cardinal:["North","East","South","West"],cardinal_abbr:["N","E","S","W"],ordinal:["Northeast","Northwest","Southeast","Southwest"],ordinal_abbr:["NE","NW","SE","SW"]},Wt=[{name:"Afrikaans",alpha2:"af",alpha3:"afr"},{name:"Azerbaijani",alpha2:"az",alpha3:"aze"},{name:"Maldivian",alpha2:"dv",alpha3:"div"},{name:"Farsi/Persian",alpha2:"fa",alpha3:"fas"},{name:"Latvian",alpha2:"lv",alpha3:"lav"},{name:"Indonesian",alpha2:"id",alpha3:"ind"},{name:"Nepali",alpha2:"ne",alpha3:"nep"},{name:"Thai",alpha2:"th",alpha3:"tha"},{name:"Uzbek",alpha2:"uz",alpha3:"uzb"},{name:"Yoruba",alpha2:"yo",alpha3:"yor"},{name:"Pashto",alpha2:"ps",alpha3:"pus"},{name:"English",alpha2:"en",alpha3:"eng"},{name:"Urdu",alpha2:"ur",alpha3:"urd"},{name:"German",alpha2:"de",alpha3:"deu"},{name:"French",alpha2:"fr",alpha3:"fra"},{name:"Spanish",alpha2:"es",alpha3:"spa"},{name:"Italian",alpha2:"it",alpha3:"ita"},{name:"Dutch",alpha2:"nl",alpha3:"nld"},{name:"Russian",alpha2:"ru",alpha3:"rus"},{name:"Portuguese",alpha2:"pt",alpha3:"por"},{name:"Polish",alpha2:"pl",alpha3:"pol"},{name:"Arabic",alpha2:"ar",alpha3:"ara"},{name:"Japanese",alpha2:"ja",alpha3:"jpn"},{name:"Chinese",alpha2:"zh",alpha3:"zho"},{name:"Hindi",alpha2:"hi",alpha3:"hin"},{name:"Bengali",alpha2:"bn",alpha3:"ben"},{name:"Gujarati",alpha2:"gu",alpha3:"guj"},{name:"Tamil",alpha2:"ta",alpha3:"tam"},{name:"Telugu",alpha2:"te",alpha3:"tel"},{name:"Punjabi",alpha2:"pa",alpha3:"pan"},{name:"Vietnamese",alpha2:"vi",alpha3:"vie"},{name:"Korean",alpha2:"ko",alpha3:"kor"},{name:"Turkish",alpha2:"tr",alpha3:"tur"},{name:"Swedish",alpha2:"sv",alpha3:"swe"},{name:"Greek",alpha2:"el",alpha3:"ell"},{name:"Czech",alpha2:"cs",alpha3:"ces"},{name:"Hungarian",alpha2:"hu",alpha3:"hun"},{name:"Romanian",alpha2:"ro",alpha3:"ron"},{name:"Ukrainian",alpha2:"uk",alpha3:"ukr"},{name:"Norwegian",alpha2:"no",alpha3:"nor"},{name:"Serbian",alpha2:"sr",alpha3:"srp"},{name:"Croatian",alpha2:"hr",alpha3:"hrv"},{name:"Slovak",alpha2:"sk",alpha3:"slk"},{name:"Slovenian",alpha2:"sl",alpha3:"slv"},{name:"Icelandic",alpha2:"is",alpha3:"isl"},{name:"Finnish",alpha2:"fi",alpha3:"fin"},{name:"Danish",alpha2:"da",alpha3:"dan"},{name:"Swahili",alpha2:"sw",alpha3:"swa"},{name:"Bashkir",alpha2:"ba",alpha3:"bak"},{name:"Basque",alpha2:"eu",alpha3:"eus"},{name:"Catalan",alpha2:"ca",alpha3:"cat"},{name:"Galician",alpha2:"gl",alpha3:"glg"},{name:"Esperanto",alpha2:"eo",alpha3:"epo"},{name:"Fijian",alpha2:"fj",alpha3:"fij"},{name:"Malagasy",alpha2:"mg",alpha3:"mlg"},{name:"Maltese",alpha2:"mt",alpha3:"mlt"},{name:"Albanian",alpha2:"sq",alpha3:"sqi"},{name:"Armenian",alpha2:"hy",alpha3:"hye"},{name:"Georgian",alpha2:"ka",alpha3:"kat"},{name:"Macedonian",alpha2:"mk",alpha3:"mkd"},{name:"Kazakh",alpha2:"kk",alpha3:"kaz"},{name:"Haitian Creole",alpha2:"ht",alpha3:"hat"},{name:"Mongolian",alpha2:"mn",alpha3:"mon"},{name:"Kyrgyz",alpha2:"ky",alpha3:"kir"},{name:"Finnish",alpha2:"fi",alpha3:"fin"},{name:"Tagalog",alpha2:"tl",alpha3:"tgl"},{name:"Malay",alpha2:"ms",alpha3:"msa"},{name:"Tajik",alpha2:"tg",alpha3:"tgk"},{name:"Swati",alpha2:"ss",alpha3:"ssw"},{name:"Tatar",alpha2:"tt",alpha3:"tat"},{name:"Zulu",alpha2:"zu",alpha3:"zul"}],Kt=["#####","#####-####"],$t=["Apt. ###","Suite ###"],Ot=["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"],zt=["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],Jt={normal:"{{location.buildingNumber}} {{location.street}}",full:"{{location.buildingNumber}} {{location.street}} {{location.secondaryAddress}}"},Vt=["10th Street","11th Street","12th Street","13th Street","14th Street","15th Street","16th Street","1st Avenue","1st Street","2nd Avenue","2nd Street","3rd Avenue","3rd Street","4th Avenue","4th Street","5th Avenue","5th Street","6th Avenue","6th Street","7th Avenue","7th Street","8th Avenue","8th Street","9th Street","A Street","Abbey Road","Adams Avenue","Adams Street","Airport Road","Albany Road","Albert Road","Albion Street","Alexandra Road","Alfred Street","Alma Street","Ash Close","Ash Grove","Ash Road","Ash Street","Aspen Close","Atlantic Avenue","Avenue Road","Back Lane","Baker Street","Balmoral Road","Barn Close","Barton Road","Bath Road","Bath Street","Bay Street","Beach Road","Bedford Road","Beech Close","Beech Drive","Beech Grove","Beech Road","Beechwood Avenue","Bell Lane","Belmont Road","Birch Avenue","Birch Close","Birch Grove","Birch Road","Blind Lane","Bluebell Close","Boundary Road","Bramble Close","Bramley Close","Bridge Road","Bridge Street","Broad Lane","Broad Street","Broadway","Broadway Avenue","Broadway Street","Brook Lane","Brook Road","Brook Street","Brookside","Buckingham Road","Cambridge Street","Canal Street","Castle Close","Castle Lane","Castle Road","Castle Street","Cavendish Road","Cedar Avenue","Cedar Close","Cedar Grove","Cedar Road","Cedar Street","Cemetery Road","Center Avenue","Center Road","Center Street","Central Avenue","Central Street","Chapel Close","Chapel Hill","Chapel Road","Chapel Street","Charles Street","Cherry Close","Cherry Street","Cherry Tree Close","Chester Road","Chestnut Close","Chestnut Drive","Chestnut Grove","Chestnut Street","Church Avenue","Church Close","Church Hill","Church Lane","Church Path","Church Road","Church Street","Church View","Church Walk","Claremont Road","Clarence Road","Clarence Street","Clarendon Road","Clark Street","Clay Lane","Cleveland Street","Cliff Road","Clifton Road","Clinton Street","College Avenue","College Street","Columbia Avenue","Commerce Street","Commercial Road","Commercial Street","Common Lane","Coronation Avenue","Coronation Road","County Line Road","County Road","Court Street","Cow Lane","Crescent Road","Cromwell Road","Cross Lane","Cross Street","Crown Street","Cumberland Street","Dale Street","Dark Lane","Davis Street","Depot Street","Derby Road","Derwent Close","Devonshire Road","Division Street","Douglas Road","Duke Street","E 10th Street","E 11th Street","E 12th Street","E 14th Street","E 1st Street","E 2nd Street","E 3rd Street","E 4th Avenue","E 4th Street","E 5th Street","E 6th Avenue","E 6th Street","E 7th Street","E 8th Street","E 9th Street","E Bridge Street","E Broad Street","E Broadway","E Broadway Street","E Cedar Street","E Center Street","E Central Avenue","E Church Street","E Elm Street","E Franklin Street","E Front Street","E Grand Avenue","E High Street","E Jackson Street","E Jefferson Street","E Main","E Main Street","E Maple Street","E Market Street","E North Street","E Oak Street","E Park Avenue","E Pine Street","E River Road","E South Street","E State Street","E Union Street","E Walnut Street","E Washington Avenue","E Washington Street","E Water Street","East Avenue","East Road","East Street","Edward Street","Elm Close","Elm Grove","Elm Road","Elm Street","Euclid Avenue","Fairfield Road","Farm Close","Ferry Road","Field Close","Field Lane","First Avenue","First Street","Fore Street","Forest Avenue","Forest Road","Fourth Avenue","Franklin Avenue","Franklin Road","Franklin Street","Front Street","Frontage Road","Garden Close","Garden Street","George Street","Gladstone Road","Glebe Close","Gloucester Road","Gordon Road","Gordon Street","Grand Avenue","Grange Avenue","Grange Close","Grange Road","Grant Street","Green Close","Green Lane","Green Street","Greenville Road","Greenway","Greenwood Road","Grove Lane","Grove Road","Grove Street","Hall Lane","Hall Street","Harrison Avenue","Harrison Street","Hawthorn Avenue","Hawthorn Close","Hazel Close","Hazel Grove","Heath Road","Heather Close","Henry Street","Heron Close","Hickory Street","High Road","High Street","Highfield Avenue","Highfield Close","Highfield Road","Highland Avenue","Hill Road","Hill Street","Hillside","Hillside Avenue","Hillside Close","Hillside Road","Holly Close","Honeysuckle Close","Howard Road","Howard Street","Jackson Avenue","Jackson Street","James Street","Jefferson Avenue","Jefferson Street","Johnson Street","Jubilee Close","Juniper Close","Kent Road","Kestrel Close","King Street","King's Road","Kingfisher Close","Kings Highway","Kingsway","Laburnum Grove","Lafayette Street","Lake Avenue","Lake Drive","Lake Road","Lake Street","Lancaster Road","Lansdowne Road","Larch Close","Laurel Close","Lawrence Street","Lee Street","Liberty Street","Lime Grove","Lincoln Avenue","Lincoln Highway","Lincoln Road","Lincoln Street","Locust Street","Lodge Close","Lodge Lane","London Road","Long Lane","Low Road","Madison Avenue","Madison Street","Main","Main Avenue","Main Road","Main Street","Main Street E","Main Street N","Main Street S","Main Street W","Manchester Road","Manor Close","Manor Drive","Manor Gardens","Manor Road","Manor Way","Maple Avenue","Maple Close","Maple Drive","Maple Road","Maple Street","Market Place","Market Square","Market Street","Marlborough Road","Marsh Lane","Martin Luther King Boulevard","Martin Luther King Drive","Martin Luther King Jr Boulevard","Mary Street","Mayfield Road","Meadow Close","Meadow Drive","Meadow Lane","Meadow View","Meadow Way","Memorial Drive","Middle Street","Mill Close","Mill Lane","Mill Road","Mill Street","Milton Road","Milton Street","Monroe Street","Moor Lane","Moss Lane","Mount Pleasant","Mount Street","Mulberry Street","N 1st Street","N 2nd Street","N 3rd Street","N 4th Street","N 5th Street","N 6th Street","N 7th Street","N 8th Street","N 9th Street","N Bridge Street","N Broad Street","N Broadway","N Broadway Street","N Cedar Street","N Center Street","N Central Avenue","N Chestnut Street","N Church Street","N College Street","N Court Street","N Division Street","N East Street","N Elm Street","N Franklin Street","N Front Street","N Harrison Street","N High Street","N Jackson Street","N Jefferson Street","N Lincoln Street","N Locust Street","N Main","N Main Avenue","N Main Street","N Maple Street","N Market Street","N Monroe Street","N Oak Street","N Park Street","N Pearl Street","N Pine Street","N Poplar Street","N Railroad Street","N State Street","N Union Street","N Walnut Street","N Washington Avenue","N Washington Street","N Water Street","Nelson Road","Nelson Street","New Lane","New Road","New Street","Newton Road","Nightingale Close","Norfolk Road","North Avenue","North Lane","North Road","North Street","Northfield Road","Oak Avenue","Oak Drive","Oak Lane","Oak Road","Oak Street","Oakfield Road","Oaklands","Old Lane","Old Military Road","Old Road","Old State Road","Orchard Drive","Orchard Lane","Orchard Road","Orchard Street","Oxford Road","Oxford Street","Park Avenue","Park Crescent","Park Drive","Park Lane","Park Place","Park Road","Park Street","Park View","Parkside","Pearl Street","Pennsylvania Avenue","Pine Close","Pine Grove","Pine Street","Pinfold Lane","Pleasant Street","Poplar Avenue","Poplar Close","Poplar Road","Poplar Street","Post Road","Pound Lane","Princes Street","Princess Street","Priory Close","Priory Road","Prospect Avenue","Prospect Place","Prospect Road","Prospect Street","Quarry Lane","Quarry Road","Queen's Road","Railroad Avenue","Railroad Street","Railway Street","Rectory Close","Rectory Lane","Richmond Close","Richmond Road","Ridge Road","River Road","River Street","Riverside","Riverside Avenue","Riverside Drive","Roman Road","Roman Way","Rowan Close","Russell Street","S 10th Street","S 14th Street","S 1st Avenue","S 1st Street","S 2nd Street","S 3rd Street","S 4th Street","S 5th Street","S 6th Street","S 7th Street","S 8th Street","S 9th Street","S Bridge Street","S Broad Street","S Broadway","S Broadway Street","S Center Street","S Central Avenue","S Chestnut Street","S Church Street","S College Street","S Division Street","S East Street","S Elm Street","S Franklin Street","S Front Street","S Grand Avenue","S High Street","S Jackson Street","S Jefferson Street","S Lincoln Street","S Main","S Main Avenue","S Main Street","S Maple Street","S Market Street","S Mill Street","S Monroe Street","S Oak Street","S Park Street","S Pine Street","S Railroad Street","S State Street","S Union Street","S Walnut Street","S Washington Avenue","S Washington Street","S Water Street","S West Street","Salisbury Road","Sandringham Road","Sandy Lane","School Close","School Lane","School Road","School Street","Second Avenue","Silver Street","Skyline Drive","Smith Street","Somerset Road","South Avenue","South Drive","South Road","South Street","South View","Spring Gardens","Spring Street","Springfield Close","Springfield Road","Spruce Street","St Andrew's Road","St Andrews Close","St George's Road","St John's Road","St Mary's Close","St Mary's Road","Stanley Road","Stanley Street","State Avenue","State Line Road","State Road","State Street","Station Road","Station Street","Stoney Lane","Sycamore Avenue","Sycamore Close","Sycamore Drive","Sycamore Street","Talbot Road","Tennyson Road","The Avenue","The Beeches","The Causeway","The Chase","The Coppice","The Copse","The Crescent","The Croft","The Dell","The Drive","The Fairway","The Glebe","The Grange","The Green","The Grove","The Hawthorns","The Lane","The Laurels","The Limes","The Maltings","The Meadows","The Mews","The Mount","The Oaks","The Orchard","The Oval","The Paddock","The Paddocks","The Poplars","The Ridgeway","The Ridings","The Rise","The Sidings","The Spinney","The Square","The Willows","The Woodlands","Third Avenue","Third Street","Tower Road","Trinity Road","Tudor Close","Union Avenue","Union Street","University Avenue","University Drive","Valley Road","Veterans Memorial Drive","Veterans Memorial Highway","Vicarage Close","Vicarage Lane","Vicarage Road","Victoria Place","Victoria Road","Victoria Street","Vine Street","W 10th Street","W 11th Street","W 12th Street","W 14th Street","W 1st Street","W 2nd Street","W 3rd Street","W 4th Avenue","W 4th Street","W 5th Street","W 6th Avenue","W 6th Street","W 7th Street","W 8th Street","W 9th Street","W Bridge Street","W Broad Street","W Broadway","W Broadway Avenue","W Broadway Street","W Center Street","W Central Avenue","W Chestnut Street","W Church Street","W Division Street","W Elm Street","W Franklin Street","W Front Street","W Grand Avenue","W High Street","W Jackson Street","W Jefferson Street","W Lake Street","W Main","W Main Street","W Maple Street","W Market Street","W Monroe Street","W North Street","W Oak Street","W Park Street","W Pine Street","W River Road","W South Street","W State Street","W Union Street","W Walnut Street","W Washington Avenue","W Washington Street","Walnut Close","Walnut Street","Warren Close","Warren Road","Washington Avenue","Washington Boulevard","Washington Road","Washington Street","Water Lane","Water Street","Waterloo Road","Waterside","Watery Lane","Waverley Road","Well Lane","Wellington Road","Wellington Street","West Avenue","West End","West Lane","West Road","West Street","West View","Western Avenue","Western Road","Westfield Road","Westgate","William Street","Willow Close","Willow Drive","Willow Grove","Willow Road","Willow Street","Windermere Road","Windmill Close","Windmill Lane","Windsor Avenue","Windsor Close","Windsor Drive","Wood Lane","Wood Street","Woodland Close","Woodland Road","Woodlands","Woodlands Avenue","Woodlands Close","Woodlands Road","Woodside","Woodside Road","Wren Close","Yew Tree Close","York Road","York Street"],jt=["{{person.first_name.generic}} {{location.street_suffix}}","{{person.last_name.generic}} {{location.street_suffix}}","{{location.street_name}}"],Yt=["Alley","Avenue","Branch","Bridge","Brook","Brooks","Burg","Burgs","Bypass","Camp","Canyon","Cape","Causeway","Center","Centers","Circle","Circles","Cliff","Cliffs","Club","Common","Corner","Corners","Course","Court","Courts","Cove","Coves","Creek","Crescent","Crest","Crossing","Crossroad","Curve","Dale","Dam","Divide","Drive","Drives","Estate","Estates","Expressway","Extension","Extensions","Fall","Falls","Ferry","Field","Fields","Flat","Flats","Ford","Fords","Forest","Forge","Forges","Fork","Forks","Fort","Freeway","Garden","Gardens","Gateway","Glen","Glens","Green","Greens","Grove","Groves","Harbor","Harbors","Haven","Heights","Highway","Hill","Hills","Hollow","Inlet","Island","Islands","Isle","Junction","Junctions","Key","Keys","Knoll","Knolls","Lake","Lakes","Land","Landing","Lane","Light","Lights","Loaf","Lock","Locks","Lodge","Loop","Mall","Manor","Manors","Meadow","Meadows","Mews","Mill","Mills","Mission","Motorway","Mount","Mountain","Mountains","Neck","Orchard","Oval","Overpass","Park","Parks","Parkway","Parkways","Pass","Passage","Path","Pike","Pine","Pines","Place","Plain","Plains","Plaza","Point","Points","Port","Ports","Prairie","Radial","Ramp","Ranch","Rapid","Rapids","Rest","Ridge","Ridges","River","Road","Roads","Route","Row","Rue","Run","Shoal","Shoals","Shore","Shores","Skyway","Spring","Springs","Spur","Spurs","Square","Squares","Station","Stravenue","Stream","Street","Streets","Summit","Terrace","Throughway","Trace","Track","Trafficway","Trail","Tunnel","Turnpike","Underpass","Union","Unions","Valley","Valleys","Via","Viaduct","View","Views","Village","Villages","Ville","Vista","Walk","Walks","Wall","Way","Ways","Well","Wells"],qt={building_number:Lt,city_name:xt,city_pattern:Nt,city_prefix:Rt,city_suffix:Pt,continent:Ht,country:It,county:Gt,direction:_t,language:Wt,postcode:Kt,secondary_address:$t,state:Ot,state_abbr:zt,street_address:Jt,street_name:Vt,street_pattern:jt,street_suffix:Yt},Ut=qt,Zt=["a","ab","abbas","abduco","abeo","abscido","absconditus","absens","absorbeo","absque","abstergo","absum","abundans","abutor","accedo","accendo","acceptus","accommodo","accusamus","accusantium","accusator","acer","acerbitas","acervus","acidus","acies","acquiro","acsi","ad","adamo","adaugeo","addo","adduco","ademptio","adeo","adeptio","adfectus","adfero","adficio","adflicto","adhaero","adhuc","adicio","adimpleo","adinventitias","adipisci","adipiscor","adiuvo","administratio","admiratio","admitto","admoneo","admoveo","adnuo","adopto","adsidue","adstringo","adsuesco","adsum","adulatio","adulescens","aduro","advenio","adversus","advoco","aedificium","aeger","aegre","aegrotatio","aegrus","aeneus","aequitas","aequus","aer","aestas","aestivus","aestus","aetas","aeternus","ager","aggero","aggredior","agnitio","agnosco","ago","ait","aiunt","alias","alienus","alii","alioqui","aliqua","aliquam","aliquid","alius","allatus","alo","alter","altus","alveus","amaritudo","ambitus","ambulo","amet","amicitia","amiculum","amissio","amita","amitto","amo","amor","amoveo","amplexus","amplitudo","amplus","ancilla","angelus","angulus","angustus","animadverto","animi","animus","annus","anser","ante","antea","antepono","antiquus","aperiam","aperio","aperte","apostolus","apparatus","appello","appono","appositus","approbo","apto","aptus","apud","aqua","ara","aranea","arbitro","arbor","arbustum","arca","arceo","arcesso","architecto","arcus","argentum","argumentum","arguo","arma","armarium","aro","ars","articulus","artificiose","arto","arx","ascisco","ascit","asper","asperiores","aspernatur","aspicio","asporto","assentator","assumenda","astrum","at","atavus","ater","atque","atqui","atrocitas","atrox","attero","attollo","attonbitus","auctor","auctus","audacia","audax","audentia","audeo","audio","auditor","aufero","aureus","aurum","aut","autem","autus","auxilium","avaritia","avarus","aveho","averto","baiulus","balbus","barba","bardus","basium","beatae","beatus","bellicus","bellum","bene","beneficium","benevolentia","benigne","bestia","bibo","bis","blandior","blanditiis","bonus","bos","brevis","cado","caecus","caelestis","caelum","calamitas","calcar","calco","calculus","callide","campana","candidus","canis","canonicus","canto","capillus","capio","capitulus","capto","caput","carbo","carcer","careo","caries","cariosus","caritas","carmen","carpo","carus","casso","caste","casus","catena","caterva","cattus","cauda","causa","caute","caveo","cavus","cedo","celebrer","celer","celo","cena","cenaculum","ceno","censura","centum","cerno","cernuus","certe","certus","cervus","cetera","charisma","chirographum","cibo","cibus","cicuta","cilicium","cimentarius","ciminatio","cinis","circumvenio","cito","civis","civitas","clam","clamo","claro","clarus","claudeo","claustrum","clementia","clibanus","coadunatio","coaegresco","coepi","coerceo","cogito","cognatus","cognomen","cogo","cohaero","cohibeo","cohors","colligo","collum","colo","color","coma","combibo","comburo","comedo","comes","cometes","comis","comitatus","commemoro","comminor","commodi","commodo","communis","comparo","compello","complectus","compono","comprehendo","comptus","conatus","concedo","concido","conculco","condico","conduco","confero","confido","conforto","confugo","congregatio","conicio","coniecto","conitor","coniuratio","conor","conqueror","conscendo","consectetur","consequatur","consequuntur","conservo","considero","conspergo","constans","consuasor","contabesco","contego","contigo","contra","conturbo","conventus","convoco","copia","copiose","cornu","corona","corporis","corpus","correptius","corrigo","corroboro","corrumpo","corrupti","coruscus","cotidie","crapula","cras","crastinus","creator","creber","crebro","credo","creo","creptio","crepusculum","cresco","creta","cribro","crinis","cruciamentum","crudelis","cruentus","crur","crustulum","crux","cubicularis","cubitum","cubo","cui","cuius","culpa","culpo","cultellus","cultura","cum","cumque","cunabula","cunae","cunctatio","cupiditas","cupiditate","cupio","cuppedia","cupressus","cur","cura","curatio","curia","curiositas","curis","curo","curriculum","currus","cursim","curso","cursus","curto","curtus","curvo","custodia","damnatio","damno","dapifer","debeo","debilito","debitis","decens","decerno","decet","decimus","decipio","decor","decretum","decumbo","dedecor","dedico","deduco","defaeco","defendo","defero","defessus","defetiscor","deficio","defleo","defluo","defungo","degenero","degero","degusto","deinde","delectatio","delectus","delego","deleniti","deleo","delibero","delicate","delinquo","deludo","demens","demergo","demitto","demo","demonstro","demoror","demulceo","demum","denego","denique","dens","denuncio","denuo","deorsum","depereo","depono","depopulo","deporto","depraedor","deprecator","deprimo","depromo","depulso","deputo","derelinquo","derideo","deripio","deserunt","desidero","desino","desipio","desolo","desparatus","despecto","dicta","dignissimos","distinctio","dolor","dolore","dolorem","doloremque","dolores","doloribus","dolorum","ducimus","ea","eaque","earum","eius","eligendi","enim","eos","error","esse","est","et","eum","eveniet","ex","excepturi","exercitationem","expedita","explicabo","facere","facilis","fuga","fugiat","fugit","harum","hic","id","illo","illum","impedit","in","incidunt","infit","inflammatio","inventore","ipsa","ipsam","ipsum","iste","itaque","iure","iusto","labore","laboriosam","laborum","laudantium","libero","magnam","magni","maiores","maxime","minima","minus","modi","molestiae","molestias","mollitia","nam","natus","necessitatibus","nemo","neque","nesciunt","nihil","nisi","nobis","non","nostrum","nulla","numquam","occaecati","ocer","odio","odit","officia","officiis","omnis","optio","paens","pariatur","patior","patria","patrocinor","patruus","pauci","paulatim","pauper","pax","peccatus","pecco","pecto","pectus","pecus","peior","pel","perferendis","perspiciatis","placeat","porro","possimus","praesentium","provident","quae","quaerat","quam","quas","quasi","qui","quia","quibusdam","quidem","quis","quisquam","quo","quod","quos","ratione","recusandae","reiciendis","rem","repellat","repellendus","reprehenderit","repudiandae","rerum","saepe","sapiente","sed","sequi","similique","sint","sit","socius","sodalitas","sol","soleo","solio","solitudo","solium","sollers","sollicito","solum","solus","soluta","solutio","solvo","somniculosus","somnus","sonitus","sono","sophismata","sopor","sordeo","sortitus","spargo","speciosus","spectaculum","speculum","sperno","spero","spes","spiculum","spiritus","spoliatio","sponte","stabilis","statim","statua","stella","stillicidium","stipes","stips","sto","strenuus","strues","studio","stultus","suadeo","suasoria","sub","subito","subiungo","sublime","subnecto","subseco","substantia","subvenio","succedo","succurro","sufficio","suffoco","suffragium","suggero","sui","sulum","sum","summa","summisse","summopere","sumo","sumptus","sunt","supellex","super","suppellex","supplanto","suppono","supra","surculus","surgo","sursum","suscipio","suscipit","suspendo","sustineo","suus","synagoga","tabella","tabernus","tabesco","tabgo","tabula","taceo","tactus","taedium","talio","talis","talus","tam","tamdiu","tamen","tametsi","tamisium","tamquam","tandem","tantillus","tantum","tardus","tego","temeritas","temperantia","templum","tempora","tempore","temporibus","temptatio","tempus","tenax","tendo","teneo","tener","tenetur","tenuis","tenus","tepesco","tepidus","ter","terebro","teres","terga","tergeo","tergiversatio","tergo","tergum","termes","terminatio","tero","terra","terreo","territo","terror","tersus","tertius","testimonium","texo","textilis","textor","textus","thalassinus","theatrum","theca","thema","theologus","thermae","thesaurus","thesis","thorax","thymbra","thymum","tibi","timidus","timor","titulus","tolero","tollo","tondeo","tonsor","torqueo","torrens","tot","totam","totidem","toties","totus","tracto","trado","traho","trans","tredecim","tremo","trepide","tres","tribuo","tricesimus","triduana","tripudio","tristis","triumphus","trucido","truculenter","tubineus","tui","tum","tumultus","tunc","turba","turbo","turpis","tutamen","tutis","tyrannus","uberrime","ubi","ulciscor","ullam","ullus","ulterius","ultio","ultra","umbra","umerus","umquam","una","unde","undique","universe","unus","urbanus","urbs","uredo","usitas","usque","ustilo","ustulo","usus","ut","uter","uterque","utilis","utique","utor","utpote","utrimque","utroque","utrum","uxor","vaco","vacuus","vado","vae","valde","valens","valeo","valetudo","validus","vallum","vapulus","varietas","varius","vehemens","vel","velit","velociter","velum","velut","venia","veniam","venio","ventito","ventosus","ventus","venustas","ver","verbera","verbum","vere","verecundia","vereor","vergo","veritas","veritatis","vero","versus","verto","verumtamen","verus","vesco","vesica","vesper","vespillo","vester","vestigium","vestrum","vetus","via","vicinus","vicissitudo","victoria","victus","videlicet","video","viduo","vigilo","vigor","vilicus","vilis","vilitas","villa","vinco","vinculum","vindico","vinitor","vinum","vir","virga","virgo","viridis","viriliter","virtus","vis","viscus","vita","vitae","vitiosus","vitium","vito","vivo","vix","vobis","vociferor","voco","volaticus","volo","volubilis","voluntarius","volup","voluptas","voluptate","voluptatem","voluptates","voluptatibus","voluptatum","volutabrum","volva","vomer","vomica","vomito","vorago","vorax","voro","vos","votum","voveo","vox","vulariter","vulgaris","vulgivagus","vulgo","vulgus","vulnero","vulnus","vulpes","vulticulus","xiphias"],Xt={word:Zt},Qt=Xt,er={title:"English",code:"en",language:"en",endonym:"English",dir:"ltr",script:"Latn"},ar=er,nr=['"Awaken, My Love!"',"(What's The Story) Morning Glory?","- Tragedy +","13 Reasons Why (Season 3)","21st Century Breakdown","30 De Febrero","432 Hz Deep Healing","5-Star","528 Hz Meditation Music","54+1","8 Mile","808s & Heartbreak","9 To 5 And Odd Jobs","A Beautiful Lie","A Day At The Races","A Day Without Rain","A Fever You Can't Sweat Out","A Gangsta's Pain","A Gift & A Curse","A Hard Day's Night","A Head Full Of Dreams","A Kind Of Magic","A Million Ways To Murder","A Moment Apart","A Song For Every Moon","A Thousand Suns","A Winter Romance","ABBA","AI YoungBoy","AJ Tracey","Act One","After Hours","Agent Provocateur","All About You","All I Know So Far: Setlist","All Or Nothing","All Out","All Over The Place","All Stand Together","All The Lost Souls","All The Things I Never Said","All Things Must Pass","Alleen","Alright, Still","Alta Suciedad","America","American Heartbreak","American Teen","And Justice For None","Animal Songs","Another Friday Night","Anything Goes","Ao Vivo Em São Paulo","Ao Vivo No Ibirapuera","Apricot Princess","Aqui E Agora (Ao Vivo)","Arcane League Of Legends","Ardipithecus","Aretha Now","Around The Fur","Arrival","Artist 2.0","As She Pleases","Ascend","Ashlyn","Astro Lounge","At Night, Alone.","At. Long. Last. ASAP","Atlas","Audioslave","Aura","Austin","Awake","Away From The Sun","Ayayay!","Baby On Baby","Back For Everything","Back From The Edge","Back In Black","Back To Black","Back To The Game","Bad","Bahía Ducati","Baila","Barbie The Album","Battleground","Bayou Country","Bcos U Will Never B Free","Be","Be Here Now","Beautiful Mind","Beautiful Thugger Girls","Beautiful Trauma","Beauty And The Beast","Beggars Banquet","Being Funny In A Foreign Language","Berlin Lebt","Berry Is On Top","Best White Noise For Baby Sleep - Loopable With No Fade","Big Baby DRAM","Bigger, Better, Faster, More!","Billy Talent II","Black Star Elephant","Blackout","Blank Face LP","Bleach","Blizzard Of Ozz","Blonde","Blood Sugar Sex Magik","Bloom","Blowin' Your Mind!","Blu Celeste","Blue","Blue Banisters","Blue Hawaii","Blue Neighbourhood","Bluebird Days","Bobby Tarantino","Bobby Tarantino II","Bon Iver","Born Pink","Born To Run","Brand New Eyes","Break The Cycle","Breakfast In America","Breakthrough","Brett Young","Bridge Over Troubled Water","Bright: The Album","Brol","Buds","Buena Vista Social Club","Built On Glass","Bury Me At Makeout Creek","Busyhead","By The Way","CB6","CNCO","California Sunrise","Californication","Call Me Irresponsible","Calm","Camino Palmero","Camp","Caracal","Carbon Fiber Hits","Carnival","Carry On","Cartel De Santa","Certified Lover Boy","Chaaama","Chama Meu Nome","Chapter 1: Snake Oil","Chapter 2: Swamp Savant","Chapter One","Charlie's Angels","Cherry Bomb","Chief","Chocolate Factory","Chosen","Chris Brown","Christina Aguilera","Chromatica","Church","City Of Evil","Clandestino","Clouds","Coco","Collision Course","Colour Vision","Combat Rock","Come Around Sundown","Come Away With Me","Come Home The Kids Miss You","Come What(ever) May","Commando","Common Sense","Communion","Conditions","Confident","Confrontation","Control The Streets, Volume 2","Corinne Bailey Rae","Costello Music","Cottonwood","Covers, Vol. 2","Cozy Tapes Vol. 2: Too Cozy","Crash Talk","Crazy Love","Crazysexycool","Crowded House","Cruisin' With Junior H","Culture","Current Mood","DS2","Dale","Danger Days: The True Lives Of The Fabulous Killjoys","Dangerous Woman","Dangerous: The Double Album","Dark Horse","Day69","Daydream","De Fiesta","De Viaje","DeAnn","Death Race For Love","Delirium","Delta","Demidevil","Depression Cherry","Descendants","Desgenerados Mixtape","Destin","Destiny Fulfilled","Desvelado","Detroit 2","Dex Meets Dexter","Dharma","Die A Legend","Different World","Dig Your Roots","Digital Druglord","Dirt","Disclaimer I / II","Discovery","Disraeli Gears","Disumano","Dizzy Up The Girl","Don't Play That Song","Donda","Donde Quiero Estar","Doo-Wops & Hooligans","Down The Way","Dr. Feelgood","Dream Your Life Away","Dreaming Out Loud","Drip Harder","Drive","Drones","Dropped Outta College","Drowning","Dua Warna Cinta","Dulce Beat","Dusty In Memphis","Dutty Rock","Dying To Live","ENR","East Atlanta Love Letter","Editorial","Edna","El Abayarde","El Amor En Los Tiempos Del Perreo","El Camino","El Comienzo","El Dorado","El Karma","El Mal Querer","El Malo","El Trabajo Es La Suerte","El Viaje De Copperpot","Electric Ladyland","Emotion","En Tus Planes","Endless Summer Vacation","Enter The Wu-Tang (36 Chambers)","Equals (=)","Estrella","Euphoria","Europop","Evermore","Every Kingdom","Everyday Life","Evolve","Expectations","Face Yourself","Facelift","Fallin'","Fancy You","Fantasía","Favourite Worst Nightmare","Fear Of The Dark","Fearless","Feel Something","Feels Like Home","Femme Fatale","Ferxxocalipsis","Fifty Shades Darker","Fifty Shades Freed","Fifty Shades Of Grey","Final (Vol.1)","Finding Beauty In Negative Spaces","Fine Line","First Impressions Of Earth","First Steps","Five Seconds Flat","Folklore","For Emma, Forever Ago","Forajido EP 1","Forever","Forever Young","Formula Of Love: O+T=<3","Free 6lack","Freudian","Frozen II","Full Moon Fever","Funhouse","Funk Wav Bounces Vol.1","Future History","FutureSex/LoveSounds","Fuzzybrain","Gallery","Gangsta's Paradise","Gemini","Gemini Rights","Generationwhy","Get A Grip","Get Up","Gettin' Old","Girl","Gladiator","Glisten","Globalization","Gloria","Glory Days","God's Project","Gold Skies","Golden","Good Evening","Good Thing","Goodbye Yellow Brick Road","Gossip Columns","Got Your Six","Graceland","Graduation","Grand Champ","Grandson, Vol. 1","Green River","Guerra","Ha*Ash Primera Fila - Hecho Realidad","Haiz","Hamilton","Happy Endings","Harry Styles","Hasta La Raíz","Hatful Of Hollow","Head In The Clouds","Heard It In A Past Life","Heart Shaped World","Heartbeat City","Heartbreak On A Full Moon / Cuffing Season - 12 Days Of Christmas","Heaven Or Hell","Heaven knows","Hellbilly Deluxe","Hellboy","Help!","Her Loss","Here Comes The Cowboy","Hey World","High School Musical","High Tide In The Snake's Nest","Historias De Un Capricornio","Hndrxx","Hombres G (Devuélveme A Mi Chica)","Homerun","Homework","Hot Fuss","Hot Pink","Hot Sauce / Hello Future","Hot Space","Hotel Diablo","Houses Of The Holy","How Big, How Blue, How Beautiful","How I'm Feeling","How To Be Human","How To Save A Life","How To: Friend, Love, Freefall","Hozier","Human","Huncho Jack, Jack Huncho","Hunter Hayes","Hysteria","I Am...Sasha Fierce","I Can't Handle Change","I Met You When I Was 18. (The Playlist)","I Never Liked You","I Never Loved A Man The Way I Love You","I See You","I Think You Think Too Much Of Me","I Used To Know Her","I Used To Think I Could Fly","I'm Comin' Over","Ich & Keine Maske","If You Can Believe Your Eyes & Ears","Il Ballo Della Vita","Ill Communication","Imagination & The Misfit Kid","Imagine","Immortalized","In A Perfect World...","In Colour","In My Own Words","In Rainbows","In Return","In The Lonely Hour","Infest","Innuendo","Inter Shibuya - La Mafia","Interstellar","Is This It","It Was Written","It's Not Me, It's You","It's Only Me","Ivory","JackBoys","Jamie","Jazz","Jibrail & Iblis","Jordi","Jordin Sparks","Jose","Just As I Am","Just Cause Y'all Waited 2","Just Like You","Justified","K-12 / After School","K.I.D.S.","K.O.","K.O.B. Live","KG0516","KOD","Kane Brown","Kid A","Kid Krow","Kids See Ghosts","Kids in Love","Kinks (You Really Got Me)","Know-It-All","Konvicted","Kring","LANY","LM5","La Criatura","La Flaca","La Melodia De La Calle","La Revolucion","Lady Lady","Lady Wood","Langit Mong Bughaw","Las Que No Iban A Salir","Last Day Of Summer","Last Year Was Complicated","Layers","Layover","Lazarus","Led Zeppelin","Left Of The Middle","Leftoverture","Legends Never Die","Let's Skip To The Wedding","Let's Talk About Love","Licensed To Ill","Life In Cartoon Motion","Life Thru A Lens","Lifelines","Like..?","Lil Big Pac","Lil Boat","Lil Boat 2","Lil Boat 3.5","Lil Kiwi","Lil Pump","Limon Y Sal","Listen Without Prejudice","Little Voice","Live On Red Barn Radio I & II","Lo Que Andábamos Buscando","Lofi Fruits Music 2021","London Calling","Los Campeones Del Pueblo","Los Extraterrestres","Los Favoritos 2","Lost","Lost In Love","Loud","Love Sick","Love Story","Love Stuff","Love Yourself: Tear","Lover","Luca Brasi 2: Gangsta Grillz","Lust For Life","Luv Is Rage","M!ssundaztood","Ma Fleur","Made In Lagos","Mafia Bidness","Magazines Or Novels","Mainstream Sellout","Majestic","Make It Big","Make Yourself","Making Mirrors","Mamma Mia! Here We Go Again","Man Of The Woods","Manic","Me And My Gang","Meduza","Meet The Orphans","Meet The Woo","Melim","Mellon Collie And The Infinite Sadness","Melly vs. Melvin","Memories...Do Not Open","Menagerie","Midnights","Minecraft - Volume Alpha","Minutes To Midnight","Mix Pa Llorar En Tu Cuarto","Modo Avión","Monkey Business","Mono.","Montana","Montevallo","Moosetape","Morning View","Motivan2","Moving Pictures","Mr. Davis","Mr. Misunderstood","Mulan","Mura Masa","Music From The Edge Of Heaven","Music Of The Sun","My House","My Kinda Party","My Krazy Life","My Liver Will Handle What My Heart Can't","My Moment","My Own Lane","My Turn","My Worlds","Na Praia (Ao Vivo)","Nakamura","Nation Of Two","Navegando","Need You Now","Neon Future III","Neotheater","Never Trust A Happy Song","New English","News Of The World","Nicole","Night & Day","Nimmerland","Nimrod","Nine Track Mind","No Angel","No Me Pidas Perdón","No More Drama","No Protection","No Strings Attached","No Time To Die","Nobody Is Listening","Non Stop Erotic Cabaret","Non-Fiction","Northsbest","Nostalgia","Nostalgia, Ultra","Notes On A Conditional Form","Now Or Never","O Embaixador (Ao Vivo)","O My Heart","OK Computer","Ocean","Ocean Avenue","Ocean Eyes","Odisea","Oh My My","Oh, What A Life","On The 6","One In A Million","One More Light","One Of These Nights","Open Up And Say...Ahh!","Ordinary Man","Origins","Out Of The Blue","Over It","OzuTochi","PTSD","Pa Las Baby's Y Belikeada","Pa Que Hablen","Pa' Luego Es Tarde","Pa' Otro La 'O","Pablo Honey","Pain Is Love","Pain Is Temporary","Painting Pictures","Palmen Aus Plastik 2","Para Mi Ex","Para Siempre","Partners In Crime","Pawn Shop","Pegasus / Neon Shark VS Pegasus","Pet Sounds","Piece By Piece","Pier Pressure","Pineapple Sunrise","Piseiro 2020 Ao Vivo","Planet Pit","Plans","Play Deep","Playa Saturno","Por Primera Vez","Por Vida","Positions","Post Human: Survival Horror","Poster Girl","Prazer, Eu Sou Ferrugem (Ao Vivo)","Pretty Girls Like Trap Music","Pretty. Odd.","Prince Royce","Prisma","Prometo","Providence","Puberty 2","Punisher","Purgatory","Purple Rain","Que Bendición","Queen Of The Clouds","Quiero Volver","R&G (Rhythm & Gangsta): The Masterpiece","Raise!","Ransom 2","Rapunzel","Rare","Re Mida","Ready To Die","Realer","Rebelde","Reclassified","Recovery","Recuerden Mi Estilo","Reggatta De Blanc","Regulate… G Funk Era","Reik","Reise, Reise","Relapse","Relaxing Piano Lullabies And Natural Sleep Aid For Baby Sleep Music","Religiously. The Album.","Replay","Results May Vary","Revenge","Revolve","Revolver","Ricky Martin","Rien 100 Rien","Ripcord","Rise And Fall, Rage And Grace","Rise Of An Empire","Robin Hood: Prince Of Thieves","Rock N Roll Jesus","Romance","Romances","Ronan","Royal Blood","Rumours","Sad Boyz 4 Life II","San Lucas","Santana World","Saturation III","Sauce Boyz","Savage Mode","Saxobeats","Scarlet","Schwarzes Herz","Seal The Deal & Let's Boogie","Section.80","Segundo Romance","Sehnsucht","Shake The Snow Globe","Shang-Chi And The Legend Of The Ten Rings: The Album","Sheer Heart Attack","Shiesty Season","Shock Value","Shoot For The Stars, Aim For The Moon","Signed Sealed And Delivered","Signos","Silent Alarm","Simplemente Gracias","Sin Bandera","Sing Me A Lullaby, My Sweet Temptation","Sinner","Sirio","Sit Still, Look Pretty","Skin","Slowhand","Smash","Smithereens","Snow Cougar","Social Cues","Some Girls","Song Hits From Holiday Inn","Songs For Dads","Songs For The Deaf","Songs For You, Truths For Me","Songs In The Key Of Life","Souled Out","Sounds Of Silence","Soy Como Quiero Ser","Speak Now","Speak Your Mind","Speakerboxxx/The Love Below","Spider-Man: Into The Spider-Verse","Split Decision","Square Up","SremmLife","Starboy","Stay +","Stay Dangerous","Staying At Tamara's","Steppenwolf","Stick Season","Still Bill","Straight Outta Compton","Strange Trails","Stronger","Suavemente","Sublime","Suck It and See","Sucker","Sueños","Sugar","Summer Forever","Summer,","Sunset Season","Sunshine On Leith","Surfer Rosa","Sweet Talker","SweetSexySavage","System Of A Down","TA13OO","Talk That Talk","Talking Heads: 77","Tangled Up","Tango In The Night","Taxi Driver","Taylor Swift","Tell Me It's Real","Ten","Ten Summoner's Tales","Terra Sem Cep (Ao Vivo)","Terral","Testing","Tha Carter III","Thank Me Later","That's Christmas To Me","The Academy","The Adventures Of Bobby Ray","The Album","The Andy Williams Christmas Album","The Aviary","The Balcony","The Battle Of Los Angeles","The Beatles (White Album)","The Beginning","The Better Life","The Big Day","The Book","The Breakfast Club","The Cars","The Colour And The Shape","The Death Of Peace Of Mind","The Diary Of Alicia Keys","The Documentary","The Emancipation Of Mimi","The Eminem Show","The End Of Everything","The Final Countdown","The Forever Story","The Foundation","The Goat","The Golden Child","The Good Parts","The Greatest Showman: Reimagined","The Green Trip","The Hardest Love","The Head And The Heart","The Human Condition","The Infamous","The Lady Killer","The Last Don II","The Lion King","The Lockdown Sessions","The London Sessions","The Lord Of The Rings: The Fellowship Of The Ring","The Lost Boy","The Magic Of Christmas / The Christmas Song","The Marshall Mathers LP","The Martin Garrix Collection","The Melodic Blue","The Mockingbird & The Crow","The Pains Of Growing","The Papercut Chronicles","The Perfect Luv Tape","The Pinkprint","The Predator","The Queen Is Dead","The ReVe Festival: Finale","The Rise And Fall Of Ziggy Stardust And The Spiders From Mars","The Rising Tied","The River","The Stone Roses","The Story Of Us","The Stranger","The Sufferer & The Witness","The Sun's Tirade","The Temptations Sing Smokey","The Time Of Our Lives","The Way It Is","The Wonderful World Of Sam Cooke","The Writing's On The Wall","The Young And The Hopeless","Therapy","Therapy Session","There Is More (Live)","There Is Nothing Left To Lose","These Things Happen","Third Eye Blind","This Is Me...Then","This Unruly Mess I've Made","Threat to Survival","Thrill Of The Chase","Time","Timelezz","To Let A Good Thing Die","To Pimp A Butterfly","Toast To Our Differences","Todos Os Cantos, Vol. 1 (Ao Vivo)","Too Hard","Torches X","Total Xanarchy","Toto IV","Toulouse Street","Tourist History","Toxicity","Tragic Kingdom","Tranquility Base Hotel & Casino","Traumazine","Traveler","Tres Hombres","Trip At Knight","Tron: Legacy","True Blue","True Colors","Trustfall","Tu Veneno Mortal","Tudo Em Paz","Ubuntu","Ugly Is Beautiful","Ultra 2021","Una Mattina","Unbroken","Uncovered","Under Pressure","Unsponsored Content","Unstoppable","Unwritten","Urban Flora","Urban Hymns","Use Your Illusion I","Veneer","Versions Of Me","Vibes","Vice Versa","Vices & Virtues","Victory","Vida","Viejo Marihuano","Visualízate","Walk Away","Walk Me Home...","Watch The Throne","Wave","We Broke The Rules","We Love You Tecca","We Love You Tecca 2","Weezer (Green Album)","Welcome To The Madhouse","Westlife","What A Time To Be Alive","What Do You Think About The Car?","What Is Love?","What Makes You Country","What Separates Me From You","What You See Is What You Get / What You See Ain't Always What You Get","When It's Dark Out","When We All Fall Asleep, Where Do We Go?","Where The Light Is","While The World Was Burning","White Pony","Whitney","Who Really Cares","Who You Are","Who's Next","Wide Open","Wilder Mind","Wildfire","Willy And The Poor Boys","Wings / You Never Walk Alone","Wish","Wish You Were Here","Without Warning","Wonder","X&Y","XOXO","Y Que Quede Claro","YBN: The Mixtape","Yo Creo","You Will Regret","Youngblood","Younger Now","Youth"],tr=["$NOT","$uicideboy$","(G)I-DLE","*NSYNC","2 Chainz","21 Savage","6LACK","? & The Mysterians","A Boogie Wit da Hoodie","A Taste of Honey","A Tribe Called Quest","A-Ha","ABBA","AC/DC","AJ Tracey","ATEEZ","Ace of Base","Adele","Ado","Aerosmith","Agust D","Aitana","Al Dexter & his Troopers","Al Green","Al Jolson","Al Martino","Alan Jackson","Alannah Myles","Alec Benjamin","Alejandro Sanz","Alesso","Alfredo Olivas","Ali Gatie","Alice In Chains","Alina Baraz","All Time Low","All-4-One","All-American Rejects","Alok","America","American Quartet","Amii Stewart","Amitabh Bhattacharya","Ana Castela","Anderson .Paak","Andy Grammer","Angus & Julia Stone","Anirudh Ravichander","Anita Ward","Anitta","Anton Karas","Anuel AA","Arcade Fire","Archie Bell & The Drells","Archies","Aretha Franklin","Arizona Zervas","Armin van Buuren","Arthur Conley","Artie Shaw","Asake","Asees Kaur","Association","Atif Aslam","Audioslave","Aventura","Avril Lavigne","Aya Nakamura","B J Thomas","B.o.B","BLACKPINK","BONES","BROCKHAMPTON","BTS","Baby Keem","Bachman-Turner Overdrive","Backstreet Boys","Bad Bunny","Badshah","Bailey Zimmerman","Banda El Recodo","Barbra Streisand","Barry White","Bazzi","Bebe Rexha","Becky G","Becky Hill","Bee Gees","Ben Bernie","Ben Howard","Ben Selvin","Berlin","Bessie Smith","Bethel Music","Bette Midler","Beyonce","Bibi Blocksberg","Bibi und Tina","BigXthaPlug","Bill Doggett","Bill Haley & his Comets","Bill Withers","Billy Davis Jr","Billy Joel","Billy Paul","Billy Preston","Billy Swan","Birdy","Bizarrap","Blake Shelton","Blur","Bob Marley & The Wailers","Bob Seger","Bobby Darin","Bobby Lewis","Bobby McFerrin","Bobby Vinton","Boney M.","Bonez MC","Bonnie Tyler","Booba","Boston","BoyWithUke","Boyce Avenue","Bradley Cooper","Bread","Brent Faiyaz","Brett Young","Bring Me The Horizon","Britney Spears","Brooks & Dunn","Bruce Channel","Bruno & Marrone","Bryan Adams","Bryce Vine","Buddy Holly","Burna Boy","C. Tangana","CKay","CRO","Camilo","Capital Bra","Captain & Tennille","Cardi B","Carin Leon","Carlos Vives","Carly Simon","Carpenters","Cavetown","Celine Dion","Central Cee","Chaka Khan","Champs","Charlie Rich","Chayanne","Cheat Codes","Cher","Chic","Chicago","Chris Brown","Chris Isaak","Chris Young","Christina Aguilera","Christina Perri","Christopher Cross","Chuck Berry","Ciara","Cigarettes After Sex","Cliff Edwards (Ukelele Ike)","Cody Johnson","Colbie Caillat","Colby O'Donis","Cole Swindell","Coleman Hawkins","Contours","Coolio","Count Basie","Cris Mj","Culture Club","Cyndi Lauper","D-Block Europe","DAY6","DJ Khaled","DJ Luian","DJ Nelson","DMX","DNCE","DaVido","Dadju","Daft Punk","Dan + Shay","Daniel Powter","Danny Ocean","Darius Rucker","Dave","David Bowie","David Guetta","Daya","Dean Martin","Deee-Lite","Deep Purple","Deftones","Demi Lovato","Dennis Lloyd","Denzel Curry","Dermot Kennedy","Desiigner","Devo","Dewa 19","Dexys Midnight Runners","Diddy","Dido","Die drei !!!","Diego & Victor Hugo","Diljit Dosanjh","Dimitri Vegas & Like Mike","Dinah Shore","Dionne Warwick","Dire Straits","Disclosure","Dixie Cups","Doja Cat","Dolly Parton","Don Diablo","Don Henley","Don McLean","Don Omar","Donna Summer","Donovan","Dr. Dre","Drake","Dreamville","Dua Lipa","EMF","ENHYPEN","Earth, Wind & Fire","Ed Sheeran","Eddie Cantor","Eddie Cochran","Eddy Howard","Edgar Winter Group","Edwin Hawkins Singers","Edwin Starr","El Alfa","Eladio Carrion","Electric Light Orchestra","Elevation Worship","Ella Henderson","Ellie Goulding","Elton John","Elvis Presley","Empire of the Sun","En Vogue","Enrique Iglesias","Eslabon Armado","Ethel Waters","Etta James","Evanescence","Exile","Extreme","Faith Hill","Fall Out Boy","Fanny Brice","Farruko","Fats Domino","Fats Waller","Feid","Felix Jaehn","Fergie","Fetty Wap","Fiersa Besari","Fifth Harmony","Fine Young Cannibals","Five Finger Death Punch","Fleetwood Mac","Flo-Rida","Florence + The Machine","Flume","Foo Fighters","Foreigner","Foster The People","Four Aces","Frank Ocean","Frank Sinatra","Frankie Avalon","Frankie Valli","Fred Astaire","Freda Payne","Freddie Dredd","Freddy Fender","French Montana","Fuerza Regida","Fujii Kaze","Future","G-Eazy","Garfunkel and Oates","Gary Lewis & The Playboys","Gary Numan","Gene Autry","Gene Chandler","Gene Vincent","George Michael","George Strait","Gera MX","Ghost","Ghostemane","Gigi D'Agostino","Gladys Knight & The Pips","Glass Animals","Glee Cast","Gloria Gaynor","Godsmack","Gorillaz","Gotye","Grand Funk Railroad","Green Day","Grouplove","Grupo Firme","Grupo Marca Registrada","Gryffin","Gucci Mane","Guess Who","Gunna","Gusttavo Lima","Guy Mitchell","Gwen Stefani","Gzuz","H.E.R.","HARDY","Hailee Steinfeld","Halsey","Hans Zimmer","Harris Jayaraj","Harry Chapin","Harry James","Harry Nilsson","Harry Styles","Hayley Williams","Herb Alpert","Herman's Hermits","Hillsong UNITED","Hillsong Worship","Hollywood Undead","Honey Cone","Hoobastank","Hues Corporation","I Prevail","ITZY","IVE","Ice Cube","Ice Spice","Iggy Azalea","Imagine Dragons","Incubus","Internet Money","Isaac Hayes","J Geils Band","J. Cole","JAY-Z","JJ Lin","JP Saxe","JVKE","Jack Harlow","Jack Johnson","Jackie Wilson","Jacquees","James Arthur","James Brown","James TW","James Taylor","Jamie Foxx","Janet Jackson","Janis Joplin","Jason Aldean","Jason Mraz","Jay Chou","Jay Sean","Jay Wheeler","Jaymes Young","Jean Knight","Jeezy","Jennifer Lopez","Jennifer Warnes","Jeremih","Jeremy Zucker","Jerry Lee Lewis","Jerry Murad's Harmonicats","Jess Glynne","Jessie J","Jewel","Jimi Hendrix","Jimin","Jimmie Rodgers","Jimmy Dean","Jo Stafford","Joan Jett & The Blackhearts","Joao Gilberto","Joel Corry","John Fred & The Playboy Band","John Legend","John Mayer","John Williams","Johnnie Ray","Johnnie Taylor","Johnny Cash","Johnny Horton","Johnny Mathis","Johnny Mercer","Johnny Nash","Joji","Jon Bellion","Jonas Blue","Jonas Brothers","Joni James","Jorja Smith","Juan Gabriel","Juan Luis Guerra 4.40","Juanes","Juice Newton","Julia Michaels","Justin Bieber","Justin Quiles","KALEO","KAROL G","KAYTRANADA","KK","KSI","KYLE","Kacey Musgraves","Kane Brown","Kanye West","Karan Aujla","Kate Smith","Katy Perry","Kay Kyser","Ke$ha","Kehlani","Kelly Clarkson","Kenny Chesney","Kenny Loggins","Kenny Rogers","Kenshi Yonezu","Kenya Grace","Kevin Gates","Key Glock","Khalid","Kim Carnes","Kim Petras","Kimbra","Kina","King Gnu","Kings of Leon","Kingsmen","Kitty Kallen","Kodak Black","Kodaline","Kollegah","Kool & The Gang","Kungs","Kygo","Kylie Minogue","LE SSERAFIM","LISA","LMFAO","LUDMILLA","La Adictiva Banda San José de Mesillas","La Oreja de Van Gogh","Labrinth","Lady Antebellum","Lady GaGa","Lainey Wilson","Lana Del Rey","Latto","Lauryn Hill","Lauv","League of Legends","Lee Brice","Leon Bridges","Leona Lewis","Lesley Gore","Leslie Odom Jr.","Liam Payne","Lifehouse","Lil Baby","Lil Dicky","Lil Durk","Lil Mosey","Lil Nas X","Lil Pump","Lil Skies","Lil Tjay","Lil Uzi Vert","Lil Yachty","Lil' Kim","Lil' Wayne","Lin-Manuel Miranda","Linkin Park","Lionel Richie","Lipps Inc","Lisa Loeb","Little Peggy March","Little Richard","Lofi Fruits Music","Lord Huron","Los Del Rio","Los Dos Carnales","Los Lobos","Los Temerarios","Los Tigres Del Norte","Los Tucanes De Tijuana","Lou Reed","Loud Luxury","Louis Jordan","Louis Tomlinson","Love Unlimited","Lovin' Spoonful","Luan Santana","Luciano","Luis Miguel","Luis R Conriquez","Lulu","Lunay","Lupe Fiasco","M","MAX","MC Hammer","MC Ryan SP","MKTO","Mabel","Machine Gun Kelly","Madison Beer","Madonna","Mahalini","Major Lazer","Mambo Kingz","Maneskin","Marco Antonio Solís","Margaret Whiting","Maria Becerra","Mario","Mario Lanza","Mark Ronson","Maroon 5","Marshmello","Martin Garrix","Mary Ford","Mary J Blige","Mary J. Blige","Mary Wells","Matoma","Mau y Ricky","Meek Mill","Megadeth","Melanie","Melanie Martinez","Melendi","Men At Work","Metro Boomin","Michael Bublé","Michael Jackson","Michael McDonald","Michael Sembello","Miguel","Mike Posner","Miley Cyrus","Milky Chance","Minnie Riperton","Miracle Tones","Miranda Lambert","Mohit Chauhan","Mon Laferte","Moneybagg Yo","Monsta X","Mora","Morad","Morat","Mother Mother","Motley Crue","Ms. Lauryn Hill","Mumford & Sons","Muse","Mya","Myke Towers","NCT 127","NCT DREAM","NEFFEX","Nadin Amizah","Nancy Sinatra","Nat King Cole","Nate Smith","Natti Natasha","Nayer","Neil Diamond","Neil Sedaka","Nekfeu","Nelly","New Vaudeville Band","Next","Nickelback","Nicki Minaj","Nicki Nicole","Nicky Jam","Nina Simone","Ninho","Nipsey Hussle","Nirvana","Niska","No Doubt","Norah Jones","Normani","OMI","ONE OK ROCK","Oasis","Official HIGE DANdism","Offset","Old Dominion","Oliver Heldens","Olivia Rodrigo","Omah Lay","One Direction","Otis Redding","OutKast","Owl City","P Diddy","P!nk","PLK","PNL","Pamungkas","Passenger","Pat Boone","Patsy Cline","Patti LaBelle","Patti Page","Paul & Paula","Paul Revere & the Raiders","Paul Robeson","Paul Russell","Paul Whiteman","Paula Abdul","Peaches & Herb","Pearl Jam","Pee Wee Hunt","Pee Wee King","Pentatonix","Percy Faith","Percy Sledge","Peso Pluma","Peter Cetera","Peter Gabriel","Peter, Paul & Mary","Pharrell Williams","Pierce The Veil","Pineapple StormTv","Pink Floyd","Pink Sweat$","Piso 21","Pitbull","Plan B","Player","Polo G","Pop Smoke","Portugal. The Man","Pouya","Prince","Prince Royce","Pusha T","Quality Control","Queen","Quinn XCII","R. Kelly","RAF Camora","RAYE","REM","REO Speedwagon","Radiohead","Rag'n'Bone Man","Rage Against The Machine","Rahat Fateh Ali Khan","Rainbow Kitten Surprise","Rammstein","Rauw Alejandro","Ray Charles","Ray Parker Jr","Ray Stevens","Red Foley","Red Hot Chili Peppers","Red Velvet","Regard","Regina Belle","Reik","Rels B","Rema","Ricardo Arjona","Rich The Kid","Rick Astley","Rick Dees & his Cast of Idiots","Rick Ross","Rick Springfield","Ricky Martin","Ricky Nelson","Rihanna","Rita Ora","Ritchie Valens","Rizky Febian","Rob Thomas","Roberta Flack","Robin Schulz","Robin Thicke","Rod Stewart","Rod Wave","Roddy Ricch","Roger Miller","Romeo Santos","Rosemary Clooney","Roxette","Roy Acuff","Roy Orbison","Rudimental","Ruel","Ruth B.","Ryan Lewis","SCH","SEVENTEEN","SWV","Sabaton","Sabrina Carpenter","Sachet Tandon","Sachin-Jigar","Sade","Sam Cooke","Sam Feldt","Sam Hunt","Sam Smith","Sam The Sham & The Pharaohs","Sammy Davis Jr","Sammy Kaye","Santana","Sasha Alex Sloan","Savage Garden","Saweetie","Scorpions","Sean Kingston","Sean Paul","Sebastian Yatra","Sech","Seeb","Sezen Aksu","Sfera Ebbasta","Shaggy","Shania Twain","Shawn Mendes","Sheena Easton","Shinedown","Shubh","Sia","Sid Sriram","Sidhu Moose Wala","Silk","Silver Convention","Simon & Garfunkel","Sinead O'Connor","Sir Mix-a-Lot","Sister Sledge","Ski Mask The Slump God","Skillet","Skrillex","Sleeping At Last","Smokey Robinson","Snoop Dogg","Snow Patrol","Soda Stereo","Sonu Nigam","Sophie Ellis-Bextor","Spencer Davis Group","Spice Girls","Stan Getz","Starland Vocal Band","Stephen Sanchez","Steve Aoki","Steve Lacy","Steve Winwood","Stevie B","Sting","Stormzy","Strawberry Alarm Clock","Stray Kids","Stromae","Sublime","Sum 41","Summer Walker","Supertramp","Survivor","Swedish House Mafia","System Of A Down","T-Pain","T.I.","TAEYEON","TKKG","TLC","TOMORROW X TOGETHER","TOTO","TWICE","Tag Team","Tainy","Tammi Terrell","Tanishk Bagchi","Tate McRae","Taylor Swift","Tears For Fears","Tems","Tennessee Ernie Ford","Terence Trent D'Arby","Teresa Brewer","Terry Jacks","The Ames Brothers","The Animals","The B52s","The Bangles","The Beatles","The Black Eyed Peas","The Black Keys","The Box Tops","The Chainsmokers","The Chiffons","The Chordettes","The Clash","The Coasters","The Commodores","The Cowsills","The Cranberries","The Crew-Cuts","The Cure","The Detroit Spinners","The Diamonds","The Doobie Brothers","The Doors","The Drifters","The Emotions","The Eurythmics","The Fireballs","The Flamingos","The Foundations","The Four Seasons","The Fray","The Game","The Go Gos","The Goo Goo Dolls","The Head And The Heart","The Hollies","The Ink Spots","The Isley Brothers","The Jackson 5","The Kid LAROI","The Killers","The Kingston Trio","The Kooks","The Lemon Pipers","The Living Tombstone","The Lumineers","The Mamas & The Papas","The Marvelettes","The McCoys","The Mills Brothers","The Miracles","The Monkees","The Moody Blues","The National","The Neighbourhood","The Notorious B.I.G.","The O'Jays","The Offspring","The Osmonds","The Partridge Family","The Penguins","The Pet Shop Boys","The Platters","The Righteous Brothers","The Rolling Stones","The Ronettes","The Score","The Script","The Seekers","The Shangri-Las","The Smashing Pumpkins","The Staple Singers","The Strokes","The Supremes","The Temptations","The Turtles","The Vamps","The Verve","The Village People","The Weavers","The White Stripes","The Young Rascals","The Zombies","Thelma Houston","Thomas Rhett","Three Days Grace","Three Dog Night","Three Man Down","Timbaland","Timmy Trumpet","Toby Keith","Tom Jones","Tom Petty and the Heartbreakers","Tommy Dorsey","Tommy Edwards","Tommy James & the Shondells","Tone Loc","Toni Braxton","Topic","Tory Lanez","Tove Lo","Trevor Daniel","Trey Songz","Trippie Redd","Trueno","Tulsi Kumar","Tulus","Twenty One Pilots","Two Feet","Ty Dolla $ign","Tyga","Tyler Hubbard","U2","UB40","UZI","Ufo361","Upchurch","V","Vampire Weekend","Van McCoy","Van Morrison","Vance Joy","Vanessa Carlton","Vanessa Williams","Vera Lynn","Vernon Dalhart","Vicente Fernandez","Vishal-Shekhar","Volbeat","WILLOW","Wale","Wallows","Weezer","Wham!","Whitney Houston","Why Don't We","Wilbert Harrison","Wilson Phillips","Wiz Khalifa","Woody Guthrie","Wyclef Jean","XXXTENTACION","Xavi","YG","YNW Melly","YOASOBI","Yandel","Years & Years","Yeat","Yo Gotti","Young Dolph","Young Miko","Young Thug","YoungBoy Never Broke Again","Yung Gravy","Yuuri","Yuvan Shankar Raja","ZAYN","ZZ Top","Zac Brown Band","Zach Bryan","Zara Larsson","aespa","benny blanco","blink-182","d4vd","deadmau5","girl in red","gnash","iann dior","will.i.am"],rr=["Acid House","Acid Jazz","Acid Rock","Acoustic","Acoustic Blues","Afro-Pop","Afrobeat","Alt-Rock","Alternative","Ambient","American Trad Rock","Americana","Anime","Arena Rock","Art-Rock","Avant-Garde","Avant-Punk","Baladas y Boleros","Barbershop","Baroque","Bebop","Big Band","Black Metal","Blue Note","Bluegrass","Blues","Boogaloo","Bop","Bossa Nova","Bounce","Brazilian Funk","Breakbeat","Britpop","CCM","Cajun","Cantopop","Celtic","Celtic Folk","Chamber Music","Chant","Chanukah","Chicago Blues","Chicago House","Chicano","Children’s Music","Chill","Choral","Christian","Christmas","Classical","Club","College Rock","Conjunto","Cool Jazz","Country","Crunk","Dance","Dancehall","Death Metal","Deep House","Delta Blues","Detroit Techno","Dirty South","Disco","Disney","Dixieland","Doo-wop","Downtempo","Dream Pop","Drill","Drinking Songs","Drone","Drum'n'bass","Dub","Dubstep","EDM","Early Music","East Coast Rap","Easter","Easy Listening","Eclectic","Electric Blues","Electro","Electronic","Electronica","Emo","Enka","Environmental","Ethio-jazz","Experimental","Experimental Rock","Flamenco","Folk","Folk-Rock","Forro","French Pop","Funk","Fusion","Gangsta Rap","Garage","German Folk","German Pop","Glam Rock","Gospel","Goth","Grime","Grindcore","Groove","Grunge","Hair Metal","Halloween","Happy","Hard Bop","Hard Dance","Hard Rock","Hardcore","Hardcore Punk","Hardcore Rap","Hardstyle","Healing","Heavy Metal","High Classical","Hip Hop","Holiday","Honky Tonk","House","IDM","Impressionist","Indie","Industrial","Instrumental","J-Dance","J-Idol","J-Pop","J-Punk","J-Rock","J-Ska","J-Synth","Jackin House","Jam Bands","Japanese Pop","Jazz","Jungle","K-Pop","Karaoke","Kayokyoku","Kids","Kitsch","Klezmer","Krautrock","Latin","Latin Jazz","Latin Rap","Local","Lounge","Lullabies","MPB","Mainstream Jazz","Malay","Mandopop","March","Mariachi","Mawwal","Medieval","Meditation","Metal","Metalcore","Minimal Techno","Minimalism","Modern","Motown","Mugham","Musicals","Musique Concrète","Nature","Neo-Soul","Nerdcore","New Acoustic","New Age","New Mex","New Wave","No Wave","Noise","Nordic","Novelty","OPM","Oi!","Old School Rap","Opera","Orchestral","Original Score","Outlaw Country","Pagode","Party","Piano","Polka","Pop","Pop Film","Pop Latino","Post Dubstep","Power Pop","Praise & Worship","Progressive House","Progressive Rock","Proto-punk","Psych Rock","Psychedelic","Punk","Punk Rock","Qawwali","Quiet Storm","R&B","Ragtime","Rainy Day","Rap","Reggae","Reggaeton","Regional Mexicano","Relaxation","Renaissance","Retro","Rock","Rockabilly","Rocksteady","Romance","Romantic","Roots Reggae","Roots Rock","SKA","Sad","Salsa","Samba","Second Line","Sertanejo","Shaabi","Shoegaze","Sleep","Smooth Jazz","Soft Rock","Soul","Soundtrack","Southern Gospel","Southern Rock","Space Rock","Stage And Screen","Steampunk","Summer","Surf","Swamp Pop","Swing","Synth Pop","Tango","Techno","Teen Pop","Tejano","Tex-Mex","Thanksgiving","Traditional","Trance","Trip Hop","Tropical","Underground Rap","Urban","Urban Cowboy","West Coast Rap","Western Swing","World","Worldbeat","Zydeco"],ir=["(Everything I Do) I Do it For You","(Ghost) Riders in the Sky","(I Can't Get No) Satisfaction","(I've Got a Gal In) Kalamazoo","(I've Had) the Time of My Life","(It's No) Sin","(Just Like) Starting Over","(Let Me Be Your) Teddy Bear","(Put Another Nickel In) Music! Music! Music!","(Sexual) Healing","(Sittin' On) the Dock of the Bay","(They Long to Be) Close to You","(You Keep Me) Hangin' On","(You're My) Soul & Inspiration","(Your Love Keeps Lifting Me) Higher & Higher","12th Street Rag","1999","19th Nervous Breakdown","50 Ways to Leave Your Lover","9 to 5","96 Tears","A Boy Named Sue","A Hard Day's Night","A String of Pearls","A Thousand Miles","A Tree in the Meadow","A Whiter Shade of Pale","A Whole New World (Aladdin's Theme)","A Woman in Love","A-Tisket A-Tasket","ABC","Abracadabra","Ac-cent-tchu-ate the Positive","Addicted to Love","After You've Gone","Afternoon Delight","Again","Against All Odds (Take a Look At Me Now)","Ain't Misbehavin'","Ain't No Mountain High Enough","Ain't No Sunshine","Ain't That a Shame","Airplanes","All Along the Watchtower","All I Have to Do is Dream","All I Wanna Do","All My Lovin' (You're Never Gonna Get It)","All Night Long (All Night)","All Out of Love","All Shook Up","All You Need is Love","Alone","Alone Again (Naturally)","Always On My Mind","American Pie","American Woman","Angie","Another Brick in the Wall (part 2)","Another Day in Paradise","Another Night","Another One Bites the Dust","Apologize","April Showers","Aquarius/Let The Sunshine In","Are You Lonesome Tonight?","Arthur's Theme (Best That You Can Do)","As Time Goes By","At Last","At the Hop","Auf Wiederseh'n Sweetheart","Baby Baby","Baby Come Back","Baby Got Back","Baby Love","Baby One More Time","Bad Day","Bad Girls","Bad Moon Rising","Bad Romance","Bad, Bad Leroy Brown","Baker Street","Ball of Confusion (That's What the World is Today)","Ballad of the Green Berets","Ballerina","Band On the Run","Band of Gold","Battle of New Orleans","Be Bop a Lula","Be My Baby","Be My Love","Beat It","Beautiful Day","Beauty & the Beast","Because I Love You (The Postman Song)","Because You Loved Me","Because of You","Before The Next Teardrop Falls","Begin the Beguine","Behind Closed Doors","Being With You","Believe","Ben","Bennie & the Jets","Besame Mucho","Best of My Love","Bette Davis Eyes","Big Bad John","Big Girls Don't Cry","Billie Jean","Bitter Sweet Symphony","Black Or White","Black Velvet","Blaze of Glory","Bleeding Love","Blue Suede Shoes","Blue Tango","Blueberry Hill","Blurred Lines","Body & Soul","Bohemian Rhapsody","Boogie Oogie Oogie","Boogie Woogie Bugle Boy","Boom Boom Pow","Born in the USA","Born to Be Wild","Born to Run","Boulevard of Broken Dreams","Brand New Key","Brandy (You're A Fine Girl)","Breaking Up is Hard to Do","Breathe","Bridge Over Troubled Water","Brother Louie","Brother, Can You Spare a Dime?","Brown Eyed Girl","Brown Sugar","Build Me Up Buttercup","Burn","Buttons & Bows","Bye Bye Love","Bye Bye, Blackbird","Bye, Bye, Bye","Caldonia Boogie (What Makes Your Big Head So Hard)","California Dreamin'","California Girls","Call Me","Call Me Maybe","Can You Feel the Love Tonight","Can't Buy Me Love","Can't Get Enough of Your Love, Babe","Can't Help Falling in Love","Candle in the Wind '97","Candy Man","Car Wash","Careless Whisper","Cars","Cat's in the Cradle","Cathy's Clown","Celebration","Centerfold","Chain of Fools","Chances Are","Change the World","Chapel of Love","Chattanooga Choo Choo","Chattanoogie Shoe-Shine Boy","Check On It","Cheek to Cheek","Cherish","Cherry Pink & Apple Blossom White","Cold, Cold Heart","Colors of the Wind","Come On Eileen","Come On-a My House","Come Together","Coming Up","Cracklin' Rosie","Crazy","Crazy For You","Crazy Little Thing Called Love","Crazy in Love","Creep","Crimson & Clover","Crocodile Rock","Cry","Cry Like a Baby","Crying","Da Doo Ron Ron (When He Walked Me Home)","Dance to the Music","Dancing Queen","Dancing in the Dark","Dancing in the Street","Dardanella","Daydream Believer","December 1963 (Oh What a Night)","Delicado","Dilemma","Disco Duck","Disco Lady","Disturbia","Dizzy","Do That to Me One More Time","Do Wah Diddy Diddy","Do Ya Think I'm Sexy?","Do You Love Me?","Don't Be Cruel","Don't Fence Me In","Don't Go Breaking My Heart","Don't Leave Me This Way","Don't Let the Stars Get in Your Eyes","Don't Let the Sun Go Down On Me","Don't Speak","Don't Stop 'Til You Get Enough","Don't Worry Be Happy","Don't You (Forget About Me)","Don't You Want Me","Doo Wop (That Thing)","Down","Down Hearted Blues","Down Under","Downtown","Dreamlover","Dreams","Drop it Like It's Hot","Drops of Jupiter (Tell Me)","Duke of Earl","E.T.","Earth Angel","Ebony & Ivory","Eight Days a Week","Empire State Of Mind","End of the Road","Endless Love","Escape (The Pina Colada Song)","Eve of Destruction","Every Breath You Take","Every Little Thing She Does is Magic","Everybody Loves Somebody","Everybody Wants to Rule the World","Everyday People","Eye of the Tiger","Faith","Fallin'","Fame","Family Affair","Fantasy","Fast Car","Feel Good Inc","Feel Like Making Love","Fire & Rain","Firework","Flashdance. What a Feeling","Fly Robin Fly","Foolish Games","Footloose","For What It's Worth (Stop, Hey What's That Sound)","Fortunate Son","Frankenstein","Freak Me","Freebird","Frenesi","Funkytown","Gangsta's Paradise","Georgia On My Mind","Georgy Girl","Get Back","Get Down Tonight","Get Off of My Cloud","Ghostbusters","Gimme Some Lovin'","Girls Just Wanna Have Fun","Give Me Everything","Gives You Hell","Glamorous","Glory of Love","Go Your Own Way","God Bless America","God Bless the Child","Gold Digger","Gonna Make You Sweat (Everybody Dance Now)","Good Lovin'","Good Times","Good Vibrations","Goodbye Yellow Brick Road","Goodnight, Irene","Got to Give it Up","Grease","Great Balls of Fire","Greatest Love of All","Green Onions","Green River","Green Tambourine","Grenade","Groove is in the Heart","Groovin'","Gypsies, Tramps & Thieves","Hair","Hang On Sloopy","Hanging by a Moment","Hanky Panky","Happy Days Are Here Again","Happy Together","Harbour Lights","Hard to Say I'm Sorry","Harper Valley PTA","Have You Ever Really Loved a Woman?","He'll Have to Go","He's So Fine","He's a Rebel","Heart of Glass","Heart of Gold","Heartbreak Hotel","Hello Dolly","Hello, I Love You, Won't You Tell Me Your Name?","Help Me, Rhonda","Help!","Here Without You","Here in My Heart","Hero","Hey Baby","Hey Jude","Hey Paula","Hey There","Hey There Delilah","Hey Ya!","Higher Love","Hips don't lie","Hit the Road, Jack","Hold On","Hollaback Girl","Honey","Honky Tonk","Honky Tonk Woman","Horse With No Name","Hot Child In The City","Hot Stuff","Hotel California","Hound Dog","House of the Rising Sun","How Deep is Your Love?","How Do I Live?","How Do You Mend a Broken Heart","How High the Moon","How Much is That Doggy in the Window?","How Will I Know","How You Remind Me","How to Save a Life","Hungry Heart","Hurt So Good","I Believe I Can Fly","I Can Dream, Can't I?","I Can Help","I Can See Clearly Now","I Can't Get Next to You","I Can't Get Started","I Can't Go For That (No Can Do)","I Can't Help Myself (Sugar Pie, Honey Bunch)","I Can't Stop Loving You","I Don't Want to Miss a Thing","I Fall to Pieces","I Feel Fine","I Feel For You","I Feel Love","I Get Around","I Got You (I Feel Good)","I Got You Babe","I Gotta Feeling","I Heard it Through the Grapevine","I Honestly Love You","I Just Called to Say I Love You","I Just Wanna Be Your Everything","I Kissed A Girl","I Love Rock 'n' Roll","I Need You Now","I Only Have Eyes For You","I Shot the Sheriff","I Still Haven't Found What I'm Looking For","I Swear","I Think I Love You","I Walk the Line","I Wanna Dance With Somebody (Who Loves Me)","I Wanna Love You","I Want You Back","I Want to Hold Your Hand","I Want to Know What Love Is","I Went to Your Wedding","I Will Always Love You","I Will Follow Him","I Will Survive","I Write the Songs","I'll Be Missing You","I'll Be There","I'll Make Love to You","I'll Never Smile Again","I'll Take You There","I'll Walk Alone","I'll be seeing you","I'm Looking Over a Four Leaf Clover","I'm So Lonesome I Could Cry","I'm Sorry","I'm Walking Behind You","I'm Your Boogie Man","I'm Yours","I'm a Believer","I've Heard That Song Before","If (They Made Me a King)","If I Didn't Care","If You Don't Know Me By Now","If You Leave Me Now","Imagine","In Da Club","In the End","In the Ghetto","In the Mood","In the Summertime","In the Year 2525 (Exordium & Terminus)","Incense & Peppermints","Indian Reservation (The Lament Of The Cherokee Reservation Indian)","Instant Karma","Iris","Ironic","Irreplaceable","It Had to Be You","It's All in the Game","It's My Party","It's Now Or Never","It's Still Rock 'n' Roll to Me","It's Too Late","Jack & Diane","Jailhouse Rock","Jessie's Girl","Jive Talkin'","Johnny B Goode","Joy to the World","Judy in Disguise (With Glasses)","Jump","Jumpin' Jack Flash","Just Dance","Just My Imagination (Running Away With Me)","Just the Way You Are","Kansas City","Karma Chameleon","Keep On Loving You","Killing Me Softly With His Song","King of the Road","Kiss","Kiss & Say Goodbye","Kiss From a Rose","Kiss Me","Kiss On My List","Kiss You All Over","Knock On Wood","Knock Three Times","Kokomo","Kryptonite","Kung Fu Fighting","La Bamba","Lady","Lady Marmalade (Voulez-Vous Coucher Aver Moi Ce Soir?)","Last Train to Clarksville","Layla","Le Freak","Leader of the Pack","Lean On Me","Leaving, on a Jet Plane","Let Me Call You Sweetheart","Let Me Love You","Let it Be","Let it Snow! Let it Snow! Let it Snow!","Let's Dance","Let's Get it On","Let's Groove","Let's Hear it For the Boy","Let's Stay Together","Light My Fire","Lights","Like a Prayer","Like a Rolling Stone","Like a Virgin","Little Darlin'","Little Things Mean a Lot","Live & Let Die","Livin' La Vida Loca","Livin' On a Prayer","Living For the City","Locked Out Of Heaven","Lola","Lonely Boy","Long Cool Woman in a Black Dress","Long Tall Sally","Look Away","Lookin' Out My Back Door","Lose Yourself","Losing My Religion","Louie Louie","Love Child","Love Hangover","Love In This Club","Love Is Blue (L'Amour Est Bleu)","Love Letters in the Sand","Love Me Do","Love Me Tender","Love Shack","Love Theme From 'A Star is Born' (Evergreen)","Love Train","Love Will Keep Us Together","Love is a Many Splendoured Thing","Love to Love You Baby","Love's Theme","Loving You","Low","Macarena","Mack the Knife","Maggie May","Magic","Magic Carpet Ride","Make Love to Me","Make it With You","Makin' Whoopee","Mama Told Me Not to Come","Man in the Mirror","Manana (Is Soon Enough For Me)","Maneater","Maniac","Maybellene","Me & Bobby McGee","Me & Mrs Jones","Memories Are Made of This","Mercy Mercy Me (The Ecology)","Mickey","Midnight Train to Georgia","Minnie the Moocher","Miss You","Miss You Much","Mister Sandman","Mmmbop","Mona Lisa","Monday Monday","Money For Nothing","Mony Mony","Mood Indigo","Moonlight Cocktail","Moonlight Serenade","More Than Words","More Than a Feeling","Morning Train (Nine to Five)","Mr Big Stuff","Mr Brightside","Mr Tambourine Man","Mrs Brown You've Got a Lovely Daughter","Mrs Robinson","Mule Train","Music","My Blue Heaven","My Boyfriend's Back","My Eyes Adored You","My Girl","My Guy","My Heart Will Go On","My Life","My Love","My Man","My Prayer","My Sharona","My Sweet Lord","Na Na Hey Hey (Kiss Him Goodbye)","Nature Boy","Near You","Need You Now","Need You Tonight","Never Gonna Give You Up","Night & Day","Night Fever","Nights in White Satin","No One","No Scrubs","Nobody Does it Better","Nothin' on You","Nothing Compares 2 U","Nothing's Gonna Stop Us Now","Ode To Billie Joe","Oh Happy Day","Oh My Papa (O Mein Papa)","Oh, Pretty Woman","Ol' Man River","Ole Buttermilk Sky","On Bended Knee","On My Own","On the Atchison, Topeka & the Santa Fe","One","One Bad Apple","One More Try","One O'Clock Jump","One Sweet Day","One of These Nights","One of Us","Only The Lonely (Know The Way I Feel)","Only You (And You Alone)","Open Arms","Over There","Over the Rainbow","Paint it Black","Papa Don't Preach","Papa Was a Rolling Stone","Papa's Got a Brand New Bag","Paper Doll","Paper Planes","Paperback Writer","Party Rock Anthem","Peg o' My Heart","Peggy Sue","Pennies From Heaven","Penny Lane","People","People Got to Be Free","Personality","Philadelphia Freedom","Physical","Piano Man","Pick Up the Pieces","Pistol Packin' Mama","Play That Funky Music","Please Mr Postman","Poker Face","Pon De Replay","Pony Time","Pop Muzik","Prisoner of Love","Private Eyes","Promiscuous","Proud Mary","Purple Haze","Purple Rain","Puttin' on the Ritz","Que sera sera (Whatever will be will be)","Queen of Hearts","Rag Doll","Rag Mop","Rags to Riches","Raindrops Keep Falling On My Head","Rapture","Ray of Light","Reach Out (I'll Be There)","Red Red Wine","Rehab","Respect","Return to Sender","Reunited","Revolution","Rhapsody in Blue","Rhinestone Cowboy","Rich Girl","Riders On the Storm","Right Back Where We Started From","Ring My Bell","Ring of Fire","Rock Around the Clock","Rock With You","Rock Your Baby","Rock the Boat","Rock the Casbah","Roll Over Beethoven","Roll With It","Rolling In The Deep","Rosanna","Roses Are Red","Royals","Ruby Tuesday","Rudolph, the Red-Nosed Reindeer","Rum & Coca-Cola","Runaround Sue","Runaway","Running Scared","Rush Rush","Sailing","Save the Best For Last","Save the Last Dance For Me","Say It Right","Say My Name","Say Say Say","Say You, Say Me","School's Out","Seasons in the Sun","Secret Love","Sentimental Journey","Sexyback","Sh-Boom (Life Could Be a Dream)","Shadow Dancing","Shake Down","Shake You Down","She Drives Me Crazy","She Loves You","She's a Lady","Shining Star","Shop Around","Shout","Silly Love Songs","Since U Been Gone","Sing, Sing, Sing (With A Swing)","Singing The Blues","Single Ladies (Put A Ring On It)","Sir Duke","Sixteen Tons","Sledgehammer","Sleep Walk","Sleepy Lagoon","Slow Poke","Smells Like Teen Spirit","Smoke Gets in Your Eyes","Smoke On the Water","Smoke! Smoke! Smoke! (That Cigarette)","Smooth","So Much in Love","Soldier Boy","Some Enchanted Evening","Some of These Days","Somebody That I Used to Know","Somebody to Love","Someday","Somethin' Stupid","Something","Soul Man","Spanish Harlem","Spill the Wine","Spinning Wheel","Spirit in the Sky","St George & the Dragonette","St Louis Blues","Stagger Lee","Stairway to Heaven","Stand By Me","Stardust","Stars & Stripes Forever","Stay (I Missed You)","Stayin' Alive","Stop! in the Name of Love","Stormy Weather (Keeps Rainin' All the Time)","Straight Up","Strange Fruit","Stranger On the Shore","Strangers in the Night","Strawberry Fields Forever","Streets of Philadelphia","Stronger","Stuck On You","Sugar Shack","Sugar Sugar","Summer in the City","Summertime Blues","Sunday, Monday or Always","Sunshine Superman","Sunshine of Your Love","Superstar","Superstition","Surfin' USA","Suspicious Minds","Swanee","Sweet Caroline (Good Times Never Seemed So Good)","Sweet Child O' Mine","Sweet Dreams (Are Made of This)","Sweet Georgia Brown","Sweet Home Alabama","Sweet Soul Music","Swinging On a Star","T For Texas (Blue Yodel No 1)","TSOP (The Sound of Philadelphia)","Take Me Home, Country Roads","Take My Breath Away","Take On Me","Take The 'A' Train","Take a Bow","Tammy","Tangerine","Tears in Heaven","Tears of a Clown","Temperature","Tennessee Waltz","Tequila","Tha Crossroads","Thank You (Falettinme be Mice Elf Again)","That Lucky Old Sun (Just Rolls Around Heaven All Day)","That Old Black Magic","That'll Be the Day","That's Amore","That's What Friends Are For","That's the Way (I Like It)","That's the Way Love Goes","The Boy is Mine","The Boys of Summer","The Christmas Song (Chestnuts Roasting On An Open Fire)","The End of the World","The First Time Ever I Saw Your Face","The Girl From Ipanema","The Glow-Worm","The Great Pretender","The Gypsy","The Hustle","The Joker","The Last Dance","The Letter","The Loco-Motion","The Long & Winding Road","The Love You Save","The Morning After","The Power of Love","The Prisoner's Song","The Reason","The Rose","The Sign","The Song From Moulin Rouge (Where Is Your Heart)","The Sounds of Silence","The Streak","The Sweet Escape","The Thing","The Tide is High","The Tracks of My Tears","The Twist","The Wanderer","The Way We Were","The Way You Look Tonight","The Way You Move","Theme From 'A Summer Place'","Theme From 'Greatest American Hero' (Believe It Or Not)","Theme From 'Shaft'","There goes my baby","These Boots Are Made For Walking","Third Man Theme","This Diamond Ring","This Guy's in Love With You","This Land is Your Land","This Love","This Ole House","This Used to Be My Playground","Three Coins in the Fountain","Three Times a Lady","Thrift Shop","Thriller","Ticket to Ride","Tie a Yellow Ribbon 'round the Old Oak Tree","Tiger Rag","Tighten Up","Tik-Toc","Till I Waltz Again With You","Till The End of Time","Time After Time","Time of the Season","To Sir, with Love","Tom Dooley","Tonight's the Night (Gonna Be Alright)","Too Close","Too Young","Tossing & Turning","Total Eclipse of the Heart","Touch Me","Toxic","Travellin' Band","Travellin' Man","Truly Madly Deeply","Turn! Turn! Turn! (To Everything There is a Season)","Tutti Frutti","Twist & Shout","Two Hearts","U Can't Touch This","U Got it Bad","Umbrella","Un-Break My Heart","Unbelievable","Unchained Melody","Uncle Albert (Admiral Halsey)","Under the Boardwalk","Under the Bridge","Unforgettable","Up Around the Bend","Up Up & Away","Up Where We Belong","Upside Down","Use Somebody","Vaya Con Dios (may God Be With You)","Venus","Vision of Love","Viva La Vida","Vogue","Volare","Wabash Cannonball","Waiting For a Girl Like You","Wake Me Up Before You Go Go","Wake Up Little Susie","Walk Don't Run","Walk Like a Man","Walk Like an Egyptian","Walk On By","Walk On the Wild Side","Walk This Way","Wannabe","Want Ads","Wanted","War","Waterfalls","Wayward Wind","We Are Family","We Are Young","We Are the Champions","We Are the World","We Belong Together","We Built This City","We Can Work it Out","We Didn't Start the Fire","We Found Love","We Got The Beat","We Will Rock You","We've Only Just Begun","Weak","Wedding Bell Blues","West End Blues","West End Girls","What Goes Around Comes Around","What a Fool Believes","What'd I Say","What's Going On?","What's Love Got to Do With It?","Whatcha Say","Wheel of Fortune","When Doves Cry","When You Wish Upon a Star","When a Man Loves a Woman","Where Did Our Love Go","Where is the Love?","Whip It","Whispering","White Christmas","White Rabbit","Whole Lotta Love","Whole Lotta Shakin' Goin' On","Whoomp! (There it Is)","Why Do Fools Fall in Love?","Why Don't You Believe Me?","Wichita Lineman","Wicked Game","Wild Thing","Wild Wild West","Will It Go Round In Circles","Will You Love Me Tomorrow","Winchester Cathedral","Wind Beneath My Wings","Wipe Out","Wishing Well","With Or Without You","Without Me","Without You","Woman","Won't Get Fooled Again","Wooly Bully","Working My Way Back to You","YMCA","Yakety Yak","Yeah!","Yellow Rose of Texas","Yesterday","You Ain't Seen Nothin' Yet","You Always Hurt the One You Love","You Are the Sunshine of My Life","You Belong With Me","You Belong to Me","You Can't Hurry Love","You Don't Bring Me Flowers","You Don't Have to Be a Star (To Be in My Show)","You Light Up My Life","You Make Me Feel Brand New","You Make Me Feel Like Dancing","You Really Got Me","You Send Me","You Sexy Thing","You Were Meant for Me","You make Me Wanna","You'll Never Know","You're Beautiful","You're So Vain","You're Still the One","You're the One That I Want","You've Got a Friend","You've Lost That Lovin' Feelin'","Your Cheatin' Heart","Your Song"],or={album:nr,artist:tr,genre:rr,song_name:ir},lr=or,sr=["activist","artist","author","blogger","business owner","coach","creator","designer","developer","dreamer","educator","engineer","entrepreneur","environmentalist","film lover","filmmaker","foodie","founder","friend","gamer","geek","grad","inventor","leader","model","musician","nerd","parent","patriot","person","philosopher","photographer","public speaker","scientist","singer","streamer","student","teacher","traveler","veteran","writer"],ur=["{{person.bio_part}}","{{person.bio_part}}, {{person.bio_part}}","{{person.bio_part}}, {{person.bio_part}}, {{person.bio_part}}","{{person.bio_part}}, {{person.bio_part}}, {{person.bio_part}} {{internet.emoji}}","{{word.noun}} {{person.bio_supporter}}","{{word.noun}} {{person.bio_supporter}}  {{internet.emoji}}","{{word.noun}} {{person.bio_supporter}}, {{person.bio_part}}","{{word.noun}} {{person.bio_supporter}}, {{person.bio_part}} {{internet.emoji}}"],cr=["advocate","devotee","enthusiast","fan","junkie","lover","supporter"],dr={generic:["Aaliyah","Aaron","Abagail","Abbey","Abbie","Abbigail","Abby","Abdiel","Abdul","Abdullah","Abe","Abel","Abelardo","Abigail","Abigale","Abigayle","Abner","Abraham","Ada","Adah","Adalberto","Adaline","Adam","Adan","Addie","Addison","Adela","Adelbert","Adele","Adelia","Adeline","Adell","Adella","Adelle","Aditya","Adolf","Adolfo","Adolph","Adolphus","Adonis","Adrain","Adrian","Adriana","Adrianna","Adriel","Adrien","Adrienne","Afton","Aglae","Agnes","Agustin","Agustina","Ahmad","Ahmed","Aida","Aidan","Aiden","Aileen","Aimee","Aisha","Aiyana","Akeem","Al","Alaina","Alan","Alana","Alanis","Alanna","Alayna","Alba","Albert","Alberta","Albertha","Alberto","Albin","Albina","Alda","Alden","Alec","Aleen","Alejandra","Alejandrin","Alek","Alena","Alene","Alessandra","Alessandro","Alessia","Aletha","Alex","Alexa","Alexander","Alexandra","Alexandre","Alexandrea","Alexandria","Alexandrine","Alexandro","Alexane","Alexanne","Alexie","Alexis","Alexys","Alexzander","Alf","Alfonso","Alfonzo","Alford","Alfred","Alfreda","Alfredo","Ali","Alia","Alice","Alicia","Alisa","Alisha","Alison","Alivia","Aliya","Aliyah","Aliza","Alize","Allan","Allen","Allene","Allie","Allison","Ally","Alphonso","Alta","Althea","Alva","Alvah","Alvena","Alvera","Alverta","Alvina","Alvis","Alyce","Alycia","Alysa","Alysha","Alyson","Alysson","Amalia","Amanda","Amani","Amara","Amari","Amaya","Amber","Ambrose","Amelia","Amelie","Amely","America","Americo","Amie","Amina","Amir","Amira","Amiya","Amos","Amparo","Amy","Amya","Ana","Anabel","Anabelle","Anahi","Anais","Anastacio","Anastasia","Anderson","Andre","Andreane","Andreanne","Andres","Andrew","Andy","Angel","Angela","Angelica","Angelina","Angeline","Angelita","Angelo","Angie","Angus","Anibal","Anika","Anissa","Anita","Aniya","Aniyah","Anjali","Anna","Annabel","Annabell","Annabelle","Annalise","Annamae","Annamarie","Anne","Annetta","Annette","Annie","Ansel","Ansley","Anthony","Antoinette","Antone","Antonetta","Antonette","Antonia","Antonietta","Antonina","Antonio","Antwan","Antwon","Anya","April","Ara","Araceli","Aracely","Arch","Archibald","Ardella","Arden","Ardith","Arely","Ari","Ariane","Arianna","Aric","Ariel","Arielle","Arjun","Arlene","Arlie","Arlo","Armand","Armando","Armani","Arnaldo","Arne","Arno","Arnold","Arnoldo","Arnulfo","Aron","Art","Arthur","Arturo","Arvel","Arvid","Arvilla","Aryanna","Asa","Asha","Ashlee","Ashleigh","Ashley","Ashly","Ashlynn","Ashton","Ashtyn","Asia","Assunta","Astrid","Athena","Aubree","Aubrey","Audie","Audra","Audreanne","Audrey","August","Augusta","Augustine","Augustus","Aurelia","Aurelie","Aurelio","Aurore","Austen","Austin","Austyn","Autumn","Ava","Avery","Avis","Axel","Ayana","Ayden","Ayla","Aylin","Baby","Bailee","Bailey","Barbara","Barney","Baron","Barrett","Barry","Bart","Bartholome","Barton","Baylee","Beatrice","Beau","Beaulah","Bell","Bella","Belle","Ben","Benedict","Benjamin","Bennett","Bennie","Benny","Benton","Berenice","Bernadette","Bernadine","Bernard","Bernardo","Berneice","Bernhard","Bernice","Bernie","Berniece","Bernita","Berry","Bert","Berta","Bertha","Bertram","Bertrand","Beryl","Bessie","Beth","Bethany","Bethel","Betsy","Bette","Bettie","Betty","Bettye","Beulah","Beverly","Bianka","Bill","Billie","Billy","Birdie","Blair","Blaise","Blake","Blanca","Blanche","Blaze","Bo","Bobbie","Bobby","Bonita","Bonnie","Boris","Boyd","Brad","Braden","Bradford","Bradley","Bradly","Brady","Braeden","Brain","Brandi","Brando","Brandon","Brandt","Brandy","Brandyn","Brannon","Branson","Brant","Braulio","Braxton","Brayan","Breana","Breanna","Breanne","Brenda","Brendan","Brenden","Brendon","Brenna","Brennan","Brennon","Brent","Bret","Brett","Bria","Brian","Briana","Brianne","Brice","Bridget","Bridgette","Bridie","Brielle","Brigitte","Brionna","Brisa","Britney","Brittany","Brock","Broderick","Brody","Brook","Brooke","Brooklyn","Brooks","Brown","Bruce","Bryana","Bryce","Brycen","Bryon","Buck","Bud","Buddy","Buford","Bulah","Burdette","Burley","Burnice","Buster","Cade","Caden","Caesar","Caitlyn","Cale","Caleb","Caleigh","Cali","Calista","Callie","Camden","Cameron","Camila","Camilla","Camille","Camren","Camron","Camryn","Camylle","Candace","Candelario","Candice","Candida","Candido","Cara","Carey","Carissa","Carlee","Carleton","Carley","Carli","Carlie","Carlo","Carlos","Carlotta","Carmel","Carmela","Carmella","Carmelo","Carmen","Carmine","Carol","Carolanne","Carole","Carolina","Caroline","Carolyn","Carolyne","Carrie","Carroll","Carson","Carter","Cary","Casandra","Casey","Casimer","Casimir","Casper","Cassandra","Cassandre","Cassidy","Cassie","Catalina","Caterina","Catharine","Catherine","Cathrine","Cathryn","Cathy","Cayla","Ceasar","Cecelia","Cecil","Cecile","Cecilia","Cedrick","Celestine","Celestino","Celia","Celine","Cesar","Chad","Chadd","Chadrick","Chaim","Chance","Chandler","Chanel","Chanelle","Charity","Charlene","Charles","Charley","Charlie","Charlotte","Chase","Chasity","Chauncey","Chaya","Chaz","Chelsea","Chelsey","Chelsie","Chesley","Chester","Chet","Cheyanne","Cheyenne","Chloe","Chris","Christ","Christa","Christelle","Christian","Christiana","Christina","Christine","Christop","Christophe","Christopher","Christy","Chyna","Ciara","Cicero","Cielo","Cierra","Cindy","Citlalli","Clair","Claire","Clara","Clarabelle","Clare","Clarissa","Clark","Claud","Claude","Claudia","Claudie","Claudine","Clay","Clemens","Clement","Clementina","Clementine","Clemmie","Cleo","Cleora","Cleta","Cletus","Cleve","Cleveland","Clifford","Clifton","Clint","Clinton","Clotilde","Clovis","Cloyd","Clyde","Coby","Cody","Colby","Cole","Coleman","Colin","Colleen","Collin","Colt","Colten","Colton","Columbus","Concepcion","Conner","Connie","Connor","Conor","Conrad","Constance","Constantin","Consuelo","Cooper","Cora","Coralie","Corbin","Cordelia","Cordell","Cordia","Cordie","Corene","Corine","Cornelius","Cornell","Corrine","Cortez","Cortney","Cory","Coty","Courtney","Coy","Craig","Crawford","Creola","Cristal","Cristian","Cristina","Cristobal","Cristopher","Cruz","Crystal","Crystel","Cullen","Curt","Curtis","Cydney","Cynthia","Cyril","Cyrus","D'angelo","Dagmar","Dahlia","Daija","Daisha","Daisy","Dakota","Dale","Dallas","Dallin","Dalton","Damaris","Dameon","Damian","Damien","Damion","Damon","Dan","Dana","Dandre","Dane","Dangelo","Danial","Daniela","Daniella","Danielle","Danika","Dannie","Danny","Dante","Danyka","Daphne","Daphnee","Daphney","Darby","Daren","Darian","Dariana","Darien","Dario","Darion","Darius","Darlene","Daron","Darrel","Darrell","Darren","Darrick","Darrin","Darrion","Darron","Darryl","Darwin","Daryl","Dashawn","Dasia","Dave","David","Davin","Davion","Davon","Davonte","Dawn","Dawson","Dax","Dayana","Dayna","Dayne","Dayton","Dean","Deangelo","Deanna","Deborah","Declan","Dedric","Dedrick","Dee","Deion","Deja","Dejah","Dejon","Dejuan","Delaney","Delbert","Delfina","Delia","Delilah","Dell","Della","Delmer","Delores","Delpha","Delphia","Delphine","Delta","Demarco","Demarcus","Demario","Demetris","Demetrius","Demond","Dena","Denis","Dennis","Deon","Deondre","Deontae","Deonte","Dereck","Derek","Derick","Deron","Derrick","Deshaun","Deshawn","Desiree","Desmond","Dessie","Destany","Destin","Destinee","Destiney","Destini","Destiny","Devan","Devante","Deven","Devin","Devon","Devonte","Devyn","Dewayne","Dewitt","Dexter","Diamond","Diana","Dianna","Diego","Dillan","Dillon","Dimitri","Dina","Dino","Dion","Dixie","Dock","Dolly","Dolores","Domenic","Domenica","Domenick","Domenico","Domingo","Dominic","Dominique","Don","Donald","Donato","Donavon","Donna","Donnell","Donnie","Donny","Dora","Dorcas","Dorian","Doris","Dorothea","Dorothy","Dorris","Dortha","Dorthy","Doug","Douglas","Dovie","Doyle","Drake","Drew","Duane","Dudley","Dulce","Duncan","Durward","Dustin","Dusty","Dwight","Dylan","Earl","Earlene","Earline","Earnest","Earnestine","Easter","Easton","Ebba","Ebony","Ed","Eda","Edd","Eddie","Eden","Edgar","Edgardo","Edison","Edmond","Edmund","Edna","Eduardo","Edward","Edwardo","Edwin","Edwina","Edyth","Edythe","Effie","Efrain","Efren","Eileen","Einar","Eino","Eladio","Elaina","Elbert","Elda","Eldon","Eldora","Eldred","Eldridge","Eleanora","Eleanore","Eleazar","Electa","Elena","Elenor","Elenora","Eleonore","Elfrieda","Eli","Elian","Eliane","Elias","Eliezer","Elijah","Elinor","Elinore","Elisa","Elisabeth","Elise","Eliseo","Elisha","Elissa","Eliza","Elizabeth","Ella","Ellen","Ellie","Elliot","Elliott","Ellis","Ellsworth","Elmer","Elmira","Elmo","Elmore","Elna","Elnora","Elody","Eloisa","Eloise","Elouise","Eloy","Elroy","Elsa","Else","Elsie","Elta","Elton","Elva","Elvera","Elvie","Elvis","Elwin","Elwyn","Elyse","Elyssa","Elza","Emanuel","Emelia","Emelie","Emely","Emerald","Emerson","Emery","Emie","Emil","Emile","Emilia","Emiliano","Emilie","Emilio","Emily","Emma","Emmalee","Emmanuel","Emmanuelle","Emmet","Emmett","Emmie","Emmitt","Emmy","Emory","Ena","Enid","Enoch","Enola","Enos","Enrico","Enrique","Ephraim","Era","Eriberto","Eric","Erica","Erich","Erick","Ericka","Erik","Erika","Erin","Erling","Erna","Ernest","Ernestina","Ernestine","Ernesto","Ernie","Ervin","Erwin","Eryn","Esmeralda","Esperanza","Esta","Esteban","Estefania","Estel","Estell","Estella","Estelle","Estevan","Esther","Estrella","Etha","Ethan","Ethel","Ethelyn","Ethyl","Ettie","Eudora","Eugene","Eugenia","Eula","Eulah","Eulalia","Euna","Eunice","Eusebio","Eva","Evalyn","Evan","Evangeline","Evans","Eve","Eveline","Evelyn","Everardo","Everett","Everette","Evert","Evie","Ewald","Ewell","Ezekiel","Ezequiel","Ezra","Fabian","Fabiola","Fae","Fannie","Fanny","Fatima","Faustino","Fausto","Favian","Fay","Faye","Federico","Felicia","Felicita","Felicity","Felipa","Felipe","Felix","Felton","Fermin","Fern","Fernando","Ferne","Fidel","Filiberto","Filomena","Finn","Fiona","Flavie","Flavio","Fleta","Fletcher","Flo","Florence","Florencio","Florian","Florida","Florine","Flossie","Floy","Floyd","Ford","Forest","Forrest","Foster","Frances","Francesca","Francesco","Francis","Francisca","Francisco","Franco","Frank","Frankie","Franz","Fred","Freda","Freddie","Freddy","Frederic","Frederick","Frederik","Frederique","Fredrick","Fredy","Freeda","Freeman","Freida","Frida","Frieda","Friedrich","Fritz","Furman","Gabe","Gabriel","Gabriella","Gabrielle","Gaetano","Gage","Gail","Gardner","Garett","Garfield","Garland","Garnet","Garnett","Garret","Garrett","Garrick","Garrison","Garry","Garth","Gaston","Gavin","Gayle","Gene","General","Genesis","Genevieve","Gennaro","Genoveva","Geo","Geoffrey","George","Georgette","Georgiana","Georgianna","Geovanni","Geovanny","Geovany","Gerald","Geraldine","Gerard","Gerardo","Gerda","Gerhard","Germaine","German","Gerry","Gerson","Gertrude","Gia","Gianni","Gideon","Gilbert","Gilberto","Gilda","Giles","Gillian","Gina","Gino","Giovani","Giovanna","Giovanni","Giovanny","Gisselle","Giuseppe","Gladyce","Gladys","Glen","Glenda","Glenna","Glennie","Gloria","Godfrey","Golda","Golden","Gonzalo","Gordon","Grace","Gracie","Graciela","Grady","Graham","Grant","Granville","Grayce","Grayson","Green","Greg","Gregg","Gregoria","Gregorio","Gregory","Greta","Gretchen","Greyson","Griffin","Grover","Guadalupe","Gudrun","Guido","Guillermo","Guiseppe","Gunnar","Gunner","Gus","Gussie","Gust","Gustave","Guy","Gwen","Gwendolyn","Hadley","Hailee","Hailey","Hailie","Hal","Haleigh","Haley","Halie","Halle","Hallie","Hank","Hanna","Hannah","Hans","Hardy","Harley","Harmon","Harmony","Harold","Harrison","Harry","Harvey","Haskell","Hassan","Hassie","Hattie","Haven","Hayden","Haylee","Hayley","Haylie","Hazel","Hazle","Heath","Heather","Heaven","Heber","Hector","Heidi","Helen","Helena","Helene","Helga","Hellen","Helmer","Heloise","Henderson","Henri","Henriette","Henry","Herbert","Herman","Hermann","Hermina","Herminia","Herminio","Hershel","Herta","Hertha","Hester","Hettie","Hilario","Hilbert","Hilda","Hildegard","Hillard","Hillary","Hilma","Hilton","Hipolito","Hiram","Hobart","Holden","Hollie","Hollis","Holly","Hope","Horace","Horacio","Hortense","Hosea","Houston","Howard","Howell","Hoyt","Hubert","Hudson","Hugh","Hulda","Humberto","Hunter","Hyman","Ian","Ibrahim","Icie","Ida","Idell","Idella","Ignacio","Ignatius","Ike","Ila","Ilene","Iliana","Ima","Imani","Imelda","Immanuel","Imogene","Ines","Irma","Irving","Irwin","Isaac","Isabel","Isabell","Isabella","Isabelle","Isac","Isadore","Isai","Isaiah","Isaias","Isidro","Ismael","Isobel","Isom","Israel","Issac","Itzel","Iva","Ivah","Ivory","Ivy","Izabella","Izaiah","Jabari","Jace","Jacey","Jacinthe","Jacinto","Jack","Jackeline","Jackie","Jacklyn","Jackson","Jacky","Jaclyn","Jacquelyn","Jacques","Jacynthe","Jada","Jade","Jaden","Jadon","Jadyn","Jaeden","Jaida","Jaiden","Jailyn","Jaime","Jairo","Jakayla","Jake","Jakob","Jaleel","Jalen","Jalon","Jalyn","Jamaal","Jamal","Jamar","Jamarcus","Jamel","Jameson","Jamey","Jamie","Jamil","Jamir","Jamison","Jammie","Jan","Jana","Janae","Jane","Janelle","Janessa","Janet","Janice","Janick","Janie","Janis","Janiya","Jannie","Jany","Jaquan","Jaquelin","Jaqueline","Jared","Jaren","Jarod","Jaron","Jarred","Jarrell","Jarret","Jarrett","Jarrod","Jarvis","Jasen","Jasmin","Jason","Jasper","Jaunita","Javier","Javon","Javonte","Jay","Jayce","Jaycee","Jayda","Jayde","Jayden","Jaydon","Jaylan","Jaylen","Jaylin","Jaylon","Jayme","Jayne","Jayson","Jazlyn","Jazmin","Jazmyn","Jazmyne","Jean","Jeanette","Jeanie","Jeanne","Jed","Jedediah","Jedidiah","Jeff","Jefferey","Jeffery","Jeffrey","Jeffry","Jena","Jenifer","Jennie","Jennifer","Jennings","Jennyfer","Jensen","Jerad","Jerald","Jeramie","Jeramy","Jerel","Jeremie","Jeremy","Jermain","Jermaine","Jermey","Jerod","Jerome","Jeromy","Jerrell","Jerrod","Jerrold","Jerry","Jess","Jesse","Jessica","Jessie","Jessika","Jessy","Jessyca","Jesus","Jett","Jettie","Jevon","Jewel","Jewell","Jillian","Jimmie","Jimmy","Jo","Joan","Joana","Joanie","Joanne","Joannie","Joanny","Joany","Joaquin","Jocelyn","Jodie","Jody","Joe","Joel","Joelle","Joesph","Joey","Johan","Johann","Johanna","Johathan","John","Johnathan","Johnathon","Johnnie","Johnny","Johnpaul","Johnson","Jolie","Jon","Jonas","Jonatan","Jonathan","Jonathon","Jordan","Jordane","Jordi","Jordon","Jordy","Jordyn","Jorge","Jose","Josefa","Josefina","Joseph","Josephine","Josh","Joshua","Joshuah","Josiah","Josiane","Josianne","Josie","Josue","Jovan","Jovani","Jovanny","Jovany","Joy","Joyce","Juana","Juanita","Judah","Judd","Jude","Judge","Judson","Judy","Jules","Julia","Julian","Juliana","Julianne","Julie","Julien","Juliet","Julio","Julius","June","Junior","Junius","Justen","Justice","Justina","Justine","Juston","Justus","Justyn","Juvenal","Juwan","Kacey","Kaci","Kacie","Kade","Kaden","Kadin","Kaela","Kaelyn","Kaia","Kailee","Kailey","Kailyn","Kaitlin","Kaitlyn","Kale","Kaleb","Kaleigh","Kaley","Kali","Kallie","Kameron","Kamille","Kamren","Kamron","Kamryn","Kane","Kara","Kareem","Karelle","Karen","Kari","Kariane","Karianne","Karina","Karine","Karl","Karlee","Karley","Karli","Karlie","Karolann","Karson","Kasandra","Kasey","Kassandra","Katarina","Katelin","Katelyn","Katelynn","Katharina","Katherine","Katheryn","Kathleen","Kathlyn","Kathryn","Kathryne","Katlyn","Katlynn","Katrina","Katrine","Kattie","Kavon","Kay","Kaya","Kaycee","Kayden","Kayla","Kaylah","Kaylee","Kayleigh","Kayley","Kayli","Kaylie","Kaylin","Keagan","Keanu","Keara","Keaton","Keegan","Keeley","Keely","Keenan","Keira","Keith","Kellen","Kelley","Kelli","Kellie","Kelly","Kelsi","Kelsie","Kelton","Kelvin","Ken","Kendall","Kendra","Kendrick","Kenna","Kennedi","Kennedy","Kenneth","Kennith","Kenny","Kenton","Kenya","Kenyatta","Kenyon","Keon","Keshaun","Keshawn","Keven","Kevin","Kevon","Keyon","Keyshawn","Khalid","Khalil","Kian","Kiana","Kianna","Kiara","Kiarra","Kiel","Kiera","Kieran","Kiley","Kim","Kimberly","King","Kip","Kira","Kirk","Kirsten","Kirstin","Kitty","Kobe","Koby","Kody","Kolby","Kole","Korbin","Korey","Kory","Kraig","Kris","Krista","Kristian","Kristin","Kristina","Kristofer","Kristoffer","Kristopher","Kristy","Krystal","Krystel","Krystina","Kurt","Kurtis","Kyla","Kyle","Kylee","Kyleigh","Kyler","Kylie","Kyra","Lacey","Lacy","Ladarius","Lafayette","Laila","Laisha","Lamar","Lambert","Lamont","Lance","Landen","Lane","Laney","Larissa","Laron","Larry","Larue","Laura","Laurel","Lauren","Laurence","Lauretta","Lauriane","Laurianne","Laurie","Laurine","Laury","Lauryn","Lavada","Lavern","Laverna","Laverne","Lavina","Lavinia","Lavon","Lavonne","Lawrence","Lawson","Layla","Layne","Lazaro","Lea","Leann","Leanna","Leanne","Leatha","Leda","Lee","Leif","Leila","Leilani","Lela","Lelah","Leland","Lelia","Lempi","Lemuel","Lenna","Lennie","Lenny","Lenora","Lenore","Leo","Leola","Leon","Leonard","Leonardo","Leone","Leonel","Leonie","Leonor","Leonora","Leopold","Leopoldo","Leora","Lera","Lesley","Leslie","Lesly","Lessie","Lester","Leta","Letha","Letitia","Levi","Lew","Lewis","Lexi","Lexie","Lexus","Lia","Liam","Liana","Libbie","Libby","Lila","Lilian","Liliana","Liliane","Lilla","Lillian","Lilliana","Lillie","Lilly","Lily","Lilyan","Lina","Lincoln","Linda","Lindsay","Lindsey","Linnea","Linnie","Linwood","Lionel","Lisa","Lisandro","Lisette","Litzy","Liza","Lizeth","Lizzie","Llewellyn","Lloyd","Logan","Lois","Lola","Lolita","Loma","Lon","London","Lonie","Lonnie","Lonny","Lonzo","Lora","Loraine","Loren","Lorena","Lorenz","Lorenza","Lorenzo","Lori","Lorine","Lorna","Lottie","Lou","Louie","Louisa","Lourdes","Louvenia","Lowell","Loy","Loyal","Loyce","Lucas","Luciano","Lucie","Lucienne","Lucile","Lucinda","Lucio","Lucious","Lucius","Lucy","Ludie","Ludwig","Lue","Luella","Luigi","Luis","Luisa","Lukas","Lula","Lulu","Luna","Lupe","Lura","Lurline","Luther","Luz","Lyda","Lydia","Lyla","Lynn","Lyric","Lysanne","Mabel","Mabelle","Mable","Mac","Macey","Maci","Macie","Mack","Mackenzie","Macy","Madaline","Madalyn","Maddison","Madeline","Madelyn","Madelynn","Madge","Madie","Madilyn","Madisen","Madison","Madisyn","Madonna","Madyson","Mae","Maegan","Maeve","Mafalda","Magali","Magdalen","Magdalena","Maggie","Magnolia","Magnus","Maia","Maida","Maiya","Major","Makayla","Makenna","Makenzie","Malachi","Malcolm","Malika","Malinda","Mallie","Mallory","Malvina","Mandy","Manley","Manuel","Manuela","Mara","Marc","Marcel","Marcelina","Marcelino","Marcella","Marcelle","Marcellus","Marcelo","Marcia","Marco","Marcos","Marcus","Margaret","Margarete","Margarett","Margaretta","Margarette","Margarita","Marge","Margie","Margot","Margret","Marguerite","Maria","Mariah","Mariam","Marian","Mariana","Mariane","Marianna","Marianne","Mariano","Maribel","Marie","Mariela","Marielle","Marietta","Marilie","Marilou","Marilyne","Marina","Mario","Marion","Marisa","Marisol","Maritza","Marjolaine","Marjorie","Marjory","Mark","Markus","Marlee","Marlen","Marlene","Marley","Marlin","Marlon","Marques","Marquis","Marquise","Marshall","Marta","Martin","Martina","Martine","Marty","Marvin","Mary","Maryam","Maryjane","Maryse","Mason","Mateo","Mathew","Mathias","Mathilde","Matilda","Matilde","Matt","Matteo","Mattie","Maud","Maude","Maudie","Maureen","Maurice","Mauricio","Maurine","Maverick","Mavis","Max","Maxie","Maxime","Maximilian","Maximillia","Maximillian","Maximo","Maximus","Maxine","Maxwell","May","Maya","Maybell","Maybelle","Maye","Maymie","Maynard","Mayra","Mazie","Mckayla","Mckenna","Mckenzie","Meagan","Meaghan","Meda","Megane","Meggie","Meghan","Mekhi","Melany","Melba","Melisa","Melissa","Mellie","Melody","Melvin","Melvina","Melyna","Melyssa","Mercedes","Meredith","Merl","Merle","Merlin","Merritt","Mertie","Mervin","Meta","Mia","Micaela","Micah","Michael","Michaela","Michale","Micheal","Michel","Michele","Michelle","Miguel","Mikayla","Mike","Mikel","Milan","Miles","Milford","Miller","Millie","Milo","Milton","Mina","Minerva","Minnie","Miracle","Mireille","Mireya","Misael","Missouri","Misty","Mitchel","Mitchell","Mittie","Modesta","Modesto","Mohamed","Mohammad","Mohammed","Moises","Mollie","Molly","Mona","Monica","Monique","Monroe","Monserrat","Monserrate","Montana","Monte","Monty","Morgan","Moriah","Morris","Mortimer","Morton","Mose","Moses","Moshe","Mossie","Mozell","Mozelle","Muhammad","Muriel","Murl","Murphy","Murray","Mustafa","Mya","Myah","Mylene","Myles","Myra","Myriam","Myrl","Myrna","Myron","Myrtice","Myrtie","Myrtis","Myrtle","Nadia","Nakia","Name","Nannie","Naomi","Naomie","Napoleon","Narciso","Nash","Nasir","Nat","Natalia","Natalie","Natasha","Nathan","Nathanael","Nathanial","Nathaniel","Nathen","Nayeli","Neal","Ned","Nedra","Neha","Neil","Nelda","Nella","Nelle","Nellie","Nels","Nelson","Neoma","Nestor","Nettie","Neva","Newell","Newton","Nia","Nicholas","Nicholaus","Nichole","Nick","Nicklaus","Nickolas","Nico","Nicola","Nicolas","Nicole","Nicolette","Nigel","Nikita","Nikki","Nikko","Niko","Nikolas","Nils","Nina","Noah","Noble","Noe","Noel","Noelia","Noemi","Noemie","Noemy","Nola","Nolan","Nona","Nora","Norbert","Norberto","Norene","Norma","Norris","Norval","Norwood","Nova","Novella","Nya","Nyah","Nyasia","Obie","Oceane","Ocie","Octavia","Oda","Odell","Odessa","Odie","Ofelia","Okey","Ola","Olaf","Ole","Olen","Oleta","Olga","Olin","Oliver","Ollie","Oma","Omari","Omer","Ona","Onie","Opal","Ophelia","Ora","Oral","Oran","Oren","Orie","Orin","Orion","Orland","Orlando","Orlo","Orpha","Orrin","Orval","Orville","Osbaldo","Osborne","Oscar","Osvaldo","Oswald","Oswaldo","Otha","Otho","Otilia","Otis","Ottilie","Ottis","Otto","Ova","Owen","Ozella","Pablo","Paige","Palma","Pamela","Pansy","Paolo","Paris","Parker","Pascale","Pasquale","Pat","Patience","Patricia","Patrick","Patsy","Pattie","Paul","Paula","Pauline","Paxton","Payton","Pearl","Pearlie","Pearline","Pedro","Peggie","Penelope","Percival","Percy","Perry","Pete","Peter","Petra","Peyton","Philip","Phoebe","Phyllis","Pierce","Pierre","Pietro","Pink","Pinkie","Piper","Polly","Porter","Precious","Presley","Preston","Price","Prince","Princess","Priscilla","Providenci","Prudence","Queen","Queenie","Quentin","Quincy","Quinn","Quinten","Quinton","Rachael","Rachel","Rachelle","Rae","Raegan","Rafael","Rafaela","Raheem","Rahsaan","Rahul","Raina","Raleigh","Ralph","Ramiro","Ramon","Ramona","Randal","Randall","Randi","Randy","Ransom","Raoul","Raphael","Raphaelle","Raquel","Rashad","Rashawn","Rasheed","Raul","Raven","Ray","Raymond","Raymundo","Reagan","Reanna","Reba","Rebeca","Rebecca","Rebeka","Rebekah","Reece","Reed","Reese","Regan","Reggie","Reginald","Reid","Reilly","Reina","Reinhold","Remington","Rene","Renee","Ressie","Reta","Retha","Retta","Reuben","Reva","Rex","Rey","Reyes","Reymundo","Reyna","Reynold","Rhea","Rhett","Rhianna","Rhiannon","Rhoda","Ricardo","Richard","Richie","Richmond","Rick","Rickey","Rickie","Ricky","Rico","Rigoberto","Riley","Rita","River","Robb","Robbie","Robert","Roberta","Roberto","Robin","Robyn","Rocio","Rocky","Rod","Roderick","Rodger","Rodolfo","Rodrick","Rodrigo","Roel","Rogelio","Roger","Rogers","Rolando","Rollin","Roma","Romaine","Roman","Ron","Ronaldo","Ronny","Roosevelt","Rory","Rosa","Rosalee","Rosalia","Rosalind","Rosalinda","Rosalyn","Rosamond","Rosanna","Rosario","Roscoe","Rose","Rosella","Roselyn","Rosemarie","Rosemary","Rosendo","Rosetta","Rosie","Rosina","Roslyn","Ross","Rossie","Rowan","Rowena","Rowland","Roxane","Roxanne","Roy","Royal","Royce","Rozella","Ruben","Rubie","Ruby","Rubye","Rudolph","Rudy","Rupert","Russ","Russel","Russell","Rusty","Ruth","Ruthe","Ruthie","Ryan","Ryann","Ryder","Rylan","Rylee","Ryleigh","Ryley","Sabina","Sabrina","Sabryna","Sadie","Sadye","Sage","Saige","Sallie","Sally","Salma","Salvador","Salvatore","Sam","Samanta","Samantha","Samara","Samir","Sammie","Sammy","Samson","Sandra","Sandrine","Sandy","Sanford","Santa","Santiago","Santina","Santino","Santos","Sarah","Sarai","Sarina","Sasha","Saul","Savanah","Savanna","Savannah","Savion","Scarlett","Schuyler","Scot","Scottie","Scotty","Seamus","Sean","Sebastian","Sedrick","Selena","Selina","Selmer","Serena","Serenity","Seth","Shad","Shaina","Shakira","Shana","Shane","Shanel","Shanelle","Shania","Shanie","Shaniya","Shanna","Shannon","Shanny","Shanon","Shany","Sharon","Shaun","Shawn","Shawna","Shaylee","Shayna","Shayne","Shea","Sheila","Sheldon","Shemar","Sheridan","Sherman","Sherwood","Shirley","Shyann","Shyanne","Sibyl","Sid","Sidney","Sienna","Sierra","Sigmund","Sigrid","Sigurd","Silas","Sim","Simeon","Simone","Sincere","Sister","Skye","Skyla","Skylar","Sofia","Soledad","Solon","Sonia","Sonny","Sonya","Sophia","Sophie","Spencer","Stacey","Stacy","Stan","Stanford","Stanley","Stanton","Stefan","Stefanie","Stella","Stephan","Stephania","Stephanie","Stephany","Stephen","Stephon","Sterling","Steve","Stevie","Stewart","Stone","Stuart","Summer","Sunny","Susan","Susana","Susanna","Susie","Suzanne","Sven","Syble","Sydnee","Sydney","Sydni","Sydnie","Sylvan","Sylvester","Sylvia","Tabitha","Tad","Talia","Talon","Tamara","Tamia","Tania","Tanner","Tanya","Tara","Taryn","Tate","Tatum","Tatyana","Taurean","Tavares","Taya","Taylor","Teagan","Ted","Telly","Terence","Teresa","Terrance","Terrell","Terrence","Terrill","Terry","Tess","Tessie","Tevin","Thad","Thaddeus","Thalia","Thea","Thelma","Theo","Theodora","Theodore","Theresa","Therese","Theresia","Theron","Thomas","Thora","Thurman","Tia","Tiana","Tianna","Tiara","Tierra","Tiffany","Tillman","Timmothy","Timmy","Timothy","Tina","Tito","Titus","Tobin","Toby","Tod","Tom","Tomas","Tomasa","Tommie","Toney","Toni","Tony","Torey","Torrance","Torrey","Toy","Trace","Tracey","Tracy","Travis","Travon","Tre","Tremaine","Tremayne","Trent","Trenton","Tressa","Tressie","Treva","Trever","Trevion","Trevor","Trey","Trinity","Trisha","Tristian","Tristin","Triston","Troy","Trudie","Trycia","Trystan","Turner","Twila","Tyler","Tyra","Tyree","Tyreek","Tyrel","Tyrell","Tyrese","Tyrique","Tyshawn","Tyson","Ubaldo","Ulices","Ulises","Una","Unique","Urban","Uriah","Uriel","Ursula","Vada","Valentin","Valentina","Valentine","Valerie","Vallie","Van","Vance","Vanessa","Vaughn","Veda","Velda","Vella","Velma","Velva","Vena","Verda","Verdie","Vergie","Verla","Verlie","Vern","Verna","Verner","Vernice","Vernie","Vernon","Verona","Veronica","Vesta","Vicenta","Vicente","Vickie","Vicky","Victor","Victoria","Vida","Vidal","Vilma","Vince","Vincent","Vincenza","Vincenzo","Vinnie","Viola","Violet","Violette","Virgie","Virgil","Virginia","Virginie","Vita","Vito","Viva","Vivian","Viviane","Vivianne","Vivien","Vivienne","Vladimir","Wade","Waino","Waldo","Walker","Wallace","Walter","Walton","Wanda","Ward","Warren","Watson","Wava","Waylon","Wayne","Webster","Weldon","Wellington","Wendell","Wendy","Werner","Westley","Weston","Whitney","Wilber","Wilbert","Wilburn","Wiley","Wilford","Wilfred","Wilfredo","Wilfrid","Wilhelm","Wilhelmine","Will","Willa","Willard","William","Willie","Willis","Willow","Willy","Wilma","Wilmer","Wilson","Wilton","Winfield","Winifred","Winnifred","Winona","Winston","Woodrow","Wyatt","Wyman","Xander","Xavier","Xzavier","Yadira","Yasmeen","Yasmin","Yasmine","Yazmin","Yesenia","Yessenia","Yolanda","Yoshiko","Yvette","Yvonne","Zachariah","Zachary","Zachery","Zack","Zackary","Zackery","Zakary","Zander","Zane","Zaria","Zechariah","Zelda","Zella","Zelma","Zena","Zetta","Zion","Zita","Zoe","Zoey","Zoie","Zoila","Zola","Zora","Zula"],female:["Ada","Adrienne","Agnes","Alberta","Alexandra","Alexis","Alice","Alicia","Alison","Allison","Alma","Alyssa","Amanda","Amber","Amelia","Amy","Ana","Andrea","Angel","Angela","Angelica","Angelina","Angie","Anita","Ann","Anna","Anne","Annette","Annie","Antoinette","Antonia","April","Arlene","Ashley","Audrey","Barbara","Beatrice","Becky","Belinda","Bernadette","Bernice","Bertha","Bessie","Beth","Bethany","Betsy","Betty","Beulah","Beverly","Billie","Blanca","Blanche","Bobbie","Bonnie","Brandi","Brandy","Brenda","Bridget","Brittany","Brooke","Camille","Candace","Candice","Carla","Carmen","Carol","Carole","Caroline","Carolyn","Carrie","Casey","Cassandra","Catherine","Cathy","Cecelia","Cecilia","Celia","Charlene","Charlotte","Chelsea","Cheryl","Christie","Christina","Christine","Christy","Cindy","Claire","Clara","Claudia","Colleen","Connie","Constance","Cora","Courtney","Cristina","Crystal","Cynthia","Daisy","Dana","Danielle","Darla","Darlene","Dawn","Deanna","Debbie","Deborah","Debra","Delia","Della","Delores","Denise","Desiree","Diana","Diane","Dianna","Dianne","Dixie","Dolores","Donna","Dora","Doreen","Doris","Dorothy","Ebony","Edith","Edna","Eileen","Elaine","Eleanor","Elena","Elisa","Elizabeth","Ella","Ellen","Eloise","Elsa","Elsie","Elvira","Emily","Emma","Erica","Erika","Erin","Erma","Ernestine","Essie","Estelle","Esther","Ethel","Eula","Eunice","Eva","Evelyn","Faith","Fannie","Faye","Felicia","Flora","Florence","Frances","Francis","Freda","Gail","Gayle","Geneva","Genevieve","Georgia","Geraldine","Gertrude","Gina","Ginger","Gladys","Glenda","Gloria","Grace","Gretchen","Guadalupe","Gwen","Gwendolyn","Hannah","Harriet","Hattie","Hazel","Heather","Heidi","Helen","Henrietta","Hilda","Holly","Hope","Ida","Inez","Irene","Iris","Irma","Isabel","Jackie","Jacqueline","Jacquelyn","Jaime","Jamie","Jan","Jana","Jane","Janet","Janice","Janie","Janis","Jasmine","Jean","Jeanette","Jeanne","Jeannette","Jeannie","Jenna","Jennie","Jennifer","Jenny","Jessica","Jessie","Jill","Jo","Joan","Joann","Joanna","Joanne","Jodi","Jody","Johanna","Johnnie","Josefina","Josephine","Joy","Joyce","Juana","Juanita","Judith","Judy","Julia","Julie","June","Kara","Karen","Kari","Karla","Kate","Katherine","Kathleen","Kathryn","Kathy","Katie","Katrina","Kay","Kayla","Kelley","Kelli","Kellie","Kelly","Kendra","Kerry","Kim","Kimberly","Krista","Kristen","Kristi","Kristie","Kristin","Kristina","Kristine","Kristy","Krystal","Lana","Latoya","Laura","Lauren","Laurie","Laverne","Leah","Lee","Leigh","Lela","Lena","Leona","Leslie","Leticia","Lila","Lillian","Lillie","Linda","Lindsay","Lindsey","Lisa","Lois","Lola","Lora","Lorena","Lorene","Loretta","Lori","Lorraine","Louise","Lucia","Lucille","Lucy","Lula","Luz","Lydia","Lynda","Lynette","Lynn","Lynne","Mabel","Mable","Madeline","Mae","Maggie","Mamie","Mandy","Marcella","Marcia","Margaret","Margarita","Margie","Marguerite","Maria","Marian","Marianne","Marie","Marilyn","Marion","Marjorie","Marlene","Marsha","Marta","Martha","Mary","Maryann","Mattie","Maureen","Maxine","May","Megan","Meghan","Melanie","Melba","Melinda","Melissa","Melody","Mercedes","Meredith","Michele","Michelle","Mildred","Mindy","Minnie","Miranda","Miriam","Misty","Molly","Mona","Monica","Monique","Muriel","Myra","Myrtle","Nadine","Nancy","Naomi","Natalie","Natasha","Nellie","Nettie","Nichole","Nicole","Nina","Nora","Norma","Olga","Olive","Olivia","Ollie","Opal","Ora","Pam","Pamela","Pat","Patricia","Patsy","Patti","Patty","Paula","Paulette","Pauline","Pearl","Peggy","Penny","Phyllis","Priscilla","Rachael","Rachel","Ramona","Raquel","Rebecca","Regina","Renee","Rhonda","Rita","Roberta","Robin","Robyn","Rochelle","Rosa","Rosalie","Rose","Rosemarie","Rosemary","Rosie","Roxanne","Ruby","Ruth","Sabrina","Sadie","Sally","Samantha","Sandra","Sandy","Sara","Sarah","Shannon","Shari","Sharon","Shawna","Sheila","Shelia","Shelley","Shelly","Sheri","Sherri","Sherry","Sheryl","Shirley","Silvia","Sonia","Sonja","Sonya","Sophia","Sophie","Stacey","Stacy","Stella","Stephanie","Sue","Susan","Susie","Suzanne","Sylvia","Tabitha","Tamara","Tami","Tammy","Tanya","Tara","Tasha","Teresa","Teri","Terri","Terry","Thelma","Theresa","Tiffany","Tina","Toni","Tonya","Tracey","Traci","Tracy","Tricia","Valerie","Vanessa","Velma","Vera","Verna","Veronica","Vicki","Vickie","Vicky","Victoria","Viola","Violet","Virginia","Vivian","Wanda","Wendy","Whitney","Willie","Wilma","Winifred","Yolanda","Yvette","Yvonne"],male:["Aaron","Abel","Abraham","Adam","Adrian","Al","Alan","Albert","Alberto","Alejandro","Alex","Alexander","Alfonso","Alfred","Alfredo","Allan","Allen","Alonzo","Alton","Alvin","Amos","Andre","Andres","Andrew","Andy","Angel","Angelo","Anthony","Antonio","Archie","Armando","Arnold","Arthur","Arturo","Aubrey","Austin","Barry","Ben","Benjamin","Bennie","Benny","Bernard","Bert","Bill","Billy","Blake","Bob","Bobby","Boyd","Brad","Bradford","Bradley","Brandon","Brendan","Brent","Brett","Brian","Bruce","Bryan","Bryant","Byron","Caleb","Calvin","Cameron","Carl","Carlos","Carlton","Carroll","Cary","Casey","Cecil","Cedric","Cesar","Chad","Charles","Charlie","Chester","Chris","Christian","Christopher","Clarence","Clark","Claude","Clay","Clayton","Clifford","Clifton","Clint","Clinton","Clyde","Cody","Colin","Conrad","Corey","Cornelius","Cory","Courtney","Craig","Curtis","Dale","Dallas","Damon","Dan","Dana","Daniel","Danny","Darin","Darnell","Darrel","Darrell","Darren","Darrin","Darryl","Daryl","Dave","David","Dean","Delbert","Dennis","Derek","Derrick","Devin","Dewey","Dexter","Domingo","Dominic","Dominick","Don","Donald","Donnie","Doug","Douglas","Doyle","Drew","Duane","Dustin","Dwayne","Dwight","Earl","Earnest","Ed","Eddie","Edgar","Edmond","Edmund","Eduardo","Edward","Edwin","Elbert","Elias","Elijah","Ellis","Elmer","Emanuel","Emilio","Emmett","Enrique","Eric","Erick","Erik","Ernest","Ernesto","Ervin","Eugene","Evan","Everett","Felipe","Felix","Fernando","Floyd","Forrest","Francis","Francisco","Frank","Frankie","Franklin","Fred","Freddie","Frederick","Fredrick","Gabriel","Garrett","Garry","Gary","Gene","Geoffrey","George","Gerald","Gerard","Gerardo","Gilbert","Gilberto","Glen","Glenn","Gordon","Grady","Grant","Greg","Gregg","Gregory","Guadalupe","Guillermo","Gustavo","Guy","Harold","Harry","Harvey","Hector","Henry","Herbert","Herman","Homer","Horace","Howard","Hubert","Hugh","Hugo","Ian","Ignacio","Ira","Irvin","Irving","Isaac","Ismael","Israel","Ivan","Jack","Jackie","Jacob","Jaime","Jake","James","Jamie","Jan","Jared","Jason","Javier","Jay","Jean","Jeff","Jeffery","Jeffrey","Jerald","Jeremiah","Jeremy","Jermaine","Jerome","Jerry","Jesse","Jessie","Jesus","Jim","Jimmie","Jimmy","Jody","Joe","Joel","Joey","John","Johnathan","Johnnie","Johnny","Jon","Jonathan","Jonathon","Jordan","Jorge","Jose","Joseph","Josh","Joshua","Juan","Julian","Julio","Julius","Justin","Karl","Keith","Kelly","Kelvin","Ken","Kenneth","Kenny","Kent","Kerry","Kevin","Kim","Kirk","Kristopher","Kurt","Kyle","Lamar","Lance","Larry","Laurence","Lawrence","Lee","Leland","Leo","Leon","Leonard","Leroy","Leslie","Lester","Levi","Lewis","Lionel","Lloyd","Lonnie","Loren","Lorenzo","Louis","Lowell","Lucas","Luis","Luke","Luther","Lyle","Lynn","Mack","Malcolm","Manuel","Marc","Marco","Marcos","Marcus","Mario","Marion","Mark","Marlon","Marshall","Martin","Marty","Marvin","Mathew","Matt","Matthew","Maurice","Max","Melvin","Merle","Michael","Micheal","Miguel","Mike","Milton","Mitchell","Morris","Moses","Myron","Nathan","Nathaniel","Neal","Neil","Nelson","Nicholas","Nick","Nicolas","Noah","Noel","Norman","Oliver","Omar","Orlando","Orville","Oscar","Otis","Owen","Pablo","Pat","Patrick","Paul","Pedro","Percy","Perry","Pete","Peter","Phil","Philip","Phillip","Preston","Rafael","Ralph","Ramiro","Ramon","Randal","Randall","Randolph","Randy","Raul","Ray","Raymond","Reginald","Rene","Rex","Ricardo","Richard","Rick","Rickey","Ricky","Robert","Roberto","Robin","Roderick","Rodney","Rodolfo","Rogelio","Roger","Roland","Rolando","Roman","Ron","Ronald","Ronnie","Roosevelt","Ross","Roy","Ruben","Rudolph","Rudy","Rufus","Russell","Ryan","Salvador","Salvatore","Sam","Sammy","Samuel","Santiago","Santos","Saul","Scott","Sean","Sergio","Seth","Shane","Shannon","Shaun","Shawn","Sheldon","Sherman","Sidney","Simon","Spencer","Stanley","Stephen","Steve","Steven","Stewart","Stuart","Sylvester","Taylor","Ted","Terence","Terrance","Terrell","Terrence","Terry","Theodore","Thomas","Tim","Timmy","Timothy","Toby","Todd","Tom","Tomas","Tommie","Tommy","Tony","Tracy","Travis","Trevor","Troy","Tyler","Tyrone","Van","Vernon","Victor","Vincent","Virgil","Wade","Wallace","Walter","Warren","Wayne","Wendell","Wesley","Wilbert","Wilbur","Wilfred","Willard","William","Willie","Willis","Wilson","Winston","Wm","Woodrow","Zachary"]},hr=["Agender","Androgyne","Androgynous","Bigender","Cis female","Cis male","Cis man","Cis woman","Cis","Cisgender female","Cisgender male","Cisgender man","Cisgender woman","Cisgender","Demi-boy","Demi-girl","Demi-man","Demi-woman","Demiflux","Demigender","F2M","FTM","Female to male trans man","Female to male transgender man","Female to male transsexual man","Female to male","Gender fluid","Gender neutral","Gender nonconforming","Gender questioning","Gender variant","Genderflux","Genderqueer","Hermaphrodite","Intersex man","Intersex person","Intersex woman","Intersex","M2F","MTF","Male to female trans woman","Male to female transgender woman","Male to female transsexual woman","Male to female","Man","Multigender","Neither","Neutrois","Non-binary","Omnigender","Other","Pangender","Polygender","T* man","T* woman","Trans female","Trans male","Trans man","Trans person","Trans woman","Trans","Transsexual female","Transsexual male","Transsexual man","Transsexual person","Transsexual woman","Transsexual","Transgender female","Transgender person","Transmasculine","Trigender","Two* person","Two-spirit person","Two-spirit","Woman","Xenogender"],mr=["Solutions","Program","Brand","Security","Research","Marketing","Directives","Implementation","Integration","Functionality","Response","Paradigm","Tactics","Identity","Markets","Group","Division","Applications","Optimization","Operations","Infrastructure","Intranet","Communications","Web","Branding","Quality","Assurance","Mobility","Accounts","Data","Creative","Configuration","Accountability","Interactions","Factors","Usability","Metrics"],pr=["Lead","Senior","Direct","Corporate","Dynamic","Future","Product","National","Regional","District","Central","Global","Customer","Investor","International","Legacy","Forward","Internal","Human","Chief","Principal"],Fr=["{{person.jobDescriptor}} {{person.jobArea}} {{person.jobType}}"],yr=["Supervisor","Associate","Executive","Liaison","Officer","Manager","Engineer","Specialist","Director","Coordinator","Administrator","Architect","Analyst","Designer","Planner","Orchestrator","Technician","Developer","Producer","Consultant","Assistant","Facilitator","Agent","Representative","Strategist"],gr={generic:["Abbott","Abernathy","Abshire","Adams","Altenwerth","Anderson","Ankunding","Armstrong","Auer","Aufderhar","Bahringer","Bailey","Balistreri","Barrows","Bartell","Bartoletti","Barton","Bashirian","Batz","Bauch","Baumbach","Bayer","Beahan","Beatty","Bechtelar","Becker","Bednar","Beer","Beier","Berge","Bergnaum","Bergstrom","Bernhard","Bernier","Bins","Blanda","Blick","Block","Bode","Boehm","Bogan","Bogisich","Borer","Bosco","Botsford","Boyer","Boyle","Bradtke","Brakus","Braun","Breitenberg","Brekke","Brown","Bruen","Buckridge","Carroll","Carter","Cartwright","Casper","Cassin","Champlin","Christiansen","Cole","Collier","Collins","Conn","Connelly","Conroy","Considine","Corkery","Cormier","Corwin","Cremin","Crist","Crona","Cronin","Crooks","Cruickshank","Cummerata","Cummings","D'Amore","Dach","Daniel","Dare","Daugherty","Davis","Deckow","Denesik","Dibbert","Dickens","Dicki","Dickinson","Dietrich","Donnelly","Dooley","Douglas","Doyle","DuBuque","Durgan","Ebert","Effertz","Emard","Emmerich","Erdman","Ernser","Fadel","Fahey","Farrell","Fay","Feeney","Feest","Feil","Ferry","Fisher","Flatley","Frami","Franecki","Franey","Friesen","Fritsch","Funk","Gerhold","Gerlach","Gibson","Gislason","Gleason","Gleichner","Glover","Goldner","Goodwin","Gorczany","Gottlieb","Goyette","Grady","Graham","Grant","Green","Greenfelder","Greenholt","Grimes","Gulgowski","Gusikowski","Gutkowski","Gutmann","Haag","Hackett","Hagenes","Hahn","Haley","Halvorson","Hamill","Hammes","Hand","Hane","Hansen","Harber","Harris","Hartmann","Harvey","Hauck","Hayes","Heaney","Heathcote","Hegmann","Heidenreich","Heller","Herman","Hermann","Hermiston","Herzog","Hessel","Hettinger","Hickle","Hilll","Hills","Hilpert","Hintz","Hirthe","Hodkiewicz","Hoeger","Homenick","Hoppe","Howe","Howell","Hudson","Huel","Huels","Hyatt","Jacobi","Jacobs","Jacobson","Jakubowski","Jaskolski","Jast","Jenkins","Jerde","Johns","Johnson","Johnston","Jones","Kassulke","Kautzer","Keebler","Keeling","Kemmer","Kerluke","Kertzmann","Kessler","Kiehn","Kihn","Kilback","King","Kirlin","Klein","Kling","Klocko","Koch","Koelpin","Koepp","Kohler","Konopelski","Koss","Kovacek","Kozey","Krajcik","Kreiger","Kris","Kshlerin","Kub","Kuhic","Kuhlman","Kuhn","Kulas","Kunde","Kunze","Kuphal","Kutch","Kuvalis","Labadie","Lakin","Lang","Langosh","Langworth","Larkin","Larson","Leannon","Lebsack","Ledner","Leffler","Legros","Lehner","Lemke","Lesch","Leuschke","Lind","Lindgren","Littel","Little","Lockman","Lowe","Lubowitz","Lueilwitz","Luettgen","Lynch","MacGyver","Macejkovic","Maggio","Mann","Mante","Marks","Marquardt","Marvin","Mayer","Mayert","McClure","McCullough","McDermott","McGlynn","McKenzie","McLaughlin","Medhurst","Mertz","Metz","Miller","Mills","Mitchell","Moen","Mohr","Monahan","Moore","Morar","Morissette","Mosciski","Mraz","Mueller","Muller","Murazik","Murphy","Murray","Nader","Nicolas","Nienow","Nikolaus","Nitzsche","Nolan","O'Connell","O'Conner","O'Hara","O'Keefe","O'Kon","O'Reilly","Oberbrunner","Okuneva","Olson","Ondricka","Orn","Ortiz","Osinski","Pacocha","Padberg","Pagac","Parisian","Parker","Paucek","Pfannerstill","Pfeffer","Pollich","Pouros","Powlowski","Predovic","Price","Prohaska","Prosacco","Purdy","Quigley","Quitzon","Rath","Ratke","Rau","Raynor","Reichel","Reichert","Reilly","Reinger","Rempel","Renner","Reynolds","Rice","Rippin","Ritchie","Robel","Roberts","Rodriguez","Rogahn","Rohan","Rolfson","Romaguera","Roob","Rosenbaum","Rowe","Ruecker","Runolfsdottir","Runolfsson","Runte","Russel","Rutherford","Ryan","Sanford","Satterfield","Sauer","Sawayn","Schaden","Schaefer","Schamberger","Schiller","Schimmel","Schinner","Schmeler","Schmidt","Schmitt","Schneider","Schoen","Schowalter","Schroeder","Schulist","Schultz","Schumm","Schuppe","Schuster","Senger","Shanahan","Shields","Simonis","Sipes","Skiles","Smith","Smitham","Spencer","Spinka","Sporer","Stamm","Stanton","Stark","Stehr","Steuber","Stiedemann","Stokes","Stoltenberg","Stracke","Streich","Stroman","Strosin","Swaniawski","Swift","Terry","Thiel","Thompson","Tillman","Torp","Torphy","Towne","Toy","Trantow","Tremblay","Treutel","Tromp","Turcotte","Turner","Ullrich","Upton","Vandervort","Veum","Volkman","Von","VonRueden","Waelchi","Walker","Walsh","Walter","Ward","Waters","Watsica","Weber","Wehner","Weimann","Weissnat","Welch","West","White","Wiegand","Wilderman","Wilkinson","Will","Williamson","Willms","Windler","Wintheiser","Wisoky","Wisozk","Witting","Wiza","Wolf","Wolff","Wuckert","Wunsch","Wyman","Yost","Yundt","Zboncak","Zemlak","Ziemann","Zieme","Zulauf"]},br={generic:[{value:"{{person.last_name.generic}}",weight:95},{value:"{{person.last_name.generic}}-{{person.last_name.generic}}",weight:5}]},fr={generic:["Addison","Alex","Anderson","Angel","Arden","August","Austin","Avery","Bailey","Billie","Blake","Bowie","Brooklyn","Cameron","Charlie","Corey","Dakota","Drew","Elliott","Ellis","Emerson","Finley","Gray","Greer","Harper","Hayden","Jaden","James","Jamie","Jordan","Jules","Kai","Kendall","Kennedy","Kyle","Leslie","Logan","London","Marlowe","Micah","Nico","Noah","North","Parker","Phoenix","Quinn","Reagan","Reese","Reign","Riley","River","Robin","Rory","Rowan","Ryan","Sage","Sasha","Sawyer","Shawn","Shiloh","Skyler","Taylor"],female:["Abigail","Adele","Alex","Alice","Alisha","Amber","Amelia","Amora","Anaïs","Angelou","Anika","Anise","Annabel","Anne","Aphrodite","Aretha","Arya","Ashton","Aster","Audrey","Avery","Bailee","Bay","Belle","Beth","Billie","Blair","Blaise","Blake","Blanche","Blue","Bree","Brielle","Brienne","Brooke","Caleen","Candice","Caprice","Carelyn","Caylen","Celine","Cerise","Cia","Claire","Claudia","Clementine","Coral","Coraline","Dahlia","Dakota","Dawn","Della","Demi","Denise","Denver","Devine","Devon","Diana","Dylan","Ebony","Eden","Eleanor","Elein","Elizabeth","Ellen","Elodie","Eloise","Ember","Emma","Erin","Eyre","Faith","Farrah","Fawn","Fayre","Fern","France","Francis","Frida","Genisis","Georgia","Grace","Gwen","Harley","Harper","Hazel","Helen","Hippolyta","Holly","Hope","Imani","Iowa","Ireland","Irene","Iris","Isa","Isla","Ivy","Jade","Jane","Jazz","Jean","Jess","Jett","Jo","Joan","Jolie","Jordan","Josie","Journey","Joy","Jules","Julien","Juliet","Juniper","Justice","Kali","Karma","Kat","Kate","Kennedy","Keva","Kylie","Lake","Lane","Lark","Layla","Lee","Leigh","Leona","Lexi","London","Lou","Louise","Love","Luna","Lux","Lynn","Lyric","Maddie","Mae","Marie","Matilda","Maude","Maybel","Meadow","Medusa","Mercy","Michelle","Mirabel","Monroe","Morgan","Nalia","Naomi","Nova","Olive","Paige","Parker","Pax","Pearl","Penelope","Phoenix","Quinn","Rae","Rain","Raven","Ray","Raye","Rebel","Reese","Reeve","Regan","Riley","River","Robin","Rory","Rose","Royal","Ruth","Rylie","Sage","Sam","Saturn","Scout","Serena","Sky","Skylar","Sofia","Sophia","Storm","Sue","Suzanne","Sydney","Taylen","Taylor","Teagan","Tempest","Tenley","Thea","Trinity","Valerie","Venus","Vera","Violet","Willow","Winter","Xena","Zaylee","Zion","Zoe"],male:["Ace","Aiden","Alexander","Ander","Anthony","Asher","August","Aziel","Bear","Beckham","Benjamin","Buddy","Calvin","Carter","Charles","Christopher","Clyde","Cooper","Daniel","David","Dior","Dylan","Elijah","Ellis","Emerson","Ethan","Ezra","Fletcher","Flynn","Gabriel","Grayson","Gus","Hank","Harrison","Hendrix","Henry","Houston","Hudson","Hugh","Isaac","Jack","Jackson","Jacob","Jakobe","James","Jaxon","Jaxtyn","Jayden","John","Joseph","Josiah","Jude","Julian","Karsyn","Kenji","Kobe","Kylo","Lennon","Leo","Levi","Liam","Lincoln","Logan","Louis","Lucas","Lucky","Luke","Mason","Mateo","Matthew","Maverick","Michael","Monroe","Nixon","Ocean","Oliver","Otis","Otto","Owen","Ozzy","Parker","Rocky","Samuel","Sebastian","Sonny","Teddy","Theo","Theodore","Thomas","Truett","Walter","Warren","Watson","William","Wison","Wyatt","Ziggy","Zyair"]},vr=[{value:"{{person.firstName}} {{person.lastName}}",weight:49},{value:"{{person.prefix}} {{person.firstName}} {{person.lastName}}",weight:7},{value:"{{person.firstName}} {{person.lastName}} {{person.suffix}}",weight:7},{value:"{{person.prefix}} {{person.firstName}} {{person.lastName}} {{person.suffix}}",weight:1}],Cr={generic:["Dr.","Miss","Mr.","Mrs.","Ms."],female:["Dr.","Miss","Mrs.","Ms."],male:["Dr.","Mr."]},kr=["female","male"],Sr=["Jr.","Sr.","I","II","III","IV","V","MD","DDS","PhD","DVM"],Er=["Aquarius","Pisces","Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn"],Ar={bio_part:sr,bio_pattern:ur,bio_supporter:cr,first_name:dr,gender:hr,job_area:mr,job_descriptor:pr,job_title_pattern:Fr,job_type:yr,last_name:gr,last_name_pattern:br,middle_name:fr,name:vr,prefix:Cr,sex:kr,suffix:Sr,western_zodiac_sign:Er},Dr=Ar,Br=["!##-!##-####","(!##) !##-####","1-!##-!##-####","!##.!##.####","!##-!##-#### x###","(!##) !##-#### x###","1-!##-!##-#### x###","!##.!##.#### x###","!##-!##-#### x####","(!##) !##-#### x####","1-!##-!##-#### x####","!##.!##.#### x####","!##-!##-#### x#####","(!##) !##-#### x#####","1-!##-!##-#### x#####","!##.!##.#### x#####"],wr=["+1!##!######"],Tr=["(!##) !##-####"],Mr={human:Br,international:wr,national:Tr},Lr=Mr,xr={format:Lr},Nr=xr,Rr=[{symbol:"H",name:"Hydrogen",atomicNumber:1},{symbol:"He",name:"Helium",atomicNumber:2},{symbol:"Li",name:"Lithium",atomicNumber:3},{symbol:"Be",name:"Beryllium",atomicNumber:4},{symbol:"B",name:"Boron",atomicNumber:5},{symbol:"C",name:"Carbon",atomicNumber:6},{symbol:"N",name:"Nitrogen",atomicNumber:7},{symbol:"O",name:"Oxygen",atomicNumber:8},{symbol:"F",name:"Fluorine",atomicNumber:9},{symbol:"Ne",name:"Neon",atomicNumber:10},{symbol:"Na",name:"Sodium",atomicNumber:11},{symbol:"Mg",name:"Magnesium",atomicNumber:12},{symbol:"Al",name:"Aluminium",atomicNumber:13},{symbol:"Si",name:"Silicon",atomicNumber:14},{symbol:"P",name:"Phosphorus",atomicNumber:15},{symbol:"S",name:"Sulfur",atomicNumber:16},{symbol:"Cl",name:"Chlorine",atomicNumber:17},{symbol:"Ar",name:"Argon",atomicNumber:18},{symbol:"K",name:"Potassium",atomicNumber:19},{symbol:"Ca",name:"Calcium",atomicNumber:20},{symbol:"Sc",name:"Scandium",atomicNumber:21},{symbol:"Ti",name:"Titanium",atomicNumber:22},{symbol:"V",name:"Vanadium",atomicNumber:23},{symbol:"Cr",name:"Chromium",atomicNumber:24},{symbol:"Mn",name:"Manganese",atomicNumber:25},{symbol:"Fe",name:"Iron",atomicNumber:26},{symbol:"Co",name:"Cobalt",atomicNumber:27},{symbol:"Ni",name:"Nickel",atomicNumber:28},{symbol:"Cu",name:"Copper",atomicNumber:29},{symbol:"Zn",name:"Zinc",atomicNumber:30},{symbol:"Ga",name:"Gallium",atomicNumber:31},{symbol:"Ge",name:"Germanium",atomicNumber:32},{symbol:"As",name:"Arsenic",atomicNumber:33},{symbol:"Se",name:"Selenium",atomicNumber:34},{symbol:"Br",name:"Bromine",atomicNumber:35},{symbol:"Kr",name:"Krypton",atomicNumber:36},{symbol:"Rb",name:"Rubidium",atomicNumber:37},{symbol:"Sr",name:"Strontium",atomicNumber:38},{symbol:"Y",name:"Yttrium",atomicNumber:39},{symbol:"Zr",name:"Zirconium",atomicNumber:40},{symbol:"Nb",name:"Niobium",atomicNumber:41},{symbol:"Mo",name:"Molybdenum",atomicNumber:42},{symbol:"Tc",name:"Technetium",atomicNumber:43},{symbol:"Ru",name:"Ruthenium",atomicNumber:44},{symbol:"Rh",name:"Rhodium",atomicNumber:45},{symbol:"Pd",name:"Palladium",atomicNumber:46},{symbol:"Ag",name:"Silver",atomicNumber:47},{symbol:"Cd",name:"Cadmium",atomicNumber:48},{symbol:"In",name:"Indium",atomicNumber:49},{symbol:"Sn",name:"Tin",atomicNumber:50},{symbol:"Sb",name:"Antimony",atomicNumber:51},{symbol:"Te",name:"Tellurium",atomicNumber:52},{symbol:"I",name:"Iodine",atomicNumber:53},{symbol:"Xe",name:"Xenon",atomicNumber:54},{symbol:"Cs",name:"Caesium",atomicNumber:55},{symbol:"Ba",name:"Barium",atomicNumber:56},{symbol:"La",name:"Lanthanum",atomicNumber:57},{symbol:"Ce",name:"Cerium",atomicNumber:58},{symbol:"Pr",name:"Praseodymium",atomicNumber:59},{symbol:"Nd",name:"Neodymium",atomicNumber:60},{symbol:"Pm",name:"Promethium",atomicNumber:61},{symbol:"Sm",name:"Samarium",atomicNumber:62},{symbol:"Eu",name:"Europium",atomicNumber:63},{symbol:"Gd",name:"Gadolinium",atomicNumber:64},{symbol:"Tb",name:"Terbium",atomicNumber:65},{symbol:"Dy",name:"Dysprosium",atomicNumber:66},{symbol:"Ho",name:"Holmium",atomicNumber:67},{symbol:"Er",name:"Erbium",atomicNumber:68},{symbol:"Tm",name:"Thulium",atomicNumber:69},{symbol:"Yb",name:"Ytterbium",atomicNumber:70},{symbol:"Lu",name:"Lutetium",atomicNumber:71},{symbol:"Hf",name:"Hafnium",atomicNumber:72},{symbol:"Ta",name:"Tantalum",atomicNumber:73},{symbol:"W",name:"Tungsten",atomicNumber:74},{symbol:"Re",name:"Rhenium",atomicNumber:75},{symbol:"Os",name:"Osmium",atomicNumber:76},{symbol:"Ir",name:"Iridium",atomicNumber:77},{symbol:"Pt",name:"Platinum",atomicNumber:78},{symbol:"Au",name:"Gold",atomicNumber:79},{symbol:"Hg",name:"Mercury",atomicNumber:80},{symbol:"Tl",name:"Thallium",atomicNumber:81},{symbol:"Pb",name:"Lead",atomicNumber:82},{symbol:"Bi",name:"Bismuth",atomicNumber:83},{symbol:"Po",name:"Polonium",atomicNumber:84},{symbol:"At",name:"Astatine",atomicNumber:85},{symbol:"Rn",name:"Radon",atomicNumber:86},{symbol:"Fr",name:"Francium",atomicNumber:87},{symbol:"Ra",name:"Radium",atomicNumber:88},{symbol:"Ac",name:"Actinium",atomicNumber:89},{symbol:"Th",name:"Thorium",atomicNumber:90},{symbol:"Pa",name:"Protactinium",atomicNumber:91},{symbol:"U",name:"Uranium",atomicNumber:92},{symbol:"Np",name:"Neptunium",atomicNumber:93},{symbol:"Pu",name:"Plutonium",atomicNumber:94},{symbol:"Am",name:"Americium",atomicNumber:95},{symbol:"Cm",name:"Curium",atomicNumber:96},{symbol:"Bk",name:"Berkelium",atomicNumber:97},{symbol:"Cf",name:"Californium",atomicNumber:98},{symbol:"Es",name:"Einsteinium",atomicNumber:99},{symbol:"Fm",name:"Fermium",atomicNumber:100},{symbol:"Md",name:"Mendelevium",atomicNumber:101},{symbol:"No",name:"Nobelium",atomicNumber:102},{symbol:"Lr",name:"Lawrencium",atomicNumber:103},{symbol:"Rf",name:"Rutherfordium",atomicNumber:104},{symbol:"Db",name:"Dubnium",atomicNumber:105},{symbol:"Sg",name:"Seaborgium",atomicNumber:106},{symbol:"Bh",name:"Bohrium",atomicNumber:107},{symbol:"Hs",name:"Hassium",atomicNumber:108},{symbol:"Mt",name:"Meitnerium",atomicNumber:109},{symbol:"Ds",name:"Darmstadtium",atomicNumber:110},{symbol:"Rg",name:"Roentgenium",atomicNumber:111},{symbol:"Cn",name:"Copernicium",atomicNumber:112},{symbol:"Nh",name:"Nihonium",atomicNumber:113},{symbol:"Fl",name:"Flerovium",atomicNumber:114},{symbol:"Mc",name:"Moscovium",atomicNumber:115},{symbol:"Lv",name:"Livermorium",atomicNumber:116},{symbol:"Ts",name:"Tennessine",atomicNumber:117},{symbol:"Og",name:"Oganesson",atomicNumber:118}],Pr=[{name:"meter",symbol:"m"},{name:"second",symbol:"s"},{name:"mole",symbol:"mol"},{name:"ampere",symbol:"A"},{name:"kelvin",symbol:"K"},{name:"candela",symbol:"cd"},{name:"kilogram",symbol:"kg"},{name:"radian",symbol:"rad"},{name:"hertz",symbol:"Hz"},{name:"newton",symbol:"N"},{name:"pascal",symbol:"Pa"},{name:"joule",symbol:"J"},{name:"watt",symbol:"W"},{name:"coulomb",symbol:"C"},{name:"volt",symbol:"V"},{name:"ohm",symbol:"Ω"},{name:"tesla",symbol:"T"},{name:"degree Celsius",symbol:"°C"},{name:"lumen",symbol:"lm"},{name:"becquerel",symbol:"Bq"},{name:"gray",symbol:"Gy"},{name:"sievert",symbol:"Sv"},{name:"steradian",symbol:"sr"},{name:"farad",symbol:"F"},{name:"siemens",symbol:"S"},{name:"weber",symbol:"Wb"},{name:"henry",symbol:"H"},{name:"lux",symbol:"lx"},{name:"katal",symbol:"kat"}],Hr={chemical_element:Rr,unit:Pr},Ir=Hr,Gr=["ants","bats","bears","bees","birds","buffalo","cats","chickens","cattle","dogs","dolphins","ducks","elephants","fishes","foxes","frogs","geese","goats","horses","kangaroos","lions","monkeys","owls","oxen","penguins","people","pigs","rabbits","sheep","tigers","whales","wolves","zebras","banshees","crows","black cats","chimeras","ghosts","conspirators","dragons","dwarves","elves","enchanters","exorcists","sons","foes","giants","gnomes","goblins","gooses","griffins","lycanthropes","nemesis","ogres","oracles","prophets","sorcerors","spiders","spirits","vampires","warlocks","vixens","werewolves","witches","worshipers","zombies","druids"],_r=["{{location.state}} {{team.creature}}"],Wr={creature:Gr,name:_r},Kr=Wr,$r=["Adventure Road Bicycle","BMX Bicycle","City Bicycle","Cruiser Bicycle","Cyclocross Bicycle","Dual-Sport Bicycle","Fitness Bicycle","Flat-Foot Comfort Bicycle","Folding Bicycle","Hybrid Bicycle","Mountain Bicycle","Recumbent Bicycle","Road Bicycle","Tandem Bicycle","Touring Bicycle","Track/Fixed-Gear Bicycle","Triathlon/Time Trial Bicycle","Tricycle"],Or=["Diesel","Electric","Gasoline","Hybrid"],zr=["Aston Martin","Audi","BMW","BYD","Bentley","Bugatti","Cadillac","Chevrolet","Chrysler","Citroën","Dodge","Ferrari","Fiat","Ford","Honda","Hyundai","Jaguar","Jeep","Kia","Lamborghini","Land Rover","MG","Mahindra & Mahindra","Maruti","Maserati","Mazda","Mercedes Benz","Mini","Mitsubishi","NIO","Nissan","Peugeot","Polestar","Porsche","Renault","Rivian","Rolls Royce","Skoda","Smart","Subaru","Suzuki","Tata","Tesla","Toyota","Vauxhall","Volkswagen","Volvo"],Jr=["1","2","911","A4","A8","ATS","Accord","Alpine","Altima","Aventador","Beetle","CTS","CX-9","Camaro","Camry","Challenger","Charger","Civic","Colorado","Corvette","Countach","Cruze","Durango","El Camino","Element","Escalade","Expedition","Explorer","F-150","Fiesta","Focus","Fortwo","Golf","Grand Caravan","Grand Cherokee","Impala","Jetta","Land Cruiser","LeBaron","Malibu","Model 3","Model S","Model T","Model X","Model Y","Murcielago","Mustang","PT Cruiser","Prius","Ranchero","Roadster","Sentra","Silverado","Spyder","Taurus","V90","Volt","Wrangler","XC90","XTS"],Vr=["Cargo Van","Convertible","Coupe","Crew Cab Pickup","Extended Cab Pickup","Hatchback","Minivan","Passenger Van","SUV","Sedan","Wagon"],jr={bicycle_type:$r,fuel:Or,manufacturer:zr,model:Jr,type:Vr},Yr=jr,qr=["abandoned","able","acceptable","acclaimed","accomplished","accurate","aching","acidic","actual","admired","adolescent","advanced","affectionate","afraid","aged","aggravating","aggressive","agile","agitated","agreeable","ajar","alarmed","alert","alienated","alive","all","altruistic","amazing","ambitious","ample","amused","angelic","anguished","animated","annual","another","antique","any","apprehensive","appropriate","apt","arid","artistic","ashamed","assured","astonishing","athletic","austere","authentic","authorized","avaricious","average","aware","awesome","awful","babyish","back","bad","baggy","bare","basic","beloved","beneficial","best","better","big","biodegradable","bitter","black","black-and-white","blank","blaring","bleak","blind","blond","blue","blushing","bogus","boiling","bony","boring","bossy","both","bouncy","bowed","brave","breakable","bright","brilliant","brisk","broken","brown","bruised","bulky","burdensome","burly","bustling","busy","buttery","buzzing","calculating","candid","carefree","careless","caring","cautious","cavernous","celebrated","charming","cheap","cheerful","chilly","chubby","circular","classic","clean","clear","clear-cut","close","closed","cloudy","clueless","clumsy","cluttered","coarse","colorful","colorless","colossal","comfortable","common","compassionate","competent","complete","complicated","concerned","concrete","confused","considerate","content","cool","cooperative","coordinated","corny","corrupt","courageous","courteous","crafty","crazy","creamy","creative","criminal","critical","crooked","crowded","cruel","crushing","cuddly","cultivated","cumbersome","curly","cute","damaged","damp","dapper","dark","darling","dazzling","dead","deadly","deafening","dearest","decent","decisive","deep","defenseless","defensive","deficient","definite","definitive","delectable","delicious","delirious","dense","dental","dependable","dependent","descriptive","deserted","determined","devoted","different","difficult","digital","diligent","dim","direct","dirty","discrete","disloyal","dismal","distant","distinct","distorted","doting","downright","drab","dramatic","dreary","dual","dull","dutiful","each","early","earnest","easy","ecstatic","edible","educated","elastic","elderly","electric","elegant","elementary","elliptical","eminent","emotional","empty","enchanted","enchanting","energetic","enlightened","enraged","entire","equatorial","essential","esteemed","ethical","everlasting","every","evil","exalted","excellent","excitable","excited","exhausted","exotic","expensive","experienced","expert","extra-large","extroverted","failing","faint","fair","fake","familiar","fantastic","far","far-flung","far-off","faraway","fat","fatal","fatherly","favorable","favorite","fearless","feline","filthy","fine","finished","firm","first","firsthand","fixed","flashy","flawed","flawless","flickering","flimsy","flowery","fluffy","flustered","focused","fond","foolhardy","foolish","forceful","formal","forsaken","fortunate","fragrant","frail","frank","free","french","frequent","friendly","frightened","frilly","frivolous","frizzy","front","frozen","frugal","fruitful","functional","funny","fussy","fuzzy","gaseous","general","gentle","genuine","gifted","gigantic","giving","glaring","glass","gleaming","glittering","gloomy","glorious","glossy","glum","golden","good","good-natured","gorgeous","graceful","gracious","grandiose","granular","grave","gray","great","greedy","grim","grimy","gripping","grizzled","grouchy","grounded","growing","grown","grubby","gruesome","grumpy","guilty","gullible","gummy","hairy","handsome","handy","happy","happy-go-lucky","hard-to-find","harmful","hasty","hateful","haunting","heartfelt","heavenly","heavy","hefty","helpful","helpless","hidden","hoarse","hollow","homely","honorable","honored","hopeful","hospitable","hot","huge","humble","humiliating","hungry","hurtful","husky","icy","ideal","idealistic","idolized","ignorant","ill","ill-fated","illiterate","illustrious","imaginary","imaginative","immaculate","immediate","immense","impartial","impassioned","impeccable","impish","impolite","important","impossible","impractical","impressionable","impressive","improbable","impure","inborn","incomparable","incomplete","inconsequential","indelible","indolent","inexperienced","infamous","infatuated","inferior","infinite","informal","innocent","insecure","insidious","insignificant","insistent","instructive","intelligent","intent","interesting","internal","international","intrepid","ironclad","irresponsible","jagged","jam-packed","jaunty","jealous","jittery","joyful","joyous","jubilant","judicious","juicy","jumbo","junior","juvenile","kaleidoscopic","key","knotty","knowledgeable","known","kooky","kosher","lanky","last","lasting","late","lavish","lawful","lazy","leading","lean","left","legal","light","lighthearted","likable","likely","limited","limp","limping","linear","lined","liquid","little","live","lively","livid","lone","lonely","long","long-term","lost","lovable","lovely","low","lucky","lumbering","lumpy","lustrous","mad","made-up","magnificent","majestic","major","male","mammoth","married","marvelous","massive","mature","meager","mealy","mean","measly","meaty","mediocre","medium","memorable","menacing","merry","messy","metallic","mild","milky","mindless","minor","minty","miserable","miserly","misguided","mixed","moist","monstrous","monthly","monumental","moral","motionless","muddy","muffled","multicolored","mundane","murky","mushy","musty","muted","mysterious","narrow","natural","naughty","nautical","near","neat","necessary","needy","negative","neglected","negligible","neighboring","nervous","new","next","nice","nifty","nimble","nippy","nocturnal","normal","noted","noteworthy","noxious","numb","nutritious","obedient","oblong","obvious","odd","oddball","official","oily","old","old-fashioned","only","optimal","optimistic","orange","orderly","ordinary","ornate","ornery","other","our","outgoing","outlandish","outlying","outrageous","outstanding","oval","overcooked","overdue","palatable","pale","paltry","parallel","parched","partial","passionate","pastel","peaceful","peppery","perfumed","perky","personal","pertinent","pessimistic","petty","phony","physical","pink","pitiful","plain","pleasant","pleased","pleasing","plump","pointed","pointless","polished","polite","political","poor","portly","posh","possible","potable","powerful","powerless","practical","precious","present","prestigious","pretty","pricey","prickly","primary","prime","private","probable","productive","profitable","profuse","proper","proud","prudent","punctual","puny","pure","purple","pushy","putrid","puzzled","qualified","quarrelsome","quarterly","queasy","querulous","questionable","quick","quick-witted","quiet","quintessential","quixotic","radiant","ragged","rapid","rare","raw","realistic","reasonable","recent","reckless","rectangular","red","reflecting","regal","regular","remarkable","remorseful","repentant","respectful","responsible","rewarding","rich","right","rigid","ripe","roasted","robust","rosy","rotating","rotten","rough","round","rowdy","royal","rubbery","ruddy","rundown","runny","rural","rusty","sad","salty","same","sandy","sarcastic","sardonic","scaly","scared","scary","scented","scientific","scornful","scratchy","second","second-hand","secondary","secret","self-assured","self-reliant","selfish","sentimental","separate","serene","serpentine","severe","shabby","shadowy","shady","shallow","shameful","shameless","shimmering","shiny","shocked","shoddy","short","short-term","showy","shrill","shy","sick","silent","silky","silver","similar","simple","simplistic","sinful","sizzling","skeletal","sleepy","slight","slimy","slow","slushy","small","smart","smoggy","smooth","smug","snappy","snarling","sneaky","sniveling","snoopy","sociable","soft","soggy","somber","some","sophisticated","sore","sorrowful","soulful","soupy","sour","spanish","sparkling","sparse","specific","speedy","spherical","spiffy","spirited","spiteful","splendid","spotless","square","squeaky","squiggly","stable","staid","stained","stale","standard","stark","steel","steep","sticky","stiff","stingy","stormy","straight","strange","strict","strident","striking","strong","stunning","stupendous","sturdy","stylish","subdued","submissive","substantial","subtle","suburban","sudden","sugary","sunny","super","superb","superficial","superior","supportive","sure-footed","surprised","svelte","sweet","swift","talkative","tall","tame","tangible","tasty","tattered","taut","tedious","teeming","tempting","tender","tense","tepid","terrible","that","these","thick","thin","thorny","thorough","those","thrifty","tidy","tight","timely","tinted","tiny","tired","torn","total","tough","tragic","trained","triangular","tricky","trim","trivial","troubled","true","trusting","trustworthy","trusty","turbulent","twin","ugly","ultimate","unaware","uncomfortable","uncommon","unconscious","understated","uneven","unfinished","unfit","unfortunate","unhappy","unhealthy","uniform","unimportant","unique","unkempt","unknown","unlawful","unlined","unlucky","unpleasant","unrealistic","unripe","unruly","unselfish","unsightly","unsteady","unsung","untidy","untimely","untried","untrue","unused","unusual","unwelcome","unwieldy","unwilling","unwritten","upbeat","upright","upset","urban","usable","useless","utilized","utter","vague","vain","valuable","variable","vast","velvety","vengeful","vibrant","victorious","violent","vivacious","vivid","voluminous","warlike","warm","warmhearted","warped","wasteful","waterlogged","watery","wavy","wealthy","weary","webbed","wee","weekly","weighty","weird","well-documented","well-groomed","well-lit","well-made","well-off","well-to-do","well-worn","which","whimsical","whirlwind","whispered","white","whole","whopping","wicked","wide","wide-eyed","wiggly","willing","wilted","winding","windy","winged","wise","witty","wobbly","woeful","wonderful","wordy","worldly","worse","worst","worthless","worthwhile","worthy","wrathful","wretched","writhing","wrong","wry","yearly","yellow","yellowish","young","youthful","yummy","zany","zealous","zesty"],Ur=["abnormally","absentmindedly","accidentally","acidly","actually","adventurously","afterwards","almost","always","angrily","annually","anxiously","arrogantly","awkwardly","badly","bashfully","beautifully","bitterly","bleakly","blindly","blissfully","boastfully","boldly","bravely","briefly","brightly","briskly","broadly","busily","calmly","carefully","carelessly","cautiously","certainly","cheerfully","clearly","cleverly","closely","coaxingly","colorfully","commonly","continually","coolly","correctly","courageously","crossly","cruelly","curiously","daily","daintily","dearly","deceivingly","deeply","defiantly","deliberately","delightfully","diligently","dimly","doubtfully","dreamily","easily","elegantly","energetically","enormously","enthusiastically","equally","especially","even","evenly","eventually","exactly","excitedly","extremely","fairly","faithfully","famously","far","fast","fatally","ferociously","fervently","fiercely","fondly","foolishly","fortunately","frankly","frantically","freely","frenetically","frightfully","fully","furiously","generally","generously","gently","gladly","gleefully","gracefully","gratefully","greatly","greedily","happily","hastily","healthily","heavily","helpfully","helplessly","highly","honestly","hopelessly","hourly","hungrily","immediately","innocently","inquisitively","instantly","intensely","intently","interestingly","inwardly","irritably","jaggedly","jealously","joshingly","jovially","joyfully","joyously","jubilantly","judgementally","justly","keenly","kiddingly","kindheartedly","kindly","kissingly","knavishly","knottily","knowingly","knowledgeably","kookily","lazily","less","lightly","likely","limply","lively","loftily","longingly","loosely","loudly","lovingly","loyally","madly","majestically","meaningfully","mechanically","merrily","miserably","mockingly","monthly","more","mortally","mostly","mysteriously","naturally","nearly","neatly","needily","nervously","never","nicely","noisily","not","obediently","obnoxiously","oddly","offensively","officially","often","only","openly","optimistically","overconfidently","owlishly","painfully","partially","patiently","perfectly","physically","playfully","politely","poorly","positively","potentially","powerfully","promptly","properly","punctually","quaintly","quarrelsomely","queasily","questionably","questioningly","quicker","quickly","quietly","quirkily","quizzically","rapidly","rarely","readily","really","reassuringly","recklessly","regularly","reluctantly","repeatedly","reproachfully","restfully","righteously","rightfully","rigidly","roughly","rudely","sadly","safely","scarcely","scarily","searchingly","sedately","seemingly","seldom","selfishly","separately","seriously","shakily","sharply","sheepishly","shrilly","shyly","silently","sleepily","slowly","smoothly","softly","solemnly","solidly","sometimes","soon","speedily","stealthily","sternly","strictly","successfully","suddenly","surprisingly","suspiciously","sweetly","swiftly","sympathetically","tenderly","tensely","terribly","thankfully","thoroughly","thoughtfully","tightly","tomorrow","too","tremendously","triumphantly","truly","truthfully","ultimately","unabashedly","unaccountably","unbearably","unethically","unexpectedly","unfortunately","unimpressively","unnaturally","unnecessarily","upbeat","upliftingly","upright","upside-down","upward","upwardly","urgently","usefully","uselessly","usually","utterly","vacantly","vaguely","vainly","valiantly","vastly","verbally","very","viciously","victoriously","violently","vivaciously","voluntarily","warmly","weakly","wearily","well","wetly","wholly","wildly","willfully","wisely","woefully","wonderfully","worriedly","wrongly","yawningly","yearly","yearningly","yesterday","yieldingly","youthfully"],Zr=["after","although","and","as","because","before","but","consequently","even","finally","for","furthermore","hence","how","however","if","inasmuch","incidentally","indeed","instead","lest","likewise","meanwhile","nor","now","once","or","provided","since","so","supposing","than","that","though","till","unless","until","what","when","whenever","where","whereas","wherever","whether","which","while","who","whoever","whose","why","yet"],Xr=["yuck","oh","phooey","blah","boo","whoa","yowza","huzzah","boohoo","fooey","geez","pfft","ew","ah","yum","brr","hm","yahoo","aha","woot","drat","gah","meh","psst","aw","ugh","yippee","eek","gee","bah","gadzooks","duh","ha","mmm","ouch","phew","ack","uh-huh","gosh","hmph","pish","zowie","er","ick","oof","um"],Qr=["CD","SUV","abacus","academics","accelerator","accompanist","account","accountability","acquaintance","ad","adaptation","address","adrenalin","adult","advancement","advertisement","adviser","affect","affiliate","aftermath","agreement","airbus","aircraft","airline","airmail","airman","airport","alb","alert","allegation","alliance","alligator","allocation","almighty","amendment","amnesty","analogy","angle","annual","antelope","anticodon","apparatus","appliance","approach","apricot","arcade","archaeology","armchair","armoire","asset","assist","atrium","attraction","availability","avalanche","awareness","babushka","backbone","backburn","bakeware","bandwidth","bar","barge","baritone","barracks","baseboard","basket","bathhouse","bathrobe","battle","begonia","behest","bell","bench","bend","beret","best-seller","bid","bidet","bin","birdbath","birdcage","birth","blight","blossom","blowgun","bob","bog","bonfire","bonnet","bookcase","bookend","boulevard","bourgeoisie","bowler","bowling","boyfriend","brace","bracelet","bran","breastplate","brief","brochure","brook","brush","bug","bump","bungalow","cafe","cake","calculus","cannon","cantaloupe","cap","cappelletti","captain","caption","carboxyl","cardboard","carnival","case","casement","cash","casket","cassava","castanet","catalyst","cauliflower","cellar","celsius","cemetery","ceramic","ceramics","certification","chainstay","chairperson","challenge","championship","chap","chapel","character","characterization","charlatan","charm","chasuble","cheese","cheetah","chiffonier","chops","chow","cinder","cinema","circumference","citizen","clamp","clavicle","cleaner","climb","co-producer","coal","coast","cod","coil","coin","coliseum","collaboration","collectivization","colon","colonialism","comestible","commercial","commodity","community","comparison","completion","complication","compromise","concentration","configuration","confusion","conservation","conservative","consistency","contractor","contrail","convection","conversation","cook","coordination","cop-out","cope","cork","cornet","corporation","corral","cosset","costume","couch","council","councilman","countess","courtroom","cow","creator","creature","crest","cricket","crocodile","cross-contamination","cruelty","cuckoo","curl","custody","custom","cutlet","cutover","cycle","daddy","dandelion","dash","daughter","dead","decision","deck","declaration","decongestant","decryption","deduction","deed","deer","defendant","density","department","dependency","deployment","depot","derby","descendant","descent","design","designation","desk","detective","devastation","developing","developmental","devil","diagram","digestive","digit","dime","director","disadvantage","disappointment","disclosure","disconnection","discourse","dish","disk","disposer","distinction","diver","diversity","dividend","divine","doing","doorpost","doubter","draft","draw","dream","dredger","dress","drive","drug","duffel","dulcimer","dusk","duster","dwell","e-mail","earth","ecliptic","ectoderm","edge","editor","effector","eggplant","electronics","elevation","elevator","elver","embarrassment","embossing","emergent","encouragement","entry","epic","equal","essence","eternity","ethyl","euphonium","event","exasperation","excess","executor","exhaust","expansion","expense","experience","exploration","extension","extent","exterior","eyebrow","eyeliner","farm","farmer","fat","fax","feather","fedora","fellow","fen","fencing","ferret","festival","fibre","filter","final","finding","finer","finger","fireplace","fisherman","fishery","fit","flame","flat","fledgling","flight","flint","flood","flu","fog","fold","folklore","follower","following","foodstuffs","footrest","forage","forager","forgery","fork","formamide","formation","formula","fort","fowl","fraudster","freckle","freezing","freight","fuel","fun","fund","fundraising","futon","gallery","galoshes","gastropod","gazebo","gerbil","ghost","giant","gift","giggle","glider","gloom","goat","godfather","godparent","going","goodwill","governance","government","gown","gradient","graffiti","grandpa","grandson","granny","grass","gray","gripper","grouper","guacamole","guard","guidance","guide","gym","gymnast","habit","haircut","halt","hamburger","hammock","handful","handle","handover","harp","haversack","hawk","heartache","heartbeat","heating","hello","help","hepatitis","heroine","hexagon","hierarchy","hippodrome","honesty","hoof","hope","horde","hornet","horst","hose","hospitalization","hovel","hovercraft","hubris","humidity","humor","hundred","hunger","hunt","husband","hutch","hydrant","hydrocarbon","hydrolyse","hydrolyze","hyena","hygienic","hyphenation","ice-cream","icebreaker","igloo","ignorance","illusion","impact","import","importance","impostor","in-joke","incandescence","independence","individual","information","injunction","innovation","insolence","inspection","instance","institute","instruction","instructor","integer","intellect","intent","interchange","interior","intervention","interviewer","invite","iridescence","issue","jacket","jazz","jellyfish","jet","jogging","joy","juggernaut","jump","jungle","junior","jury","kettledrum","kick","kielbasa","kinase","king","kiss","kit","knickers","knight","knitting","knuckle","label","labourer","lace","lady","lamp","language","larva","lashes","laughter","lava","lawmaker","lay","leading","league","legend","legging","legislature","lender","license","lid","lieu","lifestyle","lift","linseed","litter","loaf","lobster","longboat","lotion","lounge","louse","lox","loyalty","luck","lyre","maestro","mainstream","maintainer","majority","makeover","making","mallard","management","manner","mantua","marathon","march","marimba","marketplace","marksman","markup","marten","massage","masterpiece","mathematics","meadow","meal","meander","meatloaf","mechanic","median","membership","mentor","merit","metabolite","metal","middle","midwife","milestone","millet","minion","minister","minor","minority","mixture","mobility","molasses","mom","moment","monasticism","monocle","monster","morbidity","morning","mortise","mountain","mouser","mousse","mozzarella","muscat","mythology","napkin","necklace","nectarine","negotiation","nephew","nerve","netsuke","newsletter","newsprint","newsstand","nightlife","noon","nougat","nucleotidase","nudge","numeracy","numeric","nun","obedience","obesity","object","obligation","ocelot","octave","offset","oil","omelet","onset","opera","operating","optimal","orchid","order","ostrich","other","outlaw","outrun","outset","overcoat","overheard","overload","ownership","pacemaker","packaging","paintwork","palate","pants","pantyhose","papa","parade","parsnip","partridge","passport","pasta","patroller","pear","pearl","pecan","pendant","peninsula","pension","peony","pepper","perfection","permafrost","perp","petal","petticoat","pharmacopoeia","phrase","pick","piglet","pigpen","pigsty","pile","pillbox","pillow","pilot","pine","pinstripe","place","plain","planula","plastic","platter","platypus","pleasure","pliers","plugin","plumber","pneumonia","pocket-watch","poetry","polarisation","polyester","pomelo","pop","poppy","popularity","populist","porter","possession","postbox","precedent","premeditation","premier","premise","premium","pressure","presume","priesthood","printer","privilege","procurement","produce","programme","prohibition","promise","pronoun","providence","provider","provision","publication","publicity","pulse","punctuation","pupil","puppet","puritan","quart","quinoa","quit","railway","range","rationale","ravioli","rawhide","reach","reasoning","reboot","receptor","recommendation","reconsideration","recovery","redesign","relative","release","remark","reorganisation","repeat","replacement","reporter","representation","republican","request","requirement","reservation","resolve","resource","responsibility","restaurant","retention","retrospectivity","reward","ribbon","rim","riser","roadway","role","rosemary","roundabout","rubric","ruin","rule","runway","rust","safe","sailor","saloon","sand","sandbar","sanity","sarong","sauerkraut","saw","scaffold","scale","scarification","scenario","schedule","schnitzel","scholarship","scorn","scorpion","scout","scrap","scratch","seafood","seagull","seal","season","secrecy","secret","section","sediment","self-confidence","sermon","sesame","settler","shadowbox","shark","shipper","shore","shoulder","sideboard","siege","sightseeing","signature","silk","simple","singing","skean","skeleton","skyline","skyscraper","slide","slime","slipper","smog","smoke","sock","soliloquy","solution","solvency","someplace","sonar","sonata","sonnet","soup","soybean","space","spear","spirit","spork","sport","spring","sprinkles","squid","stall","starboard","statue","status","stay","steak","steeple","step","step-mother","sticker","stir-fry","stitcher","stock","stool","story","strait","stranger","strategy","straw","stump","subexpression","submitter","subsidy","substitution","suitcase","summary","summer","sunbeam","sundae","supplier","surface","sushi","suspension","sustenance","swanling","swath","sweatshop","swim","swine","swing","switch","switchboard","swordfish","synergy","t-shirt","tabletop","tackle","tail","tapioca","taro","tarragon","taxicab","teammate","technician","technologist","tectonics","tenant","tenement","tennis","tentacle","teriyaki","term","testimonial","testing","thigh","thongs","thorn","thread","thunderbolt","thyme","tinderbox","toaster","tomatillo","tomb","tomography","tool","tooth","toothbrush","toothpick","topsail","traditionalism","traffic","translation","transom","transparency","trash","travel","tray","trench","tribe","tributary","trick","trolley","tuba","tuber","tune-up","turret","tusk","tuxedo","typeface","typewriter","unblinking","underneath","underpants","understanding","unibody","unique","unit","utilization","valentine","validity","valley","valuable","vanadyl","vein","velocity","venom","version","verve","vestment","veto","viability","vibraphone","vibration","vicinity","video","violin","vision","vista","vol","volleyball","wafer","waist","wallaby","warming","wasabi","waterspout","wear","wedding","whack","whale","wheel","widow","wilderness","willow","window","wombat","word","worth","wriggler","yak","yarmulke","yeast","yin","yogurt","zebra","zen"],ei=["a","abaft","aboard","about","above","absent","across","afore","after","against","along","alongside","amid","amidst","among","amongst","an","anenst","anti","apropos","apud","around","as","aside","astride","at","athwart","atop","barring","before","behind","below","beneath","beside","besides","between","beyond","but","by","circa","concerning","considering","despite","down","during","except","excepting","excluding","failing","following","for","forenenst","from","given","in","including","inside","into","lest","like","mid","midst","minus","modulo","near","next","notwithstanding","of","off","on","onto","opposite","out","outside","over","pace","past","per","plus","pro","qua","regarding","round","sans","save","since","than","the","through","throughout","till","times","to","toward","towards","under","underneath","unlike","until","unto","up","upon","versus","via","vice","with","within","without","worth"],ai=["abnegate","abscond","abseil","absolve","accentuate","accept","access","accessorise","accompany","account","accredit","achieve","acknowledge","acquire","adjourn","adjudge","admonish","adumbrate","advocate","afford","airbrush","ameliorate","amend","amount","anaesthetise","analyse","anesthetize","anneal","annex","antagonize","ape","apologise","apostrophize","appertain","appreciate","appropriate","approximate","arbitrate","archive","arraign","arrange","ascertain","ascribe","assail","atomize","attend","attest","attribute","augment","avow","axe","baa","banish","bank","baptise","battle","beard","beep","behold","belabor","bemuse","besmirch","bestride","better","bewail","bicycle","bide","bind","biodegrade","blacken","blaspheme","bleach","blend","blink","bliss","bloom","bludgeon","bobble","boggle","bolster","book","boom","bootleg","border","bore","boss","braid","brand","brandish","break","breed","broadcast","broadside","brood","browse","buck","burgeon","bus","butter","buzzing","camouflage","cannibalise","canter","cap","capitalise","capitalize","capsize","card","carouse","carp","carpool","catalog","catalyze","catch","categorise","cease","celebrate","censor","certify","char","charter","chase","chatter","chime","chip","christen","chromakey","chunder","chunter","cinch","circle","circulate","circumnavigate","clamor","clamour","claw","cleave","clinch","clinking","clone","clonk","coagulate","coexist","coincide","collaborate","colligate","colorize","colour","comb","come","commandeer","commemorate","communicate","compete","conceal","conceptualize","conclude","concrete","condense","cone","confide","confirm","confiscate","confound","confute","congregate","conjecture","connect","consign","construe","contradict","contrast","contravene","controvert","convalesce","converse","convince","convoke","coop","cop","corner","covenant","cow","crackle","cram","crank","creak","creaking","cripple","croon","cross","crumble","crystallize","culminate","culture","curry","curse","customise","cycle","dally","dampen","darn","debit","debut","decide","decode","decouple","decriminalize","deduce","deduct","deflate","deflect","deform","defrag","degenerate","degrease","delete","delight","deliquesce","demob","demobilise","democratize","demonstrate","denitrify","deny","depart","depend","deplore","deploy","deprave","depute","dereference","describe","desecrate","deselect","destock","detain","develop","devise","dial","dicker","digitize","dilate","disapprove","disarm","disbar","discontinue","disgorge","dishearten","dishonor","disinherit","dislocate","dispense","display","dispose","disrespect","dissemble","ditch","divert","dock","doodle","downchange","downshift","dowse","draft","drag","drain","dramatize","drowse","drum","dwell","economise","edge","efface","egg","eke","electrify","embalm","embed","embody","emboss","emerge","emphasise","emphasize","emulsify","encode","endow","enfold","engage","engender","enhance","enlist","enrage","enrich","enroll","entice","entomb","entrench","entwine","equate","essay","etch","eulogise","even","evince","exacerbate","exaggerate","exalt","exempt","exonerate","expatiate","explode","expostulate","extract","extricate","eyeglasses","fabricate","facilitate","factorise","factorize","fail","fall","familiarize","fashion","father","fathom","fax","federate","feminize","fence","fess","fictionalize","fiddle","fidget","fill","flash","fleck","flight","floodlight","floss","fluctuate","fluff","fly","focalise","foot","forearm","forecast","foretell","forgather","forgo","fork","form","forswear","founder","fraternise","fray","frizz","fumigate","function","furlough","fuss","gad","gallivant","galvanize","gape","garage","garrote","gasp","gestate","give","glimmer","glisten","gloat","gloss","glow","gnash","gnaw","goose","govern","grade","graduate","graft","grok","guest","guilt","gulp","gum","gurn","gust","gut","guzzle","ham","harangue","harvest","hassle","haul","haze","headline","hearten","heighten","highlight","hoick","hold","hole","hollow","holster","home","homeschool","hoot","horn","horse","hotfoot","house","hover","howl","huddle","huff","hunger","hunt","husk","hype","hypothesise","hypothesize","idle","ignite","imagineer","impact","impanel","implode","incinerate","incline","inculcate","industrialize","ingratiate","inhibit","inject","innovate","inscribe","insert","insist","inspect","institute","institutionalize","intend","intermarry","intermesh","intermix","internalise","internalize","internationalize","intrigue","inure","inveigle","inventory","investigate","irk","iterate","jaywalk","jell","jeopardise","jiggle","jive","joint","jot","jut","keel","knife","knit","know","kowtow","lack","lampoon","large","leap","lecture","legitimize","lend","libel","liberalize","license","ligate","list","lobotomise","lock","log","loose","low","lowball","machine","magnetize","major","make","malfunction","manage","manipulate","maroon","masculinize","mash","mask","masquerade","massage","masticate","materialise","matter","maul","memorise","merge","mesh","metabolise","microblog","microchip","micromanage","militate","mill","minister","minor","misappropriate","miscalculate","misfire","misjudge","miskey","mismatch","mispronounce","misread","misreport","misspend","mob","mobilise","mobilize","moisten","mooch","moor","moralise","mortar","mosh","mothball","motivate","motor","mould","mount","muddy","mummify","mutate","mystify","nab","narrate","narrowcast","nasalise","nauseate","navigate","neaten","neck","neglect","norm","notarize","object","obscure","observe","obsess","obstruct","obtrude","offend","offset","option","orchestrate","orient","orientate","outbid","outdo","outfit","outflank","outfox","outnumber","outrank","outrun","outsource","overburden","overcharge","overcook","overdub","overfeed","overload","overplay","overproduce","overreact","override","overspend","overstay","overtrain","overvalue","overwork","own","oxidise","oxidize","oxygenate","pace","pack","pale","pant","paralyse","parody","part","pause","pave","penalise","persecute","personalise","perspire","pertain","peter","pike","pillory","pinion","pip","pity","pivot","pixellate","plagiarise","plait","plan","please","pluck","ponder","popularize","portray","prance","preclude","preheat","prejudge","preregister","presell","preside","pretend","print","prioritize","probate","probe","proceed","procrastinate","profane","progress","proliferate","proofread","propound","proselytise","provision","pry","publicize","puff","pull","pulp","pulverize","purse","put","putrefy","quadruple","quaff","quantify","quarrel","quash","quaver","question","quiet","quintuple","quip","quit","rag","rally","ramp","randomize","rationalise","rationalize","ravage","ravel","react","readies","readjust","readmit","ready","reapply","rear","reassemble","rebel","reboot","reborn","rebound","rebuff","rebuild","rebuke","recede","reckon","reclassify","recompense","reconstitute","record","recount","redact","redevelop","redound","redraw","redress","reel","refer","reference","refine","reflate","refute","regulate","reiterate","rejigger","rejoin","rekindle","relaunch","relieve","remand","remark","reopen","reorient","replicate","repossess","represent","reprimand","reproach","reprove","repurpose","requite","reschedule","resort","respray","restructure","retool","retract","revere","revitalise","revoke","reword","rewrite","ride","ridge","rim","ring","rise","rival","roger","rosin","rot","rout","row","rue","rule","safeguard","sashay","sate","satirise","satirize","satisfy","saturate","savour","scale","scamper","scar","scare","scarper","scent","schematise","scheme","schlep","scoff","scoop","scope","scotch","scowl","scrabble","scram","scramble","scrape","screw","scruple","scrutinise","scuffle","scuttle","search","secularize","see","segregate","sell","sense","sensitize","sequester","serenade","serialize","serve","service","settle","sew","shaft","sham","shampoo","shanghai","shear","sheathe","shell","shinny","shirk","shoot","shoulder","shout","shovel","showboat","shred","shrill","shudder","shush","sidetrack","sign","silt","sin","singe","sit","sizzle","skateboard","ski","slake","slap","slather","sleet","slink","slip","slope","slump","smarten","smuggle","snack","sneak","sniff","snoop","snow","snowplow","snuggle","soap","solace","solder","solicit","source","spark","spattering","spectacles","spectate","spellcheck","spew","spice","spirit","splash","splay","split","splosh","splurge","spook","square","squirm","stabilise","stable","stack","stage","stake","starch","state","statement","stiffen","stigmatize","sting","stint","stoop","store","storyboard","stratify","structure","stuff","stunt","substantiate","subtract","suckle","suffice","suffocate","summarise","sun","sunbathe","sunder","sup","surge","surprise","swat","swathe","sway","swear","swelter","swerve","swill","swing","symbolise","synthesise","syringe","table","tabulate","tag","tame","tank","tankful","tarry","task","taxicab","team","telescope","tenant","terraform","terrorise","testify","think","throbbing","thump","tighten","toady","toe","tough","tousle","traduce","train","transcend","transplant","trash","treasure","treble","trek","trial","tromp","trouser","trust","tune","tut","twine","twist","typify","unbalance","uncork","uncover","underachieve","undergo","underplay","unearth","unfreeze","unfurl","unlearn","unscramble","unzip","uproot","upsell","usher","vacation","vamoose","vanish","vary","veg","venture","verify","vet","veto","volunteer","vulgarise","waft","wallop","waltz","warp","wash","waver","weary","weatherize","wedge","weep","weight","welcome","westernise","westernize","while","whine","whisper","whistle","whitewash","whup","wilt","wing","wire","wisecrack","wolf","wound","wring","writ","yak","yawn","yearn","yuppify"],ni={adjective:qr,adverb:Ur,conjunction:Zr,interjection:Xr,noun:Qr,preposition:ei,verb:ai},ti=ni,ri={airline:Wa,animal:rn,app:cn,book:bn,cell_phone:Cn,color:En,commerce:Tn,company:_n,database:$n,date:Vn,finance:ot,food:bt,hacker:At,internet:Mt,location:Ut,lorem:Qt,metadata:ar,music:lr,person:Dr,phone_number:Nr,science:Ir,team:Kr,vehicle:Yr,word:ti},ii=ri,p=class extends Error{};function oi(a){let e=Object.getPrototypeOf(a);do{for(let n of Object.getOwnPropertyNames(e))typeof a[n]=="function"&&n!=="constructor"&&(a[n]=a[n].bind(a));e=Object.getPrototypeOf(e)}while(e!==Object.prototype)}var I=class{constructor(a){this.faker=a,oi(this)}},S=class extends I{constructor(a){super(a),this.faker=a}},Pe=(a=>(a.Narrowbody="narrowbody",a.Regional="regional",a.Widebody="widebody",a))(Pe||{}),li=["0","1","2","3","4","5","6","7","8","9"],si=["0","O","1","I","L"],ui={regional:20,narrowbody:35,widebody:60},ci={regional:["A","B","C","D"],narrowbody:["A","B","C","D","E","F"],widebody:["A","B","C","D","E","F","G","H","J","K"]},di=class extends S{airport(){return this.faker.helpers.arrayElement(this.faker.definitions.airline.airport)}airline(){return this.faker.helpers.arrayElement(this.faker.definitions.airline.airline)}airplane(){return this.faker.helpers.arrayElement(this.faker.definitions.airline.airplane)}recordLocator(a={}){let{allowNumerics:e=!1,allowVisuallySimilarCharacters:n=!1}=a,t=[];return e||t.push(...li),n||t.push(...si),this.faker.string.alphanumeric({length:6,casing:"upper",exclude:t})}seat(a={}){let{aircraftType:e="narrowbody"}=a,n=ui[e],t=ci[e],i=this.faker.number.int({min:1,max:n}),r=this.faker.helpers.arrayElement(t);return`${i}${r}`}aircraftType(){return this.faker.helpers.enumValue(Pe)}flightNumber(a={}){let{length:e={min:1,max:4},addLeadingZeros:n=!1}=a,t=this.faker.string.numeric({length:e,allowLeadingZeros:!1});return n?t.padStart(4,"0"):t}},He=(a=>(a.SRGB="sRGB",a.DisplayP3="display-p3",a.REC2020="rec2020",a.A98RGB="a98-rgb",a.ProphotoRGB="prophoto-rgb",a))(He||{}),Ie=(a=>(a.RGB="rgb",a.RGBA="rgba",a.HSL="hsl",a.HSLA="hsla",a.HWB="hwb",a.CMYK="cmyk",a.LAB="lab",a.LCH="lch",a.COLOR="color",a))(Ie||{});function hi(a,e){let{prefix:n,casing:t}=e;switch(t){case"upper":{a=a.toUpperCase();break}case"lower":{a=a.toLowerCase();break}}return n&&(a=n+a),a}function Ge(a){return a.map(e=>{if(e%1!==0){let n=new ArrayBuffer(4);new DataView(n).setFloat32(0,e);let t=new Uint8Array(n);return Ge([...t]).replaceAll(" ","")}return(e>>>0).toString(2).padStart(8,"0")}).join(" ")}function w(a){return Math.round(a*100)}function mi(a,e="rgb",n="sRGB"){switch(e){case"rgba":return`rgba(${a[0]}, ${a[1]}, ${a[2]}, ${a[3]})`;case"color":return`color(${n} ${a[0]} ${a[1]} ${a[2]})`;case"cmyk":return`cmyk(${w(a[0])}%, ${w(a[1])}%, ${w(a[2])}%, ${w(a[3])}%)`;case"hsl":return`hsl(${a[0]}deg ${w(a[1])}% ${w(a[2])}%)`;case"hsla":return`hsl(${a[0]}deg ${w(a[1])}% ${w(a[2])}% / ${w(a[3])})`;case"hwb":return`hwb(${a[0]} ${w(a[1])}% ${w(a[2])}%)`;case"lab":return`lab(${w(a[0])}% ${a[1]} ${a[2]})`;case"lch":return`lch(${w(a[0])}% ${a[1]} ${a[2]})`;case"rgb":return`rgb(${a[0]}, ${a[1]}, ${a[2]})`}}function H(a,e,n="rgb",t="sRGB"){switch(e){case"css":return mi(a,n,t);case"binary":return Ge(a);case"decimal":return a}}var pi=class extends S{human(){return this.faker.helpers.arrayElement(this.faker.definitions.color.human)}space(){return this.faker.helpers.arrayElement(this.faker.definitions.color.space)}cssSupportedFunction(){return this.faker.helpers.enumValue(Ie)}cssSupportedSpace(){return this.faker.helpers.enumValue(He)}rgb(a={}){let{format:e="hex",includeAlpha:n=!1,prefix:t="#",casing:i="lower"}=a,r,o="rgb";return e==="hex"?(r=this.faker.string.hexadecimal({length:n?8:6,prefix:""}),r=hi(r,{prefix:t,casing:i}),r):(r=Array.from({length:3},()=>this.faker.number.int(255)),n&&(r.push(this.faker.number.float({multipleOf:.01})),o="rgba"),H(r,e,o))}cmyk(a={}){let{format:e="decimal"}=a,n=Array.from({length:4},()=>this.faker.number.float({multipleOf:.01}));return H(n,e,"cmyk")}hsl(a={}){let{format:e="decimal",includeAlpha:n=!1}=a,t=[this.faker.number.int(360)];for(let i=0;i<(a?.includeAlpha?3:2);i++)t.push(this.faker.number.float({multipleOf:.01}));return H(t,e,n?"hsla":"hsl")}hwb(a={}){let{format:e="decimal"}=a,n=[this.faker.number.int(360)];for(let t=0;t<2;t++)n.push(this.faker.number.float({multipleOf:.01}));return H(n,e,"hwb")}lab(a={}){let{format:e="decimal"}=a,n=[this.faker.number.float({multipleOf:1e-6})];for(let t=0;t<2;t++)n.push(this.faker.number.float({min:-100,max:100,multipleOf:1e-4}));return H(n,e,"lab")}lch(a={}){let{format:e="decimal"}=a,n=[this.faker.number.float({multipleOf:1e-6})];for(let t=0;t<2;t++)n.push(this.faker.number.float({max:230,multipleOf:.1}));return H(n,e,"lch")}colorByCSSColorSpace(a={}){let{format:e="decimal",space:n="sRGB"}=a,t=Array.from({length:3},()=>this.faker.number.float({multipleOf:1e-4}));return H(t,e,"color",n)}},_e=(a=>(a.Legacy="legacy",a.Segwit="segwit",a.Bech32="bech32",a.Taproot="taproot",a))(_e||{}),Fi=(a=>(a.Mainnet="mainnet",a.Testnet="testnet",a))(Fi||{}),yi={legacy:{prefix:{mainnet:"1",testnet:"m"},length:{min:26,max:34},casing:"mixed",exclude:"0OIl"},segwit:{prefix:{mainnet:"3",testnet:"2"},length:{min:26,max:34},casing:"mixed",exclude:"0OIl"},bech32:{prefix:{mainnet:"bc1",testnet:"tb1"},length:{min:42,max:42},casing:"lower",exclude:"1bBiIoO"},taproot:{prefix:{mainnet:"bc1p",testnet:"tb1p"},length:{min:62,max:62},casing:"lower",exclude:"1bBiIoO"}},We=typeof Buffer>"u"||!Ke("base64")?a=>{let e=new TextEncoder().encode(a),n=Array.from(e,t=>String.fromCodePoint(t)).join("");return btoa(n)}:a=>Buffer.from(a).toString("base64"),le=typeof Buffer>"u"||!Ke("base64url")?a=>We(a).replaceAll("+","-").replaceAll("/","_").replaceAll(/=+$/g,""):a=>Buffer.from(a).toString("base64url");function Ke(a){try{return typeof Buffer.from("test").toString(a)=="string"}catch{return!1}}var gi=Object.fromEntries([["А","A"],["а","a"],["Б","B"],["б","b"],["В","V"],["в","v"],["Г","G"],["г","g"],["Д","D"],["д","d"],["ъе","ye"],["Ъе","Ye"],["ъЕ","yE"],["ЪЕ","YE"],["Е","E"],["е","e"],["Ё","Yo"],["ё","yo"],["Ж","Zh"],["ж","zh"],["З","Z"],["з","z"],["И","I"],["и","i"],["ый","iy"],["Ый","Iy"],["ЫЙ","IY"],["ыЙ","iY"],["Й","Y"],["й","y"],["К","K"],["к","k"],["Л","L"],["л","l"],["М","M"],["м","m"],["Н","N"],["н","n"],["О","O"],["о","o"],["П","P"],["п","p"],["Р","R"],["р","r"],["С","S"],["с","s"],["Т","T"],["т","t"],["У","U"],["у","u"],["Ф","F"],["ф","f"],["Х","Kh"],["х","kh"],["Ц","Ts"],["ц","ts"],["Ч","Ch"],["ч","ch"],["Ш","Sh"],["ш","sh"],["Щ","Sch"],["щ","sch"],["Ъ",""],["ъ",""],["Ы","Y"],["ы","y"],["Ь",""],["ь",""],["Э","E"],["э","e"],["Ю","Yu"],["ю","yu"],["Я","Ya"],["я","ya"]]),bi=Object.fromEntries([["α","a"],["β","v"],["γ","g"],["δ","d"],["ε","e"],["ζ","z"],["η","i"],["θ","th"],["ι","i"],["κ","k"],["λ","l"],["μ","m"],["ν","n"],["ξ","ks"],["ο","o"],["π","p"],["ρ","r"],["σ","s"],["τ","t"],["υ","y"],["φ","f"],["χ","x"],["ψ","ps"],["ω","o"],["ά","a"],["έ","e"],["ί","i"],["ό","o"],["ύ","y"],["ή","i"],["ώ","o"],["ς","s"],["ϊ","i"],["ΰ","y"],["ϋ","y"],["ΐ","i"],["Α","A"],["Β","B"],["Γ","G"],["Δ","D"],["Ε","E"],["Ζ","Z"],["Η","I"],["Θ","TH"],["Ι","I"],["Κ","K"],["Λ","L"],["Μ","M"],["Ν","N"],["Ξ","KS"],["Ο","O"],["Π","P"],["Ρ","R"],["Σ","S"],["Τ","T"],["Υ","Y"],["Φ","F"],["Χ","X"],["Ψ","PS"],["Ω","O"],["Ά","A"],["Έ","E"],["Ί","I"],["Ό","O"],["Ύ","Y"],["Ή","I"],["Ώ","O"],["Ϊ","I"],["Ϋ","Y"]]),fi=Object.fromEntries([["ء","e"],["آ","a"],["أ","a"],["ؤ","w"],["إ","i"],["ئ","y"],["ا","a"],["ب","b"],["ة","t"],["ت","t"],["ث","th"],["ج","j"],["ح","h"],["خ","kh"],["د","d"],["ذ","dh"],["ر","r"],["ز","z"],["س","s"],["ش","sh"],["ص","s"],["ض","d"],["ط","t"],["ظ","z"],["ع","e"],["غ","gh"],["ـ","_"],["ف","f"],["ق","q"],["ك","k"],["ل","l"],["م","m"],["ن","n"],["ه","h"],["و","w"],["ى","a"],["ي","y"],["َ‎","a"],["ُ","u"],["ِ‎","i"]]),vi=Object.fromEntries([["ա","a"],["Ա","A"],["բ","b"],["Բ","B"],["գ","g"],["Գ","G"],["դ","d"],["Դ","D"],["ե","ye"],["Ե","Ye"],["զ","z"],["Զ","Z"],["է","e"],["Է","E"],["ը","y"],["Ը","Y"],["թ","t"],["Թ","T"],["ժ","zh"],["Ժ","Zh"],["ի","i"],["Ի","I"],["լ","l"],["Լ","L"],["խ","kh"],["Խ","Kh"],["ծ","ts"],["Ծ","Ts"],["կ","k"],["Կ","K"],["հ","h"],["Հ","H"],["ձ","dz"],["Ձ","Dz"],["ղ","gh"],["Ղ","Gh"],["ճ","tch"],["Ճ","Tch"],["մ","m"],["Մ","M"],["յ","y"],["Յ","Y"],["ն","n"],["Ն","N"],["շ","sh"],["Շ","Sh"],["ո","vo"],["Ո","Vo"],["չ","ch"],["Չ","Ch"],["պ","p"],["Պ","P"],["ջ","j"],["Ջ","J"],["ռ","r"],["Ռ","R"],["ս","s"],["Ս","S"],["վ","v"],["Վ","V"],["տ","t"],["Տ","T"],["ր","r"],["Ր","R"],["ց","c"],["Ց","C"],["ու","u"],["ՈՒ","U"],["Ու","U"],["փ","p"],["Փ","P"],["ք","q"],["Ք","Q"],["օ","o"],["Օ","O"],["ֆ","f"],["Ֆ","F"],["և","yev"]]),Ci=Object.fromEntries([["چ","ch"],["ک","k"],["گ","g"],["پ","p"],["ژ","zh"],["ی","y"]]),ki=Object.fromEntries([["א","a"],["ב","b"],["ג","g"],["ד","d"],["ה","h"],["ו","v"],["ז","z"],["ח","ch"],["ט","t"],["י","y"],["כ","k"],["ך","kh"],["ל","l"],["ם","m"],["מ","m"],["ן","n"],["נ","n"],["ס","s"],["ע","a"],["פ","f"],["ף","ph"],["צ","ts"],["ץ","ts"],["ק","k"],["ר","r"],["ש","sh"],["ת","t"],["ו","v"]]),se={...gi,...bi,...fi,...Ci,...vi,...ki},Si=(a=>(a.Any="any",a.Loopback="loopback",a.PrivateA="private-a",a.PrivateB="private-b",a.PrivateC="private-c",a.TestNet1="test-net-1",a.TestNet2="test-net-2",a.TestNet3="test-net-3",a.LinkLocal="link-local",a.Multicast="multicast",a))(Si||{}),Ei={any:"0.0.0.0/0",loopback:"127.0.0.0/8","private-a":"10.0.0.0/8","private-b":"172.16.0.0/12","private-c":"192.168.0.0/16","test-net-1":"192.0.2.0/24","test-net-2":"198.51.100.0/24","test-net-3":"203.0.113.0/24","link-local":"169.254.0.0/16",multicast:"224.0.0.0/4"};function ue(a){return/^[a-z][a-z-]*[a-z]$/i.exec(a)!==null}function ce(a,e){let n=a.helpers.slugify(e);if(ue(n))return n;let t=a.helpers.slugify(a.lorem.word());return ue(t)?t:a.string.alpha({casing:"lower",length:a.number.int({min:4,max:8})})}var Ai=class extends S{email(a={}){let{firstName:e,lastName:n,provider:t=this.faker.helpers.arrayElement(this.faker.definitions.internet.free_email),allowSpecialCharacters:i=!1}=a,r=this.username({firstName:e,lastName:n});if(r=r.replaceAll(/[^A-Za-z0-9._+-]+/g,""),r=r.substring(0,50),i){let o=[..."._-"],l=[...".!#$%&'*+-/=?^_`{|}~"];r=r.replace(this.faker.helpers.arrayElement(o),this.faker.helpers.arrayElement(l))}return r=r.replaceAll(/\.{2,}/g,"."),r=r.replace(/^\./,""),r=r.replace(/\.$/,""),`${r}@${t}`}exampleEmail(a={}){let{firstName:e,lastName:n,allowSpecialCharacters:t=!1}=a,i=this.faker.helpers.arrayElement(this.faker.definitions.internet.example_email);return this.email({firstName:e,lastName:n,provider:i,allowSpecialCharacters:t})}username(a={}){let{firstName:e=this.faker.person.firstName(),lastName:n=this.faker.person.lastName(),lastName:t}=a,i=this.faker.helpers.arrayElement([".","_"]),r=this.faker.number.int(99),o=[()=>`${e}${i}${n}${r}`,()=>`${e}${i}${n}`];t||o.push(()=>`${e}${r}`);let l=this.faker.helpers.arrayElement(o)();return l=l.normalize("NFKD").replaceAll(/[\u0300-\u036F]/g,""),l=[...l].map(u=>{if(se[u])return se[u];let s=u.codePointAt(0)??Number.NaN;return s<128?u:s.toString(36)}).join(""),l=l.replaceAll("'",""),l=l.replaceAll(" ",""),l}displayName(a={}){let{firstName:e=this.faker.person.firstName(),lastName:n=this.faker.person.lastName()}=a,t=this.faker.helpers.arrayElement([".","_"]),i=this.faker.number.int(99),r=[()=>`${e}${i}`,()=>`${e}${t}${n}`,()=>`${e}${t}${n}${i}`],o=this.faker.helpers.arrayElement(r)();return o=o.replaceAll("'",""),o=o.replaceAll(" ",""),o}protocol(){let a=["http","https"];return this.faker.helpers.arrayElement(a)}httpMethod(){let a=["GET","POST","PUT","DELETE","PATCH"];return this.faker.helpers.arrayElement(a)}httpStatusCode(a={}){let{types:e=Object.keys(this.faker.definitions.internet.http_status_code)}=a,n=this.faker.helpers.arrayElement(e);return this.faker.helpers.arrayElement(this.faker.definitions.internet.http_status_code[n])}url(a={}){let{appendSlash:e=this.faker.datatype.boolean(),protocol:n="https"}=a;return`${n}://${this.domainName()}${e?"/":""}`}domainName(){return`${this.domainWord()}.${this.domainSuffix()}`}domainSuffix(){return this.faker.helpers.arrayElement(this.faker.definitions.internet.domain_suffix)}domainWord(){let a=ce(this.faker,this.faker.word.adjective()),e=ce(this.faker,this.faker.word.noun());return`${a}-${e}`.toLowerCase()}ip(){return this.faker.datatype.boolean()?this.ipv4():this.ipv6()}ipv4(a={}){let{network:e="any",cidrBlock:n=Ei[e]}=a;if(!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(n))throw new p(`Invalid CIDR block provided: ${n}. Must be in the format x.x.x.x/y.`);let[t,i]=n.split("/"),r=4294967295>>>Number.parseInt(i),[o,l,u,s]=t.split(".").map(Number),c=(o<<24|l<<16|u<<8|s)&~r,d=this.faker.number.int(r),m=c|d;return[m>>>24&255,m>>>16&255,m>>>8&255,m&255].join(".")}ipv6(){return Array.from({length:8},()=>this.faker.string.hexadecimal({length:4,casing:"lower",prefix:""})).join(":")}port(){return this.faker.number.int(65535)}userAgent(){return this.faker.helpers.fake(this.faker.definitions.internet.user_agent_pattern)}mac(a={}){typeof a=="string"&&(a={separator:a});let{separator:e=":"}=a,n,t="";for([":","-",""].includes(e)||(e=":"),n=0;n<12;n++)t+=this.faker.number.hex(15),n%2===1&&n!==11&&(t+=e);return t}password(a={}){let e=/[aeiouAEIOU]$/,n=/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]$/,t=(u,s,c,d)=>{if(d.length>=u)return d;s&&(c=n.test(d)?e:n);let m=this.faker.number.int(94)+33,g=String.fromCodePoint(m);return s&&(g=g.toLowerCase()),c.test(g)?t(u,s,c,d+g):t(u,s,c,d)},{length:i=15,memorable:r=!1,pattern:o=/\w/,prefix:l=""}=a;return t(i,r,o,l)}emoji(a={}){let{types:e=Object.keys(this.faker.definitions.internet.emoji)}=a,n=this.faker.helpers.arrayElement(e);return this.faker.helpers.arrayElement(this.faker.definitions.internet.emoji[n])}jwtAlgorithm(){return this.faker.helpers.arrayElement(this.faker.definitions.internet.jwt_algorithm)}jwt(a={}){let{refDate:e=this.faker.defaultRefDate()}=a,n=this.faker.date.recent({refDate:e}),{header:t={alg:this.jwtAlgorithm(),typ:"JWT"},payload:i={iat:Math.round(n.valueOf()/1e3),exp:Math.round(this.faker.date.soon({refDate:n}).valueOf()/1e3),nbf:Math.round(this.faker.date.anytime({refDate:e}).valueOf()/1e3),iss:this.faker.company.name(),sub:this.faker.string.uuid(),aud:this.faker.string.uuid(),jti:this.faker.string.uuid()}}=a,r=le(JSON.stringify(t)),o=le(JSON.stringify(i)),l=this.faker.string.alphanumeric(64);return`${r}.${o}.${l}`}},$e=(a=>(a.Female="female",a.Generic="generic",a.Male="male",a))($e||{});function W(a,e=a.person.sexType(),n){let{generic:t,female:i,male:r}=n;if(e==="generic")return t??a.helpers.arrayElement([i,r])??[];let o=e==="female"?i:r;return o!=null?t!=null?a.helpers.weightedArrayElement([{weight:3*Math.sqrt(o.length),value:o},{weight:Math.sqrt(t.length),value:t}]):o:t??[]}var Di=class extends S{firstName(a){return this.faker.helpers.arrayElement(W(this.faker,a,this.faker.definitions.person.first_name))}lastName(a){if(this.faker.rawDefinitions.person?.last_name_pattern!=null){let e=this.faker.helpers.weightedArrayElement(W(this.faker,a,this.faker.rawDefinitions.person.last_name_pattern));return this.faker.helpers.fake(e)}return this.faker.helpers.arrayElement(W(this.faker,a,this.faker.definitions.person.last_name))}middleName(a){return this.faker.helpers.arrayElement(W(this.faker,a,this.faker.definitions.person.middle_name))}fullName(a={}){let{sex:e=this.faker.helpers.arrayElement(["female","male"]),firstName:n=this.firstName(e),lastName:t=this.lastName(e)}=a,i=this.faker.helpers.weightedArrayElement(this.faker.definitions.person.name);return this.faker.helpers.mustache(i,{"person.prefix":()=>this.prefix(e),"person.firstName":()=>n,"person.middleName":()=>this.middleName(e),"person.lastName":()=>t,"person.suffix":()=>this.suffix()})}gender(){return this.faker.helpers.arrayElement(this.faker.definitions.person.gender)}sex(){return this.faker.helpers.arrayElement(this.faker.definitions.person.sex)}sexType(a={}){let{includeGeneric:e=!1}=a;return e?this.faker.helpers.enumValue($e):this.faker.helpers.arrayElement(["female","male"])}bio(){let{bio_pattern:a}=this.faker.definitions.person;return this.faker.helpers.fake(a)}prefix(a){return this.faker.helpers.arrayElement(W(this.faker,a,this.faker.definitions.person.prefix))}suffix(){return this.faker.helpers.arrayElement(this.faker.definitions.person.suffix)}jobTitle(){return this.faker.helpers.fake(this.faker.definitions.person.job_title_pattern)}jobDescriptor(){return this.faker.helpers.arrayElement(this.faker.definitions.person.job_descriptor)}jobArea(){return this.faker.helpers.arrayElement(this.faker.definitions.person.job_area)}jobType(){return this.faker.helpers.arrayElement(this.faker.definitions.person.job_type)}zodiacSign(){return this.faker.helpers.arrayElement(this.faker.definitions.person.western_zodiac_sign)}},Bi=23283064365386963e-26,wi=1/9007199254740992,{imul:ee,trunc:ae}=Math;function de(a){return typeof a=="number"?Oe(a):Ti(a)}function Oe(a){let e=Array.from({length:624});e[0]=a;for(let n=1;n!==624;++n){let t=e[n-1]^e[n-1]>>>30;e[n]=ae(ee(1812433253,t)+n)}return e}function Ti(a){let e=Oe(19650218),n=1,t=0;for(let i=Math.max(624,a.length);i!==0;--i){let r=e[n-1]^e[n-1]>>>30;e[n]=ae((e[n]^ee(r,1664525))+a[t]+t),n++,t++,n>=624&&(e[0]=e[623],n=1),t>=a.length&&(t=0)}for(let i=623;i!==0;i--)e[n]=ae((e[n]^ee(e[n-1]^e[n-1]>>>30,1566083941))-n),n++,n>=624&&(e[0]=e[623],n=1);return e[0]=2147483648,e}function U(a){for(let n=0;n!==227;++n){let t=(a[n]&2147483648)+(a[n+1]&2147483647);a[n]=a[n+397]^t>>>1^-(t&1)&2567483615}for(let n=227;n!==623;++n){let t=(a[n]&2147483648)+(a[n+1]&2147483647);a[n]=a[n+397-624]^t>>>1^-(t&1)&2567483615}let e=(a[623]&2147483648)+(a[0]&2147483647);return a[623]=a[396]^e>>>1^-(e&1)&2567483615,a}var Mi=class{constructor(a=Math.random()*Number.MAX_SAFE_INTEGER,e=U(de(a)),n=0){this.states=e,this.index=n}nextU32(){let a=this.states[this.index];return a^=this.states[this.index]>>>11,a^=a<<7&2636928640,a^=a<<15&4022730752,a^=a>>>18,++this.index>=624&&(this.states=U(this.states),this.index=0),a>>>0}nextF32(){return this.nextU32()*Bi}nextU53(){let a=this.nextU32()>>>5,e=this.nextU32()>>>6;return a*67108864+e}nextF53(){return this.nextU53()*wi}seed(a){this.states=U(de(a)),this.index=0}};function ze(){return Math.ceil(Math.random()*Number.MAX_SAFE_INTEGER)}function Li(a=ze()){let e=new Mi(a);return{next(){return e.nextF53()},seed(n){e.seed(n)}}}var xi=class extends I{boolean(a={}){typeof a=="number"&&(a={probability:a});let{probability:e=.5}=a;return e<=0?!1:e>=1?!0:this.faker.number.float()<e}};function x(a,e="refDate"){let n=new Date(a);if(Number.isNaN(n.valueOf()))throw new p(`Invalid ${e} date: ${a.toString()}`);return n}var j=()=>{throw new p("You cannot edit the locale data on the faker instance")};function Ni(a){let e={};return new Proxy(a,{has(){return!0},get(n,t){return typeof t=="symbol"||t==="nodeType"?n[t]:t in e?e[t]:e[t]=Ri(t,n[t])},set:j,deleteProperty:j})}function ne(a,...e){if(a===null)throw new p(`The locale data for '${e.join(".")}' aren't applicable to this locale.
  If you think this is a bug, please report it at: https://github.com/faker-js/faker`);if(a===void 0)throw new p(`The locale data for '${e.join(".")}' are missing in this locale.
  If this is a custom Faker instance, please make sure all required locales are used e.g. '[de_AT, de, en, base]'.
  Please contribute the missing data to the project or use a locale/Faker instance that has these data.
  For more information see https://fakerjs.dev/guide/localization.html`)}function Ri(a,e={}){return new Proxy(e,{has(n,t){return n[t]!=null},get(n,t){let i=n[t];return typeof t=="symbol"||t==="nodeType"||ne(i,a,t.toString()),i},set:j,deleteProperty:j})}var Je=class extends I{anytime(a={}){let{refDate:e=this.faker.defaultRefDate()}=a,n=x(e).getTime();return this.between({from:n-1e3*60*60*24*365,to:n+1e3*60*60*24*365})}past(a={}){let{years:e=1,refDate:n=this.faker.defaultRefDate()}=a;if(e<=0)throw new p("Years must be greater than 0.");let t=x(n).getTime();return this.between({from:t-e*365*24*3600*1e3,to:t-1e3})}future(a={}){let{years:e=1,refDate:n=this.faker.defaultRefDate()}=a;if(e<=0)throw new p("Years must be greater than 0.");let t=x(n).getTime();return this.between({from:t+1e3,to:t+e*365*24*3600*1e3})}between(a){let{from:e,to:n}=a,t=x(e,"from").getTime(),i=x(n,"to").getTime();if(t>i)throw new p("`from` date must be before `to` date.");return new Date(this.faker.number.int({min:t,max:i}))}betweens(a){let{from:e,to:n,count:t=3}=a;return this.faker.helpers.multiple(()=>this.between({from:e,to:n}),{count:t}).toSorted((i,r)=>i.getTime()-r.getTime())}recent(a={}){let{days:e=1,refDate:n=this.faker.defaultRefDate()}=a;if(e<=0)throw new p("Days must be greater than 0.");let t=x(n).getTime();return this.between({from:t-e*24*3600*1e3,to:t-1e3})}soon(a={}){let{days:e=1,refDate:n=this.faker.defaultRefDate()}=a;if(e<=0)throw new p("Days must be greater than 0.");let t=x(n).getTime();return this.between({from:t+1e3,to:t+e*24*3600*1e3})}birthdate(a={}){let{mode:e="age",min:n=18,max:t=80,refDate:i=this.faker.defaultRefDate()}=a,r=x(i),o=r.getUTCFullYear();switch(e){case"age":{let l=new Date(r).setUTCFullYear(o-t-1)+864e5,u=new Date(r).setUTCFullYear(o-n);if(l>u)throw new p(`Max age ${t} should be greater than or equal to min age ${n}.`);return this.between({from:l,to:u})}case"year":{let l=new Date(Date.UTC(0,0,2)).setUTCFullYear(n),u=new Date(Date.UTC(0,11,30)).setUTCFullYear(t);if(l>u)throw new p(`Max year ${t} should be greater than or equal to min year ${n}.`);return this.between({from:l,to:u})}}}},Pi=class extends Je{constructor(a){super(a),this.faker=a}month(a={}){let{abbreviated:e=!1,context:n=!1}=a,t=this.faker.definitions.date.month,i;e?i=n&&t.abbr_context!=null?"abbr_context":"abbr":i=n&&t.wide_context!=null?"wide_context":"wide";let r=t[i];return ne(r,"date.month",i),this.faker.helpers.arrayElement(r)}weekday(a={}){let{abbreviated:e=!1,context:n=!1}=a,t=this.faker.definitions.date.weekday,i;e?i=n&&t.abbr_context!=null?"abbr_context":"abbr":i=n&&t.wide_context!=null?"wide_context":"wide";let r=t[i];return ne(r,"date.weekday",i),this.faker.helpers.arrayElement(r)}timeZone(){return this.faker.helpers.arrayElement(this.faker.definitions.date.time_zone)}},Hi=/\.|\(/;function Ii(a,e,n=[e,e.rawDefinitions]){if(a.length===0)throw new p("Eval expression cannot be empty.");if(n.length===0)throw new p("Eval entrypoints cannot be empty.");let t=n,i=a;do{let o;i.startsWith("(")?[o,t]=Gi(i,t):[o,t]=Wi(i,t),i=i.substring(o),t=t.filter(l=>l!=null).map(l=>Array.isArray(l)?e.helpers.arrayElement(l):l)}while(i.length>0&&t.length>0);if(t.length===0)throw new p(`Cannot resolve expression '${a}'`);let r=t[0];return typeof r=="function"?r():r}function Gi(a,e){let[n,t]=_i(a),i=a[n+1];switch(i){case".":case"(":case void 0:break;default:throw new p(`Expected dot ('.'), open parenthesis ('('), or nothing after function call but got '${i}'`)}return[n+(i==="."?2:1),e.map(r=>typeof r=="function"?r(...t):void 0)]}function _i(a){let e=a.indexOf(")",1);if(e===-1)throw new p(`Missing closing parenthesis in '${a}'`);for(;e!==-1;){let t=a.substring(1,e);try{return[e,JSON.parse(`[${t}]`)]}catch{if(!t.includes("'")&&!t.includes('"'))try{return[e,JSON.parse(`["${t}"]`)]}catch{}}e=a.indexOf(")",e+1)}e=a.lastIndexOf(")");let n=a.substring(1,e);return[e,[n]]}function Wi(a,e){let n=Hi.exec(a),t=(n?.[0]??"")===".",i=n?.index??a.length,r=a.substring(0,i);if(r.length===0)throw new p(`Expression parts cannot be empty in '${a}'`);let o=a[i+1];if(t&&(o==null||o==="."||o==="("))throw new p(`Found dot without property name in '${a}'`);return[i+(t?1:0),e.map(l=>Ki(l,r))]}function Ki(a,e){switch(typeof a){case"function":{try{a=a()}catch{return}return a?.[e]}case"object":return a?.[e];default:return}}function $i(a){let e=Oi(a.replace(/L?$/,"0"));return e===0?0:10-e}function Oi(a){a=a.replaceAll(/[\s-]/g,"");let e=0,n=!1;for(let t=a.length-1;t>=0;t--){let i=Number.parseInt(a[t]);n&&(i*=2,i>9&&(i=i%10+1)),e+=i,n=!n}return e%10}function he(a,e,n,t){let i=1;if(e)switch(e){case"?":{i=a.datatype.boolean()?0:1;break}case"*":{let r=1;for(;a.datatype.boolean();)r*=2;i=a.number.int({min:0,max:r});break}case"+":{let r=1;for(;a.datatype.boolean();)r*=2;i=a.number.int({min:1,max:r});break}default:throw new p("Unknown quantifier symbol provided.")}else n!=null&&t!=null?i=a.number.int({min:Number.parseInt(n),max:Number.parseInt(t)}):n!=null&&t==null&&(i=Number.parseInt(n));return i}function zi(a,e=""){let n=/(.)\{(\d+),(\d+)\}/,t=/(.)\{(\d+)\}/,i=/\[(\d+)-(\d+)\]/,r,o,l,u,s=n.exec(e);for(;s!=null;)r=Number.parseInt(s[2]),o=Number.parseInt(s[3]),r>o&&(l=o,o=r,r=l),u=a.number.int({min:r,max:o}),e=e.slice(0,s.index)+s[1].repeat(u)+e.slice(s.index+s[0].length),s=n.exec(e);for(s=t.exec(e);s!=null;)u=Number.parseInt(s[2]),e=e.slice(0,s.index)+s[1].repeat(u)+e.slice(s.index+s[0].length),s=t.exec(e);for(s=i.exec(e);s!=null;)r=Number.parseInt(s[1]),o=Number.parseInt(s[2]),r>o&&(l=o,o=r,r=l),e=e.slice(0,s.index)+a.number.int({min:r,max:o}).toString()+e.slice(s.index+s[0].length),s=i.exec(e);return e}function Ve(a,e="",n="#"){let t="";for(let i=0;i<e.length;i++)e.charAt(i)===n?t+=a.number.int(9):e.charAt(i)==="!"?t+=a.number.int({min:2,max:9}):t+=e.charAt(i);return t}var je=class extends I{slugify(a=""){return a.normalize("NFKD").replaceAll(/[\u0300-\u036F]/g,"").replaceAll(" ","-").replaceAll(/[^\w.-]+/g,"")}replaceSymbols(a=""){let e=["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"],n="";for(let t=0;t<a.length;t++)a.charAt(t)==="#"?n+=this.faker.number.int(9):a.charAt(t)==="?"?n+=this.arrayElement(e):a.charAt(t)==="*"?n+=this.faker.datatype.boolean()?this.arrayElement(e):this.faker.number.int(9):n+=a.charAt(t);return n}replaceCreditCardSymbols(a="6453-####-####-####-###L",e="#"){a=zi(this.faker,a),a=Ve(this.faker,a,e);let n=$i(a);return a.replace("L",String(n))}fromRegExp(a){let e=!1;a instanceof RegExp&&(e=a.flags.includes("i"),a=a.toString(),a=/\/(.+?)\//.exec(a)?.[1]??"");let n,t,i,r=/([.A-Za-z0-9])(?:\{(\d+)(?:,(\d+)|)\}|(\?|\*|\+))(?![^[]*]|[^{]*})/,o=r.exec(a);for(;o!=null;){let d=o[2],m=o[3],g=o[4];i=he(this.faker,g,d,m);let h;o[1]==="."?h=this.faker.string.alphanumeric(i):e?h=this.faker.string.fromCharacters([o[1].toLowerCase(),o[1].toUpperCase()],i):h=o[1].repeat(i),a=a.slice(0,o.index)+h+a.slice(o.index+o[0].length),o=r.exec(a)}let l=/(\d-\d|\w-\w|\d|\w|[-!@#$&()`.+,/"])/,u=/\[(\^|)(-|)(.+?)\](?:\{(\d+)(?:,(\d+)|)\}|(\?|\*|\+)|)/;for(o=u.exec(a);o!=null;){let d=o[1]==="^",m=o[2]==="-",g=o[4],h=o[5],F=o[6],y=[],b=o[3],v=l.exec(b);for(m&&y.push(45);v!=null;){if(v[0].includes("-")){let C=v[0].split("-").map(f=>f.codePointAt(0)??Number.NaN);if(n=C[0],t=C[1],n>t)throw new p("Character range provided is out of order.");for(let f=n;f<=t;f++)if(e&&Number.isNaN(Number(String.fromCodePoint(f)))){let k=String.fromCodePoint(f);y.push(k.toUpperCase().codePointAt(0)??Number.NaN,k.toLowerCase().codePointAt(0)??Number.NaN)}else y.push(f)}else e&&Number.isNaN(Number(v[0]))?y.push(v[0].toUpperCase().codePointAt(0)??Number.NaN,v[0].toLowerCase().codePointAt(0)??Number.NaN):y.push(v[0].codePointAt(0)??Number.NaN);b=b.substring(v[0].length),v=l.exec(b)}if(i=he(this.faker,F,g,h),d){let C=-1;for(let f=48;f<=57;f++){if(C=y.indexOf(f),C>-1){y.splice(C,1);continue}y.push(f)}for(let f=65;f<=90;f++){if(C=y.indexOf(f),C>-1){y.splice(C,1);continue}y.push(f)}for(let f=97;f<=122;f++){if(C=y.indexOf(f),C>-1){y.splice(C,1);continue}y.push(f)}}let M=this.multiple(()=>String.fromCodePoint(this.arrayElement(y)),{count:i}).join("");a=a.slice(0,o.index)+M+a.slice(o.index+o[0].length),o=u.exec(a)}let s=/(.)\{(\d+),(\d+)\}/;for(o=s.exec(a);o!=null;){if(n=Number.parseInt(o[2]),t=Number.parseInt(o[3]),n>t)throw new p("Numbers out of order in {} quantifier.");i=this.faker.number.int({min:n,max:t}),a=a.slice(0,o.index)+o[1].repeat(i)+a.slice(o.index+o[0].length),o=s.exec(a)}let c=/(.)\{(\d+)\}/;for(o=c.exec(a);o!=null;)i=Number.parseInt(o[2]),a=a.slice(0,o.index)+o[1].repeat(i)+a.slice(o.index+o[0].length),o=c.exec(a);return a}shuffle(a,e={}){let{inplace:n=!1}=e;n||(a=[...a]);for(let t=a.length-1;t>0;--t){let i=this.faker.number.int(t);[a[t],a[i]]=[a[i],a[t]]}return a}uniqueArray(a,e){if(Array.isArray(a)){let t=[...new Set(a)];return this.shuffle(t).splice(0,e)}let n=new Set;try{if(typeof a=="function"){let t=1e3*e,i=0;for(;n.size<e&&i<t;)n.add(a()),i++}}catch{}return[...n]}mustache(a,e){if(a==null)return"";for(let n in e){let t=new RegExp(`{{${n}}}`,"g"),i=e[n];typeof i=="string"&&(i=i.replaceAll("$","$$$$")),a=a.replace(t,i)}return a}maybe(a,e={}){if(this.faker.datatype.boolean(e))return a()}objectKey(a){let e=Object.keys(a);return this.arrayElement(e)}objectValue(a){let e=this.faker.helpers.objectKey(a);return a[e]}objectEntry(a){let e=this.faker.helpers.objectKey(a);return[e,a[e]]}arrayElement(a){if(a.length===0)throw new p("Cannot get value from empty dataset.");let e=a.length>1?this.faker.number.int({max:a.length-1}):0;return a[e]}weightedArrayElement(a){if(a.length===0)throw new p("weightedArrayElement expects an array with at least one element");if(!a.every(i=>i.weight>0))throw new p("weightedArrayElement expects an array of { weight, value } objects where weight is a positive number");let e=a.reduce((i,{weight:r})=>i+r,0),n=this.faker.number.float({min:0,max:e}),t=0;for(let{weight:i,value:r}of a)if(t+=i,n<t)return r;return a.at(-1).value}arrayElements(a,e){if(a.length===0)return[];let n=this.rangeToNumber(e??{min:1,max:a.length});if(n>=a.length)return this.shuffle(a);if(n<=0)return[];let t=[...a],i=a.length,r=i-n,o,l;for(;i-- >r;)l=this.faker.number.int(i),o=t[l],t[l]=t[i],t[i]=o;return t.slice(r)}enumValue(a){let e=Object.keys(a).filter(t=>Number.isNaN(Number(t))),n=this.arrayElement(e);return a[n]}rangeToNumber(a){return typeof a=="number"?a:this.faker.number.int(a)}multiple(a,e={}){let n=this.rangeToNumber(e.count??3);return n<=0?[]:Array.from({length:n},a)}},Ji=class extends je{constructor(a){super(a),this.faker=a}fake(a){a=typeof a=="string"?a:this.arrayElement(a);let e=a.search(/{{[a-z]/),n=a.indexOf("}}",e);if(e===-1||n===-1)return a;let t=a.substring(e+2,n+2).replace("}}","").replace("{{",""),i=Ii(t,this.faker),r=String(i),o=a.substring(0,e)+r+a.substring(n+2);return this.fake(o)}},Ye=class extends I{latitude(a={}){let{max:e=90,min:n=-90,precision:t=4}=a;return this.faker.number.float({min:n,max:e,fractionDigits:t})}longitude(a={}){let{max:e=180,min:n=-180,precision:t=4}=a;return this.faker.number.float({max:e,min:n,fractionDigits:t})}nearbyGPSCoordinate(a={}){let{origin:e,radius:n=10,isMetric:t=!1}=a;if(e==null)return[this.latitude(),this.longitude()];let i=this.faker.number.float({max:2*Math.PI,fractionDigits:5}),r=t?n:n*1.60934,o=this.faker.number.float({max:r,fractionDigits:3})*.995,l=4e4/360,u=o/l,s=[e[0]+Math.sin(i)*u,e[1]+Math.cos(i)*u];return s[0]=s[0]%180,(s[0]<-90||s[0]>90)&&(s[0]=Math.sign(s[0])*180-s[0],s[1]+=180),s[1]=(s[1]%360+540)%360-180,[s[0],s[1]]}},Vi=class extends Ye{constructor(a){super(a),this.faker=a}zipCode(a={}){typeof a=="string"&&(a={format:a});let{state:e}=a;if(e!=null){let t=this.faker.definitions.location.postcode_by_state[e];if(t==null)throw new p(`No zip code definition found for state "${e}"`);return this.faker.helpers.fake(t)}let{format:n=this.faker.definitions.location.postcode}=a;return typeof n=="string"&&(n=[n]),n=this.faker.helpers.arrayElement(n),this.faker.helpers.replaceSymbols(n)}city(){return this.faker.helpers.fake(this.faker.definitions.location.city_pattern)}buildingNumber(){return this.faker.helpers.arrayElement(this.faker.definitions.location.building_number).replaceAll(/#+/g,a=>this.faker.string.numeric({length:a.length,allowLeadingZeros:!1}))}street(){return this.faker.helpers.fake(this.faker.definitions.location.street_pattern)}streetAddress(a={}){typeof a=="boolean"&&(a={useFullAddress:a});let{useFullAddress:e}=a,n=this.faker.definitions.location.street_address[e?"full":"normal"];return this.faker.helpers.fake(n)}secondaryAddress(){return this.faker.helpers.fake(this.faker.definitions.location.secondary_address).replaceAll(/#+/g,a=>this.faker.string.numeric({length:a.length,allowLeadingZeros:!1}))}county(){return this.faker.helpers.arrayElement(this.faker.definitions.location.county)}country(){return this.faker.helpers.arrayElement(this.faker.definitions.location.country)}continent(){return this.faker.helpers.arrayElement(this.faker.definitions.location.continent)}countryCode(a={}){typeof a=="string"&&(a={variant:a});let{variant:e="alpha-2"}=a,n=(()=>{switch(e){case"numeric":return"numeric";case"alpha-3":return"alpha3";case"alpha-2":return"alpha2"}})();return this.faker.helpers.arrayElement(this.faker.definitions.location.country_code)[n]}state(a={}){let{abbreviated:e=!1}=a,n=e?this.faker.definitions.location.state_abbr:this.faker.definitions.location.state;return this.faker.helpers.arrayElement(n)}direction(a={}){let{abbreviated:e=!1}=a;return e?this.faker.helpers.arrayElement([...this.faker.definitions.location.direction.cardinal_abbr,...this.faker.definitions.location.direction.ordinal_abbr]):this.faker.helpers.arrayElement([...this.faker.definitions.location.direction.cardinal,...this.faker.definitions.location.direction.ordinal])}cardinalDirection(a={}){let{abbreviated:e=!1}=a;return e?this.faker.helpers.arrayElement(this.faker.definitions.location.direction.cardinal_abbr):this.faker.helpers.arrayElement(this.faker.definitions.location.direction.cardinal)}ordinalDirection(a={}){let{abbreviated:e=!1}=a;return e?this.faker.helpers.arrayElement(this.faker.definitions.location.direction.ordinal_abbr):this.faker.helpers.arrayElement(this.faker.definitions.location.direction.ordinal)}timeZone(){return this.faker.helpers.arrayElement(this.faker.definitions.location.time_zone)}language(){return this.faker.helpers.arrayElement(this.faker.definitions.location.language)}},ji=class extends I{int(a={}){typeof a=="number"&&(a={max:a});let{min:e=0,max:n=Number.MAX_SAFE_INTEGER,multipleOf:t=1}=a;if(!Number.isInteger(t))throw new p("multipleOf should be an integer.");if(t<=0)throw new p("multipleOf should be greater than 0.");let i=Math.ceil(e/t),r=Math.floor(n/t);if(i===r)return i*t;if(r<i)throw n>=e?new p(`No suitable integer value between ${e} and ${n} found.`):new p(`Max ${n} should be greater than min ${e}.`);let o=this.faker._randomizer.next(),l=r-i+1;return Math.floor(o*l+i)*t}float(a={}){typeof a=="number"&&(a={max:a});let{min:e=0,max:n=1,fractionDigits:t,multipleOf:i,multipleOf:r=t==null?void 0:10**-t}=a;if(n<e)throw new p(`Max ${n} should be greater than min ${e}.`);if(t!=null){if(i!=null)throw new p("multipleOf and fractionDigits cannot be set at the same time.");if(!Number.isInteger(t))throw new p("fractionDigits should be an integer.");if(t<0)throw new p("fractionDigits should be greater than or equal to 0.")}if(r!=null){if(r<=0)throw new p("multipleOf should be greater than 0.");let o=Math.log10(r),l=r<1&&Number.isInteger(o)?10**-o:1/r;return this.int({min:e*l,max:n*l})/l}return this.faker._randomizer.next()*(n-e)+e}binary(a={}){typeof a=="number"&&(a={max:a});let{min:e=0,max:n=1}=a;return this.int({max:n,min:e}).toString(2)}octal(a={}){typeof a=="number"&&(a={max:a});let{min:e=0,max:n=7}=a;return this.int({max:n,min:e}).toString(8)}hex(a={}){typeof a=="number"&&(a={max:a});let{min:e=0,max:n=15}=a;return this.int({max:n,min:e}).toString(16)}bigInt(a={}){(typeof a=="bigint"||typeof a=="number"||typeof a=="string"||typeof a=="boolean")&&(a={max:a});let e=BigInt(a.min??0),n=BigInt(a.max??e+BigInt(999999999999999)),t=BigInt(a.multipleOf??1);if(n<e)throw new p(`Max ${n} should be larger than min ${e}.`);if(t<=BigInt(0))throw new p("multipleOf should be greater than 0.");let i=e/t+(e%t>0n?1n:0n),r=n/t-(n%t<0n?1n:0n);if(i===r)return i*t;if(r<i)throw new p(`No suitable bigint value between ${e} and ${n} found.`);let o=r-i+1n,l=BigInt(this.faker.string.numeric({length:o.toString(10).length,allowLeadingZeros:!0}))%o;return(i+l)*t}romanNumeral(a={}){typeof a=="number"&&(a={max:a});let{min:e=1,max:n=3999}=a;if(e<1)throw new p(`Min value ${e} should be 1 or greater.`);if(n>3999)throw new p(`Max value ${n} should be 3999 or less.`);let t=this.int({min:e,max:n}),i=[["M",1e3],["CM",900],["D",500],["CD",400],["C",100],["XC",90],["L",50],["XL",40],["X",10],["IX",9],["V",5],["IV",4],["I",1]],r="";for(let[o,l]of i)r+=o.repeat(Math.floor(t/l)),t%=l;return r}},qe="0123456789ABCDEFGHJKMNPQRSTVWXYZ";function Yi(a){let e=a.valueOf(),n="";for(let t=10;t>0;t--){let i=e%32;n=qe[i]+n,e=(e-i)/32}return n}function qi(a){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replaceAll("x",()=>a.number.hex({min:0,max:15})).replaceAll("y",()=>a.number.hex({min:8,max:11}))}function Ui(a,e){let n=e.valueOf(),t=Math.max(n,0).toString(16).padStart(12,"0").slice(-12),i=[t.substring(0,8),t.substring(8)].join("-"),r="7xxx-yxxx-xxxxxxxxxxxx".replaceAll("x",()=>a.number.hex({min:0,max:15})).replaceAll("y",()=>a.number.hex({min:8,max:11}));return`${i}-${r}`}var $=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],O=[..."abcdefghijklmnopqrstuvwxyz"],me=[..."0123456789"],Zi=class extends I{fromCharacters(a,e=1){if(e=this.faker.helpers.rangeToNumber(e),e<=0)return"";if(typeof a=="string"&&(a=[...a]),a.length===0)throw new p("Unable to generate string: No characters to select from.");return this.faker.helpers.multiple(()=>this.faker.helpers.arrayElement(a),{count:e}).join("")}alpha(a={}){typeof a=="number"&&(a={length:a});let e=this.faker.helpers.rangeToNumber(a.length??1);if(e<=0)return"";let{casing:n="mixed"}=a,{exclude:t=[]}=a;typeof t=="string"&&(t=[...t]);let i;switch(n){case"upper":{i=[...$];break}case"lower":{i=[...O];break}case"mixed":{i=[...O,...$];break}}return i=i.filter(r=>!t.includes(r)),this.fromCharacters(i,e)}alphanumeric(a={}){typeof a=="number"&&(a={length:a});let e=this.faker.helpers.rangeToNumber(a.length??1);if(e<=0)return"";let{casing:n="mixed"}=a,{exclude:t=[]}=a;typeof t=="string"&&(t=[...t]);let i=[...me];switch(n){case"upper":{i.push(...$);break}case"lower":{i.push(...O);break}case"mixed":{i.push(...O,...$);break}}return i=i.filter(r=>!t.includes(r)),this.fromCharacters(i,e)}binary(a={}){let{prefix:e="0b"}=a,n=e;return n+=this.fromCharacters(["0","1"],a.length??1),n}octal(a={}){let{prefix:e="0o"}=a,n=e;return n+=this.fromCharacters(["0","1","2","3","4","5","6","7"],a.length??1),n}hexadecimal(a={}){let{casing:e="mixed",prefix:n="0x"}=a,t=this.faker.helpers.rangeToNumber(a.length??1);if(t<=0)return n;let i=this.fromCharacters(["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","A","B","C","D","E","F"],t);return e==="upper"?i=i.toUpperCase():e==="lower"&&(i=i.toLowerCase()),`${n}${i}`}numeric(a={}){typeof a=="number"&&(a={length:a});let e=this.faker.helpers.rangeToNumber(a.length??1);if(e<=0)return"";let{allowLeadingZeros:n=!0}=a,{exclude:t=[]}=a;typeof t=="string"&&(t=[...t]);let i=me.filter(o=>!t.includes(o));if(i.length===0||i.length===1&&!n&&i[0]==="0")throw new p("Unable to generate numeric string, because all possible digits are excluded.");let r="";return!n&&!t.includes("0")&&(r+=this.faker.helpers.arrayElement(i.filter(o=>o!=="0"))),r+=this.fromCharacters(i,e-r.length),r}sample(a=10){a=this.faker.helpers.rangeToNumber(a);let e={min:33,max:125},n="";for(;n.length<a;)n+=String.fromCodePoint(this.faker.number.int(e));return n}uuid(a={}){let{version:e=4,refDate:n=this.faker.defaultRefDate()}=a;return e===7?Ui(this.faker,x(n)):qi(this.faker)}ulid(a={}){let{refDate:e=this.faker.defaultRefDate()}=a,n=x(e);return Yi(n)+this.fromCharacters(qe,16)}nanoid(a=21){if(a=this.faker.helpers.rangeToNumber(a),a<=0)return"";let e=[{value:()=>this.alphanumeric(1),weight:62},{value:()=>this.faker.helpers.arrayElement(["_","-"]),weight:2}],n="";for(;n.length<a;){let t=this.faker.helpers.weightedArrayElement(e);n+=t()}return n}symbol(a=1){return this.fromCharacters(["!",'"',"#","$","%","&","'","(",")","*","+",",","-",".","/",":",";","<","=",">","?","@","[","\\","]","^","_","`","{","|","}","~"],a)}},Ue=class{_defaultRefDate=()=>new Date;get defaultRefDate(){return this._defaultRefDate}setDefaultRefDate(a=()=>new Date){typeof a=="function"?this._defaultRefDate=a:this._defaultRefDate=()=>new Date(a)}_randomizer;datatype=new xi(this);date=new Je(this);helpers=new je(this);location=new Ye(this);number=new ji(this);string=new Zi(this);constructor(a={}){let{randomizer:e,seed:n}=a;e!=null&&n!=null&&e.seed(n),this._randomizer=e??Li(n)}seed(a=ze()){return this._randomizer.seed(a),a}};new Ue;function Xi(a){let e={};for(let n of a)for(let t in n){let i=n[t];e[t]===void 0?e[t]={...i}:e[t]={...i,...e[t]}}return e}var Qi=class extends S{dog(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.dog)}cat(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.cat)}snake(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.snake)}bear(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.bear)}lion(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.lion)}cetacean(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.cetacean)}horse(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.horse)}bird(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.bird)}cow(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.cow)}fish(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.fish)}crocodilia(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.crocodilia)}insect(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.insect)}rabbit(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.rabbit)}rodent(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.rodent)}type(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.type)}petName(){return this.faker.helpers.arrayElement(this.faker.definitions.animal.pet_name)}},eo=class extends S{author(){return this.faker.helpers.arrayElement(this.faker.definitions.book.author)}format(){return this.faker.helpers.arrayElement(this.faker.definitions.book.format)}genre(){return this.faker.helpers.arrayElement(this.faker.definitions.book.genre)}publisher(){return this.faker.helpers.arrayElement(this.faker.definitions.book.publisher)}series(){return this.faker.helpers.arrayElement(this.faker.definitions.book.series)}title(){return this.faker.helpers.arrayElement(this.faker.definitions.book.title)}};function ao(a){if(!/^\d{11}$/.test(a))throw new p("calculateUPCCheckDigit expects exactly 11 numeric digits");let e=0,n=0;for(let t of a){let i=Number.parseInt(t,10);e+=i*(n%2===0?3:1),n++}return(10-e%10)%10}var no={0:[[1999999,2],[2279999,3],[2289999,4],[3689999,3],[3699999,4],[6389999,3],[6397999,4],[6399999,7],[6449999,3],[6459999,7],[6479999,3],[6489999,7],[6549999,3],[6559999,4],[6999999,3],[8499999,4],[8999999,5],[9499999,6],[9999999,7]],1:[[99999,3],[299999,2],[349999,3],[399999,4],[499999,3],[699999,2],[999999,4],[3979999,3],[5499999,4],[6499999,5],[6799999,4],[6859999,5],[7139999,4],[7169999,3],[7319999,4],[7399999,7],[7749999,5],[7753999,7],[7763999,5],[7764999,7],[7769999,5],[7782999,7],[7899999,5],[7999999,4],[8004999,5],[8049999,5],[8379999,5],[8384999,7],[8671999,5],[8675999,4],[8697999,5],[9159999,6],[9165059,7],[9168699,6],[9169079,7],[9195999,6],[9196549,7],[9729999,6],[9877999,4],[9911499,6],[9911999,7],[9989899,6],[9999999,7]]},to=class extends S{department(){return this.faker.helpers.arrayElement(this.faker.definitions.commerce.department)}productName(){let a=this.faker.definitions.commerce.product_name.pattern;return this.faker.helpers.fake(a)}price(a={}){let{dec:e=2,max:n=1e3,min:t=1,symbol:i=""}=a;if(t<0||n<0)return`${i}0`;if(t===n)return`${i}${t.toFixed(e)}`;let r=this.faker.number.float({min:t,max:n,fractionDigits:e});if(e===0)return`${i}${r.toFixed(e)}`;let o=r*10**e%10,l=this.faker.helpers.weightedArrayElement([{weight:5,value:9},{weight:3,value:5},{weight:1,value:0},{weight:1,value:this.faker.number.int({min:0,max:9})}]),u=(1/10)**e,s=o*u,c=l*u,d=r-s+c;return t<=d&&d<=n?`${i}${d.toFixed(e)}`:`${i}${r.toFixed(e)}`}productAdjective(){return this.faker.helpers.arrayElement(this.faker.definitions.commerce.product_name.adjective)}productMaterial(){return this.faker.helpers.arrayElement(this.faker.definitions.commerce.product_name.material)}product(){return this.faker.helpers.arrayElement(this.faker.definitions.commerce.product_name.product)}productDescription(){return this.faker.helpers.fake(this.faker.definitions.commerce.product_description)}isbn(a={}){typeof a=="number"&&(a={variant:a});let{variant:e=13,separator:n="-"}=a,t="978",[i,r]=this.faker.helpers.objectEntry(no),o=this.faker.string.numeric(8),l=Number.parseInt(o.slice(0,-1)),u=r.find(([h])=>l<=h)?.[1];if(!u)throw new p(`Unable to find a registrant length for the group ${i}`);let s=o.slice(0,u),c=o.slice(u),d=[t,i,s,c];e===10&&d.shift();let m=d.join(""),g=0;for(let h=0;h<e-1;h++){let F=e===10?h+1:h%2?3:1;g+=F*Number.parseInt(m[h])}return g=e===10?g%11:(10-g%10)%10,d.push(g===10?"X":g.toString()),d.join(n)}upc(a={}){let{prefix:e=""}=a;if(e&&/\D/.test(e))throw new p("Prefix must contain only numeric digits");if(e.length>11)throw new p("Prefix must be at most 11 numeric digits");let n=11-e.length,t=this.faker.string.numeric({length:n,allowLeadingZeros:!0}),i=`${e}${t}`,r=ao(i);return`${i}${r}`}},ro=class extends S{name(){return this.faker.helpers.fake(this.faker.definitions.company.name_pattern)}catchPhrase(){return[this.catchPhraseAdjective(),this.catchPhraseDescriptor(),this.catchPhraseNoun()].join(" ")}buzzPhrase(){return[this.buzzVerb(),this.buzzAdjective(),this.buzzNoun()].join(" ")}catchPhraseAdjective(){return this.faker.helpers.arrayElement(this.faker.definitions.company.adjective)}catchPhraseDescriptor(){return this.faker.helpers.arrayElement(this.faker.definitions.company.descriptor)}catchPhraseNoun(){return this.faker.helpers.arrayElement(this.faker.definitions.company.noun)}buzzAdjective(){return this.faker.helpers.arrayElement(this.faker.definitions.company.buzz_adjective)}buzzVerb(){return this.faker.helpers.arrayElement(this.faker.definitions.company.buzz_verb)}buzzNoun(){return this.faker.helpers.arrayElement(this.faker.definitions.company.buzz_noun)}},io=class extends S{column(){return this.faker.helpers.arrayElement(this.faker.definitions.database.column)}type(){return this.faker.helpers.arrayElement(this.faker.definitions.database.type)}collation(){return this.faker.helpers.arrayElement(this.faker.definitions.database.collation)}engine(){return this.faker.helpers.arrayElement(this.faker.definitions.database.engine)}mongodbObjectId(){return this.faker.string.hexadecimal({length:24,casing:"lower",prefix:""})}},oo={alpha:["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"],formats:[{country:"AL",total:28,bban:[{type:"n",count:8},{type:"c",count:16}],format:"ALkk bbbs sssx cccc cccc cccc cccc"},{country:"AD",total:24,bban:[{type:"n",count:8},{type:"c",count:12}],format:"ADkk bbbb ssss cccc cccc cccc"},{country:"AT",total:20,bban:[{type:"n",count:5},{type:"n",count:11}],format:"ATkk bbbb bccc cccc cccc"},{country:"AZ",total:28,bban:[{type:"a",count:4},{type:"n",count:20}],format:"AZkk bbbb cccc cccc cccc cccc cccc"},{country:"BH",total:22,bban:[{type:"a",count:4},{type:"c",count:14}],format:"BHkk bbbb cccc cccc cccc cc"},{country:"BE",total:16,bban:[{type:"n",count:3},{type:"n",count:9}],format:"BEkk bbbc cccc ccxx"},{country:"BA",total:20,bban:[{type:"n",count:6},{type:"n",count:10}],format:"BAkk bbbs sscc cccc ccxx"},{country:"BR",total:29,bban:[{type:"n",count:13},{type:"n",count:10},{type:"a",count:1},{type:"c",count:1}],format:"BRkk bbbb bbbb ssss sccc cccc ccct n"},{country:"BG",total:22,bban:[{type:"a",count:4},{type:"n",count:6},{type:"c",count:8}],format:"BGkk bbbb ssss ddcc cccc cc"},{country:"CR",total:22,bban:[{type:"n",count:1},{type:"n",count:3},{type:"n",count:14}],format:"CRkk xbbb cccc cccc cccc cc"},{country:"HR",total:21,bban:[{type:"n",count:7},{type:"n",count:10}],format:"HRkk bbbb bbbc cccc cccc c"},{country:"CY",total:28,bban:[{type:"n",count:8},{type:"c",count:16}],format:"CYkk bbbs ssss cccc cccc cccc cccc"},{country:"CZ",total:24,bban:[{type:"n",count:10},{type:"n",count:10}],format:"CZkk bbbb ssss sscc cccc cccc"},{country:"DK",total:18,bban:[{type:"n",count:4},{type:"n",count:10}],format:"DKkk bbbb cccc cccc cc"},{country:"DO",total:28,bban:[{type:"a",count:4},{type:"n",count:20}],format:"DOkk bbbb cccc cccc cccc cccc cccc"},{country:"TL",total:23,bban:[{type:"n",count:3},{type:"n",count:16}],format:"TLkk bbbc cccc cccc cccc cxx"},{country:"EE",total:20,bban:[{type:"n",count:4},{type:"n",count:12}],format:"EEkk bbss cccc cccc cccx"},{country:"FO",total:18,bban:[{type:"n",count:4},{type:"n",count:10}],format:"FOkk bbbb cccc cccc cx"},{country:"FI",total:18,bban:[{type:"n",count:6},{type:"n",count:8}],format:"FIkk bbbb bbcc cccc cx"},{country:"FR",total:27,bban:[{type:"n",count:10},{type:"c",count:11},{type:"n",count:2}],format:"FRkk bbbb bggg ggcc cccc cccc cxx"},{country:"GE",total:22,bban:[{type:"a",count:2},{type:"n",count:16}],format:"GEkk bbcc cccc cccc cccc cc"},{country:"DE",total:22,bban:[{type:"n",count:8},{type:"n",count:10}],format:"DEkk bbbb bbbb cccc cccc cc"},{country:"GI",total:23,bban:[{type:"a",count:4},{type:"c",count:15}],format:"GIkk bbbb cccc cccc cccc ccc"},{country:"GR",total:27,bban:[{type:"n",count:7},{type:"c",count:16}],format:"GRkk bbbs sssc cccc cccc cccc ccc"},{country:"GL",total:18,bban:[{type:"n",count:4},{type:"n",count:10}],format:"GLkk bbbb cccc cccc cc"},{country:"GT",total:28,bban:[{type:"c",count:4},{type:"c",count:4},{type:"c",count:16}],format:"GTkk bbbb mmtt cccc cccc cccc cccc"},{country:"HU",total:28,bban:[{type:"n",count:8},{type:"n",count:16}],format:"HUkk bbbs sssk cccc cccc cccc cccx"},{country:"IS",total:26,bban:[{type:"n",count:6},{type:"n",count:16}],format:"ISkk bbbb sscc cccc iiii iiii ii"},{country:"IE",total:22,bban:[{type:"a",count:4},{type:"n",count:6},{type:"n",count:8}],format:"IEkk aaaa bbbb bbcc cccc cc"},{country:"IL",total:23,bban:[{type:"n",count:6},{type:"n",count:13}],format:"ILkk bbbn nncc cccc cccc ccc"},{country:"IR",total:26,bban:[{type:"n",count:22}],format:"IRkk bbbb cccc cccc cccc cccc cc"},{country:"IT",total:27,bban:[{type:"a",count:1},{type:"n",count:10},{type:"c",count:12}],format:"ITkk xaaa aabb bbbc cccc cccc ccc"},{country:"JO",total:30,bban:[{type:"a",count:4},{type:"n",count:4},{type:"n",count:18}],format:"JOkk bbbb nnnn cccc cccc cccc cccc cc"},{country:"KZ",total:20,bban:[{type:"n",count:3},{type:"c",count:13}],format:"KZkk bbbc cccc cccc cccc"},{country:"XK",total:20,bban:[{type:"n",count:4},{type:"n",count:12}],format:"XKkk bbbb cccc cccc cccc"},{country:"KW",total:30,bban:[{type:"a",count:4},{type:"c",count:22}],format:"KWkk bbbb cccc cccc cccc cccc cccc cc"},{country:"LV",total:21,bban:[{type:"a",count:4},{type:"c",count:13}],format:"LVkk bbbb cccc cccc cccc c"},{country:"LB",total:28,bban:[{type:"n",count:4},{type:"c",count:20}],format:"LBkk bbbb cccc cccc cccc cccc cccc"},{country:"LI",total:21,bban:[{type:"n",count:5},{type:"c",count:12}],format:"LIkk bbbb bccc cccc cccc c"},{country:"LT",total:20,bban:[{type:"n",count:5},{type:"n",count:11}],format:"LTkk bbbb bccc cccc cccc"},{country:"LU",total:20,bban:[{type:"n",count:3},{type:"c",count:13}],format:"LUkk bbbc cccc cccc cccc"},{country:"MK",total:19,bban:[{type:"n",count:3},{type:"c",count:10},{type:"n",count:2}],format:"MKkk bbbc cccc cccc cxx"},{country:"MT",total:31,bban:[{type:"a",count:4},{type:"n",count:5},{type:"c",count:18}],format:"MTkk bbbb ssss sccc cccc cccc cccc ccc"},{country:"MR",total:27,bban:[{type:"n",count:10},{type:"n",count:13}],format:"MRkk bbbb bsss sscc cccc cccc cxx"},{country:"MU",total:30,bban:[{type:"a",count:4},{type:"n",count:4},{type:"n",count:15},{type:"a",count:3}],format:"MUkk bbbb bbss cccc cccc cccc 000d dd"},{country:"MC",total:27,bban:[{type:"n",count:10},{type:"c",count:11},{type:"n",count:2}],format:"MCkk bbbb bsss sscc cccc cccc cxx"},{country:"MD",total:24,bban:[{type:"c",count:2},{type:"c",count:18}],format:"MDkk bbcc cccc cccc cccc cccc"},{country:"ME",total:22,bban:[{type:"n",count:3},{type:"n",count:15}],format:"MEkk bbbc cccc cccc cccc xx"},{country:"NL",total:18,bban:[{type:"a",count:4},{type:"n",count:10}],format:"NLkk bbbb cccc cccc cc"},{country:"NO",total:15,bban:[{type:"n",count:4},{type:"n",count:7}],format:"NOkk bbbb cccc ccx"},{country:"PK",total:24,bban:[{type:"a",count:4},{type:"n",count:16}],format:"PKkk bbbb cccc cccc cccc cccc"},{country:"PS",total:29,bban:[{type:"a",count:4},{type:"n",count:9},{type:"n",count:12}],format:"PSkk bbbb xxxx xxxx xccc cccc cccc c"},{country:"PL",total:28,bban:[{type:"n",count:8},{type:"n",count:16}],format:"PLkk bbbs sssx cccc cccc cccc cccc"},{country:"PT",total:25,bban:[{type:"n",count:8},{type:"n",count:13}],format:"PTkk bbbb ssss cccc cccc cccx x"},{country:"QA",total:29,bban:[{type:"a",count:4},{type:"c",count:21}],format:"QAkk bbbb cccc cccc cccc cccc cccc c"},{country:"RO",total:24,bban:[{type:"a",count:4},{type:"c",count:16}],format:"ROkk bbbb cccc cccc cccc cccc"},{country:"SM",total:27,bban:[{type:"a",count:1},{type:"n",count:10},{type:"c",count:12}],format:"SMkk xaaa aabb bbbc cccc cccc ccc"},{country:"SA",total:24,bban:[{type:"n",count:2},{type:"c",count:18}],format:"SAkk bbcc cccc cccc cccc cccc"},{country:"RS",total:22,bban:[{type:"n",count:3},{type:"n",count:15}],format:"RSkk bbbc cccc cccc cccc xx"},{country:"SK",total:24,bban:[{type:"n",count:10},{type:"n",count:10}],format:"SKkk bbbb ssss sscc cccc cccc"},{country:"SI",total:19,bban:[{type:"n",count:5},{type:"n",count:10}],format:"SIkk bbss sccc cccc cxx"},{country:"ES",total:24,bban:[{type:"n",count:10},{type:"n",count:10}],format:"ESkk bbbb gggg xxcc cccc cccc"},{country:"SE",total:24,bban:[{type:"n",count:3},{type:"n",count:17}],format:"SEkk bbbc cccc cccc cccc cccc"},{country:"CH",total:21,bban:[{type:"n",count:5},{type:"c",count:12}],format:"CHkk bbbb bccc cccc cccc c"},{country:"TN",total:24,bban:[{type:"n",count:5},{type:"n",count:15}],format:"TNkk bbss sccc cccc cccc cccc"},{country:"TR",total:26,bban:[{type:"n",count:5},{type:"n",count:1},{type:"n",count:16}],format:"TRkk bbbb bxcc cccc cccc cccc cc"},{country:"AE",total:23,bban:[{type:"n",count:3},{type:"n",count:16}],format:"AEkk bbbc cccc cccc cccc ccc"},{country:"GB",total:22,bban:[{type:"a",count:4},{type:"n",count:6},{type:"n",count:8}],format:"GBkk bbbb ssss sscc cccc cc"},{country:"VG",total:24,bban:[{type:"a",count:4},{type:"n",count:16}],format:"VGkk bbbb cccc cccc cccc cccc"}],iso3166:["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","XK","YE","YT","ZA","ZM","ZW"],mod97:a=>{let e=0;for(let n of a)e=(e*10+ +n)%97;return e},pattern10:["01","02","03","04","05","06","07","08","09"],pattern100:["001","002","003","004","005","006","007","008","009"],toDigitString:a=>a.replaceAll(/[A-Z]/gi,e=>String((e.toUpperCase().codePointAt(0)??Number.NaN)-55))},N=oo;function lo(a){let e="";for(let n=0;n<a.length;n+=4)e+=`${a.substring(n,n+4)} `;return e.trimEnd()}var so=class extends S{accountNumber(a={}){typeof a=="number"&&(a={length:a});let{length:e=8}=a;return this.faker.string.numeric({length:e,allowLeadingZeros:!0})}accountName(){return[this.faker.helpers.arrayElement(this.faker.definitions.finance.account_type),"Account"].join(" ")}routingNumber(){let a=this.faker.string.numeric({length:8,allowLeadingZeros:!0}),e=0;for(let n=0;n<a.length;n+=3)e+=Number(a[n])*3,e+=Number(a[n+1])*7,e+=Number(a[n+2])||0;return`${a}${Math.ceil(e/10)*10-e}`}amount(a={}){let{autoFormat:e=!1,dec:n=2,max:t=1e3,min:i=0,symbol:r=""}=a,o=this.faker.number.float({max:t,min:i,fractionDigits:n}),l=e?o.toLocaleString(void 0,{minimumFractionDigits:n}):o.toFixed(n);return r+l}transactionType(){return this.faker.helpers.arrayElement(this.faker.definitions.finance.transaction_type)}currency(){return this.faker.helpers.arrayElement(this.faker.definitions.finance.currency)}currencyCode(){return this.currency().code}currencyName(){return this.currency().name}currencySymbol(){let a;do a=this.currency().symbol;while(a.length===0);return a}currencyNumericCode(){return this.currency().numericCode}bitcoinAddress(a={}){let{type:e=this.faker.helpers.enumValue(_e),network:n="mainnet"}=a,t=yi[e],i=t.prefix[n],r=this.faker.number.int(t.length),o=this.faker.string.alphanumeric({length:r-i.length,casing:t.casing,exclude:t.exclude});return i+o}litecoinAddress(){let a=this.faker.number.int({min:26,max:33});return this.faker.string.fromCharacters("LM3")+this.faker.string.fromCharacters("123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",a-1)}creditCardNumber(a={}){typeof a=="string"&&(a={issuer:a});let{issuer:e=""}=a,n,t=this.faker.definitions.finance.credit_card,i=e.toLowerCase();if(i in t)n=this.faker.helpers.arrayElement(t[i]);else if(e.includes("#"))n=e;else{let r=this.faker.helpers.objectValue(t);n=this.faker.helpers.arrayElement(r)}return n=n.replaceAll("/",""),this.faker.helpers.replaceCreditCardSymbols(n)}creditCardCVV(){return this.faker.string.numeric({length:3,allowLeadingZeros:!0})}creditCardIssuer(){return this.faker.helpers.objectKey(this.faker.definitions.finance.credit_card)}pin(a={}){typeof a=="number"&&(a={length:a});let{length:e=4}=a;if(e<1)throw new p("minimum length is 1");return this.faker.string.numeric({length:e,allowLeadingZeros:!0})}ethereumAddress(){return this.faker.string.hexadecimal({length:40,casing:"lower"})}iban(a={}){let{countryCode:e,formatted:n=!1}=a,t=e?N.formats.find(u=>u.country===e):this.faker.helpers.arrayElement(N.formats);if(!t)throw new p(`Country code ${e} not supported.`);let i="",r=0;for(let u of t.bban){let s=u.count;for(r+=u.count;s>0;)u.type==="a"?i+=this.faker.helpers.arrayElement(N.alpha):u.type==="c"?this.faker.datatype.boolean(.8)?i+=this.faker.number.int(9):i+=this.faker.helpers.arrayElement(N.alpha):s>=3&&this.faker.datatype.boolean(.3)?this.faker.datatype.boolean()?(i+=this.faker.helpers.arrayElement(N.pattern100),s-=2):(i+=this.faker.helpers.arrayElement(N.pattern10),s--):i+=this.faker.number.int(9),s--;i=i.substring(0,r)}let o=98-N.mod97(N.toDigitString(`${i}${t.country}00`));o<10&&(o=`0${o}`);let l=`${t.country}${o}${i}`;return n?lo(l):l}bic(a={}){let{includeBranchCode:e=this.faker.datatype.boolean()}=a,n=this.faker.string.alpha({length:4,casing:"upper"}),t=this.faker.helpers.arrayElement(N.iso3166),i=this.faker.string.alphanumeric({length:2,casing:"upper"}),r=e?this.faker.datatype.boolean()?this.faker.string.alphanumeric({length:3,casing:"upper"}):"XXX":"";return`${n}${t}${i}${r}`}transactionDescription(){return this.faker.helpers.fake(this.faker.definitions.finance.transaction_description_pattern)}};function pe(a){return a.split(" ").map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(" ")}var uo=class extends S{adjective(){return this.faker.helpers.arrayElement(this.faker.definitions.food.adjective)}description(){return this.faker.helpers.fake(this.faker.definitions.food.description_pattern)}dish(){return this.faker.datatype.boolean()?pe(this.faker.helpers.fake(this.faker.definitions.food.dish_pattern)):pe(this.faker.helpers.arrayElement(this.faker.definitions.food.dish))}ethnicCategory(){return this.faker.helpers.arrayElement(this.faker.definitions.food.ethnic_category)}fruit(){return this.faker.helpers.arrayElement(this.faker.definitions.food.fruit)}ingredient(){return this.faker.helpers.arrayElement(this.faker.definitions.food.ingredient)}meat(){return this.faker.helpers.arrayElement(this.faker.definitions.food.meat)}spice(){return this.faker.helpers.arrayElement(this.faker.definitions.food.spice)}vegetable(){return this.faker.helpers.arrayElement(this.faker.definitions.food.vegetable)}},co=" ",ho=class extends S{branch(){let a=this.faker.hacker.noun().replace(" ","-"),e=this.faker.hacker.verb().replace(" ","-");return`${a}-${e}`}commitEntry(a={}){let{merge:e=this.faker.datatype.boolean({probability:.2}),eol:n="CRLF",refDate:t}=a,i=[`commit ${this.faker.git.commitSha()}`];e&&i.push(`Merge: ${this.commitSha({length:7})} ${this.commitSha({length:7})}`);let r=this.faker.person.firstName(),o=this.faker.person.lastName(),l=this.faker.person.fullName({firstName:r,lastName:o}),u=this.faker.internet.username({firstName:r,lastName:o}),s=this.faker.helpers.arrayElement([l,u]),c=this.faker.internet.email({firstName:r,lastName:o});s=s.replaceAll(/^[.,:;"\\']|[<>\n]|[.,:;"\\']$/g,""),i.push(`Author: ${s} <${c}>`,`Date: ${this.commitDate({refDate:t})}`,"",`${co.repeat(4)}${this.commitMessage()}`,"");let d=n==="CRLF"?`\r
`:`
`;return i.join(d)}commitMessage(){return`${this.faker.hacker.verb()} ${this.faker.hacker.adjective()} ${this.faker.hacker.noun()}`}commitDate(a={}){let{refDate:e=this.faker.defaultRefDate()}=a,n=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],t=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],i=this.faker.date.recent({days:1,refDate:e}),r=n[i.getUTCDay()],o=t[i.getUTCMonth()],l=i.getUTCDate(),u=i.getUTCHours().toString().padStart(2,"0"),s=i.getUTCMinutes().toString().padStart(2,"0"),c=i.getUTCSeconds().toString().padStart(2,"0"),d=i.getUTCFullYear(),m=this.faker.number.int({min:-11,max:12}),g=Math.abs(m).toString().padStart(2,"0"),h="00",F=m>=0?"+":"-";return`${r} ${o} ${l} ${u}:${s}:${c} ${d} ${F}${g}${h}`}commitSha(a={}){let{length:e=40}=a;return this.faker.string.hexadecimal({length:e,casing:"lower",prefix:""})}},mo=class extends S{abbreviation(){return this.faker.helpers.arrayElement(this.faker.definitions.hacker.abbreviation)}adjective(){return this.faker.helpers.arrayElement(this.faker.definitions.hacker.adjective)}noun(){return this.faker.helpers.arrayElement(this.faker.definitions.hacker.noun)}verb(){return this.faker.helpers.arrayElement(this.faker.definitions.hacker.verb)}ingverb(){return this.faker.helpers.arrayElement(this.faker.definitions.hacker.ingverb)}phrase(){let a={abbreviation:this.abbreviation,adjective:this.adjective,ingverb:this.ingverb,noun:this.noun,verb:this.verb},e=this.faker.helpers.arrayElement(this.faker.definitions.hacker.phrase);return this.faker.helpers.mustache(e,a)}};function po(a){let{deprecated:e,since:n,until:t,proposed:i}=a,r=`[@faker-js/faker]: ${e} is deprecated`;n&&(r+=` since v${n}`),t&&(r+=` and will be removed in v${t}`),i&&(r+=`. Please use ${i} instead`),console.warn(`${r}.`)}var Fo=class extends S{avatar(){return this.faker.helpers.arrayElement([this.personPortrait,this.avatarGitHub])()}avatarGitHub(){return`https://avatars.githubusercontent.com/u/${this.faker.number.int(1e8)}`}personPortrait(a={}){let{size:e=512}=a,{sex:n=this.faker.person.sexType()}=a;return n==="generic"&&(n=this.faker.person.sexType()),`https://cdn.jsdelivr.net/gh/faker-js/assets-person-portrait/${n}/${e}/${this.faker.number.int({min:0,max:99})}.jpg`}url(a={}){let{width:e=this.faker.number.int({min:1,max:3999}),height:n=this.faker.number.int({min:1,max:3999})}=a;return this.faker.helpers.arrayElement([({width:t,height:i})=>this.urlPicsumPhotos({width:t,height:i,grayscale:!1,blur:0})])({width:e,height:n})}urlLoremFlickr(a={}){po({deprecated:"faker.image.urlLoremFlickr()",proposed:"faker.image.url()",since:"10.1.0",until:"11.0.0"});let{width:e=this.faker.number.int({min:1,max:3999}),height:n=this.faker.number.int({min:1,max:3999}),category:t}=a;return`https://loremflickr.com/${e}/${n}${t==null?"":`/${t}`}?lock=${this.faker.number.int()}`}urlPicsumPhotos(a={}){let{width:e=this.faker.number.int({min:1,max:3999}),height:n=this.faker.number.int({min:1,max:3999}),grayscale:t=this.faker.datatype.boolean(),blur:i=this.faker.number.int({max:10})}=a,r=`https://picsum.photos/seed/${this.faker.string.alphanumeric({length:{min:5,max:10}})}/${e}/${n}`,o=typeof i=="number"&&i>=1&&i<=10;return(t||o)&&(r+="?",t&&(r+="grayscale"),t&&o&&(r+="&"),o&&(r+=`blur=${i}`)),r}dataUri(a={}){let{width:e=this.faker.number.int({min:1,max:3999}),height:n=this.faker.number.int({min:1,max:3999}),color:t=this.faker.color.rgb(),type:i=this.faker.helpers.arrayElement(["svg-uri","svg-base64"])}=a,r=`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" baseProfile="full" width="${e}" height="${n}"><rect width="100%" height="100%" fill="${t}"/><text x="${e/2}" y="${n/2}" font-size="20" alignment-baseline="middle" text-anchor="middle" fill="white">${e}x${n}</text></svg>`;return i==="svg-uri"?`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(r)}`:`data:image/svg+xml;base64,${We(r)}`}};function yo(a,e,n=t=>t){let t={};for(let i of a){let r=e(i);t[r]===void 0&&(t[r]=[]),t[r].push(n(i))}return t}var Z={fail:()=>{throw new p("No words found that match the given length.")},closest:(a,e)=>{let n=yo(a,l=>l.length),t=Object.keys(n).map(Number),i=Math.min(...t),r=Math.max(...t),o=Math.min(e.min-i,r-e.max);return a.filter(l=>l.length===e.min-o||l.length===e.max+o)},shortest:a=>{let e=Math.min(...a.map(n=>n.length));return a.filter(n=>n.length===e)},longest:a=>{let e=Math.max(...a.map(n=>n.length));return a.filter(n=>n.length===e)},"any-length":a=>[...a]};function P(a){let{wordList:e,length:n,strategy:t="fail"}=a;if(n!=null){let i=typeof n=="number"?o=>o.length===n:o=>o.length>=n.min&&o.length<=n.max,r=e.filter(i);return r.length>0?r:typeof n=="number"?Z[t](e,{min:n,max:n}):Z[t](e,n)}else if(t==="shortest"||t==="longest")return Z[t](e);return[...e]}var go=class extends S{word(a={}){return typeof a=="number"&&(a={length:a}),this.faker.helpers.arrayElement(P({...a,wordList:this.faker.definitions.lorem.word}))}words(a=3){return this.faker.helpers.multiple(()=>this.word(),{count:a}).join(" ")}sentence(a={min:3,max:10}){let e=this.words(a);return`${e.charAt(0).toUpperCase()+e.substring(1)}.`}slug(a=3){let e=this.words(a);return this.faker.helpers.slugify(e)}sentences(a={min:2,max:6},e=" "){return this.faker.helpers.multiple(()=>this.sentence(),{count:a}).join(e)}paragraph(a=3){return this.sentences(a)}paragraphs(a=3,e=`
`){return this.faker.helpers.multiple(()=>this.paragraph(),{count:a}).join(e)}text(){let a=["sentence","sentences","paragraph","paragraphs","lines"],e=this.faker.helpers.arrayElement(a);return this[e]()}lines(a={min:1,max:5}){return this.sentences(a,`
`)}},bo=class extends S{album(){return this.faker.helpers.arrayElement(this.faker.definitions.music.album)}artist(){return this.faker.helpers.arrayElement(this.faker.definitions.music.artist)}genre(){return this.faker.helpers.arrayElement(this.faker.definitions.music.genre)}songName(){return this.faker.helpers.arrayElement(this.faker.definitions.music.song_name)}},fo=class extends S{number(a={}){let{style:e="human"}=a,n=this.faker.definitions.phone_number.format[e];if(!n)throw new Error(`No definitions for ${e} in this locale`);let t=this.faker.helpers.arrayElement(n);return Ve(this.faker,t)}imei(){return this.faker.helpers.replaceCreditCardSymbols("##-######-######-L","#")}},vo=class extends S{chemicalElement(){return this.faker.helpers.arrayElement(this.faker.definitions.science.chemical_element)}unit(){return this.faker.helpers.arrayElement(this.faker.definitions.science.unit)}},Co=["video","audio","image","text","application"],ko=["application/pdf","audio/mpeg","audio/wav","image/png","image/jpeg","image/gif","video/mp4","video/mpeg","text/html"],So=["en","wl","ww"],Fe={index:"o",slot:"s",mac:"x",pci:"p"},Eo=["SUN","MON","TUE","WED","THU","FRI","SAT"],Ao=class extends S{fileName(a={}){let{extensionCount:e=1}=a,n=this.faker.word.words().toLowerCase().replaceAll(/\W/g,"_"),t=this.faker.helpers.multiple(()=>this.fileExt(),{count:e}).join(".");return t.length===0?n:`${n}.${t}`}commonFileName(a){return`${this.fileName({extensionCount:0})}.${a||this.commonFileExt()}`}mimeType(){let a=Object.keys(this.faker.definitions.system.mime_type);return this.faker.helpers.arrayElement(a)}commonFileType(){return this.faker.helpers.arrayElement(Co)}commonFileExt(){return this.fileExt(this.faker.helpers.arrayElement(ko))}fileType(){let a=this.faker.definitions.system.mime_type,e=new Set(Object.keys(a).map(n=>n.split("/")[0]));return this.faker.helpers.arrayElement([...e])}fileExt(a){let e=this.faker.definitions.system.mime_type;if(typeof a=="string")return this.faker.helpers.arrayElement(e[a].extensions);let n=new Set(Object.values(e).flatMap(({extensions:t})=>t));return this.faker.helpers.arrayElement([...n])}directoryPath(){let a=this.faker.definitions.system.directory_path;return this.faker.helpers.arrayElement(a)}filePath(){return`${this.directoryPath()}/${this.fileName()}`}semver(){return[this.faker.number.int(9),this.faker.number.int(20),this.faker.number.int(20)].join(".")}networkInterface(a={}){let{interfaceType:e=this.faker.helpers.arrayElement(So),interfaceSchema:n=this.faker.helpers.objectKey(Fe)}=a,t,i="";switch(n){case"index":{t=this.faker.string.numeric();break}case"slot":{t=`${this.faker.string.numeric()}${this.faker.helpers.maybe(()=>`f${this.faker.string.numeric()}`)??""}${this.faker.helpers.maybe(()=>`d${this.faker.string.numeric()}`)??""}`;break}case"mac":{t=this.faker.internet.mac("");break}case"pci":{i=this.faker.helpers.maybe(()=>`P${this.faker.string.numeric()}`)??"",t=`${this.faker.string.numeric()}s${this.faker.string.numeric()}${this.faker.helpers.maybe(()=>`f${this.faker.string.numeric()}`)??""}${this.faker.helpers.maybe(()=>`d${this.faker.string.numeric()}`)??""}`;break}}return`${i}${e}${Fe[n]}${t}`}cron(a={}){let{includeYear:e=!1,includeNonStandard:n=!1}=a,t=[this.faker.number.int(59),"*"],i=[this.faker.number.int(23),"*"],r=[this.faker.number.int({min:1,max:31}),"*","?"],o=[this.faker.number.int({min:1,max:12}),"*"],l=[this.faker.number.int(6),this.faker.helpers.arrayElement(Eo),"*","?"],u=[this.faker.number.int({min:1970,max:2099}),"*"],s=this.faker.helpers.arrayElement(t),c=this.faker.helpers.arrayElement(i),d=this.faker.helpers.arrayElement(r),m=this.faker.helpers.arrayElement(o),g=this.faker.helpers.arrayElement(l),h=this.faker.helpers.arrayElement(u),F=`${s} ${c} ${d} ${m} ${g}`;e&&(F+=` ${h}`);let y=["@annually","@daily","@hourly","@monthly","@reboot","@weekly","@yearly"];return!n||this.faker.datatype.boolean()?F:this.faker.helpers.arrayElement(y)}},Do=class extends S{vehicle(){return`${this.manufacturer()} ${this.model()}`}manufacturer(){return this.faker.helpers.arrayElement(this.faker.definitions.vehicle.manufacturer)}model(){return this.faker.helpers.arrayElement(this.faker.definitions.vehicle.model)}type(){return this.faker.helpers.arrayElement(this.faker.definitions.vehicle.type)}fuel(){return this.faker.helpers.arrayElement(this.faker.definitions.vehicle.fuel)}vin(){let a=["o","i","q","O","I","Q"];return`${this.faker.string.alphanumeric({length:10,casing:"upper",exclude:a})}${this.faker.string.alpha({length:1,casing:"upper",exclude:a})}${this.faker.string.alphanumeric({length:1,casing:"upper",exclude:a})}${this.faker.string.numeric({length:5,allowLeadingZeros:!0})}`}color(){return this.faker.color.human()}vrm(){return`${this.faker.string.alpha({length:2,casing:"upper"})}${this.faker.string.numeric({length:2,allowLeadingZeros:!0})}${this.faker.string.alpha({length:3,casing:"upper"})}`}bicycle(){return this.faker.helpers.arrayElement(this.faker.definitions.vehicle.bicycle_type)}},Bo=class extends S{adjective(a={}){return typeof a=="number"&&(a={length:a}),this.faker.helpers.arrayElement(P({...a,wordList:this.faker.definitions.word.adjective}))}adverb(a={}){return typeof a=="number"&&(a={length:a}),this.faker.helpers.arrayElement(P({...a,wordList:this.faker.definitions.word.adverb}))}conjunction(a={}){return typeof a=="number"&&(a={length:a}),this.faker.helpers.arrayElement(P({...a,wordList:this.faker.definitions.word.conjunction}))}interjection(a={}){return typeof a=="number"&&(a={length:a}),this.faker.helpers.arrayElement(P({...a,wordList:this.faker.definitions.word.interjection}))}noun(a={}){return typeof a=="number"&&(a={length:a}),this.faker.helpers.arrayElement(P({...a,wordList:this.faker.definitions.word.noun}))}preposition(a={}){return typeof a=="number"&&(a={length:a}),this.faker.helpers.arrayElement(P({...a,wordList:this.faker.definitions.word.preposition}))}verb(a={}){return typeof a=="number"&&(a={length:a}),this.faker.helpers.arrayElement(P({...a,wordList:this.faker.definitions.word.verb}))}sample(a={}){let e=this.faker.helpers.shuffle([this.adjective,this.adverb,this.conjunction,this.interjection,this.noun,this.preposition,this.verb]);for(let n of e)try{return n(a)}catch{continue}throw new p("No matching word data available for the current locale")}words(a={}){typeof a=="number"&&(a={count:a});let{count:e={min:1,max:3}}=a;return this.faker.helpers.multiple(()=>this.sample(),{count:e}).join(" ")}},wo=class extends Ue{rawDefinitions;definitions;airline=new di(this);animal=new Qi(this);book=new eo(this);color=new pi(this);commerce=new to(this);company=new ro(this);database=new io(this);date=new Pi(this);finance=new so(this);food=new uo(this);git=new ho(this);hacker=new mo(this);helpers=new Ji(this);image=new Fo(this);internet=new Ai(this);location=new Vi(this);lorem=new go(this);music=new bo(this);person=new Di(this);phone=new fo(this);science=new vo(this);system=new Ao(this);vehicle=new Do(this);word=new Bo(this);constructor(a){super({randomizer:a.randomizer,seed:a.seed});let{locale:e}=a;if(Array.isArray(e)){if(e.length===0)throw new p("The locale option must contain at least one locale definition.");e=Xi(e)}this.rawDefinitions=e,this.definitions=Ni(this.rawDefinitions)}getMetadata(){return this.rawDefinitions.metadata??{}}},To=["Academy Color Encoding System (ACES)","Adobe RGB","Adobe Wide Gamut RGB","British Standard Colour (BS)","CIE 1931 XYZ","CIELAB","CIELUV","CIEUVW","CMY","CMYK","DCI-P3","Display-P3","Federal Standard 595C","HKS","HSL","HSLA","HSLuv","HSV","HWB","LCh","LMS","Munsell Color System","Natural Color System (NSC)","Pantone Matching System (PMS)","ProPhoto RGB Color Space","RAL","RG","RGBA","RGK","Rec. 2020","Rec. 2100","Rec. 601","Rec. 709","Uniform Color Spaces (UCSs)","YDbDr","YIQ","YPbPr","sRGB","sYCC","scRGB","xvYCC"],Mo={space:To},Lo=Mo,xo=["ascii_bin","ascii_general_ci","cp1250_bin","cp1250_general_ci","utf8_bin","utf8_general_ci","utf8_unicode_ci"],No=["ARCHIVE","BLACKHOLE","CSV","InnoDB","MEMORY","MyISAM"],Ro=["bigint","binary","bit","blob","boolean","date","datetime","decimal","double","enum","float","geometry","int","mediumint","point","real","serial","set","smallint","text","time","timestamp","tinyint","varchar"],Po={collation:xo,engine:No,type:Ro},Ho=Po,Ze=["Africa/Abidjan","Africa/Accra","Africa/Addis_Ababa","Africa/Algiers","Africa/Asmara","Africa/Bamako","Africa/Bangui","Africa/Banjul","Africa/Bissau","Africa/Blantyre","Africa/Brazzaville","Africa/Bujumbura","Africa/Cairo","Africa/Casablanca","Africa/Ceuta","Africa/Conakry","Africa/Dakar","Africa/Dar_es_Salaam","Africa/Djibouti","Africa/Douala","Africa/El_Aaiun","Africa/Freetown","Africa/Gaborone","Africa/Harare","Africa/Johannesburg","Africa/Juba","Africa/Kampala","Africa/Khartoum","Africa/Kigali","Africa/Kinshasa","Africa/Lagos","Africa/Libreville","Africa/Lome","Africa/Luanda","Africa/Lubumbashi","Africa/Lusaka","Africa/Malabo","Africa/Maputo","Africa/Maseru","Africa/Mbabane","Africa/Mogadishu","Africa/Monrovia","Africa/Nairobi","Africa/Ndjamena","Africa/Niamey","Africa/Nouakchott","Africa/Ouagadougou","Africa/Porto-Novo","Africa/Sao_Tome","Africa/Tripoli","Africa/Tunis","Africa/Windhoek","America/Adak","America/Anchorage","America/Anguilla","America/Antigua","America/Araguaina","America/Argentina/Buenos_Aires","America/Argentina/Catamarca","America/Argentina/Cordoba","America/Argentina/Jujuy","America/Argentina/La_Rioja","America/Argentina/Mendoza","America/Argentina/Rio_Gallegos","America/Argentina/Salta","America/Argentina/San_Juan","America/Argentina/San_Luis","America/Argentina/Tucuman","America/Argentina/Ushuaia","America/Aruba","America/Asuncion","America/Atikokan","America/Bahia","America/Bahia_Banderas","America/Barbados","America/Belem","America/Belize","America/Blanc-Sablon","America/Boa_Vista","America/Bogota","America/Boise","America/Cambridge_Bay","America/Campo_Grande","America/Cancun","America/Caracas","America/Cayenne","America/Cayman","America/Chicago","America/Chihuahua","America/Ciudad_Juarez","America/Costa_Rica","America/Creston","America/Cuiaba","America/Curacao","America/Danmarkshavn","America/Dawson","America/Dawson_Creek","America/Denver","America/Detroit","America/Dominica","America/Edmonton","America/Eirunepe","America/El_Salvador","America/Fort_Nelson","America/Fortaleza","America/Glace_Bay","America/Goose_Bay","America/Grand_Turk","America/Grenada","America/Guadeloupe","America/Guatemala","America/Guayaquil","America/Guyana","America/Halifax","America/Havana","America/Hermosillo","America/Indiana/Indianapolis","America/Indiana/Knox","America/Indiana/Marengo","America/Indiana/Petersburg","America/Indiana/Tell_City","America/Indiana/Vevay","America/Indiana/Vincennes","America/Indiana/Winamac","America/Inuvik","America/Iqaluit","America/Jamaica","America/Juneau","America/Kentucky/Louisville","America/Kentucky/Monticello","America/Kralendijk","America/La_Paz","America/Lima","America/Los_Angeles","America/Lower_Princes","America/Maceio","America/Managua","America/Manaus","America/Marigot","America/Martinique","America/Matamoros","America/Mazatlan","America/Menominee","America/Merida","America/Metlakatla","America/Mexico_City","America/Miquelon","America/Moncton","America/Monterrey","America/Montevideo","America/Montserrat","America/Nassau","America/New_York","America/Nome","America/Noronha","America/North_Dakota/Beulah","America/North_Dakota/Center","America/North_Dakota/New_Salem","America/Nuuk","America/Ojinaga","America/Panama","America/Paramaribo","America/Phoenix","America/Port-au-Prince","America/Port_of_Spain","America/Porto_Velho","America/Puerto_Rico","America/Punta_Arenas","America/Rankin_Inlet","America/Recife","America/Regina","America/Resolute","America/Rio_Branco","America/Santarem","America/Santiago","America/Santo_Domingo","America/Sao_Paulo","America/Scoresbysund","America/Sitka","America/St_Barthelemy","America/St_Johns","America/St_Kitts","America/St_Lucia","America/St_Thomas","America/St_Vincent","America/Swift_Current","America/Tegucigalpa","America/Thule","America/Tijuana","America/Toronto","America/Tortola","America/Vancouver","America/Whitehorse","America/Winnipeg","America/Yakutat","America/Yellowknife","Antarctica/Casey","Antarctica/Davis","Antarctica/DumontDUrville","Antarctica/Macquarie","Antarctica/Mawson","Antarctica/McMurdo","Antarctica/Palmer","Antarctica/Rothera","Antarctica/Syowa","Antarctica/Troll","Antarctica/Vostok","Arctic/Longyearbyen","Asia/Aden","Asia/Almaty","Asia/Amman","Asia/Anadyr","Asia/Aqtau","Asia/Aqtobe","Asia/Ashgabat","Asia/Atyrau","Asia/Baghdad","Asia/Bahrain","Asia/Baku","Asia/Bangkok","Asia/Barnaul","Asia/Beirut","Asia/Bishkek","Asia/Brunei","Asia/Chita","Asia/Choibalsan","Asia/Colombo","Asia/Damascus","Asia/Dhaka","Asia/Dili","Asia/Dubai","Asia/Dushanbe","Asia/Famagusta","Asia/Gaza","Asia/Hebron","Asia/Ho_Chi_Minh","Asia/Hong_Kong","Asia/Hovd","Asia/Irkutsk","Asia/Jakarta","Asia/Jayapura","Asia/Jerusalem","Asia/Kabul","Asia/Kamchatka","Asia/Karachi","Asia/Kathmandu","Asia/Khandyga","Asia/Kolkata","Asia/Krasnoyarsk","Asia/Kuala_Lumpur","Asia/Kuching","Asia/Kuwait","Asia/Macau","Asia/Magadan","Asia/Makassar","Asia/Manila","Asia/Muscat","Asia/Nicosia","Asia/Novokuznetsk","Asia/Novosibirsk","Asia/Omsk","Asia/Oral","Asia/Phnom_Penh","Asia/Pontianak","Asia/Pyongyang","Asia/Qatar","Asia/Qostanay","Asia/Qyzylorda","Asia/Riyadh","Asia/Sakhalin","Asia/Samarkand","Asia/Seoul","Asia/Shanghai","Asia/Singapore","Asia/Srednekolymsk","Asia/Taipei","Asia/Tashkent","Asia/Tbilisi","Asia/Tehran","Asia/Thimphu","Asia/Tokyo","Asia/Tomsk","Asia/Ulaanbaatar","Asia/Urumqi","Asia/Ust-Nera","Asia/Vientiane","Asia/Vladivostok","Asia/Yakutsk","Asia/Yangon","Asia/Yekaterinburg","Asia/Yerevan","Atlantic/Azores","Atlantic/Bermuda","Atlantic/Canary","Atlantic/Cape_Verde","Atlantic/Faroe","Atlantic/Madeira","Atlantic/Reykjavik","Atlantic/South_Georgia","Atlantic/St_Helena","Atlantic/Stanley","Australia/Adelaide","Australia/Brisbane","Australia/Broken_Hill","Australia/Darwin","Australia/Eucla","Australia/Hobart","Australia/Lindeman","Australia/Lord_Howe","Australia/Melbourne","Australia/Perth","Australia/Sydney","Europe/Amsterdam","Europe/Andorra","Europe/Astrakhan","Europe/Athens","Europe/Belgrade","Europe/Berlin","Europe/Bratislava","Europe/Brussels","Europe/Bucharest","Europe/Budapest","Europe/Busingen","Europe/Chisinau","Europe/Copenhagen","Europe/Dublin","Europe/Gibraltar","Europe/Guernsey","Europe/Helsinki","Europe/Isle_of_Man","Europe/Istanbul","Europe/Jersey","Europe/Kaliningrad","Europe/Kirov","Europe/Kyiv","Europe/Lisbon","Europe/Ljubljana","Europe/London","Europe/Luxembourg","Europe/Madrid","Europe/Malta","Europe/Mariehamn","Europe/Minsk","Europe/Monaco","Europe/Moscow","Europe/Oslo","Europe/Paris","Europe/Podgorica","Europe/Prague","Europe/Riga","Europe/Rome","Europe/Samara","Europe/San_Marino","Europe/Sarajevo","Europe/Saratov","Europe/Simferopol","Europe/Skopje","Europe/Sofia","Europe/Stockholm","Europe/Tallinn","Europe/Tirane","Europe/Ulyanovsk","Europe/Vaduz","Europe/Vatican","Europe/Vienna","Europe/Vilnius","Europe/Volgograd","Europe/Warsaw","Europe/Zagreb","Europe/Zurich","Indian/Antananarivo","Indian/Chagos","Indian/Christmas","Indian/Cocos","Indian/Comoro","Indian/Kerguelen","Indian/Mahe","Indian/Maldives","Indian/Mauritius","Indian/Mayotte","Indian/Reunion","Pacific/Apia","Pacific/Auckland","Pacific/Bougainville","Pacific/Chatham","Pacific/Chuuk","Pacific/Easter","Pacific/Efate","Pacific/Fakaofo","Pacific/Fiji","Pacific/Funafuti","Pacific/Galapagos","Pacific/Gambier","Pacific/Guadalcanal","Pacific/Guam","Pacific/Honolulu","Pacific/Kanton","Pacific/Kiritimati","Pacific/Kosrae","Pacific/Kwajalein","Pacific/Majuro","Pacific/Marquesas","Pacific/Midway","Pacific/Nauru","Pacific/Niue","Pacific/Norfolk","Pacific/Noumea","Pacific/Pago_Pago","Pacific/Palau","Pacific/Pitcairn","Pacific/Pohnpei","Pacific/Port_Moresby","Pacific/Rarotonga","Pacific/Saipan","Pacific/Tahiti","Pacific/Tarawa","Pacific/Tongatapu","Pacific/Wake","Pacific/Wallis"],Io={time_zone:Ze},Go=Io,_o=["ADP","AGP","AI","API","ASCII","CLI","COM","CSS","DNS","DRAM","EXE","FTP","GB","HDD","HEX","HTTP","IB","IP","JBOD","JSON","OCR","PCI","PNG","RAM","RSS","SAS","SCSI","SDD","SMS","SMTP","SQL","SSD","SSL","TCP","THX","TLS","UDP","USB","UTF8","VGA","XML","XSS"],Wo={abbreviation:_o},Ko=Wo,$o={smiley:["☠️","☹️","☺️","❣️","❤️","❤️‍🔥","❤️‍🩹","👁️‍🗨️","👹","👺","👻","👽","👾","👿","💀","💋","💌","💓","💔","💕","💖","💗","💘","💙","💚","💛","💜","💝","💞","💟","💢","💣","💤","💥","💦","💨","💩","💫","💬","💭","💯","🕳️","🖤","🗨️","🗯️","😀","😁","😂","😃","😄","😅","😆","😇","😈","😉","😊","😋","😌","😍","😎","😏","😐","😑","😒","😓","😔","😕","😖","😗","😘","😙","😚","😛","😜","😝","😞","😟","😠","😡","😢","😣","😤","😥","😦","😧","😨","😩","😪","😫","😬","😭","😮","😮‍💨","😯","😰","😱","😲","😳","😴","😵","😵‍💫","😶","😶‍🌫️","😷","😸","😹","😺","😻","😼","😽","😾","😿","🙀","🙁","🙂","🙃","🙄","🙈","🙉","🙊","🤍","🤎","🤐","🤑","🤒","🤓","🤔","🤕","🤖","🤗","🤠","🤡","🤢","🤣","🤤","🤥","🤧","🤨","🤩","🤪","🤫","🤬","🤭","🤮","🤯","🥰","🥱","🥲","🥳","🥴","🥵","🥶","🥸","🥺","🧐","🧡"],body:["☝🏻","☝🏼","☝🏽","☝🏾","☝🏿","☝️","✊","✊🏻","✊🏼","✊🏽","✊🏾","✊🏿","✋","✋🏻","✋🏼","✋🏽","✋🏾","✋🏿","✌🏻","✌🏼","✌🏽","✌🏾","✌🏿","✌️","✍🏻","✍🏼","✍🏽","✍🏾","✍🏿","✍️","👀","👁️","👂","👂🏻","👂🏼","👂🏽","👂🏾","👂🏿","👃","👃🏻","👃🏼","👃🏽","👃🏾","👃🏿","👄","👅","👆","👆🏻","👆🏼","👆🏽","👆🏾","👆🏿","👇","👇🏻","👇🏼","👇🏽","👇🏾","👇🏿","👈","👈🏻","👈🏼","👈🏽","👈🏾","👈🏿","👉","👉🏻","👉🏼","👉🏽","👉🏾","👉🏿","👊","👊🏻","👊🏼","👊🏽","👊🏾","👊🏿","👋","👋🏻","👋🏼","👋🏽","👋🏾","👋🏿","👌","👌🏻","👌🏼","👌🏽","👌🏾","👌🏿","👍","👍🏻","👍🏼","👍🏽","👍🏾","👍🏿","👎","👎🏻","👎🏼","👎🏽","👎🏾","👎🏿","👏","👏🏻","👏🏼","👏🏽","👏🏾","👏🏿","👐","👐🏻","👐🏼","👐🏽","👐🏾","👐🏿","💅","💅🏻","💅🏼","💅🏽","💅🏾","💅🏿","💪","💪🏻","💪🏼","💪🏽","💪🏾","💪🏿","🖐🏻","🖐🏼","🖐🏽","🖐🏾","🖐🏿","🖐️","🖕","🖕🏻","🖕🏼","🖕🏽","🖕🏾","🖕🏿","🖖","🖖🏻","🖖🏼","🖖🏽","🖖🏾","🖖🏿","🙌","🙌🏻","🙌🏼","🙌🏽","🙌🏾","🙌🏿","🙏","🙏🏻","🙏🏼","🙏🏽","🙏🏾","🙏🏿","🤌","🤌🏻","🤌🏼","🤌🏽","🤌🏾","🤌🏿","🤏","🤏🏻","🤏🏼","🤏🏽","🤏🏾","🤏🏿","🤘","🤘🏻","🤘🏼","🤘🏽","🤘🏾","🤘🏿","🤙","🤙🏻","🤙🏼","🤙🏽","🤙🏾","🤙🏿","🤚","🤚🏻","🤚🏼","🤚🏽","🤚🏾","🤚🏿","🤛","🤛🏻","🤛🏼","🤛🏽","🤛🏾","🤛🏿","🤜","🤜🏻","🤜🏼","🤜🏽","🤜🏾","🤜🏿","🤝","🤞","🤞🏻","🤞🏼","🤞🏽","🤞🏾","🤞🏿","🤟","🤟🏻","🤟🏼","🤟🏽","🤟🏾","🤟🏿","🤲","🤲🏻","🤲🏼","🤲🏽","🤲🏾","🤲🏿","🤳","🤳🏻","🤳🏼","🤳🏽","🤳🏾","🤳🏿","🦴","🦵","🦵🏻","🦵🏼","🦵🏽","🦵🏾","🦵🏿","🦶","🦶🏻","🦶🏼","🦶🏽","🦶🏾","🦶🏿","🦷","🦻","🦻🏻","🦻🏼","🦻🏽","🦻🏾","🦻🏿","🦾","🦿","🧠","🫀","🫁"],person:["🎅","🎅🏻","🎅🏼","🎅🏽","🎅🏾","🎅🏿","👦","👦🏻","👦🏼","👦🏽","👦🏾","👦🏿","👧","👧🏻","👧🏼","👧🏽","👧🏾","👧🏿","👨","👨‍⚕️","👨‍⚖️","👨‍✈️","👨‍🌾","👨‍🍳","👨‍🍼","👨‍🎓","👨‍🎤","👨‍🎨","👨‍🏫","👨‍🏭","👨‍💻","👨‍💼","👨‍🔧","👨‍🔬","👨‍🚀","👨‍🚒","👨‍🦰","👨‍🦱","👨‍🦲","👨‍🦳","👨🏻","👨🏻‍⚕️","👨🏻‍⚖️","👨🏻‍✈️","👨🏻‍🌾","👨🏻‍🍳","👨🏻‍🍼","👨🏻‍🎓","👨🏻‍🎤","👨🏻‍🎨","👨🏻‍🏫","👨🏻‍🏭","👨🏻‍💻","👨🏻‍💼","👨🏻‍🔧","👨🏻‍🔬","👨🏻‍🚀","👨🏻‍🚒","👨🏻‍🦰","👨🏻‍🦱","👨🏻‍🦲","👨🏻‍🦳","👨🏼","👨🏼‍⚕️","👨🏼‍⚖️","👨🏼‍✈️","👨🏼‍🌾","👨🏼‍🍳","👨🏼‍🍼","👨🏼‍🎓","👨🏼‍🎤","👨🏼‍🎨","👨🏼‍🏫","👨🏼‍🏭","👨🏼‍💻","👨🏼‍💼","👨🏼‍🔧","👨🏼‍🔬","👨🏼‍🚀","👨🏼‍🚒","👨🏼‍🦰","👨🏼‍🦱","👨🏼‍🦲","👨🏼‍🦳","👨🏽","👨🏽‍⚕️","👨🏽‍⚖️","👨🏽‍✈️","👨🏽‍🌾","👨🏽‍🍳","👨🏽‍🍼","👨🏽‍🎓","👨🏽‍🎤","👨🏽‍🎨","👨🏽‍🏫","👨🏽‍🏭","👨🏽‍💻","👨🏽‍💼","👨🏽‍🔧","👨🏽‍🔬","👨🏽‍🚀","👨🏽‍🚒","👨🏽‍🦰","👨🏽‍🦱","👨🏽‍🦲","👨🏽‍🦳","👨🏾","👨🏾‍⚕️","👨🏾‍⚖️","👨🏾‍✈️","👨🏾‍🌾","👨🏾‍🍳","👨🏾‍🍼","👨🏾‍🎓","👨🏾‍🎤","👨🏾‍🎨","👨🏾‍🏫","👨🏾‍🏭","👨🏾‍💻","👨🏾‍💼","👨🏾‍🔧","👨🏾‍🔬","👨🏾‍🚀","👨🏾‍🚒","👨🏾‍🦰","👨🏾‍🦱","👨🏾‍🦲","👨🏾‍🦳","👨🏿","👨🏿‍⚕️","👨🏿‍⚖️","👨🏿‍✈️","👨🏿‍🌾","👨🏿‍🍳","👨🏿‍🍼","👨🏿‍🎓","👨🏿‍🎤","👨🏿‍🎨","👨🏿‍🏫","👨🏿‍🏭","👨🏿‍💻","👨🏿‍💼","👨🏿‍🔧","👨🏿‍🔬","👨🏿‍🚀","👨🏿‍🚒","👨🏿‍🦰","👨🏿‍🦱","👨🏿‍🦲","👨🏿‍🦳","👩","👩‍⚕️","👩‍⚖️","👩‍✈️","👩‍🌾","👩‍🍳","👩‍🍼","👩‍🎓","👩‍🎤","👩‍🎨","👩‍🏫","👩‍🏭","👩‍💻","👩‍💼","👩‍🔧","👩‍🔬","👩‍🚀","👩‍🚒","👩‍🦰","👩‍🦱","👩‍🦲","👩‍🦳","👩🏻","👩🏻‍⚕️","👩🏻‍⚖️","👩🏻‍✈️","👩🏻‍🌾","👩🏻‍🍳","👩🏻‍🍼","👩🏻‍🎓","👩🏻‍🎤","👩🏻‍🎨","👩🏻‍🏫","👩🏻‍🏭","👩🏻‍💻","👩🏻‍💼","👩🏻‍🔧","👩🏻‍🔬","👩🏻‍🚀","👩🏻‍🚒","👩🏻‍🦰","👩🏻‍🦱","👩🏻‍🦲","👩🏻‍🦳","👩🏼","👩🏼‍⚕️","👩🏼‍⚖️","👩🏼‍✈️","👩🏼‍🌾","👩🏼‍🍳","👩🏼‍🍼","👩🏼‍🎓","👩🏼‍🎤","👩🏼‍🎨","👩🏼‍🏫","👩🏼‍🏭","👩🏼‍💻","👩🏼‍💼","👩🏼‍🔧","👩🏼‍🔬","👩🏼‍🚀","👩🏼‍🚒","👩🏼‍🦰","👩🏼‍🦱","👩🏼‍🦲","👩🏼‍🦳","👩🏽","👩🏽‍⚕️","👩🏽‍⚖️","👩🏽‍✈️","👩🏽‍🌾","👩🏽‍🍳","👩🏽‍🍼","👩🏽‍🎓","👩🏽‍🎤","👩🏽‍🎨","👩🏽‍🏫","👩🏽‍🏭","👩🏽‍💻","👩🏽‍💼","👩🏽‍🔧","👩🏽‍🔬","👩🏽‍🚀","👩🏽‍🚒","👩🏽‍🦰","👩🏽‍🦱","👩🏽‍🦲","👩🏽‍🦳","👩🏾","👩🏾‍⚕️","👩🏾‍⚖️","👩🏾‍✈️","👩🏾‍🌾","👩🏾‍🍳","👩🏾‍🍼","👩🏾‍🎓","👩🏾‍🎤","👩🏾‍🎨","👩🏾‍🏫","👩🏾‍🏭","👩🏾‍💻","👩🏾‍💼","👩🏾‍🔧","👩🏾‍🔬","👩🏾‍🚀","👩🏾‍🚒","👩🏾‍🦰","👩🏾‍🦱","👩🏾‍🦲","👩🏾‍🦳","👩🏿","👩🏿‍⚕️","👩🏿‍⚖️","👩🏿‍✈️","👩🏿‍🌾","👩🏿‍🍳","👩🏿‍🍼","👩🏿‍🎓","👩🏿‍🎤","👩🏿‍🎨","👩🏿‍🏫","👩🏿‍🏭","👩🏿‍💻","👩🏿‍💼","👩🏿‍🔧","👩🏿‍🔬","👩🏿‍🚀","👩🏿‍🚒","👩🏿‍🦰","👩🏿‍🦱","👩🏿‍🦲","👩🏿‍🦳","👮","👮‍♀️","👮‍♂️","👮🏻","👮🏻‍♀️","👮🏻‍♂️","👮🏼","👮🏼‍♀️","👮🏼‍♂️","👮🏽","👮🏽‍♀️","👮🏽‍♂️","👮🏾","👮🏾‍♀️","👮🏾‍♂️","👮🏿","👮🏿‍♀️","👮🏿‍♂️","👰","👰‍♀️","👰‍♂️","👰🏻","👰🏻‍♀️","👰🏻‍♂️","👰🏼","👰🏼‍♀️","👰🏼‍♂️","👰🏽","👰🏽‍♀️","👰🏽‍♂️","👰🏾","👰🏾‍♀️","👰🏾‍♂️","👰🏿","👰🏿‍♀️","👰🏿‍♂️","👱","👱‍♀️","👱‍♂️","👱🏻","👱🏻‍♀️","👱🏻‍♂️","👱🏼","👱🏼‍♀️","👱🏼‍♂️","👱🏽","👱🏽‍♀️","👱🏽‍♂️","👱🏾","👱🏾‍♀️","👱🏾‍♂️","👱🏿","👱🏿‍♀️","👱🏿‍♂️","👲","👲🏻","👲🏼","👲🏽","👲🏾","👲🏿","👳","👳‍♀️","👳‍♂️","👳🏻","👳🏻‍♀️","👳🏻‍♂️","👳🏼","👳🏼‍♀️","👳🏼‍♂️","👳🏽","👳🏽‍♀️","👳🏽‍♂️","👳🏾","👳🏾‍♀️","👳🏾‍♂️","👳🏿","👳🏿‍♀️","👳🏿‍♂️","👴","👴🏻","👴🏼","👴🏽","👴🏾","👴🏿","👵","👵🏻","👵🏼","👵🏽","👵🏾","👵🏿","👶","👶🏻","👶🏼","👶🏽","👶🏾","👶🏿","👷","👷‍♀️","👷‍♂️","👷🏻","👷🏻‍♀️","👷🏻‍♂️","👷🏼","👷🏼‍♀️","👷🏼‍♂️","👷🏽","👷🏽‍♀️","👷🏽‍♂️","👷🏾","👷🏾‍♀️","👷🏾‍♂️","👷🏿","👷🏿‍♀️","👷🏿‍♂️","👸","👸🏻","👸🏼","👸🏽","👸🏾","👸🏿","👼","👼🏻","👼🏼","👼🏽","👼🏾","👼🏿","💁","💁‍♀️","💁‍♂️","💁🏻","💁🏻‍♀️","💁🏻‍♂️","💁🏼","💁🏼‍♀️","💁🏼‍♂️","💁🏽","💁🏽‍♀️","💁🏽‍♂️","💁🏾","💁🏾‍♀️","💁🏾‍♂️","💁🏿","💁🏿‍♀️","💁🏿‍♂️","💂","💂‍♀️","💂‍♂️","💂🏻","💂🏻‍♀️","💂🏻‍♂️","💂🏼","💂🏼‍♀️","💂🏼‍♂️","💂🏽","💂🏽‍♀️","💂🏽‍♂️","💂🏾","💂🏾‍♀️","💂🏾‍♂️","💂🏿","💂🏿‍♀️","💂🏿‍♂️","💆","💆‍♀️","💆‍♂️","💆🏻","💆🏻‍♀️","💆🏻‍♂️","💆🏼","💆🏼‍♀️","💆🏼‍♂️","💆🏽","💆🏽‍♀️","💆🏽‍♂️","💆🏾","💆🏾‍♀️","💆🏾‍♂️","💆🏿","💆🏿‍♀️","💆🏿‍♂️","💇","💇🏻","💇🏼","💇🏽","🕵🏻","🕵🏻‍♀️","🕵🏻‍♂️","🕵🏼","🕵🏼‍♀️","🕵🏼‍♂️","🕵🏽","🕵🏽‍♀️","🕵🏽‍♂️","🕵🏾","🕵🏾‍♀️","🕵🏾‍♂️","🕵🏿","🕵🏿‍♀️","🕵🏿‍♂️","🕵️","🕵️‍♀️","🕵️‍♂️","🙅","🙅‍♀️","🙅‍♂️","🙅🏻","🙅🏻‍♀️","🙅🏻‍♂️","🙅🏼","🙅🏼‍♀️","🙅🏼‍♂️","🙅🏽","🙅🏽‍♀️","🙅🏽‍♂️","🙅🏾","🙅🏾‍♀️","🙅🏾‍♂️","🙅🏿","🙅🏿‍♀️","🙅🏿‍♂️","🙆","🙆‍♀️","🙆‍♂️","🙆🏻","🙆🏻‍♀️","🙆🏻‍♂️","🙆🏼","🙆🏼‍♀️","🙆🏼‍♂️","🙆🏽","🙆🏽‍♀️","🙆🏽‍♂️","🙆🏾","🙆🏾‍♀️","🙆🏾‍♂️","🙆🏿","🙆🏿‍♀️","🙆🏿‍♂️","🙇","🙇‍♀️","🙇‍♂️","🙇🏻","🙇🏻‍♀️","🙇🏻‍♂️","🙇🏼","🙇🏼‍♀️","🙇🏼‍♂️","🙇🏽","🙇🏽‍♀️","🙇🏽‍♂️","🙇🏾","🙇🏾‍♀️","🙇🏾‍♂️","🙇🏿","🙇🏿‍♀️","🙇🏿‍♂️","🙋","🙋‍♀️","🙋‍♂️","🙋🏻","🙋🏻‍♀️","🙋🏻‍♂️","🙋🏼","🙋🏼‍♀️","🙋🏼‍♂️","🙋🏽","🙋🏽‍♀️","🙋🏽‍♂️","🙋🏾","🙋🏾‍♀️","🙋🏾‍♂️","🙋🏿","🙋🏿‍♀️","🙋🏿‍♂️","🙍","🙍‍♀️","🙍‍♂️","🙍🏻","🙍🏻‍♀️","🙍🏻‍♂️","🙍🏼","🙍🏼‍♀️","🙍🏼‍♂️","🙍🏽","🙍🏽‍♀️","🙍🏽‍♂️","🙍🏾","🙍🏾‍♀️","🙍🏾‍♂️","🙍🏿","🙍🏿‍♀️","🙍🏿‍♂️","🙎","🙎‍♀️","🙎‍♂️","🙎🏻","🙎🏻‍♀️","🙎🏻‍♂️","🙎🏼","🙎🏼‍♀️","🙎🏼‍♂️","🙎🏽","🙎🏽‍♀️","🙎🏽‍♂️","🙎🏾","🙎🏾‍♀️","🙎🏾‍♂️","🙎🏿","🙎🏿‍♀️","🙎🏿‍♂️","🤦","🤦‍♀️","🤦‍♂️","🤦🏻","🤦🏻‍♀️","🤦🏻‍♂️","🤦🏼","🤦🏼‍♀️","🤦🏼‍♂️","🤦🏽","🤦🏽‍♀️","🤦🏽‍♂️","🤦🏾","🤦🏾‍♀️","🤦🏾‍♂️","🤦🏿","🤦🏿‍♀️","🤦🏿‍♂️","🤰","🤰🏻","🤰🏼","🤰🏽","🤰🏾","🤰🏿","🤱","🤱🏻","🤱🏼","🤱🏽","🤱🏾","🤱🏿","🤴","🤴🏻","🤴🏼","🤴🏽","🤴🏾","🤴🏿","🤵","🤵‍♀️","🤵‍♂️","🤵🏻","🤵🏻‍♀️","🤵🏻‍♂️","🤵🏼","🤵🏼‍♀️","🤵🏼‍♂️","🤵🏽","🤵🏽‍♀️","🤵🏽‍♂️","🤵🏾","🤵🏾‍♀️","🤵🏾‍♂️","🤵🏿","🤵🏿‍♀️","🤵🏿‍♂️","🤶","🤶🏻","🤶🏼","🤶🏽","🤶🏾","🤶🏿","🤷","🤷‍♀️","🤷‍♂️","🤷🏻","🤷🏻‍♀️","🤷🏻‍♂️","🤷🏼","🤷🏼‍♀️","🤷🏼‍♂️","🤷🏽","🤷🏽‍♀️","🤷🏽‍♂️","🤷🏾","🤷🏾‍♀️","🤷🏾‍♂️","🤷🏿","🤷🏿‍♀️","🤷🏿‍♂️","🥷","🥷🏻","🥷🏼","🥷🏽","🥷🏾","🥷🏿","🦸","🦸‍♀️","🦸‍♂️","🦸🏻","🦸🏻‍♀️","🦸🏻‍♂️","🦸🏼","🦸🏼‍♀️","🦸🏼‍♂️","🦸🏽","🦸🏽‍♀️","🦸🏽‍♂️","🦸🏾","🦸🏾‍♀️","🦸🏾‍♂️","🦸🏿","🦸🏿‍♀️","🦸🏿‍♂️","🦹","🦹‍♀️","🦹‍♂️","🦹🏻","🦹🏻‍♀️","🦹🏻‍♂️","🦹🏼","🦹🏼‍♀️","🦹🏼‍♂️","🦹🏽","🦹🏽‍♀️","🦹🏽‍♂️","🦹🏾","🦹🏾‍♀️","🦹🏾‍♂️","🦹🏿","🦹🏿‍♀️","🦹🏿‍♂️","🧏","🧏‍♀️","🧏‍♂️","🧏🏻","🧏🏻‍♀️","🧏🏻‍♂️","🧏🏼","🧏🏼‍♀️","🧏🏼‍♂️","🧏🏽","🧏🏽‍♀️","🧏🏽‍♂️","🧏🏾","🧏🏾‍♀️","🧏🏾‍♂️","🧏🏿","🧏🏿‍♀️","🧏🏿‍♂️","🧑","🧑‍⚕️","🧑‍⚖️","🧑‍✈️","🧑‍🌾","🧑‍🍳","🧑‍🍼","🧑‍🎄","🧑‍🎓","🧑‍🎤","🧑‍🎨","🧑‍🏫","🧑‍🏭","🧑‍💻","🧑‍💼","🧑‍🔧","🧑‍🔬","🧑‍🚀","🧑‍🚒","🧑‍🦰","🧑‍🦱","🧑‍🦲","🧑‍🦳","🧑🏻","🧑🏻‍⚕️","🧑🏻‍⚖️","🧑🏻‍✈️","🧑🏻‍🌾","🧑🏻‍🍳","🧑🏻‍🍼","🧑🏻‍🎄","🧑🏻‍🎓","🧑🏻‍🎤","🧑🏻‍🎨","🧑🏻‍🏫","🧑🏻‍🏭","🧑🏻‍💻","🧑🏻‍💼","🧑🏻‍🔧","🧑🏻‍🔬","🧑🏻‍🚀","🧑🏻‍🚒","🧑🏻‍🦰","🧑🏻‍🦱","🧑🏻‍🦲","🧑🏻‍🦳","🧑🏼","🧑🏼‍⚕️","🧑🏼‍⚖️","🧑🏼‍✈️","🧑🏼‍🌾","🧑🏼‍🍳","🧑🏼‍🍼","🧑🏼‍🎄","🧑🏼‍🎓","🧑🏼‍🎤","🧑🏼‍🎨","🧑🏼‍🏫","🧑🏼‍🏭","🧑🏼‍💻","🧑🏼‍💼","🧑🏼‍🔧","🧑🏼‍🔬","🧑🏼‍🚀","🧑🏼‍🚒","🧑🏼‍🦰","🧑🏼‍🦱","🧑🏼‍🦲","🧑🏼‍🦳","🧑🏽","🧑🏽‍⚕️","🧑🏽‍⚖️","🧑🏽‍✈️","🧑🏽‍🌾","🧑🏽‍🍳","🧑🏽‍🍼","🧑🏽‍🎄","🧑🏽‍🎓","🧑🏽‍🎤","🧑🏽‍🎨","🧑🏽‍🏫","🧑🏽‍🏭","🧑🏽‍💻","🧑🏽‍💼","🧑🏽‍🔧","🧑🏽‍🔬","🧑🏽‍🚀","🧑🏽‍🚒","🧑🏽‍🦰","🧑🏽‍🦱","🧑🏽‍🦲","🧑🏽‍🦳","🧑🏾","🧑🏾‍⚕️","🧑🏾‍⚖️","🧑🏾‍✈️","🧑🏾‍🌾","🧑🏾‍🍳","🧑🏾‍🍼","🧑🏾‍🎄","🧑🏾‍🎓","🧑🏾‍🎤","🧑🏾‍🎨","🧑🏾‍🏫","🧑🏾‍🏭","🧑🏾‍💻","🧑🏾‍💼","🧑🏾‍🔧","🧑🏾‍🔬","🧑🏾‍🚀","🧑🏾‍🚒","🧑🏾‍🦰","🧑🏾‍🦱","🧑🏾‍🦲","🧑🏾‍🦳","🧑🏿","🧑🏿‍⚕️","🧑🏿‍⚖️","🧑🏿‍✈️","🧑🏿‍🌾","🧑🏿‍🍳","🧑🏿‍🍼","🧑🏿‍🎄","🧑🏿‍🎓","🧑🏿‍🎤","🧑🏿‍🎨","🧑🏿‍🏫","🧑🏿‍🏭","🧑🏿‍💻","🧑🏿‍💼","🧑🏿‍🔧","🧑🏿‍🔬","🧑🏿‍🚀","🧑🏿‍🚒","🧑🏿‍🦰","🧑🏿‍🦱","🧑🏿‍🦲","🧑🏿‍🦳","🧒","🧒🏻","🧒🏼","🧒🏽","🧒🏾","🧒🏿","🧓","🧓🏻","🧓🏼","🧓🏽","🧓🏾","🧓🏿","🧔","🧔‍♀️","🧔‍♂️","🧔🏻","🧔🏻‍♀️","🧔🏻‍♂️","🧔🏼","🧔🏼‍♀️","🧔🏼‍♂️","🧔🏽","🧔🏽‍♀️","🧔🏽‍♂️","🧔🏾","🧔🏾‍♀️","🧔🏾‍♂️","🧔🏿","🧔🏿‍♀️","🧔🏿‍♂️","🧕","🧕🏻","🧕🏼","🧕🏽","🧕🏾","🧕🏿","🧙","🧙‍♀️","🧙‍♂️","🧙🏻","🧙🏻‍♀️","🧙🏻‍♂️","🧙🏼","🧙🏼‍♀️","🧙🏼‍♂️","🧙🏽","🧙🏽‍♀️","🧙🏽‍♂️","🧙🏾","🧙🏾‍♀️","🧙🏾‍♂️","🧙🏿","🧙🏿‍♀️","🧙🏿‍♂️","🧚","🧚‍♀️","🧚‍♂️","🧚🏻","🧚🏻‍♀️","🧚🏻‍♂️","🧚🏼","🧚🏼‍♀️","🧚🏼‍♂️","🧚🏽","🧚🏽‍♀️","🧚🏽‍♂️","🧚🏾","🧚🏾‍♀️","🧚🏾‍♂️","🧚🏿","🧚🏿‍♀️","🧚🏿‍♂️","🧛","🧛‍♀️","🧛‍♂️","🧛🏻","🧛🏻‍♀️","🧛🏻‍♂️","🧛🏼","🧛🏼‍♀️","🧛🏼‍♂️","🧛🏽","🧛🏽‍♀️","🧛🏽‍♂️","🧛🏾","🧛🏾‍♀️","🧛🏾‍♂️","🧛🏿","🧛🏿‍♀️","🧛🏿‍♂️","🧜","🧜‍♀️","🧜‍♂️","🧜🏻","🧜🏻‍♀️","🧜🏻‍♂️","🧜🏼","🧜🏼‍♀️","🧜🏼‍♂️","🧜🏽","🧜🏽‍♀️","🧜🏽‍♂️","🧜🏾","🧜🏾‍♀️","🧜🏾‍♂️","🧜🏿","🧜🏿‍♀️","🧜🏿‍♂️","🧝","🧝‍♀️","🧝‍♂️","🧝🏻","🧝🏻‍♀️","🧝🏻‍♂️","🧝🏼","🧝🏼‍♀️","🧝🏼‍♂️","🧝🏽","🧝🏽‍♀️","🧝🏽‍♂️","🧝🏾","🧝🏾‍♀️","🧝🏾‍♂️","🧝🏿","🧝🏿‍♀️","🧝🏿‍♂️","🧞","🧞‍♀️","🧞‍♂️","🧟","🧟‍♀️","🧟‍♂️"],nature:["☘️","🌱","🌲","🌳","🌴","🌵","🌷","🌸","🌹","🌺","🌻","🌼","🌾","🌿","🍀","🍁","🍂","🍃","🏵️","🐀","🐁","🐂","🐃","🐄","🐅","🐆","🐇","🐈","🐈‍⬛","🐉","🐊","🐋","🐌","🐍","🐎","🐏","🐐","🐑","🐒","🐓","🐔","🐕","🐕‍🦺","🐖","🐗","🐘","🐙","🐚","🐛","🐜","🐝","🐞","🐟","🐠","🐡","🐢","🐣","🐤","🐥","🐦","🐧","🐨","🐩","🐪","🐫","🐬","🐭","🐮","🐯","🐰","🐱","🐲","🐳","🐴","🐵","🐶","🐷","🐸","🐹","🐺","🐻","🐻‍❄️","🐼","🐽","🐾","🐿️","💐","💮","🕊️","🕷️","🕸️","🥀","🦁","🦂","🦃","🦄","🦅","🦆","🦇","🦈","🦉","🦊","🦋","🦌","🦍","🦎","🦏","🦒","🦓","🦔","🦕","🦖","🦗","🦘","🦙","🦚","🦛","🦜","🦝","🦟","🦠","🦡","🦢","🦣","🦤","🦥","🦦","🦧","🦨","🦩","🦫","🦬","🦭","🦮","🪰","🪱","🪲","🪳","🪴","🪶"],food:["☕","🌭","🌮","🌯","🌰","🌶️","🌽","🍄","🍅","🍆","🍇","🍈","🍉","🍊","🍋","🍌","🍍","🍎","🍏","🍐","🍑","🍒","🍓","🍔","🍕","🍖","🍗","🍘","🍙","🍚","🍛","🍜","🍝","🍞","🍟","🍠","🍡","🍢","🍣","🍤","🍥","🍦","🍧","🍨","🍩","🍪","🍫","🍬","🍭","🍮","🍯","🍰","🍱","🍲","🍳","🍴","🍵","🍶","🍷","🍸","🍹","🍺","🍻","🍼","🍽️","🍾","🍿","🎂","🏺","🔪","🥂","🥃","🥄","🥐","🥑","🥒","🥓","🥔","🥕","🥖","🥗","🥘","🥙","🥚","🥛","🥜","🥝","🥞","🥟","🥠","🥡","🥢","🥣","🥤","🥥","🥦","🥧","🥨","🥩","🥪","🥫","🥬","🥭","🥮","🥯","🦀","🦐","🦑","🦞","🦪","🧀","🧁","🧂","🧃","🧄","🧅","🧆","🧇","🧈","🧉","🧊","🧋","🫐","🫑","🫒","🫓","🫔","🫕","🫖"],travel:["⌚","⌛","⏰","⏱️","⏲️","⏳","☀️","☁️","☂️","☃️","☄️","☔","♨️","⚓","⚡","⛄","⛅","⛈️","⛩️","⛪","⛰️","⛱️","⛲","⛴️","⛵","⛺","⛽","✈️","❄️","⭐","🌀","🌁","🌂","🌃","🌄","🌅","🌆","🌇","🌈","🌉","🌊","🌋","🌌","🌍","🌎","🌏","🌐","🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘","🌙","🌚","🌛","🌜","🌝","🌞","🌟","🌠","🌡️","🌤️","🌥️","🌦️","🌧️","🌨️","🌩️","🌪️","🌫️","🌬️","🎠","🎡","🎢","🎪","🏍️","🏎️","🏔️","🏕️","🏖️","🏗️","🏘️","🏙️","🏚️","🏛️","🏜️","🏝️","🏞️","🏟️","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💈","💒","💧","💺","🔥","🕋","🕌","🕍","🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚","🕛","🕜","🕝","🕞","🕟","🕠","🕡","🕢","🕣","🕤","🕥","🕦","🕧","🕰️","🗺️","🗻","🗼","🗽","🗾","🚀","🚁","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚋","🚌","🚍","🚎","🚏","🚐","🚑","🚒","🚓","🚔","🚕","🚖","🚗","🚘","🚙","🚚","🚛","🚜","🚝","🚞","🚟","🚠","🚡","🚢","🚤","🚥","🚦","🚧","🚨","🚲","🛎️","🛑","🛕","🛖","🛢️","🛣️","🛤️","🛥️","🛩️","🛫","🛬","🛰️","🛳️","🛴","🛵","🛶","🛸","🛹","🛺","🛻","🛼","🦼","🦽","🧭","🧱","🧳","🪂","🪐","🪨","🪵"],activity:["♟️","♠️","♣️","♥️","♦️","⚽","⚾","⛳","⛸️","✨","🀄","🃏","🎀","🎁","🎃","🎄","🎆","🎇","🎈","🎉","🎊","🎋","🎍","🎎","🎏","🎐","🎑","🎖️","🎗️","🎟️","🎣","🎨","🎫","🎭","🎮","🎯","🎰","🎱","🎲","🎳","🎴","🎽","🎾","🎿","🏀","🏅","🏆","🏈","🏉","🏏","🏐","🏑","🏒","🏓","🏸","🔮","🕹️","🖼️","🛷","🤿","🥅","🥇","🥈","🥉","🥊","🥋","🥌","🥍","🥎","🥏","🧧","🧨","🧩","🧵","🧶","🧸","🧿","🪀","🪁","🪄","🪅","🪆","🪡","🪢"],object:["⌨️","☎️","⚒️","⚔️","⚖️","⚗️","⚙️","⚰️","⚱️","⛏️","⛑️","⛓️","✂️","✉️","✏️","✒️","🎒","🎓","🎙️","🎚️","🎛️","🎞️","🎤","🎥","🎧","🎩","🎬","🎵","🎶","🎷","🎸","🎹","🎺","🎻","🎼","🏮","🏷️","🏹","👑","👒","👓","👔","👕","👖","👗","👘","👙","👚","👛","👜","👝","👞","👟","👠","👡","👢","💄","💉","💊","💍","💎","💡","💰","💳","💴","💵","💶","💷","💸","💹","💻","💼","💽","💾","💿","📀","📁","📂","📃","📄","📅","📆","📇","📈","📉","📊","📋","📌","📍","📎","📏","📐","📑","📒","📓","📔","📕","📖","📗","📘","📙","📚","📜","📝","📞","📟","📠","📡","📢","📣","📤","📥","📦","📧","📨","📩","📪","📫","📬","📭","📮","📯","📰","📱","📲","📷","📸","📹","📺","📻","📼","📽️","📿","🔇","🔈","🔉","🔊","🔋","🔌","🔍","🔎","🔏","🔐","🔑","🔒","🔓","🔔","🔕","🔖","🔗","🔦","🔧","🔨","🔩","🔫","🔬","🔭","🕯️","🕶️","🖇️","🖊️","🖋️","🖌️","🖍️","🖥️","🖨️","🖱️","🖲️","🗂️","🗃️","🗄️","🗑️","🗒️","🗓️","🗜️","🗝️","🗞️","🗡️","🗳️","🗿","🚪","🚬","🚽","🚿","🛁","🛋️","🛍️","🛏️","🛒","🛗","🛠️","🛡️","🥁","🥻","🥼","🥽","🥾","🥿","🦯","🦺","🧢","🧣","🧤","🧥","🧦","🧪","🧫","🧬","🧮","🧯","🧰","🧲","🧴","🧷","🧹","🧺","🧻","🧼","🧽","🧾","🩰","🩱","🩲","🩳","🩴","🩸","🩹","🩺","🪃","🪑","🪒","🪓","🪔","🪕","🪖","🪗","🪘","🪙","🪚","🪛","🪜","🪝","🪞","🪟","🪠","🪣","🪤","🪥","🪦","🪧"],symbol:["#️⃣","*️⃣","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","©️","®️","‼️","⁉️","™️","ℹ️","↔️","↕️","↖️","↗️","↘️","↙️","↩️","↪️","⏏️","⏩","⏪","⏫","⏬","⏭️","⏮️","⏯️","⏸️","⏹️","⏺️","Ⓜ️","▪️","▫️","▶️","◀️","◻️","◼️","◽","◾","☑️","☢️","☣️","☦️","☪️","☮️","☯️","☸️","♀️","♂️","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","♻️","♾️","♿","⚕️","⚛️","⚜️","⚠️","⚧️","⚪","⚫","⛎","⛔","✅","✔️","✖️","✝️","✡️","✳️","✴️","❇️","❌","❎","❓","❔","❕","❗","➕","➖","➗","➡️","➰","➿","⤴️","⤵️","⬅️","⬆️","⬇️","⬛","⬜","⭕","〰️","〽️","㊗️","㊙️","🅰️","🅱️","🅾️","🅿️","🆎","🆑","🆒","🆓","🆔","🆕","🆖","🆗","🆘","🆙","🆚","🈁","🈂️","🈚","🈯","🈲","🈳","🈴","🈵","🈶","🈷️","🈸","🈹","🈺","🉐","🉑","🎦","🏧","💠","💱","💲","📛","📳","📴","📵","📶","🔀","🔁","🔂","🔃","🔄","🔅","🔆","🔘","🔙","🔚","🔛","🔜","🔝","🔞","🔟","🔠","🔡","🔢","🔣","🔤","🔯","🔰","🔱","🔲","🔳","🔴","🔵","🔶","🔷","🔸","🔹","🔺","🔻","🔼","🔽","🕉️","🕎","🚫","🚭","🚮","🚯","🚰","🚱","🚳","🚷","🚸","🚹","🚺","🚻","🚼","🚾","🛂","🛃","🛄","🛅","🛐","🟠","🟡","🟢","🟣","🟤","🟥","🟦","🟧","🟨","🟩","🟪","🟫"],flag:["🇦🇨","🇦🇩","🇦🇪","🇦🇫","🇦🇬","🇦🇮","🇦🇱","🇦🇲","🇦🇴","🇦🇶","🇦🇷","🇦🇸","🇦🇹","🇦🇺","🇦🇼","🇦🇽","🇦🇿","🇧🇦","🇧🇧","🇧🇩","🇧🇪","🇧🇫","🇧🇬","🇧🇭","🇧🇮","🇧🇯","🇧🇱","🇧🇲","🇧🇳","🇧🇴","🇧🇶","🇧🇷","🇧🇸","🇧🇹","🇧🇻","🇧🇼","🇧🇾","🇧🇿","🇨🇦","🇨🇨","🇨🇩","🇨🇫","🇨🇬","🇨🇭","🇨🇮","🇨🇰","🇨🇱","🇨🇲","🇨🇳","🇨🇴","🇨🇵","🇨🇷","🇨🇺","🇨🇻","🇨🇼","🇨🇽","🇨🇾","🇨🇿","🇩🇪","🇩🇬","🇩🇯","🇩🇰","🇩🇲","🇩🇴","🇩🇿","🇪🇦","🇪🇨","🇪🇪","🇪🇬","🇪🇭","🇪🇷","🇪🇸","🇪🇹","🇪🇺","🇫🇮","🇫🇯","🇫🇰","🇫🇲","🇫🇴","🇫🇷","🇬🇦","🇬🇧","🇬🇩","🇬🇪","🇬🇫","🇬🇬","🇬🇭","🇬🇮","🇬🇱","🇬🇲","🇬🇳","🇬🇵","🇬🇶","🇬🇷","🇬🇸","🇬🇹","🇬🇺","🇬🇼","🇬🇾","🇭🇰","🇭🇲","🇭🇳","🇭🇷","🇭🇹","🇭🇺","🇮🇨","🇮🇩","🇮🇪","🇮🇱","🇮🇲","🇮🇳","🇮🇴","🇮🇶","🇮🇷","🇮🇸","🇮🇹","🇯🇪","🇯🇲","🇯🇴","🇯🇵","🇰🇪","🇰🇬","🇰🇭","🇰🇮","🇰🇲","🇰🇳","🇰🇵","🇰🇷","🇰🇼","🇰🇾","🇰🇿","🇱🇦","🇱🇧","🇱🇨","🇱🇮","🇱🇰","🇱🇷","🇱🇸","🇱🇹","🇱🇺","🇱🇻","🇱🇾","🇲🇦","🇲🇨","🇲🇩","🇲🇪","🇲🇫","🇲🇬","🇲🇭","🇲🇰","🇲🇱","🇲🇲","🇲🇳","🇲🇴","🇲🇵","🇲🇶","🇲🇷","🇲🇸","🇲🇹","🇲🇺","🇲🇻","🇲🇼","🇲🇽","🇲🇾","🇲🇿","🇳🇦","🇳🇨","🇳🇪","🇳🇫","🇳🇬","🇳🇮","🇳🇱","🇳🇴","🇳🇵","🇳🇷","🇳🇺","🇳🇿","🇴🇲","🇵🇦","🇵🇪","🇵🇫","🇵🇬","🇵🇭","🇵🇰","🇵🇱","🇵🇲","🇵🇳","🇵🇷","🇵🇸","🇵🇹","🇵🇼","🇵🇾","🇶🇦","🇷🇪","🇷🇴","🇷🇸","🇷🇺","🇷🇼","🇸🇦","🇸🇧","🇸🇨","🇸🇩","🇸🇪","🇸🇬","🇸🇭","🇸🇮","🇸🇯","🇸🇰","🇸🇱","🇸🇲","🇸🇳","🇸🇴","🇸🇷","🇸🇸","🇸🇹","🇸🇻","🇸🇽","🇸🇾","🇸🇿","🇹🇦","🇹🇨","🇹🇩","🇹🇫","🇹🇬","🇹🇭","🇹🇯","🇹🇰","🇹🇱","🇹🇲","🇹🇳","🇹🇴","🇹🇷","🇹🇹","🇹🇻","🇹🇼","🇹🇿","🇺🇦","🇺🇬","🇺🇲","🇺🇳","🇺🇸","🇺🇾","🇺🇿","🇻🇦","🇻🇨","🇻🇪","🇻🇬","🇻🇮","🇻🇳","🇻🇺","🇼🇫","🇼🇸","🇽🇰","🇾🇪","🇾🇹","🇿🇦","🇿🇲","🇿🇼","🎌","🏁","🏳️","🏳️‍⚧️","🏳️‍🌈","🏴","🏴‍☠️","🚩"]},Oo={informational:[100,101,102,103],success:[200,201,202,203,204,205,206,207,208,226],redirection:[300,301,302,303,304,305,306,307,308],clientError:[400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,421,422,423,424,425,426,428,429,431,451],serverError:[500,501,502,503,504,505,506,507,508,510,511]},zo=["ES256","ES384","ES512","HS256","HS384","HS512","PS256","PS384","PS512","RS256","RS384","RS512","none"],Jo=["FakerBot/{{system.semver}}","Googlebot/2.1 (+http://www.google.com/bot.html)",'Mozilla/5.0 (Linux; Android {{number.int({"min":5,"max":13})}}; {{helpers.arrayElement(["SM-G998U","SM-G998B","SM-G998N","SM-G998P","SM-T800"])}}) AppleWebKit/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}} (KHTML, like Gecko) Chrome/{{number.int({"min":55,"max":131})}}.{{system.semver}} Mobile Safari/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}}','Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:{{number.int({"min":75, "max":133})}}.0) Gecko/20100101 Firefox/{{number.int({"min":75, "max":133})}}.0','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}}.{{number.int({"min":0,"max":99})}} (KHTML, like Gecko) Version/16.1 Safari/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}}.{{number.int({"min":0,"max":99})}}','Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_15_7) AppleWebKit/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}}.{{number.int({"min":0,"max":99})}} (KHTML, like Gecko) Chrome/{{number.int({"min":55,"max":131})}}.{{system.semver}} Safari/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}}.{{number.int({"min":0,"max":99})}}','Mozilla/5.0 (Windows NT {{helpers.arrayElement(["5.1","5.2","6.0","6.1","6.2","6.3","10.0"])}}; Win64; x64) AppleWebKit/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}} (KHTML, like Gecko) Chrome/{{number.int({"min":55,"max":131})}}.{{system.semver}} Safari/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}} Edg/{{number.int({"min":110,"max":131})}}.{{system.semver}}','Mozilla/5.0 (X11; Linux x86_64; rv:{{number.int({"min":75,"max":133})}}.0) Gecko/20100101 Firefox/{{number.int({"min":75,"max":133})}}.0','Mozilla/5.0 (compatible; MSIE {{number.int({"min":6,"max":10})}}.0; Windows NT {{helpers.arrayElement(["5.1","5.2","6.0","6.1","6.2","6.3","10.0"])}}; Trident/{{number.int({"min":4,"max":7})}}.0)','Mozilla/5.0 (iPhone; CPU iPhone OS {{number.int({"min":10,"max":18})}}_{{number.int({"min":0,"max":4})}} like Mac OS X) AppleWebKit/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}}.{{number.int({"min":0,"max":99})}} (KHTML, like Gecko) Version/{{number.int({"min":10,"max":18})}}_{{number.int({"min":0,"max":4})}} Mobile/15E148 Safari/{{number.int({"min":536,"max":605})}}.{{number.int({"min":0,"max":99})}}'],Vo={emoji:$o,http_status_code:Oo,jwt_algorithm:zo,user_agent_pattern:Jo},jo=Vo,Yo=[{alpha2:"AD",alpha3:"AND",numeric:"020"},{alpha2:"AE",alpha3:"ARE",numeric:"784"},{alpha2:"AF",alpha3:"AFG",numeric:"004"},{alpha2:"AG",alpha3:"ATG",numeric:"028"},{alpha2:"AI",alpha3:"AIA",numeric:"660"},{alpha2:"AL",alpha3:"ALB",numeric:"008"},{alpha2:"AM",alpha3:"ARM",numeric:"051"},{alpha2:"AO",alpha3:"AGO",numeric:"024"},{alpha2:"AQ",alpha3:"ATA",numeric:"010"},{alpha2:"AR",alpha3:"ARG",numeric:"032"},{alpha2:"AS",alpha3:"ASM",numeric:"016"},{alpha2:"AT",alpha3:"AUT",numeric:"040"},{alpha2:"AU",alpha3:"AUS",numeric:"036"},{alpha2:"AW",alpha3:"ABW",numeric:"533"},{alpha2:"AX",alpha3:"ALA",numeric:"248"},{alpha2:"AZ",alpha3:"AZE",numeric:"031"},{alpha2:"BA",alpha3:"BIH",numeric:"070"},{alpha2:"BB",alpha3:"BRB",numeric:"052"},{alpha2:"BD",alpha3:"BGD",numeric:"050"},{alpha2:"BE",alpha3:"BEL",numeric:"056"},{alpha2:"BF",alpha3:"BFA",numeric:"854"},{alpha2:"BG",alpha3:"BGR",numeric:"100"},{alpha2:"BH",alpha3:"BHR",numeric:"048"},{alpha2:"BI",alpha3:"BDI",numeric:"108"},{alpha2:"BJ",alpha3:"BEN",numeric:"204"},{alpha2:"BL",alpha3:"BLM",numeric:"652"},{alpha2:"BM",alpha3:"BMU",numeric:"060"},{alpha2:"BN",alpha3:"BRN",numeric:"096"},{alpha2:"BO",alpha3:"BOL",numeric:"068"},{alpha2:"BQ",alpha3:"BES",numeric:"535"},{alpha2:"BR",alpha3:"BRA",numeric:"076"},{alpha2:"BS",alpha3:"BHS",numeric:"044"},{alpha2:"BT",alpha3:"BTN",numeric:"064"},{alpha2:"BV",alpha3:"BVT",numeric:"074"},{alpha2:"BW",alpha3:"BWA",numeric:"072"},{alpha2:"BY",alpha3:"BLR",numeric:"112"},{alpha2:"BZ",alpha3:"BLZ",numeric:"084"},{alpha2:"CA",alpha3:"CAN",numeric:"124"},{alpha2:"CC",alpha3:"CCK",numeric:"166"},{alpha2:"CD",alpha3:"COD",numeric:"180"},{alpha2:"CF",alpha3:"CAF",numeric:"140"},{alpha2:"CG",alpha3:"COG",numeric:"178"},{alpha2:"CH",alpha3:"CHE",numeric:"756"},{alpha2:"CI",alpha3:"CIV",numeric:"384"},{alpha2:"CK",alpha3:"COK",numeric:"184"},{alpha2:"CL",alpha3:"CHL",numeric:"152"},{alpha2:"CM",alpha3:"CMR",numeric:"120"},{alpha2:"CN",alpha3:"CHN",numeric:"156"},{alpha2:"CO",alpha3:"COL",numeric:"170"},{alpha2:"CR",alpha3:"CRI",numeric:"188"},{alpha2:"CU",alpha3:"CUB",numeric:"192"},{alpha2:"CV",alpha3:"CPV",numeric:"132"},{alpha2:"CW",alpha3:"CUW",numeric:"531"},{alpha2:"CX",alpha3:"CXR",numeric:"162"},{alpha2:"CY",alpha3:"CYP",numeric:"196"},{alpha2:"CZ",alpha3:"CZE",numeric:"203"},{alpha2:"DE",alpha3:"DEU",numeric:"276"},{alpha2:"DJ",alpha3:"DJI",numeric:"262"},{alpha2:"DK",alpha3:"DNK",numeric:"208"},{alpha2:"DM",alpha3:"DMA",numeric:"212"},{alpha2:"DO",alpha3:"DOM",numeric:"214"},{alpha2:"DZ",alpha3:"DZA",numeric:"012"},{alpha2:"EC",alpha3:"ECU",numeric:"218"},{alpha2:"EE",alpha3:"EST",numeric:"233"},{alpha2:"EG",alpha3:"EGY",numeric:"818"},{alpha2:"EH",alpha3:"ESH",numeric:"732"},{alpha2:"ER",alpha3:"ERI",numeric:"232"},{alpha2:"ES",alpha3:"ESP",numeric:"724"},{alpha2:"ET",alpha3:"ETH",numeric:"231"},{alpha2:"FI",alpha3:"FIN",numeric:"246"},{alpha2:"FJ",alpha3:"FJI",numeric:"242"},{alpha2:"FK",alpha3:"FLK",numeric:"238"},{alpha2:"FM",alpha3:"FSM",numeric:"583"},{alpha2:"FO",alpha3:"FRO",numeric:"234"},{alpha2:"FR",alpha3:"FRA",numeric:"250"},{alpha2:"GA",alpha3:"GAB",numeric:"266"},{alpha2:"GB",alpha3:"GBR",numeric:"826"},{alpha2:"GD",alpha3:"GRD",numeric:"308"},{alpha2:"GE",alpha3:"GEO",numeric:"268"},{alpha2:"GF",alpha3:"GUF",numeric:"254"},{alpha2:"GG",alpha3:"GGY",numeric:"831"},{alpha2:"GH",alpha3:"GHA",numeric:"288"},{alpha2:"GI",alpha3:"GIB",numeric:"292"},{alpha2:"GL",alpha3:"GRL",numeric:"304"},{alpha2:"GM",alpha3:"GMB",numeric:"270"},{alpha2:"GN",alpha3:"GIN",numeric:"324"},{alpha2:"GP",alpha3:"GLP",numeric:"312"},{alpha2:"GQ",alpha3:"GNQ",numeric:"226"},{alpha2:"GR",alpha3:"GRC",numeric:"300"},{alpha2:"GS",alpha3:"SGS",numeric:"239"},{alpha2:"GT",alpha3:"GTM",numeric:"320"},{alpha2:"GU",alpha3:"GUM",numeric:"316"},{alpha2:"GW",alpha3:"GNB",numeric:"624"},{alpha2:"GY",alpha3:"GUY",numeric:"328"},{alpha2:"HK",alpha3:"HKG",numeric:"344"},{alpha2:"HM",alpha3:"HMD",numeric:"334"},{alpha2:"HN",alpha3:"HND",numeric:"340"},{alpha2:"HR",alpha3:"HRV",numeric:"191"},{alpha2:"HT",alpha3:"HTI",numeric:"332"},{alpha2:"HU",alpha3:"HUN",numeric:"348"},{alpha2:"ID",alpha3:"IDN",numeric:"360"},{alpha2:"IE",alpha3:"IRL",numeric:"372"},{alpha2:"IL",alpha3:"ISR",numeric:"376"},{alpha2:"IM",alpha3:"IMN",numeric:"833"},{alpha2:"IN",alpha3:"IND",numeric:"356"},{alpha2:"IO",alpha3:"IOT",numeric:"086"},{alpha2:"IQ",alpha3:"IRQ",numeric:"368"},{alpha2:"IR",alpha3:"IRN",numeric:"364"},{alpha2:"IS",alpha3:"ISL",numeric:"352"},{alpha2:"IT",alpha3:"ITA",numeric:"380"},{alpha2:"JE",alpha3:"JEY",numeric:"832"},{alpha2:"JM",alpha3:"JAM",numeric:"388"},{alpha2:"JO",alpha3:"JOR",numeric:"400"},{alpha2:"JP",alpha3:"JPN",numeric:"392"},{alpha2:"KE",alpha3:"KEN",numeric:"404"},{alpha2:"KG",alpha3:"KGZ",numeric:"417"},{alpha2:"KH",alpha3:"KHM",numeric:"116"},{alpha2:"KI",alpha3:"KIR",numeric:"296"},{alpha2:"KM",alpha3:"COM",numeric:"174"},{alpha2:"KN",alpha3:"KNA",numeric:"659"},{alpha2:"KP",alpha3:"PRK",numeric:"408"},{alpha2:"KR",alpha3:"KOR",numeric:"410"},{alpha2:"KW",alpha3:"KWT",numeric:"414"},{alpha2:"KY",alpha3:"CYM",numeric:"136"},{alpha2:"KZ",alpha3:"KAZ",numeric:"398"},{alpha2:"LA",alpha3:"LAO",numeric:"418"},{alpha2:"LB",alpha3:"LBN",numeric:"422"},{alpha2:"LC",alpha3:"LCA",numeric:"662"},{alpha2:"LI",alpha3:"LIE",numeric:"438"},{alpha2:"LK",alpha3:"LKA",numeric:"144"},{alpha2:"LR",alpha3:"LBR",numeric:"430"},{alpha2:"LS",alpha3:"LSO",numeric:"426"},{alpha2:"LT",alpha3:"LTU",numeric:"440"},{alpha2:"LU",alpha3:"LUX",numeric:"442"},{alpha2:"LV",alpha3:"LVA",numeric:"428"},{alpha2:"LY",alpha3:"LBY",numeric:"434"},{alpha2:"MA",alpha3:"MAR",numeric:"504"},{alpha2:"MC",alpha3:"MCO",numeric:"492"},{alpha2:"MD",alpha3:"MDA",numeric:"498"},{alpha2:"ME",alpha3:"MNE",numeric:"499"},{alpha2:"MF",alpha3:"MAF",numeric:"663"},{alpha2:"MG",alpha3:"MDG",numeric:"450"},{alpha2:"MH",alpha3:"MHL",numeric:"584"},{alpha2:"MK",alpha3:"MKD",numeric:"807"},{alpha2:"ML",alpha3:"MLI",numeric:"466"},{alpha2:"MM",alpha3:"MMR",numeric:"104"},{alpha2:"MN",alpha3:"MNG",numeric:"496"},{alpha2:"MO",alpha3:"MAC",numeric:"446"},{alpha2:"MP",alpha3:"MNP",numeric:"580"},{alpha2:"MQ",alpha3:"MTQ",numeric:"474"},{alpha2:"MR",alpha3:"MRT",numeric:"478"},{alpha2:"MS",alpha3:"MSR",numeric:"500"},{alpha2:"MT",alpha3:"MLT",numeric:"470"},{alpha2:"MU",alpha3:"MUS",numeric:"480"},{alpha2:"MV",alpha3:"MDV",numeric:"462"},{alpha2:"MW",alpha3:"MWI",numeric:"454"},{alpha2:"MX",alpha3:"MEX",numeric:"484"},{alpha2:"MY",alpha3:"MYS",numeric:"458"},{alpha2:"MZ",alpha3:"MOZ",numeric:"508"},{alpha2:"NA",alpha3:"NAM",numeric:"516"},{alpha2:"NC",alpha3:"NCL",numeric:"540"},{alpha2:"NE",alpha3:"NER",numeric:"562"},{alpha2:"NF",alpha3:"NFK",numeric:"574"},{alpha2:"NG",alpha3:"NGA",numeric:"566"},{alpha2:"NI",alpha3:"NIC",numeric:"558"},{alpha2:"NL",alpha3:"NLD",numeric:"528"},{alpha2:"NO",alpha3:"NOR",numeric:"578"},{alpha2:"NP",alpha3:"NPL",numeric:"524"},{alpha2:"NR",alpha3:"NRU",numeric:"520"},{alpha2:"NU",alpha3:"NIU",numeric:"570"},{alpha2:"NZ",alpha3:"NZL",numeric:"554"},{alpha2:"OM",alpha3:"OMN",numeric:"512"},{alpha2:"PA",alpha3:"PAN",numeric:"591"},{alpha2:"PE",alpha3:"PER",numeric:"604"},{alpha2:"PF",alpha3:"PYF",numeric:"258"},{alpha2:"PG",alpha3:"PNG",numeric:"598"},{alpha2:"PH",alpha3:"PHL",numeric:"608"},{alpha2:"PK",alpha3:"PAK",numeric:"586"},{alpha2:"PL",alpha3:"POL",numeric:"616"},{alpha2:"PM",alpha3:"SPM",numeric:"666"},{alpha2:"PN",alpha3:"PCN",numeric:"612"},{alpha2:"PR",alpha3:"PRI",numeric:"630"},{alpha2:"PS",alpha3:"PSE",numeric:"275"},{alpha2:"PT",alpha3:"PRT",numeric:"620"},{alpha2:"PW",alpha3:"PLW",numeric:"585"},{alpha2:"PY",alpha3:"PRY",numeric:"600"},{alpha2:"QA",alpha3:"QAT",numeric:"634"},{alpha2:"RE",alpha3:"REU",numeric:"638"},{alpha2:"RO",alpha3:"ROU",numeric:"642"},{alpha2:"RS",alpha3:"SRB",numeric:"688"},{alpha2:"RU",alpha3:"RUS",numeric:"643"},{alpha2:"RW",alpha3:"RWA",numeric:"646"},{alpha2:"SA",alpha3:"SAU",numeric:"682"},{alpha2:"SB",alpha3:"SLB",numeric:"090"},{alpha2:"SC",alpha3:"SYC",numeric:"690"},{alpha2:"SD",alpha3:"SDN",numeric:"729"},{alpha2:"SE",alpha3:"SWE",numeric:"752"},{alpha2:"SG",alpha3:"SGP",numeric:"702"},{alpha2:"SH",alpha3:"SHN",numeric:"654"},{alpha2:"SI",alpha3:"SVN",numeric:"705"},{alpha2:"SJ",alpha3:"SJM",numeric:"744"},{alpha2:"SK",alpha3:"SVK",numeric:"703"},{alpha2:"SL",alpha3:"SLE",numeric:"694"},{alpha2:"SM",alpha3:"SMR",numeric:"674"},{alpha2:"SN",alpha3:"SEN",numeric:"686"},{alpha2:"SO",alpha3:"SOM",numeric:"706"},{alpha2:"SR",alpha3:"SUR",numeric:"740"},{alpha2:"SS",alpha3:"SSD",numeric:"728"},{alpha2:"ST",alpha3:"STP",numeric:"678"},{alpha2:"SV",alpha3:"SLV",numeric:"222"},{alpha2:"SX",alpha3:"SXM",numeric:"534"},{alpha2:"SY",alpha3:"SYR",numeric:"760"},{alpha2:"SZ",alpha3:"SWZ",numeric:"748"},{alpha2:"TC",alpha3:"TCA",numeric:"796"},{alpha2:"TD",alpha3:"TCD",numeric:"148"},{alpha2:"TF",alpha3:"ATF",numeric:"260"},{alpha2:"TG",alpha3:"TGO",numeric:"768"},{alpha2:"TH",alpha3:"THA",numeric:"764"},{alpha2:"TJ",alpha3:"TJK",numeric:"762"},{alpha2:"TK",alpha3:"TKL",numeric:"772"},{alpha2:"TL",alpha3:"TLS",numeric:"626"},{alpha2:"TM",alpha3:"TKM",numeric:"795"},{alpha2:"TN",alpha3:"TUN",numeric:"788"},{alpha2:"TO",alpha3:"TON",numeric:"776"},{alpha2:"TR",alpha3:"TUR",numeric:"792"},{alpha2:"TT",alpha3:"TTO",numeric:"780"},{alpha2:"TV",alpha3:"TUV",numeric:"798"},{alpha2:"TW",alpha3:"TWN",numeric:"158"},{alpha2:"TZ",alpha3:"TZA",numeric:"834"},{alpha2:"UA",alpha3:"UKR",numeric:"804"},{alpha2:"UG",alpha3:"UGA",numeric:"800"},{alpha2:"UM",alpha3:"UMI",numeric:"581"},{alpha2:"US",alpha3:"USA",numeric:"840"},{alpha2:"UY",alpha3:"URY",numeric:"858"},{alpha2:"UZ",alpha3:"UZB",numeric:"860"},{alpha2:"VA",alpha3:"VAT",numeric:"336"},{alpha2:"VC",alpha3:"VCT",numeric:"670"},{alpha2:"VE",alpha3:"VEN",numeric:"862"},{alpha2:"VG",alpha3:"VGB",numeric:"092"},{alpha2:"VI",alpha3:"VIR",numeric:"850"},{alpha2:"VN",alpha3:"VNM",numeric:"704"},{alpha2:"VU",alpha3:"VUT",numeric:"548"},{alpha2:"WF",alpha3:"WLF",numeric:"876"},{alpha2:"WS",alpha3:"WSM",numeric:"882"},{alpha2:"YE",alpha3:"YEM",numeric:"887"},{alpha2:"YT",alpha3:"MYT",numeric:"175"},{alpha2:"ZA",alpha3:"ZAF",numeric:"710"},{alpha2:"ZM",alpha3:"ZMB",numeric:"894"},{alpha2:"ZW",alpha3:"ZWE",numeric:"716"}],qo={country_code:Yo,time_zone:Ze},Uo=qo,Zo={title:"Base",code:"base"},Xo=Zo,Qo=["/Applications","/Library","/Network","/System","/Users","/bin","/boot","/boot/defaults","/dev","/etc","/etc/defaults","/etc/mail","/etc/namedb","/etc/periodic","/etc/ppp","/home","/home/user","/home/user/dir","/lib","/lost+found","/media","/mnt","/net","/opt","/opt/bin","/opt/include","/opt/lib","/opt/sbin","/opt/share","/private","/private/tmp","/private/var","/proc","/rescue","/root","/sbin","/selinux","/srv","/sys","/tmp","/usr","/usr/X11R6","/usr/bin","/usr/include","/usr/lib","/usr/libdata","/usr/libexec","/usr/local/bin","/usr/local/src","/usr/obj","/usr/ports","/usr/sbin","/usr/share","/usr/src","/var","/var/log","/var/mail","/var/spool","/var/tmp","/var/yp"],el={"application/epub+zip":{extensions:["epub"]},"application/gzip":{extensions:["gz"]},"application/java-archive":{extensions:["ear","jar","war"]},"application/json":{extensions:["json","map"]},"application/ld+json":{extensions:["jsonld"]},"application/msword":{extensions:["doc","dot"]},"application/octet-stream":{extensions:["bin","bpk","buffer","deb","deploy","dist","distz","dll","dmg","dms","dump","elc","exe","img","iso","lrf","mar","msi","msm","msp","pkg","so"]},"application/ogg":{extensions:["ogx"]},"application/pdf":{extensions:["pdf"]},"application/rtf":{extensions:["rtf"]},"application/vnd.amazon.ebook":{extensions:["azw"]},"application/vnd.apple.installer+xml":{extensions:["mpkg"]},"application/vnd.mozilla.xul+xml":{extensions:["xul"]},"application/vnd.ms-excel":{extensions:["xla","xlc","xlm","xls","xlt","xlw"]},"application/vnd.ms-fontobject":{extensions:["eot"]},"application/vnd.ms-powerpoint":{extensions:["pot","pps","ppt"]},"application/vnd.oasis.opendocument.presentation":{extensions:["odp"]},"application/vnd.oasis.opendocument.spreadsheet":{extensions:["ods"]},"application/vnd.oasis.opendocument.text":{extensions:["odt"]},"application/vnd.openxmlformats-officedocument.presentationml.presentation":{extensions:["pptx"]},"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":{extensions:["xlsx"]},"application/vnd.openxmlformats-officedocument.wordprocessingml.document":{extensions:["docx"]},"application/vnd.rar":{extensions:["rar"]},"application/vnd.visio":{extensions:["vsd","vss","vst","vsw"]},"application/x-7z-compressed":{extensions:["7z"]},"application/x-abiword":{extensions:["abw"]},"application/x-bzip":{extensions:["bz"]},"application/x-bzip2":{extensions:["boz","bz2"]},"application/x-csh":{extensions:["csh"]},"application/x-freearc":{extensions:["arc"]},"application/x-httpd-php":{extensions:["php"]},"application/x-sh":{extensions:["sh"]},"application/x-tar":{extensions:["tar"]},"application/xhtml+xml":{extensions:["xht","xhtml"]},"application/xml":{extensions:["rng","xml","xsd","xsl"]},"application/zip":{extensions:["zip"]},"audio/3gpp":{extensions:["3gpp"]},"audio/3gpp2":{extensions:["3g2"]},"audio/aac":{extensions:["aac"]},"audio/midi":{extensions:["kar","mid","midi","rmi"]},"audio/mpeg":{extensions:["m2a","m3a","mp2","mp2a","mp3","mpga"]},"audio/ogg":{extensions:["oga","ogg","opus","spx"]},"audio/opus":{extensions:["opus"]},"audio/wav":{extensions:["wav"]},"audio/webm":{extensions:["weba"]},"font/otf":{extensions:["otf"]},"font/ttf":{extensions:["ttf"]},"font/woff":{extensions:["woff"]},"font/woff2":{extensions:["woff2"]},"image/avif":{extensions:["avif"]},"image/bmp":{extensions:["bmp"]},"image/gif":{extensions:["gif"]},"image/jpeg":{extensions:["jpe","jpeg","jpg"]},"image/png":{extensions:["png"]},"image/svg+xml":{extensions:["svg","svgz"]},"image/tiff":{extensions:["tif","tiff"]},"image/vnd.microsoft.icon":{extensions:["ico"]},"image/webp":{extensions:["webp"]},"text/calendar":{extensions:["ics","ifb"]},"text/css":{extensions:["css"]},"text/csv":{extensions:["csv"]},"text/html":{extensions:["htm","html","shtml"]},"text/javascript":{extensions:["js","mjs"]},"text/plain":{extensions:["conf","def","in","ini","list","log","text","txt"]},"video/3gpp":{extensions:["3gp","3gpp"]},"video/3gpp2":{extensions:["3g2"]},"video/mp2t":{extensions:["ts"]},"video/mp4":{extensions:["mp4","mp4v","mpg4"]},"video/mpeg":{extensions:["m1v","m2v","mpe","mpeg","mpg"]},"video/ogg":{extensions:["ogv"]},"video/webm":{extensions:["webm"]},"video/x-msvideo":{extensions:["avi"]}},al={directory_path:Qo,mime_type:el},nl=al,tl={color:Lo,database:Ho,date:Go,hacker:Ko,internet:jo,location:Uo,metadata:Xo,system:nl},rl=tl,V=new wo({locale:[ii,rl]});const il={itemGap:0,fixed:!1,buffer:0,bufferTop:0,bufferBottom:0,scrollDistance:0,horizontal:!1,start:0,offset:0,renderControl:void 0};class ol{constructor(e,n={},t){this.sizesMap=new Map,this._renderList=[],this._direction="backward",this._fixOffset=!1,this._forceFixOffset=!1,this._abortFixOffset=!1,this._fixTaskFn=null,this._clientEl=null,this._events=n,this._boundOnScroll=this._onScroll.bind(this),this._props=new Proxy(e,{get(i,r){return Reflect.get(i,r)??Reflect.get(il,r)}}),this.slotSize=t?.slotSize??{clientSize:0,headerSize:0,footerSize:0,stickyHeaderSize:0,stickyFooterSize:0},this.state=t?.state??{views:0,offset:0,listTotalSize:0,virtualSize:0,inViewBegin:0,inViewEnd:0,renderBegin:0,renderEnd:0,bufferTop:0,bufferBottom:0},this._initBuffer(),this._initResizeObserver(),this._onListChange()}get renderList(){return this._renderList}get resizeObserver(){return this._resizeObserver}get props(){return this._props}getOffset(){const e=this._props.horizontal?"scrollLeft":"scrollTop";return this._clientEl?this._clientEl[e]:0}getSlotSize(){return this.slotSize.headerSize+this.slotSize.footerSize+this.slotSize.stickyHeaderSize+this.slotSize.stickyFooterSize}getTotalSize(){return this.state.listTotalSize+this.getSlotSize()}getItemSize(e){return this._props.fixed?this._props.itemPreSize+this._props.itemGap:this.sizesMap.get(String(e))??this._props.itemPreSize+this._props.itemGap}setItemSize(e,n){this.sizesMap.set(String(e),n)}deleteItemSize(e){this.sizesMap.delete(String(e))}getItemPosByIndex(e){const{itemPreSize:n,itemGap:t,fixed:i}=this._props;if(i){const s=n+t;return{top:s*e,current:s,bottom:s*(e+1)}}const{itemKey:r,list:o}=this._props;let l=this.slotSize.headerSize;for(let s=0;s<=e-1;s+=1)l+=this.getItemSize(o[s]?.[r]);const u=this.getItemSize(o[e]?.[r]);return{top:l,current:u,bottom:l+u}}scrollToOffset(e){this._abortFixOffset=!0;const n=this._props.horizontal?"scrollLeft":"scrollTop";this._clientEl&&(this._clientEl[n]=e)}scrollToIndex(e){if(e<0)return;if(e>=this._props.list.length-1){this.scrollToBottom();return}let{top:n}=this.getItemPosByIndex(e);this.scrollToOffset(n);const t=()=>{const{top:i}=this.getItemPosByIndex(e);if(this.scrollToOffset(i),n!==i){n=i,this._fixTaskFn=t;return}this._fixTaskFn=null};this._fixTaskFn=t}scrollIntoView(e){const{top:n,bottom:t}=this.getItemPosByIndex(e),i=this.getOffset(),r=this.getOffset()+this.slotSize.clientSize,o=this.getItemSize(this._props.list[e]?.[this._props.itemKey]);if(n<i&&i<t&&o<this.slotSize.clientSize){this.scrollToOffset(n);return}if(n+this.slotSize.stickyHeaderSize<r&&r<t+this.slotSize.stickyHeaderSize&&o<this.slotSize.clientSize){this.scrollToOffset(t-this.slotSize.clientSize+this.slotSize.stickyHeaderSize);return}if(n+this.slotSize.stickyHeaderSize>=r){this.scrollToIndex(e);return}if(t<=i){this.scrollToIndex(e);return}}scrollToTop(){let e=0;const n=()=>{e+=1,this.scrollToOffset(0),setTimeout(()=>{if(e>10)return;const t=this._props.horizontal?"scrollLeft":"scrollTop";this._clientEl&&this._clientEl[t]!==0&&n()},3)};n()}scrollToBottom(){let e=0;const n=()=>{e+=1,this.scrollToOffset(this.getTotalSize()),setTimeout(()=>{e>10||Math.abs(Math.round(this.state.offset+this.slotSize.clientSize)-Math.round(this.getTotalSize()))>2&&n()},3)};n()}manualRender(e,n){const t=this.state.renderBegin;this.state.renderBegin=e,this.state.renderEnd=n,e>t?this.state.virtualSize+=this._getRangeSize(e,t):this.state.virtualSize-=this._getRangeSize(e,t),this._renderList=this._props.list.slice(this.state.renderBegin,this.state.renderEnd+1),this._updateTotalVirtualSize(),this._notify()}reset(){this.state.offset=0,this.state.listTotalSize=0,this.state.virtualSize=0,this.state.inViewBegin=0,this.state.inViewEnd=0,this.state.renderBegin=0,this.state.renderEnd=0,this.sizesMap.clear(),this._updateRenderRange()}deletedList2Top(e){this._calcListTotalSize();let n=0;for(const t of e)n+=this.getItemSize(t[this._props.itemKey]);this._updateTotalVirtualSize(),this.scrollToOffset(this.state.offset-n),this._calcRange()}addedList2Top(e){this._calcListTotalSize();let n=0;for(const t of e)n+=this.getItemSize(t[this._props.itemKey]);this._updateTotalVirtualSize(),this.scrollToOffset(this.state.offset+n),this._forceFixOffset=!0,this._abortFixOffset=!1,this._calcRange()}forceUpdate(){this._updateRenderRange()}getReactiveData(){return this.state}updateOptions(e){const n=this._getUnderlying();Object.assign(n,e),"list"in e&&this._onListChange(),("bufferTop"in e||"bufferBottom"in e||"buffer"in e)&&this._initBuffer()}bindDOM(e){this._clientEl=e,e.addEventListener("scroll",this._boundOnScroll),this._resizeObserver?.observe(e),this._props.start?this.scrollToIndex(this._props.start):this._props.offset&&this.scrollToOffset(this._props.offset)}observeSlotEl(e){this._resizeObserver?.observe(e)}unobserveSlotEl(e){this._resizeObserver?.unobserve(e)}resume(){this.scrollToOffset(this.state.offset)}destroy(){this._clientEl&&(this._clientEl.removeEventListener("scroll",this._boundOnScroll),this._resizeObserver?.unobserve(this._clientEl),this.slotSize.clientSize=0),this._resizeObserver?.disconnect(),this._resizeObserver=void 0,this._clientEl=null}_getUnderlying(){return this._props}_initBuffer(){this.state.bufferTop=this._props.bufferTop||this._props.buffer,this.state.bufferBottom=this._props.bufferBottom||this._props.buffer}_initResizeObserver(){typeof ResizeObserver>"u"||(this._resizeObserver=new ResizeObserver(e=>{let n=0;for(const t of e){const i=t.target.dataset.id;if(!i)continue;const r=this.getItemSize(i);let o=0;if(t.borderBoxSize){const l=Array.isArray(t.borderBoxSize)?t.borderBoxSize[0]:t.borderBoxSize;o=this._props.horizontal?l.inlineSize:l.blockSize}else o=this._props.horizontal?t.contentRect.width:t.contentRect.height;i==="client"?(this.slotSize.clientSize=o,this._onClientResize()):i==="header"?this.slotSize.headerSize=o:i==="footer"?this.slotSize.footerSize=o:i==="stickyHeader"?this.slotSize.stickyHeaderSize=o:i==="stickyFooter"?this.slotSize.stickyFooterSize=o:r!==o&&(this.setItemSize(i,o),n+=o-r,this._events.itemResize?.(i,o))}this.state.listTotalSize+=n,this._fixTaskFn&&this._fixTaskFn(),(this._fixOffset||this._forceFixOffset)&&n!==0&&!this._abortFixOffset&&(this._fixOffset=!1,this._forceFixOffset=!1,this.scrollToOffset(this.state.offset+n)),this._abortFixOffset=!1,n!==0&&this._notify()}))}_onScroll(e){this._events.scroll?.(e);const n=this.getOffset();n!==this.state.offset&&(this._direction=n<this.state.offset?"forward":"backward",this.state.offset=n,this._calcRange(),this._judgePosition())}_calcViews(){this.state.views=Math.ceil(this.slotSize.clientSize/(this._props.itemPreSize+this._props.itemGap))+1}_onClientResize(){this._calcViews(),this._updateRange(this.state.inViewBegin)}_calcListTotalSize(){if(this._props.fixed){this.state.listTotalSize=(this._props.itemPreSize+this._props.itemGap)*this._props.list.length;return}const{itemKey:e,list:n}=this._props;let t=0;for(let i=0;i<n.length;i+=1)t+=this.getItemSize(n[i]?.[e]);this.state.listTotalSize=t}_updateRange(e){e<this.state.inViewBegin&&(this._fixOffset=!0),this.state.inViewBegin=e,this.state.inViewEnd=Math.min(e+this.state.views,this._props.list.length-1),this._events.rangeUpdate?.(this.state.inViewBegin,this.state.inViewEnd),this._updateRenderRange()}_calcRange(){const{offset:e,inViewBegin:n}=this.state,{itemKey:t,list:i}=this._props,r=e-this.slotSize.headerSize;let o=n,l=this._getVirtualSize2beginInView();if(r<0){this._updateRange(0);return}if(this._direction==="forward"){if(r>=l)return;for(let u=o-1;u>=0;u-=1){const s=this.getItemSize(i[u]?.[t]);if(l-=s,l<=r&&r<l+s){o=u;break}}}if(this._direction==="backward"){if(r<=l)return;for(let u=o;u<=i.length-1;u+=1){const s=this.getItemSize(i[u]?.[t]);if(l<=r&&r<l+s){o=u;break}l+=s}this._fixOffset=!1}o!==this.state.inViewBegin&&this._updateRange(o)}_judgePosition(){const e=Math.max(this._props.scrollDistance,2);if(this._direction==="forward")this.state.offset-e<=0&&this._events.toTop?.(this._props.list[0]);else if(this._direction==="backward"){const n=Math.round(this.state.offset+this.slotSize.clientSize);Math.round(this.getTotalSize()-n)<=e&&this._events.toBottom?.(this._props.list[this._props.list.length-1])}}_getVirtualSize2beginInView(){return this.state.virtualSize+this._getRangeSize(this.state.renderBegin,this.state.inViewBegin)}_getRangeSize(e,n){const t=Math.min(e,n),i=Math.max(e,n);let r=0;for(let o=t;o<i;o+=1)r+=this.getItemSize(this._props.list[o]?.[this._props.itemKey]);return r}_updateTotalVirtualSize(){let e=0;const n=this.state.renderBegin;for(let t=0;t<n;t++)e+=this.getItemSize(this._props.list[t]?.[this._props.itemKey]);this.state.virtualSize=e}_updateRenderRange(){const e=this.state.renderBegin;let n=this.state.inViewBegin,t=this.state.inViewEnd;if(n=Math.max(0,n-this.state.bufferTop),t=Math.min(t+this.state.bufferBottom,this._props.list.length-1>0?this._props.list.length-1:0),this._props.renderControl){const i=this._props.renderControl(this.state.inViewBegin,this.state.inViewEnd);n=i.begin,t=i.end}this.state.renderBegin=n,this.state.renderEnd=t,n>e?this.state.virtualSize+=this._getRangeSize(n,e):this.state.virtualSize-=this._getRangeSize(n,e),this._renderList=this._props.list.slice(this.state.renderBegin,this.state.renderEnd+1),this._notify()}_onListChange(){if(this._props.list.length<=0){this.reset();return}this._calcListTotalSize(),this._updateRange(this.state.inViewBegin),this._updateTotalVirtualSize(),this._updateRenderRange()}_notify(){this._events.update?.(this._renderList,this.state)}}function ye(...a){let e="";for(const n of a)n&&(e+=n+";");return e}function R(a,e){a.setAttribute("style",e)}class A{constructor(e,n,t){this._stickyHeaderEl=null,this._stickyFooterEl=null,this._headerEl=null,this._footerEl=null,this._emptyEl=null,this._itemPool=new Map,this._renderedKeys=[],this._domReady=!1,this._containerEl=e,this._options=n;const i={scroll:r=>t?.scroll?.(r),toTop:r=>t?.toTop?.(r),toBottom:r=>t?.toBottom?.(r),itemResize:(r,o)=>t?.itemResize?.(r,o),rangeUpdate:(r,o)=>t?.rangeUpdate?.(r,o),update:(r,o)=>{this._domReady&&this._patch(r,o),t?.update?.(r,o)}};this._core=new ol(n,i),this._buildDOM(),this._domReady=!0,this._patch(this._core.renderList,this._core.state),this._core.bindDOM(this._clientEl),n.renderStickyHeader&&this._stickyHeaderEl&&this._core.observeSlotEl(this._stickyHeaderEl),n.renderStickyFooter&&this._stickyFooterEl&&this._core.observeSlotEl(this._stickyFooterEl),n.renderHeader&&this._headerEl&&this._core.observeSlotEl(this._headerEl),n.renderFooter&&this._footerEl&&this._core.observeSlotEl(this._footerEl)}get core(){return this._core}get state(){return this._core.state}get clientEl(){return this._clientEl}get listEl(){return this._listEl}scrollToIndex(e){this._core.scrollToIndex(e)}scrollIntoView(e){this._core.scrollIntoView(e)}scrollToTop(){this._core.scrollToTop()}scrollToBottom(){this._core.scrollToBottom()}scrollToOffset(e){this._core.scrollToOffset(e)}reset(){this._core.reset()}setList(e){this._core.updateOptions({list:e})}updateOptions(e){Object.assign(this._options,e),this._core.updateOptions(e)}forceUpdate(){this._core.forceUpdate()}clearItemPool(){this._itemPool.forEach(e=>{this._core.resizeObserver?.unobserve(e),this._options.onItemUnmounted?.(e),e.remove()}),this._itemPool.clear(),this._renderedKeys=[]}deletedList2Top(e){this._core.deletedList2Top(e)}addedList2Top(e){this._core.addedList2Top(e)}destroy(){this._stickyHeaderEl&&this._core.unobserveSlotEl(this._stickyHeaderEl),this._stickyFooterEl&&this._core.unobserveSlotEl(this._stickyFooterEl),this._headerEl&&this._core.unobserveSlotEl(this._headerEl),this._footerEl&&this._core.unobserveSlotEl(this._footerEl),this._itemPool.forEach(e=>{this._core.resizeObserver?.unobserve(e),this._options.onItemUnmounted?.(e)}),this._itemPool.clear(),this._core.destroy(),this._containerEl.innerHTML=""}_buildDOM(){const{horizontal:e}=this._options;this._clientEl=document.createElement("div"),this._clientEl.className="virt-list__client",R(this._clientEl,"width:100%;height:100%;overflow:auto;"),this._clientEl.dataset.id="client",this._options.renderStickyHeader&&(this._stickyHeaderEl=document.createElement("div"),this._stickyHeaderEl.dataset.id="stickyHeader",this._options.stickyHeaderClass&&(this._stickyHeaderEl.className=this._options.stickyHeaderClass),R(this._stickyHeaderEl,ye("position:sticky;z-index:10;",e?"left:0":"top:0",this._options.stickyHeaderStyle)),this._stickyHeaderEl.appendChild(this._options.renderStickyHeader()),this._clientEl.appendChild(this._stickyHeaderEl)),this._options.renderHeader&&(this._headerEl=document.createElement("div"),this._headerEl.dataset.id="header",this._options.headerClass&&(this._headerEl.className=this._options.headerClass),this._options.headerStyle&&R(this._headerEl,this._options.headerStyle),this._headerEl.appendChild(this._options.renderHeader()),this._clientEl.appendChild(this._headerEl)),this._listEl=document.createElement("div"),this._options.listClass&&(this._listEl.className=this._options.listClass),this._virtualEl=document.createElement("div"),this._listEl.appendChild(this._virtualEl),this._clientEl.appendChild(this._listEl),this._options.renderFooter&&(this._footerEl=document.createElement("div"),this._footerEl.dataset.id="footer",this._options.footerClass&&(this._footerEl.className=this._options.footerClass),this._options.footerStyle&&R(this._footerEl,this._options.footerStyle),this._footerEl.appendChild(this._options.renderFooter()),this._clientEl.appendChild(this._footerEl)),this._options.renderStickyFooter&&(this._stickyFooterEl=document.createElement("div"),this._stickyFooterEl.dataset.id="stickyFooter",this._options.stickyFooterClass&&(this._stickyFooterEl.className=this._options.stickyFooterClass),R(this._stickyFooterEl,ye("position:sticky;z-index:10;",e?"right:0":"bottom:0",this._options.stickyFooterStyle)),this._stickyFooterEl.appendChild(this._options.renderStickyFooter()),this._clientEl.appendChild(this._stickyFooterEl)),this._containerEl.appendChild(this._clientEl)}_patch(e,n){const{itemKey:t,horizontal:i,listStyle:r,itemGap:o}=this._options,{listTotalSize:l,virtualSize:u,renderBegin:s}=n,c=i?`will-change:width;min-width:${l}px;display:flex;${r??""}`:`will-change:height;min-height:${l}px;${r??""}`;R(this._listEl,c);const d=i?`width:${u}px;will-change:width;`:`height:${u}px;will-change:height;`;R(this._virtualEl,d);const m=[];for(const F of e)m.push(String(F[t]));const g=new Set(m);for(const F of this._renderedKeys)if(!g.has(F)){const y=this._itemPool.get(F);y&&(this._core.resizeObserver?.unobserve(y),this._options.onItemUnmounted?.(y),y.remove(),this._itemPool.delete(F))}if(e.length===0){if(this._options.renderEmpty&&!this._emptyEl){const F=this._core.slotSize.clientSize-this._core.getSlotSize();this._emptyEl=document.createElement("div"),R(this._emptyEl,`height:${F}px`),this._emptyEl.appendChild(this._options.renderEmpty()),this._listEl.appendChild(this._emptyEl)}this._renderedKeys=[];return}this._emptyEl&&(this._emptyEl.remove(),this._emptyEl=null);let h=this._virtualEl;for(let F=0;F<e.length;F++){const y=e[F],b=String(y[t]);let v=this._itemPool.get(b);if(!v){v=document.createElement("div"),v.dataset.id=b;const C=o??0,f=C>0?`padding:${C/2}px 0;`:"",k=typeof this._options.itemStyle=="function"?this._options.itemStyle(y,s+F):this._options.itemStyle??"";R(v,f+k);const E=typeof this._options.itemClass=="function"?this._options.itemClass(y,s+F):this._options.itemClass??"";E&&(v.className=E),v.appendChild(this._options.renderItem(y,s+F)),this._core.resizeObserver?.observe(v),this._options.onItemMounted?.(v),this._itemPool.set(b,v)}const M=h.nextSibling;M!==v&&this._listEl.insertBefore(v,M),h=v}this._renderedKeys=m}}class ll{constructor(e,n,t){this._gridList=[],this._options=n,this._updateGridList();const i={scroll:r=>t?.scroll?.(r),toTop:r=>t?.toTop?.(r),toBottom:r=>t?.toBottom?.(r),itemResize:(r,o)=>t?.itemResize?.(r,o),rangeUpdate:(r,o)=>t?.rangeUpdate?.(r,o)};this._virtListDOM=new A(e,{list:this._gridList,itemKey:"_id",itemPreSize:n.itemPreSize,itemGap:n.itemGap,fixed:n.fixed,buffer:n.buffer,itemStyle:`display:flex;min-width:min-content;${n.itemStyle??""}`,renderItem:(r,o)=>{const l=document.createElement("div");l.style.display="contents";for(let u=0;u<r.children.length;u++){const s=this._options.renderCell(r.children[u],r._id+u,o);l.appendChild(s)}return l},renderStickyHeader:n.renderStickyHeader,renderStickyFooter:n.renderStickyFooter,renderHeader:n.renderHeader,renderFooter:n.renderFooter,renderEmpty:n.renderEmpty,stickyHeaderStyle:n.stickyHeaderStyle},i)}_updateGridList(){const{list:e,gridItems:n}=this._options;if(n<=0)return;const t=[];for(let i=0;i<e.length;i+=n){const r=[];for(let o=0;o<n&&!(i+o>=e.length);o++)r.push(e[i+o]);t.push({_id:i,children:r})}this._gridList=t}setList(e){this._options.list=e,this._updateGridList(),this._virtListDOM.setList(this._gridList)}setGridItems(e){if(e<=0)return;const n=this._options.gridItems;this._options.gridItems=e;const t=this._virtListDOM.state.inViewBegin;this._updateGridList(),this._virtListDOM.clearItemPool(),this._virtListDOM.setList(this._gridList);const i=Math.floor(t*n/e);requestAnimationFrame(()=>{this._virtListDOM.scrollToIndex(i)})}scrollToIndex(e){const n=Math.floor(e/this._options.gridItems);this._virtListDOM.scrollToIndex(n)}scrollIntoView(e){const n=Math.floor(e/this._options.gridItems);this._virtListDOM.scrollIntoView(n)}scrollToTop(){this._virtListDOM.scrollToTop()}scrollToBottom(){this._virtListDOM.scrollToBottom()}scrollToOffset(e){this._virtListDOM.scrollToOffset(e)}forceUpdate(){this._updateGridList(),this._virtListDOM.setList(this._gridList),this._virtListDOM.forceUpdate()}destroy(){this._virtListDOM.destroy()}}const sl=a=>{const e=a===document.documentElement?a.clientHeight:a.offsetHeight,n=a===document.documentElement?a.clientWidth:a.offsetWidth;return a.scrollHeight>e||a.scrollWidth>n},ul=(a,e=document.documentElement)=>{let n=null,t=a;for(;t&&t!==e&&!n;)sl(t)&&(n=t),t=t.parentElement;return n},ge=(a,e)=>a.previousElementSibling===e||a.nextElementSibling===e,cl=(a,e)=>{let n=a.parentElement;for(;n;){if(n.classList.contains(e))return n;n=n.parentElement}return null};function be(a){let e=a.previousElementSibling;for(;e&&(e.nodeType===3||e.nodeType===8);)e=e.previousElementSibling;if(e?.classList.contains("virt-tree-item"))return e}function fe(a){let e=a.nextElementSibling;for(;e&&(e.nodeType===3||e.nodeType===8);)e=e.nextElementSibling;if(e?.classList.contains("virt-tree-item"))return e}const dl={key:"key",title:"title",children:"children",disableSelect:"disableSelect",disableCheckbox:"disableCheckbox",disableDragIn:"disableDragIn",disableDragOut:"disableDragOut"};class B{constructor(e,n,t){this._treeInfo={treeNodesMap:new Map,treeNodes:[],levelNodesMap:new Map,maxLevel:1,allNodeKeys:[]},this._parentNodeKeys=[],this._expandedKeysSet=new Set,this._selectedKeysSet=new Set,this._checkedKeysSet=new Set,this._indeterminateKeysSet=new Set,this._focusedKeysSet=new Set,this._hiddenNodeKeySet=new Set,this._hiddenExpandIconKeySet=new Set,this._renderList=[],this._dragging=!1,this._nodeElMap=new Map,this._dragState=null,this._containerEl=e,this._options={...n},this._events=t??{},this._fieldNames={...dl,...n.fieldNames},n.focusedKeys&&(this._focusedKeysSet=new Set(n.focusedKeys)),n.selectedKeys&&(this._selectedKeysSet=new Set(n.selectedKeys)),n.checkedKeys&&(this._checkedKeysSet=new Set(n.checkedKeys)),n.expandedKeys&&(this._expandedKeysSet=new Set(n.expandedKeys)),this._setTreeData(n.list),this._initExpandedKeys(),this._initCheckedKeys(),this._computeRenderList(),this._createVirtList()}get treeInfo(){return this._treeInfo}getTreeNode(e){return this._treeInfo.treeNodesMap.get(String(e))}hasExpanded(e){return this._expandedKeysSet.has(e.key)}hasSelected(e){return this._selectedKeysSet.has(e.key)}hasChecked(e){return this._checkedKeysSet.has(e.key)}hasIndeterminate(e){return this._indeterminateKeysSet.has(e.key)}hasFocused(e){return this._focusedKeysSet.has(e.key)}expandAll(e){this._expandedKeysSet=new Set(e?this._parentNodeKeys:[]);const n=e?[...this._parentNodeKeys]:[],t=[];for(const i of n){const r=this.getTreeNode(i);r&&t.push(r.data)}this._events.expand?.(n,{expanded:e,expandedNodes:t}),this._refresh()}expandNode(e,n,t){const i=Array.isArray(e)?e:[e];for(const l of i){const u=this.getTreeNode(l);if(u)if(n)this._expandParents(u);else if(u.isLeaf){if(!u.parent)continue;t?this._foldParents(u.parent):this._expandedKeysSet.delete(u.parent.key)}else this._expandedKeysSet.delete(u.key)}const r=this._sortKeysByDataOrder(this._expandedKeysSet),o=[];for(const l of r){const u=this.getTreeNode(l);u&&o.push(u.data)}this._events.expand?.(r,{node:Array.isArray(e)?void 0:this.getTreeNode(e),expanded:n,expandedNodes:o}),this._refresh()}toggleExpand(e){if(e.isLeaf)return;const n=this.hasExpanded(e);this.expandNode(e.key,!n)}setExpandedKeys(e){this._expandedKeysSet.clear();for(const n of e){const t=this.getTreeNode(n);t&&this._expandParents(t)}this._refresh()}toggleSelect(e){if(e.disableSelect)return;const n=this.hasSelected(e);n?this._selectedKeysSet.delete(e.key):(this._options.selectMultiple||this._selectedKeysSet.clear(),this._selectedKeysSet.add(e.key)),this._afterNodeSelect(e,!n),this._updateRenderedNodeStates()}selectNode(e,n){const t=Array.isArray(e)?e:[e];for(const i of t)n?this._selectedKeysSet.add(i):this._selectedKeysSet.delete(i);this._updateRenderedNodeStates()}selectAll(e){if(e){const n=this._treeInfo.allNodeKeys.filter(t=>{const i=this.getTreeNode(t);return i&&!i.disableSelect});this._selectedKeysSet=new Set(n)}else this._selectedKeysSet.clear();this._updateRenderedNodeStates()}toggleCheckbox(e){const n=this.hasChecked(e);this._toggleCheckboxInternal(e,!n),this._afterNodeCheck(e,!n),this._updateRenderedNodeStates()}checkAll(e){if(!e)this._checkedKeysSet.clear(),this._indeterminateKeysSet.clear();else{const n=this._treeInfo.allNodeKeys.filter(t=>{const i=this.getTreeNode(t);return i&&!i.disableCheckbox});this._checkedKeysSet=new Set(n)}this._updateRenderedNodeStates()}checkNode(e,n){const t=Array.isArray(e)?e:[e];for(const i of t){const r=this.getTreeNode(i);r&&this._toggleCheckboxInternal(r,n)}this._updateRenderedNodeStates()}getCheckedKeys(e=!1){const n=this._sortKeysByDataOrder(this._checkedKeysSet);return e?n.filter(t=>{const i=this.getTreeNode(t);return i&&i.isLeaf}):n}getHalfCheckedKeys(){return this._sortKeysByDataOrder(this._indeterminateKeysSet)}setFocusedKeys(e){this._focusedKeysSet=new Set(e),this._updateRenderedNodeStates()}filter(e){if(typeof this._options.filterMethod!="function")return;const n=new Set,t=this._hiddenNodeKeySet,i=this._hiddenExpandIconKeySet,r=[],o=this._treeInfo.treeNodes||[],l=this._options.filterMethod;t.clear();const u=s=>{for(const c of s){if(c.searchedIndex=e===""?-1:c.title?.toLowerCase().indexOf(e.toLowerCase()),r.push(c),l(e,c))for(const d of r)d.isLeaf||n.add(d.key);else c.isLeaf&&t.add(c.key);if(c.children&&u(c.children),!c.isLeaf){if(!n.has(c.key))t.add(c.key);else if(c.children){let d=!0;for(const m of c.children)if(!t.has(m.key)){d=!1;break}d?i.add(c.key):i.delete(c.key)}}r.pop()}};u(o),n.size>0&&this.expandNode([...n],!0),this._virtListDOM.scrollToTop(),this._refresh()}scrollTo(e){const{key:n,align:t,offset:i}=e;if(i!==void 0&&i>=0){this._virtListDOM.scrollToOffset(i);return}n&&(t==="top"?this._scrollToTarget(n,!0):this._scrollToTarget(n,!1))}scrollToTop(){this._virtListDOM.scrollToTop()}scrollToBottom(){this._virtListDOM.scrollToBottom()}setList(e){this._options.list=e,this._parentNodeKeys.length=0,this._treeInfo.treeNodesMap.clear(),this._treeInfo.allNodeKeys.length=0,this._setTreeData(e),this._initExpandedKeys(),this._initCheckedKeys(),this._nodeElMap.clear(),this._virtListDOM.clearItemPool(),this._refresh()}forceUpdate(){this._parentNodeKeys.length=0,this._treeInfo.treeNodesMap.clear(),this._treeInfo.allNodeKeys.length=0,this._setTreeData(this._options.list),this._initExpandedKeys(),this._initCheckedKeys(),this._nodeElMap.clear(),this._virtListDOM.clearItemPool(),this._refresh()}updateOptions(e){e.expandedKeys!==void 0&&(this._expandedKeysSet=new Set(e.expandedKeys)),e.selectedKeys!==void 0&&(this._selectedKeysSet=new Set(e.selectedKeys)),e.checkedKeys!==void 0&&(this._checkedKeysSet=new Set(e.checkedKeys),this._updateCheckedKeys()),e.focusedKeys!==void 0&&(this._focusedKeysSet=new Set(e.focusedKeys)),Object.assign(this._options,e),e.list?this.setList(e.list):this._refresh()}destroy(){this._cleanupDrag(),this._virtListDOM.destroy(),this._nodeElMap.clear()}_sortKeysByDataOrder(e){const n=new Map,t=this._treeInfo.allNodeKeys;for(let r=0;r<t.length;r++)n.set(t[r],r);const i=[...e].filter(r=>n.has(r));return i.sort((r,o)=>n.get(r)-n.get(o)),i}_setTreeData(e){const n=this._fieldNames,t=new Map;let i=1;const r=(o,l=1,u)=>{const s=[];let c=0;for(const d of o){c++;const m=d[n.key],g=d[n.title],h=d[n.children],F=d[n.disableSelect],y=d[n.disableCheckbox],b={data:d,key:m,parent:u,level:l,title:g,disableSelect:F,disableCheckbox:y,isLeaf:!h||h.length===0,isLast:c===o.length};h&&h.length&&(b.children=r(h,l+1,b),this._parentNodeKeys.push(b.key)),s.push(b),this._treeInfo.treeNodesMap.set(String(m),b),this._treeInfo.allNodeKeys.push(m),l>i&&(i=l);const v=t.get(l);v?v.push(b):t.set(l,[b])}return s};this._treeInfo.treeNodes=r(e),this._treeInfo.levelNodesMap=t,this._treeInfo.maxLevel=i}_initExpandedKeys(){if(this._options.defaultExpandAll)this._expandedKeysSet=new Set(this._parentNodeKeys);else if(this._options.expandedKeys!==void 0){this._expandedKeysSet.clear();for(const e of this._options.expandedKeys){const n=this.getTreeNode(e);n&&this._expandParents(n)}}}_initCheckedKeys(){if(this._checkedKeysSet.clear(),this._indeterminateKeysSet.clear(),this._options.checkable&&this._options.checkedKeys)for(const e of this._options.checkedKeys){const n=this.getTreeNode(e);n&&!this.hasChecked(n)&&this._toggleCheckboxInternal(n,!0)}}_expandParents(e){e.isLeaf||this._expandedKeysSet.add(e.key),e.parent&&this._expandParents(e.parent)}_foldParents(e){this._expandedKeysSet.delete(e.key),e.parent&&this._foldParents(e.parent)}_toggleCheckboxInternal(e,n){if(e.disableCheckbox)return;const t=(i,r)=>{if(this._checkedKeysSet[r?"add":"delete"](i.key),i.children&&!this._options.checkedStrictly)for(const o of i.children)o.disableCheckbox||t(o,r)};t(e,n),this._options.checkedStrictly||this._updateCheckedKeys()}_updateCheckedKeys(){if(!this._options.checkable)return;const{maxLevel:e,levelNodesMap:n}=this._treeInfo,t=this._checkedKeysSet,i=new Set;for(let r=e-1;r>=1;r--){const o=n.get(r);if(o)for(const l of o){const u=l.children;if(!u)continue;let s=!0,c=!1;for(const d of u)if(!d.disableCheckbox)if(t.has(d.key))c=!0;else if(i.has(d.key)){s=!1,c=!0;break}else s=!1;s&&!l.disableCheckbox?t.add(l.key):c&&!l.disableCheckbox?(i.add(l.key),t.delete(l.key)):(t.delete(l.key),i.delete(l.key))}}this._indeterminateKeysSet=i}_afterNodeCheck(e,n){const t=this._sortKeysByDataOrder(this._checkedKeysSet),i=[];for(const l of t){const u=this.getTreeNode(l);u&&i.push(u.data)}const r=this._sortKeysByDataOrder(this._indeterminateKeysSet),o=[];for(const l of r){const u=this.getTreeNode(l);u&&o.push(u.data)}this._events.check?.(t,{node:e,checked:n,checkedKeys:t,checkedNodes:i,halfCheckedKeys:r,halfCheckedNodes:o})}_afterNodeSelect(e,n){const t=this._sortKeysByDataOrder(this._selectedKeysSet),i=[];for(const r of t){const o=this.getTreeNode(r);o&&i.push(o.data)}this._events.select?.(t,{node:e,selected:n,selectedKeys:t,selectedNodes:i})}_computeRenderList(){const e=this._hiddenNodeKeySet,n=this._treeInfo.treeNodes||[],t=[],i=[];for(let r=n.length-1;r>=0;--r)i.push(n[r]);for(;i.length;){const r=i.pop();if(r&&(e.has(r.key)||t.push(r),this.hasExpanded(r)&&r.children))for(let o=r.children.length-1;o>=0;--o)i.push(r.children[o])}this._renderList=t}_refresh(){this._computeRenderList(),this._virtListDOM.setList(this._renderList),this._virtListDOM.forceUpdate(),this._updateRenderedNodeStates()}_scrollToTarget(e,n){let t=this._renderList.findIndex(i=>i.key===e);t<0&&(this.expandNode(e,!0),this._computeRenderList(),this._virtListDOM.setList(this._renderList),t=this._renderList.findIndex(i=>i.key===e)),!(t<0)&&(n?this._virtListDOM.scrollToIndex(t):this._virtListDOM.scrollIntoView(t))}_isForceHiddenExpandIcon(e){return this._hiddenExpandIconKeySet.has(e.key)}_createVirtList(){const e=this._options,n=e.itemPreSize??32,i=`${e.customGroup??"virt-tree-group"} ${e.listClass??""}`;this._virtListDOM=new A(this._containerEl,{list:this._renderList,itemKey:"key",itemPreSize:n,fixed:e.fixed,itemGap:e.itemGap,buffer:e.buffer??2,listStyle:"position:relative;",listClass:i,itemClass:r=>{const o=["virt-tree-item"];return e.itemClass&&o.push(e.itemClass),o.join(" ")},renderItem:r=>this._renderTreeNode(r),renderStickyHeader:e.renderStickyHeader,renderStickyFooter:e.renderStickyFooter,renderHeader:e.renderHeader,renderFooter:e.renderFooter,renderEmpty:e.renderEmpty,onItemUnmounted:r=>{const o=r.dataset.id;o!==void 0&&this._nodeElMap.delete(o)}},{scroll:r=>this._events.scroll?.(r),toTop:r=>this._events.toTop?.(r),toBottom:r=>this._events.toBottom?.(r),itemResize:(r,o)=>this._events.itemResize?.(r,o),rangeUpdate:(r,o)=>this._events.rangeUpdate?.(r,o)}),this._dragging&&this._virtListDOM.clientEl.classList.add("is-dragging")}_renderTreeNode(e){const n=this._options,t=n.itemPreSize??32,i=n.indent??16,r=n.iconSize??16,o=n.fixed??!1,l=n.showLine??!1,u=n.itemGap??0,s=n.checkable??!1,c=n.draggable??!1,d=this.hasExpanded(e),m=this.hasSelected(e),g=this.hasChecked(e),h=this.hasIndeterminate(e),F=this.hasFocused(e),y=this._isForceHiddenExpandIcon(e);if(n.renderNode){const k=n.renderNode(e,d);return this._nodeElMap.set(String(e.key),k),k}const b=document.createElement("div");b.className="virt-tree-node",m&&b.classList.add("is-selected"),e.disableSelect&&b.classList.add("is-disabled"),F&&b.classList.add("is-focused"),b.style.minHeight=`${t}px`,o&&(b.style.height=`${t}px`);const v=e.key;if(c&&(b.setAttribute("draggable","true"),b.addEventListener("dragstart",k=>{this._onDragstart(k)})),e.level>1){const k=document.createElement("div");k.className="virt-tree-node-indent";for(let E=0;E<=e.level-2;E++){const T=document.createElement("div");T.className="virt-tree-node-indent-block",l&&(T.classList.add("virt-tree-node-indent-block-line-vertical"),E===e.level-2&&(T.classList.add("virt-tree-node-indent-block-line-horizontal"),e.isLast&&!d&&T.classList.add("virt-tree-node-indent-block-line-vertical--half"),e.isLeaf&&T.classList.add("virt-tree-node-indent-block-line-horizontal--double"))),T.style.width=`${i}px`,T.style.height=u>0?`calc(100% + ${u}px)`:"100%",T.style.transform=`translateY(-${u/2}px)`,k.appendChild(T)}b.appendChild(k)}const M=document.createElement("div");M.className="virt-tree-icon-wrapper",d&&M.classList.add("is-expanded"),M.style.width=`${i}px`;const C=document.createElement("div");if(C.className="virt-tree-icon",C.style.display=e.isLeaf||y?"none":"block",C.style.width=`${r}px`,C.style.height=`${r}px`,C.addEventListener("click",k=>{k.stopPropagation();const E=this.getTreeNode(v);E&&this._onClickExpandIcon(E)}),n.renderIcon?C.appendChild(n.renderIcon(e,d)):C.innerHTML='<svg width="100%" height="100%" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.5632 7.72544L10.539 13.2587C10.2728 13.6247 9.72696 13.6247 9.46073 13.2587L5.43658 7.72544C5.11611 7.28479 5.43088 6.66666 5.97573 6.66666L14.024 6.66666C14.5689 6.66666 14.8837 7.28479 14.5632 7.72544Z" fill="var(--virt-tree-color-icon)"/></svg>',M.appendChild(C),b.appendChild(M),s){const k=document.createElement("div");k.className="virt-tree-checkbox-wrapper";const E=document.createElement("div");E.className="virt-tree-checkbox",g&&E.classList.add("is-checked"),h&&E.classList.add("is-indeterminate"),e.disableCheckbox&&E.classList.add("is-disabled"),E.addEventListener("click",T=>{T.stopPropagation();const ie=this.getTreeNode(v);ie&&this._onClickCheckbox(ie)}),k.appendChild(E),b.appendChild(k)}const f=document.createElement("div");return f.className="virt-tree-node-content",o&&f.classList.add("is-fixed-height"),f.addEventListener("click",k=>{k.stopPropagation();const E=this.getTreeNode(v);E&&this._onClickNodeContent(E)}),n.renderContent?f.appendChild(n.renderContent(e)):f.textContent=e.title??"",b.appendChild(f),this._nodeElMap.set(String(e.key),b),b}_updateRenderedNodeStates(){for(const[e,n]of this._nodeElMap){const t=this.getTreeNode(e);if(!t)continue;if(n.classList.toggle("is-selected",this.hasSelected(t)),n.classList.toggle("is-focused",this.hasFocused(t)),this._options.checkable){const r=n.querySelector(".virt-tree-checkbox");r&&(r.classList.toggle("is-checked",this.hasChecked(t)),r.classList.toggle("is-indeterminate",this.hasIndeterminate(t)))}const i=n.querySelector(".virt-tree-icon-wrapper");i&&i.classList.toggle("is-expanded",this.hasExpanded(t))}}_onClickExpandIcon(e){this._dragging||this.toggleExpand(e)}_onClickCheckbox(e){this._dragging||this.toggleCheckbox(e)}_onClickNodeContent(e){this._dragging||(this._options.selectable&&!e.disableSelect?this.toggleSelect(e):this._options.checkable&&!e.disableCheckbox&&this._options.checkOnClickNode?this.toggleCheckbox(e):this._options.expandOnClickNode&&this.toggleExpand(e))}_cleanupDrag(){this._dragState&&(document.removeEventListener("mousemove",this._dragState.onMousemove),document.removeEventListener("mouseup",this._dragState.onMouseup),document.removeEventListener("keydown",this._dragState.onKeydown),this._dragState.scrollElement&&this._dragState.scrollElement.removeEventListener("scroll",this._dragState.onScroll),this._dragState.autoScrollTimer&&clearInterval(this._dragState.autoScrollTimer),this._dragState.hoverExpandTimer&&clearTimeout(this._dragState.hoverExpandTimer),this._dragState=null)}_onDragstart(e){if(!this._options.draggable)return;e.preventDefault(),e.stopPropagation();const n=e.composedPath().find(F=>F.classList?.contains("virt-tree-item"));if(!n)return;const t=this._virtListDOM.clientEl,i=t.getBoundingClientRect(),r=ul(t),o=r?.getBoundingClientRect(),l=this._options,u=l.indent??16,s=l.crossLevelDraggable!==!1,c=document.createElement("div");c.classList.add("virt-tree-drag-box");const d=document.createElement("div");d.classList.add(s?"virt-tree-drag-line":"virt-tree-drag-line-same-level"),d.style.paddingLeft=`${u}px`;const m=document.createElement("div");m.classList.add("virt-tree-drag-line-arrow");const g=document.createElement("div");g.classList.add("virt-tree-all-drag-area");const h={startX:0,startY:0,mouseX:0,mouseY:0,dragEffect:!1,minLevel:1,maxLevel:1,targetLevel:1,dragAreaBottom:!1,placement:"",lastPlacement:"",sourceTreeItem:n,cloneTreeItem:null,hasStyleTreeItem:null,hoverTreeItem:null,lastHoverTreeItem:null,prevTreeItem:null,nextTreeItem:null,scrollElement:r,dragAreaParentElement:null,scrollElementRect:o,clientElementRect:i,sourceNode:void 0,prevElementNode:void 0,parentNode:void 0,prevNode:void 0,nextNode:void 0,hoverExpandTimer:null,autoScrollTimer:null,dragBox:c,dragLine:d,levelArrow:m,allowDragArea:g,onMousemove:()=>{},onMouseup:()=>{},onKeydown:()=>{},onScroll:()=>{}};h.onScroll=()=>{this._dragging&&this._dragProcess(h)},h.onMousemove=F=>{if(h.cloneTreeItem||this._dragStartClone(h),!h.cloneTreeItem)return;this._dragging=!0,this._virtListDOM.clientEl.classList.add("is-dragging"),h.mouseX=F.clientX,h.mouseY=F.clientY;const y=h.mouseX-h.startX,b=h.mouseY-h.startY;h.cloneTreeItem.style.left=`${10+y}px`,h.cloneTreeItem.style.top=`${10+b}px`,this._autoScroll(h),this._dragProcess(h)},h.onMouseup=()=>{if(this._dragging){if(setTimeout(()=>{this._dragging=!1,this._virtListDOM.clientEl.classList.remove("is-dragging")},0),!s&&h.allowDragArea&&(h.allowDragArea.innerHTML="",h.allowDragArea.remove(),h.dragAreaParentElement=null),!h.sourceNode){this._cleanupDragDOM(h);return}if(h.dragAreaBottom&&!s){h.parentNode=h.sourceNode.parent;const F=h.hoverTreeItem?.dataset?.id;if(F){const y=this.getTreeNode(F);y&&(h.prevNode=this._findTargetLevelParent(y,h.sourceNode.level))}}else if(h.placement!=="center")if(h.parentNode=void 0,h.prevElementNode)if(h.prevElementNode.level>=h.targetLevel){let F=h.prevElementNode.level-h.targetLevel;for(h.prevNode=h.prevElementNode,h.parentNode=h.prevElementNode.parent;F>0;)h.prevNode=h.prevNode?.parent,h.parentNode=h.parentNode?.parent,F--}else h.targetLevel-h.prevElementNode.level===1?h.parentNode=h.prevElementNode:(h.parentNode=h.prevElementNode.parent,h.prevNode=h.prevElementNode);else s||(h.prevNode=void 0);this._events.dragend?.(h.dragEffect?{node:h.sourceNode,prevNode:h.prevNode,parentNode:h.parentNode}:void 0)}this._cleanupDragDOM(h)},h.onKeydown=F=>{F.key==="Escape"&&(h.dragEffect=!1,h.onMouseup())},r?.addEventListener("scroll",h.onScroll),document.addEventListener("mousemove",h.onMousemove),document.addEventListener("mouseup",h.onMouseup),document.addEventListener("keydown",h.onKeydown),this._dragState=h}_cleanupDragDOM(e){e.hasStyleTreeItem?.contains(e.dragLine)&&e.hasStyleTreeItem.removeChild(e.dragLine),e.hasStyleTreeItem?.contains(e.dragBox)&&e.hasStyleTreeItem.removeChild(e.dragBox),e.cloneTreeItem&&(this._options.dragGhostClass&&e.cloneTreeItem.classList.remove(this._options.dragGhostClass),document.body.removeChild(e.cloneTreeItem),e.cloneTreeItem=null),e.sourceTreeItem&&(this._options.dragClass&&e.sourceTreeItem.classList.remove(this._options.dragClass),e.sourceTreeItem.classList.remove("virt-tree-item--drag"),e.sourceTreeItem=null),e.hoverExpandTimer&&(clearTimeout(e.hoverExpandTimer),e.hoverExpandTimer=null),e.autoScrollTimer&&(clearInterval(e.autoScrollTimer),e.autoScrollTimer=null),e.scrollElement?.removeEventListener("scroll",e.onScroll),document.removeEventListener("mousemove",e.onMousemove),document.removeEventListener("mouseup",e.onMouseup),document.removeEventListener("keydown",e.onKeydown),this._dragState=null}_dragStartClone(e){if(!e.sourceTreeItem)return;const n=e.sourceTreeItem.dataset?.id??"";if(e.sourceNode=this.getTreeNode(n),!e.sourceNode||e.sourceNode.data?.disableDragOut)return;this._events.dragstart?.({sourceNode:e.sourceNode}),this.hasExpanded(e.sourceNode)&&this.expandNode(n,!1),this._options.crossLevelDraggable===!1&&this._createDragArea(e,e.sourceNode);const t=e.sourceTreeItem.getBoundingClientRect();e.sourceTreeItem.classList.add("virt-tree-item--drag"),this._options.dragClass&&e.sourceTreeItem.classList.add(this._options.dragClass),e.cloneTreeItem=e.sourceTreeItem.cloneNode(!0),e.cloneTreeItem.classList.add("virt-tree-item--ghost"),this._options.dragGhostClass&&e.cloneTreeItem.classList.add(this._options.dragGhostClass),e.cloneTreeItem.style.position="fixed",e.cloneTreeItem.style.width=`${t.width}px`,e.cloneTreeItem.style.height=`${t.height}px`,document.body.append(e.cloneTreeItem)}_createDragArea(e,n){const t=this._options.customGroup??"virt-tree-group",i=this._calcDragArea(n.parent);if(e.dragAreaParentElement=document.querySelector(n.level===1?`.virt-list__client .${t}`:`.${t} [data-id="${n.parent?.key}"]`),!e.dragAreaParentElement)return;const r=e.dragAreaParentElement.getBoundingClientRect();e.allowDragArea.style.width=`${r.width}px`,e.allowDragArea.style.height=`${i}px`,e.allowDragArea.style.top=`${n.level===1?0:r.height+(e.dragAreaParentElement.offsetTop??0)}px`,this._virtListDOM.listEl.style.position="relative",this._virtListDOM.listEl.append(e.allowDragArea)}_calcDragArea(e){const n=t=>{let i=0;for(const r of t||[])r.children?.length&&this.hasExpanded(r)&&(i+=this._calcDragArea(r)),i+=this._virtListDOM.core.getItemSize(String(r.key));return i};return n(e?e.children||[]:this._treeInfo.treeNodes||[])}_findTargetLevelParent(e,n){if(!e||!n)return null;let t=e.parent;for(;t;){if(t.level===n)return t;t=t.parent}return null}_autoScroll(e){if(!e.scrollElement||!e.scrollElementRect||(e.autoScrollTimer&&(clearInterval(e.autoScrollTimer),e.autoScrollTimer=null),e.clientElementRect&&(e.mouseX<e.clientElementRect.left||e.mouseX>e.clientElementRect.right||e.mouseY<e.clientElementRect.top||e.mouseY>e.clientElementRect.bottom)))return;const n=e.scrollElementRect.height/4,t=20,i=e.scrollElementRect,r=e.scrollElement;if(i.top<e.mouseY&&e.mouseY<i.top+n){const o=(1-(e.mouseY-i.top)/n)*t;e.autoScrollTimer=setInterval(()=>{r.scrollTop-=o},10)}else if(i.top+n*3<e.mouseY&&e.mouseY<i.bottom){const o=(e.mouseY-(i.top+n*3))/n*t;e.autoScrollTimer=setInterval(()=>{r.scrollTop+=o},10)}}_buildDragLine(e,n){const t=this._options.indent??16;e.dragLine.innerHTML="";for(let i=0;i<n;i++){const r=document.createElement("div");i===n-1?(r.style.flex="1",r.style.backgroundColor="var(--virt-tree-color-drag-line)"):r.style.width=`${t-4}px`,r.style.height="100%",r.style.position="relative",e.dragLine.appendChild(r)}}_dragProcess(e){e.clientElementRect&&(e.mouseX<e.clientElementRect.left||e.mouseX>e.clientElementRect.right||e.mouseY<e.clientElementRect.top||e.mouseY>e.clientElementRect.bottom)&&(e.hasStyleTreeItem?.contains(e.dragLine)&&e.hasStyleTreeItem.removeChild(e.dragLine),e.hasStyleTreeItem?.contains(e.dragBox)&&e.hasStyleTreeItem.removeChild(e.dragBox),e.lastHoverTreeItem=null,e.dragEffect=!1);const n=document.elementFromPoint(e.mouseX,e.mouseY);if(!n||(e.hoverTreeItem=cl(n,"virt-tree-item"),!e.hoverTreeItem))return;const t=e.hoverTreeItem.dataset?.id,i=e.sourceTreeItem?.dataset?.id;if(!t||!i)return;const r=this.getTreeNode(t);if(!r)return;if(t===i){e.sourceTreeItem=e.hoverTreeItem,e.sourceTreeItem.classList.add("virt-tree-item--drag"),e.hasStyleTreeItem?.contains(e.dragLine)&&e.hasStyleTreeItem.removeChild(e.dragLine),e.hasStyleTreeItem?.contains(e.dragBox)&&e.hasStyleTreeItem.removeChild(e.dragBox),e.dragEffect=!1;return}const o=e.hoverTreeItem.getBoundingClientRect(),u=(e.mouseY-o.top)/o.height;this._options.crossLevelDraggable!==!1?this._crossLevelDragProcess(e,o,r,t,u):this._sameLevelDragProcess(e,r,u)}_updateDragRelateNode(e,n){n.appendChild(e.dragLine),e.hasStyleTreeItem=n,e.placement==="top"?(e.dragLine.style.top="-1px",e.dragLine.style.bottom="auto",e.nextTreeItem=n,e.prevTreeItem=be(n)):(e.dragLine.style.top="auto",e.dragLine.style.bottom="-1px",e.prevTreeItem=n,e.nextTreeItem=fe(n));const t=e.prevTreeItem?.dataset?.id,i=e.nextTreeItem?.dataset?.id;e.prevElementNode=t?this.getTreeNode(t):void 0,e.nextNode=i?this.getTreeNode(i):void 0}_sameLevelDragProcess(e,n,t){if(n.isLast&&n.isLeaf&&e.sourceNode&&this._findTargetLevelParent(n,e.sourceNode.level)?.isLast){e.placement="bottom",e.dragEffect=!0,e.dragAreaBottom=!0,this._updateDragRelateNode(e,e.hoverTreeItem),e.targetLevel=e.sourceNode.level??1,this._buildDragLine(e,e.targetLevel);return}if(e.dragAreaBottom=!1,!e.sourceNode||n.level!==e.sourceNode.level||n.parent?.data.id!==e.sourceNode.parent?.data.id){e.prevTreeItem=null,e.nextTreeItem=null;return}if(e.placement=t>.33?"bottom":"top",e.placement==="bottom"&&this.hasExpanded(n)){e.lastHoverTreeItem=null,e.prevTreeItem=null,e.nextTreeItem=null;return}(e.lastHoverTreeItem!==e.hoverTreeItem||e.placement!==e.lastPlacement)&&(e.lastHoverTreeItem&&!ge(e.lastHoverTreeItem,e.hoverTreeItem)&&e.hasStyleTreeItem?.contains(e.dragLine)&&e.hasStyleTreeItem.removeChild(e.dragLine),e.lastPlacement=e.placement,e.lastHoverTreeItem=e.hoverTreeItem,e.dragEffect=!0,this._updateDragRelateNode(e,e.hoverTreeItem),e.targetLevel=n.level??1,this._buildDragLine(e,e.targetLevel))}_crossLevelDragProcess(e,n,t,i,r){const o=this._options.indent??16;let l=.33,u=.66;if(t.data?.disableDragIn&&(l=.5,u=.5),r<l?e.placement="top":r>u?e.placement="bottom":e.placement="center",e.lastHoverTreeItem!==e.hoverTreeItem||e.placement!==e.lastPlacement){if(e.lastHoverTreeItem&&!ge(e.lastHoverTreeItem,e.hoverTreeItem)&&(e.hasStyleTreeItem?.contains(e.dragLine)&&e.hasStyleTreeItem.removeChild(e.dragLine),e.hasStyleTreeItem?.contains(e.dragBox)&&e.hasStyleTreeItem.removeChild(e.dragBox)),e.lastPlacement=e.placement,e.lastHoverTreeItem=e.hoverTreeItem,e.hoverTreeItem===e.sourceTreeItem){e.hasStyleTreeItem?.contains(e.dragLine)&&e.hasStyleTreeItem.removeChild(e.dragLine),e.hasStyleTreeItem?.contains(e.dragBox)&&e.hasStyleTreeItem.removeChild(e.dragBox),e.dragEffect=!1;return}if(e.hoverExpandTimer&&(clearTimeout(e.hoverExpandTimer),e.hoverExpandTimer=null),e.placement==="center"){if(e.dragEffect=!1,e.parentNode=t,e.prevNode=void 0,e.hasStyleTreeItem?.contains(e.dragLine)&&e.hasStyleTreeItem.removeChild(e.dragLine),t.data?.disableDragIn)return;e.hoverTreeItem.appendChild(e.dragBox),e.hasStyleTreeItem=e.hoverTreeItem,e.dragEffect=!0,this.hasExpanded(t)||(e.hoverExpandTimer=setTimeout(()=>{this.expandNode(i,!0),e.hoverExpandTimer=null},500));return}e.dragEffect=!0,e.hasStyleTreeItem?.contains(e.dragBox)&&e.hasStyleTreeItem.removeChild(e.dragBox),e.hoverTreeItem.appendChild(e.dragLine),e.hasStyleTreeItem=e.hoverTreeItem,e.placement==="top"?(e.dragLine.style.top="-1px",e.dragLine.style.bottom="auto",e.nextTreeItem=e.hoverTreeItem,e.prevTreeItem=be(e.hoverTreeItem)):(e.dragLine.style.top="auto",e.dragLine.style.bottom="-1px",e.prevTreeItem=e.hoverTreeItem,e.nextTreeItem=fe(e.hoverTreeItem));const s=e.prevTreeItem?.dataset?.id,c=e.nextTreeItem?.dataset?.id;e.prevElementNode=s?this.getTreeNode(s):void 0,e.nextNode=c?this.getTreeNode(c):void 0,e.minLevel=Math.min(e.prevElementNode?.level??1,e.nextNode?.level??1),e.maxLevel=Math.max(e.prevElementNode?.level??1,e.nextNode?.level??1),e.dragLine.innerHTML="";for(let d=0;d<e.maxLevel;d++){const m=document.createElement("div");d===e.maxLevel-1?m.style.flex="1":m.style.width=`${o-4}px`,m.style.height="100%",m.style.position="relative",e.dragLine.appendChild(m)}}if(e.placement!=="center"){const s=e.mouseX-n.left-o;e.targetLevel=Math.ceil(s/o),e.targetLevel<=e.minLevel&&(e.targetLevel=e.minLevel),e.targetLevel>=e.maxLevel&&(e.targetLevel=e.maxLevel);const c=e.dragLine.childNodes[e.targetLevel-1];if(c){c.appendChild(e.levelArrow);for(let d=e.minLevel-1;d<=e.maxLevel-1;d++){const m=e.dragLine.childNodes[d];d<e.targetLevel-1?m.style.backgroundColor="var(--virt-tree-color-drag-line-disabled)":m.style.backgroundColor="var(--virt-tree-color-drag-line)"}}}}}const hl=`
  <div class="virt-list-container" id="virtListContainer"></div>
`;function ml(){return Array.from({length:100},(a,e)=>({id:e,content:V.lorem.paragraph()}))}function pl(a){a.innerHTML=hl;const e=a.querySelector("#virtListContainer"),n=new A(e,{list:ml(),itemKey:"id",itemPreSize:72,buffer:3,renderItem:t=>{const i=document.createElement("div");return i.style.padding="4px",i.innerHTML=`
        <div style="font-weight:bold;">Item ${t.id}</div>
        <div style="color:#666;font-size:12px;">${t.content}</div>
        <div style="color:#999;font-size:10px;">Key: ${t.id} (DOM)</div>
      `,i}});return()=>{n.destroy(),a.innerHTML=""}}const ve=["虚拟列表只渲染可视区域内的元素，大幅提升性能。","动态高度列表需要在渲染后测量实际尺寸。","每一行的内容长度不同，高度也会随之变化。这是虚拟列表最核心的能力之一，它需要实时追踪每个元素的实际渲染尺寸。","短文本。","相比全量渲染，虚拟列表可以将 DOM 节点控制在很小的范围内。即使面对数十万条数据，滚动体验依然流畅丝滑，内存占用也维持在较低水平。","滚动过程中列表会计算需要渲染的起始和结束索引。","被移出可视区域的节点会被及时回收，新进入可视区域的节点会被创建并插入到正确的位置。这个过程对用户来说是完全透明的。","纯 JS 实现，无框架依赖。"],z=Array.from({length:1e3},(a,e)=>{const n=e%5+1,t=[];for(let i=0;i<n;i++)t.push(ve[(e+i*3)%ve.length]);return{id:e,content:t.join(" ")}}),Fl=`
  <div class="virt-list-controls">
    <div class="virt-list-control-group">
      <label for="scrollToIndexInput">滚动到索引:</label>
      <input type="number" id="scrollToIndexInput" placeholder="0" min="0" value="50" />
      <button class="virt-list-btn virt-list-btn-primary" id="btnScrollToIndex">滚动到索引</button>
    </div>
    <div class="virt-list-control-group">
      <label for="scrollToOffsetInput">滚动到偏移:</label>
      <input type="number" id="scrollToOffsetInput" placeholder="0" min="0" value="1000" />
      <button class="virt-list-btn virt-list-btn-secondary" id="btnScrollToOffset">滚动到偏移</button>
    </div>
    <div class="virt-list-control-group">
      <label for="scrollIntoViewInput">滚动到可视区域:</label>
      <input type="number" id="scrollIntoViewInput" placeholder="0" min="0" value="30" />
      <button class="virt-list-btn virt-list-btn-success" id="btnScrollIntoView">滚动到可视区域</button>
    </div>
  </div>
  <div class="virt-list-controls">
    <button class="virt-list-btn virt-list-btn-primary" id="btnTop">滚动到顶部</button>
    <button class="virt-list-btn virt-list-btn-primary" id="btnBottom">滚动到底部</button>
    <button class="virt-list-btn virt-list-btn-warning" id="btnRandom">随机滚动</button>
    <button class="virt-list-btn virt-list-btn-success" id="btnToggleScrollbar">切换真实滚动条</button>
  </div>
  <div id="status" class="status-text"></div>
  <div class="virt-list-container" id="virtListContainer"></div>
`;function yl(a){a.innerHTML=Fl;const e=a.querySelector("#virtListContainer"),n=a.querySelector("#status");let t=!1;const i=[],r=new A(e,{list:z,itemKey:"id",itemPreSize:72,buffer:4,renderItem:s=>{const c=document.createElement("div");return c.className="virt-item",c.style.backgroundColor=`hsl(${s.id*13%360} 75% 95%)`,c.style.padding="8px 12px",c.style.borderBottom="1px solid rgba(0,0,0,0.06)",c.innerHTML=`
        <div style="font-weight:bold;margin-bottom:2px;">Item ${s.id}</div>
        <div style="color:#666;font-size:13px;line-height:1.5;">${s.content}</div>
      `,c}}),o=s=>Number.parseInt(a.querySelector(`#${s}`).value,10),l=s=>{n.textContent=s},u=(s,c)=>{const d=a.querySelector(`#${s}`);d.addEventListener("click",c),i.push(()=>d.removeEventListener("click",c))};return u("btnTop",()=>{r.scrollToTop(),l("已滚动到顶部")}),u("btnBottom",()=>{r.scrollToBottom(),l("已滚动到底部")}),u("btnScrollToIndex",()=>{const s=o("scrollToIndexInput");if(Number.isNaN(s)||s<0||s>=z.length){l("请输入有效索引 (0 - 999)");return}r.scrollToIndex(s),l(`已滚动到索引 ${s}`)}),u("btnScrollToOffset",()=>{const s=o("scrollToOffsetInput");if(Number.isNaN(s)||s<0){l("请输入有效偏移值");return}r.scrollToOffset(s),l(`已滚动到偏移 ${s}`)}),u("btnScrollIntoView",()=>{const s=o("scrollIntoViewInput");if(Number.isNaN(s)||s<0||s>=z.length){l("请输入有效索引 (0 - 999)");return}r.scrollIntoView(s),l(`已确保索引 ${s} 在可视区域`)}),u("btnRandom",()=>{const s=Math.floor(Math.random()*z.length);a.querySelector("#scrollToIndexInput").value=String(s),r.scrollToIndex(s),l(`随机滚动到索引 ${s}`)}),u("btnToggleScrollbar",()=>{t=!t,e.classList.toggle("hide-native-scrollbar",t),l(t?"已隐藏真实滚动条":"已显示真实滚动条")}),l("示例已就绪：1000 行虚拟列表"),()=>{r.destroy(),i.forEach(s=>s()),a.innerHTML=""}}const Ce=["虚拟列表是一种高性能的列表渲染方案，只渲染可视区域内的元素。","通过动态计算每个元素的位置和大小，可以高效地处理海量数据。","每一行的内容长度不同，高度也会随之变化，这正是动态高度虚拟列表的核心能力。","当列表项的高度不固定时，需要在渲染后测量实际尺寸并更新位置信息。","这段文本比较短。","相比传统的全量渲染方式，虚拟列表可以将 DOM 节点数量控制在一个很小的范围内，从而大幅提升滚动性能和内存效率。即使数据量达到数十万条，滚动体验依然流畅。","支持自动添加数据。","滚动过程中，列表会根据当前的滚动位置计算出需要渲染的起始和结束索引，只创建必要的 DOM 节点。被移出可视区域的节点会被及时回收，避免内存泄漏。"];let gl=0;function X(a,e=0){return Array.from({length:a},(n,t)=>{const i=e+t,r=i%5+1,o=[];for(let l=0;l<r;l++)o.push(Ce[(i+l*3)%Ce.length]);return{id:gl++,index:i,text:o.join(" ")}})}const bl=`
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
`;function fl(a){a.innerHTML=bl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=a.querySelector("#addCount"),i=a.querySelector("#btnAdd"),r=a.querySelector("#btnAutoAdd"),o=a.querySelector("#btnStop");let l=X(1e3),u=null;const s=new A(e,{list:l,itemKey:"id",itemPreSize:40,buffer:5,renderItem:c=>{const d=document.createElement("div");return d.className="demo-row-item",d.innerHTML=`
          <span class="demo-row-index">#${c.index}</span>
          <span class="demo-row-text">${c.text}</span>
        `,d}},{rangeUpdate:(c,d)=>{n.textContent=`总数: ${l.length} | RenderBegin: ${c} | RenderEnd: ${d}`}});return n.textContent=`总数: ${l.length}`,i.addEventListener("click",()=>{const c=parseInt(t.value,10)||1e3,d=X(c,l.length);l=l.concat(d),s.setList(l),s.forceUpdate()}),r.addEventListener("click",()=>{r.style.display="none",o.style.display="",u=setInterval(()=>{if(l.length>=5e5){clearInterval(u),u=null,r.style.display="",o.style.display="none";return}const c=X(1e3,l.length);l=l.concat(c),s.setList(l),s.forceUpdate()},100)}),o.addEventListener("click",()=>{u&&(clearInterval(u),u=null),r.style.display="",o.style.display="none"}),()=>{u&&clearInterval(u),s.destroy(),a.innerHTML=""}}const vl=`
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
`;function Cl(a){a.innerHTML=vl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=a.querySelector("#btnLoad"),i=a.querySelector("#loadStatus"),r=a.querySelector("#emptyHint");let o=null;return t.addEventListener("click",()=>{t.disabled=!0,i.textContent="正在生成数据...",r.textContent="数据生成中...",setTimeout(()=>{const l=["海量数据测试行。","虚拟列表在处理大量数据时依然保持流畅的滚动体验，DOM 节点数量始终维持在较低水平。","这一行的内容比较短。","通过增量式的 DOM 更新策略，虚拟列表避免了一次性创建大量节点所带来的性能瓶颈。即使数据量达到数十万条，首屏渲染速度和滚动帧率都不会受到明显影响。这是传统列表渲染方式无法做到的。","数据量越大，虚拟列表相对于全量渲染的性能优势越明显。"],u=[];for(let s=0;s<3e5;s++){const c=s%4+1,d=[];for(let m=0;m<c;m++)d.push(l[(s+m*2)%l.length]);u.push({id:s,index:s,text:d.join(" ")})}r.remove(),i.textContent=`已生成 ${u.length.toLocaleString()} 条数据`,o=new A(e,{list:u,itemKey:"id",itemPreSize:40,buffer:5,renderItem:s=>{const c=document.createElement("div");return c.className="demo-row-item",c.innerHTML=`
              <span class="demo-row-index">#${s.index}</span>
              <span class="demo-row-text">${s.text}</span>
            `,c}},{rangeUpdate:(s,c)=>{n.textContent=`总数: ${u.length.toLocaleString()} | RenderBegin: ${s} | RenderEnd: ${c}`}}),n.textContent=`总数: ${u.length.toLocaleString()}`},50)}),()=>{o&&o.destroy(),a.innerHTML=""}}function kl(a){return Array.from({length:a},(e,n)=>({id:n,index:n,text:`固定高度行 ${n}，每行高度一致（40px）。`}))}const Sl=`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;function El(a){a.innerHTML=Sl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=kl(1e3),i=new A(e,{list:t,itemKey:"id",itemPreSize:40,fixed:!0,buffer:2,renderItem:r=>{const o=document.createElement("div");return o.className="demo-row-item",o.style.height="40px",o.style.lineHeight="40px",o.innerHTML=`
          <span class="demo-row-index">#${r.index}</span>
          <span class="demo-row-text">${r.text}</span>
        `,o}},{rangeUpdate:(r,o)=>{n.textContent=`总数: ${t.length} | RenderBegin: ${r} | RenderEnd: ${o}`}});return n.textContent=`总数: ${t.length} | 固定高度: 40px`,()=>{i.destroy(),a.innerHTML=""}}const ke=[60,80,100,110,130];function Al(a){return Array.from({length:a},(e,n)=>({id:n,width:ke[Math.floor(Math.random()*ke.length)]}))}const Dl=`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-horizontal-container" id="listContainer"></div>
  </div>
`;function Bl(a){a.innerHTML=Dl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=Al(1e3),i=new A(e,{list:t,itemKey:"id",itemPreSize:60,horizontal:!0,buffer:2,renderItem:r=>{const o=document.createElement("div");return o.className="demo-col-item",o.style.minWidth=`${r.width}px`,o.style.width=`${r.width}px`,o.innerHTML=`
          <div style="font-weight:bold;">${r.id}</div>
          <div style="font-size:11px;color:#999;">w:${r.width}</div>
        `,o}},{rangeUpdate:(r,o)=>{n.textContent=`总数: ${t.length} | RenderBegin: ${r} | RenderEnd: ${o}`}});return n.textContent=`总数: ${t.length} | 水平滚动`,()=>{i.destroy(),a.innerHTML=""}}const Se=["插槽示例展示了 stickyHeader、header、footer、stickyFooter 四种插槽的使用方法。","短行。","Sticky 插槽会固定在滚动容器的顶部或底部，不会随内容一起滚动。这在需要展示固定表头或固定操作栏的场景中非常实用。","普通 header 和 footer 会随列表内容一起滚动。","每一行的高度各不相同，这是因为文本内容的长度不同导致自然换行。虚拟列表会在渲染后准确测量每个元素的尺寸，从而保证滚动行为的正确性。"];function wl(a){return Array.from({length:a},(e,n)=>{const t=n%4+1,i=[];for(let r=0;r<t;r++)i.push(Se[(n+r*2)%Se.length]);return{id:n,index:n,text:i.join(" ")}})}function J(a,e){const n=document.createElement("div");return n.textContent=a,Object.assign(n.style,{display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",fontSize:"14px",color:"#fff"}),e&&Object.assign(n.style,e),n}const Tl=`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;function Ml(a){a.innerHTML=Tl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=wl(1e3),i=new A(e,{list:t,itemKey:"id",itemPreSize:40,buffer:2,stickyHeaderStyle:"background:#2e8b57;height:50px;",renderStickyHeader:()=>J("Sticky Header（固定头部）"),renderHeader:()=>J("Header（头部）",{background:"#3cb371",height:"40px"}),renderFooter:()=>J("Footer（尾部）",{background:"#20b2aa",height:"40px"}),stickyFooterStyle:"background:#008b8b;height:50px;",renderStickyFooter:()=>J("Sticky Footer（固定底部）"),renderItem:r=>{const o=document.createElement("div");return o.className="demo-row-item",o.innerHTML=`
          <span class="demo-row-index">#${r.index}</span>
          <span class="demo-row-text">${r.text}</span>
        `,o}},{rangeUpdate:(r,o)=>{n.textContent=`总数: ${t.length} | RenderBegin: ${r} | RenderEnd: ${o}`}});return n.textContent=`总数: ${t.length} | 含 Sticky/Header/Footer 插槽`,()=>{i.destroy(),a.innerHTML=""}}const Ee=["使用 scrollToIndex 可以精确跳转到指定索引的位置。","使用 scrollToOffset 可以跳转到指定的像素偏移量。","这行内容较短。","scrollIntoView 会将目标元素滚动到可视区域内，如果已经在可视区域则不会滚动。这个 API 在需要确保某个元素可见时非常有用。","滚动到顶部和底部是最常见的操作。","虚拟列表支持多种滚动定位方式，可以根据不同的业务场景选择最合适的 API。所有的滚动操作都是平滑的，不会出现跳动或闪烁。"];function Ll(a){return Array.from({length:a},(e,n)=>{const t=n%4+1,i=[];for(let r=0;r<t;r++)i.push(Ee[(n+r*2)%Ee.length]);return{id:n,index:n,text:i.join(" ")}})}const xl=`
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
`;function Nl(a){a.innerHTML=xl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=Ll(2e3),i=new A(e,{list:t,itemKey:"id",itemPreSize:40,renderItem:l=>{const u=document.createElement("div");return u.className="demo-row-item",u.innerHTML=`
          <span class="demo-row-index">#${l.index}</span>
          <span class="demo-row-text">${l.text}</span>
        `,u}},{rangeUpdate:(l,u)=>{n.textContent=`总数: ${t.length} | RenderBegin: ${l} | RenderEnd: ${u}`}}),r=l=>parseInt(a.querySelector(`#${l}`).value,10),o=(l,u)=>{a.querySelector(`#${l}`).value=String(u)};return a.querySelector("#btnOffset").addEventListener("click",()=>{i.scrollToOffset(r("offsetInput"))}),a.querySelector("#btnIndex").addEventListener("click",()=>{i.scrollToIndex(r("indexInput"))}),a.querySelector("#btnIntoView").addEventListener("click",()=>{i.scrollIntoView(r("intoViewInput"))}),a.querySelector("#btnPrev").addEventListener("click",()=>{const l=r("intoViewInput"),u=Math.max(0,l-1);o("intoViewInput",u),i.scrollIntoView(u)}),a.querySelector("#btnNext").addEventListener("click",()=>{const l=r("intoViewInput"),u=Math.min(t.length-1,l+1);o("intoViewInput",u),i.scrollIntoView(u)}),a.querySelector("#btnTop").addEventListener("click",()=>{i.scrollToTop()}),a.querySelector("#btnBottom").addEventListener("click",()=>{i.scrollToBottom()}),n.textContent=`总数: ${t.length}`,()=>{i.destroy(),a.innerHTML=""}}const Ae=["拖拽容器右下角可以调整大小，虚拟列表会自动适应新的容器尺寸。","容器变大时会渲染更多的行。","这种自适应能力依赖于 ResizeObserver 对容器尺寸变化的监听。当容器的可视区域发生变化时，虚拟列表会重新计算需要渲染的元素数量，并更新视图。","短行。","无论容器是变大还是变小，滚动位置和列表状态都会被正确保留。这意味着用户在调整窗口大小时不会丢失当前的浏览位置。","每一行的高度都不同，体现了动态高度的特性。"];function Rl(a){return Array.from({length:a},(e,n)=>{const t=n%5+1,i=[];for(let r=0;r<t;r++)i.push(Ae[(n+r*2)%Ae.length]);return{id:n,index:n,text:i.join(" ")}})}const Pl=`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-resize-container" id="listContainer"></div>
  </div>
`;function Hl(a){a.innerHTML=Pl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=Rl(2e3),i=new A(e,{list:t,itemKey:"id",itemPreSize:40,buffer:2,renderItem:r=>{const o=document.createElement("div");return o.className="demo-row-item",o.innerHTML=`
          <span class="demo-row-index">#${r.index}</span>
          <span class="demo-row-text">${r.text}</span>
        `,o}},{rangeUpdate:(r,o)=>{n.textContent=`总数: ${t.length} | RenderBegin: ${r} | RenderEnd: ${o}`}});return n.textContent=`总数: ${t.length} | 拖拽容器边框调整大小`,()=>{i.destroy(),a.innerHTML=""}}function Il(a){const e=["短文本。","这是一段中等长度的文本内容，用来展示可变高度的虚拟列表项。","这是一段比较长的文本内容，用来展示可变高度的虚拟列表项。每一行的高度都不同，虚拟列表需要动态计算每个元素的实际高度，以确保滚动位置的准确性。这是虚拟列表最核心的功能之一。","极短","这段文本的长度适中。它既不太短也不太长，但足以让虚拟列表检测到与其他行不同的高度。动态高度列表相比固定高度列表需要更多的计算，但它提供了更灵活的内容展示方式。可以在这里输入任意内容来改变行高。"];return Array.from({length:a},(n,t)=>({id:t,index:t,text:e[t%e.length]}))}const Gl=`
  <div class="demo-panel">
    <div style="margin-bottom:8px;font-size:12px;color:#888;">提示：点击内容区域可以直接编辑文本，行高会自动适应。</div>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;function _l(a){a.innerHTML=Gl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=Il(200),i=new A(e,{list:t,itemKey:"id",itemPreSize:20,buffer:5,renderItem:r=>{const o=document.createElement("div");o.className="demo-row-item demo-dynamic-row";const l=document.createElement("span");l.className="demo-row-index",l.textContent=`#${r.index}`;const u=document.createElement("div");return u.className="demo-editable",u.contentEditable="true",u.textContent=r.text,u.addEventListener("input",()=>{r.text=u.textContent||""}),o.appendChild(l),o.appendChild(u),o}},{rangeUpdate:(r,o)=>{n.textContent=`总数: ${t.length} | RenderBegin: ${r} | RenderEnd: ${o}`}});return n.textContent=`总数: ${t.length} | 可变高度 + 可编辑`,()=>{i.destroy(),a.innerHTML=""}}let Wl=0;const De=["滚动到底部会自动触发加载更多数据。","新数据加载完成后会追加到列表末尾。","加载过程中 footer 区域会显示加载提示，防止重复触发。数据加载完成后，虚拟列表会自动更新渲染范围，新增的行会无缝衔接到现有内容之后。","短行。","无限加载模式适用于数据量不确定的场景，比如社交媒体的信息流、搜索结果列表等。每次加载一页数据，用户可以一直向下滚动浏览。"];function Kl(a,e=0,n=0){const t=Array.from({length:a},(i,r)=>{const o=e+r,l=o%4+1,u=[];for(let s=0;s<l;s++)u.push(De[(o+s*2)%De.length]);return{id:Wl++,index:o,text:u.join(" ")}});return n<=0?Promise.resolve(t):new Promise(i=>setTimeout(()=>i(t),n))}const $l=`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;function Ol(a){a.innerHTML=$l;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats");let t=[],i=!1,r=null;function o(u,s){n.textContent=`总数: ${t.length} | RenderBegin: ${u??"-"} | RenderEnd: ${s??"-"}${i?" | 加载中...":""}`}async function l(){if(i)return;i=!0,o();const u=await Kl(200,t.length,1e3);t=t.concat(u),i=!1,r?(r.setList(t),r.forceUpdate()):r=new A(e,{list:t,itemKey:"id",itemPreSize:40,buffer:2,renderFooter:()=>{const s=document.createElement("div");return s.className="demo-loading-bar",s.id="loadingBar",s.textContent="加载中...",s},renderItem:s=>{const c=document.createElement("div");return c.className="demo-row-item",c.innerHTML=`
              <span class="demo-row-index">#${s.index}</span>
              <span class="demo-row-text">${s.text}</span>
            `,c}},{toBottom:()=>l(),rangeUpdate:(s,c)=>o(s,c)}),o()}return l(),()=>{r&&r.destroy(),a.innerHTML=""}}const Be=40;let Xe=0;const Y=["好的，收到！","这个方案看起来不错，我觉得可以按这个方向继续推进。","你有空的时候帮我看一下那个 bug 吗？就是用户反馈的列表滚动卡顿问题。","明天的会议改到下午三点了，记得提前准备一下演示材料。","我刚刚测试了一下新版本的虚拟列表组件，在十万条数据的情况下滚动依然非常流畅，完全没有掉帧的情况。之前用全量渲染的方案在五千条数据时就开始卡顿了，这次的优化效果非常明显！","👍","关于上次讨论的技术选型问题，我整理了一份对比文档，包括性能测试数据、社区活跃度、学习成本等方面的分析。总体来看，新方案在各方面都有优势。等你有空了我们再详细讨论一下具体的迁移计划。","周末愉快！"];function Qe(a,e){const n=(a-1)*e;return Array.from({length:e},(t,i)=>{const r=n+i;return{id:Xe++,index:r,text:Y[r%Y.length]}})}function zl(a,e){return new Promise(n=>setTimeout(()=>n(Qe(a,e)),800))}const Jl=`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" id="sendBtn">发送随机消息</button>
    </div>
  </div>
`;function Vl(a){a.innerHTML=Jl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats");let t=5,i=Qe(t,Be),r=!1,o=!0;const l=new A(e,{list:i,itemKey:"id",itemPreSize:60,renderHeader:()=>{const c=document.createElement("div");return c.className="demo-loading-bar",c.id="chatLoadingBar",c.textContent=t>1?"加载中...":"没有更早的消息了",c},renderItem:c=>{const d=document.createElement("div");return d.className="demo-chat-message",d.innerHTML=`
          <div class="demo-chat-bubble">
            <div style="font-weight:bold;margin-bottom:2px;">消息 #${c.index}</div>
            <div>${c.text}</div>
          </div>
        `,d}},{toTop:async()=>{if(r||t<=1)return;r=!0,n.textContent+=" | 加载中...";const c=await zl(t-1,Be);t--,i=c.concat(i),l.addedList2Top(c),l.setList(i),l.forceUpdate(),r=!1,u()},itemResize:()=>{o&&(o=!1,l.scrollToBottom())},rangeUpdate:(c,d)=>{u(c,d)}});function u(c,d){n.textContent=`总数: ${i.length} | Page: ${t} | RenderBegin: ${c??"-"} | RenderEnd: ${d??"-"}`}return u(),a.querySelector("#sendBtn").addEventListener("click",()=>{const c=Y[Math.floor(Math.random()*Y.length)],d={id:Xe++,index:i.length,text:c};i.push(d),l.setList([...i]),l.forceUpdate(),requestAnimationFrame(()=>{l.scrollToBottom()}),u()}),()=>{l.destroy(),a.innerHTML=""}}const D=[{key:"id",title:"ID",width:60},{key:"name",title:"姓名",width:100},{key:"age",title:"年龄",width:60},{key:"address",title:"地址",width:200},{key:"desc1",title:"描述1",width:300},{key:"desc2",title:"描述2",width:300},{key:"desc3",title:"描述3",width:300}];function jl(a){const e=["北京市朝阳区","上海市浦东新区","广州市天河区","深圳市南山区","杭州市西湖区"];return Array.from({length:a},(n,t)=>({id:t,name:`用户_${t}`,age:20+t%40,address:e[t%e.length],desc1:`描述信息 ${t}-A`,desc2:`描述信息 ${t}-B`,desc3:`描述信息 ${t}-C`,rowSpan:t<2?2:1}))}function _(a,e,n){const t=document.createElement("div");return t.className="demo-adv-cell",t.style.width=`${e}px`,t.style.minWidth=`${e}px`,t.textContent=a,n&&Object.assign(t.style,n),t}const Yl=`
  <div class="demo-panel">
    <p style="font-size:12px;color:#888;margin-bottom:8px;">
      高阶用法：展示类似表格的渲染，包含 sticky 列头和多列数据。前两行进行了合并展示。
    </p>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;function ql(a){a.innerHTML=Yl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=jl(100),i=new A(e,{list:t,itemKey:"id",itemPreSize:40,stickyHeaderStyle:"background:#f5f5f5;",renderStickyHeader:()=>{const r=document.createElement("div");r.className="demo-table-row demo-table-header",r.style.minWidth="min-content";for(const o of D)r.appendChild(_(o.title,o.width,{fontWeight:"bold",background:"#e8e8e8"}));return r},renderItem:(r,o)=>{const l=document.createElement("div");if(l.className="demo-table-row",l.style.minWidth="min-content",o===0){const u=_(`合并行 (ID: ${r.id} & ${r.id+1})`,D[0].width+D[1].width,{minWidth:`${D[0].width+D[1].width}px`,background:"#fffbe6",fontWeight:"bold"});l.appendChild(u);for(let s=2;s<D.length;s++)l.appendChild(_(String(r[D[s].key]),D[s].width))}else if(o===1){const u=_(`(续) ID: ${r.id}`,D[0].width+D[1].width,{minWidth:`${D[0].width+D[1].width}px`,background:"#fffbe6"});l.appendChild(u);for(let s=2;s<D.length;s++)l.appendChild(_(String(r[D[s].key]),D[s].width))}else for(const u of D)l.appendChild(_(String(r[u.key]),u.width));return l}},{rangeUpdate:(r,o)=>{n.textContent=`总数: ${t.length} | RenderBegin: ${r} | RenderEnd: ${o}`}});return n.textContent=`总数: ${t.length} | 高阶表格`,()=>{i.destroy(),a.innerHTML=""}}const K=20,Q=10;let Ul=0;const we=["短消息。","这是一条普通长度的分页消息，展示双向分页加载的效果。","向上滚动会加载更早的数据，向下滚动会加载更新的数据。同时，离开可视区域较远的数据会被移除，以控制内存中的数据量。","分页已加载。","双向分页模式适用于消息列表、日志浏览等场景。用户可以在时间线上自由导航，而不需要一次性加载所有数据。这种模式通过 addedList2Top 和 deletedList2Top 两个 API 来实现数据的动态增删，同时保持滚动位置的稳定。","翻到顶部或底部都可以触发新一页的加载。"];function te(a){const e=(a-1)*K;return Array.from({length:K},(n,t)=>{const i=e+t;return{id:Ul++,index:i,text:we[i%we.length]}})}function Te(a){return new Promise(e=>setTimeout(()=>e(te(a)),1e3))}const Zl=`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;function Xl(a){a.innerHTML=Zl;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats");let t=Q,i=[...te(t-1),...te(t)],r=!1,o=!1,l=!0;const u=new A(e,{list:i,itemKey:"id",itemPreSize:60,buffer:2,renderHeader:()=>{const c=document.createElement("div");return c.className="demo-loading-bar",c.textContent=t>2?"上拉加载...":"没有更早的数据了",c},renderFooter:()=>{const c=document.createElement("div");return c.className="demo-loading-bar",c.textContent=t<Q?"下拉加载...":"没有更新的数据了",c},renderItem:c=>{const d=document.createElement("div");return d.className="demo-chat-message",d.innerHTML=`
          <div class="demo-chat-bubble">
            <div style="font-weight:bold;margin-bottom:2px;">消息 #${c.index}</div>
            <div>${c.text}</div>
          </div>
        `,d}},{toTop:async()=>{if(r||t<=2)return;r=!0,s();const c=await Te(t-2);t--;const d=i.splice(i.length-K,K);u.deletedList2Top(d),i=c.concat(i),u.addedList2Top(c),u.setList(i),u.forceUpdate(),r=!1,s()},toBottom:async()=>{if(o||t>=Q)return;o=!0,s();const c=await Te(t+1);t++;const d=i.splice(0,K);u.deletedList2Top(d),i=i.concat(c),u.setList(i),u.forceUpdate(),o=!1,s()},itemResize:()=>{l&&(l=!1,u.scrollToBottom())},rangeUpdate:(c,d)=>s(c,d)});function s(c,d){const m=r||o?" | 加载中...":"";n.textContent=`总数: ${i.length} | Page: ${t} | RenderBegin: ${c??"-"} | RenderEnd: ${d??"-"}${m}`}return s(),()=>{u.destroy(),a.innerHTML=""}}function Me(a){const e=["工程部","设计部","产品部","市场部","运营部"];return Array.from({length:a},(n,t)=>({id:t,name:`用户_${t}`,email:`user${t}@example.com`,department:e[t%e.length],joinDate:new Date(2020,t%12,t%28+1).toLocaleDateString()}))}function Le(a){const e=["电子产品","家居用品","食品饮料","运动户外","图书文具"];return Array.from({length:a},(n,t)=>({id:t,name:`商品_${t}`,description:`这是商品 ${t} 的描述信息`,price:(Math.random()*1e3).toFixed(2),category:e[t%e.length],stock:Math.floor(Math.random()*500)}))}function Ql(a){const e=document.createElement("div");return e.className="demo-ka-card",e.innerHTML=`
    <div class="demo-ka-avatar">${a.name.charAt(0)}</div>
    <div class="demo-ka-info">
      <div style="font-weight:bold;">${a.name}</div>
      <div style="font-size:11px;color:#888;">${a.email} | ${a.department}</div>
      <div style="font-size:11px;color:#aaa;">入职: ${a.joinDate}</div>
    </div>
  `,e}function es(a){const e=document.createElement("div");return e.className="demo-ka-card",e.innerHTML=`
    <div class="demo-ka-avatar" style="background:#f0ad4e;">${a.name.charAt(0)}</div>
    <div class="demo-ka-info">
      <div style="font-weight:bold;">${a.name} <span style="color:#e74c3c;font-size:12px;">¥${a.price}</span></div>
      <div style="font-size:11px;color:#888;">${a.category} | 库存: ${a.stock}</div>
      <div style="font-size:11px;color:#aaa;">${a.description}</div>
    </div>
  `,e}const as=`
  <div class="demo-panel">
    <div class="demo-ka-tabs">
      <button class="demo-ka-tab is-active" data-tab="users">用户列表</button>
      <button class="demo-ka-tab" data-tab="products">商品列表</button>
    </div>
    <div class="demo-ka-toolbar" id="toolbar"></div>
    <div class="demo-list-container" id="listContainer" style="height:500px;"></div>
  </div>
`;function ns(a){a.innerHTML=as;const e=a.querySelector("#listContainer"),n=a.querySelector("#toolbar"),t=a.querySelectorAll(".demo-ka-tab");let i=Me(2e3),r=Le(2e3),o="users",l=0,u=0,s=null;function c(d){if(s){const m=s.clientEl?.scrollTop??0;o==="users"?l=m:u=m,s.destroy(),s=null}o=d,t.forEach(m=>m.classList.toggle("is-active",m.dataset.tab===d)),d==="users"?(n.innerHTML=`
        <button class="virt-list-btn virt-list-btn-primary" id="btnAddUser">添加5个用户</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearUser">清空列表</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnTopUser">回到顶部</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnBottomUser">滚动到底部</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">总数: ${i.length}</span>
      `,s=new A(e,{list:i,itemKey:"id",itemPreSize:70,buffer:5,renderItem:m=>Ql(m)}),l>0&&s.scrollToOffset(l),n.querySelector("#btnAddUser").addEventListener("click",()=>{const m=Me(5).map((g,h)=>({...g,id:i.length+h,name:`新用户_${i.length+h}`}));i=i.concat(m),s.setList(i),s.forceUpdate(),n.querySelector("span").textContent=`总数: ${i.length}`}),n.querySelector("#btnClearUser").addEventListener("click",()=>{i=[],s.setList(i),s.forceUpdate(),n.querySelector("span").textContent="总数: 0"}),n.querySelector("#btnTopUser").addEventListener("click",()=>{s.scrollToTop()}),n.querySelector("#btnBottomUser").addEventListener("click",()=>{s.scrollToBottom()})):(n.innerHTML=`
        <button class="virt-list-btn virt-list-btn-primary" id="btnAddProd">添加5个商品</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearProd">清空列表</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnTopProd">回到顶部</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnBottomProd">滚动到底部</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">总数: ${r.length}</span>
      `,s=new A(e,{list:r,itemKey:"id",itemPreSize:70,buffer:5,renderItem:m=>es(m)}),u>0&&s.scrollToOffset(u),n.querySelector("#btnAddProd").addEventListener("click",()=>{const m=Le(5).map((g,h)=>({...g,id:r.length+h,name:`新商品_${r.length+h}`}));r=r.concat(m),s.setList(r),s.forceUpdate(),n.querySelector("span").textContent=`总数: ${r.length}`}),n.querySelector("#btnClearProd").addEventListener("click",()=>{r=[],s.setList(r),s.forceUpdate(),n.querySelector("span").textContent="总数: 0"}),n.querySelector("#btnTopProd").addEventListener("click",()=>{s.scrollToTop()}),n.querySelector("#btnBottomProd").addEventListener("click",()=>{s.scrollToBottom()}))}return t.forEach(d=>{d.addEventListener("click",()=>c(d.dataset.tab))}),c("users"),()=>{s&&s.destroy(),a.innerHTML=""}}function ts(a){return Array.from({length:a},(e,n)=>({id:n,name:`用户_${n}`,desc1:`这是用户 ${n} 的详细描述信息，可能是一段较长的文本`,desc2:`补充说明 ${n}，包含更多关于该用户的信息`,action:"操作"}))}function L(a,e){const n=document.createElement("div");return n.className="demo-table-cell",n.textContent=a,e&&Object.assign(n.style,e),n}const rs=`
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;function is(a){a.innerHTML=rs;const e=a.querySelector("#listContainer"),n=a.querySelector("#stats"),t=ts(1e3),i={position:"sticky",left:"0",zIndex:"1",background:"#fff"},r={position:"sticky",right:"0",zIndex:"1",background:"#fff"},o=new A(e,{list:t,itemKey:"id",itemPreSize:40,stickyHeaderStyle:"background:#f0f0f0;",renderStickyHeader:()=>{const l=document.createElement("div");return l.className="demo-table-row demo-table-header",l.appendChild(L("ID",{...i,width:"80px",minWidth:"80px",background:"#e0e0e0"})),l.appendChild(L("名称",{width:"120px",minWidth:"120px"})),l.appendChild(L("描述1",{width:"600px",minWidth:"600px"})),l.appendChild(L("描述2",{width:"600px",minWidth:"600px"})),l.appendChild(L("操作",{...r,width:"80px",minWidth:"80px",background:"#e0e0e0"})),l},renderItem:l=>{const u=document.createElement("div");u.className="demo-table-row",u.appendChild(L(String(l.id),{...i,width:"80px",minWidth:"80px"})),u.appendChild(L(l.name,{width:"120px",minWidth:"120px"})),u.appendChild(L(l.desc1,{width:"600px",minWidth:"600px"})),u.appendChild(L(l.desc2,{width:"600px",minWidth:"600px"}));const s=L("",{...r,width:"80px",minWidth:"80px"}),c=document.createElement("button");return c.className="virt-list-btn virt-list-btn-primary",c.style.fontSize="10px",c.style.padding="2px 8px",c.textContent="详情",s.appendChild(c),u.appendChild(s),u}},{rangeUpdate:(l,u)=>{n.textContent=`总数: ${t.length} | RenderBegin: ${l} | RenderEnd: ${u}`}});return n.textContent=`总数: ${t.length} | 表格模式（水平滚动 + sticky 列）`,()=>{o.destroy(),a.innerHTML=""}}function os(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`}))}))}))}const ls=`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function ss(a){a.innerHTML=ls;const e=a.querySelector("#treeContainer"),n=new B(e,{list:os(),fieldNames:{key:"id"},indent:20,expandOnClickNode:!0,renderEmpty:()=>{const t=document.createElement("div");return t.style.padding="16px",t.textContent="暂无数据",t}});return()=>{n.destroy(),a.innerHTML=""}}function us(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`,disableCheckbox:r%2===0,children:r%2!==0?[]:Array.from({length:2},(o,l)=>({id:`${e}-${t}-${r}-${l}`,title:`Node-${e}-${t}-${r}-${l}`}))}))}))}))}const cs=`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="virt-list-btn virt-list-btn-primary" id="btnCollapseAll">折叠所有</button>
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearCheck">清空 check</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnCheckAll">check 所有</button>
      </div>
      <div class="input-container" style="margin-top:8px;">
        <label>操作指定节点：</label>
        <input id="nodeKeyInput" value="0" style="width:80px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandNode">展开</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseNode">折叠</button>
      </div>
    </div>
    <div id="checkedDisplay" class="status-text" style="margin:8px 0;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function ds(a){a.innerHTML=cs;const e=a.querySelector("#treeContainer"),n=a.querySelector("#checkedDisplay"),t=[],i=l=>{n.textContent=`checkedKeys: [${l.join(", ")}]`},r=new B(e,{list:us(),fieldNames:{key:"id"},indent:20,checkable:!0,checkOnClickNode:!0,defaultExpandAll:!0,checkedKeys:["0"],renderEmpty:()=>{const l=document.createElement("div");return l.style.padding="16px",l.textContent="暂无数据",l}},{check:(l,u)=>{i(l),console.warn("check",u)}});i(["0"]);const o=(l,u)=>{const s=a.querySelector(`#${l}`);s.addEventListener("click",u),t.push(()=>s.removeEventListener("click",u))};return o("btnCollapseAll",()=>r.expandAll(!1)),o("btnExpandAll",()=>r.expandAll(!0)),o("btnClearCheck",()=>{r.checkAll(!1),i([])}),o("btnCheckAll",()=>{r.checkAll(!0),i(r.getCheckedKeys())}),o("btnExpandNode",()=>{const l=a.querySelector("#nodeKeyInput").value;r.expandNode(l,!0)}),o("btnCollapseNode",()=>{const l=a.querySelector("#nodeKeyInput").value;r.expandNode(l,!1)}),()=>{r.destroy(),t.forEach(l=>l()),a.innerHTML=""}}function hs(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`,children:r%2!==0?[]:Array.from({length:2},(o,l)=>({id:`${e}-${t}-${r}-${l}`,title:`Node-${e}-${t}-${r}-${l}`}))}))}))}))}const ms=`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div class="input-container">
        <label>操作指定节点：</label>
        <input id="nodeKeyInput" value="0-0" style="width:80px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandNode">展开</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseNode">折叠</button>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="virt-list-btn virt-list-btn-primary" id="btnCollapseAll">折叠所有</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
      </div>
    </div>
    <div id="expandedDisplay" class="status-text" style="margin:8px 0;height:40px;overflow:auto;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function ps(a){a.innerHTML=ms;const e=a.querySelector("#treeContainer"),n=a.querySelector("#expandedDisplay"),t=[],i=l=>{n.textContent=`expandedKeys: [${l.join(", ")}]`},r=new B(e,{list:hs(),fieldNames:{key:"id"},expandedKeys:["0-0"],renderEmpty:()=>{const l=document.createElement("div");return l.style.padding="16px",l.textContent="暂无数据",l}},{expand:(l,u)=>{i(l),console.warn("onExpand",u)}});i(["0-0"]);const o=(l,u)=>{const s=a.querySelector(`#${l}`);s.addEventListener("click",u),t.push(()=>s.removeEventListener("click",u))};return o("btnExpandNode",()=>{const l=a.querySelector("#nodeKeyInput").value;r.expandNode(l,!0)}),o("btnCollapseNode",()=>{const l=a.querySelector("#nodeKeyInput").value;r.expandNode(l,!1)}),o("btnCollapseAll",()=>r.expandAll(!1)),o("btnExpandAll",()=>r.expandAll(!0)),()=>{r.destroy(),t.forEach(l=>l()),a.innerHTML=""}}function Fs(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`}))}))}))}const ys=`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div class="input-container">
        <input id="filterInput" value="Node-0" style="width:160px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <button class="virt-list-btn virt-list-btn-primary" id="btnFilter">filter</button>
      </div>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function gs(a){a.innerHTML=ys;const e=a.querySelector("#treeContainer"),n=[],t=new B(e,{list:Fs(),fieldNames:{key:"id"},indent:20,filterMethod:(r,o)=>o.title.includes(r),renderEmpty:()=>{const r=document.createElement("div");return r.style.padding="16px",r.textContent="暂无数据",r}});return((r,o)=>{const l=a.querySelector(`#${r}`);l.addEventListener("click",o),n.push(()=>l.removeEventListener("click",o))})("btnFilter",()=>{const r=a.querySelector("#filterInput").value;t.filter(r)}),()=>{t.destroy(),n.forEach(r=>r()),a.innerHTML=""}}function bs(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,disableSelect:e===1,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`}))}))}))}const fs=`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="virt-list-btn virt-list-btn-primary" id="btnSelectAll">全选</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnClearSelect">清空选择</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseAll">折叠所有</button>
      </div>
    </div>
    <div id="selectedDisplay" class="status-text" style="margin:8px 0;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function vs(a){a.innerHTML=fs;const e=a.querySelector("#treeContainer"),n=a.querySelector("#selectedDisplay"),t=[],i=l=>{n.textContent=`selectedKeys: [${l.join(", ")}]`},r=new B(e,{list:bs(),fieldNames:{key:"id"},indent:20,selectable:!0,selectMultiple:!0,defaultExpandAll:!0,selectedKeys:["0"],renderEmpty:()=>{const l=document.createElement("div");return l.style.padding="16px",l.textContent="暂无数据",l}},{select:(l,u)=>{i(l),console.log("onSelect",l,u)}});i(["0"]);const o=(l,u)=>{const s=a.querySelector(`#${l}`);s.addEventListener("click",u),t.push(()=>s.removeEventListener("click",u))};return o("btnSelectAll",()=>{r.selectAll(!0),i(["(all)"])}),o("btnClearSelect",()=>{r.selectAll(!1),i([])}),o("btnExpandAll",()=>r.expandAll(!0)),o("btnCollapseAll",()=>r.expandAll(!1)),()=>{r.destroy(),t.forEach(l=>l()),a.innerHTML=""}}function Cs(){const a=Array.from({length:40},(e,n)=>({id:String(n),title:`Node-${n}`,children:Array.from({length:3},(t,i)=>({id:`${n}-${i}`,title:`Node-${n}-${i}`,children:Array.from({length:2},(r,o)=>({id:`${n}-${i}-${o}`,title:`Node-${n}-${i}-${o}`}))}))}));return a[0].children[0].title="abvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagac",a}const ks=`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <button class="virt-list-btn virt-list-btn-primary" id="btnToggleLine">切换连接线</button>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function Ss(a){a.innerHTML=ks;const e=a.querySelector("#treeContainer"),n=[];let t=!0,i=r(e,t);function r(l,u){return l.innerHTML="",new B(l,{list:Cs(),fieldNames:{key:"id"},indent:28,iconSize:14,showLine:u,defaultExpandAll:!0,itemGap:4,fixed:!0,renderEmpty:()=>{const s=document.createElement("div");return s.style.padding="16px",s.textContent="暂无数据",s}})}return((l,u)=>{const s=a.querySelector(`#${l}`);s.addEventListener("click",u),n.push(()=>s.removeEventListener("click",u))})("btnToggleLine",()=>{t=!t,i.destroy(),i=r(e,t),a.querySelector("#btnToggleLine").textContent=t?"隐藏连接线":"显示连接线"}),()=>{i.destroy(),n.forEach(l=>l()),a.innerHTML=""}}function Es(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,name:`Name-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,name:`Name-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`,name:`Name-${e}-${t}-${r}`}))}))}))}const As=`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function Ds(a){a.innerHTML=As;const e=a.querySelector("#treeContainer"),n=new B(e,{list:Es(),fieldNames:{key:"id"},indent:20,renderContent:t=>{const i=document.createElement("div");return i.innerHTML=`<span>level: ${t.level}; </span><span>title: ${t.data.name}</span>`,i},renderEmpty:()=>{const t=document.createElement("div");return t.style.padding="16px",t.textContent="暂无数据",t}});return()=>{n.destroy(),a.innerHTML=""}}function Bs(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`}))}))}))}function ea(a,e){for(let n=0;n<a.length;n++){if(a[n].id===e.data.id)return a.splice(n,1),!0;if(a[n].children&&ea(a[n].children,e))return!0}return!1}function ws(a,e,n,t){const i=e.data;if(t){t.data.children||(t.data.children=[]);const r=t.data.children;if(n){const o=r.findIndex(l=>l.id===n.data.id);r.splice(o+1,0,i)}else r.unshift(i)}else if(n){const r=a.findIndex(o=>o.id===n.data.id);a.splice(r+1,0,i)}else a.unshift(i)}const Ts=`
  <div class="tree-demo">
    <div id="status" class="status-text" style="margin-bottom:8px;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function Ms(a){a.innerHTML=Ts;const e=a.querySelector("#treeContainer"),n=a.querySelector("#status");let t=Bs(),i=new B(e,{list:t,fieldNames:{key:"id"},indent:20,draggable:!0,expandOnClickNode:!0,renderContent:r=>{const o=document.createElement("div");o.style.display="flex",o.style.alignItems="center",o.style.gap="4px";const l=document.createElement("span");l.textContent=r.isLeaf?"📄":"📁";const u=document.createElement("span");return u.textContent=r.title??"",o.appendChild(l),o.appendChild(u),o},renderEmpty:()=>{const r=document.createElement("div");return r.style.padding="16px",r.textContent="暂无数据",r}},{dragstart:r=>{n.textContent=`开始拖拽: ${r.sourceNode.title??r.sourceNode.data?.id}`},dragend:r=>{if(!r){n.textContent="拖拽取消";return}ea(t,r.node),ws(t,r.node,r.prevNode,r.parentNode),i.setList([...t]),n.textContent=`拖拽完成: ${r.node.title??r.node.data?.id}`}});return n.textContent="拖拽树示例已就绪（支持跨层级拖拽）",()=>{i.destroy(),a.innerHTML=""}}function Ls(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`}))}))}))}const xs=`
  <div class="tree-demo">
    <div id="focusedDisplay" class="status-text" style="margin-bottom:8px;"></div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function Ns(a){a.innerHTML=xs;const e=a.querySelector("#treeContainer"),n=a.querySelector("#focusedDisplay"),t=r=>{n.textContent=`focusedKeys: [${r.map(String).join(", ")}]`},i={current:null};return i.current=new B(e,{list:Ls(),fieldNames:{key:"id"},indent:20,selectable:!0,defaultExpandAll:!0,focusedKeys:[],renderContent:r=>{const o=document.createElement("div");o.style.display="flex",o.style.justifyContent="space-between",o.style.alignItems="center",o.style.width="100%";const l=document.createElement("span");l.textContent=`level: ${r.level}; ${r.title??""}`;const u=document.createElement("button");return u.type="button",u.className="virt-list-btn virt-list-btn-secondary",u.textContent="...",u.style.display="none",u.addEventListener("click",s=>{s.stopPropagation(),i.current?.setFocusedKeys([r.key]),t([r.key])}),o.addEventListener("mouseenter",()=>{u.style.display=""}),o.addEventListener("mouseleave",()=>{u.style.display="none"}),o.appendChild(l),o.appendChild(u),o},renderEmpty:()=>{const r=document.createElement("div");return r.style.padding="16px",r.textContent="暂无数据",r}}),t([]),()=>{i.current?.destroy(),a.innerHTML=""}}function Rs(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`}))}))}))}const Ps=`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div class="input-container" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;">
        <label>目标 key：</label>
        <input id="scrollKeyInput" value="5-1-0" style="width:120px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
        <label>滚动 offset：</label>
        <input id="scrollOffsetInput" value="400" type="number" min="0" style="width:100px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;" />
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseAll">折叠所有</button>
        <button class="virt-list-btn virt-list-btn-primary" id="btnExpandNode">expandNode</button>
        <button class="virt-list-btn virt-list-btn-warning" id="btnCollapseNode">collapseNode</button>
        <button class="virt-list-btn virt-list-btn-primary" id="btnScrollOffset">滚动到指定位置</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnScrollTop">滚动到指定节点(顶部)</button>
        <button class="virt-list-btn virt-list-btn-success" id="btnScrollView">滚动到指定节点(可视区)</button>
      </div>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function Hs(a){a.innerHTML=Ps;const e=a.querySelector("#treeContainer"),n=a.querySelector("#scrollKeyInput"),t=a.querySelector("#scrollOffsetInput"),i=[],r=new B(e,{list:Rs(),fieldNames:{key:"id"},indent:20,expandedKeys:["0"],renderEmpty:()=>{const l=document.createElement("div");return l.style.padding="16px",l.textContent="暂无数据",l}}),o=(l,u)=>{const s=a.querySelector(`#${l}`);s.addEventListener("click",u),i.push(()=>s.removeEventListener("click",u))};return o("btnExpandAll",()=>r.expandAll(!0)),o("btnCollapseAll",()=>r.expandAll(!1)),o("btnExpandNode",()=>{const l=n.value.trim();l&&r.expandNode(l,!0)}),o("btnCollapseNode",()=>{const l=n.value.trim();l&&r.expandNode(l,!1)}),o("btnScrollOffset",()=>{const l=Number(t.value);Number.isFinite(l)&&l>=0&&r.scrollTo({offset:l})}),o("btnScrollTop",()=>{const l=n.value.trim();l&&r.scrollTo({key:l,align:"top"})}),o("btnScrollView",()=>{const l=n.value.trim();l&&r.scrollTo({key:l,align:"view"})}),()=>{r.destroy(),i.forEach(l=>l()),a.innerHTML=""}}function Is(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`}))}))}))}const Gs=`
  <div class="tree-demo">
    <div class="tree-btn-container">
      <div style="display:flex;gap:8px;">
        <button class="virt-list-btn virt-list-btn-success" id="btnExpandAll">展开所有</button>
        <button class="virt-list-btn virt-list-btn-secondary" id="btnCollapseAll">折叠所有</button>
      </div>
    </div>
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function _s(a){a.innerHTML=Gs;const e=a.querySelector("#treeContainer"),n=[],t=new B(e,{list:Is(),fieldNames:{key:"id"},indent:20,selectable:!0,defaultExpandAll:!0,renderStickyHeader:()=>{const r=document.createElement("div");return r.textContent="悬浮header",r.style.padding="10px 12px",r.style.background="#42b983",r.style.color="#fff",r.style.fontWeight="600",r},renderHeader:()=>{const r=document.createElement("div");return r.textContent="header",r.style.padding="8px 12px",r.style.background="cyan",r.style.color="#1f2329",r},renderFooter:()=>{const r=document.createElement("div");return r.textContent="footer",r.style.padding="8px 12px",r.style.background="cyan",r.style.color="#1f2329",r},renderStickyFooter:()=>{const r=document.createElement("div");return r.textContent="悬浮footer",r.style.padding="10px 12px",r.style.background="#42b983",r.style.color="#fff",r.style.fontWeight="600",r},renderEmpty:()=>{const r=document.createElement("div");return r.style.padding="16px",r.textContent="暂无数据",r}}),i=(r,o)=>{const l=a.querySelector(`#${r}`);l.addEventListener("click",o),n.push(()=>l.removeEventListener("click",o))};return i("btnExpandAll",()=>t.expandAll(!0)),i("btnCollapseAll",()=>t.expandAll(!1)),()=>{t.destroy(),n.forEach(r=>r()),a.innerHTML=""}}function Ws(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`}))}))}))}const Ks=`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function $s(){const a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("viewBox","0 0 48 48"),a.setAttribute("fill","none"),a.setAttribute("xmlns","http://www.w3.org/2000/svg"),a.style.width="100%",a.style.height="100%",a.setAttribute("stroke","currentColor"),a.setAttribute("stroke-width","4"),a.setAttribute("stroke-linecap","butt"),a.setAttribute("stroke-linejoin","miter");const e=document.createElementNS("http://www.w3.org/2000/svg","path");return e.setAttribute("d","M39.6 17.443 24.043 33 8.487 17.443"),a.appendChild(e),a}function Os(a){a.innerHTML=Ks;const e=a.querySelector("#treeContainer"),n=new B(e,{list:Ws(),fieldNames:{key:"id"},indent:20,expandOnClickNode:!0,renderIcon:()=>$s(),renderEmpty:()=>{const t=document.createElement("div");return t.style.padding="16px",t.textContent="暂无数据",t}});return()=>{n.destroy(),a.innerHTML=""}}function zs(){return Array.from({length:40},(a,e)=>({id:String(e),title:`Node-${e}`,children:Array.from({length:3},(n,t)=>({id:`${e}-${t}`,title:`Node-${e}-${t}`,children:Array.from({length:2},(i,r)=>({id:`${e}-${t}-${r}`,title:`Node-${e}-${t}-${r}`}))}))}))}const Js=`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function Vs(a){a.innerHTML=Js;const e=a.querySelector("#treeContainer"),n=20,t={current:null};return t.current=new B(e,{list:zs(),fieldNames:{key:"id"},indent:n,selectable:!0,defaultExpandAll:!0,expandOnClickNode:!0,itemPreSize:40,fixed:!0,renderNode:i=>{const r=document.createElement("div");return r.className="virt-tree-node",r.style.height="40px",r.style.display="flex",r.style.alignItems="center",r.style.borderBottom="1px solid #eee",r.style.boxSizing="border-box",r.style.paddingLeft=`${(i.level-1)*n}px`,r.textContent=`level: ${i.level}; -- title: ${i.title??""}`,r.addEventListener("click",()=>{const o=t.current;if(!o)return;const l=o.getTreeNode(i.key);!l||l.disableSelect||o.toggleSelect(l)}),r},renderEmpty:()=>{const i=document.createElement("div");return i.style.padding="16px",i.textContent="暂无数据",i}}),()=>{t.current?.destroy(),a.innerHTML=""}}const js=[{id:"role",title:"角色",children:[{id:"role-1",title:"怪物"},{id:"role-2",title:"小动物"},{id:"role-3",title:"路人"},{id:"role-4",title:"武器"}]},{id:"scene",title:"场景",children:[{id:"scene-1",title:"场景地域"},{id:"scene-2",title:"室内区域"},{id:"scene-3",title:"室外区域"},{id:"scene-4",title:"特色区域"}]},{id:"origin",title:"原始",children:[{id:"origin-1",title:"原始"},{id:"origin-2",title:"3D"},{id:"origin-3",title:"NPC"},{id:"origin-4",title:"手枪"}]},{id:"drag-1",title:"角色环节",children:[]},{id:"drag-2",title:"场景环节",children:[]},{id:"drag-3",title:"测试",children:[]}],Ys=`
  <div class="tree-demo">
    <div class="virt-tree-wrapper" id="treeContainer"></div>
  </div>
`;function qs(a){a.innerHTML=Ys;const e=a.querySelector("#treeContainer"),n=new B(e,{list:js,fieldNames:{key:"id"},draggable:!0,crossLevelDraggable:!1,showLine:!0,expandOnClickNode:!0,defaultExpandAll:!0,itemGap:4,indent:16,iconSize:14,renderEmpty:()=>{const t=document.createElement("div");return t.style.padding="16px",t.textContent="暂无数据",t}},{dragstart:t=>{console.log("dragstart",t)},dragend:t=>{t?console.log("dragend","success",t):console.log("dragend","fail","cancelled")}});return()=>{n.destroy(),a.innerHTML=""}}function Us(a){return Array.from({length:a},(e,n)=>({id:V.string.nanoid(),index:n,avatar:V.image.avatar(),name:V.person.firstName()}))}const Zs=`
  <div class="virt-grid-demo">
    <div class="virt-grid-controls">
      <span>gridItems:</span>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid2">2</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid3">3</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid4">4</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid5">5</button>
      <button class="virt-list-btn virt-list-btn-primary" id="btnGrid6">6</button>
    </div>
    <div id="status" class="status-text"></div>
    <div class="virt-grid-container" id="gridContainer"></div>
  </div>
`;function Xs(a){a.innerHTML=Zs;const e=a.querySelector("#gridContainer"),n=a.querySelector("#status"),t=Us(1e3),i=[],r=new ll(e,{list:t,gridItems:2,itemKey:"id",itemPreSize:70,renderCell:(l,u,s)=>{const c=document.createElement("div");return c.className="grid-cell",c.innerHTML=`
        <div>
          <div style="font-size:12px;color:#999;">row:${s} - item:${u}</div>
          <div style="display:flex;align-items:center;">
            <img src="${l.avatar}" style="width:40px;height:40px;border-radius:50%;" />
            <span style="margin-left:6px;">${l.name}</span>
          </div>
        </div>
        <button class="grid-delete-btn" data-id="${l.id}">delete</button>
      `,c.querySelector(".grid-delete-btn").addEventListener("click",()=>{const m=t.findIndex(g=>g.id===l.id);m>-1&&(t.splice(m,1),r.setList(t),n.textContent=`已删除 item ${u}，剩余 ${t.length} 项`)}),c}},{toTop:()=>{n.textContent="已滚动到顶部"}}),o=(l,u)=>{const s=a.querySelector(`#${l}`);s.addEventListener("click",u),i.push(()=>s.removeEventListener("click",u))};return[2,3,4,5,6].forEach(l=>{o(`btnGrid${l}`,()=>{r.setGridItems(l),n.textContent=`gridItems 已设为 ${l}`})}),n.textContent="网格示例已就绪：1000 项数据，2 列",()=>{r.destroy(),i.forEach(l=>l()),a.innerHTML=""}}const Qs=Object.assign({"./components/grid/virt-grid.js":aa,"./components/list/advanced.js":na,"./components/list/basic.js":ta,"./components/list/chat.js":ra,"./components/list/dynamic.js":ia,"./components/list/fixed.js":oa,"./components/list/horizontal.js":la,"./components/list/huge-data.js":sa,"./components/list/infinity.js":ua,"./components/list/keep-alive.js":ca,"./components/list/literal.js":da,"./components/list/operations.js":ha,"./components/list/pagination.js":ma,"./components/list/resize.js":pa,"./components/list/slots.js":Fa,"./components/list/table.js":ya,"./components/list/virt-list.js":ga,"./components/tree/virt-tree-basic.js":ba,"./components/tree/virt-tree-checkbox.js":fa,"./components/tree/virt-tree-content.js":va,"./components/tree/virt-tree-default.js":Ca,"./components/tree/virt-tree-drag.js":ka,"./components/tree/virt-tree-dragarea.js":Sa,"./components/tree/virt-tree-expand.js":Ea,"./components/tree/virt-tree-filter.js":Aa,"./components/tree/virt-tree-focus.js":Da,"./components/tree/virt-tree-icon.js":Ba,"./components/tree/virt-tree-operate.js":wa,"./components/tree/virt-tree-select.js":Ta,"./components/tree/virt-tree-showline.js":Ma,"./components/tree/virt-tree-slots.js":La}),xe={literal:pl,"virt-list":yl,"virt-grid":Xs,basic:fl,"huge-data":Cl,fixed:El,horizontal:Bl,slots:Ml,operations:Nl,resize:Hl,dynamic:_l,table:is,infinity:Ol,chat:Vl,advanced:ql,pagination:Xl,"keep-alive":ns,"virt-tree-basic":ss,"virt-tree-checkbox":ds,"virt-tree-expand":ps,"virt-tree-filter":gs,"virt-tree-select":vs,"virt-tree-showline":Ss,"virt-tree-content":Ds,"virt-tree-drag":Ms,"virt-tree-focus":Ns,"virt-tree-operate":Hs,"virt-tree-slots":_s,"virt-tree-icon":Os,"virt-tree-default":Vs,"virt-tree-dragarea":qs},Ne={literal:"./components/list/literal.js","virt-list":"./components/list/virt-list.js","virt-grid":"./components/grid/virt-grid.js",basic:"./components/list/basic.js","huge-data":"./components/list/huge-data.js",fixed:"./components/list/fixed.js",horizontal:"./components/list/horizontal.js",slots:"./components/list/slots.js",operations:"./components/list/operations.js",resize:"./components/list/resize.js",dynamic:"./components/list/dynamic.js",table:"./components/list/table.js",infinity:"./components/list/infinity.js",chat:"./components/list/chat.js",advanced:"./components/list/advanced.js",pagination:"./components/list/pagination.js","keep-alive":"./components/list/keep-alive.js","virt-tree-basic":"./components/tree/virt-tree-basic.js","virt-tree-checkbox":"./components/tree/virt-tree-checkbox.js","virt-tree-expand":"./components/tree/virt-tree-expand.js","virt-tree-filter":"./components/tree/virt-tree-filter.js","virt-tree-select":"./components/tree/virt-tree-select.js","virt-tree-showline":"./components/tree/virt-tree-showline.js","virt-tree-content":"./components/tree/virt-tree-content.js","virt-tree-drag":"./components/tree/virt-tree-drag.js","virt-tree-focus":"./components/tree/virt-tree-focus.js","virt-tree-operate":"./components/tree/virt-tree-operate.js","virt-tree-slots":"./components/tree/virt-tree-slots.js","virt-tree-icon":"./components/tree/virt-tree-icon.js","virt-tree-default":"./components/tree/virt-tree-default.js","virt-tree-dragarea":"./components/tree/virt-tree-dragarea.js"};function eu(a){const e=Ne[a]||Ne["virt-list"];return Qs[e]||""}let q=null;function re(a){const e=a?.container?.querySelector("#js-root")??document.getElementById("js-root");if(!e)return;const n=a?.exampleId??"virt-list",t=xe[n]??xe["virt-list"],i=eu(n);q?.();const r=Pa(e,i),o=t(r.mountEl);q=()=>{o?.(),r.destroy()}}Re.renderWithQiankun({bootstrap(){return Promise.resolve()},mount(a){return re(a),Promise.resolve()},unmount(){return q?.(),q=null,Promise.resolve()},update(a){return re(a),Promise.resolve()}});Re.qiankunWindow.__POWERED_BY_QIANKUN__||re();
