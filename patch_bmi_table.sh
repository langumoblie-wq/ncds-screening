awk '
/                      \{\/\* BMI \*\/\}/ {
  print $0
  print "                      <td className=\"py-4 px-5 text-center\">"
  print "                        {(() => {"
  print "                          const b = parseFloat(r.bmi);"
  print "                          if (isNaN(b) || b <= 0) return <span className=\"font-mono font-bold text-slate-400\">-</span>;"
  print "                          let colorClass = \"\";"
  print "                          let label = \"\";"
  print "                          if (b < 18.5) { colorClass = \"bg-blue-50 text-blue-600 border-blue-200\"; label = \"ผอม\"; }"
  print "                          else if (b < 23) { colorClass = \"bg-emerald-50 text-emerald-600 border-emerald-200\"; label = \"ปกติ\"; }"
  print "                          else if (b < 25) { colorClass = \"bg-amber-50 text-amber-600 border-amber-200\"; label = \"ท้วม\"; }"
  print "                          else if (b < 30) { colorClass = \"bg-rose-50 text-rose-600 border-rose-200\"; label = \"อ้วน\"; }"
  print "                          else { colorClass = \"bg-purple-50 text-purple-600 border-purple-200\"; label = \"อ้วนมาก\"; }"
  print "                          return ("
  print "                            <div className=\"flex flex-col items-center justify-center gap-1\">"
  print "                              <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold whitespace-nowrap ${colorClass}`}>"
  print "                                {label}"
  print "                              </span>"
  print "                              <span className=\"font-mono font-black text-slate-700 text-[11px]\">{r.bmi}</span>"
  print "                            </div>"
  print "                          );"
  print "                        })()}"
  print "                      </td>"
  in_td = 1
  next
}
in_td && /                      <\/td>/ {
  in_td = 0
  next
}
in_td {
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
