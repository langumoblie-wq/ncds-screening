awk '
/          \} else if \(filterBehaviorRisk === \"alcohol\"\) \{/ {
  print $0
  print "            matchesBehavior = (r.alcohol?.includes(\"ประจำ\") || r.alcohol?.includes(\"ครั้งคราว\"));"
  print "          } else if (filterBehaviorRisk === \"bmi_risk\") {"
  print "            const b = parseFloat(r.bmi);"
  print "            matchesBehavior = (!isNaN(b) && b >= 23.0);"
  next
}
/matchesBehavior = \(r\.alcohol/ {
  next
}
/<option value=\"alcohol\">/ {
  print $0
  print "            <option value=\"bmi_risk\">ดัชนีมวลกาย (BMI ท้วม/อ้วนขึ้นไป)</option>"
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
