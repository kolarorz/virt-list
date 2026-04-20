import './style.css';
import {
  qiankunWindow,
  renderWithQiankun,
} from 'vite-plugin-qiankun/dist/helper';
import { mountDemoBlock } from './demo-block.js';

import { bootstrapBasic } from './components/list/list-basic.js';
import { bootstrapBuffer } from './components/list/list-buffer.js';
import { bootstrapHugeData } from './components/list/list-huge-data.js';
import { bootstrapFixed } from './components/list/list-fixed.js';
import { bootstrapHorizontal } from './components/list/list-horizontal.js';
import { bootstrapSlots } from './components/list/list-slots.js';
import { bootstrapFlatRender } from './components/list/list-flat-render.js';
import { bootstrapOperations } from './components/list/list-operations.js';
import { bootstrapResize } from './components/list/list-resize.js';
import { bootstrapDynamic } from './components/list/list-dynamic.js';
import { bootstrapInfinity } from './components/list/list-infinity.js';
import { bootstrapChat } from './components/list/list-chat.js';
import { bootstrapAdvanced } from './components/list/list-advanced.js';
import { bootstrapPagination } from './components/list/list-pagination.js';
import { bootstrapKeepAlive } from './components/list/list-keep-alive.js';
import { bootstrapTable } from './components/list/list-table.js';
import { bootstrapEmpty } from './components/list/list-empty.js';
import { bootstrapReactive } from './components/list/list-reactive.js';

import { bootstrapTreeBasic } from './components/tree/tree-basic.js';
import { bootstrapTreeCheckbox } from './components/tree/tree-checkbox.js';
import { bootstrapTreeExpand } from './components/tree/tree-expand.js';
import { bootstrapTreeFilter } from './components/tree/tree-filter.js';
import { bootstrapTreeSelect } from './components/tree/tree-select.js';
import { bootstrapTreeShowLine } from './components/tree/tree-showline.js';
import { bootstrapTreeContent } from './components/tree/tree-content.js';
import { bootstrapTreeDrag } from './components/tree/tree-drag.js';
import { bootstrapTreeFocus } from './components/tree/tree-focus.js';
import { bootstrapTreeOperate } from './components/tree/tree-operate.js';
import { bootstrapTreeSlots } from './components/tree/tree-slots.js';
import { bootstrapTreeIcon } from './components/tree/tree-icon.js';
import { bootstrapTreeDefault } from './components/tree/tree-default.js';
import { bootstrapTreeDragArea } from './components/tree/tree-dragarea.js';

import { bootstrapGridBasic } from './components/grid/grid-basic.js';

const rawSources = import.meta.glob('./components/**/*.js', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const demoBootstrapMap = {
  'list-basic': bootstrapBasic,
  'list-buffer': bootstrapBuffer,
  'list-huge-data': bootstrapHugeData,
  'list-fixed': bootstrapFixed,
  'list-horizontal': bootstrapHorizontal,
  'list-slots': bootstrapSlots,
  'list-flat-render': bootstrapFlatRender,
  'list-operations': bootstrapOperations,
  'list-resize': bootstrapResize,
  'list-dynamic': bootstrapDynamic,
  'list-table': bootstrapTable,
  'list-infinity': bootstrapInfinity,
  'list-chat': bootstrapChat,
  'list-advanced': bootstrapAdvanced,
  'list-pagination': bootstrapPagination,
  'list-keep-alive': bootstrapKeepAlive,
  'list-empty': bootstrapEmpty,
  'list-reactive': bootstrapReactive,

  'tree-basic': bootstrapTreeBasic,
  'tree-checkbox': bootstrapTreeCheckbox,
  'tree-expand': bootstrapTreeExpand,
  'tree-filter': bootstrapTreeFilter,
  'tree-select': bootstrapTreeSelect,
  'tree-showline': bootstrapTreeShowLine,
  'tree-content': bootstrapTreeContent,
  'tree-drag': bootstrapTreeDrag,
  'tree-focus': bootstrapTreeFocus,
  'tree-operate': bootstrapTreeOperate,
  'tree-slots': bootstrapTreeSlots,
  'tree-icon': bootstrapTreeIcon,
  'tree-default': bootstrapTreeDefault,
  'tree-dragarea': bootstrapTreeDragArea,

  'grid-basic': bootstrapGridBasic,
};

const demoSourceMap = {
  'list-basic': './components/list/list-basic.js',
  'list-buffer': './components/list/list-buffer.js',
  'list-huge-data': './components/list/list-huge-data.js',
  'list-fixed': './components/list/list-fixed.js',
  'list-horizontal': './components/list/list-horizontal.js',
  'list-slots': './components/list/list-slots.js',
  'list-flat-render': './components/list/list-flat-render.js',
  'list-operations': './components/list/list-operations.js',
  'list-resize': './components/list/list-resize.js',
  'list-dynamic': './components/list/list-dynamic.js',
  'list-table': './components/list/list-table.js',
  'list-infinity': './components/list/list-infinity.js',
  'list-chat': './components/list/list-chat.js',
  'list-advanced': './components/list/list-advanced.js',
  'list-pagination': './components/list/list-pagination.js',
  'list-keep-alive': './components/list/list-keep-alive.js',
  'list-empty': './components/list/list-empty.js',
  'list-reactive': './components/list/list-reactive.js',

  'tree-basic': './components/tree/tree-basic.js',
  'tree-checkbox': './components/tree/tree-checkbox.js',
  'tree-expand': './components/tree/tree-expand.js',
  'tree-filter': './components/tree/tree-filter.js',
  'tree-select': './components/tree/tree-select.js',
  'tree-showline': './components/tree/tree-showline.js',
  'tree-content': './components/tree/tree-content.js',
  'tree-drag': './components/tree/tree-drag.js',
  'tree-focus': './components/tree/tree-focus.js',
  'tree-operate': './components/tree/tree-operate.js',
  'tree-slots': './components/tree/tree-slots.js',
  'tree-icon': './components/tree/tree-icon.js',
  'tree-default': './components/tree/tree-default.js',
  'tree-dragarea': './components/tree/tree-dragarea.js',

  'grid-basic': './components/grid/grid-basic.js',
};

function getDemoSource(exampleId) {
  const path = demoSourceMap[exampleId] || demoSourceMap['list-basic'];
  return rawSources[path] || '';
}

let cleanup = null;

function render(props) {
  const root =
    props?.container?.querySelector('#vanilla-root') ??
    document.getElementById('vanilla-root');
  if (!root) return;
  const exampleId = props?.exampleId ?? 'list-basic';
  const bootstrap =
    demoBootstrapMap[exampleId] ?? demoBootstrapMap['list-basic'];
  const sourceCode = getDemoSource(exampleId);
  cleanup?.();
  const block = mountDemoBlock(root, sourceCode);
  const unmountDemo = bootstrap(block.mountEl);
  cleanup = () => {
    unmountDemo?.();
    block.destroy();
  };
}

renderWithQiankun({
  bootstrap() {
    return Promise.resolve();
  },
  mount(props) {
    render(props);
    return Promise.resolve();
  },
  unmount() {
    cleanup?.();
    cleanup = null;
    return Promise.resolve();
  },
  update(props) {
    render(props);
    return Promise.resolve();
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render();
}
