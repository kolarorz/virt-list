import '@arco-design/web-react/dist/css/arco.css';
import DemoBlock from './components/DemoBlock.tsx';
import Literal from './components/Literal.tsx';
import Widget from './components/Widget.tsx';

import ListBasic from './components/list/ListBasic.tsx';
import ListBuffer from './components/list/ListBuffer.tsx';
import ListHugeData from './components/list/ListHugeData.tsx';
import ListFixed from './components/list/ListFixed.tsx';
import ListHorizontal from './components/list/ListHorizontal.tsx';
import ListSlots from './components/list/ListSlots.tsx';
import ListOperations from './components/list/ListOperations.tsx';
import ListResize from './components/list/ListResize.tsx';
import ListDynamic from './components/list/ListDynamic.tsx';
import ListTable from './components/list/ListTable.tsx';
import ListInfinity from './components/list/ListInfinity.tsx';
import ListChat from './components/list/ListChat.tsx';
import ListAdvanced from './components/list/ListAdvanced.tsx';
import ListPagination from './components/list/ListPagination.tsx';
import ListKeepAlive from './components/list/ListKeepAlive.tsx';
import ListEmpty from './components/list/ListEmpty.tsx';
import ListReactive from './components/list/ListReactive.tsx';
import ListFlatRender from './components/list/ListFlatRender.tsx';

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

import GridBasic from './components/grid/GridBasic.tsx';

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
  'list-literal': () => <Literal />,
  'list-widget': () => <Widget />,
  'list-basic': () => <DemoBlock source={src('./components/list/ListBasic.tsx')}><ListBasic /></DemoBlock>,
  'list-buffer': () => <DemoBlock source={src('./components/list/ListBuffer.tsx')}><ListBuffer /></DemoBlock>,
  'list-huge-data': () => <DemoBlock source={src('./components/list/ListHugeData.tsx')}><ListHugeData /></DemoBlock>,
  'list-fixed': () => <DemoBlock source={src('./components/list/ListFixed.tsx')}><ListFixed /></DemoBlock>,
  'list-horizontal': () => <DemoBlock source={src('./components/list/ListHorizontal.tsx')}><ListHorizontal /></DemoBlock>,
  'list-slots': () => <DemoBlock source={src('./components/list/ListSlots.tsx')}><ListSlots /></DemoBlock>,
  'list-operations': () => <DemoBlock source={src('./components/list/ListOperations.tsx')}><ListOperations /></DemoBlock>,
  'list-resize': () => <DemoBlock source={src('./components/list/ListResize.tsx')}><ListResize /></DemoBlock>,
  'list-dynamic': () => <DemoBlock source={src('./components/list/ListDynamic.tsx')}><ListDynamic /></DemoBlock>,
  'list-table': () => <DemoBlock source={src('./components/list/ListTable.tsx')}><ListTable /></DemoBlock>,
  'list-infinity': () => <DemoBlock source={src('./components/list/ListInfinity.tsx')}><ListInfinity /></DemoBlock>,
  'list-chat': () => <DemoBlock source={src('./components/list/ListChat.tsx')}><ListChat /></DemoBlock>,
  'list-advanced': () => <DemoBlock source={src('./components/list/ListAdvanced.tsx')}><ListAdvanced /></DemoBlock>,
  'list-pagination': () => <DemoBlock source={src('./components/list/ListPagination.tsx')}><ListPagination /></DemoBlock>,
  'list-keep-alive': () => <DemoBlock source={src('./components/list/ListKeepAlive.tsx')}><ListKeepAlive /></DemoBlock>,
  'list-empty': () => <DemoBlock source={src('./components/list/ListEmpty.tsx')}><ListEmpty /></DemoBlock>,
  'list-reactive': () => <DemoBlock source={src('./components/list/ListReactive.tsx')}><ListReactive /></DemoBlock>,
  'list-flat-render': () => <DemoBlock source={src('./components/list/ListFlatRender.tsx')}><ListFlatRender /></DemoBlock>,
  'tree-basic': () => <DemoBlock source={src('./components/tree/TreeBasic.tsx')}><TreeBasic /></DemoBlock>,
  'tree-expand': () => <DemoBlock source={src('./components/tree/TreeExpand.tsx')}><TreeExpand /></DemoBlock>,
  'tree-checkbox': () => <DemoBlock source={src('./components/tree/TreeCheckbox.tsx')}><TreeCheckbox /></DemoBlock>,
  'tree-select': () => <DemoBlock source={src('./components/tree/TreeSelect.tsx')}><TreeSelect /></DemoBlock>,
  'tree-filter': () => <DemoBlock source={src('./components/tree/TreeFilter.tsx')}><TreeFilter /></DemoBlock>,
  'tree-content': () => <DemoBlock source={src('./components/tree/TreeContent.tsx')}><TreeContent /></DemoBlock>,
  'tree-showline': () => <DemoBlock source={src('./components/tree/TreeShowLine.tsx')}><TreeShowLine /></DemoBlock>,
  'tree-drag': () => <DemoBlock source={src('./components/tree/TreeDrag.tsx')}><TreeDrag /></DemoBlock>,
  'tree-focus': () => <DemoBlock source={src('./components/tree/TreeFocus.tsx')}><TreeFocus /></DemoBlock>,
  'tree-operate': () => <DemoBlock source={src('./components/tree/TreeOperate.tsx')}><TreeOperate /></DemoBlock>,
  'tree-slots': () => <DemoBlock source={src('./components/tree/TreeSlots.tsx')}><TreeSlots /></DemoBlock>,
  'tree-icon': () => <DemoBlock source={src('./components/tree/TreeIcon.tsx')}><TreeIcon /></DemoBlock>,
  'tree-default': () => <DemoBlock source={src('./components/tree/TreeDefault.tsx')}><TreeDefault /></DemoBlock>,
  'tree-dragarea': () => <DemoBlock source={src('./components/tree/TreeDragArea.tsx')}><TreeDragArea /></DemoBlock>,
  'grid-basic': () => <DemoBlock source={src('./components/grid/GridBasic.tsx')}><GridBasic /></DemoBlock>,
};

function App({ exampleId = '' }: AppProps) {
  const renderCurrentDemo = () => {
    const renderer =
      demoRenderMap[exampleId as keyof typeof demoRenderMap] ?? demoRenderMap['list-literal'];
    return renderer();
  };

  return (
    renderCurrentDemo()
  );
}

export default App;
