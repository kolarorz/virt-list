---
description: 原生 JavaScript 流式聊天虚拟列表示例：动态消息高度、自动贴底、向上阅读时停止跟随，以及回到底部恢复跟随。
---

# 流式输出与贴底跟随

AI 回答是逐 token 流入的：**同一条消息**的高度在几秒内会变几十次。
这一节讲的是在这种持续变化中，视口该怎么动、以及什么时候不该动。

<PlaygroundHost framework="vanilla" example-id="ai-streaming" />

::: tip 对照着试
发送一个问题看跟随；生成中向上滚，状态行会变成「已脱离跟随」；
再手动滚回底部，跟随恢复。这三个动作正是下面表格里的三行。
:::

<!--@include: ../../_shared/ai-streaming.md-->

## Vanilla 写法

DOM 层对**已在渲染池中的 key 不会重新执行 `renderItem`**（只调整位置），
所以流式更新要自己找到那一项、就地把变化画上去。富消息的做法是**只重建最后一个块**：

```js
const container = document.querySelector('#list');

/** 给每个块的元素写上 data-block，就是为了这里能定位到它 */
function syncLastBlock(msg) {
  const body = container.querySelector(`[data-id="${msg.id}"] .agent-body`);
  // 找不到说明这条此刻在视口外：数据已经是全文，滚回来时 renderItem 会重建
  if (!body) return;

  const i = msg.blocks.length - 1;
  const fresh = renderBlock(msg.blocks[i], i);
  const old = body.querySelector(`[data-block="${i}"]`);
  if (old) body.replaceChild(fresh, old);
  else body.appendChild(fresh);      // 新块入场，一次高度跳变
}

function appendChunk(msg, chunk) {
  // 1. 数据里写全文：项滚出视口被回收后，滚回来时按它重新渲染
  appendToBlock(msg.blocks[msg.blocks.length - 1], chunk);

  // 2. 就地重画那一个块。不调 setList：列表结构没变，
  //    高度变化由 ResizeObserver 自动上报，贴底跟随随之生效
  syncLastBlock(msg);
}
```

`data-id` 是 DOM 层给每一项加的属性，值就是该项的 `itemKey`，
可以直接用它定位到具体某一项的元素。

::: tip 这里的取舍
框架版能做到只更新一个文本节点，手写 DOM 退到「一个块」——因为一片新文本可能让
Markdown 多出一行，逐节点比对不值得。换来的是完全不需要 diff 机制，
而重建范围仍然局限在一个块内：消息的其他块、列表里其他项一个节点都不动。
:::

完整配置：

```js
const vl = new VirtList(
  container,
  {
    list,
    itemKey: 'id',
    estimatedSize: 200,
    initialPosition: 'bottom',
    stickyBottom: true,
    hasMoreBottom: false,
    loadMore: async (direction) => {
      if (direction !== 'top') return false;
      const older = await fetchHistory();
      list = older.concat(list);
      vl.setList(list);
      return hasMore;
    },
    // 读的是数据里的 blocks，因此离屏期间生成的内容、展开过的工具卡都不会丢
    renderItem: (item) => createAgentMessage(item),
  },
  {
    // atEnd 用来决定「回到底部」按钮要不要亮
    scroll: (e) => { atBottom = e.atEnd; },
    // pendingNew 是用户翻历史期间新到的消息数，用来渲染未读角标
    loadStateChange: (state) => { pending = state.pendingNew; },
  },
);
```

示例的完整源码可以在上面的 demo 里展开查看。
