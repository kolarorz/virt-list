interface AdapterRowCache {
  root: {
    render: (node: any) => void;
    unmount: () => void;
  };
  el: HTMLElement;
}

interface AdapterResult<TItem> {
  itemRender: (item: TItem) => HTMLElement;
  cleanup: () => void;
}

interface ReactAdapterDeps<TProps extends object> {
  createRoot: (el: HTMLElement) => {
    render: (node: any) => void;
    unmount: () => void;
  };
  createElement: (
    component: (props: TProps) => unknown,
    props: TProps,
  ) => any;
}

export function reactAdapter<
  TItem extends { id: string | number },
  TProps extends object,
>(
  RowComponent: (props: TProps) => unknown,
  mapItemToProps: (item: TItem) => TProps,
  deps: ReactAdapterDeps<TProps>,
): AdapterResult<TItem> {
  const rowRootMap = new Map<string | number, AdapterRowCache>();

  const itemRender = (item: TItem): HTMLElement => {
    const cached = rowRootMap.get(item.id);
    const props = mapItemToProps(item);
    if (cached) {
      cached.root.render(deps.createElement(RowComponent, props));
      return cached.el;
    }

    const row = document.createElement('div');
    const rowRoot = deps.createRoot(row);
    rowRoot.render(deps.createElement(RowComponent, props));
    rowRootMap.set(item.id, { root: rowRoot, el: row });
    return row;
  };

  const cleanup = () => {
    rowRootMap.forEach(({ root }) => root.unmount());
    rowRootMap.clear();
  };

  return { itemRender, cleanup };
}