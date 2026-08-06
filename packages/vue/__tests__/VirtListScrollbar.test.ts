import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { VirtList } from '../src/index';

/**
 * 框架层对 `scrollbar` 的透传。
 *
 * 绑定层本身没有任何自绘滚动条的逻辑——DOM 与交互全在 vanilla 里，
 * 这里要验的只有一件事：prop 确实传到了下面，没有在透传清单里漏掉。
 * 漏掉不会报错，只会静默退回 native，非常难发现。
 */

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

afterEach(() => {
  document.body.innerHTML = '';
});

function mount(props: Record<string, unknown>) {
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
              list: Array.from({ length: 200 }, (_, i) => ({
                id: String(i),
                text: `item-${i}`,
              })),
              itemKey: 'id',
              itemPreSize: 20,
              fixed: true,
              ...props,
            },
            { default: ({ index }: { index: number }) => h('div', null, index) },
          );
      },
    }),
  );
  app.mount(container);
  return { app, container };
}

describe('Vue VirtList 的 scrollbar 透传', () => {
  it('scrollbar="custom" 建出自绘布局与滚动条', async () => {
    const { app, container } = mount({ scrollbar: 'custom' });
    await nextTick();

    const clientEl = container.querySelector(
      '[data-id="client"]',
    ) as HTMLElement;
    expect(clientEl.style.overflow).toBe('hidden');
    expect(clientEl.className).toContain('virt-list__client--custom');
    expect(container.querySelector('.virt-scrollbar__thumb')).toBeTruthy();

    app.unmount();
  });

  it('默认仍是 native，现有用法零影响', async () => {
    const { app, container } = mount({});
    await nextTick();

    const clientEl = container.querySelector(
      '[data-id="client"]',
    ) as HTMLElement;
    expect(clientEl.style.overflow).toBe('auto');
    expect(container.querySelector('.virt-scrollbar')).toBeNull();

    app.unmount();
  });
});
