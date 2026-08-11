# Agent 执行流

Agent 的执行轨迹——思考、工具调用、命令输出、报错——是一类和聊天不同的列表：
它的节奏由机器决定，一秒十几行很常见，而且随时可能一次性灌进上万行。

<PlaygroundHost framework="vanilla" example-id="ai-trace" />

::: tip 值得试的四件事
1. 点「开始执行」，日志持续追加，视口贴底跟随；
2. 执行中**向上滚**去看某段历史——下面刷得再快也不会把视口拽走；
3. 点「灌入 1 万行」，看状态行里的追加耗时；
4. 点「展开全部工具调用」——几百行同时从一行变成九行，这是最容易露白的时刻。
:::

<!--@include: ../../_shared/ai-trace.md-->

## Vanilla 写法

```js
const vl = new VirtList(
  container,
  {
    list,
    itemKey: 'id',
    estimatedSize: 24,
    initialPosition: 'bottom',
    stickyBottom: true,
    hasMoreTop: false,
    hasMoreBottom: false,
    copyText: (item) =>
      `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}`,
    renderItem: (item) => { /* ... */ },
  },
  { scroll: (e) => { atBottom = e.atEnd; } },
);

// 批量追加
function append(lines) {
  list = list.concat(lines);
  vl.setList(list);
}
```

折叠单行时直接改那一行的 DOM，不动列表：

```js
function toggleDetail(item, rowEl) {
  item.expanded = !item.expanded;
  rowEl.querySelector('.detail').hidden = !item.expanded;
}
```

需要一次改很多行（「展开全部」）时才用 `refreshItems()`——那是低频动作，
重建一次可见项可以接受。只改少数几行时给它传 key（`refreshItems([id1, id2])`），
其余项的 DOM 就能原样保留。

## 切换任务

```js
vl.reset();
vl.setList(nextLines);
vl.scrollToBottom();
```
