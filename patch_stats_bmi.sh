awk '
/    let foodSaltCount = 0;/ {
  print $0
  print "    let bmiUnderweight = 0;"
  print "    let bmiNormal = 0;"
  print "    let bmiOverweight = 0;"
  print "    let bmiObese1 = 0;"
  print "    let bmiObese2 = 0;"
  next
}
/      if (hasSaltRisk) foodSaltCount\+\+;/ {
  print $0
  print ""
  print "      // BMI breakdown"
  print "      const bmiVal = parseFloat(r.bmi);"
  print "      if (!isNaN(bmiVal) && bmiVal > 0) {"
  print "        if (bmiVal < 18.5) bmiUnderweight++;"
  print "        else if (bmiVal < 23.0) bmiNormal++;"
  print "        else if (bmiVal < 25.0) bmiOverweight++;"
  print "        else if (bmiVal < 30.0) bmiObese1++;"
  print "        else bmiObese2++;"
  print "      }"
  next
}
/      dm: { normal: dmNormal, risk: dmRisk, danger: dmDanger },/ {
  print $0
  print "      bmiStats: { underweight: bmiUnderweight, normal: bmiNormal, overweight: bmiOverweight, obese1: bmiObese1, obese2: bmiObese2 },"
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
