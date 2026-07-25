awk '
/                                  \{s.target > 0 && \(/ {
  print "                                  {s.target > 0 ? ("
  print "                                    <div className=\"space-y-1 mt-2 border-t border-slate-100 pt-2\">"
  print "                                      <div className=\"flex justify-between text-[10px] text-slate-500 font-semibold\">"
  print "                                        <span>ความก้าวหน้า ({v.count}/{s.target})</span>"
  print "                                        <span className={v.percent >= 100 ? \"text-emerald-600 font-black\" : \"text-indigo-600 font-black\"}>{v.percent.toFixed(1)}%</span>"
  print "                                      </div>"
  print "                                      <div className=\"h-1.5 w-full bg-slate-100 rounded-full overflow-hidden\">"
  print "                                        <div className={`h-full rounded-full ${v.percent >= 100 ? \"bg-emerald-500\" : \"bg-indigo-500\"}`} style={{ width: `${Math.min(v.percent, 100)}%` }} />"
  print "                                      </div>"
  print "                                    </div>"
  print "                                  ) : ("
  print "                                    <div className=\"text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-2 border-t border-slate-100 pt-2\">"
  print "                                      <AlertCircle className=\"w-3 h-3\" />"
  print "                                      โปรดระบุเป้าหมาย"
  print "                                    </div>"
  print "                                  )}"
  in_skip = 1
  next
}
in_skip && /                                  \)}/ {
  in_skip = 0
  next
}
in_skip {
  next
}
1
' src/components/ProjectTracking.tsx > src/components/ProjectTracking.tsx.tmp && mv src/components/ProjectTracking.tsx.tmp src/components/ProjectTracking.tsx
