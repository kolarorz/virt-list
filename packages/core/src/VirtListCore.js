import { DEFAULT_OPTIONS } from './types';
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
export class VirtListCore {
    /** 响应式状态，驱动上层渲染 */
    state;
    /** 各插槽区域的尺寸 */
    slotSize;
    /** 列表项 key → 实测尺寸 的映射，未测量项回退到 itemPreSize + itemGap */
    sizesMap = new Map();
    /** 当前需要渲染的列表项子集 */
    _renderList = [];
    /** 经 Proxy 封装的配置项，访问时自动回退到 DEFAULT_OPTIONS */
    _props;
    /** 事件回调集合 */
    _events;
    /**
     * 当前滚动方向：
     * - forward：向上/向左滚动
     * - backward：向下/向右滚动
     */
    _direction = 'backward';
    /** 当 inViewBegin 后退时置 true，在 ResizeObserver 回调中修正 scrollOffset */
    _fixOffset = false;
    /** addedList2Top 等场景强制修正偏移 */
    _forceFixOffset = false;
    /** scrollToOffset 时置 true，阻止下一次 ResizeObserver 的偏移修正 */
    _abortFixOffset = false;
    /** scrollToIndex 的渐进修正回调，每次 ResizeObserver 触发时执行 */
    _fixTaskFn = null;
    /** 绑定的滚动容器 DOM */
    _clientEl = null;
    _resizeObserver;
    _boundOnScroll;
    get renderList() {
        return this._renderList;
    }
    get resizeObserver() {
        return this._resizeObserver;
    }
    get props() {
        return this._props;
    }
    constructor(options, events = {}) {
        this._events = events;
        this._boundOnScroll = this._onScroll.bind(this);
        // 使用 Proxy 使未显式设置的选项自动回退到默认值
        this._props = new Proxy(options, {
            get(target, key) {
                return (Reflect.get(target, key) ?? Reflect.get(DEFAULT_OPTIONS, key));
            },
        });
        this.slotSize = {
            clientSize: 0,
            headerSize: 0,
            footerSize: 0,
            stickyHeaderSize: 0,
            stickyFooterSize: 0,
        };
        this.state = {
            views: 0,
            offset: 0,
            listTotalSize: 0,
            virtualSize: 0,
            inViewBegin: 0,
            inViewEnd: 0,
            renderBegin: 0,
            renderEnd: 0,
            bufferTop: 0,
            bufferBottom: 0,
        };
        this._initBuffer();
        this._initResizeObserver();
        this._onListChange();
    }
    // ==================== 公共 API ====================
    /** 获取当前滚动偏移量 */
    getOffset() {
        const key = this._props.horizontal ? 'scrollLeft' : 'scrollTop';
        return this._clientEl ? this._clientEl[key] : 0;
    }
    /** 获取所有插槽（header + footer + sticky）的尺寸总和 */
    getSlotSize() {
        return (this.slotSize.headerSize +
            this.slotSize.footerSize +
            this.slotSize.stickyHeaderSize +
            this.slotSize.stickyFooterSize);
    }
    /** 获取列表总尺寸（列表项 + 插槽） */
    getTotalSize() {
        return this.state.listTotalSize + this.getSlotSize();
    }
    /** 获取指定 key 对应项的尺寸，未测量则返回 itemPreSize + itemGap */
    getItemSize(itemKey) {
        if (this._props.fixed)
            return this._props.itemPreSize + this._props.itemGap;
        return (this.sizesMap.get(String(itemKey)) ??
            this._props.itemPreSize + this._props.itemGap);
    }
    setItemSize(itemKey, size) {
        this.sizesMap.set(String(itemKey), size);
    }
    deleteItemSize(itemKey) {
        this.sizesMap.delete(String(itemKey));
    }
    /** 获取指定索引项的位置信息（相对于列表顶部的 top/bottom） */
    getItemPosByIndex(index) {
        const { itemPreSize, itemGap, fixed } = this._props;
        if (fixed) {
            const unitSize = itemPreSize + itemGap;
            return {
                top: unitSize * index,
                current: unitSize,
                bottom: unitSize * (index + 1),
            };
        }
        const { itemKey, list } = this._props;
        let topReduce = this.slotSize.headerSize;
        for (let i = 0; i <= index - 1; i += 1) {
            topReduce += this.getItemSize(list[i]?.[itemKey]);
        }
        const current = this.getItemSize(list[index]?.[itemKey]);
        return { top: topReduce, current, bottom: topReduce + current };
    }
    /** 滚动到指定偏移量 */
    scrollToOffset(offset) {
        this._abortFixOffset = true;
        const key = this._props.horizontal ? 'scrollLeft' : 'scrollTop';
        if (this._clientEl)
            this._clientEl[key] = offset;
    }
    /**
     * 滚动到指定索引项。
     * 由于不定高场景下尺寸可能在渲染后变化，采用渐进修正策略：
     * 每次 ResizeObserver 回调后重新计算目标偏移并修正，直到稳定。
     */
    scrollToIndex(index) {
        if (index < 0)
            return;
        if (index >= this._props.list.length - 1) {
            this.scrollToBottom();
            return;
        }
        let { top: lastOffset } = this.getItemPosByIndex(index);
        this.scrollToOffset(lastOffset);
        const fixToIndex = () => {
            const { top: offset } = this.getItemPosByIndex(index);
            this.scrollToOffset(offset);
            if (lastOffset !== offset) {
                lastOffset = offset;
                this._fixTaskFn = fixToIndex;
                return;
            }
            this._fixTaskFn = null;
        };
        this._fixTaskFn = fixToIndex;
    }
    /** 将指定索引项滚动到可视区域内（如果已可见则不滚动） */
    scrollIntoView(index) {
        const { top: targetMin, bottom: targetMax } = this.getItemPosByIndex(index);
        const offsetMin = this.getOffset();
        const offsetMax = this.getOffset() + this.slotSize.clientSize;
        const currentSize = this.getItemSize(this._props.list[index]?.[this._props.itemKey]);
        if (targetMin < offsetMin &&
            offsetMin < targetMax &&
            currentSize < this.slotSize.clientSize) {
            this.scrollToOffset(targetMin);
            return;
        }
        if (targetMin + this.slotSize.stickyHeaderSize < offsetMax &&
            offsetMax < targetMax + this.slotSize.stickyHeaderSize &&
            currentSize < this.slotSize.clientSize) {
            this.scrollToOffset(targetMax - this.slotSize.clientSize + this.slotSize.stickyHeaderSize);
            return;
        }
        if (targetMin + this.slotSize.stickyHeaderSize >= offsetMax) {
            this.scrollToIndex(index);
            return;
        }
        if (targetMax <= offsetMin) {
            this.scrollToIndex(index);
            return;
        }
    }
    /** 滚动到顶部（循环重试确保到达） */
    scrollToTop() {
        let count = 0;
        const loop = () => {
            count += 1;
            this.scrollToOffset(0);
            setTimeout(() => {
                if (count > 10)
                    return;
                const key = this._props.horizontal ? 'scrollLeft' : 'scrollTop';
                if (this._clientEl && this._clientEl[key] !== 0) {
                    loop();
                }
            }, 3);
        };
        loop();
    }
    /** 滚动到底部（循环重试确保到达） */
    scrollToBottom() {
        let count = 0;
        const loop = () => {
            count += 1;
            this.scrollToOffset(this.getTotalSize());
            setTimeout(() => {
                if (count > 10)
                    return;
                if (Math.abs(Math.round(this.state.offset + this.slotSize.clientSize) -
                    Math.round(this.getTotalSize())) > 2) {
                    loop();
                }
            }, 3);
        };
        loop();
    }
    /** 手动指定渲染区间（跳过自动计算） */
    manualRender(newRenderBegin, newRenderEnd) {
        const oldRenderBegin = this.state.renderBegin;
        this.state.renderBegin = newRenderBegin;
        this.state.renderEnd = newRenderEnd;
        if (newRenderBegin > oldRenderBegin) {
            this.state.virtualSize += this._getRangeSize(newRenderBegin, oldRenderBegin);
        }
        else {
            this.state.virtualSize -= this._getRangeSize(newRenderBegin, oldRenderBegin);
        }
        this._renderList = this._props.list.slice(this.state.renderBegin, this.state.renderEnd + 1);
        this._updateTotalVirtualSize();
        this._notify();
    }
    /** 重置所有状态（列表清空时调用） */
    reset() {
        this.state.offset = 0;
        this.state.listTotalSize = 0;
        this.state.virtualSize = 0;
        this.state.inViewBegin = 0;
        this.state.inViewEnd = 0;
        this.state.renderBegin = 0;
        this.state.renderEnd = 0;
        this.sizesMap.clear();
        this._updateRenderRange();
    }
    /** 列表头部删除项后修正滚动位置，使视口内容保持不跳动 */
    deletedList2Top(deletedList) {
        this._calcListTotalSize();
        let deletedListSize = 0;
        for (const item of deletedList) {
            deletedListSize += this.getItemSize(item[this._props.itemKey]);
        }
        this._updateTotalVirtualSize();
        this.scrollToOffset(this.state.offset - deletedListSize);
        this._calcRange();
    }
    /** 列表头部新增项后修正滚动位置，使视口内容保持不跳动 */
    addedList2Top(addedList) {
        this._calcListTotalSize();
        let addedListSize = 0;
        for (const item of addedList) {
            addedListSize += this.getItemSize(item[this._props.itemKey]);
        }
        this._updateTotalVirtualSize();
        this.scrollToOffset(this.state.offset + addedListSize);
        this._forceFixOffset = true;
        this._abortFixOffset = false;
        this._calcRange();
    }
    /** 强制触发一次渲染更新 */
    forceUpdate() {
        this._updateRenderRange();
    }
    getReactiveData() {
        return this.state;
    }
    /** 增量更新配置项，自动触发列表/缓冲区重算 */
    updateOptions(partial) {
        const underlying = this._getUnderlying();
        Object.assign(underlying, partial);
        if ('list' in partial) {
            this._onListChange();
        }
        if ('bufferTop' in partial || 'bufferBottom' in partial || 'buffer' in partial) {
            this._initBuffer();
        }
    }
    /** 绑定滚动容器 DOM，开始监听 scroll 和 resize 事件 */
    bindDOM(clientEl) {
        this._clientEl = clientEl;
        clientEl.addEventListener('scroll', this._boundOnScroll);
        this._resizeObserver?.observe(clientEl);
        if (this._props.start) {
            this.scrollToIndex(this._props.start);
        }
        else if (this._props.offset) {
            this.scrollToOffset(this._props.offset);
        }
    }
    /** 监听插槽元素的尺寸变化 */
    observeSlotEl(el) {
        this._resizeObserver?.observe(el);
    }
    unobserveSlotEl(el) {
        this._resizeObserver?.unobserve(el);
    }
    /** 恢复滚动位置（如 keep-alive 场景） */
    resume() {
        this.scrollToOffset(this.state.offset);
    }
    destroy() {
        if (this._clientEl) {
            this._clientEl.removeEventListener('scroll', this._boundOnScroll);
            this._resizeObserver?.unobserve(this._clientEl);
            this.slotSize.clientSize = 0;
        }
        this._resizeObserver?.disconnect();
        this._resizeObserver = undefined;
        this._clientEl = null;
    }
    // ==================== 私有方法 ====================
    /** 获取 Proxy 背后的原始对象，用于 Object.assign */
    _getUnderlying() {
        return this._props;
    }
    _initBuffer() {
        this.state.bufferTop = this._props.bufferTop || this._props.buffer;
        this.state.bufferBottom = this._props.bufferBottom || this._props.buffer;
    }
    /**
     * 初始化 ResizeObserver，统一监听：
     * - 滚动容器（data-id="client"）→ 更新 clientSize，重算 views
     * - 插槽元素（header/footer/sticky）→ 更新对应 slotSize
     * - 列表项（data-id=itemKey）→ 更新 sizesMap，触发偏移修正
     */
    _initResizeObserver() {
        if (typeof ResizeObserver === 'undefined')
            return;
        this._resizeObserver = new ResizeObserver((entries) => {
            let diff = 0;
            for (const entry of entries) {
                const id = entry.target.dataset.id;
                if (!id)
                    continue;
                const oldSize = this.getItemSize(id);
                let newSize = 0;
                if (entry.borderBoxSize) {
                    const boxSize = Array.isArray(entry.borderBoxSize)
                        ? entry.borderBoxSize[0]
                        : entry.borderBoxSize;
                    newSize = this._props.horizontal
                        ? boxSize.inlineSize
                        : boxSize.blockSize;
                }
                else {
                    newSize = this._props.horizontal
                        ? entry.contentRect.width
                        : entry.contentRect.height;
                }
                if (id === 'client') {
                    this.slotSize.clientSize = newSize;
                    this._onClientResize();
                }
                else if (id === 'header') {
                    this.slotSize.headerSize = newSize;
                }
                else if (id === 'footer') {
                    this.slotSize.footerSize = newSize;
                }
                else if (id === 'stickyHeader') {
                    this.slotSize.stickyHeaderSize = newSize;
                }
                else if (id === 'stickyFooter') {
                    this.slotSize.stickyFooterSize = newSize;
                }
                else if (oldSize !== newSize) {
                    this.setItemSize(id, newSize);
                    diff += newSize - oldSize;
                    this._events.itemResize?.(id, newSize);
                }
            }
            this.state.listTotalSize += diff;
            // 执行 scrollToIndex 的渐进修正
            if (this._fixTaskFn) {
                this._fixTaskFn();
            }
            // 向上滚动或 addedList2Top 后，项尺寸变化需修正 scrollOffset 防止跳动
            if ((this._fixOffset || this._forceFixOffset) &&
                diff !== 0 &&
                !this._abortFixOffset) {
                this._fixOffset = false;
                this._forceFixOffset = false;
                this.scrollToOffset(this.state.offset + diff);
            }
            this._abortFixOffset = false;
        });
    }
    /** 滚动事件处理：更新方向 → 重算区间 → 判断是否到达边界 */
    _onScroll(evt) {
        this._events.scroll?.(evt);
        const offset = this.getOffset();
        if (offset === this.state.offset)
            return;
        this._direction = offset < this.state.offset ? 'forward' : 'backward';
        this.state.offset = offset;
        this._calcRange();
        this._judgePosition();
    }
    /** 根据容器尺寸和预估项高计算视口能容纳的项数 */
    _calcViews() {
        this.state.views =
            Math.ceil(this.slotSize.clientSize / (this._props.itemPreSize + this._props.itemGap)) + 1;
    }
    /** 容器尺寸变化后重算 views 并更新区间 */
    _onClientResize() {
        this._calcViews();
        this._updateRange(this.state.inViewBegin);
    }
    /** 重新计算所有列表项的尺寸总和 */
    _calcListTotalSize() {
        if (this._props.fixed) {
            this.state.listTotalSize =
                (this._props.itemPreSize + this._props.itemGap) * this._props.list.length;
            return;
        }
        const { itemKey, list } = this._props;
        let total = 0;
        for (let i = 0; i < list.length; i += 1) {
            total += this.getItemSize(list[i]?.[itemKey]);
        }
        this.state.listTotalSize = total;
    }
    /**
     * 更新可视区间 [inViewBegin, inViewEnd] 并触发渲染区间更新。
     * 如果 start 比当前 inViewBegin 小，说明需要向上渲染更多项，标记 fixOffset。
     */
    _updateRange(start) {
        if (start < this.state.inViewBegin) {
            this._fixOffset = true;
        }
        this.state.inViewBegin = start;
        this.state.inViewEnd = Math.min(start + this.state.views, this._props.list.length - 1);
        this._events.rangeUpdate?.(this.state.inViewBegin, this.state.inViewEnd);
        this._updateRenderRange();
    }
    /**
     * 根据当前 offset 和滚动方向，二分查找确定 inViewBegin。
     * - forward（向上滚）：从当前 inViewBegin 往前搜索
     * - backward（向下滚）：从当前 inViewBegin 往后搜索
     */
    _calcRange() {
        const { offset, inViewBegin } = this.state;
        const { itemKey, list } = this._props;
        const offsetWithNoHeader = offset - this.slotSize.headerSize;
        let start = inViewBegin;
        let offsetReduce = this._getVirtualSize2beginInView();
        if (offsetWithNoHeader < 0) {
            this._updateRange(0);
            return;
        }
        if (this._direction === 'forward') {
            if (offsetWithNoHeader >= offsetReduce)
                return;
            for (let i = start - 1; i >= 0; i -= 1) {
                const currentSize = this.getItemSize(list[i]?.[itemKey]);
                offsetReduce -= currentSize;
                if (offsetReduce <= offsetWithNoHeader &&
                    offsetWithNoHeader < offsetReduce + currentSize) {
                    start = i;
                    break;
                }
            }
        }
        if (this._direction === 'backward') {
            if (offsetWithNoHeader <= offsetReduce)
                return;
            for (let i = start; i <= list.length - 1; i += 1) {
                const currentSize = this.getItemSize(list[i]?.[itemKey]);
                if (offsetReduce <= offsetWithNoHeader &&
                    offsetWithNoHeader < offsetReduce + currentSize) {
                    start = i;
                    break;
                }
                offsetReduce += currentSize;
            }
            this._fixOffset = false;
        }
        if (start !== this.state.inViewBegin) {
            this._updateRange(start);
        }
    }
    /** 判断是否滚动到了顶部/底部边界，触发 toTop/toBottom 事件 */
    _judgePosition() {
        const threshold = Math.max(this._props.scrollDistance, 2);
        if (this._direction === 'forward') {
            if (this.state.offset - threshold <= 0) {
                this._events.toTop?.(this._props.list[0]);
            }
        }
        else if (this._direction === 'backward') {
            const scrollSize = Math.round(this.state.offset + this.slotSize.clientSize);
            const distanceToBottom = Math.round(this.getTotalSize() - scrollSize);
            if (distanceToBottom <= threshold) {
                this._events.toBottom?.(this._props.list[this._props.list.length - 1]);
            }
        }
    }
    /** 获取 virtualSize 到 inViewBegin 的累计尺寸（renderBegin → inViewBegin） */
    _getVirtualSize2beginInView() {
        return (this.state.virtualSize +
            this._getRangeSize(this.state.renderBegin, this.state.inViewBegin));
    }
    /** 计算 [range1, range2) 区间内所有项的尺寸总和 */
    _getRangeSize(range1, range2) {
        const start = Math.min(range1, range2);
        const end = Math.max(range1, range2);
        let total = 0;
        for (let i = start; i < end; i += 1) {
            total += this.getItemSize(this._props.list[i]?.[this._props.itemKey]);
        }
        return total;
    }
    /** 重新计算 renderBegin 之前所有项的尺寸（即 virtualSize） */
    _updateTotalVirtualSize() {
        let offset = 0;
        const first = this.state.renderBegin;
        for (let i = 0; i < first; i++) {
            offset += this.getItemSize(this._props.list[i]?.[this._props.itemKey]);
        }
        this.state.virtualSize = offset;
    }
    /**
     * 根据 inViewBegin/End + buffer 计算实际渲染区间 [renderBegin, renderEnd]，
     * 更新 virtualSize（增量计算），切片出 renderList 并通知上层。
     */
    _updateRenderRange() {
        const oldRenderBegin = this.state.renderBegin;
        let newRenderBegin = this.state.inViewBegin;
        let newRenderEnd = this.state.inViewEnd;
        newRenderBegin = Math.max(0, newRenderBegin - this.state.bufferTop);
        newRenderEnd = Math.min(newRenderEnd + this.state.bufferBottom, this._props.list.length - 1 > 0 ? this._props.list.length - 1 : 0);
        if (this._props.renderControl) {
            const ctrl = this._props.renderControl(this.state.inViewBegin, this.state.inViewEnd);
            newRenderBegin = ctrl.begin;
            newRenderEnd = ctrl.end;
        }
        this.state.renderBegin = newRenderBegin;
        this.state.renderEnd = newRenderEnd;
        // 增量更新 virtualSize，避免每次全量遍历
        if (newRenderBegin > oldRenderBegin) {
            this.state.virtualSize += this._getRangeSize(newRenderBegin, oldRenderBegin);
        }
        else {
            this.state.virtualSize -= this._getRangeSize(newRenderBegin, oldRenderBegin);
        }
        this._renderList = this._props.list.slice(this.state.renderBegin, this.state.renderEnd + 1);
        this._notify();
    }
    /** 列表数据变化后重新计算尺寸和区间 */
    _onListChange() {
        const newLen = this._props.list.length;
        if (newLen <= 0) {
            this.reset();
            return;
        }
        this._calcListTotalSize();
        this._updateRange(this.state.inViewBegin);
        this._updateTotalVirtualSize();
        this._updateRenderRange();
    }
    /** 通知上层渲染列表已更新 */
    _notify() {
        this._events.update?.(this._renderList, this.state);
    }
}
//# sourceMappingURL=VirtListCore.js.map