# VirtTree API

适用于 **Vue 3**。通过 **插槽** 自定义节点与列表区域（插槽优先级高于 **`render*`** 命令式渲染），使用 **`v-on` / `@`** 监听事件，通过 **`ref`** 调用组件 **`expose`** 暴露的方法。

展开、选中、勾选状态支持 **`v-model`**（或等价的受控 **`prop` + `update:*` 事件**）。

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
| indent               | 相邻级节点间的水平缩进（px）                                         | `Number`                                                             | `16`      | -                            |
| iconSize             | 图标大小（px）                                                       | `Number`                                                             | `16`      | -                            |
| itemGap              | 元素之间的间距                                                       | `Number`                                                             | `0`       | -                            |
| buffer               | 虚拟列表 buffer 行数                                                 | `Number`                                                             | `2`       | -                            |
| itemPreSize          | 预估行高                                                             | `Number`                                                             | `32`      | -                            |
| fixed                | 是否固定高度                                                         | `Boolean`                                                            | `false`   | -                            |
| showLine             | 是否显示层级线                                                       | `Boolean`                                                            | `false`   | -                            |
| itemClass            | 节点类名                                                             | `String`                                                             | `undefined` | -                            |
| listClass            | 列表容器类名                                                         | `String`                                                             | `undefined` | -                            |
| customGroup          | 自定义分组名                                                         | `String`                                                             | `undefined` | -                            |
| defaultExpandAll     | 是否默认展开所有节点                                                 | `Boolean`                                                            | `false`   | -                            |
| expandedKeys         | 展开的节点 key 集合（受控）；可与 **`v-model:expandedKeys`** 配合    | `TreeNodeKey[]`                                                      | `undefined` | -                            |
| expandOnClickNode      | 点击节点是否展开                                                     | `Boolean`                                                            | `false`   | -                            |
| selectable           | 是否可选中                                                           | `Boolean`                                                            | `false`   | -                            |
| selectMultiple       | 是否可多选                                                           | `Boolean`                                                            | `false`   | -                            |
| selectedKeys         | 选中的节点 key 集合（受控）；可与 **`v-model:selectedKeys`** 配合   | `TreeNodeKey[]`                                                      | `undefined` | -                            |
| checkable            | 是否显示复选框                                                       | `Boolean`                                                            | `false`   | -                            |
| checkedKeys          | 勾选的节点 key 集合（需在 **`checkable`** 场景下使用）；可与 **`v-model:checkedKeys`** 配合 | `TreeNodeKey[]` | `undefined` | -                            |
| checkedStrictly      | 父子节点是否不关联勾选                                               | `Boolean`                                                            | `false`   | -                            |
| checkOnClickNode     | 点击节点是否触发复选框                                               | `Boolean`                                                            | `false`   | -                            |
| focusedKeys          | 聚焦的节点 key 集合                                                 | `TreeNodeKey[]`                                                      | `undefined` | -                            |
| draggable            | 是否开启拖拽                                                         | `Boolean`                                                            | `false`   | -                            |
| dragClass            | 拖拽节点的 class                                                     | `String`                                                             | `undefined` | -                            |
| dragGhostClass       | 拖拽克隆节点的 class                                                 | `String`                                                             | `undefined` | -                            |
| crossLevelDraggable  | 是否允许跨层级拖拽                                                   | `Boolean`                                                            | `true`    | -                            |
| filterMethod         | 树节点筛选方法                                                       | `(query: string, node: TreeNode) => boolean`                         | `undefined` | -                            |
| renderContent        | 自定义节点内容渲染                                                   | `(node: TreeNode, el: HTMLElement) => HTMLElement \| void`         | `undefined` | -                            |
| renderIcon           | 自定义图标渲染                                                       | `(node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement \| void` | `undefined` | - |
| renderNode           | 自定义整行渲染                                                       | `(node: TreeNode, isExpanded: boolean, el: HTMLElement) => HTMLElement \| void` | `undefined` | - |
| renderEmpty          | 空数据渲染                                                           | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |
| renderStickyHeader   | 悬浮头部渲染                                                         | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |
| renderStickyFooter   | 悬浮底部渲染                                                         | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |
| renderHeader         | 头部渲染                                                             | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |
| renderFooter         | 底部渲染                                                             | `(el: HTMLElement) => HTMLElement \| void`                           | `undefined` | -                            |

## 插槽

插槽优先级高于同名 **`render*`** 属性。

| 插槽名           | 作用域参数（Scoped Props）                    | 说明                                       |
| ---------------- | --------------------------------------------- | ------------------------------------------ |
| default          | `{ node: TreeNode, isExpanded: boolean }`     | 自定义整行渲染（覆盖 **`renderNode`**）    |
| content          | `{ node: TreeNode }`                          | 自定义节点内容（覆盖 **`renderContent`**） |
| icon             | `{ node: TreeNode, isExpanded: boolean }`     | 自定义图标（覆盖 **`renderIcon`**）        |
| empty            | -                                             | 空数据插槽                                 |
| header           | -                                             | 头部插槽                                   |
| footer           | -                                             | 底部插槽                                   |
| stickyHeader     | -                                             | 悬浮头部插槽                               |
| stickyFooter     | -                                             | 悬浮底部插槽                               |

## v-model（受控）

| v-model                          | 对应 prop           | 对应更新事件              |
| -------------------------------- | ------------------- | ------------------------- |
| **`v-model:expandedKeys`**       | `expandedKeys`      | **`update:expandedKeys`** |
| **`v-model:selectedKeys`**       | `selectedKeys`      | **`update:selectedKeys`** |
| **`v-model:checkedKeys`**        | `checkedKeys`       | **`update:checkedKeys`**  |

组件使用 **`emits`** 声明上述事件；模板中使用 **`@expand`、`@select`** 等与下表名称对应。

## 事件

### 树相关

| 事件名     | 说明           | 回调参数                                                                                                                                 |
| ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| expand     | 展开/折叠节点  | **`expandKeys: TreeNodeKey[]`**，**`data`**：`{ node?: TreeNode; expanded: boolean; expandedNodes: TreeNodeData[] }`                     |
| select     | 选择节点       | **`selectedKeys: TreeNodeKey[]`**，**`data`**：`{ node: TreeNode; selected: boolean; selectedKeys: TreeNodeKey[]; selectedNodes: TreeNodeData[] }` |
| check      | 勾选节点       | **`checkedKeys: TreeNodeKey[]`**，**`data`**：`{ node: TreeNode; checked: boolean; checkedKeys: TreeNodeKey[]; checkedNodes: TreeNodeData[]; halfCheckedKeys: TreeNodeKey[]; halfCheckedNodes: TreeNodeData[] }` |
| dragstart  | 拖拽开始       | **`data`**：`{ sourceNode: TreeNodeData }`                                                                                             |
| dragend    | 拖拽结束       | **`data`**：`{ node: TreeNode; prevNode: TreeNode \| undefined; parentNode: TreeNode \| undefined } \| undefined`（可选）                |

### 滚动相关（由 VirtList 透传）

| 事件名       | 说明               | 回调参数                                      |
| ------------ | ------------------ | --------------------------------------------- |
| scroll       | 滚动               | **`(e: Event)`**                              |
| toTop        | 触顶               | **`(item: TreeNode)`**                        |
| toBottom     | 触底               | **`(item: TreeNode)`**                        |
| itemResize   | Item 尺寸变化      | **`(id: string, size: number)`**             |
| update  | 渲染列表更新       | **`(renderList: TreeNode[], state: ListState)`**           |

## 暴露方法（ref）

通过 **`ref`** 获取实例后，可调用下表方法（组件内部使用 **`defineExpose`** 暴露）。

| 方法名             | 说明                     | 签名 / 参数 |
| ------------------ | ------------------------ | ----------- |
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
