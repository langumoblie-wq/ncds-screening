const fs = require('fs');
let content = fs.readFileSync('src/components/ProjectTracking.tsx', 'utf-8');

// Change duplicates type
content = content.replace(
  'const duplicates: {name: string, count: number, visits: number[]}[] = [];',
  'const duplicates: {name: string, count: number, visits: {vNum: number, date: string}[]}[] = [];'
);

// Map personVisits properly
const oldVisitsMapping = `          const personVisits = data.records.filter(r => r.name === name).map(r => r.visitNumber || 1).sort((a,b)=>a-b);
          duplicates.push({ name, count, visits: personVisits });`;
const newVisitsMapping = `          const personVisits = data.records
            .filter(r => r.name === name)
            .map(r => ({ vNum: r.visitNumber || 1, date: r.date || "" }))
            .sort((a,b) => a.vNum - b.vNum);
          duplicates.push({ name, count, visits: personVisits });`;
content = content.replace(oldVisitsMapping, newVisitsMapping);

// Render visits with date
const oldRender = `{d.visits.map((v, i) => (
                                              <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">ครั้งที่ {v}</span>
                                            ))}`;
const newRender = `{d.visits.map((v, i) => {
                                              const dateStr = v.date ? new Date(v.date).toLocaleDateString("th-TH", { year: "2-digit", month: "short", day: "numeric" }) : "";
                                              return (
                                              <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">ครั้งที่ {v.vNum} {dateStr && \`(\${dateStr})\`}</span>
                                            )})}`;
content = content.replace(oldRender, newRender);

fs.writeFileSync('src/components/ProjectTracking.tsx', content);
