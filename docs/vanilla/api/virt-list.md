# VirtList API

1. `list.item.id` <font color="#f00">必须唯一!!!</font>
2. item 元素之间不能使用 <font color="#f00">margin!!!</font>

## StyleValue / ClassValue

- `StyleValue`: `string | Record<string, string | number | null | undefined> | StyleValue[]`
- `ClassValue`: `string | Record<string, boolean | null | undefined> | ClassValue[]`

## 配置项

| 参数           | 说明                                                                              | 类型                                                                          | 默认值  | 是否必须                     |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------- | ---------------------------- |
| list           | 数据                                                                              | `Array`                                                                       | -       | <font color="#f00">是</font> |
| itemKey        | 项的 id，<font color="#f00">必须唯一!!!</font>（否则会无法正常滚动）              | `String\|Number`                                                              | -       | <font color="#f00">是</font> |
| estimatedSize    | 预估尺寸                                                                          | `Number`                                                                      | `20`    | -                            |
| itemGap        | 元素之间的间距 (元素尺寸包含 itemGap)                                             | `Number`                                                                      | 0       | -                            |
| fixedSize          | 是否为固定高度，可以提升性能<br />**注意：动态高度模式下，请勿使用**              | `Boolean`                                                                     | `false` | -                            |
| buffer         | 当渲染量大，滚动白屏严重时，可以给定数值，bufferTop 和 bufferBottom 会等于 buffer | `Number`                                                                      | `0`     | -                            |
| bufferTop      | 顶部 buffer 个数                                                                  | `Number`                                                                      | `0`     | -                            |
| bufferBottom   | 底部 buffer 个数                                                                  | `Number`                                                                      | `0`     | -                            |
| horizontal     | 是否水平滚动                                                                      | `Boolean`                                                                     | `false` | -                            |
| edgeThreshold | 滚动阈值（提前触发 toTop 或 toBottom）单位：px                                    | `number`                                                                      | `0`     | -                            |
| scrollDuration     | 平滑滚动（`behavior: 'smooth'`）的默认动画时长，单位：ms                                | `number`                                                                                    | `300`   | -                            |
| smoothMaxDistance  | 平滑滚动允许逐帧穿越的最大距离（px），超出部分先瞬跳；缺省为两倍视口              | `number`                                                                                    | 两倍视口 | -                            |
| initialIndex          | 挂载后自动定位到的索引                                                                      | `Number`                                                                      | `0`     | -                            |
| initialOffset         | 挂载后自动定位到的偏移量（px）                                                                  | `Number`                                                                      | `0`     | -                            |
| listStyle      | 列表容器样式                                                                      | `StyleValue`                                                                  | `''`    | -                            |
| listClass      | 列表容器类名                                                                      | `ClassValue`                                                                  | `''`    | -                            |
| itemStyle      | item 容器样式                                                                     | `StyleValue`                                                                  | `''`    | -                            |
| itemClass      | item 容器类名                                                                     | `ClassValue`                                                                  | `''`    | -                            |
| renderControl  | 渲染控制器                                                                        | `(begin: number, end: number ) => { begin: number; end: number };`            | -       | -                            |
| loadMore       | 触达边界时的取数回调，见下方 [分页与无限加载](../guide/load-more)                     | `(direction: 'top' \| 'bottom') => boolean \| void \| Promise<boolean \| void>` | -       | -                            |
| hasMoreTop     | 顶部方向是否还有更多数据；可覆盖 `loadMore` 的返回值                              | `Boolean`                                                                     | `true`  | -                            |
| hasMoreBottom  | 底部方向是否还有更多数据；可覆盖 `loadMore` 的返回值                              | `Boolean`                                                                     | `true`  | -                            |
| initialPosition | 首屏定位。`'bottom'` 挂载后定位到底部并随尺寸测量渐进校准；`initialIndex` / `initialOffset` 优先 | `'top' \| 'bottom'`                                                           | `'top'` | -                            |
| stickyBottom   | 尾部追加时是否自动跟随到底部；仅在**原本就贴底**时跟随                            | `Boolean`                                                                     | `false` | -                            |
| stickyThreshold | 判定"贴底"的容差（px），缺省取 `edgeThreshold`（至少 2px）                       | `Number`                                                                      | `0`     | -                            |
| aria           | 为辅助技术补上列表语义。开启后渲染容器加 `role`（默认 `list`）、每项加 `role="listitem"` 与 `aria-posinset` / `aria-setsize`——**位置与总数取自数据，不由 DOM 元素个数推断** | `Boolean\|'list'\|'listbox'`                                                | `false` | -                            |
| ariaLabel      | 供辅助技术朗读的列表名称，配合 `aria` 使用                                          | `String`                                                                      | -       | -                            |
| copyText       | 每项对应的纯文本，**给出即开启跨虚拟化的选区复制**：用户选中的范围跨越未渲染区域时，中间那些没有 DOM 的项从数据补齐。不给则完全不挂 `copy` 监听 | `(item, index) => string`                                                     | -       | -                            |
| copySeparator  | 复制时各项之间的分隔符                                                            | `String`                                                                      | `'\n'`  | -                            |
| scrollbarAutoHideDelay  | 滚动条停止滚动多久后淡出（ms），`0` 表示常驻                      | `Number`                                                                                    | `1200`  | -                            |
| scrollbarMinThumbSize | 滑块的最小长度（px）                                            | `Number`                                                                                    | `20`    | -                            |
| keyboard          | 是否接管键盘（方向键 / PageUp-Down / Space / Home-End）。宿主已在**祖先**元素上处理这些键时关掉它——库的监听在后代上、先触发，两边都响应会让一次按键既滚一段又移动一格。滚轮 / 触摸不受影响 | `Boolean` | `true` | - |

## 渲染函数

对应框架版的插槽。返回 `HTMLElement` 会被 append 进容器；也可以直接操作最后一个参数
`el`（容器本身），少一层 DOM 嵌套。

| 名称               | 说明                                       | 签名                                                    |
| ------------------ | ------------------------------------------ | ------------------------------------------------------- |
| renderItem         | item 内容                                  | `(item, index, el) => HTMLElement \| void`              |
| renderHeader       | 顶部区域（参与滚动）；第二参数为加载状态   | `(el, loadState) => HTMLElement \| void`                |
| renderFooter       | 底部区域（参与滚动）；第二参数为加载状态   | `(el, loadState) => HTMLElement \| void`                |
| renderStickyHeader | 顶部悬浮区域                               | `(el) => HTMLElement \| void`                           |
| renderStickyFooter | 底部悬浮区域                               | `(el) => HTMLElement \| void`                           |
| renderEmpty        | 空状态                                     | `(el) => HTMLElement \| void`                           |


## 事件

| 方法名     | 说明              | 参数                                      |
| ---------- | ----------------- | ----------------------------------------- |
| toTop      | 触顶的回调        | 列表中第一项                              |
| toBottom   | 触底的回调        | 列表中最后一项                            |
| scroll | 滚动。载荷是普通对象而不是 `Event`，字段见 [VirtScrollEvent](#virtscrollevent) | event: VirtScrollEvent |
| offsetChange | 偏移量变化。要跟着偏移量重写 DOM 时用它，只想感知滚动用 `scroll` | offset: number |
| itemResize | Item 尺寸发生变化 | `{ id: string, newSize: number }`         |
| update     | 渲染列表更新      | `{ renderList: any[], state: ListState }` |
| loadStateChange | 加载状态变化   | `(loadState: LoadState)`                  |

## 暴露方法

| 方法名            | 说明                                                                         | 参数                                               |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| reset             | 重置列表                                                                     | -                                                  |
| clientEl          | 滚动容器（唯一的 scrollport）。逃生舱：只认 DOM 元素的场合用它，感知滚动仍用 `scroll` 事件 | -                          |
| getOffset         | 获取当前滚动偏移量（容器 `scrollTop` 恒为 0，必须走这里读）                   | -                                                  |
| getMaxOffset      | 当前允许的最大偏移量，即 `getTotalSize() - clientSize`                        | -                                                  |
| getTotalSize      | 内容总尺寸（列表项 + 各插槽），对应原生语境的 `scrollHeight`                  | -                                                  |
| getIndexByOffset  | 给定偏移量落在第几项，`getItemPosByIndex(index).top` 的逆运算                 | offset                                             |
| getSlotsTotalSize       | 所有插槽尺寸之**和**。分项数据读 `core.slotSize`                             | -                                                  |
| scrollToTop       | scroll to top                                                                | options?: VirtScrollOptions                                                  |
| scrollToBottom    | scroll to bottom                                                             | options?: VirtScrollOptions                                                  |
| scrollToIndex     | scroll to index                                                              | index, options?: VirtScrollOptions                                              |
| scrollIntoView    | scroll to index if needed（不在可视范围内）                                  | index, options?: VirtScrollOptions                                              |
| scrollToOffset    | scroll to px                                                                 | px, options?: VirtScrollOptions                                                 |
| scrollFromUser    | 上报一次**用户发起**的滚动：触发 toTop / toBottom 与自动续拉，并作废 scrollToIndex 之类的定位意图。接自定义输入源时用它 | px |
| cancelScroll      | 取消进行中的平滑滚动动画                                                     | -                                                  |
| resume            | 把内容重新摆到当前偏移量上。容器被隐藏 / 重新挂载后（keep-alive）用它复位     | -                                                  |
| onOffsetChange    | 订阅偏移量变化，返回取消订阅的函数。容器不派发原生 `scroll`，跟着滚动重算的逻辑挂这里 | `(cb: (offset: number) => void) => () => void` |
| getItemSize       | 获取指定 item 尺寸                                                           | index                                              |
| getItemPosByIndex | 获取指定 item 的位置信息: `{ top: number; current: number; bottom: number;}` | index                                              |
| forceUpdate       | 强制更新                                                                     | -                                                  |
| refreshItems      | 重新渲染指定的项（数据变了但 key 没变时用）。不传参数等价于 `forceUpdate`；传 key 数组则只重建那几项，其余 DOM 原样保留 | `(keys?: Array<string \| number>) => void`        |
| manualRender      | 手动控制渲染（提供渲染起始）                                                 | `(renderBegin: number, renderEnd: number) => void` |
| getState          | 获取状态数据                                                                 | `() => ListState`                                  |
| getLoadState      | 获取当前加载状态                                                             | `() => LoadState`                                  |

::: tip estimatedSize 配错会有一次提示
这个值是**未测量项的占位尺寸**。项渲染出来后一切以实测为准，所以它给错不会让布局
最终出错，但它决定了**首屏渲染多少项**：给大了视口下半部分会短暂留白，
给小了会白建一堆 DOM。远距离跳转的落位精度、以及尚未测量区间的滚动条长度也依赖它。

因为这类症状很难反推到一个配置项上，组件会在收集到 32 项实测尺寸后比对一次：
实测中位数与配置值相差一倍以上时，向控制台提示一次并给出建议值。
只提示一次，改对了就不再出现。

取中位数而不是均值，是为了让几条超长项不至于把结论带偏——中位数给出的正是
「典型一项有多高」，也就是这个配置该填的值。
:::

::: tip 头部增删不需要手动补偿
`setList` 后，组件会自动识别头部的增删并补偿滚动位置，随后完成重算与渲染——头部插入、
头部删除、以及「一端加一页另一端裁一页」这种总长度不变的双向分页，都在覆盖范围内。

识别依据是首项 key 的移动，范围上界 65536 项。超出这个量级的头部改动识别不出来，
视口不再维持——那更可能是整体换数据源，本就不该维持位置。

`forceUpdate` 同理通常不必调用：列表变更已经带上了重算与通知。
:::

## VirtScrollOptions

`scrollToIndex` / `scrollIntoView` / `scrollToTop` / `scrollToBottom` / `scrollToOffset` 都接受一个可选的 **`VirtScrollOptions`**，用于开启平滑滚动：

| 字段     | 说明                                              | 类型                            | 默认值   |
| -------- | ------------------------------------------------- | ------------------------------- | -------- |
| behavior | `'auto'` 瞬时跳转；`'smooth'` 平滑动画            | `'auto' \| 'smooth'`            | `'auto'` |
| align    | 目标项与视口的对齐方式（仅 `scrollToIndex` 生效）：`'start'` 项顶部对齐视口顶部；`'end'` 项底部对齐视口底部 | `'start' \| 'end'` | `'start'` |
| focus     | 落位后把键盘焦点移到目标项。引用跳转 / 搜索定位这类「程序把用户带到别处」的操作，只动视口不动焦点会让辅助技术用户失去上下文。目标项会被补上 `tabindex="-1"` | `Boolean` | `false` |
| duration | 动画时长（ms），缺省取属性 `scrollDuration`       | `number`                        | `300`    |
| maxDistance | 本次逐帧穿越的最大距离（px），缺省取属性 `smoothMaxDistance`  | `number`                  | 两倍视口 |
| onDone   | 动画结束回调，`canceled` 为 `true` 表示被中断     | `(canceled: boolean) => void`   | -        |

```js
// 平滑滚动到第 3000 项
virtList.scrollToIndex(3000, { behavior: 'smooth' });
// 自定义时长并在结束后做点什么
virtList.scrollToTop({ behavior: 'smooth', duration: 600, onDone: (canceled) => {} });
```

注意：

1. 不传参数时行为与旧版本完全一致（瞬时跳转）。
2. 动画期间用户滚动滚轮或触摸滑动会立即接管，动画中断并回调 `onDone(true)`；调用 `cancelScroll()` 或发起新的滚动调用同样会中断前一个动画。
3. 平滑动画每帧都会重新计算目标位置，不定高列表在滚动途中撑开高度也不会跑偏；动画正常结束后还会做一次精确落位修正。

### 长距离滚动为什么会先"瞬跳"一段

虚拟列表逐帧穿越长距离时，相邻两帧的渲染区间完全不重叠 —— 每一帧都要销毁整屏、再新建整屏 DOM，主线程跟不上就会露白，而中间一闪而过的几十屏内容本身也没有观看价值。

所以平滑滚动只逐帧滚过最后一段距离，超出部分先瞬跳掉。这段距离由属性 `smoothMaxDistance` 控制（也可以在单次调用里用 `maxDistance` 覆盖），缺省为两倍视口高度：

| 取值        | 效果                                                       |
| ----------- | ---------------------------------------------------------- |
| 缺省 / `0`  | 自动取两倍视口高度（推荐）                                 |
| 具体像素值  | 自定义逐帧穿越的距离，越小越不容易露白                     |
| `Infinity`  | 全程逐帧滚动，长距离跳转会明显露白                         |

配合 `buffer` 属性（渲染上下额外几项）可以进一步消除滚动边缘的细白条。


### align：对齐方式

`scrollToIndex` 默认让目标项的**顶部**对齐视口顶部。当目标项比视口还高时（例如展开后有好几屏的长消息），顶部对齐会把刚展开的内容顶到视口外面去，这时候用 `align: 'end'` 让它的**底部**贴住视口底部：

```js
// 项底部贴住视口底部，露出它的末段
listRef.value.scrollToIndex(index, { align: 'end' });
```

对齐用的是**列表项容器**的边界，项内的 padding 与 `itemGap` 都已计入，所以卡片之间的间隔会自然保留。

两种对齐都带渐进修正：目标项的真实高度往往要等渲染后才测得出来，修正会跟着 ResizeObserver 的每次回调重算目标偏移，直到尺寸稳定。所以**不需要**等高度落定再调用。

## ListState

| 属性          | 类型   | 说明                                       |
| ------------- | ------ | ------------------------------------------ |
| itemsTotalSize | number | 不包含插槽的高度                           |
| leadingSize   | number | 渲染块的位移量：`[0, renderBegin)` 的尺寸之和（不含 header）。自建渲染层靠它定位自己的渲染块 |
| inViewBegin   | number | 可视区起始下标                             |
| inViewEnd     | number | 可视区结束下标                             |
| renderBegin   | number | 实际渲染起始下标(包含 buffer)              |
| renderEnd     | number | 实际渲染结束下标(包含 buffer)              |

### slotSize:SlotSize

| 属性             | 类型   | 说明                  |
| ---------------- | ------ | --------------------- |
| clientSize       | number | 可视区容器高度        |
| headerSize       | number | header 插槽高度       |
| footerSize       | number | footer 插槽高度       |
| stickyHeaderSize | number | stickyHeader 插槽高度 |
| stickyFooterSize | number | stickyFooter 插槽高度 |

## LoadState

header / footer 拿到的加载状态、`loadStateChange` 的回调参数、以及 `getLoadState()`
的返回值都是这个类型：

| 属性            | 类型      | 说明                                                     |
| --------------- | --------- | -------------------------------------------------------- |
| loadingTop      | `boolean` | 顶部方向正在加载                                         |
| loadingBottom   | `boolean` | 底部方向正在加载                                         |
| hasMoreTop      | `boolean` | 顶部方向是否还有更多数据                                 |
| hasMoreBottom   | `boolean` | 底部方向是否还有更多数据                                 |
| pendingNew      | `number`  | 未贴底时尾部新增的项数，用于渲染"N 条新消息"角标；视口回到底部后归零（仅 `stickyBottom` 开启时累加） |

## VirtScrollEvent

`scroll` 事件的载荷。容器是 `overflow: hidden`，浏览器不会自己滚动，所以这里给的不是原生
`Event`，而是库内部的偏移量账本；为什么这样设计见指南的
[滚动是怎么工作的](../guide/custom-scrollbar)。

| 字段       | 类型                              | 说明                                       |
| ---------- | --------------------------------- | ------------------------------------------ |
| offset     | `number`                          | 当前偏移量，对应原生语境的 `scrollTop`      |
| delta      | `number`                          | 相对上一次的位移，正数朝列表尾部；恒不为 0  |
| direction  | `'start' \| 'end'`                | 本次位移的方向                             |
| clientSize | `number`                          | 视口尺寸，对应原生语境的 `clientHeight`     |
| scrollSize | `number`                          | 内容总尺寸，对应原生语境的 `scrollHeight`   |
| maxOffset  | `number`                          | `scrollSize - clientSize`，不为负           |
| atStart    | `boolean`                         | 是否已在起始边界                           |
| atEnd      | `boolean`                         | 是否已在末尾边界                           |
| source     | `'user' \| 'program' \| 'adjust'` | 本次滚动由谁触发，见下表                   |

| `source`  | 含义                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| `user`    | 滚轮 / 键盘 / 触摸 / 拖拽滑块，即 `scrollFromUser`                                             |
| `program` | `scrollToOffset` / `scrollToIndex` / `scrollToTop` / `scrollToBottom`（平滑动画的每一帧也算）   |
| `adjust`  | 库为了「让用户正在看的内容留在原处」做的内部补偿：头部增删的位移补偿、尺寸测量后的锚点校正、列表变短后的越界回夹、贴底跟随 |

## 延伸阅读

- [分页与无限加载](../guide/load-more) —— `loadMore` / `hasMoreTop` / `hasMoreBottom` /
  `initialPosition` / `stickyBottom` 的完整用法，以及无限加载、双向分页、聊天室三类场景的写法。
- [整段复制](../ai/copy) —— `copyText` 的取值规则、什么情况下不介入，以及跨很多屏拖选为什么在任何虚拟滚动实现里都不可靠。
- [滚动是怎么工作的](../guide/custom-scrollbar) —— 为什么容器是 `overflow: hidden`、
  已知取舍、`scrollTop` 的替代写法、`scroll` 与 `offsetChange` 怎么选、滚动条样式定制。
