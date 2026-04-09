import type { TreeNode } from '@virt-list/react';

export default function TreeDragAreaItem({ node }: { node: TreeNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>{node.title ?? ''}</span>
    </div>
  );
}
