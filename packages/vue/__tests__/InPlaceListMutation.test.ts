/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick, reactive, ref, type Ref } from 'vue';
import { VirtList, VirtGrid, VirtTree } from '../src/index';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  } as any;
});
afterEach(() => { document.body.innerHTML = ''; });

/**
 * 三个组件都要盯 `list.length`，不能只盯引用。
 *
 * Vue 的 getter 依赖是 `props.list` 这个引用本身 —— 在同一个数组上
 * `splice` / `push` 不会让它重新触发，于是 core 拿不到新数据。
 */
function mountWith(comp: any, props: Record<string, unknown>, slots: any) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const apiRef: Ref<any> = ref(null);
  const app = createApp(defineComponent({
    setup() {
      return () => h(comp, { ref: apiRef, ...props }, slots);
    },
  }));
  app.mount(container);
  return { app, container, apiRef };
}

describe('原地修改 list 也能同步到 core', () => {
  it('VirtList: splice', async () => {
    const list = reactive(Array.from({ length: 100 }, (_, i) => ({ id: String(i) })));
    const { app, apiRef } = mountWith(VirtList, {
      list, itemKey: 'id', estimatedSize: 40, fixedSize: true,
    }, { default: ({ itemData }: any) => h('div', null, itemData.id) });
    await nextTick();
    expect(apiRef.value.getTotalSize()).toBe(4000);

    list.splice(0, 80);
    await nextTick();
    expect(apiRef.value.getTotalSize()).toBe(800);
    app.unmount();
  });

  it('VirtGrid: splice', async () => {
    const list = reactive(Array.from({ length: 100 }, (_, i) => ({ id: String(i) })));
    const { app, apiRef } = mountWith(VirtGrid, {
      list, itemKey: 'id', gridItems: 4, estimatedSize: 40, fixedSize: true,
    }, { default: ({ itemData }: any) => h('div', null, itemData.id) });
    await nextTick();
    // 100 项 / 每行 4 个 = 25 行
    expect(apiRef.value.getTotalSize()).toBe(25 * 40);

    list.splice(0, 80);
    await nextTick();
    expect(apiRef.value.getTotalSize()).toBe(5 * 40);
    app.unmount();
  });

  it('VirtGrid: push', async () => {
    const list = reactive(Array.from({ length: 8 }, (_, i) => ({ id: String(i) })));
    const { app, apiRef } = mountWith(VirtGrid, {
      list, itemKey: 'id', gridItems: 4, estimatedSize: 40, fixedSize: true,
    }, { default: ({ itemData }: any) => h('div', null, itemData.id) });
    await nextTick();
    expect(apiRef.value.getTotalSize()).toBe(2 * 40);

    list.push({ id: 'new' });
    await nextTick();
    expect(apiRef.value.getTotalSize()).toBe(3 * 40);
    app.unmount();
  });

  it('VirtTree: splice', async () => {
    const list = reactive(
      Array.from({ length: 100 }, (_, i) => ({ key: String(i), title: `n${i}` })),
    );
    const { app, container, apiRef } = mountWith(VirtTree, {
      list, itemKey: 'key', estimatedSize: 30, fixedSize: true,
    }, {});
    await nextTick();
    expect(apiRef.value.getTotalSize()).toBe(3000);

    list.splice(0, 90);
    await nextTick();
    expect(apiRef.value.getTotalSize()).toBe(300);
    // 剩下的节点确实换成了新的那一批
    expect(container.querySelector('.virt-tree-item')?.getAttribute('data-id'))
      .toBe('90');
    app.unmount();
  });

  it('换新数组引用的老路径仍然有效', async () => {
    const listRef = ref(Array.from({ length: 40 }, (_, i) => ({ id: String(i) })));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const apiRef: Ref<any> = ref(null);
    const app = createApp(defineComponent({
      setup() {
        return () => h(VirtGrid as any, {
          ref: apiRef, list: listRef.value, itemKey: 'id',
          gridItems: 4, estimatedSize: 40, fixedSize: true,
        }, { default: ({ itemData }: any) => h('div', null, itemData.id) });
      },
    }));
    app.mount(container);
    await nextTick();
    expect(apiRef.value.getTotalSize()).toBe(10 * 40);

    listRef.value = Array.from({ length: 8 }, (_, i) => ({ id: `x${i}` }));
    await nextTick();
    expect(apiRef.value.getTotalSize()).toBe(2 * 40);
    app.unmount();
  });

  it('长度不变但内容整体换掉（引用变了）也能同步', async () => {
    const listRef = ref(Array.from({ length: 20 }, (_, i) => ({ key: String(i), title: `a${i}` })));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(defineComponent({
      setup() {
        return () => h(VirtTree as any, {
          list: listRef.value, itemKey: 'key', estimatedSize: 30, fixedSize: true,
        }, {});
      },
    }));
    app.mount(container);
    await nextTick();

    listRef.value = Array.from({ length: 20 }, (_, i) => ({ key: `z${i}`, title: `b${i}` }));
    await nextTick();
    expect(container.querySelector('.virt-tree-item')?.getAttribute('data-id'))
      .toBe('z0');
    app.unmount();
  });
});
