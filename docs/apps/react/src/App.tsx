import '@arco-design/web-react/dist/css/arco.css';
import DemoBlock from './components/DemoBlock.tsx';
import Literal from './components/Literal.tsx';
import Widget from './components/Widget.tsx';

import Basic from './components/list/Basic.tsx';
import Buffer from './components/list/Buffer.tsx';
import HugeData from './components/list/HugeData.tsx';
import Fixed from './components/list/Fixed.tsx';
import Horizontal from './components/list/Horizontal.tsx';
import Slots from './components/list/Slots.tsx';
import Operations from './components/list/Operations.tsx';
import Resize from './components/list/Resize.tsx';
import Dynamic from './components/list/Dynamic.tsx';
import Table from './components/list/Table.tsx';
import Infinity from './components/list/Infinity.tsx';
import Chat from './components/list/Chat.tsx';
import Advanced from './components/list/Advanced.tsx';
import Pagination from './components/list/Pagination.tsx';
import KeepAlive from './components/list/KeepAlive.tsx';
import Empty from './components/list/Empty.tsx';
import Reactive from './components/list/Reactive.tsx';

import TreeBasic from './components/tree/TreeBasic.tsx';
import TreeExpand from './components/tree/TreeExpand.tsx';
import TreeCheckbox from './components/tree/TreeCheckbox.tsx';
import TreeSelect from './components/tree/TreeSelect.tsx';
import TreeFilter from './components/tree/TreeFilter.tsx';
import TreeContent from './components/tree/TreeContent.tsx';
import TreeShowLine from './components/tree/TreeShowLine.tsx';
import TreeDrag from './components/tree/TreeDrag.tsx';
import TreeFocus from './components/tree/TreeFocus.tsx';
import TreeOperate from './components/tree/TreeOperate.tsx';
import TreeSlots from './components/tree/TreeSlots.tsx';
import TreeIcon from './components/tree/TreeIcon.tsx';
import TreeDefault from './components/tree/TreeDefault.tsx';
import TreeDragArea from './components/tree/TreeDragArea.tsx';

import VirtGrid from './components/grid/VirtGrid.tsx';

const rawSources = import.meta.glob(
  ['./components/list/*.tsx', './components/tree/*.tsx', './components/grid/*.tsx'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

function src(path: string): string {
  return rawSources[path] ?? '';
}

interface AppProps {
  exampleId?: string;
  onEvent?: (message: string) => void;
}

const demoRenderMap: Record<string, () => JSX.Element> = {
  'literal': () => <Literal />,
  'widget': () => <Widget />,
  'basic': () => <DemoBlock source={src('./components/list/Basic.tsx')}><Basic /></DemoBlock>,
  'buffer': () => <DemoBlock source={src('./components/list/Buffer.tsx')}><Buffer /></DemoBlock>,
  'huge-data': () => <DemoBlock source={src('./components/list/HugeData.tsx')}><HugeData /></DemoBlock>,
  'fixed': () => <DemoBlock source={src('./components/list/Fixed.tsx')}><Fixed /></DemoBlock>,
  'horizontal': () => <DemoBlock source={src('./components/list/Horizontal.tsx')}><Horizontal /></DemoBlock>,
  'slots': () => <DemoBlock source={src('./components/list/Slots.tsx')}><Slots /></DemoBlock>,
  'operations': () => <DemoBlock source={src('./components/list/Operations.tsx')}><Operations /></DemoBlock>,
  'resize': () => <DemoBlock source={src('./components/list/Resize.tsx')}><Resize /></DemoBlock>,
  'dynamic': () => <DemoBlock source={src('./components/list/Dynamic.tsx')}><Dynamic /></DemoBlock>,
  'table': () => <DemoBlock source={src('./components/list/Table.tsx')}><Table /></DemoBlock>,
  'infinity': () => <DemoBlock source={src('./components/list/Infinity.tsx')}><Infinity /></DemoBlock>,
  'chat': () => <DemoBlock source={src('./components/list/Chat.tsx')}><Chat /></DemoBlock>,
  'advanced': () => <DemoBlock source={src('./components/list/Advanced.tsx')}><Advanced /></DemoBlock>,
  'pagination': () => <DemoBlock source={src('./components/list/Pagination.tsx')}><Pagination /></DemoBlock>,
  'keep-alive': () => <DemoBlock source={src('./components/list/KeepAlive.tsx')}><KeepAlive /></DemoBlock>,
  'empty': () => <DemoBlock source={src('./components/list/Empty.tsx')}><Empty /></DemoBlock>,
  'reactive': () => <DemoBlock source={src('./components/list/Reactive.tsx')}><Reactive /></DemoBlock>,
  'virt-tree-basic': () => <DemoBlock source={src('./components/tree/TreeBasic.tsx')}><TreeBasic /></DemoBlock>,
  'virt-tree-expand': () => <DemoBlock source={src('./components/tree/TreeExpand.tsx')}><TreeExpand /></DemoBlock>,
  'virt-tree-checkbox': () => <DemoBlock source={src('./components/tree/TreeCheckbox.tsx')}><TreeCheckbox /></DemoBlock>,
  'virt-tree-select': () => <DemoBlock source={src('./components/tree/TreeSelect.tsx')}><TreeSelect /></DemoBlock>,
  'virt-tree-filter': () => <DemoBlock source={src('./components/tree/TreeFilter.tsx')}><TreeFilter /></DemoBlock>,
  'virt-tree-content': () => <DemoBlock source={src('./components/tree/TreeContent.tsx')}><TreeContent /></DemoBlock>,
  'virt-tree-showline': () => <DemoBlock source={src('./components/tree/TreeShowLine.tsx')}><TreeShowLine /></DemoBlock>,
  'virt-tree-drag': () => <DemoBlock source={src('./components/tree/TreeDrag.tsx')}><TreeDrag /></DemoBlock>,
  'virt-tree-focus': () => <DemoBlock source={src('./components/tree/TreeFocus.tsx')}><TreeFocus /></DemoBlock>,
  'virt-tree-operate': () => <DemoBlock source={src('./components/tree/TreeOperate.tsx')}><TreeOperate /></DemoBlock>,
  'virt-tree-slots': () => <DemoBlock source={src('./components/tree/TreeSlots.tsx')}><TreeSlots /></DemoBlock>,
  'virt-tree-icon': () => <DemoBlock source={src('./components/tree/TreeIcon.tsx')}><TreeIcon /></DemoBlock>,
  'virt-tree-default': () => <DemoBlock source={src('./components/tree/TreeDefault.tsx')}><TreeDefault /></DemoBlock>,
  'virt-tree-dragarea': () => <DemoBlock source={src('./components/tree/TreeDragArea.tsx')}><TreeDragArea /></DemoBlock>,
  'virt-grid': () => <DemoBlock source={src('./components/grid/VirtGrid.tsx')}><VirtGrid /></DemoBlock>,
};

function App({ exampleId = '' }: AppProps) {
  const renderCurrentDemo = () => {
    const renderer =
      demoRenderMap[exampleId as keyof typeof demoRenderMap] ?? demoRenderMap['literal'];
    return renderer();
  };

  return (
    renderCurrentDemo()
  );
}

export default App;
