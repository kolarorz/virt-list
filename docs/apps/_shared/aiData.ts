/**
 * AI 对话示例的造数据，五个框架共用。
 *
 * 和 chatData 的区别有两处：一是多了 `role`（AI 场景里「谁说的」决定整条消息的形态，
 * 而流式输出只发生在 assistant 那一侧）；二是消息主体是 `blocks` 而不是一段文本——
 * 真实 agent 的一条回答由思考、工具调用、正文、代码、来源拼成，见 agentBlocks.ts。
 *
 * `text` 依然保留：它是这条消息的正文文本，既用于 user 消息，也是 assistant 回答里
 * 那个 text 块的内容来源。搜索与复制走 blocksToPlainText / blocksToMarkdown。
 */

import { makeAnswerBlocks, makeText, type AgentBlock } from './agentBlocks';

export type AiRole = 'user' | 'assistant';

export interface AiMessage {
  id: number;
  /** 消息编号，用于在界面上标识是第几条 */
  index: number;
  role: AiRole;
  /** 正文文本。assistant 消息的完整内容要读 blocks */
  text: string;
  /** 消息主体。user 消息只有一个 text 块 */
  blocks: AgentBlock[];
  /** 是否正在流式生成（渲染闪烁光标用） */
  streaming: boolean;
  /** 下面几个字段给消息底部的操作栏用，初值必须齐全（见 agentBlocks.ts 的说明） */
  model: string;
  tokens: number;
  ms: number;
  /**
   * 点过赞没有。
   *
   * 它是界面状态，却必须存在数据里——项滚出视口会被回收，写在组件里的局部状态
   * 回来就丢了。`expanded` 同理。
   */
  liked: boolean;
  /** 形如 `14:32`，由 index 派生而非取当前时间——同一条消息每次渲染都该一样 */
  time: string;
}

/** 全局自增，保证 key 唯一——列表两端都会增删，key 不能用下标 */
let uid = 0;

export const MODEL_NAME = 'claude-opus-5';

const USER_ASKS = [
  '虚拟列表在流式输出时为什么会跳动？',
  '这个组件支持不定高吗？',
  '几万条历史消息会不会卡？',
  '帮我解释一下贴底跟随的实现思路。',
  '为什么不用占位元素撑高度？',
  '滚动到指定消息怎么做？',
];

/**
 * 回答带 Markdown 标记：真实的 agent 回答里满是小标题、列表、加粗和行内 code。
 * 渲染见 markdown.ts——正文的高度分布因此不再是「几行文字」那么规整。
 */
const ASSISTANT_REPLIES = [
  '因为一条消息在 token 流入过程中高度每几十毫秒就变一次。如果实现是「测量到新尺寸后按差值补偿滚动偏移」，那么每一次补偿都建立在上一次的结果上，**误差会累积**；再加上补偿本身又会触发新的滚动事件，很容易抖起来。\n\n正确的做法是把「视觉位置」表达成一个不变量，每次测量重新求解它，而不是累加增量。',
  '支持，而且这是**默认模式**。每一项挂载后由 `ResizeObserver` 报回真实尺寸，写进尺寸索引；没测量过的项按预估值占位。\n\n`estimatedSize` 只影响首屏定位精度，不影响最终布局的正确性。',
  '不会。渲染的 DOM 数量只和视口大小有关，**和数据量无关**——十万条和一百条渲染的节点数是一样的。\n\n真正需要注意的是前缀和的维护成本：这里用了分块索引，单项尺寸变化只失效它所在的那一块。',
  '一句话说：把「贴在底部」记成一个**待维持的目标**，而不是一次性的滚动动作。\n\n- 内容变高时重新求解这个目标，视口自动跟着走；\n- 用户一旦向上滚，目标换成「锚定当前顶部那一项」，跟随随之自然解除。',
  '## 元素高度是有上限的\n\n占位元素会让容器的实际高度随数据量增长，而浏览器对元素高度有上限（不同引擎在几百万到几千万像素之间），数据量一大就会被截断，滚动条也会失去精度。\n\n这里所有位移都用 `transform` 表达，容器高度恒定。',
  '调 `scrollToIndex` 就行。它接受对齐方式，目标项还没渲染时先按预估尺寸落位，渲染出来量到真实尺寸后会**自动修正**到准确位置——所以不定高列表里也不需要你自己算偏移量。',
];

/**
 * 流式演示用的长回答。
 *
 * 新的流式示例走 agentBlocks 的演出脚本（`buildAnswerScript`），这段文本仍然保留：
 * 它是「一整段纯文本流式输出」的最小素材，示例之外的场景（以及尚未迁移到块模型的
 * 框架副本）还在用它。
 */
export const STREAM_ANSWER =
  '这个问题要分两层看。' +
  '第一层是「渲染」：流式输出意味着同一条消息的 DOM 内容在不断变长，' +
  '如果每个 token 都触发整个列表重新渲染，那么开销和消息数量成正比，很快就会掉帧。' +
  '正确的做法是只更新那一个文本节点——列表的结构、其他项的 DOM 都不需要动。\n\n' +
  '第二层是「滚动」，也是更容易出错的一层。内容变高的同时，用户的视觉焦点应该保持不变：' +
  '如果他正贴在底部看最新内容，视口就该跟着内容往下走；' +
  '如果他已经向上滚去读历史，那么下面长出多少内容都不该把他的视口拽走。' +
  '这两件事看起来矛盾，实际上是同一个机制的两个分支——把「该维持什么」表达成一个可求解的目标，' +
  '贴底时目标是「内容末端」，翻历史时目标是「当前顶部那一项」。' +
  '每次尺寸变化重新求解一次，两种行为就都自然成立了，不需要任何标志位去区分状态。\n\n' +
  '最后一个细节容易被忽略：用户手动把滚动条拖到底部，也应该重新进入跟随态。' +
  '否则他会发现「我明明滚到底了，新内容还是会溢出视口」，' +
  '而这正是很多聊天界面在流式输出下体感不稳的原因。';

/** 由消息序号派生一个稳定的时间戳文本，从 09:00 起每条 +1 分钟 */
function timeOf(index: number): string {
  const total = 9 * 60 + index;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function generateAiPage(page: number, pageSize: number): AiMessage[] {
  const start = (page - 1) * pageSize;
  return Array.from({ length: pageSize }, (_, i) => {
    const idx = start + i;
    // 偶数位是提问、奇数位是回答，读起来像一段真实对话
    const role: AiRole = idx % 2 === 0 ? 'user' : 'assistant';
    const pool = role === 'user' ? USER_ASKS : ASSISTANT_REPLIES;
    const text = pool[Math.floor(idx / 2) % pool.length]!;
    const seed = Math.floor(idx / 2);

    return {
      id: uid++,
      index: idx,
      role,
      text,
      blocks: role === 'user' ? [makeText(text)] : makeAnswerBlocks(seed, text),
      streaming: false,
      model: MODEL_NAME,
      // 回答的 token 数与耗时按正文长度估一个像样的值，纯展示用
      tokens: role === 'user' ? 0 : 320 + text.length * 3,
      ms: role === 'user' ? 0 : 1200 + (seed % 5) * 700,
      liked: false,
      time: timeOf(idx),
    };
  });
}

/** 模拟一次网络请求 */
export function fetchAiPage(
  page: number,
  pageSize: number,
  delay = 700,
): Promise<AiMessage[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(generateAiPage(page, pageSize)), delay),
  );
}

export function createAiMessage(
  index: number,
  role: AiRole,
  text: string,
  streaming = false,
  blocks?: AgentBlock[],
): AiMessage {
  return {
    id: uid++,
    index,
    role,
    text,
    // 流式生成的回答由示例逐步 push 块进来，所以默认给空数组
    blocks: blocks ?? (text ? [makeText(text)] : []),
    streaming,
    model: MODEL_NAME,
    tokens: 0,
    ms: 0,
    liked: false,
    time: timeOf(index),
  };
}

export function randomAsk(): string {
  return USER_ASKS[Math.floor(Math.random() * USER_ASKS.length)]!;
}

/** 输入框里的快捷提示，点一下就当作提问发出去 */
export const QUICK_ASKS = USER_ASKS.slice(0, 3);

/**
 * 把一段文本切成「一次输出」的碎片。
 *
 * 真实的 SSE 流每帧给到的长度并不均匀，这里按 2~5 个字随机切，
 * 才能看出尺寸变化不规律时跟随是否依然稳定。
 */
export function sliceIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const size = 2 + Math.floor(Math.random() * 4);
    chunks.push(text.slice(i, i + size));
    i += size;
  }
  return chunks;
}
