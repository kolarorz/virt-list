import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';
import { createHighlighter, type Highlighter, type ShikiTransformer } from 'shiki';
import { parseFoldMarkers, type FoldRegion } from './demoFold';

/**
 * 把示例源码在**构建时**转成带语法高亮的 HTML。
 *
 * 用法：`import demoSource from './Foo.vue?highlight'`，拿到
 * `{ html, raw }` —— html 直接塞进容器渲染，raw 供"复制"按钮使用。
 *
 * 为什么不在运行时高亮：这些示例本身是性能演示，为了给源码上色而往每个
 * micro-app 里塞一个高亮器（连主题带语法约 60KB gzip）不太合适。构建时做掉，
 * 运行时零成本。
 */

const QUERY = 'highlight';

/**
 * 解析结果包成虚拟模块 id。
 *
 * 不能让 `Foo.vue?highlight` 这个 id 直接进 load —— 后面的 vite:vue 会按扩展名
 * 认领它，把我们返回的 JS 当成模板去解析（报 "Unquoted attribute value..."）。
 * `\0` 前缀的虚拟 id 没有扩展名，各框架插件都不会插手。
 */
const VIRTUAL_PREFIX = '\0highlight:';

/** 与文档站保持同一套主题，暗色通过 CSS 变量切换 */
const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

const LANG_BY_EXT: Record<string, string> = {
  vue: 'vue',
  tsx: 'tsx',
  ts: 'ts',
  jsx: 'jsx',
  js: 'js',
  css: 'css',
  html: 'html',
};

function langOf(file: string): string {
  const ext = file.split('.').pop()?.toLowerCase() ?? '';
  return LANG_BY_EXT[ext] ?? 'txt';
}

/**
 * 把折叠区间的行包进可展开的容器。
 *
 * 为什么在 hast 上做而不是切分源码分段高亮：TextMate 是有状态的行扫描器，
 * 分段高亮会让每段从初始状态重新开始 —— Vue SFC 里 `<template>` 之后的段落
 * 会被当成顶层重新解析，折叠区之后的代码全部串色。所以整体高亮一次，
 * 再按行号重组输出结构。
 *
 * 结构全部用 `<span>`：`<code>` 只允许 phrasing content，`<details>` 塞进去不合法。
 * 展开交互由 DemoBlock 用事件委托处理（v-html 的内容拿不到框架的事件绑定）。
 */
export function foldTransformer(regions: FoldRegion[]): ShikiTransformer {
  return {
    name: 'demo-fold',
    code(node) {
      if (regions.length === 0) return;

      const isLine = (child: (typeof node.children)[number]) =>
        child.type === 'element' && child.tagName === 'span' && String(child.properties?.class ?? '').split(/\s+/).includes('line');

      // 第 k 个 line span 就是第 k 行
      const lineAt: number[] = [];
      node.children.forEach((child, index) => {
        if (isLine(child)) lineAt.push(index);
      });

      // 从后往前替换，前面的下标才不会失效
      for (const region of [...regions].reverse()) {
        const from = lineAt[region.start - 1];
        const to = lineAt[region.end - 1];
        if (from == null || to == null) continue;

        // 区间末尾那个换行也收进折叠块，否则展开时它会叠在 body 的块级断行之后
        // 多出一个空行。摘要行的换行改由 CSS 让 toggle 独占一行来提供。
        const next = node.children[to + 1];
        const last = next?.type === 'text' ? to + 1 : to;

        const body = node.children.slice(from, last + 1);
        const count = region.end - region.start + 1;

        node.children.splice(from, last + 1 - from, {
          type: 'element',
          tagName: 'span',
          properties: { class: 'demo-fold', 'data-open': 'false' },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: {
                class: 'demo-fold__toggle',
                role: 'button',
                tabindex: 0,
                'aria-expanded': 'false',
              },
              children: [{ type: 'text', value: `${region.label}（${count} 行）` }],
            },
            {
              type: 'element',
              tagName: 'span',
              properties: { class: 'demo-fold__body' },
              children: body,
            },
          ],
        });
      }
    },
  };
}

export function highlightSource(): Plugin {
  // 缓存 Promise 而不是实例：vite 并行 load 各个示例，`x ??= await create()`
  // 会让每个并发调用都看到 null 各建一个 highlighter（实测建了 40 多个）
  let highlighterPromise: Promise<Highlighter> | null = null;

  function getHighlighter(): Promise<Highlighter> {
    highlighterPromise ??= createHighlighter({
      themes: [THEMES.light, THEMES.dark],
      langs: Object.values(LANG_BY_EXT),
    });
    return highlighterPromise;
  }

  return {
    name: 'demo-highlight-source',
    // 必须早于 vite 内部的静态资源处理，否则 ?highlight 会被当成未知资源
    enforce: 'pre',

    async resolveId(id, importer) {
      const [file, query] = id.split('?');
      if (query !== QUERY || !file) return null;

      const resolved = await this.resolve(file, importer, { skipSelf: true });
      return resolved ? VIRTUAL_PREFIX + resolved.id : null;
    },

    async load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      const file = id.slice(VIRTUAL_PREFIX.length);

      const source = await readFile(file, 'utf-8');
      // 标记行只是给构建看的，不进高亮也不进复制内容
      const { code, regions } = parseFoldMarkers(source);

      const hl = await getHighlighter();
      const html = hl.codeToHtml(code, {
        lang: langOf(file),
        themes: THEMES,
        // 亮色直接写进 color，暗色写进 --shiki-dark 变量，由 CSS 按 .dark 切换。
        // 不能用 defaultColor: false —— 那样连亮色也只写 --shiki-light 变量，
        // 亮色模式下所有 token 都继承父级颜色，等于没高亮。
        defaultColor: 'light',
        transformers: [foldTransformer(regions)],
      });

      return `export default ${JSON.stringify({ html, raw: code })};`;
    },

    async buildEnd() {
      const pending = highlighterPromise;
      highlighterPromise = null;
      // 构建失败时 load 可能还没跑完，await 一下再释放，别把 rejection 漏出去
      await pending?.then((hl) => hl.dispose()).catch(() => {});
    },
  };
}
