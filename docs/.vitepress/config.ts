import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';

const deployBase = process.env.DEPLOY_BASE;

const listDemos = [
  { text: '基础', link: 'list-basic' },
  { text: '空状态', link: 'list-empty' },
  { text: '渲染buffer', link: 'list-buffer' },
  { text: '海量数据', link: 'list-huge-data' },
  { text: '固定高度', link: 'list-fixed' },
  { text: '水平滚动', link: 'list-horizontal' },
  { text: '插槽', link: 'list-slots' },
  { text: '各类操作', link: 'list-operations' },
  { text: '可变窗口大小', link: 'list-resize' },
  { text: '可变高度', link: 'list-dynamic' },
  { text: '无限加载', link: 'list-infinity' },
  { text: '聊天室', link: 'list-chat' },
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
    {
      text: '虚拟列表',
      collapsed: false,
      items: listDemos.map((d) => ({ text: d.text, link: `/${fw}/examples/list/${d.link}` })),
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
        { text: '快速开始', link: `/${fw}/guide/started` },
        { text: '特殊说明', link: `/${fw}/guide/instructions` },
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
  base: deployBase || '/',
  title: 'VirtList',
  description: 'A high-performance virtual list component for JavaScript',
  themeConfig: {
    logo: '/logo.svg',
    search: {
      provider: 'local',
    },
    nav: [
      { component: 'FwNavLink', props: { text: '指南', mod: 'guide' } },
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

      '/vanilla/api/': buildApiSidebar('vanilla'),
      '/vue/api/': buildApiSidebar('vue'),
      '/vue2/api/': buildApiSidebar('vue2'),
      '/react/api/': buildApiSidebar('react'),
      '/react-legacy/api/': buildApiSidebar('react-legacy'),
    },
  },
  vite: {
    server: {
      port: 5173,
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
