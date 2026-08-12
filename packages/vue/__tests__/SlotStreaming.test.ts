import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, withCtx, type App } from 'vue';
import { VirtList } from '../src/index';

/**
 * 锁 AI 流式输出（docs 的 ai-streaming 场景）：追加两条消息后逐字改最后一条的文本，
 * 气泡必须跟着更新。
 *
 * 这条路径以前是坏的：插槽 VNode 在 renderItem 里被**求值后**才交给 render()，
 * 于是插槽里读到的 `itemData.text` 不落在任何 render effect 上；又因为 core 的增量
 * patch 对已在池中的 key 不会重新调用 renderItem，改文本后没有任何一环会重渲染。
 *
 * 插槽写成 `withCtx(...) + _: 1` 是在模拟 SFC `<template #default>` 编译出来的形态
 * —— 也就是文档站与真实使用的形态。手写 `h()` 对象插槽会多走一层 Vue 的开发期包装，
 * 那层包装的告警判定与依赖收集无关（详见 src/compat.ts 的注释）。
 */

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

const CLIENT_SIZE = 400;
const ITEM_SIZE = 80;
const HEADER_SIZE = 30;

const ro: { cb: ResizeObserverCallback | null; targets: Set<Element> } = {
  cb: null,
  targets: new Set(),
};
const OriginalRO = globalThis.ResizeObserver;

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
  globalThis.ResizeObserver = OriginalRO;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** 只有渲染出来的项会被观察到，这里把它们的真实尺寸报给 core */
function measure() {
  const entries = Array.from(ro.targets).map((el) => {
    const id = (el as HTMLElement).dataset.id ?? '';
    const size = id === 'client' ? CLIENT_SIZE : id === 'header' ? HEADER_SIZE : ITEM_SIZE;
    return {
      target: el,
      borderBoxSize: [{ blockSize: size, inlineSize: size }],
      contentRect: { height: size, width: size },
    } as unknown as ResizeObserverEntry;
  });
  ro.cb?.(entries, {} as ResizeObserver);
}

function bubbleTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.bubble')).map((el) => el.textContent ?? '');
}

function makeHistory(n: number): Msg[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    role: i % 2 === 0 ? 'user' : 'assistant',
    text: `msg-${i}`,
  }));
}

describe('Vue VirtList 插槽响应式（AI 流式输出）', () => {
  let app: App | null = null;

  afterEach(() => {
    app?.unmount();
    app = null;
  });

  it('逐字改最后一条消息的文本，气泡跟着更新', async () => {
    const warnings: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(String(args[0]));
    });
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      warnings.push(String(args[0]));
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = ref<Msg[]>(makeHistory(20));

    const Host = defineComponent({
      setup() {
        return () => {
          // 模拟 SFC 编译产物：带 _ 标记的稳定插槽
          const slots: any = {
            default: withCtx(({ itemData }: { itemData: Msg }) => [
              h('div', { class: 'bubble' }, [
                h('span', itemData.text),
                itemData.streaming ? h('span', { class: 'caret' }, '|') : null,
              ]),
            ]),
            header: withCtx(({ loadState }: any) => [
              h('div', { class: 'loading' }, loadState.loadingTop ? 'loading' : 'idle'),
            ]),
            _: 1,
          };
          return h(
            VirtList as any,
            {
              list: list.value,
              itemKey: 'id',
              estimatedSize: ITEM_SIZE,
              initialPosition: 'bottom',
              stickyBottom: true,
              hasMoreBottom: false,
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

    // 「提问」：追加 user + assistant 两条，后者流式生成
    const answer: Msg = { id: 100, role: 'assistant', text: '', streaming: true };
    list.value = [...list.value, { id: 99, role: 'user', text: '问题' }, answer];
    await nextTick();
    measure();
    await nextTick();

    expect(bubbleTexts(container)).toContain('问题');
    // 生成中的光标也来自插槽，同样必须渲染出来
    expect(container.querySelector('.caret')).toBeTruthy();

    // 流式：只改 list 里那个响应式对象的一个属性
    for (const chunk of ['虚', '拟', '列', '表']) {
      const target = list.value[list.value.length - 1]!;
      target.text += chunk;
      await nextTick();
    }

    expect(bubbleTexts(container).at(-1)).toBe('虚拟列表|');

    // 结束生成：摘掉光标
    list.value[list.value.length - 1]!.streaming = false;
    await nextTick();
    expect(container.querySelector('.caret')).toBeNull();
    expect(bubbleTexts(container).at(-1)).toBe('虚拟列表');

    expect(warnings).toEqual([]);
  });

  it('项滚出再滚回渲染窗口后，插槽内容仍跟着数据更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = ref<Msg[]>(makeHistory(60));
    const vlRef = ref<any>(null);

    const Host = defineComponent({
      setup() {
        return () => {
          const slots: any = {
            default: withCtx(({ itemData }: { itemData: Msg }) => [
              h('div', { class: 'bubble' }, itemData.text),
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

    // 滚走再滚回：第 0 项会被回收、重新挂载
    vlRef.value.scrollToIndex(40);
    await nextTick();
    measure();
    vlRef.value.scrollToIndex(0);
    await nextTick();
    measure();
    await nextTick();

    list.value[0]!.text = '改过了';
    await nextTick();

    expect(bubbleTexts(container)).toContain('改过了');
  });
});
