import type {
  VirtTreeScrollTarget,
  VirtScrollOptions,
  TreeData,
  TreeNode,
  TreeNodeKey,
} from '@virt-list/vue2';

export type VirtTreeRef = {
  getTreeNode: (key: TreeNodeKey) => TreeNode | undefined;
  toggleSelect: (node: TreeNode) => void;
  expandAll: (expanded: boolean) => void;
  expandNode: (key: TreeNodeKey | TreeNodeKey[], expanded: boolean) => void;
  scrollTo: (params: VirtTreeScrollTarget) => void;
  scrollToKey: (key: TreeNodeKey, options?: VirtScrollOptions) => void;
  scrollKeyIntoView: (key: TreeNodeKey, options?: VirtScrollOptions) => void;
  scrollToOffset: (offset: number, options?: VirtScrollOptions) => void;
  checkAll: (checked: boolean) => void;
  getCheckedKeys: (leafOnly?: boolean) => TreeNodeKey[];
  selectAll: (selected: boolean) => void;
  filter: (query: string) => void;
  setList: (list: TreeData) => void;
  forceUpdate: () => void;
};

export type VirtGridRef = {
  setList: (list: unknown[]) => void;
  setGridItems: (n: number) => void;
};
