# 特殊说明

## 百万级数据

已经支持。容器是 `overflow: hidden`、滚动条自绘，没有需要被撑开的占位元素，各段的 `transform`
只携带「该段位置减去当前偏移量」的残差，因此碰不到浏览器对元素高度与单个 `transform` 位移的
上限（Chrome 实测 33,554,428 / 33,554,400px）。

100 万项 × 100px（1 亿 px）实测 8 个采样点定位误差全为 0px。靠占位元素撑开滚动空间的方案
会在 33.5 万行（默认行高）左右撞墙，超限部分永远滚不到。

## 滚动性能

本虚拟列表支持满帧渲染，但在大数据或复杂dom场景下应当由使用者自行避免2个问题：

1. 列表数据应当使用非响应式数据 ShallowRef 替换 响应式数据 Ref
2. 复杂dom应当使渲染层和交互层分离，渲染层dom要极简。

## 修复滚动selection问题

仅修复vue2下diff算法的bug(列表在向下滚动过程中，vue2-diff算法会导致整个列表重新挂载)

## shallowRef

无论是使用VirtList还是使用VirtGrid，一旦使用了shallowRef，就需要使用提供的forceUpdate方法来更新list长度变化。对于item内容变化，需要自行使用renderKey来进行相应更新。
具体demo请参考: https://kolarorz.github.io/vue-virt-list/examples/huge-data/
