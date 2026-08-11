/**
 * 跨虚拟化的选区复制。
 *
 * 虚拟滚动只保留视口附近的 DOM，用户拖选跨越了未渲染区域时，浏览器能复制到的
 * 只有那几十个还活着的节点——中间成百上千项在剪贴板里凭空消失，而用户完全
 * 看不出来（选区高亮是连续的）。这是虚拟滚动最容易被忽略的一处正确性缺口。
 *
 * 补法是把「首尾两项取选区的实际范围、中间项从数据补齐」拼起来。
 *
 * 逻辑收窄成 `buildCopyText(range, host)` 这一个纯函数，DOM 事件与配置读取都留在
 * 引擎那一侧：Range 可以用 `document.createRange()` 直接构造，于是这里的每条
 * 边界都能单测，不必去模拟 Selection（jsdom 对它的支持很有限）。
 */

/** buildCopyText 需要从虚拟列表读取的最小信息面 */
export interface SelectionCopyHost {
  /** 滚动容器；选区两端都必须落在它内部才介入 */
  getRootEl(): HTMLElement | null;
  /**
   * 渲染窗口内 key → 索引。
   *
   * 返回 undefined 表示这个 `data-id` 不是列表项（`client` / `header` /
   * `footer` / 吸顶插槽都带 data-id，但都不该参与文本拼装）。
   */
  getIndexByKey(key: string): number | undefined;
  /** 第 index 项的纯文本；越界或使用方没给出文本时返回 null */
  getItemText(index: number): string | null;
  /**
   * 列表总项数。
   *
   * 「选区盖住了整个列表」时要复制的是**全部数据**，不是恰好还在 DOM 里的那几十项，
   * 所以边界必须来自数据长度而不是渲染窗口。
   */
  getLength(): number;
}

/**
 * 选区的一个边界。
 *
 * `el` 为 null 表示这一项是**整个**落在选区里的（端点在列表之外，边界由数据推出），
 * 此时不能拿它去截取 Range——那个 Range 的端点根本不在这一项内部。
 */
interface Boundary {
  index: number;
  el: HTMLElement | null;
}

/**
 * 把 Range 的一个端点规范化成「真正的边界节点」。
 *
 * Range 的 offset 有两种语义：端点落在文本节点上时是字符偏移，落在**元素**上时
 * 是子节点索引。全选类操作（`selectNodeContents`、Cmd+A）给出的正是后者——
 * 此时 container 是列表的容器元素本身，直接拿它去向上找列表项永远找不到。
 */
function boundaryNode(container: Node, offset: number, isStart: boolean): Node {
  if (container.nodeType !== 1) return container;

  const children = container.childNodes;
  if (children.length === 0) return container;

  // start 落在 offset 处的子节点上；end 落在 offset 之前那个子节点的末尾
  const raw = isStart ? offset : offset - 1;
  const index = Math.min(Math.max(raw, 0), children.length - 1);
  return children[index] ?? container;
}

/**
 * 选区是否与列表容器有交集。
 *
 * 相交的条件是「选区起点在容器结束之前，且选区终点在容器开始之后」。
 * 用于区分两种「端点不在列表项内」的情形：选区跨过了整个列表（该介入），
 * 还是压根落在页面别处（不该介入）。
 */
function intersectsRoot(range: Range, root: HTMLElement): boolean {
  const rootRange = root.ownerDocument.createRange();
  rootRange.selectNode(root);
  return (
    range.compareBoundaryPoints(Range.END_TO_START, rootRange) < 0 &&
    range.compareBoundaryPoints(Range.START_TO_END, rootRange) > 0
  );
}

/**
 * 从 node 向上找到它所属的列表项元素。
 *
 * 命中条件是「带 data-id 且能映射成索引」，因此插槽元素会被跳过继续向上找，
 * 最终在 root 处停下并返回 null。
 */
function closestItem(
  node: Node | null,
  root: HTMLElement,
  host: SelectionCopyHost,
): Boundary | null {
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur.nodeType === 1) {
      const el = cur as HTMLElement;
      const key = el.dataset?.id;
      if (key !== undefined) {
        const index = host.getIndexByKey(key);
        if (index !== undefined) return { el, index };
      }
    }
    cur = cur.parentNode;
  }
  return null;
}

/** 取 [from, 元素内容末尾] 这一段文本 */
function textFromStart(
  el: HTMLElement,
  startContainer: Node,
  startOffset: number,
): string {
  const r = el.ownerDocument.createRange();
  r.selectNodeContents(el);
  r.setStart(startContainer, startOffset);
  return r.toString();
}

/** 取 [元素内容开头, to] 这一段文本 */
function textToEnd(
  el: HTMLElement,
  endContainer: Node,
  endOffset: number,
): string {
  const r = el.ownerDocument.createRange();
  r.selectNodeContents(el);
  r.setEnd(endContainer, endOffset);
  return r.toString();
}

/**
 * 取首项 / 末项贡献的那段文本。
 *
 * 选区端点确实落在这一项**内部**时，只有 DOM 知道用户选到了哪个字，按实际范围截取；
 * 否则这一项是整个落在选区里的（端点在列表之外，或落在容器元素上），
 * 走数据文本——与中间项保持同一个来源。
 */
function edgeText(
  item: Boundary,
  range: Range,
  host: SelectionCopyHost,
  isHead: boolean,
): string {
  // 边界由数据推出（端点不在任何项内），这一项整个都在选区里
  if (!item.el) return host.getItemText(item.index) ?? '';

  const container = isHead ? range.startContainer : range.endContainer;
  const offset = isHead ? range.startOffset : range.endOffset;

  const inside = item.el === container || item.el.contains(container);
  if (!inside) return host.getItemText(item.index) ?? '';

  return isHead
    ? textFromStart(item.el, container, offset)
    : textToEnd(item.el, container, offset);
}

/**
 * 解出这个选区**真正**覆盖的文本。
 *
 * 返回 null 表示不介入，让浏览器按默认行为复制。以下情形都属于「默认行为已经
 * 正确」或「无从判断」，一律放行而不是勉强拼一个可能更糟的结果：
 * - 选区为空
 * - 两端有任一端不在列表项内（起自页面别处、落在 header/footer 上）
 * - 两端在同一项内（这一项完整存在于 DOM，浏览器复制的就是对的）
 */
export function buildCopyText(
  range: Range,
  host: SelectionCopyHost,
  separator = '\n',
): string | null {
  if (range.collapsed) return null;

  const root = host.getRootEl();
  if (!root) return null;

  let start = closestItem(
    boundaryNode(range.startContainer, range.startOffset, true),
    root,
    host,
  );
  let end = closestItem(
    boundaryNode(range.endContainer, range.endOffset, false),
    root,
    host,
  );

  // 端点不在任何列表项内。分两种情况：选区跨过了整个列表（全选、Cmd+A、
  // 从页面上方一直拖到下方），此时按「整表」处理；否则选区与本列表无关，放行。
  //
  // 边界取**数据**的首尾而不是「第一个/最后一个已渲染项」：选区盖住整个列表时
  // 用户要的是全部内容，而渲染窗口里只有几十项——用渲染边界的话，
  // 复制到的恰好就是视口那一小段，等于这个功能没生效
  if (!start || !end) {
    if (!intersectsRoot(range, root)) return null;
    const length = host.getLength();
    if (length === 0) return null;
    start = start ?? { index: 0, el: null };
    end = end ?? { index: length - 1, el: null };
  }

  // DOM 顺序与索引顺序在虚拟列表里始终一致，理论上 start.index <= end.index。
  // 仍然归一化一次：这个假设一旦被将来的渲染改动打破，这里静默产出倒序文本
  // 会比多写两行更难查
  const head = start.index <= end.index ? start : end;
  const tail = start.index <= end.index ? end : start;
  if (head.index === tail.index) return null;

  const parts: string[] = [];

  // 首项：空串意味着用户是从项的末尾开始选的，这一项没有内容被选中，
  // 不该出现在结果里
  const headText = edgeText(head, range, host, true);
  if (headText) parts.push(headText);

  // 中间项：一律取数据文本。不去区分「这一项其实还在 DOM 里」——同一次复制里
  // 一部分来自 DOM、一部分来自数据，格式会不一致，而缓冲区的存在让哪些项还在
  // DOM 里这件事对使用方是不可见的
  for (let i = head.index + 1; i < tail.index; i += 1) {
    const text = host.getItemText(i);
    if (text !== null) parts.push(text);
  }

  const tailText = edgeText(tail, range, host, false);
  if (tailText) parts.push(tailText);

  return parts.join(separator);
}
