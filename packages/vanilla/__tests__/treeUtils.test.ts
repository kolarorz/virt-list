import { describe, it, expect, afterEach } from 'vitest';
import {
  isSiblingElement,
  findAncestorWithClass,
  getPrevSibling,
  getNextSibling,
} from '../src/tree/utils';

afterEach(() => {
  document.body.innerHTML = '';
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
