const fs = require('fs');
let content = fs.readFileSync('src/components/NcdDashboard.tsx', 'utf-8');

// Change state to arrays
content = content.replace(
  'const [filterModel, setFilterModel] = useState<"หมู่บ้าน" | "ตำบล" | "">("");',
  'const [filterModel, setFilterModel] = useState<string[]>([]);'
);
content = content.replace(
  'const [filterDistrict, setFilterDistrict] = useState<string>("");',
  'const [filterDistrict, setFilterDistrict] = useState<string[]>([]);'
);
content = content.replace(
  'const [filterSubdistrict, setFilterSubdistrict] = useState<string>("");',
  'const [filterSubdistrict, setFilterSubdistrict] = useState<string[]>([]);'
);
content = content.replace(
  'const [filterTargetArea, setFilterTargetArea] = useState<string>("");',
  'const [filterTargetArea, setFilterTargetArea] = useState<string[]>([]);'
);
content = content.replace(
  'const [filterBehaviorRisk, setFilterBehaviorRisk] = useState<string>("");',
  'const [filterBehaviorRisk, setFilterBehaviorRisk] = useState<string[]>([]);'
);

// Cascading resets
content = content.replace(
  `  useEffect(() => {
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
  }, [filterSubdistrict]);`,
  `  useEffect(() => {
    setFilterDistrict([]);
    setFilterSubdistrict([]);
    setFilterTargetArea([]);
  }, [filterModel]);

  useEffect(() => {
    setFilterSubdistrict([]);
    setFilterTargetArea([]);
  }, [filterDistrict]);

  useEffect(() => {
    setFilterTargetArea([]);
  }, [filterSubdistrict]);`
);

// Available Options logic
const oldOptionsLogic = `  // Dynamic options for filters
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
  }, [filterModel, filterDistrict, filterSubdistrict]);`;

const newOptionsLogic = `  // Dynamic options for filters
  const availableDistricts = useMemo(() => {
    const models = filterModel.length > 0 ? filterModel : ["หมู่บ้าน", "ตำบล"];
    const districtsSet = new Set<string>();
    models.forEach(model => {
      if (LOCATION_DATA[model as keyof typeof LOCATION_DATA]) {
        Object.keys(LOCATION_DATA[model as keyof typeof LOCATION_DATA]).forEach(d => districtsSet.add(d));
      }
    });
    return Array.from(districtsSet) as DistrictType[];
  }, [filterModel]);

  const availableSubdistricts = useMemo(() => {
    if (filterDistrict.length === 0) return [];
    const models = filterModel.length > 0 ? filterModel : ["หมู่บ้าน", "ตำบล"];
    const subdistSet = new Set<string>();
    models.forEach(model => {
      filterDistrict.forEach(district => {
        const subdistMap = (LOCATION_DATA[model as keyof typeof LOCATION_DATA] as any)?.[district] || {};
        Object.keys(subdistMap).forEach(s => subdistSet.add(s));
      });
    });
    return Array.from(subdistSet);
  }, [filterModel, filterDistrict]);

  const availableTargetAreas = useMemo(() => {
    if (filterDistrict.length === 0 || filterSubdistrict.length === 0) return [];
    const models = filterModel.length > 0 ? filterModel : ["หมู่บ้าน", "ตำบล"];
    const areaSet = new Set<string>();
    models.forEach(model => {
      filterDistrict.forEach(district => {
        filterSubdistrict.forEach(subdist => {
          const areas = (LOCATION_DATA[model as keyof typeof LOCATION_DATA] as any)?.[district]?.[subdist] || [];
          areas.forEach((a: string) => areaSet.add(a));
        });
      });
    });
    return Array.from(areaSet);
  }, [filterModel, filterDistrict, filterSubdistrict]);`;

content = content.replace(oldOptionsLogic, newOptionsLogic);

// Filter logic in filteredRecords
const oldFilterLogic = `        // Model type filter (with legacy fallback inference)
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
        const matchesTargetArea = filterTargetArea ? r.targetArea === filterTargetArea : true;`;

const newFilterLogic = `        // Model type filter (with legacy fallback inference)
        let recordModel = r.modelType || "";
        if (!recordModel && r.district && r.targetArea) {
          if ((LOCATION_DATA["หมู่บ้าน"] as any)?.[r.district]?.[r.subdistrict || ""]?.includes(r.targetArea)) {
            recordModel = "หมู่บ้าน";
          } else if ((LOCATION_DATA["ตำบล"] as any)?.[r.district]?.[r.subdistrict || ""]?.includes(r.targetArea)) {
            recordModel = "ตำบล";
          }
        }
        const matchesModel = filterModel.length > 0 ? filterModel.includes(recordModel) : true;

        // District filter
        const matchesDistrict = filterDistrict.length > 0 ? filterDistrict.includes(r.district) : true;

        // Subdistrict filter
        const matchesSubdistrict = filterSubdistrict.length > 0 ? filterSubdistrict.includes(r.subdistrict) : true;

        // Target Area filter
        const matchesTargetArea = filterTargetArea.length > 0 ? filterTargetArea.includes(r.targetArea) : true;`;

content = content.replace(oldFilterLogic, newFilterLogic);

const oldBehaviorLogic = `        // Behavior Risk Filter (3อ. 2ส.)
        let matchesBehavior = true;
        if (filterBehaviorRisk) {
          if (filterBehaviorRisk === "food") {
            matchesBehavior = (r.foodHabit?.sweet?.level === "เสี่ยงสูงมาก" || r.foodHabit?.sweet?.level === "เสี่ยงสูง" || r.foodHabit?.fat?.level === "เสี่ยงสูงมาก" || r.foodHabit?.fat?.level === "เสี่ยงสูง" || r.foodHabit?.salt?.level === "เสี่ยงสูงมาก" || r.foodHabit?.salt?.level === "เสี่ยงสูง" || r.sodium?.includes("เค็มประจำ"));
          } else if (filterBehaviorRisk === "exercise") {
            matchesBehavior = (r.exercise?.includes("ไม่ออก") || r.exercise?.includes("นั่งนิ่ง"));
          } else if (filterBehaviorRisk === "sleep") {
            matchesBehavior = (r.sleep?.includes("น้อยกว่า 6") || r.sleep?.includes("ไม่เพียงพอ"));
          } else if (filterBehaviorRisk === "smoking") {
            matchesBehavior = (r.smoking?.includes("สูบอยู่") || r.smoking?.includes("ประจำ"));
          } else if (filterBehaviorRisk === "alcohol") {
            matchesBehavior = (r.alcohol?.includes("ประจำ") || r.alcohol?.includes("ครั้งคราว"));
          } else if (filterBehaviorRisk === "bmi_risk") {
            const b = parseFloat(r.bmi);
            matchesBehavior = (!isNaN(b) && b >= 23.0);
          }
        }`;

const newBehaviorLogic = `        // Behavior Risk Filter (3อ. 2ส.)
        let matchesBehavior = true;
        if (filterBehaviorRisk.length > 0) {
          matchesBehavior = filterBehaviorRisk.some(riskType => {
            if (riskType === "food") {
              return (r.foodHabit?.sweet?.level === "เสี่ยงสูงมาก" || r.foodHabit?.sweet?.level === "เสี่ยงสูง" || r.foodHabit?.fat?.level === "เสี่ยงสูงมาก" || r.foodHabit?.fat?.level === "เสี่ยงสูง" || r.foodHabit?.salt?.level === "เสี่ยงสูงมาก" || r.foodHabit?.salt?.level === "เสี่ยงสูง" || r.sodium?.includes("เค็มประจำ"));
            } else if (riskType === "exercise") {
              return (r.exercise?.includes("ไม่ออก") || r.exercise?.includes("นั่งนิ่ง"));
            } else if (riskType === "sleep") {
              return (r.sleep?.includes("น้อยกว่า 6") || r.sleep?.includes("ไม่เพียงพอ"));
            } else if (riskType === "smoking") {
              return (r.smoking?.includes("สูบอยู่") || r.smoking?.includes("ประจำ"));
            } else if (riskType === "alcohol") {
              return (r.alcohol?.includes("ประจำ") || r.alcohol?.includes("ครั้งคราว"));
            } else if (riskType === "bmi_risk") {
              const b = parseFloat(r.bmi);
              return (!isNaN(b) && b >= 23.0);
            }
            return false;
          });
        }`;

content = content.replace(oldBehaviorLogic, newBehaviorLogic);

fs.writeFileSync('src/components/NcdDashboard.tsx', content);
