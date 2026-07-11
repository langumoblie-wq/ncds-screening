import React, { useState, useMemo, useEffect } from "react";
import { 
  Users, CheckCircle2, AlertTriangle, ShieldAlert, Search, Filter, 
  MapPin, Eye, Trash2, SlidersHorizontal, ArrowUpDown, ChevronDown, 
  Download, FileSpreadsheet, RotateCcw, Cigarette, Wine, Flame, EyeOff,
  Pencil, PlusCircle, History, Apple, Dumbbell, Smile, Moon, Activity, Upload
} from "lucide-react";
import { ScreeningRecord, DistrictType, LOCATION_DATA } from "../types";

interface NcdDashboardProps {
  records: ScreeningRecord[];
  onDeleteRecord: (id: number) => void;
  onSelectRecord: (record: ScreeningRecord) => void;
  onEditRecord?: (record: ScreeningRecord) => void;
  onAddScreeningClicked?: () => void;
  onFollowUpRecord?: (record: ScreeningRecord) => void;
  onImportRecords?: (records: ScreeningRecord[]) => void;
}

// Reusable custom circular progress gauge
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
          <div className="space-y-2 w-full max-w-[140px]">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-slate-600 font-medium">ปกติ</span>
              </div>
              <span className="font-bold text-slate-800">{normal} ราย ({pctNormal}%)</span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                <span className="text-slate-600 font-medium">กลุ่มเสี่ยง</span>
              </div>
              <span className="font-bold text-slate-800">{risk} ราย ({pctRisk}%)</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                <span className="text-slate-600 font-medium">สงสัยป่วย</span>
              </div>
              <span className="font-bold text-slate-800">{danger} ราย ({pctDanger}%)</span>
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
  const [filterModel, setFilterModel] = useState<"หมู่บ้าน" | "ตำบล" | "">("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [filterSubdistrict, setFilterSubdistrict] = useState<string>("");
  const [filterTargetArea, setFilterTargetArea] = useState<string>("");
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "age" | "bmi">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Cascading dropdown updates for filters
  useEffect(() => {
    setFilterDistrict("");
    setFilterSubdistrict("");
    setFilterTargetArea("");
  }, [filterModel]);

  useEffect(() => {
    setFilterSubdistrict("");
    setFilterTargetArea("");
  }, [filterDistrict]);

  useEffect(() => {
    setFilterTargetArea("");
  }, [filterSubdistrict]);

  // Dynamic options for filters
  const availableDistricts = useMemo(() => {
    if (filterModel) {
      return Object.keys(LOCATION_DATA[filterModel]) as DistrictType[];
    }
    const districtsSet = new Set<string>();
    Object.keys(LOCATION_DATA["หมู่บ้าน"]).forEach(d => districtsSet.add(d));
    Object.keys(LOCATION_DATA["ตำบล"]).forEach(d => districtsSet.add(d));
    return Array.from(districtsSet) as DistrictType[];
  }, [filterModel]);

  const availableSubdistricts = useMemo(() => {
    if (!filterDistrict) return [];
    if (filterModel) {
      const subdistMap = (LOCATION_DATA[filterModel] as any)?.[filterDistrict] || {};
      return Object.keys(subdistMap);
    }
    const subdistSet = new Set<string>();
    const mbSubdists = (LOCATION_DATA["หมู่บ้าน"] as any)?.[filterDistrict] || {};
    const tbSubdists = (LOCATION_DATA["ตำบล"] as any)?.[filterDistrict] || {};
    Object.keys(mbSubdists).forEach(s => subdistSet.add(s));
    Object.keys(tbSubdists).forEach(s => subdistSet.add(s));
    return Array.from(subdistSet);
  }, [filterModel, filterDistrict]);

  const availableTargetAreas = useMemo(() => {
    if (!filterDistrict || !filterSubdistrict) return [];
    if (filterModel) {
      return (LOCATION_DATA[filterModel] as any)?.[filterDistrict]?.[filterSubdistrict] || [];
    }
    const areaSet = new Set<string>();
    const mbAreas = (LOCATION_DATA["หมู่บ้าน"] as any)?.[filterDistrict]?.[filterSubdistrict] || [];
    const tbAreas = (LOCATION_DATA["ตำบล"] as any)?.[filterDistrict]?.[filterSubdistrict] || [];
    mbAreas.forEach((a: string) => areaSet.add(a));
    tbAreas.forEach((a: string) => areaSet.add(a));
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
        const matchesModel = filterModel ? recordModel === filterModel : true;

        // District filter
        const matchesDistrict = filterDistrict ? r.district === filterDistrict : true;

        // Subdistrict filter
        const matchesSubdistrict = filterSubdistrict ? r.subdistrict === filterSubdistrict : true;

        // Target Area filter
        const matchesTargetArea = filterTargetArea ? r.targetArea === filterTargetArea : true;

        // Risk Level filter
        let rLevel = "normal";
        const htLevel = r.htResult?.level || "normal";
        const dmLevel = r.dmResult?.level || "normal";
        if (htLevel === "danger" || dmLevel === "danger") {
          rLevel = "danger";
        } else if (htLevel === "risk" || dmLevel === "risk") {
          rLevel = "risk";
        }

        const matchesRisk = filterRiskLevel ? rLevel === filterRiskLevel : true;

        return matchesSearch && matchesModel && matchesDistrict && matchesSubdistrict && matchesTargetArea && matchesRisk;
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
  }, [records, searchTerm, filterModel, filterDistrict, filterSubdistrict, filterTargetArea, filterRiskLevel, sortBy, sortOrder]);

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
      if (r.smoking?.includes("สูบอยู่")) smokeCount++;
      
      const isAlcohol = r.alcohol?.includes("ประจำ") || r.alcohol?.includes("ครั้งคราว");
      if (isAlcohol) alcoholCount++;
      
      if (r.exercise?.includes("ไม่ออก")) noExerciseCount++;
      if (r.sleep?.includes("น้อยกว่า 6")) poorSleepCount++;

      const hasSweetRisk = r.foodHabit?.sweet?.level === "danger" || r.foodHabit?.sweet?.level === "risk";
      const hasFatRisk = r.foodHabit?.fat?.level === "danger" || r.foodHabit?.fat?.level === "risk";
      const hasSaltRisk = r.foodHabit?.salt?.level === "danger" || r.foodHabit?.salt?.level === "risk" || r.sodium?.includes("เค็มประจำ") || r.sodium?.includes("ปานกลาง");

      if (hasSweetRisk) foodSweetCount++;
      if (hasFatRisk) foodFatCount++;
      if (hasSaltRisk) foodSaltCount++;
      
      if (hasSweetRisk || hasFatRisk || r.sodium?.includes("เค็มประจำ") || r.foodHabit?.salt?.level === "danger") {
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
      { name: "การรับประทานเค็มจัด/ปรุงรสเค็ม (อ.อาหาร)", count: stats.lifestyle.foodSaltCount, pct: Math.round((stats.lifestyle.foodSaltCount / total) * 150) }, // fallback multiplier check or raw pct
      { name: "การขาดการออกกำลังกาย (อ.ออกกำลังกาย)", count: stats.lifestyle.noExerciseCount, pct: Math.round((stats.lifestyle.noExerciseCount / total) * 100) },
      { name: "การนอนหลับพักผ่อนไม่เพียงพอ (อ.อารมณ์)", count: stats.lifestyle.poorSleepCount, pct: Math.round((stats.lifestyle.poorSleepCount / total) * 100) },
      { name: "การสูบบุหรี่ประจำ (ส.สูบ)", count: stats.lifestyle.smokeCount, pct: Math.round((stats.lifestyle.smokeCount / total) * 100) },
      { name: "การดื่มเครื่องดื่มแอลกอฮอล์ (ส.สุรา)", count: stats.lifestyle.alcoholCount, pct: Math.round((stats.lifestyle.alcoholCount / total) * 100) },
    ];
    
    // Fix percentages for salt
    behaviors[2].pct = Math.round((stats.lifestyle.foodSaltCount / total) * 100);

    const sortedBehaviors = [...behaviors].sort((a, b) => b.count - a.count);
    const topBehavior = sortedBehaviors[0];

    return {
      total,
      normalPct,
      riskPct,
      dangerPct,
      totalUnhealthyPct,
      mainIssue,
      mainIssuePct,
      topBehavior,
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

  const handleExportBackup = () => {
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
          {(filterModel || filterDistrict || filterSubdistrict || filterTargetArea) && (
            <button 
              onClick={() => {
                setFilterModel("");
                setFilterDistrict("");
                setFilterSubdistrict("");
                setFilterTargetArea("");
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
            <select 
              value={filterModel} 
              onChange={(e) => setFilterModel(e.target.value as any)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
            >
              <option value="">ทั้งหมด (หมู่บ้าน / ตำบล)</option>
              <option value="หมู่บ้าน">หมู่บ้าน</option>
              <option value="ตำบล">ตำบล</option>
            </select>
          </div>

          {/* 2. District Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">อำเภอ</label>
            <select 
              value={filterDistrict} 
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
            >
              <option value="">ทุกอำเภอ</option>
              {availableDistricts.map((dist) => (
                <option key={dist} value={dist}>อ.{dist}</option>
              ))}
            </select>
          </div>

          {/* 3. Subdistrict Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">ตำบล</label>
            <select 
              value={filterSubdistrict} 
              onChange={(e) => setFilterSubdistrict(e.target.value)}
              disabled={!filterDistrict}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{filterDistrict ? "ทุกตำบล" : "โปรดเลือกอำเภอก่อน"}</option>
              {availableSubdistricts.map((sub, idx) => (
                <option key={idx} value={sub}>ต.{sub}</option>
              ))}
            </select>
          </div>

          {/* 4. Target Area Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">พื้นที่เป้าหมาย / หมู่บ้าน</label>
            <select 
              value={filterTargetArea} 
              onChange={(e) => setFilterTargetArea(e.target.value)}
              disabled={!filterSubdistrict}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{filterSubdistrict ? "ทุกพื้นที่เป้าหมาย" : "โปรดเลือกตำบลก่อน"}</option>
              {availableTargetAreas.map((area, idx) => (
                <option key={idx} value={area}>{area}</option>
              ))}
            </select>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hypertension Gauge */}
        <RiskDoughnut 
          normal={stats.ht.normal} 
          risk={stats.ht.risk} 
          danger={stats.ht.danger} 
          title="สัดส่วนความเสี่ยงโรคความดันโลหิตสูง (HT)" 
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Risk Level Selector */}
          <select 
            value={filterRiskLevel} 
            onChange={(e) => setFilterRiskLevel(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 shrink-0 font-semibold text-slate-700"
          >
            <option value="">แสดงทุกกลุ่มเสี่ยง</option>
            <option value="normal">กลุ่มปกติ (ขาว)</option>
            <option value="risk">กลุ่มเสี่ยงสูง (เหลือง)</option>
            <option value="danger">สงสัยป่วย (แดง)</option>
          </select>

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

            {/* Action: Backup JSON */}
            <button
              onClick={handleExportBackup}
              disabled={records.length === 0}
              className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-all"
            >
              <Download className="w-4 h-4" />
              สำรองข้อมูล
            </button>

            {/* Action: Restore JSON */}
            <label className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all">
              <Upload className="w-4 h-4" />
              นำเข้าข้อมูล
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportBackup} 
                className="hidden" 
              />
            </label>

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
                      <td className="py-4 px-5 text-center font-mono font-bold text-slate-700">
                        {r.bmi}
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
                          {onEditRecord && (
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
                          <button
                            onClick={() => setRecordToDelete(r)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="ลบรายงานนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    </div>
  );
};
