---
description: React 16–17 流式聊天虚拟列表示例：动态消息高度、自动贴底、向上阅读时停止跟随，以及回到底部恢复跟随。
---

# 流式输出与贴底跟随

AI 回答是逐 token 流入的：**同一条消息**的高度在几秒内会变几十次。
这一节讲的是在这种持续变化中，视口该怎么动、以及什么时候不该动。

<PlaygroundHost framework="react-legacy" example-id="ai-streaming" />

::: tip 对照着试
发送一个问题看跟随；生成中向上滚，状态行会变成「已脱离跟随」；
再手动滚回底部，跟随恢复。这三个动作正是下面表格里的三行。
:::

<!--@include: ../../_shared/ai-streaming.md-->

## React 16-17 写法

React 里改数据要换一个新数组，这在流式输出下有个真实代价：若每个 token 都去改 `list`，
就得重建整个数组，开销随消息数增长。

把正在生成的内容整个放在 `list` **之外**，`list` 的引用全程不动：

```tsx
const [list, setList] = useState<AiMessage[]>([]);
/**
 * 生成中那条消息的块。
 *
 * 放在 list 外面是关键：每帧 setList 就要重建整个数组，开销随消息数增长，
 * 而列表结构压根没变。放在这里，虚拟列表完全不需要重算区间与尺寸索引。
 */
const [liveBlocks, setLiveBlocks] = useState<AgentBlock[]>([]);
const [streamingId, setStreamingId] = useState<number | null>(null);
/** 定时器闭包里读不到最新 state，块数组用 ref 兜住 */
const blocksRef = useRef<AgentBlock[]>([]);

/** 块内追加：只换最后一个块的引用，前面的块 memo 会整个跳过 */
function onChunk(chunk: string) {
  const last = blocksRef.current[blocksRef.current.length - 1]!;
  blocksRef.current = [...blocksRef.current.slice(0, -1), blockWithChunk(last, chunk)];
  setLiveBlocks(blocksRef.current);
}

/** 插入新块：一次回答里只有几次，动的是数组结构 */
function onBlock(block: AgentBlock) {
  blocksRef.current = [...blocksRef.current, block];
  setLiveBlocks(blocksRef.current);
}

function onDone() {
  // 结束时才写回 list，这一次才需要重建数组
  setList((prev) =>
    prev.map((it) =>
      it.id === streamingId ? { ...it, blocks: blocksRef.current, streaming: false } : it,
    ),
  );
  setStreamingId(null);
}
```

渲染时把生成中的块拼到那条消息上，其余读数据里的定稿：

```tsx
<VirtList<AiMessage>
  ref={vlRef}
  list={list}
  itemKey="id"
  estimatedSize={200}
  initialPosition="bottom"
  stickyBottom
  hasMoreBottom={false}
  onScroll={(e) => setAtBottom(e.atEnd)}
  onLoadStateChange={(s) => setPendingNew(s.pendingNew)}
>
  {({ itemData }) => {
    const streaming = itemData.id === streamingId;
    return (
      <AgentMessage
        message={streaming ? { ...itemData, blocks: liveBlocks } : itemData}
        streaming={streaming}
      />
    );
  }}
</VirtList>
```

::: tip memo 在这里不是可选的优化
渲染块的组件要用 `memo` 包一层。流式期间这条消息每帧都会重渲染，而 memo 让
「引用没变的块」整个跳过——最终只有最后一个块在动。这也是上面那些
`[...slice(0, -1), 换掉最后一个]` 写法的理由：原地改属性在 React 里看不见。
:::

::: tip 项内的状态别放组件里
工具卡的展开、消息的点赞，要放在一个外部集合（`Set`）里，按 `消息 id:块下标` 索引。
项滚出视口会被卸载，组件内部的 `useState` 会跟着消失，滚回来就复位了。
用集合还有一个好处：它的引用只在真的展开/收起时才变，流式期间保持不变，memo 挡得住。
:::

::: warning 别用 ref 驱动界面
`streamingId` 之类要影响渲染的值必须是 state。放在 ref 里改不会触发重渲染，
按钮的禁用状态、光标的显示都会僵在旧值上。
:::

`onScroll` 的载荷里有 `atEnd`，用它决定「回到底部」按钮要不要亮。
