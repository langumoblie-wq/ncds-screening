import { EvaluationResult, FoodHabitCategoryResult } from "./types";

// HT Criteria (Hypertension)
export function calculateHTRisk(sys: number, dia: number): EvaluationResult {
  if (sys >= 140 || dia >= 90) {
    return {
      level: "danger",
      label: "สงสัยป่วย (สีแดง)",
      color: "text-red-600 bg-red-50 border-red-200",
      class: "status-danger bg-red-50 text-red-700 border border-red-200",
    };
  }
  if (sys >= 120 || dia >= 80) {
    return {
      level: "risk",
      label: "กลุ่มเสี่ยง (สีเขียวอ่อน)",
      color: "text-green-700 bg-green-50 border-green-200",
      class: "status-risk bg-green-50 text-green-800 border border-green-200",
    };
  }
  return {
    level: "normal",
    label: "ปกติ (สีขาว)",
    color: "text-slate-700 bg-white border-slate-200",
    class: "status-normal bg-white text-slate-800 border border-slate-200",
  };
}

// DM Criteria (Diabetes Mellitus)
export function calculateDMRisk(
  sugar: number,
  fastingType: "อดอาหาร" | "ไม่อดอาหาร" | "fasting" | "non_fasting" | string = "อดอาหาร"
): EvaluationResult {
  const isNonFasting = fastingType === "ไม่อดอาหาร" || fastingType === "non_fasting";

  // Case 1: ไม่อดอาหาร (RBS / Random DTX)
  // ปกติ: < 140 mg/dL, กลุ่มเสี่ยง: 140 - 199 mg/dL, สงสัยป่วย: >= 200 mg/dL
  if (isNonFasting) {
    if (sugar >= 200) {
      return {
        level: "danger",
        label: "สงสัยป่วย (สีแดง)",
        color: "text-red-600 bg-red-50 border-red-200",
        class: "status-danger bg-red-50 text-red-700 border border-red-200",
      };
    }
    if (sugar >= 140) {
      return {
        level: "risk",
        label: "กลุ่มเสี่ยง (สีเขียวอ่อน)",
        color: "text-green-700 bg-green-50 border-green-200",
        class: "status-risk bg-green-50 text-green-800 border border-green-200",
      };
    }
    return {
      level: "normal",
      label: "ปกติ (สีขาว)",
      color: "text-slate-700 bg-white border-slate-200",
      class: "status-normal bg-white text-slate-800 border border-slate-200",
    };
  }

  // Case 2: อดอาหาร (FBS / Fasting DTX งดน้ำ-อาหารอย่างน้อย 8 ชั่วโมง)
  // ปกติ: < 100 mg/dL, กลุ่มเสี่ยง: 100 - 125 mg/dL, สงสัยป่วย: >= 126 mg/dL
  if (sugar >= 126) {
    return {
      level: "danger",
      label: "สงสัยป่วย (สีแดง)",
      color: "text-red-600 bg-red-50 border-red-200",
      class: "status-danger bg-red-50 text-red-700 border border-red-200",
    };
  }
  if (sugar >= 100) {
    return {
      level: "risk",
      label: "กลุ่มเสี่ยง (สีเขียวอ่อน)",
      color: "text-green-700 bg-green-50 border-green-200",
      class: "status-risk bg-green-50 text-green-800 border border-green-200",
    };
  }
  return {
    level: "normal",
    label: "ปกติ (สีขาว)",
    color: "text-slate-700 bg-white border-slate-200",
    class: "status-normal bg-white text-slate-800 border border-slate-200",
  };
}

// BMI Calculation
export function calculateBMI(weight: number, height: number): string {
  if (!weight || !height) return "0.0";
  const hMeters = height / 100;
  return (weight / (hMeters * hMeters)).toFixed(1);
}

// Evaluate food consumption questionnaires
export function evaluateFoodHabit(score: number, type: "sweet" | "fat" | "salt"): FoodHabitCategoryResult {
  let level: "เสี่ยงน้อย" | "เสี่ยงปานกลาง" | "เสี่ยงสูง" | "เสี่ยงสูงมาก" = "เสี่ยงน้อย";
  let color = "text-emerald-600";
  let bgClass = "bg-emerald-50 border-emerald-200";
  let description = "";

  if (score === 5) {
    level = "เสี่ยงน้อย";
    color = "text-emerald-600";
    bgClass = "bg-emerald-50 border-emerald-200";
    if (type === "sweet") {
      description = "คุณบริโภคน้ำตาลในปริมาณที่พอเหมาะ หากมีนิสัยในการบริโภคแบบนี้ คุณจะมีความเสี่ยงต่ำในการมีรอบพุงเกิน เพราะน้ำตาลส่วนเกินเป็นสาเหตุหลักของการเกิดไขมันสะสมจนมีรอบพุงเกินปกติ";
    } else if (type === "fat") {
      description = "คุณมีความเสี่ยงน้อยในการได้รับผลเสียจากการบริโภคไขมันไม่เหมาะสม หากคุณอยู่ในกลุ่มนี้เป็นไปได้ว่าคุณเป็นคนรักสุขภาพ มักจะไม่เกิดโรคที่เกิดจากการบริโภคไขมัน ชีวิตของคุณมีแนวโน้มว่าจะยืนนาน หากคุณบริโภคในส่วนอื่นๆ เหมาะสมด้วย";
    } else if (type === "salt") {
      description = "คุณได้รับโซเดียมในปริมาณที่น้อย ทำดีแล้วนะ แนะนำให้ปฏิบัติตัวแบบนี้ต่อไป";
    }
  } else if (score >= 6 && score <= 9) {
    level = "เสี่ยงปานกลาง";
    color = "text-blue-600";
    bgClass = "bg-blue-50 border-blue-200";
    if (type === "sweet") {
      description = "คุณมีความเสี่ยงปานกลางในแง่ของพฤติกรรมการบริโภคน้ำตาล คนที่อยู่ในความเสี่ยงระดับนี้อาจเริ่มมีพุงแล้ว รวมถึงค่าดัชนีมวลกายอาจเริ่มเกินเกณฑ์มาตรฐานแล้ว (มากกว่า 22.9 กิโลกรัม/เมตร 2)";
    } else if (type === "fat") {
      description = "คุณมีความเสี่ยงปานกลางในการเลือกบริโภคไขมัน คนที่อยู่ในความเสี่ยงระดับนี้อาจเริ่มมีพุงน้อยๆ หรือเริ่มปานกลางแล้ว รวมถึงค่าดัชนีมวลกายอาจเริ่มเกินเกณฑ์มาตรฐานแล้ว (มากกว่า 22.9 กิโลกรัม/เมตร 2)";
    } else if (type === "salt") {
      description = "คุณได้รับโซเดียมในระดับปานกลาง ยังถือว่าไม่มีอันตรายอะไรต่อสุขภาพ แต่คุณควรเริ่มตระหนักว่าไม่ควรบริโภคโซเดียมไปมากกว่านี้ ในวันหนึ่งเราไม่ควรบริโภคโซเดียมเกิน 2,000 มิลลิกรัมหรือเท่ากับเกลือ 1 ช้อนชา เริ่มหันมาเอาใจใส่ตัวเองได้แล้วว่า ตัวเองอาจได้รับโซเดียมโดยไม่รู้ตัวหรือเปล่า หลีกเลี่ยงการปรุงรสชาติเพิ่มเติมโดยไม่ทันชิม และลดอาหารแปรรูปลงบ้าง";
    }
  } else if (score >= 10 && score <= 13) {
    level = "เสี่ยงสูง";
    color = "text-amber-600";
    bgClass = "bg-amber-50 border-amber-200";
    if (type === "sweet") {
      description = "คุณมีความเสี่ยงสูงในแง่ของพฤติกรรมการบริโภคน้ำตาล บอกได้คร่าวๆ เลยว่าคุณได้รับน้ำตาลสูงเกือบทุกวัน และเกินปริมาณที่แนะนำของกรมอนามัย กล่าวคือ คนไทยไม่ควรได้รับน้ำตาลเกินวันละ 6 ช้อนชาต่อวัน หากได้รับเกินจากนี้จะทำให้มีความเสี่ยงต่อการเกิดภาวะน้ำหนักเกินและเป็นต้นเหตุของการเกิดโรคเบาหวานได้";
    } else if (type === "fat") {
      description = "คุณมีความเสี่ยงสูงในการเลือกบริโภคไขมัน อาจบอกได้คร่าวๆ เลยว่าคุณบริโภคปริมาณไขมันเกินเกือบทุกวัน หากอ้างอิงจากคนที่ต้องการพลังงานวันละ 1,600 kcal ต่อวัน คนเหล่านี้ไม่ควรได้รับน้ำมันเกิน 3 ช้อนโต๊ะต่อวัน หากได้รับเกินจากนี้จะทำให้มีความเสี่ยงต่อการเกิดภาวะน้ำหนักเกิน โรคไขมันในเลือดสูง โรคหัวใจและหลอดเลือด ภาวะสมองขาดเลือดเฉียบพลัน (Stroke) และภาวะต่างๆ ที่พร้อมจะสูบเงินในกระเป๋าคุณไปเป็นค่ารักษาโรค";
    } else if (type === "salt") {
      description = "คุณได้รับโซเดียมในปริมาณสูงแน่ๆ ถึงเวลาตระหนักถึงพฤติกรรมการบริโภคได้แล้ว ไม่เช่นนั้นในอนาคตคุณต้องรับอุปการะโรคความดันโลหิตสูง หรือโรคไตมาร่วมชีวิตใต้ชายคาเดียวกับคุณก็ได้ คงถึงเวลาบอกเลิกอาหารแปรรูป การปรุงรสชาติอย่างไม่บันยะบันยังเสียที";
    }
  } else if (score >= 14 && score <= 15) {
    level = "เสี่ยงสูงมาก";
    color = "text-red-600";
    bgClass = "bg-red-50 border-red-200";
    if (type === "sweet") {
      description = "คุณมีความเสี่ยงสูงมาก กับการได้รับน้ำตาลเกินจนทำร้ายสุขภาพและร่างกายของตัวคุณเองเข้าแล้ว ปริมาณน้ำตาลที่คุณได้รับทั้งรู้ตัว ไม่รู้ตัวหรือไมยากจะรับรู้ก็ตาม อยู่ในปริมาณสูงมาก สูงพอที่จะทำให้คุณอ้วนและน้ำหนักตัวเพิ่มได้เดือนละ 1-2 กิโลกรัมเลยทีเดียว ยังไม่รวมถึงความเสี่ยงในการเกิดโรคเบาหวาน โรคหัวใจและหลอดเลือด และโรคต่างๆ ที่ตามมาอีกขบวน";
    } else if (type === "fat") {
      description = "คุณมีพฤติกรรมการบริโภคไขมันที่อันตรายต่อชีวิตอันมีค่าของคุณมาก คุณมีความเสี่ยงสูงมากที่จะมีภาวะไขมันสูงในเลือด ไขมันพอกที่อวัยวะต่างๆ และอาจเริ่มเกิดการอุดตันของไขมันในเส้นเลือดไปแล้วก็ได้ เป็นไปได้ว่าอนาคตจะเกิดการแตกของเส้นเลือดและนำไปสู่ภาวะ Stroke ได้ ถ้าโชคดีอาจรอดชีวิตแต่เป็นอัมพาต ยิ่งถ้าโชคร้ายละก็จะเป็นการจบชีวิตแบบไม่ได้ตั้งตัว แนะนำว่าคุณควรรีบเปลี่ยนพฤติกรรมการบริโภคเดี๋ยวนี้ และออกกำลังกายเพิ่มขึ้นด้วย";
    } else if (type === "salt") {
      description = "คุณได้รับโซเดียมสูงมาก แนะนำให้ปรับเปลี่ยนพฤติกรรมการบริโภคโดยด่วน หากคุณไม่อยากเป็นโรคความดันโลหิตสูง โรคไต และพรรคพวกที่เตรียมคร่าชีวิตคุณ หากไม่รีบเปลี่ยนในตอนนี้อนาคตคุณอาจจะต้องไปโรงพยาบาลอาทิตย์ละ 3 – 4 ครั้ง เพื่อรับการฟอกไต เมื่อถึงเวลานั้นคุณจะไม่สามารถกินอาหารหลายๆ อย่างที่คุณชอบได้อย่างสบายใจอีกต่อไป ต้องเลือกกินอาหารที่ยุ่งยากกว่านี้หลายเท่าตัว เพราะฉะนั้นเปลี่ยนแปลงตอนนี้ยังไม่สายที่จะทำ";
    }
  }

  return {
    score,
    level,
    color,
    class: bgClass,
    description,
  };
}

export interface PingPongColorInfo {
  color: "white" | "light_green" | "dark_green" | "yellow" | "orange" | "red" | "black";
  label: string;
  nameTh: string;
  badgeClass: string; // Tailwind class
  textClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
  description: string;
}

export const PING_PONG_COLORS: Record<string, PingPongColorInfo> = {
  white: {
    color: "white",
    label: "สีขาว - กลุ่มปกติ",
    nameTh: "ปกติ (สีขาว)",
    badgeClass: "bg-white border-slate-200 text-slate-700 shadow-2xs",
    textClass: "text-slate-700",
    bgClass: "bg-white",
    borderClass: "border-slate-200",
    glowClass: "shadow-[0_0_12px_rgba(203,213,225,0.4)]",
    description: "สุขภาพปกติ ตรวจคัดกรองซ้ำปีละ 1 ครั้ง และส่งเสริมการดูแลสุขภาพเบื้องต้น"
  },
  light_green: {
    color: "light_green",
    label: "สีเขียวอ่อน - กลุ่มกลุ่มเสี่ยง",
    nameTh: "กลุ่มเสี่ยง (สีเขียวอ่อน)",
    badgeClass: "bg-emerald-50/60 border-emerald-200 text-emerald-800 shadow-2xs",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50/40",
    borderClass: "border-emerald-200",
    glowClass: "shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    description: "กลุ่มเสี่ยงสูง ต้องปรับพฤติกรรมสุขภาพด้วยหลัก 3อ. 2ส. และนัดประเมินซ้ำเพื่อป้องกันโรค"
  },
  dark_green: {
    color: "dark_green",
    label: "สีเขียวเข้ม - ผู้ป่วยคุมได้ดี",
    nameTh: "คุมได้ดี (สีเขียวเข้ม)",
    badgeClass: "bg-emerald-600 border-emerald-700 text-white shadow-2xs",
    textClass: "text-emerald-800 font-extrabold",
    bgClass: "bg-emerald-500/5",
    borderClass: "border-emerald-600/30",
    glowClass: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
    description: "ผู้ป่วยโรคเดิมที่คุมระดับยาและสุขภาพได้เป็นอย่างดีตามเป้าหมายของแพทย์ รักษามาตรฐานอย่างต่อเนื่อง"
  },
  yellow: {
    color: "yellow",
    label: "สีเหลือง - ผู้ป่วยระดับ 1 (เสี่ยงปานกลาง)",
    nameTh: "เสี่ยงปานกลาง (สีเหลือง)",
    badgeClass: "bg-amber-50 border-amber-200 text-amber-800 shadow-2xs",
    textClass: "text-amber-700",
    bgClass: "bg-amber-50/40",
    borderClass: "border-amber-200",
    glowClass: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    description: "กลุ่มผู้ป่วยระดับความรุนแรงน้อย หรือคุมได้ปานกลาง ต้องนัดพบแพทย์และปรับเปลี่ยนพฤติกรรมเข้มข้นขึ้น"
  },
  orange: {
    color: "orange",
    label: "สีส้ม - ผู้ป่วยระดับ 2 (เสี่ยงสูง)",
    nameTh: "เสี่ยงสูง (สีส้ม)",
    badgeClass: "bg-orange-50 border-orange-200 text-orange-800 shadow-2xs",
    textClass: "text-orange-700",
    bgClass: "bg-orange-50/40",
    borderClass: "border-orange-200",
    glowClass: "shadow-[0_0_12px_rgba(249,115,22,0.25)]",
    description: "กลุ่มผู้ป่วยระดับความรุนแรงปานกลาง หรือคุมพฤติกรรมและยาไม่ได้ดี เสี่ยงต่อการเกิดภาวะแทรกซ้อน"
  },
  red: {
    color: "red",
    label: "สีแดง - ผู้ป่วยระดับ 3 (รุนแรงวิกฤต)",
    nameTh: "วิกฤต (สีแดง)",
    badgeClass: "bg-red-50 border-red-200 text-red-800 shadow-2xs",
    textClass: "text-red-700",
    bgClass: "bg-red-50/40",
    borderClass: "border-red-200",
    glowClass: "shadow-[0_0_12px_rgba(239,68,68,0.3)]",
    description: "กลุ่มความดันหรือน้ำตาลรุนแรงวิกฤต เสี่ยงหัวใจขาดเลือดหรือหลอดเลือดสมองเฉียบพลัน ต้องพบนายแพทย์ทันที"
  },
  black: {
    color: "black",
    label: "สีดำ - กลุ่มป่วยมีภาวะแทรกซ้อน",
    nameTh: "โรคแทรกซ้อน (สีดำ)",
    badgeClass: "bg-zinc-900 border-zinc-950 text-zinc-100 shadow-xs",
    textClass: "text-zinc-900",
    bgClass: "bg-zinc-500/5",
    borderClass: "border-zinc-900/20",
    glowClass: "shadow-[0_0_12px_rgba(24,24,27,0.4)]",
    description: "กลุ่มผู้ป่วยที่มีภาวะแทรกซ้อนรุนแรงแล้ว เช่น ไตเสื่อมเรื้อรัง อัมพฤกษ์/อัมพาต หรือโรคกล้ามเนื้อหัวใจขาดเลือด"
  }
};

// Check if there are clinical complications in history
export function checkHasComplications(familyHistory: string[] = []): boolean {
  if (!familyHistory) return false;
  const complicationKeywords = ["ไตวายเรื้อรัง", "กล้ามเนื้อหัวใจขาดเลือด", "หลอดเลือดสมอง"];
  return familyHistory.some(h => complicationKeywords.some(keyword => h.includes(keyword)));
}

// 7-Color Ping Pong Calculation for Hypertension (HT)
export function getHTPingPong(sys: number, dia: number, familyHistory: string[] = []): PingPongColorInfo {
  const hasComplications = checkHasComplications(familyHistory);
  if (hasComplications) {
    return PING_PONG_COLORS.black;
  }
  
  if (sys >= 180 || dia >= 110) {
    return PING_PONG_COLORS.red;
  }
  if ((sys >= 160 && sys <= 179) || (dia >= 100 && dia <= 109)) {
    return PING_PONG_COLORS.orange;
  }
  if ((sys >= 140 && sys <= 159) || (dia >= 90 && dia <= 99)) {
    return PING_PONG_COLORS.yellow;
  }
  
  // If BP is controlled under 140/90 but they have known family history of HT or we assume they are a diagnosed patient
  const isKnownHTPatient = familyHistory.some(h => h.includes("ความดันโลหิตสูง"));
  if (isKnownHTPatient && (sys < 140 && dia < 90)) {
    return PING_PONG_COLORS.dark_green;
  }
  
  if ((sys >= 120 && sys < 140) || (dia >= 80 && dia < 90)) {
    return PING_PONG_COLORS.light_green;
  }
  
  return PING_PONG_COLORS.white;
}

// 7-Color Ping Pong Calculation for Diabetes Mellitus (DM)
export function getDMPingPong(
  sugar: number, 
  familyHistory: string[] = [],
  fastingType: "อดอาหาร" | "ไม่อดอาหาร" | "fasting" | "non_fasting" | string = "อดอาหาร"
): PingPongColorInfo {
  const hasComplications = checkHasComplications(familyHistory);
  if (hasComplications) {
    return PING_PONG_COLORS.black;
  }
  
  const isNonFasting = fastingType === "ไม่อดอาหาร" || fastingType === "non_fasting";
  const dangerLimit = isNonFasting ? 200 : 126;
  const riskLimit = isNonFasting ? 140 : 100;
  
  if (sugar >= (isNonFasting ? 250 : 183)) {
    return PING_PONG_COLORS.red;
  }
  if (sugar >= (isNonFasting ? 220 : 155)) {
    return PING_PONG_COLORS.orange;
  }
  if (sugar >= dangerLimit) {
    return PING_PONG_COLORS.yellow;
  }
  
  // If controlled under danger threshold but has DM history
  const isKnownDMPatient = familyHistory.some(h => h.includes("เบาหวาน"));
  if (isKnownDMPatient && sugar < dangerLimit) {
    return PING_PONG_COLORS.dark_green;
  }
  
  if (sugar >= riskLimit && sugar < dangerLimit) {
    return PING_PONG_COLORS.light_green;
  }
  
  return PING_PONG_COLORS.white;
}

// Combine both results - gets the highest risk color
export function getCombinedPingPong(
  sys: number, 
  dia: number, 
  sugar: number, 
  familyHistory: string[] = [],
  fastingType: "อดอาหาร" | "ไม่อดอาหาร" | "fasting" | "non_fasting" | string = "อดอาหาร"
): PingPongColorInfo {
  const ht = getHTPingPong(sys, dia, familyHistory);
  const dm = getDMPingPong(sugar, familyHistory, fastingType);
  
  const severityRank: Record<string, number> = {
    white: 0,
    light_green: 1,
    dark_green: 2,
    yellow: 3,
    orange: 4,
    red: 5,
    black: 6
  };
  
  const htRank = severityRank[ht.color] || 0;
  const dmRank = severityRank[dm.color] || 0;
  
  return htRank >= dmRank ? ht : dm;
}

// Date helpers for converting between ISO (YYYY-MM-DD) and Thai Buddhist Era formats
export function parseDateToIso(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Format DD/MM/YYYY or D/M/YYYY
  if (dateStr.includes("/")) {
    const parts = dateStr.trim().split("/");
    if (parts.length === 3) {
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      let y = parseInt(parts[2], 10);
      if (y > 2400) y -= 543;
      return `${y}-${m}-${d}`;
    }
  }
  // Format YYYY-MM-DD
  if (dateStr.includes("-")) {
    const parts = dateStr.trim().split("-");
    if (parts.length === 3) {
      let y = parseInt(parts[0], 10);
      if (y > 2400) y -= 543;
      const m = parts[1].padStart(2, "0");
      const d = parts[2].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isoToThaiDateString(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  let y = parseInt(parts[0], 10);
  if (y < 2400) y += 543;
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  return `${d}/${m}/${y}`;
}

export function formatThaiDateReadable(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  let y = parseInt(parts[0], 10);
  if (y < 2400) y += 543;
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const monthName = thaiMonths[m - 1] || "";
  return `${d} ${monthName} ${y}`;
}

export function formatYearMonthThai(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes("-")) return yearMonth || "";
  const parts = yearMonth.split("-");
  let y = parseInt(parts[0], 10);
  if (y < 2400) y += 543;
  const m = parseInt(parts[1], 10);
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  return `${thaiMonths[m - 1] || parts[1]} ${y}`;
}

export function formatYearMonthThaiShort(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes("-")) return yearMonth || "";
  const parts = yearMonth.split("-");
  let y = parseInt(parts[0], 10);
  if (y < 2400) y += 543;
  const m = parseInt(parts[1], 10);
  const shortThaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  return `${shortThaiMonths[m - 1] || parts[1]} ${String(y).slice(-2)}`;
}

export function getRecordYearMonth(dateStr?: string): string {
  const iso = parseDateToIso(dateStr);
  return iso.substring(0, 7);
}
