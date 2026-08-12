import { VirtList } from '@virt-list/vanilla';
import { generateTraceLines, KIND_LABEL, STATUS_ICON } from '../../../../_shared/traceData';
import { formatMs } from '../../../../_shared/agentBlocks';
import { activeSection, buildOutline } from '../../../../_shared/outline';

const COUNT = 3000;

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-outline-layout">
      <div class="demo-list-container demo-trace" id="listContainer"></div>
      <div class="demo-outline" id="outline"></div>
    </div>
    <div class="demo-chat-toolbar">
      <span class="demo-hint">
        右侧每个色块是一个执行阶段，高度按行数分配、颜色按段内最严重的事件。
        点色块跳到该段，悬停看标题。
      </span>
    </div>
  </div>
`;

export function bootstrapAiOutline(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const outlineEl = root.querySelector('#outline');

  const list = generateTraceLines(COUNT);
  /** 分段是纯数据计算，列表不变就不用重算 */
  const sections = buildOutline(list);

  let virtList;
  let current = -1;

  /**
   * 画导航条。
   *
   * 每段一个 flex item，`flex-grow` 取段内行数——于是色块高度天然等于
   * 这一段在整个日志里的占比，不需要自己算像素。
   */
  function renderOutline() {
    const frag = document.createDocumentFragment();
    sections.forEach((section, i) => {
      const block = document.createElement('button');
      block.type = 'button';
      block.className = `demo-outline-block kind-${section.kind}`;
      block.style.flexGrow = String(section.count);
      block.title = `${section.title}（${section.count} 行${
        section.errors > 0 ? `，${section.errors} 个错误` : ''
      }）`;
      block.addEventListener('click', () => {
        virtList.scrollToIndex(section.index, { align: 'start' });
      });
      frag.appendChild(block);
    });
    outlineEl.replaceChildren(frag);
  }

  /** 高亮当前视口所在的段 */
  function syncActive(state) {
    const at = activeSection(sections, state?.inViewBegin ?? 0);
    if (at === current) return;
    current = at;
    outlineEl.querySelectorAll('.demo-outline-block').forEach((el, i) => {
      el.classList.toggle('is-active', i === at);
    });
  }

  function updateStats(state) {
    const section = sections[current];
    statsEl.textContent = [
      `行数: ${list.length}`,
      `阶段: ${sections.length} 段`,
      `当前: 第 ${current + 1} 段`,
      section ? `「${section.title.slice(0, 18)}」` : '',
      `渲染区间: ${state?.renderBegin ?? '-'} - ${state?.renderEnd ?? '-'}`,
    ]
      .filter(Boolean)
      .join(' | ');
  }

  virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 26,
      hasMoreTop: false,
      hasMoreBottom: false,
      copyText: (item) =>
        `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}`,
      renderItem: (item) => {
        const row = document.createElement('div');
        row.className = `demo-trace-line kind-${item.kind}`;

        const head = document.createElement('div');
        head.className = 'demo-trace-head';

        const seq = document.createElement('span');
        seq.className = 'demo-trace-seq';
        seq.textContent = String(item.seq).padStart(5, ' ');
        head.appendChild(seq);

        const status = document.createElement('span');
        status.className = `demo-trace-status is-${item.status}`;
        status.textContent = STATUS_ICON[item.status];
        head.appendChild(status);

        const badge = document.createElement('span');
        badge.className = 'demo-trace-badge';
        badge.textContent = KIND_LABEL[item.kind];
        head.appendChild(badge);

        const text = document.createElement('span');
        text.className = 'demo-trace-text';
        text.textContent = item.text;
        head.appendChild(text);

        if (item.ms > 0) {
          const ms = document.createElement('span');
          ms.className = 'demo-trace-ms';
          ms.textContent = formatMs(item.ms);
          head.appendChild(ms);
        }

        row.appendChild(head);
        return row;
      },
    },
    {
      update: (_, state) => {
        syncActive(state);
        updateStats(state);
      },
    },
  );

  renderOutline();
  updateStats(virtList.state);

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
