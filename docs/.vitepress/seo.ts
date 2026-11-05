import type { HeadConfig, UserConfig } from 'vitepress';
import { FRAMEWORK_LABELS } from './shared/frameworks';

// 公开站地址独立于开发服务器 base，避免本地构建生成错误的根目录 URL。
const siteUrl = 'https://kolarorz.github.io/virt-list/';
const brand = 'VirtList';

export const seo: Pick<UserConfig, 'sitemap' | 'transformPageData'> = {
  sitemap: { hostname: siteUrl },
  transformPageData(page) {
    const framework = FRAMEWORK_LABELS[page.relativePath.split('/')[0] as keyof typeof FRAMEWORK_LABELS];
    const topic = page.title || brand;
    // 页面显式声明的标题与描述优先，框架名仅补到自动推断的标题中。
    if (framework && !page.frontmatter.title) {
      // 少数现有 H1 已带 React / Vue，避免生成 React 18+ React 这样的重复前缀。
      const name = framework.split(' ')[0];
      page.title = topic.startsWith(framework + ' ') ? topic
        : `${framework} ${topic.startsWith(name + ' ') ? topic.slice(name.length + 1) : topic}`;
    }
    if (!page.description) {
      page.description = `${page.title}：${brand} ${framework || 'JavaScript'} 虚拟列表、虚拟树与网格的用法、配置与示例。`;
    }
    const path = page.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '.html');
    const url = new URL(path, siteUrl).href;
    const title = page.titleTemplate === false ? page.title : `${page.title} | ${brand}`;
    const head: HeadConfig[] = [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: brand }],
      ['meta', { property: 'og:locale', content: 'zh_CN' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: page.description }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { name: 'twitter:card', content: 'summary' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: page.description }],
    ];
    // 放进页面数据，让客户端切换路由时也更新标签；保留手写的页面级覆盖。
    const existing: HeadConfig[] = page.frontmatter.head || [];
    page.frontmatter.head = [...head.filter(([tag, attrs]) => !existing.some(([otherTag, other]) =>
      tag === otherTag && (attrs.rel ? attrs.rel === other.rel : attrs.property ? attrs.property === other.property : attrs.name === other.name)
    )), ...existing];
  },
};
