import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, withCtx } from 'vue';
import { VirtList } from '../src/index';

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = { cb: null, targets: new Set() };
beforeEach(() => {
  ro.cb = null; ro.targets = new Set();
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) { ro.cb = cb; }
    observe(el: Element) { ro.targets.add(el); }
    unobserve(el: Element) { ro.targets.delete(el); }
    disconnect() { ro.targets.clear(); }
  } as unknown as typeof ResizeObserver;
});
function measure() {
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    const size = id === 'client' ? 400 : 40;
    return { target: el, borderBoxSize: [{ blockSize: size, inlineSize: size }], contentRect: { height: size, width: size } } as unknown as ResizeObserverEntry;
  });
  ro.cb?.(entries, {} as ResizeObserver);
}

describe('探针：两条路径各自惊动了谁', () => {
  it('原地改属性 vs 不可变替换', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const list = ref(Array.from({ length: 20 }, (_, i) => ({ id: i, label: `L${i}` })));
    const notifies: string[] = [];

    const Host = defineComponent({
      setup() {
        return () => h(VirtList as any, {
          list: list.value, itemKey: 'id', estimatedSize: 40,
          onUpdate: (_rl: any, _s: any) => { notifies.push('update'); },
        }, {
          default: withCtx(({ itemData }: any) => [h('div', { class: 'cell' }, itemData.label)]),
          _: 1,
        });
      },
    });
    createApp(Host).mount(container);
    measure(); await nextTick(); measure(); await nextTick();

    const cell0 = () => container.querySelector('.cell')!.textContent;
    const el0 = container.querySelector('.cell')!.parentElement;

    // ① 原地改属性：不换引用、不改长度
    notifies.length = 0;
    list.value[0]!.label = '原地改的';
    await nextTick();
    console.log('[探针] ① 原地改属性 → 界面 =', cell0(), '| core 收到通知次数 =', notifies.length);

    // ② 不可变替换
    notifies.length = 0;
    list.value = list.value.map((it) => (it.id === 0 ? { ...it, label: '替换的' } : it));
    await nextTick();
    console.log('[探针] ② 不可变替换 → 界面 =', cell0(), '| core 收到通知次数 =', notifies.length);
    console.log('[探针] 两次之后 DOM 容器是否还是同一个 =', container.querySelector('.cell')!.parentElement === el0);
    expect(true).toBe(true);
  });
});
