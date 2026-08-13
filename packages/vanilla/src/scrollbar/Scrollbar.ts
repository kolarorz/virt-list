import {
  computeThumb,
  pointerToRatio,
  DEFAULT_MIN_THUMB_SIZE,
} from './geometry.js';
import { createFrameScheduler, type FrameScheduler } from './scheduler.js';

/** 滚动条向宿主要的三个数，以及把用户意图交回去的两个回调 */
export interface ScrollbarHost {
  /** 视口尺寸（滚动轴方向） */
  getClientSize(): number;
  /** 内容总尺寸（账本） */
  getTotalSize(): number;
  /** 滑块当前应处的位置比例，0..1 */
  getRatio(): number;
  /** 用户把滑块拖到了某个比例 */
  onRatio(ratio: number): void;
  /** 一次拖拽结束（用于挂渐进修正，把不定高造成的误差收敛掉） */
  onDragEnd(): void;
}

export interface ScrollbarOptions {
  horizontal: boolean;
  minThumbSize?: number;
  /** 停止滚动多久后淡出（ms），0 表示常驻 */
  autoHideDelay?: number;
}

/**
 * 单轴自绘滚动条。
 *
 * 只负责「画滑块」和「把指针位置换算成比例」两件事——滑块位置与列表项之间的
 * 索引映射在 VirtList 里做，因为那里才拿得到 core。
 *
 * 事件用 mouse + touch 而不是 Pointer Events：jsdom 里既没有 `PointerEvent`
 * 也没有 `setPointerCapture`，用 Pointer Events 会让这部分完全没法测。
 */
export class Scrollbar {
  private _host: ScrollbarHost;
  private _options: ScrollbarOptions;
  private _trackEl: HTMLElement;
  private _thumbEl: HTMLElement;

  /** 正在拖拽滑块。拖拽期间不反向刷新滑块位置，否则会和指针互相拉扯 */
  private _dragging = false;
  /** 按下时指针相对滑块起点的偏移 */
  private _grabDelta = 0;
  private _travel = 0;
  private _visible = false;
  /** 缓存的轨道长度，与下面的 `_trackSizeAt` 成对（见 `_trackSize`） */
  private _trackSizeCache = 0;
  /** 上次测量轨道长度时的视口尺寸，`-1` 表示缓存无效 */
  private _trackSizeAt = -1;
  private _hideTimer: ReturnType<typeof setTimeout> | null = null;
  private _scheduler: FrameScheduler = createFrameScheduler();

  private _onDocMove: (e: MouseEvent) => void;
  private _onDocUp: () => void;
  private _onTouchMove: (e: TouchEvent) => void;
  private _onTouchEnd: () => void;

  get el(): HTMLElement {
    return this._trackEl;
  }

  get thumbEl(): HTMLElement {
    return this._thumbEl;
  }

  get dragging(): boolean {
    return this._dragging;
  }

  constructor(host: ScrollbarHost, options: ScrollbarOptions) {
    this._host = host;
    this._options = options;

    const axis = options.horizontal ? 'horizontal' : 'vertical';

    this._trackEl = document.createElement('div');
    this._trackEl.className = `virt-scrollbar virt-scrollbar--${axis}`;
    // autoHideDelay 为 0 表示常驻。必须用一个类把它表达出来：
    // 否则 notifyActivity 直接 return，而 CSS 只在 hover / 滚动中 / 拖拽时显形，
    // "常驻"就成了"永不显示"
    if ((options.autoHideDelay ?? 0) <= 0) {
      this._trackEl.classList.add('is-persistent');
    }

    this._thumbEl = document.createElement('div');
    this._thumbEl.className = 'virt-scrollbar__thumb';
    this._thumbEl.setAttribute('role', 'scrollbar');
    this._thumbEl.setAttribute(
      'aria-orientation',
      options.horizontal ? 'horizontal' : 'vertical',
    );
    this._thumbEl.setAttribute('aria-valuemin', '0');
    this._thumbEl.setAttribute('aria-valuemax', '100');
    this._trackEl.appendChild(this._thumbEl);

    this._onDocMove = (e) => this._moveTo(this._axisOf(e));
    this._onDocUp = () => this._endDrag();
    this._onTouchMove = (e) => {
      const t = e.touches[0];
      if (t) this._moveTo(this._axisOf(t));
    };
    this._onTouchEnd = () => this._endDrag();

    this._thumbEl.addEventListener('mousedown', this._onThumbDown);
    this._thumbEl.addEventListener('touchstart', this._onThumbTouch, {
      passive: false,
    });
    this._trackEl.addEventListener('mousedown', this._onTrackDown);
  }

  /** 取指针在滚动轴方向上的视口坐标 */
  private _axisOf(e: { clientX: number; clientY: number }): number {
    return this._options.horizontal ? e.clientX : e.clientY;
  }

  /** 轨道起点的视口坐标 */
  private _trackStart(): number {
    const rect = this._trackEl.getBoundingClientRect();
    return this._options.horizontal ? rect.left : rect.top;
  }

  /**
   * 轨道长度。**测量结果按视口尺寸缓存**，不是每次调用都读一次布局。
   *
   * 为什么必须缓存：`update()` 由 `_applyLayout` 驱动，而后者每个滚动帧都在跑，
   * 且刚刚写完各段的 transform。紧接着读 `getBoundingClientRect` 就是典型的
   * 读写交替——浏览器为了给出准确的矩形必须立刻重算布局，每帧强制一次同步回流。
   * （`VirtList._queueCrossViewportSync` 的注释里点明了这条纪律，滑块这里此前漏了。）
   *
   * 缓存键取视口尺寸：轨道与视口等长，视口没变轨道就没变。容器缩放会经由
   * ResizeObserver 改写账本里的 clientSize，缓存自然失效；拖拽开始时还会
   * 显式失效一次（见 `invalidateGeometry`），保证按下的那一刻量的是实值。
   */
  private _trackSize(): number {
    const clientSize = this._host.getClientSize();
    if (this._trackSizeAt === clientSize) return this._trackSizeCache;

    // getBoundingClientRect 在 jsdom 下恒为 0，退回宿主给的视口尺寸：
    // 轨道本来就与视口等长，这个退化值在真实浏览器里也不会被用到
    const rect = this._trackEl.getBoundingClientRect();
    const size = this._options.horizontal ? rect.width : rect.height;
    const resolved = size > 0 ? size : clientSize;
    this._trackSizeAt = clientSize;
    this._trackSizeCache = resolved;
    return resolved;
  }

  /** 丢弃缓存的轨道长度，下一次查询重新测量 */
  invalidateGeometry(): void {
    this._trackSizeAt = -1;
  }

  private _onThumbDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    // 阻止拖拽时选中页面文字
    e.preventDefault();
    e.stopPropagation();
    this._beginDrag(this._axisOf(e));
    document.addEventListener('mousemove', this._onDocMove);
    document.addEventListener('mouseup', this._onDocUp);
  };

  private _onThumbTouch = (e: TouchEvent): void => {
    const t = e.touches[0];
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    this._beginDrag(this._axisOf(t));
    document.addEventListener('touchmove', this._onTouchMove, {
      passive: false,
    });
    document.addEventListener('touchend', this._onTouchEnd);
    document.addEventListener('touchcancel', this._onTouchEnd);
  };

  /**
   * 点击轨道空白处：滑块中心跳到点击位置，并顺势进入拖拽。
   *
   * 「跳到点击处」而不是「翻一页」，是因为在几十万项的列表里翻页要点上千次，
   * 而跳转本来就是自绘滚动条相对原生的优势。
   */
  private _onTrackDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    e.preventDefault();

    // 拖拽全程按下面这一次测量的轨道长度换算比例，按下时先取实值
    this.invalidateGeometry();
    const thumbSize = this._thumbSize();
    this._grabDelta = thumbSize / 2;
    this._dragging = true;
    this._trackEl.classList.add('is-dragging');
    this._moveTo(this._axisOf(e));

    document.addEventListener('mousemove', this._onDocMove);
    document.addEventListener('mouseup', this._onDocUp);
  };

  private _thumbSize(): number {
    const rect = this._thumbEl.getBoundingClientRect();
    const size = this._options.horizontal ? rect.width : rect.height;
    if (size > 0) return size;
    // jsdom 下没有布局，按几何公式现算一份
    return computeThumb({
      trackSize: this._trackSize(),
      clientSize: this._host.getClientSize(),
      totalSize: this._host.getTotalSize(),
      minThumbSize: this._options.minThumbSize,
    }).size;
  }

  private _beginDrag(pointer: number): void {
    // 同 _onTrackDown：拖拽的换算精度直接由轨道长度决定，这一刻重新量一次
    this.invalidateGeometry();
    const thumbRect = this._thumbEl.getBoundingClientRect();
    const thumbStart = this._options.horizontal
      ? thumbRect.left
      : thumbRect.top;
    // 抓住滑块的哪个位置就保持在哪个位置，滑块不会跳到指针底下
    this._grabDelta = pointer - thumbStart;
    this._dragging = true;
    this._trackEl.classList.add('is-dragging');
  }

  private _moveTo(pointer: number): void {
    if (!this._dragging) return;

    // 合并到一帧：高刷鼠标一帧能报好几次，每次都重算区间纯属浪费
    this._scheduler.schedule(() => {
      const ratio = pointerToRatio({
        pointer,
        trackStart: this._trackStart(),
        grabDelta: this._grabDelta,
        travel: this._travel,
      });
      // 滑块先就位，内容随后由宿主写入——两者在同一个同步任务里完成
      this._setThumbPosition(ratio);
      this._host.onRatio(ratio);
    });
  }

  private _endDrag(): void {
    if (!this._dragging) return;
    // 最后一次移动可能还压在调度器里，先兑现掉再收尾
    this._scheduler.flush();

    this._dragging = false;
    this._trackEl.classList.remove('is-dragging');
    document.removeEventListener('mousemove', this._onDocMove);
    document.removeEventListener('mouseup', this._onDocUp);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
    document.removeEventListener('touchcancel', this._onTouchEnd);

    this._host.onDragEnd();
    this.update();
  }

  private _setThumbPosition(ratio: number): void {
    const offset = ratio * this._travel;
    this._thumbEl.style.transform = this._options.horizontal
      ? `translate3d(${offset}px, 0, 0)`
      : `translate3d(0, ${offset}px, 0)`;
    this._thumbEl.setAttribute(
      'aria-valuenow',
      String(Math.round(ratio * 100)),
    );
  }

  /** 依据当前尺寸与位置刷新滑块，内容或视口变化后都要调一次 */
  update(): void {
    const clientSize = this._host.getClientSize();
    const totalSize = this._host.getTotalSize();
    const geo = computeThumb({
      trackSize: this._trackSize(),
      clientSize,
      totalSize,
      minThumbSize: this._options.minThumbSize ?? DEFAULT_MIN_THUMB_SIZE,
    });

    this._travel = geo.travel;

    if (geo.visible !== this._visible) {
      this._visible = geo.visible;
      this._trackEl.classList.toggle('is-enabled', geo.visible);
    }
    if (!geo.visible) return;

    this._thumbEl.style[this._options.horizontal ? 'width' : 'height'] =
      `${geo.size}px`;

    // 拖拽中滑块位置由指针决定，这里再写一次会和指针打架
    if (!this._dragging) this._setThumbPosition(this._host.getRatio());
  }

  /** 有滚动发生：短暂显形，随后淡出 */
  notifyActivity(): void {
    const delay = this._options.autoHideDelay ?? 0;
    if (delay <= 0) return;

    this._trackEl.classList.add('is-active');
    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this._hideTimer = null;
      if (!this._dragging) this._trackEl.classList.remove('is-active');
    }, delay);
  }

  destroy(): void {
    this._scheduler.cancel();
    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._thumbEl.removeEventListener('mousedown', this._onThumbDown);
    this._thumbEl.removeEventListener('touchstart', this._onThumbTouch);
    this._trackEl.removeEventListener('mousedown', this._onTrackDown);
    document.removeEventListener('mousemove', this._onDocMove);
    document.removeEventListener('mouseup', this._onDocUp);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
    document.removeEventListener('touchcancel', this._onTouchEnd);
    this._trackEl.remove();
  }
}
