import { useState, useMemo } from 'react';
import { VirtTree } from '@virt-list/react-legacy';
import TreeEmpty from './items/TreeEmpty';
import '../../demo.css';

function generateTreeData() {
  const data = Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    title: `Node-${i}`,
    children: Array.from({ length: 3 }, (_, j) => ({
      id: `${i}-${j}`,
      title: `Node-${i}-${j}`,
      children: Array.from({ length: 2 }, (_, k) => ({
        id: `${i}-${j}-${k}`,
        title: `Node-${i}-${j}-${k}`,
      })),
    })),
  }));
  const c0 = data[0]?.children?.[0];
  if (c0) {
    c0.title = 'abvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagacabvfgzgagagac';
  }
  return data;
}

export default function TreeShowLine() {
  const [showLine, setShowLine] = useState(true);
  const [toggled, setToggled] = useState(false);
  const treeData = useMemo(() => generateTreeData(), []);
  const label = !toggled ? '切换连接线' : showLine ? '隐藏连接线' : '显示连接线';

  return (
    <div className="tree-demo">
      <div className="tree-btn-container">
        <button
          type="button"
          className="virt-list-btn virt-list-btn-primary"
          onClick={() => {
            setToggled(true);
            setShowLine((s) => !s);
          }}
        >
          {label}
        </button>
      </div>
      <div className="virt-tree-wrapper" style={{ width: '100%', height: 400 }} key={String(showLine)}>
        <VirtTree
          list={treeData}
          fieldNames={{ key: 'id' }}
          indent={28}
          iconSize={14}
          showLine={showLine}
          defaultExpandAll
          itemGap={4}
          fixed
          empty={() => <TreeEmpty />}
        />
      </div>
    </div>
  );
}
