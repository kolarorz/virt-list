# VirtList API

适用于 **Vue 3**。通过 **插槽** 自定义区域内容，使用 **`v-on` / `@`** 监听事件，通过 **`ref`** 调用组件 **`expose`** 暴露的方法。

::: warning 两条硬约束
- `itemKey` 指向的字段在整个列表里必须唯一，重复的 key 会让滚动错位。
- 列表项之间不能用 `margin`：外边距不计入项的测量尺寸，用 `itemGap` 或 `padding` 代替。
:::

## StyleValue / ClassValue

列表中与样式相关的字段使用 **`StyleValue`** 类型，等价于 **`string | Record<string, string | number | null | undefined> | StyleValue[]`**，支持字符串、对象与数组嵌套形式。

列表中与类名相关的字段使用 **`ClassValue`** 类型，等价于 **`string | Record<string, boolean | null | undefined> | ClassValue[]`**，支持字符串、对象与数组嵌套形式。

## 属性

| 参数               | 说明                                                                                     | 类型                                                                                         | 默认值  | 是否必须                     |
| ------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------- | ---------------------------- |
| list               | 数据列表                                                                                 | `T[]`                                                                                        | `[]`    | **是**                       |
| itemKey            | 项的唯一 id（否则会无法正常滚动）                                                        | `String \| Number`                                                                           | -       | **是**                       |
| estimatedSize        | 预估尺寸                                                                                 | `Number`                                                                                     | -       | -                            |
| itemGap            | 元素之间的间距（元素尺寸包含 itemGap）                                                   | `Number`                                                                                     | `0`     | -                            |
| fixedSize              | 是否为固定高度，可提升性能<br />**注意：动态高度模式下请勿开启**                         | `Boolean`                                                                                    | `false` | -                            |
| buffer             | 渲染量大、滚动白屏严重时使用；设置后 bufferTop、bufferBottom 会与 buffer 对齐            | `Number`                                                                                     | `0`     | -                            |
| bufferTop          | 顶部 buffer 个数                                                                         | `Number`                                                                                     | `0`     | -                            |
| bufferBottom       | 底部 buffer 个数                                                                         | `Number`                                                                                     | `0`     | -                            |
| horizontal         | 是否水平滚动                                                                             | `Boolean`                                                                                    | `false` | -                            |
| edgeThreshold     | 滚动阈值（提前触发 toTop / toBottom），单位：px                                          | `Number`                                                                                     | `0`     | -                            |
| scrollDuration     | 平滑滚动（`behavior: 'smooth'`）的默认动画时长，单位：ms                                | `Number`                                                                                    | `300`   | -                            |
| smoothMaxDistance  | 平滑滚动允许逐帧穿越的最大距离（px），超出部分先瞬跳；缺省为两倍视口              | `Number`                                                                                    | 两倍视口 | -                            |
| initialIndex              | 挂载后自动定位到的索引                                                                             | `Number`                                                                                     | `0`     | -                            |
| initialOffset             | 挂载后自动定位到的偏移量（px）                                                                           | `Number`                                                                                     | `0`     | -                            |
| listStyle          | 列表容器样式                                                                             | `StyleValue`                                                                                 | `''`    | -                            |
| listClass          | 列表容器类名                                                                             | `ClassValue`                                                                                 | `''`    | -                            |
| itemStyle          | item 容器样式；可为函数 `(item, index) => StyleValue`                                    | `StyleValue \| (item, index) => StyleValue`                                                  | `''`    | -                            |
| itemClass          | item 容器类名；可为函数 `(item, index) => ClassValue`                                   | `ClassValue \| (item, index) => ClassValue`                                                  | `''`    | -                            |
| headerClass        | header 类名                                                                              | `ClassValue`                                                                                 | `''`    | -                            |
| headerStyle        | header 样式                                                                              | `StyleValue`                                                                                 | `''`    | -                            |
| footerClass        | footer 类名                                                                              | `ClassValue`                                                                                 | `''`    | -                            |
| footerStyle        | footer 样式                                                                              | `StyleValue`                                                                                 | `''`    | -                            |
| stickyHeaderClass  | stickyHeader 类名                                                                        | `ClassValue`                                                                                 | `''`    | -                            |
| stickyHeaderStyle  | stickyHeader 样式                                                                        | `StyleValue`                                                                                 | `''`    | -                            |
| stickyFooterClass  | stickyFooter 类名                                                                        | `ClassValue`                                                                                 | `''`    | -                            |
| stickyFooterStyle  | stickyFooter 样式                                                                        | `StyleValue`                                                                                 | `''`    | -                            |
| renderControl      | 渲染控制器                                                                               | `(begin: number, end: number) => { begin: number; end: number }`                           | -       | -                            |
| renderItem         | 自定义渲染（优先级高于默认插槽）；返回 `HTMLElement` 或 `void`                         | `(item: T, index: number, el: HTMLElement) => HTMLElement \| void`                         | -       | -                            |
| updateItem         | 配合自定义 `renderItem` 使用：数据变更时**原地更新**已渲染的项（滚动与尺寸上报不触发）。走默认插槽 / children 时组件已自动接好，不必传                         | `(item: T, index: number, el: HTMLElement) => void`                         | -       | -                            |
| loadMore           | 触达边界时的取数回调，见下方 [分页与无限加载](../guide/load-more)                          | `(direction: 'top' \| 'bottom') => boolean \| void \| Promise<boolean \| void>`             | -       | -                            |
| hasMoreTop         | 顶部方向是否还有更多数据；可作为受控属性覆盖 `loadMore` 的返回值                        | `Boolean`                                                                                   | `true`  | -                            |
| hasMoreBottom      | 底部方向是否还有更多数据；可作为受控属性覆盖 `loadMore` 的返回值                        | `Boolean`                                                                                   | `true`  | -                            |
| initialPosition    | 首屏定位。`'bottom'` 会在挂载后定位到底部，并随尺寸测量渐进校准（聊天室常用）<br />与 `initialIndex` / `initialOffset` 同时给出时后两者优先 | `'top' \| 'bottom'`                                            | `'top'` | -                            |
| stickyBottom       | 尾部追加时是否自动跟随到底部；仅在**原本就贴底**时跟随                                  | `Boolean`                                                                                   | `false` | -                            |
| stickyThreshold    | 判定「贴底」的容差（px），缺省取 `edgeThreshold`（至少 2px）                             | `Number`                                                                                    | `0`     | -                            |
| aria           | 为辅助技术补上列表语义。开启后渲染容器加 `role`（默认 `list`）、每项加 `role="listitem"` 与 `aria-posinset` / `aria-setsize`——**位置与总数取自数据，不由 DOM 元素个数推断** | `Boolean\|'list'\|'listbox'`                                                | `false` | -                            |
| ariaLabel      | 供辅助技术朗读的列表名称，配合 `aria` 使用                                          | `String`                                                                      | -       | -                            |
| copyText       | 每项对应的纯文本，**给出即开启跨虚拟化的选区复制**：用户选中的范围跨越未渲染区域时，中间那些没有 DOM 的项从数据补齐。不给则完全不挂 `copy` 监听 | `(item, index) => string`                                                     | -       | -                            |
| copySeparator  | 复制时各项之间的分隔符                                                            | `String`                                                                      | `'\n'`  | -                            |
| scrollbarAutoHideDelay  | 滚动条停止滚动多久后淡出（ms），`0` 表示常驻                      | `Number`                                                                                    | `1200`  | -                            |
| scrollbarMinThumbSize | 滑块的最小长度（px）                                            | `Number`                                                                                    | `20`    | -                            |
| keyboard          | 是否接管键盘（方向键 / PageUp-Down / Space / Home-End）。宿主已在**祖先**元素上处理这些键时关掉它——库的监听在后代上、先触发，两边都响应会让一次按键既滚一段又移动一格。滚轮 / 触摸不受影响 | `Boolean` | `true` | - |
| crossScroll       | 交叉轴（竖向列表的横向、横向列表的竖向）是否允许滚动。那条轴上没有虚拟化、内容是完整的真实 DOM，所以交给浏览器原生滚动（落在 `scrollContentEl` 上）。关掉即回到两轴全裁切 | `Boolean` | `true` | - |

## 插槽

| name           | 说明                                              |
| -------------- | ------------------------------------------------- |
| default        | item 内容，作用域参数为 `{ itemData, index }`      |
| header         | 顶部插槽，作用域参数为 `{ loadState }`             |
| footer         | 底部插槽，作用域参数为 `{ loadState }`             |
| stickyHeader   | 顶部悬浮插槽                                      |
| stickyFooter   | 底部悬浮插槽                                      |
| empty          | 空数据插槽                                        |

## 事件

Vue 3 推荐使用 **`emits`** 声明事件；模板中使用 **`@scroll`、`@offset-change`、`@toTop`** 等与下表名称对应。

| 事件名       | 说明               | 回调参数                                                        |
| ------------ | ------------------ | --------------------------------------------------------------- |
| scroll       | 滚动。载荷是普通对象而不是 `Event`，字段见 [VirtScrollEvent](#virtscrollevent) | `(event: VirtScrollEvent)`                   |
| offsetChange | 偏移量变化。要跟着偏移量重写 DOM 时用它，只想感知滚动用 `scroll` | `(offset: number)`                |
| toTop        | 触顶               | `(firstItem: T)`                                                |
| toBottom     | 触底               | `(lastItem: T)`                                                 |
| itemResize   | Item 尺寸变化      | `(id: string, newSize: number)`                                 |
| update  | 渲染列表更新       | `(renderList: T[], state: ListState)`                        |
| loadStateChange | 加载状态变化（loading / hasMore / pendingNew） | `(loadState: LoadState)`                 |

## 暴露方法（ref）

通过 **`ref`** 获取实例后，可调用下表方法（组件内部使用 **`defineExpose`** 暴露）。

| 方法名             | 说明                                                                           | 签名 / 参数                                                                         |
| ------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| reset              | 重置列表                                                                       | `() => void`                                                                          |
| clientEl           | 滚动容器 `.virt-list__client`（主轴视口；交叉轴的 scrollport 是 `scrollContentEl`）。逃生舱：只认 DOM 元素的场合用它，感知滚动仍用 `@scroll` | `HTMLElement`                                    |
| scrollContentEl    | 交叉轴（横向）的滚动容器 `.virt-list__scroll-content`。读写它的 `scrollLeft` 就是读写横向滚动位置，横滚是真的原生 `scroll` 事件 | `HTMLElement`                                    |
| getOffset          | 获取滚动距离                                                                   | `() => number`                                                                        |
| getMaxOffset       | 当前允许的最大偏移量，即 `getTotalSize() - clientSize`                          | `() => number`                                                                        |
| getTotalSize       | 内容总尺寸（列表项 + 各插槽），对应原生语境的 `scrollHeight`                    | `() => number`                                                                        |
| getIndexByOffset   | 给定偏移量落在第几项，`getItemPosByIndex(index).top` 的逆运算                   | `(offset: number) => number`                                                          |
| getSlotsTotalSize        | 所有插槽尺寸之**和**（header + footer + sticky 两者）。分项数据读 `slotSize`     | `() => number`                                                                        |
| scrollToTop        | 滚动到顶部                                                                     | `(options?: VirtScrollOptions) => void`                                                                          |
| scrollToBottom     | 滚动到底部                                                                     | `(options?: VirtScrollOptions) => void`                                                                          |
| scrollToIndex      | 滚动到指定下标                                                                 | `(index: number, options?: VirtScrollOptions) => void`                                                             |
| scrollIntoView     | 滚动到指定下标（若不在可视区域内）                                             | `(index: number, options?: VirtScrollOptions) => void`                                                             |
| scrollToOffset     | 滚动到指定偏移量（px）                                                         | `(offset: number, options?: VirtScrollOptions) => void`                                                            |
| scrollFromUser     | 以「用户滚动」的语义写入偏移量：会触发 `toTop` / `toBottom` 判定与自动续拉，事件 `source` 为 `user`。接自建手势 / 外部滚动条时用它 | `(offset: number) => void`                                                            |
| cancelScroll      | 取消进行中的平滑滚动动画                                                     | -                                                  |
| resume             | 把内容重新摆到当前偏移量上。容器被隐藏 / 重新挂载后（keep-alive）用它复位       | `() => void`                                                                          |
| getItemSize        | 获取指定 item 尺寸（按 **itemKey**）                                           | `(itemKey: string) => number`                                                         |
| deleteItemSize     | 删除已缓存的 item 尺寸                                                         | `(itemKey: string) => void`                                                           |
| getItemPosByIndex  | 获取指定下标的位置信息                                                         | `(index: number) => { top: number; current: number; bottom: number }`                |
| refreshItems       | 重建指定的项（不传则重建全部可见项）。只在「原地改字段又不引起任何重渲染」时需要 | `(keys?: Array<string \| number>) => void`                                            |
| forceUpdate        | 兜底手段：重建全部可见项的 DOM。能指明 key 时优先用 refreshItems                | `() => void`                                                                          |
| manualRender       | 手动控制渲染范围                                                               | `(begin: number, end: number) => void`                                                |
| getState    | 获取响应式数据                                                                 | `() => ListState`                                                                  |
| setList            | 设置新的数据列表                                                               | `(list: T[]) => void`                                                                 |
| getLoadState       | 获取当前加载状态                                                               | `() => LoadState`                                                                     |

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
`list` 变化时，组件会自动识别头部的增删并补偿滚动位置，随后完成重算与渲染——头部插入、
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
listRef.value.scrollToIndex(3000, { behavior: 'smooth' });
// 自定义时长并在结束后做点什么
listRef.value.scrollToTop({ behavior: 'smooth', duration: 600, onDone: (canceled) => {} });
```

注意：

1. 不传参数时行为与旧版本完全一致（瞬时跳转）。
2. 动画期间用户滚动滚轮或触摸滑动会立即接管，动画中断并回调 `onDone(true)`；调用 `cancelScroll()` 或发起新的滚动调用同样会中断前一个动画。
3. 平滑动画每帧都会重新计算目标位置，不定高列表在滚动途中撑开高度也不会跑偏；动画正常结束后还会做一次精确落位修正。

### 长距离滚动为什么会先「瞬跳」一段

虚拟列表逐帧穿越长距离时，相邻两帧的渲染区间完全不重叠——每一帧都要销毁整屏、再新建整屏 DOM，主线程跟不上就会露白，而中间一闪而过的几十屏内容本身也没有观看价值。

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

`getState()` 或 **`update`** 事件中的 `state` 字段类型为 **`ListState`**：

| 属性           | 类型     | 说明                                       |
| -------------- | -------- | ------------------------------------------ |
| itemsTotalSize  | `number` | 列表总尺寸（不含插槽）                     |
| leadingSize    | `number` | 渲染块的位移量：`[0, renderBegin)` 的尺寸之和（不含 header）。自建渲染层靠它定位自己的渲染块 |
| inViewBegin    | `number` | 可视区起始下标                             |
| inViewEnd      | `number` | 可视区结束下标                             |
| renderBegin    | `number` | 实际渲染起始下标(包含buffer)                           |
| renderEnd      | `number` | 实际渲染结束下标(包含buffer)                           |

### SlotSize

`slotSize` 属性（分项尺寸）的类型。`getSlotsTotalSize()` 返回的是它们的**和**，是个 `number`：

| 属性               | 类型     | 说明                 |
| ------------------ | -------- | -------------------- |
| clientSize         | `number` | 可视区容器尺寸       |
| headerSize         | `number` | header 插槽高度      |
| footerSize         | `number` | footer 插槽高度      |
| stickyHeaderSize   | `number` | stickyHeader 插槽高度 |
| stickyFooterSize   | `number` | stickyFooter 插槽高度 |

## LoadState

`header` / `footer` 插槽的作用域参数、`loadStateChange` 事件的回调参数、
以及 `getLoadState()` 的返回值都是这个类型：

| 属性            | 类型      | 说明                                                     |
| --------------- | --------- | -------------------------------------------------------- |
| loadingTop      | `boolean` | 顶部方向正在加载                                         |
| loadingBottom   | `boolean` | 底部方向正在加载                                         |
| hasMoreTop      | `boolean` | 顶部方向是否还有更多数据                                 |
| hasMoreBottom   | `boolean` | 底部方向是否还有更多数据                                 |
| pendingNew      | `number`  | 未贴底时尾部新增的项数，用于渲染「N 条新消息」角标；视口回到底部后归零（仅 `stickyBottom` 开启时累加） |

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

- [分页与无限加载](../guide/load-more)——`loadMore` / `hasMoreTop` / `hasMoreBottom` /
  `initialPosition` / `stickyBottom` 的完整用法，以及无限加载、双向分页、聊天室三类场景的写法。
- [整段复制](../ai/copy)——`copyText` 的取值规则、什么情况下不介入，以及跨很多屏拖选为什么在任何虚拟滚动实现里都不可靠。
- [滚动是怎么工作的](../guide/custom-scrollbar)——为什么容器是 `overflow: hidden`、
  已知取舍、`scrollTop` 的替代写法、`scroll` 与 `offsetChange` 怎么选、滚动条样式定制。
