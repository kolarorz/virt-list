/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Vue from 'vue';
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

const OriginalRO = globalThis.ResizeObserver;

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
});

/** Vue 2 没有 createApp，用实例 + $mount 挂到容器里 */
function mount(component: any, props: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const mountPoint = document.createElement('div');
  container.appendChild(mountPoint);

  const onScroll = vi.fn<(e: VirtScrollEvent) => void>();
  const vm = new Vue({
    render(h: any) {
      return h(component, { ref: 'inst', props, on: { scroll: onScroll } });
    },
  });
  vm.$mount(mountPoint);

  return { vm, onScroll, api: () => vm.$refs.inst as any };
}

/*
 * Vue 2 没有 emits 声明，事件名是纯字符串——写错了类型检查一点也拦不住。
 * 这里从 `on: { scroll }` 这一端确认它真的能收到。
 */
describe('Vue2: @scroll', () => {
  it('VirtList 触发 scroll，载荷是普通对象而不是 Event', () => {
    const { onScroll, api } = mount(VirtList, {
      list: makeList(50),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderItem: (item: Item, _i: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });
    onScroll.mockClear();

    api().scrollFromUser(400);

    expect(onScroll).toHaveBeenCalledTimes(1);
    const e = onScroll.mock.calls[0]![0];
    expect(e).not.toBeInstanceOf(Event);
    expect(e).toMatchObject({ offset: 400, direction: 'end', source: 'user' });
  });

  it('VirtGrid 触发 scroll', () => {
    const { onScroll, api } = mount(VirtGrid, {
      list: makeList(60),
      gridItems: 3,
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderItem: (item: Item, _r: number, _l: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });
    onScroll.mockClear();

    api().scrollFromUser(200);

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0]![0]).toMatchObject({
      offset: 200,
      source: 'user',
    });
  });

  it('VirtTree 触发 scroll', () => {
    const { onScroll, api } = mount(VirtTree, {
      list: makeList(50).map((item) => ({ ...item, label: item.text })),
      estimatedSize: 32,
      fixedSize: true,
    });
    onScroll.mockClear();

    api().scrollFromUser(320);

    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(onScroll.mock.calls[0]![0]).toMatchObject({
      offset: 320,
      source: 'user',
    });
  });
});

/*
 * clientEl 逃生舱：给只认 DOM 元素的场合用（量位置、交给第三方库）。
 * 它必须是那个 data-id="client" 的 scrollport，不是组件根元素——
 * 原生 scroll 不冒泡，挂错地方就永远收不到。
 */
describe('Vue2: clientEl 逃生舱', () => {
  it('指向 scrollport 而不是根元素', () => {
    const { api } = mount(VirtList, {
      list: makeList(50),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      crossScroll: true,
      renderItem: (item: Item, _i: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });

    const clientEl = api().clientEl as HTMLElement;
    expect(clientEl).toBeTruthy();
    expect(clientEl.dataset.id).toBe('client');

    // 交叉轴的 scrollport 是它的子节点：横向滚动位置在那上面读写
    const cross = api().scrollContentEl as HTMLElement;
    expect(cross.parentElement).toBe(clientEl);
    expect(cross.style.overflowX).toBe('auto');
  });
});
