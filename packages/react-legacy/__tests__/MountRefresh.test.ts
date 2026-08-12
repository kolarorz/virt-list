import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, useState } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { VirtList } from '../src/index';

/**
 * 锁 AI 流式输出（docs 的 ai-streaming 场景）。
 *
 * 每项内容各自渲染在一个独立的 React root 里，不在宿主的 vdom 树上，而 core 的增量
 * patch 对已在池中的 key 不会重新调用 renderItem —— 所以「宿主 state 变了，项里的
 * 内容跟着变」这件事只能由框架包自己在每次宿主渲染后重刷。这条路径以前是断的：
 * 流式文本存在宿主 state 里，气泡永远是空的。
 *
 * 顺带锁住那条 React 报错不再出现：setList 以前写在 render 函数体里，core 又是同步
 * 驱动 DOM 的，于是变成「在 React 渲染里嵌套 ReactDOM.render」——
 * "triggering nested component updates from render is not allowed"。
 */

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

const CLIENT_SIZE = 400;
const ITEM_SIZE = 80;

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
async function measure() {
  await act(async () => {
    const entries = Array.from(ro.targets).map((el) => {
      const id = (el as HTMLElement).dataset.id ?? '';
      const size = id === 'client' ? CLIENT_SIZE : id === 'header' ? 30 : ITEM_SIZE;
      return {
        target: el,
        borderBoxSize: [{ blockSize: size, inlineSize: size }],
        contentRect: { height: size, width: size },
      } as unknown as ResizeObserverEntry;
    });
    ro.cb?.(entries, {} as ResizeObserver);
  });
}

async function unmount(container: HTMLElement) {
  await act(async () => {
    ReactDOM.unmountComponentAtNode(container);
  });
}

function bubbleTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.bubble')).map((el) => el.textContent ?? '');
}

function makeHistory(n: number): Msg[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
    text: `msg-${i}`,
  }));
}

describe('React 16-17 VirtList 挂载内容随宿主刷新（AI 流式输出）', () => {
  it('流式文本存在宿主 state 里也能刷到气泡，结束后落回 list 不丢字', async () => {
    const logs: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      logs.push(String(args[0]));
    });
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logs.push(String(args[0]));
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    let ask: () => void = () => {};
    let stream: (text: string) => void = () => {};
    let stop: (final: string) => void = () => {};

    function Host() {
      const [list, setList] = useState<Msg[]>(() => makeHistory(20));
      const [streamId, setStreamId] = useState<number | null>(null);
      const [streamText, setStreamText] = useState('');

      ask = () => {
        setList((prev) => [
          ...prev,
          { id: 99, role: 'user', text: '问题' },
          { id: 100, role: 'assistant', text: '' },
        ]);
        setStreamId(100);
        setStreamText('');
      };
      stream = setStreamText;
      // 结束生成：最终文本落回 list（换成新对象，React 的不可变更新）
      stop = (final) => {
        setList((prev) => prev.map((it) => (it.id === 100 ? { ...it, text: final } : it)));
        setStreamId(null);
        setStreamText('');
      };

      return createElement(
        VirtList as any,
        {
          list,
          itemKey: 'id',
          estimatedSize: ITEM_SIZE,
          initialPosition: 'bottom',
          stickyBottom: true,
          hasMoreBottom: false,
        },
        ({ itemData }: { itemData: Msg }) => {
          const streaming = itemData.id === streamId;
          return createElement(
            'div',
            { className: 'bubble' },
            streaming ? streamText : itemData.text,
          );
        },
      );
    }

    await act(async () => {
      ReactDOM.render(createElement(Host), container);
    });
    await measure();
    await measure();

    await act(async () => ask());
    await measure();
    expect(bubbleTexts(container)).toContain('问题');

    for (const text of ['虚', '虚拟', '虚拟列', '虚拟列表']) {
      await act(async () => stream(text));
    }
    expect(bubbleTexts(container).at(-1)).toBe('虚拟列表');

    await act(async () => stop('虚拟列表'));
    // 同一个 key 换了新对象，也要能刷到（否则气泡会在生成结束的一瞬间变空）
    expect(bubbleTexts(container).at(-1)).toBe('虚拟列表');

    await unmount(container);

    expect(logs).toEqual([]);
  });

  it('项滚出再滚回渲染窗口后，内容仍随宿主 state 更新', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let bump: () => void = () => {};

    function Host() {
      const [suffix, setSuffix] = useState('');
      bump = () => setSuffix('!');
      const [list] = useState<Msg[]>(() => makeHistory(60));
      return createElement(
        VirtList as any,
        { list, itemKey: 'id', estimatedSize: ITEM_SIZE },
        ({ itemData }: { itemData: Msg }) =>
          createElement('div', { className: 'bubble' }, itemData.text + suffix),
      );
    }

    await act(async () => {
      ReactDOM.render(createElement(Host), container);
    });
    await measure();

    await act(async () => bump());
    expect(bubbleTexts(container)[0]).toBe('msg-0!');

    await unmount(container);
  });
});
