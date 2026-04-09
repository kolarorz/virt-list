import { defineComponent } from 'vue';
import DemoBlock from './components/DemoBlock.vue';
import Literal from './components/Literal.vue';
import Widget from './components/Widget.vue';

import Basic from './components/list/Basic.vue';
import HugeData from './components/list/HugeData.vue';
import Fixed from './components/list/Fixed.vue';
import Horizontal from './components/list/Horizontal.vue';
import Slots from './components/list/Slots.vue';
import Operations from './components/list/Operations.vue';
import Resize from './components/list/Resize.vue';
import Dynamic from './components/list/Dynamic.vue';
import Table from './components/list/Table.vue';
import Infinity from './components/list/Infinity.vue';
import Chat from './components/list/Chat.vue';
import Advanced from './components/list/Advanced.vue';
import Pagination from './components/list/Pagination.vue';
import KeepAlive from './components/list/KeepAlive.vue';

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

import VirtGrid from './components/grid/VirtGrid.vue';

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
      'literal': () => <Literal />,
      'widget': () => <Widget />,
      'basic': () => <DemoBlock source={src('./components/list/Basic.vue')}><Basic /></DemoBlock>,
      'huge-data': () => <DemoBlock source={src('./components/list/HugeData.vue')}><HugeData /></DemoBlock>,
      'fixed': () => <DemoBlock source={src('./components/list/Fixed.vue')}><Fixed /></DemoBlock>,
      'horizontal': () => <DemoBlock source={src('./components/list/Horizontal.vue')}><Horizontal /></DemoBlock>,
      'slots': () => <DemoBlock source={src('./components/list/Slots.vue')}><Slots /></DemoBlock>,
      'operations': () => <DemoBlock source={src('./components/list/Operations.vue')}><Operations /></DemoBlock>,
      'resize': () => <DemoBlock source={src('./components/list/Resize.vue')}><Resize /></DemoBlock>,
      'dynamic': () => <DemoBlock source={src('./components/list/Dynamic.vue')}><Dynamic /></DemoBlock>,
      'table': () => <DemoBlock source={src('./components/list/Table.vue')}><Table /></DemoBlock>,
      'infinity': () => <DemoBlock source={src('./components/list/Infinity.vue')}><Infinity /></DemoBlock>,
      'chat': () => <DemoBlock source={src('./components/list/Chat.vue')}><Chat /></DemoBlock>,
      'advanced': () => <DemoBlock source={src('./components/list/Advanced.vue')}><Advanced /></DemoBlock>,
      'pagination': () => <DemoBlock source={src('./components/list/Pagination.vue')}><Pagination /></DemoBlock>,
      'keep-alive': () => <DemoBlock source={src('./components/list/KeepAlive.vue')}><KeepAlive /></DemoBlock>,
      'virt-tree-basic': () => <DemoBlock source={src('./components/tree/TreeBasic.vue')}><TreeBasic /></DemoBlock>,
      'virt-tree-expand': () => <DemoBlock source={src('./components/tree/TreeExpand.vue')}><TreeExpand /></DemoBlock>,
      'virt-tree-checkbox': () => <DemoBlock source={src('./components/tree/TreeCheckbox.vue')}><TreeCheckbox /></DemoBlock>,
      'virt-tree-select': () => <DemoBlock source={src('./components/tree/TreeSelect.vue')}><TreeSelect /></DemoBlock>,
      'virt-tree-filter': () => <DemoBlock source={src('./components/tree/TreeFilter.vue')}><TreeFilter /></DemoBlock>,
      'virt-tree-content': () => <DemoBlock source={src('./components/tree/TreeContent.vue')}><TreeContent /></DemoBlock>,
      'virt-tree-showline': () => <DemoBlock source={src('./components/tree/TreeShowLine.vue')}><TreeShowLine /></DemoBlock>,
      'virt-tree-drag': () => <DemoBlock source={src('./components/tree/TreeDrag.vue')}><TreeDrag /></DemoBlock>,
      'virt-tree-focus': () => <DemoBlock source={src('./components/tree/TreeFocus.vue')}><TreeFocus /></DemoBlock>,
      'virt-tree-operate': () => <DemoBlock source={src('./components/tree/TreeOperate.vue')}><TreeOperate /></DemoBlock>,
      'virt-tree-slots': () => <DemoBlock source={src('./components/tree/TreeSlots.vue')}><TreeSlots /></DemoBlock>,
      'virt-tree-icon': () => <DemoBlock source={src('./components/tree/TreeIcon.vue')}><TreeIcon /></DemoBlock>,
      'virt-tree-default': () => <DemoBlock source={src('./components/tree/TreeDefault.vue')}><TreeDefault /></DemoBlock>,
      'virt-tree-dragarea': () => <DemoBlock source={src('./components/tree/TreeDragArea.vue')}><TreeDragArea /></DemoBlock>,
      'virt-grid': () => <DemoBlock source={src('./components/grid/VirtGrid.vue')}><VirtGrid /></DemoBlock>,
    };

    const renderCurrentDemo = () => {
      const renderer =
        demoRenderMap[props.exampleId as keyof typeof demoRenderMap] ?? demoRenderMap['literal'];
      return renderer();
    };

    return () => (
      renderCurrentDemo()
    );
  },
});
