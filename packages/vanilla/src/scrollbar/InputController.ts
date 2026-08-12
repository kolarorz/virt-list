import { createFrameScheduler, type FrameScheduler } from './scheduler.js';

/**
 * `deltaMode = DOM_DELTA_LINE` 时一"行"折算多少像素。
 *
 * Firefox 的鼠标滚轮走行模式（deltaY 通常是 ±3），Chrome / Safari 走像素模式。
 * 40px 是各家浏览器自己用的经验值，换算出来的一格约 120px，与像素模式一致。
 */
const LINE_HEIGHT = 40;

/** 方向键一次走多远 */
const KEY_STEP = 40;

/**
 * 翻页时保留的重叠高度。
 *
 * 整屏翻页会让跨在视口边界上的那一项彻底消失，读到一半的内容找不回来；
 * 留一点重叠是所有阅读器的通行做法。
 */
const PAGE_OVERLAP = 40;

/** 惯性每 16.67ms 衰减到原速的比例 */
const INERTIA_DECAY = 0.95;

/** 惯性低于这个速度（px/ms）就停，再滑下去肉眼也看不出移动 */
const INERTIA_MIN_VELOCITY = 0.02;

/** 算初速时回看的时间窗（ms），太长会把"停顿后再松手"也算成有速度 */
const VELOCITY_WINDOW = 100;

export interface InputHost {
  getOffset(): number;
  getMaxOffset(): number;
  getClientSize(): number;
  /** 相对滚动 */
  scrollBy(delta: number): void;
  /** 绝对滚动 */
  scrollTo(offset: number): void;
  scrollToTop(): void;
  scrollToBottom(): void;
  /** 有滚动发生，用于让滚动条短暂显形 */
  onActivity(): void;
}

function isEditable(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return false;
  const tag = node.tagName.toUpperCase();
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    node.isContentEditable === true
  );
}

/**
 * 输入接管。
 *
 * 容器是 `overflow: hidden`，浏览器不再提供任何滚动手段，滚轮 / 键盘 / 触摸
 * 都得自己实现。这是"完全接管"的主要成本，换来的是所有输入路径都经过 JS，
 * 内容位置与 DOM 永远在同一帧提交。
 */
export interface InputControllerOptions {
  /**
   * 是否接管键盘（方向键 / PageUp-Down / Space / Home-End）。默认 `true`。
   *
   * 需要关掉的情形：宿主自己已经在**祖先**元素上处理这些键（表格的单元格键盘导航
   * 就是这样）。事件冒泡时本控制器挂的监听在后代上、**先**触发，两边都响应的话
   * 一次按键会既滚一段又移动一格。滚轮 / 触摸不受这个开关影响。
   */
  keyboard?: boolean;
  /**
   * 交叉轴的滚动层（`VirtList.scrollContentEl`），没有交叉轴滚动时传 `null`。
   *
   * 需要它的原因是 `preventDefault` 没有"只拦一条轴"的粒度：为主轴拦下一次滚轮，
   * 同一个事件里的交叉轴分量也一起没了 —— 斜向的触摸板手势实测就卡住不横移。
   * 所以交叉轴索性也由这里代劳，直接写它的 `scrollLeft` / `scrollTop`。
   */
  crossEl?: HTMLElement | null;
}

export class InputController {
  private _el: HTMLElement;
  private _host: InputHost;
  private _horizontal: boolean;
  private _keyboard: boolean;
  private _crossEl: HTMLElement | null;
  private _scheduler: FrameScheduler = createFrameScheduler();

  /** 本帧累计但尚未应用的位移 */
  private _pending = 0;

  /** 触摸：上一个接触点在滚动轴上的坐标 */
  private _touchLast = 0;
  /** 触摸：上一个接触点在**交叉轴**上的坐标 */
  private _touchLastCross = 0;
  /** 触摸：最近的位置采样，用于松手时估算初速 */
  private _samples: { pos: number; time: number }[] = [];
  private _inertiaRafId: number | null = null;

  constructor(
    el: HTMLElement,
    host: InputHost,
    horizontal: boolean,
    options: InputControllerOptions = {},
  ) {
    this._el = el;
    this._host = host;
    this._horizontal = horizontal;
    this._keyboard = options.keyboard !== false;
    this._crossEl = options.crossEl ?? null;

    // passive: false —— 到不了边界时要 preventDefault，否则页面会跟着一起滚
    el.addEventListener('wheel', this._onWheel, { passive: false });
    // 不接管键盘时干脆不挂监听：挂了再在回调里 return 也行，但那样宿主用
    // getEventListeners 排查「谁吃了我的方向键」时会多一个假线索
    if (this._keyboard) el.addEventListener('keydown', this._onKeyDown);
    el.addEventListener('touchstart', this._onTouchStart, { passive: false });
    el.addEventListener('touchmove', this._onTouchMove, { passive: false });
    el.addEventListener('touchend', this._onTouchEnd);
    el.addEventListener('touchcancel', this._onTouchEnd);
    el.addEventListener('scroll', this._onNativeScroll);
    // scroll 事件不冒泡，滚动层那一层得自己挂。它现在是离内容最近的 scrollport，
    // 浏览器为露出焦点元素而静默滚动的就是它
    this._crossEl?.addEventListener('scroll', this._onCrossScroll);
  }

  /**
   * 把交叉轴的位移交给滚动层，返回它是否真的动了。
   *
   * 没动意味着那条轴已经到头，这一次输入就该让给外层可滚动祖先（滚动链）。
   */
  private _scrollCross(delta: number): boolean {
    const el = this._crossEl;
    if (!el || delta === 0) return false;
    const key = this._horizontal ? 'scrollTop' : 'scrollLeft';
    const before = el[key];
    el[key] = before + delta;
    return el[key] !== before;
  }

  /** 把位移累计到本帧，一帧只应用一次 */
  private _accumulate(delta: number): void {
    this._pending += delta;
    this._scheduler.schedule(() => {
      const d = this._pending;
      this._pending = 0;
      if (d !== 0) {
        this._host.scrollBy(d);
        this._host.onActivity();
      }
    });
  }

  /** 当前是否已顶到某一端，且位移方向还朝着那一端 */
  private _wouldOverscroll(delta: number): boolean {
    const offset = this._host.getOffset();
    if (delta < 0) return offset <= 0;
    if (delta > 0) return offset >= this._host.getMaxOffset();
    return true;
  }

  private _onWheel = (e: WheelEvent): void => {
    // ctrl + 滚轮是浏览器缩放，不能抢
    if (e.ctrlKey) return;

    // 横向列表要同时认 deltaX（触摸板横扫、shift + 滚轮）与 deltaY（普通滚轮），
    // 取绝对值大的那个轴即可覆盖三种输入设备；剩下的那个分量归交叉轴
    let raw: number;
    let rawCross: number;
    if (this._horizontal) {
      const xWins = Math.abs(e.deltaX) >= Math.abs(e.deltaY);
      raw = xWins ? e.deltaX : e.deltaY;
      rawCross = xWins ? e.deltaY : e.deltaX;
    } else {
      raw = e.deltaY;
      rawCross = e.deltaX;
    }

    const factor =
      e.deltaMode === 1
        ? LINE_HEIGHT
        : e.deltaMode === 2
          ? this._host.getClientSize()
          : 1;
    const delta = raw * factor;

    // 交叉轴由我们代劳，而不是"不 preventDefault 让浏览器自己滚"：
    // 一次事件里两条轴的处置只能二选一，让给浏览器就等于主轴也一起放走。
    // 顺序上先滚交叉轴，主轴到边界要早退时它已经生效了
    const crossMoved = this._scrollCross(rawCross * factor);

    // 主轴已经到边界还继续朝外滚：不拦截，把事件让给外层可滚动祖先（滚动链）。
    // 拦下来的话，嵌在页面里的列表滚到底之后整个页面就再也滚不动了。
    // 但交叉轴刚吃下这次滚动时不能放走 —— 否则「竖向到底 + 横向还没到头」的
    // 斜向手势会一边横滚一边把整个页面带着滚
    if (this._wouldOverscroll(delta)) {
      if (crossMoved) e.preventDefault();
      return;
    }

    e.preventDefault();
    this._stopInertia();
    this._accumulate(delta);
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    // 组合键留给宿主（Ctrl+F、Cmd+↓ 等）
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // 焦点在输入控件里时方向键属于文本编辑，不能抢
    if (isEditable(e.target)) return;

    const client = this._host.getClientSize();
    const page = Math.max(client - PAGE_OVERLAP, KEY_STEP);
    const prevKey = this._horizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = this._horizontal ? 'ArrowRight' : 'ArrowDown';

    let delta: number | null = null;
    switch (e.key) {
      case prevKey:
        delta = -KEY_STEP;
        break;
      case nextKey:
        delta = KEY_STEP;
        break;
      case 'PageUp':
        delta = -page;
        break;
      case 'PageDown':
        delta = page;
        break;
      case ' ':
      case 'Spacebar':
        delta = e.shiftKey ? -page : page;
        break;
      case 'Home':
        e.preventDefault();
        this._stopInertia();
        this._host.scrollToTop();
        this._host.onActivity();
        return;
      case 'End':
        e.preventDefault();
        this._stopInertia();
        this._host.scrollToBottom();
        this._host.onActivity();
        return;
      default:
        return;
    }

    e.preventDefault();
    this._stopInertia();
    this._accumulate(delta);
  };

  private _axisOf(t: Touch): number {
    return this._horizontal ? t.clientX : t.clientY;
  }

  private _crossAxisOf(t: Touch): number {
    return this._horizontal ? t.clientY : t.clientX;
  }

  private _onTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0];
    if (!t) return;
    // 手指落下先刹住惯性，这是所有原生滚动容器的行为
    this._stopInertia();
    this._touchLast = this._axisOf(t);
    this._touchLastCross = this._crossAxisOf(t);
    this._samples = [{ pos: this._touchLast, time: e.timeStamp }];
  };

  private _onTouchMove = (e: TouchEvent): void => {
    const t = e.touches[0];
    if (!t) return;

    const pos = this._axisOf(t);
    // 手指往上滑，内容往上走，偏移量变大
    const delta = this._touchLast - pos;
    this._touchLast = pos;

    const posCross = this._crossAxisOf(t);
    const deltaCross = this._touchLastCross - posCross;
    this._touchLastCross = posCross;

    this._samples.push({ pos, time: e.timeStamp });
    // 只留最近一小段，早于窗口的采样对初速没有意义
    while (
      this._samples.length > 2 &&
      e.timeStamp - this._samples[0]!.time > VELOCITY_WINDOW
    ) {
      this._samples.shift();
    }

    // 主轴到头（含纯横扫这种 delta 为 0 的情形）就整件事都不拦，让浏览器
    // 原生 pan 接手交叉轴 —— 那条路有橡皮筋和惯性，比我们手写的强。
    // touch-action 已经把交叉轴放行了（见 `_buildDOM` 的 touchAction）
    if (this._wouldOverscroll(delta)) return;
    // 主轴要拦，那这次手势里的交叉轴分量也只能由我们代劳（同滚轮）
    this._scrollCross(deltaCross);
    e.preventDefault();
    this._accumulate(delta);
  };

  private _onTouchEnd = (e: TouchEvent): void => {
    const samples = this._samples;
    this._samples = [];
    if (samples.length < 2) return;

    const last = samples[samples.length - 1]!;
    const first = samples[0]!;
    const dt = last.time - first.time;
    if (dt <= 0) return;

    // 位移方向与偏移量方向相反，取负
    const velocity = -(last.pos - first.pos) / dt;
    if (Math.abs(velocity) < INERTIA_MIN_VELOCITY) return;

    e.preventDefault?.();
    this._startInertia(velocity);
  };

  /** 松手后的惯性滑动：速度按帧指数衰减，触边即停（不做橡皮筋回弹） */
  private _startInertia(initial: number): void {
    if (typeof requestAnimationFrame === 'undefined') return;

    let velocity = initial;
    let lastTime: number | null = null;

    const step = (time: number): void => {
      // dt 为 0 时位移是 0、衰减系数是 1 —— 循环会既不动也不停。
      // 正常宿主不会连着给出同一个时间戳，但兜住它比排查一个空转的 rAF 便宜
      const dt = lastTime === null ? 16.67 : Math.max(time - lastTime, 1);
      lastTime = time;

      const move = velocity * dt;
      const before = this._host.getOffset();
      this._host.scrollBy(move);
      this._host.onActivity();

      // 顶到边界就没有继续滑的余地了
      if (this._host.getOffset() === before) {
        this._inertiaRafId = null;
        return;
      }

      // 衰减按真实帧间隔折算，高刷屏与 60Hz 的手感才一致
      velocity *= INERTIA_DECAY ** (dt / 16.67);
      if (Math.abs(velocity) < INERTIA_MIN_VELOCITY) {
        this._inertiaRafId = null;
        return;
      }
      this._inertiaRafId = requestAnimationFrame(step);
    };

    this._inertiaRafId = requestAnimationFrame(step);
  }

  private _stopInertia(): void {
    if (this._inertiaRafId === null) return;
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this._inertiaRafId);
    }
    this._inertiaRafId = null;
  }

  /**
   * 吸收浏览器自作主张的滚动。
   *
   * `overflow: hidden` 仍然是个 scrollport：元素获得焦点（Tab 进来、代码调
   * `focus()` 或 `scrollIntoView()`）时，浏览器会**静默**改 scrollTop 把它露出来。
   * 这个位移不经过我们的账本，内容会凭空错位。这里把它读出来、归零，
   * 再折算进虚拟偏移量 —— 顺带让使用方代码里的 scrollIntoView 照常生效。
   */
  private _onNativeScroll = (): void => {
    this._absorbDrift(this._el);
  };

  /**
   * 滚动层的同一份工作。
   *
   * 它现在是离内容最近的 scrollport，焦点相关的静默滚动落在它身上而不是 clientEl。
   * 只归零**主轴**：交叉轴的 scrollLeft 是用户真实的滚动位置，归零了就等于横滚不了。
   */
  private _onCrossScroll = (): void => {
    if (this._crossEl) this._absorbDrift(this._crossEl);
  };

  private _absorbDrift(el: HTMLElement): void {
    const key = this._horizontal ? 'scrollLeft' : 'scrollTop';
    const drift = el[key];
    if (!drift) return;

    el[key] = 0;
    this._host.scrollTo(this._host.getOffset() + drift);
  }

  destroy(): void {
    this._stopInertia();
    this._scheduler.cancel();
    const el = this._el;
    el.removeEventListener('wheel', this._onWheel);
    // 没挂过也可以安全 remove，但保持与挂载条件对称，读起来不用回头确认
    if (this._keyboard) el.removeEventListener('keydown', this._onKeyDown);
    el.removeEventListener('touchstart', this._onTouchStart);
    el.removeEventListener('touchmove', this._onTouchMove);
    el.removeEventListener('touchend', this._onTouchEnd);
    el.removeEventListener('touchcancel', this._onTouchEnd);
    el.removeEventListener('scroll', this._onNativeScroll);
    this._crossEl?.removeEventListener('scroll', this._onCrossScroll);
    this._crossEl = null;
  }
}
