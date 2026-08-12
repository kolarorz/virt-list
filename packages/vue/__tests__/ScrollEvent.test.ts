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

  return { app, container, onScroll, instRef };
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
      estimatedSize: 40,
      fixedSize: true,
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
      estimatedSize: 40,
      fixedSize: true,
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
      estimatedSize: 32,
      fixedSize: true,
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

/*
 * 声明 emits.scroll 会拦掉「落到根元素的原生 scroll」——这就是当初把 click 改叫
 * nodeClick 的那个坑（见 VirtTree.ts 的 emits 注释）。取 scroll 这个名字的前提是
 * **根元素压根不会派发原生 scroll**，而这条依赖一个实现细节：根元素是个没有
 * overflow 的 wrapper。
 *
 * 前提写在注释里就只是个说法，将来谁给根 div 加上 overflow 也不会有任何东西提醒。
 * 这里把它变成断言。
 */
describe('emits.scroll 拦不到任何东西的前提', () => {
  it('组件根元素不是 scrollport，主轴的 scrollport 是它的子节点 clientEl', () => {
    const { app, container, instRef } = mount(VirtList, {
      list: makeList(50),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderItem: (item: Item, _i: number, el: HTMLElement) => {
        el.textContent = item.text;
      },
    });

    const root = container.firstElementChild as HTMLElement;
    // 根元素上没有任何 overflow 声明 → overflow 保持 visible → 不构成 scrollport，
    // 永远不派发 scroll。（jsdom 的 getComputedStyle 不解析 overflow，
    // 只能查库自己写上去的那份 inline style，而库正是在那里设样式的。）
    expect(root.style.overflow).toBe('');
    expect(root.getAttribute('style')).not.toContain('overflow');

    // 真正的 scrollport 在根元素**下面**，而原生 scroll 不冒泡，到不了根元素
    const clientEl = root.querySelector('[data-id="client"]') as HTMLElement;
    expect(clientEl).toBeTruthy();
    expect(clientEl).not.toBe(root);
    expect(clientEl.parentElement).toBe(root);

    // 交叉轴（横向）的 scrollport 又在 clientEl 下面一层
    const cross = instRef.value!.scrollContentEl as HTMLElement;
    expect(cross.parentElement).toBe(clientEl);
    expect(cross.style.overflowX).toBe('auto');
    // 它就是 ref 上那个逃生舱——真要挂原生监听，挂到这上面才有意义
    expect(instRef.value!.clientEl).toBe(clientEl);

    app.unmount();
  });
});
