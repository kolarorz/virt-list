# 与同类方案对比

虚拟滚动是个成熟领域，已有大量优秀的开源实现。这一页尽量客观地说明：virt-list 在哪些场景下确实更合适，在哪些场景下你应该选择别的方案。

::: info 数据采集说明
下文的版本号、体积、star 数、下载量采集于 **2026-07-28**：

- 版本 / 周下载量来自 npm registry，star 数来自 GitHub API
- 第三方库体积来自 [bundlephobia](https://bundlephobia.com/)，为**整包** min+gzip
- virt-list 体积为本地实测（`esbuild --bundle --minify` + `gzip -9`），口径与上者一致

数据会随时间变化，请以各库官方渠道为准。
:::

## 参与对比的方案

| 方案 | 支持环境 | 版本 | 整包 min+gzip | star | 周下载 |
|---|---|---|---|---|---|
| **virt-list**（本项目） | Vue 3 / Vue 2 / React 18+ / React 16-17 / 原生 JS | `0.0.x` | 11.8 KB<br />（仅 List 按需 4.8 KB） | 2 | 个位数 |
| [react-window](https://github.com/bvaughn/react-window) | React | `2.3.0` | 4.4 KB | 17.2k | 648 万 |
| [react-virtualized](https://github.com/bvaughn/react-virtualized) | React | `9.22.6` | 27.2 KB | 27.1k | 180 万 |
| [@tanstack/virtual](https://github.com/TanStack/virtual) | React / Vue 3 / Svelte / Solid / Angular / Lit | `3.14.x` | 7.3 KB | 7.0k | 1960 万 |
| [react-virtuoso](https://github.com/petyosi/react-virtuoso) | React | `4.18.11` | 18.6 KB | 6.4k | 316 万 |
| [virtua](https://github.com/inokawa/virtua) | React / Vue 3 / Solid / Svelte / Angular | `0.50.0` | 5.9 KB | 3.6k | 82 万 |
| [vue-virtual-scroller](https://github.com/Akryum/vue-virtual-scroller) | Vue 3（3.x）/ Vue 2（1.x） | `3.0.4` | 16.2 KB | 10.8k | 60 万 |
| [vue-virt-list](https://github.com/kolarorz/vue-virt-list) | Vue 2 / Vue 3 | `1.7.0` | 12.8 KB | 418 | 1.9k |

::: warning 先说最重要的一条
virt-list 目前是 `0.0.x`，star 与下载量都还在起步阶段，而 react-window、TanStack Virtual 等方案已经被数百万个项目验证过多年。**如果你的项目最看重「久经考验」和「出问题时能搜到答案」，应当优先选择成熟方案。** 下面列出的优势不能抵消这一点。
:::

## 能力矩阵

✅ 内建开箱可用 · 🟠 有限支持 / 需自行实现 · ❌ 不支持

| 能力 | virt-list | react-window | TanStack Virtual | react-virtuoso | virtua | vue-virtual-scroller |
|---|---|---|---|---|---|---|
| 固定尺寸 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 不定高动态测量 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 水平滚动 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 二维网格（行列同时虚拟化） | ❌<sup>※</sup> | ✅ | ✅ | 🟠 | ✅ | 🟠 |
| 树形组件（勾选 / 拖拽 / 过滤） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 表格（列定义 / 冻结列） | 🟠 | 🟠 | 🟠 | ✅ | 🟠 | 🟠 |
| 吸顶 / 吸底区域 | ✅ | 🟠 | 🟠 | ✅ | ✅ | 🟠 |
| 反向滚动 / 聊天室场景 | ✅ | 🟠 | 🟠 | ✅ | ✅ | 🟠 |
| 顶部插入数据不跳动 | ✅ | 🟠 | 🟠 | ✅ | ✅ | 🟠 |
| 平滑滚动（可中断） | ✅ | 🟠 | 🟠 | 🟠 | 🟠 | 🟠 |
| 跟随框架响应式自动更新 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSR / 首屏 HTML 输出 | ❌ | ✅ | ✅ | ✅ | ✅ | 🟠 |
| ARIA 角色 / 键盘导航 | ❌ | ✅ | ❌ | 🟠 | 🟠 | ❌ |
| RTL | ❌ | 🟠 | 🟠 | 🟠 | ✅ | 🟠 |
| 非 React/Vue 框架 | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Vue 2 / React 16-17 | ✅ | ❌ | ❌ | ❌ | ❌ | 🟠 |

::: tip 关于这张表
矩阵是**粗粒度**判断，依据各库公开文档整理。「🟠」通常意味着「能做，但需要你自己写胶水代码」——例如 TanStack Virtual 是 headless 方案，几乎所有 UI 相关能力都在这一档，这是它的设计意图，不是缺陷。

※ 二维虚拟化是 virt-list 主动划定的范围边界，由独立的虚拟表格项目承担，见下文「不做二维虚拟化」。
:::

## virt-list 的优势

### 1. 一套算法覆盖五种运行环境

算法内核（`@virt-list/core`）是零依赖的纯 TypeScript，DOM 层（`@virt-list/vanilla`）负责节点池与增量 patch，框架层每个组件约 300 行。同一份滚动逻辑同时服务 Vue 3、Vue 2、React 18+、React 16-17 和原生 JS。

这带来一个别处很难得到的能力：**跨技术栈的一致行为**。老项目在 Vue 2、新项目在 React 18，两边列表的滚动手感、`scrollToIndex` 的语义、不定高的修正策略完全相同，修一个 bug 所有环境同时受益。

对比之下：

- react-window / react-virtuoso 只支持 React
- vue-virtual-scroller 只支持 Vue
- TanStack Virtual、virtua 覆盖多框架，但**都不支持 Vue 2 和 React 16-17**

如果你的组织还有存量的 Vue 2 或 React 16/17 项目需要和新项目共用同一套列表方案，可选项其实很少。

### 2. 开箱可用的虚拟树

`VirtTree` 内建了展开/折叠、单选/多选、复选框（含半选态与 `checkedStrictly`）、聚焦、关键字过滤、连接线、拖拽排序（含同级限制、`disableDragIn` / `disableDragOut`）。

其他虚拟滚动库基本都不提供树形组件——它们只解决「渲染 N 个等高或不等高的行」，你需要自己完成：树形数据扁平化、展开状态维护、父子勾选联动、拖拽落点计算。这部分逻辑通常是数千行量级，本项目的树实现有约 1800 行。

::: info
如果你的需求正好是「大数据量树」，这可能是本项目相对同类方案最实际的优势。
:::

### 3. 不定高场景的完整处理

不定高是虚拟滚动最容易出问题的地方，本项目对以下场景都做了处理：

- `scrollToIndex` 的**渐进修正**：目标项之前的项尚未测量时先用预估值滚动，`ResizeObserver` 回调后重新计算并修正，直到偏移量稳定
- 向上滚动时上方项尺寸变化，通过 `scrollTop += diff` 补偿，视口内容不跳动
- 顶部增删数据（`addedList2Top` / `deletedList2Top`）保持视觉位置稳定
- 平滑滚动**每帧重算目标位置**，滚动途中列表撑开也不会跑偏；用户滚轮/触摸可立即接管动画

### 4. 命令式 API 更完整

除常规滚动方法外还提供 `manualRender`（手动指定渲染区间）、`renderControl`（渲染区间拦截器）、`getItemPosByIndex`、`deleteItemSize`、`getSlotSize` 等。这类「逃生舱」在做定制交互（联动滚动、锚点定位、自定义骨架屏）时很有用。

### 5. 绕过框架响应式，海量数据初始化更快

列表数据不进入 Vue 的 `reactive` 代理、也不触发 React 的子树 diff。10 万条数据的初始化不需要递归代理每个对象的属性，DOM 的增删完全由 vanilla 层的节点池控制。

### 6. 分层架构可以只取一层

- 只要算法：用 `@virt-list/core`，自己接任意渲染层（Canvas、WebGL、其他框架）
- 不用框架：用 `@virt-list/vanilla`
- 只用 List：按需引入约 4.8 KB，不会把 Tree 和 Grid 的代码打进产物

配套的虚拟表格项目就是这套分层的第一个下游验证：它只复用 `@virt-list/core` 的区间计算与不定高修正，DOM 层完全自建。

## virt-list 的劣势

这一节请认真读，它们都是真实存在的限制。

### 1. 生态成熟度差距是量级的

`0.0.x` 意味着 API 仍可能变动；star 与周下载量对比 react-window（17.2k / 648 万）、TanStack Virtual（1960 万周下载）几乎可以忽略。实际影响：

- 遇到问题很难搜到现成答案，基本只能读源码或提 issue
- 没有第三方生态（配套的表格、时间轴、聊天组件等）
- 浏览器兼容性只在开发者接触到的环境验证过，缺少大规模真实流量的检验
- 测试目前是 4 个单元测试文件，**没有跨浏览器 e2e**，也没有公开的 benchmark 数据

### 2. 数据变更不会自动响应

这是最容易被误判的一条。修改列表项内容后 DOM 不会自动更新，必须调用 `forceUpdate()`；使用 `shallowRef` 时长度变化也需要手动触发。原因详见「深入 → 设计决策」。

这是为性能做的**主动权衡**，但它违背了框架用户的直觉。react-window、virtua、react-virtuoso、vue-virtual-scroller 都是「改数据 → UI 自动更新」，接入成本更低，也更不容易写出 bug。如果你的列表数据变更频繁而数据量并不极端（比如几千条），别的方案会让你更省心。

### 3. 不支持 SSR

vanilla 层直接操作 DOM，没有服务端渲染分支，也没有 hydration 方案——首屏必须等客户端 JS 执行。react-window（`defaultHeight` / `defaultWidth`）、TanStack Virtual（`initialRect` / `initialMeasurementsCache`）、react-virtuoso（`initialItemCount`）、virtua 都能在服务端输出首屏行。Next.js / Nuxt 项目如果依赖 SEO 或首屏 HTML，这是硬伤。

### 4. 不做二维虚拟化（设计边界）

`VirtGrid` 的实现是「扁平数组按 `gridItems` 分组成行 + 行虚拟化」，单元格等宽，**列方向不虚拟化**。适合瀑布流式的卡片墙，不适合「1000 列 × 10 万行」的电子表格场景。

这是主动划定的边界而非未完成的功能——二维虚拟化要求单元格绝对定位，与本项目的顶部占位布局策略互斥，详见「深入 → 设计决策」。**虚拟表格由独立项目承担**：它复用 `@virt-list/core` 的区间计算，自建适配表格的 DOM 结构与渲染失效策略。

在该项目发布前，需要二维虚拟化、冻结行列、单元格合并的场景请选择 react-window 的 `Grid`、virtua 的 `VGrid`，或 AG Grid / VXE Table 这类表格产品。

### 5. 框架覆盖面窄于 headless 方案

只有 Vue 和 React（含旧版本）。Svelte、Solid、Angular、Lit 用户请选 TanStack Virtual 或 virtua。

### 6. 可访问性与国际化缺失

- 没有 ARIA 角色/属性输出，没有内建键盘导航（`keydown` 仅用于拖拽的取消）
- 不支持 RTL 布局
- 文档与示例目前只有中文

对无障碍有合规要求的项目，react-window 在这方面做得最完善。

### 7. 仍受浏览器高度上限约束

浏览器元素高度上限（Chrome 约 33,554,432px）导致默认行高下约 38 万行会触及天花板，模拟滚动条方案尚未落地，详见「指南 → 特殊说明」。多数同类方案有同样限制，但如果你需要百万行，都得等各自的虚拟滚动条实现。

### 8. 顺序搜索的取舍

可视区间定位从上一次位置**顺序搜索**（不定高下无法二分），常规滚动只需遍历 1-3 项，非常快；但配合大跨度跳转时依赖多帧渐进修正。TanStack Virtual、virtua 采用的偏移量缓存/二分策略在极端跳转场景下更直接。

## 各方案速览

### react-window

**优势**：作者是 React 前核心成员，17.2k star、648 万周下载，2.x 在 2026 年仍在活跃维护；体积最小（4.4 KB）；ARIA 处理最规范；`List` + `Grid` 覆盖一维和二维；支持 SSR。

**劣势**：只支持 React；官方明确提示动态行高（`useDynamicRowHeight`）效率不如预定尺寸；没有树、表格、聊天等高阶封装，吸顶/反向滚动都要自己写。

**何时选它**：纯 React 项目、行高已知或可计算、追求极小体积与稳妥选择。

### react-virtualized

**优势**：功能面最广的老牌方案（Table、Masonry、Collection、CellMeasurer、InfiniteLoader 等），27.1k star。

**劣势**：27.2 KB 体积、API 陈旧、最后一次发布是 2025-01，作者本人推荐新项目迁移到 react-window。

**何时选它**：只在维护存量项目时。新项目不建议。

### @tanstack/virtual

**优势**：headless 设计，只输出「哪些项该渲染、偏移多少」，UI 完全由你决定，因此上限极高；官方适配 React / Vue 3 / Svelte / Solid / Angular / Lit；1960 万周下载，是目前事实上的主流选择；核心 `virtual-core` 与框架解耦——**这一点和 virt-list 的设计哲学一致**。

**劣势**：headless 意味着吸顶、反向滚动、聊天场景、树、表格全部要自己实现；水平滚动、平滑滚动也需要自行配置；没有任何现成 UI。

**何时选它**：你要自己掌控渲染细节、或者需要在多种框架（含 Svelte/Solid/Angular）间统一方案。

### react-virtuoso

**优势**：开箱能力最强——分组列表（`GroupedVirtuoso`）、表格（`TableVirtuoso`）、网格（`VirtuosoGrid`）、聊天场景（`followOutput`、`firstItemIndex`）都是内建；不定高完全自动，几乎零配置。

**劣势**：18.6 KB；只支持 React；封装度高，深度定制时会撞到抽象边界。

**何时选它**：React 项目要快速做出聊天/信息流/分组列表，且不介意体积。

### virtua

**优势**：设计目标与 virt-list 高度相似——零配置、小体积（5.9 KB）、框架无关，且框架覆盖更广（React / Vue 3 / Solid / Svelte / Angular）；反向滚动、RTL、DnD、键盘导航、SSR、滚动位置恢复都在支持列表内；提供了公开的 benchmark。

**劣势**：不支持 Vue 2 / React 16-17；没有树形组件；仍是 `0.x` 版本。

**何时选它**：多框架（现代版本）项目、需要 RTL 或反向滚动、追求小体积。**如果你不需要 Vue 2 / React 16-17 支持，也不需要虚拟树，virtua 是比 virt-list 更成熟的选择。**

### vue-virtual-scroller

**优势**：Vue 生态最知名的方案（10.8k star），`RecycleScroller` 的组件复用思路对固定高列表很高效；`DynamicScroller` 处理不定高；1.x 分支支持 Vue 2。

**劣势**：16.2 KB；只支持 Vue；3.x 长期处于 beta/低频维护状态；没有树、吸顶等高阶能力。

**何时选它**：Vue 项目、希望用社区最广为人知的方案。

### vue-virt-list

**优势**：本项目的上游，Vue 2/3 双支持，已包含 List / Grid / Tree 的完整能力，且经过生产验证。

**劣势**：算法与 Vue 响应式深度耦合，无法服务 React 或原生 JS；核心逻辑测试需要 Vue 运行时。

**何时选它**：纯 Vue 项目、且更倾向使用已发布 1.x 的稳定版本。virt-list 是它的框架无关重构版，能力对齐但版本更早期。

### 其他值得了解的方案

- **[Clusterize.js](https://github.com/NeXTs/Clusterize.js)**（7.3k star，`1.0.0`）：无框架依赖的极简方案，把行分成等高「簇」渲染。极轻，但要求行高一致、无动态测量、最后一次更新较久，只适合非常简单的静态长列表。
- **AG Grid / VXE Table / Element Plus `el-table-v2`**：如果你的真实需求是「带虚拟滚动的数据表格」（排序、筛选、冻结列、单元格编辑、导出），不要用虚拟滚动库自己拼，直接选表格产品。
- **CSS `content-visibility: auto`**：现代浏览器原生的渲染跳过能力，零 JS。缺点是仍然创建全部 DOM 节点，滚动条高度和内存开销都在，数据量到万级以上依然需要真正的虚拟滚动。

## 选型建议

按你的约束条件顺序判断：

| 你的情况 | 建议 |
|---|---|
| 需要大数据量**树形控件**（勾选、拖拽、过滤） | virt-list — 同类库都要自己实现 |
| 存量 **Vue 2 / React 16-17** 需与新项目共用一套方案 | virt-list — 其他多框架方案不支持旧版本 |
| 需要 **SSR / SEO 首屏** | react-window、TanStack Virtual、react-virtuoso、virtua |
| 需要 **Svelte / Solid / Angular** | TanStack Virtual、virtua |
| 需要 **二维网格 / 冻结列 / 电子表格** | 关注配套的虚拟表格项目；当下可选 react-window `Grid`、virtua `VGrid`，或 AG Grid / VXE Table |
| 需要 **无障碍合规**（ARIA、键盘导航） | react-window |
| React 项目要快速做**聊天 / 信息流 / 分组列表** | react-virtuoso |
| 想**完全掌控渲染**，UI 自己写 | TanStack Virtual |
| 追求**极小体积**且行高已知 | react-window、virtua |
| 数据频繁变更、数据量中等（数千条），希望**改数据自动更新** | 任何跟随框架响应式的方案（virt-list 需手动 `forceUpdate`） |
| 项目要求依赖**久经验证** | react-window、TanStack Virtual、react-virtuoso |
