import { VirtListDOM } from '@virt-list/dom';

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

const template = `
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
`;

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
      row.style.backgroundColor = `hsl(${(item.id * 13) % 360} 75% 95%)`;
      row.style.padding = '8px 12px';
      row.style.borderBottom = '1px solid rgba(0,0,0,0.06)';
      row.innerHTML = `
        <div style="font-weight:bold;margin-bottom:2px;">Item ${item.id}</div>
        <div style="color:#666;font-size:13px;line-height:1.5;">${item.content}</div>
      `;
      return row;
    },
  });

  const getNumber = (id) => Number.parseInt(root.querySelector(`#${id}`).value, 10);
  const setStatus = (text) => {
    status.textContent = text;
  };
  const on = (id, handler) => {
    const el = root.querySelector(`#${id}`);
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
    setStatus(`已滚动到索引 ${index}`);
  });
  on('btnScrollToOffset', () => {
    const offset = getNumber('scrollToOffsetInput');
    if (Number.isNaN(offset) || offset < 0) {
      setStatus('请输入有效偏移值');
      return;
    }
    virtList.scrollToOffset(offset);
    setStatus(`已滚动到偏移 ${offset}`);
  });
  on('btnScrollIntoView', () => {
    const index = getNumber('scrollIntoViewInput');
    if (Number.isNaN(index) || index < 0 || index >= list.length) {
      setStatus('请输入有效索引 (0 - 999)');
      return;
    }
    virtList.scrollIntoView(index);
    setStatus(`已确保索引 ${index} 在可视区域`);
  });
  on('btnRandom', () => {
    const randomIndex = Math.floor(Math.random() * list.length);
    root.querySelector('#scrollToIndexInput').value = String(randomIndex);
    virtList.scrollToIndex(randomIndex);
    setStatus(`随机滚动到索引 ${randomIndex}`);
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
