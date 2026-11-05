---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: React / Vue 虚拟列表与流式聊天
description: 适用于 React、Vue 和原生 JavaScript 的虚拟列表、虚拟树与网格，支持动态行高、流式聊天跟随及双向历史加载。

hero:
  name: 'VirtList'
  text: '为流式对话而生的虚拟滚动'
  tagline: 列表 / 网格 / 树形三种形态，五个框架共享同一内核。行高由内容决定，三百万行与三十行，滚动开销一样。
  actions:
    - theme: brand
      text: 快速开始
      link: /vanilla/guide/started
    - theme: alt
      text: AI 流式对话
      link: /vanilla/ai/overview
    - theme: alt
      text: 现场跑一遍性能
      link: '#benchmark'
    - theme: alt
      text: GitHub
      link: https://github.com/kolarorz/virt-list

features:
  - title: AI 流式对话
    details: 逐 token 输出时视口稳定跟随，用户上滑立即脱离、滚回底部自动恢复。万级会话历史双向加载，未读消息自带计数。
    link: /vanilla/ai/overview
    linkText: 看在线 demo
  - title: 常数级滚动开销
    details: 稳态滚动从上一帧的位置增量推进，每帧只跨越几项；数据量从一万涨到三十万，单帧成本不变。
  - title: 真正的不定高
    details: 行高由内容决定，无需预先声明。ResizeObserver 实测尺寸，配合分块索引让任意跳转保持 O(√n)。
  - title: 跨框架一致体验
    details: Vue 3 / Vue 2 / React 18+ / React 16-17 / 原生 JS 五套实现共享同一份核心算法，API 对齐。
  - title: 能力完整
    details: 虚拟列表、虚拟树形、网格布局，外加 sticky 区域、空状态、滚动定位、拖拽排序与无限加载。
  - title: 灵活可控
    details: 渲染区间、缓冲区、样式与交互都可接管，renderControl 允许你完全自定义渲染哪些项。
  - title: 类型友好
    details: 全量 TypeScript 编写，核心零运行时依赖，完整链路 gzip 后 6.1KB。
---

<ComplexityTable />

<div id="benchmark"></div>

<ClientOnly>
  <BenchmarkPanel />
</ClientOnly>
