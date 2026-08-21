# 特殊说明

## 百万级数据

已经支持。容器是 `overflow: hidden`、滚动条自绘，没有需要被撑开的占位元素，各段的 `transform`
只携带「该段位置减去当前偏移量」的残差，因此碰不到浏览器对元素高度与单个 `transform` 位移的
上限（Chrome 实测 33,554,428 / 33,554,400px）。

100 万项 × 100px（1 亿 px）实测 8 个采样点定位误差全为 0px。靠占位元素撑开滚动空间的方案
会在 33.5 万行（默认行高）左右撞墙，超限部分永远滚不到。

## 滚动性能

列表本身能跑满帧，剩下两件事只能由使用方避免：

1. 大数据量下用 `shallowRef` 存列表，不要用 `ref`——原因和写法见下面「shallowRef」一节。
2. DOM 复杂时把渲染层和交互层分开：列表项里只放展示用的元素，悬浮菜单、弹层这类交互挂到列表外面去。

## Vue 2 的 diff 不参与列表渲染

上游 vue-virt-list 有一处针对 Vue 2 的修复：列表向下滚动时 Vue 2 的 diff 会让整个列表重新挂载，
选区随之丢失。这里不需要那个修复了——列表项的 DOM 由 vanilla 层按 key 复用，每个插槽挂载点
是一个独立的 Vue 实例，列表结构根本不经过 Vue 2 的 diff。

## shallowRef

大数据量下推荐 `shallowRef`：Vue 2 会把 `data` 里的数组预先递归改写一遍
（每个元素的每个属性都过一次 `Object.defineProperty`，10 万条实测 150~190ms），
之后每次读属性还要多走一层 getter——高度实测下每次数据变更都要整表扫一遍取 `itemKey`
重算总高度，10 万条实测 13~20ms 对 `shallowRef` 的 0.8~1ms。`shallowRef` 两笔都省掉。
（Options API 里也可以用 `Object.freeze` 的数组，Vue 2 会直接跳过观察，效果相同。）

配合**换新数组**的写法，自动更新照样生效——`.value` 被替换会触发组件重渲染，
组件随即把最新数据交给可视区内的每一项，长度变化与内容变化都不需要手动调用：

```js
const list = shallowRef(rows);

// 增删、换内容都走这一种写法
list.value = list.value.map((it) => (it.id === id ? { ...it, name: 'new' } : it));
list.value = [...list.value, newRow];
```

只有**原地改某一项的字段**（`list.value[0].name = 'x'`）才需要手动干预——`shallowRef`
不代理数组元素，引用与长度也都没变，谁都察觉不到。这时用 `refreshItems([key])`
指明刷哪几项，比 `forceUpdate()`（重建全部可见项）开销小得多。

可运行的对比示例见「示例 → 列表 → 响应式更新」。
