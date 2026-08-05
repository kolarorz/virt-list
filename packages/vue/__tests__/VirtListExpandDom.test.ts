import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type PropType,
  type Ref,
} from 'vue';
import { VirtList } from '../src/index';

/**
 * 折叠消息在 Vue 层的 DOM 一致性。
 *
 * vanilla 层的同类测试用的是 textContent，绕开了插槽——而 Vue 的项内容是靠
 * vueRender 手动挂到项容器上的，是一条独立的路径。这里验证的是用户真正看到的
 * 东西：与视口相交的项，DOM 里必须都在。
 */

const COLLAPSED = 50;
const CLIENT_SIZE = 300;
const VERY_TALL = CLIENT_SIZE * 3;
const SLOT_IDS = ['client', 'header', 'footer', 'stickyHeader', 'stickyFooter'];

interface Item {
  id: string;
  text: string;
}

function makeList(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m-${i}`,
    text: `msg-${i}`,
  }));
}

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = {
  cb: null,
  targets: new Set(),
};
const OriginalRO = globalThis.ResizeObserver;
const OriginalRAF = globalThis.requestAnimationFrame;
const OriginalCAF = globalThis.cancelAnimationFrame;

let sizes: Map<string, number>;
let rafQueue: (FrameRequestCallback | null)[];

function flushRaf() {
  const pending = rafQueue;
  rafQueue = [];
  pending.forEach((cb) => cb?.(0));
}

beforeEach(() => {
  ro.cb = null;
  ro.targets = new Set();
  sizes = new Map();
  rafQueue = [];
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    if (id >= 1 && id <= rafQueue.length) rafQueue[id - 1] = null;
  }) as typeof cancelAnimationFrame;
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      ro.cb = cb;
    }
    observe(el: Element) {
      ro.targets.add(el);
    }
    unobserve(el: Element) {
      ro.targets.delete(el);
    }
    disconnect() {
      ro.targets.clear();
    }
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalRO;
  globalThis.requestAnimationFrame = OriginalRAF;
  globalThis.cancelAnimationFrame = OriginalCAF;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function measure() {
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    const size = id === 'client' ? CLIENT_SIZE : (sizes.get(id) ?? COLLAPSED);
    return {
      target: el,
      borderBoxSize: [{ blockSize: size, inlineSize: size }],
      contentRect: { height: size, width: size },
    } as unknown as ResizeObserverEntry;
  });
  ro.cb?.(entries, {} as ResizeObserver);
}

/**
 * 项内容用一个自己持有展开状态的子组件渲染，与示例的结构一致：
 * 列表的项 DOM 不在外层组件的渲染树上，状态只能放在项内部。
 */
const Bubble = defineComponent({
  props: {
    item: { type: Object as PropType<Item>, required: true },
    initialExpanded: { type: Boolean, default: false },
  },
  setup(props) {
    const open = ref(props.initialExpanded);
    return () =>
      h('div', { class: 'bubble' }, [
        h('div', null, props.item.text),
        h(
          'button',
          { onClick: () => { open.value = !open.value; } },
          open.value ? '收起' : '展开',
        ),
      ]);
  },
});

function mount(list: Item[]) {
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
              list,
              itemKey: 'id',
              itemPreSize: COLLAPSED,
            },
            {
              default: ({ itemData }: { itemData: Item }) =>
                h(Bubble, { item: itemData }),
            },
          );
      },
    }),
  );
  app.mount(container);

  const clientEl = container.querySelector(
    '[data-id="client"]',
  ) as HTMLElement;
  let scrollValue = 0;
  Object.defineProperty(clientEl, 'scrollTop', {
    configurable: true,
    get: () => scrollValue,
    set: (v: number) => {
      const max = Math.max(0, listRef.value.getState().listTotalSize - CLIENT_SIZE);
      scrollValue = Math.min(Math.max(v, 0), max);
    },
  });

  measure();
  measure();
  return { app, container, clientEl, listRef };
}

function scrollTo(clientEl: HTMLElement, offset: number) {
  clientEl.scrollTop = offset;
  clientEl.dispatchEvent(new Event('scroll'));
}

/** 与视口相交的项，DOM 里是否都在 */
function domCoversViewport(
  listRef: Ref<any>,
  clientEl: HTMLElement,
  list: Item[],
) {
  const present = new Set(
    Array.from(clientEl.querySelectorAll('div[data-id]'))
      .map((el) => (el as HTMLElement).dataset.id!)
      .filter((id) => !SLOT_IDS.includes(id)),
  );

  const offset = clientEl.scrollTop;
  const viewBottom = offset + CLIENT_SIZE;
  const missing: string[] = [];
  const empty: string[] = [];

  for (let i = 0; i < list.length; i += 1) {
    const pos = listRef.value.getItemPosByIndex(i);
    if (pos.bottom <= offset || pos.top >= viewBottom) continue;
    const id = list[i]!.id;
    if (!present.has(id)) {
      missing.push(`${id}@${i}`);
      continue;
    }
    // DOM 在，但插槽内容没挂上去也是白的
    const el = clientEl.querySelector(`div[data-id="${id}"]`);
    if (!el || el.textContent === '') empty.push(`${id}@${i}`);
  }

  return { ok: missing.length === 0 && empty.length === 0, missing, empty, offset, viewBottom };
}

describe('Vue 层：展开超高项后的 DOM 一致性', () => {
  it('展开中段一项到三屏，再细步向下滚过它，每一步 DOM 都齐全', async () => {
    const list = makeList(200);
    const { app, clientEl, listRef } = mount(list);
    await nextTick();

    const TALL = 110;
    scrollTo(clientEl, listRef.value.getItemPosByIndex(TALL).top - 100);
    measure();
    flushRaf();
    await nextTick();

    // 展开：这一项报上三屏的高度
    sizes.set(list[TALL]!.id, VERY_TALL);
    measure();
    flushRaf();
    await nextTick();

    const pos = listRef.value.getItemPosByIndex(TALL);
    const to = listRef.value.getItemPosByIndex(TALL + 4).bottom;
    for (let y = pos.top; y <= to; y += 25) {
      scrollTo(clientEl, y);
      measure();
      await nextTick();

      const dom = domCoversViewport(listRef, clientEl, list);
      expect(
        dom.ok,
        `滚到 ${y} 视口 [${dom.offset}, ${dom.viewBottom})：` +
          `缺 DOM=[${dom.missing.join(', ')}] 空内容=[${dom.empty.join(', ')}]`,
      ).toBe(true);
    }

    app.unmount();
  });

  it('项反复进出渲染窗口后，插槽内容仍能正常挂载', async () => {
    const list = makeList(120);
    const { app, clientEl, listRef } = mount(list);
    await nextTick();

    const TALL = 60;
    sizes.set(list[TALL]!.id, VERY_TALL);

    // 来回滚动多轮，让同一批项反复进出窗口
    for (let round = 0; round < 3; round += 1) {
      scrollTo(clientEl, listRef.value.getItemPosByIndex(TALL).top);
      measure();
      await nextTick();

      scrollTo(clientEl, listRef.value.getItemPosByIndex(TALL + 6).bottom);
      measure();
      await nextTick();

      const dom = domCoversViewport(listRef, clientEl, list);
      expect(
        dom.ok,
        `第 ${round + 1} 轮：缺 DOM=[${dom.missing.join(', ')}] 空内容=[${dom.empty.join(', ')}]`,
      ).toBe(true);
    }

    app.unmount();
  });
});
