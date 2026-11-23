import React, { useState, useMemo, useEffect } from "react";
import { ScreeningRecord, EXACT_LOCATION_LIST, PROJECT_PERFORMANCE_AREAS, SUBDISTRICT_MODEL_AREAS, VILLAGE_MODEL_AREAS } from "../types";
import { supabase } from "../lib/supabase";
import {
  getRecordModel,
  getRecordSubdistrict,
  getRecordPerformanceUnit,
  cleanDistrict,
  cleanSubdistrict,
  cleanTargetArea,
} from "./BackupRestoreModal";
import {
  formatThaiDate,
  formatYearMonthThaiShort,
  formatYearMonthThai,
  getRecordYearMonth,
  parseDateToIso,
} from "../utils";
import {
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Activity,
  Award,
  MapPin,
  BarChart3,
  Printer,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Sparkles,
  Layers,
  RefreshCw,
  FileText,
} from "lucide-react";

interface ExecutiveBriefingDashboardProps {
  records: ScreeningRecord[];
  initialTargets?: Record<string, number>;
  onNavigateToTracking?: () => void;
}

type RiskCategory = "normal" | "high_risk" | "sick";

/**
 * Classify a screening record into 3 executive risk tiers:
 * - "sick" (ป่วย / สงสัยป่วย): htResult.level === "danger" || dmResult.level === "danger" || BP >= 140/90 || FBS >= 126 (or RBS >= 200)
 * - "high_risk" (เสี่ยงสูง): htResult.level === "risk" || dmResult.level === "risk" || BP 120-139/80-89 || Sugar in pre-diabetes range
 * - "normal" (ปกติ): Both HT and DM are normal
 */
function classifyRecordRisk(r: ScreeningRecord): RiskCategory {
  const htLevel = r.htResult?.level;
  const dmLevel = r.dmResult?.level;

  if (htLevel === "danger" || dmLevel === "danger") {
    return "sick";
  }
  if (htLevel === "risk" || dmLevel === "risk") {
    return "high_risk";
  }
  return "normal";
}

function getRiskSeverityScore(cat: RiskCategory): number {
  if (cat === "sick") return 2;
  if (cat === "high_risk") return 1;
  return 0;
}

export const ExecutiveBriefingDashboard: React.FC<ExecutiveBriefingDashboardProps> = ({
  records,
  initialTargets,
  onNavigateToTracking,
}) => {
  // Filters
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<string>("all");
  const [selectedTargetArea, setSelectedTargetArea] = useState<string>("all");
  const [selectedParticipantType, setSelectedParticipantType] = useState<string>("all");
  const [trendChartMode, setTrendChartMode] = useState<"risk" | "visit">("risk");
  const [subdistrictSortBy, setSubdistrictSortBy] = useState<"progress" | "screened" | "sick" | "improved">("progress");

  // Project targets state (keyed by `${model}|${district}|${targetArea}`)
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    if (initialTargets && Object.keys(initialTargets).length > 0) {
      return initialTargets;
    }
    try {
      const saved = localStorage.getItem("ncd_project_targets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {}
    return {};
  });

  useEffect(() => {
    if (initialTargets && Object.keys(initialTargets).length > 0) {
      setTargets((prev) => ({ ...prev, ...initialTargets }));
    }
  }, [initialTargets]);

  useEffect(() => {
    let isMounted = true;
    async function fetchTargets() {
      try {
        const res = await fetch("/api/project-targets");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.targets && isMounted) {
            setTargets((prev) => {
              const merged = { ...prev, ...json.targets };
              localStorage.setItem("ncd_project_targets", JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (e) {}

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
            setTargets((prev) => {
              const merged = { ...prev, ...sbMap };
              localStorage.setItem("ncd_project_targets", JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (e) {}
    }
    fetchTargets();
    return () => {
      isMounted = false;
    };
  }, []);

  // Available filter options from PROJECT_PERFORMANCE_AREAS (5 ตำบล + 10 หมู่บ้าน = 15 พื้นที่)
  const districtOptions = useMemo(() => {
    const set = new Set<string>();
    PROJECT_PERFORMANCE_AREAS.forEach((loc) => {
      if (selectedModel === "all" || loc.model === selectedModel) {
        set.add(loc.district);
      }
    });
    return Array.from(set);
  }, [selectedModel]);

  // 2. โมเดลตำบล -> ข้อมูลตำบล (5 ตำบล)
  const subdistrictOptions = useMemo(() => {
    const set = new Set<string>();
    SUBDISTRICT_MODEL_AREAS.forEach((loc) => {
      if (selectedDistrict === "all" || loc.district === selectedDistrict) {
        set.add(loc.subdistrict);
      }
    });
    return Array.from(set);
  }, [selectedDistrict]);

  // 1. โมเดลหมู่บ้าน -> ข้อมูลพื้นที่เป้าหมาย (หมู่บ้าน/รพ.สต.) (10 พื้นที่)
  const targetAreaOptions = useMemo(() => {
    const set = new Set<string>();
    VILLAGE_MODEL_AREAS.forEach((loc) => {
      if (selectedDistrict === "all" || loc.district === selectedDistrict) {
        set.add(loc.areaName);
      }
    });
    return Array.from(set);
  }, [selectedDistrict]);

  // Active valid records matching current filters
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (!r || r.isDeleted) return false;
      const areaStr = String(r.targetArea || "");
      if (areaStr.includes("บุโบย") || areaStr.includes("ตะโล๊ะใส") || areaStr.includes("ตะโละใส")) {
        return false;
      }

      const perfUnit = getRecordPerformanceUnit(r);
      const recModel = perfUnit.model || getRecordModel(r);
      const recDist = cleanDistrict(perfUnit.district || r.district);
      const recSub = cleanSubdistrict(perfUnit.subdistrict || getRecordSubdistrict(r));
      const recArea = perfUnit.areaName || cleanTargetArea(r.targetArea);
      const pType = r.participantType || "กลุ่มเป้าหมายโครงการ";

      if (selectedModel !== "all" && recModel !== selectedModel) return false;
      if (selectedDistrict !== "all" && recDist !== selectedDistrict) return false;
      if (selectedSubdistrict !== "all" && (recModel !== "ตำบล" || recSub !== selectedSubdistrict)) return false;
      if (selectedTargetArea !== "all" && (recModel !== "หมู่บ้าน" || recArea !== selectedTargetArea)) return false;
      if (selectedParticipantType !== "all" && pType !== selectedParticipantType) return false;

      return true;
    });
  }, [records, selectedModel, selectedDistrict, selectedSubdistrict, selectedTargetArea, selectedParticipantType]);

  // Group records by unique person (normalized name + area/district) to get baseline vs latest visit
  const personHistories = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        model: string;
        district: string;
        subdistrict: string;
        targetArea: string;
        participantType: string;
        visits: ScreeningRecord[];
        baseline: ScreeningRecord;
        latest: ScreeningRecord;
        baselineRisk: RiskCategory;
        latestRisk: RiskCategory;
      }
    >();

    const byPerson = new Map<string, ScreeningRecord[]>();
    filteredRecords.forEach((r) => {
      const cleanName = (r.name || "ไม่ระบุ").trim().replace(/\s+/g, " ");
      const perfUnit = getRecordPerformanceUnit(r);
      const dist = cleanDistrict(perfUnit.district || r.district);
      const key = `${cleanName}|${dist}`;
      const list = byPerson.get(key) || [];
      list.push(r);
      byPerson.set(key, list);
    });

    byPerson.forEach((visitList, key) => {
      const sorted = [...visitList].sort((a, b) => {
        const vDiff = (Number(a.visitNumber) || 1) - (Number(b.visitNumber) || 1);
        if (vDiff !== 0) return vDiff;
        return parseDateToIso(a.date).localeCompare(parseDateToIso(b.date));
      });
      const baseline = sorted[0];
      const latest = sorted[sorted.length - 1];
      const perfUnit = getRecordPerformanceUnit(latest);

      map.set(key, {
        name: (latest.name || "ไม่ระบุ").trim(),
        model: perfUnit.model || getRecordModel(latest),
        district: cleanDistrict(perfUnit.district || latest.district),
        subdistrict: cleanSubdistrict(perfUnit.subdistrict || getRecordSubdistrict(latest)),
        targetArea: perfUnit.areaName || cleanTargetArea(latest.targetArea),
        participantType: latest.participantType || "กลุ่มเป้าหมายโครงการ",
        visits: sorted,
        baseline,
        latest,
        baselineRisk: classifyRecordRisk(baseline),
        latestRisk: classifyRecordRisk(latest),
      });
    });

    return Array.from(map.values());
  }, [filteredRecords]);

  // Filtered target locations (15 areas: 5 ตำบล + 10 หมู่บ้าน) and total target count
  const matchingLocations = useMemo(() => {
    return PROJECT_PERFORMANCE_AREAS.filter((loc) => {
      if (selectedModel !== "all" && loc.model !== selectedModel) return false;
      if (selectedDistrict !== "all" && loc.district !== selectedDistrict) return false;
      if (selectedSubdistrict !== "all" && (loc.model !== "ตำบล" || loc.subdistrict !== selectedSubdistrict)) return false;
      if (selectedTargetArea !== "all" && (loc.model !== "หมู่บ้าน" || loc.areaName !== selectedTargetArea)) return false;
      return true;
    });
  }, [selectedModel, selectedDistrict, selectedSubdistrict, selectedTargetArea]);

  const totalTargetPeople = useMemo(() => {
    return matchingLocations.reduce((sum, loc) => {
      const unitKey = `${loc.model}|${loc.district}|${loc.areaName}`;
      if (targets[unitKey] !== undefined) {
        return sum + (Number(targets[unitKey]) || 0);
      }
      const subSum = loc.subAreas.reduce((s, rawArea) => {
        const rawKey = `${loc.model}|${loc.district}|${rawArea}`;
        return s + (Number(targets[rawKey]) || 0);
      }, 0);
      return sum + subSum;
    }, 0);
  }, [matchingLocations, targets]);

  // 1. Overall Risk Status Metrics (Unique People based on Latest Status & All Visits)
  const riskMetrics = useMemo(() => {
    const totalPeople = personHistories.length;
    const totalVisits = filteredRecords.length;

    let normalCount = 0;
    let highRiskCount = 0;
    let sickCount = 0;

    let htRiskCount = 0;
    let htSickCount = 0;
    let dmRiskCount = 0;
    let dmSickCount = 0;
    let overweightCount = 0;

    let waistRecordedCount = 0;
    let waistSum = 0;
    let waistExceedCount = 0; // ชาย >= 36 นิ้ว, หญิง >= 32 นิ้ว
    let lowWaterCount = 0;
    let adequateWaterCount = 0;

    personHistories.forEach((p) => {
      const r = p.latest;
      if (p.latestRisk === "normal") normalCount++;
      else if (p.latestRisk === "high_risk") highRiskCount++;
      else sickCount++;

      if (r.htResult?.level === "risk") htRiskCount++;
      if (r.htResult?.level === "danger") htSickCount++;
      if (r.dmResult?.level === "risk") dmRiskCount++;
      if (r.dmResult?.level === "danger") dmSickCount++;

      const bmiVal = parseFloat(r.bmi || "0");
      if (bmiVal >= 23.0) overweightCount++;

      if (r.waist !== undefined && r.waist !== null && Number(r.waist) > 0) {
        const w = Number(r.waist);
        waistRecordedCount++;
        waistSum += w;
        if (r.gender === "ชาย" ? w >= 36 : w >= 32) {
          waistExceedCount++;
        }
      }

      if (r.water?.includes("น้อยกว่า 6")) {
        lowWaterCount++;
      } else if (r.water) {
        adequateWaterCount++;
      }
    });

    const pct = (n: number) => (totalPeople > 0 ? Math.round((n / totalPeople) * 1000) / 10 : 0);
    const targetAchievementPct =
      totalTargetPeople > 0 ? Math.round((totalPeople / totalTargetPeople) * 1000) / 10 : 0;

    return {
      totalPeople,
      totalVisits,
      totalTargetPeople,
      targetAchievementPct,
      normalCount,
      normalPct: pct(normalCount),
      highRiskCount,
      highRiskPct: pct(highRiskCount),
      sickCount,
      sickPct: pct(sickCount),
      htRiskCount,
      htSickCount,
      dmRiskCount,
      dmSickCount,
      overweightCount,
      overweightPct: pct(overweightCount),
      waistRecordedCount,
      avgWaist: waistRecordedCount > 0 ? Math.round((waistSum / waistRecordedCount) * 10) / 10 : 0,
      waistExceedCount,
      waistExceedPct:
        waistRecordedCount > 0 ? Math.round((waistExceedCount / waistRecordedCount) * 1000) / 10 : 0,
      lowWaterCount,
      lowWaterPct: pct(lowWaterCount),
      adequateWaterCount,
      adequateWaterPct: pct(adequateWaterCount),
    };
  }, [personHistories, filteredRecords, totalTargetPeople]);

  // 2. Longitudinal Change & Impact Metrics (การเปลี่ยนแปลงที่เกิดขึ้น ก่อน-หลัง การติดตาม)
  const longitudinalImpact = useMemo(() => {
    const followedUpPeople = personHistories.filter((p) => p.visits.length >= 2);
    const totalFollowedUp = followedUpPeople.length;
    const followUpRatePct =
      personHistories.length > 0
        ? Math.round((totalFollowedUp / personHistories.length) * 1000) / 10
        : 0;

    let bpImprovedCount = 0;
    let sugarImprovedCount = 0;
    let bmiImprovedCount = 0;
    let overallClinicalImprovedCount = 0;

    let riskDowngradedCount = 0; // Improved risk tier (e.g. sick -> high_risk/normal or high_risk -> normal)
    let riskMaintainedNormalCount = 0; // Stayed normal
    let riskUnchangedCount = 0;
    let riskEscalatedCount = 0;

    let sumBaseSys = 0;
    let sumLatestSys = 0;
    let sumBaseDia = 0;
    let sumLatestDia = 0;
    let sumBaseSugar = 0;
    let sumLatestSugar = 0;
    let sumBaseBmi = 0;
    let sumLatestBmi = 0;
    let validBmiCount = 0;

    followedUpPeople.forEach((p) => {
      const base = p.baseline;
      const lat = p.latest;

      const baseSys = Number(base.bpSys) || 0;
      const latSys = Number(lat.bpSys) || 0;
      const baseDia = Number(base.bpDia) || 0;
      const latDia = Number(lat.bpDia) || 0;
      const baseSugar = Number(base.sugar) || 0;
      const latSugar = Number(lat.sugar) || 0;
      const baseBmi = parseFloat(base.bmi || "0");
      const latBmi = parseFloat(lat.bmi || "0");

      sumBaseSys += baseSys;
      sumLatestSys += latSys;
      sumBaseDia += baseDia;
      sumLatestDia += latDia;
      sumBaseSugar += baseSugar;
      sumLatestSugar += latSugar;

      if (baseBmi > 0 && latBmi > 0) {
        sumBaseBmi += baseBmi;
        sumLatestBmi += latBmi;
        validBmiCount++;
      }

      const bpBetter = latSys < baseSys || (latSys === baseSys && latDia < baseDia);
      const sugarBetter = latSugar < baseSugar;
      const bmiBetter = baseBmi >= 23 && latBmi < baseBmi;

      if (bpBetter) bpImprovedCount++;
      if (sugarBetter) sugarImprovedCount++;
      if (bmiBetter || (latBmi > 0 && latBmi < baseBmi)) bmiImprovedCount++;

      const baseSev = getRiskSeverityScore(p.baselineRisk);
      const latSev = getRiskSeverityScore(p.latestRisk);

      if (latSev < baseSev) {
        riskDowngradedCount++;
      } else if (baseSev === 0 && latSev === 0) {
        riskMaintainedNormalCount++;
      } else if (latSev === baseSev) {
        riskUnchangedCount++;
      } else {
        riskEscalatedCount++;
      }

      if (bpBetter || sugarBetter || latSev < baseSev) {
        overallClinicalImprovedCount++;
      }
    });

    // Behavior Plan 6-Pillar Achievement across all latest records with personalPlan
    const pillarStats = {
      sweet: { label: "ลดหวาน", achieved: 0, total: 0, keyword: "#ลดน้ำตาล" },
      fat: { label: "ลดมัน", achieved: 0, total: 0, keyword: "#คุมไขมัน" },
      salt: { label: "ลดเค็ม", achieved: 0, total: 0, keyword: "#ลดโซเดียม" },
      sleep: { label: "นอนหลับ", achieved: 0, total: 0, keyword: "#พักผ่อนเพียงพอ" },
      water: { label: "ดื่มน้ำเปล่า", achieved: 0, total: 0, keyword: "#ดื่มน้ำ8แก้ว" },
      exercise: { label: "ออกกำลังกาย", achieved: 0, total: 0, keyword: "#ขยับร่างกาย" },
    };

    personHistories.forEach((p) => {
      const plan = p.latest.personalPlan;
      if (!plan) return;
      (Object.keys(pillarStats) as Array<keyof typeof pillarStats>).forEach((k) => {
        const item = plan[k];
        if (item && (item.plan || item.achieved !== undefined)) {
          pillarStats[k].total++;
          if (item.achieved) {
            pillarStats[k].achieved++;
          }
        }
      });
    });

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

    const avgBaseSys = totalFollowedUp > 0 ? Math.round((sumBaseSys / totalFollowedUp) * 10) / 10 : 0;
    const avgLatestSys = totalFollowedUp > 0 ? Math.round((sumLatestSys / totalFollowedUp) * 10) / 10 : 0;
    const avgBaseSugar = totalFollowedUp > 0 ? Math.round((sumBaseSugar / totalFollowedUp) * 10) / 10 : 0;
    const avgLatestSugar = totalFollowedUp > 0 ? Math.round((sumLatestSugar / totalFollowedUp) * 10) / 10 : 0;
    const avgBaseBmi = validBmiCount > 0 ? Math.round((sumBaseBmi / validBmiCount) * 10) / 10 : 0;
    const avgLatestBmi = validBmiCount > 0 ? Math.round((sumLatestBmi / validBmiCount) * 10) / 10 : 0;

    return {
      totalFollowedUp,
      followUpRatePct,
      bpImprovedCount,
      bpImprovedPct: pct(bpImprovedCount, totalFollowedUp),
      sugarImprovedCount,
      sugarImprovedPct: pct(sugarImprovedCount, totalFollowedUp),
      bmiImprovedCount,
      bmiImprovedPct: pct(bmiImprovedCount, totalFollowedUp),
      overallClinicalImprovedCount,
      overallClinicalImprovedPct: pct(overallClinicalImprovedCount, totalFollowedUp),
      riskDowngradedCount,
      riskDowngradedPct: pct(riskDowngradedCount, totalFollowedUp),
      riskMaintainedNormalCount,
      riskMaintainedNormalPct: pct(riskMaintainedNormalCount, totalFollowedUp),
      riskUnchangedCount,
      riskEscalatedCount,
      avgBaseSys,
      avgLatestSys,
      sysDelta: Math.round((avgLatestSys - avgBaseSys) * 10) / 10,
      avgBaseSugar,
      avgLatestSugar,
      sugarDelta: Math.round((avgLatestSugar - avgBaseSugar) * 10) / 10,
      avgBaseBmi,
      avgLatestBmi,
      bmiDelta: Math.round((avgLatestBmi - avgBaseBmi) * 10) / 10,
      pillars: (Object.keys(pillarStats) as Array<keyof typeof pillarStats>).map((k) => ({
        key: k,
        ...pillarStats[k],
        pct: pct(pillarStats[k].achieved, pillarStats[k].total),
      })),
    };
  }, [personHistories]);

  // 3. Model Comparison (เปรียบเทียบความสำเร็จ โมเดลตำบล 5 ตำบล vs โมเดลหมู่บ้าน 10 พื้นที่)
  const modelComparison = useMemo(() => {
    const models: Array<"ตำบล" | "หมู่บ้าน"> = ["ตำบล", "หมู่บ้าน"];
    return models.map((modelName) => {
      const locs = PROJECT_PERFORMANCE_AREAS.filter(
        (l) =>
          l.model === modelName &&
          (selectedDistrict === "all" || l.district === selectedDistrict) &&
          (selectedSubdistrict === "all" || (l.model === "ตำบล" && l.subdistrict === selectedSubdistrict)) &&
          (selectedTargetArea === "all" || (l.model === "หมู่บ้าน" && l.areaName === selectedTargetArea))
      );
      const targetSum = locs.reduce((acc, l) => {
        const unitKey = `${l.model}|${l.district}|${l.areaName}`;
        if (targets[unitKey] !== undefined) {
          return acc + (Number(targets[unitKey]) || 0);
        }
        return (
          acc +
          l.subAreas.reduce((s, rawArea) => {
            const rawKey = `${l.model}|${l.district}|${rawArea}`;
            return s + (Number(targets[rawKey]) || 0);
          }, 0)
        );
      }, 0);

      const people = personHistories.filter((p) => p.model === modelName);
      const screenedCount = people.length;
      const achievementPct = targetSum > 0 ? Math.round((screenedCount / targetSum) * 1000) / 10 : 0;

      let normal = 0;
      let highRisk = 0;
      let sick = 0;
      let followedUp = 0;
      let improved = 0;

      people.forEach((p) => {
        if (p.latestRisk === "normal") normal++;
        else if (p.latestRisk === "high_risk") highRisk++;
        else sick++;

        if (p.visits.length >= 2) {
          followedUp++;
          const base = p.baseline;
          const lat = p.latest;
          const bpBetter = (Number(lat.bpSys) || 0) < (Number(base.bpSys) || 0);
          const sugarBetter = (Number(lat.sugar) || 0) < (Number(base.sugar) || 0);
          const riskBetter = getRiskSeverityScore(p.latestRisk) < getRiskSeverityScore(p.baselineRisk);
          if (bpBetter || sugarBetter || riskBetter) improved++;
        }
      });

      const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

      return {
        model: modelName,
        areaCount: locs.length,
        targetSum,
        screenedCount,
        achievementPct,
        normal,
        normalPct: pct(normal, screenedCount),
        highRisk,
        highRiskPct: pct(highRisk, screenedCount),
        sick,
        sickPct: pct(sick, screenedCount),
        followedUp,
        followUpPct: pct(followedUp, screenedCount),
        improved,
        improvedPct: pct(improved, followedUp),
      };
    });
  }, [personHistories, targets, selectedDistrict, selectedSubdistrict, selectedTargetArea]);

  // 4. Subdistrict Success Summary (สรุปผลความสำเร็จรายตำบล / พื้นที่โมเดล)
  const subdistrictSummary = useMemo(() => {
    const subMap = new Map<
      string,
      {
        subdistrict: string;
        district: string;
        models: Set<string>;
        areas: Set<string>;
        targetSum: number;
        screenedCount: number;
        normalCount: number;
        highRiskCount: number;
        sickCount: number;
        followedUpCount: number;
        improvedCount: number;
      }
    >();

    // Seed with official performance areas matching filters
    matchingLocations.forEach((loc) => {
      const key = `${loc.district}|${loc.subdistrict}`;
      if (!subMap.has(key)) {
        subMap.set(key, {
          subdistrict: loc.subdistrict,
          district: loc.district,
          models: new Set(),
          areas: new Set(),
          targetSum: 0,
          screenedCount: 0,
          normalCount: 0,
          highRiskCount: 0,
          sickCount: 0,
          followedUpCount: 0,
          improvedCount: 0,
        });
      }
      const item = subMap.get(key)!;
      item.models.add(loc.model);
      item.areas.add(loc.areaName);
      const unitKey = `${loc.model}|${loc.district}|${loc.areaName}`;
      if (targets[unitKey] !== undefined) {
        item.targetSum += Number(targets[unitKey]) || 0;
      } else {
        item.targetSum += loc.subAreas.reduce((s, rawArea) => {
          const rawKey = `${loc.model}|${loc.district}|${rawArea}`;
          return s + (Number(targets[rawKey]) || 0);
        }, 0);
      }
    });

    // Populate with screened people
    personHistories.forEach((p) => {
      const subName = p.subdistrict || "ไม่ระบุตำบล";
      const distName = p.district || "ไม่ระบุอำเภอ";
      const key = `${distName}|${subName}`;

      if (!subMap.has(key)) {
        subMap.set(key, {
          subdistrict: subName,
          district: distName,
          models: new Set([p.model]),
          areas: new Set([p.targetArea]),
          targetSum: 0,
          screenedCount: 0,
          normalCount: 0,
          highRiskCount: 0,
          sickCount: 0,
          followedUpCount: 0,
          improvedCount: 0,
        });
      }

      const item = subMap.get(key)!;
      if (p.model) item.models.add(p.model);
      if (p.targetArea) item.areas.add(p.targetArea);
      item.screenedCount++;

      if (p.latestRisk === "normal") item.normalCount++;
      else if (p.latestRisk === "high_risk") item.highRiskCount++;
      else item.sickCount++;

      if (p.visits.length >= 2) {
        item.followedUpCount++;
        const base = p.baseline;
        const lat = p.latest;
        const bpBetter = (Number(lat.bpSys) || 0) < (Number(base.bpSys) || 0);
        const sugarBetter = (Number(lat.sugar) || 0) < (Number(base.sugar) || 0);
        const riskBetter = getRiskSeverityScore(p.latestRisk) < getRiskSeverityScore(p.baselineRisk);
        if (bpBetter || sugarBetter || riskBetter) {
          item.improvedCount++;
        }
      }
    });

    const rows = Array.from(subMap.values()).map((item) => {
      const achievementPct =
        item.targetSum > 0 ? Math.round((item.screenedCount / item.targetSum) * 1000) / 10 : 0;
      const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

      const normalPct = pct(item.normalCount, item.screenedCount);
      const highRiskPct = pct(item.highRiskCount, item.screenedCount);
      const sickPct = pct(item.sickCount, item.screenedCount);
      const followUpPct = pct(item.followedUpCount, item.screenedCount);
      const improvedPct = pct(item.improvedCount, item.followedUpCount);

      // Generate concise Executive Decision Keywords per subdistrict
      const keywords: Array<{ text: string; tone: "emerald" | "blue" | "amber" | "rose" | "slate" }> = [];

      if (item.targetSum > 0 && achievementPct >= 90) {
        keywords.push({ text: "#บรรลุเป้าดีเยี่ยม", tone: "emerald" });
      } else if (item.targetSum > 0 && achievementPct >= 60) {
        keywords.push({ text: "#คืบหน้าตามแผน", tone: "blue" });
      } else if (item.screenedCount > 0 && item.targetSum > 0) {
        keywords.push({ text: "#เร่งคัดกรองเชิงรุก", tone: "amber" });
      } else if (item.screenedCount === 0) {
        keywords.push({ text: "#รอเริ่มคัดกรอง", tone: "slate" });
      }

      if (sickPct >= 30 && item.screenedCount >= 5) {
        keywords.push({ text: "#กลุ่มป่วยสูง·ส่งต่อด่วน", tone: "rose" });
      } else if (highRiskPct >= 35 && item.screenedCount >= 5) {
        keywords.push({ text: "#เน้นปรับพฤติกรรม3อ2ส", tone: "amber" });
      } else if (normalPct >= 60 && item.screenedCount >= 5) {
        keywords.push({ text: "#สุขภาพชุมชนแข็งแรง", tone: "emerald" });
      }

      if (improvedPct >= 50 && item.followedUpCount >= 3) {
        keywords.push({ text: "#ต้นแบบลดความเสี่ยง", tone: "emerald" });
      } else if (followUpPct < 20 && item.screenedCount >= 10) {
        keywords.push({ text: "#เพิ่มรอบติดตามซ้ำ", tone: "blue" });
      }

      return {
        ...item,
        modelList: Array.from(item.models).filter(Boolean),
        areaCount: item.areas.size,
        achievementPct,
        normalPct,
        highRiskPct,
        sickPct,
        followUpPct,
        improvedPct,
        keywords: keywords.slice(0, 2),
      };
    });

    return rows.sort((a, b) => {
      if (subdistrictSortBy === "screened") return b.screenedCount - a.screenedCount;
      if (subdistrictSortBy === "sick") return b.sickPct - a.sickPct || b.sickCount - a.sickCount;
      if (subdistrictSortBy === "improved") return b.improvedPct - a.improvedPct || b.improvedCount - a.improvedCount;
      return b.achievementPct - a.achievementPct || b.screenedCount - a.screenedCount;
    });
  }, [matchingLocations, personHistories, targets, subdistrictSortBy]);

  // 5. Monthly Screening Trend Data (กราฟแนวโน้มการคัดกรอง)
  const monthlyTrends = useMemo(() => {
    const monthMap = new Map<
      string,
      {
        ym: string;
        labelShort: string;
        labelFull: string;
        total: number;
        normal: number;
        highRisk: number;
        sick: number;
        visit1: number;
        followUp: number;
      }
    >();

    filteredRecords.forEach((r) => {
      const ym = getRecordYearMonth(r.date);
      if (!ym) return;
      if (!monthMap.has(ym)) {
        monthMap.set(ym, {
          ym,
          labelShort: formatYearMonthThaiShort(ym),
          labelFull: formatYearMonthThai(ym),
          total: 0,
          normal: 0,
          highRisk: 0,
          sick: 0,
          visit1: 0,
          followUp: 0,
        });
      }
      const m = monthMap.get(ym)!;
      m.total++;
      const risk = classifyRecordRisk(r);
      if (risk === "normal") m.normal++;
      else if (risk === "high_risk") m.highRisk++;
      else m.sick++;

      if ((Number(r.visitNumber) || 1) <= 1) m.visit1++;
      else m.followUp++;
    });

    const sorted = Array.from(monthMap.values()).sort((a, b) => a.ym.localeCompare(b.ym));
    const maxTotal = sorted.reduce((max, item) => Math.max(max, item.total), 1);
    const peakMonth = sorted.reduce(
      (best, item) => (item.total > (best?.total || 0) ? item : best),
      sorted[0] || null
    );

    return {
      months: sorted,
      maxTotal,
      peakMonth,
      avgPerMonth: sorted.length > 0 ? Math.round(filteredRecords.length / sorted.length) : 0,
    };
  }, [filteredRecords]);

  // 6. Top Executive Decision Keywords (สรุปใจความสำคัญเป็นคีย์เวิร์ดเพื่อการตัดสินใจ)
  const executiveDecisionKeywords = useMemo(() => {
    const topSubdistrict = [...subdistrictSummary].sort(
      (a, b) => b.achievementPct - a.achievementPct || b.screenedCount - a.screenedCount
    )[0];

    const urgentSubdistrict = [...subdistrictSummary]
      .filter((s) => s.screenedCount > 0)
      .sort((a, b) => b.sickPct - a.sickPct || b.highRiskPct - a.highRiskPct)[0];

    const lowCoverageSubdistrict = [...subdistrictSummary]
      .filter((s) => s.targetSum > 0)
      .sort((a, b) => a.achievementPct - b.achievementPct)[0];

    const primaryDriver =
      riskMetrics.htSickCount + riskMetrics.htRiskCount >=
      riskMetrics.dmSickCount + riskMetrics.dmRiskCount
        ? "ความดันโลหิตสูง (HT)"
        : "เบาหวาน (DM)";

    const leadingModel =
      (modelComparison[0]?.achievementPct || 0) >= (modelComparison[1]?.achievementPct || 0)
        ? modelComparison[0]
        : modelComparison[1];

    return {
      topSubdistrict,
      urgentSubdistrict,
      lowCoverageSubdistrict,
      primaryDriver,
      leadingModel,
    };
  }, [subdistrictSummary, riskMetrics, modelComparison]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Executive Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                EXECUTIVE BRIEFING
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                #สรุปผู้บริหาร
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                #คีย์เวิร์ดตัดสินใจทันที
              </span>
              <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                ข้อมูล ณ {formatThaiDate(new Date().toISOString(), "full")}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              รายงานสรุปผู้บริหาร: ภาพรวมความสำเร็จและการเปลี่ยนแปลงสุขภาพ (Executive Briefing)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              สังเคราะห์ข้อมูลผู้ผ่านการคัดกรอง แยกสถานะความเสี่ยง (ปกติ / เสี่ยงสูง / ป่วย) สรุปความสำเร็จรายตำบล แนวโน้มรายเดือน และการเปลี่ยนแปลงหลังติดตามผล
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
            {onNavigateToTracking && (
              <button
                onClick={onNavigateToTracking}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Target className="w-4 h-4 text-indigo-600" />
                <span>ตั้งค่าเป้าหมาย / ส่งออกรายงาน</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์บรีฟผู้บริหาร (A4)</span>
            </button>
          </div>
        </div>

        {/* Clean Filter Strip */}
        <div className="pt-4 flex flex-wrap items-center gap-2.5 print:hidden">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>การเลือกข้อมูลรายงาน (2 โมเดล):</span>
          </div>

          {/* Model Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {[
              { id: "all", label: "ทุกโมเดล (15 พื้นที่)" },
              { id: "หมู่บ้าน", label: "1. โมเดลหมู่บ้าน (10 พื้นที่)" },
              { id: "ตำบล", label: "2. โมเดลตำบล (5 ตำบล)" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedModel(m.id);
                  setSelectedDistrict("all");
                  setSelectedSubdistrict("all");
                  setSelectedTargetArea("all");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedModel === m.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 1. โมเดลหมู่บ้าน -> เลือกข้อมูล พื้นที่เป้าหมาย (หมู่บ้าน/รพ.สต.) 10 พื้นที่ */}
          {selectedModel !== "ตำบล" && (
            <select
              value={selectedTargetArea}
              onChange={(e) => {
                setSelectedTargetArea(e.target.value);
                if (e.target.value !== "all") setSelectedSubdistrict("all");
              }}
              className="text-xs font-semibold text-emerald-800 bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
            >
              <option value="all">พื้นที่เป้าหมาย (หมู่บ้าน/รพ.สต. {targetAreaOptions.length} พื้นที่)</option>
              {targetAreaOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}

          {/* 2. โมเดลตำบล -> เลือกข้อมูลตำบล 5 ตำบล */}
          {selectedModel !== "หมู่บ้าน" && (
            <select
              value={selectedSubdistrict}
              onChange={(e) => {
                setSelectedSubdistrict(e.target.value);
                if (e.target.value !== "all") setSelectedTargetArea("all");
              }}
              className="text-xs font-semibold text-indigo-800 bg-indigo-50/70 border border-indigo-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
            >
              <option value="all">ข้อมูลตำบล (โมเดลตำบล {subdistrictOptions.length} ตำบล)</option>
              {subdistrictOptions.map((s) => (
                <option key={s} value={s}>
                  ตำบล{s}
                </option>
              ))}
            </select>
          )}

          {/* District Filter (อำเภอ จังหวัดสตูล ไว้สำหรับดูรายละเอียดของโมเดล) */}
          <select
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              setSelectedSubdistrict("all");
              setSelectedTargetArea("all");
            }}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-slate-400"
          >
            <option value="all">อำเภอ จ.สตูล (ดูรายละเอียดโมเดล: {districtOptions.length} อำเภอ)</option>
            {districtOptions.map((d) => (
              <option key={d} value={d}>
                อ.{d}
              </option>
            ))}
          </select>

          {/* Participant Type Filter */}
          <select
            value={selectedParticipantType}
            onChange={(e) => setSelectedParticipantType(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-slate-400"
          >
            <option value="all">ผู้รับการตรวจทั้งหมด</option>
            <option value="กลุ่มเป้าหมายโครงการ">เฉพาะกลุ่มเป้าหมายโครงการ</option>
            <option value="คณะทำงาน">เฉพาะคณะทำงาน</option>
          </select>

          {(selectedModel !== "all" ||
            selectedDistrict !== "all" ||
            selectedSubdistrict !== "all" ||
            selectedTargetArea !== "all" ||
            selectedParticipantType !== "all") && (
            <button
              onClick={() => {
                setSelectedModel("all");
                setSelectedDistrict("all");
                setSelectedSubdistrict("all");
                setSelectedTargetArea("all");
                setSelectedParticipantType("all");
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* EXECUTIVE KEYWORD BRIEFING STRIP (สรุปใจความสำคัญเป็นคีย์เวิร์ดเพื่อการตัดสินใจทันที) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                สรุปใจความสำคัญเป็นคีย์เวิร์ด (Executive Decision Signals)
              </h2>
              <p className="text-[11px] text-slate-500">
                คีย์เวิร์ดสังเคราะห์อัตโนมัติจากฐานข้อมูลจริง เพื่อให้ผู้บริหารอ่านและสั่งการได้ใน 10 วินาที
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-auto">
            4 มิติการตัดสินใจหลัก
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Signal 1: ภาพรวมการบรรลุเป้าหมาย */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">1. ความก้าวหน้าโครงการ</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-extrabold">
                  {riskMetrics.totalTargetPeople > 0
                    ? riskMetrics.targetAchievementPct >= 80
                      ? "#บรรลุเป้าตามแผน"
                      : "#เร่งขยายผลคัดกรอง"
                    : "#คัดกรองเชิงรุก"}
                </span>
              </div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                คัดกรองแล้ว {riskMetrics.totalPeople.toLocaleString()} คน
                {riskMetrics.totalTargetPeople > 0 && (
                  <span className="text-sm font-bold text-blue-600 ml-1.5">
                    ({riskMetrics.targetAchievementPct}%)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                สะสม {riskMetrics.totalVisits.toLocaleString()} ครั้ง ·{" "}
                {executiveDecisionKeywords.leadingModel
                  ? `โมเดล${executiveDecisionKeywords.leadingModel.model}นำ (${executiveDecisionKeywords.leadingModel.screenedCount.toLocaleString()} คน)`
                  : "ครอบคลุมพื้นที่เป้าหมาย"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/70">
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">
                #พื้นที่เป้าหมาย {matchingLocations.length} แห่ง
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">
                #ติดตามซ้ำ {longitudinalImpact.followUpRatePct}%
              </span>
            </div>
          </div>

          {/* Signal 2: โครงสร้างความเสี่ยง & โรคหลัก */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">2. โครงสร้างความเสี่ยง</span>
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-extrabold">
                  {riskMetrics.sickPct >= 25 ? "#เฝ้าระวังกลุ่มป่วยสูง" : "#เน้นป้องกันกลุ่มเสี่ยง"}
                </span>
              </div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                เสี่ยงสูง {riskMetrics.highRiskPct}% · ป่วย {riskMetrics.sickPct}%
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ความเสี่ยงหลักคือ <strong>{executiveDecisionKeywords.primaryDriver}</strong> · น้ำหนักเกิน (BMI ≥ 23){" "}
                <strong className="tabular-nums">{riskMetrics.overweightPct}%</strong>
                {riskMetrics.waistRecordedCount > 0 && (
                  <>
                    {" "}
                    · รอบเอวเฉลี่ย <strong className="tabular-nums">{riskMetrics.avgWaist}&quot;</strong>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/70">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                #ปกติ {riskMetrics.normalCount} คน
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold">
                #เสี่ยงสูง {riskMetrics.highRiskCount} คน
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 text-[11px] font-bold">
                #ป่วย {riskMetrics.sickCount} คน
              </span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 text-[11px] font-bold">
                #ดื่มน้ำเพียงพอ {riskMetrics.adequateWaterPct}%
              </span>
            </div>
          </div>

          {/* Signal 3: การเปลี่ยนแปลงที่เกิดขึ้นหลังติดตาม */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">3. การเปลี่ยนแปลงหลังติดตาม</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-extrabold">
                  #ผลสุขภาพดีขึ้น
                </span>
              </div>
              <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                ดีขึ้น {longitudinalImpact.overallClinicalImprovedPct}% ของผู้ติดตาม
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                จากผู้ติดตามซ้ำ {longitudinalImpact.totalFollowedUp.toLocaleString()} คน: ความดันลดลง{" "}
                <strong className="tabular-nums">{longitudinalImpact.bpImprovedPct}%</strong> · น้ำตาลลดลง{" "}
                <strong className="tabular-nums">{longitudinalImpact.sugarImprovedPct}%</strong>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/70">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                #ย้ายกลุ่มเสี่ยงดีขึ้น {longitudinalImpact.riskDowngradedCount} คน
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">
                #BMIลดลง {longitudinalImpact.bmiImprovedCount} คน
              </span>
            </div>
          </div>

          {/* Signal 4: ข้อเสนอสั่งการรายพื้นที่ */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">4. พื้นที่เด่น & ข้อเสนอสั่งการ</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-extrabold">
                  #โฟกัสรายตำบล
                </span>
              </div>
              <div className="text-sm font-extrabold text-slate-900">
                {executiveDecisionKeywords.topSubdistrict
                  ? `ต.${executiveDecisionKeywords.topSubdistrict.subdistrict} ผลงานเด่นสุด (${executiveDecisionKeywords.topSubdistrict.screenedCount} คน)`
                  : "พร้อมติดตามรายตำบล"}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {executiveDecisionKeywords.urgentSubdistrict
                  ? `เฝ้าระวัง ต.${executiveDecisionKeywords.urgentSubdistrict.subdistrict} (กลุ่มป่วย ${executiveDecisionKeywords.urgentSubdistrict.sickPct}%)`
                  : "กระจายการคัดกรองต่อเนื่อง"}
                {executiveDecisionKeywords.lowCoverageSubdistrict &&
                  executiveDecisionKeywords.lowCoverageSubdistrict.achievementPct < 70 &&
                  ` · เร่งรัด ต.${executiveDecisionKeywords.lowCoverageSubdistrict.subdistrict}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/70">
              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold">
                #ส่งต่อกลุ่มป่วยพบแพทย์
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">
                #ติดตามซ้ำรอบถัดไป
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: จำนวนผู้ผ่านการคัดกรอง แยกตามสถานะความเสี่ยง (ปกติ / เสี่ยงสูง / ป่วย) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                1. จำนวนผู้ผ่านการคัดกรอง แยกตามสถานะความเสี่ยง (ปกติ / เสี่ยงสูง / ป่วย)
              </h2>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                #สถานะความเสี่ยงล่าสุด
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              จำแนกผู้รับการคัดกรองรายบุคคล ({riskMetrics.totalPeople.toLocaleString()} คน) ตามเกณฑ์ความดันโลหิต (HT) และระดับน้ำตาลในเลือด (DM)
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-700 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 tabular-nums">
            <span>
              ผู้รับการคัดกรองรวม: <strong className="text-slate-900">{riskMetrics.totalPeople.toLocaleString()}</strong> คน
            </span>
            <span className="text-slate-300">|</span>
            <span>
              จำนวนครั้งสะสม: <strong className="text-blue-600">{riskMetrics.totalVisits.toLocaleString()}</strong> ครั้ง
            </span>
          </div>
        </div>

        {/* Proportional Risk Distribution Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>สัดส่วนสถานะความเสี่ยงภาพรวม</span>
            <div className="flex items-center gap-4 tabular-nums">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                ปกติ {riskMetrics.normalPct}%
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                เสี่ยงสูง {riskMetrics.highRiskPct}%
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                ป่วย/สงสัยป่วย {riskMetrics.sickPct}%
              </span>
            </div>
          </div>
          <div className="w-full h-3.5 bg-slate-100 rounded-lg overflow-hidden flex">
            {riskMetrics.totalPeople > 0 ? (
              <>
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${riskMetrics.normalPct}%` }}
                  title={`ปกติ: ${riskMetrics.normalCount} คน (${riskMetrics.normalPct}%)`}
                />
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${riskMetrics.highRiskPct}%` }}
                  title={`เสี่ยงสูง: ${riskMetrics.highRiskCount} คน (${riskMetrics.highRiskPct}%)`}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${riskMetrics.sickPct}%` }}
                  title={`ป่วย/สงสัยป่วย: ${riskMetrics.sickCount} คน (${riskMetrics.sickPct}%)`}
                />
              </>
            ) : (
              <div className="w-full h-full bg-slate-200" />
            )}
          </div>
        </div>

        {/* 3 Clean Risk Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: ปกติ (Normal) */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-extrabold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  กลุ่มปกติ (Normal)
                </span>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50/70 px-2 py-0.5 rounded tabular-nums">
                  {riskMetrics.normalPct}% ของทั้งหมด
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {riskMetrics.normalCount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">คน</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                ความดันโลหิต &lt; 120/80 mmHg และระดับน้ำตาลอยู่ในเกณฑ์ปกติ ไม่พบความเสี่ยงโรคความดันและเบาหวาน
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase">คีย์เวิร์ดแนวทางดูแล</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                  #คงพฤติกรรมสุขภาพดี
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                  #คัดกรองซ้ำประจำปี
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                  #ต้นแบบสุขภาพชุมชน
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: เสี่ยงสูง (High Risk) */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-extrabold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  กลุ่มเสี่ยงสูง (High Risk)
                </span>
                <span className="text-xs font-extrabold text-amber-700 bg-amber-50/70 px-2 py-0.5 rounded tabular-nums">
                  {riskMetrics.highRiskPct}% ของทั้งหมด
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {riskMetrics.highRiskCount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">คน</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-500">เสี่ยงความดัน (HT)</div>
                  <div className="text-sm font-extrabold text-amber-700 tabular-nums">
                    {riskMetrics.htRiskCount.toLocaleString()} คน
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-500">เสี่ยงเบาหวาน (DM)</div>
                  <div className="text-sm font-extrabold text-amber-700 tabular-nums">
                    {riskMetrics.dmRiskCount.toLocaleString()} คน
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase">คีย์เวิร์ดแนวทางดูแล</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-bold">
                  #ปรับพฤติกรรม3อ2ส
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-bold">
                  #ลดหวานมันเค็ม
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                  #นัดติดตามผล1-3เดือน
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: ป่วย / สงสัยป่วย (Sick / Suspected) */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 text-xs font-extrabold">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  กลุ่มป่วย / สงสัยป่วย (Sick)
                </span>
                <span className="text-xs font-extrabold text-rose-700 bg-rose-50/70 px-2 py-0.5 rounded tabular-nums">
                  {riskMetrics.sickPct}% ของทั้งหมด
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {riskMetrics.sickCount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">คน</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-500">สงสัยป่วยความดัน</div>
                  <div className="text-sm font-extrabold text-rose-700 tabular-nums">
                    {riskMetrics.htSickCount.toLocaleString()} คน
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-500">สงสัยป่วยเบาหวาน</div>
                  <div className="text-sm font-extrabold text-rose-700 tabular-nums">
                    {riskMetrics.dmSickCount.toLocaleString()} คน
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase">คีย์เวิร์ดแนวทางดูแล</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 text-[11px] font-bold">
                  #ส่งต่อรพ.สต./พบแพทย์
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 text-[11px] font-bold">
                  #คุมระดับความดัน-น้ำตาล
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                  #เยี่ยมบ้านติดตามใกล้ชิด
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: เปรียบเทียบความสำเร็จ และการเปลี่ยนแปลงที่เกิดขึ้น (Success Comparison & Changes Achieved) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Part 2A: การเปลี่ยนแปลงที่เกิดขึ้นหลังติดตาม (Before vs After Impact) - 7 cols */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  2. การเปลี่ยนแปลงที่เกิดขึ้นหลังติดตาม (Health & Behavior Impact)
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                  #เปรียบเทียบก่อน-หลัง
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                วิเคราะห์การเปลี่ยนแปลงจากครั้งที่ 1 (แรกรับ) เทียบกับครั้งล่าสุด ในกลุ่มที่ได้รับการติดตามซ้ำ ({longitudinalImpact.totalFollowedUp.toLocaleString()} คน)
              </p>
            </div>
          </div>

          {/* 3 Clinical Change Metrics (BP, Sugar, Risk Transition) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* BP Change */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">ความดันโลหิตลดลง</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-extrabold">
                  #ความดันดีขึ้น
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {longitudinalImpact.bpImprovedPct}%
                </span>
                <span className="text-xs font-bold text-slate-500 tabular-nums">
                  ({longitudinalImpact.bpImprovedCount} คน)
                </span>
              </div>
              <div className="text-[11px] text-slate-600 tabular-nums pt-1 border-t border-slate-200/60">
                เฉลี่ยตัวบน:{" "}
                <strong className="text-slate-800">{longitudinalImpact.avgBaseSys}</strong> →{" "}
                <strong className="text-emerald-700">{longitudinalImpact.avgLatestSys}</strong> mmHg
                {longitudinalImpact.sysDelta !== 0 && (
                  <span
                    className={`ml-1 font-bold ${
                      longitudinalImpact.sysDelta < 0 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    ({longitudinalImpact.sysDelta > 0 ? `+${longitudinalImpact.sysDelta}` : longitudinalImpact.sysDelta})
                  </span>
                )}
              </div>
            </div>

            {/* Blood Sugar Change */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">ระดับน้ำตาลลดลง</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-extrabold">
                  #น้ำตาลลดลง
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {longitudinalImpact.sugarImprovedPct}%
                </span>
                <span className="text-xs font-bold text-slate-500 tabular-nums">
                  ({longitudinalImpact.sugarImprovedCount} คน)
                </span>
              </div>
              <div className="text-[11px] text-slate-600 tabular-nums pt-1 border-t border-slate-200/60">
                เฉลี่ย DTX:{" "}
                <strong className="text-slate-800">{longitudinalImpact.avgBaseSugar}</strong> →{" "}
                <strong className="text-blue-700">{longitudinalImpact.avgLatestSugar}</strong> mg/dL
                {longitudinalImpact.sugarDelta !== 0 && (
                  <span
                    className={`ml-1 font-bold ${
                      longitudinalImpact.sugarDelta < 0 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    ({longitudinalImpact.sugarDelta > 0 ? `+${longitudinalImpact.sugarDelta}` : longitudinalImpact.sugarDelta})
                  </span>
                )}
              </div>
            </div>

            {/* Risk Downgrade / BMI */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">ลดระดับความเสี่ยง</span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-extrabold">
                  #ย้ายกลุ่มดีขึ้น
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {longitudinalImpact.riskDowngradedCount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500 tabular-nums">
                  คน ({longitudinalImpact.riskDowngradedPct}%)
                </span>
              </div>
              <div className="text-[11px] text-slate-600 tabular-nums pt-1 border-t border-slate-200/60">
                คงสถานะปกติ{" "}
                <strong className="text-emerald-700">{longitudinalImpact.riskMaintainedNormalCount}</strong> คน · BMI ลดลง{" "}
                <strong className="text-indigo-700">{longitudinalImpact.bmiImprovedCount}</strong> คน
              </div>
            </div>
          </div>

          {/* Waist Circumference (Inches) & Daily Plain Water Intake Executive Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-slate-800">ดัชนีรอบเอว (นิ้ว) &amp; ภาวะอ้วนลงพุง</span>
                  <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 text-[10px] font-extrabold">
                    #รอบเอว
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 tabular-nums">
                  {riskMetrics.waistRecordedCount > 0 ? (
                    <>
                      รอบเอวเฉลี่ย <strong className="text-slate-900">{riskMetrics.avgWaist} นิ้ว</strong> (ตรวจ{" "}
                      {riskMetrics.waistRecordedCount} คน) · เกินเกณฑ์ (ชาย ≥36&quot; / หญิง ≥32&quot;){" "}
                      <strong className="text-rose-600">
                        {riskMetrics.waistExceedCount} คน ({riskMetrics.waistExceedPct}%)
                      </strong>
                    </>
                  ) : (
                    "รอการบันทึกข้อมูลรอบเอว (นิ้ว) เพิ่มเติมจากจุดคัดกรอง"
                  )}
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-slate-800">พฤติกรรมการดื่มน้ำเปล่าต่อวัน</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 text-[10px] font-extrabold">
                    #ดื่มน้ำสะอาด
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 tabular-nums">
                  ดื่มน้ำเพียงพอ (≥6 แก้ว/วัน){" "}
                  <strong className="text-emerald-700">
                    {riskMetrics.adequateWaterCount.toLocaleString()} คน ({riskMetrics.adequateWaterPct}%)
                  </strong>{" "}
                  · ดื่มน้อย (&lt;6 แก้ว){" "}
                  <strong className="text-amber-700">
                    {riskMetrics.lowWaterCount.toLocaleString()} คน ({riskMetrics.lowWaterPct}%)
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* 6-Pillar Behavior Change Achievement */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800">
                  การบรรลุแผนปรับเปลี่ยนพฤติกรรม 6 มิติ (Personal Health Plan)
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                #ผลลัพธ์การปรับพฤติกรรม
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {longitudinalImpact.pillars.map((pillar) => (
                <div
                  key={pillar.key}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{pillar.label}</span>
                    <span className="font-extrabold text-slate-900 tabular-nums">{pillar.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, pillar.pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                    <span>{pillar.keyword}</span>
                    <span>
                      สำเร็จ {pillar.achieved}/{pillar.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Part 2B: เปรียบเทียบความสำเร็จรายโมเดล (โมเดลตำบล vs โมเดลหมู่บ้าน) - 5 cols */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  เปรียบเทียบความสำเร็จรายโมเดล
                </h2>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                  #ตำบลvsหมู่บ้าน
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                เปรียบเทียบผลการดำเนินงานความครอบคลุม การติดตามซ้ำ และผลลัพธ์สุขภาพระหว่าง 2 รูปแบบโมเดล
              </p>
            </div>

            <div className="space-y-3.5">
              {modelComparison.map((m) => (
                <div
                  key={m.model}
                  className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-extrabold ${
                          m.model === "ตำบล"
                            ? "bg-indigo-50 text-indigo-800"
                            : "bg-blue-50 text-blue-800"
                        }`}
                      >
                        โมเดล{m.model}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 tabular-nums">
                        ({m.areaCount} พื้นที่เป้าหมาย)
                      </span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="text-sm font-extrabold text-slate-900">
                        {m.screenedCount.toLocaleString()}
                      </span>
                      {m.targetSum > 0 && (
                        <span className="text-xs font-bold text-slate-500">
                          {" "}
                          / {m.targetSum.toLocaleString()} คน ({m.achievementPct}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {m.targetSum > 0 && (
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          m.model === "ตำบล" ? "bg-indigo-600" : "bg-blue-600"
                        }`}
                        style={{ width: `${Math.min(100, m.achievementPct)}%` }}
                      />
                    </div>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center tabular-nums">
                    <div className="bg-white border border-slate-200/80 rounded-lg p-2">
                      <div className="text-[10px] font-bold text-slate-500">ปกติ / เสี่ยง / ป่วย</div>
                      <div className="text-xs font-extrabold text-slate-800 mt-0.5">
                        <span className="text-emerald-600">{m.normalPct}%</span> /{" "}
                        <span className="text-amber-600">{m.highRiskPct}%</span> /{" "}
                        <span className="text-rose-600">{m.sickPct}%</span>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-lg p-2">
                      <div className="text-[10px] font-bold text-slate-500">อัตราติดตามซ้ำ</div>
                      <div className="text-xs font-extrabold text-blue-700 mt-0.5">
                        {m.followUpPct}% ({m.followedUp})
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-lg p-2">
                      <div className="text-[10px] font-bold text-slate-500">สุขภาพดีขึ้น</div>
                      <div className="text-xs font-extrabold text-emerald-700 mt-0.5">
                        {m.improvedPct}% ({m.improved})
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Comparison Keyword Takeaway */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-700">
              คีย์เวิร์ดสรุปเปรียบเทียบรายโมเดล:
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">
                #โมเดลตำบลเข้าถึงปริมาณมาก ({modelComparison[0]?.screenedCount || 0} คน)
              </span>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px] font-bold">
                #โมเดลหมู่บ้านติดตามใกล้ชิด ({modelComparison[1]?.screenedCount || 0} คน)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                #สุขภาพดีขึ้นทั้งสองโมเดล
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: สรุปผลความสำเร็จรายตำบล (Subdistrict Success & Decision Matrix) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                3. สรุปผลความสำเร็จรายตำบล (Subdistrict Performance & Risk Matrix)
              </h2>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">
                #{subdistrictSummary.length} ตำบลเป้าหมาย
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เปรียบเทียบความก้าวหน้าเทียบเป้าหมาย สถานะความเสี่ยง (ปกติ/เสี่ยงสูง/ป่วย) การเปลี่ยนแปลงหลังติดตาม และคีย์เวิร์ดข้อเสนอสั่งการรายตำบล
            </p>
          </div>

          {/* Sort controls */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto print:hidden">
            {[
              { id: "progress", label: "เรียงตาม % เป้าหมาย" },
              { id: "screened", label: "ยอดคัดกรอง" },
              { id: "sick", label: "สัดส่วนกลุ่มป่วย" },
              { id: "improved", label: "% สุขภาพดีขึ้น" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSubdistrictSortBy(s.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  subdistrictSortBy === s.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subdistrict Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-extrabold text-slate-600 uppercase">
                <th className="py-3 px-3">ตำบล / อำเภอ</th>
                <th className="py-3 px-3 text-center">โมเดล (พื้นที่)</th>
                <th className="py-3 px-3 text-right">คัดกรอง / เป้าหมาย</th>
                <th className="py-3 px-3 w-36">ความสำเร็จ (%)</th>
                <th className="py-3 px-3 text-center">ปกติ / เสี่ยงสูง / ป่วย (คน)</th>
                <th className="py-3 px-3 w-36">สัดส่วนความเสี่ยง</th>
                <th className="py-3 px-3 text-center">การเปลี่ยนแปลง (ติดตาม/ดีขึ้น)</th>
                <th className="py-3 px-3">คีย์เวิร์ดตัดสินใจรายตำบล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {subdistrictSummary.map((row) => (
                <tr key={`${row.district}|${row.subdistrict}`} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="font-extrabold text-slate-900">ต.{row.subdistrict}</div>
                    <div className="text-[11px] text-slate-500">อ.{row.district}</div>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <div className="inline-flex flex-wrap justify-center gap-1">
                      {row.modelList.map((m) => (
                        <span
                          key={m}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m === "ตำบล"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                      {row.areaCount} หมู่บ้าน/ชุมชน
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-right tabular-nums">
                    <div className="font-extrabold text-slate-900">
                      {row.screenedCount.toLocaleString()} คน
                    </div>
                    <div className="text-[11px] text-slate-500">
                      เป้าหมาย: {row.targetSum > 0 ? `${row.targetSum.toLocaleString()} คน` : "ยังไม่ระบุ"}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 tabular-nums">
                    {row.targetSum > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-extrabold">
                          <span
                            className={
                              row.achievementPct >= 80
                                ? "text-emerald-700"
                                : row.achievementPct >= 50
                                ? "text-blue-700"
                                : "text-amber-700"
                            }
                          >
                            {row.achievementPct}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.achievementPct >= 80
                                ? "bg-emerald-500"
                                : row.achievementPct >= 50
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, row.achievementPct)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold">รอตั้งเป้าหมาย</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center tabular-nums">
                    <div className="inline-flex items-center gap-1.5 font-bold">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700" title="ปกติ">
                        {row.normalCount}
                      </span>
                      <span className="text-slate-300">/</span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700" title="เสี่ยงสูง">
                        {row.highRiskCount}
                      </span>
                      <span className="text-slate-300">/</span>
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700" title="ป่วย/สงสัยป่วย">
                        {row.sickCount}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-3 tabular-nums">
                    {row.screenedCount > 0 ? (
                      <div className="space-y-1">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${row.normalPct}%` }}
                          />
                          <div
                            className="bg-amber-500 h-full"
                            style={{ width: `${row.highRiskPct}%` }}
                          />
                          <div
                            className="bg-rose-500 h-full"
                            style={{ width: `${row.sickPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                          <span>ปกติ {row.normalPct}%</span>
                          <span>ป่วย {row.sickPct}%</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">-</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center tabular-nums">
                    {row.followedUpCount > 0 ? (
                      <div>
                        <span className="font-extrabold text-emerald-700">
                          ดีขึ้น {row.improvedPct}%
                        </span>
                        <div className="text-[10px] text-slate-500">
                          ติดตาม {row.followedUpCount} คน (ดีขึ้น {row.improvedCount})
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">รอติดตามรอบ 2</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {row.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold whitespace-nowrap ${
                            kw.tone === "emerald"
                              ? "bg-emerald-50 text-emerald-800"
                              : kw.tone === "blue"
                              ? "bg-blue-50 text-blue-800"
                              : kw.tone === "amber"
                              ? "bg-amber-50 text-amber-800"
                              : kw.tone === "rose"
                              ? "bg-rose-50 text-rose-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {kw.text}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: กราฟแนวโน้มการคัดกรอง (Screening Trend Chart) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                4. กราฟแนวโน้มการคัดกรองรายเดือน (Monthly Screening & Risk Trajectory)
              </h2>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                #แนวโน้มรายเดือนพ.ศ.
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงแนวโน้มความก้าวหน้าการคัดกรองรายเดือน จำแนกตามสถานะความเสี่ยง (ปกติ/เสี่ยงสูง/ป่วย) และการติดตามผลซ้ำ
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto print:hidden">
            <button
              onClick={() => setTrendChartMode("risk")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                trendChartMode === "risk"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              แยกตามความเสี่ยง (ปกติ/เสี่ยง/ป่วย)
            </button>
            <button
              onClick={() => setTrendChartMode("visit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                trendChartMode === "visit"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              แยกตามรอบตรวจ (แรกรับ vs ติดตามซ้ำ)
            </button>
          </div>
        </div>

        {/* Trend Summary Keyword Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500">จำนวนเดือนที่ดำเนินการ</div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
              {monthlyTrends.months.length} เดือน
            </div>
            <span className="text-[10px] font-bold text-blue-700">#ต่อเนื่องทุกเดือน</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500">ค่าเฉลี่ยการคัดกรอง</div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
              {monthlyTrends.avgPerMonth.toLocaleString()} ครั้ง/เดือน
            </div>
            <span className="text-[10px] font-bold text-slate-600">#ความถี่การลงพื้นที่</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500">เดือนที่คัดกรองสูงสุด</div>
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums mt-0.5">
              {monthlyTrends.peakMonth
                ? `${monthlyTrends.peakMonth.labelShort} (${monthlyTrends.peakMonth.total.toLocaleString()})`
                : "-"}
            </div>
            <span className="text-[10px] font-bold text-emerald-700">#เดือนพีกสุด</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500">แนวโน้มการติดตามซ้ำ</div>
            <div className="text-lg font-extrabold text-indigo-700 tabular-nums mt-0.5">
              {longitudinalImpact.totalFollowedUp.toLocaleString()} คน ({longitudinalImpact.followUpRatePct}%)
            </div>
            <span className="text-[10px] font-bold text-indigo-700">#ติดตามผลต่อเนื่อง</span>
          </div>
        </div>

        {/* Stacked Bar Chart with Explicit Pixel Heights */}
        {monthlyTrends.months.length > 0 ? (
          <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/30 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-700">
                {trendChartMode === "risk"
                  ? "กราฟแท่งแสดงจำนวนครั้งการคัดกรองรายเดือน แยกตามสถานะความเสี่ยง"
                  : "กราฟแท่งแสดงจำนวนครั้งการคัดกรองรายเดือน แยกตามคัดกรองครั้งแรก vs ติดตามซ้ำ"}
              </span>

              {trendChartMode === "risk" ? (
                <div className="flex items-center gap-4 font-bold text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                    ปกติ
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                    เสี่ยงสูง
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                    ป่วย/สงสัยป่วย
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-4 font-bold text-[11px]">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                    คัดกรองครั้งแรก (Visit 1)
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-400 inline-block" />
                    ติดตามผลซ้ำ (Visit 2+)
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="min-w-[560px] pt-6 pb-2 px-2 flex items-end justify-around gap-3 border-b border-slate-200">
                {monthlyTrends.months.map((m) => {
                  const MAX_BAR_PX = 140;
                  const barHeightPx = Math.max(
                    12,
                    Math.round((m.total / monthlyTrends.maxTotal) * MAX_BAR_PX)
                  );

                  // Segments for risk mode
                  const sickPx =
                    m.total > 0 ? Math.round((m.sick / m.total) * barHeightPx) : 0;
                  const highRiskPx =
                    m.total > 0 ? Math.round((m.highRisk / m.total) * barHeightPx) : 0;
                  const normalPx = Math.max(0, barHeightPx - sickPx - highRiskPx);

                  // Segments for visit mode
                  const followUpPx =
                    m.total > 0 ? Math.round((m.followUp / m.total) * barHeightPx) : 0;
                  const visit1Px = Math.max(0, barHeightPx - followUpPx);

                  return (
                    <div
                      key={m.ym}
                      className="flex flex-col items-center flex-1 max-w-[76px] group"
                    >
                      <div className="text-xs font-extrabold text-slate-800 tabular-nums mb-1.5">
                        {m.total.toLocaleString()}
                      </div>

                      <div
                        className="w-10 sm:w-12 rounded-t-lg overflow-hidden flex flex-col justify-end bg-slate-100 border border-slate-200/70"
                        style={{ height: `${barHeightPx}px` }}
                        title={
                          trendChartMode === "risk"
                            ? `${m.labelFull}: รวม ${m.total} (ปกติ ${m.normal}, เสี่ยงสูง ${m.highRisk}, ป่วย ${m.sick})`
                            : `${m.labelFull}: รวม ${m.total} (ครั้งแรก ${m.visit1}, ติดตามซ้ำ ${m.followUp})`
                        }
                      >
                        {trendChartMode === "risk" ? (
                          <>
                            {sickPx > 0 && (
                              <div
                                className="w-full bg-rose-500"
                                style={{ height: `${sickPx}px` }}
                              />
                            )}
                            {highRiskPx > 0 && (
                              <div
                                className="w-full bg-amber-500"
                                style={{ height: `${highRiskPx}px` }}
                              />
                            )}
                            {normalPx > 0 && (
                              <div
                                className="w-full bg-emerald-500"
                                style={{ height: `${normalPx}px` }}
                              />
                            )}
                          </>
                        ) : (
                          <>
                            {followUpPx > 0 && (
                              <div
                                className="w-full bg-indigo-400"
                                style={{ height: `${followUpPx}px` }}
                              />
                            )}
                            {visit1Px > 0 && (
                              <div
                                className="w-full bg-blue-600"
                                style={{ height: `${visit1Px}px` }}
                              />
                            )}
                          </>
                        )}
                      </div>

                      <div className="mt-2 text-center">
                        <div className="text-xs font-extrabold text-slate-800">
                          {m.labelShort}
                        </div>
                        <div className="text-[10px] text-slate-500 tabular-nums whitespace-nowrap">
                          {trendChartMode === "risk"
                            ? `ปกติ ${m.normal} · เสี่ยง/ป่วย ${m.highRisk + m.sick}`
                            : `แรก ${m.visit1} · ซ้ำ ${m.followUp}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs font-semibold">
            ไม่พบข้อมูลการคัดกรองตามเงื่อนไขตัวกรองที่เลือก
          </div>
        )}
      </div>
    </div>
  );
};
