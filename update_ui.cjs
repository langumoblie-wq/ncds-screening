const fs = require('fs');
let content = fs.readFileSync('src/components/NcdDashboard.tsx', 'utf-8');

// Add MultiSelectDropdown component at the top after imports
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
    <div className="relative" ref={containerRef}>
      <div 
        className={\`w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none cursor-pointer flex justify-between items-center \${disabled ? 'bg-slate-50 text-slate-400' : 'text-slate-700 font-semibold'}\`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate pr-2">
          {selected.length === 0 ? placeholder : selected.map(labelKey).join(', ')}
        </div>
        <ChevronDown className={\`w-4 h-4 transition-transform \${isOpen ? 'rotate-180' : ''}\`} />
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

content = content.replace('// Reusable custom circular progress gauge', multiSelectCode + '// Reusable custom circular progress gauge');

// Replace the Model filter
const oldModelFilter = `<select 
              value={filterModel} 
              onChange={(e) => setFilterModel(e.target.value as any)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
            >
              <option value="">ทั้งหมด (หมู่บ้าน / ตำบล)</option>
              <option value="หมู่บ้าน">หมู่บ้าน</option>
              <option value="ตำบล">ตำบล</option>
            </select>`;
const newModelFilter = `<MultiSelectDropdown 
              options={["หมู่บ้าน", "ตำบล"]}
              selected={filterModel}
              onChange={setFilterModel}
              placeholder="ทั้งหมด (หมู่บ้าน / ตำบล)"
            />`;
content = content.replace(oldModelFilter, newModelFilter);

// Replace District filter
const oldDistrictFilter = `<select 
              value={filterDistrict} 
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
            >
              <option value="">ทุกอำเภอ</option>
              {availableDistricts.map((dist) => (
                <option key={dist} value={dist}>อ.{dist}</option>
              ))}
            </select>`;
const newDistrictFilter = `<MultiSelectDropdown 
              options={availableDistricts}
              selected={filterDistrict}
              onChange={setFilterDistrict}
              placeholder="ทุกอำเภอ"
              labelKey={(v) => \`อ.\${v}\`}
            />`;
content = content.replace(oldDistrictFilter, newDistrictFilter);

// Replace Subdistrict filter
const oldSubdistrictFilter = `<select 
              value={filterSubdistrict} 
              onChange={(e) => setFilterSubdistrict(e.target.value)}
              disabled={!filterDistrict}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{filterDistrict ? "ทุกตำบล" : "โปรดเลือกอำเภอก่อน"}</option>
              {availableSubdistricts.map((sub, idx) => (
                <option key={idx} value={sub}>ต.{sub}</option>
              ))}
            </select>`;
const newSubdistrictFilter = `<MultiSelectDropdown 
              options={availableSubdistricts}
              selected={filterSubdistrict}
              onChange={setFilterSubdistrict}
              placeholder={filterDistrict.length > 0 ? "ทุกตำบล" : "โปรดเลือกอำเภอก่อน"}
              disabled={filterDistrict.length === 0}
              labelKey={(v) => \`ต.\${v}\`}
            />`;
content = content.replace(oldSubdistrictFilter, newSubdistrictFilter);

// Replace Target Area filter
const oldTargetAreaFilter = `<select 
              value={filterTargetArea} 
              onChange={(e) => setFilterTargetArea(e.target.value)}
              disabled={!filterSubdistrict}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{filterSubdistrict ? "ทุกพื้นที่เป้าหมาย" : "โปรดเลือกตำบลก่อน"}</option>
              {availableTargetAreas.map((area, idx) => (
                <option key={idx} value={area}>{area}</option>
              ))}
            </select>`;
const newTargetAreaFilter = `<MultiSelectDropdown 
              options={availableTargetAreas}
              selected={filterTargetArea}
              onChange={setFilterTargetArea}
              placeholder={filterSubdistrict.length > 0 ? "ทุกพื้นที่เป้าหมาย" : "โปรดเลือกตำบลก่อน"}
              disabled={filterSubdistrict.length === 0}
            />`;
content = content.replace(oldTargetAreaFilter, newTargetAreaFilter);

// Replace Quick Clear Filter
const oldClearFilter = `{(filterModel || filterDistrict || filterSubdistrict || filterTargetArea) && (
            <button 
              onClick={() => {
                setFilterModel("");
                setFilterDistrict("");
                setFilterSubdistrict("");
                setFilterTargetArea("");
              }}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg self-start sm:self-center transition-colors"
            >
              ล้างตัวกรองพื้นที่ทั้งหมด
            </button>
          )}`;
const newClearFilter = `{(filterModel.length > 0 || filterDistrict.length > 0 || filterSubdistrict.length > 0 || filterTargetArea.length > 0) && (
            <button 
              onClick={() => {
                setFilterModel([]);
                setFilterDistrict([]);
                setFilterSubdistrict([]);
                setFilterTargetArea([]);
              }}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg self-start sm:self-center transition-colors"
            >
              ล้างตัวกรองพื้นที่ทั้งหมด
            </button>
          )}`;
content = content.replace(oldClearFilter, newClearFilter);

// Behavior risk filter UI
const oldBehaviorFilter = `<select 
            value={filterBehaviorRisk} 
            onChange={(e) => setFilterBehaviorRisk(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 shrink-0 font-semibold text-slate-700"
          >
            <option value="">แสดงทุกพฤติกรรมเสี่ยง</option>
            <option value="food">อาหาร (กินหวาน/มัน/เค็มจัด)</option>
            <option value="exercise">การออกกำลังกาย (ไม่ออกเลย)</option>
            <option value="sleep">การนอนหลับ (พักผ่อนไม่เพียงพอ)</option>
            <option value="smoking">สูบบุหรี่ (ยังสูบอยู่)</option>
            <option value="alcohol">ดื่มแอลกอฮอล์ (ดื่มเป็นประจำ/ครั้งคราว)</option>
            <option value="bmi_risk">ดัชนีมวลกาย (BMI ท้วม/อ้วนขึ้นไป)</option>
          </select>`;
const newBehaviorFilter = `<div className="w-56 shrink-0">
            <MultiSelectDropdown 
              options={["food", "exercise", "sleep", "smoking", "alcohol", "bmi_risk"]}
              selected={filterBehaviorRisk}
              onChange={setFilterBehaviorRisk}
              placeholder="แสดงทุกพฤติกรรมเสี่ยง"
              labelKey={(v) => {
                const map: Record<string, string> = {
                  food: "อาหาร (กินหวาน/มัน/เค็มจัด)",
                  exercise: "การออกกำลังกาย (ไม่ออกเลย)",
                  sleep: "การนอนหลับ (พักผ่อนไม่เพียงพอ)",
                  smoking: "สูบบุหรี่ (ยังสูบอยู่)",
                  alcohol: "ดื่มแอลกอฮอล์ (ดื่มเป็นประจำ/ครั้งคราว)",
                  bmi_risk: "ดัชนีมวลกาย (BMI ท้วม/อ้วนขึ้นไป)"
                };
                return map[v] || v;
              }}
            />
          </div>`;
content = content.replace(oldBehaviorFilter, newBehaviorFilter);

fs.writeFileSync('src/components/NcdDashboard.tsx', content);
