interface VueAdapterApp {
  mount: (el: HTMLElement) => unknown;
  unmount: () => void;
}

interface VueAdapterDeps<TComponent> {
  createApp: (component: TComponent, props: any) => VueAdapterApp;
}

interface VueAdapterResult<TItem> {
  itemRender: (item: TItem) => HTMLElement;
  onItemUnmounted: (el: HTMLElement) => void;
  cleanup: () => void;
}

export function vueAdapter<
  TItem extends { id: string | number },
  TProps extends object,
  TComponent,
>(
  RowComponent: TComponent,
  mapItemToProps: (item: TItem) => TProps,
  deps: VueAdapterDeps<TComponent>,
): VueAdapterResult<TItem> {
  const itemMap = new Map<string | number, { app: VueAdapterApp; el: HTMLElement }>();
  const elToId = new WeakMap<HTMLElement, string | number>();

  const itemRender = (item: TItem): HTMLElement => {
    const cached = itemMap.get(item.id);
    if (cached) {
      return cached.el;
    }

    const row = document.createElement('div');
    const app = deps.createApp(RowComponent, mapItemToProps(item));
    app.mount(row);

    itemMap.set(item.id, { app, el: row });
    elToId.set(row, item.id);
    return row;
  };

  const onItemUnmounted = (el: HTMLElement) => {
    const id = elToId.get(el);
    if (id === undefined) return;
    const cached = itemMap.get(id);
    if (!cached || cached.el !== el) return;
    cached.app.unmount();
    itemMap.delete(id);
    elToId.delete(el);
  };

  const cleanup = () => {
    itemMap.forEach(({ app }) => app.unmount());
    itemMap.clear();
  };

  return {
    itemRender,
    onItemUnmounted,
    cleanup,
  };
}
