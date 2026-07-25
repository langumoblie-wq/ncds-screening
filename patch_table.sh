awk '
/                \{stats.map\(\(s, idx\) => \(/ {
  print $0
  print "                  <React.Fragment key={s.key}>"
  next
}
/                  <motion.tr / {
  print $0
  print "                    onClick={() => setExpandedKey(expandedKey === s.key ? null : s.key)}"
  print "                    className=\"hover:bg-slate-50/50 transition-colors cursor-pointer\""
  in_motion_tr = 1
  next
}
in_motion_tr && /className=\"hover:bg-slate-50\/50 transition-colors\"/ {
  next
}
in_motion_tr && /                    <td className=\"py-4 px-6\">/ {
  print $0
  print "                      <div className=\"flex items-center gap-2\">"
  print "                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedKey === s.key ? \"rotate-90\" : \"\"}`} />"
  in_td1 = 1
  next
}
in_motion_tr && in_td1 && /                      <div className=\"font-bold text-slate-800 text-sm\">\{s.area\}<\/div>/ {
  print $0
  print "                      </div>"
  in_td1 = 0
  next
}
in_motion_tr && /                  <\/motion.tr>/ {
  print $0
  print "                  {expandedKey === s.key && ("
  print "                    <tr>"
  print "                      <td colSpan={6} className=\"p-0 border-b border-slate-100\">"
  print "                        <div className=\"bg-slate-50/50 p-6 space-y-6 animate-in slide-in-from-top-2 fade-in duration-200\">"
  print "                          {/* Visits Breakdown */}"
  print "                          <div className=\"space-y-3\">"
  print "                            <h4 className=\"text-sm font-bold text-slate-700 flex items-center gap-2\">"
  print "                              <Activity className=\"w-4 h-4 text-indigo-500\" />"
  print "                              แยกตามรายการครั้งที่ (Visits Breakdown)"
  print "                            </h4>"
  print "                            <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4\">"
  print "                              {s.visitsBreakdown.map(v => ("
  print "                                <div key={v.visitNumber} className=\"bg-white p-3 rounded-xl border border-slate-200 shadow-sm\">"
  print "                                  <div className=\"flex justify-between items-center mb-2\">"
  print "                                    <span className=\"text-xs font-bold text-slate-600\">ครั้งที่ {v.visitNumber}</span>"
  print "                                    <span className=\"text-xs font-black text-indigo-600\">{v.count} คน</span>"
  print "                                  </div>"
  print "                                  {s.target > 0 && ("
  print "                                    <div className=\"space-y-1\">"
  print "                                      <div className=\"flex justify-between text-[10px] text-slate-500 font-semibold\">"
  print "                                        <span>ความก้าวหน้า</span>"
  print "                                        <span>{v.percent.toFixed(1)}%</span>"
  print "                                      </div>"
  print "                                      <div className=\"h-1.5 w-full bg-slate-100 rounded-full overflow-hidden\">"
  print "                                        <div className={`h-full rounded-full ${v.percent >= 100 ? \"bg-emerald-500\" : \"bg-indigo-500\"}`} style={{ width: `${Math.min(v.percent, 100)}%` }} />"
  print "                                      </div>"
  print "                                    </div>"
  print "                                  )}"
  print "                                </div>"
  print "                              ))}"
  print "                            </div>"
  print "                          </div>"
  print ""
  print "                          {/* Duplicates / Multiple Visits */}"
  print "                          {s.duplicates.length > 0 && ("
  print "                            <div className=\"space-y-3\">"
  print "                              <h4 className=\"text-sm font-bold text-slate-700 flex items-center gap-2\">"
  print "                                <Users className=\"w-4 h-4 text-amber-500\" />"
  print "                                รายการซ้ำ / รับบริการหลายครั้ง ({s.duplicates.length} รายการ)"
  print "                              </h4>"
  print "                              <div className=\"bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden\">"
  print "                                <table className=\"w-full text-left text-xs\">"
  print "                                  <thead>"
  print "                                    <tr className=\"bg-slate-50 border-b border-slate-200 text-slate-500\">"
  print "                                      <th className=\"py-2 px-4 font-bold\">ชื่อ-สกุล</th>"
  print "                                      <th className=\"py-2 px-4 font-bold text-center\">จำนวนครั้ง</th>"
  print "                                      <th className=\"py-2 px-4 font-bold\">รายการครั้งที่ (Visits)</th>"
  print "                                    </tr>"
  print "                                  </thead>"
  print "                                  <tbody className=\"divide-y divide-slate-100\">"
  print "                                    {s.duplicates.map(d => ("
  print "                                      <tr key={d.name}>"
  print "                                        <td className=\"py-2 px-4 font-semibold text-slate-700\">{d.name}</td>"
  print "                                        <td className=\"py-2 px-4 text-center font-bold text-amber-600\">{d.count}</td>"
  print "                                        <td className=\"py-2 px-4\">"
  print "                                          <div className=\"flex flex-wrap gap-1\">"
  print "                                            {d.visits.map((v, i) => ("
  print "                                              <span key={i} className=\"bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold\">ครั้งที่ {v}</span>"
  print "                                            ))}"
  print "                                          </div>"
  print "                                        </td>"
  print "                                      </tr>"
  print "                                    ))}"
  print "                                  </tbody>"
  print "                                </table>"
  print "                              </div>"
  print "                            </div>"
  print "                          )}"
  print "                        </div>"
  print "                      </td>"
  print "                    </tr>"
  print "                  )}"
  print "                  </React.Fragment>"
  in_motion_tr = 0
  next
}
1
' src/components/ProjectTracking.tsx > src/components/ProjectTracking.tsx.tmp && mv src/components/ProjectTracking.tsx.tmp src/components/ProjectTracking.tsx
