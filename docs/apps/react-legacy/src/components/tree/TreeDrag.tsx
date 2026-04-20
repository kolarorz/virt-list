import { useRef, useState } from 'react';
import { VirtTree, type VirtTreeRef, type TreeNode } from '@virt-list/react-legacy';
import TreeDragItem from './items/TreeDragItem';
import TreeEmpty from './items/TreeEmpty';
import '../../demo.css';

type TreeRow = {
  id: string;
  title: string;
  children?: TreeRow[];
};

function generateTreeData(): TreeRow[] {
  return Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: `Node-${i}`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: `${i}-${j}`,
      title: `Node-${i}-${j}`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: `${i}-${j}-${k}`,
        title: `Node-${i}-${j}-${k}`,
      })),
    })),
  }));
}

function removeNode(list: TreeRow[], node: TreeNode): boolean {
  for (let i = 0; i < list.length; i++) {
    const row = list[i]!;
    if (row.id === node.data.id) {
      list.splice(i, 1);
      return true;
    }
    if (row.children && removeNode(row.children, node)) {
      return true;
    }
  }
  return false;
}

function insertNode(list: TreeRow[], node: TreeNode, prevNode: TreeNode | undefined, parentNode: TreeNode | undefined) {
  const raw = node.data as TreeRow;
  if (parentNode) {
    const pdata = parentNode.data as TreeRow;
    if (!pdata.children) pdata.children = [];
    const target = pdata.children;
    if (prevNode) {
      const idx = target.findIndex((n) => n.id === prevNode.data.id);
      target.splice(idx + 1, 0, raw);
    } else {
      target.unshift(raw);
    }
  } else if (prevNode) {
    const idx = list.findIndex((n) => n.id === prevNode.data.id);
    list.splice(idx + 1, 0, raw);
  } else {
    list.unshift(raw);
  }
}

export default function TreeDrag() {
  const treeRef = useRef<VirtTreeRef>(null);
  const listRef = useRef<TreeRow[]>(generateTreeData());
  const [status, setStatus] = useState('拖拽树示例已就绪（支持跨层级拖拽）');

  return (
    <div className="tree-demo">
      <div className="status-text" style={{ marginBottom: 8 }}>
        {status}
      </div>
      <div className="virt-tree-wrapper">
        <VirtTree
          ref={treeRef}
          list={listRef.current}
          fieldNames={{ key: 'id' }}
          indent={20}
          draggable
          expandOnClickNode
          content={({ node }) => <TreeDragItem node={node} />}
          empty={() => <TreeEmpty />}
          onDragstart={(data) => {
            setStatus(`开始拖拽: ${data.sourceNode.title ?? data.sourceNode.id}`);
          }}
          onDragend={(data) => {
            if (!data) {
              setStatus('拖拽取消');
              return;
            }
            removeNode(listRef.current, data.node);
            insertNode(listRef.current, data.node, data.prevNode, data.parentNode);
            treeRef.current?.setList([...listRef.current]);
            setStatus(`拖拽完成: ${data.node.title ?? data.node.data?.id}`);
          }}
        />
      </div>
    </div>
  );
}
