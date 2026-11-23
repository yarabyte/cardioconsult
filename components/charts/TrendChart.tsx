"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDecimal, formatNumber } from "@/lib/format";

export type TrendSeries = {
  key: string;
  label: string;
  color: string;
  strokeDasharray?: string;
};

export type TrendThreshold = {
  y: number;
  label: string;
  color?: string;
};

export type TrendZone = {
  y1: number;
  y2: number;
  color: string;
};

export function TrendChart({
  data,
  xKey = "date",
  series,
  thresholds = [],
  zones = [],
  unit = "",
  ariaLabel,
  height = 220,
  showArea = false,
}: {
  data: Record<string, string | number | null>[];
  xKey?: string;
  series: TrendSeries[];
  thresholds?: TrendThreshold[];
  zones?: TrendZone[];
  unit?: string;
  ariaLabel: string;
  height?: number;
  showArea?: boolean;
}) {
  const last = data[data.length - 1];

  return (
    <div className="w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E3E9F4" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fill: "#52627F", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#52627F", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #DCE4F2",
              fontSize: 12,
            }}
            formatter={(value) => {
              if (value == null || typeof value === "boolean") return ["—", ""];
              const n = typeof value === "number" ? value : Number(value);
              const formatted = Number.isInteger(n) ? formatNumber(n) : formatDecimal(n, 2);
              return [`${formatted}${unit ? ` ${unit}` : ""}`, ""];
            }}
            labelFormatter={(label) => String(label)}
          />
          {zones.map((z, i) => (
            <ReferenceArea key={i} y1={z.y1} y2={z.y2} fill={z.color} fillOpacity={1} />
          ))}
          {thresholds.map((t) => (
            <ReferenceLine
              key={t.label}
              y={t.y}
              stroke={t.color ?? "#B45309"}
              strokeDasharray="4 4"
              label={{
                value: t.label,
                position: "insideTopRight",
                fill: t.color ?? "#B45309",
                fontSize: 11,
              }}
            />
          ))}
          {series.map((s) =>
            showArea ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.15}
                strokeWidth={2}
                strokeDasharray={s.strokeDasharray}
                connectNulls
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.strokeDasharray}
                connectNulls
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-muted-foreground mt-2 text-xs">
        {series.map((s) => {
          const v = last?.[s.key];
          return (
            <span key={s.key} className="mr-3">
              <span className="font-semibold" style={{ color: s.color }}>
                {s.label}
              </span>
              {v != null ? (
                <span className="tabular-nums">
                  {" "}
                  · dernière : {typeof v === "number" ? formatDecimal(v, Number.isInteger(v) ? 0 : 1) : String(v)}
                  {unit ? ` ${unit}` : ""}
                </span>
              ) : null}
            </span>
          );
        })}
      </p>
    </div>
  );
}
