import type { ClassValue, StyleObject, StyleValue } from '@virt-list/core';

/** Convert a camelCase style object to a CSS text string. */
function styleObjectToCSS(obj: StyleObject): string {
  let css = '';
  for (const key in obj) {
    const value = obj[key];
    if (value === null || value === undefined) continue;
    const prop = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    css += `${prop}:${value};`;
  }
  return css;
}

/** Normalize a StyleValue to a CSS text string. */
export function normalizeStyle(style: StyleValue): string {
  if (Array.isArray(style)) {
    return style.map((s) => normalizeStyle(s)).join('');
  }
  return typeof style === 'string' ? style : styleObjectToCSS(style);
}

/** Normalize class values (string / object / array) to class text. */
export function normalizeClass(cls: ClassValue): string {
  if (Array.isArray(cls)) {
    return cls.map((c) => normalizeClass(c)).filter(Boolean).join(' ');
  }
  if (typeof cls === 'string') return cls;
  const tokens: string[] = [];
  for (const key in cls) {
    if (cls[key]) tokens.push(key);
  }
  return tokens.join(' ');
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

export function applyClass(el: HTMLElement, cls: ClassValue): void {
  const normalized = normalizeClass(cls);
  if (normalized) el.className = normalized;
}
