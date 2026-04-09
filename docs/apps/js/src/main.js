import './style.css';
import {
  qiankunWindow,
  renderWithQiankun,
} from 'vite-plugin-qiankun/dist/helper';
import { bootstrapLiteral } from './components/list/literal.js';
import { bootstrapVirtList } from './components/list/virt-list.js';
import { bootstrapBasic } from './components/list/basic.js';
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


const demoBootstrapMap = {
  literal: bootstrapLiteral,
  'virt-list': bootstrapVirtList,
  'virt-grid': bootstrapVirtGrid,
  basic: bootstrapBasic,
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

let cleanup = null;

function render(props) {
  const root =
    props?.container?.querySelector('#js-root') ??
    document.getElementById('js-root');
  if (!root) return;
  const exampleId = props?.exampleId ?? 'virt-list';
  const bootstrap =
    demoBootstrapMap[exampleId] ?? demoBootstrapMap['virt-list'];
  cleanup?.();
  cleanup = bootstrap(root);
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
