# 会话历史

一个长期使用的 AI 对话，历史消息很容易累积到几万条。这一节讲三件事：
往上翻历史、翻历史期间收到新消息、以及在会话之间切换。

基础的 `loadMore` 模型见 [分页与无限加载](../guide/load-more)，
这里只讲对话场景特有的部分。

下面这个示例就带着向上加载：滚到顶部会拉取更早的对话，
生成过程中向上翻历史时收到的新消息会记成未读数。

<PlaygroundHost framework="react" example-id="ai-streaming" />

<!--@include: ../../_shared/ai-history.md-->

## React 写法

```tsx
const vlRef = useRef<VirtListRef<Message>>(null);
const [list, setList] = useState<Message[]>([]);
const [pendingNew, setPendingNew] = useState(0);

const onLoadMore = useCallback(async (direction: LoadDirection) => {
  if (direction !== 'top') return false;
  const older = await fetchHistory();
  setList((prev) => older.concat(prev));
  return older.length > 0;
}, []);

function switchConversation(messages: Message[]) {
  vlRef.current?.reset();        // 清空尺寸缓存与滚动状态
  setList(messages);
  vlRef.current?.scrollToBottom();
}

return (
  <VirtList<Message>
    ref={vlRef}
    list={list}
    itemKey="id"
    estimatedSize={80}
    initialPosition="bottom"
    stickyBottom
    hasMoreBottom={false}
    loadMore={onLoadMore}
    onLoadStateChange={(s) => setPendingNew(s.pendingNew)}
  >
    {({ itemData }) => <div>{itemData.text}</div>}
  </VirtList>
);
```

::: tip 加载回调里读最新的 list
`loadMore` 是在组件内部被调用的，闭包里拿到的可能是旧的 `list`。
用 `setList((prev) => ...)` 的函数式更新，或者用一个 ref 镜像最新值。
:::
