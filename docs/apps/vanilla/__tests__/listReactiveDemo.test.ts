import { beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error 纯 JS 的 demo 源码
import { bootstrapReactive } from '../src/components/list/list-reactive.js';

/**
 * 「响应式更新」示例的 smoke 测试。
 *
 * 这个 demo 承担了讲清 updateItem 契约的任务，而它的说服力全在那个对比上：
 * 整体换新 → 行上的轮次跟着涨；原地改字段 → 数据涨了但界面停住，refreshItems() 才追上。
 * 对比一旦失效（比如哪天 vanilla 默认就全刷了），demo 就从「教学」变成「误导」，
 * 所以把这两种模式的差异锁在这里。
 *
 * vanilla 版是五个 demo 里唯一能在 jsdom 里直接跑的（不需要框架运行时），
 * 也是唯一必须自己写 updateItem 的 —— 正好用它守住这条契约。
 */

beforeEach(() => {
  document.body.innerHTML = '';
  globalThis.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('smoke：vanilla list-reactive demo', () => {
  it('挂载、切模式、跑一轮、refreshItems 都不报错', () => {
    const errs: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => { errs.push(String(a[0])); });
    vi.useFakeTimers();

    const root = document.createElement('div');
    document.body.appendChild(root);
    const dispose = bootstrapReactive(root);

    // 初始渲染出了行
    const cells = () => root.querySelectorAll('.demo-row-item').length;
    expect(cells()).toBeGreaterThan(0);
    const firstText = () => root.querySelector('.demo-row-text')!.textContent!;
    expect(firstText()).toContain('轮次');

    // 整体换新模式跑一轮 → 轮次应该涨到 1
    root.querySelector<HTMLButtonElement>('#btnStart')!.click();
    expect(root.querySelector('#stats')!.textContent).toContain('数据已改: 1 轮');
    expect(firstText()).toContain('轮次: <b>1</b>'.replace(/<[^>]+>/g, ''));

    // 切到原地修改：再跑一轮，界面应停住（行上仍是上一轮）
    const beforeSwitch = firstText();
    root.querySelector<HTMLButtonElement>('#btnMutate')!.click();
    vi.advanceTimersByTime(1000);
    expect(root.querySelector('#stats')!.textContent).toContain('数据已改: 2 轮');
    expect(firstText()).toBe(beforeSwitch);

    // refreshItems 追上
    root.querySelector<HTMLButtonElement>('#btnRefresh')!.click();
    expect(firstText()).not.toBe(beforeSwitch);

    root.querySelector<HTMLButtonElement>('#btnStop')!.click();
    dispose();
    expect(errs).toEqual([]);
    vi.useRealTimers();
  });
});
