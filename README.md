# virt-list

<p align="center">
  <a href="https://www.npmjs.com/package/@virt-list/core"><img src="https://img.shields.io/npm/v/@virt-list/core.svg?sanitize=true" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@virt-list/vanilla"><img src="https://img.shields.io/npm/v/@virt-list/vanilla.svg?sanitize=true" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@virt-list/vue"><img src="https://img.shields.io/npm/v/@virt-list/vue.svg?sanitize=true" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@virt-list/vue2"><img src="https://img.shields.io/npm/v/@virt-list/vue2.svg?sanitize=true" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@virt-list/react"><img src="https://img.shields.io/npm/v/@virt-list/react.svg?sanitize=true" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@virt-list/react-legacy"><img src="https://img.shields.io/npm/v/@virt-list/react-legacy.svg?sanitize=true" alt="Version"></a>
</p>

本项目基于 [vue-virt-list](https://github.com/kolarorz/vue-virt-list) 改造而来。基于纯 JS 重构，配合框架层适配。

## 运行

```sh
pnpm i
```

```sh
pnpm dev
```

## 项目目录

```text
.
├─ docs/          # VitePress 文档站点 + playground 宿主
│  ├─ apps/       # 文档内微应用（react/vue/vanilla）
│  │  ├─ vanilla/    # 原生JS 应用
│  │  ├─ react/      # React 应用
│  │  └─ vue/        # Vue 应用
│  ├─ examples/   # 文档 md
│  │  ├─ vanilla/    # 原生JS 文档
│  │  ├─ react/      # React 文档
│  │  └─ vue/        # Vue 文档
├─ packages/      # npm 发布包（见下方详细说明）
│  ├─ core/
│  ├─ vanilla/
│  ├─ react/
│  ├─ vue/
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

## packages 目录结构

```text
packages/
├─ core/                          # @virt-list/core — 框架无关的虚拟滚动算法内核
│  └─ src/
│     ├─ index.ts                 # 包入口，导出 VirtListCore + 类型
│     ├─ VirtListCore.ts          # 纯算法实现：可视区域计算、缓冲区管理、滚动定位
│     └─ types.ts                 # 公共类型定义（VirtListOptions, ListState, SlotSize 等）
│
├─ vanilla/                           # @virt-list/vanilla — 基于原生 DOM 的虚拟列表实现
│  └─ src/
│     ├─ index.ts                 # 包入口，导出 VirtList + 框架适配器工具
│     ├─ VirtList.ts           # DOM 操作封装：容器创建、ResizeObserver、滚动条、DOM 渲染
│     ├─ utils.ts                 # DOM 工具函数（样式合并、属性设置等）
│
├─ react/                         # @virt-list/react — React 原生虚拟列表组件
│  └─ src/
│     └─ index.ts                 # useVirtList Hook + VirtList 组件（renderItem 模式）
│
├─ vue/                           # @virt-list/vue — Vue 原生虚拟列表组件
│  └─ src/
│     ├─ index.ts                 # useVirtList Composable + VirtList 组件（slot 模式）
│     ├─ ObserverItem.ts          # 子项尺寸观测组件（内部使用 ResizeObserver）
│     └─ utils.ts                 # Vue 渲染工具函数（h 函数封装、slot 获取等）
│
```

### 包依赖关系

```text
@virt-list/core        ← 零依赖，纯算法
    ↑
@virt-list/vanilla     ← 依赖 core，面向无框架 / 纯 JS 用户
    ↑
@virt-list/react       ← 依赖 core + dom，peerDep: react ≥18, react-dom ≥18
@virt-list/vue         ← 依赖 core + dom，peerDep: vue ≥3.2
```

### 构建与测试

```sh
pnpm build:packages    # 构建所有包（core → dom → vue + react）
pnpm test              # 运行自动化测试
```

> 详细的发布流程请参阅 [PUBLISHING.md](./PUBLISHING.md)

### 面向用户的使用方式

| 用户类型       | 推荐包               | 导入示例                                         |
| -------------- | -------------------- | ------------------------------------------------ |
| Vue 用户       | `@virt-list/vue`     | `import { VirtList } from '@virt-list/vue'`      |
| React 用户     | `@virt-list/react`   | `import { VirtList } from '@virt-list/react'`    |
| 纯 JS / 无框架 | `@virt-list/vanilla` | `import { VirtList } from '@virt-list/vanilla'`  |
| 高级自定义     | `@virt-list/core`    | `import { VirtListCore } from '@virt-list/core'` |
