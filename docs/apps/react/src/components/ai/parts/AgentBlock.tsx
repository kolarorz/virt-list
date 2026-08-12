import { memo, useState } from 'react';
import { formatMs, type AgentBlock } from '../../../../../_shared/agentBlocks';
import { splitByKeyword } from '../../../../../_shared/highlight';
import { parseMarkdown, type MdLine } from '../../../../../_shared/markdown';
import AgentChart from './AgentChart';
import AgentOutput from './AgentOutput';

/** 执行中的圆、成功的勾、失败的叉、取消的斜杠——转起来的只有第二个 */
const STATUS_ICON = {
  queued: '○',
  running: '◐',
  ok: '✓',
  error: '✗',
  aborted: '⊘',
} as const;

const LINE_CLASS: Record<string, string> = {
  para: 'demo-agent-md-p',
  bullet: 'demo-agent-md-li',
  ordered: 'demo-agent-md-li',
  quote: 'demo-agent-md-quote',
};

const lineClass = (line: MdLine) =>
  line.kind === 'heading'
    ? `demo-agent-md-h${line.level}`
    : LINE_CLASS[line.kind] ?? 'demo-agent-md-p';

interface Props {
  block: AgentBlock;
  /** 这个块是不是正在流式生成的那一个（决定要不要挂光标） */
  streaming?: boolean;
  /** 展开状态由外面传进来，不是组件自己的 state——项被回收时局部状态会丢 */
  expanded?: boolean;
  /** 这个块在消息里的下标，回调时用它定位 */
  blockIndex?: number;
  onToggle?: (blockIndex: number) => void;
  /** 搜索关键词，非空时正文按命中分段 */
  keyword?: string;
  /** 这一条是不是当前那个命中，决定高亮用实底还是淡底 */
  currentHit?: boolean;
}

/**
 * 单个块的渲染。
 *
 * memo 在这里不是可选的优化：流式生成时每帧都会重渲染这条消息，
 * 而 memo 让「引用没变的块」整个跳过——最终只有最后一个块在动。
 */
export default memo(function AgentBlockView({
  block,
  streaming,
  expanded = false,
  blockIndex = 0,
  onToggle,
  keyword,
  currentHit,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (block.kind === 'text') {
    /*
     * 两条路径：
     * - 搜索时按命中分段，显示 Markdown 的原始标记——命中位置和高亮位置必须严格
     *   一致，而渲染成加粗之后 `**` 就不在文本里了，位置对不上；
     * - 平时按 Markdown 渲染。
     */
    if (keyword) {
      return (
        <div className="demo-agent-text">
          {splitByKeyword(block.text, keyword).map((part, i) =>
            part.hit ? (
              <mark key={i} className={`demo-hit${currentHit ? ' is-current' : ''}`}>
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </div>
      );
    }

    const lines = parseMarkdown(block.text);
    // 光标挂在最后一个非空行上，否则流式遇到空行时它会孤零零地跳到下一段
    let lastLine = 0;
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (lines[i]!.kind !== 'blank') {
        lastLine = i;
        break;
      }
    }

    return (
      <div className="demo-agent-md">
        {lines.map((line, i) =>
          line.kind === 'blank' ? (
            <div key={i} className="demo-agent-md-gap" />
          ) : (
            <div key={i} className={lineClass(line)}>
              {line.marker && <span className="demo-agent-md-marker">{line.marker}</span>}
              <span>
                {line.spans.map((span, j) =>
                  span.kind === 'strong' ? (
                    <strong key={j}>{span.text}</strong>
                  ) : span.kind === 'code' ? (
                    <code key={j} className="demo-agent-inline-code">
                      {span.text}
                    </code>
                  ) : (
                    <span key={j}>{span.text}</span>
                  ),
                )}
                {streaming && i === lastLine && <span className="demo-ai-caret" />}
              </span>
            </div>
          ),
        )}
      </div>
    );
  }

  if (block.kind === 'thinking') {
    return (
      <div className="demo-agent-thinking">
        <div className="demo-agent-thinking-head" onClick={() => onToggle?.(blockIndex)}>
          <span className="demo-agent-caret">{expanded ? '▾' : '▸'}</span>
          <span className="demo-agent-spark">✦</span>
          <span>思考 {block.seconds}s</span>
        </div>
        {expanded && (
          <div className="demo-agent-thinking-body">
            <span>{block.text}</span>
            {streaming && <span className="demo-ai-caret" />}
          </div>
        )}
      </div>
    );
  }

  if (block.kind === 'code') {
    const copyCode = () => {
      void navigator.clipboard?.writeText(block.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    };

    return (
      <div className="demo-agent-code">
        <div className="demo-agent-code-head">
          <span>{block.lang}</span>
          <button type="button" className="demo-agent-code-copy" onClick={copyCode}>
            {copied ? '已复制' : '⧉ 复制'}
          </button>
        </div>
        <pre className="demo-agent-code-body">
          {block.code.split('\n').map((line, i) => (
            <div
              key={i}
              className={`demo-agent-code-line${line.trimStart().startsWith('//') ? ' is-comment' : ''}`}
            >
              {line || ' '}
            </div>
          ))}
        </pre>
      </div>
    );
  }

  if (block.kind === 'tool') {
    const hint =
      block.status === 'running' ? '执行中…' : block.status === 'aborted' ? '已取消' : formatMs(block.ms);

    return (
      <div className={`demo-agent-tool is-${block.status}`}>
        <div className="demo-agent-tool-head" onClick={() => onToggle?.(blockIndex)}>
          <span className="demo-agent-caret">{expanded ? '▾' : '▸'}</span>
          <span className="demo-agent-tool-icon">{STATUS_ICON[block.status]}</span>
          <span className="demo-agent-tool-name">{block.name}</span>
          <span className="demo-agent-tool-args">{block.args}</span>
          <span className="demo-agent-tool-ms">{hint}</span>
        </div>
        {expanded && (
          <div className="demo-agent-tool-body">
            <AgentOutput text={block.output} kind={block.outputKind} />
          </div>
        )}
      </div>
    );
  }

  // 图表：加载完成的时机不可控，铺开那一下是最考验跟随的高度突变
  if (block.kind === 'chart') return <AgentChart chart={block} />;

  // 来源引用：横向滚动，卡片高度固定
  return (
    <div className="demo-agent-sources">
      {block.items.map((source, i) => (
        <div key={i} className="demo-agent-source">
          <div className="demo-agent-source-title">{source.title}</div>
          <div className="demo-agent-source-site">{source.site}</div>
          <div className="demo-agent-source-snippet">{source.snippet}</div>
        </div>
      ))}
    </div>
  );
});
