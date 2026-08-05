# 虚拟滚动原理

## 为什么需要虚拟滚动

浏览器渲染 10,000 个 DOM 节点和 100 个的性能差距是数量级的。传统列表将所有数据渲染为 DOM，数据量增大后帧率骤降、内存飙升。

虚拟滚动的核心思路：**只渲染视口内（及少量缓冲区）的 DOM 节点，用一个占位元素撑出完整的滚动高度**。用户看到的是一个正常的、可以自由滚动的长列表，但 DOM 中始终只有几十个节点。

## 核心算法

virt-list 的滚动引擎位于 `@virt-list/core`，整个过程可以拆解为 5 个步骤。

### 1. 计算总高度

列表容器 `listEl` 的 `min-height` 设为所有项的尺寸之和（`listTotalSize`），浏览器据此产生原生滚动条。每项尺寸取自 `sizesMap`（已测量值）或 `itemPreSize`（预估值），确保首屏就有正确的滚动范围。

```
listEl.style.minHeight = listTotalSize + 'px'  // 撑出滚动空间
```

### 2. 定位可视区间

监听 `scroll` 事件，拿到当前 `scrollTop`，从上次的可视起点 `inViewBegin` 开始**顺序搜索**：

- **向下滚动（backward）**：从 `inViewBegin` 向后逐项累加尺寸，直到找到 `scrollTop` 落在哪一项
- **向上滚动（forward）**：从 `inViewBegin` 向前回退

找到新的起点后，继续向后累加直到超出视口高度，得到可视终点 `inViewEnd`。

::: tip 为什么从上次位置开始搜索
不定高场景下，某项的偏移量依赖它之前所有项的实际尺寸，无法由索引直接算出，也就无法直接二分。但每次滚动的位移通常很小，从上次位置顺序搜索一般只需遍历 1-3 项，比任何查找都快。

一次性大跳（`scrollToBottom()`、拖动滚动条到底）则相反，顺序搜索要走完成千上万项。此时引擎会放弃增量、改用分块尺寸索引直接定位，代价约为 √n。详见「算法与复杂度」。
:::

### 3. 扩展缓冲区

在可视区间两侧各扩展 `bufferTop` / `bufferBottom` 个项：

```
renderBegin = max(0, inViewBegin - bufferTop)
renderEnd   = min(lastIndex, inViewEnd + bufferBottom)
```

缓冲区让快速滚动时不会看到空白闪烁。

### 4. 虚拟占位

`renderBegin` 之前的所有项不渲染 DOM，而是用一个空 `div`（`virtualEl`）撑出等高空间（`virtualSize`），把实际渲染的项推到正确的视觉位置。

```
┌───────────────────────────┐
│      virtualEl            │ ← height = virtualSize（
├───────────────────────────┤   renderBegin 之前的项高度之和）
│      item[renderBegin]    │
│      item[renderBegin+1]  │
│      ...                  │ ← 实际渲染的 DOM 节点
│      item[renderEnd]      │
├───────────────────────────┤
│      min-height自动补齐    │ ← listEl 的 min-height 撑出
└───────────────────────────┘
```

`virtualSize` 采用**增量计算**：每次 `renderBegin` 移动时，只加减变化区间的尺寸总和，避免全量遍历。大跳跃时两端相距过远，增量累加本身就退化成全量遍历，此时改由分块索引重算。

### 5. 动态尺寸测量

通过 `ResizeObserver` 统一监听所有已渲染项的尺寸。当某项实际尺寸与预估值不同时：

1. 更新 `sizesMap` 中该项的尺寸记录
2. 修正 `listTotalSize`（总高度）与分块索引中对应块的和
3. 必要时修正 `scrollTop`，防止视口跳动

::: info scrollTop 修正
向上滚动时，上方项的尺寸从预估值变为实测值会让下方内容整体位移，画面就会跳动。

引擎的做法不是「补偿位移」，而是**求解不变量**：以视口顶部的项为锚点，记下视口相对它的偏移，此后每次尺寸变化都重新解一次让它回到原位的 `scrollTop`。这样重复应用是幂等的，而且锚点下方的项变高不会误伤视口。详见「算法与复杂度」。
:::

## 数据流总览

```
scroll 事件
  → 判断方向（forward / backward）
  → 从 inViewBegin 顺序搜索新的可视起点
  → 向后累加得到可视终点 inViewEnd
  → 加 buffer 得到渲染区间 [renderBegin, renderEnd]
  → 增量更新 virtualSize
  → slice 出 renderList，通知 DOM 层执行 patch
  → ResizeObserver 测量实测尺寸，回写 sizesMap 与分块索引
  → 若尺寸变化，按锚点复原视口 + 修正 listTotalSize
```

## 固定高度优化

当 `fixed: true` 时，所有项尺寸恒为 `itemPreSize + itemGap`，于是位置计算全部退化为乘除法：总高度是一次乘法，可视起点是一次除法，第 n 项的偏移量也是一次乘法。所有查询都是 O(1)，与数据量彻底无关，同时跳过 `ResizeObserver` 的测量路径。这是性能最优的模式，适用于每项高度确定的场景。

同一套快路径在**尚无任何实测尺寸**时也会生效——此时每项都是预估值，与固定高等价。首屏正处在这个状态，因此首次装载不会因为数据量大而变慢。

## scrollToIndex 的渐进修正

不定高场景下调用 `scrollToIndex(n)` 时，目标项之前的项可能尚未渲染，尺寸只有预估值。引擎采用渐进修正策略：

1. 用预估值计算目标偏移量，执行滚动
2. `ResizeObserver` 回调后，用实测值重新计算目标偏移量
3. 若偏移量有变化，再次修正滚动位置
4. 重复直到偏移量稳定

`scrollToTop()` / `scrollToBottom()` 同理——总高度会随测量动态变化，单次赋值往往到不了位。修正由两个信号驱动：`ResizeObserver` 回调（尺寸真的变了才重算，这也是「到不了位」的根因信号）与 `requestAnimationFrame` 兜底（覆盖赋值后没有任何尺寸变化、回调不触发的情况），两者都不靠猜时间。重复赋值同一目标是幂等的，落在同一帧也没有副作用。
