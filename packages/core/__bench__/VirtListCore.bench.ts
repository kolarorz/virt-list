import { bench, describe } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

/**
 * core 的热路径基准。
 *
 * 这里量的三处都在源码注释里被点名为性能敏感点：
 * - getItemSize：全 core 最热的函数，配置读取走 Proxy，靠字段快照优化
 * - _calcRange（经 scroll 事件触发）：稳态滚动应当是增量搜索，与列表长度无关
 * - _getTopByIndex（经 scrollToIndex 触发）：窗口内走 virtualSize 快路径，
 *   而非从 0 累加到 index
 *
 * 只做记录、不设门禁：基准数字受机器状态影响，跑红了不代表代码退化。
 */

const BIG = 300_000;

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: String(i) }));
}

function makeScrollEl() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollTop', {
    writable: true,
    configurable: true,
    value: 0,
  });
  return el;
}

const bigList = makeList(BIG);

function setup(options: Record<string, unknown> = {}) {
  const core = new VirtListCore({
    list: bigList,
    itemKey: 'id',
    itemPreSize: 40,
    ...options,
  });
  const el = makeScrollEl();
  core.bindDOM(el);
  core.slotSize.clientSize = 800;
  return { core, el };
}

describe('getItemSize 全量遍历（30w 项）', () => {
  const { core } = setup();
  const fixedCore = setup({ fixed: true }).core;

  bench('不定高（查 sizesMap）', () => {
    let total = 0;
    for (let i = 0; i < BIG; i += 1) total += core.getItemSize(String(i));
    if (total < 0) throw new Error('unreachable');
  });

  bench('固定高（走快照乘法）', () => {
    let total = 0;
    for (let i = 0; i < BIG; i += 1) total += fixedCore.getItemSize(String(i));
    if (total < 0) throw new Error('unreachable');
  });
});

describe('稳态滚动的区间增量搜索', () => {
  const { el } = setup();
  // 先滚到中段，让搜索起点远离 0
  el.scrollTop = (BIG / 2) * 40;
  el.dispatchEvent(new Event('scroll'));
  let offset = el.scrollTop;

  bench('每帧前进一屏', () => {
    offset += 800;
    el.scrollTop = offset;
    el.dispatchEvent(new Event('scroll'));
  });
});

describe('滚动定位到指定索引', () => {
  const { core, el } = setup();
  el.scrollTop = 100_000 * 40;
  el.dispatchEvent(new Event('scroll'));
  const nearby = core.getState().inViewBegin + 5;

  bench('窗口内（virtualSize 快路径）', () => {
    core.scrollToIndex(nearby);
  });

  bench('远处（从 0 累加）', () => {
    core.getItemPosByIndex(250_000);
  });
});

describe('列表整体替换', () => {
  const lists = [makeList(50_000), makeList(50_001)];
  const { core } = setup();
  let i = 0;

  bench('updateOptions({ list }) 触发全量重算', () => {
    core.updateOptions({ list: lists[i++ % 2]! });
  });
});
