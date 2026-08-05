# VirtGrid API

适用于 **Vue 3**。VirtGrid 基于 VirtList 封装：**与 VirtList 相同的 props / 事件保持一致即可，不重复列出**。

## 仅 VirtGrid 特有属性

| 参数           | 说明              | 类型                                                                                 | 是否必须                     |
| -------------- | ----------------- | ------------------------------------------------------------------------------------ | ---------------------------- |
| `gridItems`    | 每行展示个数      | `number`                                                                             | <font color="#f00">是</font> |
| `default` 插槽 | 插槽              | `#default="{ itemData, rowIndex, listIndex }"`                                       | 推荐                         |
| `renderItem`   | 低阶 DOM 渲染回调 | `(item: T, rowIndex: number, listIndex: number, el: HTMLElement) => HTMLElement \| void` | 可选                      |

### 插槽 / renderItem 参数说明

| 参数        | 说明                                   |
| ----------- | -------------------------------------- |
| `itemData`  | 当前单元格对应的数据项                 |
| `rowIndex`  | 当前项所在的行号（从 0 开始）          |
| `listIndex` | 当前项在原始 `list` 数组中的索引       |

## 事件

- 同 VirtList 事件即可（`scroll` / `toTop` / `toBottom` / `itemResize` / `update`）
- `update` 签名：`(renderList: unknown[], state: ListState)`

## 暴露方法

- 同 VirtList 的滚动方法即可（`scrollToIndex` / `scrollIntoView` / `scrollToTop` / `scrollToBottom` / `scrollToOffset`）
- 列表管理：`setList`、`forceUpdate`
- 网格专属：`setGridItems(n: number)`
- 滚动方法同样支持平滑滚动：第二个参数传 `VirtScrollOptions`（如 `scrollToIndex(100, { behavior: 'smooth' })`），另有 `cancelScroll()` 可取消动画，详见 VirtList API
