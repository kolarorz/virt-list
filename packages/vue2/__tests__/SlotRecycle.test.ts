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
 * 挂载点是否还活着：vue2 适配器给每个挂载点建一个 Vue 实例并把它的 `$el`
 * 塞进容器，Vue 2 会在 `$el.__vue__` 上留下实例引用。脱离文档却没被 `$destroy`
 * 的实例，就是一个还订阅着数据的 watcher 在白占内存。
 */
function aliveDetached(els: Iterable<HTMLElement>): number {
  let n = 0;
  for (const el of els) {
    const inst = (el as any).__vue__;
    if (inst && !el.isConnected && inst._isDestroyed !== true) n += 1;
  }
  return n;
}

/** Vue 2 的 $mount 会替换掉传入的容器元素，真正的根在 vm.$el 上 */
function mountRoot(render: (h: any) => any) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const vm: any = new Vue({ render }).$mount(container);
  return { vm, root: vm.$el as HTMLElement };
}

describe('Vue2 VirtList 插槽随滚动回收', () => {
  it('长距离滚动不留下未销毁的插槽实例', async () => {
    const list = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i), text: `t${i}`,
    }));
    const listRef: { current?: any } = {};
    const { vm, root } = mountRoot((h) => h(VirtList as any, {
      ref: 'vl',
      props: { list, itemKey: 'id', estimatedSize: 20, fixedSize: true, buffer: 2 },
      scopedSlots: { default: ({ itemData }: any) => h('div', itemData.text) },
    }));
    await tick();
    listRef.current = vm.$refs.vl;

    const seen = new Set<HTMLElement>();
    const collect = () => root.querySelectorAll('[data-id]').forEach((el) => {
      if (!/^\d+$/.test(el.getAttribute('data-id')!)) return;
      const child = el.firstElementChild as HTMLElement | null;
      if (child) seen.add(child);
    });
    collect();
    for (let off = 0; off < 12000; off += 300) {
      listRef.current.scrollFromUser(off);
      await tick();
      collect();
    }

    expect(seen.size).toBeGreaterThan(20);
    expect(aliveDetached(seen)).toBe(0);
    vm.$destroy();
  });

  it('滚回来的项能正常重新挂载', async () => {
    const list = Array.from({ length: 500 }, (_, i) => ({
      id: String(i), text: `t${i}`,
    }));
    const { vm, root } = mountRoot((h) => h(VirtList as any, {
      ref: 'vl',
      props: { list, itemKey: 'id', estimatedSize: 20, fixedSize: true, buffer: 2 },
      scopedSlots: { default: ({ itemData }: any) => h('div', itemData.text) },
    }));
    await tick();

    vm.$refs.vl.scrollFromUser(6000);
    await tick();
    vm.$refs.vl.scrollFromUser(0);
    await tick();

    expect(root.textContent).toContain('t0');
    vm.$destroy();
  });
});

describe('Vue2 VirtGrid 单元格随行回收', () => {
  it('行滚出窗口时它下面所有单元格的实例一起销毁', async () => {
    const list = Array.from({ length: 2000 }, (_, i) => ({ id: String(i) }));
    const { vm, root } = mountRoot((h) => h(VirtGrid as any, {
      ref: 'g',
      props: {
        list, itemKey: 'id', gridItems: 4,
        estimatedSize: 40, fixedSize: true, buffer: 2,
      },
      scopedSlots: { default: ({ itemData }: any) => h('span', itemData.id) },
    }));
    await tick();

    const seen = new Set<HTMLElement>();
    const collect = () => root
      .querySelectorAll('[data-id] > div')
      .forEach((el) => {
        const child = el.firstElementChild as HTMLElement | null;
        if (child) seen.add(child);
      });
    collect();
    for (let off = 0; off < 12000; off += 400) {
      vm.$refs.g.scrollToOffset(off);
      await tick();
      collect();
    }

    expect(seen.size).toBeGreaterThan(20);
    expect(aliveDetached(seen)).toBe(0);
    vm.$destroy();
  });
});

describe('Vue2 VirtTree 节点插槽随滚动回收', () => {
  it('节点滚出窗口时它的插槽实例被销毁', async () => {
    const list = Array.from({ length: 1500 }, (_, i) => ({
      key: String(i), title: `n${i}`,
    }));
    const { vm, root } = mountRoot((h) => h(VirtTree as any, {
      ref: 't',
      props: { list, itemKey: 'key', estimatedSize: 30, fixedSize: true, buffer: 2 },
      scopedSlots: { content: ({ node }: any) => h('span', node.title) },
    }));
    await tick();

    const seen = new Set<HTMLElement>();
    const collect = () => root
      .querySelectorAll('.virt-tree-item .virt-tree-node')
      .forEach((el) => {
        const child = el.firstElementChild as HTMLElement | null;
        if (child) seen.add(child);
      });
    collect();
    for (let off = 0; off < 12000; off += 300) {
      vm.$refs.t.scrollToOffset(off);
      await tick();
      collect();
    }

    expect(seen.size).toBeGreaterThan(20);
    expect(aliveDetached(seen)).toBe(0);
    vm.$destroy();
  });
});
