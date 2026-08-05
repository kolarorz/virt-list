import { VirtList } from '@virt-list/vanilla';
import {
  createChatMessage,
  fetchChatPage,
  generateChatPage,
} from '../../../../_shared/chatData';
import { formatChatStats } from '../../../../_shared/demoStats';
import { createBlankScreenDiagnostics } from '../../../../_shared/blankScreenDiagnostics';

const PAGE_SIZE = 30;
/** 超过这个字数才需要折叠 */
const COLLAPSE_MIN_LENGTH = 60;
/** 折叠时显示的行数 */
const COLLAPSED_LINES = 3;

const CLAMP_STYLE = `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${COLLAPSED_LINES}; overflow: hidden;`;

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div id="diag" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" id="sendBtn">发送随机消息</button>
      <button type="button" class="virt-list-btn" id="expandAllBtn">全部展开</button>
      <button type="button" class="virt-list-btn" id="collapseAllBtn">全部折叠</button>
    </div>
  </div>
`;

export function bootstrapChatCollapse(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const diagEl = root.querySelector('#diag');

  let page = 4;
  let list = generateChatPage(page, PAGE_SIZE);
  let loadState = null;

  /**
   * 这两个都用 let 提前声明，而不是 const 写在下面。
   *
   * 列表在**构造期间**就会发出第一次 update 事件（首屏渲染），此时
   * `new VirtList(...)` 还没返回、赋值也没完成。如果回调里碰的是一个 const
   * 声明的变量，那就是 TDZ 错误（Cannot access before initialization）。
   * 提前声明后构造期间读到的是 undefined，配合可选链就安全了。
   */
  let virtList;
  let diagnostics;

  /** 展开状态记录在列表数据之外，供项被重建时恢复 */
  const expandedIds = new Set();

  function updateStats(state) {
    statsEl.textContent = formatChatStats({
      total: list.length,
      expanded: expandedIds.size,
      state,
      loadState,
    });
  }

  /**
   * 把某一项的 DOM 切换到展开 / 折叠态。
   *
   * 原生这层最直接：不需要"响应式"，直接改这一项自己的 DOM 就行。高度一变
   * ResizeObserver 就会上报，列表自动修正后续内容的位置——不必通知列表。
   */
  function applyCollapse(el, open) {
    const textEl = el.querySelector('[data-role="text"]');
    const btn = el.querySelector('[data-role="toggle"]');
    if (textEl) textEl.style.cssText = open ? '' : CLAMP_STYLE;
    if (btn) btn.textContent = open ? '收起' : '展开';
  }

  /**
   * 展开 / 收起单条消息。滚动只有一条规则，展开和收起共用：
   *
   * 顶部还在视口里 → 一动不动；顶部已滚出视口上方 → 拉回视口顶部。
   * 后者的理由是高度骤变会让视口内容整体错位（展开被中段文本淹没，
   * 收起被后面的消息顶上来），拉回顶部用户就能从头看这条消息。
   */
  function onToggle(item, el) {
    if (!virtList) return;
    const open = !expandedIds.has(item.id);
    if (open) expandedIds.add(item.id);
    else expandedIds.delete(item.id);

    applyCollapse(el, open);

    // 索引要现查：加载历史之后这一项的位置会平移
    const index = list.findIndex((it) => it.id === item.id);
    if (index >= 0) {
      // top 只取决于这一项上方的内容，与它自己的高度无关，尺寸变化前就能算准
      const { top } = virtList.core.getItemPosByIndex(index);
      if (virtList.core.getOffset() > top) virtList.scrollToIndex(index);
    }

    updateStats(virtList.core.getState());
  }

  virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      itemPreSize: 76,
      loadMore: async (direction) => {
        if (direction !== 'top') return false;
        const prevPage = await fetchChatPage(page - 1, PAGE_SIZE);
        page--;
        list = prevPage.concat(list);
        virtList.setList(list);
        return page > 1;
      },
      hasMoreBottom: false,
      initialPosition: 'bottom',
      stickyBottom: true,
      renderHeader: (el, state) => {
        el.className = 'demo-loading-bar';
        el.textContent = state.loadingTop
          ? '加载中...'
          : state.hasMoreTop
            ? ''
            : '没有更早的消息了';
      },
      renderItem: (item, _index, el) => {
        const collapsible = item.text.length > COLLAPSE_MIN_LENGTH;
        const open = expandedIds.has(item.id);

        el.className = 'demo-chat-message';
        el.innerHTML = `
          <div class="demo-chat-bubble">
            <div style="font-weight:bold;margin-bottom:2px;">消息 #${item.index}</div>
            <div data-role="text" style="${open || !collapsible ? '' : CLAMP_STYLE}">${item.text}</div>
            ${
              collapsible
                ? `<button type="button" data-role="toggle" style="margin-top:6px;padding:0;border:none;background:none;color:var(--demo-c-brand-1, #2a63f0);cursor:pointer;font-size:13px;">${open ? '收起' : '展开'}</button>`
                : ''
            }
          </div>
        `;

        const btn = el.querySelector('[data-role="toggle"]');
        if (btn) btn.addEventListener('click', () => onToggle(item, el));
      },
    },
    {
      loadStateChange: (state) => {
        loadState = state;
        updateStats(virtList?.core.getState());
      },
      update: (_, state) => {
        updateStats(state);
        // 首屏这次 update 发生在构造期间，那时 diagnostics 还没建好
        diagnostics?.schedule(state);
      },
      scroll: () => diagnostics?.schedule(virtList?.core.getState()),
    },
  );

  /** 白屏自检（临时诊断，定位完会删掉）*/
  diagnostics = createBlankScreenDiagnostics(
    {
      root: () => container,
      listLength: () => list.length,
      slotSize: () => virtList.core.slotSize,
      itemSize: (key) => virtList.core.getItemSize(key),
    },
    (text) => {
      diagEl.textContent = `自检：${text || '正常'}`;
      diagEl.style.color = text ? '#c00' : '';
      diagEl.style.fontWeight = text ? 'bold' : '';
    },
  );

  updateStats(virtList.core.getState());

  /**
   * 批量展开 / 折叠。renderItem 只在项首次创建时调用，所以改完记录要用
   * forceUpdate 让列表重建渲染窗口内的项；所有项高度同时变化，视口失去参照，
   * 重建之后再定位回去。
   */
  function setAll(open) {
    const anchorIndex = virtList.core.getState().inViewBegin;

    expandedIds.clear();
    if (open) list.forEach((it) => expandedIds.add(it.id));

    virtList.forceUpdate();
    virtList.scrollToIndex(anchorIndex);
    updateStats(virtList.core.getState());
  }

  root.querySelector('#expandAllBtn').addEventListener('click', () => setAll(true));
  root.querySelector('#collapseAllBtn').addEventListener('click', () => setAll(false));

  // 发消息只管往列表里加，stickyBottom 负责「贴底时才跟随」
  root.querySelector('#sendBtn').addEventListener('click', () => {
    list = [...list, createChatMessage(list.length)];
    virtList.setList(list);
    updateStats(virtList.core.getState());
  });

  return () => {
    diagnostics.dispose();
    virtList.destroy();
    root.innerHTML = '';
  };
}
