import { VirtList } from '@virt-list/vanilla';
import { generateAiPage } from '../../../../_shared/aiData';

const COUNT = 600;

const template = `
  <div class="demo-panel">
    <div class="demo-chat-toolbar">
      <input id="q" class="demo-input" type="search" placeholder="搜索会话内容，如「不定高」「滚动」" />
      <button type="button" class="virt-list-btn" id="prevBtn">上一个</button>
      <button type="button" class="virt-list-btn" id="nextBtn">下一个</button>
      <span id="counter" class="demo-hint"></span>
    </div>
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
  </div>
`;

export function bootstrapAiSearch(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const counterEl = root.querySelector('#counter');
  const inputEl = root.querySelector('#q');
  const prevBtn = root.querySelector('#prevBtn');
  const nextBtn = root.querySelector('#nextBtn');

  const list = generateAiPage(1, COUNT);

  let keyword = '';
  /** 命中项的索引列表 */
  let hits = [];
  /** 当前定位到第几个命中（hits 的下标） */
  let cursor = -1;

  let virtList;

  /**
   * 在**数据**里搜索，而不是在 DOM 里。
   *
   * 浏览器的页内查找（Ctrl+F）只能看到当前渲染的那几十项，600 条里绝大多数
   * 根本没有对应的 DOM。命中位置由数据给出，跳转由 scrollToIndex 完成。
   */
  function search(next) {
    keyword = next.trim();
    hits = keyword
      ? list.reduce((acc, item, i) => {
          if (item.text.includes(keyword)) acc.push(i);
          return acc;
        }, [])
      : [];
    cursor = hits.length > 0 ? 0 : -1;

    // 关键词变了，任何可见项的高亮都可能变——这时该重建全部可见项。
    // forceUpdate 内部已经清过渲染池，不需要再单独调 clearItemPool
    virtList.refreshItems();

    if (cursor >= 0) jumpTo(cursor);
    refreshUI();
  }

  function jumpTo(nextCursor) {
    if (hits.length === 0) return;

    const prevIndex = hits[cursor];
    // 环形前后翻
    cursor = (nextCursor + hits.length) % hits.length;
    const nextIndex = hits[cursor];

    /**
     * 目标项此刻多半还没渲染，只能按预估尺寸落位；渲染出来量到真实尺寸后
     * 位置会自动修正，所以这里不需要自己算偏移量。
     *
     * `focus: true` 把键盘焦点一并带过去：只动视口不动焦点的话，
     * 屏幕阅读器用户不会知道刚才发生了什么，键盘用户接着按方向键也会从原处继续。
     */
    virtList.scrollToIndex(nextIndex, { align: 'start', focus: true });

    /**
     * 跳转只改变了「哪一项是当前命中」，也就是最多两项的样式——
     * 只刷这两项，其余可见项的 DOM 原样保留。
     *
     * 传的 key 不在可见范围内时是空操作，所以不必判断它们是否还渲染着。
     */
    const touched = [list[nextIndex]?.id];
    if (prevIndex !== undefined && prevIndex !== nextIndex) {
      touched.push(list[prevIndex]?.id);
    }
    virtList.refreshItems(touched.filter((id) => id !== undefined));

    refreshUI();
  }

  function refreshUI() {
    counterEl.textContent = keyword
      ? hits.length > 0
        ? `第 ${cursor + 1} / ${hits.length} 个命中`
        : '没有匹配'
      : '';
    prevBtn.disabled = hits.length === 0;
    nextBtn.disabled = hits.length === 0;
  }

  /** 把命中的关键词包成 mark，当前命中额外加一个 class */
  function renderText(text, isCurrent) {
    const frag = document.createDocumentFragment();
    if (!keyword) {
      frag.appendChild(document.createTextNode(text));
      return frag;
    }

    let from = 0;
    for (;;) {
      const at = text.indexOf(keyword, from);
      if (at === -1) break;
      if (at > from) {
        frag.appendChild(document.createTextNode(text.slice(from, at)));
      }
      const mark = document.createElement('mark');
      mark.className = isCurrent ? 'demo-hit is-current' : 'demo-hit';
      mark.textContent = keyword;
      frag.appendChild(mark);
      from = at + keyword.length;
    }
    if (from < text.length) {
      frag.appendChild(document.createTextNode(text.slice(from)));
    }
    return frag;
  }

  virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 80,
      /**
       * 补上列表语义：DOM 里只有视口附近那十几项，屏幕阅读器会以为总共就这么多。
       * 开启后每项都带上它在 600 条数据里的真实位置与总数。
       */
      aria: true,
      ariaLabel: '会话消息',
      renderItem: (item, index) => {
        const row = document.createElement('div');
        row.className =
          item.role === 'user'
            ? 'demo-chat-message demo-ai-row is-user'
            : 'demo-chat-message demo-ai-row';

        const bubble = document.createElement('div');
        bubble.className = 'demo-chat-bubble';
        const isCurrent = cursor >= 0 && hits[cursor] === index;
        if (isCurrent) bubble.classList.add('is-current-hit');

        const label = document.createElement('span');
        label.className = 'demo-ai-index';
        label.textContent = `#${index} `;
        bubble.appendChild(label);
        bubble.appendChild(renderText(item.text, isCurrent));

        row.appendChild(bubble);
        return row;
      },
    },
    {
      update: (_, state) => {
        statsEl.textContent = [
          `消息数: ${list.length}`,
          `渲染区间: ${state.renderBegin} - ${state.renderEnd}`,
          hits.length > 0 ? `命中 ${hits.length} 条（含未渲染项）` : '未搜索',
        ].join(' | ');
      },
    },
  );

  let debounce = null;
  inputEl.addEventListener('input', () => {
    if (debounce !== null) clearTimeout(debounce);
    debounce = setTimeout(() => search(inputEl.value), 200);
  });
  prevBtn.addEventListener('click', () => jumpTo(cursor - 1));
  nextBtn.addEventListener('click', () => jumpTo(cursor + 1));

  refreshUI();

  return () => {
    if (debounce !== null) clearTimeout(debounce);
    virtList.destroy();
    root.innerHTML = '';
  };
}
