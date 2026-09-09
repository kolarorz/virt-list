# 变更日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。六个包共用同一个版本号（早期例外见文末）。

> **0.0.7 及更早的条目是事后补的。** 那几版既没打 git tag，提交信息也多是"feat: 更新"
> 这种粒度，无法逐条还原。下面按 npm registry 上的实际发布时间划分区间、归纳区间内的
> 提交：主要变更应该都在，但不保证完整。从 0.0.8 起在这里同步维护。

## [未发布]

### 修复

- **自绘滚动条改为像素线性映射。** 滑块位置与拖拽目标现在使用
  `offset / maxOffset` 双向换算，与原生滚动条的空间语义一致；高度差异很大的聊天消息不再
  出现“内容已经滚了很远，滑块却几乎没动”的假性延迟。拖拽期间滑块仍直接跟随指针，
  松手后以“顶部项 + 项内像素”建立不定高测量锚点，不会被吸回当前项顶部。
- **一维 List / Tree 不再默认接管交叉轴，嵌套滚动改为最内层优先。** `crossScroll`
  默认值改为 `false`（VirtGrid 作为二维组件仍默认开启）；横向代码块、表格以及内层纵向
  scrollport 会先于虚拟列表响应。滚轮采用主导轴锁定，避免纵向浏览时宽内容横向漂移；
  显式开启列表交叉轴时仍保留双轴能力、滚动链与防回弹语义。触摸路径同步支持内层
  scrollport，并在单轴模式下把交叉轴原生手势交回浏览器。
- **Vue / Vue2：项滚出渲染窗口后不再泄漏挂载点。** 两个适配层此前只有
  `cleanupSlots()`（组件卸载时才跑），滚动过程无人回收：core 把元素从文档里摘掉，
  Vue 3 那边留下一个连着 render effect 的 `SlotRenderer`、Vue 2 那边留下一个未
  `$destroy` 的实例，而且它们仍订阅着那一项的响应式数据——改数据时还会各自白渲染
  一遍。滚过的每个 key 都留一份（Tree 每个节点三份：`content` / `icon` / `node`）。
  新增 `dropSlot(el)` 接到 core 的 `onItemUnmounted` 上。
- **React / React-legacy：Grid 与 Tree 也接上 `onItemUnmounted`。** 此前只有
  `VirtList` 接了，另两个靠 `flushMounts()` 里的 `prune` 兜底，而那条路只在宿主
  重渲染时才走——纯滚动期间账本只增不减。Grid 更是指望不上它：单元格容器按行位置
  复用，旧 key 记着的元素仍 `isConnected`，`prune` 判不出来。
  `dropMount` 同时改为按 `contains` 匹配，覆盖「挂载点是项元素的后代」这种形态
  （Grid 的单元格、Tree 的节点行）。
- **`scrollToIndex` 的末项不再无视 `align: 'start'`。** 原先 `index >= length - 1`
  一律转 `scrollToBottom`，注释以为"两种对齐在那里没有分别"——只在末项装得进一屏时
  成立。末项高于一屏（展开的聊天消息、长图）时想把它顶部滚进视口，实际会贴到底。
  现在只有 `align: 'end'` 才走贴底那条路。
- **显式定位不再把「被裁掉的目标」固化下来。** `_pinIndex` 原先用「当前偏移量 − 目标」
  现算项内偏移，而 `scrollToIndex` 刚写进去的值可能被 `_maxScrollOffset()` 裁掉
  （目标项尚未渲染、尺寸只有估算值时可滚动上限偏小）。那个差额被当成"用户想要的项内
  偏移"记住，等尺寸测准、上限放开了也回不到真正的目标。显式定位现在恒取 0；隐式锚定
  （用户向上滚时自动锚住视口顶部项）仍然保留偏移——那里要保住的正是"看到这一项的第几
  个像素"。
- **中间增删数据也维持视口内容。** 此前只有头部结构变化会补偿（`_diffHead` 只比首项
  key），视口停在 index 50 时删掉 index 10，首项与偏移量都没变，但视口顶部显示的项会
  从 `k50` 悄悄换成 `k51`。现在以「变更前视口顶部那一项」为锚点，在新列表里从原索引向
  两侧找回它并按新位置反解偏移量。找不到（锚点被删、整体换数据源）就退回保持像素偏移。
  查找有半径上限，避免为「锚点根本不存在」的情形每次白扫全表；尾部追加与同 key 换内容
  由一次 `===` 短路，不付任何额外代价。
- **`reset()` 会一并归零分页状态。** `ListLoader` 此前完全不参与重置，切会话（清空
  list 走内部 `reset()`）会留下上一个会话的 `pendingNew`（上层拿它渲染"N 条新消息"
  角标，于是挂着一个假数字）、卡住的 `loadingTop/Bottom`（这个方向再也触发不了加载）、
  以及 `hasMore` 与停摆标记。新增 `ListLoader.reset()`，并用代号（`_epoch`）让 reset
  之前发起、之后才落地的请求整个作废——否则旧会话的 `more === false` 会关掉新会话的
  分页。
- **Vue / Vue2 的 Grid 与 Tree 补上对 `list.length` 的侦听。** 只盯 `props.list` 引用
  会漏掉「在同一个数组上 `splice` / `push`」：Vue 的 getter 依赖就是那个引用，原地改动
  不会重新触发。`VirtList` 本来是对的，另两个漏了。
- **Tree：取消拖拽后源节点的展开态还原。** 拖拽开始时会折叠源节点（拖着一整棵展开的
  子树没法看落点），但那只是实现手段、不是用户意图，Esc 取消或落在空处之后一直没还原。
  还原发生在派发 `dragend` 之前，使用方在回调里看到的是一致状态。
- **Tree：换数据源不再残留过滤留下的隐藏状态。** `_hiddenNodeKeySet` 与
  `_hiddenExpandIconKeySet` 按 key 记录，而 `setList` 两个都不清——新数据复用同样的
  key（切会话、翻页、服务端返回同一批 id 的另一份内容）时，那些节点一上来就是隐藏的、
  或者展开图标没了，而用户并没有在过滤。`filter()` 也改为两个集合一起清后全量重算。

### 性能

- **core：一个外部事件只发一次 `update` 通知。** 原先用 `_listChanging` 布尔标记，
  一次列表变更会经由嵌套调用发出多次通知——头部插入要发三次。现在改成
  `_coalesceDepth` 计数的合并事务，事务内的通知攒起来，出栈时只发一条，
  reason 取这一趟里最强的那个（`REASON_RANK` / `strongerReason`）。
  通知发出时状态已是终态，订阅方不会再看到中间态的 `leadingSize`。
  合并只在单个事件内生效：滚动与尺寸上报仍然逐次通知。
- **滚动条不再每帧强制回流。** 轨道长度改为按视口尺寸缓存。此前 `update()` 由
  `_applyLayout` 驱动、每个滚动帧都在跑，刚写完 transform 又立刻读
  `getBoundingClientRect`，构成读写交替，浏览器每帧被迫同步重算布局一次。
- **Tree 的一次数据变更只重建一遍可见节点**（此前重建两遍）。展开 / 折叠仍走重建，
  那条路要靠重建刷新图标与缩进。
- **React：整批挂载点合并成一次 `flushSync`。** 一次数据变更会同时投递所有可见项
  （十几到几十个挂载点），此前每个都单独 `flushSync`，等于几十次独立的同步渲染 + 提交。

### 测试

- 补充内层横向 / 纵向 scrollport 的 wheel 与 touch 路由、主导轴锁定、默认交叉轴归属。
- 新增 `packages/core/__tests__/ListChangeNotify.test.ts`：逐条钉住各路径的通知次数与
  reason，含"变更回调里同步再改一次列表"的嵌套情形。
- 新增 `packages/vanilla/__tests__/ReactivePerf.test.ts`：断言每个可见项恰好一次
  `updateItem`、滚动帧不读几何量、容器尺寸变化后缓存正确失效。
- 补充 Vue 的 `ItemUpdate.test.ts`。
- 新增 `packages/core/__tests__/VirtListMidChangeAnchor.test.ts`：中间增删的视口锚点，
  含「锚点被删」「整体换数据源」「位移超出扫描半径」这些必须退回原行为的情形。
- 新增 `packages/core/__tests__/VirtListScrollToIndexAlign.test.ts`：末项两种对齐，
  以及「目标被可滚动上限裁掉后仍要回到真正的目标」（走真实的 `ResizeObserver` 上报路径，
  渐进修正挂在那条回调上）。
- 新增 `packages/core/__tests__/ListLoaderReset.test.ts`：分页状态的重置与「reset 之前
  发起的请求落地后不得改状态」。
- 新增四个框架包的挂载点回收测试（`SlotRecycle` / `MountRecycle`）：滚一大段之后账本
  必须有界，并各自用最贴合的存活判据（Vue 3 看容器的 `_vnode`、Vue 2 看实例的
  `_isDestroyed`、React 看 root 渲染出的内容还在不在）。
- 新增 `InPlaceListMutation.test.ts`（vue / vue2）：三个组件的原地 `splice` / `push`。
- 新增 `packages/vanilla/__tests__/VirtTreeFilterState.test.ts`，并在
  `VirtTreeDrag.test.ts` 里补上拖拽取消后展开态还原的四个用例。
- 上述改动另用 CDP 驱动真实 Chrome 复核过 27 项（jsdom 没有布局、命中测试是 mock 的，
  滚动 / 拖拽 / 泄漏这三类只有真实浏览器算数）。其中「末项 `align:'start'` 落位」这条
  正是单测全绿、真实浏览器才暴露出来的——被裁剪的目标要靠 `ResizeObserver` 回调渐进
  修正，而 jsdom 里不会自然发生。

### 工程

- CI 增加 typecheck 步骤（文档站 + 5 个示例应用）。此前 vue2 / react-legacy 不在
  类型检查覆盖内，五份框架实现之间的副本漂移无人发现。
- 删除开发期遗留的探针测试 `packages/vue/__tests__/tmp-path.test.ts`（无真实断言，
  其结论已由 `ItemUpdate.test.ts` 覆盖）。

## [0.0.7] - 2026-08-12

- 新增四个框架包的插槽挂载兼容层 `compat.ts`（vue / vue2 / react / react-legacy），
  统一插槽内容的挂载与刷新时机。
- React 的 `VirtList` / `VirtGrid` / `VirtTree` 按兼容层重写。
- 修正 Vue / Vue2 的不可变更新路径，补充 `ItemUpdate` 测试。
- 修正虚拟滚动条的输入控制（`InputController`）。
- Tree 样式与类型补充。

## [0.0.6] - 2026-08-11

**这一版修掉了 0.0.5 的产物缺陷，0.0.5 的用户应当升级。**

- **修复：构建产物能被 Node 直接 import。** 包是 `"type": "module"`，而 Node 的 ESM
  解析不补扩展名、不做目录解析，主入口也不能出现 `import 'xxx.css'`。打包器会替你
  补全这些，所以 0.0.5 发出去了一个在 SSR / 纯 Node 环境下 import 不了的
  `@virt-list/vue`。新增 `scripts/check-esm.mjs` 在 CI 里拦住这类问题。
- 样式改由 `./style.css` 子路径交付，新增 `scripts/build-styles.mjs`；样式的唯一副本
  始终在 `packages/vanilla/src/`。
- 补齐包元数据：`exports`、`files`、`sideEffects`；六个包各自带上 `LICENSE` 与
  `README.md`（npm 只会自动带包目录下的那份，不是根目录的）。
- 新增 AI 场景示例与配套重构，新增 `scripts/gen-llms-txt.mjs`。
- 覆盖率阈值纳入 `vitest.config.ts`。

## [0.0.5] - 2026-08-10

> ⚠️ 此版本的 ESM 产物在纯 Node / SSR 环境下无法 import，请直接用 0.0.6 及以上。

- 新增虚拟滚动条（`packages/vanilla/src/scrollbar/`）。
- 新增一键发布脚本 `scripts/release.mjs`。
- 打包配置修正。
- 内部重构、残留清理与 demo 样式调整。

## [0.0.4] - 2026-08-05

- 统一四个框架的事件、`State`、`StyleValue` / `ClassValue` 命名与实现。
- Grid 实现统一。
- TypeScript 类型完善。
- 新增平滑滚动。
- vue2 补充测试与兼容处理。

## [0.0.3] - 2026-04-21

六个包首次统一到同一版本号。

- `@virt-list/vue2`、`@virt-list/react-legacy` 两个包补齐（其 `0.0.1` 于同日稍早发布）。
- 响应式模式更新，文档补充。

## [0.0.1] / [0.0.2] - 2026-04-09 ~ 2026-04-15

首次发布。扁平化渲染、响应式模式、四框架实现与文档站。

## 版本号说明

早期各包的起点并不一致，因此 registry 上的版本列表有两处空缺：

| 包 | 首版 | 备注 |
| --- | --- | --- |
| `@virt-list/core` | `0.0.1`（04-09） | 唯一发过 `0.0.2`（04-15）的包 |
| `@virt-list/vanilla` `vue` `react` | `0.0.1`（04-15） | 与 core `0.0.2` 同批 |
| `@virt-list/vue2` `react-legacy` | `0.0.1`（04-21） | 晚 6 天补发，当天即随大家统一到 `0.0.3` |

`0.0.2` 只有 core 有；`vue2` / `react-legacy` 没有 `0.0.2`。从 `0.0.3` 起六包始终同版本号。
