/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { createReactMounter } from '../src/compat';

beforeAll(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { document.body.innerHTML = ''; });

/**
 * 模拟 core 的池化行为：项滚出渲染窗口时把元素从文档里摘掉，并按契约先回调
 * `onItemUnmounted`（`dropMount`）再 `remove()`。
 *
 * 滚完后把摘掉的元素接回文档再 `flushMounts()` —— 这样 `prune` 不会介入，
 * 被访问到的挂载点数就是账本里实际留存的条目数。少了 dropMount 这一环，
 * 留存数会等于"滚过的所有项"，而不是渲染窗口的大小。
 */
async function scrollThrough(opts: {
  total: number;
  windowSize: number;
  /** 挂载点是项元素本身（List）还是它的子节点（Grid 的单元格 / Tree 的节点行） */
  nested?: boolean;
  drop: boolean;
}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const mounter = createReactMounter();
  const live = new Map<number, HTMLElement>();
  const dropped: HTMLElement[] = [];
  const rendered = new Set<string>();

  for (let i = 0; i < opts.total; i += 1) {
    const itemEl = document.createElement('div');
    host.appendChild(itemEl);
    let mountEl = itemEl;
    if (opts.nested) {
      mountEl = document.createElement('div');
      itemEl.appendChild(mountEl);
    }
    live.set(i, itemEl);
    await act(async () => {
      mounter.mountReact(`item:${i}`, () => {
        rendered.add(`item:${i}`);
        return createElement('span', null, `i${i}`);
      }, mountEl);
    });

    const gone = i - opts.windowSize;
    if (gone >= 0) {
      const goneEl = live.get(gone)!;
      // core 的契约：先回调，再 remove（此刻子树还完整）
      if (opts.drop) await act(async () => { mounter.dropMount(goneEl); });
      goneEl.remove();
      live.delete(gone);
      dropped.push(goneEl);
    }
  }
  await act(async () => { await Promise.resolve(); });

  dropped.forEach((el) => host.appendChild(el));
  rendered.clear();
  await act(async () => { mounter.flushMounts(); });
  return rendered.size;
}

describe('挂载点账本不随滚动增长', () => {
  it('挂载点就是项元素本身（VirtList）', async () => {
    const retained = await scrollThrough({ total: 120, windowSize: 10, drop: true });
    expect(retained).toBe(10);
  });

  it('挂载点是项元素的子节点（Grid 的单元格 / Tree 的节点行）', async () => {
    const retained = await scrollThrough({
      total: 120, windowSize: 10, nested: true, drop: true,
    });
    expect(retained).toBe(10);
  });

  it('对照：不回调 onItemUnmounted 时账本留着滚过的每一项', async () => {
    const retained = await scrollThrough({ total: 120, windowSize: 10, drop: false });
    expect(retained).toBe(120);
  });
});

describe('dropMount 只清该项名下的挂载点', () => {
  it('不误伤同一批里的其他项', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const mounter = createReactMounter();

    const mk = (label: string) => {
      const itemEl = document.createElement('div');
      const cellEl = document.createElement('div');
      itemEl.appendChild(cellEl);
      host.appendChild(itemEl);
      return { itemEl, cellEl, label };
    };
    const a = mk('a');
    const b = mk('b');
    for (const { cellEl, label } of [a, b]) {
      await act(async () => {
        mounter.mountReact(`item:${label}`, () => createElement('span', null, label), cellEl);
      });
    }
    expect(a.cellEl.textContent).toBe('a');
    expect(b.cellEl.textContent).toBe('b');

    await act(async () => { mounter.dropMount(a.itemEl); });
    a.itemEl.remove();

    // b 的内容不受影响，且还能被重刷
    await act(async () => { mounter.flushMounts(); });
    expect(b.cellEl.textContent).toBe('b');
  });
});
