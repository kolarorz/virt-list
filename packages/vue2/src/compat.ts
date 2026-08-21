/* eslint-disable @typescript-eslint/no-explicit-any */
import Vue from 'vue';
import { VNode } from 'vue/types/umd';
/**
 * Vue 2 mounting adapter.
 *
 * Vue 2 lacks the standalone `render(vnode, container)` API and `Fragment`.
 * Instead we create a lightweight Vue instance per mount point and use
 * `$mount()` + manual DOM insertion.
 *
 * Single-root slots render directly (no wrapper). Multi-root slots get a
 * transparent `<div style="display:contents">` wrapper — invisible to layout
 * but satisfying Vue 2's single-root requirement.
 *
 * Vue 2.7 has built-in Composition API so `import Vue from 'vue'` works.
 * For Vue 2.6 users with @vue/composition-api, a build alias
 * from 'vue' to '@vue/composition-api' is needed.
 */

interface SlotEntry {
  instance: any;
  el: HTMLElement;
  slotFn: () => VNode[];
}

export function createSlotMounter() {
  const slotMap = new Map<string, SlotEntry>();

  function mountSlot(mountKey: string, slotFn: () => VNode[], el: HTMLElement): void {
    const old = slotMap.get(mountKey);
    if (old) {
      if (old.el === el) {
        old.slotFn = slotFn;
        old.instance.$forceUpdate();
        return;
      }
      old.instance.$destroy();
    }

    const entry: SlotEntry = { instance: null, el, slotFn };

    const instance = new Vue({
      render(h: any) {
        const vNodes = entry.slotFn();
        // 单根节点直接返回，否则包裹在 <div style="display:contents"> 中
        return vNodes.length === 1
          ? vNodes[0]
          : h('div', { class: 'virt-list-slot-wrapper' }, vNodes);
      },
    });

    entry.instance = instance;
    instance.$mount();
    el.innerHTML = '';
    // append 而不是 mount，因为 mount 会重新创建一个实例
    el.appendChild(instance.$el);
    slotMap.set(mountKey, entry);
  }

  /**
   * 项滚出渲染窗口时清账（接 core 的 `onItemUnmounted`）。
   *
   * 少了这一步就是一条内存泄漏：core 只把元素从文档里摘掉，每个挂载点的 Vue 实例
   * 还活着、watcher 还订阅着那一项的数据 —— 长列表滚过的每个 key 都留下一个实例。
   * `cleanupSlots()` 只在组件卸载时跑，兜不住滚动过程。
   *
   * 传入的是**项元素**，而挂载点可能是它的后代（Grid 的单元格、Tree 的节点行），
   * 所以按 `contains` 匹配 —— `el.contains(el)` 为真，List 那种"挂载点就是项元素
   * 本身"的情形一并覆盖。core 在 `remove()` 之前回调，此刻子树还完整。
   */
  function dropSlot(el: HTMLElement): void {
    slotMap.forEach((entry, key) => {
      if (el !== entry.el && !el.contains(entry.el)) return;
      entry.instance.$destroy();
      // 遍历中删除当前项是安全的：Map 的迭代器只跳过"已删除且未重新插入"的键
      slotMap.delete(key);
    });
  }

  function cleanupSlots(): void {
    slotMap.forEach(({ instance }) => instance.$destroy());
    slotMap.clear();
  }

  return { mountSlot, dropSlot, cleanupSlots };
}
