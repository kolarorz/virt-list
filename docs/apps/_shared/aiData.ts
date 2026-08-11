/**
 * AI 对话示例的造数据，五个框架共用。
 *
 * 和 chatData 的区别是多了 `role`：AI 场景里「谁说的」决定气泡样式，而流式输出
 * 又只发生在 assistant 那一侧，示例代码里要频繁判断这件事。
 */

export type AiRole = 'user' | 'assistant';

export interface AiMessage {
  id: number;
  /** 消息编号，用于在界面上标识是第几条 */
  index: number;
  role: AiRole;
  text: string;
  /** 是否正在流式生成（渲染闪烁光标用） */
  streaming?: boolean;
}

/** 全局自增，保证 key 唯一——列表两端都会增删，key 不能用下标 */
let uid = 0;

const USER_ASKS = [
  '虚拟列表在流式输出时为什么会跳动？',
  '这个组件支持不定高吗？',
  '几万条历史消息会不会卡？',
  '帮我解释一下贴底跟随的实现思路。',
  '为什么不用占位元素撑高度？',
  '滚动到指定消息怎么做？',
];

const ASSISTANT_REPLIES = [
  '因为一条消息在 token 流入过程中高度每几十毫秒就变一次。如果实现是「测量到新尺寸后按差值补偿滚动偏移」，那么每一次补偿都建立在上一次的结果上，误差会累积；再加上补偿本身又会触发新的滚动事件，很容易抖起来。正确的做法是把「视觉位置」表达成一个不变量，每次测量重新求解它，而不是累加增量。',
  '支持，而且这是默认模式。每一项挂载后由 ResizeObserver 报回真实尺寸，写进尺寸索引；没测量过的项按预估值占位。预估值只影响首屏定位精度，不影响最终布局的正确性。',
  '不会。渲染的 DOM 数量只和视口大小有关，和数据量无关——十万条和一百条渲染的节点数是一样的。真正需要注意的是前缀和的维护成本，这里用了分块索引，单项尺寸变化只失效它所在的那一块。',
  '一句话说：把「贴在底部」记成一个待维持的目标，而不是一次性的滚动动作。内容变高时重新求解这个目标，于是视口自动跟着走；用户一旦向上滚，目标就被换成「锚定当前顶部那一项」，跟随随之自然解除。',
  '占位元素会让容器的实际高度随数据量增长，而浏览器对元素高度有上限（不同引擎在几百万到几千万像素之间），数据量一大就会被截断，滚动条也会失去精度。这里所有位移都用 transform 表达，容器高度恒定。',
  '调 scrollToIndex 就行。它接受对齐方式，目标项还没渲染时先按预估尺寸落位，渲染出来量到真实尺寸后会自动修正到准确位置——所以不定高列表里也不需要你自己算偏移量。',
];

/** 流式演示用的长回答：够长才能在滚动容器里明显长出好几屏 */
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

export function generateAiPage(page: number, pageSize: number): AiMessage[] {
  const start = (page - 1) * pageSize;
  return Array.from({ length: pageSize }, (_, i) => {
    const idx = start + i;
    // 偶数位是提问、奇数位是回答，读起来像一段真实对话
    const role: AiRole = idx % 2 === 0 ? 'user' : 'assistant';
    const pool = role === 'user' ? USER_ASKS : ASSISTANT_REPLIES;
    return {
      id: uid++,
      index: idx,
      role,
      text: pool[Math.floor(idx / 2) % pool.length]!,
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
): AiMessage {
  return { id: uid++, index, role, text, streaming };
}

export function randomAsk(): string {
  return USER_ASKS[Math.floor(Math.random() * USER_ASKS.length)]!;
}

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
