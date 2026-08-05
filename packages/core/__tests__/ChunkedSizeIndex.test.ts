import { describe, expect, it, vi } from 'vitest';
import { ChunkedSizeIndex } from '../src/ChunkedSizeIndex';

/** 朴素实现，作为分块索引的参照答案 */
function naivePrefix(sizes: number[], index: number): number {
  let sum = 0;
  for (let i = 0; i < Math.min(index, sizes.length); i += 1) sum += sizes[i]!;
  return sum;
}

function naiveLocate(sizes: number[], offset: number) {
  const last = sizes.length - 1;
  if (last < 0) return { index: 0, top: 0 };
  if (offset <= 0) return { index: 0, top: 0 };
  let top = 0;
  for (let i = 0; i < last; i += 1) {
    if (top + sizes[i]! > offset) return { index: i, top };
    top += sizes[i]!;
  }
  return { index: last, top };
}

function build(sizes: number[], chunkSize = 8) {
  const index = new ChunkedSizeIndex((i) => sizes[i] ?? 0, chunkSize);
  index.reset(sizes.length);
  return index;
}

describe('ChunkedSizeIndex', () => {
  it('total 等于所有项之和', () => {
    const sizes = [10, 20, 30, 40, 50];
    expect(build(sizes).total).toBe(150);
  });

  it('空列表的 total 与查询都是 0', () => {
    const index = build([]);
    expect(index.total).toBe(0);
    expect(index.prefix(0)).toBe(0);
    expect(index.prefix(5)).toBe(0);
    expect(index.locate(100)).toEqual({ index: 0, top: 0 });
  });

  it('prefix 在所有下标上与朴素实现一致（跨越多个块）', () => {
    // 40 项、块大小 8 → 5 个块，确保跨块路径被覆盖
    const sizes = Array.from({ length: 40 }, (_, i) => 10 + (i % 7) * 3);
    const index = build(sizes);

    for (let i = 0; i <= sizes.length; i += 1) {
      expect(index.prefix(i), `prefix(${i})`).toBe(naivePrefix(sizes, i));
    }
  });

  it('prefix 对超出长度的下标按总长度截断', () => {
    const sizes = [10, 20, 30];
    const index = build(sizes);
    expect(index.prefix(3)).toBe(60);
    expect(index.prefix(99)).toBe(60);
    expect(index.prefix(-5)).toBe(0);
  });

  it('locate 在每一项的边界与内部都与朴素实现一致', () => {
    const sizes = Array.from({ length: 40 }, (_, i) => 10 + (i % 5) * 4);
    const index = build(sizes);
    const total = sizes.reduce((a, b) => a + b, 0);

    // 覆盖每项顶部、内部、底部前一像素，外加整体越界
    const probes: number[] = [-10, 0];
    let top = 0;
    for (const size of sizes) {
      probes.push(top, top + 1, top + size - 1);
      top += size;
    }
    probes.push(total - 1, total, total + 500);

    for (const offset of probes) {
      expect(index.locate(offset), `locate(${offset})`).toEqual(
        naiveLocate(sizes, offset),
      );
    }
  });

  it('applyDelta 后查询结果与重建一致', () => {
    const sizes = Array.from({ length: 40 }, () => 20);
    const index = build(sizes);
    index.total; // 先触发一次重建，之后走增量路径

    // 修改分布在不同块中的若干项
    for (const [i, next] of [[0, 50], [7, 5], [8, 100], [23, 60], [39, 1]] as const) {
      const delta = next - sizes[i]!;
      sizes[i] = next;
      index.applyDelta(i, delta);
    }

    expect(index.total).toBe(sizes.reduce((a, b) => a + b, 0));
    for (let i = 0; i <= sizes.length; i += 1) {
      expect(index.prefix(i), `prefix(${i})`).toBe(naivePrefix(sizes, i));
    }
  });

  it('applyDelta 越界时退化为整体重建，结果依然正确', () => {
    const sizes = [10, 20, 30];
    const index = build(sizes);
    index.total;

    sizes.push(40);
    // 索引还不知道新长度，越界的 delta 只能触发重建
    index.applyDelta(3, 40);
    index.reset(sizes.length);

    expect(index.total).toBe(100);
    expect(index.prefix(3)).toBe(60);
  });

  it('reset 后按新长度重新计算', () => {
    const sizes = [10, 20, 30, 40];
    const index = build(sizes);
    expect(index.total).toBe(100);

    sizes.length = 2;
    index.reset(2);
    expect(index.total).toBe(30);
    expect(index.prefix(2)).toBe(30);
    expect(index.locate(999)).toEqual({ index: 1, top: 10 });
  });

  it('invalidate 会让后续查询重新读取尺寸', () => {
    const sizes = [10, 10, 10];
    const index = build(sizes);
    expect(index.total).toBe(30);

    sizes[1] = 100; // 绕过 applyDelta 直接改
    expect(index.total).toBe(30); // 仍是旧值
    index.invalidate();
    expect(index.total).toBe(120);
  });

  it('惰性重建：reset 之后不查询就不扫表', () => {
    const sizes = Array.from({ length: 32 }, () => 10);
    const sizeAt = vi.fn((i: number) => sizes[i] ?? 0);
    const index = new ChunkedSizeIndex(sizeAt, 8);

    index.reset(sizes.length);
    expect(sizeAt).not.toHaveBeenCalled();

    index.total;
    expect(sizeAt).toHaveBeenCalledTimes(32);
  });

  it('查询成本与列表长度无关地受块大小约束', () => {
    const N = 100_000;
    const CHUNK = 1024;
    const sizes = Array.from({ length: N }, (_, i) => 10 + (i % 3));
    const sizeAt = vi.fn((i: number) => sizes[i]!);
    const index = new ChunkedSizeIndex(sizeAt, CHUNK);
    index.reset(N);
    index.total; // 重建（这一趟必然是 O(n)）

    sizeAt.mockClear();
    index.prefix(N - 1);
    // 跨块只查块和，块内最多 CHUNK 次；远小于 N
    expect(sizeAt.mock.calls.length).toBeLessThan(CHUNK);

    sizeAt.mockClear();
    index.locate(sizes.reduce((a, b) => a + b, 0) - 5);
    expect(sizeAt.mock.calls.length).toBeLessThan(CHUNK);
  });

  it('非 2 的幂之外的常见块大小（1024）行为正确', () => {
    const sizes = Array.from({ length: 3000 }, (_, i) => 5 + (i % 11));
    const index = new ChunkedSizeIndex((i) => sizes[i]!, 1024);
    index.reset(sizes.length);

    for (const i of [0, 1, 1023, 1024, 1025, 2047, 2048, 2999, 3000]) {
      expect(index.prefix(i), `prefix(${i})`).toBe(naivePrefix(sizes, i));
    }
    let top = 0;
    for (let i = 0; i < 3000; i += 337) {
      top = naivePrefix(sizes, i);
      expect(index.locate(top), `locate(top of ${i})`).toEqual({
        index: i,
        top,
      });
    }
  });
});
