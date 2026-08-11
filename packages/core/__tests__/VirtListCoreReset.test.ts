import { describe, it, expect, vi } from 'vitest';
import { VirtListCore } from '../src/VirtListCore';

function makeList(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `k${i}` }));
}

/** 建一个已绑定容器、视口 400px 的固定行高列表 */
function setup(len = 1000, clientSize = 400) {
  const core = new VirtListCore<any>({
    list: makeList(len),
    itemKey: 'id',
    estimatedSize: 50,
    fixedSize: true,
  });
  core.bindDOM(document.createElement('div'));
  core.slotSize.clientSize = clientSize;
  return core;
}

describe('reset 与权威偏移量', () => {
  it('reset() 后 getOffset() 归零', () => {
    const core = setup();
    core.scrollToOffset(5000);
    expect(core.getOffset()).toBe(5000);

    core.reset();

    // 权威偏移量必须一起归零：只归零内部镜像会让「账本说 0、内容停在旧位置」活下来
    expect(core.getOffset()).toBe(0);
    expect(core.state.inViewBegin).toBe(0);
    expect(core.state.itemsTotalSize).toBe(0);
  });

  it('reset() 会通知 DOM 层把内容搬回原点', () => {
    const offsetChange = vi.fn();
    const core = new VirtListCore<any>(
      { list: makeList(1000), itemKey: 'id', estimatedSize: 50, fixedSize: true },
      { offsetChange },
    );
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;

    core.scrollToOffset(5000);
    offsetChange.mockClear();

    core.reset();
    expect(offsetChange).toHaveBeenCalledWith(0);
  });

  it('本来就在原点时 reset() 不发多余的 offsetChange', () => {
    const offsetChange = vi.fn();
    const core = new VirtListCore<any>(
      { list: makeList(10), itemKey: 'id', estimatedSize: 50, fixedSize: true },
      { offsetChange },
    );
    core.bindDOM(document.createElement('div'));
    core.slotSize.clientSize = 400;
    offsetChange.mockClear();

    core.reset();
    expect(offsetChange).not.toHaveBeenCalled();
  });

  it('清空列表再灌回数据后，偏移量与渲染区间自洽（不白屏）', () => {
    const core = setup();
    core.scrollToOffset(5000);

    // 清空会走 _onListChange 的空列表分支，内部调 reset()
    core.updateOptions({ list: [] });
    expect(core.getOffset()).toBe(0);

    core.updateOptions({ list: makeList(1000) });

    // 视口 [offset, offset + clientSize] 必须完整落在渲染区间内
    const offset = core.getOffset();
    const { renderBegin, renderEnd } = core.state;
    const top = core.getItemPosByIndex(renderBegin).top;
    const bottom = core.getItemPosByIndex(renderEnd).bottom;
    expect(offset).toBeGreaterThanOrEqual(top);
    expect(offset + core.slotSize.clientSize).toBeLessThanOrEqual(bottom);
  });

  it('reset() 会停掉进行中的平滑动画，不让它把偏移量写回去', async () => {
    const core = setup();
    const onDone = vi.fn();
    core.scrollToOffset(20000, { behavior: 'smooth', duration: 200, onDone });

    core.reset();
    // 动画若还活着，它的下一帧会按旧目标重新写入偏移量
    await new Promise((r) => setTimeout(r, 60));

    expect(onDone).toHaveBeenCalledWith(true);
    expect(core.getOffset()).toBe(0);
  });
});
