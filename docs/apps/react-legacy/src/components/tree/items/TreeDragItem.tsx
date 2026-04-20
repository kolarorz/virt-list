import type { TreeNode } from '@virt-list/react-legacy';

export default function TreeDragItem({ node }: { node: TreeNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{node.isLeaf ? '📄' : '📁'}</span>
      <span>{node.title ?? ''}</span>
    </div>
  );
}
