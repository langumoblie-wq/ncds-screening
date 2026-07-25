awk '
/      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">/ {
  print "      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">"
  next
}
/        \{\/\* Diabetes Gauge \*\/\}/ {
  print "        {/* BMI Gauge */}"
  print "        <BMIDoughnut "
  print "          underweight={stats.bmiStats.underweight}"
  print "          normal={stats.bmiStats.normal}"
  print "          overweight={stats.bmiStats.overweight}"
  print "          obese1={stats.bmiStats.obese1}"
  print "          obese2={stats.bmiStats.obese2}"
  print "          title=\"สัดส่วนความเสี่ยงดัชนีมวลกาย (BMI)\""
  print "        />"
  print ""
  print $0
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
