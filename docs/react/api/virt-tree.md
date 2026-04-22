# VirtTree API

适用于 **React 18**。树形组件基于 Vanilla 封装，支持 **`ref`**（**`ForwardRef`**）调用实例方法与命令式 **`render*`**；若同时使用 **JSX 形态的 Render Props**（见下文），则 **JSX Render Props 优先级高于对应的 `render*`**。

事件使用 **回调 Props**（**`onExpand`、`onSelect`** 等）；另支持 **`style`**、**`className`** 传入根容器。

## 类型说明

### TreeData

树形数据源类型为 **`TreeData`**，即 **`TreeNodeData[]`**。请保证节点 **`key`**（或由 **`fieldNames.key`** 映射的字段）在整棵树内唯一。

### TreeFieldNames

用于将业务数据字段映射到树组件约定字段：

| 字段             | 说明                 | 类型       | 默认值           |
| ---------------- | -------------------- | ---------- | ---------------- |
| key              | 唯一标识字段         | `string`   | `'key'`          |
| title            | 标题字段             | `string`   | `'title'`        |
| children         | 子节点字段           | `string`   | `'children'`     |
| disableSelect    | 禁止选中字段         | `string`   | `'disableSelect'` |
| disableCheckbox  | 禁止勾选字段         | `string`   | `'disableCheckbox'` |
| disableDragIn    | 禁止拖入字段         | `string`   | `'disableDragIn'` |
| disableDragOut   | 禁止拖出字段         | `string`   | `'disableDragOut'` |

### TreeNode

运行时树节点对象（泛型 **`T`** 为原始数据 **`TreeNodeData`**）：

| 字段             | 类型                         | 说明                                         |
| ---------------- | ---------------------------- | -------------------------------------------- |
| key              | `TreeNodeKey`                | 唯一标识（`string \| number`）               |
| level            | `number`                     | 层级（根节点为 **1**）                     |
| title            | `string \| undefined`        | 节点标题                                     |
| isLeaf           | `boolean \| undefined`       | 是否为叶子节点                               |
| isLast           | `boolean \| undefined`       | 是否为同级最后节点                           |
| parent           | `TreeNode \| undefined`      | 父节点引用                                   |
| children         | `TreeNode[] \| undefined`    | 子节点列表                                   |
| disableSelect    | `boolean \| undefined`       | 是否禁用选中                                 |
| disableCheckbox  | `boolean \| undefined`       | 是否禁用复选框                               |
| searchedIndex    | `number \| undefined`        | 筛选匹配下标（**-1** 表示未匹配）           |
| data             | `T`                          | 原始数据对象 **`TreeNodeData`**              |

### IScrollParams

**`scrollTo`** 方法的参数：

| 字段    | 类型                                  | 说明                                       |
| ------- | ------------------------------------- | ------------------------------------------ |
| key     | `TreeNodeKey \| undefined`            | 目标节点 key                               |
| align   | `'view' \| 'top' \| undefined`       | 对齐方式                                   |
| offset  | `number \| undefined`                | 偏移量（**≥ 0** 时优先使用）              |

## 属性

| 参数                 | 说明                                                                 | 类型                                                                 | 默认值    | 是否必须                     |
| -------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | --------- | ---------------------------- |
| list                 | 树形数据                                                             | `TreeData`（`TreeNodeData[]`）                                       | -         | <font color="#f00">是</font> |
| fieldNames           | 字段映射配置                                                         | `TreeFieldNames`                                                     | `undefined` | -                            |
| indent               | 相邻级节点间的水平缩进（px）                                         | `number`                                                             | `16`      | -                            |
| iconSize             | 图标大小（px）                                                       | `number`                                                             | `16`      | -                            |
| itemGap              | 元素之间的间距                                                       | `number`                                                             | `0`       | -                            |
| buffer               | 虚拟列表 buffer 行数                                                 | `number`                                                             | `2`       | -                            |
| itemPreSize          | 预估行高                                                             | `number`                                                             | `32`      | -                            |
| fixed                | 是否固定高度                                                         | `boolean`                                                            | `false`   | -                            |
| showLine             | 是否显示层级线                                                       | `boolean`                                                            | `false`   | -                            |
| itemClass            | 节点类名                                                             | `string`                                                             | `undefined` | -                            |
| listClass            | 列表容器类名                                                         | `string`                                                             | `undefined` | -                            |
| customGroup          | 自定义分组名                                                         | `string`                                                             | `undefined` | -                            |
| defaultExpandAll     | 是否默认展开所有节点                                                 | `boolean`                                                            | `false`   | -                            |
| expandedKeys         | 展开的节点 key 集合（受控）                                          | `TreeNodeKey[]`                                                      | `undefined` | -                            |
| expandOnClickNode      | 点击节点是否展开                                                     | `boolean`                                                            | `false`   | -                            |
| selectable           | 是否可选中                                                           | `boolean`                                                            | `false`   | -                            |
| selectMultiple       | 是否可多选                                                           | `boolean`                                                            | `false`   | -                            |
| selectedKeys         | 选中的节点 key 集合（受控）                                         | `TreeNodeKey[]`                                                      | `undefined` | -                            |
| checkable            | 是否显示复选框                                                       | `boolean`                                                            | `false`   | -                            |
| checkedKeys          | 勾选的节点 key 集合（需在 **`checkable`** 场景下使用）             | `TreeNodeKey[]`                                                      | `undefined` | -                            |
| checkedStrictly      | 父子节点是否不关联勾选                                               | `boolean`                                                            | `false`   | -                            |
| checkOnClickNode     | 点击节点是否触发复选框                                               | `boolean`                                                            | `false`   | -                            |
| focusedKeys          | 聚焦的节点 key 集合                                                 | `TreeNodeKey[]`                                                      | `undefined` | -                            |
| draggable            | 是否开启拖拽                                                         | `boolean`                                                            | `false`   | -                            |
| dragClass            | 拖拽节点的 class                                                     | `string`                                                             | `undefined` | -                            |
| dragGhostClass       | 拖拽克隆节点的 class                                                 | `string`                                                             | `undefined` | -                            |
| crossLevelDraggable  | 是否允许跨层级拖拽                                                   | `boolean`                                                            | `true`    | -                            |
| filterMethod         | 树节点筛选方法                                                       | `(query: string, node: TreeNode) => boolean`                         | `undefined` | -                            |
| renderContent        | 自定义节点内容渲染                                                   | `(node: TreeNode, el: HTMLElement) => HTMLElement \| void`         | `undefined` | -                            |
| renderIcon           | 自定义图标渲染                                                       | `(node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement \| void` | `undefined` | - |
| renderNode           | 自定义整行渲染                                                       | `(node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement \| void` | `undefined` | - |
| renderEmpty          | 空数据渲染                                                           | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |
| renderStickyHeader   | 悬浮头部渲染                                                         | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |
| renderStickyFooter   | 悬浮底部渲染                                                         | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |
| renderHeader         | 头部渲染                                                             | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |
| renderFooter         | 底部渲染                                                             | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |
| style                | 根容器样式                                                           | `React.CSSProperties`                                                | `undefined` | -                            |
| className            | 根容器类名                                                           | `string`                                                             | `undefined` | -                            |

### JSX Render Props（优先级高于 `render*`）

| 参数           | 类型                                                                        | 说明                           |
| -------------- | --------------------------------------------------------------------------- | ------------------------------ |
| content        | **`(props: { node: TreeNode }) => ReactNode`**                             | 自定义节点内容                 |
| icon           | **`(props: { node: TreeNode; isExpanded: boolean }) => ReactNode`**        | 自定义图标                     |
| nodeRender     | **`(props: { node: TreeNode; isExpanded: boolean }) => ReactNode`**        | 自定义整行渲染                 |
| empty          | **`() => ReactNode`**                                                       | 空数据                         |
| header         | **`() => ReactNode`**                                                       | 头部                           |
| footer         | **`() => ReactNode`**                                                       | 底部                           |
| stickyHeader   | **`() => ReactNode`**                                                       | 悬浮头部                       |
| stickyFooter   | **`() => ReactNode`**                                                       | 悬浮底部                       |

## 回调（事件）

### 树相关

| 回调 Prop  | 说明           | 参数                                                                                                                                     |
| ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| onExpand   | 展开/折叠节点  | **`expandKeys: TreeNodeKey[]`**，**`data`**：`{ node?: TreeNode; expanded: boolean; expandedNodes: TreeNodeData[] }`                       |
| onSelect   | 选择节点       | **`selectedKeys: TreeNodeKey[]`**（首参），**`data`**：`{ node: TreeNode; selected: boolean; selectedKeys: TreeNodeKey[]; selectedNodes: TreeNodeData[] }` |
| onCheck    | 勾选节点       | **`checkedKeys: TreeNodeKey[]`**（首参），**`data`**：`{ node: TreeNode; checked: boolean; checkedKeys: TreeNodeKey[]; checkedNodes: TreeNodeData[]; halfCheckedKeys: TreeNodeKey[]; halfCheckedNodes: TreeNodeData[] }` |
| onDragstart | 拖拽开始       | **`data`**：`{ sourceNode: TreeNodeData }`                                                                                             |
| onDragend   | 拖拽结束       | **`data`**：`{ node: TreeNode; prevNode: TreeNode \| undefined; parentNode: TreeNode \| undefined } \| undefined`（可选）                 |

### 滚动相关（由 VirtList 透传）

| 回调 Prop    | 说明               | 参数                                      |
| ------------ | ------------------ | ----------------------------------------- |
| onScroll     | 滚动               | **`(e: Event) => void`**                  |
| onToTop      | 触顶               | **`(item: TreeNode) => void`**            |
| onToBottom   | 触底               | **`(item: TreeNode) => void`**            |
| onItemResize | Item 尺寸变化      | **`(id: string, size: number) => void`**    |
| onUpdate | 渲染列表更新      | **`(renderList: TreeNode[], state: ListState) => void`** |

受控用法：通过 **`expandedKeys` / `selectedKeys` / `checkedKeys`** 与 **`onExpand` / `onSelect` / `onCheck`** 同步状态（回调首参或 **`data`** 中带最新 key 集合，可按项目约定自行封装）。

## Ref 方法（VirtTreeRef）

| 方法名             | 说明                     | 签名 |
| ------------------ | ------------------------ | ---- |
| expandAll          | 展开/折叠所有节点        | **`(expanded: boolean) => void`** |
| expandNode         | 展开/折叠指定节点        | **`(key: TreeNodeKey \| TreeNodeKey[], expanded: boolean) => void`** |
| toggleExpand       | 切换节点展开状态         | **`(node: TreeNode) => void`** |
| setExpandedKeys    | 设置展开的节点 key       | **`(keys: TreeNodeKey[]) => void`** |
| selectAll          | 全选/取消全选            | **`(selected: boolean) => void`** |
| selectNode         | 选中/取消指定节点        | **`(key: TreeNodeKey \| TreeNodeKey[], selected: boolean) => void`** |
| toggleSelect       | 切换节点选中状态         | **`(node: TreeNode) => void`** |
| checkAll           | 全部勾选/取消勾选        | **`(checked: boolean) => void`** |
| checkNode          | 勾选/取消指定节点        | **`(key: TreeNodeKey \| TreeNodeKey[], checked: boolean) => void`** |
| toggleCheckbox     | 切换节点勾选状态         | **`(node: TreeNode) => void`** |
| getCheckedKeys     | 获取已勾选节点的 key     | **`(leafOnly?: boolean) => TreeNodeKey[]`** |
| getHalfCheckedKeys | 获取半选节点的 key       | **`() => TreeNodeKey[]`** |
| setFocusedKeys     | 设置聚焦节点             | **`(keys: TreeNodeKey[]) => void`** |
| filter             | 按查询字符串筛选节点     | **`(query: string) => void`** |
| scrollTo           | 滚动到指定位置           | **`(params: IScrollParams) => void`** |
| scrollToTop        | 滚动到顶部               | **`() => void`** |
| scrollToBottom     | 滚动到底部               | **`() => void`** |
| setList            | 设置新的树数据           | **`(list: TreeData) => void`** |
| forceUpdate        | 强制更新                 | **`() => void`** |
| getTreeNode        | 根据 key 获取节点        | **`(key: TreeNodeKey) => TreeNode \| undefined`** |
