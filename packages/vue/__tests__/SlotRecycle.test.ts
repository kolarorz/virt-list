/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  reactive,
  ref,
  type Ref,
} from 'vue';
import { VirtList, VirtGrid, VirtTree } from '../src/index';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  } as any;
});
afterEach(() => { document.body.innerHTML = ''; });

/**
 * 挂载点是否还活着：Vue 3 的 `render(vnode, el)` 会把 vnode 挂在容器的 `_vnode`
 * 上，`render(null, el)` 卸载时清掉。脱离文档却仍持有 `_vnode` 的容器，就是一个
 * 连着 render effect 的 SlotRenderer 在白占内存。
 */
const aliveDetached = (els: Iterable<HTMLElement>) =>
  [...els].filter((el) => !el.isConnected && (el as any)._vnode).length;

describe('VirtList 插槽随滚动回收', () => {
  function mountList(len = 1000) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const listRef: Ref<any> = ref(null);
    const list = reactive(
      Array.from({ length: len }, (_, i) => ({ id: String(i), text: `t${i}` })),
    );
    const renders: Record<string, number> = {};
    const app = createApp(defineComponent({
      setup() {
        return () => h(VirtList as any, {
          ref: listRef, list, itemKey: 'id',
          estimatedSize: 20, fixedSize: true, buffer: 2,
        }, {
          default: ({ itemData }: any) => {
            renders[itemData.id] = (renders[itemData.id] ?? 0) + 1;
            return h('div', null, itemData.text);
          },
        });
      },
    }));
    app.mount(container);
    return { app, container, listRef, list, renders };
  }

  it('滚出渲染窗口的项不再响应数据变更', async () => {
    const { app, container, listRef, list, renders } = mountList();
    await nextTick();
    expect(renders['0']).toBeGreaterThan(0);

    listRef.value.scrollFromUser(6000);
    await nextTick();
    expect(container.querySelector('[data-id="0"]')).toBeNull();

    const before = renders['0']!;
    (list[0] as any).text = 'mutated';
    await nextTick();

    // 还会被重渲染就说明它的 render effect 还挂在脱离文档的节点上
    expect(renders['0']).toBe(before);
    app.unmount();
  });

  it('长距离滚动不留下脱离文档的活挂载点', async () => {
    const { app, container, listRef } = mountList(2000);
    await nextTick();

    const seen = new Set<HTMLElement>();
    const collect = () => container
      .querySelectorAll('[data-id]')
      .forEach((el) => {
        if (/^\d+$/.test(el.getAttribute('data-id')!)) seen.add(el as HTMLElement);
      });
    collect();
    for (let off = 0; off < 20000; off += 400) {
      listRef.value.scrollFromUser(off);
      await nextTick();
      collect();
    }

    expect(seen.size).toBeGreaterThan(20);
    expect(aliveDetached(seen)).toBe(0);
    app.unmount();
  });

  it('滚回来的项能正常重新挂载', async () => {
    const { app, container, listRef } = mountList();
    await nextTick();

    listRef.value.scrollFromUser(6000);
    await nextTick();
    listRef.value.scrollFromUser(0);
    await nextTick();

    expect(container.textContent).toContain('t0');
    app.unmount();
  });
});

describe('VirtGrid 单元格随行回收', () => {
  it('行滚出窗口时它下面所有单元格的挂载点一起回收', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const gridRef: Ref<any> = ref(null);
    const list = Array.from({ length: 2000 }, (_, i) => ({ id: String(i) }));
    const app = createApp(defineComponent({
      setup() {
        return () => h(VirtGrid as any, {
          ref: gridRef, list, itemKey: 'id', gridItems: 4,
          estimatedSize: 40, fixedSize: true, buffer: 2,
        }, { default: ({ itemData }: any) => h('span', null, itemData.id) });
      },
    }));
    app.mount(container);
    await nextTick();

    // 单元格容器是行元素的子节点
    const seen = new Set<HTMLElement>();
    const collect = () => container
      .querySelectorAll('[data-id] > div')
      .forEach((el) => seen.add(el as HTMLElement));
    collect();
    for (let off = 0; off < 12000; off += 400) {
      gridRef.value.scrollToOffset(off);
      await nextTick();
      collect();
    }

    expect(seen.size).toBeGreaterThan(20);
    expect(aliveDetached(seen)).toBe(0);
    app.unmount();
  });
});

describe('VirtTree 节点插槽随滚动回收', () => {
  it('节点滚出窗口时它的插槽挂载点被回收', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const treeRef: Ref<any> = ref(null);
    const list = Array.from({ length: 1500 }, (_, i) => ({
      key: String(i), title: `n${i}`,
    }));
    const app = createApp(defineComponent({
      setup() {
        return () => h(VirtTree as any, {
          ref: treeRef, list, itemKey: 'key',
          estimatedSize: 30, fixedSize: true, buffer: 2,
        }, { content: ({ node }: any) => h('span', null, node.title) });
      },
    }));
    app.mount(container);
    await nextTick();

    const seen = new Set<HTMLElement>();
    const collect = () => container
      .querySelectorAll('.virt-tree-item .virt-tree-node')
      .forEach((el) => seen.add(el as HTMLElement));
    collect();
    for (let off = 0; off < 12000; off += 300) {
      treeRef.value.scrollToOffset(off);
      await nextTick();
      collect();
    }

    expect(seen.size).toBeGreaterThan(20);
    expect(aliveDetached(seen)).toBe(0);
    app.unmount();
  });
});
