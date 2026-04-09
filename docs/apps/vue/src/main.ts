import { createApp, type App as VueApp } from 'vue';
import ArcoVue from '@arco-design/web-vue';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import App from './App';
import './style.css';
import '@arco-design/web-vue/dist/arco.css';

type FrameworkKind = 'react' | 'vue';

interface QiankunProps {
  container?: Element;
  exampleId?: string;
  framework?: FrameworkKind;
  onEvent?: (payload: { framework: FrameworkKind; message: string }) => void;
}

let app: VueApp<Element> | null = null;

function getContainer(props?: QiankunProps) {
  if (props?.container) {
    const node = props.container.querySelector('#vue-root') ?? props.container.querySelector('#app');
    if (node) return node as HTMLElement;
  }
  return document.getElementById('vue-root') ?? document.getElementById('app');
}

function render(props?: QiankunProps) {
  const container = getContainer(props);
  if (!container) return;

  app?.unmount();
  app = createApp(App, {
    exampleId: props?.exampleId,
    onEvent: props?.onEvent,
  });
  app.use(ArcoVue);
  app.mount(container);
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
    app?.unmount();
    app = null;
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
