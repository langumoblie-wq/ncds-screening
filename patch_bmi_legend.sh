awk '
/          <div className=\"space-y-2 w-full max-w-\[140px\]\">/ {
  print "          <div className=\"space-y-3 w-full max-w-[140px]\">"
  in_bmi_legend = 1
  next
}
in_bmi_legend && /          <\/div>/ {
  print "          </div>"
  in_bmi_legend = 0
  next
}
in_bmi_legend && /            <div className=\"flex justify-between items-center text-xs\">/ {
  print "            <div className=\"flex justify-between items-start text-xs\">"
  next
}
in_bmi_legend && /              <span className=\"font-bold text-slate-800 text-right\">\{underweight\} ราย<br\/><span className=\"text-\[10px\] text-slate-500\">\(\{Math\.round\(pctUW\)\}%\)<\/span><\/span>/ {
  print "              <div className=\"flex flex-col items-end\">"
  print "                <span className=\"font-bold text-slate-800 whitespace-nowrap\">{underweight} ราย</span>"
  print "                <span className=\"text-[10px] font-semibold text-slate-500\">({Math.round(pctUW)}%)</span>"
  print "              </div>"
  next
}
in_bmi_legend && /              <span className=\"font-bold text-slate-800 text-right\">\{normal\} ราย<br\/><span className=\"text-\[10px\] text-slate-500\">\(\{Math\.round\(pctN\)\}%\)<\/span><\/span>/ {
  print "              <div className=\"flex flex-col items-end\">"
  print "                <span className=\"font-bold text-slate-800 whitespace-nowrap\">{normal} ราย</span>"
  print "                <span className=\"text-[10px] font-semibold text-slate-500\">({Math.round(pctN)}%)</span>"
  print "              </div>"
  next
}
in_bmi_legend && /              <span className=\"font-bold text-slate-800 text-right\">\{overweight\} ราย<br\/><span className=\"text-\[10px\] text-slate-500\">\(\{Math\.round\(pctOW\)\}%\)<\/span><\/span>/ {
  print "              <div className=\"flex flex-col items-end\">"
  print "                <span className=\"font-bold text-slate-800 whitespace-nowrap\">{overweight} ราย</span>"
  print "                <span className=\"text-[10px] font-semibold text-slate-500\">({Math.round(pctOW)}%)</span>"
  print "              </div>"
  next
}
in_bmi_legend && /              <span className=\"font-bold text-slate-800 text-right\">\{obese1\} ราย<br\/><span className=\"text-\[10px\] text-slate-500\">\(\{Math\.round\(pctOB1\)\}%\)<\/span><\/span>/ {
  print "              <div className=\"flex flex-col items-end\">"
  print "                <span className=\"font-bold text-slate-800 whitespace-nowrap\">{obese1} ราย</span>"
  print "                <span className=\"text-[10px] font-semibold text-slate-500\">({Math.round(pctOB1)}%)</span>"
  print "              </div>"
  next
}
in_bmi_legend && /              <span className=\"font-bold text-slate-800 text-right\">\{obese2\} ราย<br\/><span className=\"text-\[10px\] text-slate-500\">\(\{Math\.round\(pctOB2\)\}%\)<\/span><\/span>/ {
  print "              <div className=\"flex flex-col items-end\">"
  print "                <span className=\"font-bold text-slate-800 whitespace-nowrap\">{obese2} ราย</span>"
  print "                <span className=\"text-[10px] font-semibold text-slate-500\">({Math.round(pctOB2)}%)</span>"
  print "              </div>"
  next
}
in_bmi_legend {
  print $0
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
