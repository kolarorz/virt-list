// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * 拖拽落点判定走 document.elementFromPoint：任何覆盖在行上方的装饰层一旦参与命中
 * 测试，就会顶掉 .virt-tree-item，落点与指示线全部失效。jsdom 不做布局、
 * elementFromPoint 在单测里是 mock 的，这条链路只有真实浏览器能暴露，
 * 所以在这里对样式做静态断言兜底。
 */
const css = readFileSync(
  fileURLToPath(new URL('../src/tree/tree.css', import.meta.url)),
  'utf8',
);

/**
 * 取该选择器名下所有规则体。同一个类名会出现多次（亮/暗色令牌块也挂在它上面），
 * 所以返回全部，由调用方判断「至少有一处」声明了目标属性。
 */
function ruleBodies(selector: string): string[] {
  const bodies: string[] = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf(`\n${selector} {`, from);
    if (at === -1) break;
    const start = css.indexOf('{', at);
    const end = css.indexOf('}', start);
    bodies.push(css.slice(start + 1, end));
    from = end;
  }
  expect(bodies.length, `样式里找不到 ${selector}`).toBeGreaterThan(0);
  return bodies;
}

describe('拖拽装饰层不能吃掉命中测试', () => {
  it.each(['.virt-tree-all-drag-area', '.virt-tree-drag-box'])(
    '%s 声明了 pointer-events: none',
    (selector) => {
      expect(
        ruleBodies(selector).some((body) => /pointer-events:\s*none/.test(body)),
        `${selector} 没有一处声明 pointer-events: none`,
      ).toBe(true);
    },
  );
});
