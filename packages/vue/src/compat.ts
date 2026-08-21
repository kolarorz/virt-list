/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  defineComponent,
  getCurrentInstance,
  h,
  render as vueRender,
  type VNode,
} from 'vue';

/**
 * Vue 3 挂载适配器。
 *
 * 插槽内容要渲染进 core 建好的 item / slot 元素里，而这些元素不在本组件的
 * vdom 树上，所以只能用独立的 `render(vnode, el)`。关键约束：
 * **插槽函数必须在某个组件的 render 内被调用**，否则它读到的响应式数据
 * 不会被任何 render effect 收集 —— Vue 会直接警告
 * `Slot "xxx" invoked outside of the render function`，后果是流式场景里
 * 改 `itemData.text` 不再触发更新（core 的增量 patch 对已在池中的项不会
 * 重新调用 renderItem，见 vanilla 的 `_patch`，所以框架层这一环断了就没救了）。
 *
 * 因此这里不直接渲染「求值后的 VNode」，而是渲染一个只干一件事的组件：
 * 在自己的 render 里调 slotFn。依赖被这个组件的 render effect 收集，
 * 数据一变它自更新，且只更新这一个挂载点。语义与 vue2 适配器
 * （每个挂载点一个 Vue 实例）一致。
 *
 * 遗留噪音（不是 bug）：用 `h(VirtList, props, { default: fn })` 这种**手写对象插槽**时，
 * 上面那条 warning 仍会在每个挂载点的首次渲染打一次。Vue 的判定条件是
 * `currentInstance && ctx.root === currentInstance.root`（见 runtime-core 的 normalizeSlot），
 * 而我们的挂载发生在 `onMounted` 内 —— 钩子期间 currentInstance 非空，于是即便依赖
 * 已经被 SlotRenderer 的 render effect 正确收集，它也照样警告。Vue 没给这条留关闭开关。
 * SFC 的 `<template #xxx>` 编译出的插槽带 `_` 标记，走 initSlots 的快路径、不套这层
 * 包装，因此**文档站与真实使用都不会看到**；此处仅影响 h() 手写插槽的调试输出。
 */

const SlotRenderer = defineComponent({
  name: 'VirtListSlotRenderer',
  props: {
    slotFn: {
      type: Function as unknown as () => () => VNode[],
      required: true,
    },
  },
  setup(props) {
    // 插槽在 render 内调用 —— 依赖收集就落在这个组件上
    return () => (props.slotFn as unknown as () => VNode[])();
  },
});

export function createSlotMounter() {
  const slotContainers = new Map<string, HTMLElement>();
  // 挂载点不在组件树上，appContext 得手动带过去，否则插槽内容里的
  // inject / 全局注册的组件、指令都取不到
  const appContext = getCurrentInstance()?.appContext ?? null;

  /** 将插槽渲染到目标 el 中，无额外包裹层（组件 render 返回数组即 Fragment） */
  function mountSlot(mountKey: string, slotFn: () => VNode[], el: HTMLElement): void {
    const old = slotContainers.get(mountKey);
    if (old && old !== el) vueRender(null, old);

    // 每次都传新的函数标识 → props 变化 → SlotRenderer 重渲染，
    // 与「core 每次调 renderItem 都重新出内容」的预期一致
    const vNode = h(SlotRenderer, { slotFn });
    if (appContext) (vNode as any).appContext = appContext;
    vueRender(vNode, el);

    slotContainers.set(mountKey, el);
  }

  /**
   * 项滚出渲染窗口时清账（接 core 的 `onItemUnmounted`）。
   *
   * 少了这一步就是一条内存泄漏：core 只把元素从文档里摘掉，`SlotRenderer` 及其
   * **render effect** 还挂在上面，并且仍订阅着那一项的响应式数据 —— 长列表滚过的
   * 每个 key 都留下一个脱离文档的组件实例，改数据时它们还会各自白渲染一遍。
   * `cleanupSlots()` 只在组件卸载时跑，兜不住滚动过程。
   *
   * 传入的是**项元素**，而挂载点可能是它的后代（Grid 的单元格、Tree 的节点行），
   * 所以按 `contains` 匹配 —— `el.contains(el)` 为真，List 那种"挂载点就是项元素
   * 本身"的情形一并覆盖。core 在 `remove()` 之前回调，此刻子树还完整。
   */
  function dropSlot(el: HTMLElement): void {
    slotContainers.forEach((mountEl, key) => {
      if (el !== mountEl && !el.contains(mountEl)) return;
      vueRender(null, mountEl);
      // 遍历中删除当前项是安全的：Map 的迭代器只跳过"已删除且未重新插入"的键
      slotContainers.delete(key);
    });
  }

  function cleanupSlots(): void {
    slotContainers.forEach((el) => vueRender(null, el));
    slotContainers.clear();
  }

  return { mountSlot, dropSlot, cleanupSlots };
}
