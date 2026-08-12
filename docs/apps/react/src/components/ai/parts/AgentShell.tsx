import { useState, type ReactNode } from 'react';

interface Props {
  /** 是否有回答正在生成：状态灯呼吸，并露出「停止生成」 */
  live: boolean;
  model: string;
  phase?: string;
  steps?: { done: number; total: number };
  quickAsks?: string[];
  placeholder?: string;
  onSend: (text: string) => void;
  onStop: () => void;
  /** 输入行右侧的额外按钮（「回到底部」之类） */
  toolbar?: ReactNode;
  children: ReactNode;
}

/**
 * Agent 会话的外壳：顶部状态条 + 列表 + 底部输入区。
 *
 * 抽出来的理由和 demoStats 一样——它是让示例看起来像真实产品的部分，
 * 不是示例要教的东西。列表本身通过 children 放进来。
 */
export default function AgentShell({
  live,
  model,
  phase = '',
  steps,
  quickAsks = [],
  placeholder = '问点什么…（回车发送）',
  onSend,
  onStop,
  toolbar,
  children,
}: Props) {
  const [draft, setDraft] = useState('');

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    onSend(text);
  };

  return (
    <div className="demo-agent-shell">
      {/* 顶部状态条：谁在回答、在做什么、走到第几步 */}
      <div className="demo-agent-topbar">
        <span className="demo-agent-model">
          <span className={`demo-agent-dot${live ? ' is-live' : ''}`} />
          {model}
        </span>
        <span className="demo-agent-phase">{phase}</span>
        {steps && (
          <div className="demo-agent-steps">
            {Array.from({ length: steps.total }, (_, i) => (
              <span
                key={i}
                className={`demo-agent-step${i < steps.done ? ' is-done' : ''}${
                  live && i === steps.done ? ' is-current' : ''
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {children}

      {/* 底部输入区：快捷提示 + 输入框 + 发送/停止 */}
      <div className="demo-agent-composer">
        {/*
          生成中不禁用输入：真实 agent 界面允许你追问，于是会有多条回答同时在生成。
          这对列表是更难的一档——「正在变化的那一项」不再只有一个。
        */}
        {quickAsks.length > 0 && (
          <div className="demo-agent-chips">
            {quickAsks.map((q) => (
              <button key={q} type="button" className="demo-agent-chip" onClick={() => onSend(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="demo-agent-inputrow">
          <input
            className="demo-input"
            type="text"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && send()}
          />
          <button type="button" className="virt-list-btn virt-list-btn-primary" onClick={send}>
            发送
          </button>
          {live && (
            <button type="button" className="virt-list-btn" onClick={onStop}>
              停止生成
            </button>
          )}
          {toolbar}
        </div>
      </div>
    </div>
  );
}
