import React, { useState, useMemo, useEffect } from "react";
import { ScreeningRecord, LOCATION_DATA, DistrictType } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  MapPin, 
  Users, 
  Flame, 
  Apple, 
  Dumbbell, 
  Moon, 
  Cigarette, 
  Wine, 
  ShieldAlert, 
  Lightbulb, 
  SlidersHorizontal,
  Sparkles,
  Info,
  ChevronRight,
  Printer
} from "lucide-react";

interface NcdAnalyticsDashboardProps {
  records: ScreeningRecord[];
}

export const NcdAnalyticsDashboard: React.FC<NcdAnalyticsDashboardProps> = ({ records }) => {
  // Filters state
  const [filterModel, setFilterModel] = useState<"หมู่บ้าน" | "ตำบล" | "">("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [filterSubdistrict, setFilterSubdistrict] = useState<string>("");
  const [filterTargetArea, setFilterTargetArea] = useState<string>("");

  // Sync / reset filters on model change
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

  // Dynamic dropdown options
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

  // Apply filters to records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Model Type inference for compatibility
      let recordModel = r.modelType || "";
      if (!recordModel && r.district && r.targetArea) {
        if ((LOCATION_DATA["หมู่บ้าน"] as any)?.[r.district]?.[r.subdistrict || ""]?.includes(r.targetArea)) {
          recordModel = "หมู่บ้าน";
        } else if ((LOCATION_DATA["ตำบล"] as any)?.[r.district]?.[r.subdistrict || ""]?.includes(r.targetArea)) {
          recordModel = "ตำบล";
        }
      }

      const matchesModel = filterModel ? recordModel === filterModel : true;
      const matchesDistrict = filterDistrict ? r.district === filterDistrict : true;
      const matchesSubdistrict = filterSubdistrict ? r.subdistrict === filterSubdistrict : true;
      const matchesTargetArea = filterTargetArea ? r.targetArea === filterTargetArea : true;

      return matchesModel && matchesDistrict && matchesSubdistrict && matchesTargetArea;
    });
  }, [records, filterModel, filterDistrict, filterSubdistrict, filterTargetArea]);

  // Comprehensive analysis calculations
  const analysis = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) return null;

    // 1. Core indicators
    let normalCount = 0;
    let riskCount = 0;
    let dangerCount = 0;

    let htDanger = 0, htRisk = 0, htNormal = 0;
    let dmDanger = 0, dmRisk = 0, dmNormal = 0;

    // Lifestyle tallies
    let smokeCount = 0;
    let alcoholCount = 0;
    let noExerciseCount = 0;
    let poorSleepCount = 0;
    let sweetCount = 0;
    let fatCount = 0;
    let saltCount = 0;

    // BMI categories
    let underweight = 0; // < 18.5
    let standard = 0; // 18.5 - 22.9
    let overweight = 0; // 23.0 - 24.9
    let obeseLevel1 = 0; // 25.0 - 29.9
    let obeseLevel2 = 0; // >= 30.0

    let recordsWithMuscleCount = 0;
    let muscleMassSum = 0;

    // Follow-up tracking
    // Group records by name to trace progress
    const recordsByName: Record<string, ScreeningRecord[]> = {};
    filteredRecords.forEach(r => {
      if (!r.name) return;
      if (!recordsByName[r.name]) {
        recordsByName[r.name] = [];
      }
      recordsByName[r.name].push(r);
    });

    let followUpCandidates = 0;
    let followUpImproved = 0; // either BP or Sugar decreased
    let followUpTotal = 0;

    Object.keys(recordsByName).forEach(name => {
      const personalRecords = recordsByName[name].sort((a, b) => a.visitNumber - b.visitNumber);
      if (personalRecords.length > 1) {
        followUpCandidates++;
        const first = personalRecords[0];
        const last = personalRecords[personalRecords.length - 1];
        
        // Check if blood pressure or blood sugar improved (decreased)
        const bpImproved = (last?.bpSys || 0) < (first?.bpSys || 0) || ((last?.bpSys || 0) === (first?.bpSys || 0) && (last?.bpDia || 0) <= (first?.bpDia || 0));
        const sugarImproved = (last?.sugar || 0) < (first?.sugar || 0);
        const riskLevelImproved = 
          (first.htResult?.level === "danger" && last.htResult?.level !== "danger") ||
          (first.dmResult?.level === "danger" && last.dmResult?.level !== "danger") ||
          (first.htResult?.level === "risk" && last.htResult?.level === "normal") ||
          (first.dmResult?.level === "risk" && last.dmResult?.level === "normal");

        if (bpImproved || sugarImproved || riskLevelImproved) {
          followUpImproved++;
        }
        followUpTotal++;
      }
    });

    // Process record metrics
    filteredRecords.forEach((r) => {
      // Risk groups
      if (r.htResult?.level === "danger" || r.dmResult?.level === "danger") {
        dangerCount++;
      } else if (r.htResult?.level === "risk" || r.dmResult?.level === "risk") {
        riskCount++;
      } else {
        normalCount++;
      }

      // Disease-specific
      if (r.htResult?.level === "danger") htDanger++;
      else if (r.htResult?.level === "risk") htRisk++;
      else htNormal++;

      if (r.dmResult?.level === "danger") dmDanger++;
      else if (r.dmResult?.level === "risk") dmRisk++;
      else dmNormal++;

      // Lifestyle
      if (r.smoking?.includes("สูบอยู่") || r.smoking?.includes("ประจำ")) smokeCount++;
      if (r.alcohol?.includes("ประจำ") || r.alcohol?.includes("ครั้งคราว")) alcoholCount++;
      if (r.exercise?.includes("ไม่ออก") || r.exercise?.includes("นั่งนิ่ง")) noExerciseCount++;
      if (r.sleep?.includes("น้อยกว่า 6") || r.sleep?.includes("ไม่เพียงพอ")) poorSleepCount++;
      
      if (r.foodHabit?.sweet?.level === "เสี่ยงสูงมาก" || r.foodHabit?.sweet?.level === "เสี่ยงสูง") sweetCount++;
      if (r.foodHabit?.fat?.level === "เสี่ยงสูงมาก" || r.foodHabit?.fat?.level === "เสี่ยงสูง") fatCount++;
      if (r.foodHabit?.salt?.level === "เสี่ยงสูงมาก" || r.foodHabit?.salt?.level === "เสี่ยงสูง" || r.sodium?.includes("เค็มประจำ")) saltCount++;

      // BMI Calculator
      const bmiVal = parseFloat(r.bmi);
      if (!isNaN(bmiVal) && bmiVal > 0) {
        if (bmiVal < 18.5) underweight++;
        else if (bmiVal < 23.0) standard++;
        else if (bmiVal < 25.0) overweight++;
        else if (bmiVal < 30.0) obeseLevel1++;
        else obeseLevel2++;
      }

      // Muscle Mass tally
      if (r.muscleMass !== undefined && r.muscleMass !== null && r.muscleMass > 0) {
        recordsWithMuscleCount++;
        muscleMassSum += r.muscleMass;
      }
    });

    // 2. Behavioral Correlation: Calculate risk rate based on lifestyle
    // Let's compare "Healthy Lifestyle group" vs "High Risk Lifestyle group"
    let healthyCount = 0;
    let healthyNormalCount = 0;
    let unhealthyCount = 0;
    let unhealthyNormalCount = 0;

    filteredRecords.forEach(r => {
      const isHealthy = 
        (!r.smoking || r.smoking.includes("ไม่สูบ")) && 
        (!r.alcohol || r.alcohol.includes("ไม่ดื่ม")) && 
        (r.exercise && !r.exercise.includes("ไม่ออก"));
      
      const isNormal = r.htResult?.level === "normal" && r.dmResult?.level === "normal";

      if (isHealthy) {
        healthyCount++;
        if (isNormal) healthyNormalCount++;
      } else {
        unhealthyCount++;
        if (isNormal) unhealthyNormalCount++;
      }
    });

    const healthyNormalPct = healthyCount > 0 ? Math.round((healthyNormalCount / healthyCount) * 100) : 0;
    const unhealthyNormalPct = unhealthyCount > 0 ? Math.round((unhealthyNormalCount / unhealthyCount) * 100) : 0;

    // 3. Hotspot Spatial Risk (Group by Target Area / Village)
    const areaStats: Record<string, { total: number; riskOrDanger: number }> = {};
    filteredRecords.forEach(r => {
      const area = r.targetArea || "ไม่ระบุพื้นที่";
      if (!areaStats[area]) {
        areaStats[area] = { total: 0, riskOrDanger: 0 };
      }
      areaStats[area].total++;
      if (r.htResult?.level !== "normal" || r.dmResult?.level !== "normal") {
        areaStats[area].riskOrDanger++;
      }
    });

    const sortedAreas = Object.keys(areaStats)
      .map(area => ({
        name: area,
        total: areaStats[area].total,
        riskCount: areaStats[area].riskOrDanger,
        riskPct: Math.round((areaStats[area].riskOrDanger / areaStats[area].total) * 100)
      }))
      .filter(a => a.total >= 1) // only count active areas
      .sort((a, b) => b.riskPct - a.riskPct);

    // 4. Model comparison (Village vs Subdistrict)
    let mbTotal = 0, mbNormal = 0, mbRisk = 0, mbDanger = 0;
    let tbTotal = 0, tbNormal = 0, tbRisk = 0, tbDanger = 0;

    // 5. Personal Plan tracking
    const planTracking = {
      sweet: { set: 0, achieved: 0 },
      fat: { set: 0, achieved: 0 },
      salt: { set: 0, achieved: 0 },
      sleep: { set: 0, achieved: 0 },
      water: { set: 0, achieved: 0 },
      exercise: { set: 0, achieved: 0 },
    };

    filteredRecords.forEach(r => {
      let recordModel = r.modelType || "";
      if (!recordModel && r.district && r.targetArea) {
        if ((LOCATION_DATA["หมู่บ้าน"] as any)?.[r.district]?.[r.subdistrict || ""]?.includes(r.targetArea)) {
          recordModel = "หมู่บ้าน";
        } else if ((LOCATION_DATA["ตำบล"] as any)?.[r.district]?.[r.subdistrict || ""]?.includes(r.targetArea)) {
          recordModel = "ตำบล";
        }
      }

      if (recordModel === "หมู่บ้าน") {
        mbTotal++;
        if (r.htResult?.level === "danger" || r.dmResult?.level === "danger") mbDanger++;
        else if (r.htResult?.level === "risk" || r.dmResult?.level === "risk") mbRisk++;
        else mbNormal++;
      } else if (recordModel === "ตำบล") {
        tbTotal++;
        if (r.htResult?.level === "danger" || r.dmResult?.level === "danger") tbDanger++;
        else if (r.htResult?.level === "risk" || r.dmResult?.level === "risk") tbRisk++;
        else tbNormal++;
      }

      if (r.personalPlan) {
        Object.keys(planTracking).forEach(key => {
          const k = key as keyof typeof planTracking;
          const planData = r.personalPlan?.[k];
          if (planData && planData.plan) {
            planTracking[k].set++;
            if (planData.achieved === true) {
              planTracking[k].achieved++;
            }
          }
        });
      }
    });

    const personalPlanStats = Object.keys(planTracking).map(key => {
      const k = key as keyof typeof planTracking;
      return {
        key: k,
        label: k === 'sweet' ? 'ลดหวาน' : k === 'fat' ? 'ลดมัน' : k === 'salt' ? 'ลดเค็ม' : k === 'sleep' ? 'ปรับการนอน' : k === 'water' ? 'ปรับการดื่มน้ำ' : 'การออกกำลังกาย',
        set: planTracking[k].set,
        achieved: planTracking[k].achieved,
        achievedPct: planTracking[k].set > 0 ? Math.round((planTracking[k].achieved / planTracking[k].set) * 100) : 0
      };
    });

    const modelComparison = {
      village: {
        total: mbTotal,
        normalPct: mbTotal > 0 ? Math.round((mbNormal / mbTotal) * 100) : 0,
        riskPct: mbTotal > 0 ? Math.round((mbRisk / mbTotal) * 100) : 0,
        dangerPct: mbTotal > 0 ? Math.round((mbDanger / mbTotal) * 100) : 0,
      },
      subdistrict: {
        total: tbTotal,
        normalPct: tbTotal > 0 ? Math.round((tbNormal / tbTotal) * 100) : 0,
        riskPct: tbTotal > 0 ? Math.round((tbRisk / tbTotal) * 100) : 0,
        dangerPct: tbTotal > 0 ? Math.round((tbDanger / tbTotal) * 100) : 0,
      }
    };

    // Calculate worst habits to display as critical problems
    const lifestyleFactors = [
      { name: "พฤติกรรมการทานหวานจัด (รสหวาน)", count: sweetCount, pct: Math.round((sweetCount / total) * 100), color: "text-red-600", bg: "bg-red-50", type: "food" },
      { name: "พฤติกรรมการทานของมัน/ทอดจัด (รสมัน)", count: fatCount, pct: Math.round((fatCount / total) * 100), color: "text-orange-600", bg: "bg-orange-50", type: "food" },
      { name: "พฤติกรรมการปรุงเค็มจัด/โซเดียมสูง (รสเค็ม)", count: saltCount, pct: Math.round((saltCount / total) * 100), color: "text-amber-600", bg: "bg-amber-50", type: "food" },
      { name: "การขาดกิจกรรมทางกาย/ไม่ออกกำลังกาย", count: noExerciseCount, pct: Math.round((noExerciseCount / total) * 100), color: "text-blue-600", bg: "bg-blue-50", type: "exercise" },
      { name: "พฤติกรรมการพักผ่อนน้อยกว่า 6 ชั่วโมง", count: poorSleepCount, pct: Math.round((poorSleepCount / total) * 100), color: "text-purple-600", bg: "bg-purple-50", type: "sleep" },
      { name: "อัตราการสูบบุหรี่ในชุมชน", count: smokeCount, pct: Math.round((smokeCount / total) * 100), color: "text-slate-600", bg: "bg-slate-50", type: "smoke" },
      { name: "อัตราการดื่มแอลกอฮอล์", count: alcoholCount, pct: Math.round((alcoholCount / total) * 100), color: "text-pink-600", bg: "bg-pink-50", type: "alcohol" }
    ].sort((a, b) => b.pct - a.pct);

    return {
      total,
      normalCount,
      riskCount,
      dangerCount,
      normalPct: Math.round((normalCount / total) * 100),
      riskPct: Math.round((riskCount / total) * 100),
      dangerPct: Math.round((dangerCount / total) * 100),
      ht: { normal: htNormal, risk: htRisk, danger: htDanger, riskPct: Math.round((htRisk / total) * 100), dangerPct: Math.round((htDanger / total) * 100) },
      dm: { normal: dmNormal, risk: dmRisk, danger: dmDanger, riskPct: Math.round((dmRisk / total) * 100), dangerPct: Math.round((dmDanger / total) * 100) },
      lifestyleFactors,
      bmi: {
        underweight,
        standard,
        overweight,
        obeseLevel1,
        obeseLevel2,
        unhealthyBmiCount: overweight + obeseLevel1 + obeseLevel2,
        unhealthyBmiPct: Math.round(((overweight + obeseLevel1 + obeseLevel2) / total) * 100)
      },
      muscleMass: {
        count: recordsWithMuscleCount,
        avg: recordsWithMuscleCount > 0 ? (muscleMassSum / recordsWithMuscleCount).toFixed(1) : null
      },
      followUp: {
        candidates: followUpCandidates,
        improved: followUpImproved,
        total: followUpTotal,
        successRate: followUpTotal > 0 ? Math.round((followUpImproved / followUpTotal) * 100) : 0
      },
      correlations: {
        healthyCount,
        healthyNormalPct,
        unhealthyCount,
        unhealthyNormalPct,
        ratio: unhealthyNormalPct > 0 ? (healthyNormalPct / unhealthyNormalPct).toFixed(1) : "1.0"
      },
      sortedAreas,
      modelComparison,
      personalPlanStats
    };
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      {/* Print Header (hidden on screen) */}
      <div className="hidden print:block text-center space-y-2 pb-6 border-b border-slate-200 mb-6">
        <h2 className="text-2xl font-black text-slate-800">รายงานสรุปผลการวิเคราะห์ NCDs และพฤติกรรมเสี่ยง</h2>
        <p className="text-slate-600 font-medium">
          ข้อมูล ณ วันที่ {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <div className="text-sm text-slate-500 flex items-center justify-center gap-4 mt-2">
          <span>โมเดล: {filterModel || "ทั้งหมด"}</span>
          <span>อำเภอ: {filterDistrict ? `อ.${filterDistrict}` : "ทั้งหมด"}</span>
          <span>ตำบล: {filterSubdistrict ? `ต.${filterSubdistrict}` : "ทั้งหมด"}</span>
        </div>
      </div>
      
      {/* 1. Header Filter Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">ตัวเลือกการกรองข้อมูลภาพรวมและการวิเคราะห์</h3>
              <p className="text-[10px] text-slate-500">กรองข้อมูลในหน่วยงานและพื้นที่โครงการเพื่อวิเคราะห์ปัญหา ความสำเร็จ และหาแนวทางเชิงลึก</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()}
              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              พิมพ์รายงาน
            </button>
            {(filterModel || filterDistrict || filterSubdistrict || filterTargetArea) && (
              <button 
                onClick={() => {
                  setFilterModel("");
                  setFilterDistrict("");
                  setFilterSubdistrict("");
                  setFilterTargetArea("");
                }}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Model */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">โมเดลโครงการ</label>
            <select 
              value={filterModel} 
              onChange={(e) => setFilterModel(e.target.value as any)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
            >
              <option value="">ทั้งหมด (หมู่บ้าน / ตำบล)</option>
              <option value="หมู่บ้าน">หมู่บ้านโมเดล</option>
              <option value="ตำบล">ตำบลโมเดล</option>
            </select>
          </div>

          {/* District */}
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

          {/* Subdistrict */}
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

          {/* Target Area */}
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

      {!analysis ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 space-y-3">
          <Info className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="font-bold text-sm text-slate-700">ไม่มีข้อมูลตามตัวเลือกดังกล่าว</h3>
          <p className="text-xs">โปรดปรับตัวเลือกการกรอง หรือเพิ่มข้อมูลการคัดกรองใหม่ลงในแผ่นงาน</p>
        </div>
      ) : (
        <>
          {/* 2. Success Indicators Bento Box Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Success Factor 1: Follow-up Improvement Rate */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between relative overflow-hidden print:break-inside-avoid">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 bg-emerald-100/40 w-24 h-24 rounded-full -z-10" />
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <Award className="w-4.5 h-4.5" />
                  <h4 className="text-xs font-black uppercase tracking-wider">ดัชนีการควบคุมโรคสำเร็จ (Success Rate)</h4>
                </div>
                <div className="py-2">
                  <span className="text-4xl font-black text-emerald-700">{analysis.followUp.successRate}%</span>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 leading-normal">
                    จากกลุ่มผู้รับบริการที่ได้รับการติดตามเยี่ยมซ้ำ {analysis.followUp.total} ราย มีระดับความเสี่ยงหรือค่าตรวจทางห้องปฏิบัติการ (BP/Sugar) ดีขึ้นอย่างต่อเนื่อง
                  </p>
                </div>
              </div>
              <div className="border-t border-emerald-150 pt-2.5 mt-2 flex items-center justify-between text-[10px] text-emerald-800 font-bold">
                <span>อัตราติดตามตรวจซ้ำ: {analysis.followUp.total} / {analysis.total} เคส</span>
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black">ผ่านเกณฑ์</span>
              </div>
            </div>

            {/* Success Factor 2: Community Healthy Behavior Correlation */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between relative overflow-hidden print:break-inside-avoid">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 bg-blue-100/40 w-24 h-24 rounded-full -z-10" />
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-blue-800">
                  <Sparkles className="w-4.5 h-4.5" />
                  <h4 className="text-xs font-black uppercase tracking-wider">ปัจจัยความสำเร็จของพฤติกรรม (Success Factor)</h4>
                </div>
                <div className="py-2">
                  <span className="text-4xl font-black text-blue-700">{analysis.correlations.ratio} เท่า</span>
                  <p className="text-[10px] text-blue-600 font-bold mt-1 leading-normal">
                    ผู้ที่มีพฤติกรรมดีเลิศ (ไม่สูบ, ไม่ดื่มหนัก, ออกกำลังสม่ำเสมอ) มีอัตราการตรวจผ่านเกณฑ์ "กลุ่มปกติ" สูงเป็น <strong className="text-blue-800">{analysis.correlations.ratio} เท่า</strong> ของกลุ่มที่มีพฤติกรรมเสี่ยง
                  </p>
                </div>
              </div>
              <div className="border-t border-blue-150 pt-2.5 mt-2 flex items-center justify-between text-[10px] text-blue-800 font-bold">
                <span>ผู้ที่มีพฤติกรรมผ่านเกณฑ์: {analysis.correlations.healthyCount} ราย</span>
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black">วิเคราะห์เชิงสหสัมพันธ์</span>
              </div>
            </div>

            {/* Success Factor 3: Operational Model Efficiency Comparison */}
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between relative overflow-hidden print:break-inside-avoid">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 bg-indigo-100/40 w-24 h-24 rounded-full -z-10" />
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-800">
                  <Target className="w-4.5 h-4.5" />
                  <h4 className="text-xs font-black uppercase tracking-wider">ประสิทธิภาพแยกตามโมเดล (Model Analysis)</h4>
                </div>
                <div className="py-1 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-700">
                    <span>🏠 หมู่บ้านโมเดล (คัดกรอง {analysis.modelComparison.village.total} ราย):</span>
                    <span className="text-emerald-600">ปกติ {analysis.modelComparison.village.normalPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${analysis.modelComparison.village.normalPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-700">
                    <span>🏢 ตำบลโมเดล (คัดกรอง {analysis.modelComparison.subdistrict.total} ราย):</span>
                    <span className="text-indigo-600">ปกติ {analysis.modelComparison.subdistrict.normalPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${analysis.modelComparison.subdistrict.normalPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="border-t border-indigo-150 pt-2.5 mt-2 flex items-center justify-between text-[9px] text-indigo-800 font-bold leading-none">
                <span>สรุป: {analysis.modelComparison.village.normalPct >= analysis.modelComparison.subdistrict.normalPct ? "หมู่บ้านโมเดลมีอัตราปกติสูงกว่า" : "ตำบลโมเดลมีอัตราปกติสูงกว่า"}</span>
              </div>
            </div>

          </div>

          {/* 3. Deep Analysis: Critical Issues & Problems */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left side: Problem Identification & Behavioral Risks */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between print:break-inside-avoid">
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <div className="bg-rose-50 text-rose-600 p-1.5 rounded-xl">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">ระบุประเด็นปัญหาที่สำคัญ (Critical Problem Identification)</h4>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase">ปัจจัยเสี่ยงด้านพฤติกรรมสุขภาพที่ต้องแก้ไขอย่างเร่งด่วนในพื้นที่</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {analysis.lifestyleFactors.slice(0, 4).map((factor, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${factor.pct > 50 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                          {factor.name}
                        </span>
                        <span className="font-bold text-slate-800">{factor.pct}% <span className="text-slate-400 font-semibold text-[10px]">({factor.count} ราย)</span></span>
                      </div>
                      <div className="relative">
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${
                              factor.pct >= 60 ? "from-red-400 to-rose-600" : 
                              factor.pct >= 40 ? "from-amber-400 to-orange-500" : 
                              "from-blue-400 to-indigo-500"
                            }`} 
                            style={{ width: `${factor.pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-0.5 leading-none pl-3">
                          {factor.pct >= 60 ? "⚠️ วิกฤต: ต้องกำหนดแนวทางลดพฤติกรรมนี้ระดับพื้นที่อย่างเร่งด่วน" : "📢 เฝ้าระวัง: ควรมีมาตรการส่งเสริมสุขภาพในระดับปานกลาง"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-xl flex gap-2.5 items-start mt-4">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[10px] text-rose-800 leading-normal font-semibold">
                  <span>ประเมินวิกฤตความเสี่ยงพฤติกรรมหลัก:</span>
                  <p className="font-normal text-slate-600 mt-0.5">
                    อัตราความเสี่ยงสูงที่สุดเกี่ยวข้องกับ <strong className="text-rose-700">{analysis.lifestyleFactors[0]?.name}</strong> ({analysis.lifestyleFactors[0]?.pct}%) รองลงมาคือ <strong className="text-orange-700">{analysis.lifestyleFactors[1]?.name}</strong> ({analysis.lifestyleFactors[1]?.pct}%) ซึ่งสัมพันธ์โดยตรงกับโอกาสการเกิดโรคความดันโลหิตและเบาหวานในอนาคต
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Spatial risk hotspots (Where are the problems concentrated?) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between print:break-inside-avoid">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-amber-50 text-amber-600 p-1.5 rounded-xl">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">ความเสี่ยงสะสมแยกตามรายพื้นที่ (Spatial Risk Concentration)</h4>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase">วิเคราะห์ร้อยละอัตราความเสี่ยงสะสม (เสี่ยงสูง + สงสัยป่วย) ในแต่ละชุมชนเป้าหมาย</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-100 shrink-0">
                    ทั้งหมด {analysis.sortedAreas.length} ชุมชน
                  </span>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {analysis.sortedAreas.slice(0, 5).map((area, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-700 text-xs block">{area.name}</span>
                          <span className="text-[9px] text-slate-400 font-semibold">คัดกรอง {area.total} เคส • พบกลุ่มเสี่ยง/ป่วย {area.riskCount} เคส</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black block ${area.riskPct >= 50 ? 'text-rose-600' : area.riskPct >= 25 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {area.riskPct}%
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase leading-none">ความชุกรวม</span>
                      </div>
                    </div>
                  ))}
                  {analysis.sortedAreas.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">ไม่มีข้อมูลพื้นที่</p>
                  )}
                </div>
              </div>

              {analysis.sortedAreas.length > 0 && (
                <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-3 mt-3 flex items-start gap-1.5 bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/60 leading-normal font-semibold">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-slate-700 block text-[10px]">ข้อวิเคราะห์จุดเสี่ยงชุมชน:</span>
                    <span>ชุมชนที่พบอัตราเสี่ยงสะสมหนาแน่นที่สุด คือ <strong className="text-rose-700">{analysis.sortedAreas[0]?.name}</strong> มีอัตรากลุ่มเสี่ยงและผู้สงสัยป่วยรวมกันสูงถึง <strong className="text-rose-700">{analysis.sortedAreas[0]?.riskPct}%</strong> ควรจัดหน่วยแพทย์เคลื่อนที่เร็วเข้าสนับสนุนด่วน</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 4. Obesity and Body Composition Indicators */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-xl">
                  <Apple className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">ดัชนีมวลกายและการควบคุมภาวะอ้วน (Body Composition BMI & Obesity Control)</h4>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase">ร้อยละของประชากรที่มีภาวะน้ำหนักเกินและอ้วนลงพุง (ซึ่งเป็นจุดเริ่มต้นของโรค NCDs)</p>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${analysis.bmi.unhealthyBmiPct >= 50 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                อัตราน้ำหนักเกินรวม: {analysis.bmi.unhealthyBmiPct}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              
              <div className="bg-slate-50 p-3.5 rounded-xl text-center border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">น้ำหนักต่ำกว่าเกณฑ์</span>
                <span className="text-xl font-black text-blue-600">{analysis.bmi.underweight} ราย</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">BMI &lt; 18.5</span>
              </div>

              <div className="bg-emerald-50/50 p-3.5 rounded-xl text-center border border-emerald-100">
                <span className="text-[10px] text-emerald-700 font-bold block mb-1">น้ำหนักสมส่วน (เป้าหมาย)</span>
                <span className="text-xl font-black text-emerald-600">{analysis.bmi.standard} ราย</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">BMI 18.5 - 22.9</span>
              </div>

              <div className="bg-yellow-50/50 p-3.5 rounded-xl text-center border border-yellow-100">
                <span className="text-[10px] text-yellow-700 font-bold block mb-1">น้ำหนักเกินเกณฑ์</span>
                <span className="text-xl font-black text-yellow-600">{analysis.bmi.overweight} ราย</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">BMI 23.0 - 24.9</span>
              </div>

              <div className="bg-orange-50/50 p-3.5 rounded-xl text-center border border-orange-100">
                <span className="text-[10px] text-orange-700 font-bold block mb-1">โรคอ้วนระดับ 1</span>
                <span className="text-xl font-black text-orange-600">{analysis.bmi.obeseLevel1} ราย</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">BMI 25.0 - 29.9</span>
              </div>

              <div className="bg-red-50/50 p-3.5 rounded-xl text-center border border-red-100">
                <span className="text-[10px] text-red-700 font-bold block mb-1">โรคอ้วนระดับ 2 (วิกฤต)</span>
                <span className="text-xl font-black text-red-600">{analysis.bmi.obeseLevel2} ราย</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">BMI &ge; 30.0</span>
              </div>

            </div>

            {analysis.muscleMass && analysis.muscleMass.count > 0 && (
              <div className="mt-4 p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-700">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700">ดัชนีมวลกล้ามเนื้อเฉลี่ยในกลุ่มเป้าหมาย (Average Muscle Mass Indicator):</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-indigo-700 font-mono">{analysis.muscleMass.avg} กก.</span>
                  <span className="text-[10px] text-slate-400 font-bold block">ประเมินจากผู้ที่มีบันทึกข้อมูล {analysis.muscleMass.count} ราย</span>
                </div>
              </div>
            )}

            {analysis.bmi.unhealthyBmiCount > 0 && (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">การแปรผลดัชนีมวลกายภาพรวม (BMI Data Interpretation):</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  จากการประเมินดัชนีมวลกาย (BMI) พบว่าประชากรกลุ่มคัดกรองมีสัดส่วนผู้ที่มีภาวะน้ำหนักตัวเกินเกณฑ์มาตรฐานสะสมและเป็นโรคอ้วนระดับต่างๆ รวมทั้งสิ้น <strong className="text-amber-600 font-black">{analysis.bmi.unhealthyBmiCount} ราย ({analysis.bmi.unhealthyBmiPct}%)</strong> 
                  {analysis.bmi.unhealthyBmiPct >= 50 ? (
                    <span className="text-rose-600 font-black"> ซึ่งถือเป็นภาวะน้ำหนักเกินในสัดส่วนที่สูงมากในชุมชน (ภาวะความชุกวิกฤตระดับสูง)</span>
                  ) : (
                    <span className="text-emerald-600 font-black font-semibold"> ซึ่งอยู่ในระดับที่สามารถเฝ้าระวังและส่งเสริมการป้องกันได้ตามเกณฑ์</span>
                  )}
                  {" "}ส่งผลกระทบต่อเนื่องโดยตรงต่อภาวะดื้อต่ออินซูลินและระดับความเหนื่อยล้าของหลอดเลือดหัวใจ คณะทำงานและ อสม. ควรเน้นการส่งเสริมโปรแกรมควบคุมอาหารรสหวาน/มัน และจัดกิจกรรมเดินเร็วสะสมก้าวในชุมชนเพื่อลดดัชนีมวลกายเฉลี่ยให้อยู่ในเกณฑ์ปลอดภัย
                </p>
              </div>
            )}

          </div>

          {/* 5. Personal Plan Tracking Dashboard */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-xl">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">สรุปข้อมูลแผนปรับเปลี่ยนพฤติกรรม (Personal Plan Tracking)</h4>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase">เปรียบเทียบร้อยละความสำเร็จในการตั้งเป้าหมายและทำตามแผนของประชากรในแต่ละด้าน</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {analysis.personalPlanStats.map((plan, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between h-full hover:bg-slate-100/50 transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-700">{plan.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        plan.achievedPct >= 70 ? 'bg-emerald-100 text-emerald-700' : 
                        plan.achievedPct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {plan.achievedPct}%
                      </span>
                    </div>
                    
                    <div className="relative w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 mb-3">
                      <div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                          plan.achievedPct >= 70 ? 'bg-emerald-500' : 
                          plan.achievedPct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${plan.achievedPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-1 pt-2 border-t border-slate-200/60">
                    <div className="text-center">
                      <span className="block text-lg font-black text-slate-800 leading-none">{plan.achieved}</span>
                      <span className="block text-[9px] font-bold text-slate-400 mt-0.5">ทำสำเร็จ</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-lg font-black text-slate-500 leading-none">{plan.set}</span>
                      <span className="block text-[9px] font-bold text-slate-400 mt-0.5">ตั้งแผนรวม</span>
                    </div>
                  </div>
                </div>
              ))}
              {analysis.personalPlanStats.every(p => p.set === 0) && (
                <div className="col-span-5 text-center py-8 text-slate-400 text-xs font-medium">
                  ยังไม่มีข้อมูลการตั้งแผนปรับเปลี่ยนพฤติกรรมในพื้นที่ที่เลือก
                </div>
              )}
            </div>

            {!analysis.personalPlanStats.every(p => p.set === 0) && (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">การวิเคราะห์พฤติกรรมรายบุคคล (Personal Plan Data Interpretation):</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  จากการตั้งแผนปฏิบัติการรายบุคคล พบว่าประเด็นความสำเร็จสูงสุดคือ 
                  {" "}<strong className="text-emerald-600 font-black">{(() => {
                    const sorted = [...analysis.personalPlanStats].sort((a, b) => b.achievedPct - a.achievedPct);
                    return `${sorted[0]?.label} (${sorted[0]?.achievedPct}%)`;
                  })()}</strong>{" "}
                  เนื่องจากมีสัดส่วนผู้ที่สามารถปฏิบัติตามเป้าหมายได้ดีที่สุดในพื้นที่ ในทางกลับกัน ประเด็นที่ยังมีสัดส่วนความสำเร็จต่ำสุดและต้องการการช่วยเหลือเพิ่มเติมหรือจัดแคมเปญสนับสนุนคือ
                  {" "}<strong className="text-rose-600 font-black">{(() => {
                    const sorted = [...analysis.personalPlanStats].filter(p => p.set > 0).sort((a, b) => a.achievedPct - b.achievedPct);
                    return sorted.length > 0 ? `${sorted[0]?.label} (${sorted[0]?.achievedPct}%)` : "ยังไม่มีเป้าหมายที่ต่ำกว่าเกณฑ์";
                  })()}</strong>{" "}
                  คณะทำงานควรมอบหมายให้ อสม. หรือแกนนำสุขภาพครอบครัวช่วยติดตามกระตุ้นการปฏิบัติอย่างใกล้ชิดเพื่อพัฒนาคุณภาพชีวิตอย่างยั่งยืน
                </p>
              </div>
            )}
          </div>

          {/* 6. Policy Advice and Dynamic Strategic Recommendations */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-white/10 p-2 rounded-xl">
                <Lightbulb className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider">ข้อเสนอนโยบายและมาตรการขับเคลื่อนชุมชน (Strategic Community Interventions)</h4>
                <p className="text-[10px] text-blue-100 font-semibold uppercase">ข้อเสนอแนะที่สร้างโดยระบบอ้างอิงตามวิเคราะห์พฤติกรรมเสี่ยงหลักและกลุ่มเสี่ยงสะสมในปัจจุบัน</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-yellow-200">
                  <span className="bg-yellow-300 text-slate-900 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                  <span>กิจกรรมปรับพฤติกรรมเป้าหมาย (Behavior Change Interventions)</span>
                </div>
                <ul className="text-xs text-slate-100 space-y-2.5 list-disc pl-4 leading-relaxed font-semibold">
                  {analysis.lifestyleFactors[0]?.type === "food" && (
                    <li><strong>โครงการหมู่บ้านลดเค็ม/ลดหวาน:</strong> ประชาสัมพันธ์เรื่องฉลากโภชนาการทางเลือกสุขภาพในชุมชน และรณรงค์งดเติมเครื่องปรุงในมื้ออาหารสำเร็จรูป</li>
                  )}
                  {analysis.lifestyleFactors[0]?.type === "exercise" && (
                    <li><strong>โครงการหมู่บ้านขยับกายไร้พุง:</strong> รณรงค์จัดกิจกรรมเต้นแอโรบิก รำไม้พลอง หรือเดินออกกำลังกายในชุมชนวันละ 30 นาที สัปดาห์ละ 5 วัน</li>
                  )}
                  {analysis.lifestyleFactors[0]?.type === "sleep" && (
                    <li><strong>กิจกรรมอารมณ์แจ่มใส นอนหลับสบาย:</strong> สนับสนุนกิจกรรมธรรมะ สวดมนต์ นั่งสมาธิชุมชนเพื่อคลายความวิตกกังวลและยกระดับคุณภาพการนอน</li>
                  )}
                  <li><strong>นวัตกรรม "ปิงปอง 7 สี" ประจำบ้าน:</strong> สนับสนุนการส่งมอบสื่อ อสม. ช่วยแนะนำแนวทางปฏิบัติตนตามเฉดสีความเสี่ยงรายบุคคล</li>
                </ul>
              </div>

              <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-yellow-200">
                  <span className="bg-yellow-300 text-slate-900 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                  <span>ระบบเฝ้าระวังและการส่งต่อ (Monitoring & Handoff Operations)</span>
                </div>
                <ul className="text-xs text-slate-100 space-y-2.5 list-disc pl-4 leading-relaxed font-semibold">
                  <li><strong>ขยายเครือข่ายความถี่การคัดกรอง:</strong> ในชุมชนกลุ่มเสี่ยงหนาแน่นสูงสุด โดยเฉพาะที่ <strong className="text-yellow-200">{analysis.sortedAreas[0]?.name || "พื้นที่วิกฤต"}</strong> เพิ่มรอบคัดกรองเคลื่อนที่ด่วน</li>
                  <li><strong>การติดตามอัจฉริยะ (Follow-up Support):</strong> เสริมความแข็งแกร่งโครงการติดตามผู้ป่วย (Visit 2+) เพื่อรักษาความก้าวหน้าการฟื้นตัวของอัตราการควบคุมโรคที่ปัจจุบันอยู่ในระดับ <strong className="text-yellow-200">{analysis.followUp.successRate}%</strong></li>
                  <li><strong>ประสานบูรณาการระดับภาคี (Satun Mini Flag Ship Collaboration):</strong> ผลักดันนโยบายงดอาหารรสจัดในสถานศึกษา และสนับสนุน รพ.สต. เพื่อแจกเครื่องวัดความดันให้กับผู้ป่วยสงสัยโรคระยะแรก</li>
                </ul>
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
};
