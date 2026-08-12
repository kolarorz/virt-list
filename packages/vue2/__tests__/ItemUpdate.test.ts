/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Vue from 'vue';
import { VirtList, VirtGrid } from '../src/index';

/**
 * 锁「同一个 key 换了新对象后，插槽内容跟着更新」，与 vue / react / react-legacy
 * 三个包的同名用例对齐。
 *
 * vue2 的挂载器给每个挂载点开一个 Vue 实例，靠依赖收集自更新 —— 那只覆盖
 * 「原地改响应式属性」。不可变替换（`list = list.map(...)`）后闭包里的旧对象
 * 再也不会变，只能靠 core 的 `updateItem` 通道重新挂一次。
 */

interface Item {
  id: string;
  label: string;
}

function makeList(n: number, prefix = '原始'): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    label: `${prefix}${i}`,
  }));
}

let roCallback: ResizeObserverCallback | null = null;
const OriginalRO = globalThis.ResizeObserver;

beforeEach(() => {
  roCallback = null;
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      roCallback = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function flushResize(id: string, size: number) {
  const target = document.createElement('div');
  target.dataset.id = id;
  roCallback?.(
    [
      {
        target,
        borderBoxSize: [{ blockSize: size, inlineSize: size }],
        contentRect: { height: size, width: size },
      } as unknown as ResizeObserverEntry,
    ],
    {} as ResizeObserver,
  );
}

function texts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.cell')).map(
    (el) => el.textContent ?? '',
  );
}

describe('Vue2 不可变替换', () => {
  it('VirtList：list.map 出全新对象后内容更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      data: () => ({ list: makeList(30) }),
      render(h: any) {
        return h(VirtList as any, {
          props: {
            list: (this as any).list,
            itemKey: 'id',
            estimatedSize: 40,
          },
          scopedSlots: {
            default: ({ itemData }: any) =>
              h('div', { class: 'cell' }, itemData.label),
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 400);
    await Vue.nextTick();

    expect(texts(container)).toContain('原始0');

    (vm as any).list = makeList(30).map((it) =>
      it.id === '0' ? { ...it, label: '改过了' } : it,
    );
    await Vue.nextTick();

    expect(texts(container)).toContain('改过了');
    expect(texts(container)).not.toContain('原始0');

    vm.$destroy();
  });

  /**
   * 单元格容器按位置复用，mountKey 因此也按位置取。用数据 key 的话，删掉中间一项后
   * 内容要进别的容器，挂载器会先卸掉旧容器的内容再挂当前这个 —— 白白重建挂载点。
   */
  it('VirtGrid：删除中间项后内容前移，且挂载点被复用', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      data: () => ({ list: makeList(9) }),
      render(h: any) {
        return h(VirtGrid as any, {
          props: {
            list: (this as any).list,
            gridItems: 3,
            itemKey: 'id',
            estimatedSize: 40,
          },
          scopedSlots: {
            default: ({ itemData }: any) =>
              h('div', { class: 'cell' }, `[${itemData.id}]`),
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 400);
    await Vue.nextTick();

    expect(texts(container).join('')).toBe('[0][1][2][3][4][5][6][7][8]');
    const secondCell = container.querySelectorAll('.cell')[1]!.parentElement;

    (vm as any).list = makeList(9).filter((it) => it.id !== '1');
    await Vue.nextTick();

    expect(texts(container).join('')).toBe('[0][2][3][4][5][6][7][8]');
    expect(container.querySelectorAll('.cell')[1]!.parentElement).toBe(secondCell);

    vm.$destroy();
  });

  it('VirtGrid：单元格内容更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mountPoint = document.createElement('div');
    container.appendChild(mountPoint);

    const vm = new Vue({
      data: () => ({ list: makeList(9) }),
      render(h: any) {
        return h(VirtGrid as any, {
          props: {
            list: (this as any).list,
            gridItems: 3,
            itemKey: 'id',
            estimatedSize: 40,
          },
          scopedSlots: {
            default: ({ itemData }: any) =>
              h('div', { class: 'cell' }, itemData.label),
          },
        });
      },
    });
    vm.$mount(mountPoint);
    flushResize('client', 400);
    await Vue.nextTick();

    expect(texts(container)).toContain('原始0');

    (vm as any).list = makeList(9, '改过');
    await Vue.nextTick();

    expect(texts(container)).toContain('改过0');
    expect(texts(container)).not.toContain('原始0');

    vm.$destroy();
  });
});
