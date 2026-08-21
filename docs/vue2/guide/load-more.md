# 分页与无限加载

上下分页、无限加载、聊天室这几类场景的共同点是：**取数是业务逻辑，其余都是样板**。
`loadMore` 把样板收进组件内部，使用方只需要回答「这个方向的下一批数据是什么」。

```vue
<VirtList
  :list="list"
  item-key="id"
  :estimated-size="60"
  :load-more="onLoadMore"
>
  <template #footer="{ loadState }">
    <div>{{ loadState.loadingBottom ? '加载中' : loadState.hasMoreBottom ? '' : '没有更多了' }}</div>
  </template>
</VirtList>
```

```ts
async function onLoadMore(direction: LoadDirection) {
  const data = await fetchPage(direction === 'top' ? --page : ++page);
  list.value = direction === 'top' ? data.concat(list.value) : list.value.concat(data);
  // 返回该方向是否还有更多；返回 void 视为仍有更多
  return data.length > 0;
}
```

数据仍由使用方写入 `list`（这样才能适配框架自身的状态更新方式），组件负责其余全部：

- **防重入**：加载进行中不会重复触发同一方向，不必自己维护 `loading` 标志
- **位移补偿**：头部插入 / 删除后视口内容留在原处，无需任何手动补偿
- **重算与渲染**：不必再补一次 `forceUpdate()`
- **`hasMore` 落位**：返回 `false` 后该方向不再触发
- **首屏补齐**：初始为空或不足一屏时会自动继续取数，不必在挂载后手动拉第一页
- **加载状态**：通过 header / footer 的 `loadState` 直接渲染提示条（字段见 API 的 [LoadState](../api/virt-list#loadstate)）

## 三类场景的写法

| 场景 | 关键配置 |
| ---- | -------- |
| 无限加载（信息流） | `loadMore` + `hasMoreTop` 为 `false` |
| 双向分页（日志、时间线） | `loadMore`，两个方向都实现；裁剪另一端的数据在回调里照常改 `list` 即可 |
| 聊天室 | `loadMore`（只实现 `top`）+ `initialPosition` 为 `'bottom'` + `stickyBottom` + `hasMoreBottom` 为 `false` |

## 顶部方向不会自动触发

内容不足一屏时组件会自动向**底部**方向续拉——否则用户没有可滚动的余量，
加载永远不会被触发。

顶部方向不做这件事：偏移量为 0 是初始常态而不是用户意图，若自动触发，
任何配置了 `loadMore` 的列表在挂载瞬间就会开始无限向上拉取历史数据。
要更早的数据，必须由「主动向上滚到顶」这个动作来表达。

## 贴底跟随

`stickyBottom` 的关键在于**仅在原本就贴底时才跟随**：用户正在向上翻历史消息时
来了新消息，视口不会被拽到底部，新增量记在 `loadState.pendingNew` 里，
可以据此渲染一个「N 条新消息」的角标。用户滚回底部后自动归零。
