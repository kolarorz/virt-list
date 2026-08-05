# VirtGrid API

## 属性

| 参数         | 说明             | 类型                                                         | 是否必须                     |
| ------------ | ---------------- | ------------------------------------------------------------ | ---------------------------- |
| `gridItems`  | 每行展示个数     | `number`                                                     | <font color="#f00">是</font> |
| `renderItem` | 网格项渲染函数   | `(item: T, rowIndex: number, listIndex: number, el: HTMLElement) => HTMLElement \| void` | <font color="#f00">是</font> |
| 其他属性     | 同 VirtList 属性 | -                                                            | -                            |

### renderItem 参数说明

| 参数        | 说明                                   |
| ----------- | -------------------------------------- |
| `item`      | 当前单元格对应的数据项                 |
| `rowIndex`  | 当前项所在的行号（从 0 开始）          |
| `listIndex` | 当前项在原始 `list` 数组中的索引       |
| `el`        | 单元格的 DOM 容器，可直接操作或返回子元素 |

## 暴露方法

| 方法名          | 说明                                                 | 参数           |
| --------------- | ---------------------------------------------------- | -------------- |
| setList         | 设置新数据列表                                       | `list: T[]`    |
| setGridItems    | 设置每行展示个数                                     | `n: number`    |
| scrollToIndex   | 滚动到指定下标                                       | `index, options?: VirtScrollOptions` |
| scrollIntoView  | 滚动到指定下标（若不在可视范围内）                   | `index, options?: VirtScrollOptions` |
| scrollToTop     | 滚动到顶部                                           | `options?: VirtScrollOptions` |
| scrollToBottom  | 滚动到底部                                           | `options?: VirtScrollOptions` |
| scrollToOffset  | 滚动到指定偏移量（px）                               | `offset, options?: VirtScrollOptions` |
| cancelScroll    | 取消进行中的平滑滚动动画                             | -              |
| forceUpdate     | 强制更新                                             | -              |
