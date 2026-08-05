# VirtList API

适用于 **Vue 3**。通过 **插槽** 自定义区域内容，使用 **`v-on` / `@`** 监听事件，通过 **`ref`** 调用组件 **`expose`** 暴露的方法。

1. `list.item[itemKey]` <font color="#f00">必须唯一!!!</font>
2. item 元素之间不能使用 <font color="#f00">margin!!!</font>

## StyleValue / ClassValue

列表中与样式相关的字段使用 **`StyleValue`** 类型，等价于 **`string | Record<string, string | number | null | undefined> | StyleValue[]`**，支持字符串、对象与数组嵌套形式。

列表中与类名相关的字段使用 **`ClassValue`** 类型，等价于 **`string | Record<string, boolean | null | undefined> | ClassValue[]`**，支持字符串、对象与数组嵌套形式。

## 属性

| 参数               | 说明                                                                                     | 类型                                                                                         | 默认值  | 是否必须                     |
| ------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------- | ---------------------------- |
| list               | 数据列表                                                                                 | `T[]`                                                                                        | `[]`    | <font color="#f00">是</font> |
| itemKey            | 项的唯一 id（否则会无法正常滚动）                                                        | `String \| Number`                                                                           | -       | <font color="#f00">是</font> |
| itemPreSize        | 预估尺寸                                                                                 | `Number`                                                                                     | -       | -                            |
| itemGap            | 元素之间的间距（元素尺寸包含 itemGap）                                                   | `Number`                                                                                     | `0`     | -                            |
| fixed              | 是否为固定高度，可提升性能<br />**注意：动态高度模式下请勿开启**                         | `Boolean`                                                                                    | `false` | -                            |
| buffer             | 渲染量大、滚动白屏严重时使用；设置后 bufferTop、bufferBottom 会与 buffer 对齐            | `Number`                                                                                     | `0`     | -                            |
| bufferTop          | 顶部 buffer 个数                                                                         | `Number`                                                                                     | `0`     | -                            |
| bufferBottom       | 底部 buffer 个数                                                                         | `Number`                                                                                     | `0`     | -                            |
| horizontal         | 是否水平滚动                                                                             | `Boolean`                                                                                    | `false` | -                            |
| scrollDistance     | 滚动阈值（提前触发 toTop / toBottom），单位：px                                          | `Number`                                                                                     | `0`     | -                            |
| scrollDuration     | 平滑滚动（`behavior: 'smooth'`）的默认动画时长，单位：ms                                | `Number`                                                                                    | `300`   | -                            |
| smoothMaxDistance  | 平滑滚动允许逐帧穿越的最大距离（px），超出部分先瞬跳；缺省为两倍视口              | `Number`                                                                                    | 两倍视口 | -                            |
| start              | 起始渲染下标                                                                             | `Number`                                                                                     | `0`     | -                            |
| offset             | 起始渲染偏移量                                                                           | `Number`                                                                                     | `0`     | -                            |
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
| loadMore           | 触达边界时的取数回调，见下方 [分页与无限加载](#分页与无限加载)                          | `(direction: 'top' \| 'bottom') => boolean \| void \| Promise<boolean \| void>`             | -       | -                            |
| hasMoreTop         | 顶部方向是否还有更多数据；可作为受控属性覆盖 `loadMore` 的返回值                        | `Boolean`                                                                                   | `true`  | -                            |
| hasMoreBottom      | 底部方向是否还有更多数据；可作为受控属性覆盖 `loadMore` 的返回值                        | `Boolean`                                                                                   | `true`  | -                            |
| initialPosition    | 首屏定位。`'bottom'` 会在挂载后定位到底部，并随尺寸测量渐进校准（聊天室常用）<br />与 `start` / `offset` 同时给出时后两者优先 | `'top' \| 'bottom'`                                            | `'top'` | -                            |
| stickyBottom       | 尾部追加时是否自动跟随到底部；仅在**原本就贴底**时跟随                                  | `Boolean`                                                                                   | `false` | -                            |
| stickyThreshold    | 判定"贴底"的容差（px），缺省取 `scrollDistance`（至少 2px）                             | `Number`                                                                                    | `0`     | -                            |

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

Vue 3 推荐使用 **`emits`** 声明事件；模板中使用 **`@scroll`、`@toTop`** 等与下表名称对应。

| 事件名       | 说明               | 回调参数                                                        |
| ------------ | ------------------ | --------------------------------------------------------------- |
| scroll       | 滚动               | `(e: Event)`                                                    |
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
| getOffset          | 获取滚动距离                                                                   | `() => number`                                                                        |
| getSlotSize        | 获取插槽尺寸                                                                   | `() => SlotSize`                                                                      |
| scrollToTop        | 滚动到顶部                                                                     | `(options?: VirtScrollOptions) => void`                                                                          |
| scrollToBottom     | 滚动到底部                                                                     | `(options?: VirtScrollOptions) => void`                                                                          |
| scrollToIndex      | 滚动到指定下标                                                                 | `(index: number, options?: VirtScrollOptions) => void`                                                             |
| scrollIntoView     | 滚动到指定下标（若不在可视区域内）                                             | `(index: number, options?: VirtScrollOptions) => void`                                                             |
| scrollToOffset     | 滚动到指定偏移量（px）                                                         | `(offset: number, options?: VirtScrollOptions) => void`                                                            |
| cancelScroll      | 取消进行中的平滑滚动动画                                                     | -                                                  |
| getItemSize        | 获取指定 item 尺寸（按 **itemKey**）                                           | `(itemKey: string) => number`                                                         |
| deleteItemSize     | 删除已缓存的 item 尺寸                                                         | `(itemKey: string) => void`                                                           |
| getItemPosByIndex  | 获取指定下标的位置信息                                                         | `(index: number) => { top: number; current: number; bottom: number }`                |
| forceUpdate        | 强制更新                                                                       | `() => void`                                                                          |
| deletedList2Top    | 删除顶部数据（分页场景）                                                       | `(list: T[]) => void`                                                                 |
| addedList2Top      | 添加顶部数据（分页场景）                                                       | `(list: T[]) => void`                                                                 |
| manualRender       | 手动控制渲染范围                                                               | `(begin: number, end: number) => void`                                                |
| getState    | 获取响应式数据                                                                 | `() => ListState`                                                                  |
| setList            | 设置新的数据列表                                                               | `(list: T[]) => void`                                                                 |
| getLoadState       | 获取当前加载状态                                                               | `() => LoadState`                                                                     |

::: tip deletedList2Top / addedList2Top / forceUpdate 通常不再需要手动调用
`list` 变化时，组件会自动识别头部的增删并补偿滚动位置，随后完成重算与渲染。
这三个方法只在自动识别失败时才需要兜底——比如一次变更同时改动了头部的两端，
或头部改动超过 2048 项。误调也是安全的：同一次列表变更已被自动补偿时，它们会直接短路，
不会把视口推成两倍距离。
:::

## VirtScrollOptions

`scrollToIndex` / `scrollIntoView` / `scrollToTop` / `scrollToBottom` / `scrollToOffset` 都接受一个可选的 **`VirtScrollOptions`**，用于开启平滑滚动：

| 字段     | 说明                                              | 类型                            | 默认值   |
| -------- | ------------------------------------------------- | ------------------------------- | -------- |
| behavior | `'auto'` 瞬时跳转；`'smooth'` 平滑动画            | `'auto' \| 'smooth'`            | `'auto'` |
| align    | 目标项与视口的对齐方式（仅 `scrollToIndex` 生效）：`'start'` 项顶部对齐视口顶部；`'end'` 项底部对齐视口底部 | `'start' \| 'end'` | `'start'` |
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

`getState()` 或 **`update`** 事件中的 `state` 字段类型为 **`ListState`**：

| 属性           | 类型     | 说明                                       |
| -------------- | -------- | ------------------------------------------ |
| listTotalSize  | `number` | 列表总尺寸（不含插槽）                     |
| virtualSize    | `number` | 虚拟占位尺寸（0 到 renderBegin）           |
| inViewBegin    | `number` | 可视区起始下标                             |
| inViewEnd      | `number` | 可视区结束下标                             |
| renderBegin    | `number` | 实际渲染起始下标(包含buffer)                           |
| renderEnd      | `number` | 实际渲染结束下标(包含buffer)                           |

### SlotSize

`getSlotSize()` 返回值类型：

| 属性               | 类型     | 说明                 |
| ------------------ | -------- | -------------------- |
| clientSize         | `number` | 可视区容器尺寸       |
| headerSize         | `number` | header 插槽高度      |
| footerSize         | `number` | footer 插槽高度      |
| stickyHeaderSize   | `number` | stickyHeader 插槽高度 |
| stickyFooterSize   | `number` | stickyFooter 插槽高度 |

## 分页与无限加载

上下分页、无限加载、聊天室这几类场景的共同点是：**取数是业务逻辑，其余都是样板**。
`loadMore` 把样板收进组件内部，使用方只需要回答"这个方向的下一批数据是什么"。

```vue
<VirtList
  :list="list"
  item-key="id"
  :item-pre-size="60"
  :load-more="onLoadMore"
>
  <template #footer="{ loadState }">
    <div>{{ loadState.loadingBottom ? '加载中' : loadState.hasMoreBottom ? '' : '没有更多了' }}</div>
  </template>
</VirtList>
```

```ts
async function onLoadMore(direction: LoadDirection) {
  const data = await fetchPage(direction === 'top' ? --page : ++page);
  list.value = direction === 'top' ? data.concat(list.value) : list.value.concat(data);
  // 返回该方向是否还有更多；返回 void 视为仍有更多
  return data.length > 0;
}
```

数据仍由使用方写入 `list`（这样才能适配 Vue 的响应式与 React 的 setState），
组件负责其余全部：

- **防重入**：加载进行中不会重复触发同一方向，不必自己维护 `loading` 标志
- **位移补偿**：头部插入 / 删除后视口内容留在原处，不必调 `addedList2Top` / `deletedList2Top`
- **重算与渲染**：不必再补一次 `forceUpdate()`
- **`hasMore` 落位**：返回 `false` 后该方向不再触发
- **首屏补齐**：初始为空或不足一屏时会自动继续取数，不必在 `onMounted` 里手动拉第一页
- **加载状态**：通过 `header` / `footer` 插槽的 `loadState` 直接渲染提示条

### 三类场景的写法

| 场景 | 关键配置 |
| ---- | -------- |
| 无限加载（信息流） | `:load-more` + `:has-more-top="false"` |
| 双向分页（日志、时间线） | `:load-more`，两个方向都实现；裁剪另一端的数据在回调里照常改 `list` 即可 |
| 聊天室 | `:load-more`（只实现 `top`）+ `initial-position="bottom"` + `sticky-bottom` + `:has-more-bottom="false"` |

### 顶部方向不会自动触发

内容不足一屏时组件会自动向**底部**方向续拉——否则用户没有可滚动的余量，
加载永远不会被触发。

顶部方向不做这件事：`scrollTop` 为 0 是初始常态而不是用户意图，若自动触发，
任何配置了 `loadMore` 的列表在挂载瞬间就会开始无限向上拉取历史数据。
要更早的数据，必须由"主动向上滚到顶"这个动作来表达。

### LoadState

`header` / `footer` 插槽的作用域参数、`loadStateChange` 事件的回调参数、
以及 `getLoadState()` 的返回值都是这个类型：

| 属性            | 类型      | 说明                                                     |
| --------------- | --------- | -------------------------------------------------------- |
| loadingTop      | `boolean` | 顶部方向正在加载                                         |
| loadingBottom   | `boolean` | 底部方向正在加载                                         |
| hasMoreTop      | `boolean` | 顶部方向是否还有更多数据                                 |
| hasMoreBottom   | `boolean` | 底部方向是否还有更多数据                                 |
| pendingNew      | `number`  | 未贴底时尾部新增的项数，用于渲染"N 条新消息"角标；视口回到底部后归零（仅 `stickyBottom` 开启时累加） |

### 贴底跟随

`sticky-bottom` 的关键在于**仅在原本就贴底时才跟随**：用户正在向上翻历史消息时
来了新消息，视口不会被拽到底部，新增量记在 `loadState.pendingNew` 里，
可以据此渲染一个"N 条新消息"的角标。用户滚回底部后自动归零。
