import { VirtList } from '@virt-list/vanilla';

function nowText() {
  return new Date().toLocaleTimeString();
}

function createRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    index,
    value: Math.floor(Math.random() * 1000),
    updatedAt: nowText(),
  }));
}

const template = `
  <div class="demo-panel">
    <div class="demo-toolbar">
      <button class="virt-list-btn virt-list-btn-success" id="btnStart">开始刷新</button>
      <button class="virt-list-btn virt-list-btn-secondary" id="btnStop" style="display:none;">停止刷新</button>
      <label>间隔(ms)：</label>
      <input type="number" id="intervalInput" value="1000" min="200" step="200" style="width:80px;" />
      <label>数量：</label>
      <input type="number" id="countInput" value="1000" min="100" step="100" style="width:80px;" />
    </div>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapReactive(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const btnStart = root.querySelector('#btnStart');
  const btnStop = root.querySelector('#btnStop');
  const intervalInput = root.querySelector('#intervalInput');
  const countInput = root.querySelector('#countInput');

  let rowCount = parseInt(countInput.value, 10) || 1000;
  let list = createRows(rowCount);
  let tick = 0;
  let timer = null;

  const virtList = new VirtList(container, {
    list,
    itemKey: 'id',
    itemPreSize: 44,
    renderItem: (item) => {
      const row = document.createElement('div');
      row.className = 'demo-row-item';
      row.innerHTML = `
        <span class="demo-row-index">#${item.index}</span>
        <span class="demo-row-text">值: <b>${item.value}</b>  更新于: ${item.updatedAt}</span>
      `;
      return row;
    },
  });

  function renderStats() {
    const interval = parseInt(intervalInput.value, 10) || 2000;
    const running = timer !== null;
    statsEl.textContent = `总数: ${list.length} | 更新轮次: ${tick} | 间隔: ${interval}ms | 状态: ${running ? '刷新中' : '已停止'}`;
  }

  renderStats();

  function doTick() {
    const time = nowText();
    list.forEach((row) => {
      row.value = Math.floor(Math.random() * 1000);
      row.updatedAt = time;
    });
    tick += 1;
    virtList.forceUpdate();
    renderStats();
  }

  function startTimer() {
    if (timer !== null) return;
    const interval = parseInt(intervalInput.value, 10) || 2000;
    doTick();
    timer = setInterval(doTick, interval);
    btnStart.style.display = 'none';
    btnStop.style.display = '';
    renderStats();
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    btnStart.style.display = '';
    btnStop.style.display = 'none';
    renderStats();
  }

  btnStart.addEventListener('click', startTimer);
  btnStop.addEventListener('click', stopTimer);

  intervalInput.addEventListener('change', () => {
    if (timer !== null) {
      stopTimer();
      startTimer();
    }
  });

  countInput.addEventListener('change', () => {
    rowCount = parseInt(countInput.value, 10) || 1000;
    list = createRows(rowCount);
    tick = 0;
    virtList.setList(list);
    virtList.forceUpdate();
    renderStats();
  });

  return () => {
    if (timer !== null) clearInterval(timer);
    virtList.destroy();
    root.innerHTML = '';
  };
}
