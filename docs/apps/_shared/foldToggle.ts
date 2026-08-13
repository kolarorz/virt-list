/**
 * 展开/收起源码里的折叠区间（区间由 demoFold.ts 在构建时标出）。
 *
 * 高亮 HTML 是整段塞进容器的，里面的节点拿不到框架的事件绑定，所以统一走
 * 事件委托：把容器上的 click / keydown 交给这里，它自己判断有没有命中摘要。
 * 五个示例应用共用同一份，避免各写一遍再走偏。
 */

const FOLD = 'demo-fold';
const TOGGLE = 'demo-fold__toggle';

/**
 * @param target 事件的 target
 * @returns 是否命中了折叠摘要（用于决定要不要 preventDefault）
 */
export function toggleFoldAt(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  const toggle = target.closest(`.${TOGGLE}`);
  const fold = toggle?.parentElement;
  if (!toggle || !fold?.classList.contains(FOLD)) return false;

  const open = fold.getAttribute('data-open') !== 'true';
  fold.setAttribute('data-open', String(open));
  toggle.setAttribute('aria-expanded', String(open));
  return true;
}

/**
 * 键盘操作：摘要是 role="button"，Enter / 空格要能展开，且空格不该滚页。
 *
 * 参数只取需要的三个字段，原生 KeyboardEvent 和 React 的合成事件都能直接传进来
 * —— 后者不是原生 KeyboardEvent 的子类型，写成原生类型会让 React 侧类型不过。
 */
export function handleFoldKeydown(event: {
  key: string;
  target: EventTarget | null;
  preventDefault(): void;
}): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (toggleFoldAt(event.target)) event.preventDefault();
}
