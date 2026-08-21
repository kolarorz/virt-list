/**
 * 框架清单与展示名。
 *
 * 放在 theme/ 外面是因为 `config.ts` 也要用：theme/composables 下的模块都
 * import 了 vue / vitepress 的运行时，配置文件（node 侧)不能引。这里保持零依赖，
 * 两边都能 import，省得两处各写一份框架名然后慢慢漂移。
 */
export type Framework = 'vanilla' | 'vue' | 'vue2' | 'react' | 'react-legacy';

export const FRAMEWORKS: Framework[] = ['vanilla', 'vue', 'vue2', 'react', 'react-legacy'];

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  vanilla: 'Vanilla',
  vue: 'Vue 3',
  vue2: 'Vue 2',
  react: 'React 18+',
  'react-legacy': 'React 16-17',
};
