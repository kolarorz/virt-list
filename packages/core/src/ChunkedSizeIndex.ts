/**
 * 分块尺寸索引：把列表切成定长的块，只缓存「每块的尺寸总和」。
 *
 * 不定高列表的两个核心查询原本都要从头累加，随列表长度线性增长：
 * - 前缀和（第 index 项的顶部偏移）
 * - 定位（某个偏移量落在第几项）
 *
 * 分块后两者都变成「跨块累加 O(n/C) + 块内累加 O(C)」。取 C=1024 时，
 * 30 万项最坏约 1300 次运算，而不是 30 万次。
 *
 * 有意只缓存块和、不缓存单项尺寸：单项尺寸的权威来源始终是调用方的
 * sizesMap，本索引不持有副本，也就不存在两份状态对不上的问题。块内那几百次
 * 回调查询相对省下的数十万次，完全划得来。
 */
export class ChunkedSizeIndex {
  /** 每块容纳的项数 */
  private readonly _chunkSize: number;
  /** 取整用的位移量（chunkSize 为 2 的幂，用位运算代替除法） */
  private readonly _shift: number;
  /** 读取第 index 项尺寸，由调用方提供 */
  private readonly _sizeAt: (index: number) => number;

  /** 每块的尺寸总和 */
  private _chunkSums: number[] = [];
  /** 当前索引覆盖的项数 */
  private _length = 0;
  /** 所有项的尺寸总和 */
  private _total = 0;
  /** 是否需要重建（列表替换或外部改写尺寸后置位，下次查询时惰性重建） */
  private _stale = true;

  /**
   * @param sizeAt 读取第 index 项的尺寸
   * @param chunkSize 块大小，必须是 2 的幂
   */
  constructor(sizeAt: (index: number) => number, chunkSize = 1024) {
    this._sizeAt = sizeAt;
    this._chunkSize = chunkSize;
    this._shift = Math.log2(chunkSize);
  }

  /** 所有项的尺寸总和 */
  get total(): number {
    this._ensureFresh();
    return this._total;
  }

  /** 列表长度或内容变化：记录新长度并标记待重建 */
  reset(length: number): void {
    this._length = length;
    this._stale = true;
  }

  /**
   * 立即重建，并使用调用方临时提供的取值函数。
   *
   * 与 reset 的区别：reset 只标脏、留待惰性重建（届时走构造时传入的 sizeAt）。
   * 重建要读遍每一项，调用方往往能把属性解构等开销提到循环外——那样的取值函数
   * 只在这一次重建期间使用，不会被索引长期持有，也就没有过期的可能。
   */
  rebuild(length: number, sizeAt: (index: number) => number): void {
    this._length = length;
    this._stale = false;
    this._build(sizeAt);
  }

  /** 标记待重建（外部绕过 applyDelta 改写了尺寸时使用） */
  invalidate(): void {
    this._stale = true;
  }

  /**
   * 所有项尺寸一致时的构建：块和由乘法直接得出，无需逐项累加，成本仅 O(n / 块大小)。
   *
   * 首次装载正是这种情形（还没有任何实测尺寸）。此时如果只用 reset 标记待重建，
   * 那笔 O(n) 扫描就会被推迟到第一次大跳跃——也就是落在用户滚动的中途，
   * 表现为「首次滚到底卡顿一下」。在这里把索引建好，后续一律靠 applyDelta 维护。
   */
  fill(length: number, unitSize: number): void {
    this._length = length;
    this._stale = false;

    const chunkSize = this._chunkSize;
    const chunkCount = Math.ceil(length / chunkSize);
    const sums = this._chunkSums;
    sums.length = chunkCount;

    for (let c = 0; c < chunkCount; c += 1) {
      const from = c * chunkSize;
      sums[c] = (Math.min(from + chunkSize, length) - from) * unitSize;
    }
    this._total = length * unitSize;
  }

  /**
   * 第 index 项的尺寸变化了 delta。
   * 只需修正所属块的和与总和，与列表长度无关。
   */
  applyDelta(index: number, delta: number): void {
    if (this._stale || delta === 0) return;
    if (index < 0 || index >= this._length) {
      // 落在索引范围之外，无法定位到块，只能整体重建
      this._stale = true;
      return;
    }
    this._chunkSums[index >> this._shift]! += delta;
    this._total += delta;
  }

  /** [0, index) 区间的尺寸总和，即第 index 项的顶部偏移 */
  prefix(index: number): number {
    this._ensureFresh();
    const end = index < this._length ? index : this._length;
    if (end <= 0) return 0;

    const chunk = end >> this._shift;
    const sums = this._chunkSums;
    let sum = 0;
    for (let c = 0; c < chunk; c += 1) sum += sums[c]!;
    for (let i = chunk << this._shift; i < end; i += 1) sum += this._sizeAt(i);
    return sum;
  }

  /**
   * 定位 offset 落在第几项，返回该项索引及其顶部偏移。
   * offset 超出总尺寸时返回最后一项。
   */
  locate(offset: number): { index: number; top: number } {
    this._ensureFresh();
    const last = this._length - 1;
    if (last < 0) return { index: 0, top: 0 };
    if (offset <= 0) return { index: 0, top: 0 };

    const sums = this._chunkSums;
    const chunkCount = sums.length;
    let top = 0;
    let chunk = 0;
    // 跳过整块：offset 落在本块之后就整块累加
    while (chunk < chunkCount && top + sums[chunk]! <= offset) {
      top += sums[chunk]!;
      chunk += 1;
    }

    let index = chunk << this._shift;
    if (index > last) return { index: last, top: this.prefix(last) };

    // 块内逐项推进
    for (; index < last; index += 1) {
      const size = this._sizeAt(index);
      if (top + size > offset) break;
      top += size;
    }
    return { index, top };
  }

  /** 惰性重建：整表扫一遍算出块和与总和 */
  private _ensureFresh(): void {
    if (!this._stale) return;
    this._stale = false;
    this._build(this._sizeAt);
  }

  /** 扫描全表，算出每块的和与总和 */
  private _build(sizeAt: (index: number) => number): void {
    const len = this._length;
    const chunkSize = this._chunkSize;
    const chunkCount = Math.ceil(len / chunkSize);
    const sums = this._chunkSums;
    sums.length = chunkCount;

    let total = 0;
    for (let c = 0; c < chunkCount; c += 1) {
      const from = c * chunkSize;
      const to = Math.min(from + chunkSize, len);
      let sum = 0;
      for (let i = from; i < to; i += 1) sum += sizeAt(i);
      sums[c] = sum;
      total += sum;
    }
    this._total = total;
  }
}
