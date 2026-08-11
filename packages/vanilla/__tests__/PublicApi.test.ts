import { describe, expect, it } from 'vitest';
import * as pkg from '../src/index';

/** 见 core 包同名用例的说明：锁住运行时导出清单 */
describe('@virt-list/vanilla 公共导出', () => {
  it('导出清单与预期一致', () => {
    expect(Object.keys(pkg).sort()).toEqual([
      'DEFAULT_DOM_OPTIONS',
      // 自绘滚动条的可复用零件：透出给别的虚拟化组件共用同一套外观与手势
      // （virt-table 的表格用它做纵横两条滚动条），不必各写一份
      'DEFAULT_MIN_THUMB_SIZE',
      'InputController',
      'Scrollbar',
      'VirtGrid',
      'VirtList',
      'VirtTree',
      'applyClass',
      'applyStyle',
      'computeThumb',
      'createStreamBuffer',
      'mergeStyles',
      'normalizeStyle',
      'pointerToRatio',
      'positionToRatio',
      'ratioToPosition',
      'setAttrs',
    ]);
  });

  it('滚动条零件可被外部实例化 / 调用', () => {
    expect(typeof pkg.Scrollbar).toBe('function');
    expect(typeof pkg.InputController).toBe('function');
    // geometry 那几个是纯函数，互逆关系是「拖到某处松手滑块不跳」的前提
    const { index, frac } = pkg.ratioToPosition(0.5, 100);
    expect(pkg.positionToRatio({ inViewBegin: index, maxBegin: 100, frac })).toBeCloseTo(0.5, 10);
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
