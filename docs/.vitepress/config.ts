import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';
import { FRAMEWORK_LABELS } from './shared/frameworks';

const deployBase = process.env.DEPLOY_BASE;
const base = deployBase || '/';

/** frameworks 缺省表示所有框架都有该示例；指定则只在这些框架的侧边栏里出现 */
/** 已经有 AI 场景文档的框架，与 useFramework.ts 的 MODULE_FRAMEWORKS.ai 同步 */
const AI_FRAMEWORKS = ['vanilla', 'vue', 'vue2', 'react', 'react-legacy'];

const listDemos: { text: string; link: string; frameworks?: string[] }[] = [
  { text: '基础', link: 'list-basic' },
  { text: '空状态', link: 'list-empty' },
  { text: '渲染 buffer', link: 'list-buffer' },
  { text: '100万条数据', link: 'list-huge-data' },
  { text: '固定高度', link: 'list-fixed' },
  { text: '水平滚动', link: 'list-horizontal' },
  { text: '插槽', link: 'list-slots' },
  { text: '各类操作', link: 'list-operations' },
  { text: '平滑滚动', link: 'list-smooth' },
  { text: '可变窗口大小', link: 'list-resize' },
  { text: '可变高度', link: 'list-dynamic' },
  { text: '无限加载', link: 'list-infinity' },
  { text: '聊天室', link: 'list-chat' },
  { text: '聊天室（折叠消息）', link: 'list-chat-collapse' },
  { text: '上下分页', link: 'list-pagination' },
  { text: 'keep-alive', link: 'list-keep-alive' },
  { text: '表格', link: 'list-table' },
  { text: '高阶用法', link: 'list-advanced' },
  { text: '响应式更新', link: 'list-reactive' },
  { text: '扁平渲染', link: 'list-flat-render' },
];

const treeDemos = [
  { text: '基础', link: 'tree-basic' },
  { text: '展开/折叠', link: 'tree-expand' },
  { text: '复选框', link: 'tree-checkbox' },
  { text: '选择', link: 'tree-select' },
  { text: '聚焦', link: 'tree-focus' },
  { text: '过滤', link: 'tree-filter' },
  { text: '自定义内容', link: 'tree-content' },
  { text: '自定义图标', link: 'tree-icon' },
  { text: '自定义节点', link: 'tree-default' },
  { text: '连接线', link: 'tree-showline' },
  { text: '插槽', link: 'tree-slots' },
  { text: '操作/滚动', link: 'tree-operate' },
  { text: '拖拽', link: 'tree-drag' },
  { text: '同级拖拽', link: 'tree-dragarea' },
];

const gridDemos = [
  { text: '基础', link: 'grid-basic' },
];

function buildExamplesSidebar(fw: string) {
  return [
    // 示例是大家找 demo 的第一站，AI 场景的演示在这里也要露出一条入口。
    // 链接指向 ai 模块本身，避免同一个 demo 维护两份页面
    ...(AI_FRAMEWORKS.includes(fw)
      ? [
          {
            text: 'AI 场景',
            collapsed: false,
            items: [
              { text: '流式对话', link: `/${fw}/ai/streaming` },
              { text: '整段复制', link: `/${fw}/ai/copy` },
              { text: '搜索与跳转', link: `/${fw}/ai/search` },
              { text: 'Agent 执行流', link: `/${fw}/ai/trace` },
              { text: '语义滚动条', link: `/${fw}/ai/outline` },
            ],
          },
        ]
      : []),
    {
      text: '虚拟列表',
      collapsed: false,
      items: listDemos
        .filter((d) => !d.frameworks || d.frameworks.includes(fw))
        .map((d) => ({ text: d.text, link: `/${fw}/examples/list/${d.link}` })),
    },
    {
      text: '虚拟树形',
      collapsed: false,
      items: treeDemos.map((d) => ({ text: d.text, link: `/${fw}/examples/tree/${d.link}` })),
    },
    {
      text: '网格布局',
      collapsed: false,
      items: gridDemos.map((d) => ({ text: d.text, link: `/${fw}/examples/grid/${d.link}` })),
    },
  ];
}

function buildGuideSidebar(fw: string) {
  return [
    {
      text: '指南',
      items: [
        { text: '项目介绍', link: `/${fw}/guide/introduction` },
        { text: '快速开始', link: `/${fw}/guide/started` },
        { text: '特殊说明', link: `/${fw}/guide/instructions` },
        { text: '分页与无限加载', link: `/${fw}/guide/load-more` },
        { text: '滚动是怎么工作的', link: `/${fw}/guide/custom-scrollbar` },
      ],
    },
    {
      text: '深入',
      items: [
        { text: '虚拟滚动原理', link: `/${fw}/guide/principles` },
        { text: '算法与复杂度', link: `/${fw}/guide/algorithms` },
        { text: '架构设计', link: `/${fw}/guide/architecture` },
        { text: '设计决策', link: `/${fw}/guide/design-decisions` },
        { text: '为什么不用占位元素', link: `/${fw}/guide/why-no-spacer` },
        { text: '与同类方案对比', link: `/${fw}/guide/comparison` },
      ],
    },
  ];
}

/**
 * AI 场景。
 *
 * 与其他三个模块是不同维度：`guide` 讲怎么用、`examples` 是单点演示、
 * `api` 是参数表，而这里讲的是**多个能力协同起来解决一类场景**——
 * 流式输出、贴底跟随、脱离、历史加载在 AI 对话里必须一起工作。
 */
function buildAiSidebar(fw: string) {
  return [
    {
      text: 'AI 场景',
      items: [
        { text: '概览', link: `/${fw}/ai/overview` },
        { text: '流式输出与贴底跟随', link: `/${fw}/ai/streaming` },
        { text: '整段复制', link: `/${fw}/ai/copy` },
        { text: '搜索与引用跳转', link: `/${fw}/ai/search` },
        { text: '会话历史', link: `/${fw}/ai/history` },
        { text: 'Agent 执行流', link: `/${fw}/ai/trace` },
        { text: '语义滚动条', link: `/${fw}/ai/outline` },
      ],
    },
  ];
}

function buildApiSidebar(fw: string) {
  return [
    {
      text: 'API',
      items: [
        { text: 'VirtList', link: `/${fw}/api/virt-list` },
        { text: 'VirtTree', link: `/${fw}/api/virt-tree` },
        { text: 'VirtGrid', link: `/${fw}/api/virt-grid` },
      ],
    },
  ];
}

export default defineConfig({
  base,
  title: 'VirtList',
  description: 'A high-performance virtual list component for JavaScript',
  // _shared 下的片段只用于 @include，不作为独立页面构建
  // （否则片段里的相对链接无从解析，搜索索引里也会多出一份重复内容）
  // apps/*/README.md 是微应用的开发说明，跟着 docs/ 一起被扫成了页面，
  // 搜索里冒出「运行」「示例应用」这类跟组件无关的条目，也一并排除
  srcExclude: ['_shared/**', 'apps/*/README.md'],
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
  ],
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/kolarorz/virt-list',
      },
    ],
    logo: '/logo.svg',
    search: {
      provider: 'local',
      options: {
        /**
         * 给索引里的 h1 补上框架名。
         *
         * 五份框架文档的页面标题大量重名（每个框架下都有「基础」「插槽」
         * 「VirtList API」），默认索引出来的结果就是五条一模一样的「基础」，
         * 点进去才知道是哪个框架的。这里在 h1 后面接一个框架名：h1 那一条
         * 显示成「基础 · Vue 3」，页内各级标题的面包屑也跟着变成
         * 「基础 · Vue 3 › 参数」。
         *
         * `_render` 只作用于搜索索引，页面本身的标题不受影响；`processIncludes`
         * 在这之前已经跑过，所以 @include 进来的 h1 一样能匹配到。
         */
        _render(src, env, md) {
          const html = md.render(src, env);
          // 自己接手 _render 之后，VitePress 内置的这个开关就得自己兜
          if (env.frontmatter?.search === false) return '';
          const label = FRAMEWORK_LABELS[env.relativePath.split('/')[0] as keyof typeof FRAMEWORK_LABELS];
          if (!label) return html;
          // 插在 header-anchor 之前（切分索引时正是取 <a> 前面的那段当标题）；
          // 万一以后锚点结构变了，这里匹配不上就只是少个框架名，不会丢内容
          return html.replace(
            /(<h1\b[^>]*>)([\s\S]*?)(<a\b[^>]*?class="header-anchor")/,
            `$1$2· ${label} $3`,
          );
        },
        miniSearch: {
          searchOptions: {
            /**
             * 当前在看哪个框架，就把那个框架的结果排前面。
             *
             * 不做过滤而只是降权：React 的 render props、Vue 的插槽这些内容
             * 各框架本来就不一样，在 Vue 文档里搜 React 的写法也该搜得到，
             * 只是不该压在前面。
             *
             * 注意：这个函数会被序列化成字符串、在浏览器里重建执行，
             * **不能引用任何外部变量**，所以框架清单只能写死在正则里
             * （与 shared/frameworks.ts 的 FRAMEWORKS 保持一致；
             * vue2/react-legacy 要排在 vue/react 前面，否则会被前缀吃掉）。
             */
            boostDocument: (id: string) => {
              // 0.05 这个量级足以让本框架的匹配全部排在前面，
              // 又不至于把别的框架整段埋掉（React 文档里搜「插槽」仍能翻到 Vue 的写法）
              const re = /\/(vanilla|vue2|vue|react-legacy|react)\//;
              const page = re.exec(String(id));
              if (!page) return 1;
              const here =
                typeof location === 'undefined' ? null : re.exec(location.pathname);
              if (!here) return 1;
              return page[1] === here[1] ? 1 : 0.05;
            },
          },
        },
      },
    },
    nav: [
      { component: 'FwNavLink', props: { text: '指南', mod: 'guide' } },
      {
        component: 'FwNavLink',
        props: { text: 'AI 场景', mod: 'ai', badge: true },
      },
      { component: 'FwNavLink', props: { text: '示例', mod: 'examples' } },
      { component: 'FwNavLink', props: { text: 'API', mod: 'api' } },
    ],
    sidebar: {
      '/vanilla/guide/': buildGuideSidebar('vanilla'),
      '/vue/guide/': buildGuideSidebar('vue'),
      '/vue2/guide/': buildGuideSidebar('vue2'),
      '/react/guide/': buildGuideSidebar('react'),
      '/react-legacy/guide/': buildGuideSidebar('react-legacy'),

      '/vanilla/examples/': buildExamplesSidebar('vanilla'),
      '/vue/examples/': buildExamplesSidebar('vue'),
      '/vue2/examples/': buildExamplesSidebar('vue2'),
      '/react/examples/': buildExamplesSidebar('react'),
      '/react-legacy/examples/': buildExamplesSidebar('react-legacy'),

      // 五个框架当前都已覆盖。这套「按框架列表生成」的写法保留着：
      // 下一个逐步铺开的模块可以照用，未覆盖的框架下导航会指向已覆盖的那个、
      // 框架切换器也会置灰（见 theme/composables/useFramework.ts 的 MODULE_FRAMEWORKS）
      ...Object.fromEntries(
        AI_FRAMEWORKS.map((fw) => [`/${fw}/ai/`, buildAiSidebar(fw)]),
      ),

      '/vanilla/api/': buildApiSidebar('vanilla'),
      '/vue/api/': buildApiSidebar('vue'),
      '/vue2/api/': buildApiSidebar('vue2'),
      '/react/api/': buildApiSidebar('react'),
      '/react-legacy/api/': buildApiSidebar('react-legacy'),
    },
  },
  vite: {
    server: {
      port: 7800,
    },
    resolve: {
      alias: {
        '@virt-list/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
        '@virt-list/vanilla': fileURLToPath(new URL('../../packages/vanilla/src/index.ts', import.meta.url)),
        '@virt-list/vue': fileURLToPath(new URL('../../packages/vue/src/index.ts', import.meta.url)),
        '@virt-list/vue2': fileURLToPath(new URL('../../packages/vue2/src/index.ts', import.meta.url)),
        '@virt-list/react': fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url)),
        '@virt-list/react-legacy': fileURLToPath(new URL('../../packages/react-legacy/src/index.ts', import.meta.url)),
      },
    },
  },
});
