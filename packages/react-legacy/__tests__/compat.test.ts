import { describe, it, expect, afterEach } from 'vitest';
import { createElement, version } from 'react';
import { createReactMounter } from '../src/compat';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('react-legacy createReactMounter', () => {
  it('确认测试跑在 React 16/17 上', () => {
    expect(Number(version.split('.')[0])).toBeLessThan(18);
  });

  it('把 ReactNode 同步渲染进目标容器', () => {
    const { mountReact } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    mountReact('item:1', () => createElement('span', null, 'hello'), el);

    expect(el.textContent).toBe('hello');
    expect(el.querySelector('span')).toBeTruthy();
  });

  it('多个根节点通过 Fragment 一并渲染', () => {
    const { mountReact } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    mountReact(
      'item:1',
      () => [
        createElement('span', { key: 'a' }, 'a'),
        createElement('span', { key: 'b' }, 'b'),
      ],
      el,
    );

    expect(el.children.length).toBe(2);
    expect(el.textContent).toBe('ab');
  });

  it('同一容器重复挂载时更新内容', () => {
    const { mountReact } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    mountReact('item:1', () => createElement('span', null, 'first'), el);
    mountReact('item:1', () => createElement('span', null, 'second'), el);

    expect(el.textContent).toBe('second');
  });

  it('flushMounts 用最新的闭包重刷已挂载的内容', () => {
    const { mountReact, flushMounts } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    // 模拟宿主 state：闭包每次读到的都是当下的值
    let text = 'first';
    mountReact('item:1', () => createElement('span', null, text), el);
    expect(el.textContent).toBe('first');

    text = 'second';
    flushMounts();

    expect(el.textContent).toBe('second');
  });

  it('元素离开文档后 flushMounts 会把它清掉，不再往上渲染', () => {
    const { mountReact, flushMounts } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    let text = 'first';
    mountReact('item:1', () => createElement('span', null, text), el);
    el.remove();

    text = 'second';
    flushMounts();

    expect(el.textContent).toBe('');
  });

  it('dropMount 卸载单个挂载点，flushMounts 不再碰它', () => {
    const { mountReact, dropMount, flushMounts } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    let text = 'first';
    mountReact('item:1', () => createElement('span', null, text), el);
    dropMount(el);
    expect(el.textContent).toBe('');

    text = 'second';
    flushMounts();
    expect(el.textContent).toBe('');
  });

  it('setMountRender 只换闭包不渲染，渲染留给 flushMounts', () => {
    const { mountReact, setMountRender, flushMounts } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    mountReact('item:1', () => createElement('span', null, 'first'), el);
    setMountRender('item:1', () => createElement('span', null, 'second'));
    // 还没刷 —— 同一次宿主渲染里不重复渲染同一项
    expect(el.textContent).toBe('first');

    flushMounts();
    expect(el.textContent).toBe('second');

    // 不存在的 key 是空操作，不抛错
    expect(() => setMountRender('item:404', () => createElement('span', null, 'x'))).not.toThrow();
  });

  it('cleanupAllRoots 卸载全部容器并清空记录', () => {
    const { mountReact, cleanupAllRoots, flushMounts } = createReactMounter();
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);

    mountReact('a', () => createElement('span', null, 'a'), first);
    mountReact('b', () => createElement('span', null, 'b'), second);

    cleanupAllRoots();

    expect(first.textContent).toBe('');
    expect(second.textContent).toBe('');
    // 记录已清空，重刷不会把内容再渲染回来
    flushMounts();
    expect(first.textContent).toBe('');
  });

  it('没有挂载过任何容器时 cleanupAllRoots 是安全的空操作', () => {
    const { cleanupAllRoots } = createReactMounter();

    expect(() => cleanupAllRoots()).not.toThrow();
  });
});
