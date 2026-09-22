import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea
} from "recharts";
import { 
  Activity, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Info, 
  Layers, 
  SlidersHorizontal,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Calendar,
  Sparkles
} from "lucide-react";
import { ScreeningRecord } from "../types";
import { getHTPingPong } from "../utils";

export interface BloodPressureTrendRechartsProps {
  visits: ScreeningRecord[];
  patientName?: string;
  className?: string;
  compact?: boolean;
}

interface ChartDataPoint {
  id: number;
  visitNumber: number;
  label: string;
  fullLabel: string;
  date: string;
  sys: number; // Systolic
  dia: number; // Diastolic
  pulsePressure: number; // sys - dia
  map: number; // Mean Arterial Pressure = dia + (sys - dia) / 3
  sysChange?: number; // delta vs prev visit
  diaChange?: number; // delta vs prev visit
  sysBaselineChange?: number; // delta vs visit 1
  diaBaselineChange?: number; // delta vs visit 1
  statusText: string;
  statusColor: string;
  pingPongName: string;
  raw: ScreeningRecord;
}

export const BloodPressureTrendRecharts: React.FC<BloodPressureTrendRechartsProps> = ({
  visits = [],
  patientName,
  className = "",
  compact = false
}) => {
  // View mode: 'line' (Trend) | 'bar' (Range Bar) | 'table' (Detailed Comparison Table)
  const [viewMode, setViewMode] = useState<"line" | "bar" | "table">("line");
  const [showThresholds, setShowThresholds] = useState<boolean>(true);
  const [showPulsePressure, setShowPulsePressure] = useState<boolean>(false);

  // Sort visits chronologically by visitNumber
  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => a.visitNumber - b.visitNumber);
  }, [visits]);

  // Transform visits into rich chart data with comparative deltas
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (sortedVisits.length === 0) return [];
    
    const baseline = sortedVisits[0];

    return sortedVisits.map((v, index) => {
      const prev = index > 0 ? sortedVisits[index - 1] : undefined;
      const sys = Number(v.bpSys) || 0;
      const dia = Number(v.bpDia) || 0;
      const pulsePressure = Math.max(0, sys - dia);
      const map = Math.round(dia + (sys - dia) / 3);

      const sysChange = prev ? sys - Number(prev.bpSys) : undefined;
      const diaChange = prev ? dia - Number(prev.bpDia) : undefined;

      const sysBaselineChange = index > 0 ? sys - Number(baseline.bpSys) : 0;
      const diaBaselineChange = index > 0 ? dia - Number(baseline.bpDia) : 0;

      const htPong = getHTPingPong(sys, dia, v.familyHistory);

      let statusText = "ปกติ";
      let statusColor = "#10b981";
      if (sys >= 140 || dia >= 90) {
        statusText = "สงสัยป่วย (HT Stage 2)";
        statusColor = "#ef4444";
      } else if (sys >= 120 || dia >= 80) {
        statusText = "กลุ่มเสี่ยง (Pre-HT)";
        statusColor = "#f59e0b";
      }

      return {
        id: v.id,
        visitNumber: v.visitNumber,
        label: `ครั้งที่ ${v.visitNumber}`,
        fullLabel: v.visitNumber === 1 ? "ครั้งที่ 1 (แรกรับ)" : `ครั้งที่ ${v.visitNumber} (ติดตาม #${v.visitNumber - 1})`,
        date: v.date || "-",
        sys,
        dia,
        pulsePressure,
        map,
        sysChange,
        diaChange,
        sysBaselineChange,
        diaBaselineChange,
        statusText,
        statusColor,
        pingPongName: htPong.nameTh,
        raw: v
      };
    });
  }, [sortedVisits]);

  // Overall comparison statistics between Visit 1 (Baseline) and Latest Visit
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const first = chartData[0];
    const latest = chartData[chartData.length - 1];
    const totalVisits = chartData.length;

    const sysDiff = latest.sys - first.sys;
    const diaDiff = latest.dia - first.dia;

    // Clinical Trajectory Evaluation
    let trajectoryText = "ตรวจครั้งแรก (ค่าตั้งต้น)";
    let trajectoryColor = "text-slate-600 bg-slate-100 border-slate-200";
    let trajectoryIcon = <Minus className="w-3.5 h-3.5" />;

    if (totalVisits > 1) {
      if (sysDiff <= -5 && diaDiff <= -3) {
        trajectoryText = `ควบคุมได้ดีขึ้นอย่างมีนัยสำคัญ (ลดลง SBP ${Math.abs(sysDiff)} / DBP ${Math.abs(diaDiff)} mmHg)`;
        trajectoryColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
        trajectoryIcon = <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />;
      } else if (sysDiff < 0 || diaDiff < 0) {
        trajectoryText = `แนวโน้มลดลงเล็กน้อย (ลดลง SBP ${sysDiff < 0 ? Math.abs(sysDiff) : 0} mmHg)`;
        trajectoryColor = "text-teal-700 bg-teal-50 border-teal-200";
        trajectoryIcon = <TrendingDown className="w-3.5 h-3.5 text-teal-600" />;
      } else if (sysDiff === 0 && diaDiff === 0) {
        trajectoryText = "ค่าความดันคงที่เทียบกับครั้งแรก";
        trajectoryColor = "text-slate-700 bg-slate-50 border-slate-250";
        trajectoryIcon = <Minus className="w-3.5 h-3.5 text-slate-500" />;
      } else {
        trajectoryText = `มีแนวโน้มเพิ่มขึ้น (เพิ่มขึ้น SBP +${sysDiff} / DBP +${diaDiff} mmHg) ต้องเฝ้าระวัง`;
        trajectoryColor = "text-rose-700 bg-rose-50 border-rose-200";
        trajectoryIcon = <TrendingUp className="w-3.5 h-3.5 text-rose-600" />;
      }
    }

    return {
      first,
      latest,
      totalVisits,
      sysDiff,
      diaDiff,
      trajectoryText,
      trajectoryColor,
      trajectoryIcon,
      latestPulsePressure: latest.pulsePressure,
      latestMap: latest.map
    };
  }, [chartData]);

  // Compute sensible Y-axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [50, 190];
    const allValues = chartData.flatMap(d => [d.sys, d.dia]);
    const min = Math.min(...allValues, 60);
    const max = Math.max(...allValues, 160);
    return [Math.max(40, Math.floor((min - 15) / 10) * 10), Math.min(240, Math.ceil((max + 15) / 10) * 10)];
  }, [chartData]);

  // Custom Recharts Tooltip with Clinical Insights
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dataPoint = payload[0].payload as ChartDataPoint;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl border border-slate-700 shadow-xl max-w-xs text-xs space-y-2.5">
        <div className="border-b border-slate-700 pb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-white">{dataPoint.fullLabel}</span>
            <span 
              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${dataPoint.statusColor}25`,
                color: dataPoint.statusColor,
                border: `1px solid ${dataPoint.statusColor}60`
              }}
            >
              {dataPoint.statusText}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            วันที่ตรวจ: {dataPoint.date}
          </div>
        </div>

        {/* Primary BP Readings */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-rose-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs" />
              Systolic (ความดันบน):
            </span>
            <span className="font-extrabold text-sm text-rose-200">
              {dataPoint.sys} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-blue-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-xs" />
              Diastolic (ความดันล่าง):
            </span>
            <span className="font-extrabold text-sm text-blue-200">
              {dataPoint.dia} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">ความดันชีพจร (Pulse Pressure):</span>
            <span className={`font-bold ${dataPoint.pulsePressure > 60 ? "text-amber-400" : "text-slate-300"}`}>
              {dataPoint.pulsePressure} mmHg
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">ความดันเฉลี่ย (MAP):</span>
            <span className="font-bold text-slate-300">{dataPoint.map} mmHg</span>
          </div>
        </div>

        {/* Comparative Deltas */}
        {dataPoint.visitNumber > 1 && (
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 mt-2 space-y-1 text-[10px]">
            <div className="font-semibold text-slate-300">ผลเปรียบเทียบ:</div>
            {dataPoint.sysChange !== undefined && (
              <div className="flex justify-between items-center text-slate-300">
                <span>เทียบครั้งก่อน:</span>
                <span className={`font-bold ${dataPoint.sysChange < 0 ? "text-emerald-400" : dataPoint.sysChange > 0 ? "text-rose-400" : "text-slate-400"}`}>
                  SBP {dataPoint.sysChange > 0 ? `+${dataPoint.sysChange}` : dataPoint.sysChange} / 
                  DBP {dataPoint.diaChange !== undefined && dataPoint.diaChange > 0 ? `+${dataPoint.diaChange}` : dataPoint.diaChange} mmHg
                </span>
              </div>
            )}
            {dataPoint.sysBaselineChange !== undefined && (
              <div className="flex justify-between items-center text-slate-300">
                <span>เทียบครั้งแรกรับ:</span>
                <span className={`font-bold ${dataPoint.sysBaselineChange < 0 ? "text-emerald-400" : dataPoint.sysBaselineChange > 0 ? "text-rose-400" : "text-slate-400"}`}>
                  SBP {dataPoint.sysBaselineChange > 0 ? `+${dataPoint.sysBaselineChange}` : dataPoint.sysBaselineChange} / 
                  DBP {dataPoint.diaBaselineChange !== undefined && dataPoint.diaBaselineChange > 0 ? `+${dataPoint.diaBaselineChange}` : dataPoint.diaBaselineChange} mmHg
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 ${className}`}>
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-medium">ยังไม่มีข้อมูลการตรวจวัดความดันโลหิตสำหรับแสดงแนวโน้ม</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between ${className}`}>
      
      {/* 1. Header with Controls and Title */}
      <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-rose-50 text-rose-600 p-2 rounded-xl shrink-0 border border-rose-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">
                  กราฟแนวโน้มและการเปรียบเทียบค่าความดันโลหิต (Blood Pressure Trend)
                </h4>
                {patientName && (
                  <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {patientName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ติดตามเปรียบเทียบค่าความดันตัวบน (Systolic) และตัวล่าง (Diastolic) ทุกครั้งที่ติดตามผล พร้อมผลต่าง (Δ)
              </p>
            </div>
          </div>
        </div>

        {/* View mode toggle pills & controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Threshold toggle */}
          <button
            type="button"
            onClick={() => setShowThresholds(!showThresholds)}
            className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              showThresholds
                ? "bg-amber-50 text-amber-800 border-amber-200 shadow-2xs"
                : "bg-white text-slate-500 border-slate-250 hover:bg-slate-50"
            }`}
            title="แสดงหรือซ่อนเส้นเกณฑ์มาตรฐาน (140/90 และ 120/80)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>เส้นเกณฑ์มาตรฐาน</span>
          </button>

          {/* Pulse pressure toggle */}
          <button
            type="button"
            onClick={() => setShowPulsePressure(!showPulsePressure)}
            className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              showPulsePressure
                ? "bg-purple-50 text-purple-800 border-purple-200 shadow-2xs"
                : "bg-white text-slate-500 border-slate-250 hover:bg-slate-50"
            }`}
            title="แสดงความดันชีพจร (Pulse Pressure)"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Pulse Pressure</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("line")}
              className={`text-xs px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === "line"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              กราฟเส้น
            </button>
            <button
              type="button"
              onClick={() => setViewMode("bar")}
              className={`text-xs px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === "bar"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              กราฟแท่ง
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`text-xs px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "table"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3 h-3" />
              ตารางเปรียบเทียบ
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Comparative Metrics Bar */}
      {stats && (
        <div className="p-5 bg-white border-b border-slate-150">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Latest BP Card */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ค่าความดันรอบล่าสุด ({stats.latest.label})
              </span>
              <div className="text-xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                <span>{stats.latest.sys}</span>
                <span className="text-slate-400 text-sm font-normal">/</span>
                <span>{stats.latest.dia}</span>
                <span className="text-[11px] font-medium text-slate-400 ml-1">mmHg</span>
              </div>
              <span 
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
                style={{
                  backgroundColor: `${stats.latest.statusColor}15`,
                  color: stats.latest.statusColor,
                  border: `1px solid ${stats.latest.statusColor}40`
                }}
              >
                {stats.latest.statusText}
              </span>
            </div>

            {/* Baseline Visit 1 */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ค่าตั้งต้นครั้งแรก (แรกรับ)
              </span>
              <div className="text-xl font-black text-slate-700 mt-1 flex items-baseline gap-1">
                <span>{stats.first.sys}</span>
                <span className="text-slate-400 text-sm font-normal">/</span>
                <span>{stats.first.dia}</span>
                <span className="text-[11px] font-medium text-slate-400 ml-1">mmHg</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1.5">
                ตรวจเมื่อ {stats.first.date}
              </span>
            </div>

            {/* Net Change Δ */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ผลต่างเทียบครั้งแรก (Δ Net)
              </span>
              {stats.totalVisits > 1 ? (
                <div className="mt-1 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Δ SBP:</span>
                    <span className={`font-black ${stats.sysDiff < 0 ? "text-emerald-600" : stats.sysDiff > 0 ? "text-rose-600" : "text-slate-700"}`}>
                      {stats.sysDiff > 0 ? `+${stats.sysDiff}` : stats.sysDiff} mmHg
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Δ DBP:</span>
                    <span className={`font-black ${stats.diaDiff < 0 ? "text-emerald-600" : stats.diaDiff > 0 ? "text-rose-600" : "text-slate-700"}`}>
                      {stats.diaDiff > 0 ? `+${stats.diaDiff}` : stats.diaDiff} mmHg
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-2 italic">
                  ต้องมีผลตรวจ ≥ 2 ครั้ง
                </div>
              )}
            </div>

            {/* Pulse Pressure & MAP */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ดัชนีหลอดเลือด (PP & MAP)
              </span>
              <div className="mt-1 space-y-0.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Pulse Pressure:</span>
                  <span className={`font-bold ${stats.latestPulsePressure > 60 ? "text-amber-600" : "text-slate-700"}`}>
                    {stats.latestPulsePressure} mmHg
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">MAP เฉลี่ย:</span>
                  <span className="font-bold text-slate-700">
                    {stats.latestMap} mmHg
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Clinical Trajectory Banner */}
          {stats.totalVisits > 1 && (
            <div className={`mt-3 p-2.5 px-3.5 rounded-xl border flex items-center justify-between gap-3 ${stats.trajectoryColor}`}>
              <div className="flex items-center gap-2">
                {stats.trajectoryIcon}
                <span className="text-xs font-bold">
                  ผลสรุปแนวโน้มการติดตาม ({stats.totalVisits} ครั้ง):
                </span>
                <span className="text-xs font-medium">
                  {stats.trajectoryText}
                </span>
              </div>
              <div className="text-[10px] font-semibold opacity-80 shrink-0 hidden sm:block">
                * ค่าเป้าหมายควบคุม: SBP &lt; 140 และ DBP &lt; 90 mmHg
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Chart / Table Body */}
      <div className="p-5 flex-1">
        
        {viewMode === "line" && (
          <div className="w-full">
            {/* Legends Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-3 font-semibold text-slate-600">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block shadow-xs" />
                  <span>Systolic (ความดันบน)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 inline-block shadow-xs" />
                  <span>Diastolic (ความดันล่าง)</span>
                </div>
                {showPulsePressure && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-purple-500 inline-block shadow-xs" />
                    <span>Pulse Pressure (ชีพจร)</span>
                  </div>
                )}
              </div>

              {showThresholds && (
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500 inline-block" />
                    เกณฑ์สงสัยป่วย SBP 140 / DBP 90
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
                    เกณฑ์เสี่ยง SBP 120 / DBP 80
                  </span>
                </div>
              )}
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 25, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="sysGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="diaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                  />
                  
                  <YAxis 
                    domain={yDomain}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                    unit=" mmHg"
                  />

                  <Tooltip content={<CustomChartTooltip />} />

                  {/* Standard Clinical Reference Lines */}
                  {showThresholds && (
                    <>
                      {/* Normal Optimal Zone Highlight */}
                      <ReferenceArea y1={60} y2={120} fill="#10b981" fillOpacity={0.03} />

                      {/* Systolic Stage 2 HT Threshold (140) */}
                      <ReferenceLine 
                        y={140} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4" 
                        strokeWidth={1.5}
                        label={{ 
                          value: "เกณฑ์ SBP สูง (140)", 
                          fill: "#ef4444", 
                          fontSize: 10, 
                          fontWeight: 700, 
                          position: "top" 
                        }} 
                      />

                      {/* Systolic Pre-HT Threshold (120) */}
                      <ReferenceLine 
                        y={120} 
                        stroke="#f59e0b" 
                        strokeDasharray="3 3" 
                        strokeWidth={1}
                        label={{ 
                          value: "ปกติ/เสี่ยง (120)", 
                          fill: "#d97706", 
                          fontSize: 9, 
                          position: "top" 
                        }} 
                      />

                      {/* Diastolic Stage 2 HT Threshold (90) */}
                      <ReferenceLine 
                        y={90} 
                        stroke="#f43f5e" 
                        strokeDasharray="4 4" 
                        strokeWidth={1.5}
                        label={{ 
                          value: "เกณฑ์ DBP สูง (90)", 
                          fill: "#f43f5e", 
                          fontSize: 10, 
                          fontWeight: 700, 
                          position: "bottom" 
                        }} 
                      />

                      {/* Diastolic Pre-HT Threshold (80) */}
                      <ReferenceLine 
                        y={80} 
                        stroke="#0ea5e9" 
                        strokeDasharray="3 3" 
                        strokeWidth={1}
                        label={{ 
                          value: "ปกติ/เสี่ยง (80)", 
                          fill: "#0284c7", 
                          fontSize: 9, 
                          position: "bottom" 
                        }} 
                      />
                    </>
                  )}

                  {/* Area fill under Systolic curve */}
                  <Area 
                    type="monotone" 
                    dataKey="sys" 
                    stroke="none" 
                    fill="url(#sysGradient)" 
                  />

                  {/* Systolic Line */}
                  <Line
                    type="monotone"
                    dataKey="sys"
                    name="Systolic (ความดันบน)"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#ef4444", strokeWidth: 2, stroke: "#ffffff" }}
                    activeDot={{ r: 8, stroke: "#ef4444", strokeWidth: 3, fill: "#ffffff" }}
                  />

                  {/* Diastolic Line */}
                  <Line
                    type="monotone"
                    dataKey="dia"
                    name="Diastolic (ความดันล่าง)"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#ffffff" }}
                    activeDot={{ r: 8, stroke: "#3b82f6", strokeWidth: 3, fill: "#ffffff" }}
                  />

                  {/* Pulse pressure if enabled */}
                  {showPulsePressure && (
                    <Line
                      type="monotone"
                      dataKey="pulsePressure"
                      name="Pulse Pressure"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 4, fill: "#8b5cf6" }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === "bar" && (
          <div className="w-full">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 25, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    domain={yDomain}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    unit=" mmHg"
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend verticalAlign="top" height={36} />

                  {showThresholds && (
                    <>
                      <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" label="SBP 140" />
                      <ReferenceLine y={90} stroke="#3b82f6" strokeDasharray="3 3" label="DBP 90" />
                    </>
                  )}

                  <Bar dataKey="sys" name="Systolic (ความดันบน)" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  <Bar dataKey="dia" name="Diastolic (ความดันล่าง)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">ครั้งที่ตรวจ</th>
                  <th className="py-2.5 px-4">วันที่ตรวจ</th>
                  <th className="py-2.5 px-4 text-center">Systolic (บน)</th>
                  <th className="py-2.5 px-4 text-center">Diastolic (ล่าง)</th>
                  <th className="py-2.5 px-4 text-center">Pulse Pressure</th>
                  <th className="py-2.5 px-4 text-center">MAP</th>
                  <th className="py-2.5 px-4 text-center">ผลต่างเทียบครั้งก่อน (Δ)</th>
                  <th className="py-2.5 px-4 text-center">ผลต่างเทียบแรกรับ (Δ Net)</th>
                  <th className="py-2.5 px-4">การประเมินสถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartData.map((d, idx) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {d.fullLabel}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{d.date}</td>
                    <td className="py-3 px-4 text-center font-black text-rose-600">
                      {d.sys} mmHg
                    </td>
                    <td className="py-3 px-4 text-center font-black text-blue-600">
                      {d.dia} mmHg
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {d.pulsePressure} mmHg
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-600">
                      {d.map} mmHg
                    </td>
                    <td className="py-3 px-4 text-center">
                      {d.sysChange !== undefined ? (
                        <span className={`font-bold ${d.sysChange < 0 ? "text-emerald-600" : d.sysChange > 0 ? "text-rose-600" : "text-slate-400"}`}>
                          {d.sysChange > 0 ? `+${d.sysChange}` : d.sysChange} / {d.diaChange !== undefined && d.diaChange > 0 ? `+${d.diaChange}` : d.diaChange}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {idx > 0 && d.sysBaselineChange !== undefined ? (
                        <span className={`font-bold ${d.sysBaselineChange < 0 ? "text-emerald-600" : d.sysBaselineChange > 0 ? "text-rose-600" : "text-slate-400"}`}>
                          {d.sysBaselineChange > 0 ? `+${d.sysBaselineChange}` : d.sysBaselineChange} / {d.diaBaselineChange !== undefined && d.diaBaselineChange > 0 ? `+${d.diaBaselineChange}` : d.diaBaselineChange}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">ค่าตั้งต้น (0)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span 
                        className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${d.statusColor}15`,
                          color: d.statusColor,
                          border: `1px solid ${d.statusColor}40`
                        }}
                      >
                        {d.statusText}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 4. Footer Clinical Recommendations */}
      <div className="bg-slate-50/80 p-4 border-t border-slate-150 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="leading-relaxed">
            <strong>คำแนะนำการแปลผล:</strong> เกณฑ์เป้าหมายการควบคุมความดันโลหิตในผู้ใหญ่ทั่วไปคือ <strong>น้อยกว่า 140/90 mmHg</strong> (และ &lt; 130/80 mmHg ในผู้ป่วยเบาหวานหรือกลุ่มเสี่ยงสูง)
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-semibold shrink-0">
          อ้างอิงแนวทางสมาคมความดันโลหิตสูงแห่งประเทศไทย &amp; กระทรวงสาธารณสุข
        </div>
      </div>

    </div>
  );
};
