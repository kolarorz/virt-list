import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtList } from '../src/VirtList';

/**
 * 跨虚拟化复制的**集成**测试。
 *
 * core 那边已经把 `buildCopyText` 的每条分支单测过了，但那些用例是在手搭的简化 DOM
 * 上跑的。真实结构要深好几层（clientEl > scrollContent > list > itemHost > 项），
 * 事件也要真的从项冒泡上去、选区要真的由浏览器 API 建立——这些环节任何一处不对，
 * 结果都是「只复制到视口里那几项」，而纯函数的单测完全看不出来。
 */

interface Item {
  id: number;
  text: string;
}

function makeList(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, text: `消息内容 ${i}` }));
}

/** copy 事件的最小可用替身：jsdom 不实现 ClipboardEvent 的 clipboardData */
function dispatchCopy(from: Element) {
  const store = new Map<string, string>();
  const event = new Event('copy', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      setData: (type: string, value: string) => store.set(type, value),
      getData: (type: string) => store.get(type) ?? '',
    },
  });
  from.dispatchEvent(event);
  return {
    text: store.get('text/plain') ?? '',
    defaultPrevented: event.defaultPrevented,
  };
}

describe('跨虚拟化复制（真实 DOM 集成）', () => {
  let host: HTMLElement;
  let vl: VirtList<Item>;
  const list = makeList(500);

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);

    vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      copyText: (item) => `AI：${item.text}`,
      renderItem: (item) => {
        const row = document.createElement('div');
        const inner = document.createElement('span');
        inner.textContent = `AI：${item.text}`;
        row.appendChild(inner);
        return row;
      },
    });
  });

  afterEach(() => {
    vl.destroy();
    document.body.innerHTML = '';
  });

  /** 当前真正渲染出来的列表项元素（不含插槽与容器） */
  function renderedItems() {
    return Array.from(
      vl.clientEl.querySelectorAll<HTMLElement>('[data-id]'),
    ).filter((el) => /^\d+$/.test(el.dataset.id ?? ''));
  }

  it('只渲染了列表的一小部分（前提校验）', () => {
    const rendered = renderedItems();
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(list.length);
  });

  it('全选滚动容器后复制，拿到的是全部 500 项', () => {
    const selection = document.getSelection()!;
    const range = document.createRange();
    // demo 里「选中全部对话」就是这一句
    range.selectNodeContents(vl.clientEl);
    selection.removeAllRanges();
    selection.addRange(range);

    // copy 事件由选区所在的元素派发，冒泡到组件挂监听的容器上
    const { text, defaultPrevented } = dispatchCopy(renderedItems()[0]!);

    expect(defaultPrevented).toBe(true);
    const lines = text.split('\n');
    expect(lines).toHaveLength(500);
    expect(lines[0]).toBe('AI：消息内容 0');
    expect(lines[499]).toBe('AI：消息内容 499');
  });

  it('选区跨越两个已渲染项时，中间未渲染的项被补齐', () => {
    const rendered = renderedItems();
    const first = rendered[0]!;
    const last = rendered[rendered.length - 1]!;
    const firstIndex = Number(first.dataset.id);
    const lastIndex = Number(last.dataset.id);
    expect(lastIndex).toBeGreaterThan(firstIndex);

    const selection = document.getSelection()!;
    const range = document.createRange();
    // 端点落在真实的文本节点上，模拟用户在字里拖选
    range.setStart(first.querySelector('span')!.firstChild!, 0);
    range.setEnd(last.querySelector('span')!.firstChild!, 2);
    selection.removeAllRanges();
    selection.addRange(range);

    const { text } = dispatchCopy(first);

    const lines = text.split('\n');
    expect(lines).toHaveLength(lastIndex - firstIndex + 1);
    expect(lines[0]).toBe('AI：消息内容 0');
  });

  it('没配 copyText 时不介入，剪贴板不被改写', () => {
    vl.destroy();
    vl = new VirtList<Item>(host, {
      list,
      itemKey: 'id',
      estimatedSize: 40,
      renderItem: (item) => {
        const row = document.createElement('div');
        row.textContent = item.text;
        return row;
      },
    });

    const selection = document.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(vl.clientEl);
    selection.removeAllRanges();
    selection.addRange(range);

    const { text, defaultPrevented } = dispatchCopy(renderedItems()[0]!);

    expect(text).toBe('');
    expect(defaultPrevented).toBe(false);
  });

  it('运行时开启后立即生效', () => {
    vl.updateOptions({ copyText: undefined });

    const selection = document.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(vl.clientEl);
    selection.removeAllRanges();
    selection.addRange(range);

    expect(dispatchCopy(renderedItems()[0]!).text).toBe('');

    vl.updateOptions({ copyText: (item: Item) => `AI：${item.text}` });
    expect(dispatchCopy(renderedItems()[0]!).text.split('\n')).toHaveLength(500);
  });
});
