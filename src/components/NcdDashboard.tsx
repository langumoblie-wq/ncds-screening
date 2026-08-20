import React, { useState, useMemo, useEffect, useRef } from "react";
import { RefreshCw, 
  Users, CheckCircle2, AlertTriangle, ShieldAlert, Search, Filter, 
  MapPin, Eye, Trash2, SlidersHorizontal, ArrowUpDown, ChevronDown, 
  Download, FileSpreadsheet, RotateCcw, Cigarette, Wine, Flame, EyeOff,
  Pencil, PlusCircle, History, Apple, Dumbbell, Smile, Moon, Activity, Upload
} from "lucide-react";
import { ScreeningRecord, DistrictType, LOCATION_DATA } from "../types";

interface NcdDashboardProps {
  isAdmin?: boolean;
  records: ScreeningRecord[];
  onDeleteRecord: (id: number) => void;
  onSelectRecord: (record: ScreeningRecord) => void;
  onEditRecord?: (record: ScreeningRecord) => void;
  onAddScreeningClicked?: () => void;
  onFollowUpRecord?: (record: ScreeningRecord) => void;
  onImportRecords?: (records: ScreeningRecord[]) => void;
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

// Reusable custom circular progress gauge
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
  const size = 160;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dasharray = circumference;
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center">
      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center mb-4">{title}</h4>
      {total === 0 ? (
        <div className="h-[160px] flex flex-col items-center justify-center text-slate-400 text-xs text-center space-y-1">
          <EyeOff className="w-8 h-8 text-slate-300" />
          <p>ไม่มีข้อมูลแสดงผล</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center">
          <div className="relative w-[160px] h-[160px] shrink-0">
            <svg width={size} height={size} className="-rotate-90 transform">
              <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
              {pctUW > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#3b82f6" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctUW) / 100} />}
              {pctN > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#10b981" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctN) / 100} style={{ transform: `rotate(${pctUW * 3.6}deg)`, transformOrigin: "center" }} />}
              {pctOW > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#f59e0b" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctOW) / 100} style={{ transform: `rotate(${(pctUW + pctN) * 3.6}deg)`, transformOrigin: "center" }} />}
              {pctOB1 > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#f43f5e" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctOB1) / 100} style={{ transform: `rotate(${(pctUW + pctN + pctOW) * 3.6}deg)`, transformOrigin: "center" }} />}
              {pctOB2 > 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#8b5cf6" strokeWidth={strokeWidth} strokeDasharray={dasharray} strokeDashoffset={circumference - (circumference * pctOB2) / 100} style={{ transform: `rotate(${(pctUW + pctN + pctOW + pctOB1) * 3.6}deg)`, transformOrigin: "center" }} />}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-800">{total}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">เคสทั้งหมด</span>
            </div>
          </div>
          <div className="space-y-3 w-full max-w-[140px]">
            <div className="flex justify-between items-start text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                <span className="text-slate-600 font-medium whitespace-nowrap">ผอม</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800 whitespace-nowrap">{underweight} ราย</span>
                <span className="text-[10px] font-semibold text-slate-500">({Math.round(pctUW)}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-start text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-slate-600 font-medium whitespace-nowrap">ปกติ</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800 whitespace-nowrap">{normal} ราย</span>
                <span className="text-[10px] font-semibold text-slate-500">({Math.round(pctN)}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-start text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                <span className="text-slate-600 font-medium whitespace-nowrap">ท้วม</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800 whitespace-nowrap">{overweight} ราย</span>
                <span className="text-[10px] font-semibold text-slate-500">({Math.round(pctOW)}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-start text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                <span className="text-slate-600 font-medium whitespace-nowrap">อ้วน</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800 whitespace-nowrap">{obese1} ราย</span>
                <span className="text-[10px] font-semibold text-slate-500">({Math.round(pctOB1)}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-start text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
                <span className="text-slate-600 font-medium whitespace-nowrap">อ้วนมาก</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800 whitespace-nowrap">{obese2} ราย</span>
                <span className="text-[10px] font-semibold text-slate-500">({Math.round(pctOB2)}%)</span>
              </div>
            </div>
          </div>
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
}> = ({ normal, risk, danger, title }) => {
  const total = normal + risk + danger;
  
  const pctNormal = total > 0 ? Math.round((normal / total) * 100) : 0;
  const pctRisk = total > 0 ? Math.round((risk / total) * 100) : 0;
  const pctDanger = total > 0 ? Math.round((danger / total) * 100) : 0;

  // SVG parameters
  const size = 160;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Segments calculation
  const offsetNormal = circumference;
  const offsetRisk = offsetNormal - (circumference * pctNormal) / 100;
  const offsetDanger = offsetRisk - (circumference * pctRisk) / 100;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center">
      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center mb-4">{title}</h4>
      
      {total === 0 ? (
        <div className="h-[160px] flex flex-col items-center justify-center text-slate-400 text-xs text-center space-y-1">
          <EyeOff className="w-8 h-8 text-slate-300" />
          <p>ไม่มีข้อมูลแสดงผล</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center">
          
          {/* Circular SVG Chart */}
          <div className="relative w-[160px] h-[160px] shrink-0">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              
              {/* Normal Segment (White/Greenish) */}
              {pctNormal > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke="#10b981" // emerald-500
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * pctNormal) / 100}
                />
              )}
              {/* Risk Segment */}
              {pctRisk > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke="#f59e0b" // amber-500
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * pctRisk) / 100}
                  style={{ transform: `rotate(${pctNormal * 3.6}deg)`, transformOrigin: "center" }}
                />
              )}
              {/* Danger Segment */}
              {pctDanger > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke="#ef4444" // red-500
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * pctDanger) / 100}
                  style={{ transform: `rotate(${(pctNormal + pctRisk) * 3.6}deg)`, transformOrigin: "center" }}
                />
              )}
            </svg>
            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-800">{total}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">เคสทั้งหมด</span>
            </div>
          </div>

          {/* Legend Table */}
          <div className="space-y-3 w-full max-w-[140px]">
            <div className="flex justify-between items-start text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-slate-600 font-medium whitespace-nowrap">ปกติ</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800 whitespace-nowrap">{normal} ราย</span>
                <span className="text-[10px] font-semibold text-slate-500">({pctNormal}%)</span>
              </div>
            </div>
            
            <div className="flex justify-between items-start text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                <span className="text-slate-600 font-medium whitespace-nowrap">กลุ่มเสี่ยง</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800 whitespace-nowrap">{risk} ราย</span>
                <span className="text-[10px] font-semibold text-slate-500">({pctRisk}%)</span>
              </div>
            </div>

            <div className="flex justify-between items-start text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                <span className="text-slate-600 font-medium whitespace-nowrap">สงสัยป่วย</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-slate-800 whitespace-nowrap">{danger} ราย</span>
                <span className="text-[10px] font-semibold text-slate-500">({pctDanger}%)</span>
              </div>
            </div>
          </div>
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
  total: number;
}> = ({
  smokeCount,
  alcoholCount,
  noExerciseCount,
  poorSleepCount,
  foodSweetCount,
  foodFatCount,
  foodSaltCount,
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
      icon: <Apple className="w-3.5 h-3.5" />,
      desc: "ทานหวานจัด/ปรุงเพิ่มหวานเป็นประจำ"
    },
    {
      id: "fat",
      group: "3อ",
      title: "อ.อาหาร (รสมันจัด)",
      count: foodFatCount,
      pct: getPct(foodFatCount),
      color: "bg-orange-500",
      barColor: "from-orange-400 to-amber-500",
      icon: <Apple className="w-3.5 h-3.5" />,
      desc: "นิยมทานของทอด/ของมันจัดสูง"
    },
    {
      id: "salt",
      group: "3อ",
      title: "อ.อาหาร (รสเค็มจัด)",
      count: foodSaltCount,
      pct: getPct(foodSaltCount),
      color: "bg-amber-500",
      barColor: "from-amber-400 to-yellow-500",
      icon: <Flame className="w-3.5 h-3.5" />,
      desc: "ปรุงเพิ่มเค็ม/ทานสำเร็จรูป/หมักดองบ่อย"
    },
    {
      id: "exercise",
      group: "3อ",
      title: "อ.ออกกำลังกาย (นั่งนิ่ง)",
      count: noExerciseCount,
      pct: getPct(noExerciseCount),
      color: "bg-blue-500",
      barColor: "from-blue-400 to-indigo-500",
      icon: <Dumbbell className="w-3.5 h-3.5" />,
      desc: "ขาดการขยับ/นั่งทำงานนาน/ไม่ออกกำลังกาย"
    },
    {
      id: "sleep",
      group: "3อ",
      title: "อ.อารมณ์ (พักผ่อนไม่เพียงพอ)",
      count: poorSleepCount,
      pct: getPct(poorSleepCount),
      color: "bg-purple-500",
      barColor: "from-purple-400 to-violet-500",
      icon: <Moon className="w-3.5 h-3.5" />,
      desc: "นอนเฉลี่ยน้อยกว่า 6 ชม./หลับยาก/เครียดสะสม"
    },
    {
      id: "smoke",
      group: "2ส",
      title: "ส.สูบบุหรี่ (ยังสูบอยู่)",
      count: smokeCount,
      pct: getPct(smokeCount),
      color: "bg-slate-600",
      barColor: "from-slate-500 to-slate-700",
      icon: <Cigarette className="w-3.5 h-3.5" />,
      desc: "ยังสูบประจำ/เลิกสูบยังไม่ถึง 1 ปี"
    },
    {
      id: "alcohol",
      group: "2ส",
      title: "ส.สุรา (ดื่มแอลกอฮอล์)",
      count: alcoholCount,
      pct: getPct(alcoholCount),
      color: "bg-pink-600",
      barColor: "from-pink-500 to-rose-600",
      icon: <Wine className="w-3.5 h-3.5" />,
      desc: "ดื่มแอลกอฮอล์เป็นประจำหรือครั้งคราว"
    }
  ];

  // Find the highest risk factor
  const maxRiskItem = [...items].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between h-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <div className="bg-rose-50 text-rose-600 p-1.5 rounded-xl shrink-0">
              <Apple className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">พฤติกรรมเสี่ยงสูง (3อ. 2ส.)</h4>
              <p className="text-[9px] text-slate-400">สรุปอัตราความเสี่ยงตามหลัก 3อ. 2ส.</p>
            </div>
          </div>
          <span className="text-[9px] bg-slate-50 text-slate-500 font-bold px-2 py-1 rounded-lg border border-slate-100 shrink-0">
            วิเคราะห์ {total} ราย
          </span>
        </div>

        {total === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs text-center space-y-1">
            <EyeOff className="w-8 h-8 text-slate-300" />
            <p>ไม่มีข้อมูลแสดงผลพฤติกรรมสุขภาพ</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Group: 3อ */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 bg-blue-50/50 p-1 rounded-lg border border-blue-100">
                <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded-md">3อ</span>
                <span className="text-[9px] text-blue-800 font-bold tracking-wide">อาหาร • ออกกำลังกาย • อารมณ์</span>
              </div>
              
              <div className="space-y-3">
                {items.filter(i => i.group === "3อ").map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span className={`${item.color} text-white p-1 rounded-md shrink-0`}>
                          {item.icon}
                        </span>
                        {item.title}
                      </span>
                      <span className="text-slate-500 font-semibold text-[11px] shrink-0">
                        {item.count} ราย <span className="text-slate-400">({item.pct}%)</span>
                      </span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`bg-gradient-to-r ${item.barColor} h-full rounded-full transition-all duration-500`} 
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-0.5 font-medium pl-7 leading-none">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Group: 2ส */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <span className="text-[9px] font-black bg-slate-600 text-white px-1.5 py-0.5 rounded-md">2ส</span>
                <span className="text-[9px] text-slate-700 font-bold tracking-wide">สูบบุหรี่ • สุรา</span>
              </div>
              
              <div className="space-y-3">
                {items.filter(i => i.group === "2ส").map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span className={`${item.color} text-white p-1 rounded-md shrink-0`}>
                          {item.icon}
                        </span>
                        {item.title}
                      </span>
                      <span className="text-slate-500 font-semibold text-[11px] shrink-0">
                        {item.count} ราย <span className="text-slate-400">({item.pct}%)</span>
                      </span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`bg-gradient-to-r ${item.barColor} h-full rounded-full transition-all duration-500`} 
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-0.5 font-medium pl-7 leading-none">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {total > 0 && maxRiskItem && maxRiskItem.count > 0 && (
        <div className="text-[10px] text-slate-500 border-t border-slate-150 pt-2.5 mt-3 flex items-start gap-1.5 bg-rose-50/40 p-2.5 rounded-xl border border-rose-100/60">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-slate-700 block text-[10px]">พฤติกรรมเสี่ยงสูงหลักในชุมชน:</span>
            <span>คือ <strong className="text-rose-700">{maxRiskItem.title}</strong> สูงถึง <strong className="text-rose-700">{maxRiskItem.pct}%</strong> ({maxRiskItem.count} เคส) แนะนำจัดกิจกรรมปรับเปลี่ยนพฤติกรรมเน้นหัวข้อนี้เป็นหลัก</span>
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
  onImportRecords
}) => {
  const [recordToDelete, setRecordToDelete] = useState<ScreeningRecord | null>(null);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModel, setFilterModel] = useState<string[]>([]);
  const [filterDistrict, setFilterDistrict] = useState<string[]>([]);
  const [filterSubdistrict, setFilterSubdistrict] = useState<string[]>([]);
  const [filterTargetArea, setFilterTargetArea] = useState<string[]>([]);
  const [filterHtRisk, setFilterHtRisk] = useState<string[]>([]);
  const [filterDmRisk, setFilterDmRisk] = useState<string[]>([]);
  const [filterBehaviorRisk, setFilterBehaviorRisk] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "name" | "age" | "bmi">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Password Modal state for Export/Import
  const [passwordModalConfig, setPasswordModalConfig] = useState<{
    isOpen: boolean;
    action: 'export' | 'import' | null;
  }>({ isOpen: false, action: null });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cascading dropdown updates for filters
  useEffect(() => {
    setFilterDistrict([]);
    setFilterSubdistrict([]);
    setFilterTargetArea([]);
  }, [filterModel]);

  useEffect(() => {
    setFilterSubdistrict([]);
    setFilterTargetArea([]);
  }, [filterDistrict]);

  useEffect(() => {
    setFilterTargetArea([]);
  }, [filterSubdistrict]);

  // Dynamic options for filters
  const availableDistricts = useMemo(() => {
    const models = filterModel.length > 0 ? filterModel : ["หมู่บ้าน", "ตำบล"];
    const districtsSet = new Set<string>();
    models.forEach(model => {
      if (LOCATION_DATA[model as keyof typeof LOCATION_DATA]) {
        Object.keys(LOCATION_DATA[model as keyof typeof LOCATION_DATA]).forEach(d => districtsSet.add(d));
      }
    });
    return Array.from(districtsSet) as DistrictType[];
  }, [filterModel]);

  const availableSubdistricts = useMemo(() => {
    if (filterDistrict.length === 0) return [];
    const models = filterModel.length > 0 ? filterModel : ["หมู่บ้าน", "ตำบล"];
    const subdistSet = new Set<string>();
    models.forEach(model => {
      filterDistrict.forEach(district => {
        const subdistMap = (LOCATION_DATA[model as keyof typeof LOCATION_DATA] as any)?.[district] || {};
        Object.keys(subdistMap).forEach(s => subdistSet.add(s));
      });
    });
    return Array.from(subdistSet);
  }, [filterModel, filterDistrict]);

  const availableTargetAreas = useMemo(() => {
    if (filterDistrict.length === 0 || filterSubdistrict.length === 0) return [];
    const models = filterModel.length > 0 ? filterModel : ["หมู่บ้าน", "ตำบล"];
    const areaSet = new Set<string>();
    models.forEach(model => {
      filterDistrict.forEach(district => {
        filterSubdistrict.forEach(subdist => {
          const areas = (LOCATION_DATA[model as keyof typeof LOCATION_DATA] as any)?.[district]?.[subdist] || [];
          areas.forEach((a: string) => areaSet.add(a));
        });
      });
    });
    return Array.from(areaSet);
  }, [filterModel, filterDistrict, filterSubdistrict]);

  // Apply filters and sorting
  const filteredRecords = useMemo(() => {
    return (records || [])
      .filter((r) => {
        if (!r) return false;
        
        // Name / Phone match
        const matchesSearch = 
          ((r.name || "").toLowerCase().includes(searchTerm.toLowerCase())) || 
          ((r.phone || "").includes(searchTerm));
        
        // Model type filter (with legacy fallback inference)
        let recordModel = r.modelType || "";
        if (!recordModel && r.district && r.targetArea) {
          if ((LOCATION_DATA["หมู่บ้าน"] as any)?.[r.district]?.[r.subdistrict || ""]?.includes(r.targetArea)) {
            recordModel = "หมู่บ้าน";
          } else if ((LOCATION_DATA["ตำบล"] as any)?.[r.district]?.[r.subdistrict || ""]?.includes(r.targetArea)) {
            recordModel = "ตำบล";
          }
        }
        const matchesModel = filterModel.length > 0 ? filterModel.includes(recordModel) : true;

        // District filter
        const matchesDistrict = filterDistrict.length > 0 ? filterDistrict.includes(r.district) : true;

        // Subdistrict filter
        const matchesSubdistrict = filterSubdistrict.length > 0 ? filterSubdistrict.includes(r.subdistrict) : true;

        // Target Area filter
        const matchesTargetArea = filterTargetArea.length > 0 ? filterTargetArea.includes(r.targetArea) : true;

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
            }
            return false;
          });
        }

        return matchesSearch && matchesModel && matchesDistrict && matchesSubdistrict && matchesTargetArea && matchesRisk && matchesBehavior;
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
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [records, searchTerm, filterModel, filterDistrict, filterSubdistrict, filterTargetArea, filterHtRisk, filterDmRisk, filterBehaviorRisk, sortBy, sortOrder]);

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

    let foodSweetCount = 0;
    let foodFatCount = 0;
    let foodSaltCount = 0;
    let bmiUnderweight = 0;
    let bmiNormal = 0;
    let bmiOverweight = 0;
    let bmiObese1 = 0;
    let bmiObese2 = 0;
    let foodAnyRiskCount = 0;

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
      lifestyle: { 
        smokeCount, 
        alcoholCount, 
        sodiumCount, 
        noExerciseCount,
        poorSleepCount,
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
    
    // Construct rows
    const headers = ["ID", "Date", "VisitNumber", "Name", "Age", "Gender", "Phone", "District", "TargetArea", "BMI", "BP_Systolic", "BP_Diastolic", "HT_Result", "BloodSugar", "DM_Result", "FollowUpAction"];
    const rows = filteredRecords.map((r) => [
      r.id,
      r.date,
      r.visitNumber,
      `"${r.name}"`,
      r.age,
      r.gender,
      r.phone,
      r.district,
      `"${r.targetArea}"`,
      r.bmi,
      r.bpSys,
      r.bpDia,
      r.htResult?.level || "",
      r.sugar,
      r.dmResult?.level || "",
      `"${r.followUpAction}"`
    ]);

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
        executeExportBackup();
        setPasswordModalConfig({ isOpen: false, action: null });
      } else if (action === 'import') {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
        // Delay closing the modal slightly so the programmatic click works correctly
        setTimeout(() => {
          setPasswordModalConfig({ isOpen: false, action: null });
        }, 100);
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
          {/* Quick Clear Filter Button if any selected */}
          {(filterModel.length > 0 || filterDistrict.length > 0 || filterSubdistrict.length > 0 || filterTargetArea.length > 0) && (
            <button 
              onClick={() => {
                setFilterModel([]);
                setFilterDistrict([]);
                setFilterSubdistrict([]);
                setFilterTargetArea([]);
              }}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg self-start sm:self-center transition-colors"
            >
              ล้างตัวกรองพื้นที่ทั้งหมด
            </button>
          )}
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
              placeholder={filterDistrict.length > 0 ? "ทุกตำบล" : "โปรดเลือกอำเภอก่อน"}
              disabled={filterDistrict.length === 0}
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
              placeholder={filterSubdistrict.length > 0 ? "ทุกพื้นที่เป้าหมาย" : "โปรดเลือกตำบลก่อน"}
              disabled={filterSubdistrict.length === 0}
            />
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">คัดกรองสะสม</span>
            <span className="text-2xl font-black text-slate-800">{stats.total} <span className="text-xs font-normal text-slate-400">ราย</span></span>
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

      {/* Doughnut Gauges and Lifestyle Risk Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Hypertension Gauge */}
        <RiskDoughnut 
          normal={stats.ht.normal} 
          risk={stats.ht.risk} 
          danger={stats.ht.danger} 
          title="สัดส่วนความเสี่ยงโรคความดันโลหิตสูง (HT)" 
        />

        {/* BMI Gauge */}
        <BMIDoughnut 
          underweight={stats.bmiStats.underweight}
          normal={stats.bmiStats.normal}
          overweight={stats.bmiStats.overweight}
          obese1={stats.bmiStats.obese1}
          obese2={stats.bmiStats.obese2}
          title="สัดส่วนความเสี่ยงดัชนีมวลกาย (BMI)"
        />

        {/* Diabetes Gauge */}
        <RiskDoughnut 
          normal={stats.dm.normal} 
          risk={stats.dm.risk} 
          danger={stats.dm.danger} 
          title="สัดส่วนความเสี่ยงโรคเบาหวาน (DM)" 
        />

        {/* Lifestyle Risks 3O2S Chart Component */}
        <LifestyleBehaviors3O2S 
          smokeCount={stats.lifestyle.smokeCount}
          alcoholCount={stats.lifestyle.alcoholCount}
          noExerciseCount={stats.lifestyle.noExerciseCount}
          poorSleepCount={stats.lifestyle.poorSleepCount}
          foodSweetCount={stats.lifestyle.foodSweetCount}
          foodFatCount={stats.lifestyle.foodFatCount}
          foodSaltCount={stats.lifestyle.foodSaltCount}
          total={stats.total}
        />

      </div>

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

            {/* BMI Analysis */}
            <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-4 rounded-xl border border-indigo-200/60 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5 text-indigo-850 font-bold text-xs">
                  <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono">C</span>
                  <span>ภาวะโภชนาการและดัชนีมวลกาย (BMI Analysis)</span>
                </div>
                
                <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed font-semibold">
                  {interpretation.bmiOverweightTotal > 0 ? (
                    <div className="flex items-start gap-2">
                      <Activity className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <span><strong>อัตราน้ำหนักเกินเกณฑ์:</strong> ประชากรกลุ่มเสี่ยงที่มีภาวะท้วม อ้วน หรืออ้วนมาก มีจำนวน <strong className="text-indigo-700">{interpretation.bmiOverweightTotal}</strong> ราย หรือคิดเป็น <strong className="text-indigo-700 text-sm font-black font-mono">{interpretation.bmiOverweightPct}%</strong> ของจำนวนผู้คัดกรองทั้งหมด ซึ่งเป็นปัจจัยเสี่ยงโดยตรงต่อโรคความดันโลหิตและเบาหวาน</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span><strong>ภาวะโภชนาการดี:</strong> ประชากรในกลุ่มที่คัดกรองส่วนใหญ่อยู่ในเกณฑ์มาตรฐาน ไม่พบกลุ่มภาวะน้ำหนักเกินในระดับที่ต้องเฝ้าระวัง</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {interpretation.bmiOverweightPct >= 30 && (
                <div className="mt-3 text-[10px] bg-white border border-indigo-200 text-indigo-850 p-2.5 rounded-xl font-bold flex items-center gap-1.5 leading-tight">
                  <span className="shrink-0 bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black font-mono">แนวทางจัดกิจกรรม</span>
                  <span>ควรจัดกิจกรรมปรับพฤติกรรมการกิน (ลดหวาน/มัน/เค็ม) ควบคู่กับการส่งเสริมการออกกำลังกายชุมชน</span>
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

      {/* Filters and Search Bar Card */}
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

          {/* Behavior Risk Selector (3อ. 2ส.) */}
          <div className="w-56 shrink-0">
            <MultiSelectDropdown 
              options={["food", "exercise", "sleep", "smoking", "alcohol", "bmi_risk"]}
              selected={filterBehaviorRisk}
              onChange={setFilterBehaviorRisk}
              placeholder="แสดงทุกพฤติกรรมเสี่ยง"
              labelKey={(v) => {
                const map: Record<string, string> = {
                  food: "อาหาร (กินหวาน/มัน/เค็มจัด)",
                  exercise: "การออกกำลังกาย (ไม่ออกเลย)",
                  sleep: "การนอนหลับ (พักผ่อนไม่เพียงพอ)",
                  smoking: "สูบบุหรี่ (ยังสูบอยู่)",
                  alcohol: "ดื่มแอลกอฮอล์ (ดื่มเป็นประจำ/ครั้งคราว)",
                  bmi_risk: "ดัชนีมวลกาย (BMI ท้วม/อ้วนขึ้นไป)"
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
  
              {/* Action: Backup JSON */}
              <button
                onClick={() => {
                  if (isAdmin) {
                    executeExportBackup();
                  } else {
                    alert("กรุณาเข้าสู่ระบบ (มุมบนขวา) ก่อนทำการสำรองข้อมูล");
                  }
                }}
                disabled={records.length === 0}
                className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-all"
              >
                <Download className="w-4 h-4" />
                สำรองข้อมูล
              </button>
  
              {/* Action: Restore JSON */}
              <button 
                onClick={() => {
                  if (isAdmin) {
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  } else {
                    alert("กรุณาเข้าสู่ระบบ (มุมบนขวา) ก่อนทำการนำเข้าข้อมูล");
                  }
                }}
                className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all"
              >
                <Upload className="w-4 h-4" />
                นำเข้าข้อมูล
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".json" 
                onChange={handleImportBackup} 
                className="hidden" 
              />
              </>
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
          <span>เรียงลำดับโดย: {sortBy === "date" ? "วันที่คัดกรอง" : sortBy === "name" ? "ชื่อ-สกุล" : sortBy === "age" ? "อายุ" : "BMI"} ({sortOrder === "desc" ? "ล่าสุด" : "แรกสุด"})</span>
        </div>

      </div>

      {/* Main Data Sheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-150 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th 
                  className="py-3 px-5 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    วันที่ตรวจ / ครั้งที่
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
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
                    BMI
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-5">ผลการจัดการเบื้องต้น</th>
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
                        <span className="font-semibold text-slate-800">{r.date}</span>
                        <span className="text-[10px] text-blue-600 font-bold block">ครั้งที่ {r.visitNumber}</span>
                      </td>

                      {/* Name & Location */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer text-sm" onClick={() => onSelectRecord(r)}>
                          {r.name}
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
                            <>{r.sugar} mg/dL • {r.dmResult?.level === "danger" ? "สงสัยป่วย" : r.dmResult?.level === "risk" ? "กลุ่มเสี่ยง" : "ปกติ"}</>
                          ) : (
                            "ไม่ได้ตรวจ"
                          )}
                        </span>
                      </td>

                      {/* BMI */}
                      <td className="py-4 px-5 text-center">
                        {(() => {
                          const b = parseFloat(r.bmi);
                          if (isNaN(b) || b <= 0) return <span className="font-mono font-bold text-slate-400">-</span>;
                          let colorClass = "";
                          let label = "";
                          if (b < 18.5) { colorClass = "bg-blue-50 text-blue-600 border-blue-200"; label = "ผอม"; }
                          else if (b < 23) { colorClass = "bg-emerald-50 text-emerald-600 border-emerald-200"; label = "ปกติ"; }
                          else if (b < 25) { colorClass = "bg-amber-50 text-amber-600 border-amber-200"; label = "ท้วม"; }
                          else if (b < 30) { colorClass = "bg-rose-50 text-rose-600 border-rose-200"; label = "อ้วน"; }
                          else { colorClass = "bg-purple-50 text-purple-600 border-purple-200"; label = "อ้วนมาก"; }
                          return (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold whitespace-nowrap ${colorClass}`}>
                                {label}
                              </span>
                              <span className="font-mono font-black text-slate-700 text-[11px]">{r.bmi}</span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Management Action */}
                      <td className="py-4 px-5">
                        <span className="font-semibold text-slate-700 block">{r.followUpAction}</span>
                        {r.followUpNote && (
                          <span className="text-[10px] text-slate-400 block max-w-[150px] truncate" title={r.followUpNote}>
                            {r.followUpNote}
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
              <span className="font-semibold text-slate-800">"{recordToDelete.name}"</span> ใช่หรือไม่? <br/>
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
    </div>
  );
};
