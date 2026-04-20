import type { IScrollParams, TreeData, TreeNodeKey } from '@virt-list/vue2';

export type VirtTreeRef = {
  expandAll: (expanded: boolean) => void;
  expandNode: (key: TreeNodeKey | TreeNodeKey[], expanded: boolean) => void;
  scrollTo: (params: IScrollParams) => void;
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
