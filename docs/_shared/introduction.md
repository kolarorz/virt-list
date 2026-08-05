# 项目介绍

## 什么是 virt-list

virt-list 是一个高性能虚拟滚动引擎，支持 **列表（List）**、**网格（Grid）** 和 **树形（Tree）** 三种组件形态，覆盖 Vue 3 / Vue 2 / React 18+ / React 16-17 / 原生 JS 五种运行环境。

## 项目起源

本项目基于 [vue-virt-list](https://github.com/kolarorz/vue-virt-list) 改造而来。

原项目是一个经过生产验证的 Vue 虚拟滚动列表库，核心算法与 Vue 的响应式系统（`reactive`、`computed`、`watch`）深度耦合。这意味着：

- React 或其他框架无法复用这套已经验证过的算法
- 核心逻辑的单元测试必须依赖 Vue 运行时
- 即使不需要 Vue 响应式，也必须承担其性能开销

virt-list 将原有实现拆解为 **纯 JS 算法内核 + 原生 DOM 操作层 + 轻量框架绑定层**，在保留原算法优势的同时实现了框架无关。

## 改造收益

| 改造前 | 改造后 |
|---|---|
| 算法与 Vue 响应式耦合 | 纯 TypeScript，零框架依赖 |
| 仅支持 Vue | Vue 2 / Vue 3 / React / 原生 JS |
| 测试需要浏览器 + Vue 运行时 | core 层可在 Node.js 下单元测试 |
| 依赖 vue-demi 做版本兼容 | 各框架独立包，零运行时 shim |
| 修 bug 只修 Vue 版本 | 修一次，所有框架同时受益 |

## 包总览

| 包名 | 说明 | 安装 |
|---|---|---|
| `@virt-list/core` | 框架无关的算法内核 | `npm i @virt-list/core` |
| `@virt-list/vanilla` | 原生 DOM 操作层 | `npm i @virt-list/vanilla` |
| `@virt-list/vue` | Vue 3 绑定层 | `npm i @virt-list/vue` |
| `@virt-list/vue2` | Vue 2 绑定层 | `npm i @virt-list/vue2` |
| `@virt-list/react` | React 18+ 绑定层 | `npm i @virt-list/react` |
| `@virt-list/react-legacy` | React 16-17 绑定层 | `npm i @virt-list/react-legacy` |
