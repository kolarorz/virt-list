import { defineComponent, ref, onMounted, onBeforeUnmount, h } from 'vue-demi';

/**
 * 列表项包装组件，负责将 ResizeObserver 绑定到每个列表项的 DOM 元素上。
 * data-id 属性用于 VirtListCore 在 ResizeObserver 回调中识别是哪个项发生了尺寸变化。
 */
export const ObserverItem = defineComponent({
  name: 'ObserverItem',
  props: {
    id: { type: [String, Number], required: true },
    resizeObserver: { type: Object, default: undefined },
  },
  setup(props, { slots }) {
    const elRef = ref<HTMLElement | null>(null);

    onMounted(() => {
      if (elRef.value && props.resizeObserver) {
        (props.resizeObserver as ResizeObserver).observe(elRef.value);
      }
    });

    onBeforeUnmount(() => {
      if (elRef.value && props.resizeObserver) {
        (props.resizeObserver as ResizeObserver).unobserve(elRef.value);
      }
    });

    return () =>
      h(
        'div',
        { ref: elRef, 'data-id': String(props.id) },
        slots.default?.(),
      );
  },
});
