import type { TreeNode } from '@virt-list/react';

export default function TreeDefaultItem({ node }: { node: TreeNode }) {
  return (
    <div
      style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #eee',
        boxSizing: 'border-box',
        paddingLeft: 4,
      }}
    >
      level: {node.level}; -- title: {node.title ?? ''}
    </div>
  );
}
