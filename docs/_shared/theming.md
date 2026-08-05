## 样式与主题

树组件的默认样式来自 `@virt-list/vanilla/src/tree/tree.css`（各框架包已在 `VirtTree` 内部引入，无需手动导入）。
所有可定制项都通过 CSS 变量暴露，**覆盖变量即可换肤**，不需要与选择器优先级搏斗。

### 暗色模式

样式内置两套令牌，命中以下任一条件即切换为暗色：

- `<html>` 上带有 `dark` class（VitePress、大多数文档站与后台框架的约定）；
- 任意祖先元素上带有 `data-theme="dark"`。

```ts
// 自行控制时，只需切换根节点的 class
document.documentElement.classList.toggle('dark', isDark);
```

如果你的项目使用别的主题标记（例如 `body[theme='night']`），直接在该选择器下覆盖变量即可：

```css
body[theme='night'] .virt-tree-item {
  --virt-tree-color-text: rgb(255 255 255 / 87%);
  --virt-tree-color-node-bg-hover: rgb(235 235 245 / 8%);
  --virt-tree-line-color: #3c3f46;
}
```

### 可用变量

变量定义在 `.virt-tree-item` 与 `.virt-tree-all-drag-area` 上，覆盖时请使用同一层级或更高优先级的选择器。

| 变量                                          | 说明                     | 亮色默认值             | 暗色默认值                 |
| --------------------------------------------- | ------------------------ | ---------------------- | -------------------------- |
| `--virt-tree-color-text`                      | 节点文字                 | `#1f2329`              | `rgb(255 255 255 / 87%)`   |
| `--virt-tree-color-text-selected`             | 选中态文字               | `#1f52d6`              | `#8fb2ff`                  |
| `--virt-tree-color-text-disabled`             | 禁用态文字               | `#a8abb2`              | `rgb(235 235 245 / 38%)`   |
| `--virt-tree-color-node-bg`                   | 节点背景（默认透明，跟随容器） | `transparent`     | `transparent`              |
| `--virt-tree-color-node-bg-hover`             | 悬停背景                 | `rgb(31 35 41 / 6%)`   | `rgb(235 235 245 / 8%)`    |
| `--virt-tree-color-node-bg-selected`          | 选中背景                 | `rgb(42 99 240 / 10%)` | `rgb(97 143 250 / 20%)`    |
| `--virt-tree-color-node-bg-disabled`          | 禁用背景                 | `transparent`          | `transparent`              |
| `--virt-tree-color-node-bg-focused`           | 聚焦背景                 | `rgb(42 99 240 / 6%)`  | `rgb(97 143 250 / 10%)`    |
| `--virt-tree-color-node-ring-focused`         | 聚焦描边环               | `rgb(42 99 240 / 55%)` | `rgb(140 175 255 / 65%)`   |
| `--virt-tree-color-icon`                      | 展开箭头颜色             | `#5f6672`              | `rgb(235 235 245 / 60%)`   |
| `--virt-tree-color-icon-bg-hover`             | 展开箭头悬停底色         | `rgb(31 35 41 / 10%)`  | `rgb(235 235 245 / 14%)`   |
| `--virt-tree-line-color`                      | 层级连接线               | `#d6d9dd`              | `#3c3f46`                  |
| `--virt-tree-color-checkbox-bg`               | 复选框底色               | `#fff`                 | `transparent`              |
| `--virt-tree-color-checkbox-bg-checked`       | 勾选底色                 | `#2a63f0`              | `#3970e4`                  |
| `--virt-tree-color-checkbox-bg-indeterminate` | 半选底色                 | `#2a63f0`              | `#3970e4`                  |
| `--virt-tree-color-checkbox-bg-disabled`      | 禁用底色                 | `#f2f3f5`              | `rgb(235 235 245 / 8%)`    |
| `--virt-tree-color-checkbox-border`           | 复选框描边               | `#c4c7ce`              | `#55575e`                  |
| `--virt-tree-color-checkbox-border-hover`     | 复选框悬停描边           | `#2a63f0`              | `#5a8dfb`                  |
| `--virt-tree-color-checkbox-border-checked`   | 勾选描边                 | `#2a63f0`              | `#3970e4`                  |
| `--virt-tree-color-checkbox-border-indeterminate` | 半选描边             | `#2a63f0`              | `#3970e4`                  |
| `--virt-tree-color-checkbox-border-disabled`  | 禁用描边                 | `#dcdfe4`              | `#3a3b41`                  |
| `--virt-tree-color-checkbox-mark`             | 勾/横杠颜色              | `#fff`                 | `#fff`                     |
| `--virt-tree-color-drag-line`                 | 拖拽指示线               | `#2a63f0`              | `#5a8dfb`                  |
| `--virt-tree-color-drag-box`                  | 拖入节点内的高亮框底色   | `rgb(42 99 240 / 8%)`  | `rgb(97 143 250 / 14%)`    |
| `--virt-tree-color-drag-line-disabled`        | 不可放置时的指示线       | `rgb(42 99 240 / 40%)` | `rgb(97 143 250 / 40%)`    |
| `--virt-tree-color-allow-drag-area-bg`        | 可放置区域底色           | `rgb(42 99 240 / 8%)`  | `rgb(97 143 250 / 12%)`    |
| `--virt-tree-color-allow-drag-area-bd`        | 可放置区域描边           | `rgb(42 99 240 / 45%)` | `rgb(97 143 250 / 50%)`    |
| `--virt-tree-color-bg-clone-node`             | 拖拽跟随副本底色         | `#fff`                 | `#26272d`                  |
| `--virt-tree-node-radius`                     | 节点圆角                 | `6px`                  | 同亮色                     |
| `--virt-tree-icon-radius`                     | 箭头悬停底色圆角         | `4px`                  | 同亮色                     |
| `--virt-tree-checkbox-size`                   | 复选框尺寸               | `16px`                 | 同亮色                     |
| `--virt-tree-checkbox-radius`                 | 复选框圆角               | `4px`                  | 同亮色                     |
| `--virt-tree-duration`                        | 过渡时长                 | `160ms`                | 同亮色                     |
| `--virt-tree-ease`                            | 过渡曲线                 | `cubic-bezier(0.4, 0, 0.2, 1)` | 同亮色             |
| `--virt-tree-switcher-icon-margin-right`      | 箭头右间距（同时影响拖拽线左偏移） | `4px`        | 同亮色                     |
| `--virt-tree-drag-line-gap`                   | 跨层级拖拽线的分段间隔   | `4px`                  | 同亮色                     |

### 状态 class

库会在节点上切换以下 class，可直接用于自定义样式：

| class           | 元素                    | 含义         |
| --------------- | ----------------------- | ------------ |
| `is-selected`   | `.virt-tree-node`       | 已选中       |
| `is-focused`    | `.virt-tree-node`       | 已聚焦       |
| `is-disabled`   | `.virt-tree-node`       | 禁止选中     |
| `is-expanded`   | `.virt-tree-icon-wrapper` | 已展开     |
| `is-checked`    | `.virt-tree-checkbox`   | 已勾选       |
| `is-indeterminate` | `.virt-tree-checkbox` | 半选         |
| `is-dragging`   | `.virt-list__client`    | 拖拽进行中   |

```css
/* 例：换成品牌绿，并放大节点圆角 */
.virt-tree-item {
  --virt-tree-color-text-selected: #12854a;
  --virt-tree-color-node-bg-selected: rgb(24 160 88 / 12%);
  --virt-tree-color-checkbox-bg-checked: #18a058;
  --virt-tree-color-checkbox-border-checked: #18a058;
  --virt-tree-node-radius: 10px;
}
```

::: tip 减少动效
样式已适配 `prefers-reduced-motion: reduce`，系统开启「减弱动态效果」时会自动关闭箭头旋转、勾选与背景过渡动画。
:::
