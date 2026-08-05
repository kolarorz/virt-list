# Vue - 平滑滚动

所有滚动定位方法（`scrollToIndex` / `scrollIntoView` / `scrollToTop` / `scrollToBottom` / `scrollToOffset`）都接受一个可选的 `VirtScrollOptions`，传入 `behavior: 'smooth'` 即为平滑滚动；不传参数时保持瞬时跳转。

- 切换 `behavior` 可以直接对比硬跳与平滑动画的差别；
- `duration` 控制单次动画时长，组件属性 `scrollDuration` 可设置默认值（默认 `300`）；
- 动画进行中滚动鼠标滚轮 / 触摸滑动会立即接管，`onDone` 收到 `canceled = true`；点击 `cancelScroll` 或发起新的滚动调用同样会中断；
- 动画每帧都会重新计算目标位置，不定高列表在滚动途中撑开高度也不会跑偏，动画结束后还会做一次精确落位修正；
- 「逐帧穿越距离」（单次调用参数 `maxDistance`，或属性 `smoothMaxDistance`）控制动画真正逐帧滚过的距离，超出部分先瞬跳掉 —— 把它切到「不限制」再跳到 index 1500，就能看到虚拟列表逐帧穿越长距离时的露白。

<PlaygroundHost framework="vue" example-id="list-smooth" />
