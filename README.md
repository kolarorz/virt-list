# virt-list — React / Vue 虚拟列表、虚拟树与流式聊天

[English](./README.en.md) · 简体中文

Virtual lists, trees and grids for React, Vue and vanilla JavaScript — dynamic heights and streaming chat support.

**[在线体验](https://kolarorz.github.io/virt-list/)** · [React 流式聊天](https://kolarorz.github.io/virt-list/react/ai/streaming) · [Vue 流式聊天](https://kolarorz.github.io/virt-list/vue/ai/streaming) · [快速开始](#快速开始)

<p align="center">
  <a href="https://www.npmjs.com/package/@virt-list/core"><img src="https://img.shields.io/npm/v/@virt-list/core.svg?sanitize=true" alt="@virt-list/core"></a>
  <a href="https://www.npmjs.com/package/@virt-list/vanilla"><img src="https://img.shields.io/npm/v/@virt-list/vanilla.svg?sanitize=true" alt="@virt-list/vanilla"></a>
  <a href="https://www.npmjs.com/package/@virt-list/vue"><img src="https://img.shields.io/npm/v/@virt-list/vue.svg?sanitize=true" alt="@virt-list/vue"></a>
  <a href="https://www.npmjs.com/package/@virt-list/vue2"><img src="https://img.shields.io/npm/v/@virt-list/vue2.svg?sanitize=true" alt="@virt-list/vue2"></a>
  <a href="https://www.npmjs.com/package/@virt-list/react"><img src="https://img.shields.io/npm/v/@virt-list/react.svg?sanitize=true" alt="@virt-list/react"></a>
  <a href="https://www.npmjs.com/package/@virt-list/react-legacy"><img src="https://img.shields.io/npm/v/@virt-list/react-legacy.svg?sanitize=true" alt="@virt-list/react-legacy"></a>
</p>

高性能虚拟滚动引擎：**列表 / 网格 / 树形**三种形态，Vue 3、Vue 2、React 18+、React 16-17、
原生 JS 五套实现共享同一份纯 JS 内核。

为流式对话而生的虚拟滚动。行高由内容决定，不需要预先声明。

- **常数级滚动开销** — 稳态滚动从上一帧位置增量推进，数据量从一万涨到三十万，单帧成本不变
- **真正的不定高** — ResizeObserver 实测尺寸，配合分块索引让任意跳转保持 O(√n)
- **偏移量归 JS 掌管** — 位置与 DOM 永远同帧提交，且不受浏览器 33.5M px 的高度上限约束
- **AI 对话就绪** — 流式跟随、脱离与恢复、跨虚拟化整段复制、万级历史双向加载
- **零运行时依赖** — 全量 TypeScript，VirtList 完整链路 gzip 后 6.1KB

本项目基于 [vue-virt-list](https://github.com/kolarorz/vue-virt-list) 改造而来：原实现的算法与 Vue
响应式深度耦合，这里把它拆成**纯 JS 内核 + 原生 DOM 层 + 轻量框架绑定层**三段，
于是同一套经过验证的算法可以跨框架复用，core 层也能脱离浏览器做单元测试。

📖 [文档站](https://kolarorz.github.io/virt-list/) · 🏗 [架构设计](./ARCHITECTURE.md) · 📦 [发布流程](./PUBLISHING.md) · 📋 [变更日志](./CHANGELOG.md)

## 适合什么场景

- **流式 AI 对话**：消息动态增高、贴底跟随、向上阅读时脱离跟随，以及历史双向加载。
- **长列表与动态内容**：日志、消息流、不定高卡片；通过虚拟化只挂载渲染窗口内的内容。
- **树形与网格**：在 Vue、React 与原生 JavaScript 中复用同一套虚拟滚动内核。

本项目使用 **JavaScript 管理位移与自绘滚动条**。需要原生滚动行为的 Vue 项目，优先评估
[vue-virt-list](https://github.com/kolarorz/vue-virt-list)；需要合并单元格、固定列、筛选与编辑等完整表格能力，查看
[virt-table](https://github.com/kolarorz/virt-table)。[三个项目如何选择](https://kolarorz.github.io/vue-virt-list/guide/project-selection)。

## 包总览

| 包 | 用途 | peer 依赖 |
| --- | --- | --- |
| [`@virt-list/core`](./packages/core) | 框架无关的算法内核，不碰 DOM | 无 |
| [`@virt-list/vanilla`](./packages/vanilla) | 原生 DOM 实现，无框架可直接用 | 无 |
| [`@virt-list/vue`](./packages/vue) | Vue 3 组件 | `vue >= 3` |
| [`@virt-list/vue2`](./packages/vue2) | Vue 2 组件 | `vue ^2.6 \|\| ^2.7`（2.6 需 `@vue/composition-api`） |
| [`@virt-list/react`](./packages/react) | React 18+ 组件 | `react` / `react-dom >= 18` |
| [`@virt-list/react-legacy`](./packages/react-legacy) | React 16-17 组件 | `react` / `react-dom >= 16.8 < 18` |

四个框架包的公开 API **完全一致**（`VirtList` / `VirtGrid` / `VirtTree` / `useVirtList`，
props、事件、ref 方法同名同签名），差别只在内部的节点挂载方式。选包只看你的框架版本。

## 快速开始

装框架对应的那一个包，再引一次样式（不引也能滚，但看不到滚动条）：

```sh
pnpm add @virt-list/vue        # 或 vue2 / react / react-legacy / vanilla
```

样式随你装的那个包一起交付，引 `<包名>/style.css` 即可，一份里同时含滚动条与树。
组件的 JS 里刻意不 `import` 它——那会让整个包在纯 Node 环境（SSR）下 import 不了。

<details open>
<summary><b>Vue 3</b></summary>

```vue
<template>
  <!-- 容器必须有确定的高度，组件不会自己撑开 -->
  <div style="width: 500px; height: 400px">
    <VirtList :list="list" itemKey="id" :estimatedSize="40">
      <template #default="{ itemData }">
        <div>{{ itemData.text }}</div>
      </template>
    </VirtList>
  </div>
</template>

<script setup>
import { VirtList } from '@virt-list/vue';
import '@virt-list/vue/style.css';

const list = Array.from({ length: 100000 }, (_, i) => ({ id: i, text: `item-${i}` }));
</script>
```

</details>

<details>
<summary><b>React 18+</b></summary>

```tsx
import { VirtList } from '@virt-list/react';
import '@virt-list/react/style.css';

const list = Array.from({ length: 100000 }, (_, i) => ({ id: i, text: `item-${i}` }));

export default function App() {
  return (
    <div style={{ width: 500, height: 400 }}>
      <VirtList list={list} itemKey='id' estimatedSize={40}>
        {({ itemData }) => <div>{itemData.text}</div>}
      </VirtList>
    </div>
  );
}
```

</details>

<details>
<summary><b>原生 JS</b></summary>

```js
import { VirtList } from '@virt-list/vanilla';
import '@virt-list/vanilla/style.css';

// 第一个参数是容器元素，不是 options 里的字段
new VirtList(document.getElementById('list'), {
  list: Array.from({ length: 100000 }, (_, i) => ({ id: i, text: `item-${i}` })),
  itemKey: 'id',
  estimatedSize: 40,
  renderItem: (item, index, el) => {
    el.textContent = item.text;
  },
});
```

</details>

Vue 2 与 React 16-17 的用法与上面同名包一致，只改导入来源，见各包 README。

## 与常见虚拟列表的不同：偏移量归 JS 掌管

容器是 `overflow: hidden`，内容靠 `transform` 移动，滚动条自绘，滚轮 / 键盘 / 触摸全部由库接管。
**没有原生滚动这条路**——需要原生滚动条的项目请用旧库 [vue-virt-list](https://github.com/kolarorz/vue-virt-list)。

换来的是两件原生滚动做不到的事：

- **位置与 DOM 同帧提交。** 原生滚动下浏览器先在合成器线程把画面滚过去，`scroll` 事件之后才异步
  回送主线程，快速拖拽时那一帧的视口正对着还没有 DOM 的位置——这是时序问题，优化渲染速度消不掉。
- **超大列表不再有天花板。** 浏览器对元素高度与 transform 位移有同一量级的上限（Chrome 实测约
  33.5M px）。让每一段只带自己的残差 `该段文档位置 - offset` 之后，任何单个 transform 都碰不到
  上限：100 万项 × 100px 实测 8 个采样点定位误差全为 0px。

代价也要摊开说：

- 读写 `el.scrollTop` 的代码全部失效，容器的 `scrollTop` 恒为 0，改用 `getOffset()` / `scrollToOffset()`
- `scroll` 事件的载荷不是 DOM `Event` 而是普通对象 `VirtScrollEvent`（多了 `source` 字段，
  能确定地区分用户滚动 / 程序定位 / 内部补偿）
- 拖选文本到容器边缘不再自动滚动

详见 [ARCHITECTURE.md](./ARCHITECTURE.md) 与文档站的「滚动是怎么工作的」。

## AI 场景

AI 对话把虚拟滚动最难的三件事压在了一起：内容持续变化、高度完全不可预知、
用户和程序同时在滚动。文档站的「AI 场景」一节给出了成套的解法与在线 demo：

| 能力 | 说明 |
| ---- | ---- |
| [流式输出与贴底跟随](docs/_shared/ai-streaming.md) | 逐 token 输出时视口稳定跟随，用户上滑立即脱离、滚回底部自动恢复 |
| [整段复制](docs/_shared/ai-copy.md) | 选区跨越未渲染区域时，中间没有 DOM 的项从数据补齐——补上虚拟滚动的一处正确性缺口 |
| [搜索与引用跳转](docs/_shared/ai-search.md) | 在数据里搜索（命中未渲染项），跳到任意一条并高亮 |
| [会话历史](docs/_shared/ai-history.md) | 万级历史的向上加载、未读计数、会话切换 |
| [Agent 执行流](docs/_shared/ai-trace.md) | 高频追加的日志视图、可折叠的工具调用 |
| [语义滚动条](docs/_shared/ai-outline.md) | 把长列表的结构画成导航条，点一下跳到那一段（不需要模型） |

五套实现（Vanilla / Vue 3 / Vue 2 / React 18+ / React 16-17）均已覆盖。
在线 demo 需要本地跑起来看：`pnpm dev` 之后打开文档站的「AI 场景」。

## 本地开发

```sh
pnpm i
pnpm dev        # 文档站 + 五个 demo 微应用一起起
```

文档站在 <http://localhost:7800>，demo 以 qiankun 子应用的形式嵌在页面里。
单独调某一个也行：`pnpm dev:docs` / `pnpm dev:vanilla` / `dev:vue` / `dev:vue2` / `dev:react` / `dev:react-legacy`。

| 服务 | 端口 |
| --- | --- |
| VitePress 文档站 | 7800 |
| Vanilla demo | 7801 |
| Vue 3 demo | 7802 |
| React 18+ demo | 7803 |
| Vue 2 demo | 7804 |
| React 16-17 demo | 7805 |

## 构建与测试

```sh
pnpm build:packages    # 按依赖顺序构建：core → vanilla → 四个框架包（并行）
pnpm build             # 构建文档站（含五个 demo 微应用）
pnpm test              # Vitest 全量用例（jsdom 环境）
pnpm check:esm         # 用 Node 直接 import 构建产物，拦住 ESM 扩展名 / css 入口这类回归
pnpm test:coverage     # 带覆盖率阈值，CI 用的就是这条
pnpm bench             # core 层基准测试
pnpm typecheck         # 文档站 + 四个 TS demo 应用（vanilla demo 是纯 JS，不在其中）
pnpm release:dry       # 演练发布流程，不真正发包
```

发布流程见 [PUBLISHING.md](./PUBLISHING.md)。

## 目录结构

```text
.
├─ packages/                 # 发布到 npm 的六个包
│  ├─ core/                  # @virt-list/core — 算法内核，零依赖、不碰 DOM
│  │  └─ src/
│  │     ├─ VirtListCore.ts       # 可视区间、尺寸索引、滚动定位、贴底跟随
│  │     ├─ ChunkedSizeIndex.ts   # 分块前缀和，不定高下的 O(√n) 定位
│  │     ├─ ListLoader.ts         # 分页 / 无限加载的状态机
│  │     ├─ SelectionCopy.ts      # 跨未渲染区域的选区复制
│  │     ├─ StreamBuffer.ts       # 流式输出的帧内合并
│  │     └─ types.ts              # 公共类型与默认值
│  ├─ vanilla/               # @virt-list/vanilla — 原生 DOM 层
│  │  └─ src/
│  │     ├─ VirtList.ts / VirtGrid.ts / tree/    # 三种组件的 DOM 实现
│  │     ├─ scrollbar/            # 自绘滚动条：几何换算、输入接管、样式
│  │     └─ utils.ts              # style / class / attrs 的归一化
│  ├─ vue/ vue2/             # Vue 3 / Vue 2 绑定层（vue2 的挂载适配在 compat.ts）
│  └─ react/ react-legacy/   # React 18+ / React 16-17 绑定层（同上）
├─ docs/                     # VitePress 文档站 + playground 宿主
│  ├─ _shared/               # 跨框架共用的 md 片段，各框架页面 @include 进去
│  ├─ vanilla/ vue/ vue2/ react/ react-legacy/   # 每框架的 guide / examples / api / ai
│  └─ apps/                  # 五个 demo 微应用（qiankun 子应用），别名直连包源码
├─ scripts/                  # release.mjs 发布脚本、gen-llms-txt.mjs
├─ ARCHITECTURE.md           # 分层架构、多版本包策略与滚动模型的技术决策
├─ PUBLISHING.md             # 版本管理与发布流程
└─ vitest.config.ts          # 测试配置（路径别名指向各包 src）
```

各包的公开导出清单由 `packages/*/__tests__/PublicApi.test.ts` 锁住：漏导出不会让编译失败，
只会在下游用到时才炸，所以那份用例是清单的唯一事实来源。

## 许可

MIT
