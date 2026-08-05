/**
 * 暗色模式同步
 *
 * 示例应用有两种运行形态：
 * 1. 作为 qiankun 微应用嵌入 VitePress 文档 —— 文档已经在 <html> 上维护 .dark，
 *    示例样式直接复用该 class，无需（也不应）干预；
 * 2. 独立运行（pnpm dev:vue 等）—— 没有宿主主题控制，这里按系统偏好同步 .dark，
 *    让独立调试时也能看到真实的暗色效果。
 *
 * 返回值为取消监听的函数，未做任何处理时返回 noop。
 */
export function syncStandaloneTheme(isPoweredByQiankun: boolean): () => void {
  const noop = () => {};

  if (isPoweredByQiankun || typeof window === 'undefined') return noop;

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (isDark: boolean) => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    document.body.style.backgroundColor = 'var(--demo-c-bg)';
    document.body.style.color = 'var(--demo-c-text-1)';
  };

  apply(media.matches);

  const onChange = (event: MediaQueryListEvent) => apply(event.matches);
  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
}
