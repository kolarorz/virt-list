# vanilla 示例应用

文档站里原生 JS 示例的宿主应用。文档页面通过 `PlaygroundHost` 以 iframe 内嵌本应用的
对应示例，示例源码在 `src/components/` 下按 `list` / `tree` / `grid` / `ai` 分目录存放。

## 运行

```sh
pnpm -C docs/apps/vanilla dev      # 开发，端口 7801
pnpm -C docs/apps/vanilla build    # 构建，产物给文档站用
```
