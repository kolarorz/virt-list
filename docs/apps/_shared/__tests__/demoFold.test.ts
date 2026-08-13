import { describe, it, expect } from 'vitest';
import { createHighlighter } from 'shiki';
import { parseFoldMarkers } from '../demoFold';
import { foldTransformer } from '../vitePluginHighlightSource';

describe('parseFoldMarkers', () => {
  it('剔除标记行，并按剔除后的行号记录区间', () => {
    const { code, regions } = parseFoldMarkers(
      ['const a = 1;', '// demo:fold 造数据', 'const b = 2;', 'const c = 3;', '// /demo:fold', 'const d = 4;'].join('\n'),
    );

    expect(code.split('\n')).toEqual(['const a = 1;', 'const b = 2;', 'const c = 3;', 'const d = 4;']);
    expect(regions).toEqual([{ label: '造数据', start: 2, end: 3 }]);
  });

  it('认四种注释风格', () => {
    const html = parseFoldMarkers(['<!-- demo:fold 模板脚手架 -->', '<div />', '<!-- /demo:fold -->'].join('\n'));
    const line = parseFoldMarkers(['// demo:fold 行注释', 'const a = 1;', '// /demo:fold'].join('\n'));
    const block = parseFoldMarkers(['/* demo:fold 块注释 */', 'const a = 1;', '/* /demo:fold */'].join('\n'));
    // JSX 里 HTML 注释是语法错误，react 侧的标记只能是这种
    const jsx = parseFoldMarkers(['{/* demo:fold JSX 注释 */}', '<div />', '{/* /demo:fold */}'].join('\n'));

    expect(html.regions).toEqual([{ label: '模板脚手架', start: 1, end: 1 }]);
    expect(line.regions).toEqual([{ label: '行注释', start: 1, end: 1 }]);
    expect(block.regions).toEqual([{ label: '块注释', start: 1, end: 1 }]);
    expect(jsx.regions).toEqual([{ label: 'JSX 注释', start: 1, end: 1 }]);
  });

  it('示例源码里的标记都能被解析 —— 五个框架实地抽查', async () => {
    const { readFile } = await import('node:fs/promises');
    // jsdom 下 import.meta.url 不是 file: scheme，只能从 cwd（仓库根）拼
    const apps = `${process.cwd()}/docs/apps/`;

    const samples: [string, number][] = [
      ['vue/src/components/list/ListBasic.vue', 2],
      ['vue2/src/components/list/ListBasic.vue', 2],
      ['react/src/components/list/ListBasic.tsx', 2],
      ['react-legacy/src/components/list/ListBasic.tsx', 2],
      // vanilla 只折造数据：它的工具栏在运行时模板字符串里，HTML 注释不经编译，
      // 加标记会连同注释一起进产物并变成 DOM 注释节点
      ['vanilla/src/components/list/list-basic.js', 1],
    ];

    for (const [rel, expected] of samples) {
      const source = await readFile(`${apps}${rel}`, 'utf-8');
      const { code, regions } = parseFoldMarkers(source);

      expect(regions, rel).toHaveLength(expected);
      // 标记行必须被剔干净，否则会随源码一起展示/复制出去
      expect(code, rel).not.toContain('demo:fold');
    }
  });

  it('运行时模板字符串里没有标记 —— 否则会漏进产物和 DOM', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const dir = `${process.cwd()}/docs/apps/vanilla/src/components`;

    const offenders = readdirSync(dir, { recursive: true, encoding: 'utf-8' })
      .filter((name) => name.endsWith('.js'))
      .filter((name) => /<!--\s*\/?demo:fold/.test(readFileSync(`${dir}/${name}`, 'utf-8')));

    expect(offenders).toEqual([]);
  });

  it('允许缩进，摘要缺省时给默认文案', () => {
    const { regions } = parseFoldMarkers(['    <!-- demo:fold -->', '    <div />', '    <!-- /demo:fold -->'].join('\n'));
    expect(regions).toEqual([{ label: '演示脚手架', start: 1, end: 1 }]);
  });

  it('多个区间各自独立', () => {
    const { code, regions } = parseFoldMarkers(
      [
        '// demo:fold 甲',
        'a',
        '// /demo:fold',
        'keep',
        '// demo:fold 乙',
        'b',
        'c',
        '// /demo:fold',
      ].join('\n'),
    );

    expect(code.split('\n')).toEqual(['a', 'keep', 'b', 'c']);
    expect(regions).toEqual([
      { label: '甲', start: 1, end: 1 },
      { label: '乙', start: 3, end: 4 },
    ]);
  });

  it('行尾注释里的 demo:fold 不当标记 —— 只认整行注释', () => {
    const { code, regions } = parseFoldMarkers(['const a = 1; // demo:fold 这只是普通注释', 'const b = 2;'].join('\n'));

    expect(regions).toEqual([]);
    expect(code.split('\n')).toHaveLength(2);
  });

  it('未闭合的标记不产出区间，也不吞掉后续代码', () => {
    const { code, regions } = parseFoldMarkers(['// demo:fold 忘了闭合', 'const a = 1;', 'const b = 2;'].join('\n'));

    expect(regions).toEqual([]);
    expect(code.split('\n')).toEqual(['const a = 1;', 'const b = 2;']);
  });

  it('没有标记时原样返回', () => {
    const source = 'const a = 1;\nconst b = 2;';
    expect(parseFoldMarkers(source)).toEqual({ code: source, regions: [] });
  });
});

describe('foldTransformer', () => {
  const sample = `<template>
  <div class="demo-panel">
    <!-- demo:fold 演示用工具栏 -->
    <div class="demo-toolbar">
      <button @click="onAdd">添加</button>
    </div>
    <!-- /demo:fold -->
    <VirtList :list="list" item-key="id" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// demo:fold 造 1000 条数据
const SENTENCES = ['一句话'];
function generateList(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: i, text: SENTENCES[0] }));
}
// /demo:fold

const list = ref(generateList(1000));
</script>
`;

  async function highlight(source: string) {
    const { code, regions } = parseFoldMarkers(source);
    const hl = await createHighlighter({ themes: ['github-light', 'github-dark'], langs: ['vue'] });
    try {
      return hl.codeToHtml(code, {
        lang: 'vue',
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: 'light',
        transformers: [foldTransformer(regions)],
      });
    } finally {
      hl.dispose();
    }
  }

  /** 折叠块是嵌套结构，正则数不清 —— 用 DOM 查 */
  function foldsOf(html: string) {
    const host = document.createElement('div');
    host.innerHTML = html;
    return [...host.querySelectorAll('.demo-fold')].map((el) => ({
      summary: el.querySelector('.demo-fold__toggle')?.textContent ?? '',
      lines: el.querySelectorAll('.demo-fold__body .line').length,
    }));
  }

  it('每个区间生成一个折叠块，摘要带标签与行数', async () => {
    const folds = foldsOf(await highlight(sample));

    expect(folds.map((f) => f.summary)).toEqual(['演示用工具栏（3 行）', '造 1000 条数据（4 行）']);
  });

  it('折叠块默认收起', async () => {
    const html = await highlight(sample);
    expect(html.match(/data-open="false"/g)).toHaveLength(2);
    expect(html).not.toContain('data-open="true"');
  });

  it('折叠块正好包住区间内的行，一行不多一行不少', async () => {
    const folds = foldsOf(await highlight(sample));

    // 摘要里写的行数必须和实际包住的行数一致，否则摘要在骗人
    expect(folds.map((f) => f.lines)).toEqual([3, 4]);
  });

  it('折叠块外的行不受影响 —— 总行数守恒', async () => {
    const { code, regions } = parseFoldMarkers(sample);
    const html = await highlight(sample);

    const host = document.createElement('div');
    host.innerHTML = html;
    expect(host.querySelectorAll('.line')).toHaveLength(code.split('\n').length);
    expect(regions).toHaveLength(2);
  });

  it('折叠区之后的代码仍然正确高亮 —— 不因分段而串色', async () => {
    const html = await highlight(sample);

    // 折叠区在 <script> 中间，其后的 `const list = ...` 若被当成模板文本就不会有关键字色
    const tail = html.slice(html.lastIndexOf('demo-fold__body'));
    expect(tail).toMatch(/style="color:[^"]+">const</);
  });

  it('没有区间时不改动输出', async () => {
    const plain = 'const a = 1;\n';
    const withTransformer = await highlight(plain);

    expect(withTransformer).not.toContain('demo-fold');
    expect(withTransformer).toMatch(/style="color:/);
  });
});
