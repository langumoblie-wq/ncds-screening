awk '
/          \{\/\* Legend Table \*\/\}/ {
  print $0
  print "          <div className=\"space-y-3 w-full max-w-[140px]\">"
  in_risk_legend = 1
  next
}
in_risk_legend && /          <\/div>/ {
  print "          </div>"
  in_risk_legend = 0
  next
}
in_risk_legend && /            <div className=\"flex justify-between items-center text-xs\">/ {
  print "            <div className=\"flex justify-between items-start text-xs\">"
  next
}
in_risk_legend && /              <span className=\"font-bold text-slate-800\">\{normal\} ราย \(\{pctNormal\}%\)<\/span>/ {
  print "              <div className=\"flex flex-col items-end\">"
  print "                <span className=\"font-bold text-slate-800 whitespace-nowrap\">{normal} ราย</span>"
  print "                <span className=\"text-[10px] font-semibold text-slate-500\">({pctNormal}%)</span>"
  print "              </div>"
  next
}
in_risk_legend && /              <span className=\"font-bold text-slate-800\">\{risk\} ราย \(\{pctRisk\}%\)<\/span>/ {
  print "              <div className=\"flex flex-col items-end\">"
  print "                <span className=\"font-bold text-slate-800 whitespace-nowrap\">{risk} ราย</span>"
  print "                <span className=\"text-[10px] font-semibold text-slate-500\">({pctRisk}%)</span>"
  print "              </div>"
  next
}
in_risk_legend && /              <span className=\"font-bold text-slate-800\">\{danger\} ราย \(\{pctDanger\}%\)<\/span>/ {
  print "              <div className=\"flex flex-col items-end\">"
  print "                <span className=\"font-bold text-slate-800 whitespace-nowrap\">{danger} ราย</span>"
  print "                <span className=\"text-[10px] font-semibold text-slate-500\">({pctDanger}%)</span>"
  print "              </div>"
  next
}
in_risk_legend {
  print $0
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
