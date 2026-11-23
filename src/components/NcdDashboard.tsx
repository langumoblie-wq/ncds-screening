import React, { useState, useMemo, useEffect, useRef } from "react";
import { RefreshCw, 
  Users, CheckCircle2, AlertTriangle, ShieldAlert, Search, Filter, 
  MapPin, Eye, Trash2, SlidersHorizontal, ArrowUpDown, ChevronDown, 
  Download, FileSpreadsheet, RotateCcw, Cigarette, Wine, Flame, EyeOff,
  Pencil, PlusCircle, History, Apple, Dumbbell, Smile, Moon, Activity, Upload,
  Layers, UserCheck, Calendar, Check, GitBranch, TrendingUp, CalendarRange, Clock, BarChart2, Printer,
  Droplet, Ruler
} from "lucide-react";
import { ScreeningRecord, DistrictType, LOCATION_DATA, DISTRICT_SUBDISTRICT_MAP } from "../types";
import { parseDateToIso, formatYearMonthThai, formatYearMonthThaiShort, getRecordYearMonth, formatThaiDate, maskPatientName, maskPhoneNumber } from "../utils";
import { 
  BackupExportModal, 
  BackupImportModal, 
  getRecordModel, 
  getRecordSubdistrict,
  cleanDistrict,
  cleanSubdistrict,
  cleanTargetArea,
  matchesDistrictFilter,
  matchesSubdistrictFilter,
  matchesTargetAreaFilter,
  matchesModelFilter
} from "./BackupRestoreModal";

interface NcdDashboardProps {
  isAdmin?: boolean;
  records: ScreeningRecord[];
  onDeleteRecord: (id: number) => void;
  onSelectRecord: (record: ScreeningRecord) => void;
  onEditRecord?: (record: ScreeningRecord) => void;
  onAddScreeningClicked?: () => void;
  onFollowUpRecord?: (record: ScreeningRecord) => void;
  onImportRecords?: (records: ScreeningRecord[]) => Promise<any> | void;
  onSyncCloud?: () => Promise<any> | void;
  onOpenExecutiveReport?: () => void;
  hideNames?: boolean;
  onToggleHideNames?: () => void;
}



const MultiSelectDropdown = ({ options, selected, onChange, placeholder, disabled = false, labelKey = (v: string) => v }: { options: string[], selected: string[], onChange: (val: string[]) => void, placeholder: string, disabled?: boolean, labelKey?: (v: string) => string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className={`w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none cursor-pointer flex justify-between items-center ${disabled ? 'bg-slate-50 text-slate-400' : 'text-slate-700 font-semibold'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate pr-2">
          {selected.length === 0 ? placeholder : selected.map(labelKey).join(', ')}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {options.length > 0 && (
            <div 
              className="px-3 py-2 text-xs border-b border-slate-100 hover:bg-slate-50 cursor-pointer text-slate-500 font-bold"
              onClick={() => { onChange([]); setIsOpen(false); }}
            >
              ล้างตัวเลือก
            </div>
          )}
          {options.map(opt => (
            <label key={opt} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700">
              <input 
                type="checkbox" 
                className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selected, opt]);
                  } else {
                    onChange(selected.filter(s => s !== opt));
                  }
                }}
              />
              {labelKey(opt)}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// Reusable custom circular progress gauge for BMI
const BMIDoughnut: React.FC<{
  underweight: number;
  normal: number;
  overweight: number;
  obese1: number;
  obese2: number;
  title: string;
}> = ({ underweight, normal, overweight, obese1, obese2, title }) => {
  const total = underweight + normal + overweight + obese1 + obese2;
  const pctUW = total > 0 ? (underweight / total) * 100 : 0;
  const pctN = total > 0 ? (normal / total) * 100 : 0;
  const pctOW = total > 0 ? (overweight / total) * 100 : 0;
  const pctOB1 = total > 0 ? (obese1 / total) * 100 : 0;
  const pctOB2 = total > 0 ? (obese2 / total) * 100 : 0;

  const size = 152;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dasharray = circumference;

  const bmiItems = [
    { label: "ผอม (<18.5)", count: underweight, pct: Math.round(pctUW), dot: "bg-blue-500", bg: "bg-blue-50/50 border-blue-100", text: "text-blue-700" },
    { label: "ปกติ (18.5-22.9)", count: normal, pct: Math.round(pctN), dot: "bg-emerald-500", bg: "bg-emerald-50/50 border-emerald-100", text: "text-emerald-700" },
    { label: "ท้วม (23-24.9)", count: overweight, pct: Math.round(pctOW), dot: "bg-amber-500", bg: "bg-amber-50/50 border-amber-100", text: "text-amber-700" },
    { label: "อ้วน (25-29.9)", count: obese1, pct: Math.round(pctOB1), dot: "bg-rose-500", bg: "bg-rose-50/50 border-rose-100", text: "text-rose-700" },
    { label: "อ้วนมาก (≥30)", count: obese2, pct: Math.round(pctOB2), dot: "bg-purple-500", bg: "bg-purple-50/50 border-purple-100", text: "text-purple-700" },
  ];

  const overweightTotal = overweight + obese1 + obese2;
  const overweightPct = total > 0 ? Math.round((overweightTotal / total) * 100) : 0;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-4 rounded-full bg-indigo-500 shrink-0" />
            <h4 className="text-xs font-black text-slate-800 tracking-wide">{title}</h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
            BMI เกณฑ์เอเชีย
          </span>
        </div>

        {total === 0 ? (
          <div className="h-[220px] flex flex-col items-center justify-center text-slate-400 text-xs text-center space-y-1">
            <EyeOff className="w-8 h-8 text-slate-300" />
            <p>ไม่มีข้อมูลแสดงผล</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Circular SVG Chart Centered */}
            <div className="relative w-[152px] h-[152px] shrink-0">
              <svg width={size} height={size} className="-rotate-90 transform">
                <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                {pctUW > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#3b82f6" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctUW) / 100} />}
                {pctN > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#10b981" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctN) / 100} style={{ transform: `rotate(${pctUW * 3.6}deg)`, transformOrigin: "center" }} />}
                {pctOW > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#f59e0b" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctOW) / 100} style={{ transform: `rotate(${(pctUW + pctN) * 3.6}deg)`, transformOrigin: "center" }} />}
                {pctOB1 > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#f43f5e" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctOB1) / 100} style={{ transform: `rotate(${(pctUW + pctN + pctOW) * 3.6}deg)`, transformOrigin: "center" }} />}
                {pctOB2 > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#8b5cf6" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctOB2) / 100} style={{ transform: `rotate(${(pctUW + pctN + pctOW + pctOB1) * 3.6}deg)`, transformOrigin: "center" }} />}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800 leading-none">{total.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">เคสทั้งหมด</span>
              </div>
            </div>

            {/* Clean Structured Legend Rows (No collision) */}
            <div className="w-full space-y-1.5">
              {bmiItems.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl border ${item.bg} text-xs`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`} />
                    <span className="text-slate-700 font-bold truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="font-black text-slate-800">{item.count.toLocaleString()} ราย</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-white/80 ${item.text} min-w-[40px] text-right`}>
                      {item.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-semibold">น้ำหนักเกินเกณฑ์ (BMI ≥ 23):</span>
          <span className="font-black text-rose-600">
            {overweightTotal.toLocaleString()} ราย ({overweightPct}%)
          </span>
        </div>
      )}
    </div>
  );
};

const RiskDoughnut: React.FC<{
  normal: number;
  risk: number;
  danger: number;
  title: string;
  accentColor?: string;
  badgeText?: string;
}> = ({ normal, risk, danger, title, accentColor = "bg-blue-600", badgeText = "เกณฑ์คัดกรอง" }) => {
  const total = normal + risk + danger;
  
  const pctNormal = total > 0 ? Math.round((normal / total) * 100) : 0;
  const pctRisk = total > 0 ? Math.round((risk / total) * 100) : 0;
  const pctDanger = total > 0 ? Math.round((danger / total) * 100) : 0;

  // SVG parameters
  const size = 152;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const riskRows = [
    { label: "ปกติ", count: normal, pct: pctNormal, dot: "bg-emerald-500", bg: "bg-emerald-50/50 border-emerald-100", text: "text-emerald-700" },
    { label: "กลุ่มเสี่ยงสูง", count: risk, pct: pctRisk, dot: "bg-amber-500", bg: "bg-amber-50/50 border-amber-100", text: "text-amber-700" },
    { label: "สงสัยป่วย", count: danger, pct: pctDanger, dot: "bg-rose-500", bg: "bg-rose-50/50 border-rose-100", text: "text-rose-700" },
  ];

  const abnormalTotal = risk + danger;
  const abnormalPct = total > 0 ? Math.round((abnormalTotal / total) * 100) : 0;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-4 rounded-full ${accentColor} shrink-0`} />
            <h4 className="text-xs font-black text-slate-800 tracking-wide">{title}</h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
            {badgeText}
          </span>
        </div>
        
        {total === 0 ? (
          <div className="h-[220px] flex flex-col items-center justify-center text-slate-400 text-xs text-center space-y-1">
            <EyeOff className="w-8 h-8 text-slate-300" />
            <p>ไม่มีข้อมูลแสดงผล</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            {/* Circular SVG Chart Centered */}
            <div className="relative w-[152px] h-[152px] shrink-0">
              <svg width={size} height={size} className="transform -rotate-90">
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth={strokeWidth}
                />
                {pctNormal > 0 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (circumference * pctNormal) / 100}
                  />
                )}
                {pctRisk > 0 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (circumference * pctRisk) / 100}
                    style={{ transform: `rotate(${pctNormal * 3.6}deg)`, transformOrigin: "center" }}
                  />
                )}
                {pctDanger > 0 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="#ef4444"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (circumference * pctDanger) / 100}
                    style={{ transform: `rotate(${(pctNormal + pctRisk) * 3.6}deg)`, transformOrigin: "center" }}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800 leading-none">{total.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">เคสทั้งหมด</span>
              </div>
            </div>

            {/* Clean Structured Legend Table (No text overlap) */}
            <div className="w-full space-y-2">
              {riskRows.map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl border ${row.bg} text-xs`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${row.dot}`} />
                    <span className="text-slate-700 font-bold">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-slate-800">{row.count.toLocaleString()} ราย</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/80 ${row.text} min-w-[44px] text-right`}>
                      {row.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-semibold">รวมกลุ่มเสี่ยง + สงสัยป่วย:</span>
          <span className="font-black text-amber-700">
            {abnormalTotal.toLocaleString()} ราย ({abnormalPct}%)
          </span>
        </div>
      )}
    </div>
  );
};

const LifestyleBehaviors3O2S: React.FC<{
  smokeCount: number;
  alcoholCount: number;
  noExerciseCount: number;
  poorSleepCount: number;
  foodSweetCount: number;
  foodFatCount: number;
  foodSaltCount: number;
  lowWaterCount: number;
  total: number;
}> = ({
  smokeCount,
  alcoholCount,
  noExerciseCount,
  poorSleepCount,
  foodSweetCount,
  foodFatCount,
  foodSaltCount,
  lowWaterCount,
  total
}) => {
  const getPct = (count: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  const items = [
    {
      id: "sweet",
      group: "3อ",
      title: "อ.อาหาร (รสหวานจัด)",
      count: foodSweetCount,
      pct: getPct(foodSweetCount),
      color: "bg-red-500",
      barColor: "from-red-400 to-rose-500",
      badgeBg: "bg-red-50 text-red-700 border-red-100",
      icon: <Apple className="w-3.5 h-3.5" />,
      desc: "ทานหวานจัด / ปรุงเพิ่มหวานเป็นประจำ"
    },
    {
      id: "fat",
      group: "3อ",
      title: "อ.อาหาร (รสมันจัด)",
      count: foodFatCount,
      pct: getPct(foodFatCount),
      color: "bg-orange-500",
      barColor: "from-orange-400 to-amber-500",
      badgeBg: "bg-orange-50 text-orange-700 border-orange-100",
      icon: <Apple className="w-3.5 h-3.5" />,
      desc: "นิยมทานของทอด / ของมันจัดสูง"
    },
    {
      id: "salt",
      group: "3อ",
      title: "อ.อาหาร (รสเค็มจัด)",
      count: foodSaltCount,
      pct: getPct(foodSaltCount),
      color: "bg-amber-500",
      barColor: "from-amber-400 to-yellow-500",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-100",
      icon: <Flame className="w-3.5 h-3.5" />,
      desc: "ปรุงเพิ่มเค็ม / ทานสำเร็จรูป / หมักดองบ่อย"
    },
    {
      id: "water",
      group: "3อ",
      title: "อ.อาหาร (ดื่มน้ำเปล่าน้อย <6 แก้ว)",
      count: lowWaterCount,
      pct: getPct(lowWaterCount),
      color: "bg-cyan-500",
      barColor: "from-cyan-400 to-sky-500",
      badgeBg: "bg-cyan-50 text-cyan-700 border-cyan-100",
      icon: <Droplet className="w-3.5 h-3.5" />,
      desc: "ดื่มน้ำสะอาดน้อยกว่า 6 แก้ว/วัน เสี่ยงภาวะขาดน้ำ"
    },
    {
      id: "exercise",
      group: "3อ",
      title: "อ.ออกกำลังกาย (นั่งนิ่ง)",
      count: noExerciseCount,
      pct: getPct(noExerciseCount),
      color: "bg-blue-500",
      barColor: "from-blue-400 to-indigo-500",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-100",
      icon: <Dumbbell className="w-3.5 h-3.5" />,
      desc: "ขาดการขยับ / นั่งทำงานนาน / ไม่ออกกำลังกาย"
    },
    {
      id: "sleep",
      group: "3อ",
      title: "อ.อารมณ์ (พักผ่อนไม่เพียงพอ)",
      count: poorSleepCount,
      pct: getPct(poorSleepCount),
      color: "bg-purple-500",
      barColor: "from-purple-400 to-violet-500",
      badgeBg: "bg-purple-50 text-purple-700 border-purple-100",
      icon: <Moon className="w-3.5 h-3.5" />,
      desc: "นอนเฉลี่ยน้อยกว่า 6 ชม. / หลับยาก / เครียดสะสม"
    },
    {
      id: "smoke",
      group: "2ส",
      title: "ส.สูบบุหรี่ (ยังสูบอยู่)",
      count: smokeCount,
      pct: getPct(smokeCount),
      color: "bg-slate-600",
      barColor: "from-slate-500 to-slate-700",
      badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
      icon: <Cigarette className="w-3.5 h-3.5" />,
      desc: "ยังสูบประจำ / เลิกสูบยังไม่ถึง 1 ปี"
    },
    {
      id: "alcohol",
      group: "2ส",
      title: "ส.สุรา (ดื่มแอลกอฮอล์)",
      count: alcoholCount,
      pct: getPct(alcoholCount),
      color: "bg-pink-600",
      barColor: "from-pink-500 to-rose-600",
      badgeBg: "bg-pink-50 text-pink-700 border-pink-100",
      icon: <Wine className="w-3.5 h-3.5" />,
      desc: "ดื่มแอลกอฮอล์เป็นประจำหรือครั้งคราว"
    }
  ];

  // Find the highest risk factor
  const maxRiskItem = [...items].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl shrink-0">
            <Apple className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800">
              การวิเคราะห์พฤติกรรมเสี่ยงทางสุขภาพ (หลัก 3อ. 2ส. และการดื่มน้ำเปล่า)
            </h4>
            <p className="text-[11px] text-slate-500 font-semibold">
              สรุปอัตราความเสี่ยงด้านพฤติกรรมการบริโภค การออกกำลังกาย การพักผ่อน และปัจจัยเสี่ยง 2ส.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {total > 0 && maxRiskItem && maxRiskItem.count > 0 && (
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] bg-rose-50 text-rose-700 border border-rose-200/80 px-3 py-1.5 rounded-xl font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>
                ความเสี่ยงสูงสุด: <strong>{maxRiskItem.title}</strong> ({maxRiskItem.pct}% • {maxRiskItem.count.toLocaleString()} ราย)
              </span>
            </div>
          )}
          <span className="text-xs bg-slate-100 text-slate-700 font-black px-3 py-1.5 rounded-xl border border-slate-200/80">
            กลุ่มตัวอย่าง {total.toLocaleString()} ราย
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-slate-400 text-xs text-center space-y-1">
          <EyeOff className="w-8 h-8 text-slate-300" />
          <p>ไม่มีข้อมูลแสดงผลพฤติกรรมสุขภาพ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Group 3อ (Left 8 cols): 2-column grid of 6 items */}
          <div className="lg:col-span-8 bg-slate-50/60 border border-slate-200/70 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-lg shadow-2xs">
                  3อ
                </span>
                <span className="text-xs text-slate-800 font-black">
                  อาหาร (หวาน • มัน • เค็ม • น้ำเปล่า) • ออกกำลังกาย • อารมณ์
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                6 ปัจจัยหลัก
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.filter(i => i.group === "3อ").map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`${item.color} text-white p-1.5 rounded-lg shrink-0 shadow-2xs`}>
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-800 block truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold block truncate">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${item.badgeBg}`}>
                      {item.count.toLocaleString()} ราย ({item.pct}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${item.barColor} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(item.pct, item.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group 2ส + Top Risk Callout (Right 4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-3.5 h-full">
            <div className="bg-slate-50/60 border border-slate-200/70 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black bg-slate-700 text-white px-2 py-0.5 rounded-lg shadow-2xs">
                    2ส
                  </span>
                  <span className="text-xs text-slate-800 font-black">
                    สูบบุหรี่ • ดื่มสุรา/แอลกอฮอล์
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">2 ปัจจัยเสี่ยง</span>
              </div>

              <div className="space-y-3">
                {items.filter(i => i.group === "2ส").map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`${item.color} text-white p-1.5 rounded-lg shrink-0 shadow-2xs`}>
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-800 block truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block truncate">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${item.badgeBg}`}>
                        {item.count.toLocaleString()} ราย ({item.pct}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${item.barColor} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(item.pct, item.count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Community Behavior Recommendation Box */}
            {total > 0 && maxRiskItem && maxRiskItem.count > 0 && (
              <div className="bg-gradient-to-br from-rose-50/80 to-orange-50/60 border border-rose-200/80 p-4 rounded-2xl flex items-start gap-2.5 shadow-2xs">
                <div className="bg-rose-100 text-rose-600 p-2 rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-slate-600 font-semibold">
                  <span className="font-black text-rose-900 block mb-0.5">
                    พฤติกรรมเสี่ยงสูงหลักในชุมชน:
                  </span>
                  <span>
                    พบ <strong className="text-rose-700">{maxRiskItem.title}</strong> สูงถึง{" "}
                    <strong className="text-rose-700">{maxRiskItem.pct}%</strong> ({maxRiskItem.count.toLocaleString()} เคส) แนะนำจัดกิจกรรมปรับเปลี่ยนพฤติกรรมเน้นหัวข้อนี้เป็นลำดับแรก
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const NcdDashboard: React.FC<NcdDashboardProps> = ({ 
  isAdmin = false,
  records, 
  onDeleteRecord, 
  onSelectRecord,
  onEditRecord,
  onAddScreeningClicked,
  onFollowUpRecord,
  onImportRecords,
  onSyncCloud,
  onOpenExecutiveReport,
  hideNames = false,
  onToggleHideNames
}) => {
  const [recordToDelete, setRecordToDelete] = useState<ScreeningRecord | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModel, setFilterModel] = useState<string[]>([]);
  const [filterDistrict, setFilterDistrict] = useState<string[]>([]);
  const [filterSubdistrict, setFilterSubdistrict] = useState<string[]>([]);
  const [filterTargetArea, setFilterTargetArea] = useState<string[]>([]);
  const [filterHtRisk, setFilterHtRisk] = useState<string[]>([]);
  const [filterDmRisk, setFilterDmRisk] = useState<string[]>([]);
  const [filterBehaviorRisk, setFilterBehaviorRisk] = useState<string[]>([]);
  const [filterVisitScope, setFilterVisitScope] = useState<"all" | "latest_only" | "followup_only" | "initial_only">("all");
  const [filterVisitNumbers, setFilterVisitNumbers] = useState<number[]>([]);
  const [filterParticipantType, setFilterParticipantType] = useState<string[]>([]);
  
  // Month-Year Filter state (กรองช่วงเดือน-ปี เพื่อดูแนวโน้มรายเดือน)
  const [filterMonthMode, setFilterMonthMode] = useState<"all" | "single" | "range">("all");
  const [filterSelectedMonth, setFilterSelectedMonth] = useState<string>(""); // e.g. "2026-10"
  const [filterStartMonth, setFilterStartMonth] = useState<string>("");     // e.g. "2026-05"
  const [filterEndMonth, setFilterEndMonth] = useState<string>("");         // e.g. "2026-10"
  const [showMonthlyTrends, setShowMonthlyTrends] = useState<boolean>(true);

  const [sortBy, setSortBy] = useState<"date" | "name" | "age" | "bmi" | "visitNumber">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Targeted Backup & Import Modal states
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Available months from all records
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, { key: string; label: string; labelShort: string; count: number }>();
    (records || []).forEach(r => {
      if (r && r.date) {
        const ym = parseDateToIso(r.date).substring(0, 7);
        if (ym && ym.length === 7) {
          const existing = monthMap.get(ym);
          if (existing) {
            existing.count += 1;
          } else {
            monthMap.set(ym, {
              key: ym,
              label: formatYearMonthThai(ym),
              labelShort: formatYearMonthThaiShort(ym),
              count: 1
            });
          }
        }
      }
    });
    return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key)); // newest first
  }, [records]);

  // Participant Category distribution
  const participantDistribution = useMemo(() => {
    let targetCount = 0;
    let committeeCount = 0;
    (records || []).forEach(r => {
      if (!r) return;
      if (r.participantType === "คณะทำงาน") {
        committeeCount++;
      } else {
        targetCount++;
      }
    });
    return { targetCount, committeeCount, total: (records || []).length };
  }, [records]);

  // Monthly Trends Analytics Data
  const monthlyTrendsData = useMemo(() => {
    const map: Record<string, {
      monthKey: string;
      label: string;
      labelShort: string;
      total: number;
      initialCount: number;
      followUpCount: number;
      targetGroupCount: number;
      committeeCount: number;
      htDanger: number;
      htRisk: number;
      htNormal: number;
      dmDanger: number;
      dmRisk: number;
      dmNormal: number;
    }> = {};

    (records || []).forEach(r => {
      if (!r || !r.date) return;
      if (!matchesModelFilter(r, filterModel)) return;
      if (!matchesDistrictFilter(r.district, filterDistrict)) return;
      const recSub = cleanSubdistrict(r.subdistrict || getRecordSubdistrict(r));
      if (!matchesSubdistrictFilter(recSub, filterSubdistrict)) return;
      if (!matchesTargetAreaFilter(r.targetArea, filterTargetArea)) return;
      const pType = r.participantType || "กลุ่มเป้าหมายโครงการ";
      if (filterParticipantType.length > 0 && !filterParticipantType.includes(pType)) return;

      const ym = parseDateToIso(r.date).substring(0, 7);
      if (!ym || ym.length !== 7) return;

      if (!map[ym]) {
        map[ym] = {
          monthKey: ym,
          label: formatYearMonthThai(ym),
          labelShort: formatYearMonthThaiShort(ym),
          total: 0,
          initialCount: 0,
          followUpCount: 0,
          targetGroupCount: 0,
          committeeCount: 0,
          htDanger: 0,
          htRisk: 0,
          htNormal: 0,
          dmDanger: 0,
          dmRisk: 0,
          dmNormal: 0,
        };
      }

      const item = map[ym];
      item.total += 1;
      if ((r.visitNumber || 1) === 1) item.initialCount += 1;
      else item.followUpCount += 1;

      if (r.participantType === "คณะทำงาน") item.committeeCount += 1;
      else item.targetGroupCount += 1;

      if (r.htResult?.level === "danger") item.htDanger += 1;
      else if (r.htResult?.level === "risk") item.htRisk += 1;
      else item.htNormal += 1;

      if (r.dmResult?.level === "danger") item.dmDanger += 1;
      else if (r.dmResult?.level === "risk") item.dmRisk += 1;
      else item.dmNormal += 1;
    });

    const list = Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const maxMonthlyTotal = Math.max(...list.map(l => l.total), 1);
    const totalScreenings = list.reduce((sum, l) => sum + l.total, 0);
    const avgScreeningPerMonth = list.length > 0 ? Math.round(totalScreenings / list.length) : 0;
    const peakMonth = [...list].sort((a, b) => b.total - a.total)[0] || null;

    return {
      list,
      maxMonthlyTotal,
      totalScreenings,
      avgScreeningPerMonth,
      peakMonth
    };
  }, [records, filterModel, filterDistrict, filterSubdistrict, filterTargetArea, filterParticipantType]);

  // Password Modal state for Export/Import
  const [passwordModalConfig, setPasswordModalConfig] = useState<{
    isOpen: boolean;
    action: 'export' | 'import' | null;
  }>({ isOpen: false, action: null });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic options for filters strictly adhering to official location configuration
  const availableDistricts = useMemo(() => {
    const districtsSet = new Set<string>();
    const isModelVillage = filterModel.includes("หมู่บ้าน") && !filterModel.includes("ตำบล");
    const isModelSubdistrict = filterModel.includes("ตำบล") && !filterModel.includes("หมู่บ้าน");

    if (isModelVillage) {
      Object.keys(LOCATION_DATA["หมู่บ้าน"]).forEach(d => {
        if (d !== "เมืองสตูล") districtsSet.add(cleanDistrict(d));
      });
    } else if (isModelSubdistrict) {
      Object.keys(LOCATION_DATA["ตำบล"]).forEach(d => {
        if (d !== "เมืองสตูล") districtsSet.add(cleanDistrict(d));
      });
    } else {
      ["ควนกาหลง", "ทุ่งหว้า", "มะนัง", "เมือง", "ละงู"].forEach(d => districtsSet.add(d));
    }

    return Array.from(districtsSet) as DistrictType[];
  }, [filterModel]);

  const availableSubdistricts = useMemo(() => {
    const subdistSet = new Set<string>();
    const isModelVillage = filterModel.includes("หมู่บ้าน") && !filterModel.includes("ตำบล");
    const isModelSubdistrict = filterModel.includes("ตำบล") && !filterModel.includes("หมู่บ้าน");

    const targetDistricts = filterDistrict.length > 0 
      ? filterDistrict.map(cleanDistrict) 
      : (availableDistricts as string[]);

    targetDistricts.forEach(dist => {
      if (isModelVillage) {
        const dData = (LOCATION_DATA["หมู่บ้าน"] as any)?.[dist];
        if (dData) Object.keys(dData).forEach(s => subdistSet.add(cleanSubdistrict(s)));
      } else if (isModelSubdistrict) {
        const dData = (LOCATION_DATA["ตำบล"] as any)?.[dist];
        if (dData) Object.keys(dData).forEach(s => subdistSet.add(cleanSubdistrict(s)));
      } else {
        const dMap = DISTRICT_SUBDISTRICT_MAP[dist as DistrictType];
        if (dMap) Object.keys(dMap).forEach(s => subdistSet.add(cleanSubdistrict(s)));
      }
    });

    return Array.from(subdistSet);
  }, [filterModel, filterDistrict, availableDistricts]);

  const availableTargetAreas = useMemo(() => {
    const areaSet = new Set<string>();
    const isModelVillage = filterModel.includes("หมู่บ้าน") && !filterModel.includes("ตำบล");
    const isModelSubdistrict = filterModel.includes("ตำบล") && !filterModel.includes("หมู่บ้าน");

    const targetDistricts = filterDistrict.length > 0 
      ? filterDistrict.map(cleanDistrict) 
      : (availableDistricts as string[]);

    targetDistricts.forEach(dist => {
      const modelsToCheck = isModelVillage ? ["หมู่บ้าน"] : (isModelSubdistrict ? ["ตำบล"] : ["หมู่บ้าน", "ตำบล"]);
      modelsToCheck.forEach(m => {
        const distData = (LOCATION_DATA[m as keyof typeof LOCATION_DATA] as any)?.[dist];
        if (distData) {
          Object.entries(distData).forEach(([sub, areas]) => {
            if (filterSubdistrict.length === 0 || matchesSubdistrictFilter(cleanSubdistrict(sub), filterSubdistrict)) {
              (areas as string[]).forEach(a => areaSet.add(cleanTargetArea(a)));
            }
          });
        }
      });
    });

    return Array.from(areaSet);
  }, [filterModel, filterDistrict, filterSubdistrict, availableDistricts]);

  // Cascading dropdown updates for filters - only filter out invalid options rather than hard clearing
  useEffect(() => {
    if (filterDistrict.length > 0 && availableDistricts.length > 0) {
      const validDistricts = filterDistrict.filter(d => 
        availableDistricts.some(ad => cleanDistrict(ad) === cleanDistrict(d) || ad === d)
      );
      if (validDistricts.length !== filterDistrict.length) {
        setFilterDistrict(validDistricts);
      }
    }
  }, [availableDistricts]);

  useEffect(() => {
    if (filterSubdistrict.length > 0 && availableSubdistricts.length > 0) {
      const validSubdistricts = filterSubdistrict.filter(s => 
        availableSubdistricts.some(as => cleanSubdistrict(as) === cleanSubdistrict(s) || as === s)
      );
      if (validSubdistricts.length !== filterSubdistrict.length) {
        setFilterSubdistrict(validSubdistricts);
      }
    }
  }, [availableSubdistricts]);

  useEffect(() => {
    if (filterTargetArea.length > 0 && availableTargetAreas.length > 0) {
      const validAreas = filterTargetArea.filter(a => 
        availableTargetAreas.some(aa => cleanTargetArea(aa) === cleanTargetArea(a) || aa === a)
      );
      if (validAreas.length !== filterTargetArea.length) {
        setFilterTargetArea(validAreas);
      }
    }
  }, [availableTargetAreas]);

  // Patient visit mapping to determine latest record and multi-visit status
  const patientVisitMapping = useMemo(() => {
    const map: Record<string, { total: number; latestVisitNumber: number; latestRecordId: number; latestDate: string; records: ScreeningRecord[] }> = {};
    (records || []).forEach(r => {
      if (!r) return;
      const key = `${r.name}_${r.phone || ""}`;
      const vNum = r.visitNumber || 1;
      if (!map[key]) {
        map[key] = {
          total: 1,
          latestVisitNumber: vNum,
          latestRecordId: r.id,
          latestDate: r.date || "",
          records: [r]
        };
      } else {
        map[key].total += 1;
        map[key].records.push(r);
        if (vNum > map[key].latestVisitNumber || (vNum === map[key].latestVisitNumber && (r.date || "") >= map[key].latestDate)) {
          map[key].latestVisitNumber = vNum;
          map[key].latestRecordId = r.id;
          map[key].latestDate = r.date || "";
        }
      }
    });
    return map;
  }, [records]);

  // Discover all distinct visit numbers in the dataset
  const availableVisitNumbers = useMemo(() => {
    const set = new Set<number>();
    (records || []).forEach(r => {
      if (r) set.add(r.visitNumber || 1);
    });
    const arr = Array.from(set).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [1];
  }, [records]);

  // Compute visit distribution counts across all records
  const visitDistribution = useMemo(() => {
    const counts: Record<number, number> = {};
    let totalUniquePeople = 0;
    let peopleWithFollowUp = 0;

    Object.values(patientVisitMapping).forEach(p => {
      totalUniquePeople++;
      if (p.total > 1) peopleWithFollowUp++;
    });

    (records || []).forEach(r => {
      if (!r) return;
      const vNum = r.visitNumber || 1;
      counts[vNum] = (counts[vNum] || 0) + 1;
    });

    return {
      counts,
      totalUniquePeople,
      peopleWithFollowUp,
      followUpPercentage: totalUniquePeople > 0 ? Math.round((peopleWithFollowUp / totalUniquePeople) * 100) : 0
    };
  }, [records, patientVisitMapping]);

  // Apply filters and sorting
  const filteredRecords = useMemo(() => {
    return (records || [])
      .filter((r) => {
        if (!r) return false;
        
        // Name / Phone match
        const matchesSearch = 
          ((r.name || "").toLowerCase().includes(searchTerm.toLowerCase())) || 
          ((r.phone || "").includes(searchTerm));
        
        // Model type filter
        const matchesModel = matchesModelFilter(r, filterModel);

        // District filter
        const matchesDistrict = matchesDistrictFilter(r.district, filterDistrict);

        // Subdistrict filter
        const recordSubdistrict = cleanSubdistrict(r.subdistrict || getRecordSubdistrict(r));
        const matchesSubdistrict = matchesSubdistrictFilter(recordSubdistrict, filterSubdistrict);

        // Target Area filter
        const matchesTargetArea = matchesTargetAreaFilter(r.targetArea, filterTargetArea);

        // Visit Scope filter
        const key = `${r.name}_${r.phone || ""}`;
        const patientInfo = patientVisitMapping[key];
        const vNum = r.visitNumber || 1;

        if (filterVisitScope === "latest_only") {
          if (patientInfo && patientInfo.latestRecordId !== r.id) {
            return false;
          }
        } else if (filterVisitScope === "followup_only") {
          if (!patientInfo || patientInfo.total < 2) {
            return false;
          }
        } else if (filterVisitScope === "initial_only") {
          if (vNum !== 1) {
            return false;
          }
        }

        // Specific Visit Numbers filter
        if (filterVisitNumbers.length > 0) {
          if (!filterVisitNumbers.includes(vNum)) {
            return false;
          }
        }

        // Risk Level filter
        let rLevel = "normal";
        const htLevel = r.htResult?.level || "normal";
        const dmLevel = r.dmResult?.level || "normal";
        
        const matchesHtRisk = filterHtRisk.length > 0 ? filterHtRisk.includes(htLevel) : true;
        const matchesDmRisk = filterDmRisk.length > 0 ? filterDmRisk.includes(dmLevel) : true;
        const matchesRisk = matchesHtRisk && matchesDmRisk;

        // Behavior Risk Filter (3อ. 2ส.)
        let matchesBehavior = true;
        if (filterBehaviorRisk.length > 0) {
          matchesBehavior = filterBehaviorRisk.some(riskType => {
            if (riskType === "food") {
              return (r.foodHabit?.sweet?.level === "เสี่ยงสูงมาก" || r.foodHabit?.sweet?.level === "เสี่ยงสูง" || r.foodHabit?.fat?.level === "เสี่ยงสูงมาก" || r.foodHabit?.fat?.level === "เสี่ยงสูง" || r.foodHabit?.salt?.level === "เสี่ยงสูงมาก" || r.foodHabit?.salt?.level === "เสี่ยงสูง" || r.sodium?.includes("เค็มประจำ"));
            } else if (riskType === "exercise") {
              return (r.exercise?.includes("ไม่ออก") || r.exercise?.includes("นั่งนิ่ง"));
            } else if (riskType === "sleep") {
              return (r.sleep?.includes("น้อยกว่า 6") || r.sleep?.includes("ไม่เพียงพอ"));
            } else if (riskType === "smoking") {
              return (r.smoking?.includes("สูบอยู่") || r.smoking?.includes("ประจำ"));
            } else if (riskType === "alcohol") {
              return (r.alcohol?.includes("ประจำ") || r.alcohol?.includes("ครั้งคราว"));
            } else if (riskType === "bmi_risk") {
              const b = parseFloat(r.bmi);
              return (!isNaN(b) && b >= 23.0);
            } else if (riskType === "low_water") {
              return Boolean(r.water?.includes("น้อยกว่า 6"));
            } else if (riskType === "waist_risk") {
              if (!r.waist || r.waist <= 0) return false;
              return r.gender === "ชาย" ? r.waist >= 36 : r.waist >= 32;
            }
            return false;
          });
        }

        // Participant Type Filter (กลุ่มเป้าหมายโครงการ / คณะทำงาน)
        const pType = r.participantType || "กลุ่มเป้าหมายโครงการ";
        const matchesParticipantType = filterParticipantType.length > 0 
          ? filterParticipantType.includes(pType) 
          : true;

        // Month-Year Filter (ช่วงวันที่ เดือน-ปี)
        let matchesMonthYear = true;
        if (filterMonthMode === "single" && filterSelectedMonth) {
          const recYm = parseDateToIso(r.date).substring(0, 7);
          matchesMonthYear = recYm === filterSelectedMonth;
        } else if (filterMonthMode === "range") {
          const recYm = parseDateToIso(r.date).substring(0, 7);
          if (filterStartMonth && recYm < filterStartMonth) matchesMonthYear = false;
          if (filterEndMonth && recYm > filterEndMonth) matchesMonthYear = false;
        }

        return matchesSearch && matchesModel && matchesDistrict && matchesSubdistrict && matchesTargetArea && matchesRisk && matchesBehavior && matchesParticipantType && matchesMonthYear;
      })
      .sort((a, b) => {
        let valA: any = a.id;
        let valB: any = b.id;

        if (sortBy === "name") {
          valA = a.name;
          valB = b.name;
        } else if (sortBy === "age") {
          valA = a.age;
          valB = b.age;
        } else if (sortBy === "bmi") {
          valA = parseFloat(a.bmi);
          valB = parseFloat(b.bmi);
        } else if (sortBy === "visitNumber") {
          valA = a.visitNumber || 1;
          valB = b.visitNumber || 1;
        } else if (sortBy === "date") {
          valA = a.date || "";
          valB = b.date || "";
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [records, searchTerm, filterModel, filterDistrict, filterSubdistrict, filterTargetArea, filterVisitScope, filterVisitNumbers, filterHtRisk, filterDmRisk, filterBehaviorRisk, filterParticipantType, filterMonthMode, filterSelectedMonth, filterStartMonth, filterEndMonth, sortBy, sortOrder, patientVisitMapping]);

  // Stat computations based on filteredRecords
  const stats = useMemo(() => {
    let total = filteredRecords.length;
    let normal = 0;
    let risk = 0;
    let danger = 0;

    let htNormal = 0, htRisk = 0, htDanger = 0;
    let dmNormal = 0, dmRisk = 0, dmDanger = 0;

    // Lifestyle tallies
    let smokeCount = 0;
    let alcoholCount = 0;
    let sodiumCount = 0;
    let noExerciseCount = 0;
    let poorSleepCount = 0;
    let lowWaterCount = 0;
    let adequateWaterCount = 0;

    let foodSweetCount = 0;
    let foodFatCount = 0;
    let foodSaltCount = 0;
    let bmiUnderweight = 0;
    let bmiNormal = 0;
    let bmiOverweight = 0;
    let bmiObese1 = 0;
    let bmiObese2 = 0;
    let foodAnyRiskCount = 0;

    // Waist circumference (inches) tallies
    let waistRecordedCount = 0;
    let waistSum = 0;
    let waistExceedCount = 0; // ชาย >= 36 นิ้ว (90 ซม.), หญิง >= 32 นิ้ว (80 ซม.)
    let waistNormalCount = 0;

    filteredRecords.forEach((r) => {
      if (!r) return;
      
      const htLevel = r.htResult?.level || "normal";
      const dmLevel = r.dmResult?.level || "normal";

      // Main group breakdown
      if (htLevel === "danger" || dmLevel === "danger") {
        danger++;
      } else if (htLevel === "risk" || dmLevel === "risk") {
        risk++;
      } else {
        normal++;
      }

      // HT specific breakdown
      if (htLevel === "danger") htDanger++;
      else if (htLevel === "risk") htRisk++;
      else htNormal++;

      // DM specific breakdown
      if (dmLevel === "danger") dmDanger++;
      else if (dmLevel === "risk") dmRisk++;
      else dmNormal++;

      // Lifestyle risks tallies
      const isSmoke = r.smoking?.includes("สูบอยู่") || r.smoking?.includes("ประจำ");
      if (isSmoke) smokeCount++;
      
      const isAlcohol = r.alcohol?.includes("ประจำ") || r.alcohol?.includes("ครั้งคราว");
      if (isAlcohol) alcoholCount++;
      
      if (r.exercise?.includes("ไม่ออก") || r.exercise?.includes("นั่งนิ่ง")) noExerciseCount++;
      if (r.sleep?.includes("น้อยกว่า 6") || r.sleep?.includes("ไม่เพียงพอ")) poorSleepCount++;

      if (r.water?.includes("น้อยกว่า 6")) {
        lowWaterCount++;
      } else if (r.water) {
        adequateWaterCount++;
      }

      const hasSweetRisk = r.foodHabit?.sweet?.level === "เสี่ยงสูงมาก" || r.foodHabit?.sweet?.level === "เสี่ยงสูง";
      const hasFatRisk = r.foodHabit?.fat?.level === "เสี่ยงสูงมาก" || r.foodHabit?.fat?.level === "เสี่ยงสูง";
      const hasSaltRisk = r.foodHabit?.salt?.level === "เสี่ยงสูงมาก" || r.foodHabit?.salt?.level === "เสี่ยงสูง" || r.sodium?.includes("เค็มประจำ");

      if (hasSweetRisk) foodSweetCount++;
      if (hasFatRisk) foodFatCount++;
      if (hasSaltRisk) foodSaltCount++;

      // BMI breakdown
      const bmiVal = parseFloat(r.bmi);
      if (!isNaN(bmiVal) && bmiVal > 0) {
        if (bmiVal < 18.5) bmiUnderweight++;
        else if (bmiVal < 23.0) bmiNormal++;
        else if (bmiVal < 25.0) bmiOverweight++;
        else if (bmiVal < 30.0) bmiObese1++;
        else bmiObese2++;
      }

      // Waist circumference (inches) breakdown
      if (r.waist !== undefined && r.waist !== null && Number(r.waist) > 0) {
        const w = Number(r.waist);
        waistRecordedCount++;
        waistSum += w;
        const isExceed = r.gender === "ชาย" ? w >= 36 : w >= 32;
        if (isExceed) waistExceedCount++;
        else waistNormalCount++;
      }
      
      if (hasSweetRisk || hasFatRisk || r.sodium?.includes("เค็มประจำ") || r.foodHabit?.salt?.level === "เสี่ยงสูงมาก" || r.foodHabit?.salt?.level === "เสี่ยงสูง") {
        foodAnyRiskCount++;
      }
    });


    return {
      total,
      normal,
      risk,
      danger,
      ht: { normal: htNormal, risk: htRisk, danger: htDanger },
      dm: { normal: dmNormal, risk: dmRisk, danger: dmDanger },
      bmiStats: { underweight: bmiUnderweight, normal: bmiNormal, overweight: bmiOverweight, obese1: bmiObese1, obese2: bmiObese2 },
      waistStats: {
        recordedCount: waistRecordedCount,
        avgWaist: waistRecordedCount > 0 ? (waistSum / waistRecordedCount).toFixed(1) : null,
        exceedCount: waistExceedCount,
        normalCount: waistNormalCount,
        exceedPct: waistRecordedCount > 0 ? Math.round((waistExceedCount / waistRecordedCount) * 100) : 0
      },
      lifestyle: { 
        smokeCount, 
        alcoholCount, 
        sodiumCount, 
        noExerciseCount,
        poorSleepCount,
        lowWaterCount,
        adequateWaterCount,
        foodSweetCount,
        foodFatCount,
        foodSaltCount,
        foodAnyRiskCount
      }
    };
  }, [filteredRecords]);

  const interpretation = useMemo(() => {
    if (stats.total === 0) return null;

    const total = stats.total;
    const normalPct = Math.round((stats.normal / total) * 100);
    const riskPct = Math.round((stats.risk / total) * 100);
    const dangerPct = Math.round((stats.danger / total) * 100);
    const totalUnhealthyPct = riskPct + dangerPct;

    const htRiskDanger = stats.ht.risk + stats.ht.danger;
    const dmRiskDanger = stats.dm.risk + stats.dm.danger;
    const htRiskDangerPct = Math.round((htRiskDanger / total) * 100);
    const dmRiskDangerPct = Math.round((dmRiskDanger / total) * 100);

    let mainIssue = "โรคความดันโลหิตสูง (HT)";
    let mainIssuePct = htRiskDangerPct;
    if (dmRiskDangerPct > htRiskDangerPct) {
      mainIssue = "โรคเบาหวาน (DM)";
      mainIssuePct = dmRiskDangerPct;
    } else if (dmRiskDangerPct === htRiskDangerPct && htRiskDangerPct > 0) {
      mainIssue = "โรคความดันโลหิตสูง (HT) และโรคเบาหวาน (DM)";
    }

    const behaviors = [
      { name: "การรับประทานรสหวานจัด (อ.อาหาร)", count: stats.lifestyle.foodSweetCount, pct: Math.round((stats.lifestyle.foodSweetCount / total) * 100) },
      { name: "การรับประทานอาหารทอด/ไขมันสูง (อ.อาหาร)", count: stats.lifestyle.foodFatCount, pct: Math.round((stats.lifestyle.foodFatCount / total) * 100) },
      { name: "การรับประทานเค็มจัด/ปรุงรสเค็ม (อ.อาหาร)", count: stats.lifestyle.foodSaltCount, pct: Math.round((stats.lifestyle.foodSaltCount / total) * 100) },
      { name: "การดื่มน้ำเปล่าน้อยกว่า 6 แก้ว/วัน (อ.อาหาร)", count: stats.lifestyle.lowWaterCount, pct: Math.round((stats.lifestyle.lowWaterCount / total) * 100) },
      { name: "การขาดการออกกำลังกาย (อ.ออกกำลังกาย)", count: stats.lifestyle.noExerciseCount, pct: Math.round((stats.lifestyle.noExerciseCount / total) * 100) },
      { name: "การนอนหลับพักผ่อนไม่เพียงพอ (อ.อารมณ์)", count: stats.lifestyle.poorSleepCount, pct: Math.round((stats.lifestyle.poorSleepCount / total) * 100) },
      { name: "การสูบบุหรี่ประจำ (ส.สูบ)", count: stats.lifestyle.smokeCount, pct: Math.round((stats.lifestyle.smokeCount / total) * 100) },
      { name: "การดื่มเครื่องดื่มแอลกอฮอล์ (ส.สุรา)", count: stats.lifestyle.alcoholCount, pct: Math.round((stats.lifestyle.alcoholCount / total) * 100) },
    ];
    
    // Fix percentages for salt
    behaviors[2].pct = Math.round((stats.lifestyle.foodSaltCount / total) * 100);

    const sortedBehaviors = [...behaviors].sort((a, b) => b.count - a.count);
    const topBehavior = sortedBehaviors[0];

    const bmiOverweightTotal = stats.bmiStats.overweight + stats.bmiStats.obese1 + stats.bmiStats.obese2;
    const bmiOverweightPct = Math.round((bmiOverweightTotal / total) * 100);
    const lowWaterPct = Math.round((stats.lifestyle.lowWaterCount / total) * 100);
    const adequateWaterPct = Math.round((stats.lifestyle.adequateWaterCount / total) * 100);

    return {
      total,
      normalPct,
      riskPct,
      dangerPct,
      totalUnhealthyPct,
      mainIssue,
      mainIssuePct,
      topBehavior,
      bmiOverweightTotal,
      bmiOverweightPct,
      waistStats: stats.waistStats,
      lowWaterCount: stats.lifestyle.lowWaterCount,
      lowWaterPct,
      adequateWaterCount: stats.lifestyle.adequateWaterCount,
      adequateWaterPct,
      allBehaviors: behaviors
    };
  }, [stats]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // CSV Data Export function
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    
    // Construct rows with visit tracking metadata
    const headers = ["ID", "Date", "VisitNumber", "VisitType", "IsLatestVisit", "TotalVisitsForPerson", "Name", "Age", "Gender", "Phone", "District", "TargetArea", "BMI", "Waist_Inches", "BP_Systolic", "BP_Diastolic", "HT_Result", "BloodSugar", "DM_Result", "Water_Intake", "FollowUpAction"];
    const rows = filteredRecords.map((r) => {
      const key = `${r.name}_${r.phone || ""}`;
      const pInfo = patientVisitMapping[key];
      const isLatest = pInfo ? pInfo.latestRecordId === r.id : true;
      const vNum = r.visitNumber || 1;
      const visitType = vNum === 1 ? "คัดกรองแรกรับ" : `ติดตามครั้งที่ ${vNum - 1}`;
      return [
        r.id,
        formatThaiDate(r.date, "slash"),
        vNum,
        `"${visitType}"`,
        isLatest ? "ใช่ (ผลล่าสุด)" : "ประวัติครั้งก่อน",
        pInfo ? pInfo.total : 1,
        `"${maskPatientName(r.name, hideNames, r.id)}"`,
        r.age,
        r.gender,
        maskPhoneNumber(r.phone, hideNames),
        r.district,
        `"${r.targetArea}"`,
        r.bmi,
        r.waist && r.waist > 0 ? r.waist : "",
        r.bpSys,
        r.bpDia,
        r.htResult?.level || "",
        r.sugar,
        r.dmResult?.level || "",
        `"${r.water || ""}"`,
        `"${r.followUpAction || ""}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ncd_screening_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeExportBackup = () => {
    if (records.length === 0) {
      alert("ไม่มีข้อมูลสำหรับสำรองข้อมูล");
      return;
    }
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ncd_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const openPasswordModal = (action: 'export' | 'import') => {
    setPasswordModalConfig({ isOpen: true, action });
    setPasswordInput("");
    setPasswordError("");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "0849999394") {
      setPasswordError("");
      const action = passwordModalConfig.action;
      
      if (action === 'export') {
        setIsBackupModalOpen(true);
        setPasswordModalConfig({ isOpen: false, action: null });
      } else if (action === 'import') {
        setIsImportModalOpen(true);
        setPasswordModalConfig({ isOpen: false, action: null });
      }
      setPasswordInput("");
    } else {
      setPasswordError("รหัสผ่านไม่ถูกต้อง");
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          if (onImportRecords) {
            onImportRecords(importedData);
          } else {
            alert("ฟังก์ชันนำเข้ายังไม่เปิดใช้งาน");
          }
        } else {
          alert("รูปแบบไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์ JSON ที่ได้จากการสำรองข้อมูล");
        }
      } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบว่าไฟล์ถูกต้องหรือไม่");
      }
    };
    reader.readAsText(file);
    // Reset input value so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="space-y-6">

      {/* Cascading Location & Model Filters (Top-Level) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">กรองข้อมูลโมเดลและพื้นที่โครงการ</h3>
              <p className="text-[10px] text-slate-500">กรองสถิติและการคัดกรองทั้งหมดตามข้อมูลโมเดล อำเภอ ตำบล และพื้นที่เป้าหมาย</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            {onOpenExecutiveReport && (
              <button
                type="button"
                onClick={onOpenExecutiveReport}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์รายงานผู้บริหาร & ติดตามโครงการ (แยกรายโมเดล)</span>
              </button>
            )}
            {/* Quick Clear Filter Button if any selected */}
            {(filterModel.length > 0 || filterDistrict.length > 0 || filterSubdistrict.length > 0 || filterTargetArea.length > 0) && (
              <button 
                onClick={() => {
                  setFilterModel([]);
                  setFilterDistrict([]);
                  setFilterSubdistrict([]);
                  setFilterTargetArea([]);
                }}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ล้างตัวกรองพื้นที่ทั้งหมด
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Model Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">โมเดล</label>
            <MultiSelectDropdown 
              options={["หมู่บ้าน", "ตำบล"]}
              selected={filterModel}
              onChange={setFilterModel}
              placeholder="ทั้งหมด (หมู่บ้าน / ตำบล)"
            />
          </div>

          {/* 2. District Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">อำเภอ</label>
            <MultiSelectDropdown 
              options={availableDistricts}
              selected={filterDistrict}
              onChange={setFilterDistrict}
              placeholder="ทุกอำเภอ"
              labelKey={(v) => `อ.${v}`}
            />
          </div>

          {/* 3. Subdistrict Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">ตำบล</label>
            <MultiSelectDropdown 
              options={availableSubdistricts}
              selected={filterSubdistrict}
              onChange={setFilterSubdistrict}
              placeholder="ทุกตำบล"
              disabled={false}
              labelKey={(v) => `ต.${v}`}
            />
          </div>

          {/* 4. Target Area Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">พื้นที่เป้าหมาย / หมู่บ้าน</label>
            <MultiSelectDropdown 
              options={availableTargetAreas}
              selected={filterTargetArea}
              onChange={setFilterTargetArea}
              placeholder="ทุกพื้นที่เป้าหมาย / หมู่บ้าน"
              disabled={false}
            />
          </div>

        </div>

        {/* Participant Category Filter Bar */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              รายงานตามประเภทกลุ่มข้อมูล:
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              (เลือกรายงานเฉพาะกลุ่มเป้าหมายโครงการ หรือ คณะทำงาน)
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterParticipantType([])}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border cursor-pointer ${
                filterParticipantType.length === 0
                  ? "bg-slate-800 text-white border-slate-800 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              ทั้งหมด ({participantDistribution.total})
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterParticipantType(prev => 
                  prev.includes("กลุ่มเป้าหมายโครงการ") && prev.length === 1
                    ? [] 
                    : ["กลุ่มเป้าหมายโครงการ"]
                );
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                filterParticipantType.includes("กลุ่มเป้าหมายโครงการ")
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                  : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
              }`}
            >
              <span>1. กลุ่มเป้าหมายโครงการ</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterParticipantType.includes("กลุ่มเป้าหมายโครงการ")
                  ? "bg-white/20 text-white"
                  : "bg-blue-100 text-blue-800"
              }`}>
                {participantDistribution.targetCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterParticipantType(prev => 
                  prev.includes("คณะทำงาน") && prev.length === 1
                    ? [] 
                    : ["คณะทำงาน"]
                );
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                filterParticipantType.includes("คณะทำงาน")
                  ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                  : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
              }`}
            >
              <span>2. คณะทำงาน</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterParticipantType.includes("คณะทำงาน")
                  ? "bg-white/20 text-white"
                  : "bg-purple-100 text-purple-800"
              }`}>
                {participantDistribution.committeeCount}
              </span>
            </button>
          </div>
        </div>

        {/* Month-Year Filter Bar (ช่วงวันที่ เดือน-ปี) */}
        <div className="pt-3.5 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
              กรองช่วงเดือน-ปี (Month-Year):
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              (เลือกสรุปและดูข้อมูลตามเดือนหรือช่วงเดือนที่ตรวจ)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode selection buttons */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setFilterMonthMode("all");
                  setFilterSelectedMonth("");
                  setFilterStartMonth("");
                  setFilterEndMonth("");
                }}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMonthMode === "all"
                    ? "bg-white text-indigo-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                ทุกช่วงเวลา
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMonthMode("single");
                  if (!filterSelectedMonth && availableMonths.length > 0) {
                    setFilterSelectedMonth(availableMonths[0].key);
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMonthMode === "single"
                    ? "bg-white text-indigo-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                เลือกเฉพาะเดือน
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMonthMode("range");
                  if (!filterStartMonth && availableMonths.length > 0) {
                    setFilterEndMonth(availableMonths[0].key);
                    const oldest = availableMonths[availableMonths.length - 1].key;
                    setFilterStartMonth(oldest);
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterMonthMode === "range"
                    ? "bg-white text-indigo-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                ระบุช่วงเดือน (Range)
              </button>
            </div>

            {/* If Single Month Mode */}
            {filterMonthMode === "single" && (
              <div className="flex items-center gap-1.5">
                <select
                  value={filterSelectedMonth}
                  onChange={(e) => setFilterSelectedMonth(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                >
                  <option value="">เลือกเดือน-ปี...</option>
                  {availableMonths.map(m => (
                    <option key={m.key} value={m.key}>
                      {m.label} ({m.count} เคส)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* If Range Mode */}
            {filterMonthMode === "range" && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500">ตั้งแต่</span>
                <select
                  value={filterStartMonth}
                  onChange={(e) => setFilterStartMonth(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                >
                  <option value="">ตั้งแต่เริ่มต้น</option>
                  {[...availableMonths].reverse().map(m => (
                    <option key={m.key} value={m.key}>
                      {m.labelShort}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] font-bold text-slate-500">ถึง</span>
                <select
                  value={filterEndMonth}
                  onChange={(e) => setFilterEndMonth(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                >
                  <option value="">ถึงปัจจุบัน</option>
                  {availableMonths.map(m => (
                    <option key={m.key} value={m.key}>
                      {m.labelShort}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Presets */}
            {availableMonths.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="กรองเฉพาะเดือนล่าสุด"
                  onClick={() => {
                    setFilterMonthMode("single");
                    setFilterSelectedMonth(availableMonths[0].key);
                  }}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  เดือนล่าสุด
                </button>
                {availableMonths.length >= 3 && (
                  <button
                    type="button"
                    title="กรองช่วง 3 เดือนล่าสุด"
                    onClick={() => {
                      setFilterMonthMode("range");
                      setFilterEndMonth(availableMonths[0].key);
                      setFilterStartMonth(availableMonths[Math.min(2, availableMonths.length - 1)].key);
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    3 เดือนล่าสุด
                  </button>
                )}
              </div>
            )}

            {/* Clear Month Filter button */}
            {filterMonthMode !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setFilterMonthMode("all");
                  setFilterSelectedMonth("");
                  setFilterStartMonth("");
                  setFilterEndMonth("");
                }}
                className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                ล้างเดือน
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Follow-up Visit Classifier & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-50/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">จำแนกและคัดกรองครั้งที่ติดตาม (Follow-up Visits)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ติดตามต่อเนื่อง {visitDistribution.peopleWithFollowUp} คน ({visitDistribution.followUpPercentage}%)
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                จำแนกดูข้อมูลตามรอบการตรวจ เพื่อติดตามการเปลี่ยนแปลงสุขภาพรายบุคคลและการดำเนินงานโครงการ
              </p>
            </div>
          </div>

          {/* Reset Visit Filter button */}
          {(filterVisitScope !== "all" || filterVisitNumbers.length > 0) && (
            <button 
              onClick={() => {
                setFilterVisitScope("all");
                setFilterVisitNumbers([]);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50/70 hover:bg-indigo-100/70 px-3 py-1.5 rounded-xl transition-all cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              รีเซ็ตตัวกรองครั้งที่ติดตาม
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Scope selection buttons */}
          <div className="lg:col-span-7 space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400">
              ขอบเขตการดูข้อมูล (Cohort Scope):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setFilterVisitScope("all")}
                className={`text-xs px-3 py-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                  filterVisitScope === "all"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                <span>ทุกครั้งที่ตรวจ</span>
                <span className={`text-[10px] font-medium ${filterVisitScope === "all" ? "text-indigo-100" : "text-slate-400"}`}>
                  {records.length} บันทึก
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterVisitScope("latest_only")}
                className={`text-xs px-3 py-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                  filterVisitScope === "latest_only"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                <span>ผลล่าสุดรายบุคคล</span>
                <span className={`text-[10px] font-medium ${filterVisitScope === "latest_only" ? "text-indigo-100" : "text-slate-400"}`}>
                  {visitDistribution.totalUniquePeople} คน (ไม่นับซ้ำ)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterVisitScope("followup_only")}
                className={`text-xs px-3 py-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                  filterVisitScope === "followup_only"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                <span>ติดตามต่อเนื่อง</span>
                <span className={`text-[10px] font-medium ${filterVisitScope === "followup_only" ? "text-indigo-100" : "text-slate-400"}`}>
                  ตรวจ ≥ 2 ครั้ง ({visitDistribution.peopleWithFollowUp} คน)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterVisitScope("initial_only")}
                className={`text-xs px-3 py-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                  filterVisitScope === "initial_only"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                <span>คัดกรองแรกรับ</span>
                <span className={`text-[10px] font-medium ${filterVisitScope === "initial_only" ? "text-indigo-100" : "text-slate-400"}`}>
                  เฉพาะครั้งที่ 1 ({visitDistribution.counts[1] || 0} ราย)
                </span>
              </button>
            </div>
          </div>

          {/* Specific Visit Pills */}
          <div className="lg:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-slate-400">
                เลือกเจาะจงครั้งที่ (Visit Number):
              </label>
              {filterVisitNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterVisitNumbers([])}
                  className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                >
                  ล้างเจาะจง
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              <button
                type="button"
                onClick={() => setFilterVisitNumbers([])}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all border cursor-pointer ${
                  filterVisitNumbers.length === 0
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                ทุกครั้ง
              </button>

              {availableVisitNumbers.map(vNum => {
                const isSelected = filterVisitNumbers.includes(vNum);
                const count = visitDistribution.counts[vNum] || 0;
                return (
                  <button
                    key={vNum}
                    type="button"
                    onClick={() => {
                      setFilterVisitNumbers(prev => 
                        prev.includes(vNum) 
                          ? prev.filter(n => n !== vNum) 
                          : [...prev, vNum]
                      );
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-200"
                    }`}
                  >
                    <span>{vNum === 1 ? "ครั้งที่ 1 (แรกรับ)" : `ครั้งที่ ${vNum}`}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Metric Scorecards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 bg-slate-50 w-16 h-16 rounded-full -z-10 group-hover:scale-110 transition-transform" />
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {filterVisitScope === "latest_only" 
                ? "บุคคลที่คัดกรอง (คน)" 
                : filterVisitScope === "followup_only"
                ? "ผู้รับการติดตามต่อเนื่อง"
                : filterVisitScope === "initial_only"
                ? "คัดกรองแรกรับ (ครั้งที่ 1)"
                : filterVisitNumbers.length > 0
                ? `คัดกรองครั้งที่ ${filterVisitNumbers.join(", ")}`
                : "คัดกรองสะสม"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{stats.total}</span>
              <span className="text-xs font-normal text-slate-400">
                {filterVisitScope === "latest_only" ? "คน" : "บันทึก"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Normal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 relative overflow-hidden group">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">กลุ่มปกติ</span>
            <span className="text-2xl font-black text-slate-800">{stats.normal} <span className="text-xs font-normal text-slate-400">ราย</span></span>
          </div>
        </div>

        {/* Card 3: High Risk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 relative overflow-hidden group">
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">กลุ่มเสี่ยงสูง</span>
            <span className="text-2xl font-black text-slate-800">{stats.risk} <span className="text-xs font-normal text-slate-400">ราย</span></span>
          </div>
        </div>

        {/* Card 4: Danger */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 relative overflow-hidden group">
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">สงสัยป่วย (ส่งต่อ)</span>
            <span className="text-2xl font-black text-slate-800">{stats.danger} <span className="text-xs font-normal text-slate-400">ราย</span></span>
          </div>
        </div>

      </div>

      {/* Row 1: 3 Clinical Doughnut Gauges (HT, BMI, DM) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Hypertension Gauge */}
        <RiskDoughnut 
          normal={stats.ht.normal} 
          risk={stats.ht.risk} 
          danger={stats.ht.danger} 
          title="สัดส่วนความเสี่ยงความดันโลหิตสูง (HT)"
          accentColor="bg-rose-500"
          badgeText="ความดันโลหิต"
        />

        {/* BMI Gauge */}
        <BMIDoughnut 
          underweight={stats.bmiStats.underweight}
          normal={stats.bmiStats.normal}
          overweight={stats.bmiStats.overweight}
          obese1={stats.bmiStats.obese1}
          obese2={stats.bmiStats.obese2}
          title="สัดส่วนดัชนีมวลกาย (BMI)"
        />

        {/* Diabetes Gauge */}
        <RiskDoughnut 
          normal={stats.dm.normal} 
          risk={stats.dm.risk} 
          danger={stats.dm.danger} 
          title="สัดส่วนความเสี่ยงโรคเบาหวาน (DM)"
          accentColor="bg-amber-500"
          badgeText="น้ำตาลปลายนิ้ว"
        />
      </div>

      {/* Row 2: Full-Width Balanced Lifestyle Risks 3O2S Panel */}
      <LifestyleBehaviors3O2S 
        smokeCount={stats.lifestyle.smokeCount}
        alcoholCount={stats.lifestyle.alcoholCount}
        noExerciseCount={stats.lifestyle.noExerciseCount}
        poorSleepCount={stats.lifestyle.poorSleepCount}
        foodSweetCount={stats.lifestyle.foodSweetCount}
        foodFatCount={stats.lifestyle.foodFatCount}
        foodSaltCount={stats.lifestyle.foodSaltCount}
        lowWaterCount={stats.lifestyle.lowWaterCount}
        total={stats.total}
      />

      {/* 4. Health Analysis & Interpretation Panel */}
      {interpretation && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-indigo-500 to-blue-600 text-white p-2.5 rounded-xl shrink-0 shadow-sm">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  แผงแปรผลและวิเคราะห์แนวทางการจัดการความเสี่ยง (Health Data Interpretation Panel)
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">
                  วิเคราะห์ผลสถิติจำนวนประชากรและกลุ่มเสี่ยงตามเกณฑ์กระทรวงสาธารณสุข และแนวทางปฏิบัติเฉพาะรายกลุ่ม
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0">
              สถานะภาพรวมชุมชน: {interpretation.normalPct >= 70 ? "🟢 สุขภาพชุมชนดีเยี่ยม" : interpretation.normalPct >= 40 ? "🟡 ระดับเฝ้าระวังปานกลาง" : "🔴 มีภาวะเสี่ยงสูงในพื้นที่"}
            </span>
          </div>

          {/* Core Insights Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Health summary text */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3.5">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                <span className="bg-slate-200 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono">A</span>
                <span>สรุปการแปรผลลัพธ์เชิงสถิติ (Statistical Conclusions)</span>
              </div>
              <div className="text-xs text-slate-600 leading-relaxed font-semibold space-y-3">
                <p>
                  จากการประมวลผลข้อมูลผู้เข้ารับการคัดกรองโรคไม่ติดต่อเรื้อรัง (NCDs) สะสมจำนวน <strong className="text-slate-800 text-sm font-black font-mono">{interpretation.total}</strong> ราย 
                  ผลการคัดกรองจำแนกตามความรุนแรงหลักมีสัดส่วนกลุ่มปกติร้อยละ <strong className="text-emerald-600 text-sm font-black font-mono">{interpretation.normalPct}%</strong> ({stats.normal} ราย), 
                  กลุ่มเสี่ยงสูงร้อยละ <strong className="text-amber-500 text-sm font-black font-mono">{interpretation.riskPct}%</strong> ({stats.risk} ราย) 
                  และกลุ่มสงสัยป่วยรายใหม่ที่ต้องส่งต่อรักษาต่อร้อยละ <strong className="text-rose-600 text-sm font-black font-mono">{interpretation.dangerPct}%</strong> ({stats.danger} ราย)
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                  <p className="text-[11px] text-slate-500 font-semibold">
                    อัตราความชุกรวมของกลุ่มเสี่ยงสูงและสงสัยป่วยรวมกันคิดเป็น <strong className="text-indigo-600 text-sm font-black font-mono">{interpretation.totalUnhealthyPct}%</strong> ของประชากรที่ประเมินทั้งหมด
                  </p>
                </div>
              </div>
            </div>

            {/* Strategic Warnings */}
            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-4 rounded-xl border border-amber-200/60 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5 text-amber-850 font-bold text-xs">
                  <span className="bg-amber-100 text-amber-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono">B</span>
                  <span>ประเด็นเฝ้าระวังและปัจจัยกระตุ้นหลัก (Key Concern & Stressors)</span>
                </div>
                
                <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed font-semibold">
                  {interpretation.mainIssuePct > 0 ? (
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span><strong>โรคอุบัติการณ์สูงที่สุด:</strong> คือ <strong className="text-rose-700">{interpretation.mainIssue}</strong> โดยมีอัตราความเสี่ยงสะสม (เสี่ยงสูง + สงสัยป่วย) อยู่ที่ <strong className="text-rose-700 text-sm font-black font-mono">{interpretation.mainIssuePct}%</strong> ของจำนวนผู้คัดกรองทั้งหมด</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span><strong>โรคอุบัติการณ์สูงที่สุด:</strong> ยังไม่พบภาวะความดันโลหิตหรือเบาหวานที่ผิดปกติในกลุ่มประชากรที่คัดกรอง</span>
                      </div>
                    </div>
                  )}

                  {interpretation.topBehavior && interpretation.topBehavior.count > 0 ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4.5 h-4.5 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <span><strong>พฤติกรรมเสี่ยงหลัก:</strong> พฤติกรรมเสี่ยงสูงที่สุดที่ตรวจพบคู่ขนาน คือ <strong className="text-orange-700">{interpretation.topBehavior.name}</strong> พบสูงถึง <strong className="text-orange-700 text-sm font-black font-mono">{interpretation.topBehavior.pct}%</strong> ของประชากรทั้งหมด มีความเสี่ยงในการกระตุ้นการตีบตันของหลอดเลือด</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span><strong>พฤติกรรมเสี่ยงหลัก:</strong> ประชากรในกลุ่มตรวจไม่มีพฤติกรรมความเสี่ยงวิกฤตด้านอาหารหรือการนอน</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {interpretation.topBehavior && interpretation.topBehavior.count > 0 && (
                <div className="mt-3 text-[10px] bg-white border border-amber-200 text-amber-850 p-2.5 rounded-xl font-bold flex items-center gap-1.5 leading-tight">
                  <span className="shrink-0 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black font-mono">คำแนะนำเชิงพื้นที่</span>
                  <span>เน้นจัดโครงการควบคุมพฤติกรรม "{interpretation.topBehavior.name.split(" (")[0]}" เป็นมาตรการระดับพื้นที่เร่งด่วนอันดับหนึ่ง</span>
                </div>
              )}
            </div>

            {/* BMI, Waist & Water Intake Analysis */}
            <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-4 rounded-xl border border-indigo-200/60 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-850 font-bold text-xs">
                  <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono">C</span>
                  <span>ดัชนีมวลกาย รอบเอว (นิ้ว) และการดื่มน้ำเปล่า</span>
                </div>
                
                <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed font-semibold">
                  {interpretation.bmiOverweightTotal > 0 ? (
                    <div className="flex items-start gap-2">
                      <Activity className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <span><strong>อัตราน้ำหนักเกินเกณฑ์ (BMI ≥ 23):</strong> พบจำนวน <strong className="text-indigo-700">{interpretation.bmiOverweightTotal}</strong> ราย (<strong className="text-indigo-700 text-sm font-black font-mono">{interpretation.bmiOverweightPct}%</strong>) ซึ่งเสี่ยงต่อโรคความดันและเบาหวาน</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span><strong>ภาวะโภชนาการดี:</strong> ประชากรส่วนใหญ่อยู่ในเกณฑ์มาตรฐาน ไม่พบกลุ่มภาวะน้ำหนักเกิน</span>
                      </div>
                    </div>
                  )}

                  {/* Waist Circumference Summary */}
                  <div className="flex items-start gap-2 pt-1.5 border-t border-indigo-100/80">
                    <Ruler className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      {interpretation.waistStats.recordedCount > 0 ? (
                        <span>
                          <strong>รอบเอวเฉลี่ย:</strong> <strong className="text-violet-700 font-mono">{interpretation.waistStats.avgWaist} นิ้ว</strong> (จาก {interpretation.waistStats.recordedCount} รายที่ระบุ) • รอบเอวเกินเกณฑ์อ้วนลงพุง (ชาย ≥36 / หญิง ≥32 นิ้ว) <strong className="text-rose-600">{interpretation.waistStats.exceedCount} ราย ({interpretation.waistStats.exceedPct}%)</strong>
                        </span>
                      ) : (
                        <span>
                          <strong>ข้อมูลรอบเอว (นิ้ว):</strong> ยังไม่มีรายการที่บันทึกรอบเอวในชุดข้อมูลที่กรอง
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Daily Plain Water Intake Summary */}
                  <div className="flex items-start gap-2 pt-1.5 border-t border-indigo-100/80">
                    <Droplet className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <div>
                      <span>
                        <strong>การดื่มน้ำเปล่าต่อวัน:</strong> ดื่มเพียงพอ (≥6 แก้ว) <strong className="text-emerald-700">{interpretation.adequateWaterCount} ราย ({interpretation.adequateWaterPct}%)</strong> • ดื่มน้อย (&lt;6 แก้ว) <strong className="text-amber-700">{interpretation.lowWaterCount} ราย ({interpretation.lowWaterPct}%)</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {(interpretation.bmiOverweightPct >= 30 || interpretation.waistStats.exceedPct >= 30 || interpretation.lowWaterPct >= 30) && (
                <div className="mt-3 text-[10px] bg-white border border-indigo-200 text-indigo-850 p-2.5 rounded-xl font-bold flex items-center gap-1.5 leading-tight">
                  <span className="shrink-0 bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black font-mono">แนวทางจัดกิจกรรม</span>
                  <span>ส่งเสริมการลดรอบเอว ควบคุมน้ำหนัก และรณรงค์ดื่มน้ำเปล่าสะอาดให้ได้ 6-8 แก้ว/วัน</span>
                </div>
              )}
            </div>
          </div>

          {/* Color coding guidelines / translation */}
          <div className="space-y-3.5 pt-1">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span>🩺 คู่มือเกณฑ์แปรผลทางคลินิกและการดูแลรักษารายกลุ่ม (Clinical Translation & Intervention Protocols)</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Green Group (Normal) */}
              <div className="bg-emerald-50/20 border border-emerald-100 p-4.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-emerald-100/60 pb-2">
                    <span className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      กลุ่มปกติ (ขาว/เขียว)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black font-mono">
                      {interpretation.normalPct}%
                    </span>
                  </div>
                  
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 block uppercase">เกณฑ์ผลตรวจทางการแพทย์</span>
                      <p className="text-slate-700 font-semibold leading-normal">
                        ความดันโลหิต &lt; 120/80 mmHg และระดับน้ำตาลปลายนิ้วหลังอดอาหาร &lt; 100 mg/dL
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 block uppercase">การแปรผลตรวจ</span>
                      <p className="text-slate-500 leading-normal font-semibold">
                        ระดับความดันและน้ำตาลอยู่ในเกณฑ์มาตรฐานดี ไม่พบสัญญาณเสี่ยงต่อการเกิดโรคไม่ติดต่อเรื้อรัง (NCDs)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-emerald-100/60 space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-700 block">แนวทางปฏิบัติ (Action Plan):</span>
                  <ul className="text-[10px] text-slate-500 space-y-1.5 list-disc pl-4 leading-normal font-bold">
                    <li>ป้องกันการเกิดโรคต่อเนื่องด้วยการปฏิบัติตามหลัก 3อ. 2ส. อย่างสม่ำเสมอ</li>
                    <li>นัดหมายตรวจคัดกรองสุขภาพและประเมินซ้ำอย่างน้อยปีละ 1 ครั้ง</li>
                  </ul>
                </div>
              </div>

              {/* Yellow Group (High Risk) */}
              <div className="bg-amber-50/20 border border-amber-200/60 p-4.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-amber-200/40 pb-2">
                    <span className="flex items-center gap-1.5 text-amber-850 font-bold text-xs">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                      กลุ่มเสี่ยงสูง (สีเหลือง)
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black font-mono">
                      {interpretation.riskPct}%
                    </span>
                  </div>
                  
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 block uppercase">เกณฑ์ผลตรวจทางการแพทย์</span>
                      <p className="text-slate-700 font-semibold leading-normal">
                        ความดันโลหิต 120-139 / 80-89 mmHg หรือระดับน้ำตาลปลายนิ้วช่วงอดอาหาร 100-125 mg/dL
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 block uppercase">การแปรผลตรวจ</span>
                      <p className="text-slate-500 leading-normal font-semibold">
                        ร่างกายเริ่มเสื่อมสภาพ มีระดับความเสี่ยงสูงขึ้น หากไม่รีบปรับพฤติกรรมมีโอกาสดำเนินโรคเป็นเบาหวาน/ความดันจริง
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-amber-200/40 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-800 block">แนวทางปฏิบัติ (Action Plan):</span>
                  <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4 leading-normal font-bold">
                    <li>ลดเค็มอย่างเด็ดขาด เลี่ยงอาหารแปรรูป ผงชูรส และการเติมเครื่องปรุงมื้ออาหาร</li>
                    <li>ออกกำลังกายสม่ำเสมอเพื่อเผาผลาญระดับน้ำตาลและเสริมความยืดหยุ่นหลอดเลือด</li>
                    <li>แนะนำเยี่ยมติดตามบันทึกอาการที่บ้าน นัดตรวจและประเมินซ้ำทุก 1-3 เดือน</li>
                  </ul>
                </div>
              </div>

              {/* Red Group (Danger/Suspected) */}
              <div className="bg-rose-50/10 border border-rose-200/80 p-4.5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-rose-200/40 pb-2">
                    <span className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                      <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                      กลุ่มสงสัยรายใหม่ (สีแดง)
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-black font-mono">
                      {interpretation.dangerPct}%
                    </span>
                  </div>
                  
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-rose-700 block uppercase">เกณฑ์ผลตรวจทางการแพทย์</span>
                      <p className="text-slate-700 font-semibold leading-normal">
                        ความดันโลหิต &ge; 140/90 mmHg หรือระดับน้ำตาลปลายนิ้วช่วงอดอาหาร &ge; 126 mg/dL
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-rose-700 block uppercase">การแปรผลตรวจ</span>
                      <p className="text-slate-500 leading-normal font-semibold">
                        พบสัญญาณผิดปกติเด่นชัดระดับวิกฤต เข้าข่ายผู้สงสัยป่วยโรคความดันโลหิตสูงหรือเบาหวานรายใหม่
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-rose-200/40 space-y-1.5">
                  <span className="text-[10px] font-bold text-rose-850 block">แนวทางปฏิบัติ (Action Plan):</span>
                  <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4 leading-normal font-bold">
                    <li className="text-rose-700 font-extrabold">ส่งต่อเข้ารับการตรวจวินิจฉัยและเจาะเลือดทางห้องปฏิบัติการ (Lab) ยืนยันที่ รพ.สต./รพ.ด่วน</li>
                    <li>ลงทะเบียนเข้ารับการรักษาดูแล ควบคุมระดับน้ำตาล/ความดันเพื่อป้องกันสภาวะแทรกซ้อน</li>
                    <li>ให้อสม. ลงเยี่ยมติดตาม แนะนำพฤติกรรม และตรวจสัญญาณชีพสม่ำเสมอทุกสัปดาห์</li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Row 1: Search & Core Actions */}
        <div className="flex flex-col xl:flex-row gap-3.5 items-stretch xl:items-center">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input 
              type="text" 
              placeholder="ค้นหาด้วยชื่อ-นามสกุล หรือเบอร์โทรศัพท์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Visit Number Selector */}
          <div className="w-52 shrink-0">
            <MultiSelectDropdown 
              options={availableVisitNumbers.map(n => n.toString())}
              selected={filterVisitNumbers.map(n => n.toString())}
              onChange={(vals) => setFilterVisitNumbers(vals.map(v => parseInt(v, 10)))}
              placeholder="แสดงทุกครั้งที่ตรวจ"
              labelKey={(v) => {
                const n = parseInt(v, 10);
                return n === 1 ? "ครั้งที่ 1 (แรกรับ)" : `ครั้งที่ ${n} (ติดตาม #${n - 1})`;
              }}
            />
          </div>

          {/* Behavior Risk Selector (3อ. 2ส.) */}
          <div className="w-56 shrink-0">
            <MultiSelectDropdown 
              options={["food", "low_water", "exercise", "sleep", "smoking", "alcohol", "bmi_risk", "waist_risk"]}
              selected={filterBehaviorRisk}
              onChange={setFilterBehaviorRisk}
              placeholder="แสดงทุกพฤติกรรมเสี่ยง"
              labelKey={(v) => {
                const map: Record<string, string> = {
                  food: "อาหาร (กินหวาน/มัน/เค็มจัด)",
                  low_water: "การดื่มน้ำเปล่า (น้อยกว่า 6 แก้ว/วัน)",
                  exercise: "การออกกำลังกาย (ไม่ออกเลย)",
                  sleep: "การนอนหลับ (พักผ่อนไม่เพียงพอ)",
                  smoking: "สูบบุหรี่ (ยังสูบอยู่)",
                  alcohol: "ดื่มแอลกอฮอล์ (ดื่มเป็นประจำ/ครั้งคราว)",
                  bmi_risk: "ดัชนีมวลกาย (BMI ท้วม/อ้วนขึ้นไป)",
                  waist_risk: "รอบเอวเกินเกณฑ์ (ชาย ≥36 / หญิง ≥32 นิ้ว)"
                };
                return map[v] || v;
              }}
            />
          </div>

          {/* Risk Level Selector */}
          <div className="flex flex-col gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 w-12">HT (ความดัน):</span>
              <div className="flex gap-1">
                {['normal', 'risk', 'danger'].map(level => {
                  const labels: Record<string, string> = { normal: 'ปกติ', risk: 'เสี่ยง', danger: 'สงสัยป่วย' };
                  const colors: Record<string, string> = { normal: 'text-emerald-700 bg-emerald-100', risk: 'text-amber-700 bg-amber-100', danger: 'text-rose-700 bg-rose-100' };
                  const isSelected = filterHtRisk.includes(level);
                  return (
                    <button
                      key={level}
                      onClick={() => setFilterHtRisk(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level])}
                      className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-all ${isSelected ? colors[level] + ' ring-1 ring-black/10' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 w-12">DM (เบาหวาน):</span>
              <div className="flex gap-1">
                {['normal', 'risk', 'danger'].map(level => {
                  const labels: Record<string, string> = { normal: 'ปกติ', risk: 'เสี่ยง', danger: 'สงสัยป่วย' };
                  const colors: Record<string, string> = { normal: 'text-emerald-700 bg-emerald-100', risk: 'text-amber-700 bg-amber-100', danger: 'text-rose-700 bg-rose-100' };
                  const isSelected = filterDmRisk.includes(level);
                  return (
                    <button
                      key={level}
                      onClick={() => setFilterDmRisk(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level])}
                      className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-all ${isSelected ? colors[level] + ' ring-1 ring-black/10' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Action: Add Screening */}
            {onAddScreeningClicked && (
              <button
                onClick={onAddScreeningClicked}
                className="bg-blue-600 border border-blue-700 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                เพิ่มการคัดกรอง
              </button>
            )}

              {/* Action: Cloud Sync for all users / Admin */}
              {onSyncCloud && (
                <button
                  onClick={async () => {
                    try {
                      setIsCloudSyncing(true);
                      await onSyncCloud();
                    } finally {
                      setIsCloudSyncing(false);
                    }
                  }}
                  disabled={isCloudSyncing}
                  className="bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 transition-all shadow-3xs"
                  title="ดึงข้อมูลล่าสุดจากระบบคลาวด์ Supabase ให้ตรงกันทุกคน"
                >
                  <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? "animate-spin text-sky-600" : ""}`} />
                  {isCloudSyncing ? "กำลังซิงค์..." : "ซิงค์ข้อมูล Cloud"}
                </button>
              )}

              {isAdmin && (
              <>
              <button
                onClick={async () => {
                  const { supabase } = await import('../lib/supabase');
                  alert("กำลังตรวจสอบและอัปเดตข้อมูลโมเดลตำบลเขาขาว...");
                  const { data, error } = await supabase.from('ncd_records').select('*');
                  if (error) {
                    alert("เกิดข้อผิดพลาด: " + error.message);
                    return;
                  }
                  let updated = 0;
                  const toUpdate = [];
                  data.forEach(row => {
                    const r = row.data;
                    if (r && r.district === "ละงู") {
                      let needsUpdate = false;
                      if (r.targetArea === "ม.1 สันติสุข" || r.targetArea === "บ้านสันติสุข") {
                        r.targetArea = "ม.1 บ้านสันติสุข"; r.modelType = "หมู่บ้าน"; needsUpdate = true;
                      } else if (r.targetArea === "ม.1 บ้านสันติสุข" && r.modelType !== "หมู่บ้าน") {
                        r.modelType = "หมู่บ้าน"; needsUpdate = true;
                      } else if (r.targetArea === "ม.5 ดาหลำ (ต.เขาขาว)") {
                        r.targetArea = "ม.5 ดาหลำ"; r.modelType = "ตำบล"; needsUpdate = true;
                      } else if (r.targetArea === "ม.5 ดาหลำ" && r.modelType !== "ตำบล") {
                        r.modelType = "ตำบล"; needsUpdate = true;
                      } else if (r.targetArea === "ม.6 ทุ่งเกาะปราบ" || r.targetArea === "ม.6. บ้านทุ่งเกาะปราบ (ต.เขาขาว)") {
                        r.targetArea = "ม.6 ทุ่งเกาะปราบ"; r.modelType = "ตำบล"; needsUpdate = true;
                      } else if (r.targetArea === "ม.7 นาข่าใต้" || r.targetArea === "ม.7 บ้านนาข่าใต้ (ต.เขาขาว)" || r.targetArea === "ม.7 บ้านนาข่าใต้") {
                        r.targetArea = "ม.7 นาข่าใต้"; r.modelType = "ตำบล"; needsUpdate = true;
                      } else if (r.targetArea === "ม.4 บ้านนาข่าเหนือ" && r.modelType !== "ตำบล") {
                         r.modelType = "ตำบล"; needsUpdate = true;
                      }
                      if (needsUpdate) {
                        toUpdate.push({ id: r.id, name: r.name, visit_number: r.visitNumber || 1, age: r.age, gender: r.gender, data: r });
                      }
                    }
                  });
                  
                  if (toUpdate.length > 0) {
                    const { error: err } = await supabase.from('ncd_records').upsert(toUpdate);
                    if (err) alert("อัปเดตไม่สำเร็จ: " + err.message);
                    else {
                      alert("อัปเดตสำเร็จ " + toUpdate.length + " รายการ กรุณารีเฟรชหน้าต่างเบราว์เซอร์");
                      window.location.reload();
                    }
                  } else {
                    alert("ข้อมูลถูกต้องแล้ว ไม่มีรายการต้องอัปเดต");
                  }
                }}
                className="bg-amber-600 border border-amber-700 hover:bg-amber-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-xs"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={3} />
                ซิงค์โมเดลเขาขาว
              </button>
  
              {/* Action: Backup JSON with Selective Scope */}
              <button
                onClick={() => {
                  if (isAdmin) {
                    setIsBackupModalOpen(true);
                  } else {
                    openPasswordModal('export');
                  }
                }}
                disabled={records.length === 0}
                className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-all shadow-3xs"
                title="สำรองข้อมูลทั้งหมด หรือเลือกเฉพาะเจาะจงตามโมเดล/พื้นที่"
              >
                <Download className="w-4 h-4" />
                สำรองข้อมูล
              </button>
  
              {/* Action: Restore JSON with Selective Scope */}
              <button 
                onClick={() => {
                  if (isAdmin) {
                    setIsImportModalOpen(true);
                  } else {
                    openPasswordModal('import');
                  }
                }}
                className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-3xs"
                title="นำเข้าข้อมูลจากไฟล์ พร้อมเลือกกรองตามโมเดล/พื้นที่"
              >
                <Upload className="w-4 h-4" />
                นำเข้าข้อมูล
              </button>
              </>
            )}

            {/* Action: Toggle Hide Names */}
            {onToggleHideNames && (
              <button
                type="button"
                onClick={onToggleHideNames}
                className={`font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all border ${
                  hideNames
                    ? "bg-amber-100 border-amber-300 hover:bg-amber-200 text-amber-800 shadow-2xs"
                    : "bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700"
                }`}
                title={hideNames ? "คลิกเพื่อแสดงรายชื่อจริง" : "คลิกเพื่อปกปิด/ซ่อนรายชื่อและเบอร์โทร (PDPA)"}
              >
                {hideNames ? <EyeOff className="w-4 h-4 text-amber-700" /> : <Eye className="w-4 h-4 text-slate-500" />}
                {hideNames ? "ปกปิดรายชื่อ: เปิด" : "ปกปิดรายชื่อ"}
              </button>
            )}

            {/* Action: Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              ส่งออก Excel
            </button>
          </div>

        </div>

        {/* Current status indicators */}
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-2">
          <span>พบรายชื่อทั้งหมด: {filteredRecords.length} เคส</span>
          <span>•</span>
          <span>
            เรียงลำดับโดย: {
              sortBy === "date" ? "วันที่คัดกรอง" : 
              sortBy === "visitNumber" ? "ครั้งที่ตรวจ/ติดตาม" :
              sortBy === "name" ? "ชื่อ-สกุล" : 
              sortBy === "age" ? "อายุ" : "BMI"
            } ({sortOrder === "desc" ? "มากไปน้อย / ล่าสุด" : "น้อยไปมาก / แรกสุด"})
          </span>
          {(filterVisitScope !== "all" || filterVisitNumbers.length > 0) && (
            <>
              <span>•</span>
              <span className="text-indigo-600 font-bold">
                ตัวกรองครั้งที่: {
                  filterVisitScope === "latest_only" ? "เฉพาะผลล่าสุดรายบุคคล" :
                  filterVisitScope === "followup_only" ? "เฉพาะติดตามต่อเนื่อง" :
                  filterVisitScope === "initial_only" ? "เฉพาะคัดกรองแรกรับ (ครั้งที่ 1)" : ""
                }
                {filterVisitNumbers.length > 0 && ` [เจาะจงครั้งที่: ${filterVisitNumbers.join(", ")}]`}
              </span>
            </>
          )}
        </div>

      </div>

      {/* Main Data Sheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-150 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-3 px-5 transition-colors">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSort("date")}
                      className="hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                      title="คลิกเพื่อเรียงตามวันที่"
                    >
                      <span>วันที่</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </button>
                    <span className="text-slate-300">/</span>
                    <button
                      type="button"
                      onClick={() => handleSort("visitNumber")}
                      className="hover:text-indigo-600 flex items-center gap-1 text-indigo-700 font-bold cursor-pointer"
                      title="คลิกเพื่อเรียงตามครั้งที่ตรวจ"
                    >
                      <span>ครั้งที่</span>
                      <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                    </button>
                  </div>
                </th>
                <th 
                  className="py-3 px-5 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    ชื่อ-นามสกุล / ที่อยู่
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3 px-5 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("age")}
                >
                  <div className="flex items-center gap-1">
                    อายุ / เพศ
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-5 text-center">ความดัน (HT)</th>
                <th className="py-3 px-5 text-center">เบาหวาน (DM)</th>
                <th 
                  className="py-3 px-5 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("bmi")}
                >
                  <div className="flex items-center justify-center gap-1">
                    BMI / รอบเอว
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-5">ผลการจัดการเบื้องต้น / ดื่มน้ำ</th>
                <th className="py-3 px-5 text-center w-28">เครื่องมือ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    <SlidersHorizontal className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    ไม่พบรายชื่อหรือข้อมูลคัดกรองตามเงื่อนไขดังกล่าว
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* Date & Visit */}
                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-800 block text-sm leading-tight">
                          {formatThaiDate(r.date, "medium")}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block leading-tight mt-0.5">
                          ({formatThaiDate(r.date, "slash")})
                        </span>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            (r.visitNumber || 1) === 1
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : (r.visitNumber || 1) === 2
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}>
                            ครั้งที่ {r.visitNumber || 1}
                            {(r.visitNumber || 1) === 1 ? " (แรกรับ)" : ` (ติดตาม #${(r.visitNumber || 1) - 1})`}
                          </span>

                          {patientVisitMapping[`${r.name}_${r.phone || ""}`]?.latestRecordId === r.id && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="การตรวจรอบล่าสุดของบุคคลนี้">
                              ล่าสุด
                            </span>
                          )}

                          {patientVisitMapping[`${r.name}_${r.phone || ""}`]?.total > 1 && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchTerm(r.name);
                                setFilterVisitScope("all");
                                setFilterVisitNumbers([]);
                              }}
                              title={`คลิกเพื่อกรองดูประวัติทั้งหมด ${patientVisitMapping[`${r.name}_${r.phone || ""}`]?.total} ครั้งของบุคคลนี้`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <History className="w-2.5 h-2.5" />
                              รวม {patientVisitMapping[`${r.name}_${r.phone || ""}`]?.total} ครั้ง
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Name & Location */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer text-sm" onClick={() => onSelectRecord(r)}>
                            {maskPatientName(r.name, hideNames, r.id)}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            r.participantType === "คณะทำงาน"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {r.participantType === "คณะทำงาน" ? "คณะทำงาน" : "กลุ่มเป้าหมาย"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {r.address} {r.subdistrict ? `ต.${r.subdistrict} ` : ""}อ.{r.district} ({r.targetArea})
                        </div>
                      </td>

                      {/* Age & Sex */}
                      <td className="py-4 px-5 font-semibold text-slate-700">
                        {r.age} ปี / {r.gender}
                      </td>

                      {/* HT */}
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs ${
                          r.htResult?.level === "danger" ? "bg-red-50 text-red-700 border border-red-200" :
                          r.htResult?.level === "risk" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {r.bpSys}/{r.bpDia} mmHg • {r.htResult?.level === "danger" ? "สงสัยป่วย" : r.htResult?.level === "risk" ? "กลุ่มเสี่ยง" : "ปกติ"}
                        </span>
                      </td>

                      {/* DM */}
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs ${
                          !r.sugar || r.sugar === 0 ? "bg-slate-50 text-slate-500 border border-slate-200" :
                          r.dmResult?.level === "danger" ? "bg-red-50 text-red-700 border border-red-200" :
                          r.dmResult?.level === "risk" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {r.sugar && r.sugar > 0 ? (
                            <>{r.sugar} mg/dL {r.sugarFasting ? `(${r.sugarFasting})` : ""} • {r.dmResult?.level === "danger" ? "สงสัยป่วย" : r.dmResult?.level === "risk" ? "กลุ่มเสี่ยง" : "ปกติ"}</>
                          ) : (
                            "ไม่ได้ตรวจ"
                          )}
                        </span>
                      </td>

                      {/* BMI & Waist */}
                      <td className="py-4 px-5 text-center">
                        {(() => {
                          const b = parseFloat(r.bmi);
                          const hasWaist = r.waist !== undefined && r.waist !== null && Number(r.waist) > 0;
                          const waistExceed = hasWaist ? (r.gender === "ชาย" ? Number(r.waist) >= 36 : Number(r.waist) >= 32) : false;

                          if ((isNaN(b) || b <= 0) && !hasWaist) return <span className="font-mono font-bold text-slate-400">-</span>;
                          let colorClass = "";
                          let label = "";
                          if (!isNaN(b) && b > 0) {
                            if (b < 18.5) { colorClass = "bg-blue-50 text-blue-600 border-blue-200"; label = "ผอม"; }
                            else if (b < 23) { colorClass = "bg-emerald-50 text-emerald-600 border-emerald-200"; label = "ปกติ"; }
                            else if (b < 25) { colorClass = "bg-amber-50 text-amber-600 border-amber-200"; label = "ท้วม"; }
                            else if (b < 30) { colorClass = "bg-rose-50 text-rose-600 border-rose-200"; label = "อ้วน"; }
                            else { colorClass = "bg-purple-50 text-purple-600 border-purple-200"; label = "อ้วนมาก"; }
                          }
                          return (
                            <div className="flex flex-col items-center justify-center gap-1">
                              {!isNaN(b) && b > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold whitespace-nowrap ${colorClass}`}>
                                    {label}
                                  </span>
                                  <span className="font-mono font-black text-slate-700 text-[11px]">{r.bmi}</span>
                                </div>
                              )}
                              {hasWaist && (
                                <span
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap ${
                                    waistExceed
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                  title={`รอบเอว ${r.waist} นิ้ว (${Math.round(Number(r.waist) * 2.54)} ซม.)`}
                                >
                                  เอว {r.waist}&quot; {waistExceed ? "(เกิน)" : ""}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Management Action & Water Intake */}
                      <td className="py-4 px-5">
                        <span className="font-semibold text-slate-700 block">{r.followUpAction}</span>
                        {r.followUpNote && (
                          <span className="text-[10px] text-slate-400 block max-w-[150px] truncate" title={r.followUpNote}>
                            {r.followUpNote}
                          </span>
                        )}
                        {r.water && (
                          <span
                            className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              r.water.includes("น้อยกว่า 6")
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-cyan-50 text-cyan-700 border-cyan-200"
                            }`}
                          >
                            <Droplet className="w-2.5 h-2.5" />
                            น้ำ: {r.water}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectRecord(r)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="ดูรายงานละเอียด & AI"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && onEditRecord && (
                            <button
                              onClick={() => onEditRecord(r)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {onFollowUpRecord && (
                            <button
                              onClick={() => onFollowUpRecord(r)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="บันทึกการติดตามตรวจครั้งถัดไป (โดยอ้างอิงข้อมูลชุดนี้)"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => setRecordToDelete(r)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="ลบรายงานนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-rose-100 rounded-full mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">ยืนยันการลบข้อมูล</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              คุณต้องการลบข้อมูลคัดกรองของ <br/>
              <span className="font-semibold text-slate-800">"{maskPatientName(recordToDelete.name, hideNames, recordToDelete.id)}"</span> ใช่หรือไม่? <br/>
              <span className="text-xs text-rose-500 mt-2 block">การกระทำนี้ไม่สามารถกู้คืนได้</span>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setRecordToDelete(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => {
                  onDeleteRecord(recordToDelete.id);
                  setRecordToDelete(null);
                }}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header Area */}
            <div className={`pt-8 pb-6 px-6 text-center ${
              passwordModalConfig.action === 'export' ? 'bg-indigo-50/50' : 'bg-emerald-50/50'
            }`}>
              <div className="flex justify-center mb-4 relative">
                <div className="absolute inset-0 bg-white blur-xl rounded-full opacity-50"></div>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm relative z-10 ${
                  passwordModalConfig.action === 'export' 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {passwordModalConfig.action === 'export' ? <Download className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">
                ยืนยันตัวตน
              </h3>
              <p className="text-sm text-slate-500 font-medium max-w-[260px] mx-auto leading-relaxed">
                กรุณาระบุรหัสผ่านเพื่อดำเนินการ<br />
                <strong className={`font-bold ${
                  passwordModalConfig.action === 'export' ? 'text-indigo-600' : 'text-emerald-600'
                }`}>
                  {passwordModalConfig.action === 'export' ? 'สำรองข้อมูล' : 'นำเข้าข้อมูล'}
                </strong>
              </p>
            </div>
            
            <div className="p-6 pt-2">
              <form onSubmit={handlePasswordSubmit}>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                      รหัสผ่าน (Password)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className={`w-full border-2 rounded-xl pl-11 pr-4 py-3.5 text-lg focus:outline-none transition-all font-mono font-medium placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-slate-300 ${
                          passwordError 
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-700 bg-rose-50' 
                            : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-700 bg-slate-50 focus:bg-white'
                        }`}
                        placeholder="ระบุรหัสผ่าน..."
                        autoFocus
                      />
                    </div>
                    {passwordError && (
                      <p className="text-rose-500 text-xs font-semibold mt-2.5 flex items-center gap-1.5 ml-1 animate-in slide-in-from-top-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {passwordError}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setPasswordModalConfig({ isOpen: false, action: null })}
                      className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-all cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      type="submit"
                      className={`flex-[1.5] py-3 text-sm font-bold text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                        passwordModalConfig.action === 'export'
                          ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/20'
                          : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/20'
                      }`}
                    >
                      ยืนยันการทำรายการ
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Targeted Backup Modal */}
      <BackupExportModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        records={records}
      />

      {/* Targeted Import Modal with Pre-import Filters and Summary */}
      <BackupImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingRecords={records}
        onConfirmImport={async (recordsToImport) => {
          if (onImportRecords) {
            await onImportRecords(recordsToImport);
          }
        }}
      />
    </div>
  );
};
