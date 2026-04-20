import { useRef, useState, useMemo } from 'react';
import type { RefObject } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react';
import '../../demo.css';

interface Item {
  id: number;
  index: number;
  text: string;
}

const SENTENCES = [
  '使用 scrollToIndex 可以精确跳转到指定索引的位置。',
  '使用 scrollToOffset 可以跳转到指定的像素偏移量。',
  '这行内容较短。',
  'scrollIntoView 会将目标元素滚动到可视区域内，如果已经在可视区域则不会滚动。这个 API 在需要确保某个元素可见时非常有用。',
  '滚动到顶部和底部是最常见的操作。',
  '虚拟列表支持多种滚动定位方式，可以根据不同的业务场景选择最合适的 API。所有的滚动操作都是平滑的，不会出现跳动或闪烁。',
];

function generateList(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => {
    const n = (i % 4) + 1;
    const parts: string[] = [];
    for (let s = 0; s < n; s++) parts.push(SENTENCES[(i + s * 2) % SENTENCES.length]);
    return { id: i, index: i, text: parts.join(' ') };
  });
}

export default function Operations() {
  const list = useMemo(() => generateList(2000), []);
  const virtListRef = useRef<VirtListRef<Item>>(null);
  const offsetInputRef = useRef<HTMLInputElement>(null);
  const indexInputRef = useRef<HTMLInputElement>(null);
  const intoViewInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState(`总数: ${list.length}`);

  const getVal = (r: RefObject<HTMLInputElement | null>) => parseInt(r.current?.value ?? '0', 10);
  const setVal = (r: RefObject<HTMLInputElement | null>, val: number) => {
    if (r.current) r.current.value = String(val);
  };

  return (
    <div className="demo-panel">
      <div className="demo-toolbar">
        <div className="virt-list-control-group">
          <label>scrollToOffset</label>
          <input ref={offsetInputRef} type="number" defaultValue={1000} min={0} />
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
            onClick={() => virtListRef.current?.scrollToOffset(getVal(offsetInputRef))}
          >
            跳转
          </button>
        </div>
        <div className="virt-list-control-group">
          <label>scrollToIndex</label>
          <input ref={indexInputRef} type="number" defaultValue={500} min={0} />
          <button
            type="button"
            className="virt-list-btn virt-list-btn-primary"
            onClick={() => virtListRef.current?.scrollToIndex(getVal(indexInputRef))}
          >
            跳转
          </button>
        </div>
        <div className="virt-list-control-group">
          <label>scrollIntoView</label>
          <input ref={intoViewInputRef} type="number" defaultValue={100} min={0} />
          <button
            type="button"
            className="virt-list-btn virt-list-btn-success"
            onClick={() => virtListRef.current?.scrollIntoView(getVal(intoViewInputRef))}
          >
            跳转
          </button>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button
              type="button"
              className="virt-list-btn virt-list-btn-success"
              style={{ fontSize: 10, padding: '4px 8px' }}
              onClick={() => {
                const cur = getVal(intoViewInputRef);
                const next = Math.max(0, cur - 1);
                setVal(intoViewInputRef, next);
                virtListRef.current?.scrollIntoView(next);
              }}
            >
              Prev
            </button>
            <button
              type="button"
              className="virt-list-btn virt-list-btn-success"
              style={{ fontSize: 10, padding: '4px 8px' }}
              onClick={() => {
                const cur = getVal(intoViewInputRef);
                const next = Math.min(list.length - 1, cur + 1);
                setVal(intoViewInputRef, next);
                virtListRef.current?.scrollIntoView(next);
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <div className="demo-toolbar" style={{ marginTop: 4 }}>
        <button
          type="button"
          className="virt-list-btn virt-list-btn-primary"
          onClick={() => virtListRef.current?.scrollToTop()}
        >
          scrollToTop
        </button>
        <button
          type="button"
          className="virt-list-btn virt-list-btn-primary"
          onClick={() => virtListRef.current?.scrollToBottom()}
        >
          scrollToBottom
        </button>
      </div>
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Item>
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={40}
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
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
