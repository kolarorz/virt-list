# VirtList API

适用于 **React（legacy 体系）**。与 React 18 版本的 **VirtList API 对外能力一致**：无插槽，使用 **Render Props**；事件为 **回调 props**；方法通过 **`ref`** 调用。

**与 React 18 版本的差异主要体现在运行方式**： legacy 场景通常使用 **`ReactDOM.render`** 挂载应用，而非 `createRoot`；组件自身的 **props / ref 方法 / 类型** 与 React 18 包保持一致，可按同一份表格使用。

根节点同样支持 **`style?: React.CSSProperties`**、**`className?: string`**。

1. `list.item[itemKey]` <font color="#f00">必须唯一!!!</font>
2. item 元素之间不能使用 <font color="#f00">margin!!!</font>

## StyleValue / ClassValue

样式相关字段使用 **`StyleValue`**：**`string | Record<string, string | number | null | undefined> | StyleValue[]`**，支持字符串、对象与数组嵌套形式。

类名相关字段使用 **`ClassValue`**：**`string | Record<string, boolean | null | undefined> | ClassValue[]`**，支持字符串、对象与数组嵌套形式。

## 属性

### 通用选项

| 参数               | 说明                                                                                     | 类型                                                                                         | 默认值  | 是否必须                     |
| ------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------- | ---------------------------- |
| list               | 数据列表                                                                                 | `T[]`                                                                                        | `[]`    | <font color="#f00">是</font> |
| itemKey            | 项的唯一 id                                                                              | `string \| number`                                                                           | -       | <font color="#f00">是</font> |
| itemPreSize        | 预估尺寸                                                                                 | `number`                                                                                     | -       | -                            |
| itemGap            | 元素之间的间距（元素尺寸包含 itemGap）                                                   | `number`                                                                                     | `0`     | -                            |
| fixed              | 是否为固定高度<br />**注意：动态高度模式下请勿开启**                                     | `boolean`                                                                                    | `false` | -                            |
| buffer             | 渲染量大时使用；设置后 bufferTop、bufferBottom 会与 buffer 对齐                       | `number`                                                                                     | `0`     | -                            |
| bufferTop          | 顶部 buffer 个数                                                                         | `number`                                                                                     | `0`     | -                            |
| bufferBottom       | 底部 buffer 个数                                                                         | `number`                                                                                     | `0`     | -                            |
| horizontal         | 是否水平滚动                                                                             | `boolean`                                                                                    | `false` | -                            |
| scrollDistance     | 滚动阈值（提前触发 onToTop / onToBottom），单位：px                                      | `number`                                                                                     | `0`     | -                            |
| start              | 起始渲染下标                                                                             | `number`                                                                                     | `0`     | -                            |
| offset             | 起始渲染偏移量                                                                           | `number`                                                                                     | `0`     | -                            |
| listStyle          | 列表容器样式                                                                             | `StyleValue`                                                                                 | `''`    | -                            |
| listClass          | 列表容器类名                                                                             | `ClassValue`                                                                                 | `''`    | -                            |
| itemStyle          | item 容器样式；可为函数 `(item, index) => StyleValue`                                    | `StyleValue \| ((item: T, index: number) => StyleValue)`                                     | `''`    | -                            |
| itemClass          | item 容器类名；可为函数 `(item, index) => ClassValue`                                   | `ClassValue \| ((item: T, index: number) => ClassValue)`                                      | `''`    | -                            |
| headerClass        | header 区域类名                                                                          | `ClassValue`                                                                                 | `''`    | -                            |
| headerStyle        | header 样式                                                                              | `StyleValue`                                                                                 | `''`    | -                            |
| footerClass        | footer 区域类名                                                                          | `ClassValue`                                                                                 | `''`    | -                            |
| footerStyle        | footer 样式                                                                              | `StyleValue`                                                                                 | `''`    | -                            |
| stickyHeaderClass  | stickyHeader 类名                                                                        | `ClassValue`                                                                                 | `''`    | -                            |
| stickyHeaderStyle  | stickyHeader 样式                                                                        | `StyleValue`                                                                                 | `''`    | -                            |
| stickyFooterClass  | stickyFooter 类名                                                                        | `ClassValue`                                                                                 | `''`    | -                            |
| stickyFooterStyle  | stickyFooter 样式                                                                        | `StyleValue`                                                                                 | `''`    | -                            |
| renderControl      | 渲染控制器                                                                               | `(begin: number, end: number) => { begin: number; end: number }`                           | -       | -                            |
| renderItem         | 自定义渲染（优先级高于 children）；返回 `HTMLElement` 或 `void`                         | `(item: T, index: number, el: HTMLElement) => HTMLElement \| void`                         | -       | -                            |

### React 根节点

| 参数      | 说明           | 类型                   | 默认值 |
| --------- | -------------- | ---------------------- | ------ |
| className | 根元素类名     | `string`               | -      |
| style     | 根元素行内样式 | `React.CSSProperties`  | -      |

### 回调事件（props）

| 回调名          | 说明               | 回调签名                                                        |
| --------------- | ------------------ | --------------------------------------------------------------- |
| onScroll        | 滚动               | `(e: React.SyntheticEvent) => void` 或 `(e: Event) => void`       |
| onToTop         | 触顶               | `(firstItem: T) => void`                                        |
| onToBottom      | 触底               | `(lastItem: T) => void`                                         |
| onItemResize    | Item 尺寸变化      | `(id: string, newSize: number) => void`                         |
| onUpdate   | 渲染列表更新       | `(renderList: T[], state: ListState) => void`                |

## JSX Render Props

| 属性 / 子节点       | 说明                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| children            | 行内容：`(props: { itemData: T; index: number }) => ReactNode`       |
| renderHeader        | 顶部区域：`() => ReactNode`                                          |
| renderFooter        | 底部区域：`() => ReactNode`                                          |
| renderStickyHeader  | 顶部悬浮区域：`() => ReactNode`                                      |
| renderStickyFooter  | 底部悬浮区域：`() => ReactNode`                                      |
| renderEmpty         | 空数据：`() => ReactNode`                                            |

## Ref 方法

使用 **`useRef<VirtListRef>(null)`**（或 **`createRef<VirtListRef>()`**）绑定后，可调用：

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
| getItemSize        | 获取指定 item 尺寸（参数为 **itemKey** 字符串）                                | `(itemKey: string) => number`                                                         |
| deleteItemSize     | 删除已缓存的 item 尺寸                                                         | `(itemKey: string) => void`                                                           |
| getItemPosByIndex  | 获取指定下标的位置信息                                                         | `(index: number) => { top: number; current: number; bottom: number }`                |
| forceUpdate        | 强制更新                                                                       | `() => void`                                                                          |
| deletedList2Top    | 删除顶部数据（分页场景）                                                       | `(list: T[]) => void`                                                                 |
| addedList2Top      | 添加顶部数据（分页场景）                                                       | `(list: T[]) => void`                                                                 |
| manualRender       | 手动控制渲染范围                                                               | `(begin: number, end: number) => void`                                                |
| getState    | 获取响应式数据                                                                 | `() => ListState`                                                                  |
| setList            | 设置新的数据列表                                                               | `(list: T[]) => void`                                                                 |

## ListState

| 属性           | 类型     | 说明                                       |
| -------------- | -------- | ------------------------------------------ |
| listTotalSize  | `number` | 列表总尺寸（不含插槽）                     |
| virtualSize    | `number` | 虚拟占位尺寸（0 到 renderBegin）           |
| inViewBegin    | `number` | 可视区起始下标                             |
| inViewEnd      | `number` | 可视区结束下标                             |
| renderBegin    | `number` | 实际渲染起始下标(包含buffer)                           |
| renderEnd      | `number` | 实际渲染结束下标(包含buffer)                           |

### SlotSize

| 属性               | 类型     | 说明                 |
| ------------------ | -------- | -------------------- |
| clientSize         | `number` | 可视区容器尺寸       |
| headerSize         | `number` | header 区域高度      |
| footerSize         | `number` | footer 区域高度      |
| stickyHeaderSize   | `number` | stickyHeader 区域高度 |
| stickyFooterSize   | `number` | stickyFooter 区域高度 |
