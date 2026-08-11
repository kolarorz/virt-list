import { computed } from 'vue';
import { useRoute, useData, withBase } from 'vitepress';

export type Framework = 'vanilla' | 'vue' | 'vue2' | 'react' | 'react-legacy';
export type ModuleName = 'guide' | 'ai' | 'examples' | 'api';

const FRAMEWORKS: Framework[] = ['vanilla', 'vue', 'vue2', 'react', 'react-legacy'];
const MODULES: ModuleName[] = ['guide', 'ai', 'examples', 'api'];

/**
 * 只在部分框架下存在的模块。
 *
 * `ai` 正在逐个框架铺开，未覆盖的框架下那些页面还不存在。列在这里之后，
 * 导航会把入口指向已覆盖的框架（而不是链到一个 404），框架切换器也会把
 * 未覆盖的项置灰。铺开一个框架就往数组里加一个，此外无需改动任何地方。
 */
export const MODULE_FRAMEWORKS: Partial<Record<ModuleName, Framework[]>> = {
  ai: ['vanilla', 'vue', 'vue2', 'react', 'react-legacy'],
};

/** 该框架下这个模块是否已有内容 */
export function hasModule(fw: Framework, mod: ModuleName): boolean {
  const only = MODULE_FRAMEWORKS[mod];
  return !only || only.includes(fw);
}

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  vanilla: 'Vanilla',
  vue: 'Vue 3',
  vue2: 'Vue 2',
  react: 'React 18+',
  'react-legacy': 'React 16-17',
};

export const FRAMEWORK_ICONS: Record<Framework, string> = {
  vanilla: '<svg width="16" height="16" viewBox="0 0 20 20"><rect width="20" height="20" rx="3" fill="#f7df1e"/><text x="10" y="14.5" font-size="10" font-weight="bold" fill="#323330" text-anchor="middle" font-family="sans-serif">JS</text></svg>',
  vue: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M2 4l14 24L30 4h-6l-8 14L8 4z" fill="#41b883"/><path d="M8 4l8 14L24 4h-5l-3 5.5L13 4z" fill="#35495e"/></svg>',
  vue2: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M2 4l14 24L30 4h-6l-8 14L8 4z" fill="#41b883" opacity="0.6"/><path d="M8 4l8 14L24 4h-5l-3 5.5L13 4z" fill="#35495e" opacity="0.6"/></svg>',
  react: '<svg width="16" height="16" viewBox="-11 -11 22 22"><circle r="2" fill="#61dafb"/><g fill="none" stroke="#61dafb" stroke-width="1"><ellipse rx="10" ry="4.2"/><ellipse rx="10" ry="4.2" transform="rotate(60)"/><ellipse rx="10" ry="4.2" transform="rotate(120)"/></g></svg>',
  'react-legacy': '<svg width="16" height="16" viewBox="-11 -11 22 22"><circle r="2" fill="#61dafb" opacity="0.6"/><g fill="none" stroke="#61dafb" stroke-width="1" opacity="0.6"><ellipse rx="10" ry="4.2"/><ellipse rx="10" ry="4.2" transform="rotate(60)"/><ellipse rx="10" ry="4.2" transform="rotate(120)"/></g></svg>',
};

/**
 * Resolves the target URL for a given framework + module combination.
 * Uses withBase() to prepend the configured base path (e.g. /virt-list/).
 */
const MODULE_ENTRY: Record<ModuleName, string> = {
  guide: 'introduction',
  ai: 'overview',
  examples: 'list/list-basic',
  api: 'virt-list',
};

export function getModuleLink(fw: Framework, mod: ModuleName): string {
  // 当前框架还没有这个模块时切到已覆盖的框架，而不是链到一个不存在的页面
  const target = hasModule(fw, mod) ? fw : MODULE_FRAMEWORKS[mod]![0];
  return withBase(`/${target}/${mod}/${MODULE_ENTRY[mod]}`);
}

/**
 * Build a link that switches only the framework segment, preserving the
 * current module and page slug. E.g. /vue/examples/list/reactive → /react/examples/list/reactive
 */
export function getFrameworkLink(fw: Framework, relativePath: string): string {
  const parts = relativePath.split('/').filter(Boolean);
  // parts[0] = current fw, parts[1] = mod, parts[2..] = page slug
  if (parts.length >= 2) {
    const mod = parts[1] as ModuleName;
    // 目标框架还没有这个模块（切换器里本就是置灰的，这里兜住直接改 URL 的情况）
    if (MODULES.includes(mod) && !hasModule(fw, mod)) {
      return withBase(`/${fw}/guide/${MODULE_ENTRY.guide}`);
    }
    return withBase(`/${fw}/${parts.slice(1).join('/')}`);
  }
  return withBase(`/${fw}/guide/${MODULE_ENTRY.guide}`);
}

export function useFramework() {
  const route = useRoute();
  const { site } = useData();

  /** Strip the configured base prefix from route.path for segment parsing. */
  const relativePath = computed(() => {
    const base = site.value.base || '/';
    const p = route.path;
    return p.startsWith(base) ? '/' + p.slice(base.length) : p;
  });

  const currentFramework = computed<Framework>(() => {
    const parts = relativePath.value.split('/').filter(Boolean);
    if (FRAMEWORKS.includes(parts[0] as Framework)) {
      return parts[0] as Framework;
    }
    return 'vanilla';
  });

  const currentModule = computed<ModuleName>(() => {
    const parts = relativePath.value.split('/').filter(Boolean);
    const mod = parts[1] as ModuleName | undefined;
    if (mod && MODULES.includes(mod)) return mod;
    return 'guide';
  });

  return { currentFramework, currentModule, relativePath };
}
