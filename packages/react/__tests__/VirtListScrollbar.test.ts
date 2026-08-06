import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VirtList, type VirtListRef } from '../src/index';

/**
 * 框架层对 `scrollbar` 的透传，见 vue 包同名用例的说明。
 */

interface ListItem {
  id: string;
  text: string;
}

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(VirtList<ListItem>, {
        ref: createRef<VirtListRef<ListItem>>(),
        list: Array.from({ length: 200 }, (_, i) => ({
          id: String(i),
          text: `item-${i}`,
        })),
        itemKey: 'id',
        itemPreSize: 20,
        fixed: true,
        renderItem: (_item, index, el) => {
          el.textContent = `item-${index}`;
        },
        ...props,
      } as any),
    );
  });

  return { container, root };
}

describe('React VirtList 的 scrollbar 透传', () => {
  it('scrollbar="custom" 建出自绘布局与滚动条', async () => {
    const { container, root } = await mount({ scrollbar: 'custom' });

    const clientEl = container.querySelector(
      '[data-id="client"]',
    ) as HTMLElement;
    expect(clientEl.style.overflow).toBe('hidden');
    expect(clientEl.className).toContain('virt-list__client--custom');
    expect(container.querySelector('.virt-scrollbar__thumb')).toBeTruthy();

    await act(async () => root.unmount());
  });

  it('默认仍是 native，现有用法零影响', async () => {
    const { container, root } = await mount({});

    const clientEl = container.querySelector(
      '[data-id="client"]',
    ) as HTMLElement;
    expect(clientEl.style.overflow).toBe('auto');
    expect(container.querySelector('.virt-scrollbar')).toBeNull();

    await act(async () => root.unmount());
  });
});
