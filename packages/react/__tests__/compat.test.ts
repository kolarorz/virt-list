import { describe, it, expect, afterAll, afterEach, beforeAll } from 'vitest';
import { createElement, version } from 'react';
import { createReactMounter } from '../src/compat';

/**
 * React 18 的挂载器：root 按元素复用，内容靠 flushMounts 用最新闭包重刷。
 *
 * 阶段外（这些用例所处的位置）渲染走 flushSync，所以断言可以紧跟调用。
 */

/**
 * 这一组是挂载器自身的单测，直接调它的方法、不经过组件，
 * 所以关掉 act 环境（否则每次 flushSync 渲染都会被提示"没包在 act 里"）。
 */
beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;
});

afterAll(() => {
  delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
});

/** 让排在微任务里的渲染 / 卸载落地 */
function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('react createReactMounter', () => {
  it('确认测试跑在 React 18+ 上', () => {
    expect(Number(version.split('.')[0])).toBeGreaterThanOrEqual(18);
  });

  it('把 ReactNode 同步渲染进目标容器，无额外包裹层', () => {
    const { mountReact } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    mountReact('item:1', () => createElement('span', { className: 'only' }, 'hello'), el);

    expect(el.children.length).toBe(1);
    expect(el.textContent).toBe('hello');
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

  it('同一容器重复挂载复用 root，不重复 createRoot', () => {
    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(String(args[0]));
    };
    try {
      const { mountReact } = createReactMounter();
      const el = document.createElement('div');
      document.body.appendChild(el);

      mountReact('item:1', () => createElement('span', null, 'first'), el);
      mountReact('item:1', () => createElement('span', null, 'second'), el);

      expect(el.textContent).toBe('second');
      // 以前每次挂载都新建 root，React 会直接报这条
      expect(errors.filter((e) => e.includes('already been passed to createRoot'))).toEqual([]);
    } finally {
      console.error = original;
    }
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

  it('元素离开文档后 flushMounts 会把它清掉，不再往上渲染', async () => {
    const { mountReact, flushMounts } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    let text = 'first';
    mountReact('item:1', () => createElement('span', null, text), el);
    el.remove();

    text = 'second';
    flushMounts();
    await tick();

    expect(el.textContent).toBe('');
  });

  it('dropMount 卸载单个挂载点，flushMounts 不再碰它', async () => {
    const { mountReact, dropMount, flushMounts } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    let text = 'first';
    mountReact('item:1', () => createElement('span', null, text), el);
    dropMount(el);
    // root.unmount 排在微任务里
    await tick();
    expect(el.textContent).toBe('');

    text = 'second';
    flushMounts();
    await tick();
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

  it('同一 key 换了新的目标元素时，旧元素被卸载', async () => {
    const { mountReact } = createReactMounter();
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);

    mountReact('k', () => createElement('span', null, 'a'), first);
    mountReact('k', () => createElement('span', null, 'b'), second);
    await tick();

    expect(first.textContent).toBe('');
    expect(second.textContent).toBe('b');
  });

  it('cleanupAllRoots 卸载全部容器并清空记录', async () => {
    const { mountReact, cleanupAllRoots, flushMounts } = createReactMounter();
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);

    mountReact('a', () => createElement('span', null, 'a'), first);
    mountReact('b', () => createElement('span', null, 'b'), second);

    cleanupAllRoots();
    await tick();

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

  it('提交阶段内同一元素连投多次只渲染最后那份', async () => {
    const { mountReact, flushMounts, setReactPhase } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    let renders = 0;
    function Probe({ text }: { text: string }) {
      renders += 1;
      return createElement('span', null, text);
    }

    setReactPhase(true);
    let text = 'first';
    // 模拟一次宿主渲染：setList 触发新挂载，随后 flushMounts 又投一遍
    mountReact('item:1', () => createElement(Probe, { text }), el);
    text = 'second';
    flushMounts();
    setReactPhase(false);
    await tick();

    expect(el.textContent).toBe('second');
    expect(renders).toBe(1);
  });

  it('setReactPhase(true) 时渲染推迟到微任务，不在提交阶段里 flushSync', async () => {
    const { mountReact, setReactPhase } = createReactMounter();
    const el = document.createElement('div');
    document.body.appendChild(el);

    setReactPhase(true);
    mountReact('item:1', () => createElement('span', null, 'later'), el);
    // 这一拍还是空的 —— 提交阶段内 flushSync 既不生效还会警告
    expect(el.textContent).toBe('');

    setReactPhase(false);
    await tick();

    expect(el.textContent).toBe('later');
  });
});
