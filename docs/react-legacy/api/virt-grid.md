# VirtGrid API

适用于 **react-legacy**（与 React 18 版 **API 一致**）。VirtGrid 为虚拟网格列表，单元格通过必填的 **`renderCell`** 属性渲染，返回原生 `HTMLElement`（非 React 元素）。

根节点除下表属性外，还支持：

- **`style?: React.CSSProperties`** — 根容器内联样式  
- **`className?: string`** — 根容器类名  

实例方法通过 **`ref`** 调用，类型为 **`VirtGridRef`**（配合 `useRef<VirtGridRef>(null)`）。

## StyleValue

部分样式属性的类型为 **`StyleValue`**（来自 `@virt-list/core`），定义为：

`string | Record<string, string | number>`

## 属性

| 参数               | 说明                                                             | 类型                                                                                | 默认值                                                                 | 是否必须                     |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| list               | 数据列表                                                         | `T[]`                                                                               | -                                                                      | <font color="#f00">是</font> |
| gridItems          | 每行展示个数                                                     | `number`                                                                            | -（无默认值，必须传入）                                                | <font color="#f00">是</font> |
| itemKey            | 项的唯一标识                                                     | `string`                                                                            | -                                                                      | <font color="#f00">是</font> |
| renderCell         | 单元格渲染函数，返回 `HTMLElement`                               | `(item: T, index: number, rowIndex: number) => HTMLElement`                       | -                                                                      | <font color="#f00">是</font> |
| itemPreSize        | 预估行高（px）                                                   | `number`                                                                            | `50`（实现为 `?? 50`）                                                 | -                            |
| itemGap            | 行间距                                                           | `number`                                                                            | -                                                                      | -                            |
| fixed              | 是否固定高度                                                     | `boolean`                                                                           | -                                                                      | -                            |
| buffer             | buffer 行数                                                      | `number`                                                                            | `2`（实现为 `?? 2`）                                                   | -                            |
| itemStyle          | 单元格容器样式                                                   | `StyleValue`                                                                        | `undefined`                                                            | -                            |
| stickyHeaderStyle  | 悬浮头部区域样式                                                 | `StyleValue`                                                                        | `undefined`                                                            | -                            |
| renderStickyHeader | 悬浮头部渲染                                                     | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |
| renderStickyFooter | 悬浮底部渲染                                                     | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |
| renderHeader       | 头部渲染                                                         | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |
| renderFooter       | 底部渲染                                                         | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |
| renderEmpty        | 空数据渲染                                                       | `(el: HTMLElement) => HTMLElement \| void`                                          | `undefined`                                                            | -                            |
| style              | 根容器样式                                                       | `React.CSSProperties`                                                               | -                                                                      | -                            |
| className          | 根容器类名                                                       | `string`                                                                            | -                                                                      | -                            |

## 回调（对应 Vue 的事件）

| 回调属性         | 说明           | 类型                                                         |
| ---------------- | -------------- | ------------------------------------------------------------ |
| onScroll         | 滚动回调       | `(e: Event) => void`                                         |
| onToTop          | 触顶回调       | `(item: unknown) => void`                                    |
| onToBottom       | 触底回调       | `(item: unknown) => void`                                    |
| onItemResize     | Item 尺寸变化  | `(id: string, size: number) => void`                         |
| onRangeUpdate    | 可视区范围变更 | `(begin: number, end: number) => void`                        |

## Ref 方法（VirtGridRef）

| 方法名          | 说明                                                 | 签名                                  |
| --------------- | ---------------------------------------------------- | ------------------------------------- |
| setList         | 设置新数据列表                                       | `(list: T[]) => void`                 |
| setGridItems    | 设置每行展示个数                                     | `(n: number) => void`                 |
| scrollToIndex   | 滚动到指定下标                                       | `(index: number) => void`             |
| scrollIntoView  | 滚动到指定下标（若不在可视范围内）                   | `(index: number) => void`             |
| scrollToTop     | 滚动到顶部                                           | `() => void`                          |
| scrollToBottom  | 滚动到底部                                           | `() => void`                          |
| scrollToOffset  | 滚动到指定偏移量（px）                               | `(offset: number) => void`            |
| forceUpdate     | 强制更新                                             | `() => void`                          |

示例：

```tsx
const ref = useRef<VirtGridRef>(null);
// ref.current?.setGridItems(4);
```
