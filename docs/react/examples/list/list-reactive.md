# 响应式更新

**先说结论：React 这边没有「响应式数据」可依赖——改字段永远不会被 React 发现，
唯一的自动通道是「整份换新 + `setState`」，而它的成本随全量数据增长。大列表上不要每轮都走这条路。**

数据量小（几千条以内、更新也不频繁）就是另一回事了：整份换新最省事，什么都不用管。
下面按「为什么」→「小数据量怎么用」→「大数据量怎么用」的顺序展开。

## 为什么大列表不要每轮整份换新

`rows.map((r) => ({ ...r, tick }))` 这一下要遍历 n 项、分配 n 个新对象——**哪怕真正变了的只有一项**。
之后宿主重渲染，组件把可视区内的挂载点全部用最新闭包重刷一遍（这一步只跟可视区规模有关，
与 n 无关）。10 万条一轮实测（Node 23 / arm64）：

| 写法 | 一轮耗时 | 新分配的对象 |
|---|---|---|
| 全量换新 `rows.map((r) => ({ ...r, tick }))` | 3.2ms | 10 万个 |
| 只换动了的那项 `rows.map((r) => (r.id === id ? { ...r, tick } : r))` | 0.5ms | 1 个 |
| 数据放 `useRef`，原地改 + `refreshItems([id])` | 约 0ms | 0 个 |

1 万条是 0.22ms 对 0.05ms，1000 条是 0.03ms 对 0.01ms——**比例不变，绝对值才是关键**。
每秒刷 10 轮的话，第一行就是每秒 100 万个临时对象，GC 压力全砸在动画帧上。

## 数据量小，图省事：整份放 state 里

几千条以内，上面那笔是零点几毫秒，感觉不到。这时 `useState` 是最省心的一档，
增删改都写成同一种形状，不用调任何方法：

```jsx
const [list, setList] = useState(() => createRows(500));

setList((rows) => [...rows, newRow]);                                        // 增
setList((rows) => rows.filter((it) => it.id !== id));                        // 删
setList((rows) => rows.map((it) => (it.id === id ? { ...it, name } : it)));   // 改
```

这一档的规则就一句：**只要换新数组就行。**

## 数据量大：只换动了的那几项，或者绕开 state

第一条路仍走 state，只是把 `map` 写成「命中才展开」——遍历还是 n 次，
但只分配一个新对象，上表第二行就是它：

```jsx
setList((rows) => rows.map((it) => (it.id === id ? { ...it, value } : it)));
```

第二条路把数组放在 `useRef` 里，宿主一次都不重渲染，改完自己通知库：

```jsx
const rowsRef = useRef(createRows(100000));
const virtListRef = useRef(null);

// 只改了某几项的字段：原地改完点名刷那几项
rowsRef.current[i].value = next;
virtListRef.current.refreshItems([rowsRef.current[i].id]);

// 增删、顺序变了：把新数组写回 ref，再命令式通知
rowsRef.current = [...rowsRef.current, newRow];
virtListRef.current.setList(rowsRef.current);

<VirtList ref={virtListRef} list={rowsRef.current} itemKey="id" estimatedSize={44}>
  {({ itemData }) => <Row data={itemData} />}
</VirtList>
```

`virtListRef.current.setList()` 与 `useState` 的 setter 是两回事：前者只通知库，宿主不重渲染。
**把新数组同时写回 ref**，这样宿主下次因别的原因重渲染时，传下去的还是同一份数据。

## 示例在演示什么

示例走的是「整份放 state」那一档（1000 条），切换「更新方式」即可对比：

- **换新数组**（推荐）：`setList(rows.map(...))`。组件识别到 `list` 换了，
  把最新数据交给可视区内的每一项，行上的轮次跟着涨。
- **原地修改**：直接改某一项的字段。行上的轮次**也能跟上**，但走的是另一条路（见下），
  并且依赖宿主恰好重渲染过——数据由外部 store 直写、宿主一次都不重渲染时就会停住。

## 它是怎么知道数据变了的

库自己**不侦测**数据变化，一次都不——侦测交给框架，库只提供入口。`@virt-list/react` 内部是宿主每次
渲染后的一次比较：

```js
// packages/react/src/VirtList.ts
useLayoutEffect(() => {
  if (props.list !== prevList || props.list.length !== prevLen) {
    vl.setList(props.list);      // 通知库：数据换了
  }
  mounter.flushMounts();          // 顺带把挂载点用最新的 children 闭包重刷一遍
});
```

第一句只比**两个标量**：数组引用和长度（`O(1)`，不遍历、不深比较）。换新数组会被它发现，
原地改字段不会。

第二句是 React 侧特有的兜底：每项的内容渲染在独立的 root 里、不在宿主的 vdom 树上，
所以每次宿主渲染后都用最新闭包重刷一遍。**这也是本示例里「原地修改」照样能跟上的原因**——
闭包里就是那几个被改过的对象。上一节第二条路（数据放 `useRef`）刻意不让宿主重渲染，
所以那里必须自己调 `refreshItems()`。

## 三种更新手段的分工

| 手段 | 什么时候用 | 范围与代价 |
|---|---|---|
| **自动**（推荐） | 换新数组 | 可视区内每一项，**原地更新**内容，DOM 全部复用 |
| `refreshItems([key])` | 原地修改，且框架察觉不到 | 只动指定的那几项，重建它们的 DOM |
| `forceUpdate()` | 兜底：不确定哪几项变了，或所有项的高度同时变了（如批量折叠） | 全部可见项，重建 DOM |

`forceUpdate()` 是范围最大的一个，重建可见项的全部 DOM。能指明 key 时优先用
`refreshItems([key])`，长列表里差别看得出来。

<PlaygroundHost framework="react" example-id="list-reactive" />
