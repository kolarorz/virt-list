import { memo } from 'react';
import type { ToolOutputKind } from '../../../../../_shared/agentBlocks';

/**
 * 工具输出的渲染，消息里的工具卡与 Agent 执行流两个示例共用。
 *
 * 这里不做语法高亮：示例本身是性能演示，为了给输出上色而引一个高亮器
 * （连主题带语法约 60KB gzip）不合适。按行做几个廉价判断，观感已经足够。
 */

function termClass(line: string): string {
  if (line.startsWith('$')) return ' is-cmd';
  if (/error|FAIL|failed|exit code|超时/i.test(line)) return ' is-fail';
  if (/passed|通过|Duration/.test(line)) return ' is-pass';
  return '';
}

function diffClass(line: string): string {
  if (line.startsWith('@@')) return ' is-hunk';
  if (line.startsWith('+')) return ' is-add';
  if (line.startsWith('-')) return ' is-del';
  return '';
}

interface Props {
  text: string;
  kind: ToolOutputKind;
}

export default memo(function AgentOutput({ text, kind }: Props) {
  if (kind === 'text') return <pre className="demo-agent-term">{text}</pre>;

  const lines = text.split('\n');
  const isDiff = kind === 'diff';

  return (
    <pre className={isDiff ? 'demo-agent-diff' : 'demo-agent-term'}>
      {lines.map((line, i) => (
        <div
          key={i}
          className={
            isDiff
              ? `demo-agent-diff-line${diffClass(line)}`
              : `demo-agent-term-line${termClass(line)}`
          }
        >
          {line || ' '}
        </div>
      ))}
    </pre>
  );
});
