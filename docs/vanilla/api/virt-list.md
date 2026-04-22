# VirtList API

1. `list.item.id` <font color="#f00">必须唯一!!!</font>
2. item 元素之间不能使用 <font color="#f00">margin!!!</font>

## StyleValue / ClassValue

- `StyleValue`: `string | Record<string, string | number | null | undefined> | StyleValue[]`
- `ClassValue`: `string | Record<string, boolean | null | undefined> | ClassValue[]`

## 属性

| 参数           | 说明                                                                              | 类型                                                                          | 默认值  | 是否必须                     |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------- | ---------------------------- |
| list           | 数据                                                                              | `Array`                                                                       | -       | <font color="#f00">是</font> |
| itemKey        | 项的 id，<font color="#f00">必须唯一!!!</font>（否则会无法正常滚动）              | `String\|Number`                                                              | -       | <font color="#f00">是</font> |
| itemPreSize    | 预估尺寸                                                                          | `Number`                                                                      | `20`    | -                            |
| itemGap        | 元素之间的间距 (元素尺寸包含 itemGap)                                             | `Number`                                                                      | 0       | -                            |
| fixed          | 是否为固定高度，可以提升性能<br />**注意：动态高度模式下，请勿使用**              | `Number`                                                                      | `false` | -                            |
| buffer         | 当渲染量大，滚动白屏严重时，可以给定数值，bufferTop 和 bufferBottom 会等于 buffer | `Number`                                                                      | `0`     | -                            |
| bufferTop      | 顶部 buffer 个数                                                                  | `Number`                                                                      | `0`     | -                            |
| bufferBottom   | 底部 buffer 个数                                                                  | `Number`                                                                      | `0`     | -                            |
| horizontal     | 是否水平滚动                                                                      | `Boolean`                                                                     | `false` | -                            |
| scrollDistance | 滚动阈值（提前触发 toTop 或 toBottom）单位：px                                    | `number`                                                                      | `0`     | -                            |
| start          | 起始渲染下标                                                                      | `Number`                                                                      | `0`     | -                            |
| offset         | 起始渲染顶部高度                                                                  | `Number`                                                                      | `0`     | -                            |
| listStyle      | 列表容器样式                                                                      | `StyleValue`                                                                  | `''`    | -                            |
| listClass      | 列表容器类名                                                                      | `ClassValue`                                                                  | `''`    | -                            |
| itemStyle      | item 容器样式                                                                     | `StyleValue`                                                                  | `''`    | -                            |
| itemClass      | item 容器类名                                                                     | `ClassValue`                                                                  | `''`    | -                            |
| renderControl  | 渲染控制器                                                                        | `(begin: number, end: number ) => { begin: number; end: number };`            | -       | -                            |

## 插槽

| name          | 说明                                           |
| ------------- | ---------------------------------------------- |
| header        | 顶部插槽                                       |
| footer        | 底部插槽                                       |
| sticky-header | 顶部悬浮插槽                                   |
| sticky-footer | 底部悬浮插槽                                   |
| empty         | 空插槽                                         |
| default       | item 内容， `作用域参数为 { itemData, index }` |

## 事件

| 方法名     | 说明              | 参数                                      |
| ---------- | ----------------- | ----------------------------------------- |
| toTop      | 触顶的回调        | 列表中第一项                              |
| toBottom   | 触底的回调        | 列表中最后一项                            |
| scroll     | 滚动的回调        | event                                     |
| itemResize | Item 尺寸发生变化 | `{ id: string, newSize: number }`         |
| update     | 渲染列表更新      | `{ renderList: any[], state: ListState }` |

## 暴露方法

| 方法名            | 说明                                                                         | 参数                                               |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| reset             | 重置列表                                                                     | -                                                  |
| getOffset         | 获取滚动高度                                                                 | -                                                  |
| scrollToTop       | scroll to top                                                                | -                                                  |
| scrollToBottom    | scroll to bottom                                                             | -                                                  |
| scrollToIndex     | scroll to index                                                              | index                                              |
| scrollIntoView    | scroll to index if needed（不在可视范围内）                                  | index                                              |
| scrollToOffset    | scroll to px                                                                 | px                                                 |
| getItemSize       | 获取指定 item 尺寸                                                           | index                                              |
| getItemPosByIndex | 获取指定 item 的位置信息: `{ top: number; current: number; bottom: number;}` | index                                              |
| forceUpdate       | 强制更新                                                                     | -                                                  |
| deletedList2Top   | 删除顶部 list（通常在分页模式下使用，具体参考 demo）                         | list[]                                             |
| addedList2Top     | 添加顶部 list（通常在分页模式下使用，具体参考 demo）                         | list[]                                             |
| manualRender      | 手动控制渲染（提供渲染起始）                                                 | `(renderBegin: number, renderEnd: number) => void` |
| getState          | 获取状态数据                                                                 | `() => ListState`                                  |

## ListState

| 属性          | 类型   | 说明                                       |
| ------------- | ------ | ------------------------------------------ |
| listTotalSize | number | 不包含插槽的高度                           |
| virtualSize   | number | 虚拟占位尺寸，是从 0 到 renderBegin 的尺寸 |
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
