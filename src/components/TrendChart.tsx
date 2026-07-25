import React, { useMemo } from "react";

export const CustomTrendChart: React.FC<{
  data: { label: string; value: number; value2?: number; date: string }[];
  title: string;
  unit: string;
  minVal: number;
  maxVal: number;
  color: string;
  color2?: string;
  label1: string;
  label2?: string;
  thresholds?: { value: number; label: string; color: string }[];
}> = ({ data, title, unit, minVal, maxVal, color, color2, label1, label2, thresholds }) => {
  const width = 500;
  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate coordinates
  const points = useMemo(() => {
    if (data.length === 0) return [];
    
    return data.map((d, i) => {
      const x = paddingLeft + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
      
      // Map value 1
      const val1 = Math.max(minVal, Math.min(maxVal, d.value));
      const y1 = paddingTop + chartHeight - ((val1 - minVal) / (maxVal - minVal)) * chartHeight;

      // Map value 2 if exists
      let y2 = undefined;
      if (d.value2 !== undefined) {
        const val2 = Math.max(minVal, Math.min(maxVal, d.value2));
        y2 = paddingTop + chartHeight - ((val2 - minVal) / (maxVal - minVal)) * chartHeight;
      }

      return { x, y1, y2, raw1: d.value, raw2: d.value2, label: d.label, date: d.date };
    });
  }, [data, minVal, maxVal, chartWidth, chartHeight]);

  // Construct SVG paths
  const pathD1 = useMemo(() => {
    if (points.length < 2) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y1}`).join(" ");
  }, [points]);

  const pathD2 = useMemo(() => {
    if (points.length < 2 || !color2) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y2}`).join(" ");
  }, [points, color2]);

  // Generate ticks for Y axis
  const yTicks = useMemo(() => {
    const ticks = [];
    const step = (maxVal - minVal) / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(Math.round(minVal + step * i));
    }
    return ticks;
  }, [minVal, maxVal]);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col h-full justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h5>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
            หน่วย: {unit}
          </span>
        </div>
        
        {/* Legends */}
        <div className="flex gap-4 mb-4 text-[10px] font-semibold text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            <span>{label1}</span>
          </div>
          {color2 && label2 && (
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: color2 }} />
              <span>{label2}</span>
            </div>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-slate-400 text-xs">
          ไม่มีข้อมูลการตรวจวัดสำหรับกราฟ
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            {/* Threshold reference lines if provided */}
            {thresholds?.map((t, idx) => {
              if (t.value < minVal || t.value > maxVal) return null;
              const y = paddingTop + chartHeight - ((t.value - minVal) / (maxVal - minVal)) * chartHeight;
              return (
                <g key={idx} className="opacity-30">
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={width - paddingRight} 
                    y2={y} 
                    stroke={t.color} 
                    strokeWidth="1" 
                    strokeDasharray="3 3" 
                  />
                  <text 
                    x={width - paddingRight - 5} 
                    y={y - 4} 
                    fill={t.color} 
                    fontSize="8" 
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    {t.label} ({t.value})
                  </text>
                </g>
              );
            })}

            {/* Grid horizontal lines */}
            {yTicks.map((tick, i) => {
              const y = paddingTop + chartHeight - ((tick - minVal) / (maxVal - minVal)) * chartHeight;
              return (
                <line
                  key={i}
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              );
            })}

            {/* Axis Y lines & Ticks */}
            {yTicks.map((tick, i) => {
              const y = paddingTop + chartHeight - ((tick - minVal) / (maxVal - minVal)) * chartHeight;
              return (
                <text
                  key={i}
                  x={paddingLeft - 8}
                  y={y + 3}
                  fill="#94a3b8"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {tick}
                </text>
              );
            })}

            {/* Data Line 2 */}
            {points.length > 1 && pathD2 && (
              <path
                d={pathD2}
                fill="none"
                stroke={color2 || color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-75 drop-shadow-sm"
              />
            )}

            {/* Data Line 1 */}
            {points.length > 1 && (
              <path
                d={pathD1}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm"
              />
            )}

            {/* Data Points */}
            {points.map((p, i) => (
              <g key={i}>
                {/* Data point 2 */}
                {p.y2 !== undefined && color2 && (
                  <circle
                    cx={p.x}
                    cy={p.y2}
                    r="4.5"
                    fill="white"
                    stroke={color2}
                    strokeWidth="2.5"
                  />
                )}
                {/* Data point 1 */}
                <circle
                  cx={p.x}
                  cy={p.y1}
                  r="5"
                  fill="white"
                  stroke={color}
                  strokeWidth="2.5"
                />
                
                {/* Value labels */}
                {p.y2 !== undefined ? (
                  <>
                    <text
                      x={p.x}
                      y={p.y1 - 12}
                      fill={color}
                      fontSize="9"
                      fontWeight="black"
                      textAnchor="middle"
                    >
                      {p.raw1}
                    </text>
                    <text
                      x={p.x}
                      y={p.y2 + 16}
                      fill={color2 || color}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {p.raw2}
                    </text>
                  </>
                ) : (
                  <text
                    x={p.x}
                    y={p.y1 - 12}
                    fill={color}
                    fontSize="10"
                    fontWeight="black"
                    textAnchor="middle"
                  >
                    {p.raw1}
                  </text>
                )}

                {/* X Axis Labels */}
                <text
                  x={p.x}
                  y={height - 10}
                  fill="#64748b"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {p.label}
                </text>
                <text
                  x={p.x}
                  y={height - 2}
                  fill="#94a3b8"
                  fontSize="7"
                  textAnchor="middle"
                >
                  {p.date}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
};
