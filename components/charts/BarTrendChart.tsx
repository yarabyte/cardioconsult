"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/format";

export function BarTrendChart({
  data,
  xKey,
  yKey,
  ariaLabel,
  height = 220,
  highlightKey,
}: {
  data: Record<string, string | number | boolean | null>[];
  xKey: string;
  yKey: string;
  ariaLabel: string;
  height?: number;
  highlightKey?: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E3E9F4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: "#52627F", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#52627F", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip formatter={(v) => formatNumber(Number(v ?? 0))} />
          <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={highlightKey && entry[highlightKey] ? "#E0313B" : "#0B4FB3"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
