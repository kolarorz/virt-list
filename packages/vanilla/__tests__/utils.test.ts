import { describe, it, expect } from 'vitest';
import {
  normalizeStyle,
  normalizeClass,
  mergeStyles,
  setAttrs,
  applyStyle,
  applyClass,
} from '../src/utils';

describe('normalizeStyle', () => {
  it('字符串原样返回', () => {
    expect(normalizeStyle('color:red;')).toBe('color:red;');
  });

  it('对象的 camelCase 键转成 kebab-case', () => {
    expect(normalizeStyle({ minHeight: '10px', zIndex: 3 })).toBe(
      'min-height:10px;z-index:3;',
    );
  });

  it('跳过 null / undefined 的值，但保留 0 与空字符串', () => {
    expect(
      normalizeStyle({
        color: null,
        background: undefined,
        top: 0,
        left: '',
      }),
    ).toBe('top:0;left:;');
  });

  it('数组按顺序拼接，并支持嵌套', () => {
    expect(
      normalizeStyle(['color:red;', { fontSize: '12px' }, ['top:0;']]),
    ).toBe('color:red;font-size:12px;top:0;');
  });

  it('空数组与空对象得到空字符串', () => {
    expect(normalizeStyle([])).toBe('');
    expect(normalizeStyle({})).toBe('');
  });
});

describe('normalizeClass', () => {
  it('字符串原样返回', () => {
    expect(normalizeClass('a b')).toBe('a b');
  });

  it('对象只保留真值键', () => {
    expect(
      normalizeClass({ a: true, b: false, c: null, d: undefined, e: true }),
    ).toBe('a e');
  });

  it('数组过滤空结果后以空格连接，并支持嵌套', () => {
    expect(normalizeClass(['a', '', { b: true, c: false }, ['d']])).toBe(
      'a b d',
    );
  });

  it('全为假值时得到空字符串', () => {
    expect(normalizeClass({ a: false })).toBe('');
    expect(normalizeClass([])).toBe('');
  });
});

describe('mergeStyles', () => {
  it('逐段归一化后补分号拼接', () => {
    expect(mergeStyles('color:red', { top: 0 })).toBe('color:red;top:0;;');
  });

  it('跳过 undefined / null / 空字符串', () => {
    expect(mergeStyles(undefined, null, '', 'color:red;')).toBe('color:red;;');
  });

  it('归一化结果为空的项不产生多余分号', () => {
    expect(mergeStyles({}, [])).toBe('');
  });
});

describe('setAttrs', () => {
  it('批量写入属性', () => {
    const el = document.createElement('div');
    setAttrs(el, { 'data-a': '1', title: 'hi' });

    expect(el.getAttribute('data-a')).toBe('1');
    expect(el.getAttribute('title')).toBe('hi');
  });

  it('空对象不改动元素', () => {
    const el = document.createElement('div');
    setAttrs(el, {});
    expect(el.attributes.length).toBe(0);
  });
});

describe('applyStyle', () => {
  it('整体覆盖 style 属性（不是合并）', () => {
    const el = document.createElement('div');
    applyStyle(el, 'color:red;');
    applyStyle(el, { top: '1px' });

    expect(el.getAttribute('style')).toBe('top:1px;');
  });

  it('传入空样式会清空 style 属性', () => {
    const el = document.createElement('div');
    applyStyle(el, 'color:red;');
    applyStyle(el, {});

    expect(el.getAttribute('style')).toBe('');
  });
});

describe('applyClass', () => {
  it('归一化后写入 className', () => {
    const el = document.createElement('div');
    applyClass(el, ['a', { b: true }]);

    expect(el.className).toBe('a b');
  });

  it('归一化结果为空时保留原有 className', () => {
    const el = document.createElement('div');
    el.className = 'keep-me';
    applyClass(el, { a: false });

    expect(el.className).toBe('keep-me');
  });
});
