import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';

const deployBase = process.env.DEPLOY_BASE;

const listDemos = [
  { text: '基础示例', link: 'basic' },
  { text: '空状态', link: 'empty' },
  { text: '渲染buffer', link: 'buffer' },
  { text: '海量数据', link: 'huge-data' },
  { text: '固定高度', link: 'fixed' },
  { text: '水平滚动', link: 'horizontal' },
  { text: '插槽', link: 'slots' },
  { text: '各类操作', link: 'operations' },
  { text: '可变窗口大小', link: 'resize' },
  { text: '可变高度', link: 'dynamic' },
  { text: '无限加载', link: 'infinity' },
  { text: '聊天室', link: 'chat' },
  { text: '上下分页', link: 'pagination' },
  { text: 'keep-alive', link: 'keep-alive' },
  { text: '表格', link: 'table' },
  { text: '高阶用法', link: 'advanced' },
  { text: '响应式更新', link: 'reactive' },
];

const treeDemos = [
  { text: '基础', link: 'virt-tree-basic' },
  { text: '展开/折叠', link: 'virt-tree-expand' },
  { text: '复选框', link: 'virt-tree-checkbox' },
  { text: '选择', link: 'virt-tree-select' },
  { text: '聚焦', link: 'virt-tree-focus' },
  { text: '过滤', link: 'virt-tree-filter' },
  { text: '自定义内容', link: 'virt-tree-content' },
  { text: '自定义图标', link: 'virt-tree-icon' },
  { text: '自定义节点', link: 'virt-tree-default' },
  { text: '连接线', link: 'virt-tree-showline' },
  { text: '插槽', link: 'virt-tree-slots' },
  { text: '操作/滚动', link: 'virt-tree-operate' },
  { text: '拖拽', link: 'virt-tree-drag' },
  { text: '同级拖拽', link: 'virt-tree-dragarea' },
];

const gridDemos = [
  { text: '基础', link: 'virt-grid' },
];

function buildExamplesSidebar(fw: string) {
  return [
    {
      text: '虚拟列表示例',
      items: listDemos.map((d) => ({ text: d.text, link: `/${fw}/examples/${d.link}` })),
    },
    {
      text: '虚拟树',
      items: treeDemos.map((d) => ({ text: d.text, link: `/${fw}/examples/${d.link}` })),
    },
    {
      text: '网格布局',
      items: gridDemos.map((d) => ({ text: d.text, link: `/${fw}/examples/${d.link}` })),
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
      '/react/guide/': buildGuideSidebar('react'),

      '/vanilla/examples/': buildExamplesSidebar('vanilla'),
      '/vue/examples/': buildExamplesSidebar('vue'),
      '/react/examples/': buildExamplesSidebar('react'),

      '/vanilla/api/': buildApiSidebar('vanilla'),
      '/vue/api/': buildApiSidebar('vue'),
      '/react/api/': buildApiSidebar('react'),
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
        '@virt-list/react': fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url)),
      },
    },
  },
});
