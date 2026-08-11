import './style.css';
import {
  qiankunWindow,
  renderWithQiankun,
} from 'vite-plugin-qiankun/dist/helper';
import { mountDemoBlock } from './demo-block.js';
import { syncStandaloneTheme } from '../../_shared/theme';
// 自绘滚动条的样式：所有 demo 都用它，脚手架层常驻引入
import '@virt-list/vanilla/src/scrollbar/scrollbar.css';

// 独立运行时按系统偏好同步暗色；嵌入文档时由 VitePress 控制
syncStandaloneTheme(Boolean(qiankunWindow.__POWERED_BY_QIANKUN__));

import { bootstrapBasic } from './components/list/list-basic.js';
import { bootstrapBuffer } from './components/list/list-buffer.js';
import { bootstrapHugeData } from './components/list/list-huge-data.js';
import { bootstrapFixed } from './components/list/list-fixed.js';
import { bootstrapHorizontal } from './components/list/list-horizontal.js';
import { bootstrapSlots } from './components/list/list-slots.js';
import { bootstrapFlatRender } from './components/list/list-flat-render.js';
import { bootstrapOperations } from './components/list/list-operations.js';
import { bootstrapSmooth } from './components/list/list-smooth.js';
import { bootstrapResize } from './components/list/list-resize.js';
import { bootstrapDynamic } from './components/list/list-dynamic.js';
import { bootstrapInfinity } from './components/list/list-infinity.js';
import { bootstrapChat } from './components/list/list-chat.js';
import { bootstrapChatCollapse } from './components/list/list-chat-collapse.js';
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

import { bootstrapAiStreaming } from './components/ai/ai-streaming.js';
import { bootstrapAiCopy } from './components/ai/ai-copy.js';
import { bootstrapAiSearch } from './components/ai/ai-search.js';
import { bootstrapAiTrace } from './components/ai/ai-trace.js';
import { bootstrapAiOutline } from './components/ai/ai-outline.js';

/** 构建时已高亮的源码：{ html, raw }，见 _shared/vitePluginHighlightSource.js */
const highlightedSources = import.meta.glob('./components/**/*.js', {
  query: '?highlight',
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
  'list-smooth': bootstrapSmooth,
  'list-resize': bootstrapResize,
  'list-dynamic': bootstrapDynamic,
  'list-table': bootstrapTable,
  'list-infinity': bootstrapInfinity,
  'list-chat': bootstrapChat,
  'list-chat-collapse': bootstrapChatCollapse,
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

  'ai-streaming': bootstrapAiStreaming,
  'ai-copy': bootstrapAiCopy,
  'ai-search': bootstrapAiSearch,
  'ai-trace': bootstrapAiTrace,
  'ai-outline': bootstrapAiOutline,
};

/**
 * 源码路径由 exampleId 直接推出（`list-chat` → `./components/list/list-chat.js`），
 * 不再手维护一张映射表——漏一条不会报错，只会静默显示成别的示例的代码。
 */
function getDemoSource(exampleId) {
  const kind = exampleId.split('-')[0];
  return (
    highlightedSources[`./components/${kind}/${exampleId}.js`] ??
    highlightedSources['./components/list/list-basic.js'] ?? { html: '', raw: '' }
  );
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
