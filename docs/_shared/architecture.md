# 架构设计

## 三层分离

virt-list 采用三层架构，核心逻辑与框架完全解耦：

```
┌──────────────────────────────────────────┐
│  框架绑定层（vue / vue2 / react / ...）    │  ~300 行/组件
├──────────────────────────────────────────┤
│  DOM 层（@virt-list/vanilla）              │  DOM 结构、节点池、增量 patch
├──────────────────────────────────────────┤
│  算法层（@virt-list/core）                 │  纯计算，零 DOM 依赖
└──────────────────────────────────────────┘
```

### @virt-list/core — 算法层

纯 TypeScript 实现，不创建任何 DOM。职责：

- 维护 `sizesMap`（item key → 实测尺寸）
- 根据滚动方向计算可视区间 `[inViewBegin, inViewEnd]`
- 管理渲染区间 `[renderBegin, renderEnd]` 与渲染块的位移量 `leadingSize`
- 通过 `ResizeObserver` 监听尺寸变化并修正滚动位置
- 输出 `renderList`（需要渲染的数据子集），通知上层

其中位置查询由一个独立的分块尺寸索引承担（`ChunkedSizeIndex`），它只缓存「每块的尺寸总和」这一层派生数据，把前缀和与偏移定位的成本从 O(n) 压到 O(√n)。它不持有单项尺寸的副本——权威来源始终是 `sizesMap`。这一层可以脱离滚动引擎单独测试，具体算法见「算法与复杂度」。

### @virt-list/vanilla — DOM 层

接收 core 的 `update` 事件后执行增量 DOM patch。职责：

- 构建完整的滚动容器 DOM 结构
- 维护 `itemPool`（key → HTMLElement），实现节点复用
- 新增项调用 `renderItem` 创建节点，已有项通过 `insertBefore` 调整顺序
- 移出渲染区间的项执行 `remove` 并回收

### 框架绑定层

每个框架包仅约 300 行/组件，职责非常明确：

1. 在框架生命周期中创建/销毁 vanilla 实例
2. 将框架的插槽桥接到 vanilla 的 `renderItem` 回调
3. 通过 `expose` / `useImperativeHandle` 暴露命令式 API
4. 监听 `list.length` 变化同步数据

## 依赖关系

```
@virt-list/core          ← 零依赖，纯 TypeScript
       ↑
@virt-list/vanilla       ← 仅依赖 core
       ↑
  ┌────┼────────┬──────────────┐
  │    │        │              │
  vue  vue2   react      react-legacy
```

各框架包之间**没有任何交叉依赖**。

## DOM 结构

vanilla 层构建的滚动容器结构：

```
container（用户提供的挂载点）
└─ clientEl          .virt-list__client（overflow: hidden，主轴视口；主轴滚动位置由 JS 掌管）
   ├─ scrollContentEl .virt-list__scroll-content（铺满视口；**交叉轴**的原生滚动容器）
   │  ├─ stickyHeaderEl  [data-id=stickyHeader]（position: absolute; top: 0，吸顶区域）
   │  ├─ headerEl        [data-id=header]（参与滚动的头部）  ← transform 残差
   │  ├─ listEl          .virt-list__list（height: 0）
   │  │  └─ itemsEl      .virt-list__items                  ← transform 残差
   │  │     ├─ item[renderBegin]      [data-id=<itemKey>]
   │  │     ├─ item[renderBegin + 1]
   │  │     └─ ...
   │  ├─ footerEl        [data-id=footer]（参与滚动的底部）  ← transform 残差
   │  └─ stickyFooterEl  [data-id=stickyFooter]（position: absolute; bottom: 0，吸底区域）
   └─ scrollbarEl .virt-scrollbar └─ thumbEl（自绘滚动条，留在滚动层外面）
```

四层容器都带类名，`data-id` 则用在插槽与列表项上——DevTools 里照着这张表就能认出每一层是谁。
**库自己的样式一行都不挂在这些类名上**（布局全是 inline style），所以拿它们写自己的
CSS 是安全的，覆盖不掉库的布局；反过来也别指望改这些类名能改布局。

- **没有任何元素的几何尺寸与列表长度相关**。不存在撑出滚动空间的占位元素，也不存在
  `leadingSize` 那么高的占位块（`leadingSize` 是渲染块的 `transform` 位移量，不是谁的高度），
  所有偏移都由 `transform` 表达，最高的元素只有一屏
- 每段写入的是**残差**（`该段的文档位置 − offset`），而不是绝对位置。这样任何单个
  `transform` 的位移量都不超过一屏多一点，碰不到浏览器对单个 `transform` 的位移上限
  （Chrome 实测 33,554,400px）
- 吸顶 / 吸底区**不占内容流**（相对视口绝对定位），但都**占滚动空间**：两者都计入
  `getSlotsTotalSize()`，因而参与总尺寸与最大偏移量的计算。吸顶区还是内容坐标系的
  起点，其余各段都从它之后排起
- `position: sticky` 的粘附由原生滚动驱动，主轴上 `overflow: hidden` 永远不触发，
  所以吸顶 / 吸底在主轴上改用相对视口的绝对定位
- **两条轴的滚动归属不同**。主轴（虚拟化的那条）归 JS：那条轴上只有一屏 DOM，
  让浏览器抢先在合成器线程上滚过去就会露出没有内容的地方。普通 List / Tree 默认不
  拥有交叉轴，代码块等项内 scrollport 优先；显式开启 `crossScroll` 后，交叉轴才落在
  `scrollContentEl` 上（`overflow-x: auto`），由输入控制器统一驱动。由此带来两条摆放
  上的硬约束：
  - 自绘滚动条与空状态必须留在 `clientEl` 里。放进滚动层的话，横滚 400px
    就把整条滚动条推出视口了（实测如此）
  - 吸顶 / 吸底反过来要放**进**滚动层，表头才会跟着列一起横移。想把插槽里的某块
    横向钉住，在插槽内包一层 `position: sticky; left: 0`（表格冻结列的老办法，
    在这种 absolute 父级下同样生效），前提是插槽根跨满了内容宽度、sticky 才有可粘的余量
- `crossScroll` 关闭只表示列表自身不创建交叉轴 scrollport，不影响项内滚动容器

## 增量 DOM Patch

vanilla 层的 `_patch` 方法是性能的关键所在：

1. **节点池复用**：已存在于 `itemPool` 中的项不会重新调用 `renderItem`，仅通过 `insertBefore` 调整 DOM 顺序
2. **最小化 DOM 操作**：只对进出渲染区间的项执行创建/销毁，视口内的项仅做位置调整
3. **按 key 匹配**：通过 `data-id` 属性将 DOM 节点与数据项关联，`ResizeObserver` 据此回报尺寸变化

```
滚动前: [A, B, C, D, E]  （渲染区间内的项）
滚动后: [C, D, E, F, G]

操作:
  - 移除 A, B（从 DOM 中 remove，从 pool 中删除）
  - 创建 F, G（调用 renderItem，加入 pool）
  - C, D, E 复用（仅 insertBefore 调整顺序）
```

## 框架适配机制

### 核心问题

虚拟滚动需要精确控制 DOM——在指定位置插入/移除节点、管理节点池。直接用框架的声明式渲染（如 `v-for`、`Array.map`）无法实现这种细粒度控制，且框架的 diff 算法会引入不必要的开销。

### 解决方案：插槽桥接

框架层不参与列表的 DOM 管理，而是将框架节点**注入到 vanilla 创建的 DOM 容器中**：

**Vue**：通过 `render(h(Fragment, vnodes), el)` 将 slot 内容渲染到 vanilla 传入的 `el` 中。

```
vanilla 创建 itemEl → 调用 renderItem(item, index, el)
  → Vue 层：render(h(Fragment, slot.default({ itemData, index })), el)
```

**React**：通过 `createRoot(el).render(node)` 将 children render prop 挂载到 vanilla 传入的 `el`。

```
vanilla 创建 itemEl → 调用 renderItem(item, index, el)
  → React 层：createRoot(el) + flushSync(() => root.render(children({ itemData, index })))
```

vanilla 控制 `el` 的生命周期（创建、移动、销毁），框架只负责填充 `el` 的内容。

### 版本兼容

同一框架的不同版本，差异仅在挂载 API：

| | Vue 3 | Vue 2 |
|---|---|---|
| 插槽挂载 | `render(h(Fragment, vnodes), el)` | `new Vue({ render }).$mount()` |
| Fragment | 原生支持 | `<div>` 包裹 |

| | React 18+ | React 16-17 |
|---|---|---|
| 挂载 API | `createRoot(el).render(node)` | `ReactDOM.render(node, el)` |
| 同步渲染 | 需 `flushSync` | 默认同步 |

每个版本的差异封装在独立的兼容层中（约 15 行），其余代码完全相同。
