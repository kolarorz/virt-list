import { describe, expect, it } from 'vitest';
import * as pkg from '../src/index';

/** 见 core 包同名用例的说明：锁住运行时导出清单 */
describe('@virt-list/vanilla 公共导出', () => {
  it('导出清单与预期一致', () => {
    expect(Object.keys(pkg).sort()).toEqual([
      'VirtGrid',
      'VirtList',
      'VirtTree',
      'applyClass',
      'applyStyle',
      'mergeStyles',
      'normalizeStyle',
      'setAttrs',
    ]);
  });

  it('三个组件都是构造函数', () => {
    expect(typeof pkg.VirtList).toBe('function');
    expect(typeof pkg.VirtGrid).toBe('function');
    expect(typeof pkg.VirtTree).toBe('function');
  });

  it('样式工具函数可直接调用', () => {
    expect(pkg.normalizeStyle({ minHeight: '1px' })).toBe('min-height:1px;');
    expect(pkg.mergeStyles('a:1', 'b:2')).toBe('a:1;b:2;');
  });
});
