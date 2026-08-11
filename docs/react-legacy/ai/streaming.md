# 流式输出与贴底跟随

AI 回答是逐 token 流入的：**同一条消息**的高度在几秒内会变几十次。
这一节讲的是在这种持续变化中，视口该怎么动、以及什么时候不该动。

<PlaygroundHost framework="react-legacy" example-id="ai-streaming" />

::: tip 对照着试
点「提问」看跟随；生成中向上滚，状态行会变成「已脱离跟随」；
再手动滚回底部，跟随恢复。这三个动作正是下面表格里的三行。
:::

<!--@include: ../../_shared/ai-streaming.md-->

## React 16-17 写法

React 的不可变更新在这里有个真实代价：若每个 token 都去改 `list`，
就得重建整个数组，开销随消息数增长。

把正在生成的那条文本单独放一个 state，`list` 的引用保持不动：

```tsx
const [list, setList] = useState<AiMessage[]>([]);
/** 正在生成的那条消息的文本，与 list 分开存 */
const [streamText, setStreamText] = useState('');
const [streamingId, setStreamingId] = useState<number | null>(null);
/** 定时器闭包里读不到最新 state，用 ref 兜住 */
const textRef = useRef('');

function onChunk(chunk: string) {
  textRef.current += chunk;
  setStreamText(textRef.current);   // 每帧只有一个字符串在变
}

function onDone() {
  // 结束时才写回 list，这一次才需要重建数组
  setList((prev) =>
    prev.map((it) =>
      it.id === streamingId ? { ...it, text: textRef.current, streaming: false } : it,
    ),
  );
  setStreamingId(null);
  setStreamText('');
}
```

渲染时对正在生成的那条读 `streamText`，其余读数据里的定稿：

```tsx
<VirtList<AiMessage>
  ref={vlRef}
  list={list}
  itemKey="id"
  estimatedSize={80}
  initialPosition="bottom"
  stickyBottom
  hasMoreBottom={false}
  onScroll={(e) => setAtBottom(e.atEnd)}
  onLoadStateChange={(s) => setPendingNew(s.pendingNew)}
>
  {({ itemData }) => {
    const streaming = itemData.id === streamingId;
    return (
      <div className="bubble">
        <span>{streaming ? streamText : itemData.text}</span>
        {streaming && <span className="caret" />}
      </div>
    );
  }}
</VirtList>
```

::: warning 别用 ref 驱动界面
`streamingId` 之类要影响渲染的值必须是 state。放在 ref 里改不会触发重渲染，
按钮的禁用状态、光标的显示都会僵在旧值上。
:::

`onScroll` 的载荷里有 `atEnd`，用它决定「回到底部」按钮要不要亮。
