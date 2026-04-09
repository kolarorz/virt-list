export function mergeStyles(...styles: (string | undefined | null)[]): string {
  let result = '';
  for (const s of styles) {
    if (s) result += s + ';';
  }
  return result;
}

export function setAttrs(
  el: HTMLElement,
  attrs: Record<string, string>,
): void {
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
}

export function applyStyle(el: HTMLElement, style: string): void {
  el.setAttribute('style', style);
}

export function applyClass(el: HTMLElement, cls: string): void {
  if (cls) el.className = cls;
}
