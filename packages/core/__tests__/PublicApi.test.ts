import { describe, expect, it } from 'vitest';
import * as pkg from '../src/index';

/**
 * 锁住包的运行时导出清单。
 *
 * 漏导出不会让编译失败，只会在下游（docs / 框架包）用到时才炸——
 * 这里把清单固定下来，少了立刻红，多了也要显式确认。
 */
describe('@virt-list/core 公共导出', () => {
  it('导出清单与预期一致', () => {
    expect(Object.keys(pkg).sort()).toEqual([
      'DEFAULT_OPTIONS',
      'ListLoader',
      'VirtListCore',
    ]);
  });

  it('VirtListCore 可实例化', () => {
    const core = new pkg.VirtListCore({
      list: [{ id: '0' }],
      itemKey: 'id',
      itemPreSize: 40,
    });

    expect(core.getState().listTotalSize).toBe(40);
  });

  it('DEFAULT_OPTIONS 覆盖全部可选配置项', () => {
    expect(Object.keys(pkg.DEFAULT_OPTIONS).sort()).toEqual([
      'buffer',
      'bufferBottom',
      'bufferTop',
      'fixed',
      'hasMoreBottom',
      'hasMoreTop',
      'horizontal',
      'initialPosition',
      'itemGap',
      'loadMore',
      'offset',
      'renderControl',
      'scrollDistance',
      'scrollDuration',
      'smoothMaxDistance',
      'start',
      'stickyBottom',
      'stickyThreshold',
    ]);
  });
});
