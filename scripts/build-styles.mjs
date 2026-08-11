/**
 * 把 vanilla 层的样式汇总成各包自己的 `dist/style.css`。
 *
 * 为什么需要这一步：样式的唯一副本在 `packages/vanilla/src/`（滚动条与树各一份），
 * 而框架包不能在 exports 里指向包外的文件——npm 包的 exports 只能映射自己目录下的路径。
 * 于是构建时复制一份进来，让使用方引自己装的那个包：
 *
 *     import '@virt-list/vue/style.css';
 *
 * 而不是去引一个间接依赖（`@virt-list/vanilla/...`，pnpm 严格模式下根本解析不到）。
 *
 * 另一个理由是 SSR：曾经的做法是让 `VirtTree` 在 JS 里 `import 'tree.css'`，
 * 于是纯 Node 环境下 `import('@virt-list/vue')` 直接抛 ERR_UNKNOWN_FILE_EXTENSION
 * ——Node 不认 `.css`。主入口不碰样式之后这条路就通了。
 *
 * 用法：在包目录下执行 `node ../../scripts/build-styles.mjs`（已接进各包的 build）。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { join, basename } from 'node:path';

const SOURCES = [
  '../packages/vanilla/src/scrollbar/scrollbar.css',
  '../packages/vanilla/src/tree/tree.css',
];

const cwd = process.cwd();
const pkgName = basename(cwd);

const banner = `/**
 * @virt-list —— 样式合集（构建产物，请勿手改）
 *
 * 由 scripts/build-styles.mjs 从 packages/vanilla/src/ 下的样式汇总生成，
 * 内容 = 自绘滚动条 + 虚拟树。两者的可定制项都以 CSS 变量暴露，覆盖变量即可换肤；
 * 暗色模式跟随宿主的 \`html.dark\` 或任意祖先上的 \`[data-theme='dark']\`。
 *
 * 只用虚拟列表 / 网格、不用树的项目，引这一份也无妨：树的选择器都以
 * \`.virt-tree\` 开头，命不中任何东西，gzip 后的净增量在 1KB 上下。
 */
`;

const chunks = [banner];
for (const rel of SOURCES) {
  const path = fileURLToPath(new URL(rel, import.meta.url));
  chunks.push(`/* ===== ${rel.replace('../packages/vanilla/src/', '')} ===== */\n`);
  chunks.push(readFileSync(path, 'utf8').trimEnd(), '\n\n');
}

const outDir = join(cwd, 'dist');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'style.css');
writeFileSync(outFile, chunks.join(''));

const kb = (Buffer.byteLength(chunks.join('')) / 1024).toFixed(1);
console.log(`[build-styles] ${pkgName}/dist/style.css  ${kb} kB`);
