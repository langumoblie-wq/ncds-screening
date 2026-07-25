const fs = require('fs');
let content = fs.readFileSync('src/components/NcdDashboard.tsx', 'utf-8');

// Replace state
content = content.replace(
  'const [filterRiskLevel, setFilterRiskLevel] = useState<string>("");',
  `const [filterHtRisk, setFilterHtRisk] = useState<string[]>([]);\n  const [filterDmRisk, setFilterDmRisk] = useState<string[]>([]);`
);

// Replace filteredRecords logic
content = content.replace(
  /const htLevel = r\.htResult\?\.level \|\| "normal";\s*const dmLevel = r\.dmResult\?\.level \|\| "normal";\s*if \(htLevel === "danger" \|\| dmLevel === "danger"\) \{\s*rLevel = "danger";\s*\} else if \(htLevel === "risk" \|\| dmLevel === "risk"\) \{\s*rLevel = "risk";\s*\}\s*const matchesRisk = filterRiskLevel \? rLevel === filterRiskLevel : true;/,
  `const htLevel = r.htResult?.level || "normal";
        const dmLevel = r.dmResult?.level || "normal";
        
        const matchesHtRisk = filterHtRisk.length > 0 ? filterHtRisk.includes(htLevel) : true;
        const matchesDmRisk = filterDmRisk.length > 0 ? filterDmRisk.includes(dmLevel) : true;
        const matchesRisk = matchesHtRisk && matchesDmRisk;`
);

// Replace useMemo dependency
content = content.replace(
  'filterRiskLevel, filterBehaviorRisk, sortBy, sortOrder',
  'filterHtRisk, filterDmRisk, filterBehaviorRisk, sortBy, sortOrder'
);

// Replace the UI part
// It's around line 1420
const oldUI = `<select 
            value={filterRiskLevel} 
            onChange={(e) => setFilterRiskLevel(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 shrink-0 font-semibold text-slate-700"
          >
            <option value="">แสดงทุกกลุ่มเสี่ยง</option>
            <option value="normal">กลุ่มปกติ (ขาว)</option>
            <option value="risk">กลุ่มเสี่ยงสูง (เหลือง)</option>
            <option value="danger">สงสัยป่วย (แดง)</option>
          </select>`;

const newUI = `<div className="flex flex-col gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 w-12">HT (ความดัน):</span>
              <div className="flex gap-1">
                {['normal', 'risk', 'danger'].map(level => {
                  const labels: Record<string, string> = { normal: 'ปกติ', risk: 'เสี่ยง', danger: 'สงสัยป่วย' };
                  const colors: Record<string, string> = { normal: 'text-emerald-700 bg-emerald-100', risk: 'text-amber-700 bg-amber-100', danger: 'text-rose-700 bg-rose-100' };
                  const isSelected = filterHtRisk.includes(level);
                  return (
                    <button
                      key={level}
                      onClick={() => setFilterHtRisk(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level])}
                      className={\`text-[10px] px-2 py-1 rounded-lg font-bold transition-all \${isSelected ? colors[level] + ' ring-1 ring-black/10' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}\`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 w-12">DM (เบาหวาน):</span>
              <div className="flex gap-1">
                {['normal', 'risk', 'danger'].map(level => {
                  const labels: Record<string, string> = { normal: 'ปกติ', risk: 'เสี่ยง', danger: 'สงสัยป่วย' };
                  const colors: Record<string, string> = { normal: 'text-emerald-700 bg-emerald-100', risk: 'text-amber-700 bg-amber-100', danger: 'text-rose-700 bg-rose-100' };
                  const isSelected = filterDmRisk.includes(level);
                  return (
                    <button
                      key={level}
                      onClick={() => setFilterDmRisk(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level])}
                      className={\`text-[10px] px-2 py-1 rounded-lg font-bold transition-all \${isSelected ? colors[level] + ' ring-1 ring-black/10' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}\`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>`;

content = content.replace(oldUI, newUI);

fs.writeFileSync('src/components/NcdDashboard.tsx', content);
