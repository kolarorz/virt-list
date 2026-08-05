import { describe, it, expect, afterEach } from 'vitest';
import Vue from 'vue';
import { createSlotMounter } from '../src/compat';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vue2 createSlotMounter', () => {
  it('确认测试跑在 Vue 2 上', () => {
    expect(Vue.version.startsWith('2.')).toBe(true);
  });

  it('单根插槽直接渲染，不加包裹层', () => {
    const { mountSlot } = createSlotMounter();
    const el = document.createElement('div');

    mountSlot('k', () => [h('span', 'only')], el);

    expect(el.children.length).toBe(1);
    expect(el.querySelector('.virt-list-slot-wrapper')).toBeNull();
  });

  it('多根插槽包裹在 .virt-list-slot-wrapper 中', () => {
    const { mountSlot } = createSlotMounter();
    const el = document.createElement('div');

    mountSlot('k', () => [h('span', 'a'), h('span', 'b')], el);

    const wrapper = el.querySelector('.virt-list-slot-wrapper');
    expect(wrapper).toBeTruthy();
    expect(wrapper!.children.length).toBe(2);
  });

  it('同一 key 与同一 el 上重复挂载走 $forceUpdate，不重建实例', async () => {
    const { mountSlot } = createSlotMounter();
    const el = document.createElement('div');

    mountSlot('k', () => [h('span', 'first')], el);
    const firstChild = el.children[0];

    mountSlot('k', () => [h('span', 'second')], el);
    // $forceUpdate 走 Vue 2 的异步渲染队列
    await Vue.nextTick();

    // 复用同一个 Vue 实例：根 DOM 节点不变，内容被更新
    expect(el.children[0]).toBe(firstChild);
    expect(el.textContent).toContain('second');
  });

  it('同一 key 换了容器时销毁旧实例并在新容器渲染', () => {
    const { mountSlot } = createSlotMounter();
    const first = document.createElement('div');
    const second = document.createElement('div');

    mountSlot('k', () => [h('span', 'a')], first);
    mountSlot('k', () => [h('span', 'b')], second);

    expect(second.textContent).toContain('b');
  });

  it('cleanupSlots 销毁所有实例', () => {
    const { mountSlot, cleanupSlots } = createSlotMounter();
    const el = document.createElement('div');

    mountSlot('k', () => [h('span', 'a')], el);
    expect(() => cleanupSlots()).not.toThrow();

    // 清理后再挂载同一 key 应视为全新实例，不报错
    expect(() => mountSlot('k', () => [h('span', 'b')], el)).not.toThrow();
    expect(el.textContent).toContain('b');
  });
});

/** Vue 2 没有独立的 h()，借一个实例的 $createElement 造 VNode */
const vnodeFactory = new Vue() as any;
function h(tag: string, text?: string): any {
  return vnodeFactory.$createElement(tag, text);
}
