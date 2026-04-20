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

  function cleanupSlots(): void {
    slotMap.forEach(({ instance }) => instance.$destroy());
    slotMap.clear();
  }

  return { mountSlot, cleanupSlots };
}
