# Vanilla - 海量数据

生成 100 万条数据，验证虚拟列表的高性能渲染能力。

实测（Chrome 150）：生成数据 + 首屏约 150ms，滚动到任意位置 DOM 行数恒定在 13 上下，
拖动滑块从头到尾一次约 10~17ms。

<PlaygroundHost framework="vanilla" example-id="list-huge-data" />
