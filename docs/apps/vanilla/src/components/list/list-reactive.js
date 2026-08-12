import { VirtList } from '@virt-list/vanilla';

function nowText() {
  return new Date().toLocaleTimeString();
}

function randValue() {
  return Math.floor(Math.random() * 1000);
}

function createRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    index,
    value: randValue(),
    tick: 0,
    updatedAt: nowText(),
  }));
}

const template = `
  <div class="demo-panel">
    <div class="demo-toolbar">
      <button class="virt-list-btn virt-list-btn-success" id="btnStart">开始刷新</button>
      <button class="virt-list-btn virt-list-btn-secondary" id="btnStop" style="display:none;">停止刷新</button>
      <label>更新方式：</label>
      <button class="virt-list-btn virt-list-btn-primary" id="btnReplace">换新数组</button>
      <button class="virt-list-btn virt-list-btn-secondary" id="btnMutate">原地修改</button>
      <button class="virt-list-btn virt-list-btn-warning" id="btnRefresh" style="display:none;">refreshItems()</button>
      <label>间隔(ms)：</label>
      <input type="number" id="intervalInput" value="1000" min="200" step="200" style="width:80px;" />
      <label>数量：</label>
      <input type="number" id="countInput" value="1000" min="100" step="100" style="width:80px;" />
    </div>
    <div id="stats" class="demo-stats"></div>
    <div id="hint" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapReactive(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const hintEl = root.querySelector('#hint');
  const btnStart = root.querySelector('#btnStart');
  const btnStop = root.querySelector('#btnStop');
  const btnReplace = root.querySelector('#btnReplace');
  const btnMutate = root.querySelector('#btnMutate');
  const btnRefresh = root.querySelector('#btnRefresh');
  const intervalInput = root.querySelector('#intervalInput');
  const countInput = root.querySelector('#countInput');

  let rowCount = parseInt(countInput.value, 10) || 1000;
  let list = createRows(rowCount);
  let dataTick = 0;
  let timer = null;
  let mode = 'replace';

  /** 一项的内容长什么样。renderItem 与 updateItem 共用它 */
  function paint(item, el) {
    el.className = 'demo-row-item';
    el.innerHTML = `
      <span class="demo-row-index">#${item.index}</span>
      <span class="demo-row-text">值: <b>${item.value}</b>&ensp;轮次: <b>${item.tick}</b>&ensp;更新于: ${item.updatedAt}</span>
    `;
  }

  const virtList = new VirtList(container, {
    list,
    itemKey: 'id',
    estimatedSize: 44,
    renderItem: (item, _index, el) => paint(item, el),
    /**
     * 纯 DOM 用法下这个回调是「数据变了内容跟着变」的关键。
     *
     * 渲染池里已有的 key 不会重新调用 renderItem（这是增量 patch 的核心优化），
     * 所以 setList 之后同一个 key 的项默认会停在挂载那一刻。给出 updateItem，
     * 数据变更就会带着最新的 item 回调它 —— 滚动与尺寸上报不会触发，
     * 不必担心把虚拟滚动的优化还回去。
     *
     * 框架包（vue / react 等）的插槽路径已经自动注入了它，只有直接用 vanilla
     * 才需要自己写这一条。
     */
    updateItem: (item, _index, el) => paint(item, el),
  });

  function renderStats() {
    const interval = parseInt(intervalInput.value, 10) || 1000;
    const running = timer !== null;
    statsEl.textContent = `总数: ${list.length} | 数据已改: ${dataTick} 轮 | 间隔: ${interval}ms | 状态: ${running ? '刷新中' : '已停止'}`;
    hintEl.textContent =
      mode === 'replace'
        ? '换新数组：setList 传入新数组，组件通过 updateItem 把最新数据交给可视区内的每一项'
        : '原地改字段：没有 setList，组件完全不知道数据动过 —— 行上的轮次会停住，点 refreshItems() 才追上';
  }

  function syncModeButtons() {
    btnReplace.className = `virt-list-btn ${mode === 'replace' ? 'virt-list-btn-primary' : 'virt-list-btn-secondary'}`;
    btnMutate.className = `virt-list-btn ${mode === 'mutate' ? 'virt-list-btn-primary' : 'virt-list-btn-secondary'}`;
    btnRefresh.style.display = mode === 'mutate' ? '' : 'none';
  }

  syncModeButtons();
  renderStats();

  function doTick() {
    dataTick += 1;
    const time = nowText();

    if (mode === 'replace') {
      // 推荐写法：换一个新数组再 setList。组件会把最新数据交给可视区内的每一项
      list = list.map((row) => ({
        ...row,
        value: randValue(),
        tick: dataTick,
        updatedAt: time,
      }));
      virtList.setList(list);
    } else {
      // 原地改字段、也不调 setList：组件无从知晓，界面会停在上一轮
      list.forEach((row) => {
        row.value = randValue();
        row.tick = dataTick;
        row.updatedAt = time;
      });
    }

    renderStats();
  }

  /**
   * 手动重建可视区内的项。
   *
   * 传 keys 可以精确到某几项（`refreshItems([3, 7])`），不传则重建全部可见项。
   * 它会移除并重建那些项的 DOM，比 updateItem 的原地更新重，所以只在
   * 「数据变了但没走 setList」这种场合用。
   */
  function manualRefresh() {
    virtList.refreshItems();
    renderStats();
  }

  function startTimer() {
    if (timer !== null) return;
    const interval = parseInt(intervalInput.value, 10) || 1000;
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
  btnRefresh.addEventListener('click', manualRefresh);

  btnReplace.addEventListener('click', () => {
    mode = 'replace';
    syncModeButtons();
    renderStats();
  });

  btnMutate.addEventListener('click', () => {
    mode = 'mutate';
    syncModeButtons();
    renderStats();
  });

  intervalInput.addEventListener('change', () => {
    if (timer !== null) {
      stopTimer();
      startTimer();
    }
    renderStats();
  });

  countInput.addEventListener('change', () => {
    rowCount = parseInt(countInput.value, 10) || 1000;
    list = createRows(rowCount);
    dataTick = 0;
    virtList.setList(list);
    renderStats();
  });

  return () => {
    if (timer !== null) clearInterval(timer);
    virtList.destroy();
    root.innerHTML = '';
  };
}
