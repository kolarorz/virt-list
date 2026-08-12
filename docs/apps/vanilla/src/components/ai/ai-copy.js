import { VirtList } from '@virt-list/vanilla';
import { generateAiPage } from '../../../../_shared/aiData';
import { blocksToMarkdown } from '../../../../_shared/agentBlocks';
import { createAgentMessage, syncBlock } from './parts/agent-message';

const COUNT = 400;

const template = `
  <div class="demo-panel">
    <div id="stats" class="demo-stats"></div>
    <div class="demo-list-container" id="listContainer"></div>
    <div class="demo-chat-toolbar">
      <label>
        <input type="checkbox" id="enableCopy" checked />
        启用跨虚拟化复制
      </label>
      <button type="button" class="virt-list-btn" id="selectAllBtn">选中全部对话</button>
      <span id="result" class="demo-hint"></span>
    </div>
  </div>
`;

export function bootstrapAiCopy(root) {
  root.innerHTML = template;

  const container = root.querySelector('#listContainer');
  const statsEl = root.querySelector('#stats');
  const resultEl = root.querySelector('#result');
  const enableEl = root.querySelector('#enableCopy');
  const selectAllBtn = root.querySelector('#selectAllBtn');

  const list = generateAiPage(1, COUNT);

  /**
   * 一条消息复制出来是什么。
   *
   * 富消息不能按屏幕上看到的那几行来复制——工具卡默认折叠、思考过程收起、
   * 代码块有自己的边框。这里输出 Markdown：代码带围栏、工具调用带状态，
   * 粘到编辑器里就是一份能直接读的对话记录。
   */
  const copyText = (item) =>
    `${item.role === 'user' ? '我' : 'AI'}：${blocksToMarkdown(item.blocks)}`;

  /** 折叠状态存在数据里，改完就地重画那一个块 */
  function ctxOf(item) {
    return {
      onToggle: (blockIndex) => {
        const block = item.blocks[blockIndex];
        if (!block || !('expanded' in block)) return;
        block.expanded = !block.expanded;
        syncBlock(container, item, blockIndex, ctxOf(item));
      },
    };
  }

  const virtList = new VirtList(
    container,
    {
      list,
      itemKey: 'id',
      estimatedSize: 140,
      /**
       * 给出 copyText 即开启跨虚拟化复制。
       *
       * 复制时首尾两项按选区的实际范围截取，中间那些**已经不在 DOM 里**的项
       * 从数据补齐——没有它，跨屏选区复制到的内容会缺失中段。
       */
      copyText,
      copySeparator: '\n\n',
      renderItem: (item) => {
        return createAgentMessage(item, ctxOf(item));
      },
    },
    {
      update: (_, state) => {
        const rendered = state.renderEnd - state.renderBegin + 1;
        statsEl.textContent = [
          `消息数: ${list.length}`,
          `当前渲染: ${rendered} 项（${state.renderBegin} - ${state.renderEnd}）`,
          `未渲染: ${list.length - rendered} 项`,
        ].join(' | ');
      },
    },
  );

  /** 开关直接改配置：关掉之后 copy 监听会在下次绑定时不再挂 */
  enableEl.addEventListener('change', () => {
    virtList.updateOptions({ copyText: enableEl.checked ? copyText : undefined });
    resultEl.textContent = enableEl.checked
      ? ''
      : '已关闭：现在复制只能拿到视口附近的内容';
  });

  /**
   * 一键把整个列表选中。
   *
   * 选中的是滚动容器的全部内容——它只包含当前渲染的那几十项，所以这个选区在
   * 浏览器眼里「跨越」了全部 400 条消息，正好是要演示的那个缺口。
   */
  selectAllBtn.addEventListener('click', () => {
    const selection = document.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(virtList.clientEl);
    selection.removeAllRanges();
    selection.addRange(range);
    resultEl.textContent = '已选中，按 Cmd/Ctrl+C 复制后粘贴到别处对比';
  });

  /**
   * 复制后显示实际进入剪贴板的字数。
   *
   * 读的是 clipboardData 里刚被写入的值——core 的监听挂在内层的滚动容器上，
   * 事件冒泡到这里时它已经改写完毕，所以这个数字就是用户真正粘贴到的内容长度，
   * 不是估算。选区在 DOM 里的字数一并显示出来，两者的差额就是补齐的部分。
   */
  container.addEventListener('copy', (e) => {
    const written = e.clipboardData?.getData('text/plain') ?? '';
    const inDom = document.getSelection()?.toString().length ?? 0;

    if (written) {
      const filled = Math.max(0, written.length - inDom);
      resultEl.textContent = `已复制 ${written.length} 字，其中 ${filled} 字来自未渲染的项`;
    } else {
      // 剪贴板没被改写：浏览器按默认行为复制，能拿到的只有 DOM 里的那部分
      resultEl.textContent = `已复制 ${inDom} 字（只有 DOM 里的内容）`;
    }
  });

  return () => {
    virtList.destroy();
    root.innerHTML = '';
  };
}
