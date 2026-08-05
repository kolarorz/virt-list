# 原生 - 聊天室（折叠消息）

长消息默认只显示三行，点击「展开」显示全文。项高度在交互中突然变化，列表靠 ResizeObserver 感知并自动修正后续内容的位置，不需要手动通知。

可以这样验证：

- **消息开头可见时展开 / 收起** —— 滚动位置完全不动，内容从按钮那里往下长（包括那条两三屏高的超长消息）
- **往下滚到只看得见「展开」按钮时再点它** —— 应当把这条消息拉到视口顶部，从第一行开始显示，而不是把画面换成它的中段
- **滚到超长消息的中段再点「收起」** —— 同样回到这条消息的顶部
- 展开超长消息后往下滚 —— 消息下方不该出现空白
- 展开靠上的消息后再向上滚动加载历史，位置应当仍然连续
- 「全部展开 / 全部折叠」会一次改变所有项的高度，视口应当停在原来那条消息上
- 展开若干条后滚远再滚回来，展开状态应当保持（状态记在列表数据之外）

<PlaygroundHost framework="vanilla" example-id="list-chat-collapse" />

## 滚动只有一条规则

展开和收起共用同一条判据 —— **这条消息的顶部还在视口里吗**：

```js
function onToggle(item, el) {
  const open = !expandedIds.has(item.id);
  if (open) expandedIds.add(item.id);
  else expandedIds.delete(item.id);

  // 直接改这一项自己的 DOM，高度一变 ResizeObserver 就会上报
  applyCollapse(el, open);

  // 索引要现查：加载历史之后这一项的位置会平移
  const index = list.findIndex((it) => it.id === item.id);
  if (index >= 0) {
    const { top } = virtList.core.getItemPosByIndex(index);
    if (virtList.core.getOffset() > top) virtList.scrollToIndex(index);
  }
}
```

**顶部还在视口里 → 一动不动。** 用户看着这条消息的开头，高度往下变，视觉上是连续的；此时插一次滚动纯属捣乱。

**顶部已经滚出视口上方 → 拉回视口顶部。** 这时用户看不到这条消息的开头，高度骤变会让视口内容整体错位：

- **展开时**：视口被这条消息的中段文本淹没 —— 明明只点了个按钮，画面全换了（典型情形是往下滚到只看得见"展开"按钮的时候）
- **收起时**：滚动位置还指着原先那个很深的偏移量，那里已经是后面十几条消息的地盘，刚读的消息直接不见了

拉回顶部之后，用户就能从头看这条消息 —— 不管是刚展开的全文，还是刚收起的摘要。

两个实现细节：

- `getItemPosByIndex(index).top` 只取决于这一项**上方**的内容，与它自己的高度无关，所以在尺寸变化之前就能算准
- `scrollToIndex` 自带渐进修正，跟着 ResizeObserver 的每次回调重算目标偏移直到尺寸稳定，所以**不需要**等高度落定再调用

::: tip 换成别的对齐方式
`scrollToIndex` 还支持 `align: 'end'`（目标项底部贴住视口底部）。配合 `itemResize` 事件拿到实测高度，就能做出"只在展开后高过一屏时才贴底"之类的策略。这个示例刻意不用 —— 但能力在那儿。
:::

批量折叠是另一回事：所有项的高度同时变化，视口彻底失去参照，必须定位。示例里的做法是先记下当前视口顶部是哪一项，`forceUpdate()` 重建之后再定位回去。

## 折叠状态该放在哪

原生这层最直接：**不需要"响应式"这个概念**。`renderItem` 里给按钮绑一个 click，处理函数直接改这一项自己的 DOM（切换 `-webkit-line-clamp` 与按钮文字）。高度一变 ResizeObserver 就会上报，列表自动修正后续内容的位置 —— 完全不必通知列表。

```js
function applyCollapse(el, open) {
  const textEl = el.querySelector('[data-role="text"]');
  const btn = el.querySelector('[data-role="toggle"]');
  if (textEl) textEl.style.cssText = open ? '' : CLAMP_STYLE;
  if (btn) btn.textContent = open ? '收起' : '展开';
}
```

折叠状态记在一个外部 `Set` 里：`renderItem` 只在项首次创建时调用，项滚出渲染窗口后 DOM 会被销毁，再滚回来时要靠它恢复初始态。

批量操作（全部展开 / 折叠）同理 —— 改完记录后 `renderItem` 不会自动重跑，需要 `forceUpdate()` 让列表重建渲染窗口内的项。
