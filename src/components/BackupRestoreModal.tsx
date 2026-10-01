import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Filter, 
  Database, 
  FileText, 
  Layers, 
  MapPin, 
  Building, 
  Users, 
  Calendar, 
  Check, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  FileCheck
} from "lucide-react";
import { ScreeningRecord, DistrictType, LOCATION_DATA, DISTRICT_SUBDISTRICT_MAP, EXACT_LOCATION_LIST } from "../types";
import { formatThaiDate } from "../utils";

// Normalization Helpers
export const cleanDistrict = (d?: string): string => {
  if (!d) return "";
  let clean = d.replace(/^(อ\.|อำเภอ)/, "").trim();
  if (clean === "เมืองสตูล") clean = "เมือง";
  return clean;
};

export const cleanSubdistrict = (s?: string): string => {
  if (!s) return "";
  let clean = s.replace(/^(ต\.|ตำบล)/, "").trim();
  if (clean === "ปยู") clean = "ปูยู";
  if (clean === "คลอขุด") clean = "คลองขุด";
  return clean;
};

export const cleanTargetArea = (a?: string): string => {
  if (!a) return "";
  let clean = a.trim();
  // Remove suffix like (ต.xxx) or (xxx)
  clean = clean.replace(/\s*\([^)]*\)\s*$/, "").trim();
  // Remove prefix like "หมู่ที่ X" or "ม.X"
  clean = clean.replace(/^(หมู่ที่|หมู่|ม\.)\s*\d+\s*/, "").trim();
  // Remove prefix like "ชุมชน" or "บ้าน"
  clean = clean.replace(/^(ชุมชน|บ้าน)\s*/, "").trim();
  return clean;
};

export const matchesDistrictFilter = (recordDistrict?: string, filterDistricts: string[] = []): boolean => {
  if (!filterDistricts || filterDistricts.length === 0) return true;
  const recD = cleanDistrict(recordDistrict);
  return filterDistricts.some(fd => {
    if (fd === "all") return true;
    const cleanFd = cleanDistrict(fd);
    return cleanFd === recD || cleanFd === recordDistrict || fd === recordDistrict;
  });
};

export const matchesSubdistrictFilter = (recordSubdistrict?: string, filterSubdistricts: string[] = []): boolean => {
  if (!filterSubdistricts || filterSubdistricts.length === 0) return true;
  const recSub = cleanSubdistrict(recordSubdistrict);
  return filterSubdistricts.some(fs => {
    if (fs === "all") return true;
    const cleanFs = cleanSubdistrict(fs);
    return cleanFs === recSub || cleanFs === recordSubdistrict || fs === recordSubdistrict ||
      (cleanFs && recSub && (cleanFs.includes(recSub) || recSub.includes(cleanFs)));
  });
};

export const matchesTargetAreaFilter = (recordArea?: string, filterAreas: string[] = []): boolean => {
  if (!filterAreas || filterAreas.length === 0) return true;
  if (!recordArea) return false;
  const cleanRec = cleanTargetArea(recordArea);
  return filterAreas.some(fa => {
    if (fa === "all") return true;
    if (fa === recordArea) return true;
    const cleanFa = cleanTargetArea(fa);
    if (cleanFa && (cleanFa === cleanRec || cleanRec.includes(cleanFa) || cleanFa.includes(cleanRec))) return true;
    return false;
  });
};

export const matchesModelFilter = (record: Partial<ScreeningRecord>, filterModels: string[] = []): boolean => {
  if (!filterModels || filterModels.length === 0) return true;
  const model = getRecordModel(record);
  const rawModel = record.modelType || "";
  return filterModels.some(fm => {
    if (fm === "all") return true;
    if (fm === model) return true;
    if (rawModel && (rawModel.includes(fm) || fm.includes(rawModel))) return true;
    // Allow legacy records or general category to show when filtering
    if ((rawModel as any) === "ปิงปอง 7 สี" || (model as any) === "ทั่วไป") return true;
    return false;
  });
};

// Helper: Determine model for a record according to the official location table
export const getRecordModel = (r: Partial<ScreeningRecord>): "หมู่บ้าน" | "ตำบล" => {
  // 1. Prioritize official standard list from program table
  if (r.targetArea) {
    const cleanA = cleanTargetArea(r.targetArea);
    const matched = EXACT_LOCATION_LIST.find(item => 
      cleanTargetArea(item.targetArea) === cleanA ||
      r.targetArea === item.targetArea ||
      (cleanA && (cleanTargetArea(item.targetArea).includes(cleanA) || cleanA.includes(cleanTargetArea(item.targetArea))))
    );
    if (matched) {
      return matched.model;
    }
  }

  // 2. If explicitly set, respect it
  if (r.modelType === "หมู่บ้าน" || r.modelType === "ตำบล") {
    return r.modelType;
  }
  if (typeof r.modelType === "string" && r.modelType.includes("หมู่บ้าน")) {
    return "หมู่บ้าน";
  }
  if (typeof r.modelType === "string" && r.modelType.includes("ตำบล")) {
    return "ตำบล";
  }

  // 3. Check LOCATION_DATA mapping
  const sub = cleanSubdistrict(r.subdistrict || "");
  const dist = cleanDistrict(r.district);
  if (dist && r.targetArea) {
    const cleanA = cleanTargetArea(r.targetArea);
    const mbDistrict = (LOCATION_DATA["หมู่บ้าน"] as any)?.[dist];
    if (mbDistrict) {
      if (mbDistrict[sub]?.some((a: string) => cleanTargetArea(a) === cleanA || a.includes(cleanA))) return "หมู่บ้าน";
      for (const s of Object.keys(mbDistrict)) {
        if (mbDistrict[s]?.some((a: string) => cleanTargetArea(a) === cleanA || a.includes(cleanA))) return "หมู่บ้าน";
      }
    }
    const tbDistrict = (LOCATION_DATA["ตำบล"] as any)?.[dist];
    if (tbDistrict) {
      if (tbDistrict[sub]?.some((a: string) => cleanTargetArea(a) === cleanA || a.includes(cleanA))) return "ตำบล";
      for (const s of Object.keys(tbDistrict)) {
        if (tbDistrict[s]?.some((a: string) => cleanTargetArea(a) === cleanA || a.includes(cleanA))) return "ตำบล";
      }
    }
  }

  // 4. Keyword heuristic if model still undetermined
  const area = r.targetArea || "";
  if (area.includes("ม.") || area.includes("หมู่") || area.includes("บ้าน") || area.includes("ชุมชน")) {
    return "หมู่บ้าน";
  }
  if (area.includes("ตำบล") || area.includes("ต.")) {
    return "ตำบล";
  }

  return "หมู่บ้าน";
};

// Helper: Infer subdistrict if not explicitly saved
export const getRecordSubdistrict = (r: Partial<ScreeningRecord>): string => {
  if (r.subdistrict && r.subdistrict.trim() !== "") {
    return cleanSubdistrict(r.subdistrict);
  }
  if (!r.targetArea) return "";

  // 1. Check EXACT_LOCATION_LIST
  const cleanA = cleanTargetArea(r.targetArea);
  const matched = EXACT_LOCATION_LIST.find(item => 
    cleanTargetArea(item.targetArea) === cleanA ||
    r.targetArea === item.targetArea ||
    (cleanA && (cleanTargetArea(item.targetArea).includes(cleanA) || cleanA.includes(cleanTargetArea(item.targetArea))))
  );
  if (matched) {
    return matched.subdistrict;
  }
  
  const dist = cleanDistrict(r.district);
  // 2. Check comprehensive DISTRICT_SUBDISTRICT_MAP
  const distMap = DISTRICT_SUBDISTRICT_MAP[dist as DistrictType] || DISTRICT_SUBDISTRICT_MAP[r.district as DistrictType];
  if (distMap) {
    for (const [sub, areas] of Object.entries(distMap)) {
      if (areas.some(a => a === r.targetArea || r.targetArea?.includes(a) || a.includes(r.targetArea || ""))) {
        return sub;
      }
    }
  }

  // 3. Fallback to LOCATION_DATA
  for (const model of ["หมู่บ้าน", "ตำบล"] as const) {
    const distData = (LOCATION_DATA[model] as any)?.[dist] || (LOCATION_DATA[model] as any)?.[r.district];
    if (distData) {
      for (const [sub, areas] of Object.entries(distData)) {
        if ((areas as string[]).includes(r.targetArea)) {
          return sub;
        }
      }
    }
  }
  return "";
};

// Helper: Parse CSV formatted data into ScreeningRecord items
export const parseCsvToRecords = (csvText: string): Partial<ScreeningRecord>[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headerRow = parseLine(lines[0].replace(/^\uFEFF/, ""));
  const headerMap: Record<string, number> = {};
  headerRow.forEach((h, idx) => {
    headerMap[h.trim()] = idx;
    headerMap[h.trim().toLowerCase()] = idx;
  });

  const getCol = (cols: string[], ...names: string[]): string => {
    for (const name of names) {
      if (headerMap[name] !== undefined) return cols[headerMap[name]] || "";
      if (headerMap[name.toLowerCase()] !== undefined) return cols[headerMap[name.toLowerCase()]] || "";
    }
    return "";
  };

  const records: Partial<ScreeningRecord>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < 2) continue;
    const name = getCol(cols, "ชื่อ-นามสกุล", "ชื่อ", "name");
    if (!name) continue;

    const id = Number(getCol(cols, "ID", "id")) || (Date.now() + i);
    const date = getCol(cols, "วันที่ตรวจ", "date") || new Date().toLocaleDateString("th-TH");
    const visitNumber = Number(getCol(cols, "ครั้งที่", "visitNumber", "visit_number")) || 1;
    const age = Number(getCol(cols, "อายุ", "age")) || 0;
    const gender = (getCol(cols, "เพศ", "gender") === "หญิง" ? "หญิง" : "ชาย") as any;
    const phone = getCol(cols, "เบอร์โทร", "phone");
    const rawDistrict = getCol(cols, "อำเภอ", "district") || "เมือง";
    const district = (cleanDistrict(rawDistrict) || "เมือง") as DistrictType;
    const subdistrict = cleanSubdistrict(getCol(cols, "ตำบล", "subdistrict"));
    const targetArea = getCol(cols, "พื้นที่เป้าหมาย", "หมู่บ้าน", "targetArea");
    const weight = Number(getCol(cols, "น้ำหนัก", "weight")) || 0;
    const height = Number(getCol(cols, "ส่วนสูง", "height")) || 0;
    const bmi = getCol(cols, "BMI", "bmi") || (height > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(2) : "0");
    const bpSys = Number(getCol(cols, "ความดันบน (Systolic)", "bpSys", "ความดันบน")) || 0;
    const bpDia = Number(getCol(cols, "ความดันล่าง (Diastolic)", "bpDia", "ความดันล่าง")) || 0;
    const sugar = Number(getCol(cols, "น้ำตาล (DTX)", "น้ำตาล (FBS)", "sugar", "น้ำตาล")) || 0;
    const rawFasting = getCol(cols, "สภาวะอดอาหาร", "sugarFasting", "อดอาหาร/ไม่อดอาหาร");
    const sugarFasting = rawFasting && rawFasting.includes("ไม่อด") ? "ไม่อดอาหาร" : "อดอาหาร";
    const rawParticipant = getCol(cols, "ประเภทกลุ่ม", "ประเภทผู้รับการคัดกรอง", "participantType", "กลุ่มข้อมูล");
    const participantType = rawParticipant && rawParticipant.includes("คณะทำงาน") ? "คณะทำงาน" : "กลุ่มเป้าหมายโครงการ";

    records.push({
      id,
      date,
      visitNumber,
      participantType,
      name,
      age,
      gender,
      phone,
      district,
      subdistrict,
      targetArea,
      weight,
      height,
      bmi,
      bpSys,
      bpDia,
      sugar,
      sugarFasting,
      createdAt: new Date().toISOString()
    });
  }

  return records;
};

/* =========================================================================
   1. BACKUP / EXPORT MODAL (สำรองข้อมูลแบบเลือกเฉพาะเจาะจง)
   ========================================================================= */

export interface BackupExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ScreeningRecord[];
}

export const BackupExportModal: React.FC<BackupExportModalProps> = ({
  isOpen,
  onClose,
  records = []
}) => {
  // Filter states
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<string>("all");
  const [selectedTargetArea, setSelectedTargetArea] = useState<string>("all");
  const [selectedVisitScope, setSelectedVisitScope] = useState<"all" | "latest_only" | "first_only" | "followup_only">("all");
  const [fileFormat, setFileFormat] = useState<"json" | "csv">("json");

  // Reset dependent filters when parent filter changes
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setSelectedDistrict("all");
    setSelectedSubdistrict("all");
    setSelectedTargetArea("all");
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    setSelectedSubdistrict("all");
    setSelectedTargetArea("all");
  };

  const handleSubdistrictChange = (subdistrict: string) => {
    setSelectedSubdistrict(subdistrict);
    setSelectedTargetArea("all");
  };

  const resetAllFilters = () => {
    setSelectedModel("all");
    setSelectedDistrict("all");
    setSelectedSubdistrict("all");
    setSelectedTargetArea("all");
    setSelectedVisitScope("all");
  };

  // Extract distinct available options from actual records
  const availableOptions = useMemo(() => {
    const modelsSet = new Set<string>();
    const districtsSet = new Set<string>();
    const subdistrictsSet = new Set<string>();
    const targetAreasSet = new Set<string>();

    records.forEach(r => {
      const model = getRecordModel(r);
      const sub = getRecordSubdistrict(r);
      modelsSet.add(model);
      if (r.district) districtsSet.add(r.district);

      // Cascading for subdistricts
      if (selectedDistrict === "all" || r.district === selectedDistrict) {
        if (selectedModel === "all" || model === selectedModel) {
          if (sub) subdistrictsSet.add(sub);
        }
      }

      // Cascading for target areas
      if (
        (selectedDistrict === "all" || r.district === selectedDistrict) &&
        (selectedModel === "all" || model === selectedModel) &&
        (selectedSubdistrict === "all" || sub === selectedSubdistrict)
      ) {
        if (r.targetArea) targetAreasSet.add(r.targetArea);
      }
    });

    return {
      models: Array.from(modelsSet),
      districts: Array.from(districtsSet),
      subdistricts: Array.from(subdistrictsSet),
      targetAreas: Array.from(targetAreasSet)
    };
  }, [records, selectedModel, selectedDistrict, selectedSubdistrict]);

  // Compute patient visit mapping for visit filtering
  const patientVisitMapping = useMemo(() => {
    const map: Record<string, { latestVisitNumber: number; latestRecordId: number; total: number }> = {};
    records.forEach(r => {
      const key = `${r.name}_${r.phone || ""}`;
      const vNum = r.visitNumber || 1;
      if (!map[key]) {
        map[key] = { latestVisitNumber: vNum, latestRecordId: r.id, total: 1 };
      } else {
        map[key].total += 1;
        if (vNum > map[key].latestVisitNumber) {
          map[key].latestVisitNumber = vNum;
          map[key].latestRecordId = r.id;
        }
      }
    });
    return map;
  }, [records]);

  // Filter records based on active selection
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const model = getRecordModel(r);
      const sub = getRecordSubdistrict(r);

      // 1. Model filter
      if (selectedModel !== "all" && model !== selectedModel) return false;

      // 2. District filter
      if (selectedDistrict !== "all" && r.district !== selectedDistrict) return false;

      // 3. Subdistrict filter
      if (selectedSubdistrict !== "all" && sub !== selectedSubdistrict) return false;

      // 4. Target Area filter
      if (selectedTargetArea !== "all" && r.targetArea !== selectedTargetArea) return false;

      // 5. Visit Scope filter
      const key = `${r.name}_${r.phone || ""}`;
      const patientInfo = patientVisitMapping[key];
      const vNum = r.visitNumber || 1;

      if (selectedVisitScope === "latest_only") {
        if (!patientInfo || r.id !== patientInfo.latestRecordId) return false;
      } else if (selectedVisitScope === "first_only") {
        if (vNum !== 1) return false;
      } else if (selectedVisitScope === "followup_only") {
        if (vNum < 2) return false;
      }

      return true;
    });
  }, [records, selectedModel, selectedDistrict, selectedSubdistrict, selectedTargetArea, selectedVisitScope, patientVisitMapping]);

  // Calculate unique individuals in filtered records
  const uniquePatientsCount = useMemo(() => {
    const set = new Set<string>();
    filteredRecords.forEach(r => set.add(`${r.name}_${r.phone || ""}`));
    return set.size;
  }, [filteredRecords]);

  // Generate breakdown summary by district/model
  const locationBreakdown = useMemo(() => {
    const distMap: Record<string, number> = {};
    const modelMap: Record<string, number> = {};

    filteredRecords.forEach(r => {
      distMap[r.district] = (distMap[r.district] || 0) + 1;
      const m = getRecordModel(r);
      modelMap[m] = (modelMap[m] || 0) + 1;
    });

    return { distMap, modelMap };
  }, [filteredRecords]);

  // Execute export download
  const handleDownload = () => {
    if (filteredRecords.length === 0) {
      alert("ไม่มีข้อมูลตรงตามเงื่อนไขที่เลือก");
      return;
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const locationParts = [
      selectedModel !== "all" ? `โมเดล${selectedModel}` : "",
      selectedDistrict !== "all" ? `อ.${selectedDistrict}` : "",
      selectedSubdistrict !== "all" ? `ต.${selectedSubdistrict}` : "",
      selectedTargetArea !== "all" ? selectedTargetArea.replace(/\s+/g, "_") : ""
    ].filter(Boolean);

    const suffix = locationParts.length > 0 ? `_${locationParts.join("_")}` : "_ทั้งหมด";

    if (fileFormat === "json") {
      const dataStr = JSON.stringify(filteredRecords, null, 2);
      const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ncd_backup${suffix}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 150);
    } else {
      // Export as CSV
      const headers = [
        "ID", "วันที่ตรวจ", "ครั้งที่", "ประเภทกลุ่ม", "ชื่อ-นามสกุล", "อายุ", "เพศ", "เบอร์โทร",
        "อำเภอ", "ตำบล", "พื้นที่เป้าหมาย", "น้ำหนัก", "ส่วนสูง", "BMI",
        "ความดันบน (Systolic)", "ความดันล่าง (Diastolic)", "น้ำตาล (DTX)", "สภาวะอดอาหาร"
      ];

      const rows = filteredRecords.map(r => [
        r.id,
        `"${r.date || ""}"`,
        r.visitNumber || 1,
        `"${r.participantType || "กลุ่มเป้าหมายโครงการ"}"`,
        `"${r.name || ""}"`,
        r.age || "",
        `"${r.gender || ""}"`,
        `"${r.phone || ""}"`,
        `"${r.district || ""}"`,
        `"${getRecordSubdistrict(r)}"`,
        `"${r.targetArea || ""}"`,
        r.weight || "",
        r.height || "",
        r.bmi || "",
        r.bpSys || "",
        r.bpDia || "",
        r.sugar || "",
        `"${r.sugarFasting || "อดอาหาร"}"`
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ncd_export${suffix}_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 150);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-xs">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">สำรองข้อมูลแบบระบุเงื่อนไข (Backup Data)</h3>
              <p className="text-xs text-indigo-100">
                เลือกสำรองข้อมูลทั้งหมด หรือเลือกเฉพาะเจาะจงตามโมเดล อำเภอ ตำบล และพื้นที่เป้าหมาย
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 text-xs">
          
          {/* Filter Section Header & Quick Reset */}
          <div className="flex items-center justify-between border-b border-slate-150 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>ระบุเงื่อนไขข้อมูลที่ต้องการสำรอง</span>
            </div>
            {(selectedModel !== "all" || selectedDistrict !== "all" || selectedSubdistrict !== "all" || selectedTargetArea !== "all" || selectedVisitScope !== "all") && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg"
              >
                <RotateCcw className="w-3 h-3" />
                รีเซ็ตเป็นข้อมูลทั้งหมด
              </button>
            )}
          </div>

          {/* 4 Cascading Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Model */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500">1. โมเดล</label>
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-250 p-2.5 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">ทั้งหมด (ทุกโมเดล)</option>
                {availableOptions.models.map(m => (
                  <option key={m} value={m}>โมเดล: {m}</option>
                ))}
              </select>
            </div>

            {/* 2. District */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500">2. อำเภอ</label>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-250 p-2.5 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">ทั้งหมด (ทุกอำเภอ)</option>
                {availableOptions.districts.map(d => (
                  <option key={d} value={d}>อ.{d}</option>
                ))}
              </select>
            </div>

            {/* 3. Subdistrict */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500">3. ตำบล</label>
              <select
                value={selectedSubdistrict}
                onChange={(e) => handleSubdistrictChange(e.target.value)}
                disabled={availableOptions.subdistricts.length === 0}
                className="w-full text-xs rounded-xl border border-slate-250 p-2.5 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="all">ทั้งหมด (ทุกตำบล)</option>
                {availableOptions.subdistricts.map(s => (
                  <option key={s} value={s}>ต.{s}</option>
                ))}
              </select>
            </div>

            {/* 4. Target Area */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500">4. พื้นที่เป้าหมาย / หมู่บ้าน</label>
              <select
                value={selectedTargetArea}
                onChange={(e) => setSelectedTargetArea(e.target.value)}
                disabled={availableOptions.targetAreas.length === 0}
                className="w-full text-xs rounded-xl border border-slate-250 p-2.5 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="all">ทั้งหมด (ทุกพื้นที่เป้าหมาย)</option>
                {availableOptions.targetAreas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Visit Filter Scope */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-bold text-slate-500">ขอบเขตรอบการตรวจ (Visit Scope)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "all", label: "ทุกครั้งที่ตรวจ" },
                { id: "latest_only", label: "เฉพาะรอบล่าสุด (1 คน/1 บันทึก)" },
                { id: "first_only", label: "เฉพาะครั้งแรก (แรกรับ)" },
                { id: "followup_only", label: "เฉพาะติดตาม (ครั้งที่ ≥ 2)" }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedVisitScope(opt.id as any)}
                  className={`py-2 px-2.5 rounded-xl font-bold border text-[11px] transition-all cursor-pointer ${
                    selectedVisitScope === opt.id
                      ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export Summary Card (Real-time Count & Breakdown) */}
          <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-150 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                <Database className="w-4 h-4 text-indigo-600" />
                สรุปจำนวนข้อมูลที่จะส่งออก (Export Summary)
              </span>
              <span className="text-[11px] font-bold bg-white px-2.5 py-0.5 rounded-full border border-indigo-200 text-indigo-700 shadow-3xs">
                {records.length > 0 ? Math.round((filteredRecords.length / records.length) * 100) : 0}% ของทั้งหมด
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-3xs">
                <span className="text-[10px] text-slate-400 font-bold block">จำนวนบันทึกที่จะส่งออก</span>
                <div className="text-xl font-black text-indigo-600 mt-0.5">
                  {filteredRecords.length.toLocaleString()}
                  <span className="text-xs text-slate-400 font-normal ml-1">รายการ</span>
                </div>
                <span className="text-[10px] text-slate-400">จากทั้งหมด {records.length.toLocaleString()} รายการ</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-3xs">
                <span className="text-[10px] text-slate-400 font-bold block">จำนวนผู้รับการตรวจ (คน)</span>
                <div className="text-xl font-black text-emerald-600 mt-0.5">
                  {uniquePatientsCount.toLocaleString()}
                  <span className="text-xs text-slate-400 font-normal ml-1">คน</span>
                </div>
                <span className="text-[10px] text-slate-400">บุคคลไม่ซ้ำกัน</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-3xs col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 font-bold block">กระจายในอำเภอ</span>
                <div className="text-xl font-black text-slate-700 mt-0.5">
                  {Object.keys(locationBreakdown.distMap).length}
                  <span className="text-xs text-slate-400 font-normal ml-1">อำเภอ</span>
                </div>
                <span className="text-[10px] text-slate-400 truncate block">
                  {Object.keys(locationBreakdown.distMap).slice(0, 3).map(d => `อ.${d}`).join(', ') || "-"}
                </span>
              </div>
            </div>

            {/* Scope description text */}
            <div className="text-[11px] text-indigo-900 bg-indigo-100/60 p-2.5 rounded-xl leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>เงื่อนไขที่เลือก: </strong>
                โมเดล: <span className="font-bold">{selectedModel === "all" ? "ทุกโมเดล" : selectedModel}</span> | 
                อำเภอ: <span className="font-bold">{selectedDistrict === "all" ? "ทุกอำเภอ" : `อ.${selectedDistrict}`}</span> | 
                ตำบล: <span className="font-bold">{selectedSubdistrict === "all" ? "ทุกตำบล" : `ต.${selectedSubdistrict}`}</span> | 
                พื้นที่: <span className="font-bold">{selectedTargetArea === "all" ? "ทุกพื้นที่" : selectedTargetArea}</span>
              </div>
            </div>
          </div>

          {/* Export File Format Choice */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500">รูปแบบไฟล์ที่ต้องการ</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                fileFormat === "json" 
                  ? "border-indigo-600 bg-indigo-50/50 shadow-2xs" 
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}>
                <div className="flex items-center gap-2.5">
                  <input 
                    type="radio" 
                    name="exportFormat" 
                    checked={fileFormat === "json"} 
                    onChange={() => setFileFormat("json")}
                    className="text-indigo-600 focus:ring-indigo-500" 
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">ไฟล์สำรองข้อมูล JSON</span>
                    <span className="text-[10px] text-slate-500">สมบูรณ์ 100% สำหรับนำเข้า/กู้คืนระบบ</span>
                  </div>
                </div>
                <Database className="w-4 h-4 text-indigo-500" />
              </label>

              <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                fileFormat === "csv" 
                  ? "border-indigo-600 bg-indigo-50/50 shadow-2xs" 
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}>
                <div className="flex items-center gap-2.5">
                  <input 
                    type="radio" 
                    name="exportFormat" 
                    checked={fileFormat === "csv"} 
                    onChange={() => setFileFormat("csv")}
                    className="text-indigo-600 focus:ring-indigo-500" 
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">ไฟล์ตาราง CSV / Excel</span>
                    <span className="text-[10px] text-slate-500">สำหรับเปิดดูใน Excel และทำรายงาน</span>
                  </div>
                </div>
                <FileText className="w-4 h-4 text-emerald-500" />
              </label>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>พร้อมส่งออก {filteredRecords.length.toLocaleString()} รายการ ({uniquePatientsCount.toLocaleString()} คน)</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-250 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={filteredRecords.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์ ({filteredRecords.length.toLocaleString()})</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


/* =========================================================================
   2. IMPORT / RESTORE MODAL (นำเข้าข้อมูลพร้อมพรีวิวและเลือกเฉพาะเจาะจง)
   ========================================================================= */

export interface BackupImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRecords: ScreeningRecord[];
  onConfirmImport: (recordsToImport: ScreeningRecord[]) => Promise<any> | void;
}

export const BackupImportModal: React.FC<BackupImportModalProps> = ({
  isOpen,
  onClose,
  existingRecords = [],
  onConfirmImport
}) => {
  const [step, setStep] = useState<"upload" | "filter_preview" | "success">("upload");
  const [parsedData, setParsedData] = useState<ScreeningRecord[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [fileSizeStr, setFileSizeStr] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Selective Import Filters
  const [importModel, setImportModel] = useState<string>("all");
  const [importDistrict, setImportDistrict] = useState<string>("all");
  const [importSubdistrict, setImportSubdistrict] = useState<string>("all");
  const [importTargetArea, setImportTargetArea] = useState<string>("all");

  // Post-import summary state
  const [importedSummary, setImportedSummary] = useState<{
    totalImported: number;
    newCount: number;
    updatedCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open/close
  const handleReset = () => {
    setStep("upload");
    setParsedData([]);
    setFileName("");
    setFileSizeStr("");
    setErrorMsg("");
    setImportModel("all");
    setImportDistrict("all");
    setImportSubdistrict("all");
    setImportTargetArea("all");
    setImportedSummary(null);
    setIsExecuting(false);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  // Handle file reading (JSON and CSV)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const sizeInKB = Math.round(file.size / 1024);
    setFileSizeStr(sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`);
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let rawItems: any[] = [];

        if (file.name.toLowerCase().endsWith(".csv")) {
          rawItems = parseCsvToRecords(text);
        } else {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            rawItems = json;
          } else if (json && Array.isArray(json.records)) {
            rawItems = json.records;
          } else if (json && Array.isArray(json.data)) {
            rawItems = json.data;
          } else {
            setErrorMsg("โครงสร้างไฟล์ไม่ถูกต้อง: ข้อมูลต้องเป็น Array ของรายการตรวจ หรือ { records: [...] }");
            return;
          }
        }

        if (rawItems.length === 0) {
          setErrorMsg("ไฟล์ไม่มีข้อมูลบันทึก (0 รายการ)");
          return;
        }

        // Validate and normalize records with guaranteed IDs and location fields
        const validRecords: ScreeningRecord[] = rawItems
          .filter(item => item && typeof item === "object" && (item.name || item.id))
          .map((item, idx) => {
            const numId = Number(item.id) || (Date.now() + idx);
            const m = item.modelType || getRecordModel(item);
            const sub = cleanSubdistrict(item.subdistrict || getRecordSubdistrict(item));
            const rawDist = item.district || "เมือง";
            const dist = cleanDistrict(rawDist) as DistrictType;
            return {
              ...item,
              id: numId,
              name: item.name || "ไม่ระบุชื่อ",
              visitNumber: Number(item.visitNumber) || 1,
              modelType: (m === "หมู่บ้าน" || m === "ตำบล" ? m : "หมู่บ้าน") as any,
              district: dist,
              subdistrict: sub,
              targetArea: item.targetArea || (sub ? `ต.${sub}` : "ทั่วไป"),
              createdAt: item.createdAt || new Date().toISOString()
            } as ScreeningRecord;
          });

        if (validRecords.length === 0) {
          setErrorMsg("ไม่พบบันทึกการคัดกรองที่ถูกต้องในไฟล์นี้");
          return;
        }

        setParsedData(validRecords);
        setStep("filter_preview");
      } catch (err: any) {
        console.error(err);
        setErrorMsg("เกิดข้อผิดพลาดในการอ่านไฟล์: " + (err.message || "กรุณาตรวจสอบความถูกต้องของไฟล์"));
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  // Distinct options found inside the uploaded file
  const fileOptions = useMemo(() => {
    if (parsedData.length === 0) return { models: [], districts: [], subdistricts: [], targetAreas: [] };

    const modelsSet = new Set<string>();
    const districtsSet = new Set<string>();
    const subdistrictsSet = new Set<string>();
    const targetAreasSet = new Set<string>();

    parsedData.forEach(r => {
      const m = getRecordModel(r);
      const sub = getRecordSubdistrict(r);
      if (m) modelsSet.add(m);
      if (r.district) districtsSet.add(r.district);

      if (importDistrict === "all" || matchesDistrictFilter(r.district, [importDistrict])) {
        if (importModel === "all" || matchesModelFilter(r, [importModel])) {
          if (sub) subdistrictsSet.add(sub);
        }
      }

      if (
        (importDistrict === "all" || matchesDistrictFilter(r.district, [importDistrict])) &&
        (importModel === "all" || matchesModelFilter(r, [importModel])) &&
        (importSubdistrict === "all" || matchesSubdistrictFilter(sub, [importSubdistrict]))
      ) {
        if (r.targetArea) targetAreasSet.add(r.targetArea);
      }
    });

    return {
      models: Array.from(modelsSet),
      districts: Array.from(districtsSet),
      subdistricts: Array.from(subdistrictsSet),
      targetAreas: Array.from(targetAreasSet)
    };
  }, [parsedData, importModel, importDistrict, importSubdistrict]);

  // Filter parsed records based on user's selective import criteria
  const recordsToImport = useMemo(() => {
    return parsedData.filter(r => {
      const sub = getRecordSubdistrict(r);

      if (importModel !== "all" && !matchesModelFilter(r, [importModel])) return false;
      if (importDistrict !== "all" && !matchesDistrictFilter(r.district, [importDistrict])) return false;
      if (importSubdistrict !== "all" && !matchesSubdistrictFilter(sub, [importSubdistrict])) return false;
      if (importTargetArea !== "all" && !matchesTargetAreaFilter(r.targetArea, [importTargetArea])) return false;

      return true;
    });
  }, [parsedData, importModel, importDistrict, importSubdistrict, importTargetArea]);

  // Comparison metrics with current database
  const comparisonStats = useMemo(() => {
    const existingIdSet = new Set(existingRecords.map(r => Number(r.id)));
    let newCount = 0;
    let updateCount = 0;

    recordsToImport.forEach(r => {
      if (existingIdSet.has(Number(r.id))) {
        updateCount++;
      } else {
        newCount++;
      }
    });

    return { newCount, updateCount };
  }, [recordsToImport, existingRecords]);

  // Execute import (asynchronous and verified)
  const handleExecuteImport = async () => {
    if (recordsToImport.length === 0) {
      alert("ไม่มีข้อมูลตรงตามเงื่อนไขที่เลือกนำเข้า");
      return;
    }

    try {
      setIsExecuting(true);
      await onConfirmImport(recordsToImport);

      setImportedSummary({
        totalImported: recordsToImport.length,
        newCount: comparisonStats.newCount,
        updatedCount: comparisonStats.updateCount
      });

      setStep("success");
    } catch (err: any) {
      console.error("Execute import error:", err);
      alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " + (err.message || "กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-xs">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">นำเข้าข้อมูลและเลือกเฉพาะเจาะจง (Import Data)</h3>
              <p className="text-xs text-emerald-100">
                นำเข้าข้อมูลสำรอง พร้อมเลือกกรองนำเข้าเฉพาะโมเดล อำเภอ ตำบล หรือนำเข้าทั้งหมด
              </p>
            </div>
          </div>
          <button 
            onClick={handleModalClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Upload File */}
        {step === "upload" && (
          <div className="p-8 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-8 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all cursor-pointer flex flex-col items-center justify-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                คลิกเพื่อเลือกไฟล์สำรองข้อมูล (JSON หรือ CSV)
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                รองรับไฟล์นามสกุล <strong>.json</strong> (ไฟล์สำรองระบบ) และ <strong>.csv</strong> (ตาราง Excel)
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-3.5 py-1.5 rounded-xl shadow-3xs">
                <FileCheck className="w-4 h-4" />
                <span>เลือกไฟล์จากเครื่อง (.json, .csv)</span>
              </div>
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept=".json,.csv"
              onChange={handleFileChange}
              className="hidden" 
            />

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 max-w-lg w-full text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="text-[11px] text-slate-400 max-w-md text-center leading-relaxed">
              * ข้อมูลที่นำเข้าจะถูกตรวจสอบและแสดงสรุปก่อนบันทึกจริง ท่านสามารถเลือกนำเข้าเฉพาะอำเภอหรือพื้นที่ที่ต้องการได้ในขั้นตอนถัดไป
            </div>
          </div>
        )}

        {/* STEP 2: Filter & Preview before importing */}
        {step === "filter_preview" && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 text-xs">
            
            {/* File info banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 text-xs block">{fileName}</span>
                  <span className="text-[10px] text-slate-500">
                    ขนาดไฟล์ {fileSizeStr} • ตรวจพบข้อมูลในไฟล์ทั้งหมด <strong>{parsedData.length.toLocaleString()}</strong> รายการ
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200"
              >
                เปลี่ยนไฟล์
              </button>
            </div>

            {/* Selective Import Filters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <span>เลือกขอบเขตข้อมูลที่ต้องการนำเข้าจากไฟล์นี้</span>
                </div>
                {(importModel !== "all" || importDistrict !== "all" || importSubdistrict !== "all" || importTargetArea !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setImportModel("all");
                      setImportDistrict("all");
                      setImportSubdistrict("all");
                      setImportTargetArea("all");
                    }}
                    className="text-emerald-600 hover:text-emerald-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-lg"
                  >
                    <RotateCcw className="w-3 h-3" />
                    นำเข้าทั้งหมดในไฟล์
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* 1. Model */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">โมเดลในไฟล์</label>
                  <select
                    value={importModel}
                    onChange={(e) => {
                      setImportModel(e.target.value);
                      setImportDistrict("all");
                      setImportSubdistrict("all");
                      setImportTargetArea("all");
                    }}
                    className="w-full text-xs rounded-xl border border-slate-250 p-2.5 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="all">ทั้งหมด (ทุกโมเดลในไฟล์)</option>
                    {fileOptions.models.map(m => (
                      <option key={m} value={m}>โมเดล: {m}</option>
                    ))}
                  </select>
                </div>

                {/* 2. District */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">อำเภอในไฟล์</label>
                  <select
                    value={importDistrict}
                    onChange={(e) => {
                      setImportDistrict(e.target.value);
                      setImportSubdistrict("all");
                      setImportTargetArea("all");
                    }}
                    className="w-full text-xs rounded-xl border border-slate-250 p-2.5 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="all">ทั้งหมด (ทุกอำเภอในไฟล์)</option>
                    {fileOptions.districts.map(d => (
                      <option key={d} value={d}>อ.{d}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Subdistrict */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">ตำบลในไฟล์</label>
                  <select
                    value={importSubdistrict}
                    onChange={(e) => {
                      setImportSubdistrict(e.target.value);
                      setImportTargetArea("all");
                    }}
                    disabled={fileOptions.subdistricts.length === 0}
                    className="w-full text-xs rounded-xl border border-slate-250 p-2.5 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="all">ทั้งหมด (ทุกตำบลในไฟล์)</option>
                    {fileOptions.subdistricts.map(s => (
                      <option key={s} value={s}>ต.{s}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Target Area */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">พื้นที่เป้าหมายในไฟล์</label>
                  <select
                    value={importTargetArea}
                    onChange={(e) => setImportTargetArea(e.target.value)}
                    disabled={fileOptions.targetAreas.length === 0}
                    className="w-full text-xs rounded-xl border border-slate-250 p-2.5 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="all">ทั้งหมด (ทุกพื้นที่ในไฟล์)</option>
                    {fileOptions.targetAreas.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Import Summary KPI Cards */}
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-150 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <Database className="w-4 h-4 text-emerald-600" />
                  สรุปผลการประเมินการนำเข้า (Import Impact)
                </span>
                <span className="text-[11px] font-bold bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 text-emerald-700 shadow-3xs">
                  {recordsToImport.length} จาก {parsedData.length} รายการ
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-3xs">
                  <span className="text-[10px] text-slate-400 font-bold block">จำนวนที่จะนำเข้าจริง</span>
                  <div className="text-xl font-black text-emerald-600 mt-0.5">
                    {recordsToImport.length.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">รายการที่เลือก</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-3xs">
                  <span className="text-[10px] text-slate-400 font-bold block">รายการใหม่ (New)</span>
                  <div className="text-xl font-black text-blue-600 mt-0.5">
                    {comparisonStats.newCount.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">ไม่ซ้ำในระบบ</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-3xs">
                  <span className="text-[10px] text-slate-400 font-bold block">รายการอัปเดต (Update)</span>
                  <div className="text-xl font-black text-amber-600 mt-0.5">
                    {comparisonStats.updateCount.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">อัปเดตทับข้อมูลเดิม</span>
                </div>
              </div>
            </div>

            {/* Records Sample Preview List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>ตัวอย่างรายการที่จะนำเข้า (แสดง {Math.min(5, recordsToImport.length)} จาก {recordsToImport.length} รายการ):</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-1.5 px-3">ชื่อ-สกุล</th>
                      <th className="py-1.5 px-3">ครั้งที่</th>
                      <th className="py-1.5 px-3">วันที่</th>
                      <th className="py-1.5 px-3">พื้นที่</th>
                      <th className="py-1.5 px-3">ความดัน</th>
                      <th className="py-1.5 px-3">น้ำตาล</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recordsToImport.slice(0, 8).map((r, i) => (
                      <tr key={r.id || i} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-semibold text-slate-800">{r.name}</td>
                        <td className="py-1.5 px-3">#{r.visitNumber || 1}</td>
                        <td className="py-1.5 px-3 text-slate-600 font-medium">{formatThaiDate(r.date, "medium")}</td>
                        <td className="py-1.5 px-3 text-slate-500">{r.district} - {r.targetArea}</td>
                        <td className="py-1.5 px-3">{r.bpSys}/{r.bpDia}</td>
                        <td className="py-1.5 px-3">{r.sugar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* STEP 3: Success Screen */}
        {step === "success" && importedSummary && (
          <div className="p-8 text-center space-y-5 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base sm:text-lg font-black text-slate-800">
                นำเข้าข้อมูลสำเร็จเรียบร้อย!
              </h4>
              <p className="text-xs text-slate-500">
                ระบบได้บันทึกและซิงค์ข้อมูลเข้าสู่ฐานข้อมูลเรียบร้อยแล้ว
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md w-full bg-emerald-50/60 p-4 rounded-2xl border border-emerald-150 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">นำเข้าทั้งหมด</span>
                <span className="text-lg font-black text-emerald-700">
                  {importedSummary.totalImported.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">รายการ</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">เพิ่มใหม่</span>
                <span className="text-lg font-black text-blue-700">
                  {importedSummary.newCount.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">รายการ</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">อัปเดตเดิม</span>
                <span className="text-lg font-black text-amber-700">
                  {importedSummary.updatedCount.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">รายการ</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleModalClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              เสร็จสิ้นและกลับสู่หน้าแดชบอร์ด
            </button>
          </div>
        )}

        {/* Modal Footer (for step 2) */}
        {step === "filter_preview" && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>เลือกนำเข้า {recordsToImport.length.toLocaleString()} จาก {parsedData.length.toLocaleString()} รายการ</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStep("upload")}
                disabled={isExecuting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-250 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={recordsToImport.length === 0 || isExecuting}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังบันทึกลงระบบ...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ยืนยันนำเข้าข้อมูล ({recordsToImport.length.toLocaleString()})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
};
