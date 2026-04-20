import type { TreeNode } from '@virt-list/react';

export default function TreeFocusItem({
  node,
  onFocus,
}: {
  node: TreeNode;
  onFocus: (key: TreeNode['key']) => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <span>level: {node.level}; {node.title ?? ''}</span>
      <button
        type="button"
        className="virt-list-btn virt-list-btn-secondary"
        onClick={(e) => {
          e.stopPropagation();
          onFocus(node.key);
        }}
      >
        more
      </button>
    </div>
  );
}
