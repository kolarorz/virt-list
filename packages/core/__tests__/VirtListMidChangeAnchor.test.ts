import { describe, it, expect } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

function makeList(n: number, prefix = 'k') {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }));
}

/** 固定行高 50、视口 400 的已绑定列表 */
function setup(len = 200) {
  const core = new VirtListCore<any>({
    list: makeList(len),
    itemKey: 'id',
    estimatedSize: 50,
    fixedSize: true,
  });
  core.bindDOM(document.createElement('div'));
  core.slotSize.clientSize = 400;
  return core;
}

/** 当前视口顶部那一项的 key */
const topKey = (core: VirtListCore<any>) =>
  core.props.list[core.state.inViewBegin]?.id;

describe('中间增删的视口锚点补偿', () => {
  it('删掉视口上方的一项：视口顶部仍是同一项', () => {
    const core = setup();
    core.scrollFromUser(2500);
    expect(topKey(core)).toBe('k50');

    const next = core.props.list.slice();
    next.splice(10, 1);
    core.updateOptions({ list: next });

    expect(topKey(core)).toBe('k50');
    // 上方少了一项 50px，偏移量要跟着收
    expect(core.getOffset()).toBe(2450);
  });

  it('在视口上方插入一项：视口顶部仍是同一项', () => {
    const core = setup();
    core.scrollFromUser(2500);

    const next = core.props.list.slice();
    next.splice(10, 0, { id: 'inserted' });
    core.updateOptions({ list: next });

    expect(topKey(core)).toBe('k50');
    expect(core.getOffset()).toBe(2550);
  });

  it('批量删除视口上方的一整页：视口顶部仍是同一项', () => {
    const core = setup(400);
    core.scrollFromUser(10000);
    const before = topKey(core);
    expect(before).toBe('k200');

    const next = core.props.list.slice();
    next.splice(20, 30);
    core.updateOptions({ list: next });

    expect(topKey(core)).toBe('k200');
    expect(core.getOffset()).toBe(10000 - 30 * 50);
  });

  it('删掉视口下方的项：偏移量与视口内容都不动', () => {
    const core = setup();
    core.scrollFromUser(2500);

    const next = core.props.list.slice();
    next.splice(150, 10);
    core.updateOptions({ list: next });

    expect(topKey(core)).toBe('k50');
    expect(core.getOffset()).toBe(2500);
  });

  it('锚点自己被删掉：退回原行为（保持像素偏移），不乱跳', () => {
    const core = setup();
    core.scrollFromUser(2500);

    const next = core.props.list.slice();
    next.splice(50, 1); // 删的正是视口顶部那一项
    core.updateOptions({ list: next });

    // 下一项顶上来，偏移量不变
    expect(core.getOffset()).toBe(2500);
    expect(topKey(core)).toBe('k51');
  });

  it('整体换数据源：锚点找不到，不做补偿', () => {
    const core = setup();
    core.scrollFromUser(2500);

    core.updateOptions({ list: makeList(200, 'other') });

    expect(core.getOffset()).toBe(2500);
  });

  it('尾部追加不受影响（锚点没挪位，一次 === 就短路）', () => {
    const core = setup();
    core.scrollFromUser(2500);

    core.updateOptions({ list: [...core.props.list, { id: 'tail' }] });

    expect(topKey(core)).toBe('k50');
    expect(core.getOffset()).toBe(2500);
  });

  it('同 key 换新对象（不可变替换）不受影响', () => {
    const core = setup();
    core.scrollFromUser(2500);

    core.updateOptions({
      list: core.props.list.map((it: any) => ({ ...it, extra: 1 })),
    });

    expect(topKey(core)).toBe('k50');
    expect(core.getOffset()).toBe(2500);
  });

  it('停在顶部时中间删除不会把视口推成负偏移', () => {
    const core = setup();
    expect(core.getOffset()).toBe(0);

    const next = core.props.list.slice();
    next.splice(5, 3);
    core.updateOptions({ list: next });

    expect(core.getOffset()).toBe(0);
    expect(core.state.inViewBegin).toBe(0);
  });

  it('位移超出扫描半径时放弃补偿而不是找错项', () => {
    const core = setup(4000);
    core.scrollFromUser(100000);
    const before = topKey(core);

    // 在视口上方删掉远超 ANCHOR_SCAN_RADIUS（512）的一大段
    const next = core.props.list.slice();
    next.splice(100, 900);
    core.updateOptions({ list: next });

    // 补偿不了就保持像素偏移，绝不能把偏移量算到别的项上
    expect(core.getOffset()).toBe(100000);
    expect(topKey(core)).not.toBe(before);
  });
});

describe('不定高列表的锚点补偿', () => {
  it('按实测尺寸补偿，而不是按预估值', () => {
    const core = new VirtListCore<any>({
      list: makeList(100),
      itemKey: 'id',
      estimatedSize: 50,
    });
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;
    // 前 20 项各 80px，其余按预估 50px
    for (let i = 0; i < 20; i += 1) core.setItemSize(`k${i}`, 80);
    core.forceUpdate();

    core.scrollFromUser(1600); // 落在 index 20（前 20 项共 1600）
    expect(topKey(core)).toBe('k20');

    const next = core.props.list.slice();
    next.splice(3, 1); // 删掉一个 80px 的项
    core.updateOptions({ list: next });

    expect(topKey(core)).toBe('k20');
    expect(core.getOffset()).toBe(1600 - 80);
  });
});
