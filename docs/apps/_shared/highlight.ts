/**
 * 关键词分段，五个框架共用。
 *
 * 搜索示例要证明的事情是「命中来自数据，不是 DOM」：浏览器的页内查找只能看到
 * 当前渲染的那几十项，而列表里绝大多数项没有对应的 DOM。既然命中位置是算出来的，
 * 高亮也就该由数据驱动——把文本切成命中/非命中的片段交给模板渲染。
 */

export interface TextPart {
  text: string;
  hit: boolean;
}

export function splitByKeyword(text: string, keyword: string): TextPart[] {
  if (!keyword) return [{ text, hit: false }];

  const parts: TextPart[] = [];
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
