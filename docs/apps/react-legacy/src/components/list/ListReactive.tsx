import { useState, useRef, useCallback, useEffect } from 'react';
import { VirtList, type VirtListRef } from '@virt-list/react-legacy';

interface Row {
  id: number;
  index: number;
  value: number;
  tick: number;
  updatedAt: string;
}

type Mode = 'replace' | 'mutate';

function nowText() {
  return new Date().toLocaleTimeString();
}

function randValue() {
  return Math.floor(Math.random() * 1000);
}

function createRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    index,
    value: randValue(),
    tick: 0,
    updatedAt: nowText(),
  }));
}

export default function Reactive() {
  const [list, setList] = useState<Row[]>(() => createRows(1000));
  const [dataTick, setDataTick] = useState(0);
  const [interval, setInterval_] = useState(1000);
  const [rowCount, setRowCount] = useState(1000);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<Mode>('replace');
  const virtListRef = useRef<VirtListRef<Row>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 定时回调里要读最新的模式，用 ref 避免每次改模式都重建定时器
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const doTick = useCallback(() => {
    const time = nowText();
    setDataTick((t) => {
      const next = t + 1;
      if (modeRef.current === 'replace') {
        // 推荐写法：换一个新数组。组件发现 list 引用变了，会把最新数据交给
        // 可视区内的每一项，children 随之重渲染 —— 不需要任何手动调用
        setList((rows) =>
          rows.map((row) => ({
            ...row,
            value: randValue(),
            tick: next,
            updatedAt: time,
          })),
        );
      } else {
        // 原地改字段：数组引用没变、长度也没变，组件的 list 比较不会命中。
        //
        // 但界面**仍然会更新** —— React 包在宿主每次渲染后会把所有挂载点用最新的
        // children 闭包重刷一遍（闭包里就是这几个被改过的对象）。这里 dataTick 的
        // setState 恰好引起了一次宿主渲染，于是兜住了。
        //
        // 真正会停住的是「连宿主都不重渲染」：数据由外部 store / WebSocket 直写、
        // 一次 setState 都没有。那时才需要下面的 refreshItems()
        setList((rows) => {
          rows.forEach((row) => {
            row.value = randValue();
            row.tick = next;
            row.updatedAt = time;
          });
          return rows;
        });
      }
      return next;
    });
  }, []);

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

  /**
   * 手动重建可视区内的项。
   *
   * 只有上面那种「谁都察觉不到」的原地修改才需要它。传 keys 可以精确到某几项
   * （`refreshItems([3, 7])`），不传则重建全部可见项。
   */
  const manualRefresh = useCallback(() => {
    virtListRef.current?.refreshItems();
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
      setDataTick(0);
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
        <label>更新方式：</label>
        <button
          type="button"
          className={`virt-list-btn ${mode === 'replace' ? 'virt-list-btn-primary' : 'virt-list-btn-secondary'}`}
          onClick={() => setMode('replace')}
        >
          换新数组
        </button>
        <button
          type="button"
          className={`virt-list-btn ${mode === 'mutate' ? 'virt-list-btn-primary' : 'virt-list-btn-secondary'}`}
          onClick={() => setMode('mutate')}
        >
          原地修改
        </button>
        {mode === 'mutate' && (
          <button type="button" className="virt-list-btn virt-list-btn-warning" onClick={manualRefresh}>
            refreshItems()
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
        {`总数: ${list.length} | 数据已改: ${dataTick} 轮 | 间隔: ${interval}ms | 状态: ${running ? '刷新中' : '已停止'}`}
      </div>
      <div className="demo-stats">
        {mode === 'replace'
          ? '换新数组：组件识别到 list 换了，把最新数据交给可视区内的每一项，行上的轮次跟着涨'
          : '原地改字段：靠「宿主每次渲染后重刷挂载点」兜住，所以也能跟上。数据若由外部直写、宿主一次都不重渲染，才需要 refreshItems()'}
      </div>
      <div className="demo-list-container">
        <VirtList<Row>
          ref={virtListRef}
          list={list}
          itemKey="id"
          estimatedSize={44}
        >
          {({ itemData }) => (
            <div className="demo-row-item">
              <span className="demo-row-index">#{itemData.index}</span>
              <span className="demo-row-text">
                值: <b>{itemData.value}</b>&ensp;轮次: <b>{itemData.tick}</b>&ensp;更新于: {itemData.updatedAt}
              </span>
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
