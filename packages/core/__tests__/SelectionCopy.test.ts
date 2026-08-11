import { describe, expect, it } from 'vitest';
import { buildCopyText, type SelectionCopyHost } from '../src/SelectionCopy';

/**
 * 造一个「只渲染了首尾几项」的列表 DOM，模拟虚拟滚动的实际形态：
 * 数据有 10 项，DOM 里只有 renderedIndexes 指定的那几项。
 */
function setup(renderedIndexes: number[]) {
  // 每个用例都从干净的 body 开始：有用例会往 root 外面插节点，
  // 残留下来会让后面用例的「列表之外」断言失去意义
  document.body.innerHTML = '';

  const root = document.createElement('div');
  root.dataset.id = 'client';

  const keyToIndex = new Map<string, number>();
  const els = new Map<number, HTMLElement>();

  for (const i of renderedIndexes) {
    const el = document.createElement('div');
    el.dataset.id = `k${i}`;
    // 套一层，让选区端点落在更深的节点上（真实结构里气泡都有内层元素）
    const inner = document.createElement('span');
    inner.textContent = `文本${i}`;
    el.appendChild(inner);
    root.appendChild(el);
    keyToIndex.set(`k${i}`, i);
    els.set(i, el);
  }
  document.body.appendChild(root);

  /** 数据有 10 项，DOM 里只有 renderedIndexes 那几项 */
  const host: SelectionCopyHost = {
    getRootEl: () => root,
    getIndexByKey: (key) => keyToIndex.get(key),
    getItemText: (index) => (index >= 0 && index < 10 ? `数据${index}` : null),
    getLength: () => 10,
  };

  /** 取某一项内层文本节点 */
  const textNode = (index: number) => els.get(index)!.firstChild!.firstChild!;

  function rangeAcross(
    fromIndex: number,
    fromOffset: number,
    toIndex: number,
    toOffset: number,
  ) {
    const r = document.createRange();
    r.setStart(textNode(fromIndex), fromOffset);
    r.setEnd(textNode(toIndex), toOffset);
    return r;
  }

  return { root, host, els, textNode, rangeAcross };
}

describe('选区端点不是文本节点时（全选路径）', () => {
  it('selectNodeContents(容器) 也能解出完整文本', () => {
    const { host, root } = setup([0, 9]);
    const itemsHost = root;

    // 「全选」的典型形态：端点是元素节点，offset 是子节点索引，
    // 而不是文本节点里的字符偏移
    const r = document.createRange();
    r.selectNodeContents(itemsHost);

    const text = buildCopyText(r, host);

    // 首尾两项也是整个落在选区里的，所以和中间项同一个来源：数据文本。
    // 只有「端点确实落在某一项内部」时才需要按 DOM 截取
    expect(text).toBe(
      ['数据0', '数据1', '数据2', '数据3', '数据4', '数据5', '数据6', '数据7', '数据8', '数据9'].join('\n'),
    );
  });

  it('端点落在列表项元素自身上（而非其文本节点）', () => {
    const { host, els } = setup([0, 5]);

    const r = document.createRange();
    r.setStart(els.get(0)!, 0);
    r.setEnd(els.get(5)!, els.get(5)!.childNodes.length);

    const text = buildCopyText(r, host);

    expect(text).toBe(
      ['文本0', '数据1', '数据2', '数据3', '数据4', '文本5'].join('\n'),
    );
  });

  /**
   * 边界必须来自**数据**长度，不是「第一个/最后一个已渲染项」。
   *
   * 这里 DOM 里只有第 2、7 项。若按渲染边界取，复制到的就只有 2..7——
   * 而选区盖住的是整个列表，用户要的是 0..9。取渲染边界的话，
   * 这个功能在真实场景里的表现恰好就是「只复制了视口那一小段」。
   */
  it('选区跨越整个容器时按数据边界取整表，而不是渲染边界', () => {
    const { host, root } = setup([2, 7]);

    // Cmd+A 的常见形态：选区覆盖 body，两端都不在列表项内
    const outerBefore = document.createElement('p');
    outerBefore.textContent = '页面头部';
    const outerAfter = document.createElement('p');
    outerAfter.textContent = '页面尾部';
    root.parentNode!.insertBefore(outerBefore, root);
    root.parentNode!.appendChild(outerAfter);

    const r = document.createRange();
    r.setStart(outerBefore.firstChild!, 0);
    r.setEnd(outerAfter.firstChild!, 4);

    const text = buildCopyText(r, host);

    expect(text).toBe(
      ['数据0', '数据1', '数据2', '数据3', '数据4', '数据5', '数据6', '数据7', '数据8', '数据9'].join('\n'),
    );
  });

  it('选区完全在列表之外时仍然不介入', () => {
    const { host, root } = setup([0, 1]);

    const outer = document.createElement('p');
    outer.textContent = '别处的两段文字';
    root.parentNode!.insertBefore(outer, root);

    const r = document.createRange();
    r.setStart(outer.firstChild!, 0);
    r.setEnd(outer.firstChild!, 5);

    expect(buildCopyText(r, host)).toBeNull();
  });
});

describe('跨虚拟化的选区复制', () => {
  it('中间未渲染的项从数据补齐', () => {
    // DOM 里只有 0 和 9，中间 1~8 从未渲染过
    const { host, rangeAcross } = setup([0, 9]);

    // 「文本0」从第 2 个字符起、「文本9」到第 2 个字符止
    const text = buildCopyText(rangeAcross(0, 1, 9, 2), host);

    expect(text).toBe(
      ['本0', '数据1', '数据2', '数据3', '数据4', '数据5', '数据6', '数据7', '数据8', '文本'].join('\n'),
    );
  });

  it('首尾按选区实际范围截取，中间项取全文', () => {
    const { host, rangeAcross } = setup([0, 1, 2]);

    // 首项只选到后半段，末项只选到前半段
    const text = buildCopyText(rangeAcross(0, 2, 2, 1), host);

    expect(text).toBe(['0', '数据1', '文'].join('\n'));
  });

  it('已渲染的中间项也走数据，避免同一次复制里两种来源混排', () => {
    const { host, rangeAcross } = setup([0, 1, 2]);

    const text = buildCopyText(rangeAcross(0, 0, 2, 3), host);

    // 中间的第 1 项虽然就在 DOM 里，取的仍是「数据1」而不是「文本1」
    expect(text).toContain('数据1');
    expect(text).not.toContain('文本1');
  });

  it('可自定义分隔符', () => {
    const { host, rangeAcross } = setup([0, 2]);

    const text = buildCopyText(rangeAcross(0, 0, 2, 3), host, '\n\n');

    expect(text).toBe(['文本0', '数据1', '文本2'].join('\n\n'));
  });

  it('选区落在同一项内时不介入（浏览器复制的就是对的）', () => {
    const { host, rangeAcross } = setup([0, 1]);

    expect(buildCopyText(rangeAcross(0, 0, 0, 3), host)).toBeNull();
  });

  it('空选区不介入', () => {
    const { host, rangeAcross } = setup([0, 1]);

    expect(buildCopyText(rangeAcross(0, 2, 0, 2), host)).toBeNull();
  });

  it('起点落在列表内的非列表项区域时，按整表起点处理', () => {
    const { host, root, textNode } = setup([0, 1]);

    // 起点落在容器里但不属于任何一项（比如加载提示条所在的区域）
    const outside = document.createElement('div');
    outside.textContent = '页面别处';
    root.insertBefore(outside, root.firstChild);

    const r = document.createRange();
    r.setStart(outside.firstChild!, 0);
    r.setEnd(textNode(1), 2);

    // 选区确实跨过了这个列表，起点兜底成第一个渲染项；
    // 终点落在第 1 项内部，仍按 DOM 实际截取
    expect(buildCopyText(r, host)).toBe(['数据0', '文本'].join('\n'));
  });

  it('带 data-id 但不是列表项的元素（插槽）不会被误当成项', () => {
    const { host, root, textNode } = setup([0, 1]);

    // header 也带 data-id，但 getIndexByKey 认不出它
    const header = document.createElement('div');
    header.dataset.id = 'header';
    header.textContent = '加载中';
    root.insertBefore(header, root.firstChild);

    const r = document.createRange();
    r.setStart(header.firstChild!, 0);
    r.setEnd(textNode(1), 2);

    // 插槽不参与文本拼装：起点兜底成第一个真正的列表项，
    // 「加载中」这几个字不会进剪贴板
    const text = buildCopyText(r, host);
    expect(text).toBe(['数据0', '文本'].join('\n'));
    expect(text).not.toContain('加载中');
  });

  it('首项一个字都没选中时不产生空行', () => {
    const { host, rangeAcross } = setup([0, 2]);

    // 从「文本0」的末尾开始选：首项贡献为空
    const text = buildCopyText(rangeAcross(0, 3, 2, 3), host);

    expect(text).toBe(['数据1', '文本2'].join('\n'));
  });

  it('末项一个字都没选中时不产生空行', () => {
    const { host, rangeAcross } = setup([0, 2]);

    const text = buildCopyText(rangeAcross(0, 0, 2, 0), host);

    expect(text).toBe(['文本0', '数据1'].join('\n'));
  });

  it('数据缺口（索引越界）被跳过而不是插入空串', () => {
    const { host, rangeAcross } = setup([0, 2]);
    const gapHost: SelectionCopyHost = {
      ...host,
      getItemText: () => null,
    };

    const text = buildCopyText(rangeAcross(0, 0, 2, 3), gapHost);

    expect(text).toBe(['文本0', '文本2'].join('\n'));
  });
});
