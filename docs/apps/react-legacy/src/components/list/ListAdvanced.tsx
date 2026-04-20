import { useState, useMemo, type CSSProperties } from 'react';
import { VirtList } from '@virt-list/react-legacy';
import '../../demo.css';

const COLUMNS = [
  { key: 'id', title: 'ID', width: 60 },
  { key: 'name', title: '姓名', width: 100 },
  { key: 'age', title: '年龄', width: 60 },
  { key: 'address', title: '地址', width: 200 },
  { key: 'desc1', title: '描述1', width: 300 },
  { key: 'desc2', title: '描述2', width: 300 },
  { key: 'desc3', title: '描述3', width: 300 },
] as const;

type Row = {
  id: number;
  name: string;
  age: number;
  address: string;
  desc1: string;
  desc2: string;
  desc3: string;
  rowSpan: number;
};

function generateList(count: number): Row[] {
  const addresses = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `用户_${i}`,
    age: 20 + (i % 40),
    address: addresses[i % addresses.length],
    desc1: `描述信息 ${i}-A`,
    desc2: `描述信息 ${i}-B`,
    desc3: `描述信息 ${i}-C`,
    rowSpan: i < 2 ? 2 : 1,
  }));
}

function TableCell({
  text,
  width,
  extra,
}: {
  text: string;
  width: number;
  extra?: CSSProperties;
}) {
  return (
    <div
      className="demo-adv-cell"
      style={{ width, minWidth: width, ...extra }}
    >
      {text}
    </div>
  );
}

export default function Advanced() {
  const list = useMemo(() => generateList(100), []);
  const [stats, setStats] = useState(`总数: ${list.length} | 高阶表格`);

  return (
    <div className="demo-panel">
      <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        高阶用法：展示类似表格的渲染，包含 sticky 列头和多列数据。前两行进行了合并展示。
      </p>
      <div className="demo-stats">{stats}</div>
      <div className="demo-list-container">
        <VirtList<Row>
          list={list}
          itemKey="id"
          itemPreSize={40}
          stickyHeaderStyle={{ background: '#f5f5f5' }}
          renderStickyHeader={() => (
            <div className="demo-table-row demo-table-header" style={{ minWidth: 'min-content' }}>
              {COLUMNS.map((col) => (
                <TableCell
                  key={col.key}
                  text={col.title}
                  width={col.width}
                  extra={{ fontWeight: 'bold', background: '#e8e8e8' }}
                />
              ))}
            </div>
          )}
          onUpdate={(_, state) =>
            setStats(`总数: ${list.length} | 可视区域: ${state.inViewBegin} - ${state.inViewEnd} | 渲染区间: ${state.renderBegin} - ${state.renderEnd}`)
          }
        >
          {({ itemData, index }) => (
            <div className="demo-table-row" style={{ minWidth: 'min-content' }}>
              {index === 0 ? (
                <>
                  <TableCell
                    text={`合并行 (ID: ${itemData.id} & ${itemData.id + 1})`}
                    width={COLUMNS[0].width + COLUMNS[1].width}
                    extra={{
                      minWidth: COLUMNS[0].width + COLUMNS[1].width,
                      background: '#fffbe6',
                      fontWeight: 'bold',
                    }}
                  />
                  {COLUMNS.slice(2).map((col) => (
                    <TableCell key={col.key} text={String(itemData[col.key])} width={col.width} />
                  ))}
                </>
              ) : index === 1 ? (
                <>
                  <TableCell
                    text={`(续) ID: ${itemData.id}`}
                    width={COLUMNS[0].width + COLUMNS[1].width}
                    extra={{
                      minWidth: COLUMNS[0].width + COLUMNS[1].width,
                      background: '#fffbe6',
                    }}
                  />
                  {COLUMNS.slice(2).map((col) => (
                    <TableCell key={col.key} text={String(itemData[col.key])} width={col.width} />
                  ))}
                </>
              ) : (
                COLUMNS.map((col) => (
                  <TableCell key={col.key} text={String(itemData[col.key])} width={col.width} />
                ))
              )}
            </div>
          )}
        </VirtList>
      </div>
    </div>
  );
}
