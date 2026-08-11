/**
 * 生成 llms.txt / llms-full.txt。
 *
 * 现在开发者选组件库，很大程度上取决于「AI 助手能不能一次写对」。这两个文件是
 * 面向 LLM 的入口约定（https://llmstxt.org）：
 *
 * - `llms.txt`      索引：一句话定位 + 分组的链接清单，供助手按需取用
 * - `llms-full.txt` 全文：所有文档拼成一份纯文本，供一次性灌进上下文
 *
 * 内容从 docs 下的真实文件生成，而不是另写一份——手维护的清单一定会和文档漂移。
 * `_shared` 片段会就地展开，因为 `@include` 对读文本的一方没有意义。
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

const docsDir = fileURLToPath(new URL('../docs', import.meta.url));
const outDir = path.join(docsDir, 'public');

/** 站点地址：CI 里由 SITE_URL 给出，缺省用相对路径（本地预览也能点） */
const SITE = process.env.SITE_URL?.replace(/\/$/, '') ?? '';

/**
 * 只取一个框架的文档进索引。
 *
 * 五个框架的正文是同一份（`_shared` 里），差别只在代码示例的语法。全都列进去
 * 等于让助手在五份近乎相同的内容里挑，反而更容易挑错——索引里给 vanilla
 * （最接近底层、无框架噪声），并在开头说明其余四个框架的路径规律。
 */
const PRIMARY = 'vanilla';

const SECTIONS = [
  {
    title: '指南',
    dir: 'guide',
    order: [
      'introduction', 'started', 'instructions', 'load-more', 'custom-scrollbar',
      'principles', 'algorithms', 'architecture', 'design-decisions',
      'why-no-spacer', 'comparison',
    ],
  },
  {
    title: 'AI 场景',
    dir: 'ai',
    order: ['overview', 'streaming', 'copy', 'search', 'history', 'trace', 'outline'],
  },
  { title: 'API', dir: 'api', order: ['virt-list', 'virt-tree', 'virt-grid'] },
];

/** 把 `<!--@include: path-->` 就地展开：读文本的一方没法解析它 */
async function expandIncludes(text, fromFile, depth = 0) {
  if (depth > 4) return text;
  // 路径里常带连字符（_shared/ai-streaming.md），字符类里千万不能排除 `-`
  const re = /<!--\s*@include:\s*(.+?)\s*-->/g;
  let out = '';
  let last = 0;
  for (const m of text.matchAll(re)) {
    out += text.slice(last, m.index);
    const target = path.resolve(path.dirname(fromFile), m[1].trim());
    try {
      const inner = await readFile(target, 'utf8');
      out += await expandIncludes(inner, target, depth + 1);
    } catch {
      // 引用不到就原样留着，至少不会静默丢内容
      out += m[0];
    }
    last = m.index + m[0].length;
  }
  return out + text.slice(last);
}

const SUMMARY_MAX = 120;

/**
 * 取第一个 h1 作为标题、h1 之后的第一个自然段作为摘要。
 *
 * 必须把整段的多行拼起来：文档是硬换行排版的，只取第一行会在句子中间断掉，
 * 索引里读起来就是一句没说完的话。
 */
function titleAndSummary(md, fallback) {
  const lines = md.split('\n');
  let title = fallback;
  const h1 = lines.find((l) => l.startsWith('# '));
  if (h1) title = h1.slice(2).trim();

  const buf = [];
  let started = false;
  let inCode = false;

  for (const line of lines) {
    const t = line.trim();

    // 代码块整块跳过，否则摘要会变成一段 shell 命令
    if (t.startsWith('```')) {
      inCode = !inCode;
      if (buf.length) break;
      continue;
    }
    if (inCode) continue;

    if (!started) {
      if (t.startsWith('# ')) started = true;
      continue;
    }
    // 表格、容器语法、demo 挂载点都不是正文
    if (t.startsWith('<') || t.startsWith(':::') || t.startsWith('|')) continue;
    // 空行或下一个标题：自然段到此为止
    if (!t || t.startsWith('#')) {
      if (buf.length) break;
      continue;
    }
    buf.push(t);
  }

  let summary = buf
    .join('')
    // 链接留文字、去掉行内 HTML（文档里有 <font color> 这类强调标记）与 md 标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (summary.length > SUMMARY_MAX) {
    summary = `${summary.slice(0, SUMMARY_MAX)}…`;
  }
  return { title, summary };
}

/** 去掉只对网页有意义的部分：demo 挂载点、容器语法 */
function toPlainText(md) {
  return md
    .replace(/<PlaygroundHost[^>]*\/>/g, '')
    .replace(/^:::\s*\w+.*$/gm, '')
    .replace(/^:::\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function collect(fw) {
  const pages = [];
  for (const section of SECTIONS) {
    const dir = path.join(docsDir, fw, section.dir);
    let names;
    try {
      names = (await readdir(dir)).filter((n) => n.endsWith('.md'));
    } catch {
      continue;
    }
    // 按 order 排，未列出的排在后面（新增文档不会被静默漏掉）
    names.sort((a, b) => {
      const ia = section.order.indexOf(a.replace(/\.md$/, ''));
      const ib = section.order.indexOf(b.replace(/\.md$/, ''));
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
    });

    for (const name of names) {
      const file = path.join(dir, name);
      if (!(await stat(file)).isFile()) continue;
      const raw = await readFile(file, 'utf8');
      const md = await expandIncludes(raw, file);
      const slug = name.replace(/\.md$/, '');
      const { title, summary } = titleAndSummary(md, slug);
      pages.push({
        section: section.title,
        title,
        summary,
        url: `${SITE}/${fw}/${section.dir}/${slug}`,
        body: toPlainText(md),
      });
    }
  }
  return pages;
}

const HEADER = `# virt-list

> 高性能虚拟列表：列表有多长，DOM 都只有一屏。行高由内容决定，无需预先声明。
> 一套框架无关的核心算法（@virt-list/core）配五个框架适配层：
> Vanilla、Vue 3、Vue 2、React 18+、React 16-17。

关键事实（写代码时最容易搞错的几点）：

- 滚动容器是 \`overflow: hidden\`，偏移量由 JS 掌管。不要直接读写 \`scrollTop\`，
  用 \`scrollToOffset\` / \`scrollToIndex\` / \`scrollToBottom\`。
- \`itemKey\` 指向的字段必须唯一且稳定，否则无法正常滚动。
- \`estimatedSize\` 是**未测量项**的占位尺寸，决定首屏渲染多少项；项渲染后一切以
  实测为准。给错不会让布局最终出错，但会让首屏留白或多建 DOM。
- 不定高是默认模式，无需任何配置。\`fixedSize: true\` 会跳过测量，
  此时 \`estimatedSize\` 就是权威值。
- 数据所有权在使用方：\`loadMore\` 回调里自己把新数据写进 list，组件负责其余全部
  （防重入、位移补偿、续拉、loading 状态）。
- 头部增删后视口位置会自动补偿，不需要手动算偏移量，也通常不需要 \`forceUpdate\`。

下面的链接都是 ${PRIMARY} 版本。其余框架把路径里的 \`${PRIMARY}\` 换成
\`vue\` / \`vue2\` / \`react\` / \`react-legacy\` 即可，正文相同、代码示例按各自语法给出。
`;

const pages = await collect(PRIMARY);

// —— llms.txt：索引
let index = HEADER;
let current = '';
for (const p of pages) {
  if (p.section !== current) {
    current = p.section;
    index += `\n## ${current}\n\n`;
  }
  index += `- [${p.title}](${p.url})${p.summary ? `: ${p.summary}` : ''}\n`;
}
index += `\n## 可选\n\n- [完整文档（单文件）](${SITE}/llms-full.txt): 上面所有页面的全文，供一次性读取。\n`;

await writeFile(path.join(outDir, 'llms.txt'), index, 'utf8');

// —— llms-full.txt：全文
let full = HEADER + '\n---\n';
current = '';
for (const p of pages) {
  if (p.section !== current) {
    current = p.section;
    full += `\n\n# ${current}\n`;
  }
  full += `\n\n<!-- ${p.url} -->\n\n${p.body}\n\n---\n`;
}
await writeFile(path.join(outDir, 'llms-full.txt'), full, 'utf8');

console.log(
  `llms.txt: ${pages.length} 页 / ${(index.length / 1024).toFixed(1)}KB\n` +
    `llms-full.txt: ${(full.length / 1024).toFixed(1)}KB`,
);
