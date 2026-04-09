import { useState, useMemo } from 'react';
import { VirtList } from '@virt-list/react';
import '../../demo.css';

interface HugeItem {
  id: number;
  index: number;
  text: string;
}

export default function HugeData() {
  const [stats, setStats] = useState('');
  const [loadStatus, setLoadStatus] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const list = useMemo(() => {
    if (!loaded) return [];
    const hugeTexts = [
      '海量数据测试行。',
      '虚拟列表在处理大量数据时依然保持流畅的滚动体验，DOM 节点数量始终维持在较低水平。',
      '这一行的内容比较短。',
      '通过增量式的 DOM 更新策略，虚拟列表避免了一次性创建大量节点所带来的性能瓶颈。即使数据量达到数十万条，首屏渲染速度和滚动帧率都不会受到明显影响。这是传统列表渲染方式无法做到的。',
      '数据量越大，虚拟列表相对于全量渲染的性能优势越明显。',
    ];
    const out: HugeItem[] = [];
    for (let i = 0; i < 300000; i++) {
      const n = (i % 4) + 1;
      const parts: string[] = [];
      for (let s = 0; s < n; s++) parts.push(hugeTexts[(i + s * 2) % hugeTexts.length]);
      out.push({ id: i, index: i, text: parts.join(' ') });
    }
    return out;
  }, [loaded]);

  const onLoad = () => {
    setLoading(true);
    setLoadStatus('正在生成数据...');
    setTimeout(() => {
      setLoaded(true);
      setLoading(false);
      setLoadStatus('已生成 300,000 条数据');
    }, 50);
  };

  return (
    <div className="demo-panel">
      <div className="demo-toolbar">
        <button
          type="button"
          className="virt-list-btn virt-list-btn-secondary"
          disabled={loading || loaded}
          onClick={onLoad}
        >
          生成 30w 数据
        </button>
        <span style={{ fontSize: 12, color: '#666' }}>{loadStatus}</span>
      </div>
      <div className="demo-stats">
        {stats || (loaded ? `总数: ${list.length.toLocaleString()}` : '')}
      </div>
      <div className="demo-list-container">
        {!loaded ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
            }}
          >
            {loading ? '数据生成中...' : '点击按钮生成海量数据'}
          </div>
        ) : (
          <VirtList<HugeItem>
            list={list}
            itemKey="id"
            itemPreSize={40}
            buffer={5}
            onRangeUpdate={(begin, end) =>
              setStats(`总数: ${list.length.toLocaleString()} | RenderBegin: ${begin} | RenderEnd: ${end}`)
            }
            renderItem={(item) => (
              <div className="demo-row-item">
                <span className="demo-row-index">#{item.index}</span>
                <span className="demo-row-text">{item.text}</span>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
