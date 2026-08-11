import { describe, it, expect } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

const KEY = 'id';
function mk(from: number, n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `k${from + i}` }));
}
function setup(list: any[], clientSize = 400) {
  const core = new VirtListCore<any>({
    list, itemKey: KEY, estimatedSize: 50, fixedSize: true,
  });
  core.bindDOM(document.createElement('div'));
  core.slotSize.clientSize = clientSize;
  return core;
}

/**
 * 头部增删的位移补偿。
 *
 * 使用方只管把新数据写进 list，补偿由 _diffHead 自动识别——曾经这件事要靠手动调
 * 手动的头部补偿方法，它们已经删掉，所以这里的覆盖就是全部保障。
 */
describe('头部增删的自动位移补偿', () => {
  it('头部插入：视口内容留在原处', () => {
    const core = setup(mk(0, 1000));
    core.scrollToOffset(5000);

    core.updateOptions({ list: [...mk(-10, 10), ...mk(0, 1000)] });

    expect(core.getOffset()).toBe(5000 + 10 * 50);
  });

  it('头部删除：视口内容留在原处', () => {
    const core = setup(mk(0, 1000));
    core.scrollToOffset(5000);

    core.updateOptions({ list: mk(10, 990) });

    expect(core.getOffset()).toBe(5000 - 10 * 50);
  });

  it('双向分页：一端加一页、另一端裁一页，总长不变也能识别', () => {
    const core = setup(mk(0, 1000));
    core.scrollToOffset(5000);

    // 前插 100，尾部裁 100：长度不变，但头部整体推移了
    core.updateOptions({ list: [...mk(-100, 100), ...mk(0, 900)] });

    expect(core.getOffset()).toBe(5000 + 100 * 50);
  });

  it('头部插入 3000 项（旧的 2048 上界之外）也能补偿', () => {
    const core = setup(mk(0, 1000));
    core.scrollToOffset(5000);

    core.updateOptions({ list: [...mk(-3000, 3000), ...mk(0, 1000)] });

    expect(core.getOffset()).toBe(5000 + 3000 * 50);
  });

  it('头部删除 3000 项也能补偿', () => {
    const core = setup(mk(0, 10000));
    core.scrollToOffset(200000);

    core.updateOptions({ list: mk(3000, 7000) });

    expect(core.getOffset()).toBe(200000 - 3000 * 50);
  });

  it('超出识别上界（65536）时不补偿，按整体换源处理', () => {
    const core = setup(mk(0, 1000));
    core.scrollToOffset(5000);

    core.updateOptions({ list: [...mk(-70000, 70000), ...mk(0, 1000)] });

    // 识别不出来就不动视口——这是刻意的，那种量级更可能是换数据源
    expect(core.getOffset()).toBe(5000);
  });

  it('整体换数据源：不维持视口位置', () => {
    const core = setup(mk(0, 1000));
    core.scrollToOffset(5000);

    core.updateOptions({ list: mk(90000, 1000) });

    expect(core.getOffset()).toBe(5000);
  });
});
