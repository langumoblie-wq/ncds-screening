export type DistrictType = "เมือง" | "เมืองสตูล" | "ละงู" | "ท่าแพ" | "ควนกาหลง" | "ควนโดน" | "ทุ่งหว้า" | "มะนัง";

export interface EvaluationResult {
  level: "normal" | "risk" | "danger";
  label: string;
  color: string;
  class: string;
}

export interface FoodHabitCategoryResult {
  score: number;
  level: "เสี่ยงน้อย" | "เสี่ยงปานกลาง" | "เสี่ยงสูง" | "เสี่ยงสูงมาก";
  color: string;
  class: string;
  description: string;
}

export interface FoodHabitEvaluation {
  sweet: FoodHabitCategoryResult;
  fat: FoodHabitCategoryResult;
  salt: FoodHabitCategoryResult;
}

export interface PlanItem {
  plan: string;
  achieved?: boolean; // true = 1 point, false = 0 points
}

export interface PersonalPlan {
  sweet: PlanItem;
  fat: PlanItem;
  salt: PlanItem;
  sleep: PlanItem;
  water: PlanItem;
  exercise: PlanItem;
}

export type ParticipantType = "กลุ่มเป้าหมายโครงการ" | "คณะทำงาน";

export interface ScreeningRecord {
  id: number;
  date: string;
  visitNumber: number;
  name: string;
  participantType?: ParticipantType;
  age: number;
  gender: "ชาย" | "หญิง";
  address: string;
  district: DistrictType;
  targetArea: string;
  phone: string;
  familyHistory: string[];
  smoking: string;
  alcohol: string;
  water: string;
  exercise: string;
  sleep: string;
  sodium: string;
  weight: number;
  height: number;
  bpSys: number;
  bpDia: number;
  sugar: number;
  sugarFasting?: "อดอาหาร" | "ไม่อดอาหาร";
  followUpAction: string;
  followUpNote: string;
  bmi: string;
  muscleMass?: number;
  subdistrict?: string;
  modelType?: "หมู่บ้าน" | "ตำบล" | "";
  htResult: EvaluationResult;
  dmResult: EvaluationResult;
  foodHabit: FoodHabitEvaluation;
  foodHabitAnswers?: Record<string, number>;
  personalPlan?: PersonalPlan;
  aiAdvice?: string;
  createdAt?: string;
  hasConsented?: boolean;
}

// Official standard location configuration mapping based on program requirements
export interface LocationMappingItem {
  model: "หมู่บ้าน" | "ตำบล";
  district: string;
  subdistrict: string;
  targetArea: string;
}

// 21 official locations defined in program table
export const EXACT_LOCATION_LIST: LocationMappingItem[] = [
  { model: "ตำบล", district: "ควนกาหลง", subdistrict: "อุใดเจริญ", targetArea: "ม.2 บ้านผัง 32.34.39" },
  { model: "ตำบล", district: "ควนกาหลง", subdistrict: "อุใดเจริญ", targetArea: "ม.3 บ้านผัง 35,36,41" },
  { model: "ตำบล", district: "ควนกาหลง", subdistrict: "อุใดเจริญ", targetArea: "ม.5 ผัง 31 (อุใดใต้,คลองโลน)" },
  { model: "ตำบล", district: "ทุ่งหว้า", subdistrict: "ขอนคลาน", targetArea: "ม.1 ขอนคลานตะวันออก" },
  { model: "ตำบล", district: "ทุ่งหว้า", subdistrict: "ขอนคลาน", targetArea: "ม.2 ราไวย์ใต้" },
  { model: "ตำบล", district: "ทุ่งหว้า", subdistrict: "ขอนคลาน", targetArea: "ม.3 ขอนคลานตะวันตก" },
  { model: "ตำบล", district: "ทุ่งหว้า", subdistrict: "ขอนคลาน", targetArea: "ม.4 ราไวย์เหนือ" },
  { model: "หมู่บ้าน", district: "มะนัง", subdistrict: "นิคมพัฒนา", targetArea: "ม.4 บ้านผัง 8,11,12" },
  { model: "หมู่บ้าน", district: "มะนัง", subdistrict: "นิคมพัฒนา", targetArea: "ม.8 บ้านผัง 16,17,19,20" },
  { model: "หมู่บ้าน", district: "เมือง", subdistrict: "คลองขุด", targetArea: "บ้านเขาจีน" },
  { model: "หมู่บ้าน", district: "เมือง", subdistrict: "คลองขุด", targetArea: "ม.2 บ้านท่าจีน" },
  { model: "หมู่บ้าน", district: "เมือง", subdistrict: "ตำมะลัง", targetArea: "บ้านตำมะลัง" },
  { model: "หมู่บ้าน", district: "เมือง", subdistrict: "ปูยู", targetArea: "เกาะยาว" },
  { model: "หมู่บ้าน", district: "เมือง", subdistrict: "พิมาน", targetArea: "ท่านายเนาว์" },
  { model: "ตำบล", district: "เมือง", subdistrict: "คลองขุด", targetArea: "บ้านคลองขุด" },
  { model: "ตำบล", district: "เมือง", subdistrict: "คลองขุด", targetArea: "บ้านเกาะนก" },
  { model: "ตำบล", district: "เมือง", subdistrict: "คลองขุด", targetArea: "คลองขุดเหนือ" },
  { model: "ตำบล", district: "เมือง", subdistrict: "พิมาน", targetArea: "ชุมชนปานชูรำลึก" },
  { model: "ตำบล", district: "เมือง", subdistrict: "พิมาน", targetArea: "สันตยาราม" },
  { model: "หมู่บ้าน", district: "ละงู", subdistrict: "กำแพง", targetArea: "ม.1 บ้านควนไสน" },
  { model: "หมู่บ้าน", district: "ละงู", subdistrict: "เขาขาว", targetArea: "ม.1 บ้านสันติสุข" },
  { model: "ตำบล", district: "ละงู", subdistrict: "เขาขาว", targetArea: "ม.5 ดาหลำ" },
  { model: "ตำบล", district: "ละงู", subdistrict: "เขาขาว", targetArea: "ม.6 ทุ่งเกาะปราบ" },
  { model: "ตำบล", district: "ละงู", subdistrict: "เขาขาว", targetArea: "ม.7 นาข่าใต้" },
  { model: "หมู่บ้าน", district: "ละงู", subdistrict: "น้ำผุด", targetArea: "ม.11 บ้านวังยาว" },
];

export const LOCATION_DATA = {
  หมู่บ้าน: {
    มะนัง: {
      นิคมพัฒนา: [
        "ม.4 บ้านผัง 8,11,12",
        "ม.8 บ้านผัง 16,17,19,20",
      ],
    },
    เมือง: {
      คลองขุด: ["บ้านเขาจีน", "ม.2 บ้านท่าจีน"],
      ตำมะลัง: ["บ้านตำมะลัง"],
      ปูยู: ["เกาะยาว"],
      พิมาน: ["ท่านายเนาว์"],
    },
    เมืองสตูล: {
      คลองขุด: ["บ้านเขาจีน", "ม.2 บ้านท่าจีน"],
      ตำมะลัง: ["บ้านตำมะลัง"],
      ปูยู: ["เกาะยาว"],
      พิมาน: ["ท่านายเนาว์"],
    },
    ละงู: {
      กำแพง: ["ม.1 บ้านควนไสน"],
      เขาขาว: ["ม.1 บ้านสันติสุข"],
      น้ำผุด: ["ม.11 บ้านวังยาว"],
    },
  },
  ตำบล: {
    ควนกาหลง: {
      อุใดเจริญ: [
        "ม.2 บ้านผัง 32.34.39",
        "ม.3 บ้านผัง 35,36,41",
        "ม.5 ผัง 31 (อุใดใต้,คลองโลน)",
      ],
    },
    ทุ่งหว้า: {
      ขอนคลาน: [
        "ม.1 ขอนคลานตะวันออก",
        "ม.2 ราไวย์ใต้",
        "ม.3 ขอนคลานตะวันตก",
        "ม.4 ราไวย์เหนือ",
      ],
    },
    เมือง: {
      คลองขุด: ["บ้านคลองขุด", "บ้านเกาะนก", "คลองขุดเหนือ"],
      พิมาน: ["สันตยาราม", "ชุมชนปานชูรำลึก"],
    },
    เมืองสตูล: {
      คลองขุด: ["บ้านคลองขุด", "บ้านเกาะนก", "คลองขุดเหนือ"],
      พิมาน: ["สันตยาราม", "ชุมชนปานชูรำลึก"],
    },
    ละงู: {
      เขาขาว: [
        "ม.5 ดาหลำ",
        "ม.6 ทุ่งเกาะปราบ",
        "ม.7 นาข่าใต้",
      ],
    },
  },
};

// Location Data (Cascading Dropdown - backward compatibility fallback)
export const DISTRICT_TARGET_AREAS: Record<DistrictType, string[]> = {
  ควนกาหลง: [
    "ม.2 บ้านผัง 32.34.39",
    "ม.3 บ้านผัง 35,36,41",
    "ม.5 ผัง 31 (อุใดใต้,คลองโลน)",
  ],
  ทุ่งหว้า: [
    "ม.1 ขอนคลานตะวันออก",
    "ม.2 ราไวย์ใต้",
    "ม.3 ขอนคลานตะวันตก",
    "ม.4 ราไวย์เหนือ",
  ],
  มะนัง: [
    "ม.4 บ้านผัง 8,11,12",
    "ม.8 บ้านผัง 16,17,19,20",
  ],
  เมือง: [
    "บ้านคลองขุด",
    "บ้านเกาะนก",
    "คลองขุดเหนือ",
    "บ้านเขาจีน",
    "ม.2 บ้านท่าจีน",
    "บ้านตำมะลัง",
    "เกาะยาว",
    "ท่านายเนาว์",
    "ชุมชนปานชูรำลึก",
    "สันตยาราม",
  ],
  เมืองสตูล: [
    "บ้านคลองขุด",
    "บ้านเกาะนก",
    "คลองขุดเหนือ",
    "บ้านเขาจีน",
    "ม.2 บ้านท่าจีน",
    "บ้านตำมะลัง",
    "เกาะยาว",
    "ท่านายเนาว์",
    "ชุมชนปานชูรำลึก",
    "สันตยาราม",
  ],
  ละงู: [
    "ม.1 บ้านควนไสน",
    "ม.1 บ้านสันติสุข",
    "ม.5 ดาหลำ",
    "ม.6 ทุ่งเกาะปราบ",
    "ม.7 นาข่าใต้",
    "ม.11 บ้านวังยาว",
  ],
  ท่าแพ: [
    "ม.2 บ้านท่าแพ",
  ],
  ควนโดน: [
    "บ้านควนโดน",
  ],
};

export const DISTRICT_SUBDISTRICT_MAP: Record<DistrictType, Record<string, string[]>> = {
  ควนกาหลง: {
    "อุใดเจริญ": [
      "ม.2 บ้านผัง 32.34.39",
      "ม.3 บ้านผัง 35,36,41",
      "ม.5 ผัง 31 (อุใดใต้,คลองโลน)",
    ],
  },
  ทุ่งหว้า: {
    "ขอนคลาน": [
      "ม.1 ขอนคลานตะวันออก",
      "ม.2 ราไวย์ใต้",
      "ม.3 ขอนคลานตะวันตก",
      "ม.4 ราไวย์เหนือ",
    ],
  },
  มะนัง: {
    "นิคมพัฒนา": [
      "ม.4 บ้านผัง 8,11,12",
      "ม.8 บ้านผัง 16,17,19,20",
    ],
  },
  เมือง: {
    "คลองขุด": ["บ้านคลองขุด", "บ้านเกาะนก", "คลองขุดเหนือ", "บ้านเขาจีน", "ม.2 บ้านท่าจีน"],
    "ตำมะลัง": ["บ้านตำมะลัง"],
    "ปูยู": ["เกาะยาว"],
    "พิมาน": ["ท่านายเนาว์", "ชุมชนปานชูรำลึก", "สันตยาราม"],
  },
  เมืองสตูล: {
    "คลองขุด": ["บ้านคลองขุด", "บ้านเกาะนก", "คลองขุดเหนือ", "บ้านเขาจีน", "ม.2 บ้านท่าจีน"],
    "ตำมะลัง": ["บ้านตำมะลัง"],
    "ปูยู": ["เกาะยาว"],
    "พิมาน": ["ท่านายเนาว์", "ชุมชนปานชูรำลึก", "สันตยาราม"],
  },
  ละงู: {
    "กำแพง": ["ม.1 บ้านควนไสน"],
    "เขาขาว": ["ม.1 บ้านสันติสุข", "ม.5 ดาหลำ", "ม.6 ทุ่งเกาะปราบ", "ม.7 นาข่าใต้"],
    "น้ำผุด": ["ม.11 บ้านวังยาว"],
  },
  ท่าแพ: {
    "ท่าแพ": ["ม.2 บ้านท่าแพ"],
  },
  ควนโดน: {
    "ควนโดน": ["บ้านควนโดน"],
  },
};

