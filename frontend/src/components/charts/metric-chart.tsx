import { component$, useSignal, $ } from "@builder.io/qwik";

interface DataPoint {
  time: string;
  value: number;
}

interface IncidentMarker {
  time: string;
}

interface MetricChartProps {
  data: DataPoint[];
  label: string;
  color: string;
  unit: string;
  incidents?: IncidentMarker[];
}

const W = 600;
const H = 160;
const PAD = { top: 20, right: 16, bottom: 28, left: 48 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function formatAxisValue(v: number, unit: string): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const MetricChart = component$<MetricChartProps>(
  ({ data, label, color, unit, incidents }) => {
    const hoverIdx = useSignal<number | null>(null);

    if (!data || data.length === 0) {
      return (
        <div class="flex h-[160px] items-center justify-center rounded-lg border border-border bg-surface text-xs text-muted">
          No {label} data
        </div>
      );
    }

    // Compute scales
    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const yRange = maxVal - minVal || 1;
    const yMin = Math.max(0, minVal - yRange * 0.1);
    const yMax = maxVal + yRange * 0.1;

    const tMin = new Date(data[0].time).getTime();
    const tMax = new Date(data[data.length - 1].time).getTime();
    const tRange = tMax - tMin || 1;

    const scaleX = (t: string) =>
      PAD.left + ((new Date(t).getTime() - tMin) / tRange) * PLOT_W;
    const scaleY = (v: number) =>
      PAD.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H;

    // Build SVG path
    const pathParts = data.map(
      (d, i) =>
        `${i === 0 ? "M" : "L"}${scaleX(d.time).toFixed(1)},${scaleY(d.value).toFixed(1)}`,
    );
    const linePath = pathParts.join(" ");

    // Fill area (close path at bottom)
    const areaPath =
      linePath +
      ` L${scaleX(data[data.length - 1].time).toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)}` +
      ` L${scaleX(data[0].time).toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)} Z`;

    // Y-axis ticks (4 ticks)
    const yTicks = Array.from({ length: 4 }, (_, i) => {
      const val = yMin + ((yMax - yMin) * i) / 3;
      return { val, y: scaleY(val) };
    });

    // X-axis ticks (4h intervals or proportional)
    const xTicks: { label: string; x: number }[] = [];
    const hourMs = 3600000;
    const tickStep = Math.max(hourMs * 4, tRange / 5);
    for (let t = tMin; t <= tMax; t += tickStep) {
      const d = new Date(t);
      xTicks.push({
        label: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        x: PAD.left + ((t - tMin) / tRange) * PLOT_W,
      });
    }

    // Incident markers mapped to X positions
    const incidentDots = (incidents || [])
      .map((inc) => {
        const x = scaleX(inc.time);
        if (x >= PAD.left && x <= PAD.left + PLOT_W) {
          return { x, y: PAD.top + 6 };
        }
        return null;
      })
      .filter(Boolean) as { x: number; y: number }[];

    // Hover point
    const hovered = hoverIdx.value !== null ? data[hoverIdx.value] : null;

    const onMouseMove = $((e: MouseEvent) => {
      const svg = (e.target as Element).closest("svg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const plotX = mouseX - PAD.left;
      if (plotX < 0 || plotX > PLOT_W) {
        hoverIdx.value = null;
        return;
      }
      // Find nearest data point
      const targetT = tMin + (plotX / PLOT_W) * tRange;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < data.length; i++) {
        const dist = Math.abs(new Date(data[i].time).getTime() - targetT);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      hoverIdx.value = best;
    });

    const onMouseLeave = $(() => {
      hoverIdx.value = null;
    });

    return (
      <div class="relative">
        <div class="mb-1 flex items-center justify-between text-[11px]">
          <span class="font-medium text-text">{label}</span>
          {hovered && (
            <span class="font-mono text-muted">
              {formatAxisValue(hovered.value, unit)} {unit} &middot;{" "}
              {formatTime(hovered.time)}
            </span>
          )}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          class="w-full rounded-lg border border-border bg-surface"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove$={onMouseMove}
          onMouseLeave$={onMouseLeave}
        >
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line
              key={tick.val}
              x1={PAD.left}
              y1={tick.y}
              x2={PAD.left + PLOT_W}
              y2={tick.y}
              stroke="var(--sa-border)"
              stroke-width="0.5"
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map((tick) => (
            <text
              key={tick.val}
              x={PAD.left - 6}
              y={tick.y + 3}
              text-anchor="end"
              fill="var(--sa-muted)"
              font-size="9"
              font-family="monospace"
            >
              {formatAxisValue(tick.val, unit)}
            </text>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick) => (
            <text
              key={tick.label}
              x={tick.x}
              y={H - 4}
              text-anchor="middle"
              fill="var(--sa-muted)"
              font-size="9"
              font-family="monospace"
            >
              {tick.label}
            </text>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill={color} opacity="0.1" />

          {/* Line */}
          <path d={linePath} fill="none" stroke={color} stroke-width="1.5" />

          {/* Incident markers */}
          {incidentDots.map((dot, i) => (
            <circle
              key={i}
              cx={dot.x}
              cy={dot.y}
              r="4"
              fill="#ef4444"
              stroke="var(--sa-surface)"
              stroke-width="1.5"
            />
          ))}

          {/* Hover crosshair + dot */}
          {hovered && hoverIdx.value !== null && (
            <>
              <line
                x1={scaleX(hovered.time)}
                y1={PAD.top}
                x2={scaleX(hovered.time)}
                y2={PAD.top + PLOT_H}
                stroke="var(--sa-muted)"
                stroke-width="0.5"
                stroke-dasharray="3,3"
              />
              <circle
                cx={scaleX(hovered.time)}
                cy={scaleY(hovered.value)}
                r="3.5"
                fill={color}
                stroke="var(--sa-surface)"
                stroke-width="2"
              />
            </>
          )}
        </svg>
      </div>
    );
  },
);
