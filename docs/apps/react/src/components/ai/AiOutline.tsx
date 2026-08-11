import { useCallback, useMemo, useRef, useState } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react';
import { generateTraceLines, KIND_LABEL, type TraceLine } from '../../../../_shared/traceData';
import { activeSection, buildOutline, type OutlineSection } from '../../../../_shared/outline';

const COUNT = 3000;

const copyText = (item: TraceLine) =>
  `[${KIND_LABEL[item.kind]}] ${String(item.seq).padStart(5, ' ')}  ${item.text}`;

const sectionTitle = (section: OutlineSection) =>
  `${section.title}（${section.count} 行${section.errors > 0 ? `，${section.errors} 个错误` : ''}）`;

export default function AiOutline() {
  const vlRef = useRef<VirtListRef<TraceLine>>(null);
  const [list] = useState<TraceLine[]>(() => generateTraceLines(COUNT));
  const [current, setCurrent] = useState(0);
  const [range, setRange] = useState({ begin: 0, end: 0 });

  /** 分段是纯数据计算，列表不变就不用重算 */
  const sections = useMemo(() => buildOutline(list), [list]);

  const jumpTo = useCallback((index: number) => {
    vlRef.current?.scrollToIndex(index, { align: 'start' });
  }, []);

  const section = sections[current];

  return (
    <div className="demo-panel">
      <div className="demo-stats">
        {[
          `行数: ${list.length}`,
          `阶段: ${sections.length} 段`,
          `当前: 第 ${current + 1} 段`,
          section ? `「${section.title.slice(0, 18)}」` : '',
          `渲染区间: ${range.begin} - ${range.end}`,
        ]
          .filter(Boolean)
          .join(' | ')}
      </div>
      <div className="demo-outline-layout">
        <div className="demo-list-container demo-trace">
          <VirtList<TraceLine>
            ref={vlRef}
            list={list}
            itemKey="id"
            estimatedSize={24}
            hasMoreTop={false}
            hasMoreBottom={false}
            copyText={copyText}
            onUpdate={(_, state) => {
              setRange({ begin: state.renderBegin, end: state.renderEnd });
              setCurrent(activeSection(sections, state.inViewBegin));
            }}
          >
            {({ itemData }) => (
              <div className={`demo-trace-line kind-${itemData.kind}`}>
                <div className="demo-trace-head">
                  <span className="demo-trace-seq">{String(itemData.seq).padStart(5, ' ')}</span>
                  <span className="demo-trace-badge">{KIND_LABEL[itemData.kind]}</span>
                  <span className="demo-trace-text">{itemData.text}</span>
                </div>
              </div>
            )}
          </VirtList>
        </div>
        {/*
          每段一个色块，flexGrow 取段内行数——高度天然等于这一段在整个日志里的占比，
          不需要自己算像素
        */}
        <div className="demo-outline">
          {sections.map((s, i) => (
            <button
              key={s.index}
              type="button"
              className={`demo-outline-block kind-${s.kind}${i === current ? ' is-active' : ''}`}
              style={{ flexGrow: s.count }}
              title={sectionTitle(s)}
              onClick={() => jumpTo(s.index)}
            />
          ))}
        </div>
      </div>
      <div className="demo-chat-toolbar">
        <span className="demo-hint">
          右侧每个色块是一个执行阶段，高度按行数分配、颜色按段内最严重的事件。
          点色块跳到该段，悬停看标题。
        </span>
      </div>
    </div>
  );
}
