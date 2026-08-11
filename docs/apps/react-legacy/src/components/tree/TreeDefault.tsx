import { useCallback, useMemo, useRef } from 'react';
import { VirtTree, type TreeNode, type VirtTreeRef } from '@virt-list/react-legacy';
import TreeDefaultItem from './items/TreeDefaultItem';
import TreeEmpty from './items/TreeEmpty';

const INDENT = 20;

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

export default function TreeDefault() {
  const treeData = useMemo(() => generateTreeData(), []);
  const treeRef = useRef<VirtTreeRef>(null);

  /**
   * 整行被自定义节点接管时，库只把点击事件抛出来，不再执行 selectable 的默认行为
   * ——默认行为挂在它自己画的 content 区上，这里那一层不存在了。选中要自己调。
   */
  const onNodeClick = useCallback((_data: unknown, node: TreeNode) => {
    const current = treeRef.current?.getTreeNode(node.key);
    if (!current || current.disableSelect) return;
    treeRef.current?.toggleSelect(current);
  }, []);

  return (
    <div className="tree-demo">
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }}>
        <VirtTree
          ref={treeRef}
          list={treeData}
          fieldNames={{ key: 'id' }}
          indent={INDENT}
          estimatedSize={40}
          fixedSize
          selectable
          defaultExpandAll
          onNodeClick={onNodeClick}
          nodeRender={({ node }) => <TreeDefaultItem node={node} indent={INDENT} />}
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
