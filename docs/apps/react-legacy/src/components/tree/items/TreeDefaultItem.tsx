import type { TreeNode } from '@virt-list/react-legacy';

// 整行被自定义节点接管后，库不再画缩进块，indent 要自己乘上层级算成 padding
export default function TreeDefaultItem({
  node,
  indent = 20,
}: {
  node: TreeNode;
  indent?: number;
}) {
  return (
    <div
      className="virt-tree-node"
      style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--demo-c-divider)',
        boxSizing: 'border-box',
        paddingLeft: (node.level - 1) * indent,
      }}
    >
      level: {node.level}; -- title: {node.title ?? ''}
    </div>
  );
}
