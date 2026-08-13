# 变更日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。六个包共用同一个版本号（早期例外见文末）。

> **0.0.7 及更早的条目是事后补的。** 那几版既没打 git tag，提交信息也多是"feat: 更新"
> 这种粒度，无法逐条还原。下面按 npm registry 上的实际发布时间划分区间、归纳区间内的
> 提交：主要变更应该都在，但不保证完整。从 0.0.8 起在这里同步维护。

## [未发布]

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

- 新增 `packages/core/__tests__/ListChangeNotify.test.ts`：逐条钉住各路径的通知次数与
  reason，含"变更回调里同步再改一次列表"的嵌套情形。
- 新增 `packages/vanilla/__tests__/ReactivePerf.test.ts`：断言每个可见项恰好一次
  `updateItem`、滚动帧不读几何量、容器尺寸变化后缓存正确失效。
- 补充 Vue 的 `ItemUpdate.test.ts`。

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
