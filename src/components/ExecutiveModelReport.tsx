import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { ScreeningRecord } from "../types";
import { formatThaiDate } from "../utils";
import {
  Printer,
  Trophy,
  Target,
  Activity,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  Award,
  HeartPulse,
  ShieldCheck,
  Building2,
  Home,
  ClipboardCheck,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Eye,
  FileSpreadsheet,
  Download,
  RefreshCw,
  MapPin
} from "lucide-react";

export interface AreaTrackingStatItem {
  key: string;
  modelType: string;
  district: string;
  subdistrict?: string;
  area: string;
  uniquePatients: Set<string>;
  totalVisits: number;
  records: ScreeningRecord[];
  achieved: number;
  target: number;
  percent: number;
  realPercent: number;
  visitsBreakdown: { visitNumber: number; count: number; percent: number }[];
  duplicates: { name: string; count: number; visits: { vNum: number; date: string }[] }[];
  v1Count: number;
  v2Count: number;
  v3Count: number;
  v4PlusCount: number;
  followUpCount: number;
  followUpRate: number;
}

interface ExecutiveModelReportProps {
  areaStats: AreaTrackingStatItem[];
  filteredRecords: ScreeningRecord[];
  filterSummaryText?: string;
  onActivatePrintMode?: () => void;
}

interface PillarStat {
  key: "sweet" | "fat" | "salt" | "sleep" | "water" | "exercise";
  label: string;
  set: number;
  achieved: number;
  pct: number;
}

export interface AreaEnrichedStat extends AreaTrackingStatItem {
  normalCount: number;
  riskCount: number;
  dangerCount: number;
  normalPct: number;
  riskPct: number;
  dangerPct: number;
  htNormalCount: number;
  htRiskCount: number;
  htDangerCount: number;
  dmNormalCount: number;
  dmRiskCount: number;
  dmDangerCount: number;
  bmiNormalCount: number;
  bmiOverweightCount: number;
  bmiOverweightPct: number;
  planSuccessPct: number;
  clinicalImprovedCount: number;
  clinicalImprovedPct: number;
  statusLabel: string;
  statusColor: string;
}

export interface DistrictModelRiskRow {
  key: string;
  district: string;
  modelType: string;
  totalAreas: number;
  activeAreas: number;
  target: number;
  achieved: number;
  achievementPct: number;
  totalVisits: number;
  v1Count: number;
  v2Count: number;
  v3Count: number;
  v4PlusCount: number;
  followUpCount: number;
  followUpRate: number;
  normalCount: number;
  riskCount: number;
  dangerCount: number;
  normalPct: number;
  riskPct: number;
  dangerPct: number;
  htNormalCount: number;
  htRiskCount: number;
  htDangerCount: number;
  dmNormalCount: number;
  dmRiskCount: number;
  dmDangerCount: number;
  bmiOverweightCount: number;
  bmiOverweightPct: number;
}

interface ModelExecutiveAnalytics {
  modelName: string;
  modelLabel: string;
  totalAreas: number;
  activeAreas: number;
  areasWithTarget: number;
  achieved80Areas: number;
  achieved100Areas: number;
  under50Areas: number;
  totalTarget: number;
  totalAchieved: number;
  totalVisits: number;
  achievementPct: number;
  remainingGap: number;
  v1Count: number;
  v2Count: number;
  v3Count: number;
  v4PlusCount: number;
  followUpPeopleCount: number;
  followUpVisitsTotal: number;
  retentionRate: number;
  avgVisitsPerPerson: number;
  targetGroupRecords: number;
  committeeRecords: number;
  targetGroupUnique: number;
  committeeUnique: number;
  normalCount: number;
  riskCount: number;
  dangerCount: number;
  normalPct: number;
  riskPct: number;
  dangerPct: number;
  htNormalCount: number;
  htRiskCount: number;
  htDangerCount: number;
  htNormalPct: number;
  htRiskPct: number;
  htDangerPct: number;
  dmNormalCount: number;
  dmRiskCount: number;
  dmDangerCount: number;
  dmNormalPct: number;
  dmRiskPct: number;
  dmDangerPct: number;
  htRiskDangerCount: number;
  dmRiskDangerCount: number;
  bmiNormalCount: number;
  bmiOverweightCount: number;
  bmiOverweightPct: number;
  avgBmi: string;
  avgBpSys: string;
  avgBpDia: string;
  avgSugar: string;
  avgWaist: string;
  waistRecordedCount: number;
  waistExceedCount: number;
  waistExceedPct: number;
  lowWaterCount: number;
  lowWaterPct: number;
  adequateWaterCount: number;
  adequateWaterPct: number;
  topBehaviors: { name: string; count: number; pct: number }[];
  peopleWithPlanCount: number;
  totalPlanSet: number;
  totalPlanAchieved: number;
  overallPlanSuccessPct: number;
  pillars: PillarStat[];
  evaluatedCohortCount: number;
  bpImprovedCount: number;
  bpImprovedPct: number;
  sugarImprovedCount: number;
  sugarImprovedPct: number;
  bmiImprovedCount: number;
  bmiImprovedPct: number;
  riskReducedCount: number;
  riskReducedPct: number;
  anyClinicalImprovedCount: number;
  anyClinicalImprovedPct: number;
  areas: AreaEnrichedStat[];
  topAreas: AreaEnrichedStat[];
  priorityAreas: AreaEnrichedStat[];
}

function getRiskSeverity(r: ScreeningRecord): number {
  const ht = r.htResult?.level || "normal";
  const dm = r.dmResult?.level || "normal";
  if (ht === "danger" || dm === "danger") return 2;
  if (ht === "risk" || dm === "risk") return 1;
  return 0;
}

function computeAreaEnriched(s: AreaTrackingStatItem): AreaEnrichedStat {
  const byPerson: Record<string, ScreeningRecord[]> = {};
  s.records.forEach((r) => {
    const key = (r.name || "").trim().replace(/\s+/g, " ") || `id_${r.id}`;
    if (!byPerson[key]) byPerson[key] = [];
    byPerson[key].push(r);
  });

  let normalCount = 0;
  let riskCount = 0;
  let dangerCount = 0;
  let htNormalCount = 0;
  let htRiskCount = 0;
  let htDangerCount = 0;
  let dmNormalCount = 0;
  let dmRiskCount = 0;
  let dmDangerCount = 0;
  let bmiNormalCount = 0;
  let bmiOverweightCount = 0;

  let planSet = 0;
  let planAchieved = 0;
  let cohortCount = 0;
  let clinicalImprovedCount = 0;

  Object.values(byPerson).forEach((personRecs) => {
    const sorted = [...personRecs].sort((a, b) => {
      const vA = a.visitNumber || 1;
      const vB = b.visitNumber || 1;
      if (vA !== vB) return vA - vB;
      return (a.date || "").localeCompare(b.date || "");
    });
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];

    const sev = getRiskSeverity(latest);
    if (sev === 2) dangerCount++;
    else if (sev === 1) riskCount++;
    else normalCount++;

    const htLevel = latest.htResult?.level || "normal";
    if (htLevel === "danger") htDangerCount++;
    else if (htLevel === "risk") htRiskCount++;
    else htNormalCount++;

    const dmLevel = latest.dmResult?.level || "normal";
    if (dmLevel === "danger") dmDangerCount++;
    else if (dmLevel === "risk") dmRiskCount++;
    else dmNormalCount++;

    const bmiVal = parseFloat(latest.bmi);
    if (!isNaN(bmiVal) && bmiVal >= 23.0) {
      bmiOverweightCount++;
    } else {
      bmiNormalCount++;
    }

    const recWithPlan = [...sorted].reverse().find((r) => r.personalPlan) || latest;
    if (recWithPlan.personalPlan) {
      (["sweet", "fat", "salt", "sleep", "water", "exercise"] as const).forEach((k) => {
        const item = recWithPlan.personalPlan?.[k];
        if (item && (item.plan || item.achieved !== undefined)) {
          planSet++;
          if (item.achieved === true) planAchieved++;
        }
      });
    }

    if (sorted.length >= 2) {
      cohortCount++;
      const bpBetter =
        (latest.bpSys > 0 && first.bpSys > 0 && latest.bpSys < first.bpSys) ||
        (first.htResult?.level !== "normal" && latest.htResult?.level === "normal");
      const sugarBetter =
        (latest.sugar > 0 && first.sugar > 0 && latest.sugar < first.sugar) ||
        (first.dmResult?.level !== "normal" && latest.dmResult?.level === "normal");
      const bmiFirst = parseFloat(first.bmi);
      const bmiLatest = parseFloat(latest.bmi);
      const bmiBetter = !isNaN(bmiFirst) && !isNaN(bmiLatest) && bmiLatest < bmiFirst;
      const riskBetter = getRiskSeverity(latest) < getRiskSeverity(first);

      if (bpBetter || sugarBetter || bmiBetter || riskBetter) {
        clinicalImprovedCount++;
      }
    }
  });

  const totalPeople = normalCount + riskCount + dangerCount;
  const normalPct = totalPeople > 0 ? Math.round((normalCount / totalPeople) * 100) : 0;
  const riskPct = totalPeople > 0 ? Math.round((riskCount / totalPeople) * 100) : 0;
  const dangerPct = totalPeople > 0 ? Math.round((dangerCount / totalPeople) * 100) : 0;
  const bmiOverweightPct = totalPeople > 0 ? Math.round((bmiOverweightCount / totalPeople) * 100) : 0;
  const planSuccessPct = planSet > 0 ? Math.round((planAchieved / planSet) * 100) : 0;
  const clinicalImprovedPct = cohortCount > 0 ? Math.round((clinicalImprovedCount / cohortCount) * 100) : 0;

  let statusLabel = "ยังไม่กำหนดเป้าหมาย";
  let statusColor = "bg-slate-100 text-slate-600 border-slate-200";
  if (s.target > 0) {
    if (s.realPercent >= 100) {
      statusLabel = "บรรลุเป้าหมายสำเร็จ (100%+)";
      statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (s.realPercent >= 80) {
      statusLabel = "ผลงานดีเยี่ยม (≥80%)";
      statusColor = "bg-teal-50 text-teal-700 border-teal-200";
    } else if (s.realPercent >= 50) {
      statusLabel = "กำลังดำเนินการ (50-79%)";
      statusColor = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (s.achieved > 0) {
      statusLabel = "ต้องเร่งรัด (<50%)";
      statusColor = "bg-rose-50 text-rose-700 border-rose-200";
    } else {
      statusLabel = "รอเริ่มคัดกรอง (0%)";
      statusColor = "bg-slate-100 text-slate-500 border-slate-200";
    }
  } else if (s.achieved > 0) {
    statusLabel = "ดำเนินการแล้ว (รอตั้งเป้า)";
    statusColor = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return {
    ...s,
    normalCount,
    riskCount,
    dangerCount,
    normalPct,
    riskPct,
    dangerPct,
    htNormalCount,
    htRiskCount,
    htDangerCount,
    dmNormalCount,
    dmRiskCount,
    dmDangerCount,
    bmiNormalCount,
    bmiOverweightCount,
    bmiOverweightPct,
    planSuccessPct,
    clinicalImprovedCount,
    clinicalImprovedPct,
    statusLabel,
    statusColor
  };
}

function buildDistrictModelRows(areas: AreaEnrichedStat[]): DistrictModelRiskRow[] {
  const map: Record<string, DistrictModelRiskRow> = {};

  areas.forEach((a) => {
    const key = `${a.district}|${a.modelType}`;
    if (!map[key]) {
      map[key] = {
        key,
        district: a.district,
        modelType: a.modelType,
        totalAreas: 0,
        activeAreas: 0,
        target: 0,
        achieved: 0,
        achievementPct: 0,
        totalVisits: 0,
        v1Count: 0,
        v2Count: 0,
        v3Count: 0,
        v4PlusCount: 0,
        followUpCount: 0,
        followUpRate: 0,
        normalCount: 0,
        riskCount: 0,
        dangerCount: 0,
        normalPct: 0,
        riskPct: 0,
        dangerPct: 0,
        htNormalCount: 0,
        htRiskCount: 0,
        htDangerCount: 0,
        dmNormalCount: 0,
        dmRiskCount: 0,
        dmDangerCount: 0,
        bmiOverweightCount: 0,
        bmiOverweightPct: 0
      };
    }

    const row = map[key];
    row.totalAreas += 1;
    if (a.achieved > 0) row.activeAreas += 1;
    row.target += a.target;
    row.achieved += a.achieved;
    row.totalVisits += a.totalVisits;
    row.v1Count += a.v1Count;
    row.v2Count += a.v2Count;
    row.v3Count += a.v3Count;
    row.v4PlusCount += a.v4PlusCount;
    row.followUpCount += a.followUpCount;
    row.normalCount += a.normalCount;
    row.riskCount += a.riskCount;
    row.dangerCount += a.dangerCount;
    row.htNormalCount += a.htNormalCount;
    row.htRiskCount += a.htRiskCount;
    row.htDangerCount += a.htDangerCount;
    row.dmNormalCount += a.dmNormalCount;
    row.dmRiskCount += a.dmRiskCount;
    row.dmDangerCount += a.dmDangerCount;
    row.bmiOverweightCount += a.bmiOverweightCount;
  });

  return Object.values(map)
    .map((row) => {
      const totalP = Math.max(row.normalCount + row.riskCount + row.dangerCount, 1);
      return {
        ...row,
        achievementPct: row.target > 0 ? (row.achieved / row.target) * 100 : 0,
        followUpRate: row.achieved > 0 ? (row.followUpCount / row.achieved) * 100 : 0,
        normalPct: row.achieved > 0 ? Math.round((row.normalCount / totalP) * 100) : 0,
        riskPct: row.achieved > 0 ? Math.round((row.riskCount / totalP) * 100) : 0,
        dangerPct: row.achieved > 0 ? Math.round((row.dangerCount / totalP) * 100) : 0,
        bmiOverweightPct: row.achieved > 0 ? Math.round((row.bmiOverweightCount / totalP) * 100) : 0
      };
    })
    .sort((a, b) => a.district.localeCompare(b.district, "th") || a.modelType.localeCompare(b.modelType, "th"));
}

function buildModelAnalytics(
  modelName: string,
  modelLabel: string,
  areas: AreaEnrichedStat[]
): ModelExecutiveAnalytics {
  const totalAreas = areas.length;
  const activeAreas = areas.filter((a) => a.achieved > 0).length;
  const areasWithTarget = areas.filter((a) => a.target > 0).length;
  const achieved80Areas = areas.filter((a) => a.target > 0 && a.realPercent >= 80).length;
  const achieved100Areas = areas.filter((a) => a.target > 0 && a.realPercent >= 100).length;
  const under50Areas = areas.filter((a) => a.target > 0 && a.realPercent < 50).length;

  let totalTarget = 0;
  let totalAchieved = 0;
  let totalVisits = 0;
  let v1Count = 0;
  let v2Count = 0;
  let v3Count = 0;
  let v4PlusCount = 0;
  let followUpPeopleCount = 0;

  let normalCount = 0;
  let riskCount = 0;
  let dangerCount = 0;
  let htNormalCount = 0;
  let htRiskCount = 0;
  let htDangerCount = 0;
  let dmNormalCount = 0;
  let dmRiskCount = 0;
  let dmDangerCount = 0;
  let bmiNormalCount = 0;
  let bmiOverweightCount = 0;

  const allRecords: ScreeningRecord[] = [];
  areas.forEach((a) => {
    totalTarget += a.target;
    totalAchieved += a.achieved;
    totalVisits += a.totalVisits;
    v1Count += a.v1Count;
    v2Count += a.v2Count;
    v3Count += a.v3Count;
    v4PlusCount += a.v4PlusCount;
    followUpPeopleCount += a.followUpCount;
    normalCount += a.normalCount;
    riskCount += a.riskCount;
    dangerCount += a.dangerCount;
    htNormalCount += a.htNormalCount;
    htRiskCount += a.htRiskCount;
    htDangerCount += a.htDangerCount;
    dmNormalCount += a.dmNormalCount;
    dmRiskCount += a.dmRiskCount;
    dmDangerCount += a.dmDangerCount;
    bmiNormalCount += a.bmiNormalCount;
    bmiOverweightCount += a.bmiOverweightCount;
    allRecords.push(...a.records);
  });

  const achievementPct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;
  const remainingGap = Math.max(0, totalTarget - totalAchieved);
  const followUpVisitsTotal = Math.max(0, totalVisits - totalAchieved);
  const retentionRate = totalAchieved > 0 ? (followUpPeopleCount / totalAchieved) * 100 : 0;
  const avgVisitsPerPerson = totalAchieved > 0 ? totalVisits / totalAchieved : 0;

  const byPerson: Record<string, ScreeningRecord[]> = {};
  let targetGroupRecords = 0;
  let committeeRecords = 0;

  allRecords.forEach((r) => {
    const normName = (r.name || "").trim().replace(/\s+/g, " ") || `id_${r.id}`;
    const key = `${normName}_${r.targetArea || ""}`;
    if (!byPerson[key]) byPerson[key] = [];
    byPerson[key].push(r);

    if (r.participantType === "คณะทำงาน") committeeRecords++;
    else targetGroupRecords++;
  });

  let targetGroupUnique = 0;
  let committeeUnique = 0;
  const htRiskDangerCount = htRiskCount + htDangerCount;
  const dmRiskDangerCount = dmRiskCount + dmDangerCount;

  let bmiSum = 0, bmiN = 0;
  let sysSum = 0, sysN = 0;
  let diaSum = 0, diaN = 0;
  let sugarSum = 0, sugarN = 0;
  let waistSum = 0, waistN = 0, waistExceedCount = 0;

  let sweetRisk = 0, fatRisk = 0, saltRisk = 0, noExercise = 0, poorSleep = 0, smokeRisk = 0, alcoholRisk = 0;
  let lowWaterRisk = 0, adequateWaterCount = 0;

  const pillarTrack: Record<"sweet" | "fat" | "salt" | "sleep" | "water" | "exercise", { set: number; achieved: number }> = {
    sweet: { set: 0, achieved: 0 },
    fat: { set: 0, achieved: 0 },
    salt: { set: 0, achieved: 0 },
    sleep: { set: 0, achieved: 0 },
    water: { set: 0, achieved: 0 },
    exercise: { set: 0, achieved: 0 }
  };
  let peopleWithPlanCount = 0;

  let evaluatedCohortCount = 0;
  let bpImprovedCount = 0;
  let sugarImprovedCount = 0;
  let bmiImprovedCount = 0;
  let riskReducedCount = 0;
  let anyClinicalImprovedCount = 0;

  Object.values(byPerson).forEach((personRecs) => {
    const sorted = [...personRecs].sort((a, b) => {
      const vA = a.visitNumber || 1;
      const vB = b.visitNumber || 1;
      if (vA !== vB) return vA - vB;
      return (a.date || "").localeCompare(b.date || "");
    });
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];

    if (latest.participantType === "คณะทำงาน") committeeUnique++;
    else targetGroupUnique++;

    const b = parseFloat(latest.bmi);
    if (!isNaN(b) && b > 0) {
      bmiSum += b;
      bmiN++;
    }
    if (latest.bpSys > 0) {
      sysSum += latest.bpSys;
      sysN++;
    }
    if (latest.bpDia > 0) {
      diaSum += latest.bpDia;
      diaN++;
    }
    if (latest.sugar > 0) {
      sugarSum += latest.sugar;
      sugarN++;
    }
    if (latest.waist !== undefined && latest.waist !== null && Number(latest.waist) > 0) {
      const w = Number(latest.waist);
      waistSum += w;
      waistN++;
      if (latest.gender === "ชาย" ? w >= 36 : w >= 32) {
        waistExceedCount++;
      }
    }

    if (latest.foodHabit?.sweet?.level === "เสี่ยงสูง" || latest.foodHabit?.sweet?.level === "เสี่ยงสูงมาก") sweetRisk++;
    if (latest.foodHabit?.fat?.level === "เสี่ยงสูง" || latest.foodHabit?.fat?.level === "เสี่ยงสูงมาก") fatRisk++;
    if (
      latest.foodHabit?.salt?.level === "เสี่ยงสูง" ||
      latest.foodHabit?.salt?.level === "เสี่ยงสูงมาก" ||
      latest.sodium?.includes("เค็มประจำ")
    ) {
      saltRisk++;
    }
    if (latest.exercise?.includes("ไม่ออก") || latest.exercise?.includes("นั่งนิ่ง")) noExercise++;
    if (latest.sleep?.includes("น้อยกว่า 6") || latest.sleep?.includes("ไม่เพียงพอ")) poorSleep++;
    if (latest.smoking?.includes("สูบอยู่") || latest.smoking?.includes("ประจำ")) smokeRisk++;
    if (latest.alcohol?.includes("ประจำ") || latest.alcohol?.includes("ครั้งคราว")) alcoholRisk++;
    if (latest.water?.includes("น้อยกว่า 6")) lowWaterRisk++;
    else if (latest.water) adequateWaterCount++;

    const recWithPlan = [...sorted].reverse().find((r) => r.personalPlan) || latest;
    if (recWithPlan.personalPlan) {
      let hasAnyPlan = false;
      (["sweet", "fat", "salt", "sleep", "water", "exercise"] as const).forEach((k) => {
        const item = recWithPlan.personalPlan?.[k];
        if (item && (item.plan || item.achieved !== undefined)) {
          hasAnyPlan = true;
          pillarTrack[k].set++;
          if (item.achieved === true) {
            pillarTrack[k].achieved++;
          }
        }
      });
      if (hasAnyPlan) peopleWithPlanCount++;
    }

    if (sorted.length >= 2) {
      evaluatedCohortCount++;
      const bpBetter =
        (latest.bpSys > 0 && first.bpSys > 0 && latest.bpSys < first.bpSys) ||
        (first.htResult?.level !== "normal" && latest.htResult?.level === "normal");
      const sugarBetter =
        (latest.sugar > 0 && first.sugar > 0 && latest.sugar < first.sugar) ||
        (first.dmResult?.level !== "normal" && latest.dmResult?.level === "normal");
      const bmiFirst = parseFloat(first.bmi);
      const bmiLatest = parseFloat(latest.bmi);
      const bmiBetter = !isNaN(bmiFirst) && !isNaN(bmiLatest) && bmiLatest < bmiFirst;
      const riskBetter = getRiskSeverity(latest) < getRiskSeverity(first);

      if (bpBetter) bpImprovedCount++;
      if (sugarBetter) sugarImprovedCount++;
      if (bmiBetter) bmiImprovedCount++;
      if (riskBetter) riskReducedCount++;
      if (bpBetter || sugarBetter || bmiBetter || riskBetter) anyClinicalImprovedCount++;
    }
  });

  const uniqueCount = Math.max(normalCount + riskCount + dangerCount, 1);
  const normalPct = totalAchieved > 0 ? Math.round((normalCount / uniqueCount) * 100) : 0;
  const riskPct = totalAchieved > 0 ? Math.round((riskCount / uniqueCount) * 100) : 0;
  const dangerPct = totalAchieved > 0 ? Math.round((dangerCount / uniqueCount) * 100) : 0;

  const htNormalPct = totalAchieved > 0 ? Math.round((htNormalCount / uniqueCount) * 100) : 0;
  const htRiskPct = totalAchieved > 0 ? Math.round((htRiskCount / uniqueCount) * 100) : 0;
  const htDangerPct = totalAchieved > 0 ? Math.round((htDangerCount / uniqueCount) * 100) : 0;

  const dmNormalPct = totalAchieved > 0 ? Math.round((dmNormalCount / uniqueCount) * 100) : 0;
  const dmRiskPct = totalAchieved > 0 ? Math.round((dmRiskCount / uniqueCount) * 100) : 0;
  const dmDangerPct = totalAchieved > 0 ? Math.round((dmDangerCount / uniqueCount) * 100) : 0;

  const bmiOverweightPct = totalAchieved > 0 ? Math.round((bmiOverweightCount / uniqueCount) * 100) : 0;

  const behaviorsList = [
    { name: "บริโภคอาหารรสหวานจัด", count: sweetRisk, pct: totalAchieved > 0 ? Math.round((sweetRisk / uniqueCount) * 100) : 0 },
    { name: "บริโภคอาหารมัน/ของทอด", count: fatRisk, pct: totalAchieved > 0 ? Math.round((fatRisk / uniqueCount) * 100) : 0 },
    { name: "บริโภครสเค็ม/โซเดียมสูง", count: saltRisk, pct: totalAchieved > 0 ? Math.round((saltRisk / uniqueCount) * 100) : 0 },
    { name: "ดื่มน้ำเปล่าน้อยกว่า 6 แก้ว/วัน", count: lowWaterRisk, pct: totalAchieved > 0 ? Math.round((lowWaterRisk / uniqueCount) * 100) : 0 },
    { name: "ขาดการออกกำลังกาย", count: noExercise, pct: totalAchieved > 0 ? Math.round((noExercise / uniqueCount) * 100) : 0 },
    { name: "นอนหลับพักผ่อนไม่เพียงพอ", count: poorSleep, pct: totalAchieved > 0 ? Math.round((poorSleep / uniqueCount) * 100) : 0 },
    { name: "การสูบบุหรี่", count: smokeRisk, pct: totalAchieved > 0 ? Math.round((smokeRisk / uniqueCount) * 100) : 0 },
    { name: "การดื่มเครื่องดื่มแอลกอฮอล์", count: alcoholRisk, pct: totalAchieved > 0 ? Math.round((alcoholRisk / uniqueCount) * 100) : 0 }
  ].sort((a, b) => b.count - a.count);

  const pillarLabels: Record<"sweet" | "fat" | "salt" | "sleep" | "water" | "exercise", string> = {
    sweet: "1. ลดหวาน",
    fat: "2. ลดมัน/ของทอด",
    salt: "3. ลดเค็ม/โซเดียม",
    sleep: "4. นอนหลับเพียงพอ",
    water: "5. ดื่มน้ำสะอาด",
    exercise: "6. ออกกำลังกาย"
  };

  let totalPlanSet = 0;
  let totalPlanAchieved = 0;
  const pillars: PillarStat[] = (["sweet", "fat", "salt", "sleep", "water", "exercise"] as const).map((k) => {
    totalPlanSet += pillarTrack[k].set;
    totalPlanAchieved += pillarTrack[k].achieved;
    return {
      key: k,
      label: pillarLabels[k],
      set: pillarTrack[k].set,
      achieved: pillarTrack[k].achieved,
      pct: pillarTrack[k].set > 0 ? Math.round((pillarTrack[k].achieved / pillarTrack[k].set) * 100) : 0
    };
  });

  const overallPlanSuccessPct = totalPlanSet > 0 ? Math.round((totalPlanAchieved / totalPlanSet) * 100) : 0;

  const sortedByPerf = [...areas].sort((a, b) => {
    if (a.target > 0 && b.target > 0 && b.realPercent !== a.realPercent) {
      return b.realPercent - a.realPercent;
    }
    if (b.achieved !== a.achieved) return b.achieved - a.achieved;
    return b.totalVisits - a.totalVisits;
  });

  const topAreas = sortedByPerf.filter((a) => a.achieved > 0).slice(0, 3);
  const priorityAreas = [...areas]
    .filter((a) => (a.target > 0 && a.realPercent < 60) || a.achieved === 0 || (a.v1Count > 10 && a.followUpCount === 0))
    .sort((a, b) => a.realPercent - b.realPercent || a.achieved - b.achieved)
    .slice(0, 4);

  return {
    modelName,
    modelLabel,
    totalAreas,
    activeAreas,
    areasWithTarget,
    achieved80Areas,
    achieved100Areas,
    under50Areas,
    totalTarget,
    totalAchieved,
    totalVisits,
    achievementPct,
    remainingGap,
    v1Count,
    v2Count,
    v3Count,
    v4PlusCount,
    followUpPeopleCount,
    followUpVisitsTotal,
    retentionRate,
    avgVisitsPerPerson,
    targetGroupRecords,
    committeeRecords,
    targetGroupUnique,
    committeeUnique,
    normalCount,
    riskCount,
    dangerCount,
    normalPct,
    riskPct,
    dangerPct,
    htNormalCount,
    htRiskCount,
    htDangerCount,
    htNormalPct,
    htRiskPct,
    htDangerPct,
    dmNormalCount,
    dmRiskCount,
    dmDangerCount,
    dmNormalPct,
    dmRiskPct,
    dmDangerPct,
    htRiskDangerCount,
    dmRiskDangerCount,
    bmiNormalCount,
    bmiOverweightCount,
    bmiOverweightPct,
    avgBmi: bmiN > 0 ? (bmiSum / bmiN).toFixed(1) : "-",
    avgBpSys: sysN > 0 ? Math.round(sysSum / sysN).toString() : "-",
    avgBpDia: diaN > 0 ? Math.round(diaSum / diaN).toString() : "-",
    avgSugar: sugarN > 0 ? Math.round(sugarSum / sugarN).toString() : "-",
    avgWaist: waistN > 0 ? (waistSum / waistN).toFixed(1) : "-",
    waistRecordedCount: waistN,
    waistExceedCount,
    waistExceedPct: waistN > 0 ? Math.round((waistExceedCount / waistN) * 100) : 0,
    lowWaterCount: lowWaterRisk,
    lowWaterPct: totalAchieved > 0 ? Math.round((lowWaterRisk / uniqueCount) * 100) : 0,
    adequateWaterCount,
    adequateWaterPct: totalAchieved > 0 ? Math.round((adequateWaterCount / uniqueCount) * 100) : 0,
    topBehaviors: behaviorsList.slice(0, 4),
    peopleWithPlanCount,
    totalPlanSet,
    totalPlanAchieved,
    overallPlanSuccessPct,
    pillars,
    evaluatedCohortCount,
    bpImprovedCount,
    bpImprovedPct: evaluatedCohortCount > 0 ? Math.round((bpImprovedCount / evaluatedCohortCount) * 100) : 0,
    sugarImprovedCount,
    sugarImprovedPct: evaluatedCohortCount > 0 ? Math.round((sugarImprovedCount / evaluatedCohortCount) * 100) : 0,
    bmiImprovedCount,
    bmiImprovedPct: evaluatedCohortCount > 0 ? Math.round((bmiImprovedCount / evaluatedCohortCount) * 100) : 0,
    riskReducedCount,
    riskReducedPct: evaluatedCohortCount > 0 ? Math.round((riskReducedCount / evaluatedCohortCount) * 100) : 0,
    anyClinicalImprovedCount,
    anyClinicalImprovedPct: evaluatedCohortCount > 0 ? Math.round((anyClinicalImprovedCount / evaluatedCohortCount) * 100) : 0,
    areas: sortedByPerf,
    topAreas,
    priorityAreas
  };
}

export const ExecutiveModelReport: React.FC<ExecutiveModelReportProps> = ({
  areaStats,
  filteredRecords,
  filterSummaryText,
  onActivatePrintMode
}) => {
  const [reportScope, setReportScope] = useState<"all_separated" | "ตำบล" | "หมู่บ้าน">("all_separated");
  const [pageBreakPerModel, setPageBreakPerModel] = useState<boolean>(true);
  const [showProcessSection, setShowProcessSection] = useState<boolean>(true);
  const [showOutcomeSection, setShowOutcomeSection] = useState<boolean>(true);
  const [isExpandedOnScreen, setIsExpandedOnScreen] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [exportStatusMsg, setExportStatusMsg] = useState<string>("");

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const todayThai = useMemo(() => {
    const nowIso = new Date().toISOString().split("T")[0];
    return formatThaiDate(nowIso, "full");
  }, []);

  const analytics = useMemo(() => {
    const enrichedAreas = areaStats.map(computeAreaEnriched);
    const subdistrictAreas = enrichedAreas.filter((a) => a.modelType === "ตำบล");
    const villageAreas = enrichedAreas.filter((a) => a.modelType === "หมู่บ้าน");

    const overall = buildModelAnalytics("รวมทั้งโครงการ", "ภาพรวมทั้งโครงการ (โมเดลตำบล & โมเดลหมู่บ้าน)", enrichedAreas);
    const subdistrictModel = buildModelAnalytics("ตำบล", "โมเดลตำบล (Subdistrict Model)", subdistrictAreas);
    const villageModel = buildModelAnalytics("หมู่บ้าน", "โมเดลหมู่บ้าน (Village Model)", villageAreas);
    const districtModelRows = buildDistrictModelRows(enrichedAreas);

    return {
      overall,
      subdistrictModel,
      villageModel,
      districtModelRows
    };
  }, [areaStats, filteredRecords]);

  const handlePrintScope = (scope: "all_separated" | "ตำบล" | "หมู่บ้าน") => {
    setReportScope(scope);
    setIsExpandedOnScreen(true);
    if (onActivatePrintMode) {
      onActivatePrintMode();
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // =========================================================================
  // EXCEL EXPORT (.xlsx): สรุปภาพรวมรายโมเดล + รายอำเภอ + รายพื้นที่ แยกตามเกณฑ์ความเสี่ยง
  // =========================================================================
  const handleExportExcel = (scopeOverride?: "all_separated" | "ตำบล" | "หมู่บ้าน") => {
    const targetScope = scopeOverride || reportScope;
    const wb = XLSX.utils.book_new();

    const modelsForSummary =
      targetScope === "ตำบล"
        ? [analytics.subdistrictModel]
        : targetScope === "หมู่บ้าน"
        ? [analytics.villageModel]
        : [analytics.subdistrictModel, analytics.villageModel, analytics.overall];

    // SHEET 1: สรุปภาพรวมรายโมเดล แยกตามเกณฑ์ความเสี่ยง
    const sheet1Rows: (string | number)[][] = [
      ["รายงานสรุปผลการคัดกรองและการติดตามโครงการ แยกรายโมเดลและเกณฑ์ความเสี่ยง (สำหรับรายงานการประชุมระดับอำเภอ/จังหวัด)"],
      ['โครงการลดโรค NCDs ด้วยแผนปรับเปลี่ยนพฤติกรรมรายบุคคล "Mini Flag Ship Satun"'],
      [`ข้อมูล ณ วันที่: ${todayThai}`, "", `ขอบเขตข้อมูล: ${filterSummaryText || "ทุกพื้นที่"}`],
      [],
      [
        "โมเดลโครงการ",
        "พื้นที่ทั้งหมด (แห่ง)",
        "พื้นที่ดำเนินการแล้ว (แห่ง)",
        "พื้นที่บรรลุเป้า ≥80% (แห่ง)",
        "เป้าหมาย (คน)",
        "ผู้ได้รับการคัดกรอง (คน)",
        "ร้อยละความก้าวหน้า (%)",
        "ยอดตรวจสะสม (Visits)",
        "1. กลุ่มเป้าหมายโครงการ (คน)",
        "2. คณะทำงาน (คน)",
        "ความเสี่ยงรวม: ปกติ (คน)",
        "ความเสี่ยงรวม: ปกติ (%)",
        "ความเสี่ยงรวม: เสี่ยงสูง (คน)",
        "ความเสี่ยงรวม: เสี่ยงสูง (%)",
        "ความเสี่ยงรวม: สงสัยป่วย (คน)",
        "ความเสี่ยงรวม: สงสัยป่วย (%)",
        "ความดัน (HT): ปกติ (คน)",
        "ความดัน (HT): เสี่ยง (คน)",
        "ความดัน (HT): สงสัยป่วย (คน)",
        "เบาหวาน (DM): ปกติ (คน)",
        "เบาหวาน (DM): เสี่ยง (คน)",
        "เบาหวาน (DM): สงสัยป่วย (คน)",
        "BMI เกินเกณฑ์ ≥23 (คน)",
        "BMI เกินเกณฑ์ ≥23 (%)",
        "รอบเอวเฉลี่ย (นิ้ว)",
        "รอบเอวเกินเกณฑ์ (คน)",
        "ดื่มน้ำเพียงพอ ≥6 แก้ว (%)",
        "ตรวจครั้งที่ 1 (คน)",
        "ตรวจครั้งที่ 2 (คน)",
        "ตรวจครั้งที่ 3 (คน)",
        "ตรวจครั้งที่ 4+ (คน)",
        "อัตราติดตามซ้ำ (%)",
        "บรรลุแผนปรับพฤติกรรม 6 มิติ (%)",
        "ผู้ติดตามที่ผลสุขภาพดีขึ้น (%)"
      ]
    ];

    modelsForSummary.forEach((m) => {
      sheet1Rows.push([
        m.modelLabel,
        m.totalAreas,
        m.activeAreas,
        m.achieved80Areas,
        m.totalTarget,
        m.totalAchieved,
        Number(m.achievementPct.toFixed(1)),
        m.totalVisits,
        m.targetGroupUnique,
        m.committeeUnique,
        m.normalCount,
        m.normalPct,
        m.riskCount,
        m.riskPct,
        m.dangerCount,
        m.dangerPct,
        m.htNormalCount,
        m.htRiskCount,
        m.htDangerCount,
        m.dmNormalCount,
        m.dmRiskCount,
        m.dmDangerCount,
        m.bmiOverweightCount,
        m.bmiOverweightPct,
        m.avgWaist,
        m.waistExceedCount,
        m.adequateWaterPct,
        m.v1Count,
        m.v2Count,
        m.v3Count,
        m.v4PlusCount,
        Number(m.retentionRate.toFixed(1)),
        m.overallPlanSuccessPct,
        m.anyClinicalImprovedPct
      ]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    ws1["!cols"] = [
      { wch: 34 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 20 },
      { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
      { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
      { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "1_สรุปภาพรวมรายโมเดล");

    // SHEET 2: สรุปผลงานระดับอำเภอ แยกรายโมเดลและเกณฑ์ความเสี่ยง (สำหรับนำเสนอระดับอำเภอ)
    const filteredDistRows = analytics.districtModelRows.filter((r) =>
      targetScope === "all_separated" ? true : r.modelType === targetScope
    );

    const sheet2Rows: (string | number)[][] = [
      ["ตารางสรุปผลการคัดกรองระดับอำเภอ แยกรายโมเดลและเกณฑ์ความเสี่ยง (สำหรับรายงานการประชุมระดับอำเภอ)"],
      [`ข้อมูล ณ วันที่: ${todayThai}`],
      [],
      [
        "ลำดับ",
        "อำเภอ",
        "โมเดล",
        "จำนวนพื้นที่ (แห่ง)",
        "ดำเนินการแล้ว (แห่ง)",
        "เป้าหมาย (คน)",
        "ผู้ได้รับการคัดกรอง (คน)",
        "ความก้าวหน้า (%)",
        "ยอดตรวจสะสม (ครั้ง)",
        "ความเสี่ยงรวม: ปกติ (คน)",
        "ความเสี่ยงรวม: ปกติ (%)",
        "ความเสี่ยงรวม: เสี่ยงสูง (คน)",
        "ความเสี่ยงรวม: เสี่ยงสูง (%)",
        "ความเสี่ยงรวม: สงสัยป่วย (คน)",
        "ความเสี่ยงรวม: สงสัยป่วย (%)",
        "ความดัน (HT): ปกติ (คน)",
        "ความดัน (HT): เสี่ยง (คน)",
        "ความดัน (HT): สงสัยป่วย (คน)",
        "เบาหวาน (DM): ปกติ (คน)",
        "เบาหวาน (DM): เสี่ยง (คน)",
        "เบาหวาน (DM): สงสัยป่วย (คน)",
        "BMI เกินเกณฑ์ ≥23 (คน)",
        "BMI เกินเกณฑ์ ≥23 (%)",
        "ครั้งที่ 1 (คน)",
        "ครั้งที่ 2 (คน)",
        "ครั้งที่ 3 (คน)",
        "ครั้งที่ 4+ (คน)",
        "อัตราติดตามซ้ำ (%)"
      ]
    ];

    filteredDistRows.forEach((r, idx) => {
      sheet2Rows.push([
        idx + 1,
        `อ.${r.district}`,
        `โมเดล${r.modelType}`,
        r.totalAreas,
        r.activeAreas,
        r.target,
        r.achieved,
        Number(r.achievementPct.toFixed(1)),
        r.totalVisits,
        r.normalCount,
        r.normalPct,
        r.riskCount,
        r.riskPct,
        r.dangerCount,
        r.dangerPct,
        r.htNormalCount,
        r.htRiskCount,
        r.htDangerCount,
        r.dmNormalCount,
        r.dmRiskCount,
        r.dmDangerCount,
        r.bmiOverweightCount,
        r.bmiOverweightPct,
        r.v1Count,
        r.v2Count,
        r.v3Count,
        r.v4PlusCount,
        Number(r.followUpRate.toFixed(1))
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    ws2["!cols"] = [
      { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 14 },
      { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 20 },
      { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
      { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "2_สรุปรายอำเภอแยกโมเดล");

    // Helper to build area detail sheet per model
    const buildModelAreaSheet = (m: ModelExecutiveAnalytics) => {
      const rows: (string | number)[][] = [
        [`รายงานผลการคัดกรองรายพื้นที่เป้าหมาย แยกตามเกณฑ์ความเสี่ยง — ${m.modelLabel}`],
        [`ข้อมูล ณ วันที่: ${todayThai}`],
        [],
        [
          "ลำดับ",
          "โมเดล",
          "อำเภอ",
          "ตำบล",
          "พื้นที่เป้าหมาย",
          "เป้าหมาย (คน)",
          "ผู้ได้รับการคัดกรอง (คน)",
          "ความก้าวหน้า (%)",
          "ยอดตรวจรวม (ครั้ง)",
          "ความเสี่ยงรวม: ปกติ (คน)",
          "ความเสี่ยงรวม: ปกติ (%)",
          "ความเสี่ยงรวม: เสี่ยงสูง (คน)",
          "ความเสี่ยงรวม: เสี่ยงสูง (%)",
          "ความเสี่ยงรวม: สงสัยป่วย (คน)",
          "ความเสี่ยงรวม: สงสัยป่วย (%)",
          "ความดัน (HT): ปกติ (คน)",
          "ความดัน (HT): เสี่ยง (คน)",
          "ความดัน (HT): สงสัยป่วย (คน)",
          "เบาหวาน (DM): ปกติ (คน)",
          "เบาหวาน (DM): เสี่ยง (คน)",
          "เบาหวาน (DM): สงสัยป่วย (คน)",
          "BMI เกินเกณฑ์ ≥23 (คน)",
          "BMI เกินเกณฑ์ ≥23 (%)",
          "ครั้งที่ 1 (คน)",
          "ครั้งที่ 2 (คน)",
          "ครั้งที่ 3 (คน)",
          "ครั้งที่ 4+ (คน)",
          "อัตราติดตามซ้ำ (%)",
          "สถานะการบรรลุเป้าหมาย"
        ]
      ];

      m.areas.forEach((a, idx) => {
        rows.push([
          idx + 1,
          `โมเดล${a.modelType}`,
          `อ.${a.district}`,
          a.subdistrict ? `ต.${a.subdistrict}` : "-",
          a.area,
          a.target,
          a.achieved,
          Number(a.realPercent.toFixed(1)),
          a.totalVisits,
          a.normalCount,
          a.normalPct,
          a.riskCount,
          a.riskPct,
          a.dangerCount,
          a.dangerPct,
          a.htNormalCount,
          a.htRiskCount,
          a.htDangerCount,
          a.dmNormalCount,
          a.dmRiskCount,
          a.dmDangerCount,
          a.bmiOverweightCount,
          a.bmiOverweightPct,
          a.v1Count,
          a.v2Count,
          a.v3Count,
          a.v4PlusCount,
          Number(a.followUpRate.toFixed(1)),
          a.statusLabel
        ]);
      });

      // Summary footer row
      rows.push([
        "รวม",
        m.modelLabel,
        "-",
        "-",
        `รวม ${m.areas.length} พื้นที่`,
        m.totalTarget,
        m.totalAchieved,
        Number(m.achievementPct.toFixed(1)),
        m.totalVisits,
        m.normalCount,
        m.normalPct,
        m.riskCount,
        m.riskPct,
        m.dangerCount,
        m.dangerPct,
        m.htNormalCount,
        m.htRiskCount,
        m.htDangerCount,
        m.dmNormalCount,
        m.dmRiskCount,
        m.dmDangerCount,
        m.bmiOverweightCount,
        m.bmiOverweightPct,
        m.v1Count,
        m.v2Count,
        m.v3Count,
        m.v4PlusCount,
        Number(m.retentionRate.toFixed(1)),
        `ผ่านเกณฑ์ ≥80% จำนวน ${m.achieved80Areas} พื้นที่`
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [
        { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 14 },
        { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 20 },
        { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
        { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 24 }
      ];
      return ws;
    };

    if (targetScope === "all_separated" || targetScope === "ตำบล") {
      XLSX.utils.book_append_sheet(wb, buildModelAreaSheet(analytics.subdistrictModel), "3_รายพื้นที่_โมเดลตำบล");
    }
    if (targetScope === "all_separated" || targetScope === "หมู่บ้าน") {
      XLSX.utils.book_append_sheet(wb, buildModelAreaSheet(analytics.villageModel), "4_รายพื้นที่_โมเดลหมู่บ้าน");
    }

    const dateIso = new Date().toISOString().split("T")[0];
    const scopeTag = targetScope === "all_separated" ? "ทุกโมเดล" : `โมเดล${targetScope}`;
    const filename = `รายงานสรุปผล_NCDs_${scopeTag}_แยกตามเกณฑ์ความเสี่ยง_${dateIso}.xlsx`;
    XLSX.writeFile(wb, filename);

    setExportStatusMsg(`ส่งออกไฟล์ Excel (${filename}) สำเร็จแล้ว`);
    setTimeout(() => setExportStatusMsg(""), 4000);
  };

  // =========================================================================
  // PDF EXPORT (.pdf): เรนเดอร์รายงานผู้บริหารและตารางแยกตามเกณฑ์ความเสี่ยงลง A4
  // =========================================================================
  const handleExportPdf = async (scopeOverride?: "all_separated" | "ตำบล" | "หมู่บ้าน") => {
    try {
      if (scopeOverride && scopeOverride !== reportScope) {
        setReportScope(scopeOverride);
        await new Promise((r) => setTimeout(r, 120));
      }
      setIsGeneratingPdf(true);
      setExportStatusMsg("กำลังสร้างไฟล์ PDF ความละเอียดสูง สำหรับรายงานการประชุม...");

      const element = pdfContainerRef.current;
      if (!element) throw new Error("PDF container not found");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const activeScope = scopeOverride || reportScope;
      const scopeTag = activeScope === "all_separated" ? "ทุกโมเดล" : `โมเดล${activeScope}`;
      const dateIso = new Date().toISOString().split("T")[0];
      const filename = `รายงานสรุปผล_NCDs_${scopeTag}_แยกเกณฑ์ความเสี่ยง_${dateIso}.pdf`;
      pdf.save(filename);

      setExportStatusMsg(`ส่งออกไฟล์ PDF (${filename}) สำเร็จแล้ว`);
      setTimeout(() => setExportStatusMsg(""), 4000);
    } catch (err) {
      console.error("PDF export error:", err);
      setExportStatusMsg("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF กรุณาลองอีกครั้งหรือใช้ปุ่มพิมพ์รายงาน");
      setTimeout(() => setExportStatusMsg(""), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const modelsToRender = useMemo(() => {
    if (reportScope === "ตำบล") return [analytics.subdistrictModel];
    if (reportScope === "หมู่บ้าน") return [analytics.villageModel];
    return [analytics.subdistrictModel, analytics.villageModel];
  }, [reportScope, analytics]);

  const activeHeadlineModel = useMemo(() => {
    if (reportScope === "ตำบล") return analytics.subdistrictModel;
    if (reportScope === "หมู่บ้าน") return analytics.villageModel;
    return analytics.overall;
  }, [reportScope, analytics]);

  const filteredDistrictRows = useMemo(() => {
    if (reportScope === "ตำบล") return analytics.districtModelRows.filter((r) => r.modelType === "ตำบล");
    if (reportScope === "หมู่บ้าน") return analytics.districtModelRows.filter((r) => r.modelType === "หมู่บ้าน");
    return analytics.districtModelRows;
  }, [reportScope, analytics.districtModelRows]);

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* SCREEN TOOLBAR: Executive Report, PDF / Excel Export & Print Panel    */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-800/60 print:hidden space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 p-3 rounded-2xl shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-md">
                  Executive Report • PDF & Excel Export
                </span>
                <span className="text-xs text-indigo-200 font-semibold">
                  ข้อมูล ณ วันที่ {todayThai}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                รายงานสรุปผลและการติดตามโครงการ แยกรายโมเดล & เกณฑ์ความเสี่ยง (สำหรับผู้บริหารและการประชุมระดับอำเภอ)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                ส่งออกไฟล์ PDF / Excel (.xlsx) หรือสั่งพิมพ์รายงานสรุปภาพรวมรายโมเดล (หมู่บ้าน/ตำบล) และรายอำเภอ แยกตามเกณฑ์ความเสี่ยง (ปกติ/เสี่ยงสูง/สงสัยป่วย • HT • DM • BMI)
              </p>
            </div>
          </div>

          {/* Export PDF / Excel & Print Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Export Excel Button */}
            <button
              type="button"
              onClick={() => handleExportExcel()}
              className="text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              title="ส่งออกไฟล์ Excel (.xlsx) 4 แผ่นงาน: สรุปรายโมเดล, สรุปรายอำเภอ, โมเดลตำบล, โมเดลหมู่บ้าน แยกตามเกณฑ์ความเสี่ยง"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ส่งออก Excel (.xlsx)</span>
            </button>

            {/* Export PDF Button */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => handleExportPdf()}
              className="text-xs font-black bg-rose-500 hover:bg-rose-400 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
              title="ส่งออกไฟล์ PDF (.pdf) ขนาด A4 สรุปภาพรวมรายโมเดลและรายอำเภอแยกตามเกณฑ์ความเสี่ยง"
            >
              {isGeneratingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>ส่งออก PDF (.pdf)</span>
                </>
              )}
            </button>

            {/* Direct Print Buttons */}
            <button
              type="button"
              onClick={() => handlePrintScope("all_separated")}
              className="text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>พิมพ์ครบทุกโมเดล</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintScope("ตำบล")}
              className="text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white px-3 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border border-purple-400/30"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์โมเดลตำบล</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintScope("หมู่บ้าน")}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border border-blue-400/30"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์โมเดลหมู่บ้าน</span>
            </button>
          </div>
        </div>

        {/* Export Feedback Banner */}
        {exportStatusMsg && (
          <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportStatusMsg}</span>
          </div>
        )}

        {/* Scope Selector & Print Section Toggles */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-indigo-200 font-bold">เลือกขอบเขตโมเดลที่จะแสดงผล / ส่งออกไฟล์:</span>
            <div className="inline-flex p-1 rounded-xl bg-white/10 border border-white/15 flex-wrap">
              <button
                type="button"
                onClick={() => setReportScope("all_separated")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  reportScope === "all_separated"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                ทุกโมเดล: ตำบล & หมู่บ้าน ({analytics.overall.totalAreas} พื้นที่)
              </button>
              <button
                type="button"
                onClick={() => setReportScope("ตำบล")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  reportScope === "ตำบล"
                    ? "bg-purple-500 text-white shadow-2xs"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                เฉพาะ โมเดลตำบล ({analytics.subdistrictModel.totalAreas} พื้นที่)
              </button>
              <button
                type="button"
                onClick={() => setReportScope("หมู่บ้าน")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  reportScope === "หมู่บ้าน"
                    ? "bg-blue-500 text-white shadow-2xs"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                เฉพาะ โมเดลหมู่บ้าน ({analytics.villageModel.totalAreas} พื้นที่)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white">
              <input
                type="checkbox"
                checked={pageBreakPerModel}
                onChange={(e) => setPageBreakPerModel(e.target.checked)}
                className="rounded text-indigo-500 focus:ring-0"
              />
              <span>แยกหน้ากระดาษรายโมเดล</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white">
              <input
                type="checkbox"
                checked={showProcessSection}
                onChange={(e) => setShowProcessSection(e.target.checked)}
                className="rounded text-indigo-500 focus:ring-0"
              />
              <span>กระบวนการ 5 ขั้นตอน</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white">
              <input
                type="checkbox"
                checked={showOutcomeSection}
                onChange={(e) => setShowOutcomeSection(e.target.checked)}
                className="rounded text-indigo-500 focus:ring-0"
              />
              <span>ผลลัพธ์ปรับพฤติกรรม & สุขภาพ</span>
            </label>

            <button
              type="button"
              onClick={() => setIsExpandedOnScreen(!isExpandedOnScreen)}
              className="text-xs font-bold text-indigo-200 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer ml-auto"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isExpandedOnScreen ? "ย่อหน้ารายงาน" : "เปิดดูรายงานเต็มรูปแบบ"}</span>
              {isExpandedOnScreen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* EXECUTIVE REPORT DOCUMENT BODY (Visible on screen & optimized for A4) */}
      {/* ===================================================================== */}
      <div className={`${isExpandedOnScreen ? "block" : "hidden print:block"} space-y-6 print:space-y-5`}>
        
        {/* OFFICIAL PRINT HEADER BANNER */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs print:rounded-none print:border-0 print:border-b-2 print:border-slate-800 print:p-0 print:pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 print:border-slate-300">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
                <HeartPulse className="w-4 h-4" />
                <span>รายงานสรุปผลสำหรับผู้บริหารและการประชุมระดับอำเภอ (EXECUTIVE & DISTRICT MEETING REPORT)</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
                โครงการลดโรค NCDs ด้วยแผนปรับเปลี่ยนพฤติกรรมรายบุคคล “Mini Flag Ship Satun”
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                {reportScope === "all_separated"
                  ? "รายงานสรุปภาพรวมรายโมเดล (โมเดลตำบล และ โมเดลหมู่บ้าน) แสดงผลจำนวนผู้ได้รับการคัดกรอง แยกตามเกณฑ์ความเสี่ยง"
                  : reportScope === "ตำบล"
                  ? "รายงานสรุปผลการดำเนินงานและจำนวนผู้ได้รับการคัดกรอง แยกตามเกณฑ์ความเสี่ยง — เฉพาะ โมเดลตำบล"
                  : "รายงานสรุปผลการดำเนินงานและจำนวนผู้ได้รับการคัดกรอง แยกตามเกณฑ์ความเสี่ยง — เฉพาะ โมเดลหมู่บ้าน"}
              </p>
            </div>

            <div className="text-left md:text-right space-y-1 shrink-0 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 print:bg-transparent print:p-0 print:border-0">
              <div className="text-xs font-bold text-slate-800">
                ข้อมูล ณ วันที่ {todayThai}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold">
                ขอบเขตรายงาน: <strong className="text-indigo-700">{activeHeadlineModel.modelLabel}</strong>
              </div>
              {filterSummaryText && (
                <div className="text-[10px] text-slate-500">
                  {filterSummaryText}
                </div>
              )}
            </div>
          </div>

          {/* 1. EXECUTIVE KPI SCORECARD */}
          <div className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Trophy className="w-4 h-4 text-amber-500" />
                ส่วนที่ 1: ดัชนีชี้วัดความสำเร็จหลักของโครงการ (Executive KPI Scorecard — {activeHeadlineModel.modelName})
              </h2>
              <span className="text-[11px] font-bold text-slate-500">
                ครอบคลุม {activeHeadlineModel.activeAreas} / {activeHeadlineModel.totalAreas} พื้นที่เป้าหมาย
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-3">
              <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/50 border border-indigo-200 rounded-2xl p-4 flex flex-col justify-between print:break-inside-avoid">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-800 mb-1">
                    <span>1. การบรรลุเป้าหมายคัดกรอง</span>
                    <Target className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-indigo-950">
                      {activeHeadlineModel.totalTarget > 0
                        ? `${activeHeadlineModel.achievementPct.toFixed(1)}%`
                        : `${activeHeadlineModel.totalAchieved.toLocaleString()} คน`}
                    </span>
                    <span className="text-xs font-bold text-indigo-700">
                      ({activeHeadlineModel.totalAchieved.toLocaleString()} / {activeHeadlineModel.totalTarget.toLocaleString()} คน)
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-indigo-200/60 text-[11px] text-indigo-900 font-semibold flex items-center justify-between">
                  <span>ยอดตรวจสะสม: <strong>{activeHeadlineModel.totalVisits.toLocaleString()}</strong> ครั้ง</span>
                  <span>บรรลุ ≥80%: <strong>{activeHeadlineModel.achieved80Areas}</strong> พื้นที่</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between print:break-inside-avoid">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                    <span>2. กระบวนการติดตามต่อเนื่อง</span>
                    <Activity className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-emerald-950">
                      {activeHeadlineModel.retentionRate.toFixed(1)}%
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      (ติดตามซ้ำ {activeHeadlineModel.followUpPeopleCount.toLocaleString()} คน)
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-emerald-200/60 text-[11px] text-emerald-900 font-semibold flex items-center justify-between">
                  <span>ครั้งที่ 1: <strong>{activeHeadlineModel.v1Count}</strong> คน</span>
                  <span>ครั้งที่ 2+: <strong>{activeHeadlineModel.followUpVisitsTotal}</strong> ครั้ง</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/50 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between print:break-inside-avoid">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1">
                    <span>3. บรรลุแผนปรับพฤติกรรม 6 มิติ</span>
                    <ClipboardCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-amber-950">
                      {activeHeadlineModel.overallPlanSuccessPct}%
                    </span>
                    <span className="text-xs font-bold text-amber-800">
                      ({activeHeadlineModel.totalPlanAchieved}/{activeHeadlineModel.totalPlanSet} ข้อแผน)
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-amber-200/60 text-[11px] text-amber-900 font-semibold flex items-center justify-between">
                  <span>ผู้มีแผนรายบุคคล: <strong>{activeHeadlineModel.peopleWithPlanCount}</strong> คน</span>
                  <span>หลัก 3อ. 2ส. รายบุคคล</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50/90 to-fuchsia-50/50 border border-purple-200 rounded-2xl p-4 flex flex-col justify-between print:break-inside-avoid">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-1">
                    <span>4. ผลลัพธ์สุขภาพดีขึ้นหลังติดตาม</span>
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-purple-950">
                      {activeHeadlineModel.anyClinicalImprovedPct}%
                    </span>
                    <span className="text-xs font-bold text-purple-800">
                      ({activeHeadlineModel.anyClinicalImprovedCount}/{activeHeadlineModel.evaluatedCohortCount} คนที่ติดตาม)
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-purple-200/60 text-[11px] text-purple-900 font-semibold flex items-center justify-between">
                  <span>ความดันดีขึ้น: <strong>{activeHeadlineModel.bpImprovedPct}%</strong></span>
                  <span>น้ำตาลดีขึ้น: <strong>{activeHeadlineModel.sugarImprovedPct}%</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* NEW: MODEL & DISTRICT SUMMARY BY RISK CRITERIA (สำหรับรายงานการประชุม) */}
        {/* ===================================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5 print:rounded-2xl print:p-4 print:break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                ตารางสรุปภาพรวมรายโมเดล (หมู่บ้าน / ตำบล) แสดงจำนวนผู้ได้รับการคัดกรอง แยกตามเกณฑ์ความเสี่ยง
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                สรุปจำนวนผู้รับการคัดกรอง (คน) จำแนกตามเกณฑ์ความเสี่ยงรวม เกณฑ์ความดันโลหิตสูง (HT) เกณฑ์เบาหวาน (DM) และเกณฑ์ดัชนีมวลกาย (BMI)
              </p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => handleExportExcel()}
                className="text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>ดาวน์โหลดตารางนี้ (Excel)</span>
              </button>
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleExportPdf()}
                className="text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>ดาวน์โหลด PDF</span>
              </button>
            </div>
          </div>

          {/* Table A: Model Overview Risk Breakdown */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th rowSpan={2} className="py-3 px-3 font-black border-r border-slate-200">โมเดลโครงการ</th>
                  <th rowSpan={2} className="py-3 px-2.5 font-black text-center border-r border-slate-200">พื้นที่ (แห่ง)</th>
                  <th rowSpan={2} className="py-3 px-2.5 font-black text-center border-r border-slate-200">เป้าหมาย (คน)</th>
                  <th rowSpan={2} className="py-3 px-2.5 font-black text-center text-indigo-800 bg-indigo-50/50 border-r border-slate-200">คัดกรองได้ (คน / %)</th>
                  <th colSpan={3} className="py-2 px-3 font-black text-center bg-slate-200/70 border-b border-r border-slate-200">
                    จำแนกตามเกณฑ์ความเสี่ยงรวม (คน / %)
                  </th>
                  <th colSpan={3} className="py-2 px-3 font-black text-center bg-rose-50/80 text-rose-900 border-b border-r border-slate-200">
                    เกณฑ์ความดันโลหิตสูง HT (คน)
                  </th>
                  <th colSpan={3} className="py-2 px-3 font-black text-center bg-amber-50/80 text-amber-900 border-b border-r border-slate-200">
                    เกณฑ์โรคเบาหวาน DM (คน)
                  </th>
                  <th rowSpan={2} className="py-3 px-2.5 font-black text-center text-purple-800">
                    BMI ≥ 23 น้ำหนักเกิน (คน / %)
                  </th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px]">
                  <th className="py-2 px-2.5 font-bold text-center text-emerald-700">ปกติ (ขาว)</th>
                  <th className="py-2 px-2.5 font-bold text-center text-amber-700">เสี่ยงสูง (เขียวอ่อน)</th>
                  <th className="py-2 px-2.5 font-bold text-center text-rose-700 border-r border-slate-200">สงสัยป่วย (เหลือง-ดำ)</th>
                  <th className="py-2 px-2 font-bold text-center text-emerald-700">ปกติ</th>
                  <th className="py-2 px-2 font-bold text-center text-amber-700">เสี่ยง</th>
                  <th className="py-2 px-2 font-bold text-center text-rose-700 border-r border-slate-200">สงสัยป่วย</th>
                  <th className="py-2 px-2 font-bold text-center text-emerald-700">ปกติ</th>
                  <th className="py-2 px-2 font-bold text-center text-amber-700">เสี่ยง</th>
                  <th className="py-2 px-2 font-bold text-center text-rose-700 border-r border-slate-200">สงสัยป่วย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {(reportScope === "ตำบล"
                  ? [analytics.subdistrictModel]
                  : reportScope === "หมู่บ้าน"
                  ? [analytics.villageModel]
                  : [analytics.subdistrictModel, analytics.villageModel, analytics.overall]
                ).map((m) => {
                  const isTotal = m.modelName === "รวมทั้งโครงการ";
                  return (
                    <tr
                      key={m.modelName}
                      className={isTotal ? "bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300" : "hover:bg-slate-50"}
                    >
                      <td className="py-3 px-3 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          {!isTotal && (
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                m.modelName === "ตำบล" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              โมเดล{m.modelName}
                            </span>
                          )}
                          <span className="font-black text-slate-800">{isTotal ? "รวมทั้งโครงการ (ทุกโมเดล)" : m.modelLabel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-center border-r border-slate-100">
                        {m.activeAreas} / {m.totalAreas}
                      </td>
                      <td className="py-3 px-2.5 text-center border-r border-slate-100">
                        {m.totalTarget > 0 ? m.totalTarget.toLocaleString() : "-"}
                      </td>
                      <td className="py-3 px-2.5 text-center bg-indigo-50/30 border-r border-slate-100">
                        <span className="font-black text-indigo-700 text-sm">{m.totalAchieved.toLocaleString()}</span>
                        {m.totalTarget > 0 && (
                          <span className="text-[11px] text-slate-500 ml-1">({m.achievementPct.toFixed(1)}%)</span>
                        )}
                      </td>
                      <td className="py-3 px-2.5 text-center text-emerald-700">
                        {m.normalCount.toLocaleString()} <span className="text-[10px] text-slate-400">({m.normalPct}%)</span>
                      </td>
                      <td className="py-3 px-2.5 text-center text-amber-700">
                        {m.riskCount.toLocaleString()} <span className="text-[10px] text-slate-400">({m.riskPct}%)</span>
                      </td>
                      <td className="py-3 px-2.5 text-center text-rose-700 border-r border-slate-100">
                        {m.dangerCount.toLocaleString()} <span className="text-[10px] text-slate-400">({m.dangerPct}%)</span>
                      </td>
                      <td className="py-3 px-2 text-center text-emerald-700">{m.htNormalCount.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-amber-700">{m.htRiskCount.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-rose-700 border-r border-slate-100">{m.htDangerCount.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-emerald-700">{m.dmNormalCount.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-amber-700">{m.dmRiskCount.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-rose-700 border-r border-slate-100">{m.dmDangerCount.toLocaleString()}</td>
                      <td className="py-3 px-2.5 text-center text-purple-700">
                        {m.bmiOverweightCount.toLocaleString()} <span className="text-[10px] text-slate-400">({m.bmiOverweightPct}%)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table B: District-Level Summary Separated by Model & Risk Criteria (สำหรับนำเสนอผลงานระดับอำเภอ) */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                สรุปผลงานระดับอำเภอ แยกรายโมเดลและเกณฑ์ความเสี่ยง (สำหรับรายงานการประชุมระดับอำเภอ)
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">
                จำแนกตามอำเภอและโมเดล ({filteredDistrictRows.length} กลุ่มพื้นที่)
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="py-2.5 px-3 font-bold">อำเภอ</th>
                    <th className="py-2.5 px-3 font-bold">โมเดล</th>
                    <th className="py-2.5 px-2.5 font-bold text-center">พื้นที่ (แห่ง)</th>
                    <th className="py-2.5 px-2.5 font-bold text-center">เป้าหมาย (คน)</th>
                    <th className="py-2.5 px-2.5 font-bold text-center text-indigo-700">คัดกรองแล้ว (คน / %)</th>
                    <th className="py-2.5 px-2.5 font-bold text-center">รวมตรวจ (ครั้ง)</th>
                    <th className="py-2.5 px-2.5 font-bold text-center text-emerald-700 bg-emerald-50/40">กลุ่มปกติ (คน / %)</th>
                    <th className="py-2.5 px-2.5 font-bold text-center text-amber-700 bg-amber-50/40">กลุ่มเสี่ยงสูง (คน / %)</th>
                    <th className="py-2.5 px-2.5 font-bold text-center text-rose-700 bg-rose-50/40">กลุ่มสงสัยป่วย (คน / %)</th>
                    <th className="py-2.5 px-2.5 font-bold text-center">HT (ปกติ/เสี่ยง/ป่วย)</th>
                    <th className="py-2.5 px-2.5 font-bold text-center">DM (ปกติ/เสี่ยง/ป่วย)</th>
                    <th className="py-2.5 px-2.5 font-bold text-center text-teal-700">% ติดตามซ้ำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {filteredDistrictRows.map((r) => (
                    <tr key={r.key} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-black text-slate-800">อ.{r.district}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            r.modelType === "ตำบล" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          โมเดล{r.modelType}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center">{r.activeAreas}/{r.totalAreas}</td>
                      <td className="py-2.5 px-2.5 text-center">{r.target > 0 ? r.target.toLocaleString() : "-"}</td>
                      <td className="py-2.5 px-2.5 text-center font-black text-indigo-700">
                        {r.achieved.toLocaleString()}
                        {r.target > 0 && <span className="text-[10px] text-slate-500 ml-1">({r.achievementPct.toFixed(1)}%)</span>}
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-slate-700">{r.totalVisits.toLocaleString()}</td>
                      <td className="py-2.5 px-2.5 text-center text-emerald-700 bg-emerald-50/20">
                        {r.normalCount} <span className="text-[10px]">({r.normalPct}%)</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-amber-700 bg-amber-50/20">
                        {r.riskCount} <span className="text-[10px]">({r.riskPct}%)</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-rose-700 bg-rose-50/20">
                        {r.dangerCount} <span className="text-[10px]">({r.dangerPct}%)</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-[11px]">
                        <span className="text-emerald-700">{r.htNormalCount}</span>/
                        <span className="text-amber-700">{r.htRiskCount}</span>/
                        <span className="text-rose-700">{r.htDangerCount}</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-[11px]">
                        <span className="text-emerald-700">{r.dmNormalCount}</span>/
                        <span className="text-amber-700">{r.dmRiskCount}</span>/
                        <span className="text-rose-700">{r.dmDangerCount}</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-bold text-teal-700">
                        {r.followUpRate > 0 ? `${r.followUpRate.toFixed(1)}%` : "0%"}
                      </td>
                    </tr>
                  ))}
                  {filteredDistrictRows.length > 0 && (
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td className="py-2.5 px-3 font-black text-slate-900" colSpan={2}>
                        รวมทั้งหมด ({filteredDistrictRows.length} กลุ่มพื้นที่)
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        {activeHeadlineModel.activeAreas}/{activeHeadlineModel.totalAreas}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        {activeHeadlineModel.totalTarget > 0 ? activeHeadlineModel.totalTarget.toLocaleString() : "-"}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-black text-indigo-700">
                        {activeHeadlineModel.totalAchieved.toLocaleString()}
                        {activeHeadlineModel.totalTarget > 0 && (
                          <span className="text-[10px] text-slate-500 ml-1">({activeHeadlineModel.achievementPct.toFixed(1)}%)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-slate-800">{activeHeadlineModel.totalVisits.toLocaleString()}</td>
                      <td className="py-2.5 px-2.5 text-center text-emerald-700 bg-emerald-50/40">
                        {activeHeadlineModel.normalCount.toLocaleString()} <span className="text-[10px]">({activeHeadlineModel.normalPct}%)</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-amber-700 bg-amber-50/40">
                        {activeHeadlineModel.riskCount.toLocaleString()} <span className="text-[10px]">({activeHeadlineModel.riskPct}%)</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-rose-700 bg-rose-50/40">
                        {activeHeadlineModel.dangerCount.toLocaleString()} <span className="text-[10px]">({activeHeadlineModel.dangerPct}%)</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-[11px]">
                        <span className="text-emerald-700">{activeHeadlineModel.htNormalCount.toLocaleString()}</span>/
                        <span className="text-amber-700">{activeHeadlineModel.htRiskCount.toLocaleString()}</span>/
                        <span className="text-rose-700">{activeHeadlineModel.htDangerCount.toLocaleString()}</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-[11px]">
                        <span className="text-emerald-700">{activeHeadlineModel.dmNormalCount.toLocaleString()}</span>/
                        <span className="text-amber-700">{activeHeadlineModel.dmRiskCount.toLocaleString()}</span>/
                        <span className="text-rose-700">{activeHeadlineModel.dmDangerCount.toLocaleString()}</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-black text-teal-700">
                        {activeHeadlineModel.retentionRate > 0 ? `${activeHeadlineModel.retentionRate.toFixed(1)}%` : "0%"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SECTION 2: 5-STAGE PROCESS & CARE CONTINUUM (กระบวนการดำเนินงาน 5 ขั้นตอน) */}
        {/* ===================================================================== */}
        {showProcessSection && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs print:rounded-2xl print:p-4 print:break-inside-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  ส่วนที่ 2: กระบวนการดำเนินงานสู่การบรรลุเป้าหมายและผลลัพธ์ (5-Stage Implementation & Care Process)
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  แสดงกลไกการขับเคลื่อนโครงการตั้งแต่การเตรียมพื้นที่ การคัดกรองแรกรับ การชี้เป้าความเสี่ยง การจัดทำแผนรายบุคคล จนถึงการวัดผลลัพธ์สุขภาพ
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 shrink-0">
                ห่วงโซ่คุณค่าการดำเนินงาน (Value Chain)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white px-2 py-0.5 rounded">
                      ระยะที่ 1: ต้นน้ำ
                    </span>
                    <span className="text-xs font-black text-slate-400">01</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800">
                    การเตรียมพื้นที่และกลไกเครือข่าย
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    ขับเคลื่อน 2 โมเดล (ตำบล/หมู่บ้าน) ร่วมกับคณะทำงานและแกนนำสุขภาพในชุมชน
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">พื้นที่ดำเนินการ:</span>
                    <strong className="text-slate-800">{activeHeadlineModel.activeAreas}/{activeHeadlineModel.totalAreas} แห่ง</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">กลุ่มเป้าหมาย:</span>
                    <strong className="text-blue-700">{activeHeadlineModel.targetGroupUnique.toLocaleString()} คน</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">คณะทำงาน:</span>
                    <strong className="text-purple-700">{activeHeadlineModel.committeeUnique.toLocaleString()} คน</strong>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-3.5 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                      ระยะที่ 2: คัดกรอง
                    </span>
                    <span className="text-xs font-black text-blue-300">02</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800">
                    การคัดกรองเชิงรุกแรกรับ (ครั้งที่ 1)
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    ตรวจวัดความดันโลหิต น้ำตาลปลายนิ้ว (DTX) ดัชนีมวลกาย (BMI) และประเมินปิงปอง 7 สี
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-blue-200/70 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">คัดกรองแรกรับ:</span>
                    <strong className="text-blue-800">{activeHeadlineModel.v1Count.toLocaleString()} คน</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ค่าเฉลี่ย SBP/DTX:</span>
                    <strong className="text-slate-800">{activeHeadlineModel.avgBpSys} / {activeHeadlineModel.avgSugar}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">BMI เกินเกณฑ์:</span>
                    <strong className="text-amber-700">{activeHeadlineModel.bmiOverweightPct}%</strong>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white px-2 py-0.5 rounded">
                      ระยะที่ 3: ชี้เป้าเสี่ยง
                    </span>
                    <span className="text-xs font-black text-amber-300">03</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800">
                    จำแนกกลุ่มเสี่ยง & พฤติกรรม 3อ. 2ส.
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    วิเคราะห์ระดับความเสี่ยงรายบุคคลและค้นหาพฤติกรรมเสี่ยงหลัก (หวาน มัน เค็ม ออกกำลังกาย)
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-amber-200/70 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">กลุ่มปกติ:</span>
                    <strong className="text-emerald-700">{activeHeadlineModel.normalCount} คน ({activeHeadlineModel.normalPct}%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">กลุ่มเสี่ยงสูง:</span>
                    <strong className="text-amber-700">{activeHeadlineModel.riskCount} คน ({activeHeadlineModel.riskPct}%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">กลุ่มสงสัยป่วย:</span>
                    <strong className="text-rose-700">{activeHeadlineModel.dangerCount} คน ({activeHeadlineModel.dangerPct}%)</strong>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-3.5 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded">
                      ระยะที่ 4: ปรับพฤติกรรม
                    </span>
                    <span className="text-xs font-black text-indigo-300">04</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800">
                    แผนปรับเปลี่ยนพฤติกรรมรายบุคคล
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    จัดทำข้อตกลงและแผนปฏิบัติรายบุคคล 6 ด้าน (ลดหวาน ลดมัน ลดเค็ม นอน ดื่มน้ำ ออกกำลังกาย)
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-indigo-200/70 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">ผู้มีแผนปฏิบัติ:</span>
                    <strong className="text-indigo-800">{activeHeadlineModel.peopleWithPlanCount.toLocaleString()} คน</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">บรรลุเป้าหมายแผน:</span>
                    <strong className="text-emerald-700">{activeHeadlineModel.overallPlanSuccessPct}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ข้อแผนสำเร็จ:</span>
                    <strong className="text-slate-800">{activeHeadlineModel.totalPlanAchieved}/{activeHeadlineModel.totalPlanSet} ข้อ</strong>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded">
                      ระยะที่ 5: ปลายน้ำ
                    </span>
                    <span className="text-xs font-black text-emerald-300">05</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-800">
                    ติดตามประเมินซ้ำ & วัดผลลดโรค
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    ตรวจติดตามซ้ำครั้งที่ 2, 3, 4+ เพื่อประเมินการลดลงของความดัน น้ำตาล และความเสี่ยงสุขภาพ
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-200/70 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">ตรวจซ้ำ (ครั้งที่ 2+):</span>
                    <strong className="text-indigo-700">{activeHeadlineModel.v2Count} / {activeHeadlineModel.v3Count} / {activeHeadlineModel.v4PlusCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ผลสุขภาพดีขึ้น:</span>
                    <strong className="text-emerald-800">{activeHeadlineModel.anyClinicalImprovedCount} คน ({activeHeadlineModel.anyClinicalImprovedPct}%)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ลดระดับความเสี่ยง:</span>
                    <strong className="text-teal-700">{activeHeadlineModel.riskReducedCount} คน ({activeHeadlineModel.riskReducedPct}%)</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* SECTION 4: DETAILED REPORT SEPARATED BY MODEL (รายงานแยกรายโมเดล)        */}
        {/* ===================================================================== */}
        {modelsToRender.map((m, modelIdx) => {
          const isSubdistrict = m.modelName === "ตำบล";
          const themeBadge = isSubdistrict ? "bg-purple-600 text-white" : "bg-blue-600 text-white";
          const themeBorder = isSubdistrict ? "border-purple-200" : "border-blue-200";
          const themeHeaderBg = isSubdistrict
            ? "from-purple-50 via-white to-indigo-50/40"
            : "from-blue-50 via-white to-cyan-50/40";

          return (
            <div
              key={m.modelName}
              className={`bg-white rounded-3xl border ${themeBorder} p-6 shadow-xs space-y-5 print:rounded-2xl print:p-4 ${
                modelIdx > 0 && pageBreakPerModel ? "print:break-before-page" : ""
              }`}
            >
              {/* Model Section Header */}
              <div className={`bg-gradient-to-r ${themeHeaderBg} p-4 sm:p-5 rounded-2xl border ${themeBorder} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                <div className="flex items-start gap-3">
                  <div className={`${themeBadge} p-3 rounded-2xl shadow-xs shrink-0`}>
                    {isSubdistrict ? <Building2 className="w-6 h-6" /> : <Home className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${themeBadge}`}>
                        รายงานสรุปผลแยกรายโมเดล #{modelIdx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        พื้นที่เป้าหมายทั้งหมด {m.totalAreas} แห่ง (ดำเนินการแล้ว {m.activeAreas} แห่ง)
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                      ผลการดำเนินงานและการคัดกรองแยกตามเกณฑ์ความเสี่ยง — {m.modelLabel}
                    </h2>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      ผู้รับการคัดกรองสะสม {m.totalAchieved.toLocaleString()} คน (กลุ่มเป้าหมาย {m.targetGroupUnique.toLocaleString()} คน • คณะทำงาน {m.committeeUnique.toLocaleString()} คน) • รวม {m.totalVisits.toLocaleString()} ครั้ง
                    </p>
                  </div>
                </div>

                {/* Quick Export per Model + Progress Summary Pill */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <div className="flex items-center gap-1.5 print:hidden">
                    <button
                      type="button"
                      onClick={() => handleExportExcel(m.modelName as "ตำบล" | "หมู่บ้าน")}
                      className="text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Excel โมเดล{m.modelName}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingPdf}
                      onClick={() => handleExportPdf(m.modelName as "ตำบล" | "หมู่บ้าน")}
                      className="text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-rose-600" />
                      <span>PDF โมเดล{m.modelName}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">บรรลุเป้าโมเดล{m.modelName}</div>
                      <div className="text-lg font-black text-slate-900">
                        {m.totalTarget > 0 ? `${m.achievementPct.toFixed(1)}%` : `${m.totalAchieved.toLocaleString()} คน`}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {m.totalAchieved.toLocaleString()} / {m.totalTarget.toLocaleString()} คน
                      </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">ติดตามซ้ำ</div>
                      <div className="text-lg font-black text-teal-700">
                        {m.retentionRate.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {m.followUpPeopleCount.toLocaleString()} คน
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Health & Behavioral Outcomes Sub-cards */}
              {showOutcomeSection && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3 print:break-inside-avoid">
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-rose-600" />
                      1. จำนวนผู้รับการคัดกรองแยกตามเกณฑ์ความเสี่ยง ({m.modelName})
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">กลุ่มปกติ</div>
                        <div className="text-sm font-black text-emerald-700">{m.normalCount} คน</div>
                        <div className="text-[10px] text-emerald-600 font-bold">{m.normalPct}%</div>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">กลุ่มเสี่ยงสูง</div>
                        <div className="text-sm font-black text-amber-700">{m.riskCount} คน</div>
                        <div className="text-[10px] text-amber-600 font-bold">{m.riskPct}%</div>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold">สงสัยป่วย</div>
                        <div className="text-sm font-black text-rose-700">{m.dangerCount} คน</div>
                        <div className="text-[10px] text-rose-600 font-bold">{m.dangerPct}%</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span>เกณฑ์ความดัน (HT ปกติ/เสี่ยง/สงสัยป่วย):</span>
                        <strong className="text-slate-800">{m.htNormalCount} / {m.htRiskCount} / {m.htDangerCount} คน</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>เกณฑ์เบาหวาน (DM ปกติ/เสี่ยง/สงสัยป่วย):</span>
                        <strong className="text-slate-800">{m.dmNormalCount} / {m.dmRiskCount} / {m.dmDangerCount} คน</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>รอบเอวเฉลี่ย / อ้วนลงพุง (เกินเกณฑ์):</span>
                        <strong className="text-violet-700">
                          {m.waistRecordedCount > 0
                            ? `${m.avgWaist} นิ้ว / ${m.waistExceedCount} คน (${m.waistExceedPct}%)`
                            : "รอระบุข้อมูลรอบเอว"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>การดื่มน้ำเปล่า (เพียงพอ ≥6 แก้ว / ดื่มน้อย &lt;6 แก้ว):</span>
                        <strong className="text-cyan-700">
                          {m.adequateWaterCount} คน ({m.adequateWaterPct}%) / {m.lowWaterCount} คน ({m.lowWaterPct}%)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>ผู้ติดตามที่ผลความดัน/น้ำตาล/BMI ดีขึ้น:</span>
                        <strong className="text-emerald-700">{m.anyClinicalImprovedCount}/{m.evaluatedCohortCount} คน ({m.anyClinicalImprovedPct}%)</strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                        2. ประสิทธิผลแผนปรับพฤติกรรม 6 มิติ ({m.modelName})
                      </h4>
                      <span className="text-[11px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                        สำเร็จรวม {m.overallPlanSuccessPct}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                      {m.pillars.map((p) => (
                        <div key={p.key} className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                          <span className="text-slate-600 font-semibold truncate">{p.label}</span>
                          <span className="font-black text-indigo-700 ml-1">{p.pct}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold pt-0.5">
                      ประเมินจากผู้มีแผนปรับพฤติกรรม {m.peopleWithPlanCount} คน (ปฏิบัติสำเร็จ {m.totalPlanAchieved} จาก {m.totalPlanSet} ข้อแผน)
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      3. พื้นที่ผลงานเด่น & พื้นที่เร่งรัด ({m.modelName})
                    </h4>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="font-bold text-emerald-800">พื้นที่ผลงานเด่น (Top Performers):</div>
                      {m.topAreas.length === 0 ? (
                        <div className="text-slate-400 text-[11px]">ยังไม่มีข้อมูลผลงานในโมเดลนี้</div>
                      ) : (
                        m.topAreas.map((a, i) => (
                          <div key={a.key} className="flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border border-emerald-200/80">
                            <span className="font-bold text-slate-800 truncate">
                              {i + 1}. {a.area} <span className="text-slate-400 font-normal">(อ.{a.district})</span>
                            </span>
                            <span className="font-black text-emerald-700 shrink-0 ml-2">
                              {a.achieved} คน {a.target > 0 ? `(${a.realPercent.toFixed(0)}%)` : `(${a.totalVisits} ครั้ง)`}
                            </span>
                          </div>
                        ))
                      )}

                      {m.priorityAreas.length > 0 && (
                        <>
                          <div className="font-bold text-rose-800 pt-1">พื้นที่ที่ควรเร่งรัด/สนับสนุนเพิ่มเติม:</div>
                          <div className="text-[11px] text-slate-600 bg-rose-50/70 border border-rose-200/80 rounded-lg px-2.5 py-1.5">
                            {m.priorityAreas.map((a) => `${a.area} (อ.${a.district})`).join(", ")}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })}

        {/* ===================================================================== */}
        {/* SECTION 5: EXECUTIVE STRATEGIC SYNTHESIS & RECOMMENDATIONS             */}
        {/* ===================================================================== */}
        <div className="bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50/40 rounded-3xl border border-indigo-200 p-6 shadow-xs space-y-4 print:rounded-2xl print:p-4 print:break-inside-avoid">
          <div className="flex items-center gap-2.5 border-b border-indigo-200/60 pb-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                ส่วนที่ 5: บทสังเคราะห์ผู้บริหารและข้อเสนอแนะเชิงกลยุทธ์เพื่อการขับเคลื่อน (Executive Synthesis & Actionable Insights)
              </h2>
              <p className="text-xs text-slate-600 font-semibold">
                สรุปประเด็นสำคัญเพื่อประกอบการตัดสินใจสั่งการและติดตามกำกับงานระดับจังหวัด/อำเภอ/ตำบล
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs print:grid-cols-2">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-black text-indigo-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                1. สรุปความก้าวหน้าการบรรลุเป้าหมายและผลงานเด่น
              </h4>
              <ul className="space-y-1.5 text-slate-700 list-disc pl-4 leading-relaxed font-medium">
                <li>
                  <strong>ภาพรวมผลงานคัดกรอง:</strong> ดำเนินการคัดกรองสะสมแล้ว{" "}
                  <strong className="text-slate-900">{activeHeadlineModel.totalAchieved.toLocaleString()} คน</strong> (รวม{" "}
                  <strong className="text-slate-900">{activeHeadlineModel.totalVisits.toLocaleString()} ครั้ง</strong>){" "}
                  {activeHeadlineModel.totalTarget > 0 && (
                    <>
                      คิดเป็นร้อยละ <strong className="text-indigo-700">{activeHeadlineModel.achievementPct.toFixed(1)}%</strong> ของเป้าหมาย ({activeHeadlineModel.totalTarget.toLocaleString()} คน)
                    </>
                  )}
                </li>
                {reportScope === "all_separated" && (
                  <li>
                    <strong>เปรียบเทียบรายโมเดล:</strong> โมเดลตำบลคัดกรองได้{" "}
                    <strong className="text-purple-700">{analytics.subdistrictModel.totalAchieved.toLocaleString()} คน</strong> ({analytics.subdistrictModel.totalVisits.toLocaleString()} ครั้ง) และโมเดลหมู่บ้านคัดกรองได้{" "}
                    <strong className="text-blue-700">{analytics.villageModel.totalAchieved.toLocaleString()} คน</strong> ({analytics.villageModel.totalVisits.toLocaleString()} ครั้ง)
                  </li>
                )}
                <li>
                  <strong>ความต่อเนื่องในการติดตาม (Retention):</strong> มีผู้ได้รับการตรวจติดตามซ้ำตั้งแต่ครั้งที่ 2 ขึ้นไปจำนวน{" "}
                  <strong className="text-teal-700">{activeHeadlineModel.followUpPeopleCount.toLocaleString()} คน</strong> คิดเป็นอัตราการติดตามต่อเนื่อง{" "}
                  <strong className="text-teal-700">{activeHeadlineModel.retentionRate.toFixed(1)}%</strong>
                </li>
                <li>
                  <strong>ประสิทธิผลของการปรับเปลี่ยนพฤติกรรม:</strong> ผู้เข้าร่วมโครงการที่ได้รับการติดตามซ้ำมีผลลัพธ์ทางคลินิก (ความดันโลหิต / น้ำตาลในเลือด / BMI / ระดับสีความเสี่ยง) ดีขึ้นถึง{" "}
                  <strong className="text-emerald-700">{activeHeadlineModel.anyClinicalImprovedPct}%</strong> ({activeHeadlineModel.anyClinicalImprovedCount} คน)
                </li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-black text-indigo-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                2. ประเด็นความเสี่ยงสำคัญและข้อเสนอแนะเชิงบริหารระยะถัดไป
              </h4>
              <ul className="space-y-1.5 text-slate-700 list-disc pl-4 leading-relaxed font-medium">
                <li>
                  <strong>การจัดการกลุ่มเสี่ยงและกลุ่มสงสัยป่วย:</strong> พบกลุ่มเสี่ยงสูงร้อยละ{" "}
                  <strong className="text-amber-700">{activeHeadlineModel.riskPct}%</strong> ({activeHeadlineModel.riskCount} คน) และกลุ่มสงสัยป่วยร้อยละ{" "}
                  <strong className="text-rose-700">{activeHeadlineModel.dangerPct}%</strong> ({activeHeadlineModel.dangerCount} คน) ซึ่งต้องเน้นย้ำการติดตามตามแผนรายบุคคลและการส่งต่อพบแพทย์ในกลุ่มสีแดง/ส้ม
                </li>
                <li>
                  <strong>ปัจจัยเสี่ยงพฤติกรรม 3อ. 2ส. สูงสุดในพื้นที่:</strong>{" "}
                  {activeHeadlineModel.topBehaviors.length > 0
                    ? activeHeadlineModel.topBehaviors
                        .slice(0, 3)
                        .map((b) => `${b.name} (${b.pct}%)`)
                        .join(", ")
                    : "ยังไม่มีข้อมูลพฤติกรรมเสี่ยง"}{" "}
                  ควรจัดกิจกรรมรณรงค์ลดหวาน-มัน-เค็ม และส่งเสริมการออกกำลังกายในชุมชนอย่างต่อเนื่อง
                </li>
                <li>
                  <strong>ข้อเสนอแนะการเร่งรัดเป้าหมาย:</strong>{" "}
                  {activeHeadlineModel.remainingGap > 0 ? (
                    <>
                      ยังขาดอีก <strong className="text-rose-700">{activeHeadlineModel.remainingGap.toLocaleString()} คน</strong> จึงจะครบตามเป้าหมายที่ตั้งไว้ ควรสนับสนุนทีม อสม. และคณะทำงานลงเก็บตกในพื้นที่ที่มีความก้าวหน้าต่ำกว่า 50% ({activeHeadlineModel.under50Areas} พื้นที่)
                    </>
                  ) : (
                    <>
                      พื้นที่ที่มีผลงานคัดกรองแรกรับครอบคลุมแล้ว ควรปรับจุดเน้นสู่การติดตามประเมินผลซ้ำครั้งที่ 2 และ 3 ให้ครอบคลุมกลุ่มเสี่ยง 100%
                    </>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* HIDDEN HEX-STYLED A4 PDF RENDERING TEMPLATE (Safe for html2canvas)    */}
      {/* ===================================================================== */}
      <div style={{ position: "absolute", top: "-99999px", left: "-99999px", pointerEvents: "none" }}>
        <div
          ref={pdfContainerRef}
          style={{
            width: "794px",
            padding: "32px 36px",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            fontFamily: '"Sarabun", "Kanit", system-ui, -apple-system, sans-serif',
            fontSize: "11px",
            lineHeight: "1.45",
            boxSizing: "border-box"
          }}
        >
          {/* PDF Header */}
          <div style={{ borderBottom: "2.5px solid #1e3a8a", paddingBottom: "12px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "inline-block", backgroundColor: "#e0e7ff", color: "#1e3a8a", fontWeight: 800, fontSize: "10px", padding: "3px 8px", borderRadius: "4px", marginBottom: "4px" }}>
                เอกสารประกอบการประชุมและการนำเสนอผลงานระดับอำเภอ / จังหวัด
              </div>
              <h1 style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a", margin: "2px 0" }}>
                รายงานสรุปผลการคัดกรองและการติดตามโครงการ แยกรายโมเดลและเกณฑ์ความเสี่ยง
              </h1>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e40af" }}>
                โครงการลดโรค NCDs ด้วยแผนปรับเปลี่ยนพฤติกรรมรายบุคคล “Mini Flag Ship Satun”
              </div>
            </div>
            <div style={{ textAlign: "right", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 10px", fontSize: "10px" }}>
              <div><strong>ข้อมูล ณ วันที่:</strong> {todayThai}</div>
              <div><strong>ขอบเขตรายงาน:</strong> {activeHeadlineModel.modelLabel}</div>
              <div><strong>จำนวนพื้นที่:</strong> {activeHeadlineModel.activeAreas}/{activeHeadlineModel.totalAreas} แห่ง</div>
            </div>
          </div>

          {/* PDF KPI Summary Boxes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "14px" }}>
            <div style={{ backgroundColor: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "8px", padding: "8px 10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#3730a3" }}>1. ผู้ได้รับการคัดกรองสะสม</div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#1e1b4b", marginTop: "2px" }}>
                {activeHeadlineModel.totalAchieved.toLocaleString()} คน
              </div>
              <div style={{ fontSize: "9.5px", color: "#4338ca" }}>
                เป้าหมาย {activeHeadlineModel.totalTarget.toLocaleString()} คน ({activeHeadlineModel.achievementPct.toFixed(1)}%) • {activeHeadlineModel.totalVisits.toLocaleString()} ครั้ง
              </div>
            </div>

            <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "8px 10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#065f46" }}>2. กลุ่มปกติ (ไม่พบความเสี่ยง)</div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#064e3b", marginTop: "2px" }}>
                {activeHeadlineModel.normalCount.toLocaleString()} คน ({activeHeadlineModel.normalPct}%)
              </div>
              <div style={{ fontSize: "9.5px", color: "#047857" }}>
                HT ปกติ {activeHeadlineModel.htNormalCount} คน • DM ปกติ {activeHeadlineModel.dmNormalCount} คน
              </div>
            </div>

            <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#92400e" }}>3. กลุ่มเสี่ยงสูง (ต้องปรับพฤติกรรม)</div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#78350f", marginTop: "2px" }}>
                {activeHeadlineModel.riskCount.toLocaleString()} คน ({activeHeadlineModel.riskPct}%)
              </div>
              <div style={{ fontSize: "9.5px", color: "#b45309" }}>
                HT เสี่ยง {activeHeadlineModel.htRiskCount} คน • DM เสี่ยง {activeHeadlineModel.dmRiskCount} คน
              </div>
            </div>

            <div style={{ backgroundColor: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", padding: "8px 10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#9f1239" }}>4. กลุ่มสงสัยป่วย (ติดตามเข้มข้น)</div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#881337", marginTop: "2px" }}>
                {activeHeadlineModel.dangerCount.toLocaleString()} คน ({activeHeadlineModel.dangerPct}%)
              </div>
              <div style={{ fontSize: "9.5px", color: "#be123c" }}>
                HT สูง {activeHeadlineModel.htDangerCount} คน • DM สูง {activeHeadlineModel.dmDangerCount} คน
              </div>
            </div>
          </div>

          {/* PDF Table 1: สรุปภาพรวมรายโมเดล แยกตามเกณฑ์ความเสี่ยง */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#1e3a8a", marginBottom: "6px" }}>
              ส่วนที่ 1: ตารางสรุปภาพรวมรายโมเดล (ตำบล / หมู่บ้าน) แสดงผลจำนวนผู้ได้รับการคัดกรอง แยกตามเกณฑ์ความเสี่ยง
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", border: "1px solid #cbd5e1" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", color: "#0f172a" }}>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>โมเดลโครงการ</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>พื้นที่</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>เป้าหมาย</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center", backgroundColor: "#eef2ff", color: "#312e81" }}>คัดกรองได้ (คน/%)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center", color: "#047857" }}>ปกติ (คน/%)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center", color: "#b45309" }}>เสี่ยงสูง (คน/%)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center", color: "#be123c" }}>สงสัยป่วย (คน/%)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>ความดัน HT (ป/ส/ป่วย)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>เบาหวาน DM (ป/ส/ป่วย)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>BMI ≥23</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>% ติดตามซ้ำ</th>
                </tr>
              </thead>
              <tbody>
                {(reportScope === "ตำบล"
                  ? [analytics.subdistrictModel]
                  : reportScope === "หมู่บ้าน"
                  ? [analytics.villageModel]
                  : [analytics.subdistrictModel, analytics.villageModel, analytics.overall]
                ).map((m) => {
                  const isTotal = m.modelName === "รวมทั้งโครงการ";
                  return (
                    <tr key={m.modelName} style={{ backgroundColor: isTotal ? "#e2e8f0" : "#ffffff", fontWeight: isTotal ? 800 : 600 }}>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>{m.modelLabel}</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>{m.activeAreas}/{m.totalAreas}</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>{m.totalTarget > 0 ? m.totalTarget.toLocaleString() : "-"}</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center", fontWeight: 800, color: "#312e81" }}>
                        {m.totalAchieved.toLocaleString()} {m.totalTarget > 0 ? `(${m.achievementPct.toFixed(1)}%)` : ""}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center", color: "#047857" }}>
                        {m.normalCount} ({m.normalPct}%)
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center", color: "#b45309" }}>
                        {m.riskCount} ({m.riskPct}%)
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center", color: "#be123c" }}>
                        {m.dangerCount} ({m.dangerPct}%)
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>
                        {m.htNormalCount} / {m.htRiskCount} / {m.htDangerCount}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>
                        {m.dmNormalCount} / {m.dmRiskCount} / {m.dmDangerCount}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center" }}>
                        {m.bmiOverweightCount} ({m.bmiOverweightPct}%)
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "5px 4px", textAlign: "center", color: "#0f766e", fontWeight: 700 }}>
                        {m.retentionRate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PDF Table 2: สรุปผลงานระดับอำเภอ แยกรายโมเดลและเกณฑ์ความเสี่ยง */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#1e3a8a", marginBottom: "6px" }}>
              ส่วนที่ 2: สรุปผลการคัดกรองระดับอำเภอ แยกรายโมเดลและเกณฑ์ความเสี่ยง (สำหรับรายงานการประชุมระดับอำเภอ)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5px", border: "1px solid #cbd5e1" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", color: "#0f172a" }}>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px 6px", textAlign: "left" }}>อำเภอ</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px 6px", textAlign: "left" }}>โมเดล</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>พื้นที่</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>เป้าหมาย</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>คัดกรอง (คน/%)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>รวม (ครั้ง)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#047857" }}>ปกติ (คน/%)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#b45309" }}>เสี่ยงสูง (คน/%)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#be123c" }}>สงสัยป่วย (คน/%)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>HT (ป/ส/ป่วย)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>DM (ป/ส/ป่วย)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>% ติดตาม</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistrictRows.map((r) => (
                  <tr key={r.key}>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px", fontWeight: 700 }}>อ.{r.district}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px" }}>โมเดล{r.modelType}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>{r.activeAreas}/{r.totalAreas}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>{r.target > 0 ? r.target.toLocaleString() : "-"}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", fontWeight: 700, color: "#312e81" }}>
                      {r.achieved.toLocaleString()} {r.target > 0 ? `(${r.achievementPct.toFixed(1)}%)` : ""}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>{r.totalVisits}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#047857" }}>{r.normalCount} ({r.normalPct}%)</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#b45309" }}>{r.riskCount} ({r.riskPct}%)</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#be123c" }}>{r.dangerCount} ({r.dangerPct}%)</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>{r.htNormalCount}/{r.htRiskCount}/{r.htDangerCount}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>{r.dmNormalCount}/{r.dmRiskCount}/{r.dmDangerCount}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#0f766e", fontWeight: 700 }}>{r.followUpRate.toFixed(1)}%</td>
                  </tr>
                ))}
                {filteredDistrictRows.length > 0 && (
                  <tr style={{ backgroundColor: "#e2e8f0", fontWeight: 800 }}>
                    <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "4px 6px" }}>
                      รวมทั้งหมด ({filteredDistrictRows.length} กลุ่มพื้นที่)
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                      {activeHeadlineModel.activeAreas}/{activeHeadlineModel.totalAreas}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                      {activeHeadlineModel.totalTarget > 0 ? activeHeadlineModel.totalTarget.toLocaleString() : "-"}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", fontWeight: 800, color: "#312e81" }}>
                      {activeHeadlineModel.totalAchieved.toLocaleString()}{" "}
                      {activeHeadlineModel.totalTarget > 0 ? `(${activeHeadlineModel.achievementPct.toFixed(1)}%)` : ""}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                      {activeHeadlineModel.totalVisits.toLocaleString()}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#047857" }}>
                      {activeHeadlineModel.normalCount} ({activeHeadlineModel.normalPct}%)
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#b45309" }}>
                      {activeHeadlineModel.riskCount} ({activeHeadlineModel.riskPct}%)
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#be123c" }}>
                      {activeHeadlineModel.dangerCount} ({activeHeadlineModel.dangerPct}%)
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                      {activeHeadlineModel.htNormalCount}/{activeHeadlineModel.htRiskCount}/{activeHeadlineModel.htDangerCount}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                      {activeHeadlineModel.dmNormalCount}/{activeHeadlineModel.dmRiskCount}/{activeHeadlineModel.dmDangerCount}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#0f766e", fontWeight: 800 }}>
                      {activeHeadlineModel.retentionRate.toFixed(1)}%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
