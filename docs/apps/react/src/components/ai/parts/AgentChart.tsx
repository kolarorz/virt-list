import { memo } from 'react';
import type { AgentChartBlock } from '../../../../../_shared/agentBlocks';

/**
 * 横向条形图，用 HTML 而不是 SVG。
 *
 * 理由是这里的约束和一般图表不同：它长在虚拟列表的项里。HTML 版本每条只要三个
 * 节点、宽度用百分比表达（容器一变自动跟随，不需要重算坐标），颜色走 --demo-*
 * 令牌因此亮暗双主题都对。SVG 在这三点上都要多付代价，而这个图形简单到用不上
 * SVG 的表达力。
 */
export default memo(function AgentChart({ chart }: { chart: AgentChartBlock }) {
  // 还在算：只占一行，铺开时高度会突然涨一百多像素
  if (chart.loading) {
    return (
      <div className="demo-agent-chart is-loading">
        <div className="demo-agent-skeleton">
          <span>{chart.title}</span>
          <span className="demo-agent-skeleton-bar" />
        </div>
      </div>
    );
  }

  /** 条长按最大值归一化，不从 0 起画刻度——几条之间的相对关系才是要看的 */
  const max = Math.max(...chart.items.map((i) => i.value), 0.001);

  return (
    <div className="demo-agent-chart">
      {/* 单系列不需要图例：标题就说明了这些条形是什么 */}
      <div className="demo-agent-chart-title">
        {chart.title}
        <span className="demo-agent-chart-unit">（{chart.unit}）</span>
      </div>
      <div className="demo-agent-chart-rows">
        {chart.items.map((item) => (
          <div
            key={item.label}
            className="demo-agent-chart-row"
            title={`${item.label}：${item.value} ${chart.unit}`}
          >
            <span className="demo-agent-chart-label">{item.label}</span>
            <span className="demo-agent-chart-track">
              <span
                className="demo-agent-chart-bar"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
              />
            </span>
            {/* 数值直接标出来，用文字色而不是条形的颜色 */}
            <span className="demo-agent-chart-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
