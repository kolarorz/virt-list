import { describe, expect, it } from 'vitest';
import * as pkg from '../src/index';

/** 见 core 包同名用例的说明：锁住运行时导出清单 */
describe('@virt-list/react 公共导出', () => {
  it('导出清单与预期一致', () => {
    expect(Object.keys(pkg).sort()).toEqual([
      'VirtGrid',
      'VirtList',
      'VirtTree',
      'useVirtList',
    ]);
  });

  it('三个组件都有定义（框架包装后是对象而非函数）', () => {
    expect(pkg.VirtList).toBeTruthy();
    expect(pkg.VirtGrid).toBeTruthy();
    expect(pkg.VirtTree).toBeTruthy();
  });

  it('useVirtList 是可调用的 hook', () => {
    expect(typeof pkg.useVirtList).toBe('function');
  });
});
