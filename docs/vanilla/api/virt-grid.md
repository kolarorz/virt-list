# VirtGrid API

## 属性

| 参数         | 说明             | 类型                                                         | 是否必须                     |
| ------------ | ---------------- | ------------------------------------------------------------ | ---------------------------- |
| `gridItems`  | 每行展示个数     | `number`                                                     | <font color="#f00">是</font> |
| `renderItem` | 网格项渲染函数   | `(item: T, index: number, rowIndex: number, el: HTMLElement) => HTMLElement \| void` | <font color="#f00">是</font> |
| 其他属性     | 同 VirtList 属性 | -                                                            | -                            |

## 暴露方法

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
