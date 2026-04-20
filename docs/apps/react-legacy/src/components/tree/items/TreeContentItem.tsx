import type { TreeNode } from '@virt-list/react-legacy';

export default function TreeContentItem({ node }: { node: TreeNode }) {
  return (
    <div>
      <span>level: {node.level}; </span>
      <span>title: {(node.data as any).name}</span>
    </div>
  );
}
