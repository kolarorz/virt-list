import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VirtList, type VirtListRef } from '../src/index';

interface ListItem {
  id: string;
  text: string;
}

function makeList(length: number): ListItem[] {
  return Array.from({ length }, (_, i) => ({
    id: String(i),
    text: `item-${i}`,
  }));
}

function getRenderedItemIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('div[data-id]'))
    .map((el) => el.getAttribute('data-id') || '')
    .filter((id) => /^\d+$/.test(id));
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
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('React VirtList', () => {
  it('scrollToIndex updates rendered range without blank container', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = makeList(300);
    const listRef = createRef<VirtListRef<ListItem>>();
    const root: Root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(VirtList<ListItem>, {
          ref: listRef,
          list,
          itemKey: 'id',
          itemPreSize: 20,
          fixed: true,
          buffer: 3,
          renderItem: (_item, index) => createElement('div', null, `item-${index}`),
        }),
      );
    });

    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    expect(clientEl).toBeTruthy();

    await act(async () => {
      listRef.current?.scrollToIndex(150);
      clientEl.dispatchEvent(new Event('scroll'));
    });

    const renderedIds = getRenderedItemIds(container);
    expect(renderedIds.length).toBeGreaterThan(0);
    expect(container.textContent).toContain('item-150');

    await act(async () => {
      root.unmount();
    });
  });

  it('scrollToTop/scrollToBottom and rapid scroll do not produce blank state', async () => {
    vi.useFakeTimers();

    const container = document.createElement('div');
    document.body.appendChild(container);

    const list = makeList(400);
    const listRef = createRef<VirtListRef<ListItem>>();
    const root: Root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(VirtList<ListItem>, {
          ref: listRef,
          list,
          itemKey: 'id',
          itemPreSize: 16,
          fixed: true,
          buffer: 4,
          renderItem: (_item, index) => createElement('div', null, `item-${index}`),
        }),
      );
    });

    const clientEl = container.querySelector('[data-id="client"]') as HTMLElement;
    expect(clientEl).toBeTruthy();

    await act(async () => {
      listRef.current?.scrollToBottom();
      vi.runAllTimers();
      clientEl.dispatchEvent(new Event('scroll'));
    });

    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);

    await act(async () => {
      for (const offset of [120, 960, 1800, 2800, 3600]) {
        clientEl.scrollTop = offset;
        clientEl.dispatchEvent(new Event('scroll'));
      }
    });

    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);

    await act(async () => {
      listRef.current?.scrollToTop();
      vi.runAllTimers();
      clientEl.dispatchEvent(new Event('scroll'));
    });

    expect(getRenderedItemIds(container).length).toBeGreaterThan(0);
    expect(container.textContent).toContain('item-0');

    await act(async () => {
      root.unmount();
    });
  });
});
