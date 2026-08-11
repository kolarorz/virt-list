import Vue from 'vue';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import App from './App';
import './style.css';
import { syncStandaloneTheme } from '../../_shared/theme';
// 滚动条与树的样式：所有 demo 都用它，脚手架层常驻引入。
// 框架包的主入口不再 import css（那会让纯 Node 环境 import 不了整个包），
// 发布后的使用方引 '@virt-list/<fw>/style.css' 即可；这里走 alias 直连源码，
// 所以分别引 vanilla 的两份原始样式。
import '@virt-list/vanilla/src/scrollbar/scrollbar.css';
import '@virt-list/vanilla/src/tree/tree.css';

type FrameworkKind = 'react' | 'vue' | 'vue2';

interface QiankunProps {
  container?: Element;
  exampleId?: string;
  framework?: FrameworkKind;
  onEvent?: (payload: { framework: FrameworkKind; message: string }) => void;
}

// 独立运行时按系统偏好同步暗色；嵌入文档时由 VitePress 控制
syncStandaloneTheme(Boolean(qiankunWindow.__POWERED_BY_QIANKUN__));

let app: Vue | null = null;

function getContainer(props?: QiankunProps) {
  if (props?.container) {
    const node = props.container.querySelector('#vue2-root') ?? props.container.querySelector('#app');
    if (node) return node as HTMLElement;
  }
  return document.getElementById('vue2-root') ?? document.getElementById('app');
}

function render(props?: QiankunProps) {
  const container = getContainer(props);
  if (!container) return;

  if (app) {
    app.$destroy();
  }

  app = new Vue({
    render: (h) =>
      h(App as any, {
        props: {
          exampleId: props?.exampleId,
          onEvent: props?.onEvent,
        },
      }),
  });
  app.$mount(container);
}

renderWithQiankun({
  bootstrap() {
    return Promise.resolve();
  },
  mount(props) {
    render(props as QiankunProps);
    return Promise.resolve();
  },
  unmount() {
    if (app) {
      app.$destroy();
      app = null;
    }
    return Promise.resolve();
  },
  update(props) {
    render(props as QiankunProps);
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render();
}
