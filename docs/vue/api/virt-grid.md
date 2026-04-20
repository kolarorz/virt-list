# VirtGrid API

VirtGrid 为虚拟网格列表。**不提供插槽**：单元格等内容通过 **`renderCell`** 渲染函数返回原生 `HTMLElement`（非 Vue VNode）。

## StyleValue

部分样式属性的类型为 **`StyleValue`**，定义为：

`string | Record<string, string | number>`

## 属性

| 参数               | 说明                                                             | 类型                                                                                | 默认值                                                                 | 是否必须                     |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| list               | 数据列表                                                         | `T[]`                                                                               | -                                                                      | <font color="#f00">是</font> |
| gridItems          | 每行展示个数                                                     | `Number`                                                                            | -（无默认值，必须传入）                                                | <font color="#f00">是</font> |
| itemKey            | 项的唯一标识                                                     | `String`                                                                            | -                                                                      | <font color="#f00">是</font> |
| renderCell         | 单元格渲染函数，返回 `HTMLElement`                               | `(item: T, index: number, rowIndex: number) => HTMLElement`                       | -                                                                      | <font color="#f00">是</font> |
| itemPreSize        | 预估行高（px）                                                   | `Number`                                                                            | `50`                                                                   | -                            |
| itemGap            | 行间距                                                           | `Number`                                                                            | `0`                                                                    | -                            |
| fixed              | 是否固定高度                                                     | `Boolean`                                                                           | `false`                                                                | -                            |
| buffer             | buffer 行数                                                      | `Number`                                                                            | `2`                                                                    | -                            |
| itemStyle          | 单元格容器样式                                                   | `StyleValue`                                                                        | `undefined`                                                            | -                            |
| stickyHeaderStyle  | 悬浮头部区域样式                                                 | `StyleValue`                                                                        | `undefined`                                                            | -                            |
| renderStickyHeader | 悬浮头部渲染                                                     | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |
| renderStickyFooter | 悬浮底部渲染                                                     | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |
| renderHeader       | 头部渲染                                                         | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |
| renderFooter       | 底部渲染                                                         | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |
| renderEmpty        | 空数据渲染                                                       | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |

组件通过 **`defineEmits`** 声明上述滚动相关事件；模板中使用 `@scroll`、`@toTop` 等监听。

## 事件

| 事件名       | 说明           | 参数                                                         |
| ------------ | -------------- | ------------------------------------------------------------ |
| scroll       | 滚动回调       | `(e: Event)`                                                 |
| toTop        | 触顶回调       | `(item: unknown)` — 通常为列表首项相关数据                   |
| toBottom     | 触底回调       | `(item: unknown)` — 通常为列表末项相关数据                   |
| itemResize   | Item 尺寸变化  | `(id: string, size: number)`                                 |
| rangeUpdate  | 可视区范围变更 | `(begin: number, end: number)`                               |

## 暴露方法

通过 **`defineExpose`** 暴露，在父组件中用 `ref` 调用：

| 方法名          | 说明                                                 | 参数           |
| --------------- | ---------------------------------------------------- | -------------- |
| setList         | 设置新数据列表                                       | `list: T[]`    |
| setGridItems    | 设置每行展示个数                                     | `n: number`    |
| scrollToIndex   | 滚动到指定下标                                       | `index`        |
| scrollIntoView  | 滚动到指定下标（若不在可视范围内）                   | `index`        |
| scrollToTop     | 滚动到顶部                                           | -              |
| scrollToBottom  | 滚动到底部                                           | -              |
| scrollToOffset  | 滚动到指定偏移量（px）                               | `offset`       |
| forceUpdate     | 强制更新                                             | -              |
