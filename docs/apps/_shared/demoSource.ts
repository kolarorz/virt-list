/**
 * `import xxx from './Foo.vue?highlight'` 的产物。
 *
 * html 是构建时用 shiki 生成的高亮片段（直接渲染），raw 是原始源码（供复制）。
 * 见 vitePluginHighlightSource.ts。
 */
export interface DemoSource {
  html: string;
  raw: string;
}
