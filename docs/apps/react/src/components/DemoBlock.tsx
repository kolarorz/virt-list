import { useState, type ReactNode } from 'react';
import './DemoBlock.css';

export default function DemoBlock({ source, children }: { source: string; children: ReactNode }) {
  const [showCode, setShowCode] = useState(false);
  const [copyText, setCopyText] = useState('复制');

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = source;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopyText('已复制 ✓');
    setTimeout(() => setCopyText('复制'), 2000);
  };

  return (
    <div className="demo-block">
      {children}
      <div className="demo-block__actions">
        <span className="demo-block__divider" />
        <button className="demo-block__toggle" onClick={() => setShowCode(!showCode)}>
          <svg
            className={`demo-block__arrow${showCode ? ' is-open' : ''}`}
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>{showCode ? '隐藏代码' : '展示代码'}</span>
        </button>
        <span className="demo-block__divider" />
      </div>
      {showCode && (
        <div className="demo-block__source">
          <div className="demo-block__source-header">
            <button className="demo-block__copy" onClick={onCopy}>
              {copyText}
            </button>
          </div>
          <pre className="demo-block__pre">
            <code>{source}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
