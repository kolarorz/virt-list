import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import PlaygroundHost from './components/PlaygroundHost.vue';
import FwNavLink from './components/FwNavLink.vue';
import BenchmarkPanel from './components/BenchmarkPanel.vue';
import ComplexityTable from './components/ComplexityTable.vue';
import Layout from './Layout.vue';
// 顺序有意义：变量 → 骨架 → 导航 → 正文 → 首页 → 示例页，后者可覆盖前者
import './styles/vars.css';
import './styles/layout.css';
import './styles/sidebar.css';
import './styles/doc.css';
import './styles/home.css';
import './styles/playground.css';

const theme: Theme = {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('PlaygroundHost', PlaygroundHost);
    app.component('FwNavLink', FwNavLink);
    app.component('BenchmarkPanel', BenchmarkPanel);
    app.component('ComplexityTable', ComplexityTable);
  },
};

export default theme;
