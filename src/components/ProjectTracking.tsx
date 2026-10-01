import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScreeningRecord, EXACT_LOCATION_LIST } from "../types";
import { supabase } from "../lib/supabase";
import { 
  getRecordModel, 
  getRecordSubdistrict,
  cleanDistrict,
  cleanSubdistrict,
  cleanTargetArea,
  matchesDistrictFilter,
  matchesModelFilter,
  matchesSubdistrictFilter,
  matchesTargetAreaFilter
} from "./BackupRestoreModal";
import { 
  Target, Users, Activity, Filter, Map, ChevronRight, ChevronDown, 
  BarChart3, Edit2, Check, AlertCircle, TrendingUp, Trophy, Printer,
  Database, Save, RefreshCw, Settings, CheckCircle2, X, Search, Sparkles,
  Calendar, Layers, Table, FileSpreadsheet, History
} from "lucide-react";

interface ProjectTrackingProps {
  records: ScreeningRecord[];
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
    <div className="relative w-full sm:w-auto flex-1 min-w-[150px] md:min-w-[170px]" ref={containerRef}>
      <div 
        className={`w-full text-sm border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 outline-none cursor-pointer flex justify-between items-center ${disabled ? 'text-slate-400' : 'text-slate-700 font-semibold'} hover:bg-slate-100 transition-colors`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate pr-2">
          {selected.length === 0 ? placeholder : selected.map(labelKey).join(', ')}
        </div>
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

export const ProjectTracking: React.FC<ProjectTrackingProps> = ({ records }) => {
  const [modelFilter, setModelFilter] = useState<string[]>([]);
  const [districtFilter, setDistrictFilter] = useState<string[]>([]);
  const [subdistrictFilter, setSubdistrictFilter] = useState<string[]>([]);
  const [targetAreaFilter, setTargetAreaFilter] = useState<string[]>([]);
  const [riskFilter, setRiskFilter] = useState<string[]>([]);
  const [participantFilter, setParticipantFilter] = useState<string[]>([]);
  const [trackingViewMode, setTrackingViewMode] = useState<"targets" | "visits" | "both">("both");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Database synchronization & Target modal states
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalModelFilter, setModalModelFilter] = useState<string>("all");
  const [tempModalTargets, setTempModalTargets] = useState<Record<string, number>>({});

  // 1. Initial Load: Server Database API (/api/project-targets) + Supabase + LocalStorage
  useEffect(() => {
    let isMounted = true;
    async function loadProjectTargets() {
      // Step A: Instant display from localStorage
      try {
        const saved = localStorage.getItem("ncd_project_targets");
        if (saved && isMounted) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setTargets(parsed);
          }
        }
      } catch (e) {}

      // Step B: Fetch from persistent server backend (/api/project-targets)
      try {
        const res = await fetch("/api/project-targets");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.targets && isMounted) {
            setTargets(prev => {
              const merged = { ...prev, ...json.targets };
              localStorage.setItem("ncd_project_targets", JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (apiErr) {
        console.warn("Server API fetch warning for project targets:", apiErr);
      }

      // Step C: Attempt sync from Supabase if table exists
      try {
        const { data, error } = await supabase.from("project_targets").select("*");
        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          const sbMap: Record<string, number> = {};
          data.forEach((row: any) => {
            if (row.key && row.target != null) {
              sbMap[row.key] = Number(row.target);
            }
          });
          if (Object.keys(sbMap).length > 0) {
            setTargets(prev => {
              const merged = { ...prev, ...sbMap };
              localStorage.setItem("ncd_project_targets", JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (sbErr) {
        // Fallback safely to server API
      }
    }

    loadProjectTargets();
    return () => { isMounted = false; };
  }, []);

  // 2. Save single target to state, localStorage, server database API, and Supabase
  const saveTarget = async (key: string, valueToSave?: number) => {
    const num = valueToSave !== undefined ? valueToSave : parseInt(editValue, 10);
    if (!isNaN(num) && num >= 0) {
      const newTargets = { ...targets, [key]: num };
      setTargets(newTargets);
      localStorage.setItem("ncd_project_targets", JSON.stringify(newTargets));
      setIsSavingTarget(true);

      // Save to server database API
      try {
        await fetch("/api/project-targets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, target: num })
        });
      } catch (apiErr) {
        console.warn("Failed saving target to server API:", apiErr);
      }

      // Save to Supabase (if table exists)
      try {
        await supabase.from("project_targets").upsert({
          key,
          target: num,
          updated_at: new Date().toISOString()
        });
      } catch (sbErr) {}

      setIsSavingTarget(false);
      setSaveSuccessMsg(`บันทึกเป้าหมาย ${num} คน ลงฐานข้อมูลเรียบร้อยแล้ว`);
      setTimeout(() => setSaveSuccessMsg(""), 3000);
    }
    setEditingKey(null);
  };

  // 3. Save bulk targets from Target Configuration Modal to database
  const saveBulkModalTargets = async () => {
    setIsSavingTarget(true);
    const newTargets = { ...targets, ...tempModalTargets };
    setTargets(newTargets);
    localStorage.setItem("ncd_project_targets", JSON.stringify(newTargets));

    // Save to server database API
    try {
      await fetch("/api/project-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: newTargets })
      });
    } catch (apiErr) {
      console.warn("Failed bulk saving targets to server API:", apiErr);
    }

    // Save to Supabase
    try {
      const rows = Object.entries(newTargets).map(([k, val]) => ({
        key: k,
        target: val,
        updated_at: new Date().toISOString()
      }));
      await supabase.from("project_targets").upsert(rows);
    } catch (sbErr) {}

    setIsSavingTarget(false);
    setIsTargetModalOpen(false);
    setSaveSuccessMsg("บันทึกเป้าหมายทุกพื้นที่ลงฐานข้อมูลเรียบร้อยแล้ว");
    setTimeout(() => setSaveSuccessMsg(""), 3500);
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') saveTarget(key);
    if (e.key === 'Escape') setEditingKey(null);
  };

  const startEdit = (key: string, currentTarget: number) => {
    setEditValue(currentTarget > 0 ? currentTarget.toString() : "");
    setEditingKey(key);
  };

  // Get distinct districts for filter
  const allDistricts = useMemo(() => {
    const d = new Set<string>();
    const allKnownDistricts = ["เมือง", "ละงู", "ท่าแพ", "ควนกาหลง", "ควนโดน", "ทุ่งหว้า", "มะนัง"];
    allKnownDistricts.forEach(dist => d.add(dist));
    EXACT_LOCATION_LIST.forEach(loc => {
      if (loc.district) d.add(cleanDistrict(loc.district));
    });
    records.forEach(r => {
      if (r.district) d.add(cleanDistrict(r.district));
    });
    return Array.from(d).sort();
  }, [records]);

  // Available subdistricts based on selected model and district filters
  const allSubdistricts = useMemo(() => {
    const subs = new Set<string>();
    
    // From official EXACT_LOCATION_LIST
    EXACT_LOCATION_LIST.forEach(loc => {
      const matchModel = modelFilter.length === 0 || matchesModelFilter({ modelType: loc.model as any }, modelFilter);
      const matchDist = districtFilter.length === 0 || matchesDistrictFilter(loc.district, districtFilter);
      if (matchModel && matchDist && loc.subdistrict) {
        subs.add(cleanSubdistrict(loc.subdistrict));
      }
    });

    // From records
    records.forEach(r => {
      const matchModel = modelFilter.length === 0 || matchesModelFilter({ modelType: (r.modelType || getRecordModel(r)) as any }, modelFilter);
      const matchDist = districtFilter.length === 0 || matchesDistrictFilter(r.district, districtFilter);
      if (matchModel && matchDist) {
        const sub = cleanSubdistrict(r.subdistrict || getRecordSubdistrict(r));
        if (sub) subs.add(sub);
      }
    });

    return Array.from(subs).filter(Boolean).sort();
  }, [records, modelFilter, districtFilter]);

  // Available target areas based on selected model, district, and subdistrict filters
  const allTargetAreas = useMemo(() => {
    const areas = new Set<string>();

    // From official EXACT_LOCATION_LIST
    EXACT_LOCATION_LIST.forEach(loc => {
      const matchModel = modelFilter.length === 0 || matchesModelFilter({ modelType: loc.model as any }, modelFilter);
      const matchDist = districtFilter.length === 0 || matchesDistrictFilter(loc.district, districtFilter);
      const matchSub = subdistrictFilter.length === 0 || matchesSubdistrictFilter(loc.subdistrict, subdistrictFilter);
      if (matchModel && matchDist && matchSub && loc.targetArea) {
        areas.add(cleanTargetArea(loc.targetArea));
      }
    });

    // From records
    records.forEach(r => {
      const matchModel = modelFilter.length === 0 || matchesModelFilter({ modelType: (r.modelType || getRecordModel(r)) as any }, modelFilter);
      const matchDist = districtFilter.length === 0 || matchesDistrictFilter(r.district, districtFilter);
      const sub = cleanSubdistrict(r.subdistrict || getRecordSubdistrict(r));
      const matchSub = subdistrictFilter.length === 0 || matchesSubdistrictFilter(sub, subdistrictFilter);
      if (matchModel && matchDist && matchSub && r.targetArea) {
        areas.add(cleanTargetArea(r.targetArea));
      }
    });

    return Array.from(areas).filter(Boolean).sort();
  }, [records, modelFilter, districtFilter, subdistrictFilter]);

  // Cascade clear/prune dependent subdistricts when district filter changes
  useEffect(() => {
    if (subdistrictFilter.length > 0) {
      setSubdistrictFilter(prev => prev.filter(s => allSubdistricts.includes(s)));
    }
  }, [allSubdistricts]);

  // Cascade clear/prune dependent target areas when district or subdistrict filter changes
  useEffect(() => {
    if (targetAreaFilter.length > 0) {
      setTargetAreaFilter(prev => prev.filter(a => allTargetAreas.includes(a)));
    }
  }, [allTargetAreas]);

  // Filtered records based on participant category, health risk, model, district, subdistrict, and target area
  const filteredRecords = useMemo(() => {
    let list = records;
    if (riskFilter.length > 0) {
      list = list.filter(r => {
        const smoking = r.smoking?.includes("สูบอยู่") || r.smoking?.includes("ประจำ");
        const alcohol = r.alcohol?.includes("ประจำ") || r.alcohol?.includes("ครั้งคราว");
        const exercise = r.exercise?.includes("ไม่ออก") || r.exercise?.includes("นั่งนิ่ง");
        const sleep = r.sleep?.includes("น้อยกว่า 6") || r.sleep?.includes("ไม่เพียงพอ");
        const food = ["เสี่ยงสูง", "เสี่ยงสูงมาก"].includes(r.foodHabit?.sweet?.level || "") ||
                     ["เสี่ยงสูง", "เสี่ยงสูงมาก"].includes(r.foodHabit?.fat?.level || "") ||
                     ["เสี่ยงสูง", "เสี่ยงสูงมาก"].includes(r.foodHabit?.salt?.level || "");
        
        return riskFilter.some(filter => {
          switch (filter) {
            case "3a2s": return smoking || alcohol || exercise || sleep || food;
            case "smoking": return smoking;
            case "alcohol": return alcohol;
            case "exercise": return exercise;
            case "food": return food;
            case "sleep": return sleep;
            default: return true;
          }
        });
      });
    }

    if (participantFilter.length > 0) {
      list = list.filter(r => {
        const pType = r.participantType || "กลุ่มเป้าหมายโครงการ";
        return participantFilter.includes(pType);
      });
    }

    if (modelFilter.length > 0) {
      list = list.filter(r => matchesModelFilter({ modelType: r.modelType as any }, modelFilter));
    }

    if (districtFilter.length > 0) {
      list = list.filter(r => matchesDistrictFilter(r.district, districtFilter));
    }

    if (subdistrictFilter.length > 0) {
      list = list.filter(r => {
        const sub = cleanSubdistrict(r.subdistrict || getRecordSubdistrict(r));
        return matchesSubdistrictFilter(sub, subdistrictFilter);
      });
    }

    if (targetAreaFilter.length > 0) {
      list = list.filter(r => matchesTargetAreaFilter(r.targetArea, targetAreaFilter));
    }

    return list;
  }, [records, riskFilter, participantFilter, modelFilter, districtFilter, subdistrictFilter, targetAreaFilter]);

  // Overall Project Visits Breakdown (ตารางสรุปผลงานตามรายการครั้งที่ ภาพรวมทั้งโครงการ)
  const visitsSummary = useMemo(() => {
    const map: Record<number, {
      visitNumber: number;
      label: string;
      total: number;
      uniquePatients: Set<string>;
      targetGroupCount: number;
      committeeCount: number;
      normalCount: number;
      riskCount: number;
      dangerCount: number;
      bmiSum: number;
      bmiCount: number;
      bpSysSum: number;
      bpSysCount: number;
      sugarSum: number;
      sugarCount: number;
    }> = {};

    let totalVisitsCount = 0;
    filteredRecords.forEach(r => {
      const v = r.visitNumber || 1;
      totalVisitsCount++;
      if (!map[v]) {
        map[v] = {
          visitNumber: v,
          label: v === 1 ? "ครั้งที่ 1 (คัดกรองแรกรับ)" : `ครั้งที่ ${v} (ติดตาม #${v - 1})`,
          total: 0,
          uniquePatients: new Set(),
          targetGroupCount: 0,
          committeeCount: 0,
          normalCount: 0,
          riskCount: 0,
          dangerCount: 0,
          bmiSum: 0,
          bmiCount: 0,
          bpSysSum: 0,
          bpSysCount: 0,
          sugarSum: 0,
          sugarCount: 0,
        };
      }

      const item = map[v];
      item.total += 1;
      if (r.name) item.uniquePatients.add(r.name);

      if (r.participantType === "คณะทำงาน") {
        item.committeeCount += 1;
      } else {
        item.targetGroupCount += 1;
      }

      const ht = r.htResult?.level || "normal";
      const dm = r.dmResult?.level || "normal";
      if (ht === "danger" || dm === "danger") {
        item.dangerCount += 1;
      } else if (ht === "risk" || dm === "risk") {
        item.riskCount += 1;
      } else {
        item.normalCount += 1;
      }

      const b = parseFloat(r.bmi);
      if (!isNaN(b) && b > 0) {
        item.bmiSum += b;
        item.bmiCount += 1;
      }
      const s = Number(r.bpSys);
      if (!isNaN(s) && s > 0) {
        item.bpSysSum += s;
        item.bpSysCount += 1;
      }
      const sug = Number(r.sugar);
      if (!isNaN(sug) && sug > 0) {
        item.sugarSum += sug;
        item.sugarCount += 1;
      }
    });

    const list = Object.values(map).sort((a, b) => a.visitNumber - b.visitNumber);
    const v1Count = map[1] ? map[1].total : 0;

    const listWithStats = list.map(item => {
      const retention = v1Count > 0 ? (item.total / v1Count) * 100 : 0;
      const normalPct = item.total > 0 ? (item.normalCount / item.total) * 100 : 0;
      const riskPct = item.total > 0 ? (item.riskCount / item.total) * 100 : 0;
      const dangerPct = item.total > 0 ? (item.dangerCount / item.total) * 100 : 0;
      const avgBmi = item.bmiCount > 0 ? (item.bmiSum / item.bmiCount).toFixed(1) : "-";
      const avgBpSys = item.bpSysCount > 0 ? Math.round(item.bpSysSum / item.bpSysCount) : "-";
      const avgSugar = item.sugarCount > 0 ? Math.round(item.sugarSum / item.sugarCount) : "-";

      return {
        ...item,
        uniqueCount: item.uniquePatients.size,
        retention,
        normalPct,
        riskPct,
        dangerPct,
        avgBmi,
        avgBpSys,
        avgSugar
      };
    });

    const totalUniqueAll = new Set(filteredRecords.map(r => r.name).filter(Boolean)).size;
    const peopleWithMultipleVisits = Object.values(
      filteredRecords.reduce((acc, r) => {
        if (!r.name) return acc;
        acc[r.name] = (acc[r.name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).filter(c => c > 1).length;

    const followUpRetentionRate = totalUniqueAll > 0 ? (peopleWithMultipleVisits / totalUniqueAll) * 100 : 0;

    return {
      list: listWithStats,
      totalVisitsCount,
      v1Count,
      totalUniqueAll,
      peopleWithMultipleVisits,
      followUpRetentionRate
    };
  }, [filteredRecords]);

  const stats = useMemo(() => {
    // group by: modelType + district + area
    const grouped: Record<string, {
      modelType: string;
      district: string;
      subdistrict?: string;
      area: string;
      uniquePatients: Set<string>;
      totalVisits: number;
      records: ScreeningRecord[];
    }> = {};

    // Pre-populate all official project locations so targets can be set and tracked even before records are added
    EXACT_LOCATION_LIST.forEach(loc => {
      const key = `${loc.model}|${loc.district}|${loc.targetArea}`;
      grouped[key] = {
        modelType: loc.model,
        district: loc.district,
        subdistrict: loc.subdistrict,
        area: loc.targetArea,
        uniquePatients: new Set(),
        totalVisits: 0,
        records: []
      };
    });

    filteredRecords.forEach(r => {
      const mType = r.modelType || getRecordModel(r) || "หมู่บ้าน";
      const sub = cleanSubdistrict(r.subdistrict || getRecordSubdistrict(r));
      const dist = cleanDistrict(r.district) || "เมือง";

      // Match with EXACT_LOCATION_LIST entry if targetArea matches
      const matchedLoc = EXACT_LOCATION_LIST.find(loc => 
        loc.model === mType && 
        cleanDistrict(loc.district) === dist &&
        (loc.targetArea === r.targetArea || (r.targetArea && matchesTargetAreaFilter(r.targetArea, [loc.targetArea])))
      );

      const area = matchedLoc ? matchedLoc.targetArea : (r.targetArea || (sub ? `ต.${sub}` : "ไม่ระบุพื้นที่"));
      const finalSub = matchedLoc?.subdistrict || sub;
      const key = `${mType}|${dist}|${area}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          modelType: mType,
          district: dist,
          subdistrict: finalSub,
          area: area,
          uniquePatients: new Set(),
          totalVisits: 0,
          records: []
        };
      }
      
      if (r.name) {
        grouped[key].uniquePatients.add(r.name);
      }
      grouped[key].totalVisits += 1;
      grouped[key].records.push(r);
    });

    let result = Object.entries(grouped).map(([key, data]) => {
      const target = targets[key] || 0;
      const achieved = data.uniquePatients.size;
      const percent = target > 0 ? (achieved / target) * 100 : 0;
      
      const visitBreakdown: Record<number, Set<string>> = {};
      const nameCounts: Record<string, number> = {};
      const duplicates: {name: string, count: number, visits: {vNum: number, date: string}[]}[] = [];

      data.records.forEach(r => {
        const vNum = r.visitNumber || 1;
        if (!visitBreakdown[vNum]) visitBreakdown[vNum] = new Set();
        if (r.name) {
          visitBreakdown[vNum].add(r.name);
          nameCounts[r.name] = (nameCounts[r.name] || 0) + 1;
        }
      });

      for (const [name, count] of Object.entries(nameCounts)) {
        if (count > 1) {
          const personVisits = data.records
            .filter(r => r.name === name)
            .map(r => ({ vNum: r.visitNumber || 1, date: r.date || "" }))
            .sort((a,b) => a.vNum - b.vNum);
          duplicates.push({ name, count, visits: personVisits });
        }
      }

      const visits = Object.entries(visitBreakdown).map(([v, s]) => ({
        visitNumber: parseInt(v),
        count: s.size,
        percent: target > 0 ? (s.size / target) * 100 : 0
      })).sort((a, b) => a.visitNumber - b.visitNumber);

      const v1Count = (visitBreakdown[1] || new Set<string>()).size;
      const v2Count = (visitBreakdown[2] || new Set<string>()).size;
      const v3Count = (visitBreakdown[3] || new Set<string>()).size;
      let v4PlusCount = 0;
      Object.entries(visitBreakdown).forEach(([vStr, setObj]) => {
        if (parseInt(vStr, 10) >= 4) {
          v4PlusCount += setObj.size;
        }
      });
      const followUpCount = duplicates.length;
      const followUpRate = v1Count > 0 ? (followUpCount / v1Count) * 100 : 0;

      return {
        key,
        ...data,
        achieved,
        target,
        percent: Math.min(percent, 100),
        realPercent: percent,
        visitsBreakdown: visits,
        duplicates,
        v1Count,
        v2Count,
        v3Count,
        v4PlusCount,
        followUpCount,
        followUpRate
      };
    });

    if (modelFilter.length > 0) {
      result = result.filter(r => matchesModelFilter({ modelType: r.modelType as any }, modelFilter));
    }
    if (districtFilter.length > 0) {
      result = result.filter(r => matchesDistrictFilter(r.district, districtFilter));
    }
    if (subdistrictFilter.length > 0) {
      result = result.filter(r => matchesSubdistrictFilter(r.subdistrict, subdistrictFilter));
    }
    if (targetAreaFilter.length > 0) {
      result = result.filter(r => matchesTargetAreaFilter(r.area, targetAreaFilter));
    }
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      result = result.filter(r => 
        r.area.toLowerCase().includes(q) || 
        r.district.toLowerCase().includes(q) || 
        (r.subdistrict && r.subdistrict.toLowerCase().includes(q)) ||
        r.modelType.toLowerCase().includes(q)
      );
    }

    // Sort by progress descending, then by total visits
    result.sort((a, b) => {
      if (b.realPercent !== a.realPercent) return b.realPercent - a.realPercent;
      return b.totalVisits - a.totalVisits;
    });

    return result;
  }, [filteredRecords, targets, modelFilter, districtFilter, subdistrictFilter, targetAreaFilter, tableSearch]);

  const overall = useMemo(() => {
    let totalTarget = 0;
    let totalAchieved = 0;
    let totalVisits = 0;

    stats.forEach(s => {
      totalTarget += s.target;
      totalAchieved += s.achieved;
      totalVisits += s.totalVisits;
    });

    return {
      target: totalTarget,
      achieved: totalAchieved,
      visits: totalVisits,
      percent: totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0
    };
  }, [stats]);

  const getColorClass = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 80) return "bg-teal-500";
    if (percent >= 50) return "bg-amber-400";
    return "bg-rose-500";
  };

  const getTextColorClass = (percent: number) => {
    if (percent >= 100) return "text-emerald-600";
    if (percent >= 80) return "text-teal-600";
    if (percent >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  const hasActiveFilters = participantFilter.length > 0 || 
    riskFilter.length > 0 || 
    modelFilter.length > 0 || 
    districtFilter.length > 0 || 
    subdistrictFilter.length > 0 || 
    targetAreaFilter.length > 0;

  const clearAllFilters = () => {
    setParticipantFilter([]);
    setRiskFilter([]);
    setModelFilter([]);
    setDistrictFilter([]);
    setSubdistrictFilter([]);
    setTargetAreaFilter([]);
  };

  return (
    <div className="space-y-6">
      {/* Print Header (hidden on screen) */}
      <div className="hidden print:block text-center space-y-2 pb-6 border-b border-slate-200 mb-6">
        <h2 className="text-2xl font-black text-slate-800">รายงานสรุปผลและการติดตามโครงการ (Project Tracking)</h2>
        <p className="text-slate-600 font-medium">
          ข้อมูล ณ วันที่ {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <div className="text-sm text-slate-500 flex items-center justify-center gap-4 mt-2 flex-wrap">
          <span>โมเดล: {modelFilter.length === 0 ? "ทั้งหมด" : modelFilter.join(", ")}</span>
          <span>อำเภอ: {districtFilter.length === 0 ? "ทั้งหมด" : districtFilter.map(d => `อ.${d}`).join(", ")}</span>
          <span>ตำบล: {subdistrictFilter.length === 0 ? "ทั้งหมด" : subdistrictFilter.map(s => `ต.${s}`).join(", ")}</span>
          <span>พื้นที่เป้าหมาย: {targetAreaFilter.length === 0 ? "ทั้งหมด" : targetAreaFilter.join(", ")}</span>
          <span>กลุ่มข้อมูล: {participantFilter.length === 0 ? "ทั้งหมด" : participantFilter.join(", ")}</span>
          <span>ความเสี่ยง: {riskFilter.length === 0 ? "ทั้งหมด" : riskFilter.map(v => {
            const map: Record<string, string> = {
              "3a2s": "เสี่ยงสูง (3อ. 2ส.)",
              "smoking": "สูบบุหรี่",
              "alcohol": "ดื่มแอลกอฮอล์",
              "food": "อาหาร (หวาน/มัน/เค็ม)",
              "exercise": "ขาดการออกกำลังกาย",
              "sleep": "การนอนหลับ"
            };
            return map[v] || v;
          }).join(", ")}</span>
        </div>
      </div>
      {/* Header & Overall Summary */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-indigo-500" />
            สรุปผลและการติดตามโครงการ
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-semibold">
            ติดตามความก้าวหน้าการคัดกรองแยกตามโมเดลและพื้นที่เป้าหมาย
          </p>
        </div>

        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto flex-wrap justify-end">
          <button 
            type="button"
            onClick={() => {
              const currentTargets: Record<string, number> = {};
              stats.forEach(s => {
                currentTargets[s.key] = s.target;
              });
              setTempModalTargets(currentTargets);
              setIsTargetModalOpen(true);
            }}
            className="flex text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition-all shadow-xs hover:shadow cursor-pointer items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>กำหนดเป้าหมายทุกพื้นที่</span>
          </button>

          <button 
            onClick={() => window.print()}
            className="hidden md:flex text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors cursor-pointer items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงาน
          </button>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1 md:flex-none md:min-w-[140px]">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">คัดกรองแล้ว</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{overall.achieved}</span>
              <span className="text-xs text-slate-500 font-semibold">คน</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">ทั้งหมด {overall.visits} ครั้ง (visits)</div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1 md:flex-none md:min-w-[140px]">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">เป้าหมายรวม</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{overall.target}</span>
              <span className="text-xs text-slate-500 font-semibold">คน</span>
            </div>
            <div className={`text-xs font-bold mt-1 ${getTextColorClass(overall.percent)}`}>
              คิดเป็น {overall.percent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Database Sync Notification Banner */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold shrink-0">
            <Database className="w-3 h-3" /> บันทึกลงฐานข้อมูลแล้ว
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-3 print:hidden">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 mr-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-600">ตัวกรอง:</span>
          </div>
          
          <MultiSelectDropdown 
            options={["กลุ่มเป้าหมายโครงการ", "คณะทำงาน"]}
            selected={participantFilter}
            onChange={setParticipantFilter}
            placeholder="ทุกกลุ่มข้อมูล"
            labelKey={(v) => v}
          />

          <MultiSelectDropdown 
            options={["3a2s", "smoking", "alcohol", "food", "exercise", "sleep"]}
            selected={riskFilter}
            onChange={setRiskFilter}
            placeholder="ทุกกลุ่มพฤติกรรม"
            labelKey={(v) => {
              const map: Record<string, string> = {
                "3a2s": "เสี่ยงสูง (3อ. 2ส.)",
                "smoking": "เสี่ยง: สูบบุหรี่",
                "alcohol": "เสี่ยง: ดื่มแอลกอฮอล์",
                "food": "เสี่ยง: อาหาร (หวาน/มัน/เค็ม)",
                "exercise": "เสี่ยง: ขาดการออกกำลังกาย",
                "sleep": "เสี่ยง: การนอนหลับ"
              };
              return map[v] || v;
            }}
          />

          <MultiSelectDropdown 
            options={["หมู่บ้าน", "ตำบล", "ไม่ระบุโมเดล"]}
            selected={modelFilter}
            onChange={setModelFilter}
            placeholder="ทุกโมเดล"
            labelKey={(v) => v === "ไม่ระบุโมเดล" ? "ไม่ระบุโมเดล" : `โมเดล${v}`}
          />

          <MultiSelectDropdown 
            options={allDistricts}
            selected={districtFilter}
            onChange={setDistrictFilter}
            placeholder="ทุกอำเภอ"
            labelKey={(v) => `อ.${v}`}
          />

          <MultiSelectDropdown 
            options={allSubdistricts}
            selected={subdistrictFilter}
            onChange={setSubdistrictFilter}
            placeholder="ทุกตำบล"
            labelKey={(v) => `ต.${v}`}
          />

          <MultiSelectDropdown 
            options={allTargetAreas}
            selected={targetAreaFilter}
            onChange={setTargetAreaFilter}
            placeholder="ทุกพื้นที่เป้าหมาย"
            labelKey={(v) => v}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ml-auto"
              title="ล้างตัวกรองทั้งหมด"
            >
              <X className="w-3.5 h-3.5" />
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-bold mr-1 text-[11px]">ตัวกรองที่เลือก:</span>
            {modelFilter.map(m => (
              <span key={m} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 text-[11px]">
                โมเดล: {m}
                <button type="button" onClick={() => setModelFilter(prev => prev.filter(x => x !== m))} className="hover:text-indigo-900 cursor-pointer ml-0.5 font-bold">×</button>
              </span>
            ))}
            {districtFilter.map(d => (
              <span key={d} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100 text-[11px]">
                อ.{d}
                <button type="button" onClick={() => setDistrictFilter(prev => prev.filter(x => x !== d))} className="hover:text-blue-900 cursor-pointer ml-0.5 font-bold">×</button>
              </span>
            ))}
            {subdistrictFilter.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-cyan-50 text-cyan-700 font-semibold border border-cyan-100 text-[11px]">
                ต.{s}
                <button type="button" onClick={() => setSubdistrictFilter(prev => prev.filter(x => x !== s))} className="hover:text-cyan-900 cursor-pointer ml-0.5 font-bold">×</button>
              </span>
            ))}
            {targetAreaFilter.map(a => (
              <span key={a} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 text-[11px]">
                พื้นที่: {a}
                <button type="button" onClick={() => setTargetAreaFilter(prev => prev.filter(x => x !== a))} className="hover:text-emerald-900 cursor-pointer ml-0.5 font-bold">×</button>
              </span>
            ))}
            {participantFilter.map(p => (
              <span key={p} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-semibold border border-purple-100 text-[11px]">
                กลุ่ม: {p}
                <button type="button" onClick={() => setParticipantFilter(prev => prev.filter(x => x !== p))} className="hover:text-purple-900 cursor-pointer ml-0.5 font-bold">×</button>
              </span>
            ))}
            {riskFilter.map(r => (
              <span key={r} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-100 text-[11px]">
                พฤติกรรม: {r}
                <button type="button" onClick={() => setRiskFilter(prev => prev.filter(x => x !== r))} className="hover:text-amber-900 cursor-pointer ml-0.5 font-bold">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* View Mode Switcher and Quick Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
            <Layers className="w-4 h-4 text-indigo-600" />
            โหมดการแสดงผล:
          </span>
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTrackingViewMode("both")}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                trackingViewMode === "both"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              📊 แสดงทุกตารางสรุป
            </button>
            <button
              type="button"
              onClick={() => setTrackingViewMode("visits")}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                trackingViewMode === "visits"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              📋 ตารางสรุปผลงานตามรายการครั้งที่ (Visits Breakdown)
            </button>
            <button
              type="button"
              onClick={() => setTrackingViewMode("targets")}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                trackingViewMode === "targets"
                  ? "bg-white text-indigo-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              🎯 ติดตามเป้าหมายรายพื้นที่ (Target Progress)
            </button>
          </div>
        </div>

        {/* Quick Search for Table */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="ค้นหาพื้นที่ หรือ อำเภอ..."
              className="w-full text-xs rounded-xl border border-slate-200 pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-semibold"
            />
            {tableSearch && (
              <button 
                type="button"
                onClick={() => setTableSearch("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-semibold shrink-0">
            {stats.length} พื้นที่
          </span>
        </div>
      </div>

      {/* SECTION 1: Overall Project Visits Breakdown Table (ตารางสรุปผลงานภาพรวมตามรายการครั้งที่) */}
      {(trackingViewMode === "visits" || trackingViewMode === "both") && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  ตารางสรุปผลงานภาพรวมตามรายการครั้งที่ (Visits Breakdown Summary)
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  วิเคราะห์ผลงานการคัดกรอง สัดส่วนประเภทกลุ่ม สถิติกลุ่มเสี่ยง และอัตราการติดตามต่อเนื่อง (Retention) ในแต่ละครั้ง
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-xl border border-indigo-100">
                ตรวจสะสมทั้งหมด {visitsSummary.totalVisitsCount} บันทึก
              </span>
            </div>
          </div>

          {/* KPI Mini-cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">คัดกรองแรกรับ (ครั้งที่ 1)</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-slate-800">{visitsSummary.v1Count}</span>
                <span className="text-xs text-slate-500">คน</span>
              </div>
              <span className="text-[10px] text-slate-400">กลุ่มตั้งต้นของโครงการ</span>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">ได้รับการติดตามต่อเนื่อง</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-indigo-600">{visitsSummary.peopleWithMultipleVisits}</span>
                <span className="text-xs text-slate-500">คน</span>
              </div>
              <span className="text-[10px] text-indigo-500 font-semibold">รับการตรวจ ≥ 2 ครั้ง</span>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">อัตราการติดตามผลโครงการ</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-emerald-600">
                  {visitsSummary.followUpRetentionRate.toFixed(1)}%
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">Retention Rate</span>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">จำนวนรอบการตรวจสูงสุด</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-purple-600">
                  {visitsSummary.list.length > 0 ? `ครั้งที่ ${visitsSummary.list[visitsSummary.list.length - 1].visitNumber}` : "-"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">รอบการประเมินผล</span>
            </div>
          </div>

          {/* Visits Breakdown Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-bold">รอบการตรวจ (Visit Round)</th>
                  <th className="py-3 px-4 font-bold text-center">จำนวนตรวจ (Visits)</th>
                  <th className="py-3 px-4 font-bold text-center">ผู้รับตรวจ (คน)</th>
                  <th className="py-3 px-4 font-bold text-center text-blue-700">1. กลุ่มเป้าหมาย</th>
                  <th className="py-3 px-4 font-bold text-center text-purple-700">2. คณะทำงาน</th>
                  <th className="py-3 px-4 font-bold text-center text-emerald-700">กลุ่มปกติ</th>
                  <th className="py-3 px-4 font-bold text-center text-amber-700">กลุ่มเสี่ยงสูง</th>
                  <th className="py-3 px-4 font-bold text-center text-rose-700">กลุ่มสงสัยป่วย</th>
                  <th className="py-3 px-4 font-bold text-center text-indigo-700">อัตราติดตาม (Retention)</th>
                  <th className="py-3 px-4 font-bold text-center">เฉลี่ย BMI / SBP / DTX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {visitsSummary.list.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      ยังไม่มีข้อมูลการคัดกรองตามตัวกรองที่เลือก
                    </td>
                  </tr>
                ) : (
                  visitsSummary.list.map((item) => (
                    <tr key={item.visitNumber} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.visitNumber === 1 ? "bg-blue-500" : "bg-indigo-500"}`} />
                          <span className="font-bold text-slate-800 text-xs">{item.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-slate-800 text-sm">
                        {item.total}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {item.uniqueCount} คน
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                          {item.targetGroupCount} ({item.total > 0 ? Math.round((item.targetGroupCount / item.total) * 100) : 0}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                          {item.committeeCount} ({item.total > 0 ? Math.round((item.committeeCount / item.total) * 100) : 0}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                          {item.normalCount} ({item.normalPct.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                          {item.riskCount} ({item.riskPct.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                          {item.dangerCount} ({item.dangerPct.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-black ${item.visitNumber === 1 ? "text-slate-600" : "text-indigo-600"}`}>
                            {item.visitNumber === 1 ? "100% (ฐาน)" : `${item.retention.toFixed(1)}%`}
                          </span>
                          {item.visitNumber > 1 && (
                            <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-full rounded-full" 
                                style={{ width: `${Math.min(item.retention, 100)}%` }} 
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-600">
                        {item.avgBmi} / {item.avgBpSys} / {item.avgSugar}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {visitsSummary.list.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/80 font-black text-slate-800 border-t-2 border-slate-300">
                    <td className="py-3 px-4">รวมทั้งสิ้น (Total)</td>
                    <td className="py-3 px-4 text-center text-sm font-black">{visitsSummary.totalVisitsCount}</td>
                    <td className="py-3 px-4 text-center">{visitsSummary.totalUniqueAll} คน</td>
                    <td className="py-3 px-4 text-center text-blue-800">
                      {visitsSummary.list.reduce((sum, i) => sum + i.targetGroupCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-purple-800">
                      {visitsSummary.list.reduce((sum, i) => sum + i.committeeCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-800">
                      {visitsSummary.list.reduce((sum, i) => sum + i.normalCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-amber-800">
                      {visitsSummary.list.reduce((sum, i) => sum + i.riskCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-rose-800">
                      {visitsSummary.list.reduce((sum, i) => sum + i.dangerCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-indigo-800">
                      ติดตาม {visitsSummary.followUpRetentionRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] text-slate-500 font-semibold">
                      (BMI/BP/DTX)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: Area × Visits Breakdown Matrix Table (ตารางแจกแจงผลงานรายพื้นที่เป้าหมายแยกตามครั้งที่) */}
      {(trackingViewMode === "visits" || trackingViewMode === "both") && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 text-white p-2.5 rounded-2xl shadow-sm">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  ตารางแจกแจงผลงานรายพื้นที่เป้าหมาย x รายการครั้งที่ (Area × Visits Breakdown Matrix)
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  ติดตามผลงานการคัดกรองครั้งที่ 1 (แรกรับ) และการติดตามผลครั้งที่ 2, 3, 4+ จำแนกรายพื้นที่โครงการ
                </p>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              พื้นที่แสดงผล: <strong className="text-slate-800">{stats.length}</strong> แห่ง
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-bold w-12 text-center">ลำดับ</th>
                  <th className="py-3 px-4 font-bold">พื้นที่เป้าหมาย (Area)</th>
                  <th className="py-3 px-4 font-bold">โมเดล / อำเภอ</th>
                  <th className="py-3 px-4 font-bold text-center text-slate-700">เป้าหมาย (คน)</th>
                  <th className="py-3 px-4 font-bold text-center text-indigo-700">ยอดรวม (Visits)</th>
                  <th className="py-3 px-4 font-bold text-center text-blue-700 bg-blue-50/50">ครั้งที่ 1 (แรกรับ)</th>
                  <th className="py-3 px-4 font-bold text-center text-indigo-700 bg-indigo-50/50">ครั้งที่ 2 (ติดตาม 1)</th>
                  <th className="py-3 px-4 font-bold text-center text-purple-700 bg-purple-50/50">ครั้งที่ 3 (ติดตาม 2)</th>
                  <th className="py-3 px-4 font-bold text-center text-fuchsia-700 bg-fuchsia-50/50">ครั้งที่ 4+ (ติดตาม 3+)</th>
                  <th className="py-3 px-4 font-bold text-center text-teal-700">อัตราติดตาม (% Follow-up)</th>
                  <th className="py-3 px-4 font-bold text-center text-emerald-700">ความก้าวหน้า (% Progress)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      ไม่พบพื้นที่ที่ตรงกับตัวกรอง
                    </td>
                  </tr>
                ) : (
                  stats.map((s, idx) => (
                    <tr key={s.key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {s.area}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            s.modelType === "ตำบล" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {s.modelType}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {s.district}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {s.target > 0 ? `${s.target.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-indigo-600 text-sm">
                        {s.totalVisits}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700 bg-blue-50/20">
                        {s.v1Count}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-700 bg-indigo-50/20">
                        {s.v2Count}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-purple-700 bg-purple-50/20">
                        {s.v3Count}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-fuchsia-700 bg-fuchsia-50/20">
                        {s.v4PlusCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                          s.followUpRate >= 50 
                            ? "bg-teal-50 text-teal-700" 
                            : s.followUpRate > 0 
                            ? "bg-amber-50 text-amber-700" 
                            : "text-slate-400"
                        }`}>
                          {s.followUpRate > 0 ? `${s.followUpRate.toFixed(1)}%` : "0%"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.target > 0 ? (
                          <span className={`font-black px-2 py-0.5 rounded-md ${getTextColorClass(s.realPercent)} bg-slate-50`}>
                            {s.realPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">ยังไม่ตั้งเป้า</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {stats.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/80 font-black text-slate-800 border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-4">รวมทุกพื้นที่ ({stats.length} แห่ง)</td>
                    <td className="py-3 px-4 text-center text-slate-800 font-black">
                      {stats.reduce((sum, s) => sum + s.target, 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center text-indigo-700 text-sm font-black">
                      {stats.reduce((sum, s) => sum + s.totalVisits, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-blue-800 bg-blue-100/50">
                      {stats.reduce((sum, s) => sum + s.v1Count, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-indigo-800 bg-indigo-100/50">
                      {stats.reduce((sum, s) => sum + s.v2Count, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-purple-800 bg-purple-100/50">
                      {stats.reduce((sum, s) => sum + s.v3Count, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-fuchsia-800 bg-fuchsia-100/50">
                      {stats.reduce((sum, s) => sum + s.v4PlusCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-teal-800">
                      {(() => {
                        const totalV1 = stats.reduce((sum, s) => sum + s.v1Count, 0);
                        const totalFollow = stats.reduce((sum, s) => sum + s.followUpCount, 0);
                        return totalV1 > 0 ? `${((totalFollow / totalV1) * 100).toFixed(1)}%` : "0%";
                      })()}
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-800 font-black">
                      {overall.percent.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: Area Target Setting & Progress Table (ตารางติดตามเป้าหมายรายพื้นที่เดิม) */}
      {(trackingViewMode === "targets" || trackingViewMode === "both") && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:overflow-visible">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                ตารางติดตามเป้าหมายรายพื้นที่ (Target & Progress Table)
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold">
                คลิกที่ตัวเลขเป้าหมายเพื่อแก้ไขและบันทึกลงฐานข้อมูล หรือคลิกแถวเพื่อดูรายละเอียดผู้รับบริการซ้ำ
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">พื้นที่เป้าหมาย (Area)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">โมเดล / อำเภอ</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">ยอดคัดกรอง (คน)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">จำนวนครั้ง (Visits)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">เป้าหมาย (คน)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4 min-w-[200px]">ความก้าวหน้า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {stats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      ไม่มีข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
                {stats.map((s, idx) => (
                  <React.Fragment key={s.key}>
                  <motion.tr 
                    onClick={() => setExpandedKey(expandedKey === s.key ? null : s.key)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    key={s.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedKey === s.key ? "rotate-90" : ""}`} />
                        <div className="font-bold text-slate-800 text-sm">{s.area}</div><div className="text-[9px] text-indigo-400 font-semibold mt-0.5">(คลิกดูรายละเอียด)</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md w-fit">
                          {s.modelType}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{s.district}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-lg font-black text-slate-800">{s.achieved}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {s.totalVisits}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      {editingKey === s.key ? (
                        <div className="flex items-center justify-center gap-1.5 bg-indigo-50/80 p-1.5 rounded-xl border border-indigo-200">
                          <input 
                            type="number" 
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, s.key)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 border-2 border-indigo-500 rounded-lg px-2 py-1 text-center text-sm font-black outline-none bg-white text-slate-800 shadow-2xs"
                            min="0"
                            placeholder="เป้าหมาย"
                          />
                          <button 
                            type="button"
                            title="บันทึกลงฐานข้อมูล (Enter)"
                            disabled={isSavingTarget}
                            onClick={(e) => { e.stopPropagation(); saveTarget(s.key); }}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            title="ยกเลิก (Esc)"
                            onClick={(e) => { e.stopPropagation(); setEditingKey(null); }}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors cursor-pointer flex items-center justify-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={(e) => { e.stopPropagation(); startEdit(s.key, s.target); }}
                          title="คลิกเพื่อแก้ไขเป้าหมายและบันทึกลงฐานข้อมูล"
                          className="group inline-flex items-center justify-center gap-1.5 cursor-pointer hover:bg-indigo-50 border border-transparent hover:border-indigo-200 px-3 py-1.5 rounded-xl transition-all"
                        >
                          <span className={`text-base font-black ${s.target > 0 ? "text-indigo-600" : "text-indigo-400 font-bold"}`}>
                            {s.target > 0 ? `${s.target.toLocaleString()} คน` : "+ ระบุเป้าหมาย"}
                          </span>
                          <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {s.target > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-end">
                            <span className={`text-sm font-black ${getTextColorClass(s.realPercent)}`}>
                              {s.realPercent.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">
                              {s.achieved} / {s.target}
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${s.percent}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${getColorClass(s.realPercent)}`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          โปรดระบุเป้าหมาย
                        </div>
                      )}
                    </td>
                  </motion.tr>
                  {expandedKey === s.key && (
                    <tr>
                      <td colSpan={6} className="p-0 border-b border-slate-100">
                        <div className="bg-slate-50/50 p-6 space-y-6 animate-in slide-in-from-top-2 fade-in duration-200">
                          {/* Visits Breakdown */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <Activity className="w-4 h-4 text-indigo-500" />
                              แยกตามรายการครั้งที่ (Visits Breakdown)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {s.visitsBreakdown.map(v => (
                                <div key={v.visitNumber} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-600">ครั้งที่ {v.visitNumber}</span>
                                    <span className="text-xs font-black text-indigo-600">{v.count} คน</span>
                                  </div>
                                  {s.target > 0 ? (
                                    <div className="space-y-1 mt-2 border-t border-slate-100 pt-2">
                                      <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                                        <span>ความก้าวหน้า ({v.count}/{s.target})</span>
                                        <span className={v.percent >= 100 ? "text-emerald-600 font-black" : "text-indigo-600 font-black"}>{v.percent.toFixed(1)}%</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${v.percent >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(v.percent, 100)}%` }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-2 border-t border-slate-100 pt-2">
                                      <AlertCircle className="w-3 h-3" />
                                      โปรดระบุเป้าหมาย
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Duplicates / Multiple Visits */}
                          {s.duplicates.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Users className="w-4 h-4 text-amber-500" />
                                รายการซ้ำ / รับบริการหลายครั้ง ({s.duplicates.length} รายการ)
                              </h4>
                              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                      <th className="py-2 px-4 font-bold">ชื่อ-สกุล</th>
                                      <th className="py-2 px-4 font-bold text-center">จำนวนครั้ง</th>
                                      <th className="py-2 px-4 font-bold">รายการครั้งที่ (Visits)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {s.duplicates.map(d => (
                                      <tr key={d.name}>
                                        <td className="py-2 px-4 font-semibold text-slate-700">{d.name}</td>
                                        <td className="py-2 px-4 text-center font-bold text-amber-600">{d.count}</td>
                                        <td className="py-2 px-4">
                                          <div className="flex flex-wrap gap-1">
                                            {d.visits.map((v, i) => {
                                              let dateStr = "";
                                              if (v.date) {
                                                const dObj = new Date(v.date);
                                                if (isNaN(dObj.getTime())) {
                                                  // Already a formatted string (like "26/7/2569" or similar), so use it as is
                                                  dateStr = v.date;
                                                } else {
                                                  dateStr = dObj.toLocaleDateString("th-TH", { year: "2-digit", month: "short", day: "numeric" });
                                                }
                                              }
                                              return (
                                              <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">ครั้งที่ {v.vNum} {dateStr && `(${dateStr})`}</span>
                                            )})}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
      )}
      
      {/* Suggestions / Advice Box based on progress */}
      {stats.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 print:break-inside-avoid">
          <div className="flex items-start gap-3">
            <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-900 text-sm">ข้อเสนอแนะเชิงกลยุทธ์ (Strategic Recommendations)</h4>
              <ul className="mt-3 space-y-2 text-sm text-indigo-800 font-medium list-disc pl-4">
                {overall.percent < 50 ? (
                  <>
                    <li>ภาพรวมโครงการยังมีความก้าวหน้าต่ำกว่า 50% (<strong className="font-black text-rose-600">{overall.percent.toFixed(1)}%</strong>) ควรพิจารณาจัดกิจกรรมรณรงค์คัดกรองเชิงรุกในพื้นที่เพิ่มเติม</li>
                    <li>ควรเน้นเป้าหมายในพื้นที่ <strong>{stats[stats.length - 1]?.area}</strong> ที่มีความก้าวหน้าน้อยที่สุด</li>
                  </>
                ) : overall.percent < 80 ? (
                  <>
                    <li>ภาพรวมโครงการมีความก้าวหน้าปานกลาง (<strong className="font-black text-amber-600">{overall.percent.toFixed(1)}%</strong>) ควรสนับสนุนให้ อสม. ลงติดตามในครอบครัวที่ยังไม่ได้รับการคัดกรอง</li>
                    <li>รักษาโมเมนตัมในพื้นที่ <strong>{stats[0]?.area}</strong> ซึ่งทำผลงานได้ดีเยี่ยม</li>
                  </>
                ) : (
                  <>
                    <li>ยอดเยี่ยม! ภาพรวมโครงการก้าวหน้าไปแล้วกว่า (<strong className="font-black text-emerald-600">{overall.percent.toFixed(1)}%</strong>) บรรลุตามเป้าหมายหลัก</li>
                    <li>สามารถเริ่มเปลี่ยนโฟกัสไปที่ <strong>การติดตามผล (Follow-up)</strong> สำหรับกลุ่มเสี่ยงที่ค้นพบเพื่อปรับเปลี่ยนพฤติกรรมต่อไป</li>
                  </>
                )}
                <li>พื้นที่ใดที่มียอด Visit มากกว่ายอดคัดกรองรายบุคคล แสดงว่าเริ่มมีการติดตามผลต่อเนื่องแล้ว (Follow-up Retention)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Target Setting Modal (กำหนดและแก้ไขเป้าหมายโครงการ เชื่อมต่อฐานข้อมูล) */}
      <AnimatePresence>
        {isTargetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-slate-50">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-sm">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      กำหนดและแก้ไขเป้าหมายโครงการ (บันทึกลงฐานข้อมูล)
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      ระบุจำนวนประชากรเป้าหมายในแต่ละพื้นที่ ข้อมูลจะถูกบันทึกและเชื่อมโยงกับฐานข้อมูลเซิร์ฟเวอร์
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsTargetModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Quick Actions & Search */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-600 mr-1">ตั้งค่าด่วนทุกพื้นที่:</span>
                    {[50, 100, 150, 200].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          const updated = { ...tempModalTargets };
                          stats.forEach(s => {
                            updated[s.key] = val;
                          });
                          setTempModalTargets(updated);
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer shadow-2xs"
                      >
                        {val} คน
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...tempModalTargets };
                        stats.forEach(s => {
                          updated[s.key] = 0;
                        });
                        setTempModalTargets(updated);
                      }}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer ml-1"
                    >
                      ล้างทั้งหมด (0)
                    </button>
                  </div>

                  {/* Summary Counter */}
                  <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                    เป้าหมายรวม: {Object.values(tempModalTargets).reduce((a, b) => a + (Number(b) || 0), 0).toLocaleString()} คน
                  </div>
                </div>

                {/* Search & Model filter */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="ค้นหาชื่อพื้นที่, อำเภอ..."
                      className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {["all", "ตำบล", "หมู่บ้าน"].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModalModelFilter(m)}
                        className={`text-xs px-3 py-2 rounded-xl font-bold transition-all border cursor-pointer ${
                          modalModelFilter === m
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {m === "all" ? "ทุกโมเดล" : `${m}โมเดล`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Target List Table */}
              <div className="p-6 overflow-y-auto max-h-[50vh] divide-y divide-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2">
                      <th className="pb-3 px-3">พื้นที่ / ชุมชน</th>
                      <th className="pb-3 px-3">โมเดล / อำเภอ</th>
                      <th className="pb-3 px-3 text-center">คัดกรองแล้ว</th>
                      <th className="pb-3 px-3 text-center">เป้าหมาย (คน)</th>
                      <th className="pb-3 px-3 text-center">ความก้าวหน้าประเมิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats
                      .filter(s => {
                        if (modalModelFilter !== "all" && s.modelType !== modalModelFilter) return false;
                        if (modalSearch) {
                          const q = modalSearch.toLowerCase();
                          return s.area.toLowerCase().includes(q) || 
                                 s.district.toLowerCase().includes(q) ||
                                 (s.subdistrict && s.subdistrict.toLowerCase().includes(q));
                        }
                        return true;
                      })
                      .map(s => {
                        const currentVal = tempModalTargets[s.key] !== undefined ? tempModalTargets[s.key] : s.target;
                        const pct = currentVal > 0 ? (s.achieved / currentVal) * 100 : 0;
                        return (
                          <tr key={s.key} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-800 text-sm">{s.area}</span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                  {s.modelType}
                                </span>
                                <span className="text-xs text-slate-500 font-semibold">
                                  {s.district} {s.subdistrict && `(ต.${s.subdistrict})`}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-700">
                              {s.achieved} คน
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempModalTargets(prev => ({
                                      ...prev,
                                      [s.key]: Math.max(0, (Number(prev[s.key] !== undefined ? prev[s.key] : s.target) || 0) - 10)
                                    }));
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                                >
                                  -10
                                </button>
                                <input 
                                  type="number"
                                  min="0"
                                  value={currentVal === 0 ? "" : currentVal}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val >= 0) {
                                      setTempModalTargets(prev => ({ ...prev, [s.key]: val }));
                                    }
                                  }}
                                  className="w-20 border-2 border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1 text-center text-sm font-black outline-none bg-white text-slate-800"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempModalTargets(prev => ({
                                      ...prev,
                                      [s.key]: (Number(prev[s.key] !== undefined ? prev[s.key] : s.target) || 0) + 10
                                    }));
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                                >
                                  +10
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                                currentVal > 0 
                                  ? (pct >= 80 ? "bg-emerald-50 text-emerald-700" : pct >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700")
                                  : "text-slate-300"
                              }`}>
                                {currentVal > 0 ? `${pct.toFixed(1)}%` : "-"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-500" />
                  <span>บันทึกแบบ Real-time เข้าสู่ระบบฐานข้อมูลเซิร์ฟเวอร์ และจัดเก็บถาวร</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsTargetModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-white transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={isSavingTarget}
                    onClick={saveBulkModalTargets}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingTarget ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึกลงฐานข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>บันทึกเป้าหมายทั้งหมดลงฐานข้อมูล</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
