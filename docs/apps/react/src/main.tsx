import { createRoot, type Root } from 'react-dom/client';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import App from './App';
import './style.css';

type FrameworkKind = 'react' | 'vue';

interface QiankunProps {
  container?: Element;
  exampleId?: string;
  framework?: FrameworkKind;
  onEvent?: (payload: { framework: FrameworkKind; message: string }) => void;
}

let root: Root | null = null;

function getContainer(props?: QiankunProps) {
  if (props?.container) {
    const node = props.container.querySelector('#react-root') ?? props.container.querySelector('#root');
    if (node) return node as HTMLElement;
  }
  return document.getElementById('react-root') ?? document.getElementById('root');
}

function render(props?: QiankunProps) {
  const container = getContainer(props);
  if (!container) return;

  root?.unmount();
  root = createRoot(container);
  root.render(
    <App
      exampleId={props?.exampleId}
      onEvent={(message) => {
        props?.onEvent?.({ framework: 'react', message });
      }}
    />,
  );
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
    root?.unmount();
    root = null;
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
