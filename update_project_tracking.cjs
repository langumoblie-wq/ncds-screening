const fs = require('fs');
let content = fs.readFileSync('src/components/ProjectTracking.tsx', 'utf-8');

// Copy MultiSelectDropdown component from NcdDashboard.tsx to ProjectTracking.tsx
const multiSelectCode = `

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
    <div className="relative w-full md:w-64" ref={containerRef}>
      <div 
        className={\`w-full text-sm border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 outline-none cursor-pointer flex justify-between items-center \${disabled ? 'text-slate-400' : 'text-slate-700 font-semibold'} hover:bg-slate-100 transition-colors\`}
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
`;

content = content.replace('export const ProjectTracking', multiSelectCode + '\nexport const ProjectTracking');

// Change state variables
content = content.replace(
  'const [modelFilter, setModelFilter] = useState<string>("all");',
  'const [modelFilter, setModelFilter] = useState<string[]>([]);'
);
content = content.replace(
  'const [districtFilter, setDistrictFilter] = useState<string>("all");',
  'const [districtFilter, setDistrictFilter] = useState<string[]>([]);'
);
content = content.replace(
  'const [riskFilter, setRiskFilter] = useState<string>("all");',
  'const [riskFilter, setRiskFilter] = useState<string[]>([]);'
);

// Replace filter logic
const oldFilterLogic = `    if (riskFilter !== "all") {
      filteredRecords = records.filter(r => {
        const smoking = r.smoking?.includes("สูบอยู่") || r.smoking?.includes("ประจำ");
        const alcohol = r.alcohol?.includes("ประจำ") || r.alcohol?.includes("ครั้งคราว");
        const exercise = r.exercise?.includes("ไม่ออก") || r.exercise?.includes("นั่งนิ่ง");
        const sleep = r.sleep?.includes("น้อยกว่า 6") || r.sleep?.includes("ไม่เพียงพอ");
        const food = ["เสี่ยงสูง", "เสี่ยงสูงมาก"].includes(r.foodHabit?.sweet?.level || "") ||
                     ["เสี่ยงสูง", "เสี่ยงสูงมาก"].includes(r.foodHabit?.fat?.level || "") ||
                     ["เสี่ยงสูง", "เสี่ยงสูงมาก"].includes(r.foodHabit?.salt?.level || "");
        
        switch (riskFilter) {
          case "3a2s": return smoking || alcohol || exercise || sleep || food;
          case "smoking": return smoking;
          case "alcohol": return alcohol;
          case "exercise": return exercise;
          case "food": return food;
          case "sleep": return sleep;
          default: return true;
        }
      });
    }`;

const newFilterLogic = `    if (riskFilter.length > 0) {
      filteredRecords = records.filter(r => {
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
    }`;
content = content.replace(oldFilterLogic, newFilterLogic);

const oldModelFilterLogic = `    if (modelFilter !== "all") {
      result = result.filter(r => r.modelType === modelFilter);
    }`;
const newModelFilterLogic = `    if (modelFilter.length > 0) {
      result = result.filter(r => modelFilter.includes(r.modelType));
    }`;
content = content.replace(oldModelFilterLogic, newModelFilterLogic);

const oldDistrictFilterLogic = `    if (districtFilter !== "all") {
      result = result.filter(r => r.district === districtFilter);
    }`;
const newDistrictFilterLogic = `    if (districtFilter.length > 0) {
      result = result.filter(r => districtFilter.includes(r.district));
    }`;
content = content.replace(oldDistrictFilterLogic, newDistrictFilterLogic);

// Add useRef import if missing
if (!content.includes('useRef')) {
  content = content.replace('useState, useMemo, useEffect', 'useState, useMemo, useEffect, useRef');
}

// Replace UI selects with MultiSelectDropdown
const uiRiskFilterOld = `<select 
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
        >
          <option value="all">ทุกกลุ่มพฤติกรรม</option>
          <option value="3a2s">เสี่ยงสูง (3อ. 2ส.)</option>
          <option value="smoking">เสี่ยง: สูบบุหรี่</option>
          <option value="alcohol">เสี่ยง: ดื่มแอลกอฮอล์</option>
          <option value="food">เสี่ยง: อาหาร (หวาน/มัน/เค็ม)</option>
          <option value="exercise">เสี่ยง: ขาดการออกกำลังกาย</option>
          <option value="sleep">เสี่ยง: การนอนหลับ</option>
        </select>`;
const uiRiskFilterNew = `<MultiSelectDropdown 
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
        />`;
content = content.replace(uiRiskFilterOld, uiRiskFilterNew);

const uiModelFilterOld = `<select 
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        >
          <option value="all">ทุกโมเดล</option>
          <option value="หมู่บ้าน">โมเดลหมู่บ้าน</option>
          <option value="ตำบล">โมเดลตำบล</option>
          <option value="ไม่ระบุโมเดล">ไม่ระบุโมเดล</option>
        </select>`;
const uiModelFilterNew = `<MultiSelectDropdown 
          options={["หมู่บ้าน", "ตำบล", "ไม่ระบุโมเดล"]}
          selected={modelFilter}
          onChange={setModelFilter}
          placeholder="ทุกโมเดล"
          labelKey={(v) => v === "ไม่ระบุโมเดล" ? "ไม่ระบุโมเดล" : \`โมเดล\${v}\`}
        />`;
content = content.replace(uiModelFilterOld, uiModelFilterNew);

const uiDistrictFilterOld = `<select 
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        >
          <option value="all">ทุกอำเภอ</option>
          {allDistricts.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>`;
const uiDistrictFilterNew = `<MultiSelectDropdown 
          options={allDistricts}
          selected={districtFilter}
          onChange={setDistrictFilter}
          placeholder="ทุกอำเภอ"
          labelKey={(v) => \`อ.\${v}\`}
        />`;
content = content.replace(uiDistrictFilterOld, uiDistrictFilterNew);

// Replace print header texts
content = content.replace(
  '<span>โมเดล: {modelFilter === "all" ? "ทั้งหมด" : modelFilter}</span>',
  '<span>โมเดล: {modelFilter.length === 0 ? "ทั้งหมด" : modelFilter.join(", ")}</span>'
);
content = content.replace(
  '<span>อำเภอ: {districtFilter === "all" ? "ทั้งหมด" : `อ.${districtFilter}`}</span>',
  '<span>อำเภอ: {districtFilter.length === 0 ? "ทั้งหมด" : districtFilter.map(d => `อ.${d}`).join(", ")}</span>'
);

const riskPrintHeaderOld = `<span>ความเสี่ยง: {riskFilter === "all" ? "ทั้งหมด" : 
                riskFilter === "3a2s" ? "เสี่ยงสูง (3อ. 2ส.)" : 
                riskFilter === "smoking" ? "สูบบุหรี่" : 
                riskFilter === "alcohol" ? "ดื่มแอลกอฮอล์" : 
                riskFilter === "food" ? "อาหาร (หวาน/มัน/เค็ม)" : 
                riskFilter === "exercise" ? "ขาดการออกกำลังกาย" : 
                "การนอนหลับ"}</span>`;
const riskPrintHeaderNew = `<span>ความเสี่ยง: {riskFilter.length === 0 ? "ทั้งหมด" : riskFilter.map(v => {
            const map: Record<string, string> = {
              "3a2s": "เสี่ยงสูง (3อ. 2ส.)",
              "smoking": "สูบบุหรี่",
              "alcohol": "ดื่มแอลกอฮอล์",
              "food": "อาหาร (หวาน/มัน/เค็ม)",
              "exercise": "ขาดการออกกำลังกาย",
              "sleep": "การนอนหลับ"
            };
            return map[v] || v;
          }).join(", ")}</span>`;
content = content.replace(riskPrintHeaderOld, riskPrintHeaderNew);

fs.writeFileSync('src/components/ProjectTracking.tsx', content);
