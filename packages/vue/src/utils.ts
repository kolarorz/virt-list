/* eslint-disable @typescript-eslint/no-explicit-any */
import { h } from 'vue-demi';

export function mergeStyles(
  ...styles: (string | undefined | null)[]
): string {
  let result = '';
  for (const s of styles) {
    if (!s) continue;
    result += s;
    if (!s.endsWith(';')) result += ';';
  }
  return result;
}

export function getSlot(
  instance: any,
  name: string,
): ((...args: any[]) => any) | undefined {
  return instance.$slots?.[name];
}

export function _h(tag: string, data: any, children?: any): any {
  const { attrs, ...rest } = data || {};
  return h(tag, { ...rest, ...attrs }, children);
}

export function _hChild(component: any, data: any, children?: any): any {
  const { attrs, ...rest } = data || {};
  const flatProps = { ...rest, ...attrs };
  if (children !== undefined) {
    return h(component, flatProps, { default: () => children });
  }
  return h(component, flatProps);
}
