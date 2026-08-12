import { memo, useState } from 'react';
import { blocksToMarkdown, formatMs, formatTokens } from '../../../../../_shared/agentBlocks';
import type { AiMessage } from '../../../../../_shared/aiData';
import AgentBlock from './AgentBlock';

/** 展开状态的 key：一条消息里的第几个块 */
export const blockKey = (msgId: number, blockIndex: number) => `${msgId}:${blockIndex}`;

interface Props {
  message: AiMessage;
  /** 这条消息是否正在生成 */
  streaming?: boolean;
  /** 列表下标，搜索示例里用来对照跳转位置 */
  index?: number;
  keyword?: string;
  currentHit?: boolean;
  /**
   * 展开的块集合。
   *
   * 传集合而不是布尔数组：集合的引用只在真的展开/收起时才变，流式生成期间保持不变，
   * 于是下面的 memo 挡得住每帧重渲染。
   */
  expanded?: ReadonlySet<string>;
  liked?: boolean;
  onToggleBlock?: (key: string) => void;
  onRetry?: (message: AiMessage) => void;
  onLike?: (id: number) => void;
}

export default memo(function AgentMessage({
  message,
  streaming,
  index,
  keyword,
  currentHit,
  expanded,
  liked,
  onToggleBlock,
  onRetry,
  onLike,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const showActions = !isUser && !streaming && message.blocks.length > 0;

  /**
   * 复制整条回答。
   *
   * 输出的是 Markdown 而不是屏幕上那几行文字——代码带围栏、工具调用带状态，
   * 粘到编辑器里就能直接用。
   */
  const copyAll = () => {
    void navigator.clipboard?.writeText(blocksToMarkdown(message.blocks));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const toggleBlock = (blockIndex: number) => onToggleBlock?.(blockKey(message.id, blockIndex));

  return (
    <div
      className={`demo-agent-msg${isUser ? ' is-user' : ''}${currentHit ? ' is-current-hit' : ''}`}
    >
      <div className="demo-agent-head">
        <span className={`demo-agent-avatar ${isUser ? 'is-user' : 'is-assistant'}`}>
          {isUser ? '你' : '✦'}
        </span>
        <span className="demo-agent-name">{isUser ? '你' : message.model}</span>
        <span className="demo-agent-time">{message.time}</span>
        {index !== undefined && <span className="demo-ai-index">#{index}</span>}
      </div>

      <div className="demo-agent-body">
        {/*
          流式生成时只有最后一个块在长，前面的块引用都没变——
          AgentBlock 的 memo 因此整个跳过它们，列表结构与其他项的 DOM 一概不动。
        */}
        {message.blocks.map((block, i) => (
          <AgentBlock
            key={i}
            block={block}
            blockIndex={i}
            expanded={expanded?.has(blockKey(message.id, i))}
            onToggle={toggleBlock}
            keyword={keyword}
            currentHit={currentHit}
            streaming={streaming && i === message.blocks.length - 1}
          />
        ))}

        {/* 请求已发出、第一个块还没到：给一条占位，避免界面空着 */}
        {streaming && message.blocks.length === 0 && (
          <div className="demo-agent-skeleton">
            <span>正在思考</span>
            <span className="demo-agent-skeleton-bar" />
          </div>
        )}

        {/* 操作栏只在回答完成后出现，生成中露出「复制」会让人复制到半截内容 */}
        {showActions && (
          <div className="demo-agent-actions">
            <button type="button" className="demo-agent-action" onClick={copyAll}>
              {copied ? '已复制' : '⧉ 复制'}
            </button>
            <button
              type="button"
              className="demo-agent-action"
              onClick={() => onRetry?.(message)}
            >
              ↻ 重试
            </button>
            <button
              type="button"
              className={`demo-agent-action${liked ? ' is-active' : ''}`}
              onClick={() => onLike?.(message.id)}
            >
              ♡ 有用
            </button>
            <span className="demo-agent-meta">
              {formatTokens(message.tokens)} tok · {formatMs(message.ms)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
