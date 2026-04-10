const template = `
  <div class="demo-block">
    <div class="demo-block__content"></div>
    <div class="demo-block__actions">
      <span class="demo-block__divider"></span>
      <button class="demo-block__toggle" type="button">
        <svg class="demo-block__arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span class="demo-block__toggle-text">展示代码</span>
      </button>
      <span class="demo-block__divider"></span>
    </div>
    <div class="demo-block__source" style="display:none;">
      <div class="demo-block__source-header">
        <button class="demo-block__copy" type="button">复制</button>
      </div>
      <pre class="demo-block__pre"><code></code></pre>
    </div>
  </div>
`;

async function copyText(source) {
  try {
    await navigator.clipboard.writeText(source);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = source;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

export function mountDemoBlock(root, source) {
  root.innerHTML = template;
  const contentEl = root.querySelector('.demo-block__content');
  const sourceEl = root.querySelector('.demo-block__source');
  const codeEl = root.querySelector('.demo-block__pre code');
  const toggleBtn = root.querySelector('.demo-block__toggle');
  const toggleTextEl = root.querySelector('.demo-block__toggle-text');
  const arrowEl = root.querySelector('.demo-block__arrow');
  const copyBtn = root.querySelector('.demo-block__copy');

  if (!contentEl || !sourceEl || !codeEl || !toggleBtn || !toggleTextEl || !arrowEl || !copyBtn) {
    throw new Error('Demo block mount failed: missing elements');
  }

  codeEl.textContent = source || '';

  let showCode = false;
  const onToggle = () => {
    showCode = !showCode;
    sourceEl.style.display = showCode ? 'block' : 'none';
    toggleTextEl.textContent = showCode ? '隐藏代码' : '展示代码';
    arrowEl.classList.toggle('is-open', showCode);
  };

  const onCopy = async () => {
    const copied = await copyText(source || '');
    copyBtn.textContent = copied ? '已复制 ✓' : '复制失败';
    setTimeout(() => {
      copyBtn.textContent = '复制';
    }, 2000);
  };

  toggleBtn.addEventListener('click', onToggle);
  copyBtn.addEventListener('click', onCopy);

  return {
    mountEl: contentEl,
    destroy() {
      toggleBtn.removeEventListener('click', onToggle);
      copyBtn.removeEventListener('click', onCopy);
      root.innerHTML = '';
    },
  };
}
