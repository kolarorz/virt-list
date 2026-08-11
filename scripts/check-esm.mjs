/**
 * 构建产物的 ESM 冒烟检查：用 Node 直接 import 每个包的 dist 入口。
 *
 * 为什么需要它：包声明了 `"type": "module"`，而 Node 的 ESM 解析**不补扩展名、
 * 也不做目录解析**。tsc 从不重写 import 路径，所以源码里只要有一处
 * `from './VirtList'` 或 `from './tree'`，产物在 Node 下就直接 ERR_MODULE_NOT_FOUND
 * ——而 Vite / webpack 会替你补全，于是本地 demo 一切正常，装到 SSR 项目里才炸。
 * 这个缺陷曾经发到过线上（0.0.5 的 @virt-list/vue 在 Node 下 import 不了）。
 *
 * 同理，主入口里也不能出现 `import 'xxx.css'`：Node 不认 `.css`，会抛
 * ERR_UNKNOWN_FILE_EXTENSION。样式一律走 `<pkg>/style.css` 子路径交付。
 *
 * 用法：pnpm check:esm（需先 pnpm build:packages）
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);

const PKGS = ['core', 'vanilla', 'vue', 'vue2', 'react', 'react-legacy'];
/** 有样式产物的包（core 是纯算法，不含 DOM 与样式） */
const STYLED = new Set(['vanilla', 'vue', 'vue2', 'react', 'react-legacy']);

let failed = 0;

for (const p of PKGS) {
  const name = `@virt-list/${p}`;
  const entry = new URL(`../packages/${p}/dist/index.js`, import.meta.url);

  if (!existsSync(entry)) {
    console.error(`✗ ${name}：dist/index.js 不存在，先跑 pnpm build:packages`);
    failed++;
    continue;
  }

  try {
    const mod = await import(entry.href);
    const n = Object.keys(mod).length;
    if (n === 0) throw new Error('入口没有任何导出');
    console.log(`✓ ${name.padEnd(26)} Node import 正常（${n} 个导出）`);
  } catch (e) {
    console.error(`✗ ${name.padEnd(26)} ${e.code || 'ERROR'}: ${String(e.message).split('\n')[0]}`);
    failed++;
  }

  // 样式必须能通过 exports 的子路径拿到，而不是让使用方去猜 dist 里的相对路径。
  //
  // 这里校验「exports 有这一项」+「它指向的文件真的存在」，而不是 require.resolve：
  // workspace 包不在仓库根的 node_modules 里，裸包名在 monorepo 内解析不到，
  // 真实安装场景下的解析由 packages/*/__tests__ 之外的打包冒烟覆盖。
  if (STYLED.has(p)) {
    const pkgJson = require(`../packages/${p}/package.json`);
    const target = pkgJson.exports?.['./style.css'];
    if (!target) {
      console.error(`✗ ${name}：exports 缺少 "./style.css"`);
      failed++;
    } else if (!existsSync(new URL(`../packages/${p}/${target.replace(/^\.\//, '')}`, import.meta.url))) {
      console.error(`✗ ${name}：exports 指向的 ${target} 不存在（build-styles 没跑？）`);
      failed++;
    } else {
      console.log(`  ${''.padEnd(24)} ${name}/style.css → ${target}`);
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} 项未通过`);
  process.exit(1);
}
console.log('\nESM 产物检查全部通过');
