import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { VirtList } from '../src/index';
import type { LoadDirection, LoadState } from '../src/index';

const ITEM_SIZE = 20;
const CLIENT_SIZE = 200;

interface ListItem {
  id: string;
  text: string;
}

function makeList(length: number, prefix = 'a', start = 0): ListItem[] {
  return Array.from({ length }, (_, i) => ({
    id: `${prefix}-${start + i}`,
    text: `item-${start + i}`,
  }));
}

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

interface MountOptions {
  list: Ref<ListItem[]>;
  loadMore?: (dir: LoadDirection) => boolean | void | Promise<boolean | void>;
  stickyBottom?: boolean;
  initialPosition?: 'top' | 'bottom';
  hasMoreTop?: boolean;
  hasMoreBottom?: boolean;
  /** 收集 header 插槽每次拿到的 loadState */
  headerStates?: LoadState[];
}

function mount(opts: MountOptions) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const listRef: Ref<any> = ref(null);

  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(
            VirtList as any,
            {
              ref: listRef,
              list: opts.list.value,
              itemKey: 'id',
              itemPreSize: ITEM_SIZE,
              fixed: true,
              loadMore: opts.loadMore,
              stickyBottom: opts.stickyBottom,
              initialPosition: opts.initialPosition,
              hasMoreTop: opts.hasMoreTop ?? true,
              hasMoreBottom: opts.hasMoreBottom ?? true,
            },
            {
              default: ({ index }: { index: number }) =>
                h('div', null, `item-${index}`),
              header: ({ loadState }: { loadState: LoadState }) => {
                opts.headerStates?.push({ ...loadState });
                return h(
                  'div',
                  null,
                  loadState.loadingTop
                    ? '加载中'
                    : loadState.hasMoreTop
                      ? ''
                      : '没有更早的了',
                );
              },
            },
          );
      },
    }),
  );

  app.mount(container);
  const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
  // jsdom 不会触发 ResizeObserver，手动把可视尺寸交给 core
  listRef.value.slotSize.clientSize = CLIENT_SIZE;
  return { app, container, listRef, clientEl };
}

function scrollTo(el: HTMLElement, offset: number) {
  el.scrollTop = offset;
  el.dispatchEvent(new Event('scroll'));
}

/** 让挂起的 promise 与 vue 的更新队列都跑完 */
async function flush(times = 4) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
    await nextTick();
  }
}

describe('Vue VirtList 声明式加载', () => {
  it('滚到底部触发 loadMore，数据写回 list 后继续渲染', async () => {
    const list = ref(makeList(40));
    const loadMore = vi.fn(async (dir: LoadDirection) => {
      if (dir !== 'bottom') return false;
      list.value = [...list.value, ...makeList(40, 'next', list.value.length)];
      return true;
    });
    const { app, clientEl, container } = mount({ list, loadMore });
    await flush();

    scrollTo(clientEl, 40 * ITEM_SIZE);
    await flush();

    expect(loadMore).toHaveBeenCalledWith('bottom');
    expect(list.value.length).toBeGreaterThan(40);
    expect(container.querySelectorAll('div[data-id]').length).toBeGreaterThan(0);

    app.unmount();
  });

  it('header 插槽拿到 loadState，加载中与加载完各渲染一次', async () => {
    const list = ref(makeList(40));
    const headerStates: LoadState[] = [];
    let resolve!: (v: boolean) => void;
    const loadMore = vi.fn(
      () => new Promise<boolean>((r) => { resolve = r; }),
    );
    const { app, clientEl, container } = mount({
      list,
      loadMore,
      hasMoreBottom: false,
      headerStates,
    });
    await flush();

    scrollTo(clientEl, 200);
    scrollTo(clientEl, 0);
    await flush();

    expect(headerStates.some((s) => s.loadingTop)).toBe(true);
    expect(container.textContent).toContain('加载中');

    resolve(false);
    await flush();

    const last = headerStates.at(-1)!;
    expect(last.loadingTop).toBe(false);
    expect(last.hasMoreTop).toBe(false);
    expect(container.textContent).toContain('没有更早的了');

    app.unmount();
  });

  it('顶部加载后视口内容不跳动（不需要手动 addedList2Top）', async () => {
    const list = ref(makeList(60));
    const loadMore = vi.fn(async (dir: LoadDirection) => {
      if (dir !== 'top') return false;
      list.value = [...makeList(20, 'older'), ...list.value];
      return true;
    });
    const { app, clientEl, listRef } = mount({
      list,
      loadMore,
      hasMoreBottom: false,
    });
    await flush();

    scrollTo(clientEl, 200);
    scrollTo(clientEl, 0);
    const keyAtTop =
      listRef.value.getState().inViewBegin === 0 ? 'a-0' : null;
    expect(keyAtTop).toBe('a-0');

    await flush();

    // 插入 20 项 * 20px，视口应当被推到新内容之下，仍停在 a-0
    expect(clientEl.scrollTop).toBe(20 * ITEM_SIZE);
    const state = listRef.value.getState();
    expect(list.value[state.inViewBegin]!.id).toBe('a-0');

    app.unmount();
  });

  it('initialPosition="bottom" 挂载即在底部', async () => {
    const list = ref(makeList(100));
    const { app, clientEl, listRef } = mount({
      list,
      initialPosition: 'bottom',
    });
    await flush();

    // 挂载即定位到了底部
    expect(clientEl.scrollTop).toBe(listRef.value.getState().listTotalSize);

    // clientSize 在 jsdom 里是挂载后手动补的（浏览器由 ResizeObserver 给出），
    // 派发一次 scroll 让 core 用真实可视尺寸重算区间
    clientEl.dispatchEvent(new Event('scroll'));
    await flush();

    expect(listRef.value.getState().inViewEnd).toBeGreaterThan(50);

    app.unmount();
  });

  it('sticky-bottom：贴底时跟随，未贴底时计入 pendingNew', async () => {
    const list = ref(makeList(60));
    const { app, clientEl, listRef } = mount({
      list,
      stickyBottom: true,
      hasMoreTop: false,
      hasMoreBottom: false,
    });
    await flush();

    // 贴到底再追加 → 跟随
    scrollTo(clientEl, 60 * ITEM_SIZE);
    await flush();
    list.value = [...list.value, ...makeList(1, 'new')];
    await flush();
    expect(listRef.value.getLoadState().pendingNew).toBe(0);

    // 翻到中间再追加 → 不动视口，计数
    scrollTo(clientEl, 200);
    await flush();
    const before = clientEl.scrollTop;
    list.value = [...list.value, ...makeList(3, 'new2')];
    await flush();

    expect(clientEl.scrollTop).toBe(before);
    expect(listRef.value.getLoadState().pendingNew).toBe(3);

    app.unmount();
  });

  it('getLoadState 通过组件 ref 可读', async () => {
    const list = ref(makeList(40));
    const { app, listRef } = mount({ list, hasMoreTop: false });
    await flush();

    const state = listRef.value.getLoadState();
    expect(state.hasMoreTop).toBe(false);
    expect(state.hasMoreBottom).toBe(true);
    expect(state.loadingTop).toBe(false);

    app.unmount();
  });
});
