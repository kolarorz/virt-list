# 会话历史

一个长期使用的 AI 对话，历史消息很容易累积到几万条。这一节讲三件事：
往上翻历史、翻历史期间收到新消息、以及在会话之间切换。

基础的 `loadMore` 模型见 [分页与无限加载](../guide/load-more)，
这里只讲对话场景特有的部分。

下面这个示例就带着向上加载：滚到顶部会拉取更早的对话，
生成过程中向上翻历史时收到的新消息会记成未读数。

<PlaygroundHost framework="vanilla" example-id="ai-streaming" />

<!--@include: ../../_shared/ai-history.md-->

## Vanilla 写法

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
      const older = await fetchHistory(cursor);
      list = older.concat(list);
      vl.setList(list);
      // 返回该方向是否还有更多；返回 false 后不再触发
      return older.length > 0;
    },
  },
  {
    loadStateChange: (state) => {
      jumpBtn.textContent =
        state.pendingNew > 0 ? `${state.pendingNew} 条新消息` : '回到底部';
    },
  },
);

function switchConversation(messages) {
  vl.reset();            // 清空尺寸缓存与滚动状态
  vl.setList(messages);
  vl.scrollToBottom();   // 新会话同样从最新消息开始看
}
```
