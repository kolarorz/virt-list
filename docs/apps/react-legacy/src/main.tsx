import ReactDOM from 'react-dom';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import App from './App';
import './style.css';

type FrameworkKind = 'react' | 'react-legacy' | 'vue';

interface QiankunProps {
  container?: Element;
  exampleId?: string;
  framework?: FrameworkKind;
  onEvent?: (payload: { framework: FrameworkKind; message: string }) => void;
}

let container: HTMLElement | null = null;

function getContainer(props?: QiankunProps) {
  if (props?.container) {
    const node = props.container.querySelector('#react-legacy-root') ?? props.container.querySelector('#root');
    if (node) return node as HTMLElement;
  }
  return document.getElementById('react-legacy-root') ?? document.getElementById('root');
}

function render(props?: QiankunProps) {
  container = getContainer(props);
  if (!container) return;

  ReactDOM.render(
    <App
      exampleId={props?.exampleId}
      onEvent={(message: string) => {
        props?.onEvent?.({ framework: 'react-legacy', message });
      }}
    />,
    container,
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
    if (container) {
      ReactDOM.unmountComponentAtNode(container);
      container = null;
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
