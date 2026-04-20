import type { StyleValue } from '@virt-list/core';

/** Convert a camelCase style object to a CSS text string. */
function styleObjectToCSS(obj: Record<string, string | number>): string {
  let css = '';
  for (const key in obj) {
    const prop = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    css += `${prop}:${obj[key]};`;
  }
  return css;
}

/** Normalize a StyleValue (string or object) to a CSS text string. */
export function normalizeStyle(style: StyleValue): string {
  return typeof style === 'string' ? style : styleObjectToCSS(style);
}

export function mergeStyles(...styles: (StyleValue | undefined | null)[]): string {
  let result = '';
  for (const s of styles) {
    if (!s) continue;
    const css = normalizeStyle(s);
    if (css) result += css + ';';
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

export function applyStyle(el: HTMLElement, style: StyleValue): void {
  el.setAttribute('style', normalizeStyle(style));
}

export function applyClass(el: HTMLElement, cls: string): void {
  if (cls) el.className = cls;
}
