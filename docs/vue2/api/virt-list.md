# VirtList API

适用于 **Vue 2**。通过 **插槽** 自定义区域内容，使用 **`v-on` / `@`** 监听事件，通过 **`ref`** 调用组件暴露的方法。

**与 Vue 3 的差异：** Vue 2 没有 `emits` 选项，事件仍可通过 **`@scroll`、`@toTop`** 等正常使用。  
**`fixSelection`**：仅在 **Vue 2** 下需要且生效，用于修复滚动导致选区丢失的问题。

1. `list.item[itemKey]` <font color="#f00">必须唯一!!!</font>
2. item 元素之间不能使用 <font color="#f00">margin!!!</font>

## StyleValue

列表中与样式相关的字段使用 **`StyleValue`** 类型，等价于 **`string | Record<string, string | number>`**：既可传入 **CSS 类名字符串**，也可传入 **样式对象**。

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
| fixSelection       | 是否修复滚动导致 selection 丢失（**仅 Vue 2 生效**）                                   | `Boolean`                                                                                    | `false` | -                            |
| start              | 起始渲染下标                                                                             | `Number`                                                                                     | `0`     | -                            |
| offset             | 起始渲染偏移量                                                                           | `Number`                                                                                     | `0`     | -                            |
| listStyle          | 列表容器样式                                                                             | `StyleValue`                                                                                 | `''`    | -                            |
| listClass          | 列表容器类名                                                                             | `string`                                                                                     | `''`    | -                            |
| itemStyle          | item 容器样式；可为函数 `(item, index) => StyleValue`                                    | `StyleValue \| (item, index) => StyleValue`                                                  | `''`    | -                            |
| itemClass          | item 容器类名；可为函数 `(item, index) => string`                                        | `string \| (item, index) => string`                                                          | `''`    | -                            |
| headerClass        | header 类名                                                                              | `string`                                                                                     | `''`    | -                            |
| headerStyle        | header 样式                                                                              | `StyleValue`                                                                                 | `''`    | -                            |
| footerClass        | footer 类名                                                                              | `string`                                                                                     | `''`    | -                            |
| footerStyle        | footer 样式                                                                              | `StyleValue`                                                                                 | `''`    | -                            |
| stickyHeaderClass  | stickyHeader 类名                                                                        | `string`                                                                                     | `''`    | -                            |
| stickyHeaderStyle  | stickyHeader 样式                                                                        | `StyleValue`                                                                                 | `''`    | -                            |
| stickyFooterClass  | stickyFooter 类名                                                                        | `string`                                                                                     | `''`    | -                            |
| stickyFooterStyle  | stickyFooter 样式                                                                        | `StyleValue`                                                                                 | `''`    | -                            |
| renderControl      | 渲染控制器                                                                               | `(begin: number, end: number) => { begin: number; end: number }`                           | -       | -                            |
| renderItem         | 自定义渲染（优先级高于默认插槽）；返回 `HTMLElement` 或 `void`                         | `(item: T, index: number, el: HTMLElement) => HTMLElement \| void`                         | -       | -                            |

## 插槽

| name           | 说明                                              |
| -------------- | ------------------------------------------------- |
| default        | item 内容，作用域参数为 `{ itemData, index }`      |
| header         | 顶部插槽                                          |
| footer         | 底部插槽                                          |
| stickyHeader   | 顶部悬浮插槽                                      |
| stickyFooter   | 底部悬浮插槽                                      |
| empty          | 空数据插槽                                        |

## 事件

| 事件名       | 说明               | 回调参数                                                        |
| ------------ | ------------------ | --------------------------------------------------------------- |
| scroll       | 滚动               | `(e: Event)`                                                    |
| toTop        | 触顶               | `(firstItem: T)`                                                |
| toBottom     | 触底               | `(lastItem: T)`                                                 |
| itemResize   | Item 尺寸变化      | `(id: string, newSize: number)`                                 |
| rangeUpdate  | 可视区范围变更     | `(inViewBegin: number, inViewEnd: number)`                      |
| update       | 渲染列表更新       | `(renderList: T[], state: ReactiveData)`                         |

## 暴露方法（ref）

| 方法名             | 说明                                                                           | 签名 / 参数                                                                         |
| ------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| reset              | 重置列表                                                                       | `() => void`                                                                          |
| getOffset          | 获取滚动距离                                                                   | `() => number`                                                                        |
| getSlotSize        | 获取插槽尺寸                                                                   | `() => SlotSize`                                                                      |
| scrollToTop        | 滚动到顶部                                                                     | `() => void`                                                                          |
| scrollToBottom     | 滚动到底部                                                                     | `() => void`                                                                          |
| scrollToIndex      | 滚动到指定下标                                                                 | `(index: number) => void`                                                             |
| scrollIntoView     | 滚动到指定下标（若不在可视区域内）                                             | `(index: number) => void`                                                             |
| scrollToOffset     | 滚动到指定偏移量（px）                                                         | `(offset: number) => void`                                                            |
| getItemSize        | 获取指定 item 尺寸（按 **itemKey**）                                           | `(itemKey: string) => number`                                                         |
| deleteItemSize     | 删除已缓存的 item 尺寸                                                         | `(itemKey: string) => void`                                                           |
| getItemPosByIndex  | 获取指定下标的位置信息                                                         | `(index: number) => { top: number; current: number; bottom: number }`                |
| forceUpdate        | 强制更新                                                                       | `() => void`                                                                          |
| deletedList2Top    | 删除顶部数据（分页场景）                                                       | `(list: T[]) => void`                                                                 |
| addedList2Top      | 添加顶部数据（分页场景）                                                       | `(list: T[]) => void`                                                                 |
| manualRender       | 手动控制渲染范围                                                               | `(begin: number, end: number) => void`                                                |
| getReactiveData    | 获取响应式数据                                                                 | `() => ReactiveData`                                                                  |
| setList            | 设置新的数据列表                                                               | `(list: T[]) => void`                                                                 |

## ReactiveData

`getReactiveData()` 或 **`update`** 回调中的 `state` 字段类型为 **`ReactiveData`**：

| 属性           | 类型     | 说明                                       |
| -------------- | -------- | ------------------------------------------ |
| listTotalSize  | `number` | 列表总尺寸（不含插槽）                     |
| virtualSize    | `number` | 虚拟占位尺寸（0 到 renderBegin）           |
| inViewBegin    | `number` | 可视区起始下标                             |
| inViewEnd      | `number` | 可视区结束下标                             |
| renderBegin    | `number` | 实际渲染起始下标                           |
| renderEnd      | `number` | 实际渲染结束下标                           |

### SlotSize

`getSlotSize()` 返回值类型：

| 属性               | 类型     | 说明                 |
| ------------------ | -------- | -------------------- |
| clientSize         | `number` | 可视区容器尺寸       |
| headerSize         | `number` | header 插槽高度      |
| footerSize         | `number` | footer 插槽高度      |
| stickyHeaderSize   | `number` | stickyHeader 插槽高度 |
| stickyFooterSize   | `number` | stickyFooter 插槽高度 |
