import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from '../markdown';

describe('行级结构', () => {
  it('认出标题、列表、有序列表、引用与普通段落', () => {
    const lines = parseMarkdown(
      ['## 小标题', '- 一条', '2. 第二条', '> 引用', '普通段落'].join('\n'),
    );

    expect(lines.map((l) => l.kind)).toEqual([
      'heading',
      'bullet',
      'ordered',
      'quote',
      'para',
    ]);
    expect(lines[0]!.level).toBe(2);
    expect(lines[2]!.marker).toBe('2.');
  });

  it('空行单独成类——它只留一点间距，不占一整行行高', () => {
    const lines = parseMarkdown('上\n\n下');
    expect(lines.map((l) => l.kind)).toEqual(['para', 'blank', 'para']);
  });

  it('标记符号不留在文本里', () => {
    const [line] = parseMarkdown('- 列表项');
    expect(line!.spans.map((s) => s.text).join('')).toBe('列表项');
  });
});

describe('行内标记', () => {
  it('加粗与行内 code 各自成段', () => {
    expect(parseInline('前 **粗** 中 `码` 后')).toEqual([
      { kind: 'plain', text: '前 ' },
      { kind: 'strong', text: '粗' },
      { kind: 'plain', text: ' 中 ' },
      { kind: 'code', text: '码' },
      { kind: 'plain', text: ' 后' },
    ]);
  });

  /**
   * 流式输出会把文本切在任意位置，某一帧里标记必然是半截的。
   * 规则是要求闭合：没闭合就按普通字符显示，下一片到达时自然变成加粗。
   */
  it('未闭合的标记按普通文本处理', () => {
    expect(parseInline('这里 **还没写完')).toEqual([
      { kind: 'plain', text: '这里 **还没写完' },
    ]);
    expect(parseInline('反引号 `也一样')).toEqual([
      { kind: 'plain', text: '反引号 `也一样' },
    ]);
  });

  it('空文本也给一个 span——否则流式刚开始时光标无处可挂', () => {
    expect(parseInline('')).toEqual([{ kind: 'plain', text: '' }]);
  });

  it('不跨行匹配', () => {
    const lines = parseMarkdown('**开头\n结尾**');
    for (const line of lines) {
      expect(line.spans.every((s) => s.kind === 'plain')).toBe(true);
    }
  });
});
