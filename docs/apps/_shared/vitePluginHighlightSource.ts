import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';
import { createHighlighter, type Highlighter } from 'shiki';

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

export function highlightSource(): Plugin {
  let highlighter: Highlighter | null = null;

  async function getHighlighter(): Promise<Highlighter> {
    highlighter ??= await createHighlighter({
      themes: [THEMES.light, THEMES.dark],
      langs: Object.values(LANG_BY_EXT),
    });
    return highlighter;
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

      const raw = await readFile(file, 'utf-8');
      const hl = await getHighlighter();
      const html = hl.codeToHtml(raw, {
        lang: langOf(file),
        themes: THEMES,
        // 生成 --shiki-dark 变量，配合 CSS 切换明暗
        defaultColor: false,
      });

      return `export default ${JSON.stringify({ html, raw })};`;
    },

    async buildEnd() {
      highlighter?.dispose();
      highlighter = null;
    },
  };
}
