# @virt-list/react-legacy

[![npm](https://img.shields.io/npm/v/@virt-list/react-legacy.svg?sanitize=true)](https://www.npmjs.com/package/@virt-list/react-legacy)

React 16.8 - 17 的虚拟**列表 / 网格 / 树形**组件。不定高无需声明高度，
三十万行与三十行的 DOM 节点数相同。

与 [`@virt-list/react`](https://www.npmjs.com/package/@virt-list/react)（React 18+）**组件 API 完全一致**
——props、渲染函数、事件、ref 方法同名同签名，只有内部的节点挂载方式不同
（18+ 用 `createRoot` + `flushSync`，这里用 `ReactDOM.render`，legacy render 本身是同步的）。
升级到 React 18 后只需改导入来源。

## 安装

```sh
pnpm add @virt-list/react-legacy
```

peer 依赖：`react >= 16.8 < 18`、`react-dom >= 16.8 < 18`。下限是 16.8 而非 16.0——绑定层用了 Hook；
上限是 18，React 18+ 请换 `@virt-list/react`（这个包走 `ReactDOM.render`，在 18 下会触发 legacy-root 警告）。

## 引入样式

滚动条是自绘的，样式必须引一次——不引也能滚，但**看不到滚动条**。用到 `VirtTree` 时
这一份也提供树的默认外观。放在应用入口即可：

```tsx
// index.tsx
import '@virt-list/react-legacy/style.css';
```

组件的 JS 里刻意不 `import` 这份 css：那会让整个包在纯 Node 环境（SSR）下 import 不了
——Node 不认 `.css` 扩展名。可定制项都以 CSS 变量暴露（`--virt-scrollbar-*` / `--virt-tree-*`），
覆盖变量即可换肤；暗色模式跟随宿主的 `html.dark` 或任意祖先上的 `[data-theme='dark']`。

## 最小示例

```tsx
import { useRef, useState } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react-legacy';

type Item = { id: number; text: string };

export default function App() {
  const [list] = useState<Item[]>(() =>
    Array.from({ length: 100000 }, (_, i) => ({ id: i, text: `item-${i}` })),
  );
  const listRef = useRef<VirtListRef<Item>>(null);

  return (
    // 容器必须有确定的高度，组件不会自己撑开
    <div style={{ width: 500, height: 400 }}>
      <VirtList
        ref={listRef}
        list={list}
        itemKey='id'
        estimatedSize={40}
        // e 是普通对象，不是 React 合成事件：offset / delta / direction / atStart / atEnd / source
        onScroll={(e) => e.atEnd && console.log('到底了')}
      >
        {({ itemData, index }) => (
          <div>
            {index} — {itemData.text}
          </div>
        )}
      </VirtList>
    </div>
  );
}

// listRef.current?.scrollToIndex(50000, { behavior: 'smooth' });
```

`list` 建议保持引用稳定（`useState` / `useMemo`），每次渲染都新建一个数组会让组件反复重算。

## 导出

| 导出 | 说明 |
| --- | --- |
| `VirtList` | 虚拟列表，支持不定高、水平滚动、sticky 区域、空状态、无限加载 |
| `VirtGrid` | 虚拟网格，`gridItems` 指定每行列数，按行虚拟化 |
| `VirtTree` | 虚拟树，展开 / 选择 / 勾选 / 过滤 / 拖拽排序 |
| `useVirtList` | 无头 Hook，DOM 结构完全自己写时用 |
| `createStreamBuffer` | 流式输出的帧内合并（从 core 转出，免得你为它多依赖一个包） |
| 类型 | `VirtListProps` / `VirtListRef` / `VirtGridProps` / `VirtTreeProps` / `TreeNode` / `VirtScrollEvent` / `LoadState` 等 |

## 常用 props / 事件 / 方法

```
必填     list、itemKey、estimatedSize
尺寸     itemGap、fixedSize、horizontal
渲染     buffer / bufferTop / bufferBottom、renderControl、itemClass / itemStyle、listClass / listStyle
定位     initialIndex、initialOffset、initialPosition、scrollDuration、smoothMaxDistance
加载     loadMore、hasMoreTop、hasMoreBottom、edgeThreshold
贴底     stickyBottom、stickyThreshold
复制     copyText、copySeparator
交互     keyboard、scrollbarAutoHideDelay、scrollbarMinThumbSize
```

渲染函数：`children({ itemData, index })`、`renderHeader(loadState)` / `renderFooter(loadState)`
（加载提示条直接据此渲染）、`renderStickyHeader()`、`renderStickyFooter()`、`renderEmpty()`。

事件：`onScroll`、`onOffsetChange`、`onToTop`、`onToBottom`、`onItemResize`、`onUpdate`、`onLoadStateChange`。

ref 方法：

```ts
scrollToIndex(index, opts?) / scrollIntoView(index, opts?)
scrollToTop(opts?) / scrollToBottom(opts?) / scrollToOffset(offset, opts?) / cancelScroll()
// opts: { behavior: 'auto' | 'smooth', align: 'start' | 'end', focus, duration, onDone }

getState() / getOffset() / getMaxOffset() / getTotalSize() / getItemSize(key)
getItemPosByIndex(index) / getIndexByOffset(offset) / getLoadState()
setList(list) / forceUpdate() / reset() / resume()
```

完整参数表见文档站的 API 一节。

## 用之前需要知道的

- **`estimatedSize` 必填**：首屏布局与未测量项的占位依据，不定高时越接近实测值抖动越少。
- **容器要有确定的高度**（水平模式下是宽度），但不需要给项声明高度——行高由内容决定。
- **偏移量归 JS 掌管**：容器是 `overflow: hidden`，`scrollTop` 恒为 0。读写滚动位置用
  `getOffset()` / `scrollToOffset()`；`onScroll` 的载荷是 `VirtScrollEvent` 而不是 React
  合成事件（多了 `source` 字段，能确定地区分用户滚动 / 程序定位 / 内部补偿）。组件只把
  `style` / `className` 透传给根节点，事件 props 一律不透传，因此不会与合成事件打架。
- **`loadMore` 里自己往 `list` 写数据**（`setState`），返回该方向是否还有更多。防重入、位移补偿、
  不足一屏时自动续拉、loading 状态透出都由库负责。
- **Concurrent 特性用不了**（那是 React 18 的能力），其余行为与 `@virt-list/react` 一致。
- **需要原生滚动条**的项目请用旧库 [vue-virt-list](https://github.com/kolarorz/vue-virt-list)。

## 文档

- 文档站：<https://kolarorz.github.io/virt-list/>（顶部导航切到 React 16-17 看示例与 API）
- GitHub：<https://github.com/kolarorz/virt-list>

## 许可

MIT
