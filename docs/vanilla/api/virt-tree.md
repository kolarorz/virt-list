# VirtTree API

原生版的树没有"属性 / 插槽 / 事件"三件套，只有构造函数的三个参数：

```js
import { VirtTree } from '@virt-list/vanilla';
import '@virt-list/vanilla/src/tree/tree.css';

const tree = new VirtTree(container, options, events);
```

- `options`：下方[配置项](#配置项)与[渲染函数](#渲染函数)，对应框架版的属性与插槽；
- `events`：下方[事件回调](#事件回调)，键名一律 camelCase（框架版模板里的 `@drag-start`
  在这里是 `dragstart`）；
- 选中 / 展开 / 勾选没有 `.sync` 双向绑定，初值走 `options`，之后用[暴露方法](#暴露方法)
  读写，变化由 `events` 通知。

## 配置项

| 参数                            | 说明                                                                          | 类型                         | 默认值    | 是否必须                     |
| ------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- | --------- | ---------------------------- |
| list                            | 树形数据                                                                      | `TreeNodeData[]`             | -         | <font color="#f00">是</font> |
| fieldNames                      | 字段名映射，见下方 [TreeFieldNames](#treefieldnames)                          | `TreeFieldNames`             | -         | -                            |
| estimatedSize               | 预估尺寸                                                                      | `number`                     | `32`      | -                            |
| fixedSize                       | 是否为固定高度，可以提升性能                                                  | `boolean`                    | `false`   | -                            |
| buffer                          | 上下两侧的渲染缓冲节点数                                                      | `number`                     | `0`       | -                            |
| indent                          | 相邻级节点间的水平缩进，单位为像素                                            | `number`                     | `16`      | -                            |
| iconSize                        | 图标大小                                                                      | `number`                     | `16`      | -                            |
| itemGap                         | 元素之间的间距 (元素尺寸包含 itemGap)                                         | `number`                     | `0`       | -                            |
| showLine                        | 是否显示层级线                                                                | `boolean`                    | `false`   | -                            |
| itemClass                       | 节点容器类名                                                                  | `string`                     | `''`      | -                            |
| listClass                       | 列表容器类名                                                                  | `string`                     | `''`      | -                            |
| scrollDuration                  | 平滑滚动的默认动画时长（ms）                                                  | `number`                     | `300`     | -                            |
| smoothMaxDistance               | 平滑滚动允许逐帧穿越的最大距离（px），超出部分先瞬跳                          | `number`                     | 两倍视口  | -                            |
| scrollbarAutoHideDelay          | 滚动条停止滚动多久后淡出（ms），`0` 表示常驻                                  | `number`                     | `1200`    | -                            |
| scrollbarMinThumbSize           | 滑块的最小长度（px）                                                          | `number`                     | `20`      | -                            |
| keyboard                        | 是否接管键盘（方向键 / PageUp-Down / Space / Home-End）                       | `boolean`                    | `true`    | -                            |
| `[expand]` expandedKeys         | 初始展开的节点 `key` 集合                                                     | `TreeNodeKey[]`              | `[]`      | -                            |
| `[expand]` defaultExpandAll     | 是否默认展开节点                                                              | `boolean`                    | `false`   | -                            |
| `[expand]` expandOnClickNode    | 点击节点是否展开（仅在 selectable=false & checkOnClickNode=false 时生效；`renderNode` 接管整行后不生效） | `boolean` | `false` | -                            |
| `[checkable]` checkable         | 是否有 checkbox                                                               | `boolean`                    | `false`   | -                            |
| `[checkable]` checkedKeys       | 初始勾选的节点 `key` 集合，只在 `checkable` 为 true 时生效                    | `TreeNodeKey[]`              | `[]`      | -                            |
| `[checkable]` checkOnClickNode  | 点击节点是否可以选中 checkbox                                                 | `boolean`                    | `false`   | -                            |
| `[checkable]` checkedStrictly   | 是否严格遵循父子不互相关联的做法                                              | `boolean`                    | `false`   | -                            |
| `[selectable]` selectable       | 是否可以选中（`renderNode` 接管整行后不生效，需自行在 `click` 里调 `toggleSelect`） | `boolean`               | `false`   | -                            |
| `[selectable]` selectedKeys     | 初始选中的节点 `key` 集合，只在 `selectable` 为 true 时生效                   | `TreeNodeKey[]`              | `[]`      | -                            |
| `[selectable]` selectMultiple   | 是否可以多选                                                                  | `boolean`                    | `false`   | -                            |
| `[focus]` focusedKeys           | 初始激活的节点 `key` 集合                                                     | `TreeNodeKey[]`              | `[]`      | -                            |
| `[draggable]` draggable         | 是否开启拖拽                                                                  | `boolean`                    | `false`   | -                            |
| `[draggable]` dragClass         | 拖拽的节点 class                                                              | `string`                     | `''`      | -                            |
| `[draggable]` dragGhostClass    | 拖拽的克隆节点 class                                                          | `string`                     | `''`      | -                            |
| `[draggable]` dragoverPlacement | 拖拽区域生效的区域范围                                                        | `number[]`                   | `[33,66]` | -                            |
| `[draggable]` crossLevelDraggable | 是否允许跨层级拖拽；关掉则只能在同级内换位                                  | `boolean`                    | `true`    | -                            |
| customGroup                     | 同级拖拽的分组标识，同组之间才能互拖                                          | `string`                     | -         | -                            |
| filterMethod                    | 筛选节点的方法，返回 true 显示、false 隐藏                                    | `(query: string, node: TreeNode) => boolean` | -         | -            |
| 其他配置项                      | 同 VirtList 配置项                                                            | -                            | -         | -                            |

## 渲染函数

对应框架版的插槽。返回 `HTMLElement` 会被 append 进容器；也可以直接操作最后一个参数
`el`（容器本身），少一层 DOM 嵌套。

| 名称               | 说明                                                                 | 签名                                                              |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| renderNode         | 整行自定义。库不再画缩进块 / 图标 / 复选框，缩进要自己按 `node.level` 算 | `(node, isExpanded, el) => HTMLElement \| void`                 |
| renderContent      | 只替换节点内容区，缩进与图标仍由库绘制                               | `(node, el) => HTMLElement \| void`                               |
| renderIcon         | 展开图标                                                             | `(node, isExpanded, el) => HTMLElement \| void`                   |
| renderHeader       | 顶部区域（参与滚动）                                                 | `(el) => HTMLElement \| void`                                     |
| renderFooter       | 底部区域（参与滚动）                                                 | `(el) => HTMLElement \| void`                                     |
| renderStickyHeader | 顶部悬浮区域                                                         | `(el) => HTMLElement \| void`                                     |
| renderStickyFooter | 底部悬浮区域                                                         | `(el) => HTMLElement \| void`                                     |
| renderEmpty        | 空状态                                                               | `(el) => HTMLElement \| void`                                     |

## 暴露方法

实例方法，与框架版 `ref` 上的方法一一对应。

| 方法名             | 说明                                              | 签名                                                                 |
| ------------------ | ------------------------------------------------- | -------------------------------------------------------------------- |
| expandAll          | 展开/折叠所有节点                                 | `(expanded: boolean) => void`                                        |
| expandNode         | 展开/折叠指定节点                                 | `(key: TreeNodeKey \| TreeNodeKey[], expanded: boolean) => void`     |
| toggleExpand       | 切换节点展开状态                                  | `(node: TreeNode) => void`                                           |
| setExpandedKeys    | 设置展开的节点 key                                | `(keys: TreeNodeKey[]) => void`                                      |
| hasExpanded        | 该节点是否展开                                    | `(node: TreeNode) => boolean`                                        |
| selectAll          | 全选/取消全选                                     | `(selected: boolean) => void`                                        |
| selectNode         | 选中/取消指定节点                                 | `(key: TreeNodeKey \| TreeNodeKey[], selected: boolean) => void`     |
| toggleSelect       | 切换节点选中状态                                  | `(node: TreeNode) => void`                                           |
| hasSelected        | 该节点是否被选中                                  | `(node: TreeNode) => boolean`                                        |
| checkAll           | 全部勾选/取消勾选                                 | `(checked: boolean) => void`                                         |
| checkNode          | 勾选/取消指定节点                                 | `(key: TreeNodeKey \| TreeNodeKey[], checked: boolean) => void`      |
| toggleCheckbox     | 切换节点勾选状态                                  | `(node: TreeNode) => void`                                           |
| hasChecked         | 该节点是否勾选                                    | `(node: TreeNode) => boolean`                                        |
| hasIndeterminate   | 该节点是否半选                                    | `(node: TreeNode) => boolean`                                        |
| getCheckedKeys     | 获取已勾选节点的 key                              | `(leafOnly?: boolean) => TreeNodeKey[]`                              |
| getHalfCheckedKeys | 获取半选节点的 key                                | `() => TreeNodeKey[]`                                                |
| setFocusedKeys     | 设置聚焦节点                                      | `(keys: TreeNodeKey[]) => void`                                      |
| hasFocused         | 该节点是否聚焦                                    | `(node: TreeNode) => boolean`                                        |
| filter             | 按查询字符串筛选节点                              | `(query: string) => void`                                            |
| scrollTo           | 滚动到（三种意图合一，见下方 `VirtTreeScrollTarget`） | `(target: VirtTreeScrollTarget) => void`                          |
| scrollToKey        | 定位到指定节点（折叠时先展开祖先），无论当前是否可见 | `(key: TreeNodeKey, options?: VirtScrollOptions) => void`          |
| scrollKeyIntoView  | 把节点滚进可视区域，已完整可见则不动              | `(key: TreeNodeKey, options?: VirtScrollOptions) => void`            |
| scrollToOffset     | 滚动到指定偏移量                                  | `(offset: number, options?: VirtScrollOptions) => void`              |
| scrollToTop        | 滚动到顶部                                        | `(options?: VirtScrollOptions) => void`                              |
| scrollToBottom     | 滚动到底部                                        | `(options?: VirtScrollOptions) => void`                              |
| scrollFromUser     | 上报一次用户发起的滚动                            | `(offset: number) => void`                                           |
| cancelScroll       | 取消进行中的平滑滚动动画                          | `() => void`                                                         |
| resume             | 重挂 DOM 后把内容摆回当前偏移量                   | `() => void`                                                         |
| getOffset          | 当前偏移量                                        | `() => number`                                                       |
| getMaxOffset       | 当前允许的最大偏移量                              | `() => number`                                                       |
| getTotalSize       | 内容总尺寸（节点 + 各插槽）                       | `() => number`                                                       |
| getTreeNode        | 根据 key 获取节点                                 | `(key: TreeNodeKey) => TreeNode \| undefined`                        |
| setList            | 设置新的树数据                                    | `(list: TreeData) => void`                                           |
| updateOptions      | 增量更新配置项                                    | `(options: Partial<VirtTreeDOMOptions>) => void`                      |
| forceUpdate        | 强制更新                                          | `() => void`                                                         |
| destroy            | 销毁实例并解绑所有监听                            | `() => void`                                                         |


## 事件回调

构造函数的第三个参数。键名一律 camelCase。

### 树相关

| 事件名    | 说明                                                                                           | 回调参数                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| click     | 点击节点（内容区；`renderNode` 接管后为整行）。与 `select` / `check` / 展开互不冲突，先于它们触发，拖拽进行中不触发 | `(data: TreeNodeData, node: TreeNode, e: MouseEvent)` |
| expand    | 展开/折叠节点                                                                                  | `expandKeys: TreeNodeKey[]`，`data`：`{ node?: TreeNode; expanded: boolean; expandedNodes: TreeNodeData[] }` |
| select    | 选择节点                                                                                       | `selectedKeys: TreeNodeKey[]`，`data`：`{ node: TreeNode; selected: boolean; selectedKeys: TreeNodeKey[]; selectedNodes: TreeNodeData[] }` |
| check     | 勾选节点                                                                                       | `checkedKeys: TreeNodeKey[]`，`data`：`{ node: TreeNode; checked: boolean; checkedKeys: TreeNodeKey[]; checkedNodes: TreeNodeData[]; halfCheckedKeys: TreeNodeKey[]; halfCheckedNodes: TreeNodeData[] }` |
| dragstart | 拖拽开始。`sourceNode` 是树节点，原始数据在它的 `.data` 上                                     | `data`：`{ sourceNode: TreeNode }` |
| dragend   | 拖拽结束。参数为 `undefined` 表示被取消（Esc）                                                 | `data`：`{ node: TreeNode; prevNode: TreeNode \| undefined; parentNode: TreeNode \| undefined } \| undefined` |

### 滚动相关（由 VirtList 透传）

| 事件名       | 说明          | 回调参数                                     |
| ------------ | ------------- | -------------------------------------------- |
| scroll       | 滚动          | `(event: VirtScrollEvent)`                   |
| offsetChange | 偏移量变化    | `(offset: number)`                           |
| toTop        | 触顶          | `(item: TreeNode)`                           |
| toBottom     | 触底          | `(item: TreeNode)`                           |
| itemResize   | Item 尺寸变化 | `(id: string, size: number)`                 |
| update       | 渲染列表更新  | `(renderList: TreeNode[], state: ListState)` |


### TreeNode

| 参数名          | 描述                            | 类型               | 默认值  |
| --------------- | ------------------------------- | ------------------ | :-----: |
| key             | 唯一标示                        | `string \| number` |   `-`   |
| level           | 层级                            | number             |    1    |
| title           | 该节点显示的标题                | `string`           |   `-`   |
| isLeaf          | 是否是叶子节点。动态加载时有效  | `boolean`          | `false` |
| isLast          | 是否是当前层级的最后节点        | `boolean`          | `false` |
| parent          | 父节点引用                      | `TreeNode`         |   `-`   |
| children        | 子节点                          | `TreeNode[]`       |   `-`   |
| disableSelect   | 是否禁用选中                    | `boolean`          | `false` |
| disableCheckbox | 是否禁用复选框                  | `boolean`          | `false` |
| searchedIndex   | 筛选匹配下标（`-1` 表示未匹配） | `number`           |  `-1`   |
| data            | 原始数据对象 `TreeNodeData`     | `TreeNodeData`     |   `-`   |

### TreeFieldNames

| Attribute       | Description                        | Type             | Default           | Required |
| --------------- | ---------------------------------- | ---------------- | ----------------- | -------- |
| key             | 每个树节点用来作为唯一key的属性    | `string, number` | `key`             | -        |
| title           | 指定节点标签为节点对象的某个属性值 | `string`         | `title`           | -        |
| children        | 指定子树为节点对象的某个属性值     | `string`         | `children`        | -        |
| disableSelect   | 禁止选中                           | `string`         | `disableSelect`   | -        |
| disableCheckbox | 禁止复选框勾选                     | `string`         | `disableCheckbox` | -        |
| disableDragIn   | 禁止拖入该节点                     | `string`         | `disableDragIn`   | -        |
| disableDragOut  | 禁止拖出该节点                     | `string`         | `disableDragOut`  | -        |

### VirtTreeScrollTarget

`scrollTo` 的参数。它在 `VirtScrollOptions` 的基础上加了 `key` / `offset`，并把 `align`
扩出一个 `nearest`：

| Attribute | Description | Type | Default |
| --------- | ----------- | ---- | ------- |
| key       | 目标节点 key。节点被折叠时会先展开它的祖先 | `TreeNodeKey` | `-` |
| offset    | 偏移量（**≥ 0** 时优先于 `key`） | `number` | `-` |
| align     | 对齐方式。`nearest`：已完整可见就不动，否则滚到最近的那条边；`start`：顶部对齐视口顶部；`end`：底部对齐视口底部 | `'start' \| 'end' \| 'nearest'` | `nearest` |
| behavior  | 滚动方式，`smooth` 为平滑动画 | `'auto' \| 'smooth'` | `auto` |
| duration  | 平滑动画时长（ms），缺省取 `scrollDuration` | `number` | `-` |
| maxDistance | 本次逐帧穿越的最大距离（px），超出部分先瞬跳 | `number` | 两倍视口 |
| onDone    | 动画结束回调，`canceled` 表示被中断 | `(canceled: boolean) => void` | `-` |

::: tip 通常用直接方法更好读
`scrollTo` 把三种意图收在一个入口里，拼参数往往不如直接调用清楚：
`scrollToOffset(offset, options?)` / `scrollToKey(key, options?)` /
`scrollKeyIntoView(key, options?)`。三者的 `options` 都是标准的 `VirtScrollOptions`，
`align` 只有 `start` / `end`。
:::

<!--@include: ../../_shared/theming.md-->
