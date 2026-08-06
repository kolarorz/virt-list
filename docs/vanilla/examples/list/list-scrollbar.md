# Vanilla - 自绘滚动条

左右两侧是同一份 50 万条数据，唯一的区别是 `scrollbar` 取 `'native'` 还是 `'custom'`。

## 可达性：能客观测量的那部分

50 万 × 100px = 5000 万 px，超过了 Chrome 的元素高度上限 **33,554,428px**（2<sup>25</sup>，实测值）。

点「两侧同时滚到底」：

- **native** 靠占位元素撑开滚动空间，超出上限的部分被浏览器直接截掉——
  `scrollHeight` 停在 33,554,428，尾部约 16 万项**永远滚不到**。
- **custom** 不需要占位元素，最高的元素只有一屏，滚到底就是第 499,999 项。

## 拖拽露白：只能肉眼看

抓住两侧滚动条快速上下拖拽，对比画面是否闪出空白。

这里刻意**没有**统计「露白帧」：露白发生在「合成器已经把画面滚过去、主线程还没跟上」
的那一帧里，而任何跑在主线程 `requestAnimationFrame` 里的探针都只能看到 `scroll`
事件处理完之后的状态——测出来永远是 0，是个假指标。要逐帧确认请用 DevTools 的
Performance 面板录制后回看。

custom 模式下容器 `overflow: hidden`，浏览器不会自己滚动，内容只在 JS 写入偏移量时
才移动，位置与 DOM 永远在同一帧提交——露白从根上不成立。

<PlaygroundHost framework="vanilla" example-id="list-scrollbar" />
