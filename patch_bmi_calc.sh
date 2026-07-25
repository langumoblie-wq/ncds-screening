awk '
/      if \(hasSaltRisk\) foodSaltCount\+\+;/ {
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
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
