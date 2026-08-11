import { useCallback, useEffect, useRef, useState } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react-legacy';
import { generateAiPage, type AiMessage } from '../../../../_shared/aiData';

const COUNT = 400;

/** 复制成一段可读的对话记录；渲染也用它，保证复制到的与看到的一致 */
const copyText = (item: AiMessage) =>
  `${item.role === 'user' ? '我' : 'AI'}：${item.text}`;

export default function AiCopy() {
  const vlRef = useRef<VirtListRef<AiMessage>>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [list] = useState<AiMessage[]>(() => generateAiPage(1, COUNT));
  const [enabled, setEnabled] = useState(true);
  const [result, setResult] = useState('');
  const [stats, setStats] = useState(`消息数: ${COUNT}`);

  /**
   * 一键全选。
   *
   * 选中的是滚动容器的全部内容——它只包含当前渲染的那几十项，所以这个选区在
   * 浏览器眼里「跨越」了全部 400 条消息，正是要演示的那个缺口。
   */
  const selectAll = useCallback(() => {
    const clientEl = vlRef.current?.clientEl;
    const selection = document.getSelection();
    if (!clientEl || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(clientEl);
    selection.removeAllRanges();
    selection.addRange(range);
    setResult('已选中，按 Cmd/Ctrl+C 复制后粘贴到别处对比');
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // 组件内部的监听已经改写完剪贴板，这里读回来的就是用户真正粘贴到的内容
    const onCopy = (e: ClipboardEvent) => {
      const written = e.clipboardData?.getData('text/plain') ?? '';
      const inDom = document.getSelection()?.toString().length ?? 0;
      setResult(
        written
          ? `已复制 ${written.length} 字，其中 ${Math.max(0, written.length - inDom)} 字来自未渲染的项`
          : `已复制 ${inDom} 字（只有 DOM 里的内容）`,
      );
    };

    el.addEventListener('copy', onCopy);
    return () => el.removeEventListener('copy', onCopy);
  }, []);

  return (
    <div className="demo-panel">
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container" ref={wrapRef}>
        <VirtList<AiMessage>
          ref={vlRef}
          list={list}
          itemKey="id"
          estimatedSize={80}
          copyText={enabled ? copyText : undefined}
          copySeparator={'\n\n'}
          onUpdate={(_, state) => {
            const rendered = state.renderEnd - state.renderBegin + 1;
            setStats(
              [
                `消息数: ${list.length}`,
                `当前渲染: ${rendered} 项（${state.renderBegin} - ${state.renderEnd}）`,
                `未渲染: ${list.length - rendered} 项`,
              ].join(' | '),
            );
          }}
        >
          {({ itemData }) => (
            <div className={`demo-chat-message demo-ai-row${itemData.role === 'user' ? ' is-user' : ''}`}>
              <div className="demo-chat-bubble">{copyText(itemData)}</div>
            </div>
          )}
        </VirtList>
      </div>
      <div className="demo-chat-toolbar">
        <label>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          启用跨虚拟化复制
        </label>
        <button type="button" className="virt-list-btn" onClick={selectAll}>
          选中全部对话
        </button>
        <span className="demo-hint">{result}</span>
      </div>
    </div>
  );
}
