/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { VirtList, VirtGrid, VirtTree } from '../src/index';
import type { VirtScrollEvent } from '../src/index';

interface Item {
  id: string;
  text: string;
}

function makeList(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    text: `item-${i}`,
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
  document.body.innerHTML = '';
});

/**
 * 挂一个组件并绑上 @scroll，返回实例引用与 spy。
 *
 * 用 renderItem prop 而不是 default slot：库是命令式挂载 slot 的，
 * 走 slot 会刷一堆「Slot invoked outside of the render function」告警。
 */
function mount(component: any, props: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const onScroll = vi.fn<(e: VirtScrollEvent) => void>();
  const instRef: Ref<any> = ref(null);
  const app = createApp(
    defineComponent({
      setup() {
        return () => h(component, { ref: instRef, onScroll, ...props });
      },
    }),
  );
  app.mount(container);

  return { app, onScroll, instRef };
}

/*
 * Vue 侧的 emit 名是字符串，写错了类型检查未必拦得住（尤其没有 emits 声明的
 * Vue 2）。这里从模板监听器这一端确认 @scroll 真的能收到。
 */
describe('Vue: @scroll', () => {
  it('VirtList 触发 scroll，载荷是普通对象而不是 Event', async () => {
    const { app, onScroll, instRef } = mount(VirtList, {
      list: makeList(50),
      itemKey: 'id',
      itemPreSize: 40,
      fixed: true,
      renderItem: (item: Item, _i: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });
    await nextTick();
    onScroll.mockClear();

    instRef.value!.scrollFromUser(400);
    await nextTick();

    expect(onScroll).toHaveBeenCalledTimes(1);
    const e = onScroll.mock.calls[0]![0];
    expect(e).not.toBeInstanceOf(Event);
    expect(e).toMatchObject({ offset: 400, direction: 'end', source: 'user' });

    app.unmount();
  });

  it('VirtGrid 触发 scroll', async () => {
    const { app, onScroll, instRef } = mount(VirtGrid, {
      list: makeList(60),
      gridItems: 3,
      itemKey: 'id',
      itemPreSize: 40,
      fixed: true,
      renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });
    await nextTick();
    onScroll.mockClear();

    instRef.value!.scrollFromUser(200);
    await nextTick();

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0]![0]).toMatchObject({
      offset: 200,
      source: 'user',
    });

    app.unmount();
  });

  it('VirtTree 触发 scroll', async () => {
    const { app, onScroll, instRef } = mount(VirtTree, {
      list: makeList(50).map((item) => ({ ...item, label: item.text })),
      itemPreSize: 32,
      fixed: true,
    });
    await nextTick();
    onScroll.mockClear();

    instRef.value!.scrollFromUser(320);
    await nextTick();

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0]![0]).toMatchObject({
      offset: 320,
      source: 'user',
    });

    app.unmount();
  });
});
