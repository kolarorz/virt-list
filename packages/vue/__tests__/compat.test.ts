import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent, h, nextTick, ref, version, createApp, type App } from 'vue';
import { createSlotMounter } from '../src/compat';

/**
 * createSlotMounter 必须在组件的 setup 里调用（要拿 appContext），
 * 所以这里用一个宿主组件把它挂起来，再从外面驱动。
 */
function setupMounter(): {
  app: App;
  mountSlot: ReturnType<typeof createSlotMounter>['mountSlot'];
  cleanupSlots: ReturnType<typeof createSlotMounter>['cleanupSlots'];
} {
  let api: ReturnType<typeof createSlotMounter> | null = null;
  const Host = defineComponent({
    setup() {
      api = createSlotMounter();
      return () => h('div');
    },
  });
  const app = createApp(Host);
  app.mount(document.createElement('div'));
  return { app, mountSlot: api!.mountSlot, cleanupSlots: api!.cleanupSlots };
}

let current: App | null = null;

afterEach(() => {
  current?.unmount();
  current = null;
  document.body.innerHTML = '';
});

describe('vue createSlotMounter', () => {
  it('确认测试跑在 Vue 3 上', () => {
    expect(version.startsWith('3.')).toBe(true);
  });

  it('单根插槽直接渲染，不加包裹层', () => {
    const { app, mountSlot } = setupMounter();
    current = app;
    const el = document.createElement('div');

    mountSlot('k', () => [h('span', { class: 'only' }, 'x')], el);

    expect(el.children.length).toBe(1);
    expect(el.querySelector('.only')).toBeTruthy();
  });

  it('多根插槽一并渲染，同样不加包裹层', () => {
    const { app, mountSlot } = setupMounter();
    current = app;
    const el = document.createElement('div');

    mountSlot('k', () => [h('span', 'a'), h('span', 'b')], el);

    expect(el.children.length).toBe(2);
    expect(el.textContent).toBe('ab');
  });

  it('插槽在 render 内被调用，读到的响应式数据变化后自动重渲染', async () => {
    const { app, mountSlot } = setupMounter();
    current = app;
    const el = document.createElement('div');
    const text = ref('first');

    // 挂载后不再有人调 mountSlot —— 更新完全依赖依赖收集
    mountSlot('k', () => [h('span', text.value)], el);
    expect(el.textContent).toBe('first');

    text.value = 'second';
    await nextTick();

    expect(el.textContent).toBe('second');
  });

  it('同一 key 换了新的目标元素时，旧元素被清空', () => {
    const { app, mountSlot } = setupMounter();
    current = app;
    const first = document.createElement('div');
    const second = document.createElement('div');

    mountSlot('k', () => [h('span', 'a')], first);
    mountSlot('k', () => [h('span', 'b')], second);

    expect(first.textContent).toBe('');
    expect(second.textContent).toBe('b');
  });

  it('cleanupSlots 清空全部挂载点', () => {
    const { app, mountSlot, cleanupSlots } = setupMounter();
    current = app;
    const first = document.createElement('div');
    const second = document.createElement('div');

    mountSlot('a', () => [h('span', 'a')], first);
    mountSlot('b', () => [h('span', 'b')], second);

    cleanupSlots();

    expect(first.textContent).toBe('');
    expect(second.textContent).toBe('');
  });

  it('没挂载过任何插槽时 cleanupSlots 是安全的空操作', () => {
    const { app, cleanupSlots } = setupMounter();
    current = app;

    expect(() => cleanupSlots()).not.toThrow();
  });
});
