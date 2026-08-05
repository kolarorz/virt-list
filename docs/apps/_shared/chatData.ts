/**
 * 聊天室示例的造数据，五个框架共用。
 *
 * 抽出来是为了让示例源码里只剩"折叠消息怎么做"这件事——造数据是任何列表 demo
 * 都要写的样板，混在里面读者得先跳过四十行才能看到重点。
 */

export interface ChatMessage {
  id: number;
  /** 消息编号，用于在界面上标识是第几条 */
  index: number;
  text: string;
}

/**
 * 展开后有两三屏高的超长消息。
 *
 * 折叠示例里最难处理的场景都靠它：滚到消息中段再收起、只露出"展开"按钮时点开、
 * 展开后往下滚会不会露白。
 */
export const VERY_LONG_MSG = Array.from(
  { length: 14 },
  (_, i) =>
    `第 ${i + 1} 段：这条消息刻意写得很长，展开之后会超过两三屏的高度。这样才能验证「滚到消息中段再收起」这个场景——收起的瞬间它从两三屏骤然缩回三行，滚动位置原本指着的那个很深的偏移量，此刻已经是后面十几条消息的位置了。如果不做处理，用户点完收起就会发现刚才读的那条消息不见了。`,
).join('');

/** 长短交替，便于看出不定高列表的行为 */
export const CHAT_MSGS = [
  VERY_LONG_MSG,
  '好的，收到！',
  '这个方案看起来不错，我觉得可以按这个方向继续推进。',
  '我刚刚把整个虚拟列表的实现又读了一遍，感觉这里的设计思路挺清晰的：核心引擎只负责维护滚动状态和尺寸映射，完全不碰 DOM；DOM 层拿到渲染区间之后做增量 patch，只创建和销毁进出区间的那几项；框架层再往上包一层，把插槽和事件转成各自框架的写法。',
  '👍',
  '关于昨天讨论的那个折叠消息的需求，我整理了一下思路。折叠态只显示前三行，超出部分用省略号截断，点击"展开"之后显示全文。难点在于消息高度会因为展开动作突然变化，虚拟列表必须能感知到这个变化并且正确修正后续内容的位置。',
  '明天的会议改到下午三点了。',
  '这条消息稍微长一点，但还不至于需要折叠，正好用来对比一下两种消息的显示效果差异。',
  '周末愉快！',
  '刚才压测了一下，十万条消息的列表滚动依然很流畅，内存占用也稳定，没有看到明显的泄漏。',
];

/** 全局自增，保证每条消息的 key 唯一（列表两端都会增删，key 不能用下标） */
let uid = 0;

export function generateChatPage(page: number, pageSize: number): ChatMessage[] {
  const start = (page - 1) * pageSize;
  return Array.from({ length: pageSize }, (_, i) => {
    const idx = start + i;
    return { id: uid++, index: idx, text: CHAT_MSGS[idx % CHAT_MSGS.length]! };
  });
}

/** 模拟一次网络请求 */
export function fetchChatPage(
  page: number,
  pageSize: number,
  delay = 800,
): Promise<ChatMessage[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(generateChatPage(page, pageSize)), delay),
  );
}

/** 随机取一条消息内容（"发送消息"按钮用） */
export function randomChatText(): string {
  return CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)]!;
}

/** 造一条新消息，追加到列表末尾用 */
export function createChatMessage(index: number): ChatMessage {
  return { id: uid++, index, text: randomChatText() };
}
