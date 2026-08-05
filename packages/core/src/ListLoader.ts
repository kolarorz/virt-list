import type { LoadDirection, LoadState } from './types';

/**
 * 一次自动续拉链最多发起的请求数。
 *
 * 正常场景下两三次就填满视口了，这个上限只用于兜住病态数据，防止忙循环。
 */
const MAX_AUTO_LOAD_CHAIN = 20;

/**
 * ListLoader 需要从虚拟列表读取的最小信息面。
 *
 * 收窄成接口而不是直接依赖 VirtListCore，是为了让加载逻辑可以脱离滚动引擎单测，
 * 也标明了这个模块只读状态、只发起滚动，不参与尺寸与区间计算。
 */
export interface LoaderHost {
  /** 当前滚动偏移量 */
  getOffset(): number;
  /** 列表总尺寸（含插槽） */
  getTotalSize(): number;
  /** 滚动容器的可视尺寸 */
  getClientSize(): number;
  /** 当前数据量 */
  getListLength(): number;
  /** 判定边界的容差（px） */
  getEdgeThreshold(): number;
  scrollToBottom(): void;
}

/**
 * 声明式分页 / 无限加载的状态机。
 *
 * 承担的正是各框架 demo 里反复手写的那部分样板：防重入、加载期间不重复触发、
 * hasMore 落位、内容不足一屏时续拉、贴底跟随的判定。
 *
 * 数据所有权不在这里——写入 list 由使用方在 loadMore 回调内完成，本类只观察
 * 数据量是否增长，用它作为"这次加载是否有效"的依据。
 */
export class ListLoader {
  private _state: LoadState = {
    loadingTop: false,
    loadingBottom: false,
    hasMoreTop: true,
    hasMoreBottom: true,
    pendingNew: 0,
  };

  /**
   * 某个方向的自动续拉是否已停摆。
   *
   * 自动续拉靠"加载后数据量增长"来推进。若一次加载既没带来新数据、又没把
   * hasMore 置为 false（例如请求失败），继续自动重试就会变成忙循环。
   * 这里记一个停摆标记，等用户真实滚动时再解开。
   */
  private _stalled: Record<LoadDirection, boolean> = {
    top: false,
    bottom: false,
  };

  /**
   * 一条自动续拉链已经发起的次数。
   *
   * 续拉的正常终止条件是"数据填满视口"或"hasMore 关闭"。这个计数是纯防御：
   * 万一使用方的数据总是增长却撑不起高度（例如返回的项渲染后高度为 0），
   * 也不至于把请求打成忙循环。用户下一次滚动即重新开始计数。
   */
  private _chainCount = 0;

  private _destroyed = false;

  private readonly _host: LoaderHost;
  /**
   * 取当前的 loadMore 回调。
   *
   * 用取值函数而不是直接持有：使用方可以在运行时换掉这个回调（框架层的
   * updateOptions 就会），这里必须每次都读最新的那个。
   */
  private readonly _getLoadMore: () =>
    | ((direction: LoadDirection) => boolean | void | Promise<boolean | void>)
    | undefined;
  private readonly _onStateChange: (state: LoadState) => void;

  constructor(
    host: LoaderHost,
    getLoadMore: () =>
      | ((direction: LoadDirection) => boolean | void | Promise<boolean | void>)
      | undefined,
    onStateChange: (state: LoadState) => void,
    /**
     * hasMore 的初始值。
     *
     * 走构造参数而不是建好之后再调 setHasMore：后者会立刻发一次状态通知，而那时
     * 使用方的 `const vl = new VirtList(...)` 还没完成赋值，回调里碰到 vl 就是
     * 一个 TDZ 错误。初始状态没有推送的必要——需要的话 getLoadState() 随时能取。
     */
    initial?: { hasMoreTop?: boolean; hasMoreBottom?: boolean },
  ) {
    this._host = host;
    this._getLoadMore = getLoadMore;
    this._onStateChange = onStateChange;

    if (initial?.hasMoreTop === false) this._state.hasMoreTop = false;
    if (initial?.hasMoreBottom === false) this._state.hasMoreBottom = false;
  }

  getState(): LoadState {
    return { ...this._state };
  }

  /** 同步受控的 hasMore 配置（使用方把它当受控属性传入时） */
  setHasMore(direction: LoadDirection, hasMore: boolean): void {
    const key = direction === 'top' ? 'hasMoreTop' : 'hasMoreBottom';
    if (this._state[key] === hasMore) return;
    this._state[key] = hasMore;
    // 重新开放了这个方向，之前的停摆判定不再适用
    if (hasMore) this._stalled[direction] = false;
    this._emit();
  }

  /** 触达边界时调用（由滚动引擎的边界判定驱动） */
  onReachEdge(direction: LoadDirection): void {
    if (direction === 'bottom') this._clearPendingNew();
    // 触达边界是一次新的用户意图，续拉链重新计数
    this._chainCount = 0;
    this._trigger(direction);
  }

  /** 用户真实滚动时调用：解开停摆，让自动续拉重新可用 */
  onUserScroll(): void {
    this._stalled.top = false;
    this._stalled.bottom = false;
    this._chainCount = 0;
  }

  /**
   * 尾部追加了数据时调用。
   *
   * @param addedCount 新增项数
   * @param wasAtBottom 变更发生前视口是否贴底
   * @param stickyBottom 是否开启贴底跟随
   */
  onAppend(
    addedCount: number,
    wasAtBottom: boolean,
    stickyBottom: boolean,
  ): void {
    if (!stickyBottom || addedCount <= 0) return;

    if (wasAtBottom) {
      this._host.scrollToBottom();
      this._clearPendingNew();
      return;
    }

    // 用户正在看别处，不动视口，只把新增量记下来交给上层渲染角标
    this._state.pendingNew += addedCount;
    this._emit();
  }

  /**
   * 内容不足一屏或恰好停在边界时补一次触发。
   *
   * 这类时刻不会有 scroll 事件：首屏渲染完、容器尺寸变化、上一次加载刚落地。
   * 少了这一步，"首屏只回来半屏数据"就会卡住不再加载。
   */
  checkAutoLoad(): void {
    if (this._destroyed || !this._getLoadMore()) return;

    const clientSize = this._host.getClientSize();
    // 容器还没量出尺寸，判定没有意义，等 resize 回调再来
    if (clientSize <= 0) return;

    // 只自动补底部方向：内容填不满视口时用户根本没有可滚动的余量，
    // 不补就永远卡在半屏。
    //
    // 顶部方向刻意不自动补——offset 为 0 是初始常态而非用户意图，自动补的话
    // 任何配了 loadMore 的列表在挂载瞬间就会开始无限向上拉取。要更早的数据，
    // 必须由「主动向上滚到顶」这个动作来表达。
    if (this._host.getTotalSize() <= clientSize || this._isAtBottom()) {
      this._trigger('bottom');
    }
  }

  destroy(): void {
    this._destroyed = true;
  }

  private _isAtBottom(): boolean {
    const scrollSize = Math.round(
      this._host.getOffset() + this._host.getClientSize(),
    );
    return (
      Math.round(this._host.getTotalSize() - scrollSize) <=
      this._host.getEdgeThreshold()
    );
  }

  private _clearPendingNew(): void {
    if (this._state.pendingNew === 0) return;
    this._state.pendingNew = 0;
    this._emit();
  }

  private _trigger(direction: LoadDirection): void {
    const loadMore = this._getLoadMore();
    if (!loadMore || this._destroyed) return;

    const loadingKey = direction === 'top' ? 'loadingTop' : 'loadingBottom';
    const hasMoreKey = direction === 'top' ? 'hasMoreTop' : 'hasMoreBottom';
    if (
      this._state[loadingKey] ||
      !this._state[hasMoreKey] ||
      this._stalled[direction]
    ) {
      return;
    }

    const lengthBefore = this._host.getListLength();
    this._state[loadingKey] = true;
    this._emit();

    let result: boolean | void | Promise<boolean | void>;
    try {
      result = loadMore(direction);
    } catch (err) {
      // 同步抛错也要解锁，否则这个方向就永久卡在 loading 上
      this._settle(direction, undefined, lengthBefore);
      throw err;
    }

    if (!(result instanceof Promise)) {
      this._settle(direction, result, lengthBefore);
      return;
    }

    result.then(
      (more) => this._settle(direction, more, lengthBefore),
      // 加载失败不改 hasMore：使用方还应该能重试。停摆标记会防住忙循环，
      // 下次用户滚动时自动解开。异常本身归使用方在自己的回调里处理
      () => this._settle(direction, undefined, lengthBefore),
    );
  }

  /** 一次加载收尾：解锁、落位 hasMore、必要时继续拉下一段 */
  private _settle(
    direction: LoadDirection,
    more: boolean | void,
    lengthBefore: number,
  ): void {
    if (this._destroyed) return;

    const loadingKey = direction === 'top' ? 'loadingTop' : 'loadingBottom';
    const hasMoreKey = direction === 'top' ? 'hasMoreTop' : 'hasMoreBottom';

    this._state[loadingKey] = false;
    if (more === false) this._state[hasMoreKey] = false;

    const grew = this._host.getListLength() > lengthBefore;
    if (!grew) this._stalled[direction] = true;

    this._emit();

    // 这一段数据可能仍填不满视口，继续要下一段；要求数据量增长才递归，
    // 再加上链长上限，保证这条链一定会终止
    if (grew && this._state[hasMoreKey]) {
      this._chainCount += 1;
      if (this._chainCount < MAX_AUTO_LOAD_CHAIN) this.checkAutoLoad();
    }
  }

  private _emit(): void {
    if (this._destroyed) return;
    this._onStateChange(this.getState());
  }
}
