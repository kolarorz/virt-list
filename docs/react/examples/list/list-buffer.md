# 渲染 buffer

数据量大、滚动快时视口边缘可能闪出白边。在渲染区间的首尾各多渲染几项（buffer）可以减轻这种现象。

<PlaygroundHost framework="react" example-id="list-buffer" />
