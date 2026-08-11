# 搜索与引用跳转

会话内搜索、RAG 引用跳转、「定位到这条消息」都是同一件事：
**在数据里找到目标，再把视口移到它那儿**。

<PlaygroundHost framework="vanilla" example-id="ai-search" />

::: tip 试试
搜「不定高」或「滚动」，用「上一个 / 下一个」在命中之间跳。
状态行里的命中数是**数据层**的总数，包含那些还没渲染的项——
这正是浏览器查找做不到的部分。
:::

<!--@include: ../../_shared/ai-search.md-->

## Vanilla 写法

```js
// 1. 在数据里找命中位置
const hits = list.reduce((acc, item, i) => {
  if (item.text.includes(keyword)) acc.push(i);
  return acc;
}, []);

// 2. 跳到某个命中项
vl.scrollToIndex(hits[cursor], { align: 'start' });

// 3. 让高亮生效
vl.refreshItems();
```

## 第三步为什么必要

DOM 层对**已在渲染池中的 key 不会重新执行 `renderItem`**，只调整位置——
这是它的核心优化。代价是「数据变了但 key 没变」时得显式说一声，
搜索高亮正是这类：关键词变了，可见项的 `<mark>` 需要重新渲染。

```js
vl.refreshItems();          // 重建全部可见项
vl.refreshItems([id1, id2]); // 只重建这几项，其余 DOM 原样保留
```

**跳转时用后者**。「上一个 / 下一个」只改变了哪一项是「当前命中」，
也就是最多两项的样式，没必要为此重建整屏：

```js
vl.refreshItems([list[prevHit].id, list[nextHit].id]);
```

传进去的 key 不在可见范围内时是空操作——那些项本来就没有 DOM，
等它们滚进视口自然会按新数据渲染，所以不必自己判断谁还渲染着。

::: warning 别在滚动或流式路径上调它
不带参数的 `refreshItems()` 会让当前可见的项全部重建，适合「关键词变了」
这种低频动作。逐 token 更新那种场景应该直接改对应节点的内容
（见 [流式输出](./streaming)）。

Vue / React 版本完全不需要这一步：那两层是响应式的，关键词变了对应的渲染函数
会自己重新执行。
:::

## 渲染高亮

`renderItem` 的第二个参数就是该项在完整列表里的索引，可以直接拿它和当前命中比对：

```js
renderItem: (item, index) => {
  const isCurrent = cursor >= 0 && hits[cursor] === index;
  // 命中的词包成 <mark>，当前命中额外加一个 class
  // ...
}
```
