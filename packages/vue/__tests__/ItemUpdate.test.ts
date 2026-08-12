import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  shallowRef,
  withCtx,
  type App,
} from 'vue';
import { VirtList, VirtGrid } from '../src/index';

/**
 * 锁「不可变替换 list 后，可见项的插槽内容跟着更新」。
 *
 * 与 SlotStreaming.test.ts 的分工：那条锁的是**原地改响应式属性**
 * （`item.text += 'x'`），靠 SlotRenderer 的依赖收集自更新。这条锁的是
 * **整个数组换成新对象**（`list.map(...)`）—— 同一个 key 换了新对象，
 * 插槽闭包里捕获的旧对象再也不会变，任何 render effect 都不会重跑，
 * 只能靠 core 的 `updateItem` 通道重新挂一次（见 vanilla 的 _patch）。
 *
 * 插槽写成 `withCtx(...) + _: 1` 是在模拟 SFC `<template #default>` 的编译产物，
 * 也就是文档站与真实使用的形态。
 */

interface Item {
  id: number;
  label: string;
}

const CLIENT_SIZE = 400;
const ITEM_SIZE = 40;

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = {
  cb: null,
  targets: new Set(),
};
const OriginalRO = globalThis.ResizeObserver;
let app: App | null = null;

beforeEach(() => {
  ro.cb = null;
  ro.targets = new Set();
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) {
      ro.cb = cb;
    }
    observe(el: Element) {
      ro.targets.add(el);
    }
    unobserve(el: Element) {
      ro.targets.delete(el);
    }
    disconnect() {
      ro.targets.clear();
    }
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  app?.unmount();
  app = null;
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function measure() {
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    const size = id === 'client' ? CLIENT_SIZE : ITEM_SIZE;
    return {
      target: el,
      borderBoxSize: [{ blockSize: size, inlineSize: size }],
      contentRect: { height: size, width: size },
    } as unknown as ResizeObserverEntry;
  });
  ro.cb?.(entries, {} as ResizeObserver);
}

function texts(container: HTMLElement, selector = '.cell'): string[] {
  return Array.from(container.querySelectorAll(selector)).map(
    (el) => el.textContent ?? '',
  );
}

describe('Vue VirtList 不可变替换', () => {
  it('list.map 出全新对象后，可见项内容更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = ref<Item[]>(
      Array.from({ length: 30 }, (_, i) => ({ id: i, label: `原始${i}` })),
    );

    const Host = defineComponent({
      setup() {
        return () => {
          const slots: any = {
            default: withCtx(({ itemData }: { itemData: Item }) => [
              h('div', { class: 'cell' }, itemData.label),
            ]),
            _: 1,
          };
          return h(
            VirtList as any,
            { list: list.value, itemKey: 'id', estimatedSize: ITEM_SIZE },
            slots,
          );
        };
      },
    });

    app = createApp(Host);
    app.mount(container);
    measure();
    await nextTick();
    measure();
    await nextTick();

    expect(texts(container)).toContain('原始0');

    list.value = list.value.map((it) =>
      it.id === 0 ? { ...it, label: '改过了' } : it,
    );
    await nextTick();

    expect(texts(container)).toContain('改过了');
    expect(texts(container)).not.toContain('原始0');
  });

  it('整体换数据源后内容全部更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = ref<Item[]>(
      Array.from({ length: 30 }, (_, i) => ({ id: i, label: `甲${i}` })),
    );

    const Host = defineComponent({
      setup() {
        return () => {
          const slots: any = {
            default: withCtx(({ itemData }: { itemData: Item }) => [
              h('div', { class: 'cell' }, itemData.label),
            ]),
            _: 1,
          };
          return h(
            VirtList as any,
            { list: list.value, itemKey: 'id', estimatedSize: ITEM_SIZE },
            slots,
          );
        };
      },
    });

    app = createApp(Host);
    app.mount(container);
    measure();
    await nextTick();
    measure();
    await nextTick();

    // key 保持一致，只换内容 —— 最容易漏更新的那种
    list.value = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      label: `乙${i}`,
    }));
    await nextTick();

    const now = texts(container);
    expect(now.length).toBeGreaterThan(0);
    for (const t of now) expect(t.startsWith('乙')).toBe(true);
  });
});

describe('Vue 最佳实践：shallowRef + 不可变替换', () => {
  /**
   * 文档（design-decisions / list-reactive 示例）推荐的写法，锁在这里。
   *
   * `shallowRef` 不递归代理数组元素，十万条数据的初始化开销因此小得多 ——
   * 代价是「原地改某一项的字段」不会被 Vue 察觉。但只要用不可变替换
   * （`list.value = list.value.map(...)`），`.value` 的替换会触发组件重渲染，
   * 于是 `props.list` 引用变 → watch 触发 → setList → updateItem。
   * 两个好处兼得：不付深度代理的代价，也不必手动 forceUpdate。
   */
  it('shallowRef 下不可变替换仍然自动更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = shallowRef<Item[]>(
      Array.from({ length: 30 }, (_, i) => ({ id: i, label: `原始${i}` })),
    );

    const Host = defineComponent({
      setup() {
        return () => {
          const slots: any = {
            default: withCtx(({ itemData }: { itemData: Item }) => [
              h('div', { class: 'cell' }, itemData.label),
            ]),
            _: 1,
          };
          return h(
            VirtList as any,
            { list: list.value, itemKey: 'id', estimatedSize: ITEM_SIZE },
            slots,
          );
        };
      },
    });

    app = createApp(Host);
    app.mount(container);
    measure();
    await nextTick();
    measure();
    await nextTick();

    expect(texts(container)).toContain('原始0');

    list.value = list.value.map((it) =>
      it.id === 0 ? { ...it, label: '替换的' } : it,
    );
    await nextTick();

    expect(texts(container)).toContain('替换的');
    expect(texts(container)).not.toContain('原始0');
  });

  /**
   * 反面：shallowRef 下**原地**改字段，谁都察觉不到 —— Vue 不代理数组元素，
   * 引用与长度也都没变，watch 不触发。这时才需要 refreshItems / forceUpdate。
   * 示例 demo 用这一对反差来讲清两种写法。
   */
  it('shallowRef 下原地改字段不会自动更新，需要 refreshItems', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = shallowRef<Item[]>(
      Array.from({ length: 30 }, (_, i) => ({ id: i, label: `原始${i}` })),
    );
    const vlRef = ref<any>(null);

    const Host = defineComponent({
      setup() {
        return () => {
          const slots: any = {
            default: withCtx(({ itemData }: { itemData: Item }) => [
              h('div', { class: 'cell' }, itemData.label),
            ]),
            _: 1,
          };
          return h(
            VirtList as any,
            {
              ref: vlRef,
              list: list.value,
              itemKey: 'id',
              estimatedSize: ITEM_SIZE,
            },
            slots,
          );
        };
      },
    });

    app = createApp(Host);
    app.mount(container);
    measure();
    await nextTick();
    measure();
    await nextTick();

    list.value[0]!.label = '原地改的';
    await nextTick();
    // 没人察觉得到
    expect(texts(container)).toContain('原始0');

    vlRef.value.refreshItems([0]);
    await nextTick();

    expect(texts(container)).toContain('原地改的');
  });
});

/**
 * 锁住文档（design-decisions / comparison）关于 push 的口径。
 *
 * 组件对列表变化的判断只有两个标量：数组引用和长度
 * （`watch([() => props.list, () => props.list.length])`）。`() => props.list.length`
 * 这个 getter 是否建立依赖，取决于数组本身是不是响应式代理 —— 这就是 ref 与
 * shallowRef 在 push 上的分水岭。
 *
 * 为什么值得单独锁：`shallowRef` + `push` 会**偶尔看起来能工作** —— 库持有的就是
 * 被 push 过的那个数组对象，随后任何一次滚动或尺寸上报都会让新项冒出来。
 * 用例里刻意不给这种机会（push 后只等 nextTick，不触发 ResizeObserver），
 * 否则测出来的是假象。
 */
describe('Vue push 的行为取决于 ref / shallowRef', () => {
  function mountWith(listRef: { value: Item[] }) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const Host = defineComponent({
      setup() {
        return () => {
          const slots: any = {
            default: withCtx(({ itemData }: { itemData: Item }) => [
              h('div', { class: 'cell' }, itemData.label),
            ]),
            _: 1,
          };
          return h(
            VirtList as any,
            { list: listRef.value, itemKey: 'id', estimatedSize: ITEM_SIZE },
            slots,
          );
        };
      },
    });
    app = createApp(Host);
    app.mount(container);
    return container;
  }

  const rows = () =>
    Array.from({ length: 5 }, (_, i) => ({ id: i, label: `L${i}` }));

  it('ref：push 会自动更新（数组被深度代理，长度变化触发比较）', async () => {
    const list = ref<Item[]>(rows());
    const container = mountWith(list);
    measure();
    await nextTick();
    measure();
    await nextTick();
    const before = texts(container).length;

    list.value.push({ id: 99, label: '新' });
    // 刻意不再 measure：不给 core 额外的重算机会
    await nextTick();
    await nextTick();

    expect(texts(container).length).toBeGreaterThan(before);
  });

  it('shallowRef：push 不会自动更新（数组是 raw，改它不产生任何通知）', async () => {
    const list = shallowRef<Item[]>(rows());
    const container = mountWith(list);
    measure();
    await nextTick();
    measure();
    await nextTick();
    const before = texts(container).length;

    list.value.push({ id: 99, label: '新' });
    await nextTick();
    await nextTick();

    expect(texts(container).length).toBe(before);
  });

  it('shallowRef：换成不可变写法就更新（文档推荐的写法）', async () => {
    const list = shallowRef<Item[]>(rows());
    const container = mountWith(list);
    measure();
    await nextTick();
    measure();
    await nextTick();
    const before = texts(container).length;

    list.value = [...list.value, { id: 99, label: '新' }];
    await nextTick();
    await nextTick();

    expect(texts(container).length).toBeGreaterThan(before);
  });
});

describe('Vue VirtGrid 删除中间项', () => {
  /**
   * 单元格容器按位置复用，mountKey 因此也按位置取。用数据 key 的话，删掉中间一项后
   * 「item-2 的内容」要渲染进「原来 item-1 的容器」，挂载器会先把记录里那个元素的
   * 内容卸掉再挂当前这个 —— 内容看着对，但每次删除都白白重建一批挂载点。
   */
  it('删除后内容前移，且挂载点被复用', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = ref<Item[]>(
      Array.from({ length: 9 }, (_, i) => ({ id: i, label: `原始${i}` })),
    );

    const Host = defineComponent({
      setup() {
        return () => {
          const slots: any = {
            default: withCtx(({ itemData }: { itemData: Item }) => [
              h('div', { class: 'cell' }, `[${itemData.id}]`),
            ]),
            _: 1,
          };
          return h(
            VirtGrid as any,
            {
              list: list.value,
              gridItems: 3,
              itemKey: 'id',
              estimatedSize: ITEM_SIZE,
            },
            slots,
          );
        };
      },
    });

    app = createApp(Host);
    app.mount(container);
    measure();
    await nextTick();
    measure();
    await nextTick();

    expect(texts(container).join('')).toBe('[0][1][2][3][4][5][6][7][8]');
    const secondCell = container.querySelectorAll('.cell')[1]!.parentElement;

    list.value = list.value.filter((it) => it.id !== 1);
    await nextTick();

    expect(texts(container).join('')).toBe('[0][2][3][4][5][6][7][8]');
    expect(container.querySelectorAll('.cell')[1]!.parentElement).toBe(secondCell);
  });
});

describe('Vue VirtGrid 不可变替换', () => {
  it('单元格内容跟着更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = ref<Item[]>(
      Array.from({ length: 9 }, (_, i) => ({ id: i, label: `原始${i}` })),
    );

    const Host = defineComponent({
      setup() {
        return () => {
          const slots: any = {
            default: withCtx(({ itemData }: { itemData: Item }) => [
              h('div', { class: 'cell' }, itemData.label),
            ]),
            _: 1,
          };
          return h(
            VirtGrid as any,
            {
              list: list.value,
              gridItems: 3,
              itemKey: 'id',
              estimatedSize: ITEM_SIZE,
            },
            slots,
          );
        };
      },
    });

    app = createApp(Host);
    app.mount(container);
    measure();
    await nextTick();
    measure();
    await nextTick();

    expect(texts(container)).toContain('原始0');

    list.value = list.value.map((it) => ({ ...it, label: `改过${it.id}` }));
    await nextTick();

    expect(texts(container)).toContain('改过0');
    expect(texts(container)).not.toContain('原始0');
  });
});
