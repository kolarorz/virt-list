/**
 * 滚动偏移量的读写驱动。
 *
 * 抽出这层的意义在于：偏移量的**所有权**可以不在浏览器手里。
 *
 * - `NativeScrollDriver` 把偏移量托管给浏览器（`overflow: auto`），读写的是
 *   scrollTop / scrollLeft。浏览器在合成器线程上先滚、再异步回送 scroll 事件，
 *   所以「已呈现的那一帧」可能落在 JS 还没渲染出 DOM 的位置上。
 * - `VirtualScrollDriver` 把偏移量留在 JS 里（`overflow: hidden`），内容只在我们
 *   写入时才移动，位置与 DOM 永远在同一帧提交。
 *
 * core 只与这个接口打交道，两种模式共用同一套区间计算与滚动定位逻辑。
 */
export interface ScrollDriver {
  /** 当前偏移量 */
  getOffset(): number;
  /**
   * 写入偏移量。实现内部自行裁剪到可滚动范围，
   * 且写入后 `getOffset()` 必须立刻返回生效值（不能等异步事件）。
   */
  setOffset(offset: number): void;
  /**
   * 可滚动上限。返回 `null` 表示布局信息不可得（容器隐藏、测试环境不做布局），
   * 此时由 core 退回自己的尺寸账本。
   */
  getMaxOffset(): number | null;
  /** 切换滚动轴。`horizontal` 可经 updateOptions 改变，驱动要跟着换读写的属性 */
  setHorizontal(horizontal: boolean): void;
  destroy(): void;
}

/**
 * 原生滚动驱动：偏移量就是容器的 scrollTop / scrollLeft。
 */
export class NativeScrollDriver implements ScrollDriver {
  private _el: HTMLElement | null;
  private _horizontal: boolean;
  /** 偏移量对应的 DOM 属性名，随 setHorizontal 切换 */
  private _offsetKey: 'scrollTop' | 'scrollLeft';

  constructor(el: HTMLElement, horizontal: boolean) {
    this._el = el;
    this._horizontal = horizontal;
    this._offsetKey = horizontal ? 'scrollLeft' : 'scrollTop';
  }

  getOffset(): number {
    return this._el ? this._el[this._offsetKey] : 0;
  }

  setOffset(offset: number): void {
    if (this._el) this._el[this._offsetKey] = offset;
  }

  /**
   * 浏览器给出的可滚动上限。
   *
   * scrollHeight 为 0 意味着还没布局，这时它不能代表「不能滚动」，
   * 返回 null 让调用方退回账本。
   */
  getMaxOffset(): number | null {
    const el = this._el;
    if (!el) return null;

    const value = this._horizontal
      ? el.scrollWidth - el.clientWidth
      : el.scrollHeight - el.clientHeight;
    return value > 0 ? value : null;
  }

  setHorizontal(horizontal: boolean): void {
    this._horizontal = horizontal;
    this._offsetKey = horizontal ? 'scrollLeft' : 'scrollTop';
  }

  destroy(): void {
    this._el = null;
  }
}

/** `VirtualScrollDriver` 与宿主（core）之间的接口 */
export interface VirtualScrollHost {
  /**
   * 可滚动上限。虚拟模式下没有第二个说法——账本就是权威，
   * 内容画在哪儿、能滚多远都由同一份尺寸账本决定，不存在与浏览器对不上的问题。
   */
  getMaxOffset(): number;
  /**
   * 偏移量生效后**同步**调用，DOM 层据此写 transform。
   *
   * 这个回调是「内容与偏移量同帧提交」这一保证的落点，也是它必须挂在这里、
   * 而不是挂在 core 的 update 事件上的原因：区间没变化时 core 不会发 update
   * （`_calcRange` 走 `_refreshViewEnd` 返回 false），小幅滚动就会丢帧。
   */
  onApply(offset: number): void;
}

/**
 * 虚拟滚动驱动：偏移量是一个纯 JS 数字，浏览器不参与。
 *
 * 容器是 `overflow: hidden`，浏览器既不会自己滚，也就不会出现
 * 「合成器已经把画面滚过去了，但 DOM 还没跟上」的那一帧——露白从根上消失。
 */
export class VirtualScrollDriver implements ScrollDriver {
  private _offset = 0;
  private _host: VirtualScrollHost;

  constructor(host: VirtualScrollHost) {
    this._host = host;
  }

  getOffset(): number {
    return this._offset;
  }

  setOffset(offset: number): void {
    const max = Math.max(0, this._host.getMaxOffset());
    const next = Math.min(Math.max(offset, 0), max);
    // 渐进修正会反复写同一个目标值，跳过无变化的写入省掉重复的样式失效
    if (next === this._offset) return;

    this._offset = next;
    this._host.onApply(next);
  }

  getMaxOffset(): number | null {
    return Math.max(0, this._host.getMaxOffset());
  }

  /** 虚拟模式下驱动只是个数字，轴向由 DOM 层决定写哪个 transform 分量 */
  setHorizontal(): void {}

  destroy(): void {}
}
