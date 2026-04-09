export const isScrollElement = (element: HTMLElement): boolean => {
  const clientHeight =
    element === document.documentElement
      ? element.clientHeight
      : element.offsetHeight;
  const clientWidth =
    element === document.documentElement
      ? element.clientWidth
      : element.offsetWidth;

  return (
    element.scrollHeight > clientHeight || element.scrollWidth > clientWidth
  );
};

export const getScrollParentElement = (
  container: HTMLElement,
  top: HTMLElement = document.documentElement,
): HTMLElement | null => {
  let scrollElement: HTMLElement | null = null;
  let element: HTMLElement | null = container;
  while (element && element !== top && !scrollElement) {
    if (isScrollElement(element)) {
      scrollElement = element;
    }
    element = element.parentElement;
  }
  return scrollElement;
};

export const isSiblingElement = (a: Element, b: Element): boolean => {
  return a.previousElementSibling === b || a.nextElementSibling === b;
};

export const findAncestorWithClass = (
  element: Element,
  className: string,
): HTMLElement | null => {
  let ancestor = element.parentElement;
  while (ancestor) {
    if (ancestor.classList.contains(className)) {
      return ancestor;
    }
    ancestor = ancestor.parentElement;
  }
  return null;
};

export function getPrevSibling(element: Element): Element | undefined {
  let sibling = element.previousElementSibling;
  while (sibling && (sibling.nodeType === 3 || sibling.nodeType === 8)) {
    sibling = sibling.previousElementSibling;
  }
  if (sibling?.classList.contains('virt-tree-item')) return sibling;
  return undefined;
}

export function getNextSibling(element: Element): Element | undefined {
  let sibling = element.nextElementSibling;
  while (sibling && (sibling.nodeType === 3 || sibling.nodeType === 8)) {
    sibling = sibling.nextElementSibling;
  }
  if (sibling?.classList.contains('virt-tree-item')) return sibling;
  return undefined;
}
