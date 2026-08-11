# 流式输出与贴底跟随

AI 回答是逐 token 流入的：**同一条消息**的高度在几秒内会变几十次。
这一节讲的是在这种持续变化中，视口该怎么动、以及什么时候不该动。

<PlaygroundHost framework="vanilla" example-id="ai-streaming" />

::: tip 对照着试
点「提问」看跟随；生成中向上滚，状态行会变成「已脱离跟随」；
再手动滚回底部，跟随恢复。这三个动作正是下面表格里的三行。
:::

<!--@include: ../../_shared/ai-streaming.md-->

## Vanilla 写法

DOM 层对**已在渲染池中的 key 不会重新执行 `renderItem`**（只调整位置），
所以流式更新必须直接改那个文本节点——这恰好也是开销最小的做法：

```js
const container = document.querySelector('#list');

function appendChunk(msg, chunk) {
  // 1. 数据里写全文：项滚出视口被回收后，滚回来时按它重新渲染
  msg.text += chunk;

  // 2. DOM 里就地更新那一个节点。不调 setList：列表结构没变，
  //    高度变化由 ResizeObserver 自动上报，贴底跟随随之生效
  const el = container.querySelector(`[data-id="${msg.id}"] .msg-text`);
  if (el) el.textContent = msg.text;
}
```

`data-id` 是 DOM 层给每一项加的属性，值就是该项的 `itemKey`，
可以直接用它定位到具体某一项的元素。

完整配置：

```js
const vl = new VirtList(
  container,
  {
    list,
    itemKey: 'id',
    estimatedSize: 80,
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
    renderItem: (item) => {
      const row = document.createElement('div');
      const text = document.createElement('span');
      text.className = 'msg-text';
      // 读的是数据里的全文，因此离屏期间生成的内容不会丢
      text.textContent = item.text;
      row.appendChild(text);
      return row;
    },
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
