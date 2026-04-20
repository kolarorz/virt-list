import { defineComponent } from 'vue';
import DemoBlock from './components/DemoBlock.vue';
import Literal from './components/Literal.vue';
import Widget from './components/Widget.vue';

import ListBasic from './components/list/ListBasic.vue';
import ListBuffer from './components/list/ListBuffer.vue';
import ListHugeData from './components/list/ListHugeData.vue';
import ListFixed from './components/list/ListFixed.vue';
import ListHorizontal from './components/list/ListHorizontal.vue';
import ListSlots from './components/list/ListSlots.vue';
import ListOperations from './components/list/ListOperations.vue';
import ListResize from './components/list/ListResize.vue';
import ListDynamic from './components/list/ListDynamic.vue';
import ListTable from './components/list/ListTable.vue';
import ListInfinity from './components/list/ListInfinity.vue';
import ListChat from './components/list/ListChat.vue';
import ListAdvanced from './components/list/ListAdvanced.vue';
import ListPagination from './components/list/ListPagination.vue';
import ListKeepAlive from './components/list/ListKeepAlive.vue';
import ListEmpty from './components/list/ListEmpty.vue';
import ListReactive from './components/list/ListReactive.vue';
import ListFlatRender from './components/list/ListFlatRender.vue';

import TreeBasic from './components/tree/TreeBasic.vue';
import TreeExpand from './components/tree/TreeExpand.vue';
import TreeCheckbox from './components/tree/TreeCheckbox.vue';
import TreeSelect from './components/tree/TreeSelect.vue';
import TreeFilter from './components/tree/TreeFilter.vue';
import TreeContent from './components/tree/TreeContent.vue';
import TreeShowLine from './components/tree/TreeShowLine.vue';
import TreeDrag from './components/tree/TreeDrag.vue';
import TreeFocus from './components/tree/TreeFocus.vue';
import TreeOperate from './components/tree/TreeOperate.vue';
import TreeSlots from './components/tree/TreeSlots.vue';
import TreeIcon from './components/tree/TreeIcon.vue';
import TreeDefault from './components/tree/TreeDefault.vue';
import TreeDragArea from './components/tree/TreeDragArea.vue';

import GridBasic from './components/grid/GridBasic.vue';

const rawSources = import.meta.glob(
  ['./components/list/*.vue', './components/tree/*.vue', './components/grid/*.vue'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

function src(path: string): string {
  return rawSources[path] ?? '';
}

type FrameworkKind = 'react' | 'vue';

export default defineComponent({
  name: 'VueTsxDemo',
  props: {
    exampleId: {
      type: String,
      default: '',
    },
    onEvent: {
      type: Function as unknown as () => ((payload: { framework: FrameworkKind; message: string }) => void) | undefined,
      default: undefined,
    },
  },
  setup(props) {
    const demoRenderMap: Record<string, () => JSX.Element> = {
      'list-literal': () => <Literal />,
      'list-widget': () => <Widget />,
      'list-basic': () => <DemoBlock source={src('./components/list/ListBasic.vue')}><ListBasic /></DemoBlock>,
      'list-buffer': () => <DemoBlock source={src('./components/list/ListBuffer.vue')}><ListBuffer /></DemoBlock>,
      'list-huge-data': () => <DemoBlock source={src('./components/list/ListHugeData.vue')}><ListHugeData /></DemoBlock>,
      'list-fixed': () => <DemoBlock source={src('./components/list/ListFixed.vue')}><ListFixed /></DemoBlock>,
      'list-horizontal': () => <DemoBlock source={src('./components/list/ListHorizontal.vue')}><ListHorizontal /></DemoBlock>,
      'list-slots': () => <DemoBlock source={src('./components/list/ListSlots.vue')}><ListSlots /></DemoBlock>,
      'list-operations': () => <DemoBlock source={src('./components/list/ListOperations.vue')}><ListOperations /></DemoBlock>,
      'list-resize': () => <DemoBlock source={src('./components/list/ListResize.vue')}><ListResize /></DemoBlock>,
      'list-dynamic': () => <DemoBlock source={src('./components/list/ListDynamic.vue')}><ListDynamic /></DemoBlock>,
      'list-table': () => <DemoBlock source={src('./components/list/ListTable.vue')}><ListTable /></DemoBlock>,
      'list-infinity': () => <DemoBlock source={src('./components/list/ListInfinity.vue')}><ListInfinity /></DemoBlock>,
      'list-chat': () => <DemoBlock source={src('./components/list/ListChat.vue')}><ListChat /></DemoBlock>,
      'list-advanced': () => <DemoBlock source={src('./components/list/ListAdvanced.vue')}><ListAdvanced /></DemoBlock>,
      'list-pagination': () => <DemoBlock source={src('./components/list/ListPagination.vue')}><ListPagination /></DemoBlock>,
      'list-keep-alive': () => <DemoBlock source={src('./components/list/ListKeepAlive.vue')}><ListKeepAlive /></DemoBlock>,
      'list-empty': () => <DemoBlock source={src('./components/list/ListEmpty.vue')}><ListEmpty /></DemoBlock>,
      'list-reactive': () => <DemoBlock source={src('./components/list/ListReactive.vue')}><ListReactive /></DemoBlock>,
      'list-flat-render': () => <DemoBlock source={src('./components/list/ListFlatRender.vue')}><ListFlatRender /></DemoBlock>,
      'tree-basic': () => <DemoBlock source={src('./components/tree/TreeBasic.vue')}><TreeBasic /></DemoBlock>,
      'tree-expand': () => <DemoBlock source={src('./components/tree/TreeExpand.vue')}><TreeExpand /></DemoBlock>,
      'tree-checkbox': () => <DemoBlock source={src('./components/tree/TreeCheckbox.vue')}><TreeCheckbox /></DemoBlock>,
      'tree-select': () => <DemoBlock source={src('./components/tree/TreeSelect.vue')}><TreeSelect /></DemoBlock>,
      'tree-filter': () => <DemoBlock source={src('./components/tree/TreeFilter.vue')}><TreeFilter /></DemoBlock>,
      'tree-content': () => <DemoBlock source={src('./components/tree/TreeContent.vue')}><TreeContent /></DemoBlock>,
      'tree-showline': () => <DemoBlock source={src('./components/tree/TreeShowLine.vue')}><TreeShowLine /></DemoBlock>,
      'tree-drag': () => <DemoBlock source={src('./components/tree/TreeDrag.vue')}><TreeDrag /></DemoBlock>,
      'tree-focus': () => <DemoBlock source={src('./components/tree/TreeFocus.vue')}><TreeFocus /></DemoBlock>,
      'tree-operate': () => <DemoBlock source={src('./components/tree/TreeOperate.vue')}><TreeOperate /></DemoBlock>,
      'tree-slots': () => <DemoBlock source={src('./components/tree/TreeSlots.vue')}><TreeSlots /></DemoBlock>,
      'tree-icon': () => <DemoBlock source={src('./components/tree/TreeIcon.vue')}><TreeIcon /></DemoBlock>,
      'tree-default': () => <DemoBlock source={src('./components/tree/TreeDefault.vue')}><TreeDefault /></DemoBlock>,
      'tree-dragarea': () => <DemoBlock source={src('./components/tree/TreeDragArea.vue')}><TreeDragArea /></DemoBlock>,
      'grid-basic': () => <DemoBlock source={src('./components/grid/GridBasic.vue')}><GridBasic /></DemoBlock>,
    };

    const renderCurrentDemo = () => {
      const renderer =
        demoRenderMap[props.exampleId as keyof typeof demoRenderMap] ?? demoRenderMap['list-literal'];
      return renderer();
    };

    return () => (
      renderCurrentDemo()
    );
  },
});
