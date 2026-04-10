import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type Ref,
} from 'vue-demi';
import { VirtList } from '../src/index';

interface ListItem {
  id: string;
  text: string;
}

function makeList(length: number): ListItem[] {
  return Array.from({ length }, (_, i) => ({
    id: String(i),
    text: `item-${i}`,
  }));
}

function getRenderedItemIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('div[data-id]'))
    .map((el) => el.getAttribute('data-id') || '')
    .filter((id) => /^\d+$/.test(id));
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

function mountVirtList() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const listRef: Ref<any> = ref(null);
  const list = makeList(320);
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
              itemPreSize: 20,
              fixed: true,
              buffer: 3,
            },
            {
              default: ({ index }: { index: number }) =>
                h('div', null, `item-${index}`),
            },
          );
      },
    }),
  );

  app.mount(container);
  return { app, container, listRef };
}

describe('Vue VirtList', () => {
  it('scrollToIndex updates rendered range without blank container', async () => {
    const { app, container, listRef } = mountVirtList();
    await nextTick();

    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    expect(clientEl).toBeTruthy();

    listRef.value?.scrollToIndex(140);
    clientEl.dispatchEvent(new Event('scroll'));
    await nextTick();

    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);
    expect(container.textContent).toContain('item-140');

    app.unmount();
  });

  it('scrollToTop/scrollToBottom and rapid scroll keep non-empty rendered items', async () => {
    vi.useFakeTimers();
    const { app, container, listRef } = mountVirtList();
    await nextTick();

    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    expect(clientEl).toBeTruthy();

    listRef.value?.scrollToBottom();
    vi.runAllTimers();
    clientEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);

    for (const offset of [120, 880, 1560, 2400, 3000]) {
      clientEl.scrollTop = offset;
      clientEl.dispatchEvent(new Event('scroll'));
    }
    await nextTick();
    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);

    listRef.value?.scrollToTop();
    vi.runAllTimers();
    clientEl.dispatchEvent(new Event('scroll'));
    await nextTick();
    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);
    expect(container.textContent).toContain('item-0');

    app.unmount();
  });
});
