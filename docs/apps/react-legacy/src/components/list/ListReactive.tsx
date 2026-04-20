import { useState, useRef, useCallback, useEffect } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react-legacy';
import '../../demo.css';

interface Row {
  id: number;
  index: number;
  value: number;
  updatedAt: string;
}

function nowText() {
  return new Date().toLocaleTimeString();
}

function createRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    index,
    value: Math.floor(Math.random() * 1000),
    updatedAt: nowText(),
  }));
}

export default function Reactive() {
  const [list, setList] = useState<Row[]>(() => createRows(1000));
  const [tick, setTick] = useState(0);
  const [interval, setInterval_] = useState(1000);
  const [rowCount, setRowCount] = useState(1000);
  const [running, setRunning] = useState(false);
  const virtListRef = useRef<VirtListRef<Row>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doTick = useCallback(() => {
    const time = nowText();
    list.forEach((row) => {
      row.value = Math.floor(Math.random() * 1000);
      row.updatedAt = time;
    });
    setTick((t) => t + 1);
    virtListRef.current?.forceUpdate();
  }, [list]);

  const start = useCallback(() => {
    if (timerRef.current) return;
    doTick();
    timerRef.current = setInterval(doTick, interval);
    setRunning(true);
  }, [doTick, interval]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  }, []);

  const onIntervalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10) || 2000;
      setInterval_(val);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(doTick, val);
      }
    },
    [doTick],
  );

  const onCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10) || 1000;
      setRowCount(val);
      stop();
      setList(createRows(val));
      setTick(0);
    },
    [stop],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  return (
    <div className="demo-panel">
      <div className="demo-toolbar">
        {running ? (
          <button type="button" className="virt-list-btn virt-list-btn-secondary" onClick={stop}>
            停止刷新
          </button>
        ) : (
          <button type="button" className="virt-list-btn virt-list-btn-success" onClick={start}>
            开始刷新
          </button>
        )}
        <label>间隔(ms)：</label>
        <input
          type="number"
          value={interval}
          min={200}
          step={200}
          onChange={onIntervalChange}
          style={{ width: 80 }}
        />
        <label>数量：</label>
        <input
          type="number"
          value={rowCount}
          min={100}
          step={100}
          onChange={onCountChange}
          style={{ width: 80 }}
        />
      </div>
      <div className="demo-stats">
        {`总数: ${list.length} | 更新轮次: ${tick} | 间隔: ${interval}ms | 状态: ${running ? '刷新中' : '已停止'}`}
      </div>
      <div className="demo-list-container">
        <VirtList<Row>
          ref={virtListRef}
          list={list}
          itemKey="id"
          itemPreSize={44}
        >
          {({ itemData }) => (
            <div className="demo-row-item">
              <span className="demo-row-index">#{itemData.index}</span>
              <span className="demo-row-text">
                值: <b>{itemData.value}</b>  更新于: {itemData.updatedAt}
              </span>
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
