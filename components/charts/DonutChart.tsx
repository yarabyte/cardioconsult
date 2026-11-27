"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/format";

const COLORS = ["#0B4FB3", "#E0313B", "#0F7A4D", "#B45309", "#52627F", "#7C8AA6"];

export function DonutChart({
  data,
  ariaLabel,
  height = 200,
}: {
  data: { label: string; value: number }[];
  ariaLabel: string;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height={height} className="max-w-[220px]">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatNumber(Number(v ?? 0))} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
              aria-hidden
            />
            <span className="font-medium">{d.label}</span>
            <span className="text-muted-foreground ml-auto tabular-nums">
              {total ? Math.round((d.value / total) * 100) : 0} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
