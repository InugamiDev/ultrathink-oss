# Recharts

- **Layer**: domain
- **Category**: data-viz
- **Risk Level**: low
- **Triggers**: recharts, chart, graph, data visualization, line chart, bar chart, pie chart

## Overview

Composable charting library built on React components and D3. Declarative API where each chart element (axes, tooltips, legends) is a standalone component composed inside a chart wrapper.

## When to Use

- Building interactive data visualizations in React
- Dashboards with multiple chart types
- When you need responsive, animated charts with minimal config
- Prefer over raw D3 when working in a React component tree

## Key Patterns

### Chart Types

Use the appropriate wrapper: `LineChart`, `BarChart`, `AreaChart`, `PieChart`, `RadarChart`, `ScatterChart`. Each accepts `data`, `width`, `height` and composes child components.

### Responsive Container

Always wrap charts in `<ResponsiveContainer width="100%" height={300}>` to handle resizing. Never set fixed `width`/`height` on the chart itself when using this.

### Axes and Grid

`<XAxis dataKey="name" />`, `<YAxis />`, `<CartesianGrid strokeDasharray="3 3" />`. Use `tickFormatter` for number/date formatting. Hide with `hide` prop, not CSS.

### Tooltips and Legends

`<Tooltip />` and `<Legend />` are drop-in. Custom tooltip: pass `content={<CustomTooltip />}` receiving `active`, `payload`, `label` props. Custom legend: use `content` prop.

### Custom Components

Custom tick: `<XAxis tick={<CustomTick />} />`. Custom shapes: `<Bar shape={<CustomBar />} />`. Custom dot: `<Line dot={<CustomDot />} />`. All receive element props via spread.

### Animation Control

Disable for SSR/tests: `isAnimationActive={false}`. Tune with `animationDuration={500}` and `animationEasing="ease-in-out"`. Disable globally during snapshots.

### Data Formatting

`tickFormatter={(val) => `$${val}`}` on axes. `labelFormatter` on Tooltip for x-axis label. `formatter` on Tooltip for series values.

### Brush for Zooming

`<Brush dataKey="name" height={30} stroke="#8884d8" />` enables range selection. Combine with `startIndex`/`endIndex` for controlled zoom.

### Composed Charts

`<ComposedChart>` mixes `<Line>`, `<Bar>`, `<Area>` in one view. Each series maps to its own `dataKey`. Share axes automatically.

### Reference Lines and Areas

`<ReferenceLine y={avg} stroke="red" label="Avg" />` for thresholds. `<ReferenceArea x1="Mar" x2="Jun" fill="#eee" />` for highlighting ranges.

## Anti-Patterns

- Setting fixed width/height without `ResponsiveContainer` — breaks on resize
- Mutating data arrays in place — Recharts relies on reference equality for updates
- Nesting `ResponsiveContainer` inside a zero-height parent — container collapses
- Using `PureComponent` wrappers that block Recharts internal updates
- Over-animating large datasets (1000+ points) — disable animation for performance
- Importing the entire library (`import Recharts from 'recharts'`) — use named imports

## Related Skills

`react` · `typescript-frontend` · `design-systems`
