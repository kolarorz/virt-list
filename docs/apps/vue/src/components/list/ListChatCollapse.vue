<template>
  <div class="demo-panel">
    <div class="demo-stats">{{ statsText }}</div>
    <div
      class="demo-stats"
      :style="diagText ? 'color: #c00; font-weight: bold' : ''"
    >
      自检：{{ diagText || '正常' }}
    </div>
    <div ref="containerRef" class="demo-list-container">
      <VirtList
        ref="virtListRef"
        :list="list"
        item-key="id"
        :item-pre-size="76"
        :load-more="onLoadMore"
        :has-more-bottom="false"
        initial-position="bottom"
        sticky-bottom
        @load-state-change="onLoadStateChange"
        @update="onUpdate"
        @scroll="onScroll"
      >
        <template #header="{ loadState }">
          <div class="demo-loading-bar">
            {{ loadState.loadingTop ? '加载中...' : loadState.hasMoreTop ? '' : '没有更早的消息了' }}
          </div>
        </template>
        <template #default="{ itemData }">
          <ChatBubble
            :item="itemData"
            :initial-expanded="expandedIds.has(itemData.id)"
            @toggle="(open: boolean) => onToggle(itemData.id, open)"
          />
        </template>
      </VirtList>
    </div>
    <div class="demo-chat-toolbar">
      <button type="button" class="virt-list-btn virt-list-btn-primary" @click="onSend">
        发送随机消息
      </button>
      <button type="button" class="virt-list-btn" @click="setAll(true)">全部展开</button>
      <button type="button" class="virt-list-btn" @click="setAll(false)">全部折叠</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, onBeforeUnmount, ref, type PropType } from 'vue';
import { VirtList } from '@virt-list/vue';
import type { LoadDirection, LoadState } from '@virt-list/vue';
import {
  createChatMessage,
  fetchChatPage,
  generateChatPage,
  type ChatMessage,
} from '../../../../_shared/chatData';
import { formatChatStats } from '../../../../_shared/demoStats';
import { createBlankScreenDiagnostics } from '../../../../_shared/blankScreenDiagnostics';

const PAGE_SIZE = 30;
/** 超过这个字数才需要折叠 */
const COLLAPSE_MIN_LENGTH = 60;
/** 折叠时显示的行数 */
const COLLAPSED_LINES = 3;

/**
 * 单条消息气泡。
 *
 * 折叠状态刻意放在这个子组件内部：虚拟列表的项 DOM 由列表自己挂载，不在外层
 * 组件的响应式渲染树上，外层改一个 ref 并不会让已经渲染出来的项重新渲染。
 * 由子组件自己持有状态，点击时它自身重渲染，高度变化被 ResizeObserver 捕捉到，
 * 列表就会自动修正后续内容的位置——不需要手动通知列表。
 */
const ChatBubble = defineComponent({
  name: 'ChatBubble',
  props: {
    item: { type: Object as PropType<ChatMessage>, required: true },
    initialExpanded: { type: Boolean, default: false },
  },
  emits: ['toggle'],
  setup(props, { emit }) {
    // 项滚出渲染窗口后 DOM 会被销毁，重新滚回来时由 initialExpanded 恢复
    const open = ref(props.initialExpanded);

    function toggle() {
      open.value = !open.value;
      // 同步给外层记录，供重建时恢复
      emit('toggle', open.value);
    }

    return () => {
      const collapsible = props.item.text.length > COLLAPSE_MIN_LENGTH;
      const clamped = collapsible && !open.value;

      return h('div', { class: 'demo-chat-message' }, [
        h('div', { class: 'demo-chat-bubble' }, [
          h(
            'div',
            { style: 'font-weight: bold; margin-bottom: 2px' },
            `消息 #${props.item.index}`,
          ),
          h(
            'div',
            {
              style: clamped
                ? `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${COLLAPSED_LINES}; overflow: hidden;`
                : '',
            },
            props.item.text,
          ),
          collapsible
            ? h(
                'button',
                {
                  type: 'button',
                  style:
                    'margin-top: 6px; padding: 0; border: none; background: none; color: var(--demo-c-brand-1, #2a63f0); cursor: pointer; font-size: 13px;',
                  onClick: toggle,
                },
                open.value ? '收起' : '展开',
              )
            : null,
        ]),
      ]);
    };
  },
});

const virtListRef = ref<typeof VirtList | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const statsText = ref('');
/** 白屏自检的结论，空串表示一切正常 */
const diagText = ref('');
const page = ref(4);
const list = ref<ChatMessage[]>(generateChatPage(page.value, PAGE_SIZE));
const loadState = ref<LoadState | null>(null);

/**
 * 展开状态记录在列表数据之外。
 *
 * 不需要是响应式的：读取发生在插槽函数里（每次 patch 都会重新执行），
 * 写入只用于项被重建时恢复状态。
 */
const expandedIds = new Set<number>();

/** 白屏自检（临时诊断，定位完会删掉）*/
const diagnostics = createBlankScreenDiagnostics(
  {
    root: () => containerRef.value,
    listLength: () => list.value.length,
    slotSize: () => virtListRef.value?.slotSize,
    itemSize: (key) => virtListRef.value?.getItemSize(key) ?? -1,
  },
  (text) => {
    diagText.value = text;
  },
);
onBeforeUnmount(() => diagnostics.dispose());

/**
 * 展开 / 收起单条消息。
 *
 * 滚动只有一条规则，展开和收起共用：
 *
 * **这条消息的顶部还在视口里 → 一动不动。** 用户看着它的开头，高度往下变，
 * 视觉上是连续的，此时插一次滚动纯属捣乱。
 *
 * **顶部已经滚出视口上方 → 把它拉回视口顶部。** 这时用户看不到这条消息的开头，
 * 高度骤变会让视口内容整体错位：展开时被这条消息的中段文本淹没（明明只点了个
 * 按钮，画面全换了），收起时滚动位置还指着原先那个很深的偏移，那里已经是后面
 * 十几条消息的地盘。拉回顶部之后，用户就能从头看这条消息。
 */
function onToggle(id: number, open: boolean) {
  const index = list.value.findIndex((it) => it.id === id);
  const vl = virtListRef.value;
  if (index < 0 || !vl) return;

  if (open) expandedIds.add(id);
  else expandedIds.delete(id);

  // top 只取决于这一项上方的内容，与它自己的高度无关，所以在尺寸变化之前就能算准。
  // scrollToIndex 自带渐进修正，会跟着 ResizeObserver 的回调重算目标
  const { top } = vl.getItemPosByIndex(index);
  if (vl.getOffset() > top) vl.scrollToIndex(index);

  updateStats();
}

/**
 * 批量展开 / 折叠。
 *
 * 这条路径和点击单条不同：改的是外部记录，已渲染的项不会自己更新，
 * 需要 forceUpdate 让列表重建渲染窗口内的项（它会清空 DOM 缓存池后重渲染）。
 *
 * 所有项的高度同时变化，视口位置就失去了参照，所以先记下当前看的是哪一条，
 * 重建之后再定位回去。
 */
function setAll(open: boolean) {
  const anchorIndex = virtListRef.value?.getState().inViewBegin ?? 0;

  expandedIds.clear();
  if (open) list.value.forEach((it) => expandedIds.add(it.id));

  virtListRef.value?.forceUpdate();
  virtListRef.value?.scrollToIndex(anchorIndex);
  updateStats();
}

/** 向上加载更早的消息：取数并写入 list，返回是否还有更早的 */
async function onLoadMore(direction: LoadDirection) {
  if (direction !== 'top') return false;
  const prevPage = await fetchChatPage(page.value - 1, PAGE_SIZE);
  page.value--;
  list.value = prevPage.concat(list.value);
  return page.value > 1;
}

/** 发消息只管往列表里加，sticky-bottom 负责「贴底时才跟随」 */
function onSend() {
  list.value = [...list.value, createChatMessage(list.value.length)];
}

function onLoadStateChange(state: LoadState) {
  loadState.value = state;
  updateStats();
}

function onUpdate(_list: any[], state: any) {
  updateStats(state);
  diagnostics.schedule(state);
}

/** 区间没变、只是位置错了的情况 update 不会触发，所以滚动时也要量 */
function onScroll() {
  diagnostics.schedule(virtListRef.value?.getState());
}

function updateStats(state?: any) {
  statsText.value = formatChatStats({
    total: list.value.length,
    expanded: expandedIds.size,
    state,
    loadState: loadState.value,
  });
}

updateStats();
</script>
