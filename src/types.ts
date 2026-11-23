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
  waist?: number;
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
  isDeleted?: boolean;
}

// Official standard location configuration mapping based on program requirements
export interface LocationMappingItem {
  model: "หมู่บ้าน" | "ตำบล";
  district: string;
  subdistrict: string;
  targetArea: string;
}

// Official 15 Project Performance Units:
// - โมเดลตำบล: 5 ตำบล (นับผลงานรายตำบล ส่วนอำเภอไว้ดูรายละเอียดของโมเดล)
// - โมเดลหมู่บ้าน: 10 พื้นที่เป้าหมาย (หมู่บ้าน/รพ.สต.) (นับผลงานรายพื้นที่เป้าหมาย ส่วนอำเภอไว้ดูรายละเอียดของโมเดล)
export interface ProjectPerformanceAreaItem {
  model: "ตำบล" | "หมู่บ้าน";
  areaName: string;
  district: string;
  subdistrict: string;
  subdistrictDisplay: string;
  subAreas: string[];
}

export const PROJECT_PERFORMANCE_AREAS: ProjectPerformanceAreaItem[] = [
  // โมเดลตำบล (5 ตำบล)
  {
    model: "ตำบล",
    areaName: "ตำบลพิมาน",
    district: "เมือง",
    subdistrict: "พิมาน",
    subdistrictDisplay: "พิมาน",
    subAreas: ["ชุมชนปานชูรำลึก", "สันตยาราม", "ตำบลพิมาน", "พิมาน"],
  },
  {
    model: "ตำบล",
    areaName: "ตำบลคลองขุด",
    district: "เมือง",
    subdistrict: "คลองขุด",
    subdistrictDisplay: "คลองขุด",
    subAreas: ["บ้านคลองขุด", "บ้านเกาะนก", "คลองขุดเหนือ", "ตำบลคลองขุด", "คลองขุด"],
  },
  {
    model: "ตำบล",
    areaName: "ตำบลขอนคลาน",
    district: "ทุ่งหว้า",
    subdistrict: "ขอนคลาน",
    subdistrictDisplay: "ขอนคลาน",
    subAreas: ["ม.1 ขอนคลานตะวันออก", "ม.2 ราไวย์ใต้", "ม.3 ขอนคลานตะวันตก", "ม.4 ราไวย์เหนือ", "ตำบลขอนคลาน", "ขอนคลาน"],
  },
  {
    model: "ตำบล",
    areaName: "ตำบลเขาขาว",
    district: "ละงู",
    subdistrict: "เขาขาว",
    subdistrictDisplay: "เขาขาว",
    subAreas: ["ม.5 ดาหลำ", "ม.6 ทุ่งเกาะปราบ", "ม.7 นาข่าใต้", "ตำบลเขาขาว", "เขาขาว"],
  },
  {
    model: "ตำบล",
    areaName: "ตำบลอุใดเจริญ",
    district: "ควนกาหลง",
    subdistrict: "อุใดเจริญ",
    subdistrictDisplay: "อุใดเจริญ",
    subAreas: ["ม.2 บ้านผัง 32.34.39", "ม.3 บ้านผัง 35,36,41", "ม.5 ผัง 31 (อุใดใต้,คลองโลน)", "ตำบลอุใดเจริญ", "อุใดเจริญ"],
  },
  // โมเดลหมู่บ้าน (10 พื้นที่)
  {
    model: "หมู่บ้าน",
    areaName: "บ้านผัง 8,11,12",
    district: "มะนัง",
    subdistrict: "นิคมพัฒนา",
    subdistrictDisplay: "ตำบลนิคมพัฒนา",
    subAreas: ["ม.4 บ้านผัง 8,11,12", "บ้านผัง 8,11,12"],
  },
  {
    model: "หมู่บ้าน",
    areaName: "บ้านผัง16,17,19,20",
    district: "มะนัง",
    subdistrict: "นิคมพัฒนา",
    subdistrictDisplay: "ตำบลนิคมพัฒนา",
    subAreas: ["ม.8 บ้านผัง 16,17,19,20", "บ้านผัง16,17,19,20", "บ้านผัง 16,17,19,20"],
  },
  {
    model: "หมู่บ้าน",
    areaName: "บ้านปาล์มทองพัฒนา",
    district: "มะนัง",
    subdistrict: "ปาล์มพัฒนา",
    subdistrictDisplay: "ตำบลปาล์มพัฒนา",
    subAreas: ["ม.8 บ้านปาล์มทองพัฒนา", "บ้านปาล์มทองพัฒนา"],
  },
  {
    model: "หมู่บ้าน",
    areaName: "บ้านตำมะลัง",
    district: "เมือง",
    subdistrict: "ตำมะลัง",
    subdistrictDisplay: "ตำบลตำมะลัง",
    subAreas: ["บ้านตำมะลัง", "ตำมะลัง"],
  },
  {
    model: "หมู่บ้าน",
    areaName: "บ้านเขาจีน",
    district: "เมือง",
    subdistrict: "คลองขุด",
    subdistrictDisplay: "ตำบลคลองขุด",
    subAreas: ["บ้านเขาจีน", "เขาจีน"],
  },
  {
    model: "หมู่บ้าน",
    areaName: "บ้านเกาะยาว",
    district: "เมือง",
    subdistrict: "ปูยู",
    subdistrictDisplay: "ตำบลปูยู",
    subAreas: ["เกาะยาว", "บ้านเกาะยาว"],
  },
  {
    model: "หมู่บ้าน",
    areaName: "ชุมชนท่านายเนาว์",
    district: "เมือง",
    subdistrict: "พิมาน",
    subdistrictDisplay: "ตำบลพิมาน",
    subAreas: ["ท่านายเนาว์", "ชุมชนท่านายเนาว์"],
  },
  {
    model: "หมู่บ้าน",
    areaName: "บ้านวังยาว",
    district: "ละงู",
    subdistrict: "น้ำผุด",
    subdistrictDisplay: "ตำบลน้ำผุด",
    subAreas: ["ม.11 บ้านวังยาว", "บ้านวังยาว", "วังยาว"],
  },
  {
    model: "หมู่บ้าน",
    areaName: "บ้านสันติสุข",
    district: "ละงู",
    subdistrict: "เขาขาว",
    subdistrictDisplay: "ตำบลเขาขาว",
    subAreas: ["ม.1 บ้านสันติสุข", "บ้านสันติสุข", "สันติสุข"],
  },
  {
    model: "หมู่บ้าน",
    areaName: "บ้านควนไสน",
    district: "ละงู",
    subdistrict: "กำแพง",
    subdistrictDisplay: "ตำบลกำแพง",
    subAreas: ["ม.1 บ้านควนไสน", "บ้านควนไสน", "ควนไสน"],
  },
];

export const SUBDISTRICT_MODEL_AREAS = PROJECT_PERFORMANCE_AREAS.filter((a) => a.model === "ตำบล");
export const VILLAGE_MODEL_AREAS = PROJECT_PERFORMANCE_AREAS.filter((a) => a.model === "หมู่บ้าน");

// 25 detailed sub-locations defined for data entry form (NcdForm)
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
  { model: "หมู่บ้าน", district: "มะนัง", subdistrict: "ปาล์มพัฒนา", targetArea: "ม.8 บ้านปาล์มทองพัฒนา" },
  { model: "หมู่บ้าน", district: "เมือง", subdistrict: "คลองขุด", targetArea: "บ้านเขาจีน" },
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
      ปาล์มพัฒนา: [
        "ม.8 บ้านปาล์มทองพัฒนา",
      ],
    },
    เมือง: {
      คลองขุด: ["บ้านเขาจีน"],
      ตำมะลัง: ["บ้านตำมะลัง"],
      ปูยู: ["เกาะยาว"],
      พิมาน: ["ท่านายเนาว์"],
    },
    เมืองสตูล: {
      คลองขุด: ["บ้านเขาจีน"],
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
    "คลองขุด": ["บ้านคลองขุด", "บ้านเกาะนก", "คลองขุดเหนือ", "บ้านเขาจีน"],
    "ตำมะลัง": ["บ้านตำมะลัง"],
    "ปูยู": ["เกาะยาว"],
    "พิมาน": ["ท่านายเนาว์", "ชุมชนปานชูรำลึก", "สันตยาราม"],
  },
  เมืองสตูล: {
    "คลองขุด": ["บ้านคลองขุด", "บ้านเกาะนก", "คลองขุดเหนือ", "บ้านเขาจีน"],
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

