import { useRef, useState, useMemo } from 'react';
import { VirtList, type VirtListRef, type VirtScrollOptions } from '@virt-list/react';

interface Item {
  id: number;
  index: number;
  text: string;
}

/** 不限制逐帧穿越距离（会露白，用于对比） */
const NO_LIMIT = Infinity;

const SENTENCES = [
  '平滑滚动通过 behavior: "smooth" 开启，不传参数时保持瞬时跳转。',
  '这一行比较短。',
  'duration 控制动画时长，也可以通过组件属性 scrollDuration 设置默认值。动画使用 requestAnimationFrame 实现，每一帧都会重新计算目标位置，所以不定高列表在滚动途中撑开高度也不会跑偏。',
  'onDone 回调会告诉你动画是正常结束还是被中断。',
  '虚拟列表的滚动定位 API 都支持这个可选参数：scrollToIndex、scrollIntoView、scrollToTop、scrollToBottom、scrollToOffset。',
];

function generateList(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 4) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}

export default function Smooth() {
  const list = useMemo(() => generateList(2000), []);
  const virtListRef = useRef<VirtListRef<Item>>(null);

  const [behavior, setBehavior] = useState<'auto' | 'smooth'>('smooth');
  const [duration, setDuration] = useState(300);
  const [maxDistance, setMaxDistance] = useState(0);
  const [indexInput, setIndexInput] = useState(1500);
  const [offsetInput, setOffsetInput] = useState(8000);
  const [stats, setStats] = useState(`总数: ${list.length}`);
  const [doneText, setDoneText] = useState('');

  /** 组装本次调用的滚动参数，并把 onDone 结果打到界面上 */
  const scrollOptions = (label: string): VirtScrollOptions => {
    setDoneText(`${label} 执行中...`);
    return {
      behavior,
      duration,
      maxDistance,
      onDone: (canceled: boolean) =>
        setDoneText(
          canceled
            ? `${label} 被中断（onDone: canceled = true）`
            : `${label} 已完成（onDone: canceled = false）`,
        ),
    };
  };

  return (
    <div className="demo-panel">
      <div className="demo-toolbar">
        <div className="virt-list-control-group">
          <label>behavior</label>
          <select value={behavior} onChange={(e) => setBehavior(e.target.value as 'auto' | 'smooth')}>
            <option value="auto">auto（瞬时跳转）</option>
            <option value="smooth">smooth（平滑动画）</option>
          </select>
        </div>
        <div className="virt-list-control-group">
          <label>duration (ms)</label>
          <input
            type="number"
            min={0}
            step={100}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        <div className="virt-list-control-group">
          <label>逐帧穿越距离</label>
          <select value={String(maxDistance)} onChange={(e) => setMaxDistance(Number(e.target.value))}>
            <option value="0">自动（两屏，推荐）</option>
            <option value="400">400px（约一屏）</option>
            <option value="2000">2000px</option>
            <option value={String(NO_LIMIT)}>不限制（会露白）</option>
          </select>
        </div>
        <div className="virt-list-control-group">
          <label>scrollToIndex</label>
          <input
            type="number"
            min={0}
            value={indexInput}
            onChange={(e) => setIndexInput(Number(e.target.value))}
          />
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
            onClick={() =>
              virtListRef.current?.scrollToIndex(indexInput, scrollOptions(`scrollToIndex(${indexInput})`))
            }
          >
            跳转
          </button>
        </div>
        <div className="virt-list-control-group">
          <label>scrollToOffset</label>
          <input
            type="number"
            min={0}
            value={offsetInput}
            onChange={(e) => setOffsetInput(Number(e.target.value))}
          />
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
            onClick={() =>
              virtListRef.current?.scrollToOffset(offsetInput, scrollOptions(`scrollToOffset(${offsetInput})`))
            }
          >
            跳转
          </button>
        </div>
      </div>
      <div className="demo-toolbar" style={{ marginTop: 4 }}>
        <button
          type="button"
          className="virt-list-btn virt-list-btn-primary"
          onClick={() => virtListRef.current?.scrollToTop(scrollOptions('scrollToTop'))}
        >
          scrollToTop
        </button>
        <button
          type="button"
          className="virt-list-btn virt-list-btn-primary"
          onClick={() => virtListRef.current?.scrollToBottom(scrollOptions('scrollToBottom'))}
        >
          scrollToBottom
        </button>
        <button
          type="button"
          className="virt-list-btn virt-list-btn-success"
          onClick={() =>
            virtListRef.current?.scrollIntoView(indexInput, scrollOptions(`scrollIntoView(${indexInput})`))
          }
        >
          scrollIntoView
        </button>
        <button
          type="button"
          className="virt-list-btn virt-list-btn-warning"
          onClick={() => virtListRef.current?.cancelScroll()}
        >
          cancelScroll
        </button>
      </div>
      <div className="demo-stats">{stats}</div>
      <div className="demo-stats" style={{ minHeight: 20 }}>{doneText}</div>
      <p className="demo-hint">
        提示：平滑滚动进行中，滚动鼠标滚轮或触摸滑动会立即接管（onDone 收到 canceled = true）；
        发起新的滚动调用或点击 cancelScroll 同样会中断动画。
        <br />
        「逐帧穿越距离」控制动画真正逐帧滚过多长的距离，超出部分会先瞬跳掉。把它切成「不限制」，
        再跳到 index 1500，就能看到虚拟列表逐帧穿越长距离时的露白 —— 中间那几十屏内容根本来不及渲染，
        也没有观看价值，所以默认只逐帧滚最后两屏。
      </p>
      <div className="demo-list-container">
        <VirtList<Item>
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={40}
          buffer={2}
          scrollDuration={duration}
          onUpdate={(_, state) =>
            setStats(
              `总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`,
            )
          }
        >
          {({ itemData }) => (
            <div className="demo-row-item">
              <span className="demo-row-index">#{itemData.index}</span>
              <span className="demo-row-text">{itemData.text}</span>
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
