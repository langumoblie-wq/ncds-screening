import React, { useState, useEffect } from "react";
import { 
  User, MapPin, Phone, HeartPulse, ShieldAlert, Activity, ClipboardCheck, 
  HelpCircle, Coffee, Flame, AlertTriangle, Droplet, PlusCircle, CheckCircle2,
  Calendar, Users
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { DistrictType, ScreeningRecord, DISTRICT_TARGET_AREAS, DISTRICT_SUBDISTRICT_MAP, LOCATION_DATA, PersonalPlan, ParticipantType } from "../types";
import { calculateBMI, calculateHTRisk, calculateDMRisk, evaluateFoodHabit, parseDateToIso, isoToThaiDateString, formatThaiDateReadable } from "../utils";
import { FOOD_HABIT_QUESTIONS } from "../data/questions";
import { ConsentModal } from "./ConsentModal";
import { getRecordModel, getRecordSubdistrict, cleanDistrict } from "./BackupRestoreModal";

interface NcdFormProps {
  onSubmitSuccess: (record: ScreeningRecord, isEdit: boolean) => void;
  initialRecord?: ScreeningRecord | null;
  isFollowUp?: boolean;
  onCancelEdit?: () => void;
}

export const NcdForm: React.FC<NcdFormProps> = ({ 
  onSubmitSuccess,
  initialRecord = null,
  isFollowUp = false,
  onCancelEdit
}) => {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [showOfflineSuccessAlert, setShowOfflineSuccessAlert] = useState(false);
  const [offlineSavedRecord, setOfflineSavedRecord] = useState<any>(null);

  // Screening Date (วันที่คัดกรอง)
  const [screeningDateIso, setScreeningDateIso] = useState<string>(() => {
    return parseDateToIso(initialRecord?.date);
  });
  const [screeningDateText, setScreeningDateText] = useState<string>(() => {
    if (initialRecord?.date) return initialRecord.date;
    const now = new Date();
    const y = now.getFullYear() + 543;
    const m = String(now.getMonth() + 1);
    const d = String(now.getDate());
    return `${d}/${m}/${y}`;
  });

  // Fasting option for DTX (1. อดอาหาร, 2. ไม่อดอาหาร)
  const [sugarFasting, setSugarFasting] = useState<"อดอาหาร" | "ไม่อดอาหาร">(
    (initialRecord as any)?.sugarFasting || "อดอาหาร"
  );

  // Participant Category (1. กลุ่มเป้าหมายโครงการ, 2. คณะทำงาน)
  const [participantType, setParticipantType] = useState<ParticipantType>(
    initialRecord?.participantType || "กลุ่มเป้าหมายโครงการ"
  );

  const handleDateChange = (val: string) => {
    setScreeningDateIso(val);
    if (val) {
      setScreeningDateText(isoToThaiDateString(val));
    }
  };

  // Personal Info
  const [name, setName] = useState("");
  const [visitNumber, setVisitNumber] = useState(1);
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<"ชาย" | "หญิง" | "">("");
  const [address, setAddress] = useState("");
  const [modelType, setModelType] = useState<"หมู่บ้าน" | "ตำบล" | "">(initialRecord?.modelType || "");
  const [district, setDistrict] = useState<DistrictType | "">(initialRecord?.district || "");
  const [subdistrict, setSubdistrict] = useState(initialRecord?.subdistrict || "");
  const [targetArea, setTargetArea] = useState(initialRecord?.targetArea || "");
  const [phone, setPhone] = useState(initialRecord?.phone || "");

  // Health History
  const [hasDisease, setHasDisease] = useState(false);
  const [selectedDiseases, setSelectedDiseases] = useState<Record<string, boolean>>({
    เบาหวาน: false,
    ความดันโลหิตสูง: false,
    โรคเกาต์: false,
    ไตวายเรื้อรัง: false,
    กล้ามเนื้อหัวใจขาดเลือด: false,
    หลอดเลือดสมอง: false,
    ถุงลมโป่งพอง: false,
    โรคทางจิตเวช: false,
  });
  const [noDisease, setNoDisease] = useState(false);
  const [unknownDisease, setUnknownDisease] = useState(false);

  // Lifestyle Habits
  const [smoking, setSmoking] = useState("ไม่สูบ");
  const [alcohol, setAlcohol] = useState("ไม่ดื่มเลย");
  const [water, setWater] = useState("6-8 แก้ว");
  const [exercise, setExercise] = useState("3 วันขึ้นไป/สัปดาห์");
  const [sleep, setSleep] = useState("6-8 ชั่วโมง");
  const [sodium, setSodium] = useState("ไม่ค่อยทานเค็ม");

  // Vitals
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [bpSys, setBpSys] = useState<number | "">("");
  const [bpDia, setBpDia] = useState<number | "">("");
  const [sugar, setSugar] = useState<number | "">("");
  const [muscleMass, setMuscleMass] = useState<number | "">("");

  // Follow-up
  const [followUpAction, setFollowUpAction] = useState("ให้คำแนะนำ 3อ. 2ส.");
  const [followUpNote, setFollowUpNote] = useState("");

  // Personal Plan
  const [personalPlan, setPersonalPlan] = useState<PersonalPlan>({
    sweet: { plan: "" },
    fat: { plan: "" },
    salt: { plan: "" },
    sleep: { plan: "" },
    water: { plan: "" },
    exercise: { plan: "" },
  });

  // Food Habits scores (mapping of question ID to choice: 0, 1, or 2)
  const [foodHabitAnswers, setFoodHabitAnswers] = useState<Record<string, number>>({});

  // Sync initialRecord for Editing Mode
  useEffect(() => {
    if (initialRecord) {
      if (initialRecord.date) {
        setScreeningDateIso(parseDateToIso(initialRecord.date));
        setScreeningDateText(initialRecord.date);
      } else {
        const now = new Date();
        const iso = now.toISOString().split("T")[0];
        setScreeningDateIso(iso);
        setScreeningDateText(now.toLocaleDateString("th-TH"));
      }
      setSugarFasting((initialRecord as any)?.sugarFasting || "อดอาหาร");
      setParticipantType(initialRecord.participantType || "กลุ่มเป้าหมายโครงการ");

      setName(initialRecord.name);
      setVisitNumber(isFollowUp ? initialRecord.visitNumber + 1 : initialRecord.visitNumber);
      setAge(initialRecord.age);
      setGender(initialRecord.gender);
      setAddress(initialRecord.address);

      // Infer modelType and subdistrict if not present
      const initialModel = initialRecord.modelType || getRecordModel(initialRecord);
      setModelType(initialModel as "หมู่บ้าน" | "ตำบล");
      setDistrict(initialRecord.district);
      
      const sub = initialRecord.subdistrict || getRecordSubdistrict(initialRecord);
      setSubdistrict(sub);
      setTargetArea(initialRecord.targetArea);
      setPhone(initialRecord.phone);
      
      // Diseases History
      const diseases = initialRecord.familyHistory || [];
      const hasAnyRealDisease = diseases.length > 0 && 
        !diseases.includes("ไม่มีโรคประจำตัว") && 
        !diseases.includes("ไม่ทราบ") && 
        !diseases.includes("ไม่ทราบ / ไม่มีข้อมูลโรคประจำตัวเด่นชัด");
      
      setNoDisease(diseases.includes("ไม่มีโรคประจำตัว"));
      setUnknownDisease(diseases.includes("ไม่ทราบ"));
      setHasDisease(hasAnyRealDisease);
      
      const prepSelectedDiseases: Record<string, boolean> = {
        เบาหวาน: diseases.includes("เบาหวาน"),
        ความดันโลหิตสูง: diseases.includes("ความดันโลหิตสูง"),
        โรคเกาต์: diseases.includes("โรคเกาต์"),
        ไตวายเรื้อรัง: diseases.includes("ไตวายเรื้อรัง"),
        กล้ามเนื้อหัวใจขาดเลือด: diseases.includes("กล้ามเนื้อหัวใจขาดเลือด"),
        หลอดเลือดสมอง: diseases.includes("หลอดเลือดสมอง"),
        ถุงลมโป่งพอง: diseases.includes("ถุงลมโป่งพอง"),
        โรคทางจิตเวช: diseases.includes("โรคทางจิตเวช"),
      };
      setSelectedDiseases(prepSelectedDiseases);
      
      // Lifestyle Habits
      setSmoking(initialRecord.smoking || "ไม่สูบ");
      setAlcohol(initialRecord.alcohol || "ไม่ดื่มเลย");
      setWater(initialRecord.water || "6-8 แก้ว");
      setExercise(initialRecord.exercise || "3 วันขึ้นไป/สัปดาห์");
      setSleep(initialRecord.sleep || "6-8 ชั่วโมง");
      setSodium(initialRecord.sodium || "ไม่ค่อยทานเค็ม");
      
      // Vitals
      setWeight(initialRecord.weight || "");
      setHeight(initialRecord.height || "");
      setBpSys(initialRecord.bpSys || "");
      setBpDia(initialRecord.bpDia || "");
      setSugar(initialRecord.sugar || "");
      setMuscleMass(initialRecord.muscleMass || "");
      
      // Follow-up
      setFollowUpAction(initialRecord.followUpAction || "ให้คำแนะนำ 3อ. 2ส.");
      setFollowUpNote(initialRecord.followUpNote || "");
      
      // Personal Plan
      if (initialRecord.personalPlan) {
        setPersonalPlan({
          sweet: { plan: "" },
          fat: { plan: "" },
          salt: { plan: "" },
          sleep: { plan: "" },
          water: { plan: "" },
          exercise: { plan: "" },
          ...initialRecord.personalPlan
        });
      } else {
        setPersonalPlan({
          sweet: { plan: "" },
          fat: { plan: "" },
          salt: { plan: "" },
          sleep: { plan: "" },
          water: { plan: "" },
          exercise: { plan: "" },
        });
      }
      
      // Food Habit Answers
      setFoodHabitAnswers(initialRecord.foodHabitAnswers || {});
    } else {
      // Reset form to defaults
      const now = new Date();
      const iso = now.toISOString().split("T")[0];
      setScreeningDateIso(iso);
      setScreeningDateText(isoToThaiDateString(iso));
      setSugarFasting("อดอาหาร");
      setParticipantType("กลุ่มเป้าหมายโครงการ");

      setHasConsented(false);
      setName("");
      setVisitNumber(1);
      setAge("");
      setGender("");
      setAddress("");
      setModelType("");
      setDistrict("");
      setSubdistrict("");
      setTargetArea("");
      setPhone("");
      setNoDisease(false);
      setUnknownDisease(false);
      setHasDisease(false);
      setSelectedDiseases({
        เบาหวาน: false,
        ความดันโลหิตสูง: false,
        โรคเกาต์: false,
        ไตวายเรื้อรัง: false,
        กล้ามเนื้อหัวใจขาดเลือด: false,
        หลอดเลือดสมอง: false,
        ถุงลมโป่งพอง: false,
        โรคทางจิตเวช: false,
      });
      setSmoking("ไม่สูบ");
      setAlcohol("ไม่ดื่มเลย");
      setWater("6-8 แก้ว");
      setExercise("3 วันขึ้นไป/สัปดาห์");
      setSleep("6-8 ชั่วโมง");
      setSodium("ไม่ค่อยทานเค็ม");
      setWeight("");
      setHeight("");
      setBpSys("");
      setBpDia("");
      setSugar("");
      setMuscleMass("");
      setFollowUpAction("ให้คำแนะนำ 3อ. 2ส.");
      setFollowUpNote("");
      setPersonalPlan({
        sweet: { plan: "" },
        fat: { plan: "" },
        salt: { plan: "" },
        sleep: { plan: "" },
        water: { plan: "" },
        exercise: { plan: "" },
      });
      setFoodHabitAnswers({});
    }
  }, [initialRecord, isFollowUp]);

  // Real-time BMI
  const liveBmi = weight && height ? calculateBMI(Number(weight), Number(height)) : "0.0";
  
  // Real-time HT risk
  const liveHtResult = bpSys && bpDia ? calculateHTRisk(Number(bpSys), Number(bpDia)) : null;

  // Real-time DM risk
  const liveDmResult = sugar ? calculateDMRisk(Number(sugar), sugarFasting) : null;

  // Cascading location helper arrays
  const availableDistricts = (modelType && LOCATION_DATA[modelType])
    ? (Object.keys(LOCATION_DATA[modelType]) as DistrictType[]).filter(d => d !== "เมืองสตูล")
    : (Object.keys(DISTRICT_SUBDISTRICT_MAP) as DistrictType[]).filter(d => d !== "เมืองสตูล");

  const cleanD = cleanDistrict(district);
  const availableSubdistricts = district
    ? (modelType
        ? Object.keys((LOCATION_DATA[modelType] as any)?.[cleanD] || (LOCATION_DATA[modelType] as any)?.[district] || {})
        : Object.keys(DISTRICT_SUBDISTRICT_MAP[cleanD as DistrictType] || DISTRICT_SUBDISTRICT_MAP[district as DistrictType] || {})
      )
    : [];

  const availableAreas = district && subdistrict
    ? (modelType
        ? (LOCATION_DATA[modelType] as any)?.[cleanD]?.[subdistrict] ||
          (LOCATION_DATA[modelType] as any)?.[district]?.[subdistrict] || []
        : DISTRICT_SUBDISTRICT_MAP[cleanD as DistrictType]?.[subdistrict] ||
          DISTRICT_SUBDISTRICT_MAP[district as DistrictType]?.[subdistrict] || []
      )
    : [];

  // Real-time food scores
  const getCategoryScoreAndEvaluation = (catKey: "sweet" | "fat" | "salt") => {
    const category = FOOD_HABIT_QUESTIONS.find((c) => c.key === catKey);
    if (!category) return { score: 5, level: "เสี่ยงน้อย", color: "text-emerald-600", class: "bg-emerald-50 border-emerald-200", description: "" };

    let totalScore = 0;
    let allAnswered = true;

    category.questions.forEach((q) => {
      const ansIdx = foodHabitAnswers[q.id];
      if (ansIdx === undefined) {
        allAnswered = false;
        // Default default score is neutral (1 or 2)
        totalScore += 1; 
      } else {
        totalScore += q.scoreMapping[ansIdx];
      }
    });

    // Ensure score is at least 5
    if (totalScore < 5) totalScore = 5;

    return {
      evaluation: evaluateFoodHabit(totalScore, catKey),
      allAnswered
    };
  };

  const sweetEval = getCategoryScoreAndEvaluation("sweet");
  const fatEval = getCategoryScoreAndEvaluation("fat");
  const saltEval = getCategoryScoreAndEvaluation("salt");

  const handleDiseaseCheckbox = (disease: string, checked: boolean) => {
    setSelectedDiseases(prev => ({ ...prev, [disease]: checked }));
    if (checked) {
      setHasDisease(true);
      setNoDisease(false);
      setUnknownDisease(false);
    }
  };

  const handleNoDiseaseCheckbox = (checked: boolean) => {
    setNoDisease(checked);
    if (checked) {
      setHasDisease(false);
      setUnknownDisease(false);
      setSelectedDiseases({
        เบาหวาน: false,
        ความดันโลหิตสูง: false,
        โรคเกาต์: false,
        ไตวายเรื้อรัง: false,
        กล้ามเนื้อหัวใจขาดเลือด: false,
        หลอดเลือดสมอง: false,
        ถุงลมโป่งพอง: false,
        โรคทางจิตเวช: false,
      });
    }
  };

  const handleUnknownDiseaseCheckbox = (checked: boolean) => {
    setUnknownDisease(checked);
    if (checked) {
      setHasDisease(false);
      setNoDisease(false);
      setSelectedDiseases({
        เบาหวาน: false,
        ความดันโลหิตสูง: false,
        โรคเกาต์: false,
        ไตวายเรื้อรัง: false,
        กล้ามเนื้อหัวใจขาดเลือด: false,
        หลอดเลือดสมอง: false,
        ถุงลมโป่งพอง: false,
        โรคทางจิตเวช: false,
      });
    }
  };

  const fillMockHealthyAnswers = () => {
    // Fill all food habit questions with the healthiest choice (giving score 5 total)
    const defaults: Record<string, number> = {};
    FOOD_HABIT_QUESTIONS.forEach(cat => {
      cat.questions.forEach(q => {
        // Find index that maps to score 1 (healthiest)
        const healthyIdx = q.scoreMapping.indexOf(1);
        defaults[q.id] = healthyIdx !== -1 ? healthyIdx : 2;
      });
    });
    setFoodHabitAnswers(defaults);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Number(visitNumber) === 1 && !hasConsented && !initialRecord) {
      setShowConsentModal(true);
      return;
    }

    await proceedSubmit();
  };

  const proceedSubmit = async () => {
    // Validation for food questions
    let missingQuestions: string[] = [];
    FOOD_HABIT_QUESTIONS.forEach((cat) => {
      cat.questions.forEach((q) => {
        if (foodHabitAnswers[q.id] === undefined) {
          missingQuestions.push(q.text.split(".")[0]);
        }
      });
    });

    if (missingQuestions.length > 0) {
      setShowValidationAlert(true);
      return;
    }

    // Compile family diseases list
    const familyHistory: string[] = [];
    if (noDisease) {
      familyHistory.push("ไม่มีโรคประจำตัว");
    } else if (unknownDisease) {
      familyHistory.push("ไม่ทราบ");
    } else {
      Object.entries(selectedDiseases).forEach(([disease, checked]) => {
        if (checked) familyHistory.push(disease);
      });
      if (familyHistory.length === 0) {
        familyHistory.push("ไม่ทราบ / ไม่มีข้อมูลโรคประจำตัวเด่นชัด");
      }
    }

    // Final scores calculation
    const getFinalCategoryScore = (catKey: "sweet" | "fat" | "salt") => {
      const category = FOOD_HABIT_QUESTIONS.find((c) => c.key === catKey);
      if (!category) return 5;
      let score = 0;
      category.questions.forEach((q) => {
        score += q.scoreMapping[foodHabitAnswers[q.id] || 0];
      });
      return score < 5 ? 5 : score;
    };

    const sweetScore = getFinalCategoryScore("sweet");
    const fatScore = getFinalCategoryScore("fat");
    const saltScore = getFinalCategoryScore("salt");

    const calculatedBmi = calculateBMI(Number(weight), Number(height));
    const htResult = calculateHTRisk(Number(bpSys), Number(bpDia));
    const dmResult = calculateDMRisk(sugar === "" ? 0 : Number(sugar), sugarFasting);

    const chosenDate = screeningDateText || isoToThaiDateString(screeningDateIso) || new Date().toLocaleDateString("th-TH");

    const record: Omit<ScreeningRecord, "id" | "createdAt"> & { foodHabitAnswers?: Record<string, number> } = {
      date: chosenDate,
      visitNumber: Number(visitNumber),
      name,
      participantType,
      age: Number(age),
      gender: gender as "ชาย" | "หญิง",
      address,
      modelType: modelType as "หมู่บ้าน" | "ตำบล" | "",
      district: district as DistrictType,
      subdistrict,
      targetArea,
      phone,
      familyHistory,
      smoking,
      alcohol,
      water,
      exercise,
      sleep,
      sodium,
      weight: Number(weight),
      height: Number(height),
      bpSys: Number(bpSys),
      bpDia: Number(bpDia),
      sugar: sugar === "" ? 0 : Number(sugar),
      sugarFasting,
      muscleMass: muscleMass === "" ? undefined : Number(muscleMass),
      followUpAction,
      followUpNote,
      bmi: calculatedBmi,
      htResult,
      dmResult,
      foodHabit: {
        sweet: evaluateFoodHabit(sweetScore, "sweet"),
        fat: evaluateFoodHabit(fatScore, "fat"),
        salt: evaluateFoodHabit(saltScore, "salt"),
      },
      foodHabitAnswers,
      personalPlan,
      hasConsented: initialRecord?.hasConsented || hasConsented,
    };

    const payload = (initialRecord && !isFollowUp) ? {
      ...record,
      date: chosenDate, // allow updating screening date during edit
      aiAdvice: initialRecord.aiAdvice, // keep existing aiAdvice
    } : record;

    let savedRecord: any = null;
    let isOfflineMode = false;
    let saveToSheetsSuccess = false;

    // Define the full record object we expect
    const recordId = (initialRecord && !isFollowUp) ? initialRecord.id : Date.now();
    const finalRecordObj = {
      ...payload,
      id: recordId,
      createdAt: (initialRecord && !isFollowUp) ? (initialRecord.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    // 1. Save to persistent server API
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: finalRecordObj })
      });
      if (res.ok) {
        savedRecord = finalRecordObj;
      }
    } catch (err) {
      console.warn("Server API save error:", err);
    }

    // 2. Persist to localStorage
    try {
      const local = localStorage.getItem("ncd_records");
      let currentRecords: any[] = [];
      if (local) {
        currentRecords = JSON.parse(local);
      }
      if (initialRecord && !isFollowUp) {
        currentRecords = currentRecords.map((r) => r.id === recordId ? finalRecordObj : r);
      } else {
        currentRecords = [finalRecordObj, ...currentRecords.filter(r => r.id !== recordId)];
      }
      localStorage.setItem("ncd_records", JSON.stringify(currentRecords));
    } catch (storageError) {
      console.error("Failed to save to localStorage:", storageError);
    }

    // 3. Sync to Supabase if available
    try {
      await supabase.from('ncd_records').upsert({
         id: finalRecordObj.id,
         name: finalRecordObj.name,
         visit_number: finalRecordObj.visitNumber,
         age: finalRecordObj.age,
         gender: finalRecordObj.gender,
         data: finalRecordObj,
         created_at: finalRecordObj.createdAt
      });
    } catch (error) {
      console.warn("Supabase form submit warning:", error);
    }

    savedRecord = finalRecordObj;

    // Clear Form Fields only if not editing and not in follow-up mode
    if (!initialRecord || isFollowUp) {
      setHasConsented(false);
      setName("");
      setVisitNumber(prev => prev + 1);
      setAge("");
      setGender("");
      setAddress("");
      setDistrict("");
      setSubdistrict("");
      setTargetArea("");
      setPhone("");
      setNoDisease(false);
      setUnknownDisease(false);
      setHasDisease(false);
      setSelectedDiseases({
        เบาหวาน: false,
        ความดันโลหิตสูง: false,
        โรคเกาต์: false,
        ไตวายเรื้อรัง: false,
        กล้ามเนื้อหัวใจขาดเลือด: false,
        หลอดเลือดสมอง: false,
        ถุงลมโป่งพอง: false,
        โรคทางจิตเวช: false,
      });
      setFoodHabitAnswers({});
      setFollowUpNote("");
    }

    if (isOfflineMode) {
      setOfflineSavedRecord(savedRecord);
      setShowOfflineSuccessAlert(true);
    } else {
      onSubmitSuccess(savedRecord, !isFollowUp && !!initialRecord);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Introduction Card - Clean Minimalism */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <HeartPulse className="w-5.5 h-5.5 text-blue-600 animate-pulse" />
            {initialRecord 
              ? isFollowUp 
                ? `บันทึกการติดตามตรวจสุขภาพ (ครั้งที่ ${initialRecord.visitNumber + 1}): คุณ${initialRecord.name}` 
                : `แก้ไขข้อมูลคัดกรอง: คุณ${initialRecord.name}` 
              : `ระบบบันทึกและคัดกรองเบาหวาน-ความดันโลหิตสูง`}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {initialRecord 
              ? isFollowUp
                ? `ขณะนี้กำลังทำการติดตามคัดกรองครั้งถัดไป โดยอ้างอิงข้อมูลพื้นฐานจากการคัดกรองรอบก่อนหน้า (ครั้งที่ ${initialRecord.visitNumber}) คุณสามารถแก้ไขสัญญาณชีพ พฤติกรรม และแบบประเมินสำหรับครั้งนี้แล้วบันทึกเป็นประวัติใหม่ได้`
                : `ขณะนี้คุณกำลังทำการแก้ไขข้อมูลประวัติพฤติกรรมและข้อมูลทางคลินิกของผู้รับการคัดกรอง เมื่อทำการแก้ไขเสร็จแล้วสามารถบันทึกข้อมูลได้ทันที`
              : `บันทึกข้อมูลประวัติพฤติกรรม สัญญาณชีพทางคลินิก และประเมินพฤติกรรมการบริโภค หวาน มัน เค็ม ตามเกณฑ์มาตรฐาน เพื่อป้องกันกลุ่มเสี่ยงและวางแผนการจัดการสุขภาพ`}
          </p>
        </div>
        {!initialRecord && (
          <button
            type="button"
            onClick={fillMockHealthyAnswers}
            className="bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 text-xs py-2 px-3.5 rounded-xl transition-all font-semibold self-stretch sm:self-auto text-center cursor-pointer"
          >
            ใส่คำตอบปกติเป็นข้อมูลตัวอย่าง
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Personal Profile */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-150 flex items-center gap-2">
            <User className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">ส่วนที่ 1: ข้อมูลทั่วไปของผู้รับการคัดกรอง</h3>
          </div>
          
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* ประเภทผู้รับการคัดกรอง / กลุ่มข้อมูล */}
            <div className="sm:col-span-2 lg:col-span-3 bg-gradient-to-r from-blue-50/70 via-slate-50 to-purple-50/70 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>ประเภทผู้รับการคัดกรอง / กลุ่มข้อมูล <span className="text-rose-500">*</span></span>
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  ระบุว่าเป็นข้อมูลของกลุ่มเป้าหมายโครงการ หรือ คณะทำงาน
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. กลุ่มเป้าหมายโครงการ */}
                <label 
                  onClick={() => setParticipantType("กลุ่มเป้าหมายโครงการ")}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    participantType === "กลุ่มเป้าหมายโครงการ"
                      ? "bg-white border-blue-500 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-white/80 border-slate-200 hover:bg-white text-slate-600"
                  }`}
                >
                  <input 
                    type="radio" 
                    name="participantType" 
                    value="กลุ่มเป้าหมายโครงการ"
                    checked={participantType === "กลุ่มเป้าหมายโครงการ"}
                    onChange={() => setParticipantType("กลุ่มเป้าหมายโครงการ")}
                    className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="text-blue-900">1. กลุ่มเป้าหมายโครงการ</span>
                      {participantType === "กลุ่มเป้าหมายโครงการ" && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          เลือกอยู่
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      ประชาชนกลุ่มเป้าหมายในพื้นที่ 21 พื้นที่โครงการ ที่เข้ารับการตรวจคัดกรองสุขภาพ
                    </p>
                  </div>
                </label>

                {/* 2. คณะทำงาน */}
                <label 
                  onClick={() => setParticipantType("คณะทำงาน")}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    participantType === "คณะทำงาน"
                      ? "bg-white border-purple-500 shadow-xs ring-2 ring-purple-500/20"
                      : "bg-white/80 border-slate-200 hover:bg-white text-slate-600"
                  }`}
                >
                  <input 
                    type="radio" 
                    name="participantType" 
                    value="คณะทำงาน"
                    checked={participantType === "คณะทำงาน"}
                    onChange={() => setParticipantType("คณะทำงาน")}
                    className="mt-0.5 w-4 h-4 text-purple-600 focus:ring-purple-500 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="text-purple-900">2. คณะทำงาน</span>
                      {participantType === "คณะทำงาน" && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          เลือกอยู่
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      คณะทำงานโครงการ ทีมงานสาธารณสุข อสม. แกนนำชุมชน หรือผู้ขับเคลื่อนโครงการ
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* วันที่คัดกรอง */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>วันที่คัดกรอง <span className="text-rose-500">*</span></span>
                {screeningDateText && (
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-150">
                    {screeningDateText}
                  </span>
                )}
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  required 
                  value={screeningDateIso} 
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 p-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white font-medium"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                🗓️ {formatThaiDateReadable(screeningDateIso) || screeningDateText}
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อ - นามสกุล <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="ระบุคำนำหน้าชื่อ และ ชื่อ-นามสกุล"
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ครั้งที่มาคัดกรอง <span className="text-rose-500">*</span></label>
              <input 
                type="number" 
                required 
                min={1} 
                value={visitNumber} 
                onChange={(e) => setVisitNumber(Number(e.target.value))}
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">อายุ (ปี) <span className="text-rose-500">*</span></label>
              <input 
                type="number" 
                required 
                min={1} 
                value={age} 
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
                placeholder="ระบุอายุ (ปี)"
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">เพศ <span className="text-rose-500">*</span></label>
              <select 
                required 
                value={gender} 
                onChange={(e) => setGender(e.target.value as "ชาย" | "หญิง")}
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">เลือกเพศ</option>
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
              <input 
                type="tel" 
                required 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 0812345678"
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">ที่อยู่ (บ้านเลขที่ หมู่ ซอย ชุมชน) <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                required 
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                placeholder="บ้านเลขที่ ถนน ชุมชน..."
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">โมเดล (หมู่บ้าน/ตำบล) <span className="text-rose-500">*</span></label>
              <select 
                required 
                value={modelType} 
                onChange={(e) => {
                  const val = e.target.value as "หมู่บ้าน" | "ตำบล" | "";
                  setModelType(val);
                  setDistrict("");
                  setSubdistrict("");
                  setTargetArea("");
                }}
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">เลือกโมเดล</option>
                <option value="หมู่บ้าน">หมู่บ้าน</option>
                <option value="ตำบล">ตำบล</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">อำเภอ (จังหวัดสตูล) <span className="text-rose-500">*</span></label>
              <select 
                required 
                disabled={!modelType}
                value={district} 
                onChange={(e) => {
                  const val = e.target.value as DistrictType | "";
                  setDistrict(val);
                  setSubdistrict("");
                  setTargetArea("");
                }}
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">{modelType ? "เลือกอำเภอ" : "โปรดเลือกโมเดลก่อน..."}</option>
                {availableDistricts.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ตำบล <span className="text-rose-500">*</span></label>
              <select 
                required 
                disabled={!district}
                value={subdistrict} 
                onChange={(e) => {
                  const val = e.target.value;
                  setSubdistrict(val);
                  setTargetArea("");
                }}
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">{district ? "เลือกตำบล" : "โปรดเลือกอำเภอก่อน..."}</option>
                {availableSubdistricts.map((sub, index) => (
                  <option key={index} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">พื้นที่เป้าหมาย (หมู่บ้าน/รพ.สต.) <span className="text-rose-500">*</span></label>
              <select 
                required 
                disabled={!subdistrict}
                value={targetArea} 
                onChange={(e) => setTargetArea(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">{subdistrict ? "เลือกพื้นที่เป้าหมาย" : "โปรดเลือกตำบลก่อน..."}</option>
                {availableAreas.map((area, index) => (
                  <option key={index} value={area}>{area}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Section 2: Health History & Habits */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-150 flex items-center gap-2">
            <ClipboardCheck className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">ส่วนที่ 2: ประวัติครอบครัวและพฤติกรรมประจำวัน</h3>
          </div>
          
          <div className="p-6 space-y-6">
            
            {/* Family history disease */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2.5">
                1. บิดามารดาหรือพี่น้องร่วมบิดามารดา (สายตรง) ของท่านมีประวัติเจ็บป่วยด้วยโรคใดบ้าง?
              </p>
              
              <div className="space-y-4">
                
                {/* Checkbox item 1 */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={hasDisease}
                    onChange={(e) => {
                      setHasDisease(e.target.checked);
                      if (e.target.checked) {
                        setNoDisease(false);
                        setUnknownDisease(false);
                      }
                    }}
                    className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-0.5"
                  />
                  <span className="text-sm font-medium text-slate-800">มีโรคประจำตัวในกลุ่มสายตรงต่อไปนี้ (เลือกได้หลายข้อ)</span>
                </label>

                {/* Grid of sub-diseases */}
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3.5 pl-7 transition-all duration-200 ${
                  hasDisease ? "opacity-100 pointer-events-auto" : "opacity-40 pointer-events-none"
                }`}>
                  {Object.keys(selectedDiseases).map((disease) => (
                    <label key={disease} className="flex items-center gap-2 cursor-pointer select-none hover:bg-slate-50 p-1.5 rounded-lg border border-slate-100 transition-colors">
                      <input 
                        type="checkbox"
                        checked={selectedDiseases[disease]}
                        onChange={(e) => handleDiseaseCheckbox(disease, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium text-slate-700">{disease}</span>
                    </label>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 border-t border-slate-100 pt-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={noDisease}
                      onChange={(e) => handleNoDiseaseCheckbox(e.target.checked)}
                      className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">ไม่มีประวัติโรคในกลุ่มครอบครัว</span>
                  </label>
                  
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={unknownDisease}
                      onChange={(e) => handleUnknownDiseaseCheckbox(e.target.checked)}
                      className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">ไม่ทราบ / ไม่มีข้อมูล</span>
                  </label>
                </div>

              </div>
            </div>

            {/* Life habits select elements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 border-t border-slate-100 pt-6">
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ประวัติการสูบบุหรี่ <span className="text-rose-500">*</span></label>
                <select 
                  value={smoking} 
                  onChange={(e) => setSmoking(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="ไม่สูบ">ไม่สูบ</option>
                  <option value="เคยสูบแต่เลิกแล้ว">เคยสูบแต่เลิกแล้ว (มากกว่า 1 ปี)</option>
                  <option value="ยังสูบอยู่">ยังสูบอยู่ / เลิกสูบยังไม่ถึง 1 ปี</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">การดื่มแอลกอฮอล์ <span className="text-rose-500">*</span></label>
                <select 
                  value={alcohol} 
                  onChange={(e) => setAlcohol(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="ไม่ดื่มเลย">ไม่ดื่มเลย</option>
                  <option value="เคยดื่มแต่เลิกแล้ว">เคยดื่มแต่เลิกแล้ว</option>
                  <option value="ดื่มเป็นครั้งคราว">ดื่มเป็นครั้งคราว (นานๆ ครั้ง)</option>
                  <option value="ดื่มเป็นประจำ">ดื่มเป็นประจำ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">การดื่มน้ำเปล่า/วัน <span className="text-rose-500">*</span></label>
                <select 
                  value={water} 
                  onChange={(e) => setWater(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="น้อยกว่า 6 แก้ว">น้อยกว่า 6 แก้ว</option>
                  <option value="6-8 แก้ว">6-8 แก้ว (ประมาณ 1.5 - 2 ลิตร)</option>
                  <option value="มากกว่า 8 แก้ว">มากกว่า 8 แก้ว</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">การออกกำลังกาย <span className="text-rose-500">*</span></label>
                <select 
                  value={exercise} 
                  onChange={(e) => setExercise(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="ไม่ออกกำลังกายเลย">ไม่ออกกำลังกายเลย / ทำงานนั่งเป็นหลัก</option>
                  <option value="1-2 วัน/สัปดาห์">ออกกำลังกาย 1-2 วัน/สัปดาห์</option>
                  <option value="3 วันขึ้นไป/สัปดาห์">ออกกำลังกาย 3 วันขึ้นไป/สัปดาห์ (30 นาทีขึ้นไป)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">การนอนหลับเฉลี่ย <span className="text-rose-500">*</span></label>
                <select 
                  value={sleep} 
                  onChange={(e) => setSleep(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="น้อยกว่า 6 ชั่วโมง">น้อยกว่า 6 ชั่วโมง / มีปัญหาหลับยาก</option>
                  <option value="6-8 ชั่วโมง">6-8 ชั่วโมง</option>
                  <option value="มากกว่า 8 ชั่วโมง">มากกว่า 8 ชั่วโมง</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">พฤติกรรมการทานรสเค็ม <span className="text-rose-500">*</span></label>
                <select 
                  value={sodium} 
                  onChange={(e) => setSodium(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="ไม่ค่อยทานเค็ม">ไม่ปรุงเพิ่ม / เลี่ยงอาหารแปรรูป หมักดอง</option>
                  <option value="ทานปานกลาง">ปรุงรสเพิ่มบางครั้ง / ทานอาหารแปรรูป 1-2 ครั้งต่อวีค</option>
                  <option value="ทานเค็มประจำ">ทานรสจัด / ปรุงเพิ่มประจำ / ทานสำเร็จรูปบ่อย</option>
                </select>
              </div>

            </div>

          </div>
        </div>

        {/* Section 3: Physical Measurements & Vitals */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-150 flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">ส่วนที่ 3: สัญญาณชีพและการตรวจร่างกายทางคลินิก</h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">น้ำหนัก (กิโลกรัม) <span className="text-rose-500">*</span></label>
                <input 
                  type="number" 
                  step="0.1"
                  required
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : "")}
                  placeholder="เช่น 65.5"
                  className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ส่วนสูง (เซนติเมตร) <span className="text-rose-500">*</span></label>
                <input 
                  type="number" 
                  step="0.1"
                  required
                  value={height} 
                  onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : "")}
                  placeholder="เช่น 168.0"
                  className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ความดัน ตัวบน (Systolic) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    value={bpSys} 
                    onChange={(e) => setBpSys(e.target.value ? Number(e.target.value) : "")}
                    placeholder="เช่น 120"
                    className="w-full text-sm rounded-xl border border-slate-300 p-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 text-xs font-medium">mmHg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ความดัน ตัวล่าง (Diastolic) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    value={bpDia} 
                    onChange={(e) => setBpDia(e.target.value ? Number(e.target.value) : "")}
                    placeholder="เช่น 80"
                    className="w-full text-sm rounded-xl border border-slate-300 p-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 text-xs font-medium">mmHg</span>
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    น้ำตาลในเลือด (DTX) <span className="text-slate-400 text-[10px] font-normal">(ไม่บังคับ)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">สภาวะการตรวจ:</span>
                </div>

                {/* ตัวเลือก 1. อดอาหาร 2. ไม่อดอาหาร */}
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setSugarFasting("อดอาหาร")}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      sugarFasting === "อดอาหาร"
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>1. อดอาหาร</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSugarFasting("ไม่อดอาหาร")}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      sugarFasting === "ไม่อดอาหาร"
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs font-semibold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>2. ไม่อดอาหาร</span>
                  </button>
                </div>

                <div className="relative">
                  <input 
                    type="number" 
                    value={sugar} 
                    onChange={(e) => setSugar(e.target.value ? Number(e.target.value) : "")}
                    placeholder={sugarFasting === "อดอาหาร" ? "เช่น 95 (เกณฑ์อดอาหาร ≥8 ชม.)" : "เช่น 125 (ไม่อดอาหาร)"}
                    className="w-full text-sm rounded-xl border border-slate-300 p-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 text-xs font-medium">mg/dL</span>
                </div>

                <p className="text-[10px] text-slate-500 mt-1">
                  {sugarFasting === "อดอาหาร" 
                    ? "* อดอาหาร ≥8 ชม.: ปกติ <100, เสี่ยง 100-125, สงสัยป่วย ≥126 mg/dL" 
                    : "* ไม่อดอาหาร: ปกติ <140, เสี่ยง 140-199, สงสัยป่วย ≥200 mg/dL"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">มวลกล้ามเนื้อ <span className="text-slate-400 text-[10px] font-normal">(ไม่บังคับ)</span></label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1"
                    value={muscleMass} 
                    onChange={(e) => setMuscleMass(e.target.value ? Number(e.target.value) : "")}
                    placeholder="เช่น 45.2"
                    className="w-full text-sm rounded-xl border border-slate-300 p-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 text-xs font-medium">กก.</span>
                </div>
              </div>

            </div>

            {/* Live calculations feedback banner */}
            {(liveBmi !== "0.0" || liveHtResult || liveDmResult) && (
              <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {liveBmi !== "0.0" && (
                  <div className="text-xs">
                    <span className="text-slate-500">ผลการประเมินดัชนีมวลกาย (BMI):</span>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      {liveBmi} • {
                        parseFloat(liveBmi) >= 25 ? <span className="text-red-600">อ้วนมาก</span> :
                        parseFloat(liveBmi) >= 23 ? <span className="text-amber-600">น้ำหนักเกิน</span> :
                        parseFloat(liveBmi) >= 18.5 ? <span className="text-emerald-600">ปกติ</span> : <span className="text-blue-500">ผอม</span>
                      }
                    </div>
                  </div>
                )}
                {liveHtResult && (
                  <div className="text-xs">
                    <span className="text-slate-500">คัดกรองความดันโลหิต (HT):</span>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      <span className={liveHtResult.color.split(" ")[0]}>{liveHtResult.label.split(" ")[0]}</span>
                    </div>
                  </div>
                )}
                {liveDmResult && (
                  <div className="text-xs">
                    <span className="text-slate-500">คัดกรองเบาหวาน (DM - DTX {sugarFasting}):</span>
                    <div className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className={liveDmResult.color.split(" ")[0]}>{liveDmResult.label.split(" ")[0]}</span>
                      <span className="text-slate-500 font-normal text-xs">({sugar} mg/dL)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Section 4: Follow up and Referral */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-150 flex items-center gap-2">
            <ClipboardCheck className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">ส่วนที่ 4: การติดตามผลและการส่งต่อข้อมูลเบื้องต้น</h3>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">ผลการคัดกรองหลักและการจัดหมวดการดูแล <span className="text-rose-500">*</span></label>
              <div className="space-y-2">
                {[
                  "ให้คำแนะนำ 3อ. 2ส.",
                  "ส่งต่อ รพ.สต.",
                  "ส่งต่อโรงพยาบาล"
                ].map((action) => (
                  <label key={action} className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200 select-none transition-colors">
                    <input 
                      type="radio"
                      name="followUpActionRadio"
                      value={action}
                      checked={followUpAction === action}
                      onChange={() => setFollowUpAction(action)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span>{action}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">หมายเหตุของเจ้าหน้าที่ / ประวัติอาการสำคัญเด่นชัด</label>
              <textarea 
                rows={4}
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="เช่น มีอาการวิงเวียนศีรษะร่วมด้วย ปวดท้ายทอย ชาปลายมือปลายเท้า หรือมีข้อกำชับเพิ่มเติมเกี่ยวกับการติดตามพฤติกรรม"
                className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Sweet, Fat, Salt Food Questionnaires */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-150 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Coffee className="w-4.5 h-4.5 text-blue-600" />
                ส่วนที่ 5: ประเมินพฤติกรรมการบริโภคอาหาร (หวาน มัน เค็ม)
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5">กรุณาประเมินระดับความถี่ของพฤติกรรมของผู้ถูกคัดกรองในรอบ 1 สัปดาห์ที่ผ่านมา</p>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const preset: Record<string, number> = {};
                  FOOD_HABIT_QUESTIONS.forEach(cat => {
                    cat.questions.forEach(q => {
                      // healthy is index that scores 1, otherwise choose 2 or rarely
                      const goodIdx = q.scoreMapping.indexOf(1);
                      preset[q.id] = goodIdx;
                    });
                  });
                  setFoodHabitAnswers(preset);
                }}
                className="text-[10px] bg-slate-100 border border-slate-300 px-2 py-1 rounded hover:bg-slate-200 font-medium text-slate-600 transition-colors"
              >
                เลือก "ปกติ" ทุกข้อ
              </button>
              <button
                type="button"
                onClick={() => {
                  const preset: Record<string, number> = {};
                  FOOD_HABIT_QUESTIONS.forEach(cat => {
                    cat.questions.forEach(q => {
                      // risky is index that scores 3
                      const badIdx = q.scoreMapping.indexOf(3);
                      preset[q.id] = badIdx;
                    });
                  });
                  setFoodHabitAnswers(preset);
                }}
                className="text-[10px] bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 rounded hover:bg-rose-100 font-medium transition-colors"
              >
                เลือก "เสี่ยงมาก" ทุกข้อ
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {FOOD_HABIT_QUESTIONS.map((cat) => (
              <div key={cat.key} className="p-0">
                <div className="bg-slate-50/70 border-b border-slate-150 px-6 py-3.5 font-bold text-slate-700 text-xs uppercase tracking-wider flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-blue-500 animate-pulse" />
                    <span>{cat.title}</span>
                  </div>
                  
                  {/* Category real-time score display */}
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    ประเมิน: <span className={getCategoryScoreAndEvaluation(cat.key).evaluation.color}>
                      {getCategoryScoreAndEvaluation(cat.key).evaluation.level} ({getCategoryScoreAndEvaluation(cat.key).evaluation.score} คะแนน)
                    </span>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px] text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                        <th className="py-2 px-6 w-5/12">พฤติกรรมการบริโภค</th>
                        <th className="py-2 px-2 text-center w-7/36">ทุกวัน / เกือบทุกวัน</th>
                        <th className="py-2 px-2 text-center w-7/36">3 - 4 ครั้งต่อสัปดาห์</th>
                        <th className="py-2 px-2 text-center w-7/36">แทบไม่ทำ / ไม่เคย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {cat.questions.map((q) => {
                        const scoreMap = q.scoreMapping;
                        return (
                          <tr key={q.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-3.5 px-6 font-medium text-slate-700 leading-tight">
                              {q.text}
                            </td>
                            
                            {/* Choice 0 (Everyday) */}
                            <td className="py-3.5 px-2 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1 rounded-full hover:bg-slate-100 w-8 h-8">
                                <input 
                                  type="radio" 
                                  name={q.id}
                                  value={0}
                                  checked={foodHabitAnswers[q.id] === 0}
                                  onChange={() => setFoodHabitAnswers(prev => ({ ...prev, [q.id]: 0 }))}
                                  className="w-4.5 h-4.5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                />
                              </label>
                              <div className="text-[10px] text-slate-400 font-bold font-mono">({scoreMap[0]} คะแนน)</div>
                            </td>

                            {/* Choice 1 (3-4 times) */}
                            <td className="py-3.5 px-2 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1 rounded-full hover:bg-slate-100 w-8 h-8">
                                <input 
                                  type="radio" 
                                  name={q.id}
                                  value={1}
                                  checked={foodHabitAnswers[q.id] === 1}
                                  onChange={() => setFoodHabitAnswers(prev => ({ ...prev, [q.id]: 1 }))}
                                  className="w-4.5 h-4.5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                />
                              </label>
                              <div className="text-[10px] text-slate-400 font-bold font-mono">({scoreMap[1]} คะแนน)</div>
                            </td>

                            {/* Choice 2 (Rarely/Never) */}
                            <td className="py-3.5 px-2 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1 rounded-full hover:bg-slate-100 w-8 h-8">
                                <input 
                                  type="radio" 
                                  name={q.id}
                                  value={2}
                                  checked={foodHabitAnswers[q.id] === 2}
                                  onChange={() => setFoodHabitAnswers(prev => ({ ...prev, [q.id]: 2 }))}
                                  className="w-4.5 h-4.5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                />
                              </label>
                              <div className="text-[10px] text-slate-400 font-bold font-mono">({scoreMap[2]} คะแนน)</div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Category feedback box */}
                <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex items-start gap-2.5 text-xs">
                  <div className={`p-1.5 rounded-lg shrink-0 ${getCategoryScoreAndEvaluation(cat.key).evaluation.class}`}>
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">
                      ความเสี่ยงอาหารประเภทนี้: <span className={getCategoryScoreAndEvaluation(cat.key).evaluation.color}>{getCategoryScoreAndEvaluation(cat.key).evaluation.level} ({getCategoryScoreAndEvaluation(cat.key).evaluation.score} คะแนน)</span>
                    </span>
                    <p className="text-slate-500 mt-1 leading-relaxed text-justify">
                      {getCategoryScoreAndEvaluation(cat.key).evaluation.description || "โปรดตอบคำถามให้ครบทุกข้อเพื่อดูคำอธิบายประเมินผลอย่างเป็นขั้นตอนและให้แนวทางปรับตัว"}
                    </p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Personal Plan */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-150">
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ClipboardCheck className="w-4.5 h-4.5 text-blue-600" />
              ส่วนที่ 6: แผนปรับเปลี่ยนพฤติกรรมรายบุคคล (Personal Plan)
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5">ระบุแผนและประเมินผลการทำตามแผนของรอบที่ผ่านมา</p>
          </div>
          
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                    <th className="py-2 px-4 w-1/5">พฤติกรรม</th>
                    <th className="py-2 px-4 w-2/5">แผนปรับเปลี่ยนในครั้งนี้</th>
                    <th className="py-2 px-4 text-center w-2/5">ประเมินผลแผนรอบที่แล้ว</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {[
                    { key: "sweet", label: "หวาน" },
                    { key: "fat", label: "มัน" },
                    { key: "salt", label: "เค็ม" },
                    { key: "sleep", label: "การนอน" },
                    { key: "water", label: "การดื่มน้ำ" },
                    { key: "exercise", label: "การออกกำลังกาย" },
                  ].map((item) => (
                    <tr key={item.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{item.label}</td>
                      <td className="py-3.5 px-4">
                        <input 
                          type="text"
                          value={personalPlan[item.key as keyof PersonalPlan]?.plan || ""}
                          onChange={(e) => setPersonalPlan(prev => ({
                            ...prev, 
                            [item.key]: { ...prev[item.key as keyof PersonalPlan], plan: e.target.value }
                          }))}
                          placeholder={`ระบุแผนเรื่อง${item.label}...`}
                          className="w-full border-b border-slate-300 focus:border-blue-500 outline-none px-2 py-1.5 bg-transparent"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center gap-5">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="radio" 
                              name={`plan_${item.key}`}
                              checked={personalPlan[item.key as keyof PersonalPlan]?.achieved === true}
                              onChange={() => setPersonalPlan(prev => ({
                                ...prev, 
                                [item.key]: { ...prev[item.key as keyof PersonalPlan], achieved: true }
                              }))}
                              className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                            />
                            <span className="text-emerald-700 font-medium text-xs">ทำได้ (1)</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="radio" 
                              name={`plan_${item.key}`}
                              checked={personalPlan[item.key as keyof PersonalPlan]?.achieved === false}
                              onChange={() => setPersonalPlan(prev => ({
                                ...prev, 
                                [item.key]: { ...prev[item.key as keyof PersonalPlan], achieved: false }
                              }))}
                              className="w-4 h-4 text-rose-600 border-slate-300 focus:ring-rose-500"
                            />
                            <span className="text-rose-700 font-medium text-xs">ทำไม่ได้ (0)</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex justify-end gap-3.5 pt-4">
          {initialRecord && onCancelEdit && (
            <button 
              type="button"
              onClick={onCancelEdit}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all cursor-pointer text-xs"
            >
              ยกเลิกการบันทึก
            </button>
          )}
          <button 
            type="submit"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold py-3 px-10 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <ClipboardCheck className="w-4.5 h-4.5" />
            {initialRecord 
              ? isFollowUp 
                ? "บันทึกการติดตามตรวจครั้งใหม่" 
                : "บันทึกการแก้ไข" 
              : "บันทึกข้อมูลและวิเคราะห์ผล"}
          </button>
        </div>

      </form>
      
      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onAccept={async () => {
          setHasConsented(true);
          setShowConsentModal(false);
          await proceedSubmit();
        }}
        name={name}
      />

      {/* Custom Validation Alert Modal */}
      {showValidationAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-rose-100 rounded-full mb-4 mx-auto animate-bounce">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">ข้อมูลไม่ครบถ้วน</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              กรุณาตอบคำถามประเมินพฤติกรรมการบริโภคอาหาร <br/>
              <span className="font-semibold text-rose-600">(หมวดหวาน มัน เค็ม) ให้ครบทุกข้อ</span> <br/>
              เพื่อให้ระบบสามารถประเมินผลและวิเคราะห์ระดับความเสี่ยงของท่านได้อย่างสมบูรณ์
            </p>
            <button 
              onClick={() => setShowValidationAlert(false)}
              className="w-full py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              รับทราบและกลับไปตอบคำถาม
            </button>
          </div>
        </div>
      )}

      {/* Custom Offline Success Alert Modal */}
      {showOfflineSuccessAlert && offlineSavedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-4 mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">บันทึกข้อมูลแบบออฟไลน์สำเร็จ</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              เซิร์ฟเวอร์หลักไม่ได้เชื่อมต่อชั่วคราว <br/>
              <span className="font-semibold text-emerald-600">ระบบบันทึกข้อมูลไว้ในเครื่องของคุณเรียบร้อยแล้ว</span> <br/>
              เมื่อระบบสามารถเชื่อมต่อได้ข้อมูลจะได้รับการซิงค์ตามขั้นตอน
            </p>
            <button 
              onClick={() => {
                setShowOfflineSuccessAlert(false);
                onSubmitSuccess(offlineSavedRecord, !isFollowUp && !!initialRecord);
              }}
              className="w-full py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              ตกลงและดำเนินการต่อ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
