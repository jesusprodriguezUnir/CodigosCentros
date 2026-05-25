"use client";

import { useMemo } from "react";

type Props = {
  valores: number[];
  width?: number;
  height?: number;
};

export function Sparkline({ valores, width = 72, height = 26 }: Props) {
  const { points, color, label } = useMemo(() => {
    const nums = valores.map((v) => (isNaN(v) ? 0 : v));
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    const padding = 2;

    const stepX = nums.length > 1 ? (width - padding * 2) / (nums.length - 1) : 0;
    const pts = nums.map((v, i) => {
      const x = nums.length > 1 ? padding + i * stepX : width / 2;
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    const last = nums.length >= 2 ? nums[nums.length - 1] - nums[nums.length - 2] : 0;
    let lineColor: string;
    if (last > 2) {
      lineColor = "#c8102e";
    } else if (last > 0) {
      lineColor = "#c8102e";
    } else {
      lineColor = "#8593aa";
    }

    const lastX = nums.length > 1 ? padding + (nums.length - 1) * stepX : width / 2;
    const lastY = height - padding - ((nums[nums.length - 1] - min) / range) * (height - padding * 2);

    return {
      points: pts.join(" "),
      color: lineColor,
      label: `Tendencia: ${nums.join(", ")} vacantes`,
      lastX,
      lastY,
    };
  }, [valores, width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="tabular-nums"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {valores.length > 0 && (
        <circle cx={points.split(" ").pop()?.split(",")[0]} cy={points.split(" ").pop()?.split(",")[1]} r="2.5" fill={color} />
      )}
    </svg>
  );
}
