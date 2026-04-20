import Vue from 'vue';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import App from './App';
import './style.css';

type FrameworkKind = 'react' | 'vue' | 'vue2';

interface QiankunProps {
  container?: Element;
  exampleId?: string;
  framework?: FrameworkKind;
  onEvent?: (payload: { framework: FrameworkKind; message: string }) => void;
}

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
