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

/**
 * 惯性每 16.67ms 衰减到原速的比例。
 *
 * 对齐 iOS `UIScrollView` 的 normal deceleration rate（0.998/ms）：
 * `0.998 ** 16.67 ≈ 0.967`。指数衰减的总滑行距离是 `v0 / -ln k`，
 * 原来的 0.95 折算下来是 `325·v0`、iOS 是 `500·v0` —— 差 35%，
 * 甩一下明显滑得更短、收得更急，两轴都用这一条曲线才谈得上手感统一。
 */
const INERTIA_DECAY = 0.967;

/** 惯性低于这个速度（px/ms）就停，再滑下去肉眼也看不出移动 */
const INERTIA_MIN_VELOCITY = 0.02;

/** 算初速时回看的时间窗（ms），太长会把"停顿后再松手"也算成有速度 */
const VELOCITY_WINDOW = 100;

/**
 * 触摸起步阈值（px）：手指从落点算起走不到这么远，一律不滚。
 *
 * iOS 的 pan 手势约 10pt 起步、Chrome 的 touch slop 是 8dp，取中间值。
 * 它同时是**轴判定的取样窗口** —— 越过阈值那一刻的位移方向决定这次手势锁哪条轴，
 * 所以不能取太小：2、3px 的时候 dx / dy 谁大谁小基本是手抖决定的。
 */
const TOUCH_SLOP = 9;

/**
 * 解锁阈值（px）：锁定之后，手指在**另一条**轴上相对锁定点净移动超过这么多，
 * 就解除锁定、进入两轴自由滚动。
 *
 * 取 slop 的 4 倍以上是有意的：纵向浏览时手指的横向抖动实测在 ±10px 内，
 * 阈值太小会让「上下滑列表」不停误解锁成斜滚 —— 那正是轴锁要防的事。
 * 真想斜着走的人会持续朝那个方向推，40px 很快就越过了。
 */
const AXIS_UNLOCK_DISTANCE = 40;

/**
 * `overflow` 的哪些取值算「用户能亲手滚」。
 *
 * `hidden` 故意排除：它确实是个 scrollport、`scrollTop` 也写得动，但浏览器的滚动链
 * 不会把用户手势交给它（那正是 `overflow: hidden` 做 scroll lock 的原理）。
 * 我们代劳滚动链时要照抄这条，否则会滚到一个用户根本看不出能滚的容器上。
 */
function isUserScrollable(overflow: string): boolean {
  return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay';
}

/** `el` 在 `horizontal` 那条轴上，朝 `delta` 方向还有没有没滚完的余量 */
function hasScrollRoom(
  el: HTMLElement,
  delta: number,
  horizontal: boolean,
): boolean {
  const pos = horizontal ? el.scrollLeft : el.scrollTop;
  const max = horizontal
    ? el.scrollWidth - el.clientWidth
    : el.scrollHeight - el.clientHeight;
  // 1px 的容差：`scrollLeft` 在缩放 / 小数尺寸下是小数，`=== max` 判不出到头
  if (delta > 0) return pos < max - 1;
  if (delta < 0) return pos > 1;
  return false;
}

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
 * 一次触摸手势锁定的轴。`null` = 还在起步阈值里，尚未判定。
 *
 * - `main`：主轴（构造时 `horizontal` 指定的那条，被虚拟化的那条）
 * - `cross`：交叉轴（`crossEl` 那条原生 scrollport）
 * - `free`：判定后又持续朝另一轴推，锁已解除，两轴同时跟手
 */
type TouchAxis = 'main' | 'cross' | 'free';

/**
 * 输入接管。
 *
 * 容器是 `overflow: hidden`，浏览器不再提供任何滚动手段，滚轮 / 键盘 / 触摸
 * 都得自己实现。这是"完全接管"的主要成本，换来的是所有输入路径都经过 JS，
 * 内容位置与 DOM 永远在同一帧提交。
 *
 * **触摸手势是双轴的，且对齐 iOS 的方向锁定**：起步 9px 内不滚，越过阈值的那一刻
 * 按位移方向锁一条轴，锁定期间另一轴一动不动；之后若持续朝另一轴推过 40px 则解锁、
 * 转为自由滚动。抬手后两轴按同一条指数曲线一起衰减。
 *
 * 为什么表格 / 列表要锁轴，而不照 Android 的自由 2D 滚动：纵向浏览时列的横向位置
 * 必须钉死，漂几十像素眼睛就得重新找列（冻结表头与固定列存在的全部理由）；
 * 且锁轴时每帧只需驱动一条轴，另一条轴的重渲染成本直接省掉。
 *
 * ⚠️ **前置条件：宿主必须把 `touch-action` 收窄到不放行任何单指平移**
 * （`pinch-zoom` 或 `none`）。留着 `pan-x` / `pan-y` 的话浏览器的方向判定会**先于**
 * 这里生效，一旦它启动原生 pan，后续 `touchmove` 的 `cancelable` 就变成 `false`：
 * 轴锁说了不算、解锁换轴永远做不到，而 `_scrollCross` 仍会照写一次 `scrollLeft`
 * —— 那条轴会**双倍速**。
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
   * 交叉轴的滚动层（`VirtList.scrollContentEl`、表格的 `.vt-client`），
   * 没有交叉轴滚动时传 `null`。
   *
   * 这是**交叉轴的正式出口**，不是给主轴打的补丁：`preventDefault` 没有"只拦一条轴"
   * 的粒度，为主轴拦下一次滚轮 / 触摸，同一个事件里的交叉轴分量也一起没了 ——
   * 斜向的触摸板手势实测卡住不横移，触屏上更是「竖着滚起来之后横向完全滚不动」。
   * 所以交叉轴索性也由这里代劳，直接写它的 `scrollLeft` / `scrollTop`。
   *
   * 位移机制没变：那条轴仍是原生 scrollport，`sticky` 的固定列 / 表头照旧以它为参照，
   * 这里只是接过了"谁在什么时候写 `scrollLeft`"。传 `null` 就等于交叉轴没人管
   * （单轴容器），判定为交叉轴主导的手势会整个让给外层滚动链。
   */
  crossEl?: HTMLElement | null;
  /**
   * 额外的输入源：这些元素上的滚轮 / 触摸也驱动同一个滚动状态机。
   *
   * 为表格的**表头 / 表尾**而加：它们是 sticky 浮层，DOM 上是滚动视口的**兄弟节点**
   * （挂在 `.vt-root` 上，为了 z-index 压过内容、且横滚时随内容平移），
   * 所以事件冒泡永远到不了挂在视口上的本控制器 —— 表现就是「在表头上滚不动」，
   * 滚轮和触摸都不行。
   *
   * 只传那些**语义上属于表格滚动区**的元素。别传整个根容器：挂在根上的浮层
   * （下拉、列面板、筛选面板）自己内部要滚，冒泡到这里会变成表格跟着滚。
   *
   * 空值会被忽略，方便调用方直接摊平可选的表尾。
   */
  sources?: (HTMLElement | null | undefined)[];
}

export class InputController {
  private _el: HTMLElement;
  private _host: InputHost;
  private _horizontal: boolean;
  private _keyboard: boolean;
  private _crossEl: HTMLElement | null;
  /** 额外输入源（表头 / 表尾这类视口外的 sticky 浮层），见 `InputControllerOptions.sources` */
  private _sources: HTMLElement[];
  private _scheduler: FrameScheduler = createFrameScheduler();

  /** 本帧累计但尚未应用的位移 */
  private _pending = 0;

  /** 触摸：上一个接触点在滚动轴上的坐标 */
  private _touchLast = 0;
  /** 触摸：上一个接触点在**交叉轴**上的坐标 */
  private _touchLastCross = 0;
  /** 触摸：手指落点，用于判断是否越过起步阈值 */
  private _touchOrigin = 0;
  private _touchOriginCross = 0;
  /** 触摸：锁定那一刻的坐标，解锁判据是"相对它"的净位移而不是累计位移（否则来回抖也能凑够） */
  private _lockOrigin = 0;
  private _lockOriginCross = 0;
  /** 触摸：本次手势锁定的轴，`null` = 还在起步阈值里 */
  private _axis: TouchAxis | null = null;
  /**
   * 触摸：这一下按在正在跑的惯性上（只为刹车）。
   *
   * 原生行为是这一下不算 tap，所以 `touchend` 要 `preventDefault` 掉后续的 click ——
   * 否则「甩一下、伸手按住停下」会顺带点开手指底下的那一行。
   */
  private _tapToStop = false;
  /** 触摸：最近的位置采样（两轴都要，惯性算的是速度**向量**） */
  private _samples: { pos: number; cross: number; time: number }[] = [];
  private _inertiaRafId: number | null = null;
  /**
   * 触摸：本次手势里额外挂了兜底监听的那个 `touchstart` target（见 `_bindTouchTarget`）。
   */
  private _touchTarget: EventTarget | null = null;

  /**
   * 触摸：本次手势 latch 到的**外层**滚动容器；`null` = 由表格自己滚。
   *
   * 对齐 iOS 的嵌套滚动语义：**归属在手势开始的那一刻定一次，中途绝不转手**。
   * 越过起步阈值、轴判定完成的同时，如果被锁的那条轴上表格已经到头，这次手势
   * 就整个交给外层（`_chain` 记下是谁），表格从头到尾一动不动；反过来，一开始
   * 由表格滚的手势，即使中途滚到底也不会把剩下的位移让出去 —— 想滚外层得抬手重滑。
   *
   * 为什么不照 Chrome / Android 的「同一手势内到边界就转手」：数据网格里用户经常
   * 是在微调表格位置，滚到底那一下顺势把整个页面带飞会很难受；而 iOS 的规矩下
   * 「抬手」是一个明确的交接信号，误触代价低。
   *
   * ⚠️ 这条路径是移动端**唯一**的滚动链出口。宿主把 `touch-action` 收窄到不放行
   * 单指平移（前置条件见 `InputControllerOptions`）之后，浏览器压根不为这块区域
   * 生成滚动手势 —— 到边界时「不 `preventDefault`」并不会让外层接手，只会什么都
   * 不发生。滚轮那边可以靠 `overscroll-behavior` 把链交回浏览器，触摸这边不行。
   */
  private _chain: HTMLElement | null = null;
  /** `_chain` 吃的是哪条轴：`true` = 横向（写它的 `scrollLeft`） */
  private _chainHorizontal = false;

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
    // 去重顺手做掉：调用方摊平可选元素时很容易把同一个传两次，挂两遍就滚双倍
    this._sources = (options.sources ?? []).filter(
      (s, i, arr): s is HTMLElement => !!s && s !== el && arr.indexOf(s) === i,
    );

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

    /**
     * 额外输入源：同一套处理器，同一个状态机（轴锁 / 惯性都只有一份）。
     *
     * 不挂 `keydown`：键盘要跟着焦点走，而这些元素通常不可聚焦；也不挂 `scroll`：
     * 它们不是 scrollport，没有需要吸收的静默漂移。
     */
    for (const src of this._sources) {
      src.addEventListener('wheel', this._onWheel, { passive: false });
      src.addEventListener('touchstart', this._onTouchStart, { passive: false });
      src.addEventListener('touchmove', this._onTouchMove, { passive: false });
      src.addEventListener('touchend', this._onTouchEnd);
      src.addEventListener('touchcancel', this._onTouchEnd);
    }
  }

  /**
   * 这个 target 上的事件会不会冒泡到我们挂了监听的某个元素上。
   *
   * `false` 意味着只有挂在 target 自己身上的兜底监听能收到（见 `_bindTouchTarget`）。
   */
  private _reachesUs(target: EventTarget | null): boolean {
    const node = target as Node | null;
    if (!node) return false;
    if (this._el.contains(node)) return true;
    return this._sources.some((s) => s.contains(node));
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

  /**
   * 交叉轴朝 `delta` 方向还有没有余量。与 `_scrollCross` 的区别是**不写不滚**，
   * 只做判断 —— latch 决策发生在手势刚起步时，那一刻还不能让内容动。
   */
  private _canScrollCross(delta: number): boolean {
    const el = this._crossEl;
    if (!el || delta === 0) return false;
    return hasScrollRoom(el, delta, !this._horizontal);
  }

  /**
   * 沿祖先链找第一个能吃下这次位移的滚动容器 —— 也就是浏览器原生滚动链**本来会**
   * 交给谁。找不到就返回 `null`。
   *
   * 之所以要自己走一遍这条链，两个场景各有原因：
   *
   * - **触摸**：`touch-action` 已经不放行单指平移，浏览器不会替我们走链（见 `_chain`）。
   * - **滚轮的横向**：横向到头时想穿透就得放行，可放行的同时 macOS 会橡皮筋回弹
   *   （`overscroll-behavior-x` 上「穿透」与「不回弹」是二选一）。先问一句
   *   「外层真有能横滚的容器吗」，有才放行、没有就拦下，两个都要得到。
   *
   * 链的终止规则照抄浏览器：
   * - `overflow: visible` 不是 scroll container，跳过；
   * - 是 scroll container 但 `overflow` 为 `hidden` / `clip` → 用户滚不动它，跳过，
   *   **但它仍然能掐断链**（`overscroll-behavior` 在不可滚的 scrollport 上照样生效，
   *   实测过：`.vt-client` 纵向完全不可滚，写 `contain` 页面就一动不动）；
   * - 任何一层在这条轴上把 `overscroll-behavior` 设成非 `auto` → 链到此为止，返回 `null`。
   *
   * 最后单独问一次页面：`documentElement` 的 `overflow` 默认是 `visible`，
   * 页面滚动其实由 viewport 承担，走不进上面那个循环。
   *
   * 成本是一次祖先链的 `getComputedStyle` 遍历。只在**已经到边界**的输入上发生
   * （手势起步那一刻 / 滚轮顶到头那一刻），此时表格自己没有任何渲染工作，
   * 层数又通常在 20 以内，实测不构成瓶颈；换成缓存反而要处理「布局变了怎么失效」。
   */
  private _findChainTarget(
    delta: number,
    horizontal: boolean,
  ): HTMLElement | null {
    if (delta === 0) return null;
    const doc = this._el.ownerDocument;
    const win = doc?.defaultView;
    if (!win) return null;

    let node = this._el.parentElement;
    while (node) {
      const style = win.getComputedStyle(node);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      // `visible` 不是 scroll container，既不能滚也不能掐断链
      if (overflow && overflow !== 'visible') {
        if (isUserScrollable(overflow) && hasScrollRoom(node, delta, horizontal)) {
          return node;
        }
        const ob = horizontal
          ? style.overscrollBehaviorX
          : style.overscrollBehaviorY;
        // `contain` / `none` 都在这里终止传播，语义与浏览器一致
        if (ob && ob !== 'auto') return null;
      }
      node = node.parentElement;
    }

    /**
     * 页面兜底：`documentElement` 的 `overflow` 默认是 `visible`，页面滚动其实由
     * viewport 承担，走不进上面那个循环。
     *
     * 但**必须**先问一句页面到底允不允许用户滚：`html { overflow: hidden }`
     * （或 `body` 上那条）是最通行的 scroll lock 手法 —— 打开弹窗时锁住背景页面。
     * 少了这个检查，我们的代劳会绕过锁去滚页面，那是比"滚不动"严重得多的 bug。
     * viewport 的 overflow 传播规则比这复杂（`body` 的值会在 `html` 为 `visible`
     * 时上浮），这里按"任一层收窄就算锁住"近似 —— 对 scroll lock 这个实际场景够用，
     * 且偏向保守：宁可不滚，不可越过锁去滚。
     *
     * 页面自身的 `overscroll-behavior` 反倒不用看：它管的是页面**到头之后**往不往
     * 浏览器 UI 传（下拉刷新、侧滑返回），不阻止页面自己被滚。
     */
    const scroller = (doc.scrollingElement ?? doc.documentElement) as
      | HTMLElement
      | null;
    if (!scroller) return null;

    const de = doc.documentElement;
    const locked = [de, doc.body].some((node) => {
      if (!node) return false;
      const st = win.getComputedStyle(node);
      const ov = horizontal ? st.overflowX : st.overflowY;
      return ov === 'hidden' || ov === 'clip';
    });
    if (locked) return null;

    if (hasScrollRoom(scroller, delta, horizontal)) return scroller;
    return null;
  }

  /**
   * 把位移写给 latch 到的外层容器，返回它是否真的动了。
   *
   * `target` 显式传入而不是就地读 `this._chain`：惯性那段在启动时抓了快照，
   * 期间新手势会把 `this._chain` 清掉 —— 读实例字段会让已经飞出去的惯性
   * 突然写不动了（返回 false → 被判成"到头"→ 静默停住）。
   */
  private _scrollChain(
    delta: number,
    target?: HTMLElement | null,
    horizontal?: boolean,
  ): boolean {
    const el = target ?? this._chain;
    if (!el || delta === 0) return false;
    const key = (horizontal ?? this._chainHorizontal) ? 'scrollLeft' : 'scrollTop';
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
      if (crossMoved) {
        e.preventDefault();
        return;
      }
      /**
       * 走到这里 = 主轴没得滚、交叉轴也没吃下位移。放行本来是对的（让浏览器走链），
       * 唯独**纯交叉轴手势 + 交叉轴已到头**这一种要自己接管：
       *
       * `raw` 为 0（触摸板纯水平横扫、`shift` 没按的横向滚轮）时 `_wouldOverscroll(0)`
       * 恒真，于是纯横向手势总是走到这条分支上。此时放行有两种结局，都不是想要的：
       * 外层能横滚也白搭 —— 宿主为了压掉橡皮筋在交叉轴上写了 `overscroll-behavior-x: none`
       * （表格是数据网格，横向到头弹一下只会让人以为还能再滚），而那条声明**同时**
       * 掐断了链，浏览器根本不会把位移交给祖先；把它放宽成 `auto` 链是通了，橡皮筋
       * 也一起回来了。这两件事在那一个属性上是二选一的。
       *
       * 所以这条轴索性也由我们代劳：自己找出浏览器本该交给谁（`_findChainTarget`），
       * 直接写它的 `scrollLeft`，然后**无条件 `preventDefault`** —— 浏览器全程不介入，
       * 于是「穿透」与「不回弹」同时成立，宿主的 `overscroll-behavior-x` 可以一直是 `none`。
       * 找不到目标就只剩 `preventDefault`，横向到头就干脆停住。
       *
       * 主轴有位移时（斜向手势）不走这条路、一律放行：那种情形下纵向穿透更重要，
       * 拦下来会把「滚到底之后页面再也滚不动」那个更严重的问题带回来。
       */
      if (raw === 0 && rawCross !== 0) {
        e.preventDefault();
        const crossHorizontal = !this._horizontal;
        const crossDelta = rawCross * factor;
        const target = this._findChainTarget(crossDelta, crossHorizontal);
        if (target) this._scrollChain(crossDelta, target, crossHorizontal);
      }
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
    // 手指落下先刹住惯性，这是所有原生滚动容器的行为。
    // 落在正在跑的惯性上时这一下只是刹车，记下来让 touchend 吃掉那次 click
    this._tapToStop = this._inertiaRafId !== null;
    this._stopInertia();
    const pos = this._axisOf(t);
    const cross = this._crossAxisOf(t);
    this._touchLast = pos;
    this._touchLastCross = cross;
    this._touchOrigin = pos;
    this._touchOriginCross = cross;
    // 轴还没定：起步阈值之内不滚也不拦
    this._axis = null;
    // 归属也重新来一次 —— 上一次手势 latch 到谁，与这一次无关（这就是「抬手重滑」）
    this._chain = null;
    this._samples = [{ pos, cross, time: e.timeStamp }];
    this._bindTouchTarget(e.target);
  };

  /**
   * 给 `touchstart` 的 target 额外挂一份 `touchmove` / `touchend`，兜住**手势中途
   * target 被 DOM 回收**的情形。
   *
   * touch 事件的 target 在 `touchstart` 时就固定了，后续 move / end 全都派发给它。
   * 一旦这个节点被从文档里摘掉（虚拟滚动回收行、按需创建的单元格内层被重建……），
   * 事件路径里就再没有本控制器所在的容器了 —— 事件仍在派发，但冒泡到不了我们这层，
   * 手势就这么静默断在半路，表现是「手指还在滑，但滚不动了」，而且**没有 touchcancel**
   * 可以感知。
   *
   * CDP 实测（Chrome headless，移动端 emulation，手指按在表格自动合并格的 sticky 内层上
   * 竖滑 8 帧）：容器上只收到 3 次 `touchmove`、`document` 上同样 3 次，滚动位置从第 3 帧
   * 起卡死；而挂在 target 自己身上的监听收到了全部 **8** 次。对照组（按在复用的普通 `td` 上）
   * 三个计数都是 8。所以兜底只需挂到 target 上，事件一直都在。
   *
   * 正常情况（target 还在容器里）这条路径直接让行：那时事件会照常冒泡到容器，
   * 由容器上的监听处理，两边都消费就会滚双倍。
   */
  private _bindTouchTarget(target: EventTarget | null): void {
    this._unbindTouchTarget();
    // target 就是容器 / 输入源本身时不必兜底：它们在，事件就到得了
    if (!target || target === this._el) return;
    if (this._sources.includes(target as HTMLElement)) return;
    if (typeof (target as EventTarget).addEventListener !== 'function') return;
    this._touchTarget = target;
    target.addEventListener('touchmove', this._onTouchMoveDetached, {
      passive: false,
    });
    target.addEventListener('touchend', this._onTouchEndDetached);
    target.addEventListener('touchcancel', this._onTouchEndDetached);
  }

  private _unbindTouchTarget(): void {
    const t = this._touchTarget;
    if (!t) return;
    this._touchTarget = null;
    t.removeEventListener('touchmove', this._onTouchMoveDetached);
    t.removeEventListener('touchend', this._onTouchEndDetached);
    t.removeEventListener('touchcancel', this._onTouchEndDetached);
  }

  /**
   * target 已脱离容器时才接手，否则交给冒泡路径（见 `_bindTouchTarget`）。
   *
   * 形参是 `Event` 而不是 `TouchEvent`：这两个监听挂在 `EventTarget` 上
   * （target 可以是任意节点），那边的 listener 签名只认 `Event`。
   */
  private _onTouchMoveDetached = (e: Event): void => {
    if (this._reachesUs(e.target)) return;
    this._onTouchMove(e as TouchEvent);
  };

  private _onTouchEndDetached = (e: Event): void => {
    if (this._reachesUs(e.target)) return;
    this._onTouchEnd(e as TouchEvent);
  };

  private _onTouchMove = (e: TouchEvent): void => {
    const t = e.touches[0];
    if (!t) return;

    const pos = this._axisOf(t);
    const posCross = this._crossAxisOf(t);

    this._samples.push({ pos, cross: posCross, time: e.timeStamp });
    // 只留最近一小段，早于窗口的采样对初速没有意义
    while (
      this._samples.length > 2 &&
      e.timeStamp - this._samples[0]!.time > VELOCITY_WINDOW
    ) {
      this._samples.shift();
    }

    /**
     * 起步阈值 + 轴判定。
     *
     * 用直线距离（而不是分轴各比一次）：原生的 slop 是个圆，斜着走的手势不该因为
     * 两轴各自都没到 9px 就一直不起步。
     */
    if (this._axis === null) {
      const dMain = pos - this._touchOrigin;
      const dCross = posCross - this._touchOriginCross;
      if (Math.hypot(dMain, dCross) < TOUCH_SLOP) return;

      this._axis = Math.abs(dCross) > Math.abs(dMain) ? 'cross' : 'main';
      this._lockOrigin = pos;
      this._lockOriginCross = posCross;

      /**
       * 归属判定（iOS 语义，只在这一刻做一次，理由见 `_chain`）。
       *
       * 位移方向取负：手指往上滑（`dMain > 0` 变小…… 准确说 `dMain` 是坐标增量），
       * 内容偏移量朝相反方向走，与 `_onTouchMove` 主体里的 `_touchLast - pos` 同源。
       * 被锁的那条轴上表格已经到头，这次手势就整个让给外层。
       */
      if (this._axis === 'main') {
        const want = -dMain;
        if (this._wouldOverscroll(want)) {
          this._chain = this._findChainTarget(want, this._horizontal);
          this._chainHorizontal = this._horizontal;
        }
      } else {
        const want = -dCross;
        if (!this._canScrollCross(want)) {
          this._chain = this._findChainTarget(want, !this._horizontal);
          this._chainHorizontal = !this._horizontal;
        }
      }
      // 起步那一段位移**不补进内容**：手指与内容从此差着一个 slop，但内容不会在
      // 手势开始的瞬间跳 9px（Android 的原生 slop 同样是扣掉的）。
      // 下一帧才开始跟手，所以这里把参照点挪到当前位置
      this._touchLast = pos;
      this._touchLastCross = posCross;
      return;
    }

    /**
     * 解锁：锁定之后仍持续朝另一轴推，就认了用户是真想斜着走。
     *
     * iOS 的确切判据没有公开，这里用「相对锁定点的净位移越过阈值」的启发式；
     * 阈值见 `AXIS_UNLOCK_DISTANCE`，真机对照后可调。
     */
    if (
      this._axis === 'main' &&
      Math.abs(posCross - this._lockOriginCross) > AXIS_UNLOCK_DISTANCE
    ) {
      this._axis = 'free';
    } else if (
      this._axis === 'cross' &&
      Math.abs(pos - this._lockOrigin) > AXIS_UNLOCK_DISTANCE
    ) {
      this._axis = 'free';
    }

    // 手指往上滑，内容往上走，偏移量变大
    const delta = this._touchLast - pos;
    const deltaCross = this._touchLastCross - posCross;
    this._touchLast = pos;
    this._touchLastCross = posCross;

    /**
     * 这次手势归外层（`_chain` 在起步那一刻定的）：位移整个写给它，表格一动不动。
     *
     * `preventDefault` 是必须的，哪怕外层此刻也已经到头 —— 归属在起步时就定了，
     * 中途让回浏览器就等于转手，而那正是 iOS 语义要避免的事。
     *
     * 用锁定的那条轴的原始 `delta`（而不是下面裁剪过的 `mainDelta` / `crossDelta`）：
     * 轴锁的意义是「表格只沿一条轴动」，外层容器同样只沿它被 latch 的那条轴动，
     * 裁剪一遍反而会把这条轴自己的位移也归零。
     */
    if (this._chain) {
      this._scrollChain(
        this._axis === 'cross' ? deltaCross : delta,
        this._chain,
        this._chainHorizontal,
      );
      e.preventDefault();
      return;
    }

    // 锁住的那条轴上，这次手势的位移一律丢掉 —— 这就是"锁"的全部含义
    const mainDelta = this._axis === 'cross' ? 0 : delta;
    const crossDelta = this._axis === 'main' ? 0 : deltaCross;

    // 与滚轮同构：交叉轴先滚（主轴到边界要早退时它已经生效）
    const crossMoved = this._scrollCross(crossDelta);

    // 主轴不动或已到头：整件事都不拦，把手势让给外层可滚动祖先（滚动链）。
    // 但交叉轴刚吃下这次位移时不能放走 —— 否则「竖向到底 + 横向还没到头」的
    // 手势会一边横滚一边把整个页面带着滚
    if (mainDelta === 0 || this._wouldOverscroll(mainDelta)) {
      if (crossMoved) e.preventDefault();
      return;
    }

    e.preventDefault();
    this._accumulate(mainDelta);
  };

  private _onTouchEnd = (e: TouchEvent): void => {
    const samples = this._samples;
    const axis = this._axis;
    const tapToStop = this._tapToStop;
    this._samples = [];
    this._axis = null;
    this._tapToStop = false;
    // 手势结束，兜底监听跟着摘掉（target 可能已经不在文档里，但监听还在它身上）
    this._unbindTouchTarget();

    // 按在惯性上的那一下只为刹车，别让它同时点开手指底下的内容
    if (tapToStop) e.preventDefault?.();

    // axis 为 null = 没越过起步阈值，那是一次 tap，不该有惯性
    if (samples.length < 2 || axis === null) return;

    const last = samples[samples.length - 1]!;
    const first = samples[0]!;
    const dt = last.time - first.time;
    if (dt <= 0) return;

    // 位移方向与偏移量方向相反，取负；锁住的那条轴速度归零，
    // 否则惯性会朝手势被锁掉的方向斜飞出去
    const vMain = axis === 'cross' ? 0 : -(last.pos - first.pos) / dt;
    const vCross = axis === 'main' ? 0 : -(last.cross - first.cross) / dt;

    /**
     * 手势归了外层，甩出去的惯性也归它：原生的 fling 同样不会在半路换对象，
     * 「手势滚外层、松手后惯性突然回到表格上」是没法解释的。
     *
     * latch 时只有一条轴在动，把它的速度当作单轴速度交给 `_startInertia`
     * （那边看到 `_chain` 非空就只驱动这一条）。速度不够就地清掉归属，
     * 不留到下一次手势 —— 下一次的归属由它自己的起步方向重新决定。
     */
    if (this._chain) {
      const v = axis === 'cross' ? vCross : vMain;
      if (Math.abs(v) < INERTIA_MIN_VELOCITY) {
        this._chain = null;
        return;
      }
      e.preventDefault?.();
      this._startInertia(v, 0);
      return;
    }

    if (
      Math.abs(vMain) < INERTIA_MIN_VELOCITY &&
      Math.abs(vCross) < INERTIA_MIN_VELOCITY
    ) {
      return;
    }

    e.preventDefault?.();
    this._startInertia(vMain, vCross);
  };

  /**
   * 松手后的惯性滑动：速度按帧指数衰减，触边即停（不做橡皮筋回弹）。
   *
   * 两条轴共用**同一条**衰减曲线、每帧一起衰减：斜向甩出去（解锁后的自由手势）时
   * 才不会一条轴先停、看起来像歪着刹车。某条轴顶到边界就单独归零，另一条继续滑完。
   */
  private _startInertia(vMain: number, vCross: number): void {
    if (typeof requestAnimationFrame === 'undefined') return;

    /**
     * latch 到外层的手势：`vMain` 是那条轴的速度，`vCross` 传 0，整段惯性只驱动
     * `_chain`，表格自己一动不动（见 `_onTouchEnd`）。在进 `step` 之前先抓住它，
     * 中途 `_chain` 被新手势清掉也不影响这一段已经飞出去的惯性。
     */
    const chain = this._chain;
    const chainHorizontal = this._chainHorizontal;

    let mainV = vMain;
    let crossV = vCross;
    let lastTime: number | null = null;

    const step = (time: number): void => {
      // dt 为 0 时位移是 0、衰减系数是 1 —— 循环会既不动也不停。
      // 正常宿主不会连着给出同一个时间戳，但兜住它比排查一个空转的 rAF 便宜
      const dt = lastTime === null ? 16.67 : Math.max(time - lastTime, 1);
      lastTime = time;

      if (chain) {
        // 外层滚不动了就是到头，与 `_scrollCross` 用同一条判据
        if (mainV !== 0 && !this._scrollChain(mainV * dt, chain, chainHorizontal)) {
          mainV = 0;
        }
      } else {
        if (mainV !== 0) {
          const before = this._host.getOffset();
          this._host.scrollBy(mainV * dt);
          this._host.onActivity();
          // 顶到边界，这条轴没有继续滑的余地了
          if (this._host.getOffset() === before) mainV = 0;
        }
        // `_scrollCross` 返回它是否真的动了，正好当作"到头了"的判据
        if (crossV !== 0 && !this._scrollCross(crossV * dt)) crossV = 0;
      }

      if (mainV === 0 && crossV === 0) {
        this._inertiaRafId = null;
        return;
      }

      // 衰减按真实帧间隔折算，高刷屏与 60Hz 的手感才一致
      const decay = INERTIA_DECAY ** (dt / 16.67);
      mainV *= decay;
      crossV *= decay;
      if (Math.abs(mainV) < INERTIA_MIN_VELOCITY) mainV = 0;
      if (Math.abs(crossV) < INERTIA_MIN_VELOCITY) crossV = 0;
      if (mainV === 0 && crossV === 0) {
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
    this._unbindTouchTarget();
    // 别攥着外层容器的引用不放，那可能是整个页面之外的宿主节点
    this._chain = null;
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
    for (const src of this._sources) {
      src.removeEventListener('wheel', this._onWheel);
      src.removeEventListener('touchstart', this._onTouchStart);
      src.removeEventListener('touchmove', this._onTouchMove);
      src.removeEventListener('touchend', this._onTouchEnd);
      src.removeEventListener('touchcancel', this._onTouchEnd);
    }
    this._sources = [];
  }
}
