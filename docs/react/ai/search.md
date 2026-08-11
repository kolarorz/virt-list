# 搜索与引用跳转

会话内搜索、RAG 引用跳转、「定位到这条消息」都是同一件事：
**在数据里找到目标，再把视口移到它那儿**。

<PlaygroundHost framework="react" example-id="ai-search" />

::: tip 试试
搜「不定高」或「滚动」，用「上一个 / 下一个」在命中之间跳。
状态行里的命中数是**数据层**的总数，包含那些还没渲染的项——
这正是浏览器查找做不到的部分。
:::

<!--@include: ../../_shared/ai-search.md-->

## React 写法

命中列表用 `useMemo`，高亮跟着 `keyword` 走——渲染函数重新执行时高亮自然更新，
不需要手动通知组件：

```tsx
const [keyword, setKeyword] = useState('');
const [cursor, setCursor] = useState(-1);

/** 命中位置来自数据，不是 DOM */
const hits = useMemo(() => {
  if (!keyword) return [] as number[];
  return list.reduce<number[]>((acc, item, i) => {
    if (item.text.includes(keyword)) acc.push(i);
    return acc;
  }, []);
}, [list, keyword]);

const jumpTo = useCallback(
  (next: number) => {
    if (hits.length === 0) return;
    const at = (next + hits.length) % hits.length;
    setCursor(at);
    vlRef.current?.scrollToIndex(hits[at]!, { align: 'start' });
  },
  [hits],
);

return (
  <VirtList<AiMessage> ref={vlRef} list={list} itemKey="id" estimatedSize={80}>
    {({ itemData, index }) => {
      const isCurrent = cursor >= 0 && hits[cursor] === index;
      return (
        <div className={isCurrent ? 'bubble is-current' : 'bubble'}>
          {splitByKeyword(itemData.text, keyword).map((part, i) =>
            part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>,
          )}
        </div>
      );
    }}
  </VirtList>
);
```

渲染函数的第二个参数 `index` 就是该项在完整列表里的索引，可以直接和命中比对。

::: tip 输入防抖
搜索词直接绑 state 会让每个按键都触发一次全量扫描。用一个 `useEffect`
把它防抖到 200ms 之后再写进 `keyword`。
:::
