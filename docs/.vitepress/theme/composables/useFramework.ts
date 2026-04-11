import { computed } from 'vue';
import { useRoute } from 'vitepress';

export type Framework = 'js' | 'vue' | 'react';
export type ModuleName = 'guide' | 'examples' | 'api';

const FRAMEWORKS: Framework[] = ['js', 'vue', 'react'];
const MODULES: ModuleName[] = ['guide', 'examples', 'api'];

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  js: 'DOM',
  vue: 'Vue',
  react: 'React',
};

/**
 * Resolves the target URL for a given framework + module combination.
 * All routes follow /{fw}/{module}/... pattern.
 */
const deployBase = import.meta.env.VITE_DEPLOY_BASE || '/';
export function getModuleLink(fw: Framework, mod: ModuleName): string {
  if (mod === 'examples') {
    console.log('getModuleLink11', `${deployBase || '/'}${fw}/${mod}/`);
    return `${deployBase || '/'}${fw}/examples/basic`;
  }
  console.log('getModuleLink22', `${deployBase || '/'}${fw}/${mod}/`);
  return `${deployBase || '/'}${fw}/${mod}/`;
}

export function useFramework() {
  const route = useRoute();

  const currentFramework = computed<Framework>(() => {
    const parts = route.path.replace(deployBase, '').split('/').filter(Boolean);
    if (FRAMEWORKS.includes(parts[0] as Framework)) {
      return parts[0] as Framework;
    }
    return 'js';
  });

  const currentModule = computed<ModuleName>(() => {
    const parts = route.path.replace(deployBase, '').split('/').filter(Boolean);
    const mod = parts[1] as ModuleName | undefined;
    if (mod && MODULES.includes(mod)) return mod;
    return 'guide';
  });

  return { currentFramework, currentModule };
}
