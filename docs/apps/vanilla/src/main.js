import './style.css';
import {
  qiankunWindow,
  renderWithQiankun,
} from 'vite-plugin-qiankun/dist/helper';
import { mountDemoBlock } from './demo-block.js';
import { bootstrapLiteral } from './components/list/literal.js';
import { bootstrapVirtList } from './components/list/virt-list.js';

import { bootstrapBasic } from './components/list/basic.js';
import { bootstrapBuffer } from './components/list/buffer.js';
import { bootstrapHugeData } from './components/list/huge-data.js';
import { bootstrapFixed } from './components/list/fixed.js';
import { bootstrapHorizontal } from './components/list/horizontal.js';
import { bootstrapSlots } from './components/list/slots.js';
import { bootstrapOperations } from './components/list/operations.js';
import { bootstrapResize } from './components/list/resize.js';
import { bootstrapDynamic } from './components/list/dynamic.js';
import { bootstrapInfinity } from './components/list/infinity.js';
import { bootstrapChat } from './components/list/chat.js';
import { bootstrapAdvanced } from './components/list/advanced.js';
import { bootstrapPagination } from './components/list/pagination.js';
import { bootstrapKeepAlive } from './components/list/keep-alive.js';
import { bootstrapTable } from './components/list/table.js';
import { bootstrapEmpty } from './components/list/empty.js';
import { bootstrapReactive } from './components/list/reactive.js';

import { bootstrapTreeBasic } from './components/tree/virt-tree-basic.js';
import { bootstrapTreeCheckbox } from './components/tree/virt-tree-checkbox.js';
import { bootstrapTreeExpand } from './components/tree/virt-tree-expand.js';
import { bootstrapTreeFilter } from './components/tree/virt-tree-filter.js';
import { bootstrapTreeSelect } from './components/tree/virt-tree-select.js';
import { bootstrapTreeShowLine } from './components/tree/virt-tree-showline.js';
import { bootstrapTreeContent } from './components/tree/virt-tree-content.js';
import { bootstrapTreeDrag } from './components/tree/virt-tree-drag.js';
import { bootstrapTreeFocus } from './components/tree/virt-tree-focus.js';
import { bootstrapTreeOperate } from './components/tree/virt-tree-operate.js';
import { bootstrapTreeSlots } from './components/tree/virt-tree-slots.js';
import { bootstrapTreeIcon } from './components/tree/virt-tree-icon.js';
import { bootstrapTreeDefault } from './components/tree/virt-tree-default.js';
import { bootstrapTreeDragArea } from './components/tree/virt-tree-dragarea.js';

import { bootstrapVirtGrid } from './components/grid/virt-grid.js';

const rawSources = import.meta.glob('./components/**/*.js', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const demoBootstrapMap = {
  literal: bootstrapLiteral,
  'virt-list': bootstrapVirtList,
  'virt-grid': bootstrapVirtGrid,

  basic: bootstrapBasic,
  buffer: bootstrapBuffer,
  'huge-data': bootstrapHugeData,
  fixed: bootstrapFixed,
  horizontal: bootstrapHorizontal,
  slots: bootstrapSlots,
  operations: bootstrapOperations,
  resize: bootstrapResize,
  dynamic: bootstrapDynamic,
  table: bootstrapTable,
  infinity: bootstrapInfinity,
  chat: bootstrapChat,
  advanced: bootstrapAdvanced,
  pagination: bootstrapPagination,
  'keep-alive': bootstrapKeepAlive,
  empty: bootstrapEmpty,
  reactive: bootstrapReactive,
  'virt-tree-basic': bootstrapTreeBasic,
  'virt-tree-checkbox': bootstrapTreeCheckbox,
  'virt-tree-expand': bootstrapTreeExpand,
  'virt-tree-filter': bootstrapTreeFilter,
  'virt-tree-select': bootstrapTreeSelect,
  'virt-tree-showline': bootstrapTreeShowLine,
  'virt-tree-content': bootstrapTreeContent,
  'virt-tree-drag': bootstrapTreeDrag,
  'virt-tree-focus': bootstrapTreeFocus,
  'virt-tree-operate': bootstrapTreeOperate,
  'virt-tree-slots': bootstrapTreeSlots,
  'virt-tree-icon': bootstrapTreeIcon,
  'virt-tree-default': bootstrapTreeDefault,
  'virt-tree-dragarea': bootstrapTreeDragArea,
};

const demoSourceMap = {
  literal: './components/list/literal.js',
  'virt-list': './components/list/virt-list.js',
  'virt-grid': './components/grid/virt-grid.js',

  basic: './components/list/basic.js',
  buffer: './components/list/buffer.js',
  'huge-data': './components/list/huge-data.js',
  fixed: './components/list/fixed.js',
  horizontal: './components/list/horizontal.js',
  slots: './components/list/slots.js',
  operations: './components/list/operations.js',
  resize: './components/list/resize.js',
  dynamic: './components/list/dynamic.js',
  table: './components/list/table.js',
  infinity: './components/list/infinity.js',
  chat: './components/list/chat.js',
  advanced: './components/list/advanced.js',
  pagination: './components/list/pagination.js',
  'keep-alive': './components/list/keep-alive.js',
  empty: './components/list/empty.js',
  reactive: './components/list/reactive.js',
  'virt-tree-basic': './components/tree/virt-tree-basic.js',
  'virt-tree-checkbox': './components/tree/virt-tree-checkbox.js',
  'virt-tree-expand': './components/tree/virt-tree-expand.js',
  'virt-tree-filter': './components/tree/virt-tree-filter.js',
  'virt-tree-select': './components/tree/virt-tree-select.js',
  'virt-tree-showline': './components/tree/virt-tree-showline.js',
  'virt-tree-content': './components/tree/virt-tree-content.js',
  'virt-tree-drag': './components/tree/virt-tree-drag.js',
  'virt-tree-focus': './components/tree/virt-tree-focus.js',
  'virt-tree-operate': './components/tree/virt-tree-operate.js',
  'virt-tree-slots': './components/tree/virt-tree-slots.js',
  'virt-tree-icon': './components/tree/virt-tree-icon.js',
  'virt-tree-default': './components/tree/virt-tree-default.js',
  'virt-tree-dragarea': './components/tree/virt-tree-dragarea.js',
};

function getDemoSource(exampleId) {
  const path = demoSourceMap[exampleId] || demoSourceMap['virt-list'];
  return rawSources[path] || '';
}

let cleanup = null;

function render(props) {
  const root =
    props?.container?.querySelector('#vanilla-root') ??
    document.getElementById('vanilla-root');
  if (!root) return;
  const exampleId = props?.exampleId ?? 'virt-list';
  const bootstrap =
    demoBootstrapMap[exampleId] ?? demoBootstrapMap['virt-list'];
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
