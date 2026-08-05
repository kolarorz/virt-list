import { describe, it, expect, afterEach } from 'vitest';
import {
  isScrollElement,
  getScrollParentElement,
  isSiblingElement,
  findAncestorWithClass,
  getPrevSibling,
  getNextSibling,
} from '../src/tree/utils';

/**
 * jsdom 下所有布局尺寸恒为 0，滚动判定必须自己伪造。
 * offsetHeight / offsetWidth 是 isScrollElement 对普通元素取的可视尺寸。
 */
function makeEl(size: {
  offsetHeight?: number;
  offsetWidth?: number;
  scrollHeight?: number;
  scrollWidth?: number;
}): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    offsetHeight: { get: () => size.offsetHeight ?? 0, configurable: true },
    offsetWidth: { get: () => size.offsetWidth ?? 0, configurable: true },
    scrollHeight: { get: () => size.scrollHeight ?? 0, configurable: true },
    scrollWidth: { get: () => size.scrollWidth ?? 0, configurable: true },
  });
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isScrollElement', () => {
  it('内容高度超出可视高度时为可滚动', () => {
    expect(isScrollElement(makeEl({ offsetHeight: 100, scrollHeight: 300 }))).toBe(
      true,
    );
  });

  it('内容宽度超出可视宽度时为可滚动（横向）', () => {
    expect(isScrollElement(makeEl({ offsetWidth: 100, scrollWidth: 300 }))).toBe(
      true,
    );
  });

  it('内容未超出时不可滚动', () => {
    expect(
      isScrollElement(
        makeEl({
          offsetHeight: 100,
          offsetWidth: 100,
          scrollHeight: 100,
          scrollWidth: 100,
        }),
      ),
    ).toBe(false);
  });

  it('documentElement 走 clientHeight / clientWidth 分支', () => {
    const root = document.documentElement;
    const clientHeight = root.clientHeight;
    Object.defineProperty(root, 'scrollHeight', {
      get: () => clientHeight + 100,
      configurable: true,
    });

    expect(isScrollElement(root)).toBe(true);

    Reflect.deleteProperty(root, 'scrollHeight');
  });
});

describe('getScrollParentElement', () => {
  it('容器自身可滚动时直接返回自身', () => {
    const el = makeEl({ offsetHeight: 100, scrollHeight: 300 });
    document.body.appendChild(el);

    expect(getScrollParentElement(el)).toBe(el);
  });

  it('向上找到最近的可滚动祖先', () => {
    const scroller = makeEl({ offsetHeight: 100, scrollHeight: 500 });
    const middle = makeEl({ offsetHeight: 50, scrollHeight: 50 });
    const inner = makeEl({ offsetHeight: 20, scrollHeight: 20 });

    document.body.appendChild(scroller);
    scroller.appendChild(middle);
    middle.appendChild(inner);

    expect(getScrollParentElement(inner)).toBe(scroller);
  });

  it('沿途都不可滚动时返回 null', () => {
    const outer = makeEl({ offsetHeight: 100, scrollHeight: 100 });
    const inner = makeEl({ offsetHeight: 20, scrollHeight: 20 });
    document.body.appendChild(outer);
    outer.appendChild(inner);

    expect(getScrollParentElement(inner)).toBeNull();
  });

  it('搜索在 top 参数处停止，不会越过它', () => {
    const scroller = makeEl({ offsetHeight: 100, scrollHeight: 500 });
    const boundary = makeEl({ offsetHeight: 50, scrollHeight: 50 });
    const inner = makeEl({ offsetHeight: 20, scrollHeight: 20 });

    document.body.appendChild(scroller);
    scroller.appendChild(boundary);
    boundary.appendChild(inner);

    // boundary 作为上界：可滚动的 scroller 在其之上，不应被找到
    expect(getScrollParentElement(inner, boundary)).toBeNull();
  });
});

describe('isSiblingElement', () => {
  it('前后相邻的元素互为兄弟', () => {
    const parent = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    const c = document.createElement('div');
    parent.append(a, b, c);

    expect(isSiblingElement(b, a)).toBe(true);
    expect(isSiblingElement(b, c)).toBe(true);
  });

  it('隔了一个元素就不算相邻', () => {
    const parent = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    const c = document.createElement('div');
    parent.append(a, b, c);

    expect(isSiblingElement(a, c)).toBe(false);
  });
});

describe('findAncestorWithClass', () => {
  it('返回最近的带指定 class 的祖先', () => {
    const outer = document.createElement('div');
    outer.className = 'target';
    const middle = document.createElement('div');
    middle.className = 'target';
    const inner = document.createElement('div');

    outer.appendChild(middle);
    middle.appendChild(inner);

    expect(findAncestorWithClass(inner, 'target')).toBe(middle);
  });

  it('自身带 class 但祖先没有时返回 null（只查祖先）', () => {
    const parent = document.createElement('div');
    const el = document.createElement('div');
    el.className = 'target';
    parent.appendChild(el);

    expect(findAncestorWithClass(el, 'target')).toBeNull();
  });

  it('没有匹配祖先时返回 null', () => {
    const parent = document.createElement('div');
    const el = document.createElement('div');
    parent.appendChild(el);

    expect(findAncestorWithClass(el, 'nope')).toBeNull();
  });
});

describe('getPrevSibling / getNextSibling', () => {
  function makeItem(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'virt-tree-item';
    return el;
  }

  it('相邻的 virt-tree-item 能被取到', () => {
    const parent = document.createElement('div');
    const prev = makeItem();
    const current = makeItem();
    const next = makeItem();
    parent.append(prev, current, next);

    expect(getPrevSibling(current)).toBe(prev);
    expect(getNextSibling(current)).toBe(next);
  });

  it('中间夹着文本节点也不影响（按元素兄弟查找）', () => {
    const parent = document.createElement('div');
    const prev = makeItem();
    const current = makeItem();
    parent.appendChild(prev);
    parent.appendChild(document.createTextNode('  '));
    parent.appendChild(document.createComment('c'));
    parent.appendChild(current);

    expect(getPrevSibling(current)).toBe(prev);
  });

  it('相邻元素不是 virt-tree-item 时返回 undefined', () => {
    const parent = document.createElement('div');
    const other = document.createElement('div');
    const current = makeItem();
    parent.append(other, current);

    expect(getPrevSibling(current)).toBeUndefined();
  });

  it('没有兄弟元素时返回 undefined', () => {
    const parent = document.createElement('div');
    const current = makeItem();
    parent.appendChild(current);

    expect(getPrevSibling(current)).toBeUndefined();
    expect(getNextSibling(current)).toBeUndefined();
  });
});
