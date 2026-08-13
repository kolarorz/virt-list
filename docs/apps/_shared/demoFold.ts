/**
 * 示例源码里的「折叠区间」标记解析。
 *
 * 示例本身要能跑，所以造数据、演示用工具栏这些与库无关的脚手架不能从源码里删掉。
 * 但读者展开源码时也不该被它们淹没 —— 于是在源码里用注释圈出区间，
 * 展示时折叠成一行摘要，点开才展开。复制拿到的仍是完整源码。
 *
 * 支持四种注释风格，标记必须独占一行（可带缩进）：
 *
 *   <!-- demo:fold 造 1000 条不定长数据 -->     ... <!-- /demo:fold -->
 *   {/* demo:fold 造 1000 条不定长数据 *\/}      ... {/* /demo:fold *\/}   ← JSX 里只能用这种
 *   // demo:fold 造 1000 条不定长数据            ... // /demo:fold
 *   /* demo:fold 造 1000 条不定长数据 *\/         ... /* /demo:fold *\/
 *
 * 标记行本身会被剔除（不进高亮、也不进复制内容）。不支持嵌套。
 *
 * 注意：不要把标记写进**运行时的模板字符串**里（vanilla 示例的 `const template = \`…\``）。
 * 那里的 HTML 注释不经编译，会原样进产物、并在 innerHTML 后变成 DOM 注释节点 ——
 * 剔除只发生在读源码这一侧。vue 的 SFC 模板与 react 的 {/* *\/} 都是编译期就没了，不受影响。
 */

export interface FoldRegion {
  /** 折叠摘要文案 */
  label: string;
  /** 起始行号，1-based，基于剔除标记行后的代码 */
  start: number;
  /** 结束行号，1-based，闭区间 */
  end: number;
}

export interface ParsedFold {
  /** 剔除标记行后的源码 */
  code: string;
  regions: FoldRegion[];
}

const OPEN_KEYWORD = 'demo:fold';
const CLOSE_KEYWORD = '/demo:fold';
const DEFAULT_LABEL = '演示脚手架';

/**
 * 剥掉整行注释的壳，返回注释内容；不是整行注释则返回 null。
 *
 * 只认「整行都是注释」的情况 —— 行尾注释里出现 demo:fold 属于巧合，不该当标记。
 */
function commentBody(line: string): string | null {
  const trimmed = line.trim();

  if (trimmed.startsWith('<!--')) {
    if (!trimmed.endsWith('-->')) return null;
    return trimmed.slice(4, -3).trim();
  }
  // JSX 里 HTML 注释是语法错误，标记只能写成 {/* ... */}
  if (trimmed.startsWith('{/*')) {
    if (!trimmed.endsWith('*/}')) return null;
    return trimmed.slice(3, -3).trim();
  }
  if (trimmed.startsWith('/*')) {
    if (!trimmed.endsWith('*/')) return null;
    return trimmed.slice(2, -2).trim();
  }
  if (trimmed.startsWith('//')) {
    return trimmed.slice(2).trim();
  }
  return null;
}

export function parseFoldMarkers(source: string): ParsedFold {
  const lines = source.split('\n');
  const kept: string[] = [];
  const regions: FoldRegion[] = [];

  let open: { label: string; start: number } | null = null;

  for (const line of lines) {
    const body = commentBody(line);

    if (body === CLOSE_KEYWORD) {
      // kept.length 就是刚保留的那一行的行号（1-based）
      if (open && kept.length >= open.start) {
        regions.push({ label: open.label, start: open.start, end: kept.length });
      }
      open = null;
      continue;
    }

    if (body != null && (body === OPEN_KEYWORD || body.startsWith(`${OPEN_KEYWORD} `))) {
      // 未闭合就再次开启：丢掉前一个，避免把整个文件吞进折叠区
      open = {
        label: body.slice(OPEN_KEYWORD.length).trim() || DEFAULT_LABEL,
        start: kept.length + 1,
      };
      continue;
    }

    kept.push(line);
  }

  return { code: kept.join('\n'), regions };
}
