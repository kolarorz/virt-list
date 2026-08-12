/**
 * 够用就好的 Markdown 解析，五个框架共用。
 *
 * agent 的回答里满是小标题、列表、加粗和行内 code，全按纯文本渲染会显得很假。
 * 但引一个完整的 Markdown 库也不合适——示例本身是性能演示，而这里需要的
 * 只是「行是什么、行内哪几段要变样」这两件事。
 *
 * 支持：`## 标题`、`- 列表`、`1. 有序列表`、`> 引用`、`**加粗**`、`` `行内 code` ``。
 * 不支持：表格、链接、嵌套列表——这些一旦要支持，就该用真正的解析器了。
 *
 * 流式输出下会出现半截标记（文本刚好停在 `**` 中间），这里的规则是**要求闭合**：
 * 没闭合的标记按普通字符显示，下一片文本到达时自然变成加粗。
 */

export type MdLineKind = 'para' | 'bullet' | 'ordered' | 'heading' | 'quote' | 'blank';

export type MdSpan =
  | { kind: 'plain'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'code'; text: string };

export interface MdLine {
  kind: MdLineKind;
  /** 标题级别（2 或 3），其余行为 0 */
  level: number;
  /** 列表项前面那个符号：`•` 或 `1.` */
  marker: string;
  spans: MdSpan[];
}

/** 一次扫描同时认加粗与行内 code，两者都要求闭合 */
const INLINE = /\*\*([^*\n]+)\*\*|`([^`\n]+)`/g;

export function parseInline(text: string): MdSpan[] {
  const spans: MdSpan[] = [];
  let from = 0;

  for (const m of text.matchAll(INLINE)) {
    const at = m.index;
    if (at > from) spans.push({ kind: 'plain', text: text.slice(from, at) });
    if (m[1] !== undefined) spans.push({ kind: 'strong', text: m[1] });
    else if (m[2] !== undefined) spans.push({ kind: 'code', text: m[2] });
    from = at + m[0].length;
  }

  if (from < text.length) spans.push({ kind: 'plain', text: text.slice(from) });
  // 空文本也要给一个 span，否则流式刚开始时那一行连光标都挂不上
  if (spans.length === 0) spans.push({ kind: 'plain', text: '' });
  return spans;
}

export function parseMarkdown(text: string): MdLine[] {
  return text.split('\n').map((raw) => {
    const line = raw.trimEnd();

    if (line.trim() === '') {
      return { kind: 'blank', level: 0, marker: '', spans: [] };
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      return {
        kind: 'heading',
        level: heading[1]!.length,
        marker: '',
        spans: parseInline(heading[2]!),
      };
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      return { kind: 'bullet', level: 0, marker: '•', spans: parseInline(bullet[1]!) };
    }

    const ordered = /^(\d+)\.\s+(.*)$/.exec(line);
    if (ordered) {
      return {
        kind: 'ordered',
        level: 0,
        marker: `${ordered[1]}.`,
        spans: parseInline(ordered[2]!),
      };
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      return { kind: 'quote', level: 0, marker: '', spans: parseInline(quote[1]!) };
    }

    return { kind: 'para', level: 0, marker: '', spans: parseInline(line) };
  });
}
