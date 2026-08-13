# virt-list 架构设计与多版本包策略

## 概述

virt-list 是一个高性能虚拟滚动库，支持 **List（列表）**、**Grid（网格）** 和 **Tree（树形）** 组件。采用分层架构，核心逻辑与框架无关，上层提供轻量的框架绑定层。

本文档描述了包架构设计、多版本拆分策略及其背后的技术决策。

---

## 包结构

```
packages/
  core/                @virt-list/core           框架无关的计算引擎
  vanilla/             @virt-list/vanilla         DOM 操作层
  vue/                 @virt-list/vue             Vue 3 绑定层  (Vue >=3.2)
  vue2/                @virt-list/vue2            Vue 2 绑定层  (Vue 2.6/2.7)
  react/               @virt-list/react           React 18+ 绑定层
  react-legacy/        @virt-list/react-legacy    React 16-17 绑定层
```

### 依赖关系图

```
@virt-list/core           ← 纯 TypeScript，无框架依赖
       ↑
@virt-list/vanilla         ← DOM 操作，依赖 core
       ↑
  ┌────┼────────┬──────────────┐
  │    │        │              │
  vue  vue2   react      react-legacy
```

各框架包仅依赖 `core` + `vanilla`。**框架包之间没有任何交叉依赖**。

---

## 各层职责

### @virt-list/core

计算引擎。负责：

- 虚拟滚动的可见范围计算（可见区间、偏移量、缓冲区）
- 项目尺寸跟踪与估算
- 滚动位置管理
- 响应式状态管理（框架无关的普通对象）

**不触碰任何 DOM**，所有浏览器 API 调用由 vanilla 层代理。

主要导出：`VirtListCore`、`ListState`、`SlotSize`、`VirtListOptions`、`VirtListEvents`

### @virt-list/vanilla

DOM 操作层。负责：

- 滚动容器结构（`clientEl` 视口 → 参与滚动的 header / 渲染块 / footer，各带 transform
  残差；吸顶 / 吸底与自绘滚动条相对视口绝对定位）
- 项目池管理与增量 DOM 更新
- ResizeObserver 挂载
- 自绘滚动条与输入接管（滚轮 / 键盘 / 触摸 / 惯性）
- 把偏移量变化落到 DOM（`offsetChange` → 重写各段 transform），把尺寸变化传给 core
- `VirtList`、`VirtGrid`、`VirtTree` 的 DOM 实现
### @virt-list/vue（Vue >=3.2）

轻量 Vue 3 绑定层。每个组件（`VirtList`、`VirtGrid`、`VirtTree`）均为 `defineComponent`，工作流程：

1. 在 `onMounted` 中创建 vanilla 实例
2. 通过 `render(h(Fragment, ...), el)` 将 Vue 插槽桥接到 vanilla 渲染回调
3. `watch` 监听 props 变化并同步到 vanilla
4. 通过 `expose()` 暴露命令式 API
5. 在 `onBeforeUnmount` 中销毁

**使用的 Vue 3 特有 API**：`render()`（独立函数）、`Fragment`、`h()`、`defineComponent`、`ref`、`watch`、`onMounted`、`onBeforeUnmount`、`expose`、`emits`

### @virt-list/vue2（Vue 2.6 / 2.7）

轻量 Vue 2 绑定层。与 `@virt-list/vue` 组件接口一致，核心适配差异如下：

| 特性 | Vue 3（`@virt-list/vue`） | Vue 2（`@virt-list/vue2`） |
|------|---------------------------|----------------------------|
| 插槽挂载 | `render(h(Fragment, vnodes), el)` | `new Vue({ render }).$mount()` + 手动 DOM 插入 |
| Fragment | 原生支持 | 不可用，使用 `<div>` 包裹 |
| `emits` 选项 | 声明式校验 | 不使用（Vue 2 不支持） |
| 导入来源 | `vue` | `vue`（2.7）或 `@vue/composition-api`（2.6） |

挂载适配器独立封装在 `compat.ts`（`createSlotMounter`）中，实现清晰分离。

**Vue 2.7 用户**可直接使用，因为 2.7 内置 Composition API。

**Vue 2.6 用户**需安装 `@vue/composition-api`，可能还需通过构建工具将 `vue` alias 到 `@vue/composition-api`。

### @virt-list/react（React >=18）

轻量 React 18+ 绑定层。每个组件使用：

- `forwardRef` + `useImperativeHandle` 暴露命令式 API
- `useEffect([], ...)` 创建一次 vanilla 实例
- `useRef` 保持稳定引用
- `createRoot` + `flushSync` 将 React 节点挂载到 vanilla DOM 插槽中

**使用的 React 18 特有 API**：`createRoot`（来自 `react-dom/client`）、`Root.unmount()`、`flushSync`

### @virt-list/react-legacy（React 16.8 - 17）

轻量 React 16-17 绑定层。与 `@virt-list/react` 组件接口一致，核心适配差异如下：

| 特性 | React 18+（`@virt-list/react`） | React 16-17（`@virt-list/react-legacy`） |
|------|--------------------------------|-------------------------------------------|
| 挂载 API | `createRoot(el).render(node)` | `ReactDOM.render(node, el)` |
| 卸载 API | `root.unmount()` | `ReactDOM.unmountComponentAtNode(el)` |
| 同步渲染 | `flushSync(() => root.render(...))` | 不需要（legacy render 本身是同步的） |
| Concurrent Mode | 支持 | 不可用 |

挂载适配器独立封装在 `compat.ts`（`createReactMounter`）中，实现清晰分离。

---

## 滚动模型：主轴的偏移量归 JS 掌管

**虚拟化的那条轴**（竖向列表的竖向）上，容器是 `overflow: hidden`，内容靠 `transform`
移动，滚动条自绘，滚轮 / 键盘 / 触摸全部由库接管。那条轴上**没有原生滚动这条路**——
需要原生滚动条的项目请用旧库
[vue-virt-list](https://github.com/kolarorz/vue-virt-list)。

**交叉轴**（竖向列表的横向）反过来：那个方向上没有虚拟化、内容是完整的真实 DOM，
下面"为什么值得这么做"的两条理由一条都不成立。所以它就是原生滚动，落在内层的
`scrollContentEl` 上（`overflow-x: auto`），白拿滚动条、拖拽与触摸惯性。
自绘的主轴滚动条留在外层 `clientEl` 里，横滚时不会跟着跑掉。关掉 `crossScroll`
即回到两轴全裁切。

### 为什么值得这么做

原生滚动下，浏览器在合成器线程上先把画面滚过去并呈现那一帧，`scroll` 事件之后才
异步回送到主线程。于是快速拖拽时，已呈现的那一帧里视口正对着还没有 DOM 的位置——
这是时序问题，优化渲染速度消不掉。自己掌管偏移量之后，内容只在 JS 写入时才移动，
位置与 DOM 永远同帧提交。

超大列表的表现也不同。浏览器对元素高度与 transform 位移有同一量级的上限
（Chrome 实测 33,554,428 / 33,554,400px，约合 33.5 万个 100px 的行）。靠占位元素撑开
滚动空间时，超限的高度被直接截掉，**那部分内容永远滚不到**。

换成 transform 本身并不能解除这条线——位移一样会被夹。做法是**让每一段只带自己的残差**
`该段的文档位置 - offset`：视口里看得见的东西残差最大就一屏多一点，任何单个 transform
都碰不到上限，那条线于是整个消失。100 万项 × 100px（1 亿 px）实测 8 个采样点定位误差
全为 0px，与限内无差别。

### 它让代码变简单的地方

原生滚动下有两件事做不到：**不知道浏览器会把 `scrollTop` 夹到哪**，**分不清是谁动了它**。
围绕这两点曾经堆了三套并行的"位置维持"机制（锚点求解 + 两端轮询 + 索引轮询）。
偏移量归 JS 之后两个前提都消失，三套塌缩成一套：

```
_pinned: PinnedTarget | null      // 待维持的目标，两种形态：贴到底 / 锚定某项
_resolvePinned()                  // 每次 ResizeObserver 回调重新求解一次，幂等
```

求解的是不变量而非增量补偿，所以不需要收敛判据、不需要重试上限、不需要
"这次是谁写的"标记窗口。实测 2000 项不定高 `scrollToBottom` 一轮即收敛。

### 热路径上不读几何量

滚动帧的落点是 `VirtList._applyLayout`：它把各段的 transform 残差写一遍。
**这之后不能再读布局**（`getBoundingClientRect` / `clientHeight` / `offsetHeight`）——
浏览器为了给出准确的值必须立刻重算刚被改脏的布局，读写交替就是每帧一次强制同步回流。

需要几何量的地方各有对策：

- 自绘滚动条的**轨道长度**按视口尺寸缓存（`Scrollbar._trackSize`）。轨道与视口等长，
  视口没变它就没变；容器缩放会经由 ResizeObserver 改写账本里的 `clientSize`，
  缓存自然失效，拖拽按下时再显式失效一次以保证换算精度。
- **交叉轴视口的校正**（原生横向滚动条占掉的那一条）推到微任务里，且只跟着
  `list` / `force` / `size` 那几趟走，不跟滚动帧（`VirtList._queueCrossViewportSync`）。

契约锁在 `packages/vanilla/__tests__/ReactivePerf.test.ts`：滚动与数据变更期间
`getBoundingClientRect` 的调用次数必须是 0。

### 已知取舍与风险

- **移动端触摸惯性已经过真机验证**。衰减系数 0.95/帧、停止阈值 0.02px/ms 按常见实现取值，
  逻辑有测试覆盖，手感也在真机上过了一遍。
- **拖选文本到容器边缘不再自动滚动**——原生滚动免费提供的能力，拿不回来。
- **读写 `el.scrollTop` 的代码全部失效**。容器的 `scrollTop` 恒为 0，
  改用 `getOffset()` / `scrollToOffset()` / `scrollFromUser()`。
- **`scroll` 事件的载荷不再是 `Event`**。转发原生事件已无意义（`e.target.scrollTop`
  恒为 0），换成了普通对象 `VirtScrollEvent`：`offset` / `delta` / `direction` /
  `clientSize` / `scrollSize` / `maxOffset` / `atStart` / `atEnd` / `source`。
  其中 `source`（`user` / `program` / `adjust`）是确定的而非猜测——偏移量的每次写入
  都经我们的手，原生滚动下拿不到这个信息。

## 为什么选择独立包而不是单包兼容

### 决策：每个框架版本独立包

我们评估了三种方案：

| 方案 | 描述 | 结论 |
|------|------|------|
| **A. 拆分独立包** | 每个框架版本独立 npm 包 | **采用** |
| B. 单包 + 运行时 shim | vue-demi / compat 层 | 否决 |
| C. 仅支持最新版 | 放弃 legacy 支持 | 否决（暂时） |

### 决策理由

1. **差异集中在挂载层，而非逻辑层**
   - 95% 的逻辑位于 `core` + `vanilla`（框架无关）
   - 每个框架包每组件仅约 300 行
   - 唯一与版本相关的是插槽/节点挂载适配器（约 15 行）

2. **类型安全**
   - Vue 2 和 Vue 3 的类型系统有根本差异（`DefineComponent` 签名、`VNode` 类型等）
   - 单包需要大量 `any` 或复杂的条件类型
   - 独立包为每个版本提供精确类型

3. **零运行时开销**
   - 不需要 vue-demi 等 shim 库
   - 每个包直接从目标框架导入
   - 更小的打包体积

4. **独立生命周期**
   - Legacy 包可进入纯维护模式
   - 主包可自由使用新框架特性（Vue 3.4 `defineModel`、React 19 `use()`）
   - 不受"最小公约数"约束

5. **代码量足够小**
   - 每个框架包总计约 700 行（3 个组件）
   - 复制的成本远低于构建/维护共享抽象层

### 为什么不抽取共享代码？

我们考虑过抽取 `@virt-list/vue-shared` 或 `@virt-list/react-shared` 内部包，最终否决了，原因：

- "共享"部分（属性定义、事件分发、命令式 API）结构相似但因类型差异并不完全相同
- 内部共享包增加依赖复杂度，带来的去重收益微乎其微
- 框架绑定代码足够薄，复制一份完全可控

---

## 为什么 core 持有 DOM 所有权（而不是 headless）

### 决策：core / vanilla 建并复用列表项的 DOM，框架包只把内容挂进去

另一条广为人知的路线是 **headless**：核心只输出"该渲染哪几项、各自在什么位置"，
DOM 完全交给使用方在框架里写。TanStack Virtual 是这条路线的代表。

值得先说清一件容易搞反的事：**headless 与"纯 JS 内核 + 框架适配"无关**。
`@tanstack/virtual-core` 同样是框架无关的纯 TS 包，外面挂 react / vue / svelte / solid
四个适配层 —— 与本项目的分层完全一致。真正的分野是**谁 create 并 diff 列表项的元素**。
它没有"内容不跟着数据更新"这个问题，不是因为它"基于框架开发"，而是因为项本身就是
使用方 render 出来的普通节点，在宿主的 vdom 树上，更新是框架的分内事。

我们评估后仍然保留 core 持有 DOM 所有权，代价与收益如下。

### 放弃 headless 的六项理由

1. **同步测量与同步落位**。当前链路是同步的：`_buildDOM()` → `_patch()` →
   `_syncSlotSizes()` 直接读 `offsetHeight`，首帧即就位；`scrollToIndex` 返回时目标项
   已经在池子里（见 `vanilla/src/VirtList.ts` 中 `scrollToIndex` 的注释）。headless 下
   项由框架渲染，最早只能在 `useLayoutEffect` / `nextTick` 里量到尺寸，于是动态高度的
   首帧必然先按估算值排版再重排，`scrollToIndex` 到远处也退化成"渲染 → 测量 → 修正 →
   再渲染"的迭代收敛。
2. **滚动帧率不交给框架调度器**。滚动路径现在同步改 transform，一帧内闭环。headless 下
   每次区间变化都是 setState → 调度 → 重渲染 → commit；React 18 的并发特性会把它当作
   可打断的低优先级更新，快速滚动时容易看到空白块，而用 `flushSync` 压回同步等于
   放弃并发还多付一层开销。
3. **能力实现一份而不是四份**。吸顶吸底、自绘滚动条、跨虚拟化的选区复制、键盘接管、
   ARIA、`itemGap`、双向加载的位移补偿都需要"掌握全部渲染项的 DOM 与顺序"，
   现在集中在 `vanilla` 一份。headless 下这些要么甩给使用方手写，要么四个框架包各写一遍。
4. **`@virt-list/vanilla` 仍然成立**。headless 的前提是"有框架来渲染"，
   而无框架场景是这个包存在的理由。走 headless 就必须长期并存两套渲染路径。
5. **API 保持"一行可用"**。现在是 `<VirtList :list :item-key>` 加插槽；headless 的
   最小可用例要使用方自己写总高度容器、绝对定位、transform 与测量 ref，
   吸顶 / 空状态 / 水平模式一旦要自行拼装，文档与支持成本会显著上升。
6. **不引入测量 ref 的生命周期陷阱**。React StrictMode 的双调用、Vue 卸载时 ref 传 null、
   节点复用时 ref 回调的顺序，都会往尺寸账本里灌脏数据，且是四个框架各一套坑。

### 代价与对策：`updateItem` 契约

这个选择的代价是明确的：**框架内容挂在 core 建的游离元素上，不在宿主的组件树里，
宿主的响应式传导到不了它们**。而 `_patch` 对池里已有的 key 不会重新调用 `renderItem`
（增量 patch 的核心优化），于是"key 没变、数据变了"时内容会停在挂载那一刻 ——
不可变更新（`list.map(...)`）与 AI 流式输出都属于这一类。

对策是让 core 主动通知，而不是让各框架包自己想办法追：

- `core` 的 `update` 事件带 `reason`（{@link ListUpdateReason}：`list` / `force` /
  `range` / `size`）。**区分来源是必需的**：`update` 的 8 个触发点里只有 `list` / `force`
  意味着数据变了，而 `range` 每帧都在发（滚动）、`size` 也很频繁（ResizeObserver）。
  不区分就等于滚动每一帧把全部可见项的内容重渲染一遍。
- **一个外部事件只发一次通知**（`VirtListCore._coalesce` 事务：期间的通知全部吞掉，
  最外层出栈时按事务内出现过的**最强** `reason` 发一次）。三个入口进事务：
  列表变更（`_onListChange`）、一批尺寸上报（ResizeObserver 回调）、`forceUpdate`。

  两个理由缺一不可：
  - *正确性*：`_onListChange` 的"同 key 改内容"分支自己不发通知，全靠 `_updateRenderRange`
    等嵌套调用，而那些点按自己的语境标的是 `range` —— 照原样传下去，数据变了页面不动。
    所以事务末尾会显式要一次 `list`，并且合并时取最强原因（`range` < `size` < `force` < `list`）：
    标弱了漏刷新，标强了白干活。
  - *性能*：core 处理一个外部事件内部要经过区间 → leadingSize → 偏移量补偿 → 贴底求解
    好几步校正，逐步发通知就是：列表变更 2 次（尾部追加 / 整体换新）到 3 次（头部增删）、
    一批尺寸上报 2 次、`forceUpdate` 2 次。它们都只是通往同一个终态的中间态，DOM 层却会
    照单全收：重摆各段、重建 key 集合、把可见项过一遍，带 `list` / `force` 的还要让每个
    可见项重出内容（Vue / vue2 每项插槽多求值一遍，Tree 整池 DOM 多重建一遍）。
    合并之后统一为 1 次。

  合并只在**一个事件内部**发生：两次滚动、两批尺寸上报各自代表一次真实变化，仍然逐次通知。
  契约锁在 `packages/core/__tests__/ListChangeNotify.test.ts` 与
  `packages/vanilla/__tests__/ReactivePerf.test.ts`。
- `vanilla` 在 `reason` 为 `list` / `force` 时，对复用的项调 `updateItem(item, index, el)`，
  并重算函数式的 `itemStyle` / `itemClass`（它们是 `(item, index)` 的函数，两个入参都会变）。
- 四个框架包在插槽路径把 `updateItem` 指向与 `renderItem` 同一个挂载函数 ——
  挂载器按 mountKey 幂等，重复调用只是让插槽用最新数据重渲染一次，DOM 容器照旧复用。
  使用方自己接管 `renderItem` 时不注入，更新语义由他决定。

新增 `updateItem` 而不复用 `renderItem`，是因为后者的返回值契约是 `HTMLElement | void`，
新建分支会 `appendChild`；复用时再调一次，返回元素的实现会重复追加子节点。

比 `refreshItems(keys)` 更轻：那条路是移除并重建 DOM（React 侧的 root 会重挂，
输入焦点、动画、内部 state 全丢），`updateItem` 是原地更新内容。
`refreshItems` 因此仍然保留，用于"确实需要重建这一项"的场合。

React 侧另有一条互补通道 `flushMounts()`，两条都要留着：`updateItem` 覆盖
"命令式 `ref.setList()`，宿主不重渲染"；`flushMounts()` 覆盖"宿主重渲染但 `list`
引用没变"（流式文本存在宿主自己的 state 里）。两条同时命中也不会渲染两遍 ——
挂载器在 React 阶段内按元素合并 pending，并且**整批只调一次 `flushSync`**
（一次数据变更会同时投递所有可见挂载点，各自 flushSync 就是几十次独立的同步渲染）。

### Grid 的两条路径与 mountKey 的取法

Grid 的行 key 是 `_id`（行首扁平索引），**不随行内容变化** —— 删掉中间一项后每行的
`_id` 没变、装的人整体前移。按能力择一处理：

- **注入了 `updateItem`**（四个框架包的插槽路径）：`_updateRow` 原地更新，行元素与
  单元格容器全部复用，并补齐 / 收回尾行变动的单元格。
- **没有**（纯 DOM 用法）：`setList` 里比对成员、把变了的行交给 `refreshItems` 重建。
  正确但代价是那几行 DOM 换新，所以只作为没有 `updateItem` 时的回退。

单元格的 mountKey 必须按**位置**取（`grid:cell:${listIndex}`），与 VirtList 按数据 key
相反。依据是容器的复用方式：VirtList 的项元素在 `itemPool` 里按 key 管理，同一个 key
永远对应同一个元素；而单元格容器只是行元素的第 i 个子节点，纯按位置复用。两者不一致
就会错位 —— 删掉中间一项后「item-2 的内容」要渲染进「原来 item-1 的容器」，挂载器发现
记录里那个 key 对应的是别的元素，就会去卸载它、再对当前元素重复挂载。表现是内容正确但
每次删除都刷一串 `createRoot() on a container that has already been passed` 警告，
并白白重建一批挂载点（组件内部 state、输入焦点、进行中的动画全丢）。

回归测试：`packages/vanilla/__tests__/UpdateItem.test.ts`（含"滚动 / 尺寸上报不触发
`updateItem`"这条性能契约、以及无 `updateItem` 时的回退路径）与四个框架包的
`ItemUpdate.test.ts`（React 两个包直接断言删除后控制台无警告）。

---

## Demo 应用架构

文档站使用 **VitePress** + **qiankun 微前端** 架构。每个框架版本有独立的 demo 子应用：

```
docs/apps/
  vanilla/        端口 7801    Vanilla JS demo
  vue/            端口 7802    Vue 3 demo
  react/          端口 7803    React 18+ demo
  vue2/           端口 7804    Vue 2 demo（共享 vue 组件源码）
  react-legacy/   端口 7805    React 16-17 demo（共享 react 组件源码）
```

### 组件共享策略

为避免大量代码复制，legacy demo 应用通过 **Vite alias** 共享主版本的组件源码：

- `react-legacy` 应用：通过 `@react-app` alias 引用 `docs/apps/react/src/` 中的组件，并将 `@virt-list/react` alias 重定向到 `packages/react-legacy/src/`
- `vue2` 应用：通过 `@vue-app` alias 引用 `docs/apps/vue/src/` 中的组件，并将 `@virt-list/vue` alias 重定向到 `packages/vue2/src/`

由于四个框架包的公开 API 完全一致（VirtList、VirtGrid、VirtTree 的 props/events/ref 方法相同），alias 重定向对组件代码透明。

---

## 构建与开发

### 构建顺序

包必须按依赖顺序构建：

```bash
pnpm build:packages
# 等价于:
# 1. @virt-list/core
# 2. @virt-list/vanilla
# 3. @virt-list/vue + @virt-list/vue2 + @virt-list/react + @virt-list/react-legacy（并行）
```

### 开发模式

```bash
pnpm dev
# 同时启动 VitePress 文档站 + 所有 5 个 demo 子应用
```

各 demo 子应用端口（与上面「Demo 应用架构」一节的列表一致，实际值由各应用
`package.json` 的 `dev` 脚本以 `--strictPort` 固定）：

| 应用 | 端口 |
|------|------|
| VitePress 文档站 | 7800 |
| Vanilla | 7801 |
| Vue 3 | 7802 |
| React 18+ | 7803 |
| Vue 2 | 7804 |
| React 16-17 | 7805 |

### TypeScript 配置

- 所有包目标 **ES2022**，模块 **ESNext**，`moduleResolution: Bundler`
- 每个包有独立的 `tsconfig.build.json`
- React 包额外设置 `"jsx": "react-jsx"`
- 根目录 `tsconfig.base.json` 提供本地开发路径别名
- **源码里的相对 import 必须写全 `.js` 后缀**（指向目录时写到 `/index.js`）。
  tsc 从不重写 import 路径，而发布物是 `"type": "module"`，Node 的 ESM 解析
  不补扩展名、也不做目录解析。打包器会替你补全，所以漏了只在 SSR / 纯 Node 下暴露
  —— `pnpm check:esm` 就是为了拦住这类回归。

### 样式如何交付

样式的唯一副本在 `packages/vanilla/src/`（`scrollbar/scrollbar.css` 与 `tree/tree.css`）。
构建时由 `scripts/build-styles.mjs` 汇总复制成各包自己的 `dist/style.css`，经 exports
的 `./style.css` 子路径对外：

```ts
import '@virt-list/vue/style.css';
```

两条约束决定了这个形态：

1. **npm 包的 exports 只能映射自己目录下的文件**，框架包没法直接指向 vanilla 的 css；
   让使用方去引 `@virt-list/vanilla/...` 则是引间接依赖，pnpm 严格模式下解析不到。
2. **主入口的 JS 里不能 `import 'xxx.css'`**。曾经的做法是让 `VirtTree` 自己引
   `tree.css`，代价是纯 Node 环境下 `import('@virt-list/vue')` 直接抛
   `ERR_UNKNOWN_FILE_EXTENSION` —— Node 不认 `.css`，整个包都 import 不了。

各框架包的 `sideEffects` 因此是 `["**/*.css"]` 而不是 `false`：JS 部分确实无副作用，
但写成 `false` 会让打包器有理由把使用方显式引入的 css 也摇掉。

### 测试

测试位于 `packages/*/__tests__/`，通过 Vitest 运行，使用 `jsdom` 环境。根目录 `vitest.config.ts` 配置了指向包源码的路径别名。

各绑定层实际跑在这些版本上（由各包 `devDependencies` 决定）：React 19.2 / React 17.0.2、
Vue 3.5 / Vue 2.7.16。**Vue 2.6 与 React 18 在 peer 范围内但没有自动化覆盖**
——2.6 需要 `@vue/composition-api`，这条路径目前只有 `compat.ts` 的单测保证。

---

## 安装指南

装完框架包，还要引一次样式（不引也能滚，但看不到滚动条、树也没有默认外观）：

```ts
import '@virt-list/<你装的那个包>/style.css';
```

### Vue 3（推荐）

```bash
npm install @virt-list/vue
```

**Peer 依赖**：`vue >= 3.2.0`

### Vue 2（维护模式）

```bash
npm install @virt-list/vue2
```

**Peer 依赖**：`vue ^2.6.0 || ^2.7.0`

Vue 2.6 用户还需安装：`npm install @vue/composition-api`

### React 18+（推荐）

```bash
npm install @virt-list/react
```

**Peer 依赖**：`react >= 18.0.0`、`react-dom >= 18.0.0`

### React 16-17（维护模式）

```bash
npm install @virt-list/react-legacy
```

**Peer 依赖**：`react >= 16.8 < 18`、`react-dom >= 16.8 < 18`

上限是 18 而非 19：React 18+ 请用 `@virt-list/react`（这个包走的是 `ReactDOM.render`，
在 18 下会触发 legacy-root 警告，且拿不到并发特性）。下限是 16.8 而非 16.0 —— 绑定层用了 Hook。

---

## API 兼容性

四个框架包暴露 **完全一致的公开 API**：

| 导出 | 类型 | 描述 |
|------|------|------|
| `VirtList` | 组件 | 虚拟滚动列表 |
| `useVirtList` | 组合式函数 / Hook | 无头虚拟列表（Vue: composable, React: hook） |
| `VirtGrid` | 组件 | 虚拟滚动网格 |
| `VirtTree` | 组件 | 虚拟滚动树（支持展开/选择/勾选/拖拽） |

命令式 ref API 在所有包中完全一致：

```
scrollToIndex(index) / scrollIntoView(index) / scrollToTop() / scrollToBottom()
scrollToOffset(offset) / forceUpdate() / reset() / setList(list)
getState() / getOffset() / getSlotsTotalSize() / getItemSize(key)
```

Tree 专有方法：`expandAll() / expandNode() / toggleExpand() / checkAll() / filter() / ...`

---

## 迁移指南

### 从使用 vue-demi 的 @virt-list/vue 迁移

如果之前使用包含 `vue-demi` 的版本：

**Vue 3 用户**：无 API 变化。更新包即可 — `vue-demi` 已不再是依赖项。

**Vue 2 用户**：切换到 `@virt-list/vue2`：

```diff
- npm install @virt-list/vue
+ npm install @virt-list/vue2
```

```diff
- import { VirtList, VirtTree } from '@virt-list/vue';
+ import { VirtList, VirtTree } from '@virt-list/vue2';
```

### 从 @virt-list/react 迁移（React 16-17 用户）

如果之前在 React 16 或 17 环境中使用 `@virt-list/react`，切换到 `@virt-list/react-legacy`：

```diff
- npm install @virt-list/react
+ npm install @virt-list/react-legacy
```

```diff
- import { VirtList, VirtTree } from '@virt-list/react';
+ import { VirtList, VirtTree } from '@virt-list/react-legacy';
```

组件 API 完全一致 — 仅内部挂载机制不同。
