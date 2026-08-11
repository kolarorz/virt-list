# 滚动是怎么工作的

滚动位置的所有权**不在浏览器手里**：容器是 `overflow: hidden`，内容靠 `transform`
移动，滚动条由库自己绘制，滚轮 / 键盘 / 触摸也都由库接管。

这是唯一的实现方式，没有开关。需要原生滚动条的项目请用旧库
[vue-virt-list](https://github.com/kolarorz/vue-virt-list)。

## 为什么

原生滚动下，快速拖拽滚动条会露白。这不是渲染不够快，而是时序：

1. 浏览器在**合成器线程**上先把画面滚过去，并呈现那一帧；
2. `scroll` 事件之后才异步回送到主线程，JS 这时才重算区间、patch DOM。

于是已经呈现的那一帧里，视口正对着还没有 DOM 的位置。优化渲染速度消不掉它。

自己掌管偏移量之后，容器不会自己滚动，内容只在 JS 写入时才移动，位置与 DOM 永远在
同一帧提交——露白从根上不成立。

第二个改善是滑块不再抖动。原生滑块的位置由 `scrollHeight` 决定，而不定高列表的
总高度随尺寸测量一直在变，拖拽中滑块会在手指底下反复跳。这里的滑块按**列表项索引**
映射，与实测尺寸无关。

## 超大列表：不再有"尾部滚不到"

浏览器对单个元素的高度、以及 `transform` 的位移量，都有同一个上限——
Chrome 实测分别是 `33,554,428px` 与 `33,554,400px`（2^25 量级）。按 100px 行高算，
对应约 33.5 万项。**所以"改用 transform 就没有上限"是错的**，位移一样会被夹住。

真正让这条线消失的是**不让任何一个 transform 携带完整量级**。参与滚动的每一段
（header、渲染块、footer）只带自己的残差 `该段的文档位置 - offset`：视口里能看见的
东西，残差最大也就一屏多一点。于是偏移量可以长到 1 亿 px，写进 CSS 的数字始终是三位数。

| | 越限后的行为 | 实测（100 万项 × 100px = 1 亿 px） |
| --- | --- | --- |
| 靠占位元素撑开滚动空间 | 超出的高度被**直接截掉**，那部分内容**永远滚不到** | `scrollHeight` 停在 33,554,428，尾部三分之二不可达 |
| 本库（残差定位） | 与限内**完全一致** | 8 个采样点定位误差全部 0px；末项可达；帧间隔 p50 8.3ms |

对照实验：曾经有一版把位移拆成"内容层 `-offset` + 列表项层 `+leadingSize`"两个反向
transform，两者都携带完整量级。限内没问题，越限后两个值同时被夹住、合成崩掉——
表现是滚动被量化成按项跳（offset 每 +20px 画面完全不动，跨过项边界才整跳一项，
实测定位误差 78–202px）。这是个容易复发的退化，`ScrollbarHugeOffset.test.ts` 锁住了它。

## 已知取舍

浏览器不再提供滚动手段之后，滚轮、键盘（方向键 / PageUp / PageDown / Home /
End / 空格）、触摸拖动与惯性都由库自己实现，行为已对齐原生，包括到达边界后把
滚轮事件交还给外层容器（滚动链）。但有一项拿不回来：

- **拖选文本到容器边缘时不再自动滚动**。这是原生滚动免费提供的能力。

另外两点不是新增损失，但值得知道：

- `scrollIntoView({ behavior: 'smooth' })` 不保证平滑，落位是瞬时的；
- 浏览器的页内查找（Ctrl+F）命中不可见项时不会滚动过去——虚拟列表本来就如此。

## 迁移：读写滚动位置

容器的 `scrollTop` 恒为 0，读写它都没有意义。替代写法：

| 以前 | 现在 |
| --- | --- |
| `el.scrollTop` | `getOffset()` |
| `el.scrollTop = x` | `scrollToOffset(x)` |
| 派发 `scroll` 事件模拟用户滚动 | `scrollFromUser(x)` |
| `e.target.scrollTop` | `e.offset` |
| `e.target.scrollHeight` | `e.scrollSize` |
| `e.target.clientHeight` | `e.clientSize` |

`getOffset` / `scrollToOffset` / `scrollFromUser` 在 List、Grid、Tree 上都有。

`scrollFromUser` 与 `scrollToOffset` 的区别是**语义**：前者表示「用户动了」，
会触发 `toTop` / `toBottom` 判定与自动续拉，并让 `scrollToIndex` 之类的定位意图作废；
后者表示「程序要求去某处」，不触发。接自定义输入源（自建手势、外部滚动条）时用前者。

## `scroll` 事件：载荷不再是 `Event`

`scroll` 事件仍然有，`@scroll` / `onScroll` 照旧监听，**但载荷换成了普通对象**：

```ts
interface VirtScrollEvent {
  offset: number;      // 当前偏移量，对应过去的 scrollTop
  delta: number;       // 相对上一次的位移，正数朝列表尾部。恒不为 0
  direction: 'start' | 'end';
  clientSize: number;  // 视口尺寸，对应过去的 clientHeight
  scrollSize: number;  // 内容总尺寸，对应过去的 scrollHeight
  maxOffset: number;   // scrollSize - clientSize，不为负
  atStart: boolean;
  atEnd: boolean;
  source: 'user' | 'program' | 'adjust';
}
```

转发原生 `Event` 已经没有意义：容器是 `overflow: hidden`，浏览器不会自己滚，
那个事件只在它为了露出获得焦点的元素而静默滚动时才发生，且随即被内部归零，
回调里 `e.target.scrollTop` 永远读到 0。所以这里给的是内部账本本身。

字段名用 `offset` / `start` / `end` 而不是 `top` / `up` / `down`，
这样 `horizontal` 模式下语义不会自相矛盾。

**`source` 是确定的，不是猜的。** 偏移量的每一次写入都经由库自己的手，所以「谁动的」
是已知信息——原生滚动下做不到，写 `scrollTop` 引发的 `scroll` 事件异步回送，与任何标记
窗口都是竞态，只能靠比对"上次程序化写入的值"去猜。

三个取值分别对应哪些触发来源，见 API 的
[VirtScrollEvent](../api/virt-list#virtscrollevent)。

`adjust` 值得单独判掉——这类事件里视口内容其实没动，"回到底部"按钮、阅读进度这种 UI
不该被它搅动：

```ts
function onScroll(e) {
  if (e.source === 'adjust') return;
  showBackToBottom.value = !e.atEnd;
}
```

## `scroll` 与 `offsetChange` 怎么选

| | 用哪个 |
| --- | --- |
| 只关心滚到哪了，要读方向 / 边界 / 来源 | `scroll` |
| 要跟着偏移量重写 DOM，必须与内容落在同一帧 | `offsetChange` |

两者都是**同步**触发，`offsetChange` 在前。差别只有一处：`resume()`（keep-alive 重挂
DOM 后把内容摆回原位）会触发 `offsetChange` 而不触发 `scroll`——那种情况下位置根本没变。

两个都在滚动热路径上，回调里别做重活（读布局、同步测量）。需要节流的话自己按 rAF 合并。

## 逃生舱：`clientEl`

`clientEl` 是滚动容器，也是整棵子树里**唯一的 scrollport**。List / Grid / Tree 都有，
Vue / React 里从 ref 上取。给的是那些只认 DOM 元素的场合：量它的位置、交给第三方库。

```ts
const el = listRef.value.clientEl;   // Vue
const el = listRef.current.clientEl; // React
```

**但别拿它监听原生 `scroll`。** 它是 `overflow: hidden`，`scrollTop` 恒为 0；浏览器
偶尔为露出获得焦点的元素而静默改动它，那点位移也会被库立刻读走并归零。感知滚动请用
`scroll` 事件。

组件根元素是它的父节点，不是它本身——原生 `scroll` 不冒泡，挂错地方永远收不到。

## 样式定制

滚动条样式随各包的 `style.css` 一起交付，**需要手动引一次**（不引也能滚，但看不到滚动条
——滑块的位置与外观全靠这些类名）：

```ts
import '@virt-list/vue/style.css'; // 换成你装的那个包
```

可定制项都以 CSS 变量暴露，覆盖变量即可换肤：

| 变量                                | 说明                 | 亮色默认值              |
| ----------------------------------- | -------------------- | ----------------------- |
| `--virt-scrollbar-size`             | 轨道宽度 / 高度      | `10px`                  |
| `--virt-scrollbar-track-bg`         | 轨道底色             | `transparent`           |
| `--virt-scrollbar-thumb-bg`         | 滑块底色             | `rgb(31 35 41 / 26%)`   |
| `--virt-scrollbar-thumb-bg-hover`   | 滑块悬停底色         | `rgb(31 35 41 / 40%)`   |
| `--virt-scrollbar-thumb-bg-active`  | 滑块拖拽中底色       | `rgb(31 35 41 / 55%)`   |
| `--virt-scrollbar-thumb-radius`     | 滑块圆角             | `999px`                 |
| `--virt-scrollbar-thumb-inset`      | 滑块相对轨道的内缩   | `2px`                   |

暗色模式跟随宿主的 `html.dark` 或任意祖先上的 `[data-theme='dark']`，
与树组件的约定一致。

滑块位置由 JS 每帧写 `transform`，**不要给它加 `transition`**——加了就意味着
滑块落后于它所代表的内容，快速拖拽时尤其明显。
