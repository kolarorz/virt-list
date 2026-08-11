import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react-legacy';
import { generateAiPage, type AiMessage } from '../../../../_shared/aiData';

const COUNT = 600;

/** 把文本按关键词切成命中/非命中的片段 */
function splitByKeyword(text: string, keyword: string) {
  if (!keyword) return [{ text, hit: false }];

  const parts: { text: string; hit: boolean }[] = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(keyword, from);
    if (at === -1) break;
    if (at > from) parts.push({ text: text.slice(from, at), hit: false });
    parts.push({ text: keyword, hit: true });
    from = at + keyword.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), hit: false });
  return parts;
}

export default function AiSearch() {
  const vlRef = useRef<VirtListRef<AiMessage>>(null);
  const [list] = useState<AiMessage[]>(() => generateAiPage(1, COUNT));
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [cursor, setCursor] = useState(-1);
  const [range, setRange] = useState({ begin: 0, end: 0 });

  /**
   * 命中位置来自**数据**，不是 DOM。
   *
   * 浏览器的页内查找只能看到当前渲染的那几十项，600 条里绝大多数没有对应的 DOM。
   */
  const hits = useMemo(() => {
    if (!keyword) return [] as number[];
    return list.reduce<number[]>((acc, item, i) => {
      if (item.text.includes(keyword)) acc.push(i);
      return acc;
    }, []);
  }, [list, keyword]);

  const jumpTo = useCallback(
    (next: number) => {
      if (hits.length === 0) return;
      const at = (next + hits.length) % hits.length;
      setCursor(at);
      // 目标项此刻多半还没渲染，只能按预估尺寸落位；渲染出来量到真实尺寸后
      // 位置会自动修正，所以这里不需要自己算偏移量
      vlRef.current?.scrollToIndex(hits[at]!, { align: 'start' });
    },
    [hits],
  );

  // 输入防抖：几千条数据下全量 includes 配合防抖完全够用
  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(input.trim()), 200);
    return () => clearTimeout(timer);
  }, [input]);

  // 关键词变了就跳到第一个命中
  useEffect(() => {
    if (hits.length > 0) jumpTo(0);
    else setCursor(-1);
    // jumpTo 依赖 hits，这里只想在 hits 变化时跑一次
  }, [hits]); // eslint-disable-line react-hooks/exhaustive-deps

  const counterText = !keyword
    ? ''
    : hits.length === 0
      ? '没有匹配'
      : `第 ${cursor + 1} / ${hits.length} 个命中`;

  return (
    <div className="demo-panel">
      <div className="demo-chat-toolbar">
        <input
          className="demo-input"
          type="search"
          placeholder="搜索会话内容，如「不定高」「滚动」"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="button" className="virt-list-btn" disabled={hits.length === 0} onClick={() => jumpTo(cursor - 1)}>
          上一个
        </button>
        <button type="button" className="virt-list-btn" disabled={hits.length === 0} onClick={() => jumpTo(cursor + 1)}>
          下一个
        </button>
        <span className="demo-hint">{counterText}</span>
      </div>
      <div className="demo-stats">
        {[
          `消息数: ${list.length}`,
          `渲染区间: ${range.begin} - ${range.end}`,
          hits.length > 0 ? `命中 ${hits.length} 条（含未渲染项）` : '未搜索',
        ].join(' | ')}
      </div>
      <div className="demo-list-container">
        <VirtList<AiMessage>
          ref={vlRef}
          list={list}
          itemKey="id"
          estimatedSize={80}
          onUpdate={(_, state) => setRange({ begin: state.renderBegin, end: state.renderEnd })}
        >
          {({ itemData, index }) => {
            const isCurrent = cursor >= 0 && hits[cursor] === index;
            return (
              <div className={`demo-chat-message demo-ai-row${itemData.role === 'user' ? ' is-user' : ''}`}>
                {/* 高亮直接跟着 keyword 走：响应式框架下不需要手动清渲染池 */}
                <div className={`demo-chat-bubble${isCurrent ? ' is-current-hit' : ''}`}>
                  <span className="demo-ai-index">#{index} </span>
                  {splitByKeyword(itemData.text, keyword).map((part, i) =>
                    part.hit ? (
                      <mark key={i} className={`demo-hit${isCurrent ? ' is-current' : ''}`}>
                        {part.text}
                      </mark>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ),
                  )}
                </div>
              </div>
            );
          }}
        </VirtList>
      </div>
    </div>
  );
}
