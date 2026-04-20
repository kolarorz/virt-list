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

主要导出：`VirtListCore`、`ReactiveData`、`SlotSize`、`VirtListOptions`、`VirtListEvents`

### @virt-list/vanilla

DOM 操作层。负责：

- 滚动容器结构（header → sticky-header → list-wrapper → sticky-footer → footer）
- 项目池管理与增量 DOM 更新
- ResizeObserver 挂载
- 将滚动/尺寸变化事件传递给 core
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

## Demo 应用架构

文档站使用 **VitePress** + **qiankun 微前端** 架构。每个框架版本有独立的 demo 子应用：

```
docs/apps/
  vanilla/        端口 7101    Vanilla JS demo
  vue/            端口 7102    Vue 3 demo
  react/          端口 7103    React 18+ demo
  vue2/           端口 7104    Vue 2 demo（共享 vue 组件源码）
  react-legacy/   端口 7105    React 16-17 demo（共享 react 组件源码）
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

各 demo 子应用端口：

| 应用 | 端口 |
|------|------|
| React 18+ | 7101 |
| Vue 3 | 7102 |
| Vanilla | 7103 |
| React 16-17 | 7104 |
| Vue 2 | 7105 |
| VitePress 文档站 | 5173 |

### TypeScript 配置

- 所有包目标 **ES2022**，模块 **ESNext**
- 每个包有独立的 `tsconfig.build.json`
- React 包额外设置 `"jsx": "react-jsx"`
- 根目录 `tsconfig.base.json` 提供本地开发路径别名

### 测试

测试位于 `packages/*/__tests__/`，通过 Vitest 运行，使用 `jsdom` 环境。根目录 `vitest.config.ts` 配置了指向包源码的路径别名。

---

## 安装指南

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

**Peer 依赖**：`react >= 16.8.0 < 19.0.0`、`react-dom >= 16.8.0 < 19.0.0`

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
getReactiveData() / getOffset() / getSlotSize() / getItemSize(key)
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
