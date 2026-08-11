# @virt-list/core

[![npm](https://img.shields.io/npm/v/@virt-list/core.svg?sanitize=true)](https://www.npmjs.com/package/@virt-list/core)

virt-list 的算法内核：可视区间计算、不定高尺寸索引、滚动定位、分页加载状态机。
**零依赖，不碰 DOM**——所有浏览器 API 调用都在上层。

> 大多数人不需要直接用这个包。要现成的组件请用 [`@virt-list/vanilla`](https://www.npmjs.com/package/@virt-list/vanilla)
> 或框架包（[vue](https://www.npmjs.com/package/@virt-list/vue) /
> [vue2](https://www.npmjs.com/package/@virt-list/vue2) /
> [react](https://www.npmjs.com/package/@virt-list/react) /
> [react-legacy](https://www.npmjs.com/package/@virt-list/react-legacy)）。
> 直接用 core 的场合是：DOM 完全自己画（canvas、表格、别的框架的适配层），只借它算
> 「该渲染哪些项、摆在哪里」。

## 安装

```sh
pnpm add @virt-list/core
```

## 最小示例

内核只输出「渲染哪些项」和「偏移量是多少」，把这两件事画成 DOM 是你的活：

```ts
import { VirtListCore } from '@virt-list/core';

const list = Array.from({ length: 100000 }, (_, i) => ({ id: i, text: `item-${i}` }));

let leadingSize = 0;

const core = new VirtListCore(
  { list, itemKey: 'id', estimatedSize: 40 },
  {
    // 渲染区间变化：把 renderList 画出来
    update(renderList, state) {
      leadingSize = state.leadingSize;
      draw(renderList);
    },
    // 偏移量生效，同步触发。在这里移动内容，就与上面的 DOM 改动落在同一帧。
    // 渲染块只带自己的残差「文档位置 - offset」，用了插槽的话再加上插槽尺寸
    offsetChange(offset) {
      itemsEl.style.transform = `translateY(${leadingSize - offset}px)`;
    },
  },
);

// 交出视口元素：内核用它测 clientSize，并据此算可视区间
core.bindDOM(clientEl);

// 不定高：给每项元素带上 data-id="<itemKey 的值>" 交给内核观测，实测尺寸自动回填
core.resizeObserver?.observe(itemEl);
// 不用 ResizeObserver 的话，自己量完手工写入
core.setItemSize('42', 88);

// 用户输入（滚轮 / 键盘 / 触摸）由你接管，然后上报一个新偏移量
core.scrollFromUser(core.getOffset() + 100);
```

`estimatedSize` 必填：它是首屏布局与未测量项的占位依据，不定高时越接近实测值抖动越少。

## 导出

| 导出 | 说明 |
| --- | --- |
| `VirtListCore` | 内核类，`new VirtListCore(options, events?)` |
| `ListLoader` | 分页 / 无限加载的状态机（内核内部已用，单独透出便于复用） |
| `buildCopyText` | 跨未渲染区域拼接选区文本，`copyText` 能力的底层 |
| `createStreamBuffer` | 流式输出的帧内合并，与虚拟列表无耦合的纯工具 |
| `DEFAULT_OPTIONS` | 全部可选配置项的默认值 |
| 类型 | `VirtListOptions` / `VirtListEvents` / `VirtListDOMOptions` / `ListState` / `SlotSize` / `LoadState` / `VirtScrollEvent` / `VirtScrollOptions` / `VirtScrollSource` 等 |

## 常用 API

```ts
// 状态与几何
getState() / getOffset() / getMaxOffset() / getTotalSize() / getSlotsTotalSize()
getItemSize(key) / setItemSize(key, size) / deleteItemSize(key)
getItemPosByIndex(index) / getIndexByOffset(offset)

// 滚动
scrollToOffset(offset, opts?) / scrollToIndex(index, opts?) / scrollIntoView(index, opts?)
scrollToTop(opts?) / scrollToBottom(opts?) / cancelScroll()
scrollFromUser(offset)      // 上报用户发起的滚动，会触发 toTop / toBottom 与自动续拉

// 生命周期与接线
bindDOM(clientEl) / observeSlotEl(el) / setSlotSize(id, size) / resume() / destroy()
updateOptions(partial) / forceUpdate() / reset() / manualRender(begin, end)
```

事件：`update` / `offsetChange` / `scroll` / `toTop` / `toBottom` / `itemResize` / `loadStateChange`。

`update` 与 `offsetChange` 的分工是这套设计的关键：前者说「渲染哪些项」，后者说「内容移到哪」，
两者都是**同步**回调，于是位置与 DOM 永远在同一帧提交。

## 用之前需要知道的

- **偏移量归 JS 掌管**：内核不读写任何元素的 `scrollTop`，滚动位置只存在于它自己的账本里。
- **`bindDOM` 之前 `clientSize` 是 0**，可视区间算不出来，`update` 给到的渲染列表也就只有一项。
- **内核自己持有 `ResizeObserver`**，按元素的 `dataset.id` 认项：插槽用固定 id
  （`client` / `header` / `footer` / `stickyHeader` / `stickyFooter`），列表项用 `itemKey` 的值。
- **`state.leadingSize` 不是占位元素的高度**，是 `renderBegin` 之前所有项的累计尺寸——
  这个库没有占位元素，所有偏移都由 transform 表达。

## 文档

- 文档站：<https://kolarorz.github.io/virt-list/>
- 架构与技术决策：[ARCHITECTURE.md](https://github.com/kolarorz/virt-list/blob/master/ARCHITECTURE.md)
- GitHub：<https://github.com/kolarorz/virt-list>

## 许可

MIT
