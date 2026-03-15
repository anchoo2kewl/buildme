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
const H = 180;
const PAD = { top: 24, right: 16, bottom: 30, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function formatAxisValue(v: number, _unit: string): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Generate a unique ID-safe string from the color
function colorId(color: string): string {
  return color.replace(/[^a-zA-Z0-9]/g, "");
}

export const MetricChart = component$<MetricChartProps>(
  ({ data, label, color, unit, incidents }) => {
    const hoverIdx = useSignal<number | null>(null);

    if (!data || data.length === 0) {
      return (
        <div class="flex h-[180px] items-center justify-center rounded-xl border border-border bg-elevated text-xs text-muted">
          <svg class="mr-2 h-4 w-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13h2l3-8 4 16 3-8h6" />
          </svg>
          No {label} data
        </div>
      );
    }

    const cid = colorId(color);

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

    // X-axis ticks (proportional)
    const xTicks: { label: string; x: number }[] = [];
    const hourMs = 3600000;
    const tickStep = Math.max(hourMs * 4, tRange / 6);
    for (let t = tMin; t <= tMax; t += tickStep) {
      const d = new Date(t);
      const lbl = tRange > 3 * 24 * hourMs
        ? `${d.toLocaleDateString([], { month: "short", day: "numeric" })}`
        : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      xTicks.push({
        label: lbl,
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
      const svgX = (mouseX / rect.width) * W;
      const plotX = svgX - PAD.left;
      if (plotX < 0 || plotX > PLOT_W) {
        hoverIdx.value = null;
        return;
      }
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
        <div class="mb-1.5 flex items-center justify-between">
          <span class="flex items-center gap-2 text-xs font-semibold text-text">
            <span
              class="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
          {hovered && (
            <span class="rounded-md bg-elevated px-2 py-0.5 font-mono text-[11px] text-muted">
              {formatAxisValue(hovered.value, unit)} {unit}
              <span class="mx-1 opacity-40">|</span>
              {formatDate(hovered.time)} {formatTime(hovered.time)}
            </span>
          )}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          class="w-full rounded-xl border border-border"
          style={{ background: "linear-gradient(180deg, #141621, #0f1119)" }}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove$={onMouseMove}
          onMouseLeave$={onMouseLeave}
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id={`area-${cid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color={color} stop-opacity="0.3" />
              <stop offset="60%" stop-color={color} stop-opacity="0.08" />
              <stop offset="100%" stop-color={color} stop-opacity="0" />
            </linearGradient>
            {/* Line glow filter */}
            <filter id={`glow-${cid}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line
              key={tick.val}
              x1={PAD.left}
              y1={tick.y}
              x2={PAD.left + PLOT_W}
              y2={tick.y}
              stroke="rgba(255,255,255,0.05)"
              stroke-width="0.5"
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map((tick) => (
            <text
              key={tick.val}
              x={PAD.left - 8}
              y={tick.y + 3.5}
              text-anchor="end"
              fill="#7c8ca8"
              font-size="10"
              font-family="ui-monospace, monospace"
            >
              {formatAxisValue(tick.val, unit)}
            </text>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick) => (
            <text
              key={tick.label}
              x={tick.x}
              y={H - 6}
              text-anchor="middle"
              fill="#7c8ca8"
              font-size="10"
              font-family="ui-monospace, monospace"
            >
              {tick.label}
            </text>
          ))}

          {/* Area fill with gradient */}
          <path d={areaPath} fill={`url(#area-${cid})`} />

          {/* Main line with glow */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            filter={`url(#glow-${cid})`}
          />

          {/* Incident markers */}
          {incidentDots.map((dot, i) => (
            <g key={i}>
              <circle
                cx={dot.x}
                cy={dot.y}
                r="7"
                fill="rgba(248,113,113,0.15)"
              />
              <circle
                cx={dot.x}
                cy={dot.y}
                r="4.5"
                fill="#f87171"
                stroke="#141621"
                stroke-width="1.5"
              />
            </g>
          ))}

          {/* Hover crosshair + dot */}
          {hovered && hoverIdx.value !== null && (
            <>
              <line
                x1={scaleX(hovered.time)}
                y1={PAD.top}
                x2={scaleX(hovered.time)}
                y2={PAD.top + PLOT_H}
                stroke="rgba(255,255,255,0.12)"
                stroke-width="1"
                stroke-dasharray="4,3"
              />
              {/* Outer glow ring */}
              <circle
                cx={scaleX(hovered.time)}
                cy={scaleY(hovered.value)}
                r="8"
                fill={color}
                opacity="0.15"
              />
              {/* Inner dot */}
              <circle
                cx={scaleX(hovered.time)}
                cy={scaleY(hovered.value)}
                r="4.5"
                fill={color}
                stroke="#141621"
                stroke-width="2"
              />
            </>
          )}
        </svg>
      </div>
    );
  },
);
