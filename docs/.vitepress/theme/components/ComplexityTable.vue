<script setup lang="ts">
/**
 * 各操作的时间复杂度对照。
 *
 * 包含 O(n) 那一行——把省不掉的地方也写出来，这张表才有参考价值。
 */
interface Row {
  op: string;
  fixed: string;
  dynamic: string;
  why: string;
}

const ROWS: Row[] = [
  {
    op: '稳态滚动定位',
    fixed: 'O(1)',
    dynamic: 'O(1)',
    why: '从上一帧的位置增量推进，每帧只跨越几项',
  },
  {
    op: '跳转到任意项',
    fixed: 'O(1)',
    dynamic: 'O(√n)',
    why: '固定高一次除法；不定高走分块索引，跨块查表 + 块内累加',
  },
  {
    op: '单项尺寸变化后修正',
    fixed: '—',
    dynamic: 'O(1)',
    why: '顶部占位法：只改一个占位元素的高度，其后由浏览器重排',
  },
  {
    op: '渲染窗口 DOM 节点数',
    fixed: 'O(视口)',
    dynamic: 'O(视口)',
    why: '只创建可视区与缓冲区内的节点，与数据量无关',
  },
  {
    op: '整体替换数据源',
    fixed: 'O(1)',
    dynamic: 'O(n)',
    why: '总尺寸依赖每一项的高度，这一趟扫描省不掉',
  },
];
</script>

<template>
  <section class="cx">
    <h2 class="cx-title">复杂度一览</h2>
    <p class="cx-lead">
      虚拟列表的性能上限由算法决定，而不是由某次跑分决定。下面是各操作的时间复杂度，
      <strong>包括省不掉的那一项</strong>——n 为数据总量。
    </p>

    <div class="cx-wrap">
      <table class="cx-table">
        <thead>
          <tr>
            <th>操作</th>
            <th class="cx-c">固定高</th>
            <th class="cx-c">不定高</th>
            <th>为什么</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in ROWS" :key="r.op">
            <td class="cx-op">{{ r.op }}</td>
            <td class="cx-c">
              <code :class="['cx-badge', { 'is-linear': r.fixed === 'O(n)' }]">
                {{ r.fixed }}
              </code>
            </td>
            <td class="cx-c">
              <code :class="['cx-badge', { 'is-linear': r.dynamic === 'O(n)' }]">
                {{ r.dynamic }}
              </code>
            </td>
            <td class="cx-why">{{ r.why }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.cx {
  max-width: 1152px;
  margin: 56px auto 0;
  padding: 0 24px;
}

.cx-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.cx-lead {
  margin: 0 0 24px;
  max-width: 760px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

.cx-lead strong {
  color: var(--vp-c-text-1);
}

.cx-wrap {
  overflow-x: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.cx-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: 14px;
}

.cx-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  white-space: nowrap;
}

.cx-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.cx-table tbody tr:last-child td {
  border-bottom: 0;
}

.cx-c {
  text-align: center;
  white-space: nowrap;
}

.cx-op {
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

/* 同 PerfMetrics：等宽字体会让 O(1) 看起来像 0(1)，这里用正文字体 */
.cx-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* 线性项不涂成品牌色，避免把「省不掉的开销」也表现得像卖点 */
.cx-badge.is-linear {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
}

.cx-why {
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}
</style>
