import type { ReactiveData, SlotSize, VirtListOptions, VirtListEvents, RequiredOptions } from './types';
/**
 * 虚拟列表核心引擎（框架无关）。
 *
 * 职责：
 * - 维护滚动状态（offset、inViewBegin/End、renderBegin/End）
 * - 管理每项的实测尺寸（sizesMap）与总尺寸计算
 * - 通过 ResizeObserver 监听容器和列表项的尺寸变化
 * - 根据滚动方向（forward/backward）计算可视区间，并在区间变化时通知上层
 *
 * 该类不直接操作 DOM，由 VirtListDOM 负责 DOM 构建与增量 patch。
 */
export declare class VirtListCore<T extends Record<string, any>> {
    /** 响应式状态，驱动上层渲染 */
    readonly state: ReactiveData;
    /** 各插槽区域的尺寸 */
    readonly slotSize: SlotSize;
    /** 列表项 key → 实测尺寸 的映射，未测量项回退到 itemPreSize + itemGap */
    readonly sizesMap: Map<string, number>;
    /** 当前需要渲染的列表项子集 */
    private _renderList;
    /** 经 Proxy 封装的配置项，访问时自动回退到 DEFAULT_OPTIONS */
    private _props;
    /** 事件回调集合 */
    private _events;
    /**
     * 当前滚动方向：
     * - forward：向上/向左滚动
     * - backward：向下/向右滚动
     */
    private _direction;
    /** 当 inViewBegin 后退时置 true，在 ResizeObserver 回调中修正 scrollOffset */
    private _fixOffset;
    /** addedList2Top 等场景强制修正偏移 */
    private _forceFixOffset;
    /** scrollToOffset 时置 true，阻止下一次 ResizeObserver 的偏移修正 */
    private _abortFixOffset;
    /** scrollToIndex 的渐进修正回调，每次 ResizeObserver 触发时执行 */
    private _fixTaskFn;
    /** 绑定的滚动容器 DOM */
    private _clientEl;
    private _resizeObserver;
    private _boundOnScroll;
    get renderList(): T[];
    get resizeObserver(): ResizeObserver | undefined;
    get props(): RequiredOptions<T>;
    constructor(options: VirtListOptions<T>, events?: VirtListEvents<T>);
    /** 获取当前滚动偏移量 */
    getOffset(): number;
    /** 获取所有插槽（header + footer + sticky）的尺寸总和 */
    getSlotSize(): number;
    /** 获取列表总尺寸（列表项 + 插槽） */
    getTotalSize(): number;
    /** 获取指定 key 对应项的尺寸，未测量则返回 itemPreSize + itemGap */
    getItemSize(itemKey: string): number;
    setItemSize(itemKey: string, size: number): void;
    deleteItemSize(itemKey: string): void;
    /** 获取指定索引项的位置信息（相对于列表顶部的 top/bottom） */
    getItemPosByIndex(index: number): {
        top: number;
        current: number;
        bottom: number;
    };
    /** 滚动到指定偏移量 */
    scrollToOffset(offset: number): void;
    /**
     * 滚动到指定索引项。
     * 由于不定高场景下尺寸可能在渲染后变化，采用渐进修正策略：
     * 每次 ResizeObserver 回调后重新计算目标偏移并修正，直到稳定。
     */
    scrollToIndex(index: number): void;
    /** 将指定索引项滚动到可视区域内（如果已可见则不滚动） */
    scrollIntoView(index: number): void;
    /** 滚动到顶部（循环重试确保到达） */
    scrollToTop(): void;
    /** 滚动到底部（循环重试确保到达） */
    scrollToBottom(): void;
    /** 手动指定渲染区间（跳过自动计算） */
    manualRender(newRenderBegin: number, newRenderEnd: number): void;
    /** 重置所有状态（列表清空时调用） */
    reset(): void;
    /** 列表头部删除项后修正滚动位置，使视口内容保持不跳动 */
    deletedList2Top(deletedList: T[]): void;
    /** 列表头部新增项后修正滚动位置，使视口内容保持不跳动 */
    addedList2Top(addedList: T[]): void;
    /** 强制触发一次渲染更新 */
    forceUpdate(): void;
    getReactiveData(): ReactiveData;
    /** 增量更新配置项，自动触发列表/缓冲区重算 */
    updateOptions(partial: Partial<VirtListOptions<T>>): void;
    /** 绑定滚动容器 DOM，开始监听 scroll 和 resize 事件 */
    bindDOM(clientEl: HTMLElement): void;
    /** 监听插槽元素的尺寸变化 */
    observeSlotEl(el: HTMLElement): void;
    unobserveSlotEl(el: HTMLElement): void;
    /** 恢复滚动位置（如 keep-alive 场景） */
    resume(): void;
    destroy(): void;
    /** 获取 Proxy 背后的原始对象，用于 Object.assign */
    private _getUnderlying;
    private _initBuffer;
    /**
     * 初始化 ResizeObserver，统一监听：
     * - 滚动容器（data-id="client"）→ 更新 clientSize，重算 views
     * - 插槽元素（header/footer/sticky）→ 更新对应 slotSize
     * - 列表项（data-id=itemKey）→ 更新 sizesMap，触发偏移修正
     */
    private _initResizeObserver;
    /** 滚动事件处理：更新方向 → 重算区间 → 判断是否到达边界 */
    private _onScroll;
    /** 根据容器尺寸和预估项高计算视口能容纳的项数 */
    private _calcViews;
    /** 容器尺寸变化后重算 views 并更新区间 */
    private _onClientResize;
    /** 重新计算所有列表项的尺寸总和 */
    private _calcListTotalSize;
    /**
     * 更新可视区间 [inViewBegin, inViewEnd] 并触发渲染区间更新。
     * 如果 start 比当前 inViewBegin 小，说明需要向上渲染更多项，标记 fixOffset。
     */
    private _updateRange;
    /**
     * 根据当前 offset 和滚动方向，二分查找确定 inViewBegin。
     * - forward（向上滚）：从当前 inViewBegin 往前搜索
     * - backward（向下滚）：从当前 inViewBegin 往后搜索
     */
    private _calcRange;
    /** 判断是否滚动到了顶部/底部边界，触发 toTop/toBottom 事件 */
    private _judgePosition;
    /** 获取 virtualSize 到 inViewBegin 的累计尺寸（renderBegin → inViewBegin） */
    private _getVirtualSize2beginInView;
    /** 计算 [range1, range2) 区间内所有项的尺寸总和 */
    private _getRangeSize;
    /** 重新计算 renderBegin 之前所有项的尺寸（即 virtualSize） */
    private _updateTotalVirtualSize;
    /**
     * 根据 inViewBegin/End + buffer 计算实际渲染区间 [renderBegin, renderEnd]，
     * 更新 virtualSize（增量计算），切片出 renderList 并通知上层。
     */
    private _updateRenderRange;
    /** 列表数据变化后重新计算尺寸和区间 */
    private _onListChange;
    /** 通知上层渲染列表已更新 */
    private _notify;
}
//# sourceMappingURL=VirtListCore.d.ts.map