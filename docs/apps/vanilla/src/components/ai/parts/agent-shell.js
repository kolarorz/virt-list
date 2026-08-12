/**
 * Agent 会话外壳的命令式版本：顶部状态条 + 列表容器 + 底部输入区。
 *
 * 抽出来的理由和 demoStats 一样——它是让示例看起来像真实产品的部分，
 * 不是示例要教的东西。
 *
 * 返回值里：
 * - listContainer：把 VirtList 挂到它上面
 * - toolbar：输入行右侧的空位，示例可以往里塞「回到底部」这类按钮
 * - setLive / setPhase / setSteps：状态条的三个开关
 */
export function createAgentShell(root, opts) {
  const { model, quickAsks = [], placeholder = '问点什么…（回车发送）', onSend, onStop } = opts;

  root.innerHTML = `
    <div class="demo-panel">
      <div class="demo-stats" id="agentStats"></div>
      <div class="demo-agent-shell">
      <div class="demo-agent-topbar">
        <span class="demo-agent-model">
          <span class="demo-agent-dot" id="agentDot"></span>
          ${model}
        </span>
        <span class="demo-agent-phase" id="agentPhase"></span>
        <div class="demo-agent-steps" id="agentSteps"></div>
      </div>
      <div class="demo-list-container" id="agentList"></div>
      <div class="demo-agent-composer">
        <div class="demo-agent-chips" id="agentChips"></div>
        <div class="demo-agent-inputrow">
          <input class="demo-input" id="agentInput" type="text" placeholder="${placeholder}" />
          <button type="button" class="virt-list-btn virt-list-btn-primary" id="agentSend">发送</button>
          <button type="button" class="virt-list-btn" id="agentStop" hidden>停止生成</button>
          <span id="agentToolbar"></span>
        </div>
      </div>
      </div>
    </div>
  `;

  const dot = root.querySelector('#agentDot');
  const phaseEl = root.querySelector('#agentPhase');
  const stepsEl = root.querySelector('#agentSteps');
  const chipsEl = root.querySelector('#agentChips');
  const input = root.querySelector('#agentInput');
  const sendBtn = root.querySelector('#agentSend');
  const stopBtn = root.querySelector('#agentStop');

  /*
   * 生成中不禁用输入：真实 agent 界面允许你追问，于是会有多条回答同时在生成。
   * 这对列表是更难的一档——「正在变化的那一项」不再只有一个。
   */
  for (const q of quickAsks) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'demo-agent-chip';
    chip.textContent = q;
    chip.addEventListener('click', () => onSend?.(q));
    chipsEl.appendChild(chip);
  }

  function send() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    onSend?.(text);
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') send();
  });
  stopBtn.addEventListener('click', () => onStop?.());

  let stepCount = 0;

  return {
    listContainer: root.querySelector('#agentList'),
    toolbar: root.querySelector('#agentToolbar'),
    /** 顶上那行状态文本，和框架版一样放在 shell 外面 */
    statsEl: root.querySelector('#agentStats'),

    setLive(live) {
      dot.className = `demo-agent-dot${live ? ' is-live' : ''}`;
      stopBtn.hidden = !live;
      // 步骤格的高亮跟着 live 走，停下来时不该还留一格在呼吸
      this.setSteps(this.doneSteps ?? 0, stepCount, live);
    },

    setPhase(text) {
      phaseEl.textContent = text;
    },

    /** 一步一格，比百分比进度条更贴合「第 3/5 步」这种离散进度 */
    setSteps(done, total, live) {
      this.doneSteps = done;
      if (total !== stepCount) {
        stepCount = total;
        stepsEl.innerHTML = '';
        for (let i = 0; i < total; i += 1) {
          stepsEl.appendChild(document.createElement('span'));
        }
      }
      [...stepsEl.children].forEach((node, i) => {
        node.className = `demo-agent-step${i < done ? ' is-done' : ''}${
          live && i === done ? ' is-current' : ''
        }`;
      });
    },
  };
}
