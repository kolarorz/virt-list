/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Vue from 'vue';
import { VirtList, VirtGrid, VirtTree } from '../src/index';

const OriginalRO = globalThis.ResizeObserver;
beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  } as unknown as typeof ResizeObserver;
  Vue.config.productionTip = false;
  Vue.config.devtools = false;
});
afterEach(() => {
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
});

const tick = () => new Promise<void>((r) => Vue.nextTick(() => r()));

/**
 * 三个组件都要盯 `list.length`，不能只盯引用 —— 在同一个数组上
 * `splice` / `push` 不会改变引用，只盯引用的话 core 拿不到新数据。
 */
function mountWith(comp: any, props: Record<string, unknown>, scopedSlots: any = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const vm: any = new Vue({
    data: () => ({ props }),
    render(h: any) {
      return h(comp, { ref: 'api', props: this.props, scopedSlots });
    },
  }).$mount(container);
  return { vm, root: vm.$el as HTMLElement };
}

describe('Vue2 原地修改 list 也能同步到 core', () => {
  it('VirtList: splice', async () => {
    const list = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
    const { vm } = mountWith(VirtList, {
      list, itemKey: 'id', estimatedSize: 40, fixedSize: true,
    });
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(4000);

    list.splice(0, 80);
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(800);
    vm.$destroy();
  });

  it('VirtGrid: splice', async () => {
    const list = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
    const { vm } = mountWith(VirtGrid, {
      list, itemKey: 'id', gridItems: 4, estimatedSize: 40, fixedSize: true,
    });
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(25 * 40);

    list.splice(0, 80);
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(5 * 40);
    vm.$destroy();
  });

  it('VirtGrid: push', async () => {
    const list = Array.from({ length: 8 }, (_, i) => ({ id: String(i) }));
    const { vm } = mountWith(VirtGrid, {
      list, itemKey: 'id', gridItems: 4, estimatedSize: 40, fixedSize: true,
    });
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(2 * 40);

    list.push({ id: 'new' });
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(3 * 40);
    vm.$destroy();
  });

  it('VirtTree: splice', async () => {
    const list = Array.from({ length: 100 }, (_, i) => ({
      key: String(i), title: `n${i}`,
    }));
    const { vm, root } = mountWith(VirtTree, {
      list, itemKey: 'key', estimatedSize: 30, fixedSize: true,
    });
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(3000);

    list.splice(0, 90);
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(300);
    expect(root.querySelector('.virt-tree-item')?.getAttribute('data-id')).toBe('90');
    vm.$destroy();
  });

  it('换新数组引用的老路径仍然有效', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const vm: any = new Vue({
      data: () => ({ list: Array.from({ length: 40 }, (_, i) => ({ id: String(i) })) }),
      render(h: any) {
        return h(VirtGrid as any, {
          ref: 'api',
          props: {
            list: this.list, itemKey: 'id', gridItems: 4,
            estimatedSize: 40, fixedSize: true,
          },
        });
      },
    }).$mount(container);
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(10 * 40);

    vm.list = Array.from({ length: 8 }, (_, i) => ({ id: `x${i}` }));
    await tick();
    expect(vm.$refs.api.getTotalSize()).toBe(2 * 40);
    vm.$destroy();
  });
});
