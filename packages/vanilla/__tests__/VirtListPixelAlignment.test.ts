import { afterEach, describe, expect, it, vi } from 'vitest';
import { VirtList } from '../src/VirtList';

const lists: VirtList<{ id: string }>[] = [];
afterEach(() => {
  lists.splice(0).forEach((list) => list.destroy());
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function setup(horizontal = false) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const list = new VirtList(container, {
    list: Array.from({ length: 80 }, (_, i) => ({ id: String(i) })),
    itemKey: 'id', estimatedSize: 60.25, fixedSize: true, horizontal,
    renderItem: (item, _index, el) => { el.textContent = item.id; },
    renderHeader: (el) => { el.textContent = 'header'; },
    renderFooter: (el) => { el.textContent = 'footer'; },
  });
  lists.push(list);
  list.core.setClientSize(300);
  list.core.slotSize.headerSize = 20.25;
  list.core.slotSize.stickyHeaderSize = 10.125;
  list.core.forceUpdate();
  return list;
}

function assertPaint(list: VirtList<{ id: string }>, dpr: number, horizontal = false) {
  const { stickyHeaderSize, headerSize } = list.core.slotSize;
  const { leadingSize, itemsTotalSize } = list.state;
  const positions = [stickyHeaderSize, stickyHeaderSize + headerSize + leadingSize,
    stickyHeaderSize + headerSize + itemsTotalSize];
  const els = [list.clientEl.querySelector('[data-id="header"]')!, list.itemsEl,
    list.clientEl.querySelector('[data-id="footer"]')!];
  els.forEach((el, i) => {
    const values = (el as HTMLElement).style.transform.match(/translate3d\(([^)]+)\)/)![1]!.split(',').map(parseFloat);
    const painted = values[horizontal ? 0 : 1]!;
    const residual = positions[i]! - list.getOffset();
    expect(painted * dpr).toBeCloseTo(Math.round(painted * dpr), 8);
    expect(Math.abs(painted - residual)).toBeLessThanOrEqual(0.5 / dpr + 1e-8);
    expect(values[horizontal ? 1 : 0]).toBe(0);
  });
}

describe('physical pixel painting', () => {
  for (const horizontal of [false, true]) {
    for (const dpr of [1, 2, 1.25]) {
      it(`keeps logical precision and snaps all sections: horizontal=${horizontal}, DPR=${dpr}`, () => {
        vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(dpr);
        const list = setup(horizontal);
        assertPaint(list, dpr, horizontal);
        for (const offset of [401.2, 401.3, 3200.35]) {
          list.scrollToOffset(offset);
          expect(list.getOffset()).toBeCloseTo(offset, 8);
          assertPaint(list, dpr, horizontal);
          list.core.forceUpdate();
          expect(list.getOffset()).toBeCloseTo(offset, 8);
          assertPaint(list, dpr, horizontal);
        }
        list.scrollToBottom();
        expect(list.getOffset()).toBe(list.core.getMaxOffset());
        assertPaint(list, dpr, horizontal);
      });
    }
  }

  it('re-arms resolution changes while idle and removes the listener on destroy', () => {
    let dpr = 1;
    vi.spyOn(window, 'devicePixelRatio', 'get').mockImplementation(() => dpr);
    const queries: { listener?: () => void; remove: ReturnType<typeof vi.fn> }[] = [];
    const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => {
      const query = { listener: undefined as (() => void) | undefined, remove: vi.fn() };
      queries.push(query);
      return { addEventListener: (_: string, cb: () => void) => { query.listener = cb; }, removeEventListener: query.remove };
    }) });
    try {
      const list = setup();
      list.scrollToOffset(401.3);
      for (const next of [2, 1.25]) {
        const previous = queries.at(-1)!;
        dpr = next;
        previous.listener!();
        expect(previous.remove).toHaveBeenCalledWith('change', previous.listener);
        expect(list.getOffset()).toBeCloseTo(401.3, 8);
        assertPaint(list, dpr);
      }
      list.destroy();
      lists.splice(lists.indexOf(list), 1);
      expect(queries.at(-1)!.remove).toHaveBeenCalledWith('change', queries.at(-1)!.listener);
    } finally {
      if (original) Object.defineProperty(window, 'matchMedia', original);
      else Reflect.deleteProperty(window, 'matchMedia');
    }
  });
});
