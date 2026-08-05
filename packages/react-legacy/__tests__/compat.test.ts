import { describe, it, expect, afterEach } from 'vitest';
import { createElement, version, type MutableRefObject } from 'react';
import { createReactMounter } from '../src/compat';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeMountedElsRef(): MutableRefObject<Set<HTMLElement>> {
  return { current: new Set<HTMLElement>() };
}

describe('react-legacy createReactMounter', () => {
  it('确认测试跑在 React 16/17 上', () => {
    expect(Number(version.split('.')[0])).toBeLessThan(18);
  });

  it('把 ReactNode 同步渲染进目标容器', () => {
    const mountedEls = makeMountedElsRef();
    const { mountReact } = createReactMounter(mountedEls);
    const el = document.createElement('div');
    document.body.appendChild(el);

    mountReact('item:1', createElement('span', null, 'hello'), el);

    expect(el.textContent).toBe('hello');
    expect(el.querySelector('span')).toBeTruthy();
    expect(mountedEls.current.has(el)).toBe(true);
  });

  it('多个根节点通过 Fragment 一并渲染', () => {
    const mountedEls = makeMountedElsRef();
    const { mountReact } = createReactMounter(mountedEls);
    const el = document.createElement('div');
    document.body.appendChild(el);

    mountReact(
      'item:1',
      [
        createElement('span', { key: 'a' }, 'a'),
        createElement('span', { key: 'b' }, 'b'),
      ],
      el,
    );

    expect(el.children.length).toBe(2);
    expect(el.textContent).toBe('ab');
  });

  it('同一容器重复挂载时更新内容', () => {
    const mountedEls = makeMountedElsRef();
    const { mountReact } = createReactMounter(mountedEls);
    const el = document.createElement('div');
    document.body.appendChild(el);

    mountReact('item:1', createElement('span', null, 'first'), el);
    mountReact('item:1', createElement('span', null, 'second'), el);

    expect(el.textContent).toBe('second');
    expect(mountedEls.current.size).toBe(1);
  });

  it('cleanupAllRoots 卸载全部容器并清空记录', () => {
    const mountedEls = makeMountedElsRef();
    const { mountReact, cleanupAllRoots } = createReactMounter(mountedEls);
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);

    mountReact('a', createElement('span', null, 'a'), first);
    mountReact('b', createElement('span', null, 'b'), second);
    expect(mountedEls.current.size).toBe(2);

    cleanupAllRoots();

    expect(first.textContent).toBe('');
    expect(second.textContent).toBe('');
    expect(mountedEls.current.size).toBe(0);
  });

  it('没有挂载过任何容器时 cleanupAllRoots 是安全的空操作', () => {
    const mountedEls = makeMountedElsRef();
    const { cleanupAllRoots } = createReactMounter(mountedEls);

    expect(() => cleanupAllRoots()).not.toThrow();
  });
});
