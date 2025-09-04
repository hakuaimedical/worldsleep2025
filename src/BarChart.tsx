import React from "react";

export default function BarChart({ values }: { values: number[] }) {
  if (!values.length) return null;
  const w = 640, h = 160, pad = 24;
  const max = Math.max(...values, 1);
  const bw = (w - pad * 2) / values.length;

  return (
    <svg width={w} height={h} aria-label="Sleep durations bar chart">
      <rect x={0} y={0} width={w} height={h} fill="#ffffff" stroke="#ddd" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#888" />
      {values.map((v, i) => {
        const barH = (v / max) * (h - pad * 2);
        const x = pad + i * bw + 2;
        const y = h - pad - barH;
        return <rect key={i} x={x} y={y} width={bw - 4} height={barH} />;
      })}
      <text x={w - pad} y={pad - 6} textAnchor="end" fontSize="10">{`max ${max.toFixed(1)}h`}</text>
      <text x={pad} y={h - 4} fontSize="10">nights →</text>
    </svg>
  );
}
