import { useRef, useState, useMemo } from 'react';
import { VirtTree, type VirtTreeRef } from '@virt-list/react';
import TreeFocusItem from './items/TreeFocusItem';
import TreeEmpty from './items/TreeEmpty';
import '../../demo.css';

function generateTreeData() {
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

export default function TreeFocus() {
  const treeRef = useRef<VirtTreeRef>(null);
  const [focusedKeys, setFocusedKeys] = useState<string[]>([]);
  const treeData = useMemo(() => generateTreeData(), []);

  return (
    <div className="tree-demo">
      <div className="status-text" style={{ margin: '8px 0', minHeight: 24 }}>
        focusedKeys: [{focusedKeys.join(', ')}]
      </div>
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          ref={treeRef}
          list={treeData}
          fieldNames={{ key: 'id' }}
          selectable
          defaultExpandAll
          content={({ node }) => (
            <TreeFocusItem
              node={node}
              onFocus={(key) => {
                treeRef.current?.setFocusedKeys([key]);
                setFocusedKeys([String(key)]);
              }}
            />
          )}
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
