import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import PlaygroundHost from './components/PlaygroundHost.vue';
import FwNavLink from './components/FwNavLink.vue';
import Layout from './Layout.vue';
import './styles/playground.css';

const theme: Theme = {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('PlaygroundHost', PlaygroundHost);
    app.component('FwNavLink', FwNavLink);
  },
};

export default theme;
