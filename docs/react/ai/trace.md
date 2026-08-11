# Agent 执行流

Agent 的执行轨迹——思考、工具调用、命令输出、报错——是一类和聊天不同的列表：
它的节奏由机器决定，一秒十几行很常见，而且随时可能一次性灌进上万行。

<PlaygroundHost framework="react" example-id="ai-trace" />

::: tip 值得试的四件事
1. 点「开始执行」，日志持续追加，视口贴底跟随；
2. 执行中**向上滚**去看某段历史——下面刷得再快也不会把视口拽走；
3. 点「灌入 1 万行」，看状态行里的追加耗时；
4. 点「展开全部工具调用」——几百行同时从一行变成九行，这是最容易露白的时刻。
:::

<!--@include: ../../_shared/ai-trace.md-->

## React 写法

展开状态用一个 `Set<id>` 单独存，而不是写进 `list` 里的对象——
否则为了一个布尔量就要重建整个数组：

```tsx
const [list, setList] = useState<TraceLine[]>([]);
/** 展开的行 id 集合 */
const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

/** 批量追加：一次 setState 提交一批，而不是每行一次 */
const append = useCallback((count: number) => {
  const batch = Array.from({ length: count }, () => createTraceLine(seqRef.current++));
  setList((prev) => prev.concat(batch));
}, []);

const toggle = useCallback((id: number) => {
  setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}, []);

return (
  <VirtList<TraceLine>
    ref={vlRef}
    list={list}
    itemKey="id"
    estimatedSize={24}
    initialPosition="bottom"
    stickyBottom
    hasMoreTop={false}
    hasMoreBottom={false}
    copyText={copyText}
    onScroll={(e) => setAtBottom(e.atEnd)}
  >
    {({ itemData }) => {
      const isOpen = expanded.has(itemData.id);
      return (
        <div className={`line kind-${itemData.kind}`}>
          <div onClick={itemData.detail ? () => toggle(itemData.id) : undefined}>
            {itemData.text}
          </div>
          {itemData.detail && isOpen && <pre>{itemData.detail}</pre>}
        </div>
      );
    }}
  </VirtList>
);
```

::: tip 用 Set 而不是数组
判断某一行是否展开是渲染路径上的高频操作，`Set.has` 是 O(1)，
数组的 `includes` 在几万行的日志里会变成瓶颈。
:::
