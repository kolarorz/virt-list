# 虚拟滚动原理

## 为什么需要虚拟滚动

浏览器渲染 10,000 个 DOM 节点和 100 个的性能差距是数量级的。传统列表将所有数据渲染为 DOM，数据量增大后帧率骤降、内存飙升。

虚拟滚动的核心思路：**只渲染视口内（及少量缓冲区）的 DOM 节点，其余项只以「尺寸」的形式存在于一份账本里**。用户看到的是一个正常的、可以自由滚动的长列表，但 DOM 中始终只有几十个节点。

::: info 本库不使用原生滚动
多数虚拟列表把一个占位元素撑到列表总高，让浏览器产生原生滚动条。本库不这么做：容器是 `overflow: hidden`，内容靠 `transform` 移动，滚动条自绘，滚轮 / 键盘 / 触摸全部由库接管。

**偏移量是一个 JS 数字**，不是 `el.scrollTop`。这个选择贯穿下面每一步，理由见「为什么不用占位元素」。
:::

## 核心算法

virt-list 的滚动引擎位于 `@virt-list/core`，整个过程可以拆解为 5 个步骤。

### 1. 维护尺寸账本

所有项的尺寸之和记作 `itemsTotalSize`，加上各插槽得到 `getTotalSize()`。每项尺寸取自 `sizesMap`（已测量值）或 `estimatedSize`（预估值），确保首屏就有正确的滚动范围。

这份账本不写进任何元素的高度里，它有两个消费者：

```
maxOffset = getTotalSize() - clientSize   // 偏移量的上限
滑块长度  = clientSize / getTotalSize()    // 自绘滚动条的几何
```

账本就是权威——偏移量归 JS 掌管，不存在「账本与浏览器的 `scrollHeight` 对不上」这回事。

### 2. 定位可视区间

偏移量的每一次改变都经由库自己的手（用户输入走 `scrollFromUser`，程序化定位走 `scrollToXxx`），所以这一步是**同步**触发的，不依赖任何异步事件。

拿到新偏移量后，从上次的可视起点 `inViewBegin` 开始**顺序搜索**：

- **向列表尾部滚动（backward）**：从 `inViewBegin` 向后逐项累加尺寸，直到找到偏移量落在哪一项
- **向列表头部滚动（forward）**：从 `inViewBegin` 向前回退

找到新的起点后，继续向后累加直到超出视口高度，得到可视终点 `inViewEnd`。

::: tip 为什么从上次位置开始搜索
不定高场景下，某项的偏移量依赖它之前所有项的实际尺寸，无法由索引直接算出，也就无法直接二分。但每次滚动的位移通常很小，从上次位置顺序搜索一般只需遍历 1-3 项，比任何查找都快。

一次性大跳（`scrollToBottom()`、拖动滑块到底）则相反，顺序搜索要走完成千上万项。此时引擎会放弃增量、改用分块尺寸索引直接定位，代价约为 √n。详见「算法与复杂度」。
:::

### 3. 扩展缓冲区

在可视区间两侧各扩展 `bufferTop` / `bufferBottom` 个项：

```
renderBegin = max(0, inViewBegin - bufferTop)
renderEnd   = min(lastIndex, inViewEnd + bufferBottom)
```

缓冲区让快速滚动时不会看到空白闪烁。

### 4. 把渲染块摆到位

`renderBegin` 之前的所有项不渲染 DOM，它们的累计尺寸记作 `leadingSize`。这个数字**不是某个占位元素的高度**——它是渲染块的位移量，由 `transform` 表达。

参与滚动的每一段（header / 渲染块 / footer）都绝对定位，各自带一个 `transform`，写入的是**残差**：

```
该段的 transform = 该段在内容坐标系里的位置 − offset

  headerEl : stickyHeaderSize                        − offset
  itemsEl  : stickyHeaderSize + headerSize + leadingSize − offset
  footerEl : stickyHeaderSize + headerSize + itemsTotalSize − offset
```

```
┌───────────────────────────┐ ← clientEl（overflow: hidden，视口）
│      item[renderBegin]    │
│      item[renderBegin+1]  │
│      ...                  │ ← 唯一存在的 DOM，几十个节点
│      item[renderEnd]      │
└───────────────────────────┘
   ▲ itemsEl 整块由一个 transform 定位，
     视口外的部分既没有 DOM 也没有占位高度
```

::: tip 为什么写残差而不是绝对位置
浏览器对单个 `transform` 的位移量有上限（Chrome 实测 33,554,400px）。若让公共父层整体 `translate(-offset)`、渲染块再 `translate(+leadingSize)`，两者都携带完整量级，超限时各自被夹住、合成结果就崩了。

残差最大也就一屏多一点，任何单个 `transform` 都碰不到上限，于是那条天花板整个消失。100 万项 × 100px 实测定位误差 0px。
:::

`leadingSize` 采用**增量计算**：每次 `renderBegin` 移动时，只加减变化区间的尺寸总和，避免全量遍历。大跳跃时两端相距过远，增量累加本身就退化成全量遍历，此时改由分块索引重算。

### 5. 动态尺寸测量

通过 `ResizeObserver` 统一监听所有已渲染项的尺寸。当某项实际尺寸与预估值不同时：

1. 更新 `sizesMap` 中该项的尺寸记录
2. 修正 `itemsTotalSize`（总尺寸）与分块索引中对应块的和
3. 重新求解待维持的滚动目标，防止视口跳动

::: info 视口位置的维持
向列表头部滚动时，上方项的尺寸从预估值变为实测值会让下方内容整体位移，画面就会跳动。

引擎的做法不是「补偿位移」，而是**求解不变量**：以视口顶部的项为锚点，记下视口相对它的偏移，此后每次尺寸变化都重新解一次让它回到原位的偏移量。这样重复应用是幂等的，而且锚点下方的项变高不会误伤视口。详见「算法与复杂度」。
:::

## 数据流总览

一次用户滚动的完整链路，**全部落在同一个同步任务里**：

```
滚轮 / 键盘 / 触摸 / 拖拽滑块
  → InputController 按帧合并位移
  → scrollFromUser(offset)：写入偏移量（唯一真相）
  → 同步派发 offsetChange → DOM 层重写各段的 transform（内容移动）
  → 判断方向（forward / backward）
  → 从 inViewBegin 顺序搜索新的可视起点
  → 向后累加得到可视终点 inViewEnd
  → 加 buffer 得到渲染区间 [renderBegin, renderEnd]
  → 增量更新 leadingSize
  → slice 出 renderList，通知 DOM 层执行 patch
  ─────────────── 以上同步完成，内容位置与 DOM 同帧提交 ───────────────
  → ResizeObserver 测量实测尺寸，回写 sizesMap 与分块索引
  → 若尺寸变化，重新求解待维持目标 + 修正 itemsTotalSize
```

::: tip 「同帧提交」是这套设计的主要收益
原生滚动下，浏览器先在合成器线程把画面滚过去并呈现那一帧，`scroll` 事件之后才异步回送到主线程。于是快速拖拽时，已呈现的那一帧里视口正对着还没有 DOM 的位置——这是时序问题，优化渲染速度消不掉。

偏移量归 JS 之后，内容只在 JS 写入时才移动，位置与 DOM 永远同帧提交。
:::

## 固定高度优化

当 `fixedSize: true` 时，所有项尺寸恒为 `estimatedSize + itemGap`，于是位置计算全部退化为乘除法：总尺寸是一次乘法，可视起点是一次除法，第 n 项的偏移量也是一次乘法。所有查询都是 O(1)，与数据量彻底无关，同时跳过 `ResizeObserver` 的测量路径。这是性能最优的模式，适用于每项高度确定的场景。

同一套快路径在**尚无任何实测尺寸**时也会生效——此时每项都是预估值，与固定高等价。首屏正处在这个状态，因此首次装载不会因为数据量大而变慢。

## scrollToIndex 的渐进修正

不定高场景下调用 `scrollToIndex(n)` 时，目标项之前的项可能尚未渲染，尺寸只有预估值。「停在某处」于是成了一个动态目标：项被渲染出来后报上真实尺寸，先前算出的偏移量随之失效。

引擎的做法是**只记目标、每次重新求解**：

1. 用预估值计算目标偏移量，执行滚动
2. 记下「要锚在第 n 项」这个意图（而不是「还差多少像素」）
3. 每次 `ResizeObserver` 回调重新解一次目标偏移量并写入

`scrollToTop()` / `scrollToBottom()` 同理——到底的目标是 `getTotalSize() - clientSize`，会随测量一直变。

求解的是不变量而非增量补偿，所以重复应用没有副作用：不需要收敛判据、不需要重试上限、也不需要「这次是谁写的」标记窗口。实测 2000 项不定高 `scrollToBottom` 一轮即收敛。

用户一旦自己滚动，显式定位的意图立即作废——不会出现「想翻历史消息却被程序拽回目标位置」。
