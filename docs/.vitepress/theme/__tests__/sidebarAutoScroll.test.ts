import { describe, it, expect, beforeEach } from 'vitest';
import { scrollSidebarToActive } from '../composables/sidebarAutoScroll';

/**
 * jsdom 不做布局，`getBoundingClientRect()` 一律返回 0。所以这里手工摆出一份
 * 几何：侧边栏视口 64→864（高 800），内容高 2000，目标行 22px 高。
 */
function buildSidebar(options: {
  activeIndex: number;
  /** 目标行在文档坐标里的 top（用来模拟"在视野外"/"在视野内"） */
  activeTop: number;
  /** 是否给目标项挂上 is-active；不挂则走 href 兜底 */
  flagActive?: boolean;
  scrollHeight?: number;
  clientHeight?: number;
}) {
  const {
    activeIndex,
    activeTop,
    flagActive = true,
    scrollHeight = 2000,
    clientHeight = 800,
  } = options;

  document.body.innerHTML = '';
  const sidebar = document.createElement('aside');
  sidebar.className = 'VPSidebar';

  for (let i = 0; i < 35; i++) {
    const item = document.createElement('div');
    item.className = `VPSidebarItem level-1 is-link${
      flagActive && i === activeIndex ? ' is-active' : ''
    }`;
    const inner = document.createElement('div');
    inner.className = 'item';
    const a = document.createElement('a');
    a.className = 'VPLink link';
    a.setAttribute('href', `/vue/examples/list/demo-${i}.html`);
    inner.appendChild(a);
    item.appendChild(inner);
    sidebar.appendChild(item);
  }
  document.body.appendChild(sidebar);

  Object.defineProperty(sidebar, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(sidebar, 'clientHeight', { value: clientHeight, configurable: true });
  sidebar.getBoundingClientRect = () =>
    ({ top: 64, bottom: 64 + clientHeight, height: clientHeight }) as DOMRect;

  const links = Array.from(sidebar.querySelectorAll('a.link'));
  links.forEach((link, i) => {
    const top = i === activeIndex ? activeTop : -9999;
    (link as HTMLElement).getBoundingClientRect = () =>
      ({ top, bottom: top + 22, height: 22 }) as DOMRect;
  });

  sidebar.scrollTop = 0;
  return sidebar;
}

describe('侧边栏自动定位到激活行', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/vue/examples/list/demo-30.html');
  });

  it('激活行在视野下方时，把它滚到居中', () => {
    const sidebar = buildSidebar({ activeIndex: 30, activeTop: 1500 });
    scrollSidebarToActive();
    // 1500 - 64 - (800 - 22) / 2 = 1047
    expect(sidebar.scrollTop).toBe(1047);
  });

  it('激活行在视野上方时，同样滚到居中', () => {
    const sidebar = buildSidebar({ activeIndex: 30, activeTop: -200 });
    sidebar.scrollTop = 1200;
    scrollSidebarToActive();
    // 1200 + (-200 - 64 - 389) = 547
    expect(sidebar.scrollTop).toBe(547);
  });

  it('激活行已在视野里就不动，避免换页时抖一下', () => {
    const sidebar = buildSidebar({ activeIndex: 30, activeTop: 400 });
    scrollSidebarToActive();
    expect(sidebar.scrollTop).toBe(0);
  });

  it('贴着上下边缘算"没露全"，仍然要居中', () => {
    // top = 64 + 10，小于 EDGE_PADDING(24)
    const sidebar = buildSidebar({ activeIndex: 30, activeTop: 74 });
    sidebar.scrollTop = 500;
    scrollSidebarToActive();
    expect(sidebar.scrollTop).toBe(121);
  });

  it('结果被夹在 [0, scrollHeight - clientHeight] 之内', () => {
    const sidebar = buildSidebar({ activeIndex: 34, activeTop: 5000 });
    scrollSidebarToActive();
    expect(sidebar.scrollTop).toBe(1200); // overflow = 2000 - 800
  });

  it('侧边栏装得下（没有溢出）时什么都不做', () => {
    const sidebar = buildSidebar({
      activeIndex: 30,
      activeTop: 1500,
      scrollHeight: 700,
      clientHeight: 800,
    });
    scrollSidebarToActive();
    expect(sidebar.scrollTop).toBe(0);
  });

  it('水合前没有 is-active 时，按 href 匹配当前路径', () => {
    const sidebar = buildSidebar({ activeIndex: 30, activeTop: 1500, flagActive: false });
    scrollSidebarToActive();
    expect(sidebar.scrollTop).toBe(1047);
  });

  it('当前路径不在侧边栏里（比如首页）时不动', () => {
    window.history.replaceState({}, '', '/');
    const sidebar = buildSidebar({ activeIndex: 30, activeTop: 1500, flagActive: false });
    scrollSidebarToActive();
    expect(sidebar.scrollTop).toBe(0);
  });

  it('cleanUrls 形式的路径（无 .html）也能匹配上', () => {
    window.history.replaceState({}, '', '/vue/examples/list/demo-30');
    const sidebar = buildSidebar({ activeIndex: 30, activeTop: 1500, flagActive: false });
    scrollSidebarToActive();
    expect(sidebar.scrollTop).toBe(1047);
  });
});
